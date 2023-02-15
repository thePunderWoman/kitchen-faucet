/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Directive, ElementRef, Inject, Optional } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Directionality } from '@angular/cdk/bidi';
import { _getShadowRoot } from '@angular/cdk/platform';
import { STICKY_POSITIONING_LISTENER, } from '@angular/cdk/table';
import * as i0 from "@angular/core";
import * as i1 from "@angular/cdk/bidi";
let nextId = 0;
/**
 * Applies styles to the host element that make its scrollbars match up with
 * the non-sticky scrollable portions of the CdkTable contained within.
 *
 * This visual effect only works in Webkit and Blink based browsers (eg Chrome,
 * Safari, Edge). Other browsers such as Firefox will gracefully degrade to
 * normal scrollbar appearance.
 * Further note: These styles have no effect when the browser is using OS-default
 * scrollbars. The easiest way to force them into custom mode is to specify width
 * and height for the scrollbar and thumb.
 */
export class CdkTableScrollContainer {
    constructor(_elementRef, _document, _directionality) {
        this._elementRef = _elementRef;
        this._document = _document;
        this._directionality = _directionality;
        /** The most recent sticky column size values from the CdkTable. */
        this._startSizes = [];
        this._endSizes = [];
        this._headerSizes = [];
        this._footerSizes = [];
        this._uniqueClassName = `cdk-table-scroll-container-${++nextId}`;
        _elementRef.nativeElement.classList.add(this._uniqueClassName);
    }
    ngOnInit() {
        // Note that we need to look up the root node in ngOnInit, rather than the constructor, because
        // Angular seems to create the element outside the shadow root and then moves it inside, if the
        // node is inside an `ngIf` and a ShadowDom-encapsulated component.
        this._styleRoot = _getShadowRoot(this._elementRef.nativeElement) ?? this._document.head;
    }
    ngOnDestroy() {
        this._styleElement?.remove();
        this._styleElement = undefined;
    }
    stickyColumnsUpdated({ sizes }) {
        this._startSizes = sizes;
        this._updateScrollbar();
    }
    stickyEndColumnsUpdated({ sizes }) {
        this._endSizes = sizes;
        this._updateScrollbar();
    }
    stickyHeaderRowsUpdated({ sizes }) {
        this._headerSizes = sizes;
        this._updateScrollbar();
    }
    stickyFooterRowsUpdated({ sizes }) {
        this._footerSizes = sizes;
        this._updateScrollbar();
    }
    /**
     * Set padding on the scrollbar track based on the sticky states from CdkTable.
     */
    _updateScrollbar() {
        const topMargin = computeMargin(this._headerSizes);
        const bottomMargin = computeMargin(this._footerSizes);
        const startMargin = computeMargin(this._startSizes);
        const endMargin = computeMargin(this._endSizes);
        if (topMargin === 0 && bottomMargin === 0 && startMargin === 0 && endMargin === 0) {
            this._clearCss();
            return;
        }
        const direction = this._directionality ? this._directionality.value : 'ltr';
        const leftMargin = direction === 'rtl' ? endMargin : startMargin;
        const rightMargin = direction === 'rtl' ? startMargin : endMargin;
        this._applyCss(`${topMargin}px ${rightMargin}px ${bottomMargin}px ${leftMargin}px`);
    }
    /** Gets the stylesheet for the scrollbar styles and creates it if need be. */
    _getStyleSheet() {
        if (!this._styleElement) {
            this._styleElement = this._document.createElement('style');
            this._styleRoot.appendChild(this._styleElement);
        }
        return this._styleElement.sheet;
    }
    /** Updates the stylesheet with the specified scrollbar style. */
    _applyCss(value) {
        this._clearCss();
        const selector = `.${this._uniqueClassName}::-webkit-scrollbar-track`;
        this._getStyleSheet().insertRule(`${selector} {margin: ${value}}`, 0);
    }
    _clearCss() {
        const styleSheet = this._getStyleSheet();
        if (styleSheet.cssRules.length > 0) {
            styleSheet.deleteRule(0);
        }
    }
}
CdkTableScrollContainer.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkTableScrollContainer, deps: [{ token: i0.ElementRef }, { token: DOCUMENT }, { token: i1.Directionality, optional: true }], target: i0.ɵɵFactoryTarget.Directive });
CdkTableScrollContainer.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "15.1.0", type: CdkTableScrollContainer, selector: "[cdkTableScrollContainer]", host: { classAttribute: "cdk-table-scroll-container" }, providers: [{ provide: STICKY_POSITIONING_LISTENER, useExisting: CdkTableScrollContainer }], ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkTableScrollContainer, decorators: [{
            type: Directive,
            args: [{
                    selector: '[cdkTableScrollContainer]',
                    host: {
                        'class': 'cdk-table-scroll-container',
                    },
                    providers: [{ provide: STICKY_POSITIONING_LISTENER, useExisting: CdkTableScrollContainer }],
                }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: Document, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }, { type: i1.Directionality, decorators: [{
                    type: Optional
                }] }]; } });
function computeMargin(sizes) {
    let margin = 0;
    for (const size of sizes) {
        if (size == null) {
            break;
        }
        margin += size;
    }
    return margin;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFibGUtc2Nyb2xsLWNvbnRhaW5lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jZGstZXhwZXJpbWVudGFsL3RhYmxlLXNjcm9sbC1jb250YWluZXIvdGFibGUtc2Nyb2xsLWNvbnRhaW5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQXFCLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN6RixPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNyRCxPQUFPLEVBQ0wsMkJBQTJCLEdBSTVCLE1BQU0sb0JBQW9CLENBQUM7OztBQUU1QixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFFZjs7Ozs7Ozs7OztHQVVHO0FBUUgsTUFBTSxPQUFPLHVCQUF1QjtJQVdsQyxZQUNtQixXQUFvQyxFQUNsQixTQUFtQixFQUN6QixlQUFnQztRQUY1QyxnQkFBVyxHQUFYLFdBQVcsQ0FBeUI7UUFDbEIsY0FBUyxHQUFULFNBQVMsQ0FBVTtRQUN6QixvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFUL0QsbUVBQW1FO1FBQzNELGdCQUFXLEdBQWlCLEVBQUUsQ0FBQztRQUMvQixjQUFTLEdBQWlCLEVBQUUsQ0FBQztRQUM3QixpQkFBWSxHQUFpQixFQUFFLENBQUM7UUFDaEMsaUJBQVksR0FBaUIsRUFBRSxDQUFDO1FBT3RDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyw4QkFBOEIsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUNqRSxXQUFXLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7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QUFDLGdCQUFnQiwyQkFBMkIsQ0FBQztRQUN0RSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsUUFBUSxhQUFhLEtBQUssR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFFTyxTQUFTO1FBQ2YsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3pDLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ2xDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDMUI7SUFDSCxDQUFDOztvSEFoR1UsdUJBQXVCLDRDQWF4QixRQUFRO3dHQWJQLHVCQUF1Qiw0R0FGdkIsQ0FBQyxFQUFDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxXQUFXLEVBQUUsdUJBQXVCLEVBQUMsQ0FBQzsyRkFFOUUsdUJBQXVCO2tCQVBuQyxTQUFTO21CQUFDO29CQUNULFFBQVEsRUFBRSwyQkFBMkI7b0JBQ3JDLElBQUksRUFBRTt3QkFDSixPQUFPLEVBQUUsNEJBQTRCO3FCQUN0QztvQkFDRCxTQUFTLEVBQUUsQ0FBQyxFQUFDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxXQUFXLHlCQUF5QixFQUFDLENBQUM7aUJBQzFGOzswQkFjSSxNQUFNOzJCQUFDLFFBQVE7OzBCQUNmLFFBQVE7O0FBcUZiLFNBQVMsYUFBYSxDQUFDLEtBQW9DO0lBQ3pELElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNmLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1FBQ3hCLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtZQUNoQixNQUFNO1NBQ1A7UUFDRCxNQUFNLElBQUksSUFBSSxDQUFDO0tBQ2hCO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0RpcmVjdGl2ZSwgRWxlbWVudFJlZiwgSW5qZWN0LCBPbkRlc3Ryb3ksIE9uSW5pdCwgT3B0aW9uYWx9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtET0NVTUVOVH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7RGlyZWN0aW9uYWxpdHl9IGZyb20gJ0Bhbmd1bGFyL2Nkay9iaWRpJztcbmltcG9ydCB7X2dldFNoYWRvd1Jvb3R9IGZyb20gJ0Bhbmd1bGFyL2Nkay9wbGF0Zm9ybSc7XG5pbXBvcnQge1xuICBTVElDS1lfUE9TSVRJT05JTkdfTElTVEVORVIsXG4gIFN0aWNreVBvc2l0aW9uaW5nTGlzdGVuZXIsXG4gIFN0aWNreVNpemUsXG4gIFN0aWNreVVwZGF0ZSxcbn0gZnJvbSAnQGFuZ3VsYXIvY2RrL3RhYmxlJztcblxubGV0IG5leHRJZCA9IDA7XG5cbi8qKlxuICogQXBwbGllcyBzdHlsZXMgdG8gdGhlIGhvc3QgZWxlbWVudCB0aGF0IG1ha2UgaXRzIHNjcm9sbGJhcnMgbWF0Y2ggdXAgd2l0aFxuICogdGhlIG5vbi1zdGlja3kgc2Nyb2xsYWJsZSBwb3J0aW9ucyBvZiB0aGUgQ2RrVGFibGUgY29udGFpbmVkIHdpdGhpbi5cbiAqXG4gKiBUaGlzIHZpc3VhbCBlZmZlY3Qgb25seSB3b3JrcyBpbiBXZWJraXQgYW5kIEJsaW5rIGJhc2VkIGJyb3dzZXJzIChlZyBDaHJvbWUsXG4gKiBTYWZhcmksIEVkZ2UpLiBPdGhlciBicm93c2VycyBzdWNoIGFzIEZpcmVmb3ggd2lsbCBncmFjZWZ1bGx5IGRlZ3JhZGUgdG9cbiAqIG5vcm1hbCBzY3JvbGxiYXIgYXBwZWFyYW5jZS5cbiAqIEZ1cnRoZXIgbm90ZTogVGhlc2Ugc3R5bGVzIGhhdmUgbm8gZWZmZWN0IHdoZW4gdGhlIGJyb3dzZXIgaXMgdXNpbmcgT1MtZGVmYXVsdFxuICogc2Nyb2xsYmFycy4gVGhlIGVhc2llc3Qgd2F5IHRvIGZvcmNlIHRoZW0gaW50byBjdXN0b20gbW9kZSBpcyB0byBzcGVjaWZ5IHdpZHRoXG4gKiBhbmQgaGVpZ2h0IGZvciB0aGUgc2Nyb2xsYmFyIGFuZCB0aHVtYi5cbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAnW2Nka1RhYmxlU2Nyb2xsQ29udGFpbmVyXScsXG4gIGhvc3Q6IHtcbiAgICAnY2xhc3MnOiAnY2RrLXRhYmxlLXNjcm9sbC1jb250YWluZXInLFxuICB9LFxuICBwcm92aWRlcnM6IFt7cHJvdmlkZTogU1RJQ0tZX1BPU0lUSU9OSU5HX0xJU1RFTkVSLCB1c2VFeGlzdGluZzogQ2RrVGFibGVTY3JvbGxDb250YWluZXJ9XSxcbn0pXG5leHBvcnQgY2xhc3MgQ2RrVGFibGVTY3JvbGxDb250YWluZXIgaW1wbGVtZW50cyBTdGlja3lQb3NpdGlvbmluZ0xpc3RlbmVyLCBPbkRlc3Ryb3ksIE9uSW5pdCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3VuaXF1ZUNsYXNzTmFtZTogc3RyaW5nO1xuICBwcml2YXRlIF9zdHlsZVJvb3QhOiBOb2RlO1xuICBwcml2YXRlIF9zdHlsZUVsZW1lbnQ/OiBIVE1MU3R5bGVFbGVtZW50O1xuXG4gIC8qKiBUaGUgbW9zdCByZWNlbnQgc3RpY2t5IGNvbHVtbiBzaXplIHZhbHVlcyBmcm9tIHRoZSBDZGtUYWJsZS4gKi9cbiAgcHJpdmF0ZSBfc3RhcnRTaXplczogU3RpY2t5U2l6ZVtdID0gW107XG4gIHByaXZhdGUgX2VuZFNpemVzOiBTdGlja3lTaXplW10gPSBbXTtcbiAgcHJpdmF0ZSBfaGVhZGVyU2l6ZXM6IFN0aWNreVNpemVbXSA9IFtdO1xuICBwcml2YXRlIF9mb290ZXJTaXplczogU3RpY2t5U2l6ZVtdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBfZWxlbWVudFJlZjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD4sXG4gICAgQEluamVjdChET0NVTUVOVCkgcHJpdmF0ZSByZWFkb25seSBfZG9jdW1lbnQ6IERvY3VtZW50LFxuICAgIEBPcHRpb25hbCgpIHByaXZhdGUgcmVhZG9ubHkgX2RpcmVjdGlvbmFsaXR5PzogRGlyZWN0aW9uYWxpdHksXG4gICkge1xuICAgIHRoaXMuX3VuaXF1ZUNsYXNzTmFtZSA9IGBjZGstdGFibGUtc2Nyb2xsLWNvbnRhaW5lci0keysrbmV4dElkfWA7XG4gICAgX2VsZW1lbnRSZWYubmF0aXZlRWxlbWVudC5jbGFzc0xpc3QuYWRkKHRoaXMuX3VuaXF1ZUNsYXNzTmFtZSk7XG4gIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICAvLyBOb3RlIHRoYXQgd2UgbmVlZCB0byBsb29rIHVwIHRoZSByb290IG5vZGUgaW4gbmdPbkluaXQsIHJhdGhlciB0aGFuIHRoZSBjb25zdHJ1Y3RvciwgYmVjYXVzZVxuICAgIC8vIEFuZ3VsYXIgc2VlbXMgdG8gY3JlYXRlIHRoZSBlbGVtZW50IG91dHNpZGUgdGhlIHNoYWRvdyByb290IGFuZCB0aGVuIG1vdmVzIGl0IGluc2lkZSwgaWYgdGhlXG4gICAgLy8gbm9kZSBpcyBpbnNpZGUgYW4gYG5nSWZgIGFuZCBhIFNoYWRvd0RvbS1lbmNhcHN1bGF0ZWQgY29tcG9uZW50LlxuICAgIHRoaXMuX3N0eWxlUm9vdCA9IF9nZXRTaGFkb3dSb290KHRoaXMuX2VsZW1lbnRSZWYubmF0aXZlRWxlbWVudCkgPz8gdGhpcy5fZG9jdW1lbnQuaGVhZDtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuX3N0eWxlRWxlbWVudD8ucmVtb3ZlKCk7XG4gICAgdGhpcy5fc3R5bGVFbGVtZW50ID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgc3RpY2t5Q29sdW1uc1VwZGF0ZWQoe3NpemVzfTogU3RpY2t5VXBkYXRlKTogdm9pZCB7XG4gICAgdGhpcy5fc3RhcnRTaXplcyA9IHNpemVzO1xuICAgIHRoaXMuX3VwZGF0ZVNjcm9sbGJhcigpO1xuICB9XG5cbiAgc3RpY2t5RW5kQ29sdW1uc1VwZGF0ZWQoe3NpemVzfTogU3RpY2t5VXBkYXRlKTogdm9pZCB7XG4gICAgdGhpcy5fZW5kU2l6ZXMgPSBzaXplcztcbiAgICB0aGlzLl91cGRhdGVTY3JvbGxiYXIoKTtcbiAgfVxuXG4gIHN0aWNreUhlYWRlclJvd3NVcGRhdGVkKHtzaXplc306IFN0aWNreVVwZGF0ZSk6IHZvaWQge1xuICAgIHRoaXMuX2hlYWRlclNpemVzID0gc2l6ZXM7XG4gICAgdGhpcy5fdXBkYXRlU2Nyb2xsYmFyKCk7XG4gIH1cblxuICBzdGlja3lGb290ZXJSb3dzVXBkYXRlZCh7c2l6ZXN9OiBTdGlja3lVcGRhdGUpOiB2b2lkIHtcbiAgICB0aGlzLl9mb290ZXJTaXplcyA9IHNpemVzO1xuICAgIHRoaXMuX3VwZGF0ZVNjcm9sbGJhcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCBwYWRkaW5nIG9uIHRoZSBzY3JvbGxiYXIgdHJhY2sgYmFzZWQgb24gdGhlIHN0aWNreSBzdGF0ZXMgZnJvbSBDZGtUYWJsZS5cbiAgICovXG4gIHByaXZhdGUgX3VwZGF0ZVNjcm9sbGJhcigpOiB2b2lkIHtcbiAgICBjb25zdCB0b3BNYXJnaW4gPSBjb21wdXRlTWFyZ2luKHRoaXMuX2hlYWRlclNpemVzKTtcbiAgICBjb25zdCBib3R0b21NYXJnaW4gPSBjb21wdXRlTWFyZ2luKHRoaXMuX2Zvb3RlclNpemVzKTtcbiAgICBjb25zdCBzdGFydE1hcmdpbiA9IGNvbXB1dGVNYXJnaW4odGhpcy5fc3RhcnRTaXplcyk7XG4gICAgY29uc3QgZW5kTWFyZ2luID0gY29tcHV0ZU1hcmdpbih0aGlzLl9lbmRTaXplcyk7XG5cbiAgICBpZiAodG9wTWFyZ2luID09PSAwICYmIGJvdHRvbU1hcmdpbiA9PT0gMCAmJiBzdGFydE1hcmdpbiA9PT0gMCAmJiBlbmRNYXJnaW4gPT09IDApIHtcbiAgICAgIHRoaXMuX2NsZWFyQ3NzKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aW9uID0gdGhpcy5fZGlyZWN0aW9uYWxpdHkgPyB0aGlzLl9kaXJlY3Rpb25hbGl0eS52YWx1ZSA6ICdsdHInO1xuICAgIGNvbnN0IGxlZnRNYXJnaW4gPSBkaXJlY3Rpb24gPT09ICdydGwnID8gZW5kTWFyZ2luIDogc3RhcnRNYXJnaW47XG4gICAgY29uc3QgcmlnaHRNYXJnaW4gPSBkaXJlY3Rpb24gPT09ICdydGwnID8gc3RhcnRNYXJnaW4gOiBlbmRNYXJnaW47XG5cbiAgICB0aGlzLl9hcHBseUNzcyhgJHt0b3BNYXJnaW59cHggJHtyaWdodE1hcmdpbn1weCAke2JvdHRvbU1hcmdpbn1weCAke2xlZnRNYXJnaW59cHhgKTtcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBzdHlsZXNoZWV0IGZvciB0aGUgc2Nyb2xsYmFyIHN0eWxlcyBhbmQgY3JlYXRlcyBpdCBpZiBuZWVkIGJlLiAqL1xuICBwcml2YXRlIF9nZXRTdHlsZVNoZWV0KCk6IENTU1N0eWxlU2hlZXQge1xuICAgIGlmICghdGhpcy5fc3R5bGVFbGVtZW50KSB7XG4gICAgICB0aGlzLl9zdHlsZUVsZW1lbnQgPSB0aGlzLl9kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgICAgdGhpcy5fc3R5bGVSb290LmFwcGVuZENoaWxkKHRoaXMuX3N0eWxlRWxlbWVudCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3N0eWxlRWxlbWVudC5zaGVldCBhcyBDU1NTdHlsZVNoZWV0O1xuICB9XG5cbiAgLyoqIFVwZGF0ZXMgdGhlIHN0eWxlc2hlZXQgd2l0aCB0aGUgc3BlY2lmaWVkIHNjcm9sbGJhciBzdHlsZS4gKi9cbiAgcHJpdmF0ZSBfYXBwbHlDc3ModmFsdWU6IHN0cmluZykge1xuICAgIHRoaXMuX2NsZWFyQ3NzKCk7XG5cbiAgICBjb25zdCBzZWxlY3RvciA9IGAuJHt0aGlzLl91bmlxdWVDbGFzc05hbWV9Ojotd2Via2l0LXNjcm9sbGJhci10cmFja2A7XG4gICAgdGhpcy5fZ2V0U3R5bGVTaGVldCgpLmluc2VydFJ1bGUoYCR7c2VsZWN0b3J9IHttYXJnaW46ICR7dmFsdWV9fWAsIDApO1xuICB9XG5cbiAgcHJpdmF0ZSBfY2xlYXJDc3MoKSB7XG4gICAgY29uc3Qgc3R5bGVTaGVldCA9IHRoaXMuX2dldFN0eWxlU2hlZXQoKTtcbiAgICBpZiAoc3R5bGVTaGVldC5jc3NSdWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICBzdHlsZVNoZWV0LmRlbGV0ZVJ1bGUoMCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVNYXJnaW4oc2l6ZXM6IChudW1iZXIgfCBudWxsIHwgdW5kZWZpbmVkKVtdKTogbnVtYmVyIHtcbiAgbGV0IG1hcmdpbiA9IDA7XG4gIGZvciAoY29uc3Qgc2l6ZSBvZiBzaXplcykge1xuICAgIGlmIChzaXplID09IG51bGwpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBtYXJnaW4gKz0gc2l6ZTtcbiAgfVxuICByZXR1cm4gbWFyZ2luO1xufVxuIl19