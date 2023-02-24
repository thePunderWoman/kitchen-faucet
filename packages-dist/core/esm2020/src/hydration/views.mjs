/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { DEHYDRATED_VIEWS } from '../render3/interfaces/container';
import { MULTIPLIER, NUM_ROOT_NODES, TEMPLATE, VIEWS } from './interfaces';
import { siblingAfter } from './node_lookup_utils';
/**
 * Given a current DOM node and an ngh container definition,
 * walks over the DOM structure, collecting the list of dehydrated views.
 *
 * @param currentRNode
 * @param nghContainer
 */
export function locateDehydratedViewsInContainer(currentRNode, nghContainer) {
    const dehydratedViews = [];
    if (nghContainer[VIEWS]) {
        for (const nghView of nghContainer[VIEWS]) {
            // This pushes the dehydrated views based on the multiplier count to account
            // for the number of instances we should see of a particular view
            for (let i = 0; i < (nghView[MULTIPLIER] ?? 1); i++) {
                const view = { data: nghView };
                if (nghView[NUM_ROOT_NODES] > 0) {
                    // Keep reference to the first node in this view,
                    // so it can be accessed while invoking template instructions.
                    view.firstChild = currentRNode;
                    // Move over to the first node after this view, which can
                    // either be a first node of the next view or an anchor comment
                    // node after the last view in a container.
                    currentRNode = siblingAfter(nghView[NUM_ROOT_NODES], currentRNode);
                }
                dehydratedViews.push(view);
            }
        }
    }
    return [currentRNode, dehydratedViews];
}
/**
 * Reference to a function that searches for a matching dehydrated views
 * stored on a given lContainer.
 * Returns `null` by default, when hydration is not enabled.
 */
let _findMatchingDehydratedViewImpl = (lContainer, template) => null;
function findMatchingDehydratedViewImpl(lContainer, template) {
    let hydrationInfo = null;
    if (lContainer !== null && lContainer[DEHYDRATED_VIEWS]) {
        // Does the target container have a view?
        const dehydratedViews = lContainer[DEHYDRATED_VIEWS];
        if (dehydratedViews.length > 0) {
            // TODO: take into account an index of a view within ViewContainerRef,
            // otherwise, we may end up reusing wrong nodes from live DOM?
            const dehydratedViewIndex = dehydratedViews.findIndex(view => view.data[TEMPLATE] === template);
            if (dehydratedViewIndex > -1) {
                hydrationInfo = dehydratedViews[dehydratedViewIndex];
                // Drop this view from the list of de-hydrated ones.
                dehydratedViews.splice(dehydratedViewIndex, 1);
            }
        }
    }
    return hydrationInfo;
}
export function enableFindMatchingDehydratedViewImpl() {
    _findMatchingDehydratedViewImpl = findMatchingDehydratedViewImpl;
}
export function findMatchingDehydratedView(lContainer, template) {
    return _findMatchingDehydratedViewImpl(lContainer, template);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vdmlld3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFhLE1BQU0saUNBQWlDLENBQUM7QUFJN0UsT0FBTyxFQUFDLFVBQVUsRUFBaUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDeEcsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBR2pEOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxnQ0FBZ0MsQ0FDNUMsWUFBbUIsRUFBRSxZQUEwQjtJQUNqRCxNQUFNLGVBQWUsR0FBc0IsRUFBRSxDQUFDO0lBQzlDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3ZCLEtBQUssTUFBTSxPQUFPLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3pDLDRFQUE0RTtZQUM1RSxpRUFBaUU7WUFDakUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNuRCxNQUFNLElBQUksR0FBb0IsRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLENBQUM7Z0JBQzlDLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDL0IsaURBQWlEO29CQUNqRCw4REFBOEQ7b0JBQzlELElBQUksQ0FBQyxVQUFVLEdBQUcsWUFBMkIsQ0FBQztvQkFFOUMseURBQXlEO29CQUN6RCwrREFBK0Q7b0JBQy9ELDJDQUEyQztvQkFDM0MsWUFBWSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsWUFBd0IsQ0FBRSxDQUFDO2lCQUNqRjtnQkFFRCxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzVCO1NBQ0Y7S0FDRjtJQUVELE9BQU8sQ0FBQyxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDekMsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxJQUFJLCtCQUErQixHQUMvQixDQUFDLFVBQXNCLEVBQUUsUUFBZ0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDO0FBRXZELFNBQVMsOEJBQThCLENBQUMsVUFBc0IsRUFBRSxRQUFnQjtJQUU5RSxJQUFJLGFBQWEsR0FBeUIsSUFBSSxDQUFDO0lBQy9DLElBQUksVUFBVSxLQUFLLElBQUksSUFBSSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtRQUN2RCx5Q0FBeUM7UUFDekMsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDckQsSUFBSSxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM5QixzRUFBc0U7WUFDdEUsOERBQThEO1lBQzlELE1BQU0sbUJBQW1CLEdBQ3JCLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDO1lBRXhFLElBQUksbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLEVBQUU7Z0JBQzVCLGFBQWEsR0FBRyxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFFckQsb0RBQW9EO2dCQUNwRCxlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ2hEO1NBQ0Y7S0FDRjtJQUNELE9BQU8sYUFBYSxDQUFDO0FBQ3ZCLENBQUM7QUFFRCxNQUFNLFVBQVUsb0NBQW9DO0lBQ2xELCtCQUErQixHQUFHLDhCQUE4QixDQUFDO0FBQ25FLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQ3RDLFVBQXNCLEVBQUUsUUFBZ0I7SUFDMUMsT0FBTywrQkFBK0IsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDL0QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0RFSFlEUkFURURfVklFV1MsIExDb250YWluZXJ9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9jb250YWluZXInO1xuaW1wb3J0IHtSRWxlbWVudCwgUk5vZGV9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9yZW5kZXJlcl9kb20nO1xuaW1wb3J0IHtMVmlld30gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3ZpZXcnO1xuXG5pbXBvcnQge01VTFRJUExJRVIsIE5naENvbnRhaW5lciwgTmdoVmlld0luc3RhbmNlLCBOVU1fUk9PVF9OT0RFUywgVEVNUExBVEUsIFZJRVdTfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtzaWJsaW5nQWZ0ZXJ9IGZyb20gJy4vbm9kZV9sb29rdXBfdXRpbHMnO1xuXG5cbi8qKlxuICogR2l2ZW4gYSBjdXJyZW50IERPTSBub2RlIGFuZCBhbiBuZ2ggY29udGFpbmVyIGRlZmluaXRpb24sXG4gKiB3YWxrcyBvdmVyIHRoZSBET00gc3RydWN0dXJlLCBjb2xsZWN0aW5nIHRoZSBsaXN0IG9mIGRlaHlkcmF0ZWQgdmlld3MuXG4gKlxuICogQHBhcmFtIGN1cnJlbnRSTm9kZVxuICogQHBhcmFtIG5naENvbnRhaW5lclxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRlRGVoeWRyYXRlZFZpZXdzSW5Db250YWluZXIoXG4gICAgY3VycmVudFJOb2RlOiBSTm9kZSwgbmdoQ29udGFpbmVyOiBOZ2hDb250YWluZXIpOiBbUk5vZGUsIE5naFZpZXdJbnN0YW5jZVtdXSB7XG4gIGNvbnN0IGRlaHlkcmF0ZWRWaWV3czogTmdoVmlld0luc3RhbmNlW10gPSBbXTtcbiAgaWYgKG5naENvbnRhaW5lcltWSUVXU10pIHtcbiAgICBmb3IgKGNvbnN0IG5naFZpZXcgb2YgbmdoQ29udGFpbmVyW1ZJRVdTXSkge1xuICAgICAgLy8gVGhpcyBwdXNoZXMgdGhlIGRlaHlkcmF0ZWQgdmlld3MgYmFzZWQgb24gdGhlIG11bHRpcGxpZXIgY291bnQgdG8gYWNjb3VudFxuICAgICAgLy8gZm9yIHRoZSBudW1iZXIgb2YgaW5zdGFuY2VzIHdlIHNob3VsZCBzZWUgb2YgYSBwYXJ0aWN1bGFyIHZpZXdcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgKG5naFZpZXdbTVVMVElQTElFUl0gPz8gMSk7IGkrKykge1xuICAgICAgICBjb25zdCB2aWV3OiBOZ2hWaWV3SW5zdGFuY2UgPSB7ZGF0YTogbmdoVmlld307XG4gICAgICAgIGlmIChuZ2hWaWV3W05VTV9ST09UX05PREVTXSA+IDApIHtcbiAgICAgICAgICAvLyBLZWVwIHJlZmVyZW5jZSB0byB0aGUgZmlyc3Qgbm9kZSBpbiB0aGlzIHZpZXcsXG4gICAgICAgICAgLy8gc28gaXQgY2FuIGJlIGFjY2Vzc2VkIHdoaWxlIGludm9raW5nIHRlbXBsYXRlIGluc3RydWN0aW9ucy5cbiAgICAgICAgICB2aWV3LmZpcnN0Q2hpbGQgPSBjdXJyZW50Uk5vZGUgYXMgSFRNTEVsZW1lbnQ7XG5cbiAgICAgICAgICAvLyBNb3ZlIG92ZXIgdG8gdGhlIGZpcnN0IG5vZGUgYWZ0ZXIgdGhpcyB2aWV3LCB3aGljaCBjYW5cbiAgICAgICAgICAvLyBlaXRoZXIgYmUgYSBmaXJzdCBub2RlIG9mIHRoZSBuZXh0IHZpZXcgb3IgYW4gYW5jaG9yIGNvbW1lbnRcbiAgICAgICAgICAvLyBub2RlIGFmdGVyIHRoZSBsYXN0IHZpZXcgaW4gYSBjb250YWluZXIuXG4gICAgICAgICAgY3VycmVudFJOb2RlID0gc2libGluZ0FmdGVyKG5naFZpZXdbTlVNX1JPT1RfTk9ERVNdLCBjdXJyZW50Uk5vZGUgYXMgUkVsZW1lbnQpITtcbiAgICAgICAgfVxuXG4gICAgICAgIGRlaHlkcmF0ZWRWaWV3cy5wdXNoKHZpZXcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbY3VycmVudFJOb2RlLCBkZWh5ZHJhdGVkVmlld3NdO1xufVxuXG4vKipcbiAqIFJlZmVyZW5jZSB0byBhIGZ1bmN0aW9uIHRoYXQgc2VhcmNoZXMgZm9yIGEgbWF0Y2hpbmcgZGVoeWRyYXRlZCB2aWV3c1xuICogc3RvcmVkIG9uIGEgZ2l2ZW4gbENvbnRhaW5lci5cbiAqIFJldHVybnMgYG51bGxgIGJ5IGRlZmF1bHQsIHdoZW4gaHlkcmF0aW9uIGlzIG5vdCBlbmFibGVkLlxuICovXG5sZXQgX2ZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3SW1wbDogdHlwZW9mIGZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3SW1wbCA9XG4gICAgKGxDb250YWluZXI6IExDb250YWluZXIsIHRlbXBsYXRlOiBzdHJpbmcpID0+IG51bGw7XG5cbmZ1bmN0aW9uIGZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3SW1wbChsQ29udGFpbmVyOiBMQ29udGFpbmVyLCB0ZW1wbGF0ZTogc3RyaW5nKTogTmdoVmlld0luc3RhbmNlfFxuICAgIG51bGwge1xuICBsZXQgaHlkcmF0aW9uSW5mbzogTmdoVmlld0luc3RhbmNlfG51bGwgPSBudWxsO1xuICBpZiAobENvbnRhaW5lciAhPT0gbnVsbCAmJiBsQ29udGFpbmVyW0RFSFlEUkFURURfVklFV1NdKSB7XG4gICAgLy8gRG9lcyB0aGUgdGFyZ2V0IGNvbnRhaW5lciBoYXZlIGEgdmlldz9cbiAgICBjb25zdCBkZWh5ZHJhdGVkVmlld3MgPSBsQ29udGFpbmVyW0RFSFlEUkFURURfVklFV1NdO1xuICAgIGlmIChkZWh5ZHJhdGVkVmlld3MubGVuZ3RoID4gMCkge1xuICAgICAgLy8gVE9ETzogdGFrZSBpbnRvIGFjY291bnQgYW4gaW5kZXggb2YgYSB2aWV3IHdpdGhpbiBWaWV3Q29udGFpbmVyUmVmLFxuICAgICAgLy8gb3RoZXJ3aXNlLCB3ZSBtYXkgZW5kIHVwIHJldXNpbmcgd3Jvbmcgbm9kZXMgZnJvbSBsaXZlIERPTT9cbiAgICAgIGNvbnN0IGRlaHlkcmF0ZWRWaWV3SW5kZXggPVxuICAgICAgICAgIGRlaHlkcmF0ZWRWaWV3cy5maW5kSW5kZXgodmlldyA9PiB2aWV3LmRhdGFbVEVNUExBVEVdID09PSB0ZW1wbGF0ZSk7XG5cbiAgICAgIGlmIChkZWh5ZHJhdGVkVmlld0luZGV4ID4gLTEpIHtcbiAgICAgICAgaHlkcmF0aW9uSW5mbyA9IGRlaHlkcmF0ZWRWaWV3c1tkZWh5ZHJhdGVkVmlld0luZGV4XTtcblxuICAgICAgICAvLyBEcm9wIHRoaXMgdmlldyBmcm9tIHRoZSBsaXN0IG9mIGRlLWh5ZHJhdGVkIG9uZXMuXG4gICAgICAgIGRlaHlkcmF0ZWRWaWV3cy5zcGxpY2UoZGVoeWRyYXRlZFZpZXdJbmRleCwgMSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBoeWRyYXRpb25JbmZvO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZW5hYmxlRmluZE1hdGNoaW5nRGVoeWRyYXRlZFZpZXdJbXBsKCkge1xuICBfZmluZE1hdGNoaW5nRGVoeWRyYXRlZFZpZXdJbXBsID0gZmluZE1hdGNoaW5nRGVoeWRyYXRlZFZpZXdJbXBsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZE1hdGNoaW5nRGVoeWRyYXRlZFZpZXcoXG4gICAgbENvbnRhaW5lcjogTENvbnRhaW5lciwgdGVtcGxhdGU6IHN0cmluZyk6IE5naFZpZXdJbnN0YW5jZXxudWxsIHtcbiAgcmV0dXJuIF9maW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGwobENvbnRhaW5lciwgdGVtcGxhdGUpO1xufVxuIl19