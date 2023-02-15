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
        const numNodes = dehydratedView.data[NUM_ROOT_NODES];
        while (nodesRemoved < numNodes) {
            const nextSibling = currentRNode.nextSibling;
            currentRNode.remove();
            currentRNode = nextSibling;
            nodesRemoved++;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xlYW51cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvcmUvc3JjL2h5ZHJhdGlvbi9jbGVhbnVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVyQyxPQUFPLEVBQWlCLCtCQUErQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDbkYsT0FBTyxFQUFDLHVCQUF1QixFQUFFLGdCQUFnQixFQUFhLE1BQU0saUNBQWlDLENBQUM7QUFDdEcsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBQyxhQUFhLEVBQUUsSUFBSSxFQUFTLEtBQUssRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBRTdFLE9BQU8sRUFBa0IsY0FBYyxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQzdELE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLFNBQVMsQ0FBQztBQUUxQyxNQUFNLFVBQVUsc0JBQXNCLENBQUMsTUFBc0I7SUFDM0QsNkRBQTZEO0lBQzdELDZEQUE2RDtJQUM3RCxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQWlCLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUN4RixNQUFNLFFBQVEsR0FBRywrQkFBK0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6RCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRTtZQUM5QixNQUFNLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6Qyw2Q0FBNkM7WUFDN0Msd0JBQXdCO1lBQ3hCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxJQUFJLFdBQVcsRUFBRTtnQkFDZixZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3BCLFNBQVMsSUFBSSxTQUFTLENBQUMsd0JBQXdCLEVBQUUsQ0FBQzthQUNuRDtTQUNGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxVQUFzQjtJQUMvQyw0REFBNEQ7SUFDNUQsOERBQThEO0lBQzlELGlDQUFpQztJQUNqQyxJQUFJLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1FBQ2hDLE1BQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQztRQUN6QixLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQy9DLDZEQUE2RDtZQUM3RCwrREFBK0Q7WUFDL0QsMkRBQTJEO1lBQzNELDBEQUEwRDtZQUMxRCxpRUFBaUU7WUFDakUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNuQyxJQUFJLFVBQVU7Z0JBQ1YsQ0FBQyxVQUFVLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUU7Z0JBQ25GLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzVCO2lCQUFNO2dCQUNMLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDMUI7U0FDRjtRQUNELFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztLQUNoRjtJQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsdUJBQXVCLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDaEUsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBVSxDQUFDO1FBQ3pDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUN6QjtBQUNILENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxLQUFZO0lBQ2hDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzQixLQUFLLElBQUksQ0FBQyxHQUFHLGFBQWEsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzVELElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzFCLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUMvQjthQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNsQyw2REFBNkQ7WUFDN0QsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3hCO0tBQ0Y7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLG9CQUFvQixDQUFDLGNBQStCO0lBQzNELElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztJQUNyQixJQUFJLFlBQVksR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDO0lBQzdDLElBQUksWUFBWSxFQUFFO1FBQ2hCLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDckQsT0FBTyxZQUFZLEdBQUcsUUFBUSxFQUFFO1lBQzlCLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyxXQUEwQixDQUFDO1lBQzVELFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QixZQUFZLEdBQUcsV0FBVyxDQUFDO1lBQzNCLFlBQVksRUFBRSxDQUFDO1NBQ2hCO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Zmlyc3R9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtBcHBsaWNhdGlvblJlZiwgcmV0cmlldmVWaWV3c0Zyb21BcHBsaWNhdGlvblJlZn0gZnJvbSAnLi4vYXBwbGljYXRpb25fcmVmJztcbmltcG9ydCB7Q09OVEFJTkVSX0hFQURFUl9PRkZTRVQsIERFSFlEUkFURURfVklFV1MsIExDb250YWluZXJ9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9jb250YWluZXInO1xuaW1wb3J0IHtpc0xDb250YWluZXJ9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy90eXBlX2NoZWNrcyc7XG5pbXBvcnQge0hFQURFUl9PRkZTRVQsIEhPU1QsIExWaWV3LCBUVklFV30gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3ZpZXcnO1xuXG5pbXBvcnQge05naFZpZXdJbnN0YW5jZSwgTlVNX1JPT1RfTk9ERVN9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge2dldENvbXBvbmVudExWaWV3fSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFudXBEZWh5ZHJhdGVkVmlld3MoYXBwUmVmOiBBcHBsaWNhdGlvblJlZikge1xuICAvLyBXYWl0IG9uY2UgYW4gYXBwIGJlY29tZXMgc3RhYmxlIGFuZCBjbGVhbnVwIGFsbCB2aWV3cyB0aGF0XG4gIC8vIHdlcmUgbm90IGNsYWltZWQgZHVyaW5nIHRoZSBhcHBsaWNhdGlvbiBib290c3RyYXAgcHJvY2Vzcy5cbiAgcmV0dXJuIGFwcFJlZi5pc1N0YWJsZS5waXBlKGZpcnN0KChpc1N0YWJsZTogYm9vbGVhbikgPT4gaXNTdGFibGUpKS50b1Byb21pc2UoKS50aGVuKCgpID0+IHtcbiAgICBjb25zdCB2aWV3UmVmcyA9IHJldHJpZXZlVmlld3NGcm9tQXBwbGljYXRpb25SZWYoYXBwUmVmKTtcbiAgICBmb3IgKGNvbnN0IHZpZXdSZWYgb2Ygdmlld1JlZnMpIHtcbiAgICAgIGNvbnN0IGxWaWV3ID0gZ2V0Q29tcG9uZW50TFZpZXcodmlld1JlZik7XG4gICAgICAvLyBUT0RPOiBtYWtlIHN1cmUgdGhhdCB0aGlzIGxWaWV3IHJlcHJlc2VudHNcbiAgICAgIC8vIGEgY29tcG9uZW50IGluc3RhbmNlLlxuICAgICAgY29uc3QgaG9zdEVsZW1lbnQgPSBsVmlld1tIT1NUXTtcbiAgICAgIGlmIChob3N0RWxlbWVudCkge1xuICAgICAgICBjbGVhbnVwTFZpZXcobFZpZXcpO1xuICAgICAgICBuZ0Rldk1vZGUgJiYgbmdEZXZNb2RlLnBvc3RIeWRyYXRpb25DbGVhbnVwUnVucysrO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNsZWFudXBMQ29udGFpbmVyKGxDb250YWluZXI6IExDb250YWluZXIpIHtcbiAgLy8gVE9ETzogc2hvdWxkIHdlIGNvbnNpZGVyIGxvZ2dpbmcgYSB3YXJuaW5nIGhlcmUgZm9yIGNhc2VzXG4gIC8vIHdoZXJlIHRoZXJlIGlzIHNvbWV0aGluZyB0byBjbGVhbnVwLCBpLmUuIHRoZXJlIHdhcyBhIGRlbHRhXG4gIC8vIGJldHdlZW4gYSBzZXJ2ZXIgYW5kIGEgY2xpZW50P1xuICBpZiAobENvbnRhaW5lcltERUhZRFJBVEVEX1ZJRVdTXSkge1xuICAgIGNvbnN0IHJldGFpbmVkVmlld3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IHZpZXcgb2YgbENvbnRhaW5lcltERUhZRFJBVEVEX1ZJRVdTXSkge1xuICAgICAgLy8gRklYTUU6IHRoaXMgaXMgYSB0ZW1wb3JhcnkgY2hlY2sgdG8ga2VlcCBcImxhenlcIiBjb21wb25lbnRzXG4gICAgICAvLyBmcm9tIGJlaW5nIHJlbW92ZWQuIFRoaXMgY29kZSBpcyAqKm9ubHkqKiBuZWVkZWQgZm9yIHRlc3RpbmdcbiAgICAgIC8vIHB1cnBvc2VzIGFuZCBtdXN0IGJlIHJlbW92ZWQuIEluc3RlYWQsIHdlIHNob3VsZCByZWx5IG9uXG4gICAgICAvLyBhIGZsYWcgKGxpa2UgYGxhenk6IHRydWVgKSB0aGF0IHNob3VsZCBiZSBpbmNsdWRlZCBpbnRvXG4gICAgICAvLyB0aGUgZGVoeWRyYXRlZCB2aWV3IG9iamVjdCAoYWRkZWQgYXMgYSBwYXJ0IG9mIHNlcmlhbGl6YXRpb24pLlxuICAgICAgY29uc3QgZmlyc3RDaGlsZCA9IHZpZXcuZmlyc3RDaGlsZDtcbiAgICAgIGlmIChmaXJzdENoaWxkICYmXG4gICAgICAgICAgKGZpcnN0Q2hpbGQubm9kZVR5cGUgIT09IE5vZGUuRUxFTUVOVF9OT0RFIHx8ICFmaXJzdENoaWxkLmhhc0F0dHJpYnV0ZSgnbGF6eScpKSkge1xuICAgICAgICByZW1vdmVEZWh5ZHJhdGVkVmlldyh2aWV3KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldGFpbmVkVmlld3MucHVzaCh2aWV3KTtcbiAgICAgIH1cbiAgICB9XG4gICAgbENvbnRhaW5lcltERUhZRFJBVEVEX1ZJRVdTXSA9IHJldGFpbmVkVmlld3MubGVuZ3RoID4gMCA/IHJldGFpbmVkVmlld3MgOiBudWxsO1xuICB9XG4gIGZvciAobGV0IGkgPSBDT05UQUlORVJfSEVBREVSX09GRlNFVDsgaSA8IGxDb250YWluZXIubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjaGlsZFZpZXcgPSBsQ29udGFpbmVyW2ldIGFzIExWaWV3O1xuICAgIGNsZWFudXBMVmlldyhjaGlsZFZpZXcpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFudXBMVmlldyhsVmlldzogTFZpZXcpIHtcbiAgY29uc3QgdFZpZXcgPSBsVmlld1tUVklFV107XG4gIGZvciAobGV0IGkgPSBIRUFERVJfT0ZGU0VUOyBpIDwgdFZpZXcuYmluZGluZ1N0YXJ0SW5kZXg7IGkrKykge1xuICAgIGlmIChpc0xDb250YWluZXIobFZpZXdbaV0pKSB7XG4gICAgICBjb25zdCBsQ29udGFpbmVyID0gbFZpZXdbaV07XG4gICAgICBjbGVhbnVwTENvbnRhaW5lcihsQ29udGFpbmVyKTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkobFZpZXdbaV0pKSB7XG4gICAgICAvLyBUaGlzIGlzIGEgY29tcG9uZW50LCBlbnRlciB0aGUgYGNsZWFudXBMVmlld2AgcmVjdXJzaXZlbHkuXG4gICAgICBjbGVhbnVwTFZpZXcobFZpZXdbaV0pO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byByZW1vdmUgYWxsIG5vZGVzIGZyb20gYSBkZWh5ZHJhdGVkIHZpZXcuXG4gKi9cbmZ1bmN0aW9uIHJlbW92ZURlaHlkcmF0ZWRWaWV3KGRlaHlkcmF0ZWRWaWV3OiBOZ2hWaWV3SW5zdGFuY2UpIHtcbiAgbGV0IG5vZGVzUmVtb3ZlZCA9IDA7XG4gIGxldCBjdXJyZW50Uk5vZGUgPSBkZWh5ZHJhdGVkVmlldy5maXJzdENoaWxkO1xuICBpZiAoY3VycmVudFJOb2RlKSB7XG4gICAgY29uc3QgbnVtTm9kZXMgPSBkZWh5ZHJhdGVkVmlldy5kYXRhW05VTV9ST09UX05PREVTXTtcbiAgICB3aGlsZSAobm9kZXNSZW1vdmVkIDwgbnVtTm9kZXMpIHtcbiAgICAgIGNvbnN0IG5leHRTaWJsaW5nID0gY3VycmVudFJOb2RlLm5leHRTaWJsaW5nIGFzIEhUTUxFbGVtZW50O1xuICAgICAgY3VycmVudFJOb2RlLnJlbW92ZSgpO1xuICAgICAgY3VycmVudFJOb2RlID0gbmV4dFNpYmxpbmc7XG4gICAgICBub2Rlc1JlbW92ZWQrKztcbiAgICB9XG4gIH1cbn1cbiJdfQ==