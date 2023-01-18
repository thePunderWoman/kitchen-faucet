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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9uYXYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1zZXJ2ZXIvc3JjL25vZGVfbmF2LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sQ0FBTixJQUFZLGtCQUdYO0FBSEQsV0FBWSxrQkFBa0I7SUFDNUIsdUVBQVUsQ0FBQTtJQUNWLHlFQUFXLENBQUE7QUFDYixDQUFDLEVBSFcsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUc3QjtBQUVEOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUMsS0FBVyxFQUFFLE1BQVk7SUFDdkQsSUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFO1FBQ3BCLE9BQU8sRUFBRSxDQUFDO0tBQ1g7U0FBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxhQUFhLElBQUksSUFBSSxFQUFFO1FBQ3RFLG9GQUFvRjtRQUNwRixPQUFPLENBQUMsR0FBRyxDQUNQLCtEQUErRCxFQUM5RCxLQUFhLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUcsTUFBYyxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUYsT0FBTyxFQUFFLENBQUM7S0FDWDtTQUFNLElBQUksS0FBSyxDQUFDLGFBQWEsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFO1FBQ3ZELE9BQU8sdUJBQXVCLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0tBQy9DO1NBQU07UUFDTCw2RUFBNkU7UUFDN0UsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLGFBQWMsQ0FBQztRQUNyQyxPQUFPO1lBQ0wsdUNBQXVDO1lBQ3ZDLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUM7WUFDakMsMkJBQTJCO1lBQzNCLGtCQUFrQixDQUFDLFVBQVU7WUFDN0IsaUZBQWlGO1lBQ2pGLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxVQUFXLEVBQUUsTUFBTSxDQUFDO1NBQy9DLENBQUM7S0FDSDtBQUNILENBQUM7QUFFRCxTQUFTLHVCQUF1QixDQUFDLEtBQVcsRUFBRSxNQUFZO0lBQ3hELE1BQU0sR0FBRyxHQUF5QixFQUFFLENBQUM7SUFDckMsSUFBSSxJQUFJLEdBQWMsSUFBSSxDQUFDO0lBQzNCLEtBQUssSUFBSSxHQUFHLEtBQUssRUFBRSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxNQUFNLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUU7UUFDM0UsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUMxQztJQUNELElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtRQUNqQix1RkFBdUY7UUFDdkYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrRUFBa0UsQ0FBQyxDQUFDO1FBQ2hGLE9BQU8sRUFBRSxDQUFDO0tBQ1g7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZW51bSBOb2RlTmF2aWdhdGlvblN0ZXAge1xuICBGaXJzdENoaWxkLFxuICBOZXh0U2libGluZyxcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBhIGxpc3Qgb2YgRE9NIG5hdmlnYXRpb24gb3BlcmF0aW9ucyB0byBnZXQgZnJvbSBub2RlIGBzdGFydGAgdG8gbm9kZSBgZmluaXNoYC5cbiAqXG4gKiBOb3RlOiBhc3N1bWVzIHRoYXQgbm9kZSBgc3RhcnRgIG9jY3VycyBiZWZvcmUgbm9kZSBgZmluaXNoYCBpbiBhbiBpbi1vcmRlciB0cmF2ZXJzYWwgb2YgdGhlIERPTVxuICogdHJlZS4gVGhhdCBpcywgd2Ugc2hvdWxkIGJlIGFibGUgdG8gZ2V0IGZyb20gYHN0YXJ0YCB0byBgZmluaXNoYCBwdXJlbHkgYnkgdXNpbmcgYC5maXJzdENoaWxkYFxuICogYW5kIGAubmV4dFNpYmxpbmdgIG9wZXJhdGlvbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBuYXZpZ2F0ZUJldHdlZW4oc3RhcnQ6IE5vZGUsIGZpbmlzaDogTm9kZSk6IE5vZGVOYXZpZ2F0aW9uU3RlcFtdIHtcbiAgaWYgKHN0YXJ0ID09PSBmaW5pc2gpIHtcbiAgICByZXR1cm4gW107XG4gIH0gZWxzZSBpZiAoc3RhcnQucGFyZW50RWxlbWVudCA9PSBudWxsIHx8IGZpbmlzaC5wYXJlbnRFbGVtZW50ID09IG51bGwpIHtcbiAgICAvLyB0aHJvdyBuZXcgRXJyb3IoYFJhbiBvZmYgdGhlIHRvcCBvZiB0aGUgZG9jdW1lbnQgd2hlbiBuYXZpZ2F0aW5nIGJldHdlZW4gbm9kZXNgKTtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgJ1JhbiBvZmYgdGhlIHRvcCBvZiB0aGUgZG9jdW1lbnQgd2hlbiBuYXZpZ2F0aW5nIGJldHdlZW4gbm9kZXMnLFxuICAgICAgICAoc3RhcnQgYXMgYW55KS50YWdOYW1lID8/IHN0YXJ0Lm5vZGVUeXBlLCAoZmluaXNoIGFzIGFueSkudGFnTmFtZSA/PyBmaW5pc2gubm9kZVR5cGUpO1xuICAgIHJldHVybiBbXTtcbiAgfSBlbHNlIGlmIChzdGFydC5wYXJlbnRFbGVtZW50ID09PSBmaW5pc2gucGFyZW50RWxlbWVudCkge1xuICAgIHJldHVybiBuYXZpZ2F0ZUJldHdlZW5TaWJsaW5ncyhzdGFydCwgZmluaXNoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBgZmluaXNoYCBpcyBhIGNoaWxkIG9mIGl0cyBwYXJlbnQsIHNvIHRoZSBwYXJlbnQgd2lsbCBhbHdheXMgaGF2ZSBhIGNoaWxkLlxuICAgIGNvbnN0IHBhcmVudCA9IGZpbmlzaC5wYXJlbnRFbGVtZW50ITtcbiAgICByZXR1cm4gW1xuICAgICAgLy8gRmlyc3QgbmF2aWdhdGUgdG8gYGZpbmlzaGAncyBwYXJlbnQuXG4gICAgICAuLi5uYXZpZ2F0ZUJldHdlZW4oc3RhcnQsIHBhcmVudCksXG4gICAgICAvLyBUaGVuIHRvIGl0cyBmaXJzdCBjaGlsZC5cbiAgICAgIE5vZGVOYXZpZ2F0aW9uU3RlcC5GaXJzdENoaWxkLFxuICAgICAgLy8gQW5kIGZpbmFsbHkgZnJvbSB0aGF0IG5vZGUgdG8gYGZpbmlzaGAgKG1heWJlIGEgbm8tb3AgaWYgd2UncmUgYWxyZWFkeSB0aGVyZSkuXG4gICAgICAuLi5uYXZpZ2F0ZUJldHdlZW4ocGFyZW50LmZpcnN0Q2hpbGQhLCBmaW5pc2gpLFxuICAgIF07XG4gIH1cbn1cblxuZnVuY3Rpb24gbmF2aWdhdGVCZXR3ZWVuU2libGluZ3Moc3RhcnQ6IE5vZGUsIGZpbmlzaDogTm9kZSk6IE5vZGVOYXZpZ2F0aW9uU3RlcFtdIHtcbiAgY29uc3QgbmF2OiBOb2RlTmF2aWdhdGlvblN0ZXBbXSA9IFtdO1xuICBsZXQgbm9kZTogTm9kZXxudWxsID0gbnVsbDtcbiAgZm9yIChub2RlID0gc3RhcnQ7IG5vZGUgIT0gbnVsbCAmJiBub2RlICE9PSBmaW5pc2g7IG5vZGUgPSBub2RlLm5leHRTaWJsaW5nKSB7XG4gICAgbmF2LnB1c2goTm9kZU5hdmlnYXRpb25TdGVwLk5leHRTaWJsaW5nKTtcbiAgfVxuICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgIC8vIHRocm93IG5ldyBFcnJvcihgSXMgZmluaXNoIGJlZm9yZSBzdGFydD8gSGl0IGVuZCBvZiBzaWJsaW5ncyBiZWZvcmUgZmluZGluZyBzdGFydGApO1xuICAgIGNvbnNvbGUubG9nKGBJcyBmaW5pc2ggYmVmb3JlIHN0YXJ0PyBIaXQgZW5kIG9mIHNpYmxpbmdzIGJlZm9yZSBmaW5kaW5nIHN0YXJ0YCk7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHJldHVybiBuYXY7XG59XG4iXX0=