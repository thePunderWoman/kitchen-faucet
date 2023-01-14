/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export function readHydrationKey(node) {
    if (node.nodeType === Node.COMMENT_NODE) {
        return node.textContent;
    }
    else if (node.nodeType === Node.ELEMENT_NODE) {
        return node.getAttribute('ngh');
    }
    return null;
}
/**
 * Compresses hydration keys to avoid repeating long strings,
 * and only append the delta at each level.
 *
 * NOTE: this logic should eventually be folded into
 * the `annotateForHydration` function, so that there is no
 * extra DOM walk, but keep it separate for now for profiling
 * and debugging purposes.
 *
 * TODO:
 * - move all inner functions outside of the `compressHydrationKeys` fn.
 */
export function compressHydrationKeys(root) {
    const parseKey = (key) => {
        const isTextMarker = key.indexOf('?') > -1;
        const delim = isTextMarker ? '?' : '|';
        const parts = key.split(delim);
        const elementId = parts.pop();
        const viewSegments = parts.pop().split(':');
        return [viewSegments, elementId, isTextMarker];
    };
    const computeTransformCommand = (parent, child) => {
        let diffStartsAt = parent.length === child.length ? //
            -1 :
            Math.min(parent.length, child.length);
        let i = 0;
        let rmCommand = '';
        while (i < parent.length && i < child.length) {
            if (parent[i] !== child[i]) {
                diffStartsAt = i;
                break;
            }
            i++;
        }
        if (diffStartsAt === -1) {
            // No difference in keys, return an empty array.
            return [];
        }
        else {
            // Starting from the diff point, until the end of the parent
            // segments, add `d` as an indicator that one segment should
            // be dropped (thus "d"). The following number indicated the number
            // of segments to be dropped. If there is just one segment (most
            // common case), just `d` is printed. Otherwise, the value would
            // look like `d5` (drop 5 segments).
            const segmentsToDrop = parent.length - diffStartsAt;
            if (segmentsToDrop > 0) {
                rmCommand = 'd' + (segmentsToDrop > 1 ? segmentsToDrop : '');
            }
            const command = rmCommand || 'a'; // 'a' stands for "append"
            return [command, ...child.slice(diffStartsAt)];
        }
    };
    const makeHydrationKey = (viewSegments, elementId, isTextMarker) => {
        return viewSegments.join(':') + (isTextMarker ? '?' : '|') + elementId;
    };
    const visitNode = (parentKey, node) => {
        let parsedNodeKey = null;
        const nodeKey = readHydrationKey(node);
        if (nodeKey) {
            parsedNodeKey = parseKey(nodeKey);
            const [viewSegments, elementId, isTextMarker] = parsedNodeKey;
            // We have both node and current keys, compute transform command
            // (between view segments only).
            const newViewSegments = computeTransformCommand(parentKey[0], viewSegments);
            const newKey = makeHydrationKey(newViewSegments, elementId, isTextMarker);
            if (node.nodeType === Node.COMMENT_NODE) {
                node.textContent = newKey;
            }
            else { // Node.ELEMENT_NODE
                node.setAttribute('ngh', newKey);
            }
        }
        let childNode = node.firstChild;
        while (childNode) {
            // If the current node doesn't have its own key,
            // use parent node key instead, so that child key
            // is computed based on it.
            visitNode(parsedNodeKey ?? parentKey, childNode);
            childNode = childNode.nextSibling;
        }
    };
    // Start the process for all child nodes of the root node.
    if (root.childNodes.length > 0) {
        const rootKey = parseKey(readHydrationKey(root));
        root.childNodes.forEach((child) => {
            visitNode(rootKey, child);
        });
    }
}
/**
 * Visits all child nodes of a given node and restores
 * full hydration keys for each node based on parent node
 * hydration keys. Effectively reverts the `compressHydrationKeys`
 * operation.
 *
 * TODO: merge this logic into `populateNodeRegistry` eventually
 *       (keep it separate for now for testing purposes).
 */
export function decompressHydrationKeys(node) {
    const visitNode = (node, parentViewKey) => {
        const nodeKey = readHydrationKey(node);
        let nodeViewKey = null;
        if (nodeKey) {
            const parts = nodeKey.split(/[|?]/g);
            nodeViewKey = parts[0];
            // TODO: handle `dN` ("delete N segments") commands.
            if (nodeViewKey.startsWith('a')) {
                // Command to add a segment, drop leading 'a'.
                nodeViewKey = nodeViewKey.slice(1);
            }
            nodeViewKey = parentViewKey + nodeViewKey;
            const separator = nodeKey.indexOf('|') > -1 ? '|' : '?';
            const newKey = nodeViewKey + separator + parts[1];
            if (node.nodeType === Node.COMMENT_NODE) {
                node.textContent = newKey;
            }
            else { // Node.ELEMENT_NODE
                node.setAttribute('ngh', newKey);
            }
        }
        let childNode = node.firstChild;
        while (childNode) {
            visitNode(childNode, nodeViewKey ?? parentViewKey);
            childNode = childNode.nextSibling;
        }
    };
    const parentKey = readHydrationKey(node);
    if (parentKey) {
        // Take everything before '|' or '?' symbols.
        const parentViewKey = parentKey.split(/[|?]/g)[0];
        if (node.childNodes.length > 0) {
            node.childNodes.forEach((child) => {
                visitNode(child, parentViewKey);
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHJlc3Npb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vY29tcHJlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsTUFBTSxVQUFVLGdCQUFnQixDQUFDLElBQVM7SUFDeEMsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUU7UUFDdkMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUU7UUFDOUMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ2pDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQUMsSUFBYTtJQUlqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQVcsRUFBc0IsRUFBRTtRQUNuRCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDdkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFHLENBQUM7UUFDL0IsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNqRCxDQUFDLENBQUM7SUFD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cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRIeWRyYXRpb25LZXkobm9kZTogYW55KTogc3RyaW5nfG51bGwge1xuICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5DT01NRU5UX05PREUpIHtcbiAgICByZXR1cm4gbm9kZS50ZXh0Q29udGVudDtcbiAgfSBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgIHJldHVybiBub2RlLmdldEF0dHJpYnV0ZSgnbmdoJyk7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogQ29tcHJlc3NlcyBoeWRyYXRpb24ga2V5cyB0byBhdm9pZCByZXBlYXRpbmcgbG9uZyBzdHJpbmdzLFxuICogYW5kIG9ubHkgYXBwZW5kIHRoZSBkZWx0YSBhdCBlYWNoIGxldmVsLlxuICpcbiAqIE5PVEU6IHRoaXMgbG9naWMgc2hvdWxkIGV2ZW50dWFsbHkgYmUgZm9sZGVkIGludG9cbiAqIHRoZSBgYW5ub3RhdGVGb3JIeWRyYXRpb25gIGZ1bmN0aW9uLCBzbyB0aGF0IHRoZXJlIGlzIG5vXG4gKiBleHRyYSBET00gd2FsaywgYnV0IGtlZXAgaXQgc2VwYXJhdGUgZm9yIG5vdyBmb3IgcHJvZmlsaW5nXG4gKiBhbmQgZGVidWdnaW5nIHB1cnBvc2VzLlxuICpcbiAqIFRPRE86XG4gKiAtIG1vdmUgYWxsIGlubmVyIGZ1bmN0aW9ucyBvdXRzaWRlIG9mIHRoZSBgY29tcHJlc3NIeWRyYXRpb25LZXlzYCBmbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXByZXNzSHlkcmF0aW9uS2V5cyhyb290OiBFbGVtZW50KSB7XG4gIC8qIFJldHVybnM6IFt2aWV3U2VnbWVudHMsIGVsZW1lbnRJZCwgaXNUZXh0TWFya2VyXSAqL1xuICB0eXBlIFBhcnNlZEh5ZHJhdGlvbktleSA9XG4gICAgICBbc3RyaW5nW10gLyogdmlld1NlZ21lbnRzICovLCBzdHJpbmcgLyogZWxlbWVudElkICovLCBib29sZWFuIC8qIGlzVGV4dE1hcmtlciAqL107XG4gIGNvbnN0IHBhcnNlS2V5ID0gKGtleTogc3RyaW5nKTogUGFyc2VkSHlkcmF0aW9uS2V5ID0+IHtcbiAgICBjb25zdCBpc1RleHRNYXJrZXIgPSBrZXkuaW5kZXhPZignPycpID4gLTE7XG4gICAgY29uc3QgZGVsaW0gPSBpc1RleHRNYXJrZXIgPyAnPycgOiAnfCc7XG4gICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoZGVsaW0pO1xuICAgIGNvbnN0IGVsZW1lbnRJZCA9IHBhcnRzLnBvcCgpITtcbiAgICBjb25zdCB2aWV3U2VnbWVudHMgPSBwYXJ0cy5wb3AoKSEuc3BsaXQoJzonKTtcbiAgICByZXR1cm4gW3ZpZXdTZWdtZW50cywgZWxlbWVudElkLCBpc1RleHRNYXJrZXJdO1xuICB9O1xuICBjb25zdCBjb21wdXRlVHJhbnNmb3JtQ29tbWFuZCA9IChwYXJlbnQ6IHN0cmluZ1tdLCBjaGlsZDogc3RyaW5nW10pID0+IHtcbiAgICBsZXQgZGlmZlN0YXJ0c0F0ID0gcGFyZW50Lmxlbmd0aCA9PT0gY2hpbGQubGVuZ3RoID8gIC8vXG4gICAgICAgIC0xIDpcbiAgICAgICAgTWF0aC5taW4ocGFyZW50Lmxlbmd0aCwgY2hpbGQubGVuZ3RoKTtcbiAgICBsZXQgaSA9IDA7XG4gICAgbGV0IHJtQ29tbWFuZCA9ICcnO1xuICAgIHdoaWxlIChpIDwgcGFyZW50Lmxlbmd0aCAmJiBpIDwgY2hpbGQubGVuZ3RoKSB7XG4gICAgICBpZiAocGFyZW50W2ldICE9PSBjaGlsZFtpXSkge1xuICAgICAgICBkaWZmU3RhcnRzQXQgPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICB9XG4gICAgaWYgKGRpZmZTdGFydHNBdCA9PT0gLTEpIHtcbiAgICAgIC8vIE5vIGRpZmZlcmVuY2UgaW4ga2V5cywgcmV0dXJuIGFuIGVtcHR5IGFycmF5LlxuICAgICAgcmV0dXJuIFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTdGFydGluZyBmcm9tIHRoZSBkaWZmIHBvaW50LCB1bnRpbCB0aGUgZW5kIG9mIHRoZSBwYXJlbnRcbiAgICAgIC8vIHNlZ21lbnRzLCBhZGQgYGRgIGFzIGFuIGluZGljYXRvciB0aGF0IG9uZSBzZWdtZW50IHNob3VsZFxuICAgICAgLy8gYmUgZHJvcHBlZCAodGh1cyBcImRcIikuIFRoZSBmb2xsb3dpbmcgbnVtYmVyIGluZGljYXRlZCB0aGUgbnVtYmVyXG4gICAgICAvLyBvZiBzZWdtZW50cyB0byBiZSBkcm9wcGVkLiBJZiB0aGVyZSBpcyBqdXN0IG9uZSBzZWdtZW50IChtb3N0XG4gICAgICAvLyBjb21tb24gY2FzZSksIGp1c3QgYGRgIGlzIHByaW50ZWQuIE90aGVyd2lzZSwgdGhlIHZhbHVlIHdvdWxkXG4gICAgICAvLyBsb29rIGxpa2UgYGQ1YCAoZHJvcCA1IHNlZ21lbnRzKS5cbiAgICAgIGNvbnN0IHNlZ21lbnRzVG9Ecm9wID0gcGFyZW50Lmxlbmd0aCAtIGRpZmZTdGFydHNBdDtcbiAgICAgIGlmIChzZWdtZW50c1RvRHJvcCA+IDApIHtcbiAgICAgICAgcm1Db21tYW5kID0gJ2QnICsgKHNlZ21lbnRzVG9Ecm9wID4gMSA/IHNlZ21lbnRzVG9Ecm9wIDogJycpO1xuICAgICAgfVxuICAgICAgY29uc3QgY29tbWFuZCA9IHJtQ29tbWFuZCB8fCAnYSc7ICAvLyAnYScgc3RhbmRzIGZvciBcImFwcGVuZFwiXG4gICAgICByZXR1cm4gW2NvbW1hbmQsIC4uLmNoaWxkLnNsaWNlKGRpZmZTdGFydHNBdCldO1xuICAgIH1cbiAgfTtcbiAgY29uc3QgbWFrZUh5ZHJhdGlvbktleSA9XG4gICAgICAodmlld1NlZ21lbnRzOiBzdHJpbmdbXSwgZWxlbWVudElkOiBzdHJpbmcsIGlzVGV4dE1hcmtlcjogYm9vbGVhbik6IHN0cmluZyA9PiB7XG4gICAgICAgIHJldHVybiB2aWV3U2VnbWVudHMuam9pbignOicpICsgKGlzVGV4dE1hcmtlciA/ICc/JyA6ICd8JykgKyBlbGVtZW50SWQ7XG4gICAgICB9O1xuXG4gIGNvbnN0IHZpc2l0Tm9kZSA9IChwYXJlbnRLZXk6IFBhcnNlZEh5ZHJhdGlvbktleSwgbm9kZTogYW55KSA9PiB7XG4gICAgbGV0IHBhcnNlZE5vZGVLZXk6IFBhcnNlZEh5ZHJhdGlvbktleXxudWxsID0gbnVsbDtcbiAgICBjb25zdCBub2RlS2V5ID0gcmVhZEh5ZHJhdGlvbktleShub2RlKTtcbiAgICBpZiAobm9kZUtleSkge1xuICAgICAgcGFyc2VkTm9kZUtleSA9IHBhcnNlS2V5KG5vZGVLZXkpO1xuICAgICAgY29uc3QgW3ZpZXdTZWdtZW50cywgZWxlbWVudElkLCBpc1RleHRNYXJrZXJdID0gcGFyc2VkTm9kZUtleTtcbiAgICAgIC8vIFdlIGhhdmUgYm90aCBub2RlIGFuZCBjdXJyZW50IGtleXMsIGNvbXB1dGUgdHJhbnNmb3JtIGNvbW1hbmRcbiAgICAgIC8vIChiZXR3ZWVuIHZpZXcgc2VnbWVudHMgb25seSkuXG4gICAgICBjb25zdCBuZXdWaWV3U2VnbWVudHMgPSBjb21wdXRlVHJhbnNmb3JtQ29tbWFuZChwYXJlbnRLZXlbMF0sIHZpZXdTZWdtZW50cyk7XG4gICAgICBjb25zdCBuZXdLZXkgPSBtYWtlSHlkcmF0aW9uS2V5KG5ld1ZpZXdTZWdtZW50cywgZWxlbWVudElkLCBpc1RleHRNYXJrZXIpO1xuICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuQ09NTUVOVF9OT0RFKSB7XG4gICAgICAgIG5vZGUudGV4dENvbnRlbnQgPSBuZXdLZXk7XG4gICAgICB9IGVsc2UgeyAgLy8gTm9kZS5FTEVNRU5UX05PREVcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ25naCcsIG5ld0tleSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkTm9kZSA9IG5vZGUuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY2hpbGROb2RlKSB7XG4gICAgICAvLyBJZiB0aGUgY3VycmVudCBub2RlIGRvZXNuJ3QgaGF2ZSBpdHMgb3duIGtleSxcbiAgICAgIC8vIHVzZSBwYXJlbnQgbm9kZSBrZXkgaW5zdGVhZCwgc28gdGhhdCBjaGlsZCBrZXlcbiAgICAgIC8vIGlzIGNvbXB1dGVkIGJhc2VkIG9uIGl0LlxuICAgICAgdmlzaXROb2RlKHBhcnNlZE5vZGVLZXkgPz8gcGFyZW50S2V5LCBjaGlsZE5vZGUpO1xuICAgICAgY2hpbGROb2RlID0gY2hpbGROb2RlLm5leHRTaWJsaW5nO1xuICAgIH1cbiAgfTtcblxuICAvLyBTdGFydCB0aGUgcHJvY2VzcyBmb3IgYWxsIGNoaWxkIG5vZGVzIG9mIHRoZSByb290IG5vZGUuXG4gIGlmIChyb290LmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHJvb3RLZXkgPSBwYXJzZUtleShyZWFkSHlkcmF0aW9uS2V5KHJvb3QpISk7XG4gICAgcm9vdC5jaGlsZE5vZGVzLmZvckVhY2goKGNoaWxkOiBhbnkpID0+IHtcbiAgICAgIHZpc2l0Tm9kZShyb290S2V5LCBjaGlsZCk7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBWaXNpdHMgYWxsIGNoaWxkIG5vZGVzIG9mIGEgZ2l2ZW4gbm9kZSBhbmQgcmVzdG9yZXNcbiAqIGZ1bGwgaHlkcmF0aW9uIGtleXMgZm9yIGVhY2ggbm9kZSBiYXNlZCBvbiBwYXJlbnQgbm9kZVxuICogaHlkcmF0aW9uIGtleXMuIEVmZmVjdGl2ZWx5IHJldmVydHMgdGhlIGBjb21wcmVzc0h5ZHJhdGlvbktleXNgXG4gKiBvcGVyYXRpb24uXG4gKlxuICogVE9ETzogbWVyZ2UgdGhpcyBsb2dpYyBpbnRvIGBwb3B1bGF0ZU5vZGVSZWdpc3RyeWAgZXZlbnR1YWxseVxuICogICAgICAgKGtlZXAgaXQgc2VwYXJhdGUgZm9yIG5vdyBmb3IgdGVzdGluZyBwdXJwb3NlcykuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNvbXByZXNzSHlkcmF0aW9uS2V5cyhub2RlOiBhbnkpIHtcbiAgY29uc3QgdmlzaXROb2RlID0gKG5vZGU6IGFueSwgcGFyZW50Vmlld0tleTogc3RyaW5nKSA9PiB7XG4gICAgY29uc3Qgbm9kZUtleSA9IHJlYWRIeWRyYXRpb25LZXkobm9kZSk7XG4gICAgbGV0IG5vZGVWaWV3S2V5OiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gICAgaWYgKG5vZGVLZXkpIHtcbiAgICAgIGNvbnN0IHBhcnRzID0gbm9kZUtleS5zcGxpdCgvW3w/XS9nKTtcbiAgICAgIG5vZGVWaWV3S2V5ID0gcGFydHNbMF07XG4gICAgICAvLyBUT0RPOiBoYW5kbGUgYGROYCAoXCJkZWxldGUgTiBzZWdtZW50c1wiKSBjb21tYW5kcy5cbiAgICAgIGlmIChub2RlVmlld0tleS5zdGFydHNXaXRoKCdhJykpIHtcbiAgICAgICAgLy8gQ29tbWFuZCB0byBhZGQgYSBzZWdtZW50LCBkcm9wIGxlYWRpbmcgJ2EnLlxuICAgICAgICBub2RlVmlld0tleSA9IG5vZGVWaWV3S2V5LnNsaWNlKDEpO1xuICAgICAgfVxuICAgICAgbm9kZVZpZXdLZXkgPSBwYXJlbnRWaWV3S2V5ICsgbm9kZVZpZXdLZXk7XG5cbiAgICAgIGNvbnN0IHNlcGFyYXRvciA9IG5vZGVLZXkuaW5kZXhPZignfCcpID4gLTEgPyAnfCcgOiAnPyc7XG4gICAgICBjb25zdCBuZXdLZXkgPSBub2RlVmlld0tleSArIHNlcGFyYXRvciArIHBhcnRzWzFdO1xuICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuQ09NTUVOVF9OT0RFKSB7XG4gICAgICAgIG5vZGUudGV4dENvbnRlbnQgPSBuZXdLZXk7XG4gICAgICB9IGVsc2UgeyAgLy8gTm9kZS5FTEVNRU5UX05PREVcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ25naCcsIG5ld0tleSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkTm9kZSA9IG5vZGUuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY2hpbGROb2RlKSB7XG4gICAgICB2aXNpdE5vZGUoY2hpbGROb2RlLCBub2RlVmlld0tleSA/PyBwYXJlbnRWaWV3S2V5KTtcbiAgICAgIGNoaWxkTm9kZSA9IGNoaWxkTm9kZS5uZXh0U2libGluZztcbiAgICB9XG4gIH07XG4gIGNvbnN0IHBhcmVudEtleSA9IHJlYWRIeWRyYXRpb25LZXkobm9kZSk7XG4gIGlmIChwYXJlbnRLZXkpIHtcbiAgICAvLyBUYWtlIGV2ZXJ5dGhpbmcgYmVmb3JlICd8JyBvciAnPycgc3ltYm9scy5cbiAgICBjb25zdCBwYXJlbnRWaWV3S2V5ID0gcGFyZW50S2V5LnNwbGl0KC9bfD9dL2cpWzBdO1xuICAgIGlmIChub2RlLmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgbm9kZS5jaGlsZE5vZGVzLmZvckVhY2goKGNoaWxkOiBhbnkpID0+IHtcbiAgICAgICAgdmlzaXROb2RlKGNoaWxkLCBwYXJlbnRWaWV3S2V5KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuIl19