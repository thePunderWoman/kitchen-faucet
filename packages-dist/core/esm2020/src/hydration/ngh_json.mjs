/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Checks if a character is within a valid token chars set, which is:
 * * a-z and A-Z
 * * 0-9
 * * `-` char
 */
function isValidTokenChar(char) {
    return /[0-9a-zA-Z\-]/.test(char);
}
function isDigit(char) {
    return /[0-9]/.test(char);
}
function parse(input) {
    let idx = 0;
    const peek = () => input[idx];
    const consume = () => input[idx++];
    const advance = () => idx++;
    const consumeToken = () => {
        let char = '';
        let onlyDigits = true;
        while (idx < input.length) {
            const next = peek();
            if (isValidTokenChar(next)) {
                if (!isDigit(next)) {
                    onlyDigits = false;
                }
                char += consume();
            }
            else
                break;
        }
        // Check if there are only digits in a string, in which case
        // transform it from a string to a number.
        return onlyDigits && char !== '' ? parseInt(char) : char;
    };
    const consumeValue = () => {
        switch (peek()) {
            case '{':
                advance(); // skip over '{'
                return consumeObject();
            case '[':
                advance(); // skip over '['
                return consumeArray();
            default:
                return consumeToken();
        }
    };
    const consumeObject = () => {
        const obj = {};
        while (idx < input.length) {
            const key = consumeToken();
            if (key === '') { // empty object?
                const next = consume();
                // TODO: make it ngDevMode-only check
                if (next !== '}') {
                    throw new Error(`Ngh JSON: invalid state. Expecting '{', but got '${next}' instead.`);
                }
                break;
            }
            consume(); // ':' char
            obj[key] = consumeValue();
            // Read next char, it might be either `,` or `}`.
            // If it's `}` - exit.
            if (consume() === '}')
                break;
        }
        return obj;
    };
    const consumeArray = () => {
        const arr = [];
        while (idx < input.length) {
            const value = consumeValue();
            if (value !== '') {
                arr.push(value);
            }
            // Read next char, it might be either `,` or `]`.
            // If it's `]` - exit.
            if (consume() === ']')
                break;
        }
        return arr;
    };
    return consumeValue();
}
/**
 * TODO: add docs, mention that it's *not* a general-purpose
 * utility, it's a custom implementation based on JSON structure
 * used to serialize Ngh data structures, which allows to drop
 * quotes around keys and values.
 */
export class NghJSON {
    static stringify(input) {
        // TODO: consider better implementation here.
        return JSON.stringify(input).replace(/"/g, '');
    }
    static parse(input) {
        return parse(input);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdoX2pzb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vbmdoX2pzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0g7Ozs7O0dBS0c7QUFDSCxTQUFTLGdCQUFnQixDQUFDLElBQVk7SUFDcEMsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BDLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxJQUFZO0lBQzNCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBRUQsU0FBUyxLQUFLLENBQUksS0FBYTtJQUM3QixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDWixNQUFNLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEMsTUFBTSxPQUFPLEdBQUcsR0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDM0MsTUFBTSxPQUFPLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7SUFFNUIsTUFBTSxZQUFZLEdBQUcsR0FBRyxFQUFFO1FBQ3hCLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNkLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQztRQUN0QixPQUFPLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQ3pCLE1BQU0sSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDO1lBQ3BCLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2xCLFVBQVUsR0FBRyxLQUFLLENBQUM7aUJBQ3BCO2dCQUNELElBQUksSUFBSSxPQUFPLEVBQUUsQ0FBQzthQUNuQjs7Z0JBQ0MsTUFBTTtTQUNUO1FBQ0QsNERBQTREO1FBQzVELDBDQUEwQztRQUMxQyxPQUFPLFVBQVUsSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUMzRCxDQUFDLENBQUM7SUFFRixNQUFNLFlBQVksR0FBRyxHQUFRLEVBQUU7UUFDN0IsUUFBUSxJQUFJLEVBQUUsRUFBRTtZQUNkLEtBQUssR0FBRztnQkFDTixPQUFPLEVBQUUsQ0FBQyxDQUFFLGdCQUFnQjtnQkFDNUIsT0FBTyxhQUFhLEVBQUUsQ0FBQztZQUN6QixLQUFLLEdBQUc7Z0JBQ04sT0FBTyxFQUFFLENBQUMsQ0FBRSxnQkFBZ0I7Z0JBQzVCLE9BQU8sWUFBWSxFQUFFLENBQUM7WUFDeEI7Z0JBQ0UsT0FBTyxZQUFZLEVBQUUsQ0FBQztTQUN6QjtJQUNILENBQUMsQ0FBQztJQUVGLE1BQU0sYUFBYSxHQUFHLEdBQUcsRUFBRTtRQUN6QixNQUFNLEdBQUcsR0FBNkIsRUFBRSxDQUFDO1FBQ3pDLE9BQU8sR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDekIsTUFBTSxHQUFHLEdBQUcsWUFBWSxFQUFFLENBQUM7WUFDM0IsSUFBSSxHQUFHLEtBQUssRUFBRSxFQUFFLEVBQUcsZ0JBQWdCO2dCQUNqQyxNQUFNLElBQUksR0FBRyxPQUFPLEVBQUUsQ0FBQztnQkFDdkIscUNBQXFDO2dCQUNyQyxJQUFJLElBQUksS0FBSyxHQUFHLEVBQUU7b0JBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsb0RBQW9ELElBQUksWUFBWSxDQUFDLENBQUM7aUJBQ3ZGO2dCQUNELE1BQU07YUFDUDtZQUNELE9BQU8sRUFBRSxDQUFDLENBQUUsV0FBVztZQUN2QixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsWUFBWSxFQUFFLENBQUM7WUFFMUIsaURBQWlEO1lBQ2pELHNCQUFzQjtZQUN0QixJQUFJLE9BQU8sRUFBRSxLQUFLLEdBQUc7Z0JBQUUsTUFBTTtTQUM5QjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxDQUFDO0lBQ0YsTUFBTSxZQUFZLEdBQUcsR0FBRyxFQUFFO1FBQ3hCLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNmLE9BQU8sR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDekIsTUFBTSxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUM7WUFDN0IsSUFBSSxLQUFLLEtBQUssRUFBRSxFQUFFO2dCQUNoQixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ2pCO1lBQ0QsaURBQWlEO1lBQ2pELHNCQUFzQjtZQUN0QixJQUFJLE9BQU8sRUFBRSxLQUFLLEdBQUc7Z0JBQUUsTUFBTTtTQUM5QjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxDQUFDO0lBQ0YsT0FBTyxZQUFZLEVBQU8sQ0FBQztBQUM3QixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLE9BQU8sT0FBTztJQUNsQixNQUFNLENBQUMsU0FBUyxDQUFJLEtBQVE7UUFDMUIsNkNBQTZDO1FBQzdDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFDRCxNQUFNLENBQUMsS0FBSyxDQUFJLEtBQWE7UUFDM0IsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFNLENBQUM7SUFDM0IsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBjaGFyYWN0ZXIgaXMgd2l0aGluIGEgdmFsaWQgdG9rZW4gY2hhcnMgc2V0LCB3aGljaCBpczpcbiAqICogYS16IGFuZCBBLVpcbiAqICogMC05XG4gKiAqIGAtYCBjaGFyXG4gKi9cbmZ1bmN0aW9uIGlzVmFsaWRUb2tlbkNoYXIoY2hhcjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAvWzAtOWEtekEtWlxcLV0vLnRlc3QoY2hhcik7XG59XG5cbmZ1bmN0aW9uIGlzRGlnaXQoY2hhcjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAvWzAtOV0vLnRlc3QoY2hhcik7XG59XG5cbmZ1bmN0aW9uIHBhcnNlPFQ+KGlucHV0OiBzdHJpbmcpOiBUIHtcbiAgbGV0IGlkeCA9IDA7XG4gIGNvbnN0IHBlZWsgPSAoKTogc3RyaW5nID0+IGlucHV0W2lkeF07XG4gIGNvbnN0IGNvbnN1bWUgPSAoKTogc3RyaW5nID0+IGlucHV0W2lkeCsrXTtcbiAgY29uc3QgYWR2YW5jZSA9ICgpID0+IGlkeCsrO1xuXG4gIGNvbnN0IGNvbnN1bWVUb2tlbiA9ICgpID0+IHtcbiAgICBsZXQgY2hhciA9ICcnO1xuICAgIGxldCBvbmx5RGlnaXRzID0gdHJ1ZTtcbiAgICB3aGlsZSAoaWR4IDwgaW5wdXQubGVuZ3RoKSB7XG4gICAgICBjb25zdCBuZXh0ID0gcGVlaygpO1xuICAgICAgaWYgKGlzVmFsaWRUb2tlbkNoYXIobmV4dCkpIHtcbiAgICAgICAgaWYgKCFpc0RpZ2l0KG5leHQpKSB7XG4gICAgICAgICAgb25seURpZ2l0cyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNoYXIgKz0gY29uc3VtZSgpO1xuICAgICAgfSBlbHNlXG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICAvLyBDaGVjayBpZiB0aGVyZSBhcmUgb25seSBkaWdpdHMgaW4gYSBzdHJpbmcsIGluIHdoaWNoIGNhc2VcbiAgICAvLyB0cmFuc2Zvcm0gaXQgZnJvbSBhIHN0cmluZyB0byBhIG51bWJlci5cbiAgICByZXR1cm4gb25seURpZ2l0cyAmJiBjaGFyICE9PSAnJyA/IHBhcnNlSW50KGNoYXIpIDogY2hhcjtcbiAgfTtcblxuICBjb25zdCBjb25zdW1lVmFsdWUgPSAoKTogYW55ID0+IHtcbiAgICBzd2l0Y2ggKHBlZWsoKSkge1xuICAgICAgY2FzZSAneyc6XG4gICAgICAgIGFkdmFuY2UoKTsgIC8vIHNraXAgb3ZlciAneydcbiAgICAgICAgcmV0dXJuIGNvbnN1bWVPYmplY3QoKTtcbiAgICAgIGNhc2UgJ1snOlxuICAgICAgICBhZHZhbmNlKCk7ICAvLyBza2lwIG92ZXIgJ1snXG4gICAgICAgIHJldHVybiBjb25zdW1lQXJyYXkoKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBjb25zdW1lVG9rZW4oKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgY29uc3VtZU9iamVjdCA9ICgpID0+IHtcbiAgICBjb25zdCBvYmo6IHtba2V5OiBzdHJpbmddOiB1bmtub3dufSA9IHt9O1xuICAgIHdoaWxlIChpZHggPCBpbnB1dC5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IGtleSA9IGNvbnN1bWVUb2tlbigpO1xuICAgICAgaWYgKGtleSA9PT0gJycpIHsgIC8vIGVtcHR5IG9iamVjdD9cbiAgICAgICAgY29uc3QgbmV4dCA9IGNvbnN1bWUoKTtcbiAgICAgICAgLy8gVE9ETzogbWFrZSBpdCBuZ0Rldk1vZGUtb25seSBjaGVja1xuICAgICAgICBpZiAobmV4dCAhPT0gJ30nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOZ2ggSlNPTjogaW52YWxpZCBzdGF0ZS4gRXhwZWN0aW5nICd7JywgYnV0IGdvdCAnJHtuZXh0fScgaW5zdGVhZC5gKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNvbnN1bWUoKTsgIC8vICc6JyBjaGFyXG4gICAgICBvYmpba2V5XSA9IGNvbnN1bWVWYWx1ZSgpO1xuXG4gICAgICAvLyBSZWFkIG5leHQgY2hhciwgaXQgbWlnaHQgYmUgZWl0aGVyIGAsYCBvciBgfWAuXG4gICAgICAvLyBJZiBpdCdzIGB9YCAtIGV4aXQuXG4gICAgICBpZiAoY29uc3VtZSgpID09PSAnfScpIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuICBjb25zdCBjb25zdW1lQXJyYXkgPSAoKSA9PiB7XG4gICAgY29uc3QgYXJyID0gW107XG4gICAgd2hpbGUgKGlkeCA8IGlucHV0Lmxlbmd0aCkge1xuICAgICAgY29uc3QgdmFsdWUgPSBjb25zdW1lVmFsdWUoKTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gJycpIHtcbiAgICAgICAgYXJyLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gUmVhZCBuZXh0IGNoYXIsIGl0IG1pZ2h0IGJlIGVpdGhlciBgLGAgb3IgYF1gLlxuICAgICAgLy8gSWYgaXQncyBgXWAgLSBleGl0LlxuICAgICAgaWYgKGNvbnN1bWUoKSA9PT0gJ10nKSBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIGFycjtcbiAgfTtcbiAgcmV0dXJuIGNvbnN1bWVWYWx1ZSgpIGFzIFQ7XG59XG5cbi8qKlxuICogVE9ETzogYWRkIGRvY3MsIG1lbnRpb24gdGhhdCBpdCdzICpub3QqIGEgZ2VuZXJhbC1wdXJwb3NlXG4gKiB1dGlsaXR5LCBpdCdzIGEgY3VzdG9tIGltcGxlbWVudGF0aW9uIGJhc2VkIG9uIEpTT04gc3RydWN0dXJlXG4gKiB1c2VkIHRvIHNlcmlhbGl6ZSBOZ2ggZGF0YSBzdHJ1Y3R1cmVzLCB3aGljaCBhbGxvd3MgdG8gZHJvcFxuICogcXVvdGVzIGFyb3VuZCBrZXlzIGFuZCB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ2hKU09OIHtcbiAgc3RhdGljIHN0cmluZ2lmeTxUPihpbnB1dDogVCk6IHN0cmluZyB7XG4gICAgLy8gVE9ETzogY29uc2lkZXIgYmV0dGVyIGltcGxlbWVudGF0aW9uIGhlcmUuXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGlucHV0KS5yZXBsYWNlKC9cIi9nLCAnJyk7XG4gIH1cbiAgc3RhdGljIHBhcnNlPFQ+KGlucHV0OiBzdHJpbmcpOiBUIHtcbiAgICByZXR1cm4gcGFyc2UoaW5wdXQpIGFzIFQ7XG4gIH1cbn0iXX0=