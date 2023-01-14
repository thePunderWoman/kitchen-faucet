/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { first } from 'rxjs/operators';
import { ApplicationRef } from '../application_ref';
import { ENVIRONMENT_INITIALIZER, inject } from '@angular/core';
import { assertDefined } from '../util/assert';
import { readPatchedLView } from './context_discovery';
import { CONTAINER_HEADER_OFFSET, DEHYDRATED_VIEWS } from './interfaces/container';
import { isLContainer, isRootView } from './interfaces/type_checks';
import { HEADER_OFFSET, TVIEW } from './interfaces/view';
import { getNativeByTNode, unwrapRNode } from './util/view_utils';
/**
 * @publicApi
 * @developerPreview
 */
export function withHydrationSupport() {
    // Note: this function can also bring more functionality in a tree-shakable way.
    // For example, by providing hydration-aware implementation of finding nodes vs
    // creating them.
    return [{
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
        }];
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
    // First element is a parent node id: `12.nextSibling...`.
    const parentElementId = Number(pathParts.shift());
    const parentRNode = unwrapRNode(lView[parentElementId + HEADER_OFFSET]);
    return findExistingNode(parentRNode, pathParts);
}
export function locateNextRNode(hydrationInfo, tView, lView, tNode, previousTNode, previousTNodeParent) {
    let native = null;
    const adjustedIndex = tNode.index - HEADER_OFFSET;
    if (hydrationInfo.nodes[adjustedIndex]) {
        // We know exact location of the node.
        native = locateRNodeByPath(hydrationInfo.nodes[adjustedIndex], lView);
        debugger;
    }
    else if (tView.firstChild === tNode) {
        // We create a first node in this view.
        native = hydrationInfo.firstChild;
    }
    else {
        ngDevMode && assertDefined(previousTNode, 'Unexpected state: no current TNode found.');
        const previousRElement = getNativeByTNode(previousTNode, lView);
        // TODO: we may want to use this instead?
        // const closest = getClosestRElement(tView, previousTNode, lView);
        if (previousTNodeParent && previousTNode.type === 8 /* TNodeType.ElementContainer */) {
            // Previous node was an `<ng-container>`, so this node is a first child
            // within an element container, so we can locate the container in ngh data
            // structure and use its first child.
            const sContainer = hydrationInfo.containers[previousTNode.index - HEADER_OFFSET];
            if (ngDevMode && !sContainer) {
                throw new Error('Invalid state.');
            }
            native = sContainer.firstChild;
        }
        else {
            // FIXME: this doesn't work for i18n :(
            // In i18n case, previous tNode is a parent element,
            // when in fact, it might be a text node in front of it.
            if (previousTNodeParent) {
                native = previousRElement.firstChild;
            }
            else {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHlkcmF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvcmVuZGVyMy9oeWRyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXJDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUNsRCxPQUFPLEVBQUMsdUJBQXVCLEVBQUUsTUFBTSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzlELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUU3QyxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsdUJBQXVCLEVBQUUsZ0JBQWdCLEVBQWEsTUFBTSx3QkFBd0IsQ0FBQztBQUc3RixPQUFPLEVBQUMsWUFBWSxFQUFFLFVBQVUsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ2xFLE9BQU8sRUFBQyxhQUFhLEVBQWlDLEtBQUssRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ3RGLE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUVoRTs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsb0JBQW9CO0lBQ2xDLGdGQUFnRjtJQUNoRiwrRUFBK0U7SUFDL0UsaUJBQWlCO0lBQ2pCLE9BQU8sQ0FBQztZQUNOLE9BQU8sRUFBRSx1QkFBdUI7WUFDaEMsUUFBUSxFQUFFLEdBQUcsRUFBRTtnQkFDYixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ3RDLHVEQUF1RDtnQkFDdkQseURBQXlEO2dCQUN6RCwrREFBK0Q7Z0JBQy9ELFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQ2Qsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2pD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LGFBQWEsQ0FBQyxDQUFDO1lBQ2xGLElBQUksU0FBUyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7YUFDbkM7WUFDRCxNQUFNLEdBQUcsVUFBVSxDQUFDLFVBQVcsQ0FBQztTQUNqQzthQUFNO1lBQ0wsdUNBQXVDO1lBQ3ZDLG9EQUFvRDtZQUNwRCx3REFBd0Q7WUFDeEQsSUFBSSxtQkFBbUIsRUFBRTtnQkFDdkIsTUFBTSxHQUFJLGdCQUF3QixDQUFDLFVBQVUsQ0FBQzthQUMvQztpQkFBTTtnQkFDTCxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsV0FBdUIsQ0FBQzthQUNuRDtTQUNGO0tBQ0Y7SUFDRCxPQUFPLE1BQVcsQ0FBQztBQUNyQixDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBa0IsSUFBWSxFQUFFLElBQVc7SUFDckUsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDN0IsV0FBVyxHQUFHLFdBQVcsQ0FBQyxXQUFZLENBQUM7UUFDdkMsU0FBUyxJQUFJLGFBQWEsQ0FBQyxXQUFXLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztLQUNqRjtJQUNELE9BQU8sV0FBZ0IsQ0FBQztBQUMxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Zmlyc3R9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtBcHBsaWNhdGlvblJlZn0gZnJvbSAnLi4vYXBwbGljYXRpb25fcmVmJztcbmltcG9ydCB7RU5WSVJPTk1FTlRfSU5JVElBTElaRVIsIGluamVjdH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge2Fzc2VydERlZmluZWR9IGZyb20gJy4uL3V0aWwvYXNzZXJ0JztcblxuaW1wb3J0IHtyZWFkUGF0Y2hlZExWaWV3fSBmcm9tICcuL2NvbnRleHRfZGlzY292ZXJ5JztcbmltcG9ydCB7Q09OVEFJTkVSX0hFQURFUl9PRkZTRVQsIERFSFlEUkFURURfVklFV1MsIExDb250YWluZXJ9IGZyb20gJy4vaW50ZXJmYWNlcy9jb250YWluZXInO1xuaW1wb3J0IHtUTm9kZSwgVE5vZGVUeXBlfSBmcm9tICcuL2ludGVyZmFjZXMvbm9kZSc7XG5pbXBvcnQge1JFbGVtZW50LCBSTm9kZX0gZnJvbSAnLi9pbnRlcmZhY2VzL3JlbmRlcmVyX2RvbSc7XG5pbXBvcnQge2lzTENvbnRhaW5lciwgaXNSb290Vmlld30gZnJvbSAnLi9pbnRlcmZhY2VzL3R5cGVfY2hlY2tzJztcbmltcG9ydCB7SEVBREVSX09GRlNFVCwgTFZpZXcsIE5naERvbSwgTmdoVmlldywgVFZpZXcsIFRWSUVXfSBmcm9tICcuL2ludGVyZmFjZXMvdmlldyc7XG5pbXBvcnQge2dldE5hdGl2ZUJ5VE5vZGUsIHVud3JhcFJOb2RlfSBmcm9tICcuL3V0aWwvdmlld191dGlscyc7XG5cbi8qKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhIeWRyYXRpb25TdXBwb3J0KCkge1xuICAvLyBOb3RlOiB0aGlzIGZ1bmN0aW9uIGNhbiBhbHNvIGJyaW5nIG1vcmUgZnVuY3Rpb25hbGl0eSBpbiBhIHRyZWUtc2hha2FibGUgd2F5LlxuICAvLyBGb3IgZXhhbXBsZSwgYnkgcHJvdmlkaW5nIGh5ZHJhdGlvbi1hd2FyZSBpbXBsZW1lbnRhdGlvbiBvZiBmaW5kaW5nIG5vZGVzIHZzXG4gIC8vIGNyZWF0aW5nIHRoZW0uXG4gIHJldHVybiBbe1xuICAgIHByb3ZpZGU6IEVOVklST05NRU5UX0lOSVRJQUxJWkVSLFxuICAgIHVzZVZhbHVlOiAoKSA9PiB7XG4gICAgICBjb25zdCBhcHBSZWYgPSBpbmplY3QoQXBwbGljYXRpb25SZWYpO1xuICAgICAgLy8gRklYTUU6IHRoZXJlIGlzIG5vIG5lZWQgdG8gdXNlIGEgdGltZW91dCwgd2UgbmVlZCB0b1xuICAgICAgLy8gdXNlIGEgbGlmZWN5Y2xlIGhvb2sgdG8gc3RhcnQgdGhlIGNsZWFudXAgYWZ0ZXIgYW4gYXBwXG4gICAgICAvLyBiZWNvbWVzIHN0YWJsZSAoc2ltaWxhciB0byBob3cgdGhpcyBpcyBoYW5kbGVkIGF0IFNTUiB0aW1lKS5cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBjbGVhbnVwRGVoeWRyYXRlZFZpZXdzKGFwcFJlZik7XG4gICAgICB9LCAwKTtcbiAgICB9LFxuICAgIG11bHRpOiB0cnVlLFxuICB9XTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldExWaWV3RnJvbVJvb3RFbGVtZW50KGVsZW1lbnQ6IEVsZW1lbnQpOiBMVmlld3xudWxsIHtcbiAgbGV0IGxWaWV3ID0gcmVhZFBhdGNoZWRMVmlldyhlbGVtZW50KTtcbiAgaWYgKGxWaWV3ICYmIGlzUm9vdFZpZXcobFZpZXcpKSB7XG4gICAgbFZpZXcgPSBsVmlld1tIRUFERVJfT0ZGU0VUXTtcbiAgfVxuICByZXR1cm4gbFZpZXc7XG59XG5cbmZ1bmN0aW9uIGNsZWFudXBMQ29udGFpbmVyKGxDb250YWluZXI6IExDb250YWluZXIpIHtcbiAgLy8gVE9ETzogd2UgbWF5IGNvbnNpZGVyIGRvaW5nIGl0IGFuIGVycm9yIGluc3RlYWQ/XG4gIGlmIChsQ29udGFpbmVyW0RFSFlEUkFURURfVklFV1NdKSB7XG4gICAgZm9yIChjb25zdCB2aWV3IG9mIGxDb250YWluZXJbREVIWURSQVRFRF9WSUVXU10pIHtcbiAgICAgIHJlbW92ZURlaHlkcmF0ZWRWaWV3KHZpZXcpO1xuICAgIH1cbiAgfVxuICBmb3IgKGxldCBpID0gQ09OVEFJTkVSX0hFQURFUl9PRkZTRVQ7IGkgPCBsQ29udGFpbmVyLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY2hpbGRWaWV3ID0gbENvbnRhaW5lcltpXSBhcyBMVmlldztcbiAgICBjbGVhbnVwTFZpZXcoY2hpbGRWaWV3KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjbGVhbnVwTFZpZXcobFZpZXc6IExWaWV3KSB7XG4gIGNvbnN0IHRWaWV3ID0gbFZpZXdbVFZJRVddO1xuICBmb3IgKGxldCBpID0gSEVBREVSX09GRlNFVDsgaSA8IHRWaWV3LmJpbmRpbmdTdGFydEluZGV4OyBpKyspIHtcbiAgICBpZiAoaXNMQ29udGFpbmVyKGxWaWV3W2ldKSkge1xuICAgICAgLy8gdGhpcyBpcyBhIGNvbnRhaW5lclxuICAgICAgY29uc3QgbENvbnRhaW5lciA9IGxWaWV3W2ldO1xuICAgICAgY2xlYW51cExDb250YWluZXIobENvbnRhaW5lcik7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFudXBEZWh5ZHJhdGVkVmlld3MoYXBwUmVmOiBBcHBsaWNhdGlvblJlZikge1xuICAvLyBXYWl0IG9uY2UgYW4gYXBwIGJlY29tZXMgc3RhYmxlIGFuZCBjbGVhbnVwIGFsbCB2aWV3cyB0aGF0XG4gIC8vIHdlcmUgbm90IGNsYWltZWQgZHVyaW5nIHRoZSBhcHBsaWNhdGlvbiBib290c3RyYXAgcHJvY2Vzcy5cbiAgcmV0dXJuIGFwcFJlZi5pc1N0YWJsZS5waXBlKGZpcnN0KChpc1N0YWJsZTogYm9vbGVhbikgPT4gaXNTdGFibGUpKS50b1Byb21pc2UoKS50aGVuKCgpID0+IHtcbiAgICBhcHBSZWYuY29tcG9uZW50cy5mb3JFYWNoKChjb21wb25lbnRSZWYpID0+IHtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSBjb21wb25lbnRSZWYubG9jYXRpb24ubmF0aXZlRWxlbWVudDtcbiAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGxWaWV3ID0gZ2V0TFZpZXdGcm9tUm9vdEVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIGlmIChsVmlldyAhPT0gbnVsbCkge1xuICAgICAgICAgIGNsZWFudXBMVmlldyhsVmlldyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIHJlbW92ZSBhbGwgbm9kZXMgZnJvbSBhIGRlaHlkcmF0ZWQgdmlldy5cbiAqL1xuZnVuY3Rpb24gcmVtb3ZlRGVoeWRyYXRlZFZpZXcoZGVoeWRyYXRlZFZpZXc6IE5naFZpZXcpIHtcbiAgbGV0IG5vZGVzUmVtb3ZlZCA9IDA7XG4gIGxldCBjdXJyZW50Uk5vZGUgPSBkZWh5ZHJhdGVkVmlldy5maXJzdENoaWxkO1xuICBjb25zdCBudW1Ob2RlcyA9IGRlaHlkcmF0ZWRWaWV3Lm51bVJvb3ROb2RlcztcbiAgd2hpbGUgKG5vZGVzUmVtb3ZlZCA8IG51bU5vZGVzKSB7XG4gICAgY3VycmVudFJOb2RlLnJlbW92ZSgpO1xuICAgIGN1cnJlbnRSTm9kZSA9IGN1cnJlbnRSTm9kZS5uZXh0U2libGluZyBhcyBIVE1MRWxlbWVudDtcbiAgICBub2Rlc1JlbW92ZWQrKztcbiAgfVxufVxuXG50eXBlIENsYWltZWROb2RlID0ge1xuICBfX2NsYWltZWQ/OiBib29sZWFuXG59O1xuXG4vLyBUT0RPOiBjb25zaWRlciB1c2luZyBXZWFrTWFwIGluc3RlYWQuXG5leHBvcnQgZnVuY3Rpb24gbWFya1JOb2RlQXNDbGFpbWVkRm9ySHlkcmF0aW9uKG5vZGU6IFJOb2RlKSB7XG4gIGlmICghbmdEZXZNb2RlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYWxsaW5nIGBjbGFpbU5vZGVgIGluIHByb2QgbW9kZSBpcyBub3Qgc3VwcG9ydGVkIGFuZCBsaWtlbHkgYSBtaXN0YWtlLicpO1xuICB9XG4gIGlmIChpc1JOb2RlQ2xhaW1lZEZvckh5ZHJhdGlvbihub2RlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVHJ5aW5nIHRvIGNsYWltIGEgbm9kZSwgd2hpY2ggd2FzIGNsYWltZWQgYWxyZWFkeS4nKTtcbiAgfVxuICAobm9kZSBhcyBDbGFpbWVkTm9kZSkuX19jbGFpbWVkID0gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUk5vZGVDbGFpbWVkRm9ySHlkcmF0aW9uKG5vZGU6IFJOb2RlKTogYm9vbGVhbiB7XG4gIHJldHVybiAhIShub2RlIGFzIENsYWltZWROb2RlKS5fX2NsYWltZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kRXhpc3RpbmdOb2RlKGhvc3Q6IE5vZGUsIHBhdGg6IHN0cmluZ1tdKTogUk5vZGUge1xuICBsZXQgbm9kZSA9IGhvc3Q7XG4gIGZvciAoY29uc3Qgb3Agb2YgcGF0aCkge1xuICAgIGlmICghbm9kZSkge1xuICAgICAgLy8gVE9ETzogYWRkIGEgZGV2LW1vZGUgYXNzZXJ0aW9uIGhlcmUuXG4gICAgICBkZWJ1Z2dlcjtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZmluZEV4aXN0aW5nTm9kZTogZmFpbGVkIHRvIGZpbmQgbm9kZSBhdCAke3BhdGh9LmApO1xuICAgIH1cbiAgICBzd2l0Y2ggKG9wKSB7XG4gICAgICBjYXNlICdmaXJzdENoaWxkJzpcbiAgICAgICAgbm9kZSA9IG5vZGUuZmlyc3RDaGlsZCE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbmV4dFNpYmxpbmcnOlxuICAgICAgICBub2RlID0gbm9kZS5uZXh0U2libGluZyE7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBpZiAoIW5vZGUpIHtcbiAgICAvLyBUT0RPOiBhZGQgYSBkZXYtbW9kZSBhc3NlcnRpb24gaGVyZS5cbiAgICBkZWJ1Z2dlcjtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGZpbmRFeGlzdGluZ05vZGU6IGZhaWxlZCB0byBmaW5kIG5vZGUgYXQgJHtwYXRofS5gKTtcbiAgfVxuICByZXR1cm4gbm9kZSBhcyB1bmtub3duIGFzIFJOb2RlO1xufVxuXG5mdW5jdGlvbiBsb2NhdGVSTm9kZUJ5UGF0aChwYXRoOiBzdHJpbmcsIGxWaWV3OiBMVmlldyk6IFJOb2RlIHtcbiAgY29uc3QgcGF0aFBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAvLyBGaXJzdCBlbGVtZW50IGlzIGEgcGFyZW50IG5vZGUgaWQ6IGAxMi5uZXh0U2libGluZy4uLmAuXG4gIGNvbnN0IHBhcmVudEVsZW1lbnRJZCA9IE51bWJlcihwYXRoUGFydHMuc2hpZnQoKSEpO1xuICBjb25zdCBwYXJlbnRSTm9kZSA9IHVud3JhcFJOb2RlKChsVmlldyBhcyBhbnkpW3BhcmVudEVsZW1lbnRJZCArIEhFQURFUl9PRkZTRVRdKTtcbiAgcmV0dXJuIGZpbmRFeGlzdGluZ05vZGUocGFyZW50Uk5vZGUgYXMgRWxlbWVudCwgcGF0aFBhcnRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxvY2F0ZU5leHRSTm9kZTxUIGV4dGVuZHMgUk5vZGU+KFxuICAgIGh5ZHJhdGlvbkluZm86IE5naERvbSwgdFZpZXc6IFRWaWV3LCBsVmlldzogTFZpZXc8dW5rbm93bj4sIHROb2RlOiBUTm9kZSxcbiAgICBwcmV2aW91c1ROb2RlOiBUTm9kZXxudWxsLCBwcmV2aW91c1ROb2RlUGFyZW50OiBib29sZWFuKTogVHxudWxsIHtcbiAgbGV0IG5hdGl2ZTogUk5vZGV8bnVsbCA9IG51bGw7XG4gIGNvbnN0IGFkanVzdGVkSW5kZXggPSB0Tm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVQ7XG4gIGlmIChoeWRyYXRpb25JbmZvLm5vZGVzW2FkanVzdGVkSW5kZXhdKSB7XG4gICAgLy8gV2Uga25vdyBleGFjdCBsb2NhdGlvbiBvZiB0aGUgbm9kZS5cbiAgICBuYXRpdmUgPSBsb2NhdGVSTm9kZUJ5UGF0aChoeWRyYXRpb25JbmZvLm5vZGVzW2FkanVzdGVkSW5kZXhdLCBsVmlldyk7XG4gICAgZGVidWdnZXI7XG4gIH0gZWxzZSBpZiAodFZpZXcuZmlyc3RDaGlsZCA9PT0gdE5vZGUpIHtcbiAgICAvLyBXZSBjcmVhdGUgYSBmaXJzdCBub2RlIGluIHRoaXMgdmlldy5cbiAgICBuYXRpdmUgPSBoeWRyYXRpb25JbmZvLmZpcnN0Q2hpbGQ7XG4gIH0gZWxzZSB7XG4gICAgbmdEZXZNb2RlICYmIGFzc2VydERlZmluZWQocHJldmlvdXNUTm9kZSwgJ1VuZXhwZWN0ZWQgc3RhdGU6IG5vIGN1cnJlbnQgVE5vZGUgZm91bmQuJyk7XG4gICAgY29uc3QgcHJldmlvdXNSRWxlbWVudCA9IGdldE5hdGl2ZUJ5VE5vZGUocHJldmlvdXNUTm9kZSEsIGxWaWV3KSBhcyBSRWxlbWVudDtcbiAgICAvLyBUT0RPOiB3ZSBtYXkgd2FudCB0byB1c2UgdGhpcyBpbnN0ZWFkP1xuICAgIC8vIGNvbnN0IGNsb3Nlc3QgPSBnZXRDbG9zZXN0UkVsZW1lbnQodFZpZXcsIHByZXZpb3VzVE5vZGUsIGxWaWV3KTtcbiAgICBpZiAocHJldmlvdXNUTm9kZVBhcmVudCAmJiBwcmV2aW91c1ROb2RlIS50eXBlID09PSBUTm9kZVR5cGUuRWxlbWVudENvbnRhaW5lcikge1xuICAgICAgLy8gUHJldmlvdXMgbm9kZSB3YXMgYW4gYDxuZy1jb250YWluZXI+YCwgc28gdGhpcyBub2RlIGlzIGEgZmlyc3QgY2hpbGRcbiAgICAgIC8vIHdpdGhpbiBhbiBlbGVtZW50IGNvbnRhaW5lciwgc28gd2UgY2FuIGxvY2F0ZSB0aGUgY29udGFpbmVyIGluIG5naCBkYXRhXG4gICAgICAvLyBzdHJ1Y3R1cmUgYW5kIHVzZSBpdHMgZmlyc3QgY2hpbGQuXG4gICAgICBjb25zdCBzQ29udGFpbmVyID0gaHlkcmF0aW9uSW5mby5jb250YWluZXJzW3ByZXZpb3VzVE5vZGUhLmluZGV4IC0gSEVBREVSX09GRlNFVF07XG4gICAgICBpZiAobmdEZXZNb2RlICYmICFzQ29udGFpbmVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdGF0ZS4nKTtcbiAgICAgIH1cbiAgICAgIG5hdGl2ZSA9IHNDb250YWluZXIuZmlyc3RDaGlsZCE7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZJWE1FOiB0aGlzIGRvZXNuJ3Qgd29yayBmb3IgaTE4biA6KFxuICAgICAgLy8gSW4gaTE4biBjYXNlLCBwcmV2aW91cyB0Tm9kZSBpcyBhIHBhcmVudCBlbGVtZW50LFxuICAgICAgLy8gd2hlbiBpbiBmYWN0LCBpdCBtaWdodCBiZSBhIHRleHQgbm9kZSBpbiBmcm9udCBvZiBpdC5cbiAgICAgIGlmIChwcmV2aW91c1ROb2RlUGFyZW50KSB7XG4gICAgICAgIG5hdGl2ZSA9IChwcmV2aW91c1JFbGVtZW50IGFzIGFueSkuZmlyc3RDaGlsZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5hdGl2ZSA9IHByZXZpb3VzUkVsZW1lbnQubmV4dFNpYmxpbmcgYXMgUkVsZW1lbnQ7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBuYXRpdmUgYXMgVDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpYmxpbmdBZnRlcjxUIGV4dGVuZHMgUk5vZGU+KHNraXA6IG51bWJlciwgZnJvbTogUk5vZGUpOiBUfG51bGwge1xuICBsZXQgY3VycmVudE5vZGUgPSBmcm9tO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHNraXA7IGkrKykge1xuICAgIGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUubmV4dFNpYmxpbmchO1xuICAgIG5nRGV2TW9kZSAmJiBhc3NlcnREZWZpbmVkKGN1cnJlbnROb2RlLCAnRXhwZWN0ZWQgbW9yZSBzaWJsaW5ncyB0byBiZSBwcmVzZW50Jyk7XG4gIH1cbiAgcmV0dXJuIGN1cnJlbnROb2RlIGFzIFQ7XG59XG4iXX0=