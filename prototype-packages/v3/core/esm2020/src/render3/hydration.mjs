/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ENVIRONMENT_INITIALIZER, inject } from '@angular/core';
import { first } from 'rxjs/operators';
import { ApplicationRef } from '../application_ref';
import { InjectionToken } from '../di/injection_token';
import { assertDefined } from '../util/assert';
import { assertRComment } from './assert';
import { readPatchedLView } from './context_discovery';
import { CONTAINER_HEADER_OFFSET, DEHYDRATED_VIEWS } from './interfaces/container';
import { isLContainer, isRootView } from './interfaces/type_checks';
import { HEADER_OFFSET, TVIEW } from './interfaces/view';
import { getNativeByTNode, unwrapRNode } from './util/view_utils';
export const IS_HYDRATION_ENABLED = new InjectionToken('IS_HYDRATION_ENABLED');
/**
 * @publicApi
 * @developerPreview
 */
export function provideHydrationSupport() {
    // Note: this function can also bring more functionality in a tree-shakable way.
    // For example, by providing hydration-aware implementation of finding nodes vs
    // creating them.
    return [
        {
            provide: ENVIRONMENT_INITIALIZER,
            useValue: () => {
                const appRef = inject(ApplicationRef);
                // FIXME: there is no need to use a timeout, we need to
                // use a lifecycle hook to start the cleanup after an app
                // becomes stable (similar to how this is handled at SSR time).
                setTimeout(() => {
                    cleanupDehydratedViews(appRef);
                }, 0);
            },
            multi: true,
        },
        {
            provide: IS_HYDRATION_ENABLED,
            useValue: true,
        }
    ];
}
export function getLViewFromRootElement(element) {
    let lView = readPatchedLView(element);
    if (lView && isRootView(lView)) {
        lView = lView[HEADER_OFFSET];
    }
    return lView;
}
function cleanupLContainer(lContainer) {
    // TODO: we may consider doing it an error instead?
    if (lContainer[DEHYDRATED_VIEWS]) {
        for (const view of lContainer[DEHYDRATED_VIEWS]) {
            removeDehydratedView(view);
        }
    }
    for (let i = CONTAINER_HEADER_OFFSET; i < lContainer.length; i++) {
        const childView = lContainer[i];
        cleanupLView(childView);
    }
}
function cleanupLView(lView) {
    const tView = lView[TVIEW];
    for (let i = HEADER_OFFSET; i < tView.bindingStartIndex; i++) {
        if (isLContainer(lView[i])) {
            // this is a container
            const lContainer = lView[i];
            cleanupLContainer(lContainer);
        }
    }
}
function cleanupDehydratedViews(appRef) {
    // Wait once an app becomes stable and cleanup all views that
    // were not claimed during the application bootstrap process.
    return appRef.isStable.pipe(first((isStable) => isStable)).toPromise().then(() => {
        appRef.components.forEach((componentRef) => {
            const element = componentRef.location.nativeElement;
            if (element) {
                const lView = getLViewFromRootElement(element);
                if (lView !== null) {
                    cleanupLView(lView);
                }
            }
        });
    });
}
/**
 * Helper function to remove all nodes from a dehydrated view.
 */
function removeDehydratedView(dehydratedView) {
    let nodesRemoved = 0;
    let currentRNode = dehydratedView.firstChild;
    const numNodes = dehydratedView.numRootNodes;
    while (nodesRemoved < numNodes) {
        currentRNode.remove();
        currentRNode = currentRNode.nextSibling;
        nodesRemoved++;
    }
}
// TODO: consider using WeakMap instead.
export function markRNodeAsClaimedForHydration(node) {
    if (!ngDevMode) {
        throw new Error('Calling `claimNode` in prod mode is not supported and likely a mistake.');
    }
    if (isRNodeClaimedForHydration(node)) {
        throw new Error('Trying to claim a node, which was claimed already.');
    }
    node.__claimed = true;
}
export function isRNodeClaimedForHydration(node) {
    return !!node.__claimed;
}
export function findExistingNode(host, path) {
    let node = host;
    for (const op of path) {
        if (!node) {
            // TODO: add a dev-mode assertion here.
            debugger;
            throw new Error(`findExistingNode: failed to find node at ${path}.`);
        }
        switch (op) {
            case 'firstChild':
                node = node.firstChild;
                break;
            case 'nextSibling':
                node = node.nextSibling;
                break;
        }
    }
    if (!node) {
        // TODO: add a dev-mode assertion here.
        debugger;
        throw new Error(`findExistingNode: failed to find node at ${path}.`);
    }
    return node;
}
function locateRNodeByPath(path, lView) {
    const pathParts = path.split('.');
    // First element in a path is:
    // - either a parent node id: `12.nextSibling...`
    // - or a 'host' string to indicate that the search should start from the host node
    const firstPathPart = pathParts.shift();
    if (firstPathPart === 'host') {
        return findExistingNode(lView[0], pathParts);
    }
    else {
        const parentElementId = Number(firstPathPart);
        const parentRNode = unwrapRNode(lView[parentElementId + HEADER_OFFSET]);
        return findExistingNode(parentRNode, pathParts);
    }
}
export function locateNextRNode(hydrationInfo, tView, lView, tNode, previousTNode, previousTNodeParent) {
    let native = null;
    const adjustedIndex = tNode.index - HEADER_OFFSET;
    if (hydrationInfo.nodes[adjustedIndex]) {
        // We know exact location of the node.
        native = locateRNodeByPath(hydrationInfo.nodes[adjustedIndex], lView);
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
            const nghContainer = hydrationInfo.containers[previousTNode.index - HEADER_OFFSET];
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
                const previousNodeHydrationInfo = hydrationInfo.containers[previousTNode.index - HEADER_OFFSET];
                if (previousTNode.type === 2 /* TNodeType.Element */ && previousNodeHydrationInfo) {
                    // If the previous node is an element, but it also has container info,
                    // this means that we are processing a node like `<div #vcrTarget>`, which is
                    // represented in live DOM as `<div></div>...<!--container-->`.
                    // In this case, there are nodes *after* this element and we need to skip those.
                    // `+1` stands for an anchor comment node after all the views in this container.
                    const nodesToSkip = calcViewContainerSize(previousNodeHydrationInfo.views) + 1;
                    previousRElement = siblingAfter(nodesToSkip, previousRElement);
                    // TODO: add an assert that `previousRElement` is a comment node.
                }
                native = previousRElement.nextSibling;
            }
        }
    }
    return native;
}
export function calcViewContainerSize(views) {
    let numNodes = 0;
    for (let view of views) {
        numNodes += view.numRootNodes;
    }
    return numNodes;
}
export function siblingAfter(skip, from) {
    let currentNode = from;
    for (let i = 0; i < skip; i++) {
        currentNode = currentNode.nextSibling;
        ngDevMode && assertDefined(currentNode, 'Expected more siblings to be present');
    }
    return currentNode;
}
/**
 * Given a current DOM node and an ngh container definition,
 * walks over the DOM structure, collecting the list of dehydrated views.
 *
 * @param currentRNode
 * @param nghContainer
 */
export function locateDehydratedViewsInContainer(currentRNode, nghContainer) {
    const dehydratedViews = [];
    for (const nghView of nghContainer.views) {
        const view = { ...nghView };
        if (view.numRootNodes > 0) {
            // Keep reference to the first node in this view,
            // so it can be accessed while invoking template instructions.
            view.firstChild = currentRNode;
            // Move over to the first node after this view, which can
            // either be a first node of the next view or an anchor comment
            // node after the last view in a container.
            currentRNode = siblingAfter(view.numRootNodes, currentRNode);
        }
        dehydratedViews.push(view);
    }
    ngDevMode && assertRComment(currentRNode, 'Expecting a comment node as a view container anchor');
    return [currentRNode, dehydratedViews];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHlkcmF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvcmVuZGVyMy9oeWRyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLHVCQUF1QixFQUFFLE1BQU0sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUM5RCxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFckMsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ2xELE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFN0MsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUN4QyxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsdUJBQXVCLEVBQUUsZ0JBQWdCLEVBQWEsTUFBTSx3QkFBd0IsQ0FBQztBQUc3RixPQUFPLEVBQUMsWUFBWSxFQUFFLFVBQVUsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ2xFLE9BQU8sRUFBQyxhQUFhLEVBQStDLEtBQUssRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ3BHLE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUVoRSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLGNBQWMsQ0FBVSxzQkFBc0IsQ0FBQyxDQUFDO0FBRXhGOzs7R0FHRztBQUNILE1BQU0sVUFBVSx1QkFBdUI7SUFDckMsZ0ZBQWdGO0lBQ2hGLCtFQUErRTtJQUMvRSxpQkFBaUI7SUFDakIsT0FBTztRQUNMO1lBQ0UsT0FBTyxFQUFFLHVCQUF1QjtZQUNoQyxRQUFRLEVBQUUsR0FBRyxFQUFFO2dCQUNi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QUF5RDtZQUN6RCwrREFBK0Q7WUFDL0QsMkNBQTJDO1lBQzNDLFlBQVksR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxZQUF3QixDQUFFLENBQUM7U0FDM0U7UUFFRCxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQzVCO0lBRUQsU0FBUyxJQUFJLGNBQWMsQ0FBQyxZQUFZLEVBQUUscURBQXFELENBQUMsQ0FBQztJQUVqRyxPQUFPLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0FBQ3pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFTlZJUk9OTUVOVF9JTklUSUFMSVpFUiwgaW5qZWN0fSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Zmlyc3R9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtBcHBsaWNhdGlvblJlZn0gZnJvbSAnLi4vYXBwbGljYXRpb25fcmVmJztcbmltcG9ydCB7SW5qZWN0aW9uVG9rZW59IGZyb20gJy4uL2RpL2luamVjdGlvbl90b2tlbic7XG5pbXBvcnQge2Fzc2VydERlZmluZWR9IGZyb20gJy4uL3V0aWwvYXNzZXJ0JztcblxuaW1wb3J0IHthc3NlcnRSQ29tbWVudH0gZnJvbSAnLi9hc3NlcnQnO1xuaW1wb3J0IHtyZWFkUGF0Y2hlZExWaWV3fSBmcm9tICcuL2NvbnRleHRfZGlzY292ZXJ5JztcbmltcG9ydCB7Q09OVEFJTkVSX0hFQURFUl9PRkZTRVQsIERFSFlEUkFURURfVklFV1MsIExDb250YWluZXJ9IGZyb20gJy4vaW50ZXJmYWNlcy9jb250YWluZXInO1xuaW1wb3J0IHtUTm9kZSwgVE5vZGVUeXBlfSBmcm9tICcuL2ludGVyZmFjZXMvbm9kZSc7XG5pbXBvcnQge1JFbGVtZW50LCBSTm9kZX0gZnJvbSAnLi9pbnRlcmZhY2VzL3JlbmRlcmVyX2RvbSc7XG5pbXBvcnQge2lzTENvbnRhaW5lciwgaXNSb290Vmlld30gZnJvbSAnLi9pbnRlcmZhY2VzL3R5cGVfY2hlY2tzJztcbmltcG9ydCB7SEVBREVSX09GRlNFVCwgTFZpZXcsIE5naENvbnRhaW5lciwgTmdoRG9tLCBOZ2hWaWV3LCBUVmlldywgVFZJRVd9IGZyb20gJy4vaW50ZXJmYWNlcy92aWV3JztcbmltcG9ydCB7Z2V0TmF0aXZlQnlUTm9kZSwgdW53cmFwUk5vZGV9IGZyb20gJy4vdXRpbC92aWV3X3V0aWxzJztcblxuZXhwb3J0IGNvbnN0IElTX0hZRFJBVElPTl9FTkFCTEVEID0gbmV3IEluamVjdGlvblRva2VuPGJvb2xlYW4+KCdJU19IWURSQVRJT05fRU5BQkxFRCcpO1xuXG4vKipcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXZlbG9wZXJQcmV2aWV3XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlSHlkcmF0aW9uU3VwcG9ydCgpIHtcbiAgLy8gTm90ZTogdGhpcyBmdW5jdGlvbiBjYW4gYWxzbyBicmluZyBtb3JlIGZ1bmN0aW9uYWxpdHkgaW4gYSB0cmVlLXNoYWthYmxlIHdheS5cbiAgLy8gRm9yIGV4YW1wbGUsIGJ5IHByb3ZpZGluZyBoeWRyYXRpb24tYXdhcmUgaW1wbGVtZW50YXRpb24gb2YgZmluZGluZyBub2RlcyB2c1xuICAvLyBjcmVhdGluZyB0aGVtLlxuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIHByb3ZpZGU6IEVOVklST05NRU5UX0lOSVRJQUxJWkVSLFxuICAgICAgdXNlVmFsdWU6ICgpID0+IHtcbiAgICAgICAgY29uc3QgYXBwUmVmID0gaW5qZWN0KEFwcGxpY2F0aW9uUmVmKTtcbiAgICAgICAgLy8gRklYTUU6IHRoZXJlIGlzIG5vIG5lZWQgdG8gdXNlIGEgdGltZW91dCwgd2UgbmVlZCB0b1xuICAgICAgICAvLyB1c2UgYSBsaWZlY3ljbGUgaG9vayB0byBzdGFydCB0aGUgY2xlYW51cCBhZnRlciBhbiBhcHBcbiAgICAgICAgLy8gYmVjb21lcyBzdGFibGUgKHNpbWlsYXIgdG8gaG93IHRoaXMgaXMgaGFuZGxlZCBhdCBTU1IgdGltZSkuXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIGNsZWFudXBEZWh5ZHJhdGVkVmlld3MoYXBwUmVmKTtcbiAgICAgICAgfSwgMCk7XG4gICAgICB9LFxuICAgICAgbXVsdGk6IHRydWUsXG4gICAgfSxcbiAgICB7XG4gICAgICBwcm92aWRlOiBJU19IWURSQVRJT05fRU5BQkxFRCxcbiAgICAgIHVzZVZhbHVlOiB0cnVlLFxuICAgIH1cbiAgXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldExWaWV3RnJvbVJvb3RFbGVtZW50KGVsZW1lbnQ6IEVsZW1lbnQpOiBMVmlld3xudWxsIHtcbiAgbGV0IGxWaWV3ID0gcmVhZFBhdGNoZWRMVmlldyhlbGVtZW50KTtcbiAgaWYgKGxWaWV3ICYmIGlzUm9vdFZpZXcobFZpZXcpKSB7XG4gICAgbFZpZXcgPSBsVmlld1tIRUFERVJfT0ZGU0VUXTtcbiAgfVxuICByZXR1cm4gbFZpZXc7XG59XG5cbmZ1bmN0aW9uIGNsZWFudXBMQ29udGFpbmVyKGxDb250YWluZXI6IExDb250YWluZXIpIHtcbiAgLy8gVE9ETzogd2UgbWF5IGNvbnNpZGVyIGRvaW5nIGl0IGFuIGVycm9yIGluc3RlYWQ/XG4gIGlmIChsQ29udGFpbmVyW0RFSFlEUkFURURfVklFV1NdKSB7XG4gICAgZm9yIChjb25zdCB2aWV3IG9mIGxDb250YWluZXJbREVIWURSQVRFRF9WSUVXU10pIHtcbiAgICAgIHJlbW92ZURlaHlkcmF0ZWRWaWV3KHZpZXcpO1xuICAgIH1cbiAgfVxuICBmb3IgKGxldCBpID0gQ09OVEFJTkVSX0hFQURFUl9PRkZTRVQ7IGkgPCBsQ29udGFpbmVyLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY2hpbGRWaWV3ID0gbENvbnRhaW5lcltpXSBhcyBMVmlldztcbiAgICBjbGVhbnVwTFZpZXcoY2hpbGRWaWV3KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjbGVhbnVwTFZpZXcobFZpZXc6IExWaWV3KSB7XG4gIGNvbnN0IHRWaWV3ID0gbFZpZXdbVFZJRVddO1xuICBmb3IgKGxldCBpID0gSEVBREVSX09GRlNFVDsgaSA8IHRWaWV3LmJpbmRpbmdTdGFydEluZGV4OyBpKyspIHtcbiAgICBpZiAoaXNMQ29udGFpbmVyKGxWaWV3W2ldKSkge1xuICAgICAgLy8gdGhpcyBpcyBhIGNvbnRhaW5lclxuICAgICAgY29uc3QgbENvbnRhaW5lciA9IGxWaWV3W2ldO1xuICAgICAgY2xlYW51cExDb250YWluZXIobENvbnRhaW5lcik7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFudXBEZWh5ZHJhdGVkVmlld3MoYXBwUmVmOiBBcHBsaWNhdGlvblJlZikge1xuICAvLyBXYWl0IG9uY2UgYW4gYXBwIGJlY29tZXMgc3RhYmxlIGFuZCBjbGVhbnVwIGFsbCB2aWV3cyB0aGF0XG4gIC8vIHdlcmUgbm90IGNsYWltZWQgZHVyaW5nIHRoZSBhcHBsaWNhdGlvbiBib290c3RyYXAgcHJvY2Vzcy5cbiAgcmV0dXJuIGFwcFJlZi5pc1N0YWJsZS5waXBlKGZpcnN0KChpc1N0YWJsZTogYm9vbGVhbikgPT4gaXNTdGFibGUpKS50b1Byb21pc2UoKS50aGVuKCgpID0+IHtcbiAgICBhcHBSZWYuY29tcG9uZW50cy5mb3JFYWNoKChjb21wb25lbnRSZWYpID0+IHtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSBjb21wb25lbnRSZWYubG9jYXRpb24ubmF0aXZlRWxlbWVudDtcbiAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGxWaWV3ID0gZ2V0TFZpZXdGcm9tUm9vdEVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIGlmIChsVmlldyAhPT0gbnVsbCkge1xuICAgICAgICAgIGNsZWFudXBMVmlldyhsVmlldyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIHJlbW92ZSBhbGwgbm9kZXMgZnJvbSBhIGRlaHlkcmF0ZWQgdmlldy5cbiAqL1xuZnVuY3Rpb24gcmVtb3ZlRGVoeWRyYXRlZFZpZXcoZGVoeWRyYXRlZFZpZXc6IE5naFZpZXcpIHtcbiAgbGV0IG5vZGVzUmVtb3ZlZCA9IDA7XG4gIGxldCBjdXJyZW50Uk5vZGUgPSBkZWh5ZHJhdGVkVmlldy5maXJzdENoaWxkO1xuICBjb25zdCBudW1Ob2RlcyA9IGRlaHlkcmF0ZWRWaWV3Lm51bVJvb3ROb2RlcztcbiAgd2hpbGUgKG5vZGVzUmVtb3ZlZCA8IG51bU5vZGVzKSB7XG4gICAgY3VycmVudFJOb2RlLnJlbW92ZSgpO1xuICAgIGN1cnJlbnRSTm9kZSA9IGN1cnJlbnRSTm9kZS5uZXh0U2libGluZyBhcyBIVE1MRWxlbWVudDtcbiAgICBub2Rlc1JlbW92ZWQrKztcbiAgfVxufVxuXG50eXBlIENsYWltZWROb2RlID0ge1xuICBfX2NsYWltZWQ/OiBib29sZWFuXG59O1xuXG4vLyBUT0RPOiBjb25zaWRlciB1c2luZyBXZWFrTWFwIGluc3RlYWQuXG5leHBvcnQgZnVuY3Rpb24gbWFya1JOb2RlQXNDbGFpbWVkRm9ySHlkcmF0aW9uKG5vZGU6IFJOb2RlKSB7XG4gIGlmICghbmdEZXZNb2RlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYWxsaW5nIGBjbGFpbU5vZGVgIGluIHByb2QgbW9kZSBpcyBub3Qgc3VwcG9ydGVkIGFuZCBsaWtlbHkgYSBtaXN0YWtlLicpO1xuICB9XG4gIGlmIChpc1JOb2RlQ2xhaW1lZEZvckh5ZHJhdGlvbihub2RlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVHJ5aW5nIHRvIGNsYWltIGEgbm9kZSwgd2hpY2ggd2FzIGNsYWltZWQgYWxyZWFkeS4nKTtcbiAgfVxuICAobm9kZSBhcyBDbGFpbWVkTm9kZSkuX19jbGFpbWVkID0gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUk5vZGVDbGFpbWVkRm9ySHlkcmF0aW9uKG5vZGU6IFJOb2RlKTogYm9vbGVhbiB7XG4gIHJldHVybiAhIShub2RlIGFzIENsYWltZWROb2RlKS5fX2NsYWltZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kRXhpc3RpbmdOb2RlKGhvc3Q6IE5vZGUsIHBhdGg6IHN0cmluZ1tdKTogUk5vZGUge1xuICBsZXQgbm9kZSA9IGhvc3Q7XG4gIGZvciAoY29uc3Qgb3Agb2YgcGF0aCkge1xuICAgIGlmICghbm9kZSkge1xuICAgICAgLy8gVE9ETzogYWRkIGEgZGV2LW1vZGUgYXNzZXJ0aW9uIGhlcmUuXG4gICAgICBkZWJ1Z2dlcjtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZmluZEV4aXN0aW5nTm9kZTogZmFpbGVkIHRvIGZpbmQgbm9kZSBhdCAke3BhdGh9LmApO1xuICAgIH1cbiAgICBzd2l0Y2ggKG9wKSB7XG4gICAgICBjYXNlICdmaXJzdENoaWxkJzpcbiAgICAgICAgbm9kZSA9IG5vZGUuZmlyc3RDaGlsZCE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbmV4dFNpYmxpbmcnOlxuICAgICAgICBub2RlID0gbm9kZS5uZXh0U2libGluZyE7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBpZiAoIW5vZGUpIHtcbiAgICAvLyBUT0RPOiBhZGQgYSBkZXYtbW9kZSBhc3NlcnRpb24gaGVyZS5cbiAgICBkZWJ1Z2dlcjtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGZpbmRFeGlzdGluZ05vZGU6IGZhaWxlZCB0byBmaW5kIG5vZGUgYXQgJHtwYXRofS5gKTtcbiAgfVxuICByZXR1cm4gbm9kZSBhcyB1bmtub3duIGFzIFJOb2RlO1xufVxuXG5mdW5jdGlvbiBsb2NhdGVSTm9kZUJ5UGF0aChwYXRoOiBzdHJpbmcsIGxWaWV3OiBMVmlldyk6IFJOb2RlIHtcbiAgY29uc3QgcGF0aFBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAvLyBGaXJzdCBlbGVtZW50IGluIGEgcGF0aCBpczpcbiAgLy8gLSBlaXRoZXIgYSBwYXJlbnQgbm9kZSBpZDogYDEyLm5leHRTaWJsaW5nLi4uYFxuICAvLyAtIG9yIGEgJ2hvc3QnIHN0cmluZyB0byBpbmRpY2F0ZSB0aGF0IHRoZSBzZWFyY2ggc2hvdWxkIHN0YXJ0IGZyb20gdGhlIGhvc3Qgbm9kZVxuICBjb25zdCBmaXJzdFBhdGhQYXJ0ID0gcGF0aFBhcnRzLnNoaWZ0KCk7XG4gIGlmIChmaXJzdFBhdGhQYXJ0ID09PSAnaG9zdCcpIHtcbiAgICByZXR1cm4gZmluZEV4aXN0aW5nTm9kZShsVmlld1swXSBhcyB1bmtub3duIGFzIEVsZW1lbnQsIHBhdGhQYXJ0cyk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcGFyZW50RWxlbWVudElkID0gTnVtYmVyKGZpcnN0UGF0aFBhcnQhKTtcbiAgICBjb25zdCBwYXJlbnRSTm9kZSA9IHVud3JhcFJOb2RlKChsVmlldyBhcyBhbnkpW3BhcmVudEVsZW1lbnRJZCArIEhFQURFUl9PRkZTRVRdKTtcbiAgICByZXR1cm4gZmluZEV4aXN0aW5nTm9kZShwYXJlbnRSTm9kZSBhcyBFbGVtZW50LCBwYXRoUGFydHMpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2NhdGVOZXh0Uk5vZGU8VCBleHRlbmRzIFJOb2RlPihcbiAgICBoeWRyYXRpb25JbmZvOiBOZ2hEb20sIHRWaWV3OiBUVmlldywgbFZpZXc6IExWaWV3PHVua25vd24+LCB0Tm9kZTogVE5vZGUsXG4gICAgcHJldmlvdXNUTm9kZTogVE5vZGV8bnVsbCwgcHJldmlvdXNUTm9kZVBhcmVudDogYm9vbGVhbik6IFR8bnVsbCB7XG4gIGxldCBuYXRpdmU6IFJOb2RlfG51bGwgPSBudWxsO1xuICBjb25zdCBhZGp1c3RlZEluZGV4ID0gdE5vZGUuaW5kZXggLSBIRUFERVJfT0ZGU0VUO1xuICBpZiAoaHlkcmF0aW9uSW5mby5ub2Rlc1thZGp1c3RlZEluZGV4XSkge1xuICAgIC8vIFdlIGtub3cgZXhhY3QgbG9jYXRpb24gb2YgdGhlIG5vZGUuXG4gICAgbmF0aXZlID0gbG9jYXRlUk5vZGVCeVBhdGgoaHlkcmF0aW9uSW5mby5ub2Rlc1thZGp1c3RlZEluZGV4XSwgbFZpZXcpO1xuICB9IGVsc2UgaWYgKHRWaWV3LmZpcnN0Q2hpbGQgPT09IHROb2RlKSB7XG4gICAgLy8gV2UgY3JlYXRlIGEgZmlyc3Qgbm9kZSBpbiB0aGlzIHZpZXcuXG4gICAgbmF0aXZlID0gaHlkcmF0aW9uSW5mby5maXJzdENoaWxkO1xuICB9IGVsc2Uge1xuICAgIG5nRGV2TW9kZSAmJiBhc3NlcnREZWZpbmVkKHByZXZpb3VzVE5vZGUsICdVbmV4cGVjdGVkIHN0YXRlOiBubyBjdXJyZW50IFROb2RlIGZvdW5kLicpO1xuICAgIGxldCBwcmV2aW91c1JFbGVtZW50ID0gZ2V0TmF0aXZlQnlUTm9kZShwcmV2aW91c1ROb2RlISwgbFZpZXcpIGFzIFJFbGVtZW50O1xuICAgIC8vIFRPRE86IHdlIG1heSB3YW50IHRvIHVzZSB0aGlzIGluc3RlYWQ/XG4gICAgLy8gY29uc3QgY2xvc2VzdCA9IGdldENsb3Nlc3RSRWxlbWVudCh0VmlldywgcHJldmlvdXNUTm9kZSwgbFZpZXcpO1xuICAgIGlmIChwcmV2aW91c1ROb2RlUGFyZW50ICYmIHByZXZpb3VzVE5vZGUhLnR5cGUgPT09IFROb2RlVHlwZS5FbGVtZW50Q29udGFpbmVyKSB7XG4gICAgICAvLyBQcmV2aW91cyBub2RlIHdhcyBhbiBgPG5nLWNvbnRhaW5lcj5gLCBzbyB0aGlzIG5vZGUgaXMgYSBmaXJzdCBjaGlsZFxuICAgICAgLy8gd2l0aGluIGFuIGVsZW1lbnQgY29udGFpbmVyLCBzbyB3ZSBjYW4gbG9jYXRlIHRoZSBjb250YWluZXIgaW4gbmdoIGRhdGFcbiAgICAgIC8vIHN0cnVjdHVyZSBhbmQgdXNlIGl0cyBmaXJzdCBjaGlsZC5cbiAgICAgIGNvbnN0IG5naENvbnRhaW5lciA9IGh5ZHJhdGlvbkluZm8uY29udGFpbmVyc1twcmV2aW91c1ROb2RlIS5pbmRleCAtIEhFQURFUl9PRkZTRVRdO1xuICAgICAgaWYgKG5nRGV2TW9kZSAmJiAhbmdoQ29udGFpbmVyKSB7XG4gICAgICAgIC8vIFRPRE86IGFkZCBiZXR0ZXIgZXJyb3IgbWVzc2FnZS5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0YXRlLicpO1xuICAgICAgfVxuICAgICAgbmF0aXZlID0gbmdoQ29udGFpbmVyLmZpcnN0Q2hpbGQhO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGSVhNRTogdGhpcyBkb2Vzbid0IHdvcmsgZm9yIGkxOG4gOihcbiAgICAgIC8vIEluIGkxOG4gY2FzZSwgcHJldmlvdXMgdE5vZGUgaXMgYSBwYXJlbnQgZWxlbWVudCxcbiAgICAgIC8vIHdoZW4gaW4gZmFjdCwgaXQgbWlnaHQgYmUgYSB0ZXh0IG5vZGUgaW4gZnJvbnQgb2YgaXQuXG4gICAgICBpZiAocHJldmlvdXNUTm9kZVBhcmVudCkge1xuICAgICAgICBuYXRpdmUgPSAocHJldmlvdXNSRWxlbWVudCBhcyBhbnkpLmZpcnN0Q2hpbGQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwcmV2aW91c05vZGVIeWRyYXRpb25JbmZvID1cbiAgICAgICAgICAgIGh5ZHJhdGlvbkluZm8uY29udGFpbmVyc1twcmV2aW91c1ROb2RlIS5pbmRleCAtIEhFQURFUl9PRkZTRVRdO1xuICAgICAgICBpZiAocHJldmlvdXNUTm9kZSEudHlwZSA9PT0gVE5vZGVUeXBlLkVsZW1lbnQgJiYgcHJldmlvdXNOb2RlSHlkcmF0aW9uSW5mbykge1xuICAgICAgICAgIC8vIElmIHRoZSBwcmV2aW91cyBub2RlIGlzIGFuIGVsZW1lbnQsIGJ1dCBpdCBhbHNvIGhhcyBjb250YWluZXIgaW5mbyxcbiAgICAgICAgICAvLyB0aGlzIG1lYW5zIHRoYXQgd2UgYXJlIHByb2Nlc3NpbmcgYSBub2RlIGxpa2UgYDxkaXYgI3ZjclRhcmdldD5gLCB3aGljaCBpc1xuICAgICAgICAgIC8vIHJlcHJlc2VudGVkIGluIGxpdmUgRE9NIGFzIGA8ZGl2PjwvZGl2Pi4uLjwhLS1jb250YWluZXItLT5gLlxuICAgICAgICAgIC8vIEluIHRoaXMgY2FzZSwgdGhlcmUgYXJlIG5vZGVzICphZnRlciogdGhpcyBlbGVtZW50IGFuZCB3ZSBuZWVkIHRvIHNraXAgdGhvc2UuXG4gICAgICAgICAgLy8gYCsxYCBzdGFuZHMgZm9yIGFuIGFuY2hvciBjb21tZW50IG5vZGUgYWZ0ZXIgYWxsIHRoZSB2aWV3cyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgICAgICAgICBjb25zdCBub2Rlc1RvU2tpcCA9IGNhbGNWaWV3Q29udGFpbmVyU2l6ZShwcmV2aW91c05vZGVIeWRyYXRpb25JbmZvLnZpZXdzKSArIDE7XG4gICAgICAgICAgcHJldmlvdXNSRWxlbWVudCA9IHNpYmxpbmdBZnRlcihub2Rlc1RvU2tpcCwgcHJldmlvdXNSRWxlbWVudCkhO1xuICAgICAgICAgIC8vIFRPRE86IGFkZCBhbiBhc3NlcnQgdGhhdCBgcHJldmlvdXNSRWxlbWVudGAgaXMgYSBjb21tZW50IG5vZGUuXG4gICAgICAgIH1cbiAgICAgICAgbmF0aXZlID0gcHJldmlvdXNSRWxlbWVudC5uZXh0U2libGluZyBhcyBSRWxlbWVudDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5hdGl2ZSBhcyBUO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FsY1ZpZXdDb250YWluZXJTaXplKHZpZXdzOiBOZ2hWaWV3W10pOiBudW1iZXIge1xuICBsZXQgbnVtTm9kZXMgPSAwO1xuICBmb3IgKGxldCB2aWV3IG9mIHZpZXdzKSB7XG4gICAgbnVtTm9kZXMgKz0gdmlldy5udW1Sb290Tm9kZXM7XG4gIH1cbiAgcmV0dXJuIG51bU5vZGVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2libGluZ0FmdGVyPFQgZXh0ZW5kcyBSTm9kZT4oc2tpcDogbnVtYmVyLCBmcm9tOiBSTm9kZSk6IFR8bnVsbCB7XG4gIGxldCBjdXJyZW50Tm9kZSA9IGZyb207XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2tpcDsgaSsrKSB7XG4gICAgY3VycmVudE5vZGUgPSBjdXJyZW50Tm9kZS5uZXh0U2libGluZyE7XG4gICAgbmdEZXZNb2RlICYmIGFzc2VydERlZmluZWQoY3VycmVudE5vZGUsICdFeHBlY3RlZCBtb3JlIHNpYmxpbmdzIHRvIGJlIHByZXNlbnQnKTtcbiAgfVxuICByZXR1cm4gY3VycmVudE5vZGUgYXMgVDtcbn1cblxuLyoqXG4gKiBHaXZlbiBhIGN1cnJlbnQgRE9NIG5vZGUgYW5kIGFuIG5naCBjb250YWluZXIgZGVmaW5pdGlvbixcbiAqIHdhbGtzIG92ZXIgdGhlIERPTSBzdHJ1Y3R1cmUsIGNvbGxlY3RpbmcgdGhlIGxpc3Qgb2YgZGVoeWRyYXRlZCB2aWV3cy5cbiAqXG4gKiBAcGFyYW0gY3VycmVudFJOb2RlXG4gKiBAcGFyYW0gbmdoQ29udGFpbmVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2NhdGVEZWh5ZHJhdGVkVmlld3NJbkNvbnRhaW5lcihcbiAgICBjdXJyZW50Uk5vZGU6IFJOb2RlLCBuZ2hDb250YWluZXI6IE5naENvbnRhaW5lcik6IFtSTm9kZSwgTmdoVmlld1tdXSB7XG4gIGNvbnN0IGRlaHlkcmF0ZWRWaWV3czogTmdoVmlld1tdID0gW107XG4gIGZvciAoY29uc3QgbmdoVmlldyBvZiBuZ2hDb250YWluZXIudmlld3MpIHtcbiAgICBjb25zdCB2aWV3ID0gey4uLm5naFZpZXd9O1xuICAgIGlmICh2aWV3Lm51bVJvb3ROb2RlcyA+IDApIHtcbiAgICAgIC8vIEtlZXAgcmVmZXJlbmNlIHRvIHRoZSBmaXJzdCBub2RlIGluIHRoaXMgdmlldyxcbiAgICAgIC8vIHNvIGl0IGNhbiBiZSBhY2Nlc3NlZCB3aGlsZSBpbnZva2luZyB0ZW1wbGF0ZSBpbnN0cnVjdGlvbnMuXG4gICAgICB2aWV3LmZpcnN0Q2hpbGQgPSBjdXJyZW50Uk5vZGUgYXMgSFRNTEVsZW1lbnQ7XG5cbiAgICAgIC8vIE1vdmUgb3ZlciB0byB0aGUgZmlyc3Qgbm9kZSBhZnRlciB0aGlzIHZpZXcsIHdoaWNoIGNhblxuICAgICAgLy8gZWl0aGVyIGJlIGEgZmlyc3Qgbm9kZSBvZiB0aGUgbmV4dCB2aWV3IG9yIGFuIGFuY2hvciBjb21tZW50XG4gICAgICAvLyBub2RlIGFmdGVyIHRoZSBsYXN0IHZpZXcgaW4gYSBjb250YWluZXIuXG4gICAgICBjdXJyZW50Uk5vZGUgPSBzaWJsaW5nQWZ0ZXIodmlldy5udW1Sb290Tm9kZXMsIGN1cnJlbnRSTm9kZSBhcyBSRWxlbWVudCkhO1xuICAgIH1cblxuICAgIGRlaHlkcmF0ZWRWaWV3cy5wdXNoKHZpZXcpO1xuICB9XG5cbiAgbmdEZXZNb2RlICYmIGFzc2VydFJDb21tZW50KGN1cnJlbnRSTm9kZSwgJ0V4cGVjdGluZyBhIGNvbW1lbnQgbm9kZSBhcyBhIHZpZXcgY29udGFpbmVyIGFuY2hvcicpO1xuXG4gIHJldHVybiBbY3VycmVudFJOb2RlLCBkZWh5ZHJhdGVkVmlld3NdO1xufVxuIl19