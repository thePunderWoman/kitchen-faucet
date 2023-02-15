/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { assertRComment } from '../render3/assert';
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
    ngDevMode && assertRComment(currentRNode, 'Expecting a comment node as a view container anchor');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vdmlld3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxnQkFBZ0IsRUFBYSxNQUFNLGlDQUFpQyxDQUFDO0FBRzdFLE9BQU8sRUFBQyxVQUFVLEVBQTBDLGNBQWMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQ2pILE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUdqRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLFVBQVUsZ0NBQWdDLENBQzVDLFlBQW1CLEVBQUUsWUFBMEI7SUFDakQsTUFBTSxlQUFlLEdBQXNCLEVBQUUsQ0FBQztJQUM5QyxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUN2QixLQUFLLE1BQU0sT0FBTyxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN6Qyw0RUFBNEU7WUFDNUUsaUVBQWlFO1lBQ2pFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDbkQsTUFBTSxJQUFJLEdBQW9CLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxDQUFDO2dCQUM5QyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQy9CLGlEQUFpRDtvQkFDakQsOERBQThEO29CQUM5RCxJQUFJLENBQUMsVUFBVSxHQUFHLFlBQTJCLENBQUM7b0JBRTlDLHlEQUF5RDtvQkFDekQsK0RBQStEO29CQUMvRCwyQ0FBMkM7b0JBQzNDLFlBQVksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLFlBQXdCLENBQUUsQ0FBQztpQkFDakY7Z0JBRUQsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM1QjtTQUNGO0tBQ0Y7SUFFRCxTQUFTLElBQUksY0FBYyxDQUFDLFlBQVksRUFBRSxxREFBcUQsQ0FBQyxDQUFDO0lBRWpHLE9BQU8sQ0FBQyxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDekMsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxJQUFJLCtCQUErQixHQUMvQixDQUFDLFVBQXNCLEVBQUUsUUFBZ0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDO0FBRXZELFNBQVMsOEJBQThCLENBQUMsVUFBc0IsRUFBRSxRQUFnQjtJQUU5RSxJQUFJLGFBQWEsR0FBeUIsSUFBSSxDQUFDO0lBQy9DLElBQUksVUFBVSxLQUFLLElBQUksSUFBSSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtRQUN2RCx5Q0FBeUM7UUFDekMsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDckQsSUFBSSxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM5QixzRUFBc0U7WUFDdEUsOERBQThEO1lBQzlELE1BQU0sbUJBQW1CLEdBQ3JCLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDO1lBRXhFLElBQUksbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLEVBQUU7Z0JBQzVCLGFBQWEsR0FBRyxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFFckQsb0RBQW9EO2dCQUNwRCxlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ2hEO1NBQ0Y7S0FDRjtJQUNELE9BQU8sYUFBYSxDQUFDO0FBQ3ZCLENBQUM7QUFFRCxNQUFNLFVBQVUsb0NBQW9DO0lBQ2xELCtCQUErQixHQUFHLDhCQUE4QixDQUFDO0FBQ25FLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQ3RDLFVBQXNCLEVBQUUsUUFBZ0I7SUFDMUMsT0FBTywrQkFBK0IsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDL0QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2Fzc2VydFJDb21tZW50fSBmcm9tICcuLi9yZW5kZXIzL2Fzc2VydCc7XG5pbXBvcnQge0RFSFlEUkFURURfVklFV1MsIExDb250YWluZXJ9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9jb250YWluZXInO1xuaW1wb3J0IHtSRWxlbWVudCwgUk5vZGV9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9yZW5kZXJlcl9kb20nO1xuXG5pbXBvcnQge01VTFRJUExJRVIsIE5naENvbnRhaW5lciwgTmdoVmlldywgTmdoVmlld0luc3RhbmNlLCBOVU1fUk9PVF9OT0RFUywgVEVNUExBVEUsIFZJRVdTfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtzaWJsaW5nQWZ0ZXJ9IGZyb20gJy4vbm9kZV9sb29rdXBfdXRpbHMnO1xuXG5cbi8qKlxuICogR2l2ZW4gYSBjdXJyZW50IERPTSBub2RlIGFuZCBhbiBuZ2ggY29udGFpbmVyIGRlZmluaXRpb24sXG4gKiB3YWxrcyBvdmVyIHRoZSBET00gc3RydWN0dXJlLCBjb2xsZWN0aW5nIHRoZSBsaXN0IG9mIGRlaHlkcmF0ZWQgdmlld3MuXG4gKlxuICogQHBhcmFtIGN1cnJlbnRSTm9kZVxuICogQHBhcmFtIG5naENvbnRhaW5lclxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRlRGVoeWRyYXRlZFZpZXdzSW5Db250YWluZXIoXG4gICAgY3VycmVudFJOb2RlOiBSTm9kZSwgbmdoQ29udGFpbmVyOiBOZ2hDb250YWluZXIpOiBbUk5vZGUsIE5naFZpZXdJbnN0YW5jZVtdXSB7XG4gIGNvbnN0IGRlaHlkcmF0ZWRWaWV3czogTmdoVmlld0luc3RhbmNlW10gPSBbXTtcbiAgaWYgKG5naENvbnRhaW5lcltWSUVXU10pIHtcbiAgICBmb3IgKGNvbnN0IG5naFZpZXcgb2YgbmdoQ29udGFpbmVyW1ZJRVdTXSkge1xuICAgICAgLy8gVGhpcyBwdXNoZXMgdGhlIGRlaHlkcmF0ZWQgdmlld3MgYmFzZWQgb24gdGhlIG11bHRpcGxpZXIgY291bnQgdG8gYWNjb3VudFxuICAgICAgLy8gZm9yIHRoZSBudW1iZXIgb2YgaW5zdGFuY2VzIHdlIHNob3VsZCBzZWUgb2YgYSBwYXJ0aWN1bGFyIHZpZXdcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgKG5naFZpZXdbTVVMVElQTElFUl0gPz8gMSk7IGkrKykge1xuICAgICAgICBjb25zdCB2aWV3OiBOZ2hWaWV3SW5zdGFuY2UgPSB7ZGF0YTogbmdoVmlld307XG4gICAgICAgIGlmIChuZ2hWaWV3W05VTV9ST09UX05PREVTXSA+IDApIHtcbiAgICAgICAgICAvLyBLZWVwIHJlZmVyZW5jZSB0byB0aGUgZmlyc3Qgbm9kZSBpbiB0aGlzIHZpZXcsXG4gICAgICAgICAgLy8gc28gaXQgY2FuIGJlIGFjY2Vzc2VkIHdoaWxlIGludm9raW5nIHRlbXBsYXRlIGluc3RydWN0aW9ucy5cbiAgICAgICAgICB2aWV3LmZpcnN0Q2hpbGQgPSBjdXJyZW50Uk5vZGUgYXMgSFRNTEVsZW1lbnQ7XG5cbiAgICAgICAgICAvLyBNb3ZlIG92ZXIgdG8gdGhlIGZpcnN0IG5vZGUgYWZ0ZXIgdGhpcyB2aWV3LCB3aGljaCBjYW5cbiAgICAgICAgICAvLyBlaXRoZXIgYmUgYSBmaXJzdCBub2RlIG9mIHRoZSBuZXh0IHZpZXcgb3IgYW4gYW5jaG9yIGNvbW1lbnRcbiAgICAgICAgICAvLyBub2RlIGFmdGVyIHRoZSBsYXN0IHZpZXcgaW4gYSBjb250YWluZXIuXG4gICAgICAgICAgY3VycmVudFJOb2RlID0gc2libGluZ0FmdGVyKG5naFZpZXdbTlVNX1JPT1RfTk9ERVNdLCBjdXJyZW50Uk5vZGUgYXMgUkVsZW1lbnQpITtcbiAgICAgICAgfVxuXG4gICAgICAgIGRlaHlkcmF0ZWRWaWV3cy5wdXNoKHZpZXcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG5nRGV2TW9kZSAmJiBhc3NlcnRSQ29tbWVudChjdXJyZW50Uk5vZGUsICdFeHBlY3RpbmcgYSBjb21tZW50IG5vZGUgYXMgYSB2aWV3IGNvbnRhaW5lciBhbmNob3InKTtcblxuICByZXR1cm4gW2N1cnJlbnRSTm9kZSwgZGVoeWRyYXRlZFZpZXdzXTtcbn1cblxuLyoqXG4gKiBSZWZlcmVuY2UgdG8gYSBmdW5jdGlvbiB0aGF0IHNlYXJjaGVzIGZvciBhIG1hdGNoaW5nIGRlaHlkcmF0ZWQgdmlld3NcbiAqIHN0b3JlZCBvbiBhIGdpdmVuIGxDb250YWluZXIuXG4gKiBSZXR1cm5zIGBudWxsYCBieSBkZWZhdWx0LCB3aGVuIGh5ZHJhdGlvbiBpcyBub3QgZW5hYmxlZC5cbiAqL1xubGV0IF9maW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGw6IHR5cGVvZiBmaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGwgPVxuICAgIChsQ29udGFpbmVyOiBMQ29udGFpbmVyLCB0ZW1wbGF0ZTogc3RyaW5nKSA9PiBudWxsO1xuXG5mdW5jdGlvbiBmaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGwobENvbnRhaW5lcjogTENvbnRhaW5lciwgdGVtcGxhdGU6IHN0cmluZyk6IE5naFZpZXdJbnN0YW5jZXxcbiAgICBudWxsIHtcbiAgbGV0IGh5ZHJhdGlvbkluZm86IE5naFZpZXdJbnN0YW5jZXxudWxsID0gbnVsbDtcbiAgaWYgKGxDb250YWluZXIgIT09IG51bGwgJiYgbENvbnRhaW5lcltERUhZRFJBVEVEX1ZJRVdTXSkge1xuICAgIC8vIERvZXMgdGhlIHRhcmdldCBjb250YWluZXIgaGF2ZSBhIHZpZXc/XG4gICAgY29uc3QgZGVoeWRyYXRlZFZpZXdzID0gbENvbnRhaW5lcltERUhZRFJBVEVEX1ZJRVdTXTtcbiAgICBpZiAoZGVoeWRyYXRlZFZpZXdzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIFRPRE86IHRha2UgaW50byBhY2NvdW50IGFuIGluZGV4IG9mIGEgdmlldyB3aXRoaW4gVmlld0NvbnRhaW5lclJlZixcbiAgICAgIC8vIG90aGVyd2lzZSwgd2UgbWF5IGVuZCB1cCByZXVzaW5nIHdyb25nIG5vZGVzIGZyb20gbGl2ZSBET00/XG4gICAgICBjb25zdCBkZWh5ZHJhdGVkVmlld0luZGV4ID1cbiAgICAgICAgICBkZWh5ZHJhdGVkVmlld3MuZmluZEluZGV4KHZpZXcgPT4gdmlldy5kYXRhW1RFTVBMQVRFXSA9PT0gdGVtcGxhdGUpO1xuXG4gICAgICBpZiAoZGVoeWRyYXRlZFZpZXdJbmRleCA+IC0xKSB7XG4gICAgICAgIGh5ZHJhdGlvbkluZm8gPSBkZWh5ZHJhdGVkVmlld3NbZGVoeWRyYXRlZFZpZXdJbmRleF07XG5cbiAgICAgICAgLy8gRHJvcCB0aGlzIHZpZXcgZnJvbSB0aGUgbGlzdCBvZiBkZS1oeWRyYXRlZCBvbmVzLlxuICAgICAgICBkZWh5ZHJhdGVkVmlld3Muc3BsaWNlKGRlaHlkcmF0ZWRWaWV3SW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gaHlkcmF0aW9uSW5mbztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVuYWJsZUZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3SW1wbCgpIHtcbiAgX2ZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3SW1wbCA9IGZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3SW1wbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3KFxuICAgIGxDb250YWluZXI6IExDb250YWluZXIsIHRlbXBsYXRlOiBzdHJpbmcpOiBOZ2hWaWV3SW5zdGFuY2V8bnVsbCB7XG4gIHJldHVybiBfZmluZE1hdGNoaW5nRGVoeWRyYXRlZFZpZXdJbXBsKGxDb250YWluZXIsIHRlbXBsYXRlKTtcbn1cbiJdfQ==