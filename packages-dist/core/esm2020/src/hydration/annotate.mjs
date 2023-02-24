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
import { CONTEXT, FLAGS, HEADER_OFFSET, HOST, TVIEW } from '../render3/interfaces/view';
import { getFirstNativeNode } from '../render3/node_manipulation';
import { unwrapRNode } from '../render3/util/view_utils';
import { TRANSFER_STATE_TOKEN_ID } from './api';
import { nodeNotFoundError } from './error_handling';
import { CONTAINERS, LAZY, MULTIPLIER, NODES, NUM_ROOT_NODES, TEMPLATE, TEMPLATES, VIEWS } from './interfaces';
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
            // TODO: improve this error message to suggest possible solutions
            // (ngSkipHydration?).
            throw new Error('Hydration for i18n nodes is not yet supported.');
        }
        else {
            const tNodeType = tNode.type;
            // <ng-container> case
            if (tNodeType & 8 /* TNodeType.ElementContainer */) {
                // This is an "element" container (vs "view" container),
                // so it's only represented by the number of top-level nodes
                // as a shift to get to a corresponding comment node.
                const container = {
                    [NUM_ROOT_NODES]: calcNumRootNodes(tView, lView, tNode.child),
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
function calcPathForNode(lView, tNode) {
    const index = tNode.index;
    const parentTNode = tNode.parent;
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
            // If the path is still empty, it's likely that this node is detached and
            // won't be found during hydration.
            throw nodeNotFoundError(lView, tNode);
        }
    }
    return path;
}
function calcNumRootNodes(tView, lView, tNode) {
    const rootNodes = [];
    collectNativeNodes(tView, lView, tNode, rootNodes);
    return rootNodes.length;
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
            template = context.ssrIdRegistry.get(childTView);
            numRootNodes = calcNumRootNodes(childTView, childLView, childTView.firstChild);
        }
        const view = {
            [TEMPLATE]: template,
            [NUM_ROOT_NODES]: numRootNodes,
            ...serializeLView(lContainer[i], context),
        };
        // Add annotation if a view is lazy.
        if ((childLView[FLAGS] & 32 /* LViewFlags.Lazy */) === 32 /* LViewFlags.Lazy */) {
            view[LAZY] = 1; // use number instead of true, because it's shorter
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vYW5ub3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFpQiwrQkFBK0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBRW5GLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLGlDQUFpQyxDQUFDO0FBQ25FLE9BQU8sRUFBQyxlQUFlLEVBQUUsY0FBYyxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDdEUsT0FBTyxFQUFDLHVCQUF1QixFQUFhLE1BQU0saUNBQWlDLENBQUM7QUFFcEYsT0FBTyxFQUFDLGVBQWUsRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFDLE1BQU0sbUNBQW1DLENBQUM7QUFDL0csT0FBTyxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBNEIsS0FBSyxFQUFZLE1BQU0sNEJBQTRCLENBQUM7QUFDM0gsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sOEJBQThCLENBQUM7QUFDaEUsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBRXZELE9BQU8sRUFBQyx1QkFBdUIsRUFBQyxNQUFNLE9BQU8sQ0FBQztBQUM5QyxPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUNuRCxPQUFPLEVBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQWlDLEtBQUssRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDNUksT0FBTyxFQUFDLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBRTlGLE9BQU8sRUFBQyxzQkFBc0IsRUFBRSx3QkFBd0Is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RTtZQUNqQyxPQUFPLENBQUMsUUFBUSxDQUFDLG9CQUFvQiwwRUFBd0MsQ0FBQyxDQUFDLENBQUM7U0FDakY7UUFDRCxPQUFPLENBQUMsUUFBUSxDQUFDLG9CQUFvQiwyRkFFakMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFFLDZCQUE2QjtRQUNoRSxPQUFPLENBQUMsUUFBUSxDQUFDLG9CQUFvQixvRUFDSSxDQUFDLENBQUMsQ0FBQyxDQUFFLGtDQUFrQztLQUNqRjtJQUNELE9BQU8sQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0FBQ3hELENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLGtCQUE0QyxFQUFFLEdBQWE7SUFDeEYsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxJQUFJLGtCQUFrQixFQUFFO1FBQ2pELFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0tBQzNDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FwcGxpY2F0aW9uUmVmLCByZXRyaWV2ZVZpZXdzRnJvbUFwcGxpY2F0aW9uUmVmfSBmcm9tICcuLi9hcHBsaWNhdGlvbl9yZWYnO1xuaW1wb3J0IHtUeXBlfSBmcm9tICcuLi9pbnRlcmZhY2UvdHlwZSc7XG5pbXBvcnQge2NvbGxlY3ROYXRpdmVOb2Rlc30gZnJvbSAnLi4vcmVuZGVyMy9jb2xsZWN0X25hdGl2ZV9ub2Rlcyc7XG5pbXBvcnQge2dldENvbXBvbmVudERlZiwgZ2V0Q29tcG9uZW50SWR9IGZyb20gJy4uL3JlbmRlcjMvZGVmaW5pdGlvbic7XG5pbXBvcnQge0NPTlRBSU5FUl9IRUFERVJfT0ZGU0VULCBMQ29udGFpbmVyfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvY29udGFpbmVyJztcbmltcG9ydCB7VENvbnRhaW5lck5vZGUsIFROb2RlLCBUTm9kZUZsYWdzLCBUTm9kZVR5cGV9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9ub2RlJztcbmltcG9ydCB7aXNDb21wb25lbnRIb3N0LCBpc0xDb250YWluZXIsIGlzUHJvamVjdGlvblROb2RlLCBpc1Jvb3RWaWV3fSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvdHlwZV9jaGVja3MnO1xuaW1wb3J0IHtDT05URVhULCBGTEFHUywgSEVBREVSX09GRlNFVCwgSE9TVCwgTFZpZXcsIExWaWV3RmxhZ3MsIFRWaWV3LCBUVklFVywgVFZpZXdUeXBlfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvdmlldyc7XG5pbXBvcnQge2dldEZpcnN0TmF0aXZlTm9kZX0gZnJvbSAnLi4vcmVuZGVyMy9ub2RlX21hbmlwdWxhdGlvbic7XG5pbXBvcnQge3Vud3JhcFJOb2RlfSBmcm9tICcuLi9yZW5kZXIzL3V0aWwvdmlld191dGlscyc7XG5cbmltcG9ydCB7VFJBTlNGRVJfU1RBVEVfVE9LRU5fSUR9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7bm9kZU5vdEZvdW5kRXJyb3J9IGZyb20gJy4vZXJyb3JfaGFuZGxpbmcnO1xuaW1wb3J0IHtDT05UQUlORVJTLCBMQVpZLCBNVUxUSVBMSUVSLCBOZ2hDb250YWluZXIsIE5naERvbSwgTmdoVmlldywgTk9ERVMsIE5VTV9ST09UX05PREVTLCBURU1QTEFURSwgVEVNUExBVEVTLCBWSUVXU30gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7Y2FsY1BhdGhCZXR3ZWVuLCBSRUZFUkVOQ0VfTk9ERV9CT0RZLCBSRUZFUkVOQ0VfTk9ERV9IT1NUfSBmcm9tICcuL25vZGVfbG9va3VwX3V0aWxzJztcbmltcG9ydCB7U3NyUGVyZk1ldHJpY3MsIFNzclByb2ZpbGVyfSBmcm9tICcuL3Byb2ZpbGVyJztcbmltcG9ydCB7aXNJblNraXBIeWRyYXRpb25CbG9jaywgU0tJUF9IWURSQVRJT05fQVRUUl9OQU1FfSBmcm9tICcuL3NraXBfaHlkcmF0aW9uJztcbmltcG9ydCB7RFJPUFBFRF9QUk9KRUNURURfTk9ERSwgRU1QVFlfVEVYVF9OT0RFX0NPTU1FTlQsIGdldENvbXBvbmVudExWaWV3LCBOR0hfQVRUUl9OQU1FLCBURVhUX05PREVfU0VQQVJBVE9SX0NPTU1FTlR9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIFJlZ2lzdHJ5IHRoYXQga2VlcHMgdHJhY2sgb2YgdW5pcXVlIFRWaWV3IGlkcyB0aHJvdWdob3V0XG4gKiB0aGUgc2VyaWFsaXphdGlvbiBwcm9jZXNzLiBUaGlzIGlzIG5lZWRlZCB0byBpZGVudGlmeVxuICogZGVoeWRyYXRlZCB2aWV3cyBhdCBydW50aW1lIHByb3Blcmx5IChwaWNrIHVwIGRlaHlkcmF0ZWRcbiAqIHZpZXdzIGNyZWF0ZWQgYmFzZWQgb24gYSBjZXJ0YWluIFRWaWV3KS5cbiAqL1xuY2xhc3MgVFZpZXdTc3JJZFJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSByZWdpc3RyeSA9IG5ldyBXZWFrTWFwPFRWaWV3LCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgY3VycmVudElkID0gMDtcblxuICBnZXQodFZpZXc6IFRWaWV3KTogc3RyaW5nIHtcbiAgICBpZiAoIXRoaXMucmVnaXN0cnkuaGFzKHRWaWV3KSkge1xuICAgICAgdGhpcy5yZWdpc3RyeS5zZXQodFZpZXcsIGB0JHt0aGlzLmN1cnJlbnRJZCsrfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZWdpc3RyeS5nZXQodFZpZXcpITtcbiAgfVxufVxuXG4vKipcbiAqIEtlZXBzIHRyYWNrIG9mIGFsbCBwcm9kdWNlZCBgbmdoYCBhbm5vdGF0aW9ucyBhbmQgYXZvaWRzXG4gKiBkdXBsaWNhdGlvbi4gSWYgdGhlIHNhbWUgYW5ub3RhdGlvbiBpcyBiZWluZyBhZGRlZCwgdGhlIGNvbGxlY3Rpb25cbiAqIHJlbWFpbnMgdGhlIHNhbWUgYW5kIGFuIGluZGV4IG9mIHRoYXQgYW5ub3RhdGlvbiBpcyByZXR1cm5lZCBpbnN0ZWFkLlxuICogVGhpcyBoZWxwcyBtaW5pbWl6ZSB0aGUgYW1vdW50IG9mIGFubm90YXRpb25zIG5lZWRlZCBvbiBhIHBhZ2UuXG4gKi9cbmNsYXNzIE5naEFubm90YXRpb25Db2xsZWN0aW9uIHtcbiAgcHJpdmF0ZSBkYXRhOiBOZ2hEb21bXSA9IFtdO1xuICBwcml2YXRlIGluZGV4QnlDb250ZW50ID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcblxuICBhZGQobmdoOiBOZ2hEb20pOiBudW1iZXIge1xuICAgIGNvbnN0IG5naEFzU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkobmdoKTtcbiAgICBpZiAoIXRoaXMuaW5kZXhCeUNvbnRlbnQuaGFzKG5naEFzU3RyaW5nKSkge1xuICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmRhdGEubGVuZ3RoO1xuICAgICAgdGhpcy5kYXRhLnB1c2gobmdoKTtcbiAgICAgIHRoaXMuaW5kZXhCeUNvbnRlbnQuc2V0KG5naEFzU3RyaW5nLCBpbmRleCk7XG4gICAgICByZXR1cm4gaW5kZXg7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmluZGV4QnlDb250ZW50LmdldChuZ2hBc1N0cmluZykhO1xuICB9XG5cbiAgZ2V0QWxsQW5ub3RhdGlvbnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YTtcbiAgfVxufVxuXG4vKipcbiAqIERlc2NyaWJlcyBhIGNvbnRleHQgYXZhaWxhYmxlIGR1cmluZyB0aGUgc2VyaWFsaXphdGlvblxuICogcHJvY2Vzcy4gVGhlIGNvbnRleHQgaXMgdXNlZCB0byBzaGFyZSBhbmQgY29sbGVjdCBpbmZvcm1hdGlvblxuICogZHVyaW5nIHRoZSBzZXJpYWxpemF0aW9uLlxuICovXG5pbnRlcmZhY2UgSHlkcmF0aW9uQ29udGV4dCB7XG4gIHNzcklkUmVnaXN0cnk6IFRWaWV3U3NySWRSZWdpc3RyeTtcbiAgY29ycnVwdGVkVGV4dE5vZGVzOiBNYXA8c3RyaW5nLCBIVE1MRWxlbWVudD47XG4gIHByb2ZpbGVyOiBTc3JQcm9maWxlcnxudWxsO1xuICBhbm5vdGF0aW9uQ29sbGVjdGlvbjogTmdoQW5ub3RhdGlvbkNvbGxlY3Rpb247XG59XG5cbnR5cGUgU3RhdGVLZXk8VD4gPSBzdHJpbmcme1xuICBfX25vdF9hX3N0cmluZzogbmV2ZXIsXG4gIF9fdmFsdWVfdHlwZT86IFQsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbWFrZVN0YXRlS2V5PFQgPSB2b2lkPihrZXk6IHN0cmluZyk6IFN0YXRlS2V5PFQ+IHtcbiAgcmV0dXJuIGtleSBhcyBTdGF0ZUtleTxUPjtcbn1cblxuLyoqXG4gKiBUaGlzIGlzIGFuIGludGVyZmFjZSB0aGF0IHJlcHJlc2VudHMgdGhlIGBUcmFuc2ZlclN0YXRlYCBjbGFzc1xuICogZnJvbSB0aGUgYHBsYXRmb3JtLWJyb3dzZXJgIHBhY2thZ2UuXG4gKiBUT0RPOiB0aGUgYFRyYW5zZmVyU3RhdGVgIGZyb20gdGhlIGBwbGF0Zm9ybS1icm93c2VyYCBwYWNrYWdlXG4gKiBzaG91bGQgaW1wbGVtZW50IHRoaXMgaW50ZXJmYWNlICh0byBhdm9pZCBkaXZlcmdlbmNlKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUcmFuc2ZlclN0YXRlIHtcbiAgLyoqXG4gICAqIEdldCB0aGUgdmFsdWUgY29ycmVzcG9uZGluZyB0byBhIGtleS4gUmV0dXJuIGBkZWZhdWx0VmFsdWVgIGlmIGtleSBpcyBub3QgZm91bmQuXG4gICAqL1xuICBnZXQ8VD4oa2V5OiBTdGF0ZUtleTxUPiwgZGVmYXVsdFZhbHVlOiBUKTogVDtcblxuICAvKipcbiAgICogU2V0IHRoZSB2YWx1ZSBjb3JyZXNwb25kaW5nIHRvIGEga2V5LlxuICAgKi9cbiAgc2V0PFQ+KGtleTogU3RhdGVLZXk8VD4sIHZhbHVlOiBUKTogdm9pZDtcblxuICAvKipcbiAgICogUmVtb3ZlIGEga2V5IGZyb20gdGhlIHN0b3JlLlxuICAgKi9cbiAgcmVtb3ZlPFQ+KGtleTogU3RhdGVLZXk8VD4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBUZXN0IHdoZXRoZXIgYSBrZXkgZXhpc3RzIGluIHRoZSBzdG9yZS5cbiAgICovXG4gIGhhc0tleTxUPihrZXk6IFN0YXRlS2V5PFQ+KTogYm9vbGVhbjtcblxuICAvKipcbiAgICogSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHN0YXRlIGlzIGVtcHR5LlxuICAgKi9cbiAgZ2V0IGlzRW1wdHkoKTogYm9vbGVhbjtcblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBjYWxsYmFjayB0byBwcm92aWRlIHRoZSB2YWx1ZSBmb3IgYSBrZXkgd2hlbiBgdG9Kc29uYCBpcyBjYWxsZWQuXG4gICAqL1xuICBvblNlcmlhbGl6ZTxUPihrZXk6IFN0YXRlS2V5PFQ+LCBjYWxsYmFjazogKCkgPT4gVCk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFNlcmlhbGl6ZSB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgc3RvcmUgdG8gSlNPTi5cbiAgICovXG4gIHRvSnNvbigpOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQW5ub3RhdGVzIGFsbCBjb21wb25lbnRzIGJvb3RzdHJhcHBlZCBpbiBhIGdpdmVuIEFwcGxpY2F0aW9uUmVmXG4gKiB3aXRoIGluZm8gbmVlZGVkIGZvciBoeWRyYXRpb24uXG4gKlxuICogQHBhcmFtIGFwcFJlZiBBIGN1cnJlbnQgaW5zdGFuY2Ugb2YgYW4gQXBwbGljYXRpb25SZWYuXG4gKiBAcGFyYW0gZG9jIEEgcmVmZXJlbmNlIHRvIHRoZSBjdXJyZW50IERvY3VtZW50IGluc3RhbmNlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYW5ub3RhdGVGb3JIeWRyYXRpb24oXG4gICAgYXBwUmVmOiBBcHBsaWNhdGlvblJlZiwgZG9jOiBEb2N1bWVudCwgdHJhbnNmZXJTdGF0ZTogVHJhbnNmZXJTdGF0ZSxcbiAgICBwcm9maWxlcjogU3NyUHJvZmlsZXJ8bnVsbCkge1xuICBjb25zdCBzc3JJZFJlZ2lzdHJ5ID0gbmV3IFRWaWV3U3NySWRSZWdpc3RyeSgpO1xuICBjb25zdCBjb3JydXB0ZWRUZXh0Tm9kZXMgPSBuZXcgTWFwPHN0cmluZywgSFRNTEVsZW1lbnQ+KCk7XG4gIGNvbnN0IGFubm90YXRpb25Db2xsZWN0aW9uID0gbmV3IE5naEFubm90YXRpb25Db2xsZWN0aW9uKCk7XG4gIGNvbnN0IHZpZXdSZWZzID0gcmV0cmlldmVWaWV3c0Zyb21BcHBsaWNhdGlvblJlZihhcHBSZWYpO1xuICBmb3IgKGNvbnN0IHZpZXdSZWYgb2Ygdmlld1JlZnMpIHtcbiAgICBjb25zdCBsVmlldyA9IGdldENvbXBvbmVudExWaWV3KHZpZXdSZWYpO1xuICAgIC8vIFRPRE86IG1ha2Ugc3VyZSB0aGF0IHRoaXMgbFZpZXcgcmVwcmVzZW50c1xuICAgIC8vIGEgY29tcG9uZW50IGluc3RhbmNlLlxuICAgIGNvbnN0IGhvc3RFbGVtZW50ID0gbFZpZXdbSE9TVF07XG4gICAgaWYgKGhvc3RFbGVtZW50KSB7XG4gICAgICBjb25zdCBjb250ZXh0OiBIeWRyYXRpb25Db250ZXh0ID0ge1xuICAgICAgICBzc3JJZFJlZ2lzdHJ5LFxuICAgICAgICBjb3JydXB0ZWRUZXh0Tm9kZXMsXG4gICAgICAgIHByb2ZpbGVyLFxuICAgICAgICBhbm5vdGF0aW9uQ29sbGVjdGlvbixcbiAgICAgIH07XG4gICAgICBhbm5vdGF0ZUhvc3RFbGVtZW50Rm9ySHlkcmF0aW9uKGhvc3RFbGVtZW50LCBsVmlldywgY29udGV4dCk7XG4gICAgICBpbnNlcnRUZXh0Tm9kZU1hcmtlcnMoY29ycnVwdGVkVGV4dE5vZGVzLCBkb2MpO1xuICAgICAgcHJvZmlsZXI/LmluY3JlbWVudE1ldHJpY1ZhbHVlKFNzclBlcmZNZXRyaWNzLkVtcHR5VGV4dE5vZGVDb3VudCwgY29ycnVwdGVkVGV4dE5vZGVzLnNpemUpO1xuICAgIH1cbiAgfVxuICBjb25zdCBhbGxBbm5vdGF0aW9ucyA9IGFubm90YXRpb25Db2xsZWN0aW9uLmdldEFsbEFubm90YXRpb25zKCk7XG4gIGlmIChhbGxBbm5vdGF0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgdHJhbnNmZXJTdGF0ZS5zZXQoTkdIX0RBVEFfS0VZLCBhbGxBbm5vdGF0aW9ucyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNUSTE4bk5vZGUob2JqOiBhbnkpOiBib29sZWFuIHtcbiAgLy8gVE9ETzogY29uc2lkZXIgYWRkaW5nIGEgbm9kZSB0eXBlIHRvIFRJMThuP1xuICByZXR1cm4gb2JqLmhhc093blByb3BlcnR5KCdjcmVhdGUnKSAmJiBvYmouaGFzT3duUHJvcGVydHkoJ3VwZGF0ZScpO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVMVmlldyhsVmlldzogTFZpZXcsIGNvbnRleHQ6IEh5ZHJhdGlvbkNvbnRleHQpOiBOZ2hEb20ge1xuICBjb25zdCBuZ2g6IE5naERvbSA9IHt9O1xuICBjb25zdCB0VmlldyA9IGxWaWV3W1RWSUVXXTtcbiAgZm9yIChsZXQgaSA9IEhFQURFUl9PRkZTRVQ7IGkgPCB0Vmlldy5iaW5kaW5nU3RhcnRJbmRleDsgaSsrKSB7XG4gICAgbGV0IHRhcmdldE5vZGU6IE5vZGV8bnVsbCA9IG51bGw7XG4gICAgY29uc3QgYWRqdXN0ZWRJbmRleCA9IGkgLSBIRUFERVJfT0ZGU0VUO1xuICAgIGNvbnN0IHROb2RlID0gdFZpZXcuZGF0YVtpXSBhcyBUQ29udGFpbmVyTm9kZTtcbiAgICAvLyB0Tm9kZSBtYXkgYmUgbnVsbCBpbiB0aGUgY2FzZSBvZiBhIGxvY2FsUmVmXG4gICAgaWYgKCF0Tm9kZSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LnByb2ZpbGVyKSB7XG4gICAgICAvLyBXZSBwcm9jZXNzIDEgbW9yZSBub2RlIGZyb20gTFZpZXcgaGVyZS4gSWYgd2UgcHJvY2VzcyBhIGNvbXBvbmVudFxuICAgICAgLy8gb3IgYW4gTENvbnRhaW5lciwgd2UgY2FuIHN0aWxsIGluY3JlYXNlIHRoZSB2YWx1ZSBieSBvbmUsIHNpbmNlIGJvdGhcbiAgICAgIC8vIG9mIHRoZW0gaGF2ZSBuYXRpdmUgbm9kZXMgKGUuZy4gYGxDb250YWluZXJbSE9TVF1gKS5cbiAgICAgIGNvbnRleHQucHJvZmlsZXIuaW5jcmVtZW50TWV0cmljVmFsdWUoU3NyUGVyZk1ldHJpY3MuU2VyaWFsaXplZERvbU5vZGVzLCAxKTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodE5vZGUucHJvamVjdGlvbikpIHtcbiAgICAgIC8vIFRPRE86IGhhbmRsZSBgUk5vZGVbXWAgYXMgd2VsbC5cbiAgICAgIGZvciAoY29uc3QgaGVhZFROb2RlIG9mICh0Tm9kZS5wcm9qZWN0aW9uIGFzIGFueVtdKSkge1xuICAgICAgICAvLyBXZSBtYXkgaGF2ZSBgbnVsbGBzIGluIHNsb3RzIHdpdGggbm8gcHJvamVjdGVkIGNvbnRlbnQuXG4gICAgICAgIC8vIEFsc28sIGlmIHdlIHByb2Nlc3MgcmUtcHJvamVjdGVkIGNvbnRlbnQgKGkuZS4gYDxuZy1jb250ZW50PmBcbiAgICAgICAgLy8gYXBwZWFycyBhdCBwcm9qZWN0aW9uIGxvY2F0aW9uKSwgc2tpcCBhbm5vdGF0aW9ucyBmb3IgdGhpcyBjb250ZW50XG4gICAgICAgIC8vIHNpbmNlIGFsbCBET00gbm9kZXMgaW4gdGhpcyBwcm9qZWN0aW9uIHdlcmUgaGFuZGxlZCB3aGlsZSBwcm9jZXNzaW5nXG4gICAgICAgIC8vIGEgcGFyZW50IGxWaWV3LCB3aGljaCBjb250YWlucyB0aG9zZSBub2Rlcy5cbiAgICAgICAgaWYgKGhlYWRUTm9kZSAmJiAhaXNQcm9qZWN0aW9uVE5vZGUoaGVhZFROb2RlKSkge1xuICAgICAgICAgIGlmICghaXNJblNraXBIeWRyYXRpb25CbG9jayhoZWFkVE5vZGUsIGxWaWV3KSkge1xuICAgICAgICAgICAgbmdoW05PREVTXSA/Pz0ge307XG4gICAgICAgICAgICBuZ2hbTk9ERVNdW2hlYWRUTm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVRdID0gY2FsY1BhdGhGb3JOb2RlKGxWaWV3LCBoZWFkVE5vZGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNMQ29udGFpbmVyKGxWaWV3W2ldKSkge1xuICAgICAgLy8gdGhpcyBpcyBhIGNvbnRhaW5lclxuICAgICAgY29uc3QgdE5vZGUgPSB0Vmlldy5kYXRhW2ldIGFzIFRDb250YWluZXJOb2RlO1xuICAgICAgY29uc3QgZW1iZWRkZWRUVmlldyA9IHROb2RlLnRWaWV3cztcbiAgICAgIGlmIChlbWJlZGRlZFRWaWV3ICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGVtYmVkZGVkVFZpZXcpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RpbmcgdE5vZGUudFZpZXdzIHRvIGJlIGFuIG9iamVjdCwgYnV0IGl0J3MgYW4gYXJyYXkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgbmdoW1RFTVBMQVRFU10gPz89IHt9O1xuICAgICAgICBuZ2hbVEVNUExBVEVTXVtpIC0gSEVBREVSX09GRlNFVF0gPSBjb250ZXh0LnNzcklkUmVnaXN0cnkuZ2V0KGVtYmVkZGVkVFZpZXcpO1xuICAgICAgfVxuICAgICAgY29uc3QgaG9zdE5vZGUgPSBsVmlld1tpXVtIT1NUXSE7XG4gICAgICAvLyBMVmlld1tpXVtIT1NUXSBjYW4gYmUgMiBkaWZmZXJlbnQgdHlwZXM6XG4gICAgICAvLyAtIGVpdGhlciBhIERPTSBOb2RlXG4gICAgICAvLyAtIG9yIGFuIExWaWV3IEFycmF5IHRoYXQgcmVwcmVzZW50cyBhIGNvbXBvbmVudFxuICAgICAgLy8gV2Ugb25seSBoYW5kbGUgdGhlIERPTSBOb2RlIGNhc2UgaGVyZVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaG9zdE5vZGUpKSB7XG4gICAgICAgIC8vIHRoaXMgaXMgYSBjb21wb25lbnRcbiAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIGl0IGhhcyBuZ1NraXBIeWRyYXRpb25cbiAgICAgICAgLy8gVE9ETzogc2hvdWxkIHdlIGNoZWNrIGBTS0lQX0hZRFJBVElPTl9BVFRSX05BTUVgIGluIHROb2RlLm1lcmdlZEF0dHJzP1xuICAgICAgICB0YXJnZXROb2RlID0gdW53cmFwUk5vZGUoaG9zdE5vZGUgYXMgTFZpZXcpIGFzIEVsZW1lbnQ7XG4gICAgICAgIGlmICghKHRhcmdldE5vZGUgYXMgSFRNTEVsZW1lbnQpLmhhc0F0dHJpYnV0ZShTS0lQX0hZRFJBVElPTl9BVFRSX05BTUUpKSB7XG4gICAgICAgICAgYW5ub3RhdGVIb3N0RWxlbWVudEZvckh5ZHJhdGlvbih0YXJnZXROb2RlIGFzIEVsZW1lbnQsIGhvc3ROb2RlIGFzIExWaWV3LCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgY29udGFpbmVyID0gc2VyaWFsaXplTENvbnRhaW5lcihsVmlld1tpXSwgY29udGV4dCk7XG4gICAgICBuZ2hbQ09OVEFJTkVSU10gPz89IHt9O1xuICAgICAgbmdoW0NPTlRBSU5FUlNdW2FkanVzdGVkSW5kZXhdID0gY29udGFpbmVyO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShsVmlld1tpXSkpIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBjb21wb25lbnRcbiAgICAgIC8vIENoZWNrIHRvIHNlZSBpZiBpdCBoYXMgbmdTa2lwSHlkcmF0aW9uXG4gICAgICAvLyBUT0RPOiBzaG91bGQgd2UgY2hlY2sgYFNLSVBfSFlEUkFUSU9OX0FUVFJfTkFNRWAgaW4gdE5vZGUubWVyZ2VkQXR0cnM/XG4gICAgICB0YXJnZXROb2RlID0gdW53cmFwUk5vZGUobFZpZXdbaV1bSE9TVF0hKSBhcyBFbGVtZW50O1xuICAgICAgaWYgKCEodGFyZ2V0Tm9kZSBhcyBIVE1MRWxlbWVudCkuaGFzQXR0cmlidXRlKFNLSVBfSFlEUkFUSU9OX0FUVFJfTkFNRSkpIHtcbiAgICAgICAgYW5ub3RhdGVIb3N0RWxlbWVudEZvckh5ZHJhdGlvbih0YXJnZXROb2RlIGFzIEVsZW1lbnQsIGxWaWV3W2ldLCBjb250ZXh0KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVEkxOG5Ob2RlKHROb2RlKSB8fCB0Tm9kZS5pbnNlcnRCZWZvcmVJbmRleCkge1xuICAgICAgLy8gVE9ETzogaW1wcm92ZSB0aGlzIGVycm9yIG1lc3NhZ2UgdG8gc3VnZ2VzdCBwb3NzaWJsZSBzb2x1dGlvbnNcbiAgICAgIC8vIChuZ1NraXBIeWRyYXRpb24/KS5cbiAgICAgIHRocm93IG5ldyBFcnJvcignSHlkcmF0aW9uIGZvciBpMThuIG5vZGVzIGlzIG5vdCB5ZXQgc3VwcG9ydGVkLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0Tm9kZVR5cGUgPSB0Tm9kZS50eXBlO1xuICAgICAgLy8gPG5nLWNvbnRhaW5lcj4gY2FzZVxuICAgICAgaWYgKHROb2RlVHlwZSAmIFROb2RlVHlwZS5FbGVtZW50Q29udGFpbmVyKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYW4gXCJlbGVtZW50XCIgY29udGFpbmVyICh2cyBcInZpZXdcIiBjb250YWluZXIpLFxuICAgICAgICAvLyBzbyBpdCdzIG9ubHkgcmVwcmVzZW50ZWQgYnkgdGhlIG51bWJlciBvZiB0b3AtbGV2ZWwgbm9kZXNcbiAgICAgICAgLy8gYXMgYSBzaGlmdCB0byBnZXQgdG8gYSBjb3JyZXNwb25kaW5nIGNvbW1lbnQgbm9kZS5cbiAgICAgICAgY29uc3QgY29udGFpbmVyOiBOZ2hDb250YWluZXIgPSB7XG4gICAgICAgICAgW05VTV9ST09UX05PREVTXTogY2FsY051bVJvb3ROb2Rlcyh0VmlldywgbFZpZXcsIHROb2RlLmNoaWxkKSxcbiAgICAgICAgfTtcblxuICAgICAgICBuZ2hbQ09OVEFJTkVSU10gPz89IHt9O1xuICAgICAgICBuZ2hbQ09OVEFJTkVSU11bYWRqdXN0ZWRJbmRleF0gPSBjb250YWluZXI7XG4gICAgICB9IGVsc2UgaWYgKHROb2RlVHlwZSAmIFROb2RlVHlwZS5Qcm9qZWN0aW9uKSB7XG4gICAgICAgIC8vIEN1cnJlbnQgVE5vZGUgaGFzIG5vIERPTSBlbGVtZW50IGFzc29jaWF0ZWQgd2l0aCBpdCxcbiAgICAgICAgLy8gc28gdGhlIGZvbGxvd2luZyBub2RlIHdvdWxkIG5vdCBiZSBhYmxlIHRvIGZpbmQgYW4gYW5jaG9yLlxuICAgICAgICAvLyBVc2UgZnVsbCBwYXRoIGluc3RlYWQuXG4gICAgICAgIGxldCBuZXh0VE5vZGUgPSB0Tm9kZS5uZXh0O1xuICAgICAgICB3aGlsZSAobmV4dFROb2RlICE9PSBudWxsICYmIChuZXh0VE5vZGUudHlwZSAmIFROb2RlVHlwZS5Qcm9qZWN0aW9uKSkge1xuICAgICAgICAgIG5leHRUTm9kZSA9IG5leHRUTm9kZS5uZXh0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZXh0VE5vZGUpIHtcbiAgICAgICAgICBjb25zdCBpbmRleCA9IG5leHRUTm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVQ7XG4gICAgICAgICAgaWYgKCFpc0luU2tpcEh5ZHJhdGlvbkJsb2NrKG5leHRUTm9kZSwgbFZpZXcpKSB7XG4gICAgICAgICAgICBjb25zdCBwYXRoID0gY2FsY1BhdGhGb3JOb2RlKGxWaWV3LCBuZXh0VE5vZGUpO1xuICAgICAgICAgICAgbmdoW05PREVTXSA/Pz0ge307XG4gICAgICAgICAgICBuZ2hbTk9ERVNdW2luZGV4XSA9IHBhdGg7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaXNEcm9wcGVkUHJvamVjdGVkTm9kZSh0Tm9kZSkpIHtcbiAgICAgICAgICAvLyBUaGlzIGlzIGEgY2FzZSB3aGVyZSBhIG5vZGUgdXNlZCBpbiBjb250ZW50IHByb2plY3Rpb25cbiAgICAgICAgICAvLyBkb2Vzbid0IG1ha2UgaXQgaW50byBvbmUgb2YgdGhlIGNvbnRlbnQgcHJvamVjdGlvbiBzbG90c1xuICAgICAgICAgIC8vIChmb3IgZXhhbXBsZSwgd2hlbiB0aGVyZSBpcyBubyBkZWZhdWx0IDxuZy1jb250ZW50IC8+IHNsb3RcbiAgICAgICAgICAvLyBpbiBwcm9qZWN0b3IgY29tcG9uZW50J3MgdGVtcGxhdGUpLlxuICAgICAgICAgIG5naFtOT0RFU10gPz89IHt9O1xuICAgICAgICAgIG5naFtOT0RFU11bYWRqdXN0ZWRJbmRleF0gPSBEUk9QUEVEX1BST0pFQ1RFRF9OT0RFO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEhhbmRsZSBjYXNlcyB3aGVyZSB0ZXh0IG5vZGVzIGNhbiBiZSBsb3N0IGFmdGVyIERPTSBzZXJpYWxpemF0aW9uOlxuICAgICAgICAgIC8vICAxLiBXaGVuIHRoZXJlIGlzIGFuICplbXB0eSB0ZXh0IG5vZGUqIGluIERPTTogaW4gdGhpcyBjYXNlLCB0aGlzXG4gICAgICAgICAgLy8gICAgIG5vZGUgd291bGQgbm90IG1ha2UgaXQgaW50byB0aGUgc2VyaWFsaXplZCBzdHJpbmcgYW5kIGFzIHMgcmVzdWx0LFxuICAgICAgICAgIC8vICAgICB0aGlzIG5vZGUgd291bGRuJ3QgYmUgY3JlYXRlZCBpbiBhIGJyb3dzZXIuIFRoaXMgd291bGQgcmVzdWx0IGluXG4gICAgICAgICAgLy8gICAgIGEgbWlzbWF0Y2ggZHVyaW5nIHRoZSBoeWRyYXRpb24sIHdoZXJlIHRoZSBydW50aW1lIGxvZ2ljIHdvdWxkIGV4cGVjdFxuICAgICAgICAgIC8vICAgICBhIHRleHQgbm9kZSB0byBiZSBwcmVzZW50IGluIGxpdmUgRE9NLCBidXQgbm8gdGV4dCBub2RlIHdvdWxkIGV4aXN0LlxuICAgICAgICAgIC8vICAgICBFeGFtcGxlOiBgPHNwYW4+e3sgbmFtZSB9fTwvc3Bhbj5gIHdoZW4gdGhlIGBuYW1lYCBpcyBhbiBlbXB0eSBzdHJpbmcuXG4gICAgICAgICAgLy8gICAgIFRoaXMgd291bGQgcmVzdWx0IGluIGA8c3Bhbj48L3NwYW4+YCBzdHJpbmcgYWZ0ZXIgc2VyaWFsaXphdGlvbiBhbmRcbiAgICAgICAgICAvLyAgICAgaW4gYSBicm93c2VyIG9ubHkgdGhlIGBzcGFuYCBlbGVtZW50IHdvdWxkIGJlIGNyZWF0ZWQuIFRvIHJlc29sdmUgdGhhdCxcbiAgICAgICAgICAvLyAgICAgYW4gZXh0cmEgY29tbWVudCBub2RlIGlzIGFwcGVuZGVkIGluIHBsYWNlIG9mIGFuIGVtcHR5IHRleHQgbm9kZSBhbmRcbiAgICAgICAgICAvLyAgICAgdGhhdCBzcGVjaWFsIGNvbW1lbnQgbm9kZSBpcyByZXBsYWNlZCB3aXRoIGFuIGVtcHR5IHRleHQgbm9kZSAqYmVmb3JlKlxuICAgICAgICAgIC8vICAgICBoeWRyYXRpb24uXG4gICAgICAgICAgLy8gIDIuIFdoZW4gdGhlcmUgYXJlIDIgY29uc2VjdXRpdmUgdGV4dCBub2RlcyBwcmVzZW50IGluIHRoZSBET00uXG4gICAgICAgICAgLy8gICAgIEV4YW1wbGU6IGA8ZGl2PkhlbGxvIDxuZy1jb250YWluZXIgKm5nSWY9XCJ0cnVlXCI+d29ybGQ8L25nLWNvbnRhaW5lcj48L2Rpdj5gLlxuICAgICAgICAgIC8vICAgICBJbiB0aGlzIHNjZW5hcmlvLCB0aGUgbGl2ZSBET00gd291bGQgbG9vayBsaWtlIHRoaXM6XG4gICAgICAgICAgLy8gICAgICAgPGRpdj4jdGV4dCgnSGVsbG8gJykgI3RleHQoJ3dvcmxkJykgI2NvbW1lbnQoJ2NvbnRhaW5lcicpPC9kaXY+XG4gICAgICAgICAgLy8gICAgIFNlcmlhbGl6ZWQgc3RyaW5nIHdvdWxkIGxvb2sgbGlrZSB0aGlzOiBgPGRpdj5IZWxsbyB3b3JsZDwhLS1jb250YWluZXItLT48L2Rpdj5gLlxuICAgICAgICAgIC8vICAgICBUaGUgbGl2ZSBET00gaW4gYSBicm93c2VyIGFmdGVyIHRoYXQgd291bGQgYmU6XG4gICAgICAgICAgLy8gICAgICAgPGRpdj4jdGV4dCgnSGVsbG8gd29ybGQnKSAjY29tbWVudCgnY29udGFpbmVyJyk8L2Rpdj5cbiAgICAgICAgICAvLyAgICAgTm90aWNlIGhvdyAyIHRleHQgbm9kZXMgYXJlIG5vdyBcIm1lcmdlZFwiIGludG8gb25lLiBUaGlzIHdvdWxkIGNhdXNlIGh5ZHJhdGlvblxuICAgICAgICAgIC8vICAgICBsb2dpYyB0byBmYWlsLCBzaW5jZSBpdCdkIGV4cGVjdCAyIHRleHQgbm9kZXMgYmVpbmcgcHJlc2VudCwgbm90IG9uZS5cbiAgICAgICAgICAvLyAgICAgVG8gZml4IHRoaXMsIHdlIGluc2VydCBhIHNwZWNpYWwgY29tbWVudCBub2RlIGluIGJldHdlZW4gdGhvc2UgdGV4dCBub2Rlcywgc29cbiAgICAgICAgICAvLyAgICAgc2VyaWFsaXplZCByZXByZXNlbnRhdGlvbiBpczogYDxkaXY+SGVsbG8gPCEtLW5ndG5zLS0+d29ybGQ8IS0tY29udGFpbmVyLS0+PC9kaXY+YC5cbiAgICAgICAgICAvLyAgICAgVGhpcyBmb3JjZXMgYnJvd3NlciB0byBjcmVhdGUgMiB0ZXh0IG5vZGVzIHNlcGFyYXRlZCBieSBhIGNvbW1lbnQgbm9kZS5cbiAgICAgICAgICAvLyAgICAgQmVmb3JlIHJ1bm5pbmcgYSBoeWRyYXRpb24gcHJvY2VzcywgdGhpcyBzcGVjaWFsIGNvbW1lbnQgbm9kZSBpcyByZW1vdmVkLCBzbyB0aGVcbiAgICAgICAgICAvLyAgICAgbGl2ZSBET00gaGFzIGV4YWN0bHkgdGhlIHNhbWUgc3RhdGUgYXMgaXQgd2FzIGJlZm9yZSBzZXJpYWxpemF0aW9uLlxuICAgICAgICAgIGlmICh0Tm9kZVR5cGUgJiBUTm9kZVR5cGUuVGV4dCkge1xuICAgICAgICAgICAgY29uc3Qgck5vZGUgPSB1bndyYXBSTm9kZShsVmlld1tpXSkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICBpZiAock5vZGUudGV4dENvbnRlbnQgPT09ICcnKSB7XG4gICAgICAgICAgICAgIGNvbnRleHQuY29ycnVwdGVkVGV4dE5vZGVzLnNldChFTVBUWV9URVhUX05PREVfQ09NTUVOVCwgck5vZGUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyTm9kZS5uZXh0U2libGluZz8ubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG4gICAgICAgICAgICAgIGNvbnRleHQuY29ycnVwdGVkVGV4dE5vZGVzLnNldChURVhUX05PREVfU0VQQVJBVE9SX0NPTU1FTlQsIHJOb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodE5vZGUucHJvamVjdGlvbk5leHQgJiYgdE5vZGUucHJvamVjdGlvbk5leHQgIT09IHROb2RlLm5leHQpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHByb2plY3Rpb24gbmV4dCBpcyBub3QgdGhlIHNhbWUgYXMgbmV4dCwgaW4gd2hpY2ggY2FzZVxuICAgICAgICAgICAgLy8gdGhlIG5vZGUgd291bGQgbm90IGJlIGZvdW5kIGF0IGNyZWF0aW9uIHRpbWUgYXQgcnVudGltZSBhbmQgd2VcbiAgICAgICAgICAgIC8vIG5lZWQgdG8gcHJvdmlkZSBhIGxvY2F0aW9uIHRvIHRoYXQgbm9kZS5cbiAgICAgICAgICAgIGNvbnN0IG5leHRQcm9qZWN0ZWRUTm9kZSA9IHROb2RlLnByb2plY3Rpb25OZXh0O1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBuZXh0UHJvamVjdGVkVE5vZGUuaW5kZXggLSBIRUFERVJfT0ZGU0VUO1xuICAgICAgICAgICAgaWYgKCFpc0luU2tpcEh5ZHJhdGlvbkJsb2NrKG5leHRQcm9qZWN0ZWRUTm9kZSwgbFZpZXcpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBjYWxjUGF0aEZvck5vZGUobFZpZXcsIG5leHRQcm9qZWN0ZWRUTm9kZSk7XG4gICAgICAgICAgICAgIG5naFtOT0RFU10gPz89IHt9O1xuICAgICAgICAgICAgICBuZ2hbTk9ERVNdW2luZGV4XSA9IHBhdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBuZ2g7XG59XG5cbmZ1bmN0aW9uIGlzUm9vdExldmVsUHJvamVjdGlvbk5vZGUodE5vZGU6IFROb2RlKTogYm9vbGVhbiB7XG4gIHJldHVybiAodE5vZGUuZmxhZ3MgJiBUTm9kZUZsYWdzLmlzUHJvamVjdGVkKSA9PT0gVE5vZGVGbGFncy5pc1Byb2plY3RlZDtcbn1cblxuLyoqXG4gKiBEZXRlY3QgYSBjYXNlIHdoZXJlIGEgbm9kZSB1c2VkIGluIGNvbnRlbnQgcHJvamVjdGlvbixcbiAqIGJ1dCBkb2Vzbid0IG1ha2UgaXQgaW50byBvbmUgb2YgdGhlIGNvbnRlbnQgcHJvamVjdGlvbiBzbG90c1xuICogKGZvciBleGFtcGxlLCB3aGVuIHRoZXJlIGlzIG5vIGRlZmF1bHQgPG5nLWNvbnRlbnQgLz4gc2xvdFxuICogaW4gcHJvamVjdG9yIGNvbXBvbmVudCdzIHRlbXBsYXRlKS5cbiAqL1xuZnVuY3Rpb24gaXNEcm9wcGVkUHJvamVjdGVkTm9kZSh0Tm9kZTogVE5vZGUpOiBib29sZWFuIHtcbiAgbGV0IGN1cnJlbnRUTm9kZSA9IHROb2RlO1xuICBsZXQgc2VlbkNvbXBvbmVudEhvc3QgPSBmYWxzZTtcbiAgd2hpbGUgKGN1cnJlbnRUTm9kZSAhPT0gbnVsbCkge1xuICAgIGlmIChpc0NvbXBvbmVudEhvc3QoY3VycmVudFROb2RlKSkge1xuICAgICAgc2VlbkNvbXBvbmVudEhvc3QgPSB0cnVlO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIC8vIElmIHdlIGNvbWUgYWNyb3NzIGEgcm9vdCBwcm9qZWN0ZWQgbm9kZSwgcmV0dXJuIHRydWUuXG4gICAgaWYgKGlzUm9vdExldmVsUHJvamVjdGlvbk5vZGUoY3VycmVudFROb2RlKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjdXJyZW50VE5vZGUgPSBjdXJyZW50VE5vZGUucGFyZW50IGFzIFROb2RlO1xuICB9XG4gIC8vIElmIHdlJ3ZlIHNlZW4gYSBjb21wb25lbnQgaG9zdCwgYnV0IHRoZXJlIHdhcyBubyByb290IGxldmVsXG4gIC8vIHByb2plY3Rpb24gbm9kZSwgdGhpcyBpbmRpY2F0ZXMgdGhhdCB0aGlzIG5vdCB3YXMgbm90IHByb2plY3RlZC5cbiAgcmV0dXJuIHNlZW5Db21wb25lbnRIb3N0O1xufVxuXG5mdW5jdGlvbiBjYWxjUGF0aEZvck5vZGUobFZpZXc6IExWaWV3LCB0Tm9kZTogVE5vZGUpOiBzdHJpbmcge1xuICBjb25zdCBpbmRleCA9IHROb2RlLmluZGV4O1xuICBjb25zdCBwYXJlbnRUTm9kZSA9IHROb2RlLnBhcmVudDtcbiAgY29uc3QgcGFyZW50SW5kZXggPSBwYXJlbnRUTm9kZSA9PT0gbnVsbCA/IFJFRkVSRU5DRV9OT0RFX0hPU1QgOiBwYXJlbnRUTm9kZS5pbmRleDtcbiAgY29uc3QgcGFyZW50Uk5vZGUgPVxuICAgICAgcGFyZW50VE5vZGUgPT09IG51bGwgPyBsVmlld1tIT1NUXSA6IHVud3JhcFJOb2RlKGxWaWV3W3BhcmVudEluZGV4IGFzIG51bWJlcl0pO1xuICBsZXQgck5vZGUgPSB1bndyYXBSTm9kZShsVmlld1tpbmRleF0pO1xuICBpZiAodE5vZGUudHlwZSAmIFROb2RlVHlwZS5BbnlDb250YWluZXIpIHtcbiAgICAvLyBGb3IgPG5nLWNvbnRhaW5lcj4gbm9kZXMsIGluc3RlYWQgb2Ygc2VyaWFsaXppbmcgYSByZWZlcmVuY2VcbiAgICAvLyB0byB0aGUgYW5jaG9yIGNvbW1lbnQgbm9kZSwgc2VyaWFsaXplIGEgbG9jYXRpb24gb2YgdGhlIGZpcnN0XG4gICAgLy8gRE9NIGVsZW1lbnQuIFBhaXJlZCB3aXRoIHRoZSBjb250YWluZXIgc2l6ZSAoc2VyaWFsaXplZCBhcyBhIHBhcnRcbiAgICAvLyBvZiBgbmdoLmNvbnRhaW5lcnNgKSwgaXQgc2hvdWxkIGdpdmUgZW5vdWdoIGluZm9ybWF0aW9uIGZvciBydW50aW1lXG4gICAgLy8gdG8gaHlkcmF0ZSBub2RlcyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgICBjb25zdCBmaXJzdFJOb2RlID0gZ2V0Rmlyc3ROYXRpdmVOb2RlKGxWaWV3LCB0Tm9kZSk7XG5cbiAgICAvLyBJZiBjb250YWluZXIgaXMgbm90IGVtcHR5LCB1c2UgYSByZWZlcmVuY2UgdG8gdGhlIGZpcnN0IGVsZW1lbnQsXG4gICAgLy8gb3RoZXJ3aXNlLCByTm9kZSB3b3VsZCBwb2ludCB0byBhbiBhbmNob3IgY29tbWVudCBub2RlLlxuICAgIGlmIChmaXJzdFJOb2RlKSB7XG4gICAgICByTm9kZSA9IGZpcnN0Uk5vZGU7XG4gICAgfVxuICB9XG4gIGNvbnN0IHJlZmVyZW5jZU5vZGUgPVxuICAgICAgcGFyZW50SW5kZXggPT09IFJFRkVSRU5DRV9OT0RFX0hPU1QgPyBwYXJlbnRJbmRleCA6ICcnICsgKHBhcmVudEluZGV4IC0gSEVBREVSX09GRlNFVCk7XG4gIGxldCBwYXRoOiBzdHJpbmd8bnVsbCA9IGNhbGNQYXRoQmV0d2VlbihwYXJlbnRSTm9kZSBhcyBOb2RlLCByTm9kZSBhcyBOb2RlLCByZWZlcmVuY2VOb2RlKTtcbiAgaWYgKHBhdGggPT09IG51bGwgJiYgcGFyZW50Uk5vZGUgIT09IHJOb2RlKSB7XG4gICAgLy8gU2VhcmNoaW5nIGZvciBhIHBhdGggYmV0d2VlbiBlbGVtZW50cyB3aXRoaW4gYSBob3N0IG5vZGUgZmFpbGVkLlxuICAgIC8vIFRyeWluZyB0byBmaW5kIGEgcGF0aCB0byBhbiBlbGVtZW50IHN0YXJ0aW5nIGZyb20gdGhlIGBkb2N1bWVudC5ib2R5YCBpbnN0ZWFkLlxuICAgIGNvbnN0IGJvZHkgPSAocGFyZW50Uk5vZGUgYXMgTm9kZSkub3duZXJEb2N1bWVudCEuYm9keSBhcyBOb2RlO1xuICAgIHBhdGggPSBjYWxjUGF0aEJldHdlZW4oYm9keSwgck5vZGUgYXMgTm9kZSwgUkVGRVJFTkNFX05PREVfQk9EWSk7XG5cbiAgICBpZiAocGF0aCA9PT0gbnVsbCkge1xuICAgICAgLy8gSWYgdGhlIHBhdGggaXMgc3RpbGwgZW1wdHksIGl0J3MgbGlrZWx5IHRoYXQgdGhpcyBub2RlIGlzIGRldGFjaGVkIGFuZFxuICAgICAgLy8gd29uJ3QgYmUgZm91bmQgZHVyaW5nIGh5ZHJhdGlvbi5cbiAgICAgIHRocm93IG5vZGVOb3RGb3VuZEVycm9yKGxWaWV3LCB0Tm9kZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwYXRoITtcbn1cblxuZnVuY3Rpb24gY2FsY051bVJvb3ROb2Rlcyh0VmlldzogVFZpZXcsIGxWaWV3OiBMVmlldywgdE5vZGU6IFROb2RlfG51bGwpOiBudW1iZXIge1xuICBjb25zdCByb290Tm9kZXM6IHVua25vd25bXSA9IFtdO1xuICBjb2xsZWN0TmF0aXZlTm9kZXModFZpZXcsIGxWaWV3LCB0Tm9kZSwgcm9vdE5vZGVzKTtcbiAgcmV0dXJuIHJvb3ROb2Rlcy5sZW5ndGg7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUxDb250YWluZXIobENvbnRhaW5lcjogTENvbnRhaW5lciwgY29udGV4dDogSHlkcmF0aW9uQ29udGV4dCk6IE5naENvbnRhaW5lciB7XG4gIGNvbnN0IGNvbnRhaW5lcjogTmdoQ29udGFpbmVyID0ge307XG5cbiAgZm9yIChsZXQgaSA9IENPTlRBSU5FUl9IRUFERVJfT0ZGU0VUOyBpIDwgbENvbnRhaW5lci5sZW5ndGg7IGkrKykge1xuICAgIGxldCBjaGlsZExWaWV3ID0gbENvbnRhaW5lcltpXSBhcyBMVmlldztcblxuICAgIC8vIEdldCBMVmlldyBmb3IgdW5kZXJseWluZyBjb21wb25lbnQuXG4gICAgaWYgKGlzUm9vdFZpZXcoY2hpbGRMVmlldykpIHtcbiAgICAgIGNoaWxkTFZpZXcgPSBjaGlsZExWaWV3W0hFQURFUl9PRkZTRVRdO1xuICAgIH1cbiAgICBjb25zdCBjaGlsZFRWaWV3ID0gY2hpbGRMVmlld1tUVklFV107XG5cbiAgICBsZXQgdGVtcGxhdGU7XG4gICAgbGV0IG51bVJvb3ROb2RlcyA9IDA7XG4gICAgaWYgKGNoaWxkVFZpZXcudHlwZSA9PT0gVFZpZXdUeXBlLkNvbXBvbmVudCkge1xuICAgICAgY29uc3QgY3R4ID0gY2hpbGRMVmlld1tDT05URVhUXTtcbiAgICAgIGNvbnN0IGNvbXBvbmVudERlZiA9IGdldENvbXBvbmVudERlZihjdHghLmNvbnN0cnVjdG9yIGFzIFR5cGU8dW5rbm93bj4pITtcbiAgICAgIHRlbXBsYXRlID0gZ2V0Q29tcG9uZW50SWQoY29tcG9uZW50RGVmKTtcblxuICAgICAgLy8gVGhpcyBpcyBhIGNvbXBvbmVudCB2aWV3LCB3aGljaCBoYXMgb25seSAxIHJvb3Qgbm9kZTogdGhlIGNvbXBvbmVudFxuICAgICAgLy8gaG9zdCBub2RlIGl0c2VsZiAob3RoZXIgbm9kZXMgd291bGQgYmUgaW5zaWRlIHRoYXQgaG9zdCBub2RlKS5cbiAgICAgIG51bVJvb3ROb2RlcyA9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRlbXBsYXRlID0gY29udGV4dC5zc3JJZFJlZ2lzdHJ5LmdldChjaGlsZFRWaWV3KTtcbiAgICAgIG51bVJvb3ROb2RlcyA9IGNhbGNOdW1Sb290Tm9kZXMoY2hpbGRUVmlldywgY2hpbGRMVmlldywgY2hpbGRUVmlldy5maXJzdENoaWxkKTtcbiAgICB9XG5cbiAgICBjb25zdCB2aWV3OiBOZ2hWaWV3ID0ge1xuICAgICAgW1RFTVBMQVRFXTogdGVtcGxhdGUsXG4gICAgICBbTlVNX1JPT1RfTk9ERVNdOiBudW1Sb290Tm9kZXMsXG4gICAgICAuLi5zZXJpYWxpemVMVmlldyhsQ29udGFpbmVyW2ldIGFzIExWaWV3LCBjb250ZXh0KSxcbiAgICB9O1xuICAgIC8vIEFkZCBhbm5vdGF0aW9uIGlmIGEgdmlldyBpcyBsYXp5LlxuICAgIGlmICgoY2hpbGRMVmlld1tGTEFHU10gJiBMVmlld0ZsYWdzLkxhenkpID09PSBMVmlld0ZsYWdzLkxhenkpIHtcbiAgICAgIHZpZXdbTEFaWV0gPSAxOyAgLy8gdXNlIG51bWJlciBpbnN0ZWFkIG9mIHRydWUsIGJlY2F1c2UgaXQncyBzaG9ydGVyXG4gICAgfVxuICAgIGNvbnRhaW5lcltWSUVXU10gPz89IFtdO1xuICAgIGlmIChjb250YWluZXJbVklFV1NdLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHByZXZWaWV3ID0gY29udGFpbmVyW1ZJRVdTXS5hdCgtMSkhOyAgLy8gdGhlIGxhc3QgZWxlbWVudCBpbiBhcnJheVxuICAgICAgLy8gQ29tcGFyZSBgdmlld2AgYW5kIGBwcmV2Vmlld2AgdG8gc2VlIGlmIHRoZXkgYXJlIHRoZSBzYW1lLlxuICAgICAgaWYgKGNvbXBhcmVOZ2hWaWV3KHZpZXcsIHByZXZWaWV3KSkge1xuICAgICAgICBwcmV2Vmlld1tNVUxUSVBMSUVSXSA/Pz0gMTtcbiAgICAgICAgcHJldlZpZXdbTVVMVElQTElFUl0rKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRhaW5lcltWSUVXU10ucHVzaCh2aWV3KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyW1ZJRVdTXS5wdXNoKHZpZXcpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb250YWluZXI7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVOZ2hWaWV3KGN1cnI6IE5naFZpZXcsIHByZXY6IE5naFZpZXcpOiBib29sZWFuIHtcbiAgY29uc3QgcHJldkNsb25lID0gey4uLnByZXZ9O1xuICBkZWxldGUgcHJldkNsb25lW01VTFRJUExJRVJdO1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoY3VycikgPT09IEpTT04uc3RyaW5naWZ5KHByZXZDbG9uZSk7XG59XG5cbmV4cG9ydCBjb25zdCBOR0hfREFUQV9LRVkgPSBtYWtlU3RhdGVLZXk8QXJyYXk8TmdoRG9tPj4oVFJBTlNGRVJfU1RBVEVfVE9LRU5fSUQpO1xuXG5leHBvcnQgZnVuY3Rpb24gYW5ub3RhdGVIb3N0RWxlbWVudEZvckh5ZHJhdGlvbihcbiAgICBlbGVtZW50OiBFbGVtZW50LCBsVmlldzogTFZpZXcsIGNvbnRleHQ6IEh5ZHJhdGlvbkNvbnRleHQpOiB2b2lkIHtcbiAgY29uc3QgbmdoID0gc2VyaWFsaXplTFZpZXcobFZpZXcsIGNvbnRleHQpO1xuICBjb25zdCBpbmRleCA9IGNvbnRleHQuYW5ub3RhdGlvbkNvbGxlY3Rpb24uYWRkKG5naCk7XG4gIGlmIChjb250ZXh0LnByb2ZpbGVyKSB7XG4gICAgaWYgKE9iamVjdC5rZXlzKG5naCkubGVuZ3RoID09PSAwKSB7XG4gICAgICBjb250ZXh0LnByb2ZpbGVyLmluY3JlbWVudE1ldHJpY1ZhbHVlKFNzclBlcmZNZXRyaWNzLkNvbXBvbmVudHNXaXRoRW1wdHlOZ2gsIDEpO1xuICAgIH1cbiAgICBjb250ZXh0LnByb2ZpbGVyLmluY3JlbWVudE1ldHJpY1ZhbHVlKFxuICAgICAgICBTc3JQZXJmTWV0cmljcy5OZ2hBbm5vdGF0aW9uU2l6ZSxcbiAgICAgICAgaW5kZXgudG9TdHJpbmcoKS5sZW5ndGggKyA3KTsgIC8vIDcgdG8gYWNjb3VudCBmb3IgJyBuZ2g9XCJcIidcbiAgICBjb250ZXh0LnByb2ZpbGVyLmluY3JlbWVudE1ldHJpY1ZhbHVlKFxuICAgICAgICBTc3JQZXJmTWV0cmljcy5TZXJpYWxpemVkQ29tcG9uZW50cywgMSk7ICAvLyBpbmNyZW1lbnQgYnkgb25lIG1vcmUgY29tcG9uZW50XG4gIH1cbiAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoTkdIX0FUVFJfTkFNRSwgaW5kZXgudG9TdHJpbmcoKSk7XG59XG5cbmZ1bmN0aW9uIGluc2VydFRleHROb2RlTWFya2Vycyhjb3JydXB0ZWRUZXh0Tm9kZXM6IE1hcDxzdHJpbmcsIEhUTUxFbGVtZW50PiwgZG9jOiBEb2N1bWVudCkge1xuICBmb3IgKGxldCBbbWFya2VyLCB0ZXh0Tm9kZV0gb2YgY29ycnVwdGVkVGV4dE5vZGVzKSB7XG4gICAgdGV4dE5vZGUuYWZ0ZXIoZG9jLmNyZWF0ZUNvbW1lbnQobWFya2VyKSk7XG4gIH1cbn1cbiJdfQ==