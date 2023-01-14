/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { DOCUMENT, ɵgetDOM as getDOM } from '@angular/common';
import { APP_ID, Inject, Injectable, Optional } from '@angular/core';
import { ɵSharedStylesHost as SharedStylesHost } from '@angular/platform-browser';
import * as i0 from "@angular/core";
export class SSRStylesHost extends SharedStylesHost {
    constructor(doc, appId) {
        super();
        this.doc = doc;
        this.appId = appId;
        this._styleNodes = new Set();
        this.head = this.doc.querySelector('head');
        const styles = this.head?.querySelectorAll(`style[ng-style='${this.appId}']`);
        if (styles?.length) {
            const items = Array.from(styles);
            this._styleNodesInDOM = new Map(items.map((el) => [el.textContent, el]));
        }
    }
    _addStyle(style) {
        const element = this._styleNodesInDOM?.get(style);
        if (element) {
            if (typeof ngDevMode !== 'undefined' && ngDevMode) {
                element.setAttribute('_ng-style-re-used', '');
            }
            this._styleNodesInDOM?.delete(style);
            this._styleNodes.add(element);
            return;
        }
        const el = getDOM().createElement('style');
        el.textContent = style;
        if (this.appId) {
            el.setAttribute('ng-style', this.appId);
        }
        if (this.head) {
            this.head.appendChild(el);
        }
        this._styleNodes.add(el);
    }
    onStylesAdded(additions) {
        additions.forEach((style) => this._addStyle(style));
    }
    addHost(_hostNode) {
        // stub
    }
    removeHost(_hostNode) {
        // stub
    }
    ngOnDestroy() {
        this._styleNodes.forEach((styleNode) => styleNode.remove());
    }
}
SSRStylesHost.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: SSRStylesHost, deps: [{ token: DOCUMENT }, { token: APP_ID, optional: true }], target: i0.ɵɵFactoryTarget.Injectable });
SSRStylesHost.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: SSRStylesHost });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: SSRStylesHost, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: Document, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [APP_ID]
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGVzX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2NvbW1vbi9jbG92ZXIvc3JjL3N0eWxlc19ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxJQUFJLE1BQU0sRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBYSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixJQUFJLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7O0FBS2xGLE1BQU0sT0FBTyxhQUFjLFNBQVEsZ0JBQWdCO0lBS2pELFlBQzRCLEdBQWEsRUFDSCxLQUFjO1FBRWxELEtBQUssRUFBRSxDQUFDO1FBSGtCLFFBQUcsR0FBSCxHQUFHLENBQVU7UUFDSCxVQUFLLEdBQUwsS0FBSyxDQUFTO1FBTDVDLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQztRQVEzQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsbUJBQW1CLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO1FBQzlFLElBQUksTUFBTSxFQUFFLE1BQU0sRUFBRTtZQUNsQixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBa0IsQ0FBQztZQUNsRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMxRTtJQUNILENBQUM7SUFFTyxTQUFTLENBQUMsS0FBYTtRQUM3QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xELElBQUksT0FBTyxFQUFFO1lBQ1gsSUFBSSxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksU0FBUyxFQUFFO2dCQUNqRCxPQUFPLENBQUMsWUFBWSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQy9DO1lBRUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUU5QixPQUFPO1NBQ1I7UUFFRCxNQUFNLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0MsRUFBRSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFFdkIsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ2QsRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3pDO1FBRUQsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDM0I7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRUQsYUFBYSxDQUFDLFNBQXNCO1FBQ2xDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsT0FBTyxDQUFDLFNBQWU7UUFDckIsT0FBTztJQUNULENBQUM7SUFFRCxVQUFVLENBQUMsU0FBZTtRQUN4QixPQUFPO0lBQ1QsQ0FBQztJQUVELFdBQVc7UUFDVCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDOUQsQ0FBQzs7MEdBM0RVLGFBQWEsa0JBTWQsUUFBUSxhQUNJLE1BQU07OEdBUGpCLGFBQWE7MkZBQWIsYUFBYTtrQkFEekIsVUFBVTs7MEJBT04sTUFBTTsyQkFBQyxRQUFROzswQkFDZixRQUFROzswQkFBSSxNQUFNOzJCQUFDLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgRE9DVU1FTlQsIMm1Z2V0RE9NIGFzIGdldERPTSB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQgeyBBUFBfSUQsIEluamVjdCwgSW5qZWN0YWJsZSwgT25EZXN0cm95LCBPcHRpb25hbCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgybVTaGFyZWRTdHlsZXNIb3N0IGFzIFNoYXJlZFN0eWxlc0hvc3QgfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyJztcblxuZGVjbGFyZSBsZXQgbmdEZXZNb2RlOiBib29sZWFuIHwge30gfCB1bmRlZmluZWQ7XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBTU1JTdHlsZXNIb3N0IGV4dGVuZHMgU2hhcmVkU3R5bGVzSG9zdCBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIHByaXZhdGUgaGVhZDogSFRNTEhlYWRFbGVtZW50IHwgbnVsbDtcbiAgcHJpdmF0ZSBfc3R5bGVOb2RlcyA9IG5ldyBTZXQ8SFRNTEVsZW1lbnQ+KCk7XG4gIHByaXZhdGUgX3N0eWxlTm9kZXNJbkRPTTogTWFwPHN0cmluZyB8IG51bGwsIEhUTUxFbGVtZW50PiB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBASW5qZWN0KERPQ1VNRU5UKSBwcml2YXRlIGRvYzogRG9jdW1lbnQsXG4gICAgQE9wdGlvbmFsKCkgQEluamVjdChBUFBfSUQpIHByaXZhdGUgYXBwSWQ/OiBzdHJpbmcsXG4gICkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5oZWFkID0gdGhpcy5kb2MucXVlcnlTZWxlY3RvcignaGVhZCcpO1xuICAgIGNvbnN0IHN0eWxlcyA9IHRoaXMuaGVhZD8ucXVlcnlTZWxlY3RvckFsbChgc3R5bGVbbmctc3R5bGU9JyR7dGhpcy5hcHBJZH0nXWApO1xuICAgIGlmIChzdHlsZXM/Lmxlbmd0aCkge1xuICAgICAgY29uc3QgaXRlbXMgPSBBcnJheS5mcm9tKHN0eWxlcykgYXMgSFRNTEVsZW1lbnRbXTtcbiAgICAgIHRoaXMuX3N0eWxlTm9kZXNJbkRPTSA9IG5ldyBNYXAoaXRlbXMubWFwKChlbCkgPT4gW2VsLnRleHRDb250ZW50LCBlbF0pKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9hZGRTdHlsZShzdHlsZTogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMuX3N0eWxlTm9kZXNJbkRPTT8uZ2V0KHN0eWxlKTtcbiAgICBpZiAoZWxlbWVudCkge1xuICAgICAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgIT09ICd1bmRlZmluZWQnICYmIG5nRGV2TW9kZSkge1xuICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnX25nLXN0eWxlLXJlLXVzZWQnLCAnJyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3N0eWxlTm9kZXNJbkRPTT8uZGVsZXRlKHN0eWxlKTtcbiAgICAgIHRoaXMuX3N0eWxlTm9kZXMuYWRkKGVsZW1lbnQpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZWwgPSBnZXRET00oKS5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIGVsLnRleHRDb250ZW50ID0gc3R5bGU7XG5cbiAgICBpZiAodGhpcy5hcHBJZCkge1xuICAgICAgZWwuc2V0QXR0cmlidXRlKCduZy1zdHlsZScsIHRoaXMuYXBwSWQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmhlYWQpIHtcbiAgICAgIHRoaXMuaGVhZC5hcHBlbmRDaGlsZChlbCk7XG4gICAgfVxuXG4gICAgdGhpcy5fc3R5bGVOb2Rlcy5hZGQoZWwpO1xuICB9XG5cbiAgb25TdHlsZXNBZGRlZChhZGRpdGlvbnM6IFNldDxzdHJpbmc+KSB7XG4gICAgYWRkaXRpb25zLmZvckVhY2goKHN0eWxlKSA9PiB0aGlzLl9hZGRTdHlsZShzdHlsZSkpO1xuICB9XG5cbiAgYWRkSG9zdChfaG9zdE5vZGU6IE5vZGUpOiB2b2lkIHtcbiAgICAvLyBzdHViXG4gIH1cblxuICByZW1vdmVIb3N0KF9ob3N0Tm9kZTogTm9kZSk6IHZvaWQge1xuICAgIC8vIHN0dWJcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMuX3N0eWxlTm9kZXMuZm9yRWFjaCgoc3R5bGVOb2RlKSA9PiBzdHlsZU5vZGUucmVtb3ZlKCkpO1xuICB9XG59XG4iXX0=