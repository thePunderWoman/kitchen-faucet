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
export const REFERENCE_NODE_HOST = 'h';
export const REFERENCE_NODE_BODY = 'b';
export var NodeNavigationStep;
(function (NodeNavigationStep) {
    NodeNavigationStep["FirstChild"] = "f";
    NodeNavigationStep["NextSibling"] = "n";
})(NodeNavigationStep || (NodeNavigationStep = {}));
export class NoPathFoundError extends Error {
}
function describeNode(node) {
    // TODO: if it's a text node - output `#text(CONTENT)`,
    // if it's a comment node - output `#comment(CONTENT)`.
    return node.tagName ?? node.nodeType;
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
        const startNodeInfo = describeNode(start);
        const finishNodeInfo = describeNode(finish);
        throw new NoPathFoundError(`Ran off the top of the document when navigating between nodes: ` +
            `'${startNodeInfo}' and '${finishNodeInfo}'.`);
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
    if (node === null) {
        // throw new Error(`Is finish before start? Hit end of siblings before finding start`);
        console.log(`Is finish before start? Hit end of siblings before finding start`);
        return [];
    }
    return nav;
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
        if (!node) {
            // TODO: add a dev-mode assertion here.
            throw new Error(`findExistingNode: failed to find node at ${path}.`);
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
    if (!node) {
        // TODO: add a dev-mode assertion here.
        throw new Error(`findExistingNode: failed to find node at ${path}.`);
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
export function locateNextRNode(hydrationInfo, tView, lView, tNode, previousTNode, previousTNodeParent) {
    let native = null;
    const adjustedIndex = tNode.index - HEADER_OFFSET;
    if (hydrationInfo[NODES]?.[adjustedIndex]) {
        // We know exact location of the node.
        native = locateRNodeByPath(hydrationInfo[NODES][adjustedIndex], lView);
    }
    else if (tView.firstChild === tNode) {
        // We create a first node in this view.
        native = hydrationInfo.firstChild;
    }
    else {
        ngDevMode && assertDefined(previousTNode, 'Unexpected state: no current TNode found.');
        let previousRElement = getNativeByTNode(previousTNode, lView);
        // TODO: we may want to use this instead?
        // const closest = getClosestRElement(tView, previousTNode, lView);
        if (previousTNodeParent && previousTNode.type === 8 /* TNodeType.ElementContainer */) {
            // Previous node was an `<ng-container>`, so this node is a first child
            // within an element container, so we can locate the container in ngh data
            // structure and use its first child.
            const nghContainer = hydrationInfo[CONTAINERS]?.[previousTNode.index - HEADER_OFFSET];
            if (ngDevMode && !nghContainer) {
                // TODO: add better error message.
                throw new Error('Invalid state.');
            }
            native = nghContainer.firstChild;
        }
        else {
            // FIXME: this doesn't work for i18n :(
            // In i18n case, previous tNode is a parent element,
            // when in fact, it might be a text node in front of it.
            if (previousTNodeParent) {
                native = previousRElement.firstChild;
            }
            else {
                const previousNodeHydrationInfo = hydrationInfo[CONTAINERS]?.[previousTNode.index - HEADER_OFFSET];
                if (previousTNode.type === 2 /* TNodeType.Element */ && previousNodeHydrationInfo) {
                    // If the previous node is an element, but it also has container info,
                    // this means that we are processing a node like `<div #vcrTarget>`, which is
                    // represented in live DOM as `<div></div>...<!--container-->`.
                    // In this case, there are nodes *after* this element and we need to skip those.
                    // `+1` stands for an anchor comment node after all the views in this container.
                    const nodesToSkip = calcViewContainerSize(previousNodeHydrationInfo[VIEWS]) + 1;
                    previousRElement = siblingAfter(nodesToSkip, previousRElement);
                    // TODO: add an assert that `previousRElement` is a comment node.
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
        currentNode = currentNode.nextSibling;
        ngDevMode && assertDefined(currentNode, 'Expected more siblings to be present');
    }
    return currentNode;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9sb29rdXBfdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vbm9kZV9sb29rdXBfdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFVBQVUsRUFBbUIsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUdsRyxPQUFPLEVBQUMsYUFBYSxFQUFlLE1BQU0sNEJBQTRCLENBQUM7QUFDdkUsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBQ3pELE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUMsTUFBTSw0QkFBNEIsQ0FBQztBQUN6RSxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFN0MsT0FBTyxFQUFDLG9CQUFvQixFQUFFLHNCQUFzQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRTNFLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQztBQUN2QyxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUM7QUFFdkMsTUFBTSxDQUFOLElBQVksa0JBR1g7QUFIRCxXQUFZLGtCQUFrQjtJQUM1QixzQ0FBZ0IsQ0FBQTtJQUNoQix1Q0FBaUIsQ0FBQTtBQUNuQixDQUFDLEVBSFcsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUc3QjtBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxLQUFLO0NBQUc7QUFFOUMsU0FBUyxZQUFZLENBQUMsSUFBVTtJQUM5Qix1REFBdUQ7SUFDdkQsdURBQXVEO0lBQ3ZELE9BQVEsSUFBZ0IsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQztBQUNwRCxDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBQyxLQUFXLEVB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YUFBYSxDQUFDLENBQUM7Z0JBQ3RFLElBQUksYUFBYyxDQUFDLElBQUksOEJBQXNCLElBQUkseUJBQXlCLEVBQUU7b0JBQzFFLHNFQUFzRTtvQkFDdEUsNkVBQTZFO29CQUM3RSwrREFBK0Q7b0JBQy9ELGdGQUFnRjtvQkFDaEYsZ0ZBQWdGO29CQUNoRixNQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyx5QkFBMEIsQ0FBQyxLQUFLLENBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDbEYsZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBRSxDQUFDO29CQUNoRSxpRUFBaUU7aUJBQ2xFO2dCQUNELE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxXQUF1QixDQUFDO2FBQ25EO1NBQ0Y7S0FDRjtJQUNELE9BQU8sTUFBVyxDQUFDO0FBQ3JCLENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFrQixJQUFZLEVBQUUsSUFBVztJQUNyRSxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUM7SUFDdkIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM3QixXQUFXLEdBQUcsV0FBVyxDQUFDLFdBQVksQ0FBQztRQUN2QyxTQUFTLElBQUksYUFBYSxDQUFDLFdBQVcsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDO0tBQ2pGO0lBQ0QsT0FBTyxXQUFnQixDQUFDO0FBQzFCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDT05UQUlORVJTLCBOZ2hEb20sIE5naFZpZXcsIE5PREVTLCBOVU1fUk9PVF9OT0RFUywgVklFV1N9IGZyb20gJy4uL2h5ZHJhdGlvbi9pbnRlcmZhY2VzJztcbmltcG9ydCB7VE5vZGUsIFROb2RlVHlwZX0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL25vZGUnO1xuaW1wb3J0IHtSRWxlbWVudCwgUk5vZGV9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9yZW5kZXJlcl9kb20nO1xuaW1wb3J0IHtIRUFERVJfT0ZGU0VULCBMVmlldywgVFZpZXd9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy92aWV3JztcbmltcG9ydCB7ybXJtXJlc29sdmVCb2R5fSBmcm9tICcuLi9yZW5kZXIzL3V0aWwvbWlzY191dGlscyc7XG5pbXBvcnQge2dldE5hdGl2ZUJ5VE5vZGUsIHVud3JhcFJOb2RlfSBmcm9tICcuLi9yZW5kZXIzL3V0aWwvdmlld191dGlscyc7XG5pbXBvcnQge2Fzc2VydERlZmluZWR9IGZyb20gJy4uL3V0aWwvYXNzZXJ0JztcblxuaW1wb3J0IHtjb21wcmVzc05vZGVMb2NhdGlvbiwgZGVjb21wcmVzc05vZGVMb2NhdGlvbn0gZnJvbSAnLi9jb21wcmVzc2lvbic7XG5cbmV4cG9ydCBjb25zdCBSRUZFUkVOQ0VfTk9ERV9IT1NUID0gJ2gnO1xuZXhwb3J0IGNvbnN0IFJFRkVSRU5DRV9OT0RFX0JPRFkgPSAnYic7XG5cbmV4cG9ydCBlbnVtIE5vZGVOYXZpZ2F0aW9uU3RlcCB7XG4gIEZpcnN0Q2hpbGQgPSAnZicsXG4gIE5leHRTaWJsaW5nID0gJ24nLFxufVxuXG5leHBvcnQgY2xhc3MgTm9QYXRoRm91bmRFcnJvciBleHRlbmRzIEVycm9yIHt9XG5cbmZ1bmN0aW9uIGRlc2NyaWJlTm9kZShub2RlOiBOb2RlKTogc3RyaW5nIHtcbiAgLy8gVE9ETzogaWYgaXQncyBhIHRleHQgbm9kZSAtIG91dHB1dCBgI3RleHQoQ09OVEVOVClgLFxuICAvLyBpZiBpdCdzIGEgY29tbWVudCBub2RlIC0gb3V0cHV0IGAjY29tbWVudChDT05URU5UKWAuXG4gIHJldHVybiAobm9kZSBhcyBFbGVtZW50KS50YWdOYW1lID8/IG5vZGUubm9kZVR5cGU7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYSBsaXN0IG9mIERPTSBuYXZpZ2F0aW9uIG9wZXJhdGlvbnMgdG8gZ2V0IGZyb20gbm9kZSBgc3RhcnRgIHRvIG5vZGUgYGZpbmlzaGAuXG4gKlxuICogTm90ZTogYXNzdW1lcyB0aGF0IG5vZGUgYHN0YXJ0YCBvY2N1cnMgYmVmb3JlIG5vZGUgYGZpbmlzaGAgaW4gYW4gaW4tb3JkZXIgdHJhdmVyc2FsIG9mIHRoZSBET01cbiAqIHRyZWUuIFRoYXQgaXMsIHdlIHNob3VsZCBiZSBhYmxlIHRvIGdldCBmcm9tIGBzdGFydGAgdG8gYGZpbmlzaGAgcHVyZWx5IGJ5IHVzaW5nIGAuZmlyc3RDaGlsZGBcbiAqIGFuZCBgLm5leHRTaWJsaW5nYCBvcGVyYXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbmF2aWdhdGVCZXR3ZWVuKHN0YXJ0OiBOb2RlLCBmaW5pc2g6IE5vZGUpOiBOb2RlTmF2aWdhdGlvblN0ZXBbXSB7XG4gIGlmIChzdGFydCA9PT0gZmluaXNoKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9IGVsc2UgaWYgKHN0YXJ0LnBhcmVudEVsZW1lbnQgPT0gbnVsbCB8fCBmaW5pc2gucGFyZW50RWxlbWVudCA9PSBudWxsKSB7XG4gICAgY29uc3Qgc3RhcnROb2RlSW5mbyA9IGRlc2NyaWJlTm9kZShzdGFydCk7XG4gICAgY29uc3QgZmluaXNoTm9kZUluZm8gPSBkZXNjcmliZU5vZGUoZmluaXNoKTtcbiAgICB0aHJvdyBuZXcgTm9QYXRoRm91bmRFcnJvcihcbiAgICAgICAgYFJhbiBvZmYgdGhlIHRvcCBvZiB0aGUgZG9jdW1lbnQgd2hlbiBuYXZpZ2F0aW5nIGJldHdlZW4gbm9kZXM6IGAgK1xuICAgICAgICBgJyR7c3RhcnROb2RlSW5mb30nIGFuZCAnJHtmaW5pc2hOb2RlSW5mb30nLmApO1xuICB9IGVsc2UgaWYgKHN0YXJ0LnBhcmVudEVsZW1lbnQgPT09IGZpbmlzaC5wYXJlbnRFbGVtZW50KSB7XG4gICAgcmV0dXJuIG5hdmlnYXRlQmV0d2VlblNpYmxpbmdzKHN0YXJ0LCBmaW5pc2gpO1xuICB9IGVsc2Uge1xuICAgIC8vIGBmaW5pc2hgIGlzIGEgY2hpbGQgb2YgaXRzIHBhcmVudCwgc28gdGhlIHBhcmVudCB3aWxsIGFsd2F5cyBoYXZlIGEgY2hpbGQuXG4gICAgY29uc3QgcGFyZW50ID0gZmluaXNoLnBhcmVudEVsZW1lbnQhO1xuICAgIHJldHVybiBbXG4gICAgICAvLyBGaXJzdCBuYXZpZ2F0ZSB0byBgZmluaXNoYCdzIHBhcmVudC5cbiAgICAgIC4uLm5hdmlnYXRlQmV0d2VlbihzdGFydCwgcGFyZW50KSxcbiAgICAgIC8vIFRoZW4gdG8gaXRzIGZpcnN0IGNoaWxkLlxuICAgICAgTm9kZU5hdmlnYXRpb25TdGVwLkZpcnN0Q2hpbGQsXG4gICAgICAvLyBBbmQgZmluYWxseSBmcm9tIHRoYXQgbm9kZSB0byBgZmluaXNoYCAobWF5YmUgYSBuby1vcCBpZiB3ZSdyZSBhbHJlYWR5IHRoZXJlKS5cbiAgICAgIC4uLm5hdmlnYXRlQmV0d2VlbihwYXJlbnQuZmlyc3RDaGlsZCEsIGZpbmlzaCksXG4gICAgXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBuYXZpZ2F0ZUJldHdlZW5TaWJsaW5ncyhzdGFydDogTm9kZSwgZmluaXNoOiBOb2RlKTogTm9kZU5hdmlnYXRpb25TdGVwW10ge1xuICBjb25zdCBuYXY6IE5vZGVOYXZpZ2F0aW9uU3RlcFtdID0gW107XG4gIGxldCBub2RlOiBOb2RlfG51bGwgPSBudWxsO1xuICBmb3IgKG5vZGUgPSBzdGFydDsgbm9kZSAhPSBudWxsICYmIG5vZGUgIT09IGZpbmlzaDsgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmcpIHtcbiAgICBuYXYucHVzaChOb2RlTmF2aWdhdGlvblN0ZXAuTmV4dFNpYmxpbmcpO1xuICB9XG4gIGlmIChub2RlID09PSBudWxsKSB7XG4gICAgLy8gdGhyb3cgbmV3IEVycm9yKGBJcyBmaW5pc2ggYmVmb3JlIHN0YXJ0PyBIaXQgZW5kIG9mIHNpYmxpbmdzIGJlZm9yZSBmaW5kaW5nIHN0YXJ0YCk7XG4gICAgY29uc29sZS5sb2coYElzIGZpbmlzaCBiZWZvcmUgc3RhcnQ/IEhpdCBlbmQgb2Ygc2libGluZ3MgYmVmb3JlIGZpbmRpbmcgc3RhcnRgKTtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgcmV0dXJuIG5hdjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNQYXRoQmV0d2Vlbihmcm9tOiBOb2RlLCB0bzogTm9kZSwgcGFyZW50OiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gIGxldCBwYXRoOiBOb2RlTmF2aWdhdGlvblN0ZXBbXSA9IFtdO1xuICB0cnkge1xuICAgIHBhdGggPSBuYXZpZ2F0ZUJldHdlZW4oZnJvbSwgdG8pO1xuICB9IGNhdGNoIChlOiB1bmtub3duKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBOb1BhdGhGb3VuZEVycm9yKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvbXByZXNzTm9kZUxvY2F0aW9uKHBhcmVudCwgcGF0aCk7XG59XG5cbmZ1bmN0aW9uIGZpbmRFeGlzdGluZ05vZGUoaG9zdDogTm9kZSwgcGF0aDogTm9kZU5hdmlnYXRpb25TdGVwW10pOiBSTm9kZSB7XG4gIGxldCBub2RlID0gaG9zdDtcbiAgZm9yIChjb25zdCBvcCBvZiBwYXRoKSB7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICAvLyBUT0RPOiBhZGQgYSBkZXYtbW9kZSBhc3NlcnRpb24gaGVyZS5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgZmluZEV4aXN0aW5nTm9kZTogZmFpbGVkIHRvIGZpbmQgbm9kZSBhdCAke3BhdGh9LmApO1xuICAgIH1cbiAgICBzd2l0Y2ggKG9wKSB7XG4gICAgICBjYXNlIE5vZGVOYXZpZ2F0aW9uU3RlcC5GaXJzdENoaWxkOlxuICAgICAgICBub2RlID0gbm9kZS5maXJzdENoaWxkITtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIE5vZGVOYXZpZ2F0aW9uU3RlcC5OZXh0U2libGluZzpcbiAgICAgICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmchO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgaWYgKCFub2RlKSB7XG4gICAgLy8gVE9ETzogYWRkIGEgZGV2LW1vZGUgYXNzZXJ0aW9uIGhlcmUuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBmaW5kRXhpc3RpbmdOb2RlOiBmYWlsZWQgdG8gZmluZCBub2RlIGF0ICR7cGF0aH0uYCk7XG4gIH1cbiAgcmV0dXJuIG5vZGUgYXMgdW5rbm93biBhcyBSTm9kZTtcbn1cblxuZnVuY3Rpb24gbG9jYXRlUk5vZGVCeVBhdGgocGF0aDogc3RyaW5nLCBsVmlldzogTFZpZXcpOiBSTm9kZSB7XG4gIGNvbnN0IFtyZWZlcmVuY2VOb2RlLCAuLi5wYXRoUGFydHNdID0gZGVjb21wcmVzc05vZGVMb2NhdGlvbihwYXRoKTtcbiAgbGV0IHJlZjogRWxlbWVudDtcbiAgaWYgKHJlZmVyZW5jZU5vZGUgPT09IFJFRkVSRU5DRV9OT0RFX0hPU1QpIHtcbiAgICByZWYgPSBsVmlld1swXSBhcyB1bmtub3duIGFzIEVsZW1lbnQ7XG4gIH0gZWxzZSBpZiAocmVmZXJlbmNlTm9kZSA9PT0gUkVGRVJFTkNFX05PREVfQk9EWSkge1xuICAgIHJlZiA9IMm1ybVyZXNvbHZlQm9keShsVmlld1swXSBhcyB1bmtub3duIGFzIFJFbGVtZW50ICYge293bmVyRG9jdW1lbnQ6IERvY3VtZW50fSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcGFyZW50RWxlbWVudElkID0gTnVtYmVyKHJlZmVyZW5jZU5vZGUpO1xuICAgIHJlZiA9IHVud3JhcFJOb2RlKChsVmlldyBhcyBhbnkpW3BhcmVudEVsZW1lbnRJZCArIEhFQURFUl9PRkZTRVRdKSBhcyBFbGVtZW50O1xuICB9XG4gIHJldHVybiBmaW5kRXhpc3RpbmdOb2RlKHJlZiwgcGF0aFBhcnRzKTtcbn1cblxuZnVuY3Rpb24gY2FsY1ZpZXdDb250YWluZXJTaXplKHZpZXdzOiBOZ2hWaWV3W10pOiBudW1iZXIge1xuICBsZXQgbnVtTm9kZXMgPSAwO1xuICBmb3IgKGxldCB2aWV3IG9mIHZpZXdzKSB7XG4gICAgbnVtTm9kZXMgKz0gdmlld1tOVU1fUk9PVF9OT0RFU107XG4gIH1cbiAgcmV0dXJuIG51bU5vZGVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRlTmV4dFJOb2RlPFQgZXh0ZW5kcyBSTm9kZT4oXG4gICAgaHlkcmF0aW9uSW5mbzogTmdoRG9tLCB0VmlldzogVFZpZXcsIGxWaWV3OiBMVmlldzx1bmtub3duPiwgdE5vZGU6IFROb2RlLFxuICAgIHByZXZpb3VzVE5vZGU6IFROb2RlfG51bGwsIHByZXZpb3VzVE5vZGVQYXJlbnQ6IGJvb2xlYW4pOiBUfG51bGwge1xuICBsZXQgbmF0aXZlOiBSTm9kZXxudWxsID0gbnVsbDtcbiAgY29uc3QgYWRqdXN0ZWRJbmRleCA9IHROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgaWYgKGh5ZHJhdGlvbkluZm9bTk9ERVNdPy5bYWRqdXN0ZWRJbmRleF0pIHtcbiAgICAvLyBXZSBrbm93IGV4YWN0IGxvY2F0aW9uIG9mIHRoZSBub2RlLlxuICAgIG5hdGl2ZSA9IGxvY2F0ZVJOb2RlQnlQYXRoKGh5ZHJhdGlvbkluZm9bTk9ERVNdW2FkanVzdGVkSW5kZXhdLCBsVmlldyk7XG4gIH0gZWxzZSBpZiAodFZpZXcuZmlyc3RDaGlsZCA9PT0gdE5vZGUpIHtcbiAgICAvLyBXZSBjcmVhdGUgYSBmaXJzdCBub2RlIGluIHRoaXMgdmlldy5cbiAgICBuYXRpdmUgPSBoeWRyYXRpb25JbmZvLmZpcnN0Q2hpbGQgYXMgUk5vZGU7XG4gIH0gZWxzZSB7XG4gICAgbmdEZXZNb2RlICYmIGFzc2VydERlZmluZWQocHJldmlvdXNUTm9kZSwgJ1VuZXhwZWN0ZWQgc3RhdGU6IG5vIGN1cnJlbnQgVE5vZGUgZm91bmQuJyk7XG4gICAgbGV0IHByZXZpb3VzUkVsZW1lbnQgPSBnZXROYXRpdmVCeVROb2RlKHByZXZpb3VzVE5vZGUhLCBsVmlldykgYXMgUkVsZW1lbnQ7XG4gICAgLy8gVE9ETzogd2UgbWF5IHdhbnQgdG8gdXNlIHRoaXMgaW5zdGVhZD9cbiAgICAvLyBjb25zdCBjbG9zZXN0ID0gZ2V0Q2xvc2VzdFJFbGVtZW50KHRWaWV3LCBwcmV2aW91c1ROb2RlLCBsVmlldyk7XG4gICAgaWYgKHByZXZpb3VzVE5vZGVQYXJlbnQgJiYgcHJldmlvdXNUTm9kZSEudHlwZSA9PT0gVE5vZGVUeXBlLkVsZW1lbnRDb250YWluZXIpIHtcbiAgICAgIC8vIFByZXZpb3VzIG5vZGUgd2FzIGFuIGA8bmctY29udGFpbmVyPmAsIHNvIHRoaXMgbm9kZSBpcyBhIGZpcnN0IGNoaWxkXG4gICAgICAvLyB3aXRoaW4gYW4gZWxlbWVudCBjb250YWluZXIsIHNvIHdlIGNhbiBsb2NhdGUgdGhlIGNvbnRhaW5lciBpbiBuZ2ggZGF0YVxuICAgICAgLy8gc3RydWN0dXJlIGFuZCB1c2UgaXRzIGZpcnN0IGNoaWxkLlxuICAgICAgY29uc3QgbmdoQ29udGFpbmVyID0gaHlkcmF0aW9uSW5mb1tDT05UQUlORVJTXT8uW3ByZXZpb3VzVE5vZGUhLmluZGV4IC0gSEVBREVSX09GRlNFVF07XG4gICAgICBpZiAobmdEZXZNb2RlICYmICFuZ2hDb250YWluZXIpIHtcbiAgICAgICAgLy8gVE9ETzogYWRkIGJldHRlciBlcnJvciBtZXNzYWdlLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RhdGUuJyk7XG4gICAgICB9XG4gICAgICBuYXRpdmUgPSBuZ2hDb250YWluZXIhLmZpcnN0Q2hpbGQhO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGSVhNRTogdGhpcyBkb2Vzbid0IHdvcmsgZm9yIGkxOG4gOihcbiAgICAgIC8vIEluIGkxOG4gY2FzZSwgcHJldmlvdXMgdE5vZGUgaXMgYSBwYXJlbnQgZWxlbWVudCxcbiAgICAgIC8vIHdoZW4gaW4gZmFjdCwgaXQgbWlnaHQgYmUgYSB0ZXh0IG5vZGUgaW4gZnJvbnQgb2YgaXQuXG4gICAgICBpZiAocHJldmlvdXNUTm9kZVBhcmVudCkge1xuICAgICAgICBuYXRpdmUgPSAocHJldmlvdXNSRWxlbWVudCBhcyBhbnkpLmZpcnN0Q2hpbGQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwcmV2aW91c05vZGVIeWRyYXRpb25JbmZvID1cbiAgICAgICAgICAgIGh5ZHJhdGlvbkluZm9bQ09OVEFJTkVSU10/LltwcmV2aW91c1ROb2RlIS5pbmRleCAtIEhFQURFUl9PRkZTRVRdO1xuICAgICAgICBpZiAocHJldmlvdXNUTm9kZSEudHlwZSA9PT0gVE5vZGVUeXBlLkVsZW1lbnQgJiYgcHJldmlvdXNOb2RlSHlkcmF0aW9uSW5mbykge1xuICAgICAgICAgIC8vIElmIHRoZSBwcmV2aW91cyBub2RlIGlzIGFuIGVsZW1lbnQsIGJ1dCBpdCBhbHNvIGhhcyBjb250YWluZXIgaW5mbyxcbiAgICAgICAgICAvLyB0aGlzIG1lYW5zIHRoYXQgd2UgYXJlIHByb2Nlc3NpbmcgYSBub2RlIGxpa2UgYDxkaXYgI3ZjclRhcmdldD5gLCB3aGljaCBpc1xuICAgICAgICAgIC8vIHJlcHJlc2VudGVkIGluIGxpdmUgRE9NIGFzIGA8ZGl2PjwvZGl2Pi4uLjwhLS1jb250YWluZXItLT5gLlxuICAgICAgICAgIC8vIEluIHRoaXMgY2FzZSwgdGhlcmUgYXJlIG5vZGVzICphZnRlciogdGhpcyBlbGVtZW50IGFuZCB3ZSBuZWVkIHRvIHNraXAgdGhvc2UuXG4gICAgICAgICAgLy8gYCsxYCBzdGFuZHMgZm9yIGFuIGFuY2hvciBjb21tZW50IG5vZGUgYWZ0ZXIgYWxsIHRoZSB2aWV3cyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgICAgICAgICBjb25zdCBub2Rlc1RvU2tpcCA9IGNhbGNWaWV3Q29udGFpbmVyU2l6ZShwcmV2aW91c05vZGVIeWRyYXRpb25JbmZvIVtWSUVXU10hKSArIDE7XG4gICAgICAgICAgcHJldmlvdXNSRWxlbWVudCA9IHNpYmxpbmdBZnRlcihub2Rlc1RvU2tpcCwgcHJldmlvdXNSRWxlbWVudCkhO1xuICAgICAgICAgIC8vIFRPRE86IGFkZCBhbiBhc3NlcnQgdGhhdCBgcHJldmlvdXNSRWxlbWVudGAgaXMgYSBjb21tZW50IG5vZGUuXG4gICAgICAgIH1cbiAgICAgICAgbmF0aXZlID0gcHJldmlvdXNSRWxlbWVudC5uZXh0U2libGluZyBhcyBSRWxlbWVudDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5hdGl2ZSBhcyBUO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2libGluZ0FmdGVyPFQgZXh0ZW5kcyBSTm9kZT4oc2tpcDogbnVtYmVyLCBmcm9tOiBSTm9kZSk6IFR8bnVsbCB7XG4gIGxldCBjdXJyZW50Tm9kZSA9IGZyb207XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2tpcDsgaSsrKSB7XG4gICAgY3VycmVudE5vZGUgPSBjdXJyZW50Tm9kZS5uZXh0U2libGluZyE7XG4gICAgbmdEZXZNb2RlICYmIGFzc2VydERlZmluZWQoY3VycmVudE5vZGUsICdFeHBlY3RlZCBtb3JlIHNpYmxpbmdzIHRvIGJlIHByZXNlbnQnKTtcbiAgfVxuICByZXR1cm4gY3VycmVudE5vZGUgYXMgVDtcbn1cbiJdfQ==