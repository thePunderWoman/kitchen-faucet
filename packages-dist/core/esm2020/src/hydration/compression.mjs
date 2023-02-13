/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NghJSON } from './ngh_json';
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
/**
 * Compresses NGH data collected for a component and serializes
 * it into a string.
 *
 * @param ngh
 * @returns
 */
export function compressNghInfo(ngh) {
    return NghJSON.stringify(ngh);
}
/**
 * De-serializes NGH info retrieved from the `ngh` attribute.
 * Effectively reverts the `compressNghInfo` operation.
 *
 * @param ngh
 * @returns
 */
export function decompressNghInfo(ngh) {
    return NghJSON.parse(ngh);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHJlc3Npb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vY29tcHJlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLFlBQVksQ0FBQztBQUNuQyxPQUFPLEVBQXFCLG1CQUFtQixFQUFFLG1CQUFtQixFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFFakc7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxhQUFxQixFQUFFLElBQTBCO0lBQ3BGLElBQUksU0FBUyxHQUFHLGFBQWEsQ0FBQztJQUM5QixJQUFJLGNBQWMsR0FBNEIsSUFBSSxDQUFDO0lBQ25ELElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztJQUNwQixNQUFNLG9CQUFvQixHQUFHLEdBQUcsRUFBRTtRQUNoQyxTQUFTLElBQUksY0FBZSxHQUFHLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN0RSxDQUFDLENBQUM7SUFDRixLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksRUFBRTtRQUMxQixjQUFjLEtBQWQsY0FBYyxHQUFLLE9BQU8sRUFBQztRQUMzQixJQUFJLGNBQWMsS0FBSyxPQUFPLEVBQUU7WUFDOUIsV0FBVyxFQUFFLENBQUM7U0FDZjthQUFNO1lBQ0wsb0JBQW9CLEVBQUUsQ0FBQztZQUN2QixjQUFjLEdBQUcsT0FBTyxDQUFDO1lBQ3pCLFdBQVcsR0FBRyxDQUFDLENBQUM7U0FDakI7S0FDRjtJQUNELG9CQUFvQixFQUFFLENBQUM7SUFDdkIsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLElBQVk7SUFDM0IsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVCLENBQUM7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxJQUFZO0lBQ2pELElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztJQUNaLE1BQU0sSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixNQUFNLE9BQU8sR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNsQyxNQUFNLFVBQVUsR0FBRyxHQUFnQixFQUFFLENBQ2pDLENBQUMsSUFBSSxFQUFFLEtBQUssbUJBQW1CLElBQUksSUFBSSxFQUFFLEtBQUssbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUMxRixNQUFNLGFBQWEsR0FBRyxHQUFnQixFQUFFO1FBQ3RDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNiLE9BQU8sSUFBSSxFQUFFLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDaEMsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1NBQ2xCO1FBQ0QsT0FBTyxHQUFHLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUMzQyxDQUFDLENBQUM7SUFDRixJQUFJLEdBQUcsR0FBRyxVQUFVLEVBQUUsSUFBSSxhQUFhLEVBQUcsQ0FBQztJQUMzQyxNQUFNLEtBQUssR0FBeUIsRUFBRSxDQUFDO0lBQ3ZDLE9BQU8sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDeEIsTUFBTSxJQUFJLEdBQUcsT0FBTyxFQUF3QixDQUFDO1FBQzdDLDREQUE0RDtRQUM1RCw4REFBOEQ7UUFDOUQsK0NBQStDO1FBQy9DLE1BQU0sTUFBTSxHQUFHLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9CLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbEI7S0FDRjtJQUNELE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQztBQUN6QixDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBQyxHQUFXO0lBQ3pDLE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNoQyxDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLEdBQVc7SUFDM0MsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtOZ2hEb219IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge05naEpTT059IGZyb20gJy4vbmdoX2pzb24nO1xuaW1wb3J0IHtOb2RlTmF2aWdhdGlvblN0ZXAsIFJFRkVSRU5DRV9OT0RFX0JPRFksIFJFRkVSRU5DRV9OT0RFX0hPU1R9IGZyb20gJy4vbm9kZV9sb29rdXBfdXRpbHMnO1xuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0aGF0IHRha2VzIGEgcmVmZXJlbmNlIG5vZGUgbG9jYXRpb24gYW5kIGEgc2V0IG9mIG5hdmlnYXRpb24gc3RlcHNcbiAqIChmcm9tIHRoZSByZWZlcmVuY2Ugbm9kZSkgdG8gYSB0YXJnZXQgbm9kZSBhbmQgb3V0cHV0cyBhIHN0cmluZyB0aGF0IHJlcHJlc2VudHNcbiAqIGEgbG9jYXRpb24uXG4gKlxuICogRm9yIGV4YW1wbGUsIGdpdmVuOiByZWZlcmVuY2VOb2RlID0gJ2InIChib2R5KSBhbmQgcGF0aCA9IFsnZmlyc3RDaGlsZCcsICdmaXJzdENoaWxkJyxcbiAqICduZXh0U2libGluZyddLCB0aGUgZnVuY3Rpb24gcmV0dXJuczogYGJmMm5gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHJlc3NOb2RlTG9jYXRpb24ocmVmZXJlbmNlTm9kZTogc3RyaW5nLCBwYXRoOiBOb2RlTmF2aWdhdGlvblN0ZXBbXSk6IHN0cmluZyB7XG4gIGxldCBmaW5hbFBhdGggPSByZWZlcmVuY2VOb2RlO1xuICBsZXQgY3VycmVudFNlZ21lbnQ6IE5vZGVOYXZpZ2F0aW9uU3RlcHxudWxsID0gbnVsbDtcbiAgbGV0IHJlcGVhdENvdW50ID0gMDtcbiAgY29uc3QgYXBwZW5kQ3VycmVudFNlZ21lbnQgPSAoKSA9PiB7XG4gICAgZmluYWxQYXRoICs9IGN1cnJlbnRTZWdtZW50ISArIChyZXBlYXRDb3VudCA+IDEgPyByZXBlYXRDb3VudCA6ICcnKTtcbiAgfTtcbiAgZm9yIChjb25zdCBzZWdtZW50IG9mIHBhdGgpIHtcbiAgICBjdXJyZW50U2VnbWVudCA/Pz0gc2VnbWVudDtcbiAgICBpZiAoY3VycmVudFNlZ21lbnQgPT09IHNlZ21lbnQpIHtcbiAgICAgIHJlcGVhdENvdW50Kys7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFwcGVuZEN1cnJlbnRTZWdtZW50KCk7XG4gICAgICBjdXJyZW50U2VnbWVudCA9IHNlZ21lbnQ7XG4gICAgICByZXBlYXRDb3VudCA9IDE7XG4gICAgfVxuICB9XG4gIGFwcGVuZEN1cnJlbnRTZWdtZW50KCk7XG4gIHJldHVybiBmaW5hbFBhdGg7XG59XG5cbmZ1bmN0aW9uIGlzRGlnaXQoY2hhcjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAvWzAtOV0vLnRlc3QoY2hhcik7XG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRoYXQgcmV2ZXJ0cyB0aGUgYGNvbXByZXNzTm9kZUxvY2F0aW9uYCBhbmQgdHJhbnNmb3JtcyBhIGdpdmVuXG4gKiBzdHJpbmcgaW50byBhbiBhcnJheSB3aGVyZSBhdCAwdGggcG9zaXRpb24gdGhlcmUgaXMgYSByZWZlcmVuY2Ugbm9kZSBpbmZvIGFuZFxuICogYWZ0ZXIgdGhhdCBpdCBjb250YWlucyBhIHNldCBvZiBuYXZpZ2F0aW9uIHN0ZXBzLlxuICpcbiAqIEZvciBleGFtcGxlLCBnaXZlbjogcGF0aCA9ICdiZjJuJywgdGhlIGZ1bmN0aW9uIHJldHVybnM6IFsnYicsICdmaXJzdENoaWxkJywgJ2ZpcnN0Q2hpbGQnLFxuICogJ25leHRTaWJsaW5nJ10uIFRoaXMgaW5mb3JtYXRpb24gaXMgbGF0ZXIgY29uc3VtZWQgYnkgdGhlIGNvZGUgdGhhdCBuYXZpZ2F0ZXNcbiAqIHRoZSBsaXZlIERPTSB0byBmaW5kIGEgZ2l2ZW4gbm9kZSBieSBpdHMgbG9jYXRpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNvbXByZXNzTm9kZUxvY2F0aW9uKHBhdGg6IHN0cmluZyk6IFtzdHJpbmd8bnVtYmVyLCAuLi5Ob2RlTmF2aWdhdGlvblN0ZXBbXV0ge1xuICBsZXQgaWR4ID0gMDtcbiAgY29uc3QgcGVlayA9ICgpID0+IHBhdGhbaWR4XTtcbiAgY29uc3QgY29uc3VtZSA9ICgpID0+IHBhdGhbaWR4KytdO1xuICBjb25zdCBjb25zdW1lUmVmID0gKCk6IHN0cmluZ3xudWxsID0+XG4gICAgICAocGVlaygpID09PSBSRUZFUkVOQ0VfTk9ERV9CT0RZIHx8IHBlZWsoKSA9PT0gUkVGRVJFTkNFX05PREVfSE9TVCkgPyBjb25zdW1lKCkgOiBudWxsO1xuICBjb25zdCBjb25zdW1lTnVtYmVyID0gKCk6IG51bWJlcnxudWxsID0+IHtcbiAgICBsZXQgYWNjID0gJyc7XG4gICAgd2hpbGUgKHBlZWsoKSAmJiBpc0RpZ2l0KHBlZWsoKSkpIHtcbiAgICAgIGFjYyArPSBjb25zdW1lKCk7XG4gICAgfVxuICAgIHJldHVybiBhY2MgIT09ICcnID8gcGFyc2VJbnQoYWNjKSA6IG51bGw7XG4gIH07XG4gIGxldCByZWYgPSBjb25zdW1lUmVmKCkgfHwgY29uc3VtZU51bWJlcigpITtcbiAgY29uc3Qgc3RlcHM6IE5vZGVOYXZpZ2F0aW9uU3RlcFtdID0gW107XG4gIHdoaWxlIChpZHggPCBwYXRoLmxlbmd0aCkge1xuICAgIGNvbnN0IHN0ZXAgPSBjb25zdW1lKCkgYXMgTm9kZU5hdmlnYXRpb25TdGVwO1xuICAgIC8vIEVpdGhlciBjb25zdW1lIGEgbnVtYmVyIG9yIHVzZSBgMWAgaWYgdGhlcmUgaXMgbm8gbnVtYmVyLFxuICAgIC8vIHdoaWNoIGluZGljYXRlcyB0aGF0IGEgZ2l2ZW4gaW5zdHJ1Y3Rpb24gc2hvdWxkIGJlIHJlcGVhdGVkXG4gICAgLy8gb25seSBvbmNlIChmb3IgZXguIGluIGNhc2VzIGxpa2U6IGAxNWZuZm5gKS5cbiAgICBjb25zdCByZXBlYXQgPSBjb25zdW1lTnVtYmVyKCkgPz8gMTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlcGVhdDsgaSsrKSB7XG4gICAgICBzdGVwcy5wdXNoKHN0ZXApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gW3JlZiwgLi4uc3RlcHNdO1xufVxuXG4vKipcbiAqIENvbXByZXNzZXMgTkdIIGRhdGEgY29sbGVjdGVkIGZvciBhIGNvbXBvbmVudCBhbmQgc2VyaWFsaXplc1xuICogaXQgaW50byBhIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0gbmdoXG4gKiBAcmV0dXJuc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHJlc3NOZ2hJbmZvKG5naDogTmdoRG9tKTogc3RyaW5nIHtcbiAgcmV0dXJuIE5naEpTT04uc3RyaW5naWZ5KG5naCk7XG59XG5cbi8qKlxuICogRGUtc2VyaWFsaXplcyBOR0ggaW5mbyByZXRyaWV2ZWQgZnJvbSB0aGUgYG5naGAgYXR0cmlidXRlLlxuICogRWZmZWN0aXZlbHkgcmV2ZXJ0cyB0aGUgYGNvbXByZXNzTmdoSW5mb2Agb3BlcmF0aW9uLlxuICpcbiAqIEBwYXJhbSBuZ2hcbiAqIEByZXR1cm5zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNvbXByZXNzTmdoSW5mbyhuZ2g6IHN0cmluZyk6IE5naERvbSB7XG4gIHJldHVybiBOZ2hKU09OLnBhcnNlKG5naCk7XG59XG4iXX0=