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
                const view = { ...nghView };
                if (view[NUM_ROOT_NODES] > 0) {
                    // Keep reference to the first node in this view,
                    // so it can be accessed while invoking template instructions.
                    view.firstChild = currentRNode;
                    // Move over to the first node after this view, which can
                    // either be a first node of the next view or an anchor comment
                    // node after the last view in a container.
                    currentRNode = siblingAfter(view[NUM_ROOT_NODES], currentRNode);
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
            const dehydratedViewIndex = dehydratedViews.findIndex(view => view[TEMPLATE] === template);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vdmlld3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxnQkFBZ0IsRUFBYSxNQUFNLGlDQUFpQyxDQUFDO0FBRzdFLE9BQU8sRUFBQyxVQUFVLEVBQXlCLGNBQWMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQ2hHLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUdqRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLFVBQVUsZ0NBQWdDLENBQzVDLFlBQW1CLEVBQUUsWUFBMEI7SUFDakQsTUFBTSxlQUFlLEdBQWMsRUFBRSxDQUFDO0lBQ3RDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3ZCLEtBQUssTUFBTSxPQUFPLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3pDLDRFQUE0RTtZQUM1RSxpRUFBaUU7WUFDakUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNuRCxNQUFNLElBQUksR0FBRyxFQUFDLEdBQUcsT0FBTyxFQUFDLENBQUM7Z0JBQzFCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDNUIsaURBQWlEO29CQUNqRCw4REFBOEQ7b0JBQzlELElBQUksQ0FBQyxVQUFVLEdBQUcsWUFBMkIsQ0FBQztvQkFFOUMseURBQXlEO29CQUN6RCwrREFBK0Q7b0JBQy9ELDJDQUEyQztvQkFDM0MsWUFBWSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsWUFBd0IsQ0FBRSxDQUFDO2lCQUM5RTtnQkFFRCxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzVCO1NBQ0Y7S0FDRjtJQUVELFNBQVMsSUFBSSxjQUFjLENBQUMsWUFBWSxFQUFFLHFEQUFxRCxDQUFDLENBQUM7SUFFakcsT0FBTyxDQUFDLFlBQVksRUFBRSxlQUFlLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILElBQUksK0JBQStCLEdBQy9CLENBQUMsVUFBc0IsRUFBRSxRQUFnQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUM7QUFFdkQsU0FBUyw4QkFBOEIsQ0FBQyxVQUFzQixFQUFFLFFBQWdCO0lBQzlFLElBQUksYUFBYSxHQUFpQixJQUFJLENBQUM7SUFDdkMsSUFBSSxVQUFVLEtBQUssSUFBSSxJQUFJLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1FBQ3ZELHlDQUF5QztRQUN6QyxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNyRCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzlCLHNFQUFzRTtZQUN0RSw4REFBOEQ7WUFDOUQsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDO1lBRTNGLElBQUksbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLEVBQUU7Z0JBQzVCLGFBQWEsR0FBRyxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFFckQsb0RBQW9EO2dCQUNwRCxlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ2hEO1NBQ0Y7S0FDRjtJQUNELE9BQU8sYUFBYSxDQUFDO0FBQ3ZCLENBQUM7QUFFRCxNQUFNLFVBQVUsb0NBQW9DO0lBQ2xELCtCQUErQixHQUFHLDhCQUE4QixDQUFDO0FBQ25FLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsVUFBc0IsRUFBRSxRQUFnQjtJQUNqRixPQUFPLCtCQUErQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUMvRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7YXNzZXJ0UkNvbW1lbnR9IGZyb20gJy4uL3JlbmRlcjMvYXNzZXJ0JztcbmltcG9ydCB7REVIWURSQVRFRF9WSUVXUywgTENvbnRhaW5lcn0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL2NvbnRhaW5lcic7XG5pbXBvcnQge1JFbGVtZW50LCBSTm9kZX0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3JlbmRlcmVyX2RvbSc7XG5cbmltcG9ydCB7TVVMVElQTElFUiwgTmdoQ29udGFpbmVyLCBOZ2hWaWV3LCBOVU1fUk9PVF9OT0RFUywgVEVNUExBVEUsIFZJRVdTfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtzaWJsaW5nQWZ0ZXJ9IGZyb20gJy4vbm9kZV9sb29rdXBfdXRpbHMnO1xuXG5cbi8qKlxuICogR2l2ZW4gYSBjdXJyZW50IERPTSBub2RlIGFuZCBhbiBuZ2ggY29udGFpbmVyIGRlZmluaXRpb24sXG4gKiB3YWxrcyBvdmVyIHRoZSBET00gc3RydWN0dXJlLCBjb2xsZWN0aW5nIHRoZSBsaXN0IG9mIGRlaHlkcmF0ZWQgdmlld3MuXG4gKlxuICogQHBhcmFtIGN1cnJlbnRSTm9kZVxuICogQHBhcmFtIG5naENvbnRhaW5lclxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRlRGVoeWRyYXRlZFZpZXdzSW5Db250YWluZXIoXG4gICAgY3VycmVudFJOb2RlOiBSTm9kZSwgbmdoQ29udGFpbmVyOiBOZ2hDb250YWluZXIpOiBbUk5vZGUsIE5naFZpZXdbXV0ge1xuICBjb25zdCBkZWh5ZHJhdGVkVmlld3M6IE5naFZpZXdbXSA9IFtdO1xuICBpZiAobmdoQ29udGFpbmVyW1ZJRVdTXSkge1xuICAgIGZvciAoY29uc3QgbmdoVmlldyBvZiBuZ2hDb250YWluZXJbVklFV1NdKSB7XG4gICAgICAvLyBUaGlzIHB1c2hlcyB0aGUgZGVoeWRyYXRlZCB2aWV3cyBiYXNlZCBvbiB0aGUgbXVsdGlwbGllciBjb3VudCB0byBhY2NvdW50XG4gICAgICAvLyBmb3IgdGhlIG51bWJlciBvZiBpbnN0YW5jZXMgd2Ugc2hvdWxkIHNlZSBvZiBhIHBhcnRpY3VsYXIgdmlld1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAobmdoVmlld1tNVUxUSVBMSUVSXSA/PyAxKTsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHZpZXcgPSB7Li4ubmdoVmlld307XG4gICAgICAgIGlmICh2aWV3W05VTV9ST09UX05PREVTXSA+IDApIHtcbiAgICAgICAgICAvLyBLZWVwIHJlZmVyZW5jZSB0byB0aGUgZmlyc3Qgbm9kZSBpbiB0aGlzIHZpZXcsXG4gICAgICAgICAgLy8gc28gaXQgY2FuIGJlIGFjY2Vzc2VkIHdoaWxlIGludm9raW5nIHRlbXBsYXRlIGluc3RydWN0aW9ucy5cbiAgICAgICAgICB2aWV3LmZpcnN0Q2hpbGQgPSBjdXJyZW50Uk5vZGUgYXMgSFRNTEVsZW1lbnQ7XG5cbiAgICAgICAgICAvLyBNb3ZlIG92ZXIgdG8gdGhlIGZpcnN0IG5vZGUgYWZ0ZXIgdGhpcyB2aWV3LCB3aGljaCBjYW5cbiAgICAgICAgICAvLyBlaXRoZXIgYmUgYSBmaXJzdCBub2RlIG9mIHRoZSBuZXh0IHZpZXcgb3IgYW4gYW5jaG9yIGNvbW1lbnRcbiAgICAgICAgICAvLyBub2RlIGFmdGVyIHRoZSBsYXN0IHZpZXcgaW4gYSBjb250YWluZXIuXG4gICAgICAgICAgY3VycmVudFJOb2RlID0gc2libGluZ0FmdGVyKHZpZXdbTlVNX1JPT1RfTk9ERVNdLCBjdXJyZW50Uk5vZGUgYXMgUkVsZW1lbnQpITtcbiAgICAgICAgfVxuXG4gICAgICAgIGRlaHlkcmF0ZWRWaWV3cy5wdXNoKHZpZXcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG5nRGV2TW9kZSAmJiBhc3NlcnRSQ29tbWVudChjdXJyZW50Uk5vZGUsICdFeHBlY3RpbmcgYSBjb21tZW50IG5vZGUgYXMgYSB2aWV3IGNvbnRhaW5lciBhbmNob3InKTtcblxuICByZXR1cm4gW2N1cnJlbnRSTm9kZSwgZGVoeWRyYXRlZFZpZXdzXTtcbn1cblxuLyoqXG4gKiBSZWZlcmVuY2UgdG8gYSBmdW5jdGlvbiB0aGF0IHNlYXJjaGVzIGZvciBhIG1hdGNoaW5nIGRlaHlkcmF0ZWQgdmlld3NcbiAqIHN0b3JlZCBvbiBhIGdpdmVuIGxDb250YWluZXIuXG4gKiBSZXR1cm5zIGBudWxsYCBieSBkZWZhdWx0LCB3aGVuIGh5ZHJhdGlvbiBpcyBub3QgZW5hYmxlZC5cbiAqL1xubGV0IF9maW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGw6IHR5cGVvZiBmaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGwgPVxuICAgIChsQ29udGFpbmVyOiBMQ29udGFpbmVyLCB0ZW1wbGF0ZTogc3RyaW5nKSA9PiBudWxsO1xuXG5mdW5jdGlvbiBmaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGwobENvbnRhaW5lcjogTENvbnRhaW5lciwgdGVtcGxhdGU6IHN0cmluZyk6IE5naFZpZXd8bnVsbCB7XG4gIGxldCBoeWRyYXRpb25JbmZvOiBOZ2hWaWV3fG51bGwgPSBudWxsO1xuICBpZiAobENvbnRhaW5lciAhPT0gbnVsbCAmJiBsQ29udGFpbmVyW0RFSFlEUkFURURfVklFV1NdKSB7XG4gICAgLy8gRG9lcyB0aGUgdGFyZ2V0IGNvbnRhaW5lciBoYXZlIGEgdmlldz9cbiAgICBjb25zdCBkZWh5ZHJhdGVkVmlld3MgPSBsQ29udGFpbmVyW0RFSFlEUkFURURfVklFV1NdO1xuICAgIGlmIChkZWh5ZHJhdGVkVmlld3MubGVuZ3RoID4gMCkge1xuICAgICAgLy8gVE9ETzogdGFrZSBpbnRvIGFjY291bnQgYW4gaW5kZXggb2YgYSB2aWV3IHdpdGhpbiBWaWV3Q29udGFpbmVyUmVmLFxuICAgICAgLy8gb3RoZXJ3aXNlLCB3ZSBtYXkgZW5kIHVwIHJldXNpbmcgd3Jvbmcgbm9kZXMgZnJvbSBsaXZlIERPTT9cbiAgICAgIGNvbnN0IGRlaHlkcmF0ZWRWaWV3SW5kZXggPSBkZWh5ZHJhdGVkVmlld3MuZmluZEluZGV4KHZpZXcgPT4gdmlld1tURU1QTEFURV0gPT09IHRlbXBsYXRlKTtcblxuICAgICAgaWYgKGRlaHlkcmF0ZWRWaWV3SW5kZXggPiAtMSkge1xuICAgICAgICBoeWRyYXRpb25JbmZvID0gZGVoeWRyYXRlZFZpZXdzW2RlaHlkcmF0ZWRWaWV3SW5kZXhdO1xuXG4gICAgICAgIC8vIERyb3AgdGhpcyB2aWV3IGZyb20gdGhlIGxpc3Qgb2YgZGUtaHlkcmF0ZWQgb25lcy5cbiAgICAgICAgZGVoeWRyYXRlZFZpZXdzLnNwbGljZShkZWh5ZHJhdGVkVmlld0luZGV4LCAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGh5ZHJhdGlvbkluZm87XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbmFibGVGaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGwoKSB7XG4gIF9maW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGwgPSBmaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlldyhsQ29udGFpbmVyOiBMQ29udGFpbmVyLCB0ZW1wbGF0ZTogc3RyaW5nKTogTmdoVmlld3xudWxsIHtcbiAgcmV0dXJuIF9maW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGwobENvbnRhaW5lciwgdGVtcGxhdGUpO1xufVxuIl19