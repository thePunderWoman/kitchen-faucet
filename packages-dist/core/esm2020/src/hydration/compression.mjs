/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { REFERENCE_NODE_BODY, REFERENCE_NODE_HOST } from './node_lookup_utils';
/**
 * Helper function that takes a reference node location and a set of navigation steps
 * (from the reference node) to a target node and outputs a string that represents
 * a location.
 *
 * For example, given: referenceNode = 'b' (body) and path = ['firstChild', 'firstChild',
 * 'nextSibling'], the function returns: `bf2n`.
 */
export function compressNodeLocation(referenceNode, path) {
    let finalPath = referenceNode;
    let currentSegment = null;
    let repeatCount = 0;
    const appendCurrentSegment = () => {
        finalPath += currentSegment + (repeatCount > 1 ? repeatCount : '');
    };
    for (const segment of path) {
        currentSegment ?? (currentSegment = segment);
        if (currentSegment === segment) {
            repeatCount++;
        }
        else {
            appendCurrentSegment();
            currentSegment = segment;
            repeatCount = 1;
        }
    }
    appendCurrentSegment();
    return finalPath;
}
function isDigit(char) {
    return /[0-9]/.test(char);
}
/**
 * Helper function that reverts the `compressNodeLocation` and transforms a given
 * string into an array where at 0th position there is a reference node info and
 * after that it contains a set of navigation steps.
 *
 * For example, given: path = 'bf2n', the function returns: ['b', 'firstChild', 'firstChild',
 * 'nextSibling']. This information is later consumed by the code that navigates
 * the live DOM to find a given node by its location.
 */
export function decompressNodeLocation(path) {
    let idx = 0;
    const peek = () => path[idx];
    const consume = () => path[idx++];
    const consumeRef = () => (peek() === REFERENCE_NODE_BODY || peek() === REFERENCE_NODE_HOST) ? consume() : null;
    const consumeNumber = () => {
        let acc = '';
        while (peek() && isDigit(peek())) {
            acc += consume();
        }
        return acc !== '' ? parseInt(acc) : null;
    };
    let ref = consumeRef() || consumeNumber();
    const steps = [];
    while (idx < path.length) {
        const step = consume();
        // Either consume a number or use `1` if there is no number,
        // which indicates that a given instruction should be repeated
        // only once (for ex. in cases like: `15fnfn`).
        const repeat = consumeNumber() ?? 1;
        for (let i = 0; i < repeat; i++) {
            steps.push(step);
        }
    }
    return [ref, ...steps];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHJlc3Npb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vY29tcHJlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFxQixtQkFBbUIsRUFBRSxtQkFBbUIsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBRWpHOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsYUFBcUIsRUFBRSxJQUEwQjtJQUNwRixJQUFJLFNBQVMsR0FBRyxhQUFhLENBQUM7SUFDOUIsSUFBSSxjQUFjLEdBQTRCLElBQUksQ0FBQztJQUNuRCxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7SUFDcEIsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLEVBQUU7UUFDaEMsU0FBUyxJQUFJLGNBQWUsR0FBRyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdEUsQ0FBQyxDQUFDO0lBQ0YsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLEVBQUU7UUFDMUIsY0FBYyxLQUFkLGNBQWMsR0FBSyxPQUFPLEVBQUM7UUFDM0IsSUFBSSxjQUFjLEtBQUssT0FBTyxFQUFFO1lBQzlCLFdBQVcsRUFBRSxDQUFDO1NBQ2Y7YUFBTTtZQUNMLG9CQUFvQixFQUFFLENBQUM7WUFDdkIsY0FBYyxHQUFHLE9BQU8sQ0FBQztZQUN6QixXQUFXLEdBQUcsQ0FBQyxDQUFDO1NBQ2pCO0tBQ0Y7SUFDRCxvQkFBb0IsRUFBRSxDQUFDO0lBQ3ZCLE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxJQUFZO0lBQzNCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBRUQ7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsSUFBWTtJQUNqRCxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDWixNQUFNLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0IsTUFBTSxPQUFPLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDbEMsTUFBTSxVQUFVLEdBQUcsR0FBZ0IsRUFBRSxDQUNqQyxDQUFDLElBQUksRUFBRSxLQUFLLG1CQUFtQixJQUFJLElBQUksRUFBRSxLQUFLLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDMUYsTUFBTSxhQUFhLEdBQUcsR0FBZ0IsRUFBRTtRQUN0QyxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDYixPQUFPLElBQUksRUFBRSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ2hDLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztTQUNsQjtRQUNELE9BQU8sR0FBRyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDM0MsQ0FBQyxDQUFDO0lBQ0YsSUFBSSxHQUFHLEdBQUcsVUFBVSxFQUFFLElBQUksYUFBYSxFQUFHLENBQUM7SUFDM0MsTUFBTSxLQUFLLEdBQXlCLEVBQUUsQ0FBQztJQUN2QyxPQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ3hCLE1BQU0sSUFBSSxHQUFHLE9BQU8sRUFBd0IsQ0FBQztRQUM3Qyw0REFBNEQ7UUFDNUQsOERBQThEO1FBQzlELCtDQUErQztRQUMvQyxNQUFNLE1BQU0sR0FBRyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2xCO0tBQ0Y7SUFDRCxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUM7QUFDekIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge05vZGVOYXZpZ2F0aW9uU3RlcCwgUkVGRVJFTkNFX05PREVfQk9EWSwgUkVGRVJFTkNFX05PREVfSE9TVH0gZnJvbSAnLi9ub2RlX2xvb2t1cF91dGlscyc7XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSByZWZlcmVuY2Ugbm9kZSBsb2NhdGlvbiBhbmQgYSBzZXQgb2YgbmF2aWdhdGlvbiBzdGVwc1xuICogKGZyb20gdGhlIHJlZmVyZW5jZSBub2RlKSB0byBhIHRhcmdldCBub2RlIGFuZCBvdXRwdXRzIGEgc3RyaW5nIHRoYXQgcmVwcmVzZW50c1xuICogYSBsb2NhdGlvbi5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgZ2l2ZW46IHJlZmVyZW5jZU5vZGUgPSAnYicgKGJvZHkpIGFuZCBwYXRoID0gWydmaXJzdENoaWxkJywgJ2ZpcnN0Q2hpbGQnLFxuICogJ25leHRTaWJsaW5nJ10sIHRoZSBmdW5jdGlvbiByZXR1cm5zOiBgYmYybmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wcmVzc05vZGVMb2NhdGlvbihyZWZlcmVuY2VOb2RlOiBzdHJpbmcsIHBhdGg6IE5vZGVOYXZpZ2F0aW9uU3RlcFtdKTogc3RyaW5nIHtcbiAgbGV0IGZpbmFsUGF0aCA9IHJlZmVyZW5jZU5vZGU7XG4gIGxldCBjdXJyZW50U2VnbWVudDogTm9kZU5hdmlnYXRpb25TdGVwfG51bGwgPSBudWxsO1xuICBsZXQgcmVwZWF0Q291bnQgPSAwO1xuICBjb25zdCBhcHBlbmRDdXJyZW50U2VnbWVudCA9ICgpID0+IHtcbiAgICBmaW5hbFBhdGggKz0gY3VycmVudFNlZ21lbnQhICsgKHJlcGVhdENvdW50ID4gMSA/IHJlcGVhdENvdW50IDogJycpO1xuICB9O1xuICBmb3IgKGNvbnN0IHNlZ21lbnQgb2YgcGF0aCkge1xuICAgIGN1cnJlbnRTZWdtZW50ID8/PSBzZWdtZW50O1xuICAgIGlmIChjdXJyZW50U2VnbWVudCA9PT0gc2VnbWVudCkge1xuICAgICAgcmVwZWF0Q291bnQrKztcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwZW5kQ3VycmVudFNlZ21lbnQoKTtcbiAgICAgIGN1cnJlbnRTZWdtZW50ID0gc2VnbWVudDtcbiAgICAgIHJlcGVhdENvdW50ID0gMTtcbiAgICB9XG4gIH1cbiAgYXBwZW5kQ3VycmVudFNlZ21lbnQoKTtcbiAgcmV0dXJuIGZpbmFsUGF0aDtcbn1cblxuZnVuY3Rpb24gaXNEaWdpdChjaGFyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIC9bMC05XS8udGVzdChjaGFyKTtcbn1cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdGhhdCByZXZlcnRzIHRoZSBgY29tcHJlc3NOb2RlTG9jYXRpb25gIGFuZCB0cmFuc2Zvcm1zIGEgZ2l2ZW5cbiAqIHN0cmluZyBpbnRvIGFuIGFycmF5IHdoZXJlIGF0IDB0aCBwb3NpdGlvbiB0aGVyZSBpcyBhIHJlZmVyZW5jZSBub2RlIGluZm8gYW5kXG4gKiBhZnRlciB0aGF0IGl0IGNvbnRhaW5zIGEgc2V0IG9mIG5hdmlnYXRpb24gc3RlcHMuXG4gKlxuICogRm9yIGV4YW1wbGUsIGdpdmVuOiBwYXRoID0gJ2JmMm4nLCB0aGUgZnVuY3Rpb24gcmV0dXJuczogWydiJywgJ2ZpcnN0Q2hpbGQnLCAnZmlyc3RDaGlsZCcsXG4gKiAnbmV4dFNpYmxpbmcnXS4gVGhpcyBpbmZvcm1hdGlvbiBpcyBsYXRlciBjb25zdW1lZCBieSB0aGUgY29kZSB0aGF0IG5hdmlnYXRlc1xuICogdGhlIGxpdmUgRE9NIHRvIGZpbmQgYSBnaXZlbiBub2RlIGJ5IGl0cyBsb2NhdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY29tcHJlc3NOb2RlTG9jYXRpb24ocGF0aDogc3RyaW5nKTogW3N0cmluZ3xudW1iZXIsIC4uLk5vZGVOYXZpZ2F0aW9uU3RlcFtdXSB7XG4gIGxldCBpZHggPSAwO1xuICBjb25zdCBwZWVrID0gKCkgPT4gcGF0aFtpZHhdO1xuICBjb25zdCBjb25zdW1lID0gKCkgPT4gcGF0aFtpZHgrK107XG4gIGNvbnN0IGNvbnN1bWVSZWYgPSAoKTogc3RyaW5nfG51bGwgPT5cbiAgICAgIChwZWVrKCkgPT09IFJFRkVSRU5DRV9OT0RFX0JPRFkgfHwgcGVlaygpID09PSBSRUZFUkVOQ0VfTk9ERV9IT1NUKSA/IGNvbnN1bWUoKSA6IG51bGw7XG4gIGNvbnN0IGNvbnN1bWVOdW1iZXIgPSAoKTogbnVtYmVyfG51bGwgPT4ge1xuICAgIGxldCBhY2MgPSAnJztcbiAgICB3aGlsZSAocGVlaygpICYmIGlzRGlnaXQocGVlaygpKSkge1xuICAgICAgYWNjICs9IGNvbnN1bWUoKTtcbiAgICB9XG4gICAgcmV0dXJuIGFjYyAhPT0gJycgPyBwYXJzZUludChhY2MpIDogbnVsbDtcbiAgfTtcbiAgbGV0IHJlZiA9IGNvbnN1bWVSZWYoKSB8fCBjb25zdW1lTnVtYmVyKCkhO1xuICBjb25zdCBzdGVwczogTm9kZU5hdmlnYXRpb25TdGVwW10gPSBbXTtcbiAgd2hpbGUgKGlkeCA8IHBhdGgubGVuZ3RoKSB7XG4gICAgY29uc3Qgc3RlcCA9IGNvbnN1bWUoKSBhcyBOb2RlTmF2aWdhdGlvblN0ZXA7XG4gICAgLy8gRWl0aGVyIGNvbnN1bWUgYSBudW1iZXIgb3IgdXNlIGAxYCBpZiB0aGVyZSBpcyBubyBudW1iZXIsXG4gICAgLy8gd2hpY2ggaW5kaWNhdGVzIHRoYXQgYSBnaXZlbiBpbnN0cnVjdGlvbiBzaG91bGQgYmUgcmVwZWF0ZWRcbiAgICAvLyBvbmx5IG9uY2UgKGZvciBleC4gaW4gY2FzZXMgbGlrZTogYDE1Zm5mbmApLlxuICAgIGNvbnN0IHJlcGVhdCA9IGNvbnN1bWVOdW1iZXIoKSA/PyAxO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVwZWF0OyBpKyspIHtcbiAgICAgIHN0ZXBzLnB1c2goc3RlcCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBbcmVmLCAuLi5zdGVwc107XG59XG4iXX0=