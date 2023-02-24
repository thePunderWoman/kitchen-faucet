/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CONTAINERS, NODES, NUM_ROOT_NODES, VIEWS } from '../hydration/interfaces';
import { HEADER_OFFSET } from '../render3/interfaces/view';
import { ɵɵresolveBody } from '../render3/util/misc_utils';
import { getNativeByTNode, unwrapRNode } from '../render3/util/view_utils';
import { assertDefined } from '../util/assert';
import { compressNodeLocation, decompressNodeLocation } from './compression';
import { nodeNotFoundAtPathError, validateSiblingNodeExists } from './error_handling';
export const REFERENCE_NODE_HOST = 'h';
export const REFERENCE_NODE_BODY = 'b';
export var NodeNavigationStep;
(function (NodeNavigationStep) {
    NodeNavigationStep["FirstChild"] = "f";
    NodeNavigationStep["NextSibling"] = "n";
})(NodeNavigationStep || (NodeNavigationStep = {}));
export class NoPathFoundError extends Error {
}
/**
 * Generate a list of DOM navigation operations to get from node `start` to node `finish`.
 *
 * Note: assumes that node `start` occurs before node `finish` in an in-order traversal of the DOM
 * tree. That is, we should be able to get from `start` to `finish` purely by using `.firstChild`
 * and `.nextSibling` operations.
 */
export function navigateBetween(start, finish) {
    if (start === finish) {
        return [];
    }
    else if (start.parentElement == null || finish.parentElement == null) {
        throw new NoPathFoundError();
    }
    else if (start.parentElement === finish.parentElement) {
        return navigateBetweenSiblings(start, finish);
    }
    else {
        // `finish` is a child of its parent, so the parent will always have a child.
        const parent = finish.parentElement;
        return [
            // First navigate to `finish`'s parent.
            ...navigateBetween(start, parent),
            // Then to its first child.
            NodeNavigationStep.FirstChild,
            // And finally from that node to `finish` (maybe a no-op if we're already there).
            ...navigateBetween(parent.firstChild, finish),
        ];
    }
}
function navigateBetweenSiblings(start, finish) {
    const nav = [];
    let node = null;
    for (node = start; node != null && node !== finish; node = node.nextSibling) {
        nav.push(NodeNavigationStep.NextSibling);
    }
    return node === null ? [] : nav;
}
export function calcPathBetween(from, to, parent) {
    let path = [];
    try {
        path = navigateBetween(from, to);
    }
    catch (e) {
        if (e instanceof NoPathFoundError) {
            return null;
        }
    }
    return compressNodeLocation(parent, path);
}
function findExistingNode(host, path) {
    let node = host;
    for (const op of path) {
        if (ngDevMode && !node) {
            throw nodeNotFoundAtPathError(host, path);
        }
        switch (op) {
            case NodeNavigationStep.FirstChild:
                node = node.firstChild;
                break;
            case NodeNavigationStep.NextSibling:
                node = node.nextSibling;
                break;
        }
    }
    if (ngDevMode && !node) {
        throw nodeNotFoundAtPathError(host, path);
    }
    return node;
}
function locateRNodeByPath(path, lView) {
    const [referenceNode, ...pathParts] = decompressNodeLocation(path);
    let ref;
    if (referenceNode === REFERENCE_NODE_HOST) {
        ref = lView[0];
    }
    else if (referenceNode === REFERENCE_NODE_BODY) {
        ref = ɵɵresolveBody(lView[0]);
    }
    else {
        const parentElementId = Number(referenceNode);
        ref = unwrapRNode(lView[parentElementId + HEADER_OFFSET]);
    }
    return findExistingNode(ref, pathParts);
}
function calcViewContainerSize(views) {
    let numNodes = 0;
    for (let view of views) {
        numNodes += view[NUM_ROOT_NODES];
    }
    return numNodes;
}
export function locateNextRNode(hydrationInfo, tView, lView, tNode) {
    let native = null;
    const adjustedIndex = tNode.index - HEADER_OFFSET;
    const nodes = hydrationInfo.data[NODES];
    const containers = hydrationInfo.data[CONTAINERS];
    if (nodes?.[adjustedIndex]) {
        // We know exact location of the node.
        native = locateRNodeByPath(nodes[adjustedIndex], lView);
    }
    else if (tView.firstChild === tNode) {
        // We create a first node in this view.
        native = hydrationInfo.firstChild;
    }
    else {
        // Locate a node based on a previous sibling or a parent node.
        const previousTNodeParent = tNode.prev === null;
        const previousTNode = tNode.prev ?? tNode.parent;
        ngDevMode &&
            assertDefined(previousTNode, 'Unexpected state: current TNode does not have a connection ' +
                'to the previous node or a parent node.');
        const previousTNodeIndex = previousTNode.index - HEADER_OFFSET;
        let previousRElement = getNativeByTNode(previousTNode, lView);
        if (previousTNodeParent && previousTNode.type === 8 /* TNodeType.ElementContainer */) {
            // Previous node was an `<ng-container>`, so this node is a first child
            // within an element container, so we can locate the container in ngh data
            // structure and use its first child.
            const elementContainer = hydrationInfo.elementContainers?.[previousTNodeIndex];
            ngDevMode &&
                assertDefined(elementContainer, 'Unexpected state: current TNode is a container, but it does not have ' +
                    'an associated hydration info.');
            native = elementContainer.firstChild;
        }
        else {
            if (previousTNodeParent) {
                native = previousRElement.firstChild;
            }
            else {
                const previousNodeHydrationInfo = containers?.[previousTNodeIndex];
                if (previousTNode.type === 2 /* TNodeType.Element */ && previousNodeHydrationInfo) {
                    // If the previous node is an element, but it also has container info,
                    // this means that we are processing a node like `<div #vcrTarget>`, which is
                    // represented in live DOM as `<div></div>...<!--container-->`.
                    // In this case, there are nodes *after* this element and we need to skip those.
                    const views = previousNodeHydrationInfo[VIEWS];
                    const numRootNodesToSkip = views ? calcViewContainerSize(views) : 0;
                    // `+1` stands for an anchor comment node after all the views in this container.
                    const nodesToSkip = numRootNodesToSkip + 1;
                    previousRElement = siblingAfter(nodesToSkip, previousRElement);
                }
                native = previousRElement.nextSibling;
            }
        }
    }
    return native;
}
export function siblingAfter(skip, from) {
    let currentNode = from;
    for (let i = 0; i < skip; i++) {
        ngDevMode && validateSiblingNodeExists(currentNode);
        currentNode = currentNode.nextSibling;
    }
    return currentNode;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9sb29rdXBfdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vbm9kZV9sb29rdXBfdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFVBQVUsRUFBMkIsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUcxRyxPQUFPLEVBQUMsYUFBYSxFQUFlLE1BQU0sNEJBQTRCLENBQUM7QUFDdkUsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBQ3pELE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUMsTUFBTSw0QkFBNEIsQ0FBQztBQUN6RSxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFN0MsT0FBTyxFQUFDLG9CQUFvQixFQUFFLHNCQUFzQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzNFLE9BQU8sRUFBQyx1QkFBdUIsRUFBRSx5QkFBeUIsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBRXBGLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQztBQUN2QyxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUM7QUFFdkMsTUFBTSxDQUFOLElBQVksa0JBR1g7QUFIRCxXQUFZLGtCQUFrQjtJQUM1QixzQ0FBZ0IsQ0FBQTtJQUNoQix1Q0FBaUIsQ0FBQTtBQUNuQixDQUFDLEVBSFcsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUc3QjtBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxLQUFLO0NBQUc7QUFFOUM7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBQyxLQUFXLEVBQUUsTUFBWTtJQUN2RCxJQUFJLEtBQUssS0FBSyxNQUFNLEVBQUU7UUFDcEIsT0FBTyxFQUFFLENB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LENBQUMsQ0FBQztvQkFDaEQsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3BFLGdGQUFnRjtvQkFDaEYsTUFBTSxXQUFXLEdBQUcsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO29CQUMzQyxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFFLENBQUM7aUJBQ2pFO2dCQUNELE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxXQUF1QixDQUFDO2FBQ25EO1NBQ0Y7S0FDRjtJQUNELE9BQU8sTUFBVyxDQUFDO0FBQ3JCLENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFrQixJQUFZLEVBQUUsSUFBVztJQUNyRSxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUM7SUFDdkIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM3QixTQUFTLElBQUkseUJBQXlCLENBQUMsV0FBbUIsQ0FBQyxDQUFDO1FBQzVELFdBQVcsR0FBRyxXQUFXLENBQUMsV0FBWSxDQUFDO0tBQ3hDO0lBQ0QsT0FBTyxXQUFnQixDQUFDO0FBQzFCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDT05UQUlORVJTLCBOZ2hEb21JbnN0YW5jZSwgTmdoVmlldywgTk9ERVMsIE5VTV9ST09UX05PREVTLCBWSUVXU30gZnJvbSAnLi4vaHlkcmF0aW9uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtUTm9kZSwgVE5vZGVUeXBlfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvbm9kZSc7XG5pbXBvcnQge1JFbGVtZW50LCBSTm9kZX0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3JlbmRlcmVyX2RvbSc7XG5pbXBvcnQge0hFQURFUl9PRkZTRVQsIExWaWV3LCBUVmlld30gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3ZpZXcnO1xuaW1wb3J0IHvJtcm1cmVzb2x2ZUJvZHl9IGZyb20gJy4uL3JlbmRlcjMvdXRpbC9taXNjX3V0aWxzJztcbmltcG9ydCB7Z2V0TmF0aXZlQnlUTm9kZSwgdW53cmFwUk5vZGV9IGZyb20gJy4uL3JlbmRlcjMvdXRpbC92aWV3X3V0aWxzJztcbmltcG9ydCB7YXNzZXJ0RGVmaW5lZH0gZnJvbSAnLi4vdXRpbC9hc3NlcnQnO1xuXG5pbXBvcnQge2NvbXByZXNzTm9kZUxvY2F0aW9uLCBkZWNvbXByZXNzTm9kZUxvY2F0aW9ufSBmcm9tICcuL2NvbXByZXNzaW9uJztcbmltcG9ydCB7bm9kZU5vdEZvdW5kQXRQYXRoRXJyb3IsIHZhbGlkYXRlU2libGluZ05vZGVFeGlzdHN9IGZyb20gJy4vZXJyb3JfaGFuZGxpbmcnO1xuXG5leHBvcnQgY29uc3QgUkVGRVJFTkNFX05PREVfSE9TVCA9ICdoJztcbmV4cG9ydCBjb25zdCBSRUZFUkVOQ0VfTk9ERV9CT0RZID0gJ2InO1xuXG5leHBvcnQgZW51bSBOb2RlTmF2aWdhdGlvblN0ZXAge1xuICBGaXJzdENoaWxkID0gJ2YnLFxuICBOZXh0U2libGluZyA9ICduJyxcbn1cblxuZXhwb3J0IGNsYXNzIE5vUGF0aEZvdW5kRXJyb3IgZXh0ZW5kcyBFcnJvciB7fVxuXG4vKipcbiAqIEdlbmVyYXRlIGEgbGlzdCBvZiBET00gbmF2aWdhdGlvbiBvcGVyYXRpb25zIHRvIGdldCBmcm9tIG5vZGUgYHN0YXJ0YCB0byBub2RlIGBmaW5pc2hgLlxuICpcbiAqIE5vdGU6IGFzc3VtZXMgdGhhdCBub2RlIGBzdGFydGAgb2NjdXJzIGJlZm9yZSBub2RlIGBmaW5pc2hgIGluIGFuIGluLW9yZGVyIHRyYXZlcnNhbCBvZiB0aGUgRE9NXG4gKiB0cmVlLiBUaGF0IGlzLCB3ZSBzaG91bGQgYmUgYWJsZSB0byBnZXQgZnJvbSBgc3RhcnRgIHRvIGBmaW5pc2hgIHB1cmVseSBieSB1c2luZyBgLmZpcnN0Q2hpbGRgXG4gKiBhbmQgYC5uZXh0U2libGluZ2Agb3BlcmF0aW9ucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5hdmlnYXRlQmV0d2VlbihzdGFydDogTm9kZSwgZmluaXNoOiBOb2RlKTogTm9kZU5hdmlnYXRpb25TdGVwW10ge1xuICBpZiAoc3RhcnQgPT09IGZpbmlzaCkge1xuICAgIHJldHVybiBbXTtcbiAgfSBlbHNlIGlmIChzdGFydC5wYXJlbnRFbGVtZW50ID09IG51bGwgfHwgZmluaXNoLnBhcmVudEVsZW1lbnQgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBOb1BhdGhGb3VuZEVycm9yKCk7XG4gIH0gZWxzZSBpZiAoc3RhcnQucGFyZW50RWxlbWVudCA9PT0gZmluaXNoLnBhcmVudEVsZW1lbnQpIHtcbiAgICByZXR1cm4gbmF2aWdhdGVCZXR3ZWVuU2libGluZ3Moc3RhcnQsIGZpbmlzaCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gYGZpbmlzaGAgaXMgYSBjaGlsZCBvZiBpdHMgcGFyZW50LCBzbyB0aGUgcGFyZW50IHdpbGwgYWx3YXlzIGhhdmUgYSBjaGlsZC5cbiAgICBjb25zdCBwYXJlbnQgPSBmaW5pc2gucGFyZW50RWxlbWVudCE7XG4gICAgcmV0dXJuIFtcbiAgICAgIC8vIEZpcnN0IG5hdmlnYXRlIHRvIGBmaW5pc2hgJ3MgcGFyZW50LlxuICAgICAgLi4ubmF2aWdhdGVCZXR3ZWVuKHN0YXJ0LCBwYXJlbnQpLFxuICAgICAgLy8gVGhlbiB0byBpdHMgZmlyc3QgY2hpbGQuXG4gICAgICBOb2RlTmF2aWdhdGlvblN0ZXAuRmlyc3RDaGlsZCxcbiAgICAgIC8vIEFuZCBmaW5hbGx5IGZyb20gdGhhdCBub2RlIHRvIGBmaW5pc2hgIChtYXliZSBhIG5vLW9wIGlmIHdlJ3JlIGFscmVhZHkgdGhlcmUpLlxuICAgICAgLi4ubmF2aWdhdGVCZXR3ZWVuKHBhcmVudC5maXJzdENoaWxkISwgZmluaXNoKSxcbiAgICBdO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5hdmlnYXRlQmV0d2VlblNpYmxpbmdzKHN0YXJ0OiBOb2RlLCBmaW5pc2g6IE5vZGUpOiBOb2RlTmF2aWdhdGlvblN0ZXBbXSB7XG4gIGNvbnN0IG5hdjogTm9kZU5hdmlnYXRpb25TdGVwW10gPSBbXTtcbiAgbGV0IG5vZGU6IE5vZGV8bnVsbCA9IG51bGw7XG4gIGZvciAobm9kZSA9IHN0YXJ0OyBub2RlICE9IG51bGwgJiYgbm9kZSAhPT0gZmluaXNoOyBub2RlID0gbm9kZS5uZXh0U2libGluZykge1xuICAgIG5hdi5wdXNoKE5vZGVOYXZpZ2F0aW9uU3RlcC5OZXh0U2libGluZyk7XG4gIH1cbiAgcmV0dXJuIG5vZGUgPT09IG51bGwgPyBbXSA6IG5hdjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNQYXRoQmV0d2Vlbihmcm9tOiBOb2RlLCB0bzogTm9kZSwgcGFyZW50OiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gIGxldCBwYXRoOiBOb2RlTmF2aWdhdGlvblN0ZXBbXSA9IFtdO1xuICB0cnkge1xuICAgIHBhdGggPSBuYXZpZ2F0ZUJldHdlZW4oZnJvbSwgdG8pO1xuICB9IGNhdGNoIChlOiB1bmtub3duKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBOb1BhdGhGb3VuZEVycm9yKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvbXByZXNzTm9kZUxvY2F0aW9uKHBhcmVudCwgcGF0aCk7XG59XG5cbmZ1bmN0aW9uIGZpbmRFeGlzdGluZ05vZGUoaG9zdDogTm9kZSwgcGF0aDogTm9kZU5hdmlnYXRpb25TdGVwW10pOiBSTm9kZSB7XG4gIGxldCBub2RlID0gaG9zdDtcbiAgZm9yIChjb25zdCBvcCBvZiBwYXRoKSB7XG4gICAgaWYgKG5nRGV2TW9kZSAmJiAhbm9kZSkge1xuICAgICAgdGhyb3cgbm9kZU5vdEZvdW5kQXRQYXRoRXJyb3IoaG9zdCwgcGF0aCk7XG4gICAgfVxuICAgIHN3aXRjaCAob3ApIHtcbiAgICAgIGNhc2UgTm9kZU5hdmlnYXRpb25TdGVwLkZpcnN0Q2hpbGQ6XG4gICAgICAgIG5vZGUgPSBub2RlLmZpcnN0Q2hpbGQhO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgTm9kZU5hdmlnYXRpb25TdGVwLk5leHRTaWJsaW5nOlxuICAgICAgICBub2RlID0gbm9kZS5uZXh0U2libGluZyE7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBpZiAobmdEZXZNb2RlICYmICFub2RlKSB7XG4gICAgdGhyb3cgbm9kZU5vdEZvdW5kQXRQYXRoRXJyb3IoaG9zdCwgcGF0aCk7XG4gIH1cbiAgcmV0dXJuIG5vZGUgYXMgdW5rbm93biBhcyBSTm9kZTtcbn1cblxuZnVuY3Rpb24gbG9jYXRlUk5vZGVCeVBhdGgocGF0aDogc3RyaW5nLCBsVmlldzogTFZpZXcpOiBSTm9kZSB7XG4gIGNvbnN0IFtyZWZlcmVuY2VOb2RlLCAuLi5wYXRoUGFydHNdID0gZGVjb21wcmVzc05vZGVMb2NhdGlvbihwYXRoKTtcbiAgbGV0IHJlZjogRWxlbWVudDtcbiAgaWYgKHJlZmVyZW5jZU5vZGUgPT09IFJFRkVSRU5DRV9OT0RFX0hPU1QpIHtcbiAgICByZWYgPSBsVmlld1swXSBhcyB1bmtub3duIGFzIEVsZW1lbnQ7XG4gIH0gZWxzZSBpZiAocmVmZXJlbmNlTm9kZSA9PT0gUkVGRVJFTkNFX05PREVfQk9EWSkge1xuICAgIHJlZiA9IMm1ybVyZXNvbHZlQm9keShsVmlld1swXSBhcyB1bmtub3duIGFzIFJFbGVtZW50ICYge293bmVyRG9jdW1lbnQ6IERvY3VtZW50fSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcGFyZW50RWxlbWVudElkID0gTnVtYmVyKHJlZmVyZW5jZU5vZGUpO1xuICAgIHJlZiA9IHVud3JhcFJOb2RlKChsVmlldyBhcyBhbnkpW3BhcmVudEVsZW1lbnRJZCArIEhFQURFUl9PRkZTRVRdKSBhcyBFbGVtZW50O1xuICB9XG4gIHJldHVybiBmaW5kRXhpc3RpbmdOb2RlKHJlZiwgcGF0aFBhcnRzKTtcbn1cblxuZnVuY3Rpb24gY2FsY1ZpZXdDb250YWluZXJTaXplKHZpZXdzOiBOZ2hWaWV3W10pOiBudW1iZXIge1xuICBsZXQgbnVtTm9kZXMgPSAwO1xuICBmb3IgKGxldCB2aWV3IG9mIHZpZXdzKSB7XG4gICAgbnVtTm9kZXMgKz0gdmlld1tOVU1fUk9PVF9OT0RFU107XG4gIH1cbiAgcmV0dXJuIG51bU5vZGVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRlTmV4dFJOb2RlPFQgZXh0ZW5kcyBSTm9kZT4oXG4gICAgaHlkcmF0aW9uSW5mbzogTmdoRG9tSW5zdGFuY2UsIHRWaWV3OiBUVmlldywgbFZpZXc6IExWaWV3PHVua25vd24+LCB0Tm9kZTogVE5vZGUpOiBUfG51bGwge1xuICBsZXQgbmF0aXZlOiBSTm9kZXxudWxsID0gbnVsbDtcbiAgY29uc3QgYWRqdXN0ZWRJbmRleCA9IHROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgY29uc3Qgbm9kZXMgPSBoeWRyYXRpb25JbmZvLmRhdGFbTk9ERVNdO1xuICBjb25zdCBjb250YWluZXJzID0gaHlkcmF0aW9uSW5mby5kYXRhW0NPTlRBSU5FUlNdO1xuICBpZiAobm9kZXM/LlthZGp1c3RlZEluZGV4XSkge1xuICAgIC8vIFdlIGtub3cgZXhhY3QgbG9jYXRpb24gb2YgdGhlIG5vZGUuXG4gICAgbmF0aXZlID0gbG9jYXRlUk5vZGVCeVBhdGgobm9kZXNbYWRqdXN0ZWRJbmRleF0sIGxWaWV3KTtcbiAgfSBlbHNlIGlmICh0Vmlldy5maXJzdENoaWxkID09PSB0Tm9kZSkge1xuICAgIC8vIFdlIGNyZWF0ZSBhIGZpcnN0IG5vZGUgaW4gdGhpcyB2aWV3LlxuICAgIG5hdGl2ZSA9IGh5ZHJhdGlvbkluZm8uZmlyc3RDaGlsZCBhcyBSTm9kZTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMb2NhdGUgYSBub2RlIGJhc2VkIG9uIGEgcHJldmlvdXMgc2libGluZyBvciBhIHBhcmVudCBub2RlLlxuICAgIGNvbnN0IHByZXZpb3VzVE5vZGVQYXJlbnQgPSB0Tm9kZS5wcmV2ID09PSBudWxsO1xuICAgIGNvbnN0IHByZXZpb3VzVE5vZGUgPSB0Tm9kZS5wcmV2ID8/IHROb2RlLnBhcmVudDtcbiAgICBuZ0Rldk1vZGUgJiZcbiAgICAgICAgYXNzZXJ0RGVmaW5lZChcbiAgICAgICAgICAgIHByZXZpb3VzVE5vZGUsXG4gICAgICAgICAgICAnVW5leHBlY3RlZCBzdGF0ZTogY3VycmVudCBUTm9kZSBkb2VzIG5vdCBoYXZlIGEgY29ubmVjdGlvbiAnICtcbiAgICAgICAgICAgICAgICAndG8gdGhlIHByZXZpb3VzIG5vZGUgb3IgYSBwYXJlbnQgbm9kZS4nKTtcbiAgICBjb25zdCBwcmV2aW91c1ROb2RlSW5kZXggPSBwcmV2aW91c1ROb2RlIS5pbmRleCAtIEhFQURFUl9PRkZTRVQ7XG4gICAgbGV0IHByZXZpb3VzUkVsZW1lbnQgPSBnZXROYXRpdmVCeVROb2RlKHByZXZpb3VzVE5vZGUhLCBsVmlldykgYXMgUkVsZW1lbnQ7XG4gICAgaWYgKHByZXZpb3VzVE5vZGVQYXJlbnQgJiYgcHJldmlvdXNUTm9kZSEudHlwZSA9PT0gVE5vZGVUeXBlLkVsZW1lbnRDb250YWluZXIpIHtcbiAgICAgIC8vIFByZXZpb3VzIG5vZGUgd2FzIGFuIGA8bmctY29udGFpbmVyPmAsIHNvIHRoaXMgbm9kZSBpcyBhIGZpcnN0IGNoaWxkXG4gICAgICAvLyB3aXRoaW4gYW4gZWxlbWVudCBjb250YWluZXIsIHNvIHdlIGNhbiBsb2NhdGUgdGhlIGNvbnRhaW5lciBpbiBuZ2ggZGF0YVxuICAgICAgLy8gc3RydWN0dXJlIGFuZCB1c2UgaXRzIGZpcnN0IGNoaWxkLlxuICAgICAgY29uc3QgZWxlbWVudENvbnRhaW5lciA9IGh5ZHJhdGlvbkluZm8uZWxlbWVudENvbnRhaW5lcnM/LltwcmV2aW91c1ROb2RlSW5kZXhdO1xuICAgICAgbmdEZXZNb2RlICYmXG4gICAgICAgICAgYXNzZXJ0RGVmaW5lZChcbiAgICAgICAgICAgICAgZWxlbWVudENvbnRhaW5lcixcbiAgICAgICAgICAgICAgJ1VuZXhwZWN0ZWQgc3RhdGU6IGN1cnJlbnQgVE5vZGUgaXMgYSBjb250YWluZXIsIGJ1dCBpdCBkb2VzIG5vdCBoYXZlICcgK1xuICAgICAgICAgICAgICAgICAgJ2FuIGFzc29jaWF0ZWQgaHlkcmF0aW9uIGluZm8uJyk7XG4gICAgICBuYXRpdmUgPSBlbGVtZW50Q29udGFpbmVyIS5maXJzdENoaWxkITtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHByZXZpb3VzVE5vZGVQYXJlbnQpIHtcbiAgICAgICAgbmF0aXZlID0gKHByZXZpb3VzUkVsZW1lbnQgYXMgYW55KS5maXJzdENoaWxkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcHJldmlvdXNOb2RlSHlkcmF0aW9uSW5mbyA9IGNvbnRhaW5lcnM/LltwcmV2aW91c1ROb2RlSW5kZXhdO1xuICAgICAgICBpZiAocHJldmlvdXNUTm9kZSEudHlwZSA9PT0gVE5vZGVUeXBlLkVsZW1lbnQgJiYgcHJldmlvdXNOb2RlSHlkcmF0aW9uSW5mbykge1xuICAgICAgICAgIC8vIElmIHRoZSBwcmV2aW91cyBub2RlIGlzIGFuIGVsZW1lbnQsIGJ1dCBpdCBhbHNvIGhhcyBjb250YWluZXIgaW5mbyxcbiAgICAgICAgICAvLyB0aGlzIG1lYW5zIHRoYXQgd2UgYXJlIHByb2Nlc3NpbmcgYSBub2RlIGxpa2UgYDxkaXYgI3ZjclRhcmdldD5gLCB3aGljaCBpc1xuICAgICAgICAgIC8vIHJlcHJlc2VudGVkIGluIGxpdmUgRE9NIGFzIGA8ZGl2PjwvZGl2Pi4uLjwhLS1jb250YWluZXItLT5gLlxuICAgICAgICAgIC8vIEluIHRoaXMgY2FzZSwgdGhlcmUgYXJlIG5vZGVzICphZnRlciogdGhpcyBlbGVtZW50IGFuZCB3ZSBuZWVkIHRvIHNraXAgdGhvc2UuXG4gICAgICAgICAgY29uc3Qgdmlld3MgPSBwcmV2aW91c05vZGVIeWRyYXRpb25JbmZvIVtWSUVXU107XG4gICAgICAgICAgY29uc3QgbnVtUm9vdE5vZGVzVG9Ta2lwID0gdmlld3MgPyBjYWxjVmlld0NvbnRhaW5lclNpemUodmlld3MpIDogMDtcbiAgICAgICAgICAvLyBgKzFgIHN0YW5kcyBmb3IgYW4gYW5jaG9yIGNvbW1lbnQgbm9kZSBhZnRlciBhbGwgdGhlIHZpZXdzIGluIHRoaXMgY29udGFpbmVyLlxuICAgICAgICAgIGNvbnN0IG5vZGVzVG9Ta2lwID0gbnVtUm9vdE5vZGVzVG9Ta2lwICsgMTtcbiAgICAgICAgICBwcmV2aW91c1JFbGVtZW50ID0gc2libGluZ0FmdGVyKG5vZGVzVG9Ta2lwLCBwcmV2aW91c1JFbGVtZW50KSE7XG4gICAgICAgIH1cbiAgICAgICAgbmF0aXZlID0gcHJldmlvdXNSRWxlbWVudC5uZXh0U2libGluZyBhcyBSRWxlbWVudDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5hdGl2ZSBhcyBUO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2libGluZ0FmdGVyPFQgZXh0ZW5kcyBSTm9kZT4oc2tpcDogbnVtYmVyLCBmcm9tOiBSTm9kZSk6IFR8bnVsbCB7XG4gIGxldCBjdXJyZW50Tm9kZSA9IGZyb207XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2tpcDsgaSsrKSB7XG4gICAgbmdEZXZNb2RlICYmIHZhbGlkYXRlU2libGluZ05vZGVFeGlzdHMoY3VycmVudE5vZGUgYXMgTm9kZSk7XG4gICAgY3VycmVudE5vZGUgPSBjdXJyZW50Tm9kZS5uZXh0U2libGluZyE7XG4gIH1cbiAgcmV0dXJuIGN1cnJlbnROb2RlIGFzIFQ7XG59XG4iXX0=