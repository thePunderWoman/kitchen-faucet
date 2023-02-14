/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { first } from 'rxjs/operators';
import { retrieveViewsFromApplicationRef } from '../application_ref';
import { CONTAINER_HEADER_OFFSET, DEHYDRATED_VIEWS } from '../render3/interfaces/container';
import { isLContainer } from '../render3/interfaces/type_checks';
import { HEADER_OFFSET, HOST, TVIEW } from '../render3/interfaces/view';
import { NUM_ROOT_NODES } from './interfaces';
import { getComponentLView } from './utils';
export function cleanupDehydratedViews(appRef) {
    // Wait once an app becomes stable and cleanup all views that
    // were not claimed during the application bootstrap process.
    return appRef.isStable.pipe(first((isStable) => isStable)).toPromise().then(() => {
        const viewRefs = retrieveViewsFromApplicationRef(appRef);
        for (const viewRef of viewRefs) {
            const lView = getComponentLView(viewRef);
            // TODO: make sure that this lView represents
            // a component instance.
            const hostElement = lView[HOST];
            if (hostElement) {
                cleanupLView(lView);
                ngDevMode && ngDevMode.postHydrationCleanupRuns++;
            }
        }
    });
}
function cleanupLContainer(lContainer) {
    // TODO: should we consider logging a warning here for cases
    // where there is something to cleanup, i.e. there was a delta
    // between a server and a client?
    if (lContainer[DEHYDRATED_VIEWS]) {
        const retainedViews = [];
        for (const view of lContainer[DEHYDRATED_VIEWS]) {
            // FIXME: this is a temporary check to keep "lazy" components
            // from being removed. This code is **only** needed for testing
            // purposes and must be removed. Instead, we should rely on
            // a flag (like `lazy: true`) that should be included into
            // the dehydrated view object (added as a part of serialization).
            const firstChild = view.firstChild;
            if (firstChild &&
                (firstChild.nodeType !== Node.ELEMENT_NODE || !firstChild.hasAttribute('lazy'))) {
                removeDehydratedView(view);
            }
            else {
                retainedViews.push(view);
            }
        }
        lContainer[DEHYDRATED_VIEWS] = retainedViews.length > 0 ? retainedViews : null;
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
            const lContainer = lView[i];
            cleanupLContainer(lContainer);
        }
        else if (Array.isArray(lView[i])) {
            // This is a component, enter the `cleanupLView` recursively.
            cleanupLView(lView[i]);
        }
    }
}
/**
 * Helper function to remove all nodes from a dehydrated view.
 */
function removeDehydratedView(dehydratedView) {
    let nodesRemoved = 0;
    let currentRNode = dehydratedView.firstChild;
    if (currentRNode) {
        const numNodes = dehydratedView[NUM_ROOT_NODES];
        while (nodesRemoved < numNodes) {
            const nextSibling = currentRNode.nextSibling;
            currentRNode.remove();
            currentRNode = nextSibling;
            nodesRemoved++;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xlYW51cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvcmUvc3JjL2h5ZHJhdGlvbi9jbGVhbnVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVyQyxPQUFPLEVBQWlCLCtCQUErQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDbkYsT0FBTyxFQUFDLHVCQUF1QixFQUFFLGdCQUFnQixFQUFhLE1BQU0saUNBQWlDLENBQUM7QUFDdEcsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBQyxhQUFhLEVBQUUsSUFBSSxFQUFTLEtBQUssRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBRTdFLE9BQU8sRUFBVSxjQUFjLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDckQsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sU0FBUyxDQUFDO0FBRTFDLE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxNQUFzQjtJQUMzRCw2REFBNkQ7SUFDN0QsNkRBQTZEO0lBQzdELE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBaUIsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ3hGLE1BQU0sUUFBUSxHQUFHLCtCQUErQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pELEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO1lBQzlCLE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3pDLDZDQUE2QztZQUM3Qyx3QkFBd0I7WUFDeEIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hDLElBQUksV0FBVyxFQUFFO2dCQUNmLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDcEIsU0FBUyxJQUFJLFNBQVMsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2FBQ25EO1NBQ0Y7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLFVBQXNCO0lBQy9DLDREQUE0RDtJQUM1RCw4REFBOEQ7SUFDOUQsaUNBQWlDO0lBQ2pDLElBQUksVUFBVSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7UUFDaEMsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLEtBQUssTUFBTSxJQUFJLElBQUksVUFBVSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7WUFDL0MsNkRBQTZEO1lBQzdELCtEQUErRDtZQUMvRCwyREFBMkQ7WUFDM0QsMERBQTBEO1lBQzFELGlFQUFpRTtZQUNqRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ25DLElBQUksVUFBVTtnQkFDVixDQUFDLFVBQVUsQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRTtnQkFDbkYsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDNUI7aUJBQU07Z0JBQ0wsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMxQjtTQUNGO1FBQ0QsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0tBQ2hGO0lBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyx1QkFBdUIsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNoRSxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFVLENBQUM7UUFDekMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ3pCO0FBQ0gsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLEtBQVk7SUFDaEMsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsYUFBYSxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDNUQsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDMUIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVCLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQy9CO2FBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2xDLDZEQUE2RDtZQUM3RCxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDeEI7S0FDRjtBQUNILENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsb0JBQW9CLENBQUMsY0FBdUI7SUFDbkQsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLElBQUksWUFBWSxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUM7SUFDN0MsSUFBSSxZQUFZLEVBQUU7UUFDaEIsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ2hELE9BQU8sWUFBWSxHQUFHLFFBQVEsRUFBRTtZQUM5QixNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsV0FBMEIsQ0FBQztZQUM1RCxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdEIsWUFBWSxHQUFHLFdBQVcsQ0FBQztZQUMzQixZQUFZLEVBQUUsQ0FBQztTQUNoQjtLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2ZpcnN0fSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7QXBwbGljYXRpb25SZWYsIHJldHJpZXZlVmlld3NGcm9tQXBwbGljYXRpb25SZWZ9IGZyb20gJy4uL2FwcGxpY2F0aW9uX3JlZic7XG5pbXBvcnQge0NPTlRBSU5FUl9IRUFERVJfT0ZGU0VULCBERUhZRFJBVEVEX1ZJRVdTLCBMQ29udGFpbmVyfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvY29udGFpbmVyJztcbmltcG9ydCB7aXNMQ29udGFpbmVyfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvdHlwZV9jaGVja3MnO1xuaW1wb3J0IHtIRUFERVJfT0ZGU0VULCBIT1NULCBMVmlldywgVFZJRVd9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy92aWV3JztcblxuaW1wb3J0IHtOZ2hWaWV3LCBOVU1fUk9PVF9OT0RFU30gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7Z2V0Q29tcG9uZW50TFZpZXd9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgZnVuY3Rpb24gY2xlYW51cERlaHlkcmF0ZWRWaWV3cyhhcHBSZWY6IEFwcGxpY2F0aW9uUmVmKSB7XG4gIC8vIFdhaXQgb25jZSBhbiBhcHAgYmVjb21lcyBzdGFibGUgYW5kIGNsZWFudXAgYWxsIHZpZXdzIHRoYXRcbiAgLy8gd2VyZSBub3QgY2xhaW1lZCBkdXJpbmcgdGhlIGFwcGxpY2F0aW9uIGJvb3RzdHJhcCBwcm9jZXNzLlxuICByZXR1cm4gYXBwUmVmLmlzU3RhYmxlLnBpcGUoZmlyc3QoKGlzU3RhYmxlOiBib29sZWFuKSA9PiBpc1N0YWJsZSkpLnRvUHJvbWlzZSgpLnRoZW4oKCkgPT4ge1xuICAgIGNvbnN0IHZpZXdSZWZzID0gcmV0cmlldmVWaWV3c0Zyb21BcHBsaWNhdGlvblJlZihhcHBSZWYpO1xuICAgIGZvciAoY29uc3Qgdmlld1JlZiBvZiB2aWV3UmVmcykge1xuICAgICAgY29uc3QgbFZpZXcgPSBnZXRDb21wb25lbnRMVmlldyh2aWV3UmVmKTtcbiAgICAgIC8vIFRPRE86IG1ha2Ugc3VyZSB0aGF0IHRoaXMgbFZpZXcgcmVwcmVzZW50c1xuICAgICAgLy8gYSBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAgICBjb25zdCBob3N0RWxlbWVudCA9IGxWaWV3W0hPU1RdO1xuICAgICAgaWYgKGhvc3RFbGVtZW50KSB7XG4gICAgICAgIGNsZWFudXBMVmlldyhsVmlldyk7XG4gICAgICAgIG5nRGV2TW9kZSAmJiBuZ0Rldk1vZGUucG9zdEh5ZHJhdGlvbkNsZWFudXBSdW5zKys7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gY2xlYW51cExDb250YWluZXIobENvbnRhaW5lcjogTENvbnRhaW5lcikge1xuICAvLyBUT0RPOiBzaG91bGQgd2UgY29uc2lkZXIgbG9nZ2luZyBhIHdhcm5pbmcgaGVyZSBmb3IgY2FzZXNcbiAgLy8gd2hlcmUgdGhlcmUgaXMgc29tZXRoaW5nIHRvIGNsZWFudXAsIGkuZS4gdGhlcmUgd2FzIGEgZGVsdGFcbiAgLy8gYmV0d2VlbiBhIHNlcnZlciBhbmQgYSBjbGllbnQ/XG4gIGlmIChsQ29udGFpbmVyW0RFSFlEUkFURURfVklFV1NdKSB7XG4gICAgY29uc3QgcmV0YWluZWRWaWV3cyA9IFtdO1xuICAgIGZvciAoY29uc3QgdmlldyBvZiBsQ29udGFpbmVyW0RFSFlEUkFURURfVklFV1NdKSB7XG4gICAgICAvLyBGSVhNRTogdGhpcyBpcyBhIHRlbXBvcmFyeSBjaGVjayB0byBrZWVwIFwibGF6eVwiIGNvbXBvbmVudHNcbiAgICAgIC8vIGZyb20gYmVpbmcgcmVtb3ZlZC4gVGhpcyBjb2RlIGlzICoqb25seSoqIG5lZWRlZCBmb3IgdGVzdGluZ1xuICAgICAgLy8gcHVycG9zZXMgYW5kIG11c3QgYmUgcmVtb3ZlZC4gSW5zdGVhZCwgd2Ugc2hvdWxkIHJlbHkgb25cbiAgICAgIC8vIGEgZmxhZyAobGlrZSBgbGF6eTogdHJ1ZWApIHRoYXQgc2hvdWxkIGJlIGluY2x1ZGVkIGludG9cbiAgICAgIC8vIHRoZSBkZWh5ZHJhdGVkIHZpZXcgb2JqZWN0IChhZGRlZCBhcyBhIHBhcnQgb2Ygc2VyaWFsaXphdGlvbikuXG4gICAgICBjb25zdCBmaXJzdENoaWxkID0gdmlldy5maXJzdENoaWxkO1xuICAgICAgaWYgKGZpcnN0Q2hpbGQgJiZcbiAgICAgICAgICAoZmlyc3RDaGlsZC5ub2RlVHlwZSAhPT0gTm9kZS5FTEVNRU5UX05PREUgfHwgIWZpcnN0Q2hpbGQuaGFzQXR0cmlidXRlKCdsYXp5JykpKSB7XG4gICAgICAgIHJlbW92ZURlaHlkcmF0ZWRWaWV3KHZpZXcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0YWluZWRWaWV3cy5wdXNoKHZpZXcpO1xuICAgICAgfVxuICAgIH1cbiAgICBsQ29udGFpbmVyW0RFSFlEUkFURURfVklFV1NdID0gcmV0YWluZWRWaWV3cy5sZW5ndGggPiAwID8gcmV0YWluZWRWaWV3cyA6IG51bGw7XG4gIH1cbiAgZm9yIChsZXQgaSA9IENPTlRBSU5FUl9IRUFERVJfT0ZGU0VUOyBpIDwgbENvbnRhaW5lci5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNoaWxkVmlldyA9IGxDb250YWluZXJbaV0gYXMgTFZpZXc7XG4gICAgY2xlYW51cExWaWV3KGNoaWxkVmlldyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2xlYW51cExWaWV3KGxWaWV3OiBMVmlldykge1xuICBjb25zdCB0VmlldyA9IGxWaWV3W1RWSUVXXTtcbiAgZm9yIChsZXQgaSA9IEhFQURFUl9PRkZTRVQ7IGkgPCB0Vmlldy5iaW5kaW5nU3RhcnRJbmRleDsgaSsrKSB7XG4gICAgaWYgKGlzTENvbnRhaW5lcihsVmlld1tpXSkpIHtcbiAgICAgIGNvbnN0IGxDb250YWluZXIgPSBsVmlld1tpXTtcbiAgICAgIGNsZWFudXBMQ29udGFpbmVyKGxDb250YWluZXIpO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShsVmlld1tpXSkpIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBjb21wb25lbnQsIGVudGVyIHRoZSBgY2xlYW51cExWaWV3YCByZWN1cnNpdmVseS5cbiAgICAgIGNsZWFudXBMVmlldyhsVmlld1tpXSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIHJlbW92ZSBhbGwgbm9kZXMgZnJvbSBhIGRlaHlkcmF0ZWQgdmlldy5cbiAqL1xuZnVuY3Rpb24gcmVtb3ZlRGVoeWRyYXRlZFZpZXcoZGVoeWRyYXRlZFZpZXc6IE5naFZpZXcpIHtcbiAgbGV0IG5vZGVzUmVtb3ZlZCA9IDA7XG4gIGxldCBjdXJyZW50Uk5vZGUgPSBkZWh5ZHJhdGVkVmlldy5maXJzdENoaWxkO1xuICBpZiAoY3VycmVudFJOb2RlKSB7XG4gICAgY29uc3QgbnVtTm9kZXMgPSBkZWh5ZHJhdGVkVmlld1tOVU1fUk9PVF9OT0RFU107XG4gICAgd2hpbGUgKG5vZGVzUmVtb3ZlZCA8IG51bU5vZGVzKSB7XG4gICAgICBjb25zdCBuZXh0U2libGluZyA9IGN1cnJlbnRSTm9kZS5uZXh0U2libGluZyBhcyBIVE1MRWxlbWVudDtcbiAgICAgIGN1cnJlbnRSTm9kZS5yZW1vdmUoKTtcbiAgICAgIGN1cnJlbnRSTm9kZSA9IG5leHRTaWJsaW5nO1xuICAgICAgbm9kZXNSZW1vdmVkKys7XG4gICAgfVxuICB9XG59XG4iXX0=