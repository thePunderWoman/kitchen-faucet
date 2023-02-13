/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export var NodeNavigationStep;
(function (NodeNavigationStep) {
    NodeNavigationStep[NodeNavigationStep["FirstChild"] = 0] = "FirstChild";
    NodeNavigationStep[NodeNavigationStep["NextSibling"] = 1] = "NextSibling";
})(NodeNavigationStep || (NodeNavigationStep = {}));
export class NoPathFoundError extends Error {
}
function describeNode(node) {
    // TODO: if it's a text node - output `#text(CONTENT)`,
    // if it's a comment node - output `#comment(CONTENT)`.
    return node.tagName ?? node.nodeType;
}
/**
 * Generate a list of DOM navigation operations to get from node `start` to node `finish`.
 *
 * Note: assumes that node `start` occurs before node `finish` in an in-order traversal of the DOM
 * tree. That is, we should be able to get from `start` to `finish` purely by using `.firstChild`
 * and `.nextSibling` operations.
 */
export function navigateBetween(start, finish) {
    if (start === finish) {
        return [];
    }
    else if (start.parentElement == null || finish.parentElement == null) {
        const startNodeInfo = describeNode(start);
        const finishNodeInfo = describeNode(finish);
        throw new NoPathFoundError(`Ran off the top of the document when navigating between nodes: ` +
            `'${startNodeInfo}' and '${finishNodeInfo}'.`);
    }
    else if (start.parentElement === finish.parentElement) {
        return navigateBetweenSiblings(start, finish);
    }
    else {
        // `finish` is a child of its parent, so the parent will always have a child.
        const parent = finish.parentElement;
        return [
            // First navigate to `finish`'s parent.
            ...navigateBetween(start, parent),
            // Then to its first child.
            NodeNavigationStep.FirstChild,
            // And finally from that node to `finish` (maybe a no-op if we're already there).
            ...navigateBetween(parent.firstChild, finish),
        ];
    }
}
function navigateBetweenSiblings(start, finish) {
    const nav = [];
    let node = null;
    for (node = start; node != null && node !== finish; node = node.nextSibling) {
        nav.push(NodeNavigationStep.NextSibling);
    }
    if (node === null) {
        // throw new Error(`Is finish before start? Hit end of siblings before finding start`);
        console.log(`Is finish before start? Hit end of siblings before finding start`);
        return [];
    }
    return nav;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9uYXYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1zZXJ2ZXIvc3JjL25vZGVfbmF2LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE1BQU0sQ0FBTixJQUFZLGtCQUdYO0FBSEQsV0FBWSxrQkFBa0I7SUFDNUIsdUVBQVUsQ0FBQTtJQUNWLHlFQUFXLENBQUE7QUFDYixDQUFDLEVBSFcsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUc3QjtBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxLQUFLO0NBQUc7QUFFOUMsU0FBUyxZQUFZLENBQUMsSUFBVTtJQUM5Qix1REFBdUQ7SUFDdkQsdURBQXVEO0lBQ3ZELE9BQVEsSUFBZ0IsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQztBQUNwRCxDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBQyxLQUFXLEVBQUUsTUFBWTtJQUN2RCxJQUFJLEtBQUssS0FBSyxNQUFNLEVBQUU7UUFDcEIsT0FBTyxFQUFFLENBQUM7S0FDWDtTQUFNLElBQUksS0FBSyxDQUFDLGFBQWEsSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLGFBQWEsSUFBSSxJQUFJLEVBQUU7UUFDdEUsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFDLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QyxNQUFNLElBQUksZ0JBQWdCLENBQ3RCLGlFQUFpRTtZQUNqRSxJQUFJLGFBQWEsVUFBVSxjQUFjLElBQUksQ0FBQyxDQUFDO0tBQ3BEO1NBQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxLQUFLLE1BQU0sQ0FBQyxhQUFhLEVBQUU7UUFDdkQsT0FBTyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDL0M7U0FBTTtRQUNMLDZFQUE2RTtRQUM3RSxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsYUFBYyxDQUFDO1FBQ3JDLE9BQU87WUFDTCx1Q0FBdUM7WUFDdkMsR0FBRyxlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQztZQUNqQywyQkFBMkI7WUFDM0Isa0JBQWtCLENBQUMsVUFBVTtZQUM3QixpRkFBaUY7WUFDakYsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLFVBQVcsRUFBRSxNQUFNLENBQUM7U0FDL0MsQ0FBQztLQUNIO0FBQ0gsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQUMsS0FBVyxFQUFFLE1BQVk7SUFDeEQsTUFBTSxHQUFHLEdBQXlCLEVBQUUsQ0FBQztJQUNyQyxJQUFJLElBQUksR0FBYyxJQUFJLENBQUM7SUFDM0IsS0FBSyxJQUFJLEdBQUcsS0FBSyxFQUFFLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUMzRSxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQzFDO0lBQ0QsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO1FBQ2pCLHVGQUF1RjtRQUN2RixPQUFPLENBQUMsR0FBRyxDQUFDLGtFQUFrRSxDQUFDLENBQUM7UUFDaEYsT0FBTyxFQUFFLENBQUM7S0FDWDtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQgZW51bSBOb2RlTmF2aWdhdGlvblN0ZXAge1xuICBGaXJzdENoaWxkLFxuICBOZXh0U2libGluZyxcbn1cblxuZXhwb3J0IGNsYXNzIE5vUGF0aEZvdW5kRXJyb3IgZXh0ZW5kcyBFcnJvciB7fVxuXG5mdW5jdGlvbiBkZXNjcmliZU5vZGUobm9kZTogTm9kZSk6IHN0cmluZyB7XG4gIC8vIFRPRE86IGlmIGl0J3MgYSB0ZXh0IG5vZGUgLSBvdXRwdXQgYCN0ZXh0KENPTlRFTlQpYCxcbiAgLy8gaWYgaXQncyBhIGNvbW1lbnQgbm9kZSAtIG91dHB1dCBgI2NvbW1lbnQoQ09OVEVOVClgLlxuICByZXR1cm4gKG5vZGUgYXMgRWxlbWVudCkudGFnTmFtZSA/PyBub2RlLm5vZGVUeXBlO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGEgbGlzdCBvZiBET00gbmF2aWdhdGlvbiBvcGVyYXRpb25zIHRvIGdldCBmcm9tIG5vZGUgYHN0YXJ0YCB0byBub2RlIGBmaW5pc2hgLlxuICpcbiAqIE5vdGU6IGFzc3VtZXMgdGhhdCBub2RlIGBzdGFydGAgb2NjdXJzIGJlZm9yZSBub2RlIGBmaW5pc2hgIGluIGFuIGluLW9yZGVyIHRyYXZlcnNhbCBvZiB0aGUgRE9NXG4gKiB0cmVlLiBUaGF0IGlzLCB3ZSBzaG91bGQgYmUgYWJsZSB0byBnZXQgZnJvbSBgc3RhcnRgIHRvIGBmaW5pc2hgIHB1cmVseSBieSB1c2luZyBgLmZpcnN0Q2hpbGRgXG4gKiBhbmQgYC5uZXh0U2libGluZ2Agb3BlcmF0aW9ucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5hdmlnYXRlQmV0d2VlbihzdGFydDogTm9kZSwgZmluaXNoOiBOb2RlKTogTm9kZU5hdmlnYXRpb25TdGVwW10ge1xuICBpZiAoc3RhcnQgPT09IGZpbmlzaCkge1xuICAgIHJldHVybiBbXTtcbiAgfSBlbHNlIGlmIChzdGFydC5wYXJlbnRFbGVtZW50ID09IG51bGwgfHwgZmluaXNoLnBhcmVudEVsZW1lbnQgPT0gbnVsbCkge1xuICAgIGNvbnN0IHN0YXJ0Tm9kZUluZm8gPSBkZXNjcmliZU5vZGUoc3RhcnQpO1xuICAgIGNvbnN0IGZpbmlzaE5vZGVJbmZvID0gZGVzY3JpYmVOb2RlKGZpbmlzaCk7XG4gICAgdGhyb3cgbmV3IE5vUGF0aEZvdW5kRXJyb3IoXG4gICAgICAgIGBSYW4gb2ZmIHRoZSB0b3Agb2YgdGhlIGRvY3VtZW50IHdoZW4gbmF2aWdhdGluZyBiZXR3ZWVuIG5vZGVzOiBgICtcbiAgICAgICAgYCcke3N0YXJ0Tm9kZUluZm99JyBhbmQgJyR7ZmluaXNoTm9kZUluZm99Jy5gKTtcbiAgfSBlbHNlIGlmIChzdGFydC5wYXJlbnRFbGVtZW50ID09PSBmaW5pc2gucGFyZW50RWxlbWVudCkge1xuICAgIHJldHVybiBuYXZpZ2F0ZUJldHdlZW5TaWJsaW5ncyhzdGFydCwgZmluaXNoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBgZmluaXNoYCBpcyBhIGNoaWxkIG9mIGl0cyBwYXJlbnQsIHNvIHRoZSBwYXJlbnQgd2lsbCBhbHdheXMgaGF2ZSBhIGNoaWxkLlxuICAgIGNvbnN0IHBhcmVudCA9IGZpbmlzaC5wYXJlbnRFbGVtZW50ITtcbiAgICByZXR1cm4gW1xuICAgICAgLy8gRmlyc3QgbmF2aWdhdGUgdG8gYGZpbmlzaGAncyBwYXJlbnQuXG4gICAgICAuLi5uYXZpZ2F0ZUJldHdlZW4oc3RhcnQsIHBhcmVudCksXG4gICAgICAvLyBUaGVuIHRvIGl0cyBmaXJzdCBjaGlsZC5cbiAgICAgIE5vZGVOYXZpZ2F0aW9uU3RlcC5GaXJzdENoaWxkLFxuICAgICAgLy8gQW5kIGZpbmFsbHkgZnJvbSB0aGF0IG5vZGUgdG8gYGZpbmlzaGAgKG1heWJlIGEgbm8tb3AgaWYgd2UncmUgYWxyZWFkeSB0aGVyZSkuXG4gICAgICAuLi5uYXZpZ2F0ZUJldHdlZW4ocGFyZW50LmZpcnN0Q2hpbGQhLCBmaW5pc2gpLFxuICAgIF07XG4gIH1cbn1cblxuZnVuY3Rpb24gbmF2aWdhdGVCZXR3ZWVuU2libGluZ3Moc3RhcnQ6IE5vZGUsIGZpbmlzaDogTm9kZSk6IE5vZGVOYXZpZ2F0aW9uU3RlcFtdIHtcbiAgY29uc3QgbmF2OiBOb2RlTmF2aWdhdGlvblN0ZXBbXSA9IFtdO1xuICBsZXQgbm9kZTogTm9kZXxudWxsID0gbnVsbDtcbiAgZm9yIChub2RlID0gc3RhcnQ7IG5vZGUgIT0gbnVsbCAmJiBub2RlICE9PSBmaW5pc2g7IG5vZGUgPSBub2RlLm5leHRTaWJsaW5nKSB7XG4gICAgbmF2LnB1c2goTm9kZU5hdmlnYXRpb25TdGVwLk5leHRTaWJsaW5nKTtcbiAgfVxuICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgIC8vIHRocm93IG5ldyBFcnJvcihgSXMgZmluaXNoIGJlZm9yZSBzdGFydD8gSGl0IGVuZCBvZiBzaWJsaW5ncyBiZWZvcmUgZmluZGluZyBzdGFydGApO1xuICAgIGNvbnNvbGUubG9nKGBJcyBmaW5pc2ggYmVmb3JlIHN0YXJ0PyBIaXQgZW5kIG9mIHNpYmxpbmdzIGJlZm9yZSBmaW5kaW5nIHN0YXJ0YCk7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHJldHVybiBuYXY7XG59XG4iXX0=