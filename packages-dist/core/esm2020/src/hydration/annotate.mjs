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
import { compressNghInfo } from './compression';
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
 * Annotates all components bootstrapped in a given ApplicationRef
 * with info needed for hydration.
 *
 * @param appRef A current instance of an ApplicationRef.
 * @param doc A reference to the current Document instance.
 */
export function annotateForHydration(appRef, doc, profiler) {
    const ssrIdRegistry = new TViewSsrIdRegistry();
    const corruptedTextNodes = new Map();
    const viewRefs = retrieveViewsFromApplicationRef(appRef);
    for (const viewRef of viewRefs) {
        const lView = getComponentLView(viewRef);
        // TODO: make sure that this lView represents
        // a component instance.
        const hostElement = lView[HOST];
        if (hostElement) {
            const context = { ssrIdRegistry, corruptedTextNodes, profiler };
            annotateHostElementForHydration(hostElement, lView, context);
            insertTextNodeMarkers(corruptedTextNodes, doc);
            profiler?.incrementMetricValue("Empty Text Node count" /* SsrPerfMetrics.EmptyTextNodeCount */, corruptedTextNodes.size);
        }
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
export function annotateHostElementForHydration(element, lView, context) {
    const rawNgh = serializeLView(lView, context);
    let serializedNgh = '';
    // Do not serialize an empty object
    if (Object.keys(rawNgh).length > 0) {
        serializedNgh = compressNghInfo(rawNgh);
    }
    if (context.profiler) {
        if (serializedNgh.length === 0) {
            context.profiler.incrementMetricValue("Components with empty NGH" /* SsrPerfMetrics.ComponentsWithEmptyNgh */, 1);
        }
        context.profiler.incrementMetricValue("Hydration annotation size (in character length)" /* SsrPerfMetrics.NghAnnotationSize */, serializedNgh.length + 7); // 7 to account for ' ngh=""'
        context.profiler.incrementMetricValue("Serialized Components" /* SsrPerfMetrics.SerializedComponents */, 1); // increment by one more component
    }
    element.setAttribute(NGH_ATTR_NAME, serializedNgh);
}
function insertTextNodeMarkers(corruptedTextNodes, doc) {
    for (let [marker, textNode] of corruptedTextNodes) {
        textNode.after(doc.createComment(marker));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vYW5ub3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFpQiwrQkFBK0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBRW5GLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLGlDQUFpQyxDQUFDO0FBQ25FLE9BQU8sRUFBQyxlQUFlLEVBQUUsY0FBYyxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDdEUsT0FBTyxFQUFDLHVCQUF1QixFQUFhLE1BQU0saUNBQWlDLENBQUM7QUFFcEYsT0FBTyxFQUFDLGVBQWUsRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFDLE1BQU0sbUNBQW1DLENBQUM7QUFDL0csT0FBTyxFQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFnQixLQUFLLEVBQVksTUFBTSw0QkFBNEIsQ0FBQztBQUN4RyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSw4QkFBOEIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFFdkQsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUM5QyxPQUFPLEVBQUMsVUFBVSxFQUFFLFVBQVUsRUFBaUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUN0SSxPQUFPLEVBQUMsZUFBZSxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFFOUYsT0FBTyxFQUFDLHNCQUFzQixFQUFFLHdCQUF3QixFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDbEYsT0FBTyxFQUFDLHNCQUFzQixFQUFFLHVCQUF1QixFQUFFLGlCQUFp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LE9BQU8sQ0FBQyxRQUFRLENBQUMsb0JBQW9CLDJGQUNDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBRSw2QkFBNkI7UUFDL0YsT0FBTyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0Isb0VBQ0ksQ0FBQyxDQUFDLENBQUMsQ0FBRSxrQ0FBa0M7S0FDakY7SUFDRCxPQUFPLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxrQkFBNEMsRUFBRSxHQUFhO0lBQ3hGLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsSUFBSSxrQkFBa0IsRUFBRTtRQUNqRCxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztLQUMzQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBcHBsaWNhdGlvblJlZiwgcmV0cmlldmVWaWV3c0Zyb21BcHBsaWNhdGlvblJlZn0gZnJvbSAnLi4vYXBwbGljYXRpb25fcmVmJztcbmltcG9ydCB7VHlwZX0gZnJvbSAnLi4vaW50ZXJmYWNlL3R5cGUnO1xuaW1wb3J0IHtjb2xsZWN0TmF0aXZlTm9kZXN9IGZyb20gJy4uL3JlbmRlcjMvY29sbGVjdF9uYXRpdmVfbm9kZXMnO1xuaW1wb3J0IHtnZXRDb21wb25lbnREZWYsIGdldENvbXBvbmVudElkfSBmcm9tICcuLi9yZW5kZXIzL2RlZmluaXRpb24nO1xuaW1wb3J0IHtDT05UQUlORVJfSEVBREVSX09GRlNFVCwgTENvbnRhaW5lcn0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL2NvbnRhaW5lcic7XG5pbXBvcnQge1RDb250YWluZXJOb2RlLCBUTm9kZSwgVE5vZGVGbGFncywgVE5vZGVUeXBlfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvbm9kZSc7XG5pbXBvcnQge2lzQ29tcG9uZW50SG9zdCwgaXNMQ29udGFpbmVyLCBpc1Byb2plY3Rpb25UTm9kZSwgaXNSb290Vmlld30gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3R5cGVfY2hlY2tzJztcbmltcG9ydCB7Q09OVEVYVCwgSEVBREVSX09GRlNFVCwgSE9TVCwgTFZpZXcsIFRWaWV3LCBUVklFVywgVFZpZXdUeXBlfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvdmlldyc7XG5pbXBvcnQge2dldEZpcnN0TmF0aXZlTm9kZX0gZnJvbSAnLi4vcmVuZGVyMy9ub2RlX21hbmlwdWxhdGlvbic7XG5pbXBvcnQge3Vud3JhcFJOb2RlfSBmcm9tICcuLi9yZW5kZXIzL3V0aWwvdmlld191dGlscyc7XG5cbmltcG9ydCB7Y29tcHJlc3NOZ2hJbmZvfSBmcm9tICcuL2NvbXByZXNzaW9uJztcbmltcG9ydCB7Q09OVEFJTkVSUywgTVVMVElQTElFUiwgTmdoQ29udGFpbmVyLCBOZ2hEb20sIE5naFZpZXcsIE5PREVTLCBOVU1fUk9PVF9OT0RFUywgVEVNUExBVEUsIFRFTVBMQVRFUywgVklFV1N9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge2NhbGNQYXRoQmV0d2VlbiwgUkVGRVJFTkNFX05PREVfQk9EWSwgUkVGRVJFTkNFX05PREVfSE9TVH0gZnJvbSAnLi9ub2RlX2xvb2t1cF91dGlscyc7XG5pbXBvcnQge1NzclBlcmZNZXRyaWNzLCBTc3JQcm9maWxlcn0gZnJvbSAnLi9wcm9maWxlcic7XG5pbXBvcnQge2lzSW5Ta2lwSHlkcmF0aW9uQmxvY2ssIFNLSVBfSFlEUkFUSU9OX0FUVFJfTkFNRX0gZnJvbSAnLi9za2lwX2h5ZHJhdGlvbic7XG5pbXBvcnQge0RST1BQRURfUFJPSkVDVEVEX05PREUsIEVNUFRZX1RFWFRfTk9ERV9DT01NRU5ULCBnZXRDb21wb25lbnRMVmlldywgTkdIX0FUVFJfTkFNRSwgVEVYVF9OT0RFX1NFUEFSQVRPUl9DT01NRU5UfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBSZWdpc3RyeSB0aGF0IGtlZXBzIHRyYWNrIG9mIHVuaXF1ZSBUVmlldyBpZHMgdGhyb3VnaG91dFxuICogdGhlIHNlcmlhbGl6YXRpb24gcHJvY2Vzcy4gVGhpcyBpcyBuZWVkZWQgdG8gaWRlbnRpZnlcbiAqIGRlaHlkcmF0ZWQgdmlld3MgYXQgcnVudGltZSBwcm9wZXJseSAocGljayB1cCBkZWh5ZHJhdGVkXG4gKiB2aWV3cyBjcmVhdGVkIGJhc2VkIG9uIGEgY2VydGFpbiBUVmlldykuXG4gKi9cbmNsYXNzIFRWaWV3U3NySWRSZWdpc3RyeSB7XG4gIHByaXZhdGUgcmVnaXN0cnkgPSBuZXcgV2Vha01hcDxUVmlldywgc3RyaW5nPigpO1xuICBwcml2YXRlIGN1cnJlbnRJZCA9IDA7XG5cbiAgZ2V0KHRWaWV3OiBUVmlldyk6IHN0cmluZyB7XG4gICAgaWYgKCF0aGlzLnJlZ2lzdHJ5Lmhhcyh0VmlldykpIHtcbiAgICAgIHRoaXMucmVnaXN0cnkuc2V0KHRWaWV3LCBgdCR7dGhpcy5jdXJyZW50SWQrK31gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVnaXN0cnkuZ2V0KHRWaWV3KSE7XG4gIH1cbn1cblxuLyoqXG4gKiBEZXNjcmliZXMgYSBjb250ZXh0IGF2YWlsYWJsZSBkdXJpbmcgdGhlIHNlcmlhbGl6YXRpb25cbiAqIHByb2Nlc3MuIFRoZSBjb250ZXh0IGlzIHVzZWQgdG8gc2hhcmUgYW5kIGNvbGxlY3QgaW5mb3JtYXRpb25cbiAqIGR1cmluZyB0aGUgc2VyaWFsaXphdGlvbi5cbiAqL1xuaW50ZXJmYWNlIEh5ZHJhdGlvbkNvbnRleHQge1xuICBzc3JJZFJlZ2lzdHJ5OiBUVmlld1NzcklkUmVnaXN0cnk7XG4gIGNvcnJ1cHRlZFRleHROb2RlczogTWFwPHN0cmluZywgSFRNTEVsZW1lbnQ+O1xuICBwcm9maWxlcjogU3NyUHJvZmlsZXJ8bnVsbDtcbn1cblxuLyoqXG4gKiBBbm5vdGF0ZXMgYWxsIGNvbXBvbmVudHMgYm9vdHN0cmFwcGVkIGluIGEgZ2l2ZW4gQXBwbGljYXRpb25SZWZcbiAqIHdpdGggaW5mbyBuZWVkZWQgZm9yIGh5ZHJhdGlvbi5cbiAqXG4gKiBAcGFyYW0gYXBwUmVmIEEgY3VycmVudCBpbnN0YW5jZSBvZiBhbiBBcHBsaWNhdGlvblJlZi5cbiAqIEBwYXJhbSBkb2MgQSByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgRG9jdW1lbnQgaW5zdGFuY2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbm5vdGF0ZUZvckh5ZHJhdGlvbihcbiAgICBhcHBSZWY6IEFwcGxpY2F0aW9uUmVmLCBkb2M6IERvY3VtZW50LCBwcm9maWxlcjogU3NyUHJvZmlsZXJ8bnVsbCkge1xuICBjb25zdCBzc3JJZFJlZ2lzdHJ5ID0gbmV3IFRWaWV3U3NySWRSZWdpc3RyeSgpO1xuICBjb25zdCBjb3JydXB0ZWRUZXh0Tm9kZXMgPSBuZXcgTWFwPHN0cmluZywgSFRNTEVsZW1lbnQ+KCk7XG4gIGNvbnN0IHZpZXdSZWZzID0gcmV0cmlldmVWaWV3c0Zyb21BcHBsaWNhdGlvblJlZihhcHBSZWYpO1xuICBmb3IgKGNvbnN0IHZpZXdSZWYgb2Ygdmlld1JlZnMpIHtcbiAgICBjb25zdCBsVmlldyA9IGdldENvbXBvbmVudExWaWV3KHZpZXdSZWYpO1xuICAgIC8vIFRPRE86IG1ha2Ugc3VyZSB0aGF0IHRoaXMgbFZpZXcgcmVwcmVzZW50c1xuICAgIC8vIGEgY29tcG9uZW50IGluc3RhbmNlLlxuICAgIGNvbnN0IGhvc3RFbGVtZW50ID0gbFZpZXdbSE9TVF07XG4gICAgaWYgKGhvc3RFbGVtZW50KSB7XG4gICAgICBjb25zdCBjb250ZXh0OiBIeWRyYXRpb25Db250ZXh0ID0ge3NzcklkUmVnaXN0cnksIGNvcnJ1cHRlZFRleHROb2RlcywgcHJvZmlsZXJ9O1xuICAgICAgYW5ub3RhdGVIb3N0RWxlbWVudEZvckh5ZHJhdGlvbihob3N0RWxlbWVudCwgbFZpZXcsIGNvbnRleHQpO1xuICAgICAgaW5zZXJ0VGV4dE5vZGVNYXJrZXJzKGNvcnJ1cHRlZFRleHROb2RlcywgZG9jKTtcbiAgICAgIHByb2ZpbGVyPy5pbmNyZW1lbnRNZXRyaWNWYWx1ZShTc3JQZXJmTWV0cmljcy5FbXB0eVRleHROb2RlQ291bnQsIGNvcnJ1cHRlZFRleHROb2Rlcy5zaXplKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNUSTE4bk5vZGUob2JqOiBhbnkpOiBib29sZWFuIHtcbiAgLy8gVE9ETzogY29uc2lkZXIgYWRkaW5nIGEgbm9kZSB0eXBlIHRvIFRJMThuP1xuICByZXR1cm4gb2JqLmhhc093blByb3BlcnR5KCdjcmVhdGUnKSAmJiBvYmouaGFzT3duUHJvcGVydHkoJ3VwZGF0ZScpO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVMVmlldyhsVmlldzogTFZpZXcsIGNvbnRleHQ6IEh5ZHJhdGlvbkNvbnRleHQpOiBOZ2hEb20ge1xuICBjb25zdCBuZ2g6IE5naERvbSA9IHt9O1xuICBjb25zdCB0VmlldyA9IGxWaWV3W1RWSUVXXTtcbiAgZm9yIChsZXQgaSA9IEhFQURFUl9PRkZTRVQ7IGkgPCB0Vmlldy5iaW5kaW5nU3RhcnRJbmRleDsgaSsrKSB7XG4gICAgbGV0IHRhcmdldE5vZGU6IE5vZGV8bnVsbCA9IG51bGw7XG4gICAgY29uc3QgYWRqdXN0ZWRJbmRleCA9IGkgLSBIRUFERVJfT0ZGU0VUO1xuICAgIGNvbnN0IHROb2RlID0gdFZpZXcuZGF0YVtpXSBhcyBUQ29udGFpbmVyTm9kZTtcbiAgICAvLyB0Tm9kZSBtYXkgYmUgbnVsbCBpbiB0aGUgY2FzZSBvZiBhIGxvY2FsUmVmXG4gICAgaWYgKCF0Tm9kZSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LnByb2ZpbGVyKSB7XG4gICAgICAvLyBXZSBwcm9jZXNzIDEgbW9yZSBub2RlIGZyb20gTFZpZXcgaGVyZS4gSWYgd2UgcHJvY2VzcyBhIGNvbXBvbmVudFxuICAgICAgLy8gb3IgYW4gTENvbnRhaW5lciwgd2UgY2FuIHN0aWxsIGluY3JlYXNlIHRoZSB2YWx1ZSBieSBvbmUsIHNpbmNlIGJvdGhcbiAgICAgIC8vIG9mIHRoZW0gaGF2ZSBuYXRpdmUgbm9kZXMgKGUuZy4gYGxDb250YWluZXJbSE9TVF1gKS5cbiAgICAgIGNvbnRleHQucHJvZmlsZXIuaW5jcmVtZW50TWV0cmljVmFsdWUoU3NyUGVyZk1ldHJpY3MuU2VyaWFsaXplZERvbU5vZGVzLCAxKTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodE5vZGUucHJvamVjdGlvbikpIHtcbiAgICAgIC8vIFRPRE86IGhhbmRsZSBgUk5vZGVbXWAgYXMgd2VsbC5cbiAgICAgIGZvciAoY29uc3QgaGVhZFROb2RlIG9mICh0Tm9kZS5wcm9qZWN0aW9uIGFzIGFueVtdKSkge1xuICAgICAgICAvLyBXZSBtYXkgaGF2ZSBgbnVsbGBzIGluIHNsb3RzIHdpdGggbm8gcHJvamVjdGVkIGNvbnRlbnQuXG4gICAgICAgIC8vIEFsc28sIGlmIHdlIHByb2Nlc3MgcmUtcHJvamVjdGVkIGNvbnRlbnQgKGkuZS4gYDxuZy1jb250ZW50PmBcbiAgICAgICAgLy8gYXBwZWFycyBhdCBwcm9qZWN0aW9uIGxvY2F0aW9uKSwgc2tpcCBhbm5vdGF0aW9ucyBmb3IgdGhpcyBjb250ZW50XG4gICAgICAgIC8vIHNpbmNlIGFsbCBET00gbm9kZXMgaW4gdGhpcyBwcm9qZWN0aW9uIHdlcmUgaGFuZGxlZCB3aGlsZSBwcm9jZXNzaW5nXG4gICAgICAgIC8vIGEgcGFyZW50IGxWaWV3LCB3aGljaCBjb250YWlucyB0aG9zZSBub2Rlcy5cbiAgICAgICAgaWYgKGhlYWRUTm9kZSAmJiAhaXNQcm9qZWN0aW9uVE5vZGUoaGVhZFROb2RlKSkge1xuICAgICAgICAgIGlmICghaXNJblNraXBIeWRyYXRpb25CbG9jayhoZWFkVE5vZGUsIGxWaWV3KSkge1xuICAgICAgICAgICAgbmdoW05PREVTXSA/Pz0ge307XG4gICAgICAgICAgICBuZ2hbTk9ERVNdW2hlYWRUTm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVRdID0gY2FsY1BhdGhGb3JOb2RlKGxWaWV3LCBoZWFkVE5vZGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNMQ29udGFpbmVyKGxWaWV3W2ldKSkge1xuICAgICAgLy8gdGhpcyBpcyBhIGNvbnRhaW5lclxuICAgICAgY29uc3QgdE5vZGUgPSB0Vmlldy5kYXRhW2ldIGFzIFRDb250YWluZXJOb2RlO1xuICAgICAgY29uc3QgZW1iZWRkZWRUVmlldyA9IHROb2RlLnRWaWV3cztcbiAgICAgIGlmIChlbWJlZGRlZFRWaWV3ICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGVtYmVkZGVkVFZpZXcpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RpbmcgdE5vZGUudFZpZXdzIHRvIGJlIGFuIG9iamVjdCwgYnV0IGl0J3MgYW4gYXJyYXkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgbmdoW1RFTVBMQVRFU10gPz89IHt9O1xuICAgICAgICBuZ2hbVEVNUExBVEVTXVtpIC0gSEVBREVSX09GRlNFVF0gPSBjb250ZXh0LnNzcklkUmVnaXN0cnkuZ2V0KGVtYmVkZGVkVFZpZXcpO1xuICAgICAgfVxuICAgICAgY29uc3QgaG9zdE5vZGUgPSBsVmlld1tpXVtIT1NUXSE7XG4gICAgICAvLyBMVmlld1tpXVtIT1NUXSBjYW4gYmUgMiBkaWZmZXJlbnQgdHlwZXM6XG4gICAgICAvLyAtIGVpdGhlciBhIERPTSBOb2RlXG4gICAgICAvLyAtIG9yIGFuIExWaWV3IEFycmF5IHRoYXQgcmVwcmVzZW50cyBhIGNvbXBvbmVudFxuICAgICAgLy8gV2Ugb25seSBoYW5kbGUgdGhlIERPTSBOb2RlIGNhc2UgaGVyZVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaG9zdE5vZGUpKSB7XG4gICAgICAgIC8vIHRoaXMgaXMgYSBjb21wb25lbnRcbiAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIGl0IGhhcyBuZ1NraXBIeWRyYXRpb25cbiAgICAgICAgLy8gVE9ETzogc2hvdWxkIHdlIGNoZWNrIGBTS0lQX0hZRFJBVElPTl9BVFRSX05BTUVgIGluIHROb2RlLm1lcmdlZEF0dHJzP1xuICAgICAgICB0YXJnZXROb2RlID0gdW53cmFwUk5vZGUoaG9zdE5vZGUgYXMgTFZpZXcpIGFzIEVsZW1lbnQ7XG4gICAgICAgIGlmICghKHRhcmdldE5vZGUgYXMgSFRNTEVsZW1lbnQpLmhhc0F0dHJpYnV0ZShTS0lQX0hZRFJBVElPTl9BVFRSX05BTUUpKSB7XG4gICAgICAgICAgYW5ub3RhdGVIb3N0RWxlbWVudEZvckh5ZHJhdGlvbih0YXJnZXROb2RlIGFzIEVsZW1lbnQsIGhvc3ROb2RlIGFzIExWaWV3LCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgY29udGFpbmVyID0gc2VyaWFsaXplTENvbnRhaW5lcihsVmlld1tpXSwgY29udGV4dCk7XG4gICAgICBuZ2hbQ09OVEFJTkVSU10gPz89IHt9O1xuICAgICAgbmdoW0NPTlRBSU5FUlNdW2FkanVzdGVkSW5kZXhdID0gY29udGFpbmVyO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShsVmlld1tpXSkpIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBjb21wb25lbnRcbiAgICAgIC8vIENoZWNrIHRvIHNlZSBpZiBpdCBoYXMgbmdTa2lwSHlkcmF0aW9uXG4gICAgICAvLyBUT0RPOiBzaG91bGQgd2UgY2hlY2sgYFNLSVBfSFlEUkFUSU9OX0FUVFJfTkFNRWAgaW4gdE5vZGUubWVyZ2VkQXR0cnM/XG4gICAgICB0YXJnZXROb2RlID0gdW53cmFwUk5vZGUobFZpZXdbaV1bSE9TVF0hKSBhcyBFbGVtZW50O1xuICAgICAgaWYgKCEodGFyZ2V0Tm9kZSBhcyBIVE1MRWxlbWVudCkuaGFzQXR0cmlidXRlKFNLSVBfSFlEUkFUSU9OX0FUVFJfTkFNRSkpIHtcbiAgICAgICAgYW5ub3RhdGVIb3N0RWxlbWVudEZvckh5ZHJhdGlvbih0YXJnZXROb2RlIGFzIEVsZW1lbnQsIGxWaWV3W2ldLCBjb250ZXh0KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVEkxOG5Ob2RlKHROb2RlKSB8fCB0Tm9kZS5pbnNlcnRCZWZvcmVJbmRleCkge1xuICAgICAgLy8gVE9ETzogaW1wbGVtZW50IGh5ZHJhdGlvbiBmb3IgaTE4biBub2Rlc1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdIeWRyYXRpb24gZm9yIGkxOG4gbm9kZXMgaXMgbm90IGltcGxlbWVudGVkLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0Tm9kZVR5cGUgPSB0Tm9kZS50eXBlO1xuICAgICAgLy8gPG5nLWNvbnRhaW5lcj4gY2FzZVxuICAgICAgaWYgKHROb2RlVHlwZSAmIFROb2RlVHlwZS5FbGVtZW50Q29udGFpbmVyKSB7XG4gICAgICAgIGNvbnN0IHJvb3ROb2RlczogYW55W10gPSBbXTtcbiAgICAgICAgY29sbGVjdE5hdGl2ZU5vZGVzKHRWaWV3LCBsVmlldywgdE5vZGUuY2hpbGQsIHJvb3ROb2Rlcyk7XG5cbiAgICAgICAgLy8gVGhpcyBpcyBhbiBcImVsZW1lbnRcIiBjb250YWluZXIgKHZzIFwidmlld1wiIGNvbnRhaW5lciksXG4gICAgICAgIC8vIHNvIGl0J3Mgb25seSByZXByZXNlbnRlZCBieSB0aGUgbnVtYmVyIG9mIHRvcC1sZXZlbCBub2Rlc1xuICAgICAgICAvLyBhcyBhIHNoaWZ0IHRvIGdldCB0byBhIGNvcnJlc3BvbmRpbmcgY29tbWVudCBub2RlLlxuICAgICAgICBjb25zdCBjb250YWluZXI6IE5naENvbnRhaW5lciA9IHtcbiAgICAgICAgICBbTlVNX1JPT1RfTk9ERVNdOiByb290Tm9kZXMubGVuZ3RoLFxuICAgICAgICB9O1xuXG4gICAgICAgIG5naFtDT05UQUlORVJTXSA/Pz0ge307XG4gICAgICAgIG5naFtDT05UQUlORVJTXVthZGp1c3RlZEluZGV4XSA9IGNvbnRhaW5lcjtcbiAgICAgIH0gZWxzZSBpZiAodE5vZGVUeXBlICYgVE5vZGVUeXBlLlByb2plY3Rpb24pIHtcbiAgICAgICAgLy8gQ3VycmVudCBUTm9kZSBoYXMgbm8gRE9NIGVsZW1lbnQgYXNzb2NpYXRlZCB3aXRoIGl0LFxuICAgICAgICAvLyBzbyB0aGUgZm9sbG93aW5nIG5vZGUgd291bGQgbm90IGJlIGFibGUgdG8gZmluZCBhbiBhbmNob3IuXG4gICAgICAgIC8vIFVzZSBmdWxsIHBhdGggaW5zdGVhZC5cbiAgICAgICAgbGV0IG5leHRUTm9kZSA9IHROb2RlLm5leHQ7XG4gICAgICAgIHdoaWxlIChuZXh0VE5vZGUgIT09IG51bGwgJiYgKG5leHRUTm9kZS50eXBlICYgVE5vZGVUeXBlLlByb2plY3Rpb24pKSB7XG4gICAgICAgICAgbmV4dFROb2RlID0gbmV4dFROb2RlLm5leHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5leHRUTm9kZSkge1xuICAgICAgICAgIGNvbnN0IGluZGV4ID0gbmV4dFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgICAgICAgICBpZiAoIWlzSW5Ta2lwSHlkcmF0aW9uQmxvY2sobmV4dFROb2RlLCBsVmlldykpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBjYWxjUGF0aEZvck5vZGUobFZpZXcsIG5leHRUTm9kZSk7XG4gICAgICAgICAgICBuZ2hbTk9ERVNdID8/PSB7fTtcbiAgICAgICAgICAgIG5naFtOT0RFU11baW5kZXhdID0gcGF0aDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc0Ryb3BwZWRQcm9qZWN0ZWROb2RlKHROb2RlKSkge1xuICAgICAgICAgIC8vIFRoaXMgaXMgYSBjYXNlIHdoZXJlIGEgbm9kZSB1c2VkIGluIGNvbnRlbnQgcHJvamVjdGlvblxuICAgICAgICAgIC8vIGRvZXNuJ3QgbWFrZSBpdCBpbnRvIG9uZSBvZiB0aGUgY29udGVudCBwcm9qZWN0aW9uIHNsb3RzXG4gICAgICAgICAgLy8gKGZvciBleGFtcGxlLCB3aGVuIHRoZXJlIGlzIG5vIGRlZmF1bHQgPG5nLWNvbnRlbnQgLz4gc2xvdFxuICAgICAgICAgIC8vIGluIHByb2plY3RvciBjb21wb25lbnQncyB0ZW1wbGF0ZSkuXG4gICAgICAgICAgbmdoW05PREVTXSA/Pz0ge307XG4gICAgICAgICAgbmdoW05PREVTXVthZGp1c3RlZEluZGV4XSA9IERST1BQRURfUFJPSkVDVEVEX05PREU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gSGFuZGxlIGNhc2VzIHdoZXJlIHRleHQgbm9kZXMgY2FuIGJlIGxvc3QgYWZ0ZXIgRE9NIHNlcmlhbGl6YXRpb246XG4gICAgICAgICAgLy8gIDEuIFdoZW4gdGhlcmUgaXMgYW4gKmVtcHR5IHRleHQgbm9kZSogaW4gRE9NOiBpbiB0aGlzIGNhc2UsIHRoaXNcbiAgICAgICAgICAvLyAgICAgbm9kZSB3b3VsZCBub3QgbWFrZSBpdCBpbnRvIHRoZSBzZXJpYWxpemVkIHN0cmluZyBhbmQgYXMgcyByZXN1bHQsXG4gICAgICAgICAgLy8gICAgIHRoaXMgbm9kZSB3b3VsZG4ndCBiZSBjcmVhdGVkIGluIGEgYnJvd3Nlci4gVGhpcyB3b3VsZCByZXN1bHQgaW5cbiAgICAgICAgICAvLyAgICAgYSBtaXNtYXRjaCBkdXJpbmcgdGhlIGh5ZHJhdGlvbiwgd2hlcmUgdGhlIHJ1bnRpbWUgbG9naWMgd291bGQgZXhwZWN0XG4gICAgICAgICAgLy8gICAgIGEgdGV4dCBub2RlIHRvIGJlIHByZXNlbnQgaW4gbGl2ZSBET00sIGJ1dCBubyB0ZXh0IG5vZGUgd291bGQgZXhpc3QuXG4gICAgICAgICAgLy8gICAgIEV4YW1wbGU6IGA8c3Bhbj57eyBuYW1lIH19PC9zcGFuPmAgd2hlbiB0aGUgYG5hbWVgIGlzIGFuIGVtcHR5IHN0cmluZy5cbiAgICAgICAgICAvLyAgICAgVGhpcyB3b3VsZCByZXN1bHQgaW4gYDxzcGFuPjwvc3Bhbj5gIHN0cmluZyBhZnRlciBzZXJpYWxpemF0aW9uIGFuZFxuICAgICAgICAgIC8vICAgICBpbiBhIGJyb3dzZXIgb25seSB0aGUgYHNwYW5gIGVsZW1lbnQgd291bGQgYmUgY3JlYXRlZC4gVG8gcmVzb2x2ZSB0aGF0LFxuICAgICAgICAgIC8vICAgICBhbiBleHRyYSBjb21tZW50IG5vZGUgaXMgYXBwZW5kZWQgaW4gcGxhY2Ugb2YgYW4gZW1wdHkgdGV4dCBub2RlIGFuZFxuICAgICAgICAgIC8vICAgICB0aGF0IHNwZWNpYWwgY29tbWVudCBub2RlIGlzIHJlcGxhY2VkIHdpdGggYW4gZW1wdHkgdGV4dCBub2RlICpiZWZvcmUqXG4gICAgICAgICAgLy8gICAgIGh5ZHJhdGlvbi5cbiAgICAgICAgICAvLyAgMi4gV2hlbiB0aGVyZSBhcmUgMiBjb25zZWN1dGl2ZSB0ZXh0IG5vZGVzIHByZXNlbnQgaW4gdGhlIERPTS5cbiAgICAgICAgICAvLyAgICAgRXhhbXBsZTogYDxkaXY+SGVsbG8gPG5nLWNvbnRhaW5lciAqbmdJZj1cInRydWVcIj53b3JsZDwvbmctY29udGFpbmVyPjwvZGl2PmAuXG4gICAgICAgICAgLy8gICAgIEluIHRoaXMgc2NlbmFyaW8sIHRoZSBsaXZlIERPTSB3b3VsZCBsb29rIGxpa2UgdGhpczpcbiAgICAgICAgICAvLyAgICAgICA8ZGl2PiN0ZXh0KCdIZWxsbyAnKSAjdGV4dCgnd29ybGQnKSAjY29tbWVudCgnY29udGFpbmVyJyk8L2Rpdj5cbiAgICAgICAgICAvLyAgICAgU2VyaWFsaXplZCBzdHJpbmcgd291bGQgbG9vayBsaWtlIHRoaXM6IGA8ZGl2PkhlbGxvIHdvcmxkPCEtLWNvbnRhaW5lci0tPjwvZGl2PmAuXG4gICAgICAgICAgLy8gICAgIFRoZSBsaXZlIERPTSBpbiBhIGJyb3dzZXIgYWZ0ZXIgdGhhdCB3b3VsZCBiZTpcbiAgICAgICAgICAvLyAgICAgICA8ZGl2PiN0ZXh0KCdIZWxsbyB3b3JsZCcpICNjb21tZW50KCdjb250YWluZXInKTwvZGl2PlxuICAgICAgICAgIC8vICAgICBOb3RpY2UgaG93IDIgdGV4dCBub2RlcyBhcmUgbm93IFwibWVyZ2VkXCIgaW50byBvbmUuIFRoaXMgd291bGQgY2F1c2UgaHlkcmF0aW9uXG4gICAgICAgICAgLy8gICAgIGxvZ2ljIHRvIGZhaWwsIHNpbmNlIGl0J2QgZXhwZWN0IDIgdGV4dCBub2RlcyBiZWluZyBwcmVzZW50LCBub3Qgb25lLlxuICAgICAgICAgIC8vICAgICBUbyBmaXggdGhpcywgd2UgaW5zZXJ0IGEgc3BlY2lhbCBjb21tZW50IG5vZGUgaW4gYmV0d2VlbiB0aG9zZSB0ZXh0IG5vZGVzLCBzb1xuICAgICAgICAgIC8vICAgICBzZXJpYWxpemVkIHJlcHJlc2VudGF0aW9uIGlzOiBgPGRpdj5IZWxsbyA8IS0tbmd0bnMtLT53b3JsZDwhLS1jb250YWluZXItLT48L2Rpdj5gLlxuICAgICAgICAgIC8vICAgICBUaGlzIGZvcmNlcyBicm93c2VyIHRvIGNyZWF0ZSAyIHRleHQgbm9kZXMgc2VwYXJhdGVkIGJ5IGEgY29tbWVudCBub2RlLlxuICAgICAgICAgIC8vICAgICBCZWZvcmUgcnVubmluZyBhIGh5ZHJhdGlvbiBwcm9jZXNzLCB0aGlzIHNwZWNpYWwgY29tbWVudCBub2RlIGlzIHJlbW92ZWQsIHNvIHRoZVxuICAgICAgICAgIC8vICAgICBsaXZlIERPTSBoYXMgZXhhY3RseSB0aGUgc2FtZSBzdGF0ZSBhcyBpdCB3YXMgYmVmb3JlIHNlcmlhbGl6YXRpb24uXG4gICAgICAgICAgaWYgKHROb2RlVHlwZSAmIFROb2RlVHlwZS5UZXh0KSB7XG4gICAgICAgICAgICBjb25zdCByTm9kZSA9IHVud3JhcFJOb2RlKGxWaWV3W2ldKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgIGlmIChyTm9kZS50ZXh0Q29udGVudCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgY29udGV4dC5jb3JydXB0ZWRUZXh0Tm9kZXMuc2V0KEVNUFRZX1RFWFRfTk9ERV9DT01NRU5ULCByTm9kZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJOb2RlLm5leHRTaWJsaW5nPy5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICAgICAgICAgICAgY29udGV4dC5jb3JydXB0ZWRUZXh0Tm9kZXMuc2V0KFRFWFRfTk9ERV9TRVBBUkFUT1JfQ09NTUVOVCwgck5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0Tm9kZS5wcm9qZWN0aW9uTmV4dCAmJiB0Tm9kZS5wcm9qZWN0aW9uTmV4dCAhPT0gdE5vZGUubmV4dCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcHJvamVjdGlvbiBuZXh0IGlzIG5vdCB0aGUgc2FtZSBhcyBuZXh0LCBpbiB3aGljaCBjYXNlXG4gICAgICAgICAgICAvLyB0aGUgbm9kZSB3b3VsZCBub3QgYmUgZm91bmQgYXQgY3JlYXRpb24gdGltZSBhdCBydW50aW1lIGFuZCB3ZVxuICAgICAgICAgICAgLy8gbmVlZCB0byBwcm92aWRlIGEgbG9jYXRpb24gdG8gdGhhdCBub2RlLlxuICAgICAgICAgICAgY29uc3QgbmV4dFByb2plY3RlZFROb2RlID0gdE5vZGUucHJvamVjdGlvbk5leHQ7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IG5leHRQcm9qZWN0ZWRUTm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVQ7XG4gICAgICAgICAgICBpZiAoIWlzSW5Ta2lwSHlkcmF0aW9uQmxvY2sobmV4dFByb2plY3RlZFROb2RlLCBsVmlldykpIHtcbiAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGNhbGNQYXRoRm9yTm9kZShsVmlldywgbmV4dFByb2plY3RlZFROb2RlKTtcbiAgICAgICAgICAgICAgbmdoW05PREVTXSA/Pz0ge307XG4gICAgICAgICAgICAgIG5naFtOT0RFU11baW5kZXhdID0gcGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5naDtcbn1cblxuZnVuY3Rpb24gaXNSb290TGV2ZWxQcm9qZWN0aW9uTm9kZSh0Tm9kZTogVE5vZGUpOiBib29sZWFuIHtcbiAgcmV0dXJuICh0Tm9kZS5mbGFncyAmIFROb2RlRmxhZ3MuaXNQcm9qZWN0ZWQpID09PSBUTm9kZUZsYWdzLmlzUHJvamVjdGVkO1xufVxuXG4vKipcbiAqIERldGVjdCBhIGNhc2Ugd2hlcmUgYSBub2RlIHVzZWQgaW4gY29udGVudCBwcm9qZWN0aW9uLFxuICogYnV0IGRvZXNuJ3QgbWFrZSBpdCBpbnRvIG9uZSBvZiB0aGUgY29udGVudCBwcm9qZWN0aW9uIHNsb3RzXG4gKiAoZm9yIGV4YW1wbGUsIHdoZW4gdGhlcmUgaXMgbm8gZGVmYXVsdCA8bmctY29udGVudCAvPiBzbG90XG4gKiBpbiBwcm9qZWN0b3IgY29tcG9uZW50J3MgdGVtcGxhdGUpLlxuICovXG5mdW5jdGlvbiBpc0Ryb3BwZWRQcm9qZWN0ZWROb2RlKHROb2RlOiBUTm9kZSk6IGJvb2xlYW4ge1xuICBsZXQgY3VycmVudFROb2RlID0gdE5vZGU7XG4gIGxldCBzZWVuQ29tcG9uZW50SG9zdCA9IGZhbHNlO1xuICB3aGlsZSAoY3VycmVudFROb2RlICE9PSBudWxsKSB7XG4gICAgaWYgKGlzQ29tcG9uZW50SG9zdChjdXJyZW50VE5vZGUpKSB7XG4gICAgICBzZWVuQ29tcG9uZW50SG9zdCA9IHRydWU7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgLy8gSWYgd2UgY29tZSBhY3Jvc3MgYSByb290IHByb2plY3RlZCBub2RlLCByZXR1cm4gdHJ1ZS5cbiAgICBpZiAoaXNSb290TGV2ZWxQcm9qZWN0aW9uTm9kZShjdXJyZW50VE5vZGUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGN1cnJlbnRUTm9kZSA9IGN1cnJlbnRUTm9kZS5wYXJlbnQgYXMgVE5vZGU7XG4gIH1cbiAgLy8gSWYgd2UndmUgc2VlbiBhIGNvbXBvbmVudCBob3N0LCBidXQgdGhlcmUgd2FzIG5vIHJvb3QgbGV2ZWxcbiAgLy8gcHJvamVjdGlvbiBub2RlLCB0aGlzIGluZGljYXRlcyB0aGF0IHRoaXMgbm90IHdhcyBub3QgcHJvamVjdGVkLlxuICByZXR1cm4gc2VlbkNvbXBvbmVudEhvc3Q7XG59XG5cbmZ1bmN0aW9uIGNhbGNQYXRoRm9yTm9kZShsVmlldzogTFZpZXcsIHROb2RlOiBUTm9kZSwgcGFyZW50VE5vZGU/OiBUTm9kZXxudWxsKTogc3RyaW5nIHtcbiAgY29uc3QgaW5kZXggPSB0Tm9kZS5pbmRleDtcbiAgLy8gSWYgYG51bGxgIGlzIHBhc3NlZCBleHBsaWNpdGx5LCB1c2UgdGhpcyBhcyBhIHNpZ25hbCB0aGF0IHdlIHdhbnQgdG8gY2FsY3VsYXRlXG4gIC8vIHRoZSBwYXRoIHN0YXJ0aW5nIGZyb20gYGxWaWV3W0hPU1RdYC5cbiAgcGFyZW50VE5vZGUgPSBwYXJlbnRUTm9kZSA9PT0gbnVsbCA/IG51bGwgOiAocGFyZW50VE5vZGUgfHwgdE5vZGUucGFyZW50ISk7XG4gIGNvbnN0IHBhcmVudEluZGV4ID0gcGFyZW50VE5vZGUgPT09IG51bGwgPyBSRUZFUkVOQ0VfTk9ERV9IT1NUIDogcGFyZW50VE5vZGUuaW5kZXg7XG4gIGNvbnN0IHBhcmVudFJOb2RlID1cbiAgICAgIHBhcmVudFROb2RlID09PSBudWxsID8gbFZpZXdbSE9TVF0gOiB1bndyYXBSTm9kZShsVmlld1twYXJlbnRJbmRleCBhcyBudW1iZXJdKTtcbiAgbGV0IHJOb2RlID0gdW53cmFwUk5vZGUobFZpZXdbaW5kZXhdKTtcbiAgaWYgKHROb2RlLnR5cGUgJiBUTm9kZVR5cGUuQW55Q29udGFpbmVyKSB7XG4gICAgLy8gRm9yIDxuZy1jb250YWluZXI+IG5vZGVzLCBpbnN0ZWFkIG9mIHNlcmlhbGl6aW5nIGEgcmVmZXJlbmNlXG4gICAgLy8gdG8gdGhlIGFuY2hvciBjb21tZW50IG5vZGUsIHNlcmlhbGl6ZSBhIGxvY2F0aW9uIG9mIHRoZSBmaXJzdFxuICAgIC8vIERPTSBlbGVtZW50LiBQYWlyZWQgd2l0aCB0aGUgY29udGFpbmVyIHNpemUgKHNlcmlhbGl6ZWQgYXMgYSBwYXJ0XG4gICAgLy8gb2YgYG5naC5jb250YWluZXJzYCksIGl0IHNob3VsZCBnaXZlIGVub3VnaCBpbmZvcm1hdGlvbiBmb3IgcnVudGltZVxuICAgIC8vIHRvIGh5ZHJhdGUgbm9kZXMgaW4gdGhpcyBjb250YWluZXIuXG4gICAgY29uc3QgZmlyc3RSTm9kZSA9IGdldEZpcnN0TmF0aXZlTm9kZShsVmlldywgdE5vZGUpO1xuXG4gICAgLy8gSWYgY29udGFpbmVyIGlzIG5vdCBlbXB0eSwgdXNlIGEgcmVmZXJlbmNlIHRvIHRoZSBmaXJzdCBlbGVtZW50LFxuICAgIC8vIG90aGVyd2lzZSwgck5vZGUgd291bGQgcG9pbnQgdG8gYW4gYW5jaG9yIGNvbW1lbnQgbm9kZS5cbiAgICBpZiAoZmlyc3RSTm9kZSkge1xuICAgICAgck5vZGUgPSBmaXJzdFJOb2RlO1xuICAgIH1cbiAgfVxuICBjb25zdCByZWZlcmVuY2VOb2RlID1cbiAgICAgIHBhcmVudEluZGV4ID09PSBSRUZFUkVOQ0VfTk9ERV9IT1NUID8gcGFyZW50SW5kZXggOiAnJyArIChwYXJlbnRJbmRleCAtIEhFQURFUl9PRkZTRVQpO1xuICBsZXQgcGF0aDogc3RyaW5nfG51bGwgPSBjYWxjUGF0aEJldHdlZW4ocGFyZW50Uk5vZGUgYXMgTm9kZSwgck5vZGUgYXMgTm9kZSwgcmVmZXJlbmNlTm9kZSk7XG4gIGlmIChwYXRoID09PSBudWxsICYmIHBhcmVudFJOb2RlICE9PSByTm9kZSkge1xuICAgIC8vIFNlYXJjaGluZyBmb3IgYSBwYXRoIGJldHdlZW4gZWxlbWVudHMgd2l0aGluIGEgaG9zdCBub2RlIGZhaWxlZC5cbiAgICAvLyBUcnlpbmcgdG8gZmluZCBhIHBhdGggdG8gYW4gZWxlbWVudCBzdGFydGluZyBmcm9tIHRoZSBgZG9jdW1lbnQuYm9keWAgaW5zdGVhZC5cbiAgICBjb25zdCBib2R5ID0gKHBhcmVudFJOb2RlIGFzIE5vZGUpLm93bmVyRG9jdW1lbnQhLmJvZHkgYXMgTm9kZTtcbiAgICBwYXRoID0gY2FsY1BhdGhCZXR3ZWVuKGJvZHksIHJOb2RlIGFzIE5vZGUsIFJFRkVSRU5DRV9OT0RFX0JPRFkpO1xuXG4gICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgIC8vIElmIHBhdGggaXMgc3RpbGwgZW1wdHksIGl0J3MgbGlrZWx5IHRoYXQgdGhpcyBub2RlIGlzIGRldGFjaGVkIGFuZFxuICAgICAgLy8gd29uJ3QgYmUgZm91bmQgZHVyaW5nIGh5ZHJhdGlvbi5cbiAgICAgIC8vIFRPRE86IGFkZCBhIGJldHRlciBlcnJvciBtZXNzYWdlLCBwb3RlbnRpYWxseSBzdWdnZXN0aW5nIGBuZ1NraXBIeWRyYXRpb25gLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gbG9jYXRlIGVsZW1lbnQgb24gYSBwYWdlLicpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcGF0aCE7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUxDb250YWluZXIobENvbnRhaW5lcjogTENvbnRhaW5lciwgY29udGV4dDogSHlkcmF0aW9uQ29udGV4dCk6IE5naENvbnRhaW5lciB7XG4gIGNvbnN0IGNvbnRhaW5lcjogTmdoQ29udGFpbmVyID0ge307XG5cbiAgZm9yIChsZXQgaSA9IENPTlRBSU5FUl9IRUFERVJfT0ZGU0VUOyBpIDwgbENvbnRhaW5lci5sZW5ndGg7IGkrKykge1xuICAgIGxldCBjaGlsZExWaWV3ID0gbENvbnRhaW5lcltpXSBhcyBMVmlldztcblxuICAgIC8vIEdldCBMVmlldyBmb3IgdW5kZXJseWluZyBjb21wb25lbnQuXG4gICAgaWYgKGlzUm9vdFZpZXcoY2hpbGRMVmlldykpIHtcbiAgICAgIGNoaWxkTFZpZXcgPSBjaGlsZExWaWV3W0hFQURFUl9PRkZTRVRdO1xuICAgIH1cbiAgICBjb25zdCBjaGlsZFRWaWV3ID0gY2hpbGRMVmlld1tUVklFV107XG5cbiAgICBsZXQgdGVtcGxhdGU7XG4gICAgbGV0IG51bVJvb3ROb2RlcyA9IDA7XG4gICAgaWYgKGNoaWxkVFZpZXcudHlwZSA9PT0gVFZpZXdUeXBlLkNvbXBvbmVudCkge1xuICAgICAgY29uc3QgY3R4ID0gY2hpbGRMVmlld1tDT05URVhUXTtcbiAgICAgIGNvbnN0IGNvbXBvbmVudERlZiA9IGdldENvbXBvbmVudERlZihjdHghLmNvbnN0cnVjdG9yIGFzIFR5cGU8dW5rbm93bj4pITtcbiAgICAgIHRlbXBsYXRlID0gZ2V0Q29tcG9uZW50SWQoY29tcG9uZW50RGVmKTtcblxuICAgICAgLy8gVGhpcyBpcyBhIGNvbXBvbmVudCB2aWV3LCB3aGljaCBoYXMgb25seSAxIHJvb3Qgbm9kZTogdGhlIGNvbXBvbmVudFxuICAgICAgLy8gaG9zdCBub2RlIGl0c2VsZiAob3RoZXIgbm9kZXMgd291bGQgYmUgaW5zaWRlIHRoYXQgaG9zdCBub2RlKS5cbiAgICAgIG51bVJvb3ROb2RlcyA9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRlbXBsYXRlID1cbiAgICAgICAgICBjb250ZXh0LnNzcklkUmVnaXN0cnkuZ2V0KGNoaWxkVFZpZXcpOyAgLy8gZnJvbSB3aGljaCB0ZW1wbGF0ZSBkaWQgdGhpcyBsVmlldyBvcmlnaW5hdGU/XG5cbiAgICAgIC8vIENvbGxlY3Qgcm9vdCBub2RlcyB3aXRoaW4gdGhpcyB2aWV3LlxuICAgICAgY29uc3Qgcm9vdE5vZGVzOiB1bmtub3duW10gPSBbXTtcbiAgICAgIGNvbGxlY3ROYXRpdmVOb2RlcyhjaGlsZFRWaWV3LCBjaGlsZExWaWV3LCBjaGlsZFRWaWV3LmZpcnN0Q2hpbGQsIHJvb3ROb2Rlcyk7XG4gICAgICBudW1Sb290Tm9kZXMgPSByb290Tm9kZXMubGVuZ3RoO1xuICAgIH1cblxuICAgIGNvbnN0IHZpZXc6IE5naFZpZXcgPSB7XG4gICAgICBbVEVNUExBVEVdOiB0ZW1wbGF0ZSxcbiAgICAgIFtOVU1fUk9PVF9OT0RFU106IG51bVJvb3ROb2RlcyxcbiAgICAgIC4uLnNlcmlhbGl6ZUxWaWV3KGxDb250YWluZXJbaV0gYXMgTFZpZXcsIGNvbnRleHQpLFxuICAgIH07XG4gICAgY29udGFpbmVyW1ZJRVdTXSA/Pz0gW107XG4gICAgaWYgKGNvbnRhaW5lcltWSUVXU10ubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgcHJldlZpZXcgPSBjb250YWluZXJbVklFV1NdLmF0KC0xKSE7ICAvLyB0aGUgbGFzdCBlbGVtZW50IGluIGFycmF5XG4gICAgICAvLyBDb21wYXJlIGB2aWV3YCBhbmQgYHByZXZWaWV3YCB0byBzZWUgaWYgdGhleSBhcmUgdGhlIHNhbWUuXG4gICAgICBpZiAoY29tcGFyZU5naFZpZXcodmlldywgcHJldlZpZXcpKSB7XG4gICAgICAgIHByZXZWaWV3W01VTFRJUExJRVJdID8/PSAxO1xuICAgICAgICBwcmV2Vmlld1tNVUxUSVBMSUVSXSsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGFpbmVyW1ZJRVdTXS5wdXNoKHZpZXcpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXJbVklFV1NdLnB1c2godmlldyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNvbnRhaW5lcjtcbn1cblxuZnVuY3Rpb24gY29tcGFyZU5naFZpZXcoY3VycjogTmdoVmlldywgcHJldjogTmdoVmlldyk6IGJvb2xlYW4ge1xuICBjb25zdCBwcmV2Q2xvbmUgPSB7Li4ucHJldn07XG4gIGRlbGV0ZSBwcmV2Q2xvbmVbTVVMVElQTElFUl07XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShjdXJyKSA9PT0gSlNPTi5zdHJpbmdpZnkocHJldkNsb25lKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFubm90YXRlSG9zdEVsZW1lbnRGb3JIeWRyYXRpb24oXG4gICAgZWxlbWVudDogRWxlbWVudCwgbFZpZXc6IExWaWV3LCBjb250ZXh0OiBIeWRyYXRpb25Db250ZXh0KTogdm9pZCB7XG4gIGNvbnN0IHJhd05naCA9IHNlcmlhbGl6ZUxWaWV3KGxWaWV3LCBjb250ZXh0KTtcbiAgbGV0IHNlcmlhbGl6ZWROZ2ggPSAnJztcbiAgLy8gRG8gbm90IHNlcmlhbGl6ZSBhbiBlbXB0eSBvYmplY3RcbiAgaWYgKE9iamVjdC5rZXlzKHJhd05naCkubGVuZ3RoID4gMCkge1xuICAgIHNlcmlhbGl6ZWROZ2ggPSBjb21wcmVzc05naEluZm8ocmF3TmdoKTtcbiAgfVxuICBpZiAoY29udGV4dC5wcm9maWxlcikge1xuICAgIGlmIChzZXJpYWxpemVkTmdoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29udGV4dC5wcm9maWxlci5pbmNyZW1lbnRNZXRyaWNWYWx1ZShTc3JQZXJmTWV0cmljcy5Db21wb25lbnRzV2l0aEVtcHR5TmdoLCAxKTtcbiAgICB9XG4gICAgY29udGV4dC5wcm9maWxlci5pbmNyZW1lbnRNZXRyaWNWYWx1ZShcbiAgICAgICAgU3NyUGVyZk1ldHJpY3MuTmdoQW5ub3RhdGlvblNpemUsIHNlcmlhbGl6ZWROZ2gubGVuZ3RoICsgNyk7ICAvLyA3IHRvIGFjY291bnQgZm9yICcgbmdoPVwiXCInXG4gICAgY29udGV4dC5wcm9maWxlci5pbmNyZW1lbnRNZXRyaWNWYWx1ZShcbiAgICAgICAgU3NyUGVyZk1ldHJpY3MuU2VyaWFsaXplZENvbXBvbmVudHMsIDEpOyAgLy8gaW5jcmVtZW50IGJ5IG9uZSBtb3JlIGNvbXBvbmVudFxuICB9XG4gIGVsZW1lbnQuc2V0QXR0cmlidXRlKE5HSF9BVFRSX05BTUUsIHNlcmlhbGl6ZWROZ2gpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRUZXh0Tm9kZU1hcmtlcnMoY29ycnVwdGVkVGV4dE5vZGVzOiBNYXA8c3RyaW5nLCBIVE1MRWxlbWVudD4sIGRvYzogRG9jdW1lbnQpIHtcbiAgZm9yIChsZXQgW21hcmtlciwgdGV4dE5vZGVdIG9mIGNvcnJ1cHRlZFRleHROb2Rlcykge1xuICAgIHRleHROb2RlLmFmdGVyKGRvYy5jcmVhdGVDb21tZW50KG1hcmtlcikpO1xuICB9XG59XG4iXX0=