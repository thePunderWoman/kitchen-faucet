/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { DOCUMENT } from '@angular/common';
import { APP_ID, Inject, Injectable } from '@angular/core';
import * as i0 from "@angular/core";
export class SharedStylesHost {
    constructor() {
        this.usageCount = new Map();
    }
    addStyles(styles) {
        for (const style of styles) {
            const usageCount = this.changeUsageCount(style, 1);
            if (usageCount === 1) {
                this.onStyleAdded(style);
            }
        }
    }
    removeStyles(styles) {
        for (const style of styles) {
            const usageCount = this.changeUsageCount(style, -1);
            if (usageCount === 0) {
                this.onStyleRemoved(style);
            }
        }
    }
    onStyleRemoved(style) { }
    onStyleAdded(style) { }
    getAllStyles() {
        return this.usageCount.keys();
    }
    changeUsageCount(style, delta) {
        const map = this.usageCount;
        let usage = map.get(style) ?? 0;
        usage += delta;
        if (usage > 0) {
            map.set(style, usage);
        }
        else {
            map.delete(style);
        }
        return usage;
    }
    ngOnDestroy() {
        for (const style of this.getAllStyles()) {
            this.onStyleRemoved(style);
        }
        this.usageCount.clear();
    }
}
SharedStylesHost.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.0+sha-e45a8b6", ngImport: i0, type: SharedStylesHost, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
SharedStylesHost.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.0+sha-e45a8b6", ngImport: i0, type: SharedStylesHost });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.0+sha-e45a8b6", ngImport: i0, type: SharedStylesHost, decorators: [{
            type: Injectable
        }] });
export class DomSharedStylesHost extends SharedStylesHost {
    constructor(doc, appId) {
        super();
        this.doc = doc;
        this.appId = appId;
        // Maps all registered host nodes to a list of style nodes that have been added to the host node.
        this.styleRef = new Map();
        this.hostNodes = new Set();
        this.collectServerRenderedStyles();
        this.resetHostNodes();
    }
    onStyleAdded(style) {
        for (const host of this.hostNodes) {
            this.addStyleToHost(host, style);
        }
    }
    onStyleRemoved(style) {
        const styleRef = this.styleRef;
        const styleElements = styleRef.get(style);
        styleElements?.forEach(e => e.remove());
        styleRef.delete(style);
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.styleRef.clear();
        this.resetHostNodes();
        if (this._styleNodesInDOM) {
            this._styleNodesInDOM.forEach(e => e.remove());
            this._styleNodesInDOM.clear();
        }
    }
    addHost(hostNode) {
        this.hostNodes.add(hostNode);
        for (const style of this.getAllStyles()) {
            this.addStyleToHost(hostNode, style);
        }
    }
    removeHost(hostNode) {
        this.hostNodes.delete(hostNode);
    }
    addStyleToHost(host, style) {
        const styleEl = this.createStyleElement(host, style);
        host.appendChild(styleEl);
        const styleElRef = this.styleRef.get(style);
        if (styleElRef) {
            styleElRef.push(styleEl);
        }
        else {
            this.styleRef.set(style, [styleEl]);
        }
    }
    resetHostNodes() {
        const hostNodes = this.hostNodes;
        hostNodes.clear();
        // Re-add the head element back since this is the default host.
        hostNodes.add(this.doc.head);
    }
    createStyleElement(host, style) {
        const styleEl = this._styleNodesInDOM?.get(style);
        if (styleEl?.parentNode === host) {
            // `this._styleNodesInDOM` cannot be undefined due to the above `this._styleNodesInDOM?.get`.
            this._styleNodesInDOM.delete(style);
            styleEl.removeAttribute('ng-transition');
            if (typeof ngDevMode === 'undefined' || ngDevMode) {
                // This attribute is soley used for debugging purposes.
                styleEl.setAttribute('ng-style-reused', '');
            }
            return styleEl;
        }
        else {
            const styleEl = this.doc.createElement('style');
            styleEl.textContent = style;
            return styleEl;
        }
    }
    collectServerRenderedStyles() {
        const styles = this.doc.head?.querySelectorAll(`style[ng-transition="${this.appId}"]`);
        if (styles?.length) {
            const styleMap = new Map();
            styles.forEach(style => {
                if (style.textContent != null) {
                    styleMap.set(style.textContent, style);
                }
            });
            this._styleNodesInDOM = styleMap;
        }
    }
}
DomSharedStylesHost.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.0+sha-e45a8b6", ngImport: i0, type: DomSharedStylesHost, deps: [{ token: DOCUMENT }, { token: APP_ID }], target: i0.ɵɵFactoryTarget.Injectable });
DomSharedStylesHost.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.0+sha-e45a8b6", ngImport: i0, type: DomSharedStylesHost });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.0+sha-e45a8b6", ngImport: i0, type: DomSharedStylesHost, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: Document, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [APP_ID]
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkX3N0eWxlc19ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcGxhdGZvcm0tYnJvd3Nlci9zcmMvZG9tL3NoYXJlZF9zdHlsZXNfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFZLE1BQU0sZUFBZSxDQUFDOztBQUdwRSxNQUFNLE9BQU8sZ0JBQWdCO0lBRDdCO1FBRW1CLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBeUQsQ0FBQztLQW1EaEc7SUFqREMsU0FBUyxDQUFDLE1BQWdCO1FBQ3hCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO1lBQzFCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFbkQsSUFBSSxVQUFVLEtBQUssQ0FBQyxFQUFFO2dCQUNwQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQzFCO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsWUFBWSxDQUFDLE1BQWdCO1FBQzNCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO1lBQzFCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVwRCxJQUFJLFVBQVUsS0FBSyxDQUFDLEVBQUU7Z0JBQ3BCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDNUI7U0FDRjtJQUNILENBQUM7SUFFRCxjQUFjLENBQUMsS0FBYSxJQUFTLENBQUM7SUFFdEMsWUFBWSxDQUFDLEtBQWEsSUFBUyxDQUFDO0lBRXBDLFlBQVk7UUFDVixPQUFPLElBQUksQ0FB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RUFBRSxDQUFDLENBQUM7YUFDN0M7WUFFRCxPQUFPLE9BQU8sQ0FBQztTQUNoQjthQUFNO1lBQ0wsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEQsT0FBTyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7WUFFNUIsT0FBTyxPQUFPLENBQUM7U0FDaEI7SUFDSCxDQUFDO0lBRU8sMkJBQTJCO1FBQ2pDLE1BQU0sTUFBTSxHQUNSLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLHdCQUF3QixJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztRQUU1RSxJQUFJLE1BQU0sRUFBRSxNQUFNLEVBQUU7WUFDbEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7WUFFckQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDckIsSUFBSSxLQUFLLENBQUMsV0FBVyxJQUFJLElBQUksRUFBRTtvQkFDN0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO2lCQUN4QztZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQztTQUNsQztJQUNILENBQUM7OzJIQXZHVSxtQkFBbUIsa0JBT2xCLFFBQVEsYUFBMEMsTUFBTTsrSEFQekQsbUJBQW1CO3NHQUFuQixtQkFBbUI7a0JBRC9CLFVBQVU7OzBCQVFKLE1BQU07MkJBQUMsUUFBUTs7MEJBQW1DLE1BQU07MkJBQUMsTUFBTSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0RPQ1VNRU5UfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBUFBfSUQsIEluamVjdCwgSW5qZWN0YWJsZSwgT25EZXN0cm95fSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFNoYXJlZFN0eWxlc0hvc3QgaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuICBwcml2YXRlIHJlYWRvbmx5IHVzYWdlQ291bnQgPSBuZXcgTWFwPHN0cmluZyAvKiogU3R5bGUgc3RyaW5nICovLCBudW1iZXIgLyoqIFVzYWdlIGNvdW50ICovPigpO1xuXG4gIGFkZFN0eWxlcyhzdHlsZXM6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBzdHlsZSBvZiBzdHlsZXMpIHtcbiAgICAgIGNvbnN0IHVzYWdlQ291bnQgPSB0aGlzLmNoYW5nZVVzYWdlQ291bnQoc3R5bGUsIDEpO1xuXG4gICAgICBpZiAodXNhZ2VDb3VudCA9PT0gMSkge1xuICAgICAgICB0aGlzLm9uU3R5bGVBZGRlZChzdHlsZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlU3R5bGVzKHN0eWxlczogc3RyaW5nW10pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHN0eWxlIG9mIHN0eWxlcykge1xuICAgICAgY29uc3QgdXNhZ2VDb3VudCA9IHRoaXMuY2hhbmdlVXNhZ2VDb3VudChzdHlsZSwgLTEpO1xuXG4gICAgICBpZiAodXNhZ2VDb3VudCA9PT0gMCkge1xuICAgICAgICB0aGlzLm9uU3R5bGVSZW1vdmVkKHN0eWxlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBvblN0eWxlUmVtb3ZlZChzdHlsZTogc3RyaW5nKTogdm9pZCB7fVxuXG4gIG9uU3R5bGVBZGRlZChzdHlsZTogc3RyaW5nKTogdm9pZCB7fVxuXG4gIGdldEFsbFN0eWxlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPHN0cmluZz4ge1xuICAgIHJldHVybiB0aGlzLnVzYWdlQ291bnQua2V5cygpO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGFuZ2VVc2FnZUNvdW50KHN0eWxlOiBzdHJpbmcsIGRlbHRhOiBudW1iZXIpOiBudW1iZXIge1xuICAgIGNvbnN0IG1hcCA9IHRoaXMudXNhZ2VDb3VudDtcbiAgICBsZXQgdXNhZ2UgPSBtYXAuZ2V0KHN0eWxlKSA/PyAwO1xuICAgIHVzYWdlICs9IGRlbHRhO1xuXG4gICAgaWYgKHVzYWdlID4gMCkge1xuICAgICAgbWFwLnNldChzdHlsZSwgdXNhZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBtYXAuZGVsZXRlKHN0eWxlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdXNhZ2U7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHN0eWxlIG9mIHRoaXMuZ2V0QWxsU3R5bGVzKCkpIHtcbiAgICAgIHRoaXMub25TdHlsZVJlbW92ZWQoc3R5bGUpO1xuICAgIH1cblxuICAgIHRoaXMudXNhZ2VDb3VudC5jbGVhcigpO1xuICB9XG59XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBEb21TaGFyZWRTdHlsZXNIb3N0IGV4dGVuZHMgU2hhcmVkU3R5bGVzSG9zdCBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIC8vIE1hcHMgYWxsIHJlZ2lzdGVyZWQgaG9zdCBub2RlcyB0byBhIGxpc3Qgb2Ygc3R5bGUgbm9kZXMgdGhhdCBoYXZlIGJlZW4gYWRkZWQgdG8gdGhlIGhvc3Qgbm9kZS5cbiAgcHJpdmF0ZSByZWFkb25seSBzdHlsZVJlZiA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MU3R5bGVFbGVtZW50W10+KCk7XG4gIHByaXZhdGUgaG9zdE5vZGVzID0gbmV3IFNldDxOb2RlPigpO1xuICBwcml2YXRlIF9zdHlsZU5vZGVzSW5ET006IE1hcDxzdHJpbmcsIEhUTUxTdHlsZUVsZW1lbnQ+fHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIEBJbmplY3QoRE9DVU1FTlQpIHByaXZhdGUgcmVhZG9ubHkgZG9jOiBEb2N1bWVudCwgQEluamVjdChBUFBfSUQpIHByaXZhdGUgYXBwSWQ6IHN0cmluZykge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5jb2xsZWN0U2VydmVyUmVuZGVyZWRTdHlsZXMoKTtcbiAgICB0aGlzLnJlc2V0SG9zdE5vZGVzKCk7XG4gIH1cblxuICBvdmVycmlkZSBvblN0eWxlQWRkZWQoc3R5bGU6IHN0cmluZyk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgaG9zdCBvZiB0aGlzLmhvc3ROb2Rlcykge1xuICAgICAgdGhpcy5hZGRTdHlsZVRvSG9zdChob3N0LCBzdHlsZSk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgb25TdHlsZVJlbW92ZWQoc3R5bGU6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IHN0eWxlUmVmID0gdGhpcy5zdHlsZVJlZjtcbiAgICBjb25zdCBzdHlsZUVsZW1lbnRzID0gc3R5bGVSZWYuZ2V0KHN0eWxlKTtcbiAgICBzdHlsZUVsZW1lbnRzPy5mb3JFYWNoKGUgPT4gZS5yZW1vdmUoKSk7XG4gICAgc3R5bGVSZWYuZGVsZXRlKHN0eWxlKTtcbiAgfVxuXG4gIG92ZXJyaWRlIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHN1cGVyLm5nT25EZXN0cm95KCk7XG4gICAgdGhpcy5zdHlsZVJlZi5jbGVhcigpO1xuICAgIHRoaXMucmVzZXRIb3N0Tm9kZXMoKTtcbiAgICBpZiAodGhpcy5fc3R5bGVOb2Rlc0luRE9NKSB7XG4gICAgICB0aGlzLl9zdHlsZU5vZGVzSW5ET00uZm9yRWFjaChlID0+IGUucmVtb3ZlKCkpO1xuICAgICAgdGhpcy5fc3R5bGVOb2Rlc0luRE9NLmNsZWFyKCk7XG4gICAgfVxuICB9XG5cbiAgYWRkSG9zdChob3N0Tm9kZTogTm9kZSk6IHZvaWQge1xuICAgIHRoaXMuaG9zdE5vZGVzLmFkZChob3N0Tm9kZSk7XG5cbiAgICBmb3IgKGNvbnN0IHN0eWxlIG9mIHRoaXMuZ2V0QWxsU3R5bGVzKCkpIHtcbiAgICAgIHRoaXMuYWRkU3R5bGVUb0hvc3QoaG9zdE5vZGUsIHN0eWxlKTtcbiAgICB9XG4gIH1cblxuICByZW1vdmVIb3N0KGhvc3ROb2RlOiBOb2RlKTogdm9pZCB7XG4gICAgdGhpcy5ob3N0Tm9kZXMuZGVsZXRlKGhvc3ROb2RlKTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkU3R5bGVUb0hvc3QoaG9zdDogTm9kZSwgc3R5bGU6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IHN0eWxlRWwgPSB0aGlzLmNyZWF0ZVN0eWxlRWxlbWVudChob3N0LCBzdHlsZSk7XG4gICAgaG9zdC5hcHBlbmRDaGlsZChzdHlsZUVsKTtcblxuICAgIGNvbnN0IHN0eWxlRWxSZWYgPSB0aGlzLnN0eWxlUmVmLmdldChzdHlsZSk7XG4gICAgaWYgKHN0eWxlRWxSZWYpIHtcbiAgICAgIHN0eWxlRWxSZWYucHVzaChzdHlsZUVsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdHlsZVJlZi5zZXQoc3R5bGUsIFtzdHlsZUVsXSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNldEhvc3ROb2RlcygpOiB2b2lkIHtcbiAgICBjb25zdCBob3N0Tm9kZXMgPSB0aGlzLmhvc3ROb2RlcztcbiAgICBob3N0Tm9kZXMuY2xlYXIoKTtcbiAgICAvLyBSZS1hZGQgdGhlIGhlYWQgZWxlbWVudCBiYWNrIHNpbmNlIHRoaXMgaXMgdGhlIGRlZmF1bHQgaG9zdC5cbiAgICBob3N0Tm9kZXMuYWRkKHRoaXMuZG9jLmhlYWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTdHlsZUVsZW1lbnQoaG9zdDogTm9kZSwgc3R5bGU6IHN0cmluZyk6IEhUTUxTdHlsZUVsZW1lbnQge1xuICAgIGNvbnN0IHN0eWxlRWwgPSB0aGlzLl9zdHlsZU5vZGVzSW5ET00/LmdldChzdHlsZSk7XG4gICAgaWYgKHN0eWxlRWw/LnBhcmVudE5vZGUgPT09IGhvc3QpIHtcbiAgICAgIC8vIGB0aGlzLl9zdHlsZU5vZGVzSW5ET01gIGNhbm5vdCBiZSB1bmRlZmluZWQgZHVlIHRvIHRoZSBhYm92ZSBgdGhpcy5fc3R5bGVOb2Rlc0luRE9NPy5nZXRgLlxuICAgICAgdGhpcy5fc3R5bGVOb2Rlc0luRE9NIS5kZWxldGUoc3R5bGUpO1xuICAgICAgc3R5bGVFbC5yZW1vdmVBdHRyaWJ1dGUoJ25nLXRyYW5zaXRpb24nKTtcblxuICAgICAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkge1xuICAgICAgICAvLyBUaGlzIGF0dHJpYnV0ZSBpcyBzb2xleSB1c2VkIGZvciBkZWJ1Z2dpbmcgcHVycG9zZXMuXG4gICAgICAgIHN0eWxlRWwuc2V0QXR0cmlidXRlKCduZy1zdHlsZS1yZXVzZWQnLCAnJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdHlsZUVsO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzdHlsZUVsID0gdGhpcy5kb2MuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgIHN0eWxlRWwudGV4dENvbnRlbnQgPSBzdHlsZTtcblxuICAgICAgcmV0dXJuIHN0eWxlRWw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb2xsZWN0U2VydmVyUmVuZGVyZWRTdHlsZXMoKTogdm9pZCB7XG4gICAgY29uc3Qgc3R5bGVzOiBOb2RlTGlzdE9mPEhUTUxTdHlsZUVsZW1lbnQ+fHVuZGVmaW5lZCA9XG4gICAgICAgIHRoaXMuZG9jLmhlYWQ/LnF1ZXJ5U2VsZWN0b3JBbGwoYHN0eWxlW25nLXRyYW5zaXRpb249XCIke3RoaXMuYXBwSWR9XCJdYCk7XG5cbiAgICBpZiAoc3R5bGVzPy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHN0eWxlTWFwID0gbmV3IE1hcDxzdHJpbmcsIEhUTUxTdHlsZUVsZW1lbnQ+KCk7XG5cbiAgICAgIHN0eWxlcy5mb3JFYWNoKHN0eWxlID0+IHtcbiAgICAgICAgaWYgKHN0eWxlLnRleHRDb250ZW50ICE9IG51bGwpIHtcbiAgICAgICAgICBzdHlsZU1hcC5zZXQoc3R5bGUudGV4dENvbnRlbnQsIHN0eWxlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3N0eWxlTm9kZXNJbkRPTSA9IHN0eWxlTWFwO1xuICAgIH1cbiAgfVxufVxuIl19