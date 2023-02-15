/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { retrieveViewsFromApplicationRef } from '../application_ref';
import { collectNativeNodes } from '../render3/collect_native_nodes';
import { getComponentDef, getComponentId } from '../render3/definition';
import { CONTAINER_HEADER_OFFSET } from '../render3/interfaces/container';
import { isComponentHost, isLContainer, isProjectionTNode, isRootView } from '../render3/interfaces/type_checks';
import { CONTEXT, HEADER_OFFSET, HOST, TVIEW } from '../render3/interfaces/view';
import { getFirstNativeNode } from '../render3/node_manipulation';
import { unwrapRNode } from '../render3/util/view_utils';
import { TRANSFER_STATE_TOKEN_ID } from './api';
import { CONTAINERS, MULTIPLIER, NODES, NUM_ROOT_NODES, TEMPLATE, TEMPLATES, VIEWS } from './interfaces';
import { calcPathBetween, REFERENCE_NODE_BODY, REFERENCE_NODE_HOST } from './node_lookup_utils';
import { isInSkipHydrationBlock, SKIP_HYDRATION_ATTR_NAME } from './skip_hydration';
import { DROPPED_PROJECTED_NODE, EMPTY_TEXT_NODE_COMMENT, getComponentLView, NGH_ATTR_NAME, TEXT_NODE_SEPARATOR_COMMENT } from './utils';
/**
 * Registry that keeps track of unique TView ids throughout
 * the serialization process. This is needed to identify
 * dehydrated views at runtime properly (pick up dehydrated
 * views created based on a certain TView).
 */
class TViewSsrIdRegistry {
    constructor() {
        this.registry = new WeakMap();
        this.currentId = 0;
    }
    get(tView) {
        if (!this.registry.has(tView)) {
            this.registry.set(tView, `t${this.currentId++}`);
        }
        return this.registry.get(tView);
    }
}
/**
 * Keeps track of all produced `ngh` annotations and avoids
 * duplication. If the same annotation is being added, the collection
 * remains the same and an index of that annotation is returned instead.
 * This helps minimize the amount of annotations needed on a page.
 */
class NghAnnotationCollection {
    constructor() {
        this.data = [];
        this.indexByContent = new Map();
    }
    add(ngh) {
        const nghAsString = JSON.stringify(ngh);
        if (!this.indexByContent.has(nghAsString)) {
            const index = this.data.length;
            this.data.push(ngh);
            this.indexByContent.set(nghAsString, index);
            return index;
        }
        return this.indexByContent.get(nghAsString);
    }
    getAllAnnotations() {
        return this.data;
    }
}
export function makeStateKey(key) {
    return key;
}
/**
 * Annotates all components bootstrapped in a given ApplicationRef
 * with info needed for hydration.
 *
 * @param appRef A current instance of an ApplicationRef.
 * @param doc A reference to the current Document instance.
 */
export function annotateForHydration(appRef, doc, transferState, profiler) {
    const ssrIdRegistry = new TViewSsrIdRegistry();
    const corruptedTextNodes = new Map();
    const annotationCollection = new NghAnnotationCollection();
    const viewRefs = retrieveViewsFromApplicationRef(appRef);
    for (const viewRef of viewRefs) {
        const lView = getComponentLView(viewRef);
        // TODO: make sure that this lView represents
        // a component instance.
        const hostElement = lView[HOST];
        if (hostElement) {
            const context = {
                ssrIdRegistry,
                corruptedTextNodes,
                profiler,
                annotationCollection,
            };
            annotateHostElementForHydration(hostElement, lView, context);
            insertTextNodeMarkers(corruptedTextNodes, doc);
            profiler?.incrementMetricValue("Empty Text Node count" /* SsrPerfMetrics.EmptyTextNodeCount */, corruptedTextNodes.size);
        }
    }
    const allAnnotations = annotationCollection.getAllAnnotations();
    if (allAnnotations.length > 0) {
        transferState.set(NGH_DATA_KEY, allAnnotations);
    }
}
function isTI18nNode(obj) {
    // TODO: consider adding a node type to TI18n?
    return obj.hasOwnProperty('create') && obj.hasOwnProperty('update');
}
function serializeLView(lView, context) {
    const ngh = {};
    const tView = lView[TVIEW];
    for (let i = HEADER_OFFSET; i < tView.bindingStartIndex; i++) {
        let targetNode = null;
        const adjustedIndex = i - HEADER_OFFSET;
        const tNode = tView.data[i];
        // tNode may be null in the case of a localRef
        if (!tNode) {
            continue;
        }
        if (context.profiler) {
            // We process 1 more node from LView here. If we process a component
            // or an LContainer, we can still increase the value by one, since both
            // of them have native nodes (e.g. `lContainer[HOST]`).
            context.profiler.incrementMetricValue("Serialized DOM Nodes" /* SsrPerfMetrics.SerializedDomNodes */, 1);
        }
        if (Array.isArray(tNode.projection)) {
            // TODO: handle `RNode[]` as well.
            for (const headTNode of tNode.projection) {
                // We may have `null`s in slots with no projected content.
                // Also, if we process re-projected content (i.e. `<ng-content>`
                // appears at projection location), skip annotations for this content
                // since all DOM nodes in this projection were handled while processing
                // a parent lView, which contains those nodes.
                if (headTNode && !isProjectionTNode(headTNode)) {
                    if (!isInSkipHydrationBlock(headTNode, lView)) {
                        ngh[NODES] ?? (ngh[NODES] = {});
                        ngh[NODES][headTNode.index - HEADER_OFFSET] = calcPathForNode(lView, headTNode);
                    }
                }
            }
        }
        if (isLContainer(lView[i])) {
            // this is a container
            const tNode = tView.data[i];
            const embeddedTView = tNode.tViews;
            if (embeddedTView !== null) {
                if (Array.isArray(embeddedTView)) {
                    throw new Error(`Expecting tNode.tViews to be an object, but it's an array.`);
                }
                ngh[TEMPLATES] ?? (ngh[TEMPLATES] = {});
                ngh[TEMPLATES][i - HEADER_OFFSET] = context.ssrIdRegistry.get(embeddedTView);
            }
            const hostNode = lView[i][HOST];
            // LView[i][HOST] can be 2 different types:
            // - either a DOM Node
            // - or an LView Array that represents a component
            // We only handle the DOM Node case here
            if (Array.isArray(hostNode)) {
                // this is a component
                // Check to see if it has ngSkipHydration
                // TODO: should we check `SKIP_HYDRATION_ATTR_NAME` in tNode.mergedAttrs?
                targetNode = unwrapRNode(hostNode);
                if (!targetNode.hasAttribute(SKIP_HYDRATION_ATTR_NAME)) {
                    annotateHostElementForHydration(targetNode, hostNode, context);
                }
            }
            const container = serializeLContainer(lView[i], context);
            ngh[CONTAINERS] ?? (ngh[CONTAINERS] = {});
            ngh[CONTAINERS][adjustedIndex] = container;
        }
        else if (Array.isArray(lView[i])) {
            // This is a component
            // Check to see if it has ngSkipHydration
            // TODO: should we check `SKIP_HYDRATION_ATTR_NAME` in tNode.mergedAttrs?
            targetNode = unwrapRNode(lView[i][HOST]);
            if (!targetNode.hasAttribute(SKIP_HYDRATION_ATTR_NAME)) {
                annotateHostElementForHydration(targetNode, lView[i], context);
            }
        }
        else if (isTI18nNode(tNode) || tNode.insertBeforeIndex) {
            // TODO: implement hydration for i18n nodes
            throw new Error('Hydration for i18n nodes is not implemented.');
        }
        else {
            const tNodeType = tNode.type;
            // <ng-container> case
            if (tNodeType & 8 /* TNodeType.ElementContainer */) {
                const rootNodes = [];
                collectNativeNodes(tView, lView, tNode.child, rootNodes);
                // This is an "element" container (vs "view" container),
                // so it's only represented by the number of top-level nodes
                // as a shift to get to a corresponding comment node.
                const container = {
                    [NUM_ROOT_NODES]: rootNodes.length,
                };
                ngh[CONTAINERS] ?? (ngh[CONTAINERS] = {});
                ngh[CONTAINERS][adjustedIndex] = container;
            }
            else if (tNodeType & 16 /* TNodeType.Projection */) {
                // Current TNode has no DOM element associated with it,
                // so the following node would not be able to find an anchor.
                // Use full path instead.
                let nextTNode = tNode.next;
                while (nextTNode !== null && (nextTNode.type & 16 /* TNodeType.Projection */)) {
                    nextTNode = nextTNode.next;
                }
                if (nextTNode) {
                    const index = nextTNode.index - HEADER_OFFSET;
                    if (!isInSkipHydrationBlock(nextTNode, lView)) {
                        const path = calcPathForNode(lView, nextTNode);
                        ngh[NODES] ?? (ngh[NODES] = {});
                        ngh[NODES][index] = path;
                    }
                }
            }
            else {
                if (isDroppedProjectedNode(tNode)) {
                    // This is a case where a node used in content projection
                    // doesn't make it into one of the content projection slots
                    // (for example, when there is no default <ng-content /> slot
                    // in projector component's template).
                    ngh[NODES] ?? (ngh[NODES] = {});
                    ngh[NODES][adjustedIndex] = DROPPED_PROJECTED_NODE;
                }
                else {
                    // Handle cases where text nodes can be lost after DOM serialization:
                    //  1. When there is an *empty text node* in DOM: in this case, this
                    //     node would not make it into the serialized string and as s result,
                    //     this node wouldn't be created in a browser. This would result in
                    //     a mismatch during the hydration, where the runtime logic would expect
                    //     a text node to be present in live DOM, but no text node would exist.
                    //     Example: `<span>{{ name }}</span>` when the `name` is an empty string.
                    //     This would result in `<span></span>` string after serialization and
                    //     in a browser only the `span` element would be created. To resolve that,
                    //     an extra comment node is appended in place of an empty text node and
                    //     that special comment node is replaced with an empty text node *before*
                    //     hydration.
                    //  2. When there are 2 consecutive text nodes present in the DOM.
                    //     Example: `<div>Hello <ng-container *ngIf="true">world</ng-container></div>`.
                    //     In this scenario, the live DOM would look like this:
                    //       <div>#text('Hello ') #text('world') #comment('container')</div>
                    //     Serialized string would look like this: `<div>Hello world<!--container--></div>`.
                    //     The live DOM in a browser after that would be:
                    //       <div>#text('Hello world') #comment('container')</div>
                    //     Notice how 2 text nodes are now "merged" into one. This would cause hydration
                    //     logic to fail, since it'd expect 2 text nodes being present, not one.
                    //     To fix this, we insert a special comment node in between those text nodes, so
                    //     serialized representation is: `<div>Hello <!--ngtns-->world<!--container--></div>`.
                    //     This forces browser to create 2 text nodes separated by a comment node.
                    //     Before running a hydration process, this special comment node is removed, so the
                    //     live DOM has exactly the same state as it was before serialization.
                    if (tNodeType & 1 /* TNodeType.Text */) {
                        const rNode = unwrapRNode(lView[i]);
                        if (rNode.textContent === '') {
                            context.corruptedTextNodes.set(EMPTY_TEXT_NODE_COMMENT, rNode);
                        }
                        else if (rNode.nextSibling?.nodeType === Node.TEXT_NODE) {
                            context.corruptedTextNodes.set(TEXT_NODE_SEPARATOR_COMMENT, rNode);
                        }
                    }
                    if (tNode.projectionNext && tNode.projectionNext !== tNode.next) {
                        // Check if projection next is not the same as next, in which case
                        // the node would not be found at creation time at runtime and we
                        // need to provide a location to that node.
                        const nextProjectedTNode = tNode.projectionNext;
                        const index = nextProjectedTNode.index - HEADER_OFFSET;
                        if (!isInSkipHydrationBlock(nextProjectedTNode, lView)) {
                            const path = calcPathForNode(lView, nextProjectedTNode);
                            ngh[NODES] ?? (ngh[NODES] = {});
                            ngh[NODES][index] = path;
                        }
                    }
                }
            }
        }
    }
    return ngh;
}
function isRootLevelProjectionNode(tNode) {
    return (tNode.flags & 2 /* TNodeFlags.isProjected */) === 2 /* TNodeFlags.isProjected */;
}
/**
 * Detect a case where a node used in content projection,
 * but doesn't make it into one of the content projection slots
 * (for example, when there is no default <ng-content /> slot
 * in projector component's template).
 */
function isDroppedProjectedNode(tNode) {
    let currentTNode = tNode;
    let seenComponentHost = false;
    while (currentTNode !== null) {
        if (isComponentHost(currentTNode)) {
            seenComponentHost = true;
            break;
        }
        // If we come across a root projected node, return true.
        if (isRootLevelProjectionNode(currentTNode)) {
            return false;
        }
        currentTNode = currentTNode.parent;
    }
    // If we've seen a component host, but there was no root level
    // projection node, this indicates that this not was not projected.
    return seenComponentHost;
}
function calcPathForNode(lView, tNode, parentTNode) {
    const index = tNode.index;
    // If `null` is passed explicitly, use this as a signal that we want to calculate
    // the path starting from `lView[HOST]`.
    parentTNode = parentTNode === null ? null : (parentTNode || tNode.parent);
    const parentIndex = parentTNode === null ? REFERENCE_NODE_HOST : parentTNode.index;
    const parentRNode = parentTNode === null ? lView[HOST] : unwrapRNode(lView[parentIndex]);
    let rNode = unwrapRNode(lView[index]);
    if (tNode.type & 12 /* TNodeType.AnyContainer */) {
        // For <ng-container> nodes, instead of serializing a reference
        // to the anchor comment node, serialize a location of the first
        // DOM element. Paired with the container size (serialized as a part
        // of `ngh.containers`), it should give enough information for runtime
        // to hydrate nodes in this container.
        const firstRNode = getFirstNativeNode(lView, tNode);
        // If container is not empty, use a reference to the first element,
        // otherwise, rNode would point to an anchor comment node.
        if (firstRNode) {
            rNode = firstRNode;
        }
    }
    const referenceNode = parentIndex === REFERENCE_NODE_HOST ? parentIndex : '' + (parentIndex - HEADER_OFFSET);
    let path = calcPathBetween(parentRNode, rNode, referenceNode);
    if (path === null && parentRNode !== rNode) {
        // Searching for a path between elements within a host node failed.
        // Trying to find a path to an element starting from the `document.body` instead.
        const body = parentRNode.ownerDocument.body;
        path = calcPathBetween(body, rNode, REFERENCE_NODE_BODY);
        if (path === null) {
            // If path is still empty, it's likely that this node is detached and
            // won't be found during hydration.
            // TODO: add a better error message, potentially suggesting `ngSkipHydration`.
            throw new Error('Unable to locate element on a page.');
        }
    }
    return path;
}
function serializeLContainer(lContainer, context) {
    const container = {};
    for (let i = CONTAINER_HEADER_OFFSET; i < lContainer.length; i++) {
        let childLView = lContainer[i];
        // Get LView for underlying component.
        if (isRootView(childLView)) {
            childLView = childLView[HEADER_OFFSET];
        }
        const childTView = childLView[TVIEW];
        let template;
        let numRootNodes = 0;
        if (childTView.type === 1 /* TViewType.Component */) {
            const ctx = childLView[CONTEXT];
            const componentDef = getComponentDef(ctx.constructor);
            template = getComponentId(componentDef);
            // This is a component view, which has only 1 root node: the component
            // host node itself (other nodes would be inside that host node).
            numRootNodes = 1;
        }
        else {
            template =
                context.ssrIdRegistry.get(childTView); // from which template did this lView originate?
            // Collect root nodes within this view.
            const rootNodes = [];
            collectNativeNodes(childTView, childLView, childTView.firstChild, rootNodes);
            numRootNodes = rootNodes.length;
        }
        const view = {
            [TEMPLATE]: template,
            [NUM_ROOT_NODES]: numRootNodes,
            ...serializeLView(lContainer[i], context),
        };
        container[VIEWS] ?? (container[VIEWS] = []);
        if (container[VIEWS].length > 0) {
            const prevView = container[VIEWS].at(-1); // the last element in array
            // Compare `view` and `prevView` to see if they are the same.
            if (compareNghView(view, prevView)) {
                prevView[MULTIPLIER] ?? (prevView[MULTIPLIER] = 1);
                prevView[MULTIPLIER]++;
            }
            else {
                container[VIEWS].push(view);
            }
        }
        else {
            container[VIEWS].push(view);
        }
    }
    return container;
}
function compareNghView(curr, prev) {
    const prevClone = { ...prev };
    delete prevClone[MULTIPLIER];
    return JSON.stringify(curr) === JSON.stringify(prevClone);
}
export const NGH_DATA_KEY = makeStateKey(TRANSFER_STATE_TOKEN_ID);
export function annotateHostElementForHydration(element, lView, context) {
    const ngh = serializeLView(lView, context);
    const index = context.annotationCollection.add(ngh);
    if (context.profiler) {
        if (Object.keys(ngh).length === 0) {
            context.profiler.incrementMetricValue("Components with empty NGH" /* SsrPerfMetrics.ComponentsWithEmptyNgh */, 1);
        }
        context.profiler.incrementMetricValue("Hydration annotation size (in character length)" /* SsrPerfMetrics.NghAnnotationSize */, index.toString().length + 7); // 7 to account for ' ngh=""'
        context.profiler.incrementMetricValue("Serialized Components" /* SsrPerfMetrics.SerializedComponents */, 1); // increment by one more component
    }
    element.setAttribute(NGH_ATTR_NAME, index.toString());
}
function insertTextNodeMarkers(corruptedTextNodes, doc) {
    for (let [marker, textNode] of corruptedTextNodes) {
        textNode.after(doc.createComment(marker));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vYW5ub3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFpQiwrQkFBK0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBRW5GLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLGlDQUFpQyxDQUFDO0FBQ25FLE9BQU8sRUFBQyxlQUFlLEVBQUUsY0FBYyxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDdEUsT0FBTyxFQUFDLHVCQUF1QixFQUFhLE1BQU0saUNBQWlDLENBQUM7QUFFcEYsT0FBTyxFQUFDLGVBQWUsRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFDLE1BQU0sbUNBQW1DLENBQUM7QUFDL0csT0FBTyxFQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFnQixLQUFLLEVBQVksTUFBTSw0QkFBNEIsQ0FBQztBQUN4RyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSw4QkFBOEIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFFdkQsT0FBTyxFQUFDLHVCQUF1QixFQUFDLE1BQU0sT0FBTyxDQUFDO0FBQzlDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFpQyxLQUFLLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQ3RJLE9BQU8sRUFBQyxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUU5RixPQUFPLEVBQUMsc0JBQXNCLEVBQUUsd0JBQXdCLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUNsRixPQUFPLEVBQUMsc0JBQXNCLEVBQUUsdUJBQXVCLEVBQUUsaUJB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LENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUUsNkJBQTZCO1FBQ2hFLE9BQU8sQ0FBQyxRQUFRLENBQUMsb0JBQW9CLG9FQUNJLENBQUMsQ0FBQyxDQUFDLENBQUUsa0NBQWtDO0tBQ2pGO0lBQ0QsT0FBTyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7QUFDeEQsQ0FBQztBQUVELFNBQVMscUJBQXFCLENBQUMsa0JBQTRDLEVBQUUsR0FBYTtJQUN4RixLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLElBQUksa0JBQWtCLEVBQUU7UUFDakQsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7S0FDM0M7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QXBwbGljYXRpb25SZWYsIHJldHJpZXZlVmlld3NGcm9tQXBwbGljYXRpb25SZWZ9IGZyb20gJy4uL2FwcGxpY2F0aW9uX3JlZic7XG5pbXBvcnQge1R5cGV9IGZyb20gJy4uL2ludGVyZmFjZS90eXBlJztcbmltcG9ydCB7Y29sbGVjdE5hdGl2ZU5vZGVzfSBmcm9tICcuLi9yZW5kZXIzL2NvbGxlY3RfbmF0aXZlX25vZGVzJztcbmltcG9ydCB7Z2V0Q29tcG9uZW50RGVmLCBnZXRDb21wb25lbnRJZH0gZnJvbSAnLi4vcmVuZGVyMy9kZWZpbml0aW9uJztcbmltcG9ydCB7Q09OVEFJTkVSX0hFQURFUl9PRkZTRVQsIExDb250YWluZXJ9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9jb250YWluZXInO1xuaW1wb3J0IHtUQ29udGFpbmVyTm9kZSwgVE5vZGUsIFROb2RlRmxhZ3MsIFROb2RlVHlwZX0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL25vZGUnO1xuaW1wb3J0IHtpc0NvbXBvbmVudEhvc3QsIGlzTENvbnRhaW5lciwgaXNQcm9qZWN0aW9uVE5vZGUsIGlzUm9vdFZpZXd9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy90eXBlX2NoZWNrcyc7XG5pbXBvcnQge0NPTlRFWFQsIEhFQURFUl9PRkZTRVQsIEhPU1QsIExWaWV3LCBUVmlldywgVFZJRVcsIFRWaWV3VHlwZX0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3ZpZXcnO1xuaW1wb3J0IHtnZXRGaXJzdE5hdGl2ZU5vZGV9IGZyb20gJy4uL3JlbmRlcjMvbm9kZV9tYW5pcHVsYXRpb24nO1xuaW1wb3J0IHt1bndyYXBSTm9kZX0gZnJvbSAnLi4vcmVuZGVyMy91dGlsL3ZpZXdfdXRpbHMnO1xuXG5pbXBvcnQge1RSQU5TRkVSX1NUQVRFX1RPS0VOX0lEfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0NPTlRBSU5FUlMsIE1VTFRJUExJRVIsIE5naENvbnRhaW5lciwgTmdoRG9tLCBOZ2hWaWV3LCBOT0RFUywgTlVNX1JPT1RfTk9ERVMsIFRFTVBMQVRFLCBURU1QTEFURVMsIFZJRVdTfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtjYWxjUGF0aEJldHdlZW4sIFJFRkVSRU5DRV9OT0RFX0JPRFksIFJFRkVSRU5DRV9OT0RFX0hPU1R9IGZyb20gJy4vbm9kZV9sb29rdXBfdXRpbHMnO1xuaW1wb3J0IHtTc3JQZXJmTWV0cmljcywgU3NyUHJvZmlsZXJ9IGZyb20gJy4vcHJvZmlsZXInO1xuaW1wb3J0IHtpc0luU2tpcEh5ZHJhdGlvbkJsb2NrLCBTS0lQX0hZRFJBVElPTl9BVFRSX05BTUV9IGZyb20gJy4vc2tpcF9oeWRyYXRpb24nO1xuaW1wb3J0IHtEUk9QUEVEX1BST0pFQ1RFRF9OT0RFLCBFTVBUWV9URVhUX05PREVfQ09NTUVOVCwgZ2V0Q29tcG9uZW50TFZpZXcsIE5HSF9BVFRSX05BTUUsIFRFWFRfTk9ERV9TRVBBUkFUT1JfQ09NTUVOVH0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogUmVnaXN0cnkgdGhhdCBrZWVwcyB0cmFjayBvZiB1bmlxdWUgVFZpZXcgaWRzIHRocm91Z2hvdXRcbiAqIHRoZSBzZXJpYWxpemF0aW9uIHByb2Nlc3MuIFRoaXMgaXMgbmVlZGVkIHRvIGlkZW50aWZ5XG4gKiBkZWh5ZHJhdGVkIHZpZXdzIGF0IHJ1bnRpbWUgcHJvcGVybHkgKHBpY2sgdXAgZGVoeWRyYXRlZFxuICogdmlld3MgY3JlYXRlZCBiYXNlZCBvbiBhIGNlcnRhaW4gVFZpZXcpLlxuICovXG5jbGFzcyBUVmlld1NzcklkUmVnaXN0cnkge1xuICBwcml2YXRlIHJlZ2lzdHJ5ID0gbmV3IFdlYWtNYXA8VFZpZXcsIHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBjdXJyZW50SWQgPSAwO1xuXG4gIGdldCh0VmlldzogVFZpZXcpOiBzdHJpbmcge1xuICAgIGlmICghdGhpcy5yZWdpc3RyeS5oYXModFZpZXcpKSB7XG4gICAgICB0aGlzLnJlZ2lzdHJ5LnNldCh0VmlldywgYHQke3RoaXMuY3VycmVudElkKyt9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlZ2lzdHJ5LmdldCh0VmlldykhO1xuICB9XG59XG5cbi8qKlxuICogS2VlcHMgdHJhY2sgb2YgYWxsIHByb2R1Y2VkIGBuZ2hgIGFubm90YXRpb25zIGFuZCBhdm9pZHNcbiAqIGR1cGxpY2F0aW9uLiBJZiB0aGUgc2FtZSBhbm5vdGF0aW9uIGlzIGJlaW5nIGFkZGVkLCB0aGUgY29sbGVjdGlvblxuICogcmVtYWlucyB0aGUgc2FtZSBhbmQgYW4gaW5kZXggb2YgdGhhdCBhbm5vdGF0aW9uIGlzIHJldHVybmVkIGluc3RlYWQuXG4gKiBUaGlzIGhlbHBzIG1pbmltaXplIHRoZSBhbW91bnQgb2YgYW5ub3RhdGlvbnMgbmVlZGVkIG9uIGEgcGFnZS5cbiAqL1xuY2xhc3MgTmdoQW5ub3RhdGlvbkNvbGxlY3Rpb24ge1xuICBwcml2YXRlIGRhdGE6IE5naERvbVtdID0gW107XG4gIHByaXZhdGUgaW5kZXhCeUNvbnRlbnQgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuXG4gIGFkZChuZ2g6IE5naERvbSk6IG51bWJlciB7XG4gICAgY29uc3QgbmdoQXNTdHJpbmcgPSBKU09OLnN0cmluZ2lmeShuZ2gpO1xuICAgIGlmICghdGhpcy5pbmRleEJ5Q29udGVudC5oYXMobmdoQXNTdHJpbmcpKSB7XG4gICAgICBjb25zdCBpbmRleCA9IHRoaXMuZGF0YS5sZW5ndGg7XG4gICAgICB0aGlzLmRhdGEucHVzaChuZ2gpO1xuICAgICAgdGhpcy5pbmRleEJ5Q29udGVudC5zZXQobmdoQXNTdHJpbmcsIGluZGV4KTtcbiAgICAgIHJldHVybiBpbmRleDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaW5kZXhCeUNvbnRlbnQuZ2V0KG5naEFzU3RyaW5nKSE7XG4gIH1cblxuICBnZXRBbGxBbm5vdGF0aW9ucygpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhO1xuICB9XG59XG5cbi8qKlxuICogRGVzY3JpYmVzIGEgY29udGV4dCBhdmFpbGFibGUgZHVyaW5nIHRoZSBzZXJpYWxpemF0aW9uXG4gKiBwcm9jZXNzLiBUaGUgY29udGV4dCBpcyB1c2VkIHRvIHNoYXJlIGFuZCBjb2xsZWN0IGluZm9ybWF0aW9uXG4gKiBkdXJpbmcgdGhlIHNlcmlhbGl6YXRpb24uXG4gKi9cbmludGVyZmFjZSBIeWRyYXRpb25Db250ZXh0IHtcbiAgc3NySWRSZWdpc3RyeTogVFZpZXdTc3JJZFJlZ2lzdHJ5O1xuICBjb3JydXB0ZWRUZXh0Tm9kZXM6IE1hcDxzdHJpbmcsIEhUTUxFbGVtZW50PjtcbiAgcHJvZmlsZXI6IFNzclByb2ZpbGVyfG51bGw7XG4gIGFubm90YXRpb25Db2xsZWN0aW9uOiBOZ2hBbm5vdGF0aW9uQ29sbGVjdGlvbjtcbn1cblxudHlwZSBTdGF0ZUtleTxUPiA9IHN0cmluZyZ7XG4gIF9fbm90X2Ffc3RyaW5nOiBuZXZlcixcbiAgX192YWx1ZV90eXBlPzogVCxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlU3RhdGVLZXk8VCA9IHZvaWQ+KGtleTogc3RyaW5nKTogU3RhdGVLZXk8VD4ge1xuICByZXR1cm4ga2V5IGFzIFN0YXRlS2V5PFQ+O1xufVxuXG4vKipcbiAqIFRoaXMgaXMgYW4gaW50ZXJmYWNlIHRoYXQgcmVwcmVzZW50cyB0aGUgYFRyYW5zZmVyU3RhdGVgIGNsYXNzXG4gKiBmcm9tIHRoZSBgcGxhdGZvcm0tYnJvd3NlcmAgcGFja2FnZS5cbiAqIFRPRE86IHRoZSBgVHJhbnNmZXJTdGF0ZWAgZnJvbSB0aGUgYHBsYXRmb3JtLWJyb3dzZXJgIHBhY2thZ2VcbiAqIHNob3VsZCBpbXBsZW1lbnQgdGhpcyBpbnRlcmZhY2UgKHRvIGF2b2lkIGRpdmVyZ2VuY2UpLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRyYW5zZmVyU3RhdGUge1xuICAvKipcbiAgICogR2V0IHRoZSB2YWx1ZSBjb3JyZXNwb25kaW5nIHRvIGEga2V5LiBSZXR1cm4gYGRlZmF1bHRWYWx1ZWAgaWYga2V5IGlzIG5vdCBmb3VuZC5cbiAgICovXG4gIGdldDxUPihrZXk6IFN0YXRlS2V5PFQ+LCBkZWZhdWx0VmFsdWU6IFQpOiBUO1xuXG4gIC8qKlxuICAgKiBTZXQgdGhlIHZhbHVlIGNvcnJlc3BvbmRpbmcgdG8gYSBrZXkuXG4gICAqL1xuICBzZXQ8VD4oa2V5OiBTdGF0ZUtleTxUPiwgdmFsdWU6IFQpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBrZXkgZnJvbSB0aGUgc3RvcmUuXG4gICAqL1xuICByZW1vdmU8VD4oa2V5OiBTdGF0ZUtleTxUPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFRlc3Qgd2hldGhlciBhIGtleSBleGlzdHMgaW4gdGhlIHN0b3JlLlxuICAgKi9cbiAgaGFzS2V5PFQ+KGtleTogU3RhdGVLZXk8VD4pOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgd2hldGhlciB0aGUgc3RhdGUgaXMgZW1wdHkuXG4gICAqL1xuICBnZXQgaXNFbXB0eSgpOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIGNhbGxiYWNrIHRvIHByb3ZpZGUgdGhlIHZhbHVlIGZvciBhIGtleSB3aGVuIGB0b0pzb25gIGlzIGNhbGxlZC5cbiAgICovXG4gIG9uU2VyaWFsaXplPFQ+KGtleTogU3RhdGVLZXk8VD4sIGNhbGxiYWNrOiAoKSA9PiBUKTogdm9pZDtcblxuICAvKipcbiAgICogU2VyaWFsaXplIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBzdG9yZSB0byBKU09OLlxuICAgKi9cbiAgdG9Kc29uKCk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBbm5vdGF0ZXMgYWxsIGNvbXBvbmVudHMgYm9vdHN0cmFwcGVkIGluIGEgZ2l2ZW4gQXBwbGljYXRpb25SZWZcbiAqIHdpdGggaW5mbyBuZWVkZWQgZm9yIGh5ZHJhdGlvbi5cbiAqXG4gKiBAcGFyYW0gYXBwUmVmIEEgY3VycmVudCBpbnN0YW5jZSBvZiBhbiBBcHBsaWNhdGlvblJlZi5cbiAqIEBwYXJhbSBkb2MgQSByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgRG9jdW1lbnQgaW5zdGFuY2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbm5vdGF0ZUZvckh5ZHJhdGlvbihcbiAgICBhcHBSZWY6IEFwcGxpY2F0aW9uUmVmLCBkb2M6IERvY3VtZW50LCB0cmFuc2ZlclN0YXRlOiBUcmFuc2ZlclN0YXRlLFxuICAgIHByb2ZpbGVyOiBTc3JQcm9maWxlcnxudWxsKSB7XG4gIGNvbnN0IHNzcklkUmVnaXN0cnkgPSBuZXcgVFZpZXdTc3JJZFJlZ2lzdHJ5KCk7XG4gIGNvbnN0IGNvcnJ1cHRlZFRleHROb2RlcyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MRWxlbWVudD4oKTtcbiAgY29uc3QgYW5ub3RhdGlvbkNvbGxlY3Rpb24gPSBuZXcgTmdoQW5ub3RhdGlvbkNvbGxlY3Rpb24oKTtcbiAgY29uc3Qgdmlld1JlZnMgPSByZXRyaWV2ZVZpZXdzRnJvbUFwcGxpY2F0aW9uUmVmKGFwcFJlZik7XG4gIGZvciAoY29uc3Qgdmlld1JlZiBvZiB2aWV3UmVmcykge1xuICAgIGNvbnN0IGxWaWV3ID0gZ2V0Q29tcG9uZW50TFZpZXcodmlld1JlZik7XG4gICAgLy8gVE9ETzogbWFrZSBzdXJlIHRoYXQgdGhpcyBsVmlldyByZXByZXNlbnRzXG4gICAgLy8gYSBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAgY29uc3QgaG9zdEVsZW1lbnQgPSBsVmlld1tIT1NUXTtcbiAgICBpZiAoaG9zdEVsZW1lbnQpIHtcbiAgICAgIGNvbnN0IGNvbnRleHQ6IEh5ZHJhdGlvbkNvbnRleHQgPSB7XG4gICAgICAgIHNzcklkUmVnaXN0cnksXG4gICAgICAgIGNvcnJ1cHRlZFRleHROb2RlcyxcbiAgICAgICAgcHJvZmlsZXIsXG4gICAgICAgIGFubm90YXRpb25Db2xsZWN0aW9uLFxuICAgICAgfTtcbiAgICAgIGFubm90YXRlSG9zdEVsZW1lbnRGb3JIeWRyYXRpb24oaG9zdEVsZW1lbnQsIGxWaWV3LCBjb250ZXh0KTtcbiAgICAgIGluc2VydFRleHROb2RlTWFya2Vycyhjb3JydXB0ZWRUZXh0Tm9kZXMsIGRvYyk7XG4gICAgICBwcm9maWxlcj8uaW5jcmVtZW50TWV0cmljVmFsdWUoU3NyUGVyZk1ldHJpY3MuRW1wdHlUZXh0Tm9kZUNvdW50LCBjb3JydXB0ZWRUZXh0Tm9kZXMuc2l6ZSk7XG4gICAgfVxuICB9XG4gIGNvbnN0IGFsbEFubm90YXRpb25zID0gYW5ub3RhdGlvbkNvbGxlY3Rpb24uZ2V0QWxsQW5ub3RhdGlvbnMoKTtcbiAgaWYgKGFsbEFubm90YXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICB0cmFuc2ZlclN0YXRlLnNldChOR0hfREFUQV9LRVksIGFsbEFubm90YXRpb25zKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc1RJMThuTm9kZShvYmo6IGFueSk6IGJvb2xlYW4ge1xuICAvLyBUT0RPOiBjb25zaWRlciBhZGRpbmcgYSBub2RlIHR5cGUgdG8gVEkxOG4/XG4gIHJldHVybiBvYmouaGFzT3duUHJvcGVydHkoJ2NyZWF0ZScpICYmIG9iai5oYXNPd25Qcm9wZXJ0eSgndXBkYXRlJyk7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUxWaWV3KGxWaWV3OiBMVmlldywgY29udGV4dDogSHlkcmF0aW9uQ29udGV4dCk6IE5naERvbSB7XG4gIGNvbnN0IG5naDogTmdoRG9tID0ge307XG4gIGNvbnN0IHRWaWV3ID0gbFZpZXdbVFZJRVddO1xuICBmb3IgKGxldCBpID0gSEVBREVSX09GRlNFVDsgaSA8IHRWaWV3LmJpbmRpbmdTdGFydEluZGV4OyBpKyspIHtcbiAgICBsZXQgdGFyZ2V0Tm9kZTogTm9kZXxudWxsID0gbnVsbDtcbiAgICBjb25zdCBhZGp1c3RlZEluZGV4ID0gaSAtIEhFQURFUl9PRkZTRVQ7XG4gICAgY29uc3QgdE5vZGUgPSB0Vmlldy5kYXRhW2ldIGFzIFRDb250YWluZXJOb2RlO1xuICAgIC8vIHROb2RlIG1heSBiZSBudWxsIGluIHRoZSBjYXNlIG9mIGEgbG9jYWxSZWZcbiAgICBpZiAoIXROb2RlKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQucHJvZmlsZXIpIHtcbiAgICAgIC8vIFdlIHByb2Nlc3MgMSBtb3JlIG5vZGUgZnJvbSBMVmlldyBoZXJlLiBJZiB3ZSBwcm9jZXNzIGEgY29tcG9uZW50XG4gICAgICAvLyBvciBhbiBMQ29udGFpbmVyLCB3ZSBjYW4gc3RpbGwgaW5jcmVhc2UgdGhlIHZhbHVlIGJ5IG9uZSwgc2luY2UgYm90aFxuICAgICAgLy8gb2YgdGhlbSBoYXZlIG5hdGl2ZSBub2RlcyAoZS5nLiBgbENvbnRhaW5lcltIT1NUXWApLlxuICAgICAgY29udGV4dC5wcm9maWxlci5pbmNyZW1lbnRNZXRyaWNWYWx1ZShTc3JQZXJmTWV0cmljcy5TZXJpYWxpemVkRG9tTm9kZXMsIDEpO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0Tm9kZS5wcm9qZWN0aW9uKSkge1xuICAgICAgLy8gVE9ETzogaGFuZGxlIGBSTm9kZVtdYCBhcyB3ZWxsLlxuICAgICAgZm9yIChjb25zdCBoZWFkVE5vZGUgb2YgKHROb2RlLnByb2plY3Rpb24gYXMgYW55W10pKSB7XG4gICAgICAgIC8vIFdlIG1heSBoYXZlIGBudWxsYHMgaW4gc2xvdHMgd2l0aCBubyBwcm9qZWN0ZWQgY29udGVudC5cbiAgICAgICAgLy8gQWxzbywgaWYgd2UgcHJvY2VzcyByZS1wcm9qZWN0ZWQgY29udGVudCAoaS5lLiBgPG5nLWNvbnRlbnQ+YFxuICAgICAgICAvLyBhcHBlYXJzIGF0IHByb2plY3Rpb24gbG9jYXRpb24pLCBza2lwIGFubm90YXRpb25zIGZvciB0aGlzIGNvbnRlbnRcbiAgICAgICAgLy8gc2luY2UgYWxsIERPTSBub2RlcyBpbiB0aGlzIHByb2plY3Rpb24gd2VyZSBoYW5kbGVkIHdoaWxlIHByb2Nlc3NpbmdcbiAgICAgICAgLy8gYSBwYXJlbnQgbFZpZXcsIHdoaWNoIGNvbnRhaW5zIHRob3NlIG5vZGVzLlxuICAgICAgICBpZiAoaGVhZFROb2RlICYmICFpc1Byb2plY3Rpb25UTm9kZShoZWFkVE5vZGUpKSB7XG4gICAgICAgICAgaWYgKCFpc0luU2tpcEh5ZHJhdGlvbkJsb2NrKGhlYWRUTm9kZSwgbFZpZXcpKSB7XG4gICAgICAgICAgICBuZ2hbTk9ERVNdID8/PSB7fTtcbiAgICAgICAgICAgIG5naFtOT0RFU11baGVhZFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVF0gPSBjYWxjUGF0aEZvck5vZGUobFZpZXcsIGhlYWRUTm9kZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc0xDb250YWluZXIobFZpZXdbaV0pKSB7XG4gICAgICAvLyB0aGlzIGlzIGEgY29udGFpbmVyXG4gICAgICBjb25zdCB0Tm9kZSA9IHRWaWV3LmRhdGFbaV0gYXMgVENvbnRhaW5lck5vZGU7XG4gICAgICBjb25zdCBlbWJlZGRlZFRWaWV3ID0gdE5vZGUudFZpZXdzO1xuICAgICAgaWYgKGVtYmVkZGVkVFZpZXcgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZW1iZWRkZWRUVmlldykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGluZyB0Tm9kZS50Vmlld3MgdG8gYmUgYW4gb2JqZWN0LCBidXQgaXQncyBhbiBhcnJheS5gKTtcbiAgICAgICAgfVxuICAgICAgICBuZ2hbVEVNUExBVEVTXSA/Pz0ge307XG4gICAgICAgIG5naFtURU1QTEFURVNdW2kgLSBIRUFERVJfT0ZGU0VUXSA9IGNvbnRleHQuc3NySWRSZWdpc3RyeS5nZXQoZW1iZWRkZWRUVmlldyk7XG4gICAgICB9XG4gICAgICBjb25zdCBob3N0Tm9kZSA9IGxWaWV3W2ldW0hPU1RdITtcbiAgICAgIC8vIExWaWV3W2ldW0hPU1RdIGNhbiBiZSAyIGRpZmZlcmVudCB0eXBlczpcbiAgICAgIC8vIC0gZWl0aGVyIGEgRE9NIE5vZGVcbiAgICAgIC8vIC0gb3IgYW4gTFZpZXcgQXJyYXkgdGhhdCByZXByZXNlbnRzIGEgY29tcG9uZW50XG4gICAgICAvLyBXZSBvbmx5IGhhbmRsZSB0aGUgRE9NIE5vZGUgY2FzZSBoZXJlXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShob3N0Tm9kZSkpIHtcbiAgICAgICAgLy8gdGhpcyBpcyBhIGNvbXBvbmVudFxuICAgICAgICAvLyBDaGVjayB0byBzZWUgaWYgaXQgaGFzIG5nU2tpcEh5ZHJhdGlvblxuICAgICAgICAvLyBUT0RPOiBzaG91bGQgd2UgY2hlY2sgYFNLSVBfSFlEUkFUSU9OX0FUVFJfTkFNRWAgaW4gdE5vZGUubWVyZ2VkQXR0cnM/XG4gICAgICAgIHRhcmdldE5vZGUgPSB1bndyYXBSTm9kZShob3N0Tm9kZSBhcyBMVmlldykgYXMgRWxlbWVudDtcbiAgICAgICAgaWYgKCEodGFyZ2V0Tm9kZSBhcyBIVE1MRWxlbWVudCkuaGFzQXR0cmlidXRlKFNLSVBfSFlEUkFUSU9OX0FUVFJfTkFNRSkpIHtcbiAgICAgICAgICBhbm5vdGF0ZUhvc3RFbGVtZW50Rm9ySHlkcmF0aW9uKHRhcmdldE5vZGUgYXMgRWxlbWVudCwgaG9zdE5vZGUgYXMgTFZpZXcsIGNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBjb250YWluZXIgPSBzZXJpYWxpemVMQ29udGFpbmVyKGxWaWV3W2ldLCBjb250ZXh0KTtcbiAgICAgIG5naFtDT05UQUlORVJTXSA/Pz0ge307XG4gICAgICBuZ2hbQ09OVEFJTkVSU11bYWRqdXN0ZWRJbmRleF0gPSBjb250YWluZXI7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGxWaWV3W2ldKSkge1xuICAgICAgLy8gVGhpcyBpcyBhIGNvbXBvbmVudFxuICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIGl0IGhhcyBuZ1NraXBIeWRyYXRpb25cbiAgICAgIC8vIFRPRE86IHNob3VsZCB3ZSBjaGVjayBgU0tJUF9IWURSQVRJT05fQVRUUl9OQU1FYCBpbiB0Tm9kZS5tZXJnZWRBdHRycz9cbiAgICAgIHRhcmdldE5vZGUgPSB1bndyYXBSTm9kZShsVmlld1tpXVtIT1NUXSEpIGFzIEVsZW1lbnQ7XG4gICAgICBpZiAoISh0YXJnZXROb2RlIGFzIEhUTUxFbGVtZW50KS5oYXNBdHRyaWJ1dGUoU0tJUF9IWURSQVRJT05fQVRUUl9OQU1FKSkge1xuICAgICAgICBhbm5vdGF0ZUhvc3RFbGVtZW50Rm9ySHlkcmF0aW9uKHRhcmdldE5vZGUgYXMgRWxlbWVudCwgbFZpZXdbaV0sIGNvbnRleHQpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUSTE4bk5vZGUodE5vZGUpIHx8IHROb2RlLmluc2VydEJlZm9yZUluZGV4KSB7XG4gICAgICAvLyBUT0RPOiBpbXBsZW1lbnQgaHlkcmF0aW9uIGZvciBpMThuIG5vZGVzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0h5ZHJhdGlvbiBmb3IgaTE4biBub2RlcyBpcyBub3QgaW1wbGVtZW50ZWQuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHROb2RlVHlwZSA9IHROb2RlLnR5cGU7XG4gICAgICAvLyA8bmctY29udGFpbmVyPiBjYXNlXG4gICAgICBpZiAodE5vZGVUeXBlICYgVE5vZGVUeXBlLkVsZW1lbnRDb250YWluZXIpIHtcbiAgICAgICAgY29uc3Qgcm9vdE5vZGVzOiBhbnlbXSA9IFtdO1xuICAgICAgICBjb2xsZWN0TmF0aXZlTm9kZXModFZpZXcsIGxWaWV3LCB0Tm9kZS5jaGlsZCwgcm9vdE5vZGVzKTtcblxuICAgICAgICAvLyBUaGlzIGlzIGFuIFwiZWxlbWVudFwiIGNvbnRhaW5lciAodnMgXCJ2aWV3XCIgY29udGFpbmVyKSxcbiAgICAgICAgLy8gc28gaXQncyBvbmx5IHJlcHJlc2VudGVkIGJ5IHRoZSBudW1iZXIgb2YgdG9wLWxldmVsIG5vZGVzXG4gICAgICAgIC8vIGFzIGEgc2hpZnQgdG8gZ2V0IHRvIGEgY29ycmVzcG9uZGluZyBjb21tZW50IG5vZGUuXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lcjogTmdoQ29udGFpbmVyID0ge1xuICAgICAgICAgIFtOVU1fUk9PVF9OT0RFU106IHJvb3ROb2Rlcy5sZW5ndGgsXG4gICAgICAgIH07XG5cbiAgICAgICAgbmdoW0NPTlRBSU5FUlNdID8/PSB7fTtcbiAgICAgICAgbmdoW0NPTlRBSU5FUlNdW2FkanVzdGVkSW5kZXhdID0gY29udGFpbmVyO1xuICAgICAgfSBlbHNlIGlmICh0Tm9kZVR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikge1xuICAgICAgICAvLyBDdXJyZW50IFROb2RlIGhhcyBubyBET00gZWxlbWVudCBhc3NvY2lhdGVkIHdpdGggaXQsXG4gICAgICAgIC8vIHNvIHRoZSBmb2xsb3dpbmcgbm9kZSB3b3VsZCBub3QgYmUgYWJsZSB0byBmaW5kIGFuIGFuY2hvci5cbiAgICAgICAgLy8gVXNlIGZ1bGwgcGF0aCBpbnN0ZWFkLlxuICAgICAgICBsZXQgbmV4dFROb2RlID0gdE5vZGUubmV4dDtcbiAgICAgICAgd2hpbGUgKG5leHRUTm9kZSAhPT0gbnVsbCAmJiAobmV4dFROb2RlLnR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikpIHtcbiAgICAgICAgICBuZXh0VE5vZGUgPSBuZXh0VE5vZGUubmV4dDtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmV4dFROb2RlKSB7XG4gICAgICAgICAgY29uc3QgaW5kZXggPSBuZXh0VE5vZGUuaW5kZXggLSBIRUFERVJfT0ZGU0VUO1xuICAgICAgICAgIGlmICghaXNJblNraXBIeWRyYXRpb25CbG9jayhuZXh0VE5vZGUsIGxWaWV3KSkge1xuICAgICAgICAgICAgY29uc3QgcGF0aCA9IGNhbGNQYXRoRm9yTm9kZShsVmlldywgbmV4dFROb2RlKTtcbiAgICAgICAgICAgIG5naFtOT0RFU10gPz89IHt9O1xuICAgICAgICAgICAgbmdoW05PREVTXVtpbmRleF0gPSBwYXRoO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGlzRHJvcHBlZFByb2plY3RlZE5vZGUodE5vZGUpKSB7XG4gICAgICAgICAgLy8gVGhpcyBpcyBhIGNhc2Ugd2hlcmUgYSBub2RlIHVzZWQgaW4gY29udGVudCBwcm9qZWN0aW9uXG4gICAgICAgICAgLy8gZG9lc24ndCBtYWtlIGl0IGludG8gb25lIG9mIHRoZSBjb250ZW50IHByb2plY3Rpb24gc2xvdHNcbiAgICAgICAgICAvLyAoZm9yIGV4YW1wbGUsIHdoZW4gdGhlcmUgaXMgbm8gZGVmYXVsdCA8bmctY29udGVudCAvPiBzbG90XG4gICAgICAgICAgLy8gaW4gcHJvamVjdG9yIGNvbXBvbmVudCdzIHRlbXBsYXRlKS5cbiAgICAgICAgICBuZ2hbTk9ERVNdID8/PSB7fTtcbiAgICAgICAgICBuZ2hbTk9ERVNdW2FkanVzdGVkSW5kZXhdID0gRFJPUFBFRF9QUk9KRUNURURfTk9ERTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBIYW5kbGUgY2FzZXMgd2hlcmUgdGV4dCBub2RlcyBjYW4gYmUgbG9zdCBhZnRlciBET00gc2VyaWFsaXphdGlvbjpcbiAgICAgICAgICAvLyAgMS4gV2hlbiB0aGVyZSBpcyBhbiAqZW1wdHkgdGV4dCBub2RlKiBpbiBET006IGluIHRoaXMgY2FzZSwgdGhpc1xuICAgICAgICAgIC8vICAgICBub2RlIHdvdWxkIG5vdCBtYWtlIGl0IGludG8gdGhlIHNlcmlhbGl6ZWQgc3RyaW5nIGFuZCBhcyBzIHJlc3VsdCxcbiAgICAgICAgICAvLyAgICAgdGhpcyBub2RlIHdvdWxkbid0IGJlIGNyZWF0ZWQgaW4gYSBicm93c2VyLiBUaGlzIHdvdWxkIHJlc3VsdCBpblxuICAgICAgICAgIC8vICAgICBhIG1pc21hdGNoIGR1cmluZyB0aGUgaHlkcmF0aW9uLCB3aGVyZSB0aGUgcnVudGltZSBsb2dpYyB3b3VsZCBleHBlY3RcbiAgICAgICAgICAvLyAgICAgYSB0ZXh0IG5vZGUgdG8gYmUgcHJlc2VudCBpbiBsaXZlIERPTSwgYnV0IG5vIHRleHQgbm9kZSB3b3VsZCBleGlzdC5cbiAgICAgICAgICAvLyAgICAgRXhhbXBsZTogYDxzcGFuPnt7IG5hbWUgfX08L3NwYW4+YCB3aGVuIHRoZSBgbmFtZWAgaXMgYW4gZW1wdHkgc3RyaW5nLlxuICAgICAgICAgIC8vICAgICBUaGlzIHdvdWxkIHJlc3VsdCBpbiBgPHNwYW4+PC9zcGFuPmAgc3RyaW5nIGFmdGVyIHNlcmlhbGl6YXRpb24gYW5kXG4gICAgICAgICAgLy8gICAgIGluIGEgYnJvd3NlciBvbmx5IHRoZSBgc3BhbmAgZWxlbWVudCB3b3VsZCBiZSBjcmVhdGVkLiBUbyByZXNvbHZlIHRoYXQsXG4gICAgICAgICAgLy8gICAgIGFuIGV4dHJhIGNvbW1lbnQgbm9kZSBpcyBhcHBlbmRlZCBpbiBwbGFjZSBvZiBhbiBlbXB0eSB0ZXh0IG5vZGUgYW5kXG4gICAgICAgICAgLy8gICAgIHRoYXQgc3BlY2lhbCBjb21tZW50IG5vZGUgaXMgcmVwbGFjZWQgd2l0aCBhbiBlbXB0eSB0ZXh0IG5vZGUgKmJlZm9yZSpcbiAgICAgICAgICAvLyAgICAgaHlkcmF0aW9uLlxuICAgICAgICAgIC8vICAyLiBXaGVuIHRoZXJlIGFyZSAyIGNvbnNlY3V0aXZlIHRleHQgbm9kZXMgcHJlc2VudCBpbiB0aGUgRE9NLlxuICAgICAgICAgIC8vICAgICBFeGFtcGxlOiBgPGRpdj5IZWxsbyA8bmctY29udGFpbmVyICpuZ0lmPVwidHJ1ZVwiPndvcmxkPC9uZy1jb250YWluZXI+PC9kaXY+YC5cbiAgICAgICAgICAvLyAgICAgSW4gdGhpcyBzY2VuYXJpbywgdGhlIGxpdmUgRE9NIHdvdWxkIGxvb2sgbGlrZSB0aGlzOlxuICAgICAgICAgIC8vICAgICAgIDxkaXY+I3RleHQoJ0hlbGxvICcpICN0ZXh0KCd3b3JsZCcpICNjb21tZW50KCdjb250YWluZXInKTwvZGl2PlxuICAgICAgICAgIC8vICAgICBTZXJpYWxpemVkIHN0cmluZyB3b3VsZCBsb29rIGxpa2UgdGhpczogYDxkaXY+SGVsbG8gd29ybGQ8IS0tY29udGFpbmVyLS0+PC9kaXY+YC5cbiAgICAgICAgICAvLyAgICAgVGhlIGxpdmUgRE9NIGluIGEgYnJvd3NlciBhZnRlciB0aGF0IHdvdWxkIGJlOlxuICAgICAgICAgIC8vICAgICAgIDxkaXY+I3RleHQoJ0hlbGxvIHdvcmxkJykgI2NvbW1lbnQoJ2NvbnRhaW5lcicpPC9kaXY+XG4gICAgICAgICAgLy8gICAgIE5vdGljZSBob3cgMiB0ZXh0IG5vZGVzIGFyZSBub3cgXCJtZXJnZWRcIiBpbnRvIG9uZS4gVGhpcyB3b3VsZCBjYXVzZSBoeWRyYXRpb25cbiAgICAgICAgICAvLyAgICAgbG9naWMgdG8gZmFpbCwgc2luY2UgaXQnZCBleHBlY3QgMiB0ZXh0IG5vZGVzIGJlaW5nIHByZXNlbnQsIG5vdCBvbmUuXG4gICAgICAgICAgLy8gICAgIFRvIGZpeCB0aGlzLCB3ZSBpbnNlcnQgYSBzcGVjaWFsIGNvbW1lbnQgbm9kZSBpbiBiZXR3ZWVuIHRob3NlIHRleHQgbm9kZXMsIHNvXG4gICAgICAgICAgLy8gICAgIHNlcmlhbGl6ZWQgcmVwcmVzZW50YXRpb24gaXM6IGA8ZGl2PkhlbGxvIDwhLS1uZ3Rucy0tPndvcmxkPCEtLWNvbnRhaW5lci0tPjwvZGl2PmAuXG4gICAgICAgICAgLy8gICAgIFRoaXMgZm9yY2VzIGJyb3dzZXIgdG8gY3JlYXRlIDIgdGV4dCBub2RlcyBzZXBhcmF0ZWQgYnkgYSBjb21tZW50IG5vZGUuXG4gICAgICAgICAgLy8gICAgIEJlZm9yZSBydW5uaW5nIGEgaHlkcmF0aW9uIHByb2Nlc3MsIHRoaXMgc3BlY2lhbCBjb21tZW50IG5vZGUgaXMgcmVtb3ZlZCwgc28gdGhlXG4gICAgICAgICAgLy8gICAgIGxpdmUgRE9NIGhhcyBleGFjdGx5IHRoZSBzYW1lIHN0YXRlIGFzIGl0IHdhcyBiZWZvcmUgc2VyaWFsaXphdGlvbi5cbiAgICAgICAgICBpZiAodE5vZGVUeXBlICYgVE5vZGVUeXBlLlRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0IHJOb2RlID0gdW53cmFwUk5vZGUobFZpZXdbaV0pIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgaWYgKHJOb2RlLnRleHRDb250ZW50ID09PSAnJykge1xuICAgICAgICAgICAgICBjb250ZXh0LmNvcnJ1cHRlZFRleHROb2Rlcy5zZXQoRU1QVFlfVEVYVF9OT0RFX0NPTU1FTlQsIHJOb2RlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAock5vZGUubmV4dFNpYmxpbmc/Lm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSkge1xuICAgICAgICAgICAgICBjb250ZXh0LmNvcnJ1cHRlZFRleHROb2Rlcy5zZXQoVEVYVF9OT0RFX1NFUEFSQVRPUl9DT01NRU5ULCByTm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHROb2RlLnByb2plY3Rpb25OZXh0ICYmIHROb2RlLnByb2plY3Rpb25OZXh0ICE9PSB0Tm9kZS5uZXh0KSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBwcm9qZWN0aW9uIG5leHQgaXMgbm90IHRoZSBzYW1lIGFzIG5leHQsIGluIHdoaWNoIGNhc2VcbiAgICAgICAgICAgIC8vIHRoZSBub2RlIHdvdWxkIG5vdCBiZSBmb3VuZCBhdCBjcmVhdGlvbiB0aW1lIGF0IHJ1bnRpbWUgYW5kIHdlXG4gICAgICAgICAgICAvLyBuZWVkIHRvIHByb3ZpZGUgYSBsb2NhdGlvbiB0byB0aGF0IG5vZGUuXG4gICAgICAgICAgICBjb25zdCBuZXh0UHJvamVjdGVkVE5vZGUgPSB0Tm9kZS5wcm9qZWN0aW9uTmV4dDtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gbmV4dFByb2plY3RlZFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgICAgICAgICAgIGlmICghaXNJblNraXBIeWRyYXRpb25CbG9jayhuZXh0UHJvamVjdGVkVE5vZGUsIGxWaWV3KSkge1xuICAgICAgICAgICAgICBjb25zdCBwYXRoID0gY2FsY1BhdGhGb3JOb2RlKGxWaWV3LCBuZXh0UHJvamVjdGVkVE5vZGUpO1xuICAgICAgICAgICAgICBuZ2hbTk9ERVNdID8/PSB7fTtcbiAgICAgICAgICAgICAgbmdoW05PREVTXVtpbmRleF0gPSBwYXRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gbmdoO1xufVxuXG5mdW5jdGlvbiBpc1Jvb3RMZXZlbFByb2plY3Rpb25Ob2RlKHROb2RlOiBUTm9kZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gKHROb2RlLmZsYWdzICYgVE5vZGVGbGFncy5pc1Byb2plY3RlZCkgPT09IFROb2RlRmxhZ3MuaXNQcm9qZWN0ZWQ7XG59XG5cbi8qKlxuICogRGV0ZWN0IGEgY2FzZSB3aGVyZSBhIG5vZGUgdXNlZCBpbiBjb250ZW50IHByb2plY3Rpb24sXG4gKiBidXQgZG9lc24ndCBtYWtlIGl0IGludG8gb25lIG9mIHRoZSBjb250ZW50IHByb2plY3Rpb24gc2xvdHNcbiAqIChmb3IgZXhhbXBsZSwgd2hlbiB0aGVyZSBpcyBubyBkZWZhdWx0IDxuZy1jb250ZW50IC8+IHNsb3RcbiAqIGluIHByb2plY3RvciBjb21wb25lbnQncyB0ZW1wbGF0ZSkuXG4gKi9cbmZ1bmN0aW9uIGlzRHJvcHBlZFByb2plY3RlZE5vZGUodE5vZGU6IFROb2RlKTogYm9vbGVhbiB7XG4gIGxldCBjdXJyZW50VE5vZGUgPSB0Tm9kZTtcbiAgbGV0IHNlZW5Db21wb25lbnRIb3N0ID0gZmFsc2U7XG4gIHdoaWxlIChjdXJyZW50VE5vZGUgIT09IG51bGwpIHtcbiAgICBpZiAoaXNDb21wb25lbnRIb3N0KGN1cnJlbnRUTm9kZSkpIHtcbiAgICAgIHNlZW5Db21wb25lbnRIb3N0ID0gdHJ1ZTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICAvLyBJZiB3ZSBjb21lIGFjcm9zcyBhIHJvb3QgcHJvamVjdGVkIG5vZGUsIHJldHVybiB0cnVlLlxuICAgIGlmIChpc1Jvb3RMZXZlbFByb2plY3Rpb25Ob2RlKGN1cnJlbnRUTm9kZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY3VycmVudFROb2RlID0gY3VycmVudFROb2RlLnBhcmVudCBhcyBUTm9kZTtcbiAgfVxuICAvLyBJZiB3ZSd2ZSBzZWVuIGEgY29tcG9uZW50IGhvc3QsIGJ1dCB0aGVyZSB3YXMgbm8gcm9vdCBsZXZlbFxuICAvLyBwcm9qZWN0aW9uIG5vZGUsIHRoaXMgaW5kaWNhdGVzIHRoYXQgdGhpcyBub3Qgd2FzIG5vdCBwcm9qZWN0ZWQuXG4gIHJldHVybiBzZWVuQ29tcG9uZW50SG9zdDtcbn1cblxuZnVuY3Rpb24gY2FsY1BhdGhGb3JOb2RlKGxWaWV3OiBMVmlldywgdE5vZGU6IFROb2RlLCBwYXJlbnRUTm9kZT86IFROb2RlfG51bGwpOiBzdHJpbmcge1xuICBjb25zdCBpbmRleCA9IHROb2RlLmluZGV4O1xuICAvLyBJZiBgbnVsbGAgaXMgcGFzc2VkIGV4cGxpY2l0bHksIHVzZSB0aGlzIGFzIGEgc2lnbmFsIHRoYXQgd2Ugd2FudCB0byBjYWxjdWxhdGVcbiAgLy8gdGhlIHBhdGggc3RhcnRpbmcgZnJvbSBgbFZpZXdbSE9TVF1gLlxuICBwYXJlbnRUTm9kZSA9IHBhcmVudFROb2RlID09PSBudWxsID8gbnVsbCA6IChwYXJlbnRUTm9kZSB8fCB0Tm9kZS5wYXJlbnQhKTtcbiAgY29uc3QgcGFyZW50SW5kZXggPSBwYXJlbnRUTm9kZSA9PT0gbnVsbCA/IFJFRkVSRU5DRV9OT0RFX0hPU1QgOiBwYXJlbnRUTm9kZS5pbmRleDtcbiAgY29uc3QgcGFyZW50Uk5vZGUgPVxuICAgICAgcGFyZW50VE5vZGUgPT09IG51bGwgPyBsVmlld1tIT1NUXSA6IHVud3JhcFJOb2RlKGxWaWV3W3BhcmVudEluZGV4IGFzIG51bWJlcl0pO1xuICBsZXQgck5vZGUgPSB1bndyYXBSTm9kZShsVmlld1tpbmRleF0pO1xuICBpZiAodE5vZGUudHlwZSAmIFROb2RlVHlwZS5BbnlDb250YWluZXIpIHtcbiAgICAvLyBGb3IgPG5nLWNvbnRhaW5lcj4gbm9kZXMsIGluc3RlYWQgb2Ygc2VyaWFsaXppbmcgYSByZWZlcmVuY2VcbiAgICAvLyB0byB0aGUgYW5jaG9yIGNvbW1lbnQgbm9kZSwgc2VyaWFsaXplIGEgbG9jYXRpb24gb2YgdGhlIGZpcnN0XG4gICAgLy8gRE9NIGVsZW1lbnQuIFBhaXJlZCB3aXRoIHRoZSBjb250YWluZXIgc2l6ZSAoc2VyaWFsaXplZCBhcyBhIHBhcnRcbiAgICAvLyBvZiBgbmdoLmNvbnRhaW5lcnNgKSwgaXQgc2hvdWxkIGdpdmUgZW5vdWdoIGluZm9ybWF0aW9uIGZvciBydW50aW1lXG4gICAgLy8gdG8gaHlkcmF0ZSBub2RlcyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgICBjb25zdCBmaXJzdFJOb2RlID0gZ2V0Rmlyc3ROYXRpdmVOb2RlKGxWaWV3LCB0Tm9kZSk7XG5cbiAgICAvLyBJZiBjb250YWluZXIgaXMgbm90IGVtcHR5LCB1c2UgYSByZWZlcmVuY2UgdG8gdGhlIGZpcnN0IGVsZW1lbnQsXG4gICAgLy8gb3RoZXJ3aXNlLCByTm9kZSB3b3VsZCBwb2ludCB0byBhbiBhbmNob3IgY29tbWVudCBub2RlLlxuICAgIGlmIChmaXJzdFJOb2RlKSB7XG4gICAgICByTm9kZSA9IGZpcnN0Uk5vZGU7XG4gICAgfVxuICB9XG4gIGNvbnN0IHJlZmVyZW5jZU5vZGUgPVxuICAgICAgcGFyZW50SW5kZXggPT09IFJFRkVSRU5DRV9OT0RFX0hPU1QgPyBwYXJlbnRJbmRleCA6ICcnICsgKHBhcmVudEluZGV4IC0gSEVBREVSX09GRlNFVCk7XG4gIGxldCBwYXRoOiBzdHJpbmd8bnVsbCA9IGNhbGNQYXRoQmV0d2VlbihwYXJlbnRSTm9kZSBhcyBOb2RlLCByTm9kZSBhcyBOb2RlLCByZWZlcmVuY2VOb2RlKTtcbiAgaWYgKHBhdGggPT09IG51bGwgJiYgcGFyZW50Uk5vZGUgIT09IHJOb2RlKSB7XG4gICAgLy8gU2VhcmNoaW5nIGZvciBhIHBhdGggYmV0d2VlbiBlbGVtZW50cyB3aXRoaW4gYSBob3N0IG5vZGUgZmFpbGVkLlxuICAgIC8vIFRyeWluZyB0byBmaW5kIGEgcGF0aCB0byBhbiBlbGVtZW50IHN0YXJ0aW5nIGZyb20gdGhlIGBkb2N1bWVudC5ib2R5YCBpbnN0ZWFkLlxuICAgIGNvbnN0IGJvZHkgPSAocGFyZW50Uk5vZGUgYXMgTm9kZSkub3duZXJEb2N1bWVudCEuYm9keSBhcyBOb2RlO1xuICAgIHBhdGggPSBjYWxjUGF0aEJldHdlZW4oYm9keSwgck5vZGUgYXMgTm9kZSwgUkVGRVJFTkNFX05PREVfQk9EWSk7XG5cbiAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgLy8gSWYgcGF0aCBpcyBzdGlsbCBlbXB0eSwgaXQncyBsaWtlbHkgdGhhdCB0aGlzIG5vZGUgaXMgZGV0YWNoZWQgYW5kXG4gICAgICAvLyB3b24ndCBiZSBmb3VuZCBkdXJpbmcgaHlkcmF0aW9uLlxuICAgICAgLy8gVE9ETzogYWRkIGEgYmV0dGVyIGVycm9yIG1lc3NhZ2UsIHBvdGVudGlhbGx5IHN1Z2dlc3RpbmcgYG5nU2tpcEh5ZHJhdGlvbmAuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBsb2NhdGUgZWxlbWVudCBvbiBhIHBhZ2UuJyk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwYXRoITtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplTENvbnRhaW5lcihsQ29udGFpbmVyOiBMQ29udGFpbmVyLCBjb250ZXh0OiBIeWRyYXRpb25Db250ZXh0KTogTmdoQ29udGFpbmVyIHtcbiAgY29uc3QgY29udGFpbmVyOiBOZ2hDb250YWluZXIgPSB7fTtcblxuICBmb3IgKGxldCBpID0gQ09OVEFJTkVSX0hFQURFUl9PRkZTRVQ7IGkgPCBsQ29udGFpbmVyLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGNoaWxkTFZpZXcgPSBsQ29udGFpbmVyW2ldIGFzIExWaWV3O1xuXG4gICAgLy8gR2V0IExWaWV3IGZvciB1bmRlcmx5aW5nIGNvbXBvbmVudC5cbiAgICBpZiAoaXNSb290VmlldyhjaGlsZExWaWV3KSkge1xuICAgICAgY2hpbGRMVmlldyA9IGNoaWxkTFZpZXdbSEVBREVSX09GRlNFVF07XG4gICAgfVxuICAgIGNvbnN0IGNoaWxkVFZpZXcgPSBjaGlsZExWaWV3W1RWSUVXXTtcblxuICAgIGxldCB0ZW1wbGF0ZTtcbiAgICBsZXQgbnVtUm9vdE5vZGVzID0gMDtcbiAgICBpZiAoY2hpbGRUVmlldy50eXBlID09PSBUVmlld1R5cGUuQ29tcG9uZW50KSB7XG4gICAgICBjb25zdCBjdHggPSBjaGlsZExWaWV3W0NPTlRFWFRdO1xuICAgICAgY29uc3QgY29tcG9uZW50RGVmID0gZ2V0Q29tcG9uZW50RGVmKGN0eCEuY29uc3RydWN0b3IgYXMgVHlwZTx1bmtub3duPikhO1xuICAgICAgdGVtcGxhdGUgPSBnZXRDb21wb25lbnRJZChjb21wb25lbnREZWYpO1xuXG4gICAgICAvLyBUaGlzIGlzIGEgY29tcG9uZW50IHZpZXcsIHdoaWNoIGhhcyBvbmx5IDEgcm9vdCBub2RlOiB0aGUgY29tcG9uZW50XG4gICAgICAvLyBob3N0IG5vZGUgaXRzZWxmIChvdGhlciBub2RlcyB3b3VsZCBiZSBpbnNpZGUgdGhhdCBob3N0IG5vZGUpLlxuICAgICAgbnVtUm9vdE5vZGVzID0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGVtcGxhdGUgPVxuICAgICAgICAgIGNvbnRleHQuc3NySWRSZWdpc3RyeS5nZXQoY2hpbGRUVmlldyk7ICAvLyBmcm9tIHdoaWNoIHRlbXBsYXRlIGRpZCB0aGlzIGxWaWV3IG9yaWdpbmF0ZT9cblxuICAgICAgLy8gQ29sbGVjdCByb290IG5vZGVzIHdpdGhpbiB0aGlzIHZpZXcuXG4gICAgICBjb25zdCByb290Tm9kZXM6IHVua25vd25bXSA9IFtdO1xuICAgICAgY29sbGVjdE5hdGl2ZU5vZGVzKGNoaWxkVFZpZXcsIGNoaWxkTFZpZXcsIGNoaWxkVFZpZXcuZmlyc3RDaGlsZCwgcm9vdE5vZGVzKTtcbiAgICAgIG51bVJvb3ROb2RlcyA9IHJvb3ROb2Rlcy5sZW5ndGg7XG4gICAgfVxuXG4gICAgY29uc3QgdmlldzogTmdoVmlldyA9IHtcbiAgICAgIFtURU1QTEFURV06IHRlbXBsYXRlLFxuICAgICAgW05VTV9ST09UX05PREVTXTogbnVtUm9vdE5vZGVzLFxuICAgICAgLi4uc2VyaWFsaXplTFZpZXcobENvbnRhaW5lcltpXSBhcyBMVmlldywgY29udGV4dCksXG4gICAgfTtcbiAgICBjb250YWluZXJbVklFV1NdID8/PSBbXTtcbiAgICBpZiAoY29udGFpbmVyW1ZJRVdTXS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBwcmV2VmlldyA9IGNvbnRhaW5lcltWSUVXU10uYXQoLTEpITsgIC8vIHRoZSBsYXN0IGVsZW1lbnQgaW4gYXJyYXlcbiAgICAgIC8vIENvbXBhcmUgYHZpZXdgIGFuZCBgcHJldlZpZXdgIHRvIHNlZSBpZiB0aGV5IGFyZSB0aGUgc2FtZS5cbiAgICAgIGlmIChjb21wYXJlTmdoVmlldyh2aWV3LCBwcmV2VmlldykpIHtcbiAgICAgICAgcHJldlZpZXdbTVVMVElQTElFUl0gPz89IDE7XG4gICAgICAgIHByZXZWaWV3W01VTFRJUExJRVJdKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb250YWluZXJbVklFV1NdLnB1c2godmlldyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRhaW5lcltWSUVXU10ucHVzaCh2aWV3KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY29udGFpbmVyO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlTmdoVmlldyhjdXJyOiBOZ2hWaWV3LCBwcmV2OiBOZ2hWaWV3KTogYm9vbGVhbiB7XG4gIGNvbnN0IHByZXZDbG9uZSA9IHsuLi5wcmV2fTtcbiAgZGVsZXRlIHByZXZDbG9uZVtNVUxUSVBMSUVSXTtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGN1cnIpID09PSBKU09OLnN0cmluZ2lmeShwcmV2Q2xvbmUpO1xufVxuXG5leHBvcnQgY29uc3QgTkdIX0RBVEFfS0VZID0gbWFrZVN0YXRlS2V5PEFycmF5PE5naERvbT4+KFRSQU5TRkVSX1NUQVRFX1RPS0VOX0lEKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGFubm90YXRlSG9zdEVsZW1lbnRGb3JIeWRyYXRpb24oXG4gICAgZWxlbWVudDogRWxlbWVudCwgbFZpZXc6IExWaWV3LCBjb250ZXh0OiBIeWRyYXRpb25Db250ZXh0KTogdm9pZCB7XG4gIGNvbnN0IG5naCA9IHNlcmlhbGl6ZUxWaWV3KGxWaWV3LCBjb250ZXh0KTtcbiAgY29uc3QgaW5kZXggPSBjb250ZXh0LmFubm90YXRpb25Db2xsZWN0aW9uLmFkZChuZ2gpO1xuICBpZiAoY29udGV4dC5wcm9maWxlcikge1xuICAgIGlmIChPYmplY3Qua2V5cyhuZ2gpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29udGV4dC5wcm9maWxlci5pbmNyZW1lbnRNZXRyaWNWYWx1ZShTc3JQZXJmTWV0cmljcy5Db21wb25lbnRzV2l0aEVtcHR5TmdoLCAxKTtcbiAgICB9XG4gICAgY29udGV4dC5wcm9maWxlci5pbmNyZW1lbnRNZXRyaWNWYWx1ZShcbiAgICAgICAgU3NyUGVyZk1ldHJpY3MuTmdoQW5ub3RhdGlvblNpemUsXG4gICAgICAgIGluZGV4LnRvU3RyaW5nKCkubGVuZ3RoICsgNyk7ICAvLyA3IHRvIGFjY291bnQgZm9yICcgbmdoPVwiXCInXG4gICAgY29udGV4dC5wcm9maWxlci5pbmNyZW1lbnRNZXRyaWNWYWx1ZShcbiAgICAgICAgU3NyUGVyZk1ldHJpY3MuU2VyaWFsaXplZENvbXBvbmVudHMsIDEpOyAgLy8gaW5jcmVtZW50IGJ5IG9uZSBtb3JlIGNvbXBvbmVudFxuICB9XG4gIGVsZW1lbnQuc2V0QXR0cmlidXRlKE5HSF9BVFRSX05BTUUsIGluZGV4LnRvU3RyaW5nKCkpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRUZXh0Tm9kZU1hcmtlcnMoY29ycnVwdGVkVGV4dE5vZGVzOiBNYXA8c3RyaW5nLCBIVE1MRWxlbWVudD4sIGRvYzogRG9jdW1lbnQpIHtcbiAgZm9yIChsZXQgW21hcmtlciwgdGV4dE5vZGVdIG9mIGNvcnJ1cHRlZFRleHROb2Rlcykge1xuICAgIHRleHROb2RlLmFmdGVyKGRvYy5jcmVhdGVDb21tZW50KG1hcmtlcikpO1xuICB9XG59XG4iXX0=