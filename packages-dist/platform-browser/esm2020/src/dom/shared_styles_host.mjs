/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { DOCUMENT, ɵgetDOM as getDOM } from '@angular/common';
import { APP_ID, Inject, Injectable } from '@angular/core';
import * as i0 from "@angular/core";
export class SharedStylesHost {
    constructor() {
        /** @internal */
        this._stylesSet = new Set();
    }
    addStyles(styles) {
        const additions = new Set();
        styles.forEach(style => {
            if (!this._stylesSet.has(style)) {
                this._stylesSet.add(style);
                additions.add(style);
            }
        });
        this.onStylesAdded(additions);
    }
    onStylesAdded(additions) { }
    getAllStyles() {
        return Array.from(this._stylesSet);
    }
}
SharedStylesHost.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.2.0-next.2+sha-8dbcb73", ngImport: i0, type: SharedStylesHost, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
SharedStylesHost.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.2.0-next.2+sha-8dbcb73", ngImport: i0, type: SharedStylesHost });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.2.0-next.2+sha-8dbcb73", ngImport: i0, type: SharedStylesHost, decorators: [{
            type: Injectable
        }] });
export class DomSharedStylesHost extends SharedStylesHost {
    constructor(doc, appId) {
        super();
        this.doc = doc;
        this.appId = appId;
        // Maps all registered host nodes to a list of style nodes that have been added to the host node.
        this._hostNodes = new Map();
        this.collectServerRenderedStyles();
        this._hostNodes.set(this.doc.head, []);
    }
    _addStylesToHost(styles, host, styleNodes) {
        for (const style of styles) {
            const styleEl = this._createStyleElement(host, style);
            styleNodes.push(host.appendChild(styleEl));
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
    _createStyleElement(host, style) {
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
            return host.appendChild(styleEl);
        }
    }
    addHost(hostNode) {
        const styleNodes = [];
        this._addStylesToHost(this._stylesSet, hostNode, styleNodes);
        this._hostNodes.set(hostNode, styleNodes);
    }
    removeHost(hostNode) {
        const styleNodes = this._hostNodes.get(hostNode);
        styleNodes?.forEach(removeStyle);
        this._hostNodes.delete(hostNode);
    }
    onStylesAdded(additions) {
        this._hostNodes.forEach((styleNodes, hostNode) => {
            this._addStylesToHost(additions, hostNode, styleNodes);
        });
    }
    ngOnDestroy() {
        this._hostNodes.forEach(styleNodes => styleNodes.forEach(removeStyle));
        if (this._styleNodesInDOM) {
            this._styleNodesInDOM.forEach(e => e.remove());
            this._styleNodesInDOM.clear();
        }
    }
}
DomSharedStylesHost.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.2.0-next.2+sha-8dbcb73", ngImport: i0, type: DomSharedStylesHost, deps: [{ token: DOCUMENT }, { token: APP_ID }], target: i0.ɵɵFactoryTarget.Injectable });
DomSharedStylesHost.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.2.0-next.2+sha-8dbcb73", ngImport: i0, type: DomSharedStylesHost });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.2.0-next.2+sha-8dbcb73", ngImport: i0, type: DomSharedStylesHost, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: Document, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [APP_ID]
                }] }]; } });
function removeStyle(styleNode) {
    getDOM().remove(styleNode);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkX3N0eWxlc19ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcGxhdGZvcm0tYnJvd3Nlci9zcmMvZG9tL3NoYXJlZF9zdHlsZXNfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFFLE9BQU8sSUFBSSxNQUFNLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUM1RCxPQUFPLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQVksTUFBTSxlQUFlLENBQUM7O0FBR3BFLE1BQU0sT0FBTyxnQkFBZ0I7SUFEN0I7UUFFRSxnQkFBZ0I7UUFDTixlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztLQWtCMUM7SUFoQkMsU0FBUyxDQUFDLE1BQWdCO1FBQ3hCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDcEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMzQixTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3RCO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxhQUFhLENBQUMsU0FBc0IsSUFBUyxDQUFDO0lBRTlDLFlBQVk7UUFDVixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7O3dIQW5CVSxnQkFBZ0I7NEhBQWhCLGdCQUFnQjtzR0FBaEIsZ0JBQWdCO2tCQUQ1QixVQUFVOztBQXdC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VSxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRVEsYUFBYSxDQUFDLFNBQXNCO1FBQzNDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQy9DLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFdBQVc7UUFDVCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUN2RSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUN6QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO1NBQy9CO0lBQ0gsQ0FBQzs7MkhBakZVLG1CQUFtQixrQkFLVixRQUFRLGFBQWlDLE1BQU07K0hBTHhELG1CQUFtQjtzR0FBbkIsbUJBQW1CO2tCQUQvQixVQUFVOzswQkFNSSxNQUFNOzJCQUFDLFFBQVE7OzBCQUEwQixNQUFNOzJCQUFDLE1BQU07O0FBK0VyRSxTQUFTLFdBQVcsQ0FBQyxTQUFlO0lBQ2xDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RE9DVU1FTlQsIMm1Z2V0RE9NIGFzIGdldERPTX0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7QVBQX0lELCBJbmplY3QsIEluamVjdGFibGUsIE9uRGVzdHJveX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBTaGFyZWRTdHlsZXNIb3N0IHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcm90ZWN0ZWQgX3N0eWxlc1NldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGFkZFN0eWxlcyhzdHlsZXM6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgY29uc3QgYWRkaXRpb25zID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgc3R5bGVzLmZvckVhY2goc3R5bGUgPT4ge1xuICAgICAgaWYgKCF0aGlzLl9zdHlsZXNTZXQuaGFzKHN0eWxlKSkge1xuICAgICAgICB0aGlzLl9zdHlsZXNTZXQuYWRkKHN0eWxlKTtcbiAgICAgICAgYWRkaXRpb25zLmFkZChzdHlsZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5vblN0eWxlc0FkZGVkKGFkZGl0aW9ucyk7XG4gIH1cblxuICBvblN0eWxlc0FkZGVkKGFkZGl0aW9uczogU2V0PHN0cmluZz4pOiB2b2lkIHt9XG5cbiAgZ2V0QWxsU3R5bGVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLl9zdHlsZXNTZXQpO1xuICB9XG59XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBEb21TaGFyZWRTdHlsZXNIb3N0IGV4dGVuZHMgU2hhcmVkU3R5bGVzSG9zdCBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIC8vIE1hcHMgYWxsIHJlZ2lzdGVyZWQgaG9zdCBub2RlcyB0byBhIGxpc3Qgb2Ygc3R5bGUgbm9kZXMgdGhhdCBoYXZlIGJlZW4gYWRkZWQgdG8gdGhlIGhvc3Qgbm9kZS5cbiAgcHJpdmF0ZSBfaG9zdE5vZGVzID0gbmV3IE1hcDxOb2RlLCBOb2RlW10+KCk7XG4gIHByaXZhdGUgX3N0eWxlTm9kZXNJbkRPTTogTWFwPHN0cmluZywgSFRNTFN0eWxlRWxlbWVudD58dW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKEBJbmplY3QoRE9DVU1FTlQpIHByaXZhdGUgZG9jOiBEb2N1bWVudCwgQEluamVjdChBUFBfSUQpIHByaXZhdGUgYXBwSWQ6IHN0cmluZykge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmNvbGxlY3RTZXJ2ZXJSZW5kZXJlZFN0eWxlcygpO1xuICAgIHRoaXMuX2hvc3ROb2Rlcy5zZXQodGhpcy5kb2MuaGVhZCwgW10pO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWRkU3R5bGVzVG9Ib3N0KHN0eWxlczogU2V0PHN0cmluZz4sIGhvc3Q6IE5vZGUsIHN0eWxlTm9kZXM6IE5vZGVbXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qgc3R5bGUgb2Ygc3R5bGVzKSB7XG4gICAgICBjb25zdCBzdHlsZUVsID0gdGhpcy5fY3JlYXRlU3R5bGVFbGVtZW50KGhvc3QsIHN0eWxlKTtcbiAgICAgIHN0eWxlTm9kZXMucHVzaChob3N0LmFwcGVuZENoaWxkKHN0eWxlRWwpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbGxlY3RTZXJ2ZXJSZW5kZXJlZFN0eWxlcygpOiB2b2lkIHtcbiAgICBjb25zdCBzdHlsZXM6IE5vZGVMaXN0T2Y8SFRNTFN0eWxlRWxlbWVudD58dW5kZWZpbmVkID1cbiAgICAgICAgdGhpcy5kb2MuaGVhZD8ucXVlcnlTZWxlY3RvckFsbChgc3R5bGVbbmctdHJhbnNpdGlvbj1cIiR7dGhpcy5hcHBJZH1cIl1gKTtcblxuICAgIGlmIChzdHlsZXM/Lmxlbmd0aCkge1xuICAgICAgY29uc3Qgc3R5bGVNYXAgPSBuZXcgTWFwPHN0cmluZywgSFRNTFN0eWxlRWxlbWVudD4oKTtcblxuICAgICAgc3R5bGVzLmZvckVhY2goc3R5bGUgPT4ge1xuICAgICAgICBpZiAoc3R5bGUudGV4dENvbnRlbnQgIT0gbnVsbCkge1xuICAgICAgICAgIHN0eWxlTWFwLnNldChzdHlsZS50ZXh0Q29udGVudCwgc3R5bGUpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5fc3R5bGVOb2Rlc0luRE9NID0gc3R5bGVNYXA7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfY3JlYXRlU3R5bGVFbGVtZW50KGhvc3Q6IE5vZGUsIHN0eWxlOiBzdHJpbmcpOiBIVE1MU3R5bGVFbGVtZW50IHtcbiAgICBjb25zdCBzdHlsZUVsID0gdGhpcy5fc3R5bGVOb2Rlc0luRE9NPy5nZXQoc3R5bGUpO1xuICAgIGlmIChzdHlsZUVsPy5wYXJlbnROb2RlID09PSBob3N0KSB7XG4gICAgICAvLyBgdGhpcy5fc3R5bGVOb2Rlc0luRE9NYCBjYW5ub3QgYmUgdW5kZWZpbmVkIGR1ZSB0byB0aGUgYWJvdmUgYHRoaXMuX3N0eWxlTm9kZXNJbkRPTT8uZ2V0YC5cbiAgICAgIHRoaXMuX3N0eWxlTm9kZXNJbkRPTSEuZGVsZXRlKHN0eWxlKTtcbiAgICAgIHN0eWxlRWwucmVtb3ZlQXR0cmlidXRlKCduZy10cmFuc2l0aW9uJyk7XG5cbiAgICAgIGlmICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpIHtcbiAgICAgICAgLy8gVGhpcyBhdHRyaWJ1dGUgaXMgc29sZXkgdXNlZCBmb3IgZGVidWdnaW5nIHB1cnBvc2VzLlxuICAgICAgICBzdHlsZUVsLnNldEF0dHJpYnV0ZSgnbmctc3R5bGUtcmV1c2VkJywgJycpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3R5bGVFbDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3R5bGVFbCA9IHRoaXMuZG9jLmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICBzdHlsZUVsLnRleHRDb250ZW50ID0gc3R5bGU7XG5cbiAgICAgIHJldHVybiBob3N0LmFwcGVuZENoaWxkKHN0eWxlRWwpO1xuICAgIH1cbiAgfVxuXG4gIGFkZEhvc3QoaG9zdE5vZGU6IE5vZGUpOiB2b2lkIHtcbiAgICBjb25zdCBzdHlsZU5vZGVzOiBOb2RlW10gPSBbXTtcbiAgICB0aGlzLl9hZGRTdHlsZXNUb0hvc3QodGhpcy5fc3R5bGVzU2V0LCBob3N0Tm9kZSwgc3R5bGVOb2Rlcyk7XG4gICAgdGhpcy5faG9zdE5vZGVzLnNldChob3N0Tm9kZSwgc3R5bGVOb2Rlcyk7XG4gIH1cblxuICByZW1vdmVIb3N0KGhvc3ROb2RlOiBOb2RlKTogdm9pZCB7XG4gICAgY29uc3Qgc3R5bGVOb2RlcyA9IHRoaXMuX2hvc3ROb2Rlcy5nZXQoaG9zdE5vZGUpO1xuICAgIHN0eWxlTm9kZXM/LmZvckVhY2gocmVtb3ZlU3R5bGUpO1xuICAgIHRoaXMuX2hvc3ROb2Rlcy5kZWxldGUoaG9zdE5vZGUpO1xuICB9XG5cbiAgb3ZlcnJpZGUgb25TdHlsZXNBZGRlZChhZGRpdGlvbnM6IFNldDxzdHJpbmc+KTogdm9pZCB7XG4gICAgdGhpcy5faG9zdE5vZGVzLmZvckVhY2goKHN0eWxlTm9kZXMsIGhvc3ROb2RlKSA9PiB7XG4gICAgICB0aGlzLl9hZGRTdHlsZXNUb0hvc3QoYWRkaXRpb25zLCBob3N0Tm9kZSwgc3R5bGVOb2Rlcyk7XG4gICAgfSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLl9ob3N0Tm9kZXMuZm9yRWFjaChzdHlsZU5vZGVzID0+IHN0eWxlTm9kZXMuZm9yRWFjaChyZW1vdmVTdHlsZSkpO1xuICAgIGlmICh0aGlzLl9zdHlsZU5vZGVzSW5ET00pIHtcbiAgICAgIHRoaXMuX3N0eWxlTm9kZXNJbkRPTS5mb3JFYWNoKGUgPT4gZS5yZW1vdmUoKSk7XG4gICAgICB0aGlzLl9zdHlsZU5vZGVzSW5ET00uY2xlYXIoKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlU3R5bGUoc3R5bGVOb2RlOiBOb2RlKTogdm9pZCB7XG4gIGdldERPTSgpLnJlbW92ZShzdHlsZU5vZGUpO1xufVxuIl19