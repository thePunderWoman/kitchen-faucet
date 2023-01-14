/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { assertIndexInRange, assertLessThan, assertNotSame } from '../util/assert';
import { devModeEqual } from '../util/comparison';
import { getExpressionChangedErrorDetails, throwErrorIfNoChangesMode } from './errors';
import { isInCheckNoChangesMode } from './state';
import { NO_CHANGE } from './tokens';
// TODO(misko): consider inlining
/** Updates binding and returns the value. */
export function updateBinding(lView, bindingIndex, value) {
    return lView[bindingIndex] = value;
}
/** Gets the current binding value. */
export function getBinding(lView, bindingIndex) {
    ngDevMode && assertIndexInRange(lView, bindingIndex);
    ngDevMode &&
        assertNotSame(lView[bindingIndex], NO_CHANGE, 'Stored value should never be NO_CHANGE.');
    return lView[bindingIndex];
}
/**
 * Updates binding if changed, then returns whether it was updated.
 *
 * This function also checks the `CheckNoChangesMode` and throws if changes are made.
 * Some changes (Objects/iterables) during `CheckNoChangesMode` are exempt to comply with VE
 * behavior.
 *
 * @param lView current `LView`
 * @param bindingIndex The binding in the `LView` to check
 * @param value New value to check against `lView[bindingIndex]`
 * @returns `true` if the bindings has changed. (Throws if binding has changed during
 *          `CheckNoChangesMode`)
 */
export function bindingUpdated(lView, bindingIndex, value) {
    ngDevMode && assertNotSame(value, NO_CHANGE, 'Incoming value should never be NO_CHANGE.');
    ngDevMode &&
        assertLessThan(bindingIndex, lView.length, `Slot should have been initialized to NO_CHANGE`);
    const oldValue = lView[bindingIndex];
    if (Object.is(oldValue, value)) {
        return false;
    }
    else {
        if (ngDevMode && isInCheckNoChangesMode()) {
            // View engine didn't report undefined values as changed on the first checkNoChanges pass
            // (before the change detection was run).
            const oldValueToCompare = oldValue !== NO_CHANGE ? oldValue : undefined;
            if (!devModeEqual(oldValueToCompare, value)) {
                const details = getExpressionChangedErrorDetails(lView, bindingIndex, oldValueToCompare, value);
                throwErrorIfNoChangesMode(oldValue === NO_CHANGE, details.oldValue, details.newValue, details.propName);
            }
            // There was a change, but the `devModeEqual` decided that the change is exempt from an error.
            // For this reason we exit as if no change. The early exit is needed to prevent the changed
            // value to be written into `LView` (If we would write the new value that we would not see it
            // as change on next CD.)
            return false;
        }
        lView[bindingIndex] = value;
        return true;
    }
}
/** Updates 2 bindings if changed, then returns whether either was updated. */
export function bindingUpdated2(lView, bindingIndex, exp1, exp2) {
    const different = bindingUpdated(lView, bindingIndex, exp1);
    return bindingUpdated(lView, bindingIndex + 1, exp2) || different;
}
/** Updates 3 bindings if changed, then returns whether any was updated. */
export function bindingUpdated3(lView, bindingIndex, exp1, exp2, exp3) {
    const different = bindingUpdated2(lView, bindingIndex, exp1, exp2);
    return bindingUpdated(lView, bindingIndex + 2, exp3) || different;
}
/** Updates 4 bindings if changed, then returns whether any was updated. */
export function bindingUpdated4(lView, bindingIndex, exp1, exp2, exp3, exp4) {
    const different = bindingUpdated2(lView, bindingIndex, exp1, exp2);
    return bindingUpdated2(lView, bindingIndex + 2, exp3, exp4) || different;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluZGluZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9yZW5kZXIzL2JpbmRpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDakYsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBRWhELE9BQU8sRUFBQyxnQ0FBZ0MsRUFBRSx5QkFBeUIsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUVyRixPQUFPLEVBQUMsc0JBQXNCLEVBQUMsTUFBTSxTQUFTLENBQUM7QUFDL0MsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUduQyxpQ0FBaUM7QUFDakMsNkNBQTZDO0FBQzdDLE1BQU0sVUFBVSxhQUFhLENBQUMsS0FBWSxFQUFFLFlBQW9CLEVBQUUsS0FBVTtJQUMxRSxPQUFPLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxLQUFLLENBQUM7QUFDckMsQ0FBQztBQUdELHNDQUFzQztBQUN0QyxNQUFNLFVBQVUsVUFBVSxDQUFDLEtBQVksRUFBRSxZQUFvQjtJQUMzRCxTQUFTLElBQUksa0JBQWtCLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3JELFNBQVM7UUFDTCxhQUFhLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLFNBQVMsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO0lBQzdGLE9BQU8sS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzdCLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxNQUFNLFVBQVUsY0FBYyxDQUFDLEtBQVksRUFBRSxZQUFvQixFQUFFLEtBQVU7SUFDM0UsU0FBUyxJQUFJLGFBQWEsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLDJDQUEyQyxDQUFDLENBQUM7SUFDMUYsU0FBUztRQUNMLGNBQWMsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxnREFBZ0QsQ0FBQyxDQUFDO0lBQ2pHLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUVyQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxFQUFFO1FBQzlCLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7U0FBTTtRQUNMLElBQUksU0FBUyxJQUFJLHNCQUFzQixFQUFFLEVBQUU7WUFDekMseUZBQXlGO1lBQ3pGLHlDQUF5QztZQUN6QyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQ3hFLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQzNDLE1BQU0sT0FBTyxHQUNULGdDQUFnQyxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3BGLHlCQUF5QixDQUNyQixRQUFRLEtBQUssU0FBUyxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDbkY7WUFDRCw4RkFBOEY7WUFDOUYsMkZBQTJGO1lBQzNGLDZGQUE2RjtZQUM3Rix5QkFBeUI7WUFDekIsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDNUIsT0FBTyxJQUFJLENBQUM7S0FDYjtBQUNILENBQUM7QUFFRCw4RUFBOEU7QUFDOUUsTUFBTSxVQUFVLGVBQWUsQ0FBQyxLQUFZLEVBQUUsWUFBb0IsRUFBRSxJQUFTLEVBQUUsSUFBUztJQUN0RixNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1RCxPQUFPLGNBQWMsQ0FBQyxLQUFLLEVBQUUsWUFBWSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUM7QUFDcEUsQ0FBQztBQUVELDJFQUEyRTtBQUMzRSxNQUFNLFVBQVUsZUFBZSxDQUMzQixLQUFZLEVBQUUsWUFBb0IsRUFBRSxJQUFTLEVBQUUsSUFBUyxFQUFFLElBQVM7SUFDckUsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25FLE9BQU8sY0FBYyxDQUFDLEtBQUssRUFBRSxZQUFZLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQztBQUNwRSxDQUFDO0FBRUQsMkVBQTJFO0FBQzNFLE1BQU0sVUFBVSxlQUFlLENBQzNCLEtBQVksRUFBRSxZQUFvQixFQUFFLElBQVMsRUFBRSxJQUFTLEVBQUUsSUFBUyxFQUFFLElBQVM7SUFDaEYsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25FLE9BQU8sZUFBZSxDQUFDLEtBQUssRUFBRSxZQUFZLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUM7QUFDM0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2Fzc2VydEluZGV4SW5SYW5nZSwgYXNzZXJ0TGVzc1RoYW4sIGFzc2VydE5vdFNhbWV9IGZyb20gJy4uL3V0aWwvYXNzZXJ0JztcbmltcG9ydCB7ZGV2TW9kZUVxdWFsfSBmcm9tICcuLi91dGlsL2NvbXBhcmlzb24nO1xuXG5pbXBvcnQge2dldEV4cHJlc3Npb25DaGFuZ2VkRXJyb3JEZXRhaWxzLCB0aHJvd0Vycm9ySWZOb0NoYW5nZXNNb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge0xWaWV3fSBmcm9tICcuL2ludGVyZmFjZXMvdmlldyc7XG5pbXBvcnQge2lzSW5DaGVja05vQ2hhbmdlc01vZGV9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHtOT19DSEFOR0V9IGZyb20gJy4vdG9rZW5zJztcblxuXG4vLyBUT0RPKG1pc2tvKTogY29uc2lkZXIgaW5saW5pbmdcbi8qKiBVcGRhdGVzIGJpbmRpbmcgYW5kIHJldHVybnMgdGhlIHZhbHVlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUJpbmRpbmcobFZpZXc6IExWaWV3LCBiaW5kaW5nSW5kZXg6IG51bWJlciwgdmFsdWU6IGFueSk6IGFueSB7XG4gIHJldHVybiBsVmlld1tiaW5kaW5nSW5kZXhdID0gdmFsdWU7XG59XG5cblxuLyoqIEdldHMgdGhlIGN1cnJlbnQgYmluZGluZyB2YWx1ZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRCaW5kaW5nKGxWaWV3OiBMVmlldywgYmluZGluZ0luZGV4OiBudW1iZXIpOiBhbnkge1xuICBuZ0Rldk1vZGUgJiYgYXNzZXJ0SW5kZXhJblJhbmdlKGxWaWV3LCBiaW5kaW5nSW5kZXgpO1xuICBuZ0Rldk1vZGUgJiZcbiAgICAgIGFzc2VydE5vdFNhbWUobFZpZXdbYmluZGluZ0luZGV4XSwgTk9fQ0hBTkdFLCAnU3RvcmVkIHZhbHVlIHNob3VsZCBuZXZlciBiZSBOT19DSEFOR0UuJyk7XG4gIHJldHVybiBsVmlld1tiaW5kaW5nSW5kZXhdO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgYmluZGluZyBpZiBjaGFuZ2VkLCB0aGVuIHJldHVybnMgd2hldGhlciBpdCB3YXMgdXBkYXRlZC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIGFsc28gY2hlY2tzIHRoZSBgQ2hlY2tOb0NoYW5nZXNNb2RlYCBhbmQgdGhyb3dzIGlmIGNoYW5nZXMgYXJlIG1hZGUuXG4gKiBTb21lIGNoYW5nZXMgKE9iamVjdHMvaXRlcmFibGVzKSBkdXJpbmcgYENoZWNrTm9DaGFuZ2VzTW9kZWAgYXJlIGV4ZW1wdCB0byBjb21wbHkgd2l0aCBWRVxuICogYmVoYXZpb3IuXG4gKlxuICogQHBhcmFtIGxWaWV3IGN1cnJlbnQgYExWaWV3YFxuICogQHBhcmFtIGJpbmRpbmdJbmRleCBUaGUgYmluZGluZyBpbiB0aGUgYExWaWV3YCB0byBjaGVja1xuICogQHBhcmFtIHZhbHVlIE5ldyB2YWx1ZSB0byBjaGVjayBhZ2FpbnN0IGBsVmlld1tiaW5kaW5nSW5kZXhdYFxuICogQHJldHVybnMgYHRydWVgIGlmIHRoZSBiaW5kaW5ncyBoYXMgY2hhbmdlZC4gKFRocm93cyBpZiBiaW5kaW5nIGhhcyBjaGFuZ2VkIGR1cmluZ1xuICogICAgICAgICAgYENoZWNrTm9DaGFuZ2VzTW9kZWApXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5kaW5nVXBkYXRlZChsVmlldzogTFZpZXcsIGJpbmRpbmdJbmRleDogbnVtYmVyLCB2YWx1ZTogYW55KTogYm9vbGVhbiB7XG4gIG5nRGV2TW9kZSAmJiBhc3NlcnROb3RTYW1lKHZhbHVlLCBOT19DSEFOR0UsICdJbmNvbWluZyB2YWx1ZSBzaG91bGQgbmV2ZXIgYmUgTk9fQ0hBTkdFLicpO1xuICBuZ0Rldk1vZGUgJiZcbiAgICAgIGFzc2VydExlc3NUaGFuKGJpbmRpbmdJbmRleCwgbFZpZXcubGVuZ3RoLCBgU2xvdCBzaG91bGQgaGF2ZSBiZWVuIGluaXRpYWxpemVkIHRvIE5PX0NIQU5HRWApO1xuICBjb25zdCBvbGRWYWx1ZSA9IGxWaWV3W2JpbmRpbmdJbmRleF07XG5cbiAgaWYgKE9iamVjdC5pcyhvbGRWYWx1ZSwgdmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIGlmIChuZ0Rldk1vZGUgJiYgaXNJbkNoZWNrTm9DaGFuZ2VzTW9kZSgpKSB7XG4gICAgICAvLyBWaWV3IGVuZ2luZSBkaWRuJ3QgcmVwb3J0IHVuZGVmaW5lZCB2YWx1ZXMgYXMgY2hhbmdlZCBvbiB0aGUgZmlyc3QgY2hlY2tOb0NoYW5nZXMgcGFzc1xuICAgICAgLy8gKGJlZm9yZSB0aGUgY2hhbmdlIGRldGVjdGlvbiB3YXMgcnVuKS5cbiAgICAgIGNvbnN0IG9sZFZhbHVlVG9Db21wYXJlID0gb2xkVmFsdWUgIT09IE5PX0NIQU5HRSA/IG9sZFZhbHVlIDogdW5kZWZpbmVkO1xuICAgICAgaWYgKCFkZXZNb2RlRXF1YWwob2xkVmFsdWVUb0NvbXBhcmUsIHZhbHVlKSkge1xuICAgICAgICBjb25zdCBkZXRhaWxzID1cbiAgICAgICAgICAgIGdldEV4cHJlc3Npb25DaGFuZ2VkRXJyb3JEZXRhaWxzKGxWaWV3LCBiaW5kaW5nSW5kZXgsIG9sZFZhbHVlVG9Db21wYXJlLCB2YWx1ZSk7XG4gICAgICAgIHRocm93RXJyb3JJZk5vQ2hhbmdlc01vZGUoXG4gICAgICAgICAgICBvbGRWYWx1ZSA9PT0gTk9fQ0hBTkdFLCBkZXRhaWxzLm9sZFZhbHVlLCBkZXRhaWxzLm5ld1ZhbHVlLCBkZXRhaWxzLnByb3BOYW1lKTtcbiAgICAgIH1cbiAgICAgIC8vIFRoZXJlIHdhcyBhIGNoYW5nZSwgYnV0IHRoZSBgZGV2TW9kZUVxdWFsYCBkZWNpZGVkIHRoYXQgdGhlIGNoYW5nZSBpcyBleGVtcHQgZnJvbSBhbiBlcnJvci5cbiAgICAgIC8vIEZvciB0aGlzIHJlYXNvbiB3ZSBleGl0IGFzIGlmIG5vIGNoYW5nZS4gVGhlIGVhcmx5IGV4aXQgaXMgbmVlZGVkIHRvIHByZXZlbnQgdGhlIGNoYW5nZWRcbiAgICAgIC8vIHZhbHVlIHRvIGJlIHdyaXR0ZW4gaW50byBgTFZpZXdgIChJZiB3ZSB3b3VsZCB3cml0ZSB0aGUgbmV3IHZhbHVlIHRoYXQgd2Ugd291bGQgbm90IHNlZSBpdFxuICAgICAgLy8gYXMgY2hhbmdlIG9uIG5leHQgQ0QuKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsVmlld1tiaW5kaW5nSW5kZXhdID0gdmFsdWU7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuLyoqIFVwZGF0ZXMgMiBiaW5kaW5ncyBpZiBjaGFuZ2VkLCB0aGVuIHJldHVybnMgd2hldGhlciBlaXRoZXIgd2FzIHVwZGF0ZWQuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZGluZ1VwZGF0ZWQyKGxWaWV3OiBMVmlldywgYmluZGluZ0luZGV4OiBudW1iZXIsIGV4cDE6IGFueSwgZXhwMjogYW55KTogYm9vbGVhbiB7XG4gIGNvbnN0IGRpZmZlcmVudCA9IGJpbmRpbmdVcGRhdGVkKGxWaWV3LCBiaW5kaW5nSW5kZXgsIGV4cDEpO1xuICByZXR1cm4gYmluZGluZ1VwZGF0ZWQobFZpZXcsIGJpbmRpbmdJbmRleCArIDEsIGV4cDIpIHx8IGRpZmZlcmVudDtcbn1cblxuLyoqIFVwZGF0ZXMgMyBiaW5kaW5ncyBpZiBjaGFuZ2VkLCB0aGVuIHJldHVybnMgd2hldGhlciBhbnkgd2FzIHVwZGF0ZWQuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZGluZ1VwZGF0ZWQzKFxuICAgIGxWaWV3OiBMVmlldywgYmluZGluZ0luZGV4OiBudW1iZXIsIGV4cDE6IGFueSwgZXhwMjogYW55LCBleHAzOiBhbnkpOiBib29sZWFuIHtcbiAgY29uc3QgZGlmZmVyZW50ID0gYmluZGluZ1VwZGF0ZWQyKGxWaWV3LCBiaW5kaW5nSW5kZXgsIGV4cDEsIGV4cDIpO1xuICByZXR1cm4gYmluZGluZ1VwZGF0ZWQobFZpZXcsIGJpbmRpbmdJbmRleCArIDIsIGV4cDMpIHx8IGRpZmZlcmVudDtcbn1cblxuLyoqIFVwZGF0ZXMgNCBiaW5kaW5ncyBpZiBjaGFuZ2VkLCB0aGVuIHJldHVybnMgd2hldGhlciBhbnkgd2FzIHVwZGF0ZWQuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZGluZ1VwZGF0ZWQ0KFxuICAgIGxWaWV3OiBMVmlldywgYmluZGluZ0luZGV4OiBudW1iZXIsIGV4cDE6IGFueSwgZXhwMjogYW55LCBleHAzOiBhbnksIGV4cDQ6IGFueSk6IGJvb2xlYW4ge1xuICBjb25zdCBkaWZmZXJlbnQgPSBiaW5kaW5nVXBkYXRlZDIobFZpZXcsIGJpbmRpbmdJbmRleCwgZXhwMSwgZXhwMik7XG4gIHJldHVybiBiaW5kaW5nVXBkYXRlZDIobFZpZXcsIGJpbmRpbmdJbmRleCArIDIsIGV4cDMsIGV4cDQpIHx8IGRpZmZlcmVudDtcbn1cbiJdfQ==