export var NodeNavigationStep;
(function (NodeNavigationStep) {
    NodeNavigationStep[NodeNavigationStep["FirstChild"] = 0] = "FirstChild";
    NodeNavigationStep[NodeNavigationStep["NextSibling"] = 1] = "NextSibling";
})(NodeNavigationStep || (NodeNavigationStep = {}));
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
        // throw new Error(`Ran off the top of the document when navigating between nodes`);
        console.log('Ran off the top of the document when navigating between nodes', start.tagName ?? start.nodeType, finish.tagName ?? finish.nodeType);
        return [];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9uYXYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1zZXJ2ZXIvc3JjL25vZGVfbmF2LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sQ0FBTixJQUFZLGtCQUdYO0FBSEQsV0FBWSxrQkFBa0I7SUFDNUIsdUVBQVUsQ0FBQTtJQUNWLHlFQUFXLENBQUE7QUFDYixDQUFDLEVBSFcsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUc3QjtBQUVEOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUMsS0FBVyxFQUFFLE1BQVk7SUFDdkQsSUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFO1FBQ3BCLE9BQU8sRUFBRSxDQUFDO0tBQ1g7U0FBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxhQUFhLElBQUksSUFBSSxFQUFFO1FBQ3RFLG9GQUFvRjtRQUNwRixPQUFPLENBQUMsR0FBRyxDQUFDLCtEQUErRCxFQUFHLEtBQWEsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRyxNQUFjLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuSyxPQUFPLEVBQUUsQ0FBQztLQUNYO1NBQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxLQUFLLE1BQU0sQ0FBQyxhQUFhLEVBQUU7UUFDdkQsT0FBTyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDL0M7U0FBTTtRQUNMLDZFQUE2RTtRQUM3RSxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsYUFBYyxDQUFDO1FBQ3JDLE9BQU87WUFDTCx1Q0FBdUM7WUFDdkMsR0FBRyxlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQztZQUNqQywyQkFBMkI7WUFDM0Isa0JBQWtCLENBQUMsVUFBVTtZQUM3QixpRkFBaUY7WUFDakYsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLFVBQVcsRUFBRSxNQUFNLENBQUM7U0FDL0MsQ0FBQztLQUNIO0FBQ0gsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQUMsS0FBVyxFQUFFLE1BQVk7SUFDeEQsTUFBTSxHQUFHLEdBQXlCLEVBQUUsQ0FBQztJQUNyQyxJQUFJLElBQUksR0FBYyxJQUFJLENBQUM7SUFDM0IsS0FBSyxJQUFJLEdBQUcsS0FBSyxFQUFFLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUMzRSxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQzFDO0lBQ0QsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO1FBQ2pCLHVGQUF1RjtRQUN2RixPQUFPLENBQUMsR0FBRyxDQUFDLGtFQUFrRSxDQUFDLENBQUM7UUFDaEYsT0FBTyxFQUFFLENBQUM7S0FDWDtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBlbnVtIE5vZGVOYXZpZ2F0aW9uU3RlcCB7XG4gIEZpcnN0Q2hpbGQsXG4gIE5leHRTaWJsaW5nLFxufVxuXG4vKipcbiAqIEdlbmVyYXRlIGEgbGlzdCBvZiBET00gbmF2aWdhdGlvbiBvcGVyYXRpb25zIHRvIGdldCBmcm9tIG5vZGUgYHN0YXJ0YCB0byBub2RlIGBmaW5pc2hgLlxuICpcbiAqIE5vdGU6IGFzc3VtZXMgdGhhdCBub2RlIGBzdGFydGAgb2NjdXJzIGJlZm9yZSBub2RlIGBmaW5pc2hgIGluIGFuIGluLW9yZGVyIHRyYXZlcnNhbCBvZiB0aGUgRE9NXG4gKiB0cmVlLiBUaGF0IGlzLCB3ZSBzaG91bGQgYmUgYWJsZSB0byBnZXQgZnJvbSBgc3RhcnRgIHRvIGBmaW5pc2hgIHB1cmVseSBieSB1c2luZyBgLmZpcnN0Q2hpbGRgXG4gKiBhbmQgYC5uZXh0U2libGluZ2Agb3BlcmF0aW9ucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5hdmlnYXRlQmV0d2VlbihzdGFydDogTm9kZSwgZmluaXNoOiBOb2RlKTogTm9kZU5hdmlnYXRpb25TdGVwW10ge1xuICBpZiAoc3RhcnQgPT09IGZpbmlzaCkge1xuICAgIHJldHVybiBbXTtcbiAgfSBlbHNlIGlmIChzdGFydC5wYXJlbnRFbGVtZW50ID09IG51bGwgfHwgZmluaXNoLnBhcmVudEVsZW1lbnQgPT0gbnVsbCkge1xuICAgIC8vIHRocm93IG5ldyBFcnJvcihgUmFuIG9mZiB0aGUgdG9wIG9mIHRoZSBkb2N1bWVudCB3aGVuIG5hdmlnYXRpbmcgYmV0d2VlbiBub2Rlc2ApO1xuICAgIGNvbnNvbGUubG9nKCdSYW4gb2ZmIHRoZSB0b3Agb2YgdGhlIGRvY3VtZW50IHdoZW4gbmF2aWdhdGluZyBiZXR3ZWVuIG5vZGVzJywgKHN0YXJ0IGFzIGFueSkudGFnTmFtZSA/PyBzdGFydC5ub2RlVHlwZSwgKGZpbmlzaCBhcyBhbnkpLnRhZ05hbWUgPz8gZmluaXNoLm5vZGVUeXBlKTtcbiAgICByZXR1cm4gW107XG4gIH0gZWxzZSBpZiAoc3RhcnQucGFyZW50RWxlbWVudCA9PT0gZmluaXNoLnBhcmVudEVsZW1lbnQpIHtcbiAgICByZXR1cm4gbmF2aWdhdGVCZXR3ZWVuU2libGluZ3Moc3RhcnQsIGZpbmlzaCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gYGZpbmlzaGAgaXMgYSBjaGlsZCBvZiBpdHMgcGFyZW50LCBzbyB0aGUgcGFyZW50IHdpbGwgYWx3YXlzIGhhdmUgYSBjaGlsZC5cbiAgICBjb25zdCBwYXJlbnQgPSBmaW5pc2gucGFyZW50RWxlbWVudCE7XG4gICAgcmV0dXJuIFtcbiAgICAgIC8vIEZpcnN0IG5hdmlnYXRlIHRvIGBmaW5pc2hgJ3MgcGFyZW50LlxuICAgICAgLi4ubmF2aWdhdGVCZXR3ZWVuKHN0YXJ0LCBwYXJlbnQpLFxuICAgICAgLy8gVGhlbiB0byBpdHMgZmlyc3QgY2hpbGQuXG4gICAgICBOb2RlTmF2aWdhdGlvblN0ZXAuRmlyc3RDaGlsZCxcbiAgICAgIC8vIEFuZCBmaW5hbGx5IGZyb20gdGhhdCBub2RlIHRvIGBmaW5pc2hgIChtYXliZSBhIG5vLW9wIGlmIHdlJ3JlIGFscmVhZHkgdGhlcmUpLlxuICAgICAgLi4ubmF2aWdhdGVCZXR3ZWVuKHBhcmVudC5maXJzdENoaWxkISwgZmluaXNoKSxcbiAgICBdO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5hdmlnYXRlQmV0d2VlblNpYmxpbmdzKHN0YXJ0OiBOb2RlLCBmaW5pc2g6IE5vZGUpOiBOb2RlTmF2aWdhdGlvblN0ZXBbXSB7XG4gIGNvbnN0IG5hdjogTm9kZU5hdmlnYXRpb25TdGVwW10gPSBbXTtcbiAgbGV0IG5vZGU6IE5vZGV8bnVsbCA9IG51bGw7XG4gIGZvciAobm9kZSA9IHN0YXJ0OyBub2RlICE9IG51bGwgJiYgbm9kZSAhPT0gZmluaXNoOyBub2RlID0gbm9kZS5uZXh0U2libGluZykge1xuICAgIG5hdi5wdXNoKE5vZGVOYXZpZ2F0aW9uU3RlcC5OZXh0U2libGluZyk7XG4gIH1cbiAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAvLyB0aHJvdyBuZXcgRXJyb3IoYElzIGZpbmlzaCBiZWZvcmUgc3RhcnQ/IEhpdCBlbmQgb2Ygc2libGluZ3MgYmVmb3JlIGZpbmRpbmcgc3RhcnRgKTtcbiAgICBjb25zb2xlLmxvZyhgSXMgZmluaXNoIGJlZm9yZSBzdGFydD8gSGl0IGVuZCBvZiBzaWJsaW5ncyBiZWZvcmUgZmluZGluZyBzdGFydGApO1xuICAgIHJldHVybiBbXTtcbiAgfVxuICByZXR1cm4gbmF2O1xufVxuIl19