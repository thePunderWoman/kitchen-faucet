/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { compressHydrationKeys, decompressHydrationKeys, readHydrationKey } from './compression';
import { readPatchedHydrationKey } from './keys';
/**
 * Annotates document nodes with extra info needed for hydration on a client later.
 * This function is used on the server before serializing the document to a string.
 *
 * DOM nodes are annotated as described below:
 * - comment nodes: hydration key is inserted as a content
 * - element nodes: a new `ngh` attribute is added
 * - text nodes: a new comment node is created with a key
 *               and append this comment node after the text node
 */
export function annotateForHydration(doc, element, enableKeyCompression) {
    const visitNode = (node) => {
        const hydrationKey = readPatchedHydrationKey(node);
        if (hydrationKey) {
            if (node.nodeType === Node.COMMENT_NODE) {
                node.textContent = hydrationKey;
            }
            else if (node.nodeType === Node.ELEMENT_NODE) {
                node.setAttribute('ngh', hydrationKey);
            }
            else if (node.nodeType === Node.TEXT_NODE) {
                // Note: `?` is a special marker that represents a marker for a text node.
                const key = hydrationKey.replace('|', '?');
                const marker = doc.createComment(key);
                node.after(marker);
            }
        }
        let current = node.firstChild;
        while (current) {
            visitNode(current);
            current = current.nextSibling;
        }
    };
    visitNode(element);
    if (enableKeyCompression) {
        compressHydrationKeys(element);
    }
}
/**
 * Walks over DOM nodes and collects all annotated ones (see `annotateForHydration`)
 * in a registry, which is later used during the hydration process.
 */
export function collectHydratableNodes(node, registry, enableHydrationKeyCompression) {
    let visitedNodes = 0;
    const visitNode = (node) => {
        visitedNodes++;
        const nodeKey = readHydrationKey(node);
        if (nodeKey) {
            registry.set(nodeKey, node);
        }
        let current = node.firstChild;
        while (current) {
            visitNode(current);
            current = current.nextSibling;
        }
    };
    if (enableHydrationKeyCompression) {
        decompressHydrationKeys(node);
    }
    visitNode(node);
    // Return a number of visited nodes for debugging purposes.
    // TODO: consider removing once no longer needed.
    return visitedNodes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vYW5ub3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLGdCQUFnQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQy9GLE9BQU8sRUFBQyx1QkFBdUIsRUFBQyxNQUFNLFFBQVEsQ0FBQztBQUUvQzs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLFVBQVUsb0JBQW9CLENBQ2hDLEdBQWEsRUFBRSxPQUFnQixFQUFFLG9CQUE2QjtJQUNoRSxNQUFNLFNBQVMsR0FBRyxDQUFDLElBQVMsRUFBRSxFQUFFO1FBQzlCLE1BQU0sWUFBWSxHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25ELElBQUksWUFBWSxFQUFFO1lBQ2hCLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFO2dCQUN2QyxJQUFJLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQzthQUNqQztpQkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLFlBQVksRUFBRTtnQkFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7YUFDeEM7aUJBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQzNDLDBFQUEwRTtnQkFDMUUsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDcEI7U0FDRjtRQUVELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDOUIsT0FBTyxPQUFPLEVBQUU7WUFDZCxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDL0I7SUFDSCxDQUFDLENBQUM7SUFDRixTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFbkIsSUFBSSxvQkFBb0IsRUFBRTtRQUN4QixxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUNoQztBQUNILENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsc0JBQXNCLENBQ2xDLElBQVMsRUFBRSxRQUE4QixFQUFFLDZCQUFzQztJQUNuRixJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7SUFDckIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFTLEVBQUUsRUFBRTtRQUM5QixZQUFZLEVBQUUsQ0FBQztRQUNmLE1BQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLElBQUksT0FBTyxFQUFFO1lBQ1gsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDN0I7UUFFRCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQzlCLE9BQU8sT0FBTyxFQUFFO1lBQ2QsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25CLE9BQU8sR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQy9CO0lBQ0gsQ0FBQyxDQUFDO0lBQ0YsSUFBSSw2QkFBNkIsRUFBRTtRQUNqQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUMvQjtJQUNELFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVoQiwyREFBMkQ7SUFDM0QsaURBQWlEO0lBQ2pELE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtjb21wcmVzc0h5ZHJhdGlvbktleXMsIGRlY29tcHJlc3NIeWRyYXRpb25LZXlzLCByZWFkSHlkcmF0aW9uS2V5fSBmcm9tICcuL2NvbXByZXNzaW9uJztcbmltcG9ydCB7cmVhZFBhdGNoZWRIeWRyYXRpb25LZXl9IGZyb20gJy4va2V5cyc7XG5cbi8qKlxuICogQW5ub3RhdGVzIGRvY3VtZW50IG5vZGVzIHdpdGggZXh0cmEgaW5mbyBuZWVkZWQgZm9yIGh5ZHJhdGlvbiBvbiBhIGNsaWVudCBsYXRlci5cbiAqIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCBvbiB0aGUgc2VydmVyIGJlZm9yZSBzZXJpYWxpemluZyB0aGUgZG9jdW1lbnQgdG8gYSBzdHJpbmcuXG4gKlxuICogRE9NIG5vZGVzIGFyZSBhbm5vdGF0ZWQgYXMgZGVzY3JpYmVkIGJlbG93OlxuICogLSBjb21tZW50IG5vZGVzOiBoeWRyYXRpb24ga2V5IGlzIGluc2VydGVkIGFzIGEgY29udGVudFxuICogLSBlbGVtZW50IG5vZGVzOiBhIG5ldyBgbmdoYCBhdHRyaWJ1dGUgaXMgYWRkZWRcbiAqIC0gdGV4dCBub2RlczogYSBuZXcgY29tbWVudCBub2RlIGlzIGNyZWF0ZWQgd2l0aCBhIGtleVxuICogICAgICAgICAgICAgICBhbmQgYXBwZW5kIHRoaXMgY29tbWVudCBub2RlIGFmdGVyIHRoZSB0ZXh0IG5vZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFubm90YXRlRm9ySHlkcmF0aW9uKFxuICAgIGRvYzogRG9jdW1lbnQsIGVsZW1lbnQ6IEVsZW1lbnQsIGVuYWJsZUtleUNvbXByZXNzaW9uOiBib29sZWFuKSB7XG4gIGNvbnN0IHZpc2l0Tm9kZSA9IChub2RlOiBhbnkpID0+IHtcbiAgICBjb25zdCBoeWRyYXRpb25LZXkgPSByZWFkUGF0Y2hlZEh5ZHJhdGlvbktleShub2RlKTtcbiAgICBpZiAoaHlkcmF0aW9uS2V5KSB7XG4gICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5DT01NRU5UX05PREUpIHtcbiAgICAgICAgbm9kZS50ZXh0Q29udGVudCA9IGh5ZHJhdGlvbktleTtcbiAgICAgIH0gZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ25naCcsIGh5ZHJhdGlvbktleSk7XG4gICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG4gICAgICAgIC8vIE5vdGU6IGA/YCBpcyBhIHNwZWNpYWwgbWFya2VyIHRoYXQgcmVwcmVzZW50cyBhIG1hcmtlciBmb3IgYSB0ZXh0IG5vZGUuXG4gICAgICAgIGNvbnN0IGtleSA9IGh5ZHJhdGlvbktleS5yZXBsYWNlKCd8JywgJz8nKTtcbiAgICAgICAgY29uc3QgbWFya2VyID0gZG9jLmNyZWF0ZUNvbW1lbnQoa2V5KTtcbiAgICAgICAgbm9kZS5hZnRlcihtYXJrZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBjdXJyZW50ID0gbm9kZS5maXJzdENoaWxkO1xuICAgIHdoaWxlIChjdXJyZW50KSB7XG4gICAgICB2aXNpdE5vZGUoY3VycmVudCk7XG4gICAgICBjdXJyZW50ID0gY3VycmVudC5uZXh0U2libGluZztcbiAgICB9XG4gIH07XG4gIHZpc2l0Tm9kZShlbGVtZW50KTtcblxuICBpZiAoZW5hYmxlS2V5Q29tcHJlc3Npb24pIHtcbiAgICBjb21wcmVzc0h5ZHJhdGlvbktleXMoZWxlbWVudCk7XG4gIH1cbn1cblxuLyoqXG4gKiBXYWxrcyBvdmVyIERPTSBub2RlcyBhbmQgY29sbGVjdHMgYWxsIGFubm90YXRlZCBvbmVzIChzZWUgYGFubm90YXRlRm9ySHlkcmF0aW9uYClcbiAqIGluIGEgcmVnaXN0cnksIHdoaWNoIGlzIGxhdGVyIHVzZWQgZHVyaW5nIHRoZSBoeWRyYXRpb24gcHJvY2Vzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbGxlY3RIeWRyYXRhYmxlTm9kZXMoXG4gICAgbm9kZTogYW55LCByZWdpc3RyeTogTWFwPHN0cmluZywgRWxlbWVudD4sIGVuYWJsZUh5ZHJhdGlvbktleUNvbXByZXNzaW9uOiBib29sZWFuKTogbnVtYmVyIHtcbiAgbGV0IHZpc2l0ZWROb2RlcyA9IDA7XG4gIGNvbnN0IHZpc2l0Tm9kZSA9IChub2RlOiBhbnkpID0+IHtcbiAgICB2aXNpdGVkTm9kZXMrKztcbiAgICBjb25zdCBub2RlS2V5ID0gcmVhZEh5ZHJhdGlvbktleShub2RlKTtcbiAgICBpZiAobm9kZUtleSkge1xuICAgICAgcmVnaXN0cnkuc2V0KG5vZGVLZXksIG5vZGUpO1xuICAgIH1cblxuICAgIGxldCBjdXJyZW50ID0gbm9kZS5maXJzdENoaWxkO1xuICAgIHdoaWxlIChjdXJyZW50KSB7XG4gICAgICB2aXNpdE5vZGUoY3VycmVudCk7XG4gICAgICBjdXJyZW50ID0gY3VycmVudC5uZXh0U2libGluZztcbiAgICB9XG4gIH07XG4gIGlmIChlbmFibGVIeWRyYXRpb25LZXlDb21wcmVzc2lvbikge1xuICAgIGRlY29tcHJlc3NIeWRyYXRpb25LZXlzKG5vZGUpO1xuICB9XG4gIHZpc2l0Tm9kZShub2RlKTtcblxuICAvLyBSZXR1cm4gYSBudW1iZXIgb2YgdmlzaXRlZCBub2RlcyBmb3IgZGVidWdnaW5nIHB1cnBvc2VzLlxuICAvLyBUT0RPOiBjb25zaWRlciByZW1vdmluZyBvbmNlIG5vIGxvbmdlciBuZWVkZWQuXG4gIHJldHVybiB2aXNpdGVkTm9kZXM7XG59Il19