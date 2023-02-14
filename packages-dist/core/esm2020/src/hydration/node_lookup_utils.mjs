/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CONTAINERS, NODES, NUM_ROOT_NODES, VIEWS } from '../hydration/interfaces';
import { assertRComment } from '../render3/assert';
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
                    const views = previousNodeHydrationInfo[VIEWS];
                    const numRootNodesToSkip = views ? calcViewContainerSize(views) : 0;
                    // `+1` stands for an anchor comment node after all the views in this container.
                    const nodesToSkip = numRootNodesToSkip + 1;
                    previousRElement = siblingAfter(nodesToSkip, previousRElement);
                    ngDevMode && assertRComment(previousRElement);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9sb29rdXBfdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vbm9kZV9sb29rdXBfdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFVBQVUsRUFBbUIsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUNsRyxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFHakQsT0FBTyxFQUFDLGFBQWEsRUFBZSxNQUFNLDRCQUE0QixDQUFDO0FBQ3ZFLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSw0QkFBNEIsQ0FBQztBQUN6RCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsV0FBVyxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFDekUsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRTdDLE9BQU8sRUFBQyxvQkFBb0IsRUFBRSxzQkFBc0IsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUUzRSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUM7QUFDdkMsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDO0FBRXZDLE1BQU0sQ0FBTixJQUFZLGtCQUdYO0FBSEQsV0FBWSxrQkFBa0I7SUFDNUIsc0NBQWdCLENBQUE7SUFDaEIsdUNBQWlCLENBQUE7QUFDbkIsQ0FBQyxFQUhXLGtCQUFrQixLQUFsQixrQkFBa0IsUUFHN0I7QUFFRCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsS0FBSztDQUFHO0FBRTlDLFNBQVMsWUFBWSxDQUFDLElBQVU7SUFDOUIsdURBQXVEO0lBQ3ZELHVEQUF1RDtJQUN2RCxPQUFRLElBQWdCLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUM7QUFDcEQsQ0FBQztBQUVE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QUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxhQUFjLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxDQUFDO2dCQUN0RSxJQUFJLGFBQWMsQ0FBQyxJQUFJLDhCQUFzQixJQUFJLHlCQUF5QixFQUFFO29CQUMxRSxzRUFBc0U7b0JBQ3RFLDZFQUE2RTtvQkFDN0UsK0RBQStEO29CQUMvRCxnRkFBZ0Y7b0JBQ2hGLE1BQU0sS0FBSyxHQUFHLHlCQUEwQixDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNoRCxNQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEUsZ0ZBQWdGO29CQUNoRixNQUFNLFdBQVcsR0FBRyxrQkFBa0IsR0FBRyxDQUFDLENBQUM7b0JBQzNDLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLENBQUUsQ0FBQztvQkFFaEUsU0FBUyxJQUFJLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2lCQUMvQztnQkFDRCxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsV0FBdUIsQ0FBQzthQUNuRDtTQUNGO0tBQ0Y7SUFDRCxPQUFPLE1BQVcsQ0FBQztBQUNyQixDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBa0IsSUFBWSxFQUFFLElBQVc7SUFDckUsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDN0IsV0FBVyxHQUFHLFdBQVcsQ0FBQyxXQUFZLENBQUM7UUFDdkMsU0FBUyxJQUFJLGFBQWEsQ0FBQyxXQUFXLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztLQUNqRjtJQUNELE9BQU8sV0FBZ0IsQ0FBQztBQUMxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q09OVEFJTkVSUywgTmdoRG9tLCBOZ2hWaWV3LCBOT0RFUywgTlVNX1JPT1RfTk9ERVMsIFZJRVdTfSBmcm9tICcuLi9oeWRyYXRpb24vaW50ZXJmYWNlcyc7XG5pbXBvcnQge2Fzc2VydFJDb21tZW50fSBmcm9tICcuLi9yZW5kZXIzL2Fzc2VydCc7XG5pbXBvcnQge1ROb2RlLCBUTm9kZVR5cGV9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9ub2RlJztcbmltcG9ydCB7UkVsZW1lbnQsIFJOb2RlfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvcmVuZGVyZXJfZG9tJztcbmltcG9ydCB7SEVBREVSX09GRlNFVCwgTFZpZXcsIFRWaWV3fSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvdmlldyc7XG5pbXBvcnQge8m1ybVyZXNvbHZlQm9keX0gZnJvbSAnLi4vcmVuZGVyMy91dGlsL21pc2NfdXRpbHMnO1xuaW1wb3J0IHtnZXROYXRpdmVCeVROb2RlLCB1bndyYXBSTm9kZX0gZnJvbSAnLi4vcmVuZGVyMy91dGlsL3ZpZXdfdXRpbHMnO1xuaW1wb3J0IHthc3NlcnREZWZpbmVkfSBmcm9tICcuLi91dGlsL2Fzc2VydCc7XG5cbmltcG9ydCB7Y29tcHJlc3NOb2RlTG9jYXRpb24sIGRlY29tcHJlc3NOb2RlTG9jYXRpb259IGZyb20gJy4vY29tcHJlc3Npb24nO1xuXG5leHBvcnQgY29uc3QgUkVGRVJFTkNFX05PREVfSE9TVCA9ICdoJztcbmV4cG9ydCBjb25zdCBSRUZFUkVOQ0VfTk9ERV9CT0RZID0gJ2InO1xuXG5leHBvcnQgZW51bSBOb2RlTmF2aWdhdGlvblN0ZXAge1xuICBGaXJzdENoaWxkID0gJ2YnLFxuICBOZXh0U2libGluZyA9ICduJyxcbn1cblxuZXhwb3J0IGNsYXNzIE5vUGF0aEZvdW5kRXJyb3IgZXh0ZW5kcyBFcnJvciB7fVxuXG5mdW5jdGlvbiBkZXNjcmliZU5vZGUobm9kZTogTm9kZSk6IHN0cmluZyB7XG4gIC8vIFRPRE86IGlmIGl0J3MgYSB0ZXh0IG5vZGUgLSBvdXRwdXQgYCN0ZXh0KENPTlRFTlQpYCxcbiAgLy8gaWYgaXQncyBhIGNvbW1lbnQgbm9kZSAtIG91dHB1dCBgI2NvbW1lbnQoQ09OVEVOVClgLlxuICByZXR1cm4gKG5vZGUgYXMgRWxlbWVudCkudGFnTmFtZSA/PyBub2RlLm5vZGVUeXBlO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGEgbGlzdCBvZiBET00gbmF2aWdhdGlvbiBvcGVyYXRpb25zIHRvIGdldCBmcm9tIG5vZGUgYHN0YXJ0YCB0byBub2RlIGBmaW5pc2hgLlxuICpcbiAqIE5vdGU6IGFzc3VtZXMgdGhhdCBub2RlIGBzdGFydGAgb2NjdXJzIGJlZm9yZSBub2RlIGBmaW5pc2hgIGluIGFuIGluLW9yZGVyIHRyYXZlcnNhbCBvZiB0aGUgRE9NXG4gKiB0cmVlLiBUaGF0IGlzLCB3ZSBzaG91bGQgYmUgYWJsZSB0byBnZXQgZnJvbSBgc3RhcnRgIHRvIGBmaW5pc2hgIHB1cmVseSBieSB1c2luZyBgLmZpcnN0Q2hpbGRgXG4gKiBhbmQgYC5uZXh0U2libGluZ2Agb3BlcmF0aW9ucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5hdmlnYXRlQmV0d2VlbihzdGFydDogTm9kZSwgZmluaXNoOiBOb2RlKTogTm9kZU5hdmlnYXRpb25TdGVwW10ge1xuICBpZiAoc3RhcnQgPT09IGZpbmlzaCkge1xuICAgIHJldHVybiBbXTtcbiAgfSBlbHNlIGlmIChzdGFydC5wYXJlbnRFbGVtZW50ID09IG51bGwgfHwgZmluaXNoLnBhcmVudEVsZW1lbnQgPT0gbnVsbCkge1xuICAgIGNvbnN0IHN0YXJ0Tm9kZUluZm8gPSBkZXNjcmliZU5vZGUoc3RhcnQpO1xuICAgIGNvbnN0IGZpbmlzaE5vZGVJbmZvID0gZGVzY3JpYmVOb2RlKGZpbmlzaCk7XG4gICAgdGhyb3cgbmV3IE5vUGF0aEZvdW5kRXJyb3IoXG4gICAgICAgIGBSYW4gb2ZmIHRoZSB0b3Agb2YgdGhlIGRvY3VtZW50IHdoZW4gbmF2aWdhdGluZyBiZXR3ZWVuIG5vZGVzOiBgICtcbiAgICAgICAgYCcke3N0YXJ0Tm9kZUluZm99JyBhbmQgJyR7ZmluaXNoTm9kZUluZm99Jy5gKTtcbiAgfSBlbHNlIGlmIChzdGFydC5wYXJlbnRFbGVtZW50ID09PSBmaW5pc2gucGFyZW50RWxlbWVudCkge1xuICAgIHJldHVybiBuYXZpZ2F0ZUJldHdlZW5TaWJsaW5ncyhzdGFydCwgZmluaXNoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBgZmluaXNoYCBpcyBhIGNoaWxkIG9mIGl0cyBwYXJlbnQsIHNvIHRoZSBwYXJlbnQgd2lsbCBhbHdheXMgaGF2ZSBhIGNoaWxkLlxuICAgIGNvbnN0IHBhcmVudCA9IGZpbmlzaC5wYXJlbnRFbGVtZW50ITtcbiAgICByZXR1cm4gW1xuICAgICAgLy8gRmlyc3QgbmF2aWdhdGUgdG8gYGZpbmlzaGAncyBwYXJlbnQuXG4gICAgICAuLi5uYXZpZ2F0ZUJldHdlZW4oc3RhcnQsIHBhcmVudCksXG4gICAgICAvLyBUaGVuIHRvIGl0cyBmaXJzdCBjaGlsZC5cbiAgICAgIE5vZGVOYXZpZ2F0aW9uU3RlcC5GaXJzdENoaWxkLFxuICAgICAgLy8gQW5kIGZpbmFsbHkgZnJvbSB0aGF0IG5vZGUgdG8gYGZpbmlzaGAgKG1heWJlIGEgbm8tb3AgaWYgd2UncmUgYWxyZWFkeSB0aGVyZSkuXG4gICAgICAuLi5uYXZpZ2F0ZUJldHdlZW4ocGFyZW50LmZpcnN0Q2hpbGQhLCBmaW5pc2gpLFxuICAgIF07XG4gIH1cbn1cblxuZnVuY3Rpb24gbmF2aWdhdGVCZXR3ZWVuU2libGluZ3Moc3RhcnQ6IE5vZGUsIGZpbmlzaDogTm9kZSk6IE5vZGVOYXZpZ2F0aW9uU3RlcFtdIHtcbiAgY29uc3QgbmF2OiBOb2RlTmF2aWdhdGlvblN0ZXBbXSA9IFtdO1xuICBsZXQgbm9kZTogTm9kZXxudWxsID0gbnVsbDtcbiAgZm9yIChub2RlID0gc3RhcnQ7IG5vZGUgIT0gbnVsbCAmJiBub2RlICE9PSBmaW5pc2g7IG5vZGUgPSBub2RlLm5leHRTaWJsaW5nKSB7XG4gICAgbmF2LnB1c2goTm9kZU5hdmlnYXRpb25TdGVwLk5leHRTaWJsaW5nKTtcbiAgfVxuICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgIC8vIHRocm93IG5ldyBFcnJvcihgSXMgZmluaXNoIGJlZm9yZSBzdGFydD8gSGl0IGVuZCBvZiBzaWJsaW5ncyBiZWZvcmUgZmluZGluZyBzdGFydGApO1xuICAgIGNvbnNvbGUubG9nKGBJcyBmaW5pc2ggYmVmb3JlIHN0YXJ0PyBIaXQgZW5kIG9mIHNpYmxpbmdzIGJlZm9yZSBmaW5kaW5nIHN0YXJ0YCk7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHJldHVybiBuYXY7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjUGF0aEJldHdlZW4oZnJvbTogTm9kZSwgdG86IE5vZGUsIHBhcmVudDogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICBsZXQgcGF0aDogTm9kZU5hdmlnYXRpb25TdGVwW10gPSBbXTtcbiAgdHJ5IHtcbiAgICBwYXRoID0gbmF2aWdhdGVCZXR3ZWVuKGZyb20sIHRvKTtcbiAgfSBjYXRjaCAoZTogdW5rbm93bikge1xuICAgIGlmIChlIGluc3RhbmNlb2YgTm9QYXRoRm91bmRFcnJvcikge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb21wcmVzc05vZGVMb2NhdGlvbihwYXJlbnQsIHBhdGgpO1xufVxuXG5mdW5jdGlvbiBmaW5kRXhpc3RpbmdOb2RlKGhvc3Q6IE5vZGUsIHBhdGg6IE5vZGVOYXZpZ2F0aW9uU3RlcFtdKTogUk5vZGUge1xuICBsZXQgbm9kZSA9IGhvc3Q7XG4gIGZvciAoY29uc3Qgb3Agb2YgcGF0aCkge1xuICAgIGlmICghbm9kZSkge1xuICAgICAgLy8gVE9ETzogYWRkIGEgZGV2LW1vZGUgYXNzZXJ0aW9uIGhlcmUuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGZpbmRFeGlzdGluZ05vZGU6IGZhaWxlZCB0byBmaW5kIG5vZGUgYXQgJHtwYXRofS5gKTtcbiAgICB9XG4gICAgc3dpdGNoIChvcCkge1xuICAgICAgY2FzZSBOb2RlTmF2aWdhdGlvblN0ZXAuRmlyc3RDaGlsZDpcbiAgICAgICAgbm9kZSA9IG5vZGUuZmlyc3RDaGlsZCE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBOb2RlTmF2aWdhdGlvblN0ZXAuTmV4dFNpYmxpbmc6XG4gICAgICAgIG5vZGUgPSBub2RlLm5leHRTaWJsaW5nITtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIGlmICghbm9kZSkge1xuICAgIC8vIFRPRE86IGFkZCBhIGRldi1tb2RlIGFzc2VydGlvbiBoZXJlLlxuICAgIHRocm93IG5ldyBFcnJvcihgZmluZEV4aXN0aW5nTm9kZTogZmFpbGVkIHRvIGZpbmQgbm9kZSBhdCAke3BhdGh9LmApO1xuICB9XG4gIHJldHVybiBub2RlIGFzIHVua25vd24gYXMgUk5vZGU7XG59XG5cbmZ1bmN0aW9uIGxvY2F0ZVJOb2RlQnlQYXRoKHBhdGg6IHN0cmluZywgbFZpZXc6IExWaWV3KTogUk5vZGUge1xuICBjb25zdCBbcmVmZXJlbmNlTm9kZSwgLi4ucGF0aFBhcnRzXSA9IGRlY29tcHJlc3NOb2RlTG9jYXRpb24ocGF0aCk7XG4gIGxldCByZWY6IEVsZW1lbnQ7XG4gIGlmIChyZWZlcmVuY2VOb2RlID09PSBSRUZFUkVOQ0VfTk9ERV9IT1NUKSB7XG4gICAgcmVmID0gbFZpZXdbMF0gYXMgdW5rbm93biBhcyBFbGVtZW50O1xuICB9IGVsc2UgaWYgKHJlZmVyZW5jZU5vZGUgPT09IFJFRkVSRU5DRV9OT0RFX0JPRFkpIHtcbiAgICByZWYgPSDJtcm1cmVzb2x2ZUJvZHkobFZpZXdbMF0gYXMgdW5rbm93biBhcyBSRWxlbWVudCAmIHtvd25lckRvY3VtZW50OiBEb2N1bWVudH0pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHBhcmVudEVsZW1lbnRJZCA9IE51bWJlcihyZWZlcmVuY2VOb2RlKTtcbiAgICByZWYgPSB1bndyYXBSTm9kZSgobFZpZXcgYXMgYW55KVtwYXJlbnRFbGVtZW50SWQgKyBIRUFERVJfT0ZGU0VUXSkgYXMgRWxlbWVudDtcbiAgfVxuICByZXR1cm4gZmluZEV4aXN0aW5nTm9kZShyZWYsIHBhdGhQYXJ0cyk7XG59XG5cbmZ1bmN0aW9uIGNhbGNWaWV3Q29udGFpbmVyU2l6ZSh2aWV3czogTmdoVmlld1tdKTogbnVtYmVyIHtcbiAgbGV0IG51bU5vZGVzID0gMDtcbiAgZm9yIChsZXQgdmlldyBvZiB2aWV3cykge1xuICAgIG51bU5vZGVzICs9IHZpZXdbTlVNX1JPT1RfTk9ERVNdO1xuICB9XG4gIHJldHVybiBudW1Ob2Rlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxvY2F0ZU5leHRSTm9kZTxUIGV4dGVuZHMgUk5vZGU+KFxuICAgIGh5ZHJhdGlvbkluZm86IE5naERvbSwgdFZpZXc6IFRWaWV3LCBsVmlldzogTFZpZXc8dW5rbm93bj4sIHROb2RlOiBUTm9kZSxcbiAgICBwcmV2aW91c1ROb2RlOiBUTm9kZXxudWxsLCBwcmV2aW91c1ROb2RlUGFyZW50OiBib29sZWFuKTogVHxudWxsIHtcbiAgbGV0IG5hdGl2ZTogUk5vZGV8bnVsbCA9IG51bGw7XG4gIGNvbnN0IGFkanVzdGVkSW5kZXggPSB0Tm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVQ7XG4gIGlmIChoeWRyYXRpb25JbmZvW05PREVTXT8uW2FkanVzdGVkSW5kZXhdKSB7XG4gICAgLy8gV2Uga25vdyBleGFjdCBsb2NhdGlvbiBvZiB0aGUgbm9kZS5cbiAgICBuYXRpdmUgPSBsb2NhdGVSTm9kZUJ5UGF0aChoeWRyYXRpb25JbmZvW05PREVTXVthZGp1c3RlZEluZGV4XSwgbFZpZXcpO1xuICB9IGVsc2UgaWYgKHRWaWV3LmZpcnN0Q2hpbGQgPT09IHROb2RlKSB7XG4gICAgLy8gV2UgY3JlYXRlIGEgZmlyc3Qgbm9kZSBpbiB0aGlzIHZpZXcuXG4gICAgbmF0aXZlID0gaHlkcmF0aW9uSW5mby5maXJzdENoaWxkIGFzIFJOb2RlO1xuICB9IGVsc2Uge1xuICAgIG5nRGV2TW9kZSAmJiBhc3NlcnREZWZpbmVkKHByZXZpb3VzVE5vZGUsICdVbmV4cGVjdGVkIHN0YXRlOiBubyBjdXJyZW50IFROb2RlIGZvdW5kLicpO1xuICAgIGxldCBwcmV2aW91c1JFbGVtZW50ID0gZ2V0TmF0aXZlQnlUTm9kZShwcmV2aW91c1ROb2RlISwgbFZpZXcpIGFzIFJFbGVtZW50O1xuICAgIC8vIFRPRE86IHdlIG1heSB3YW50IHRvIHVzZSB0aGlzIGluc3RlYWQ/XG4gICAgLy8gY29uc3QgY2xvc2VzdCA9IGdldENsb3Nlc3RSRWxlbWVudCh0VmlldywgcHJldmlvdXNUTm9kZSwgbFZpZXcpO1xuICAgIGlmIChwcmV2aW91c1ROb2RlUGFyZW50ICYmIHByZXZpb3VzVE5vZGUhLnR5cGUgPT09IFROb2RlVHlwZS5FbGVtZW50Q29udGFpbmVyKSB7XG4gICAgICAvLyBQcmV2aW91cyBub2RlIHdhcyBhbiBgPG5nLWNvbnRhaW5lcj5gLCBzbyB0aGlzIG5vZGUgaXMgYSBmaXJzdCBjaGlsZFxuICAgICAgLy8gd2l0aGluIGFuIGVsZW1lbnQgY29udGFpbmVyLCBzbyB3ZSBjYW4gbG9jYXRlIHRoZSBjb250YWluZXIgaW4gbmdoIGRhdGFcbiAgICAgIC8vIHN0cnVjdHVyZSBhbmQgdXNlIGl0cyBmaXJzdCBjaGlsZC5cbiAgICAgIGNvbnN0IG5naENvbnRhaW5lciA9IGh5ZHJhdGlvbkluZm9bQ09OVEFJTkVSU10/LltwcmV2aW91c1ROb2RlIS5pbmRleCAtIEhFQURFUl9PRkZTRVRdO1xuICAgICAgaWYgKG5nRGV2TW9kZSAmJiAhbmdoQ29udGFpbmVyKSB7XG4gICAgICAgIC8vIFRPRE86IGFkZCBiZXR0ZXIgZXJyb3IgbWVzc2FnZS5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0YXRlLicpO1xuICAgICAgfVxuICAgICAgbmF0aXZlID0gbmdoQ29udGFpbmVyIS5maXJzdENoaWxkITtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRklYTUU6IHRoaXMgZG9lc24ndCB3b3JrIGZvciBpMThuIDooXG4gICAgICAvLyBJbiBpMThuIGNhc2UsIHByZXZpb3VzIHROb2RlIGlzIGEgcGFyZW50IGVsZW1lbnQsXG4gICAgICAvLyB3aGVuIGluIGZhY3QsIGl0IG1pZ2h0IGJlIGEgdGV4dCBub2RlIGluIGZyb250IG9mIGl0LlxuICAgICAgaWYgKHByZXZpb3VzVE5vZGVQYXJlbnQpIHtcbiAgICAgICAgbmF0aXZlID0gKHByZXZpb3VzUkVsZW1lbnQgYXMgYW55KS5maXJzdENoaWxkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcHJldmlvdXNOb2RlSHlkcmF0aW9uSW5mbyA9XG4gICAgICAgICAgICBoeWRyYXRpb25JbmZvW0NPTlRBSU5FUlNdPy5bcHJldmlvdXNUTm9kZSEuaW5kZXggLSBIRUFERVJfT0ZGU0VUXTtcbiAgICAgICAgaWYgKHByZXZpb3VzVE5vZGUhLnR5cGUgPT09IFROb2RlVHlwZS5FbGVtZW50ICYmIHByZXZpb3VzTm9kZUh5ZHJhdGlvbkluZm8pIHtcbiAgICAgICAgICAvLyBJZiB0aGUgcHJldmlvdXMgbm9kZSBpcyBhbiBlbGVtZW50LCBidXQgaXQgYWxzbyBoYXMgY29udGFpbmVyIGluZm8sXG4gICAgICAgICAgLy8gdGhpcyBtZWFucyB0aGF0IHdlIGFyZSBwcm9jZXNzaW5nIGEgbm9kZSBsaWtlIGA8ZGl2ICN2Y3JUYXJnZXQ+YCwgd2hpY2ggaXNcbiAgICAgICAgICAvLyByZXByZXNlbnRlZCBpbiBsaXZlIERPTSBhcyBgPGRpdj48L2Rpdj4uLi48IS0tY29udGFpbmVyLS0+YC5cbiAgICAgICAgICAvLyBJbiB0aGlzIGNhc2UsIHRoZXJlIGFyZSBub2RlcyAqYWZ0ZXIqIHRoaXMgZWxlbWVudCBhbmQgd2UgbmVlZCB0byBza2lwIHRob3NlLlxuICAgICAgICAgIGNvbnN0IHZpZXdzID0gcHJldmlvdXNOb2RlSHlkcmF0aW9uSW5mbyFbVklFV1NdO1xuICAgICAgICAgIGNvbnN0IG51bVJvb3ROb2Rlc1RvU2tpcCA9IHZpZXdzID8gY2FsY1ZpZXdDb250YWluZXJTaXplKHZpZXdzKSA6IDA7XG4gICAgICAgICAgLy8gYCsxYCBzdGFuZHMgZm9yIGFuIGFuY2hvciBjb21tZW50IG5vZGUgYWZ0ZXIgYWxsIHRoZSB2aWV3cyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgICAgICAgICBjb25zdCBub2Rlc1RvU2tpcCA9IG51bVJvb3ROb2Rlc1RvU2tpcCArIDE7XG4gICAgICAgICAgcHJldmlvdXNSRWxlbWVudCA9IHNpYmxpbmdBZnRlcihub2Rlc1RvU2tpcCwgcHJldmlvdXNSRWxlbWVudCkhO1xuXG4gICAgICAgICAgbmdEZXZNb2RlICYmIGFzc2VydFJDb21tZW50KHByZXZpb3VzUkVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIG5hdGl2ZSA9IHByZXZpb3VzUkVsZW1lbnQubmV4dFNpYmxpbmcgYXMgUkVsZW1lbnQ7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBuYXRpdmUgYXMgVDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpYmxpbmdBZnRlcjxUIGV4dGVuZHMgUk5vZGU+KHNraXA6IG51bWJlciwgZnJvbTogUk5vZGUpOiBUfG51bGwge1xuICBsZXQgY3VycmVudE5vZGUgPSBmcm9tO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHNraXA7IGkrKykge1xuICAgIGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUubmV4dFNpYmxpbmchO1xuICAgIG5nRGV2TW9kZSAmJiBhc3NlcnREZWZpbmVkKGN1cnJlbnROb2RlLCAnRXhwZWN0ZWQgbW9yZSBzaWJsaW5ncyB0byBiZSBwcmVzZW50Jyk7XG4gIH1cbiAgcmV0dXJuIGN1cnJlbnROb2RlIGFzIFQ7XG59XG4iXX0=