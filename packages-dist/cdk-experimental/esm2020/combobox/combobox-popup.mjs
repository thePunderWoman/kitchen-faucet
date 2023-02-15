/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Directive, ElementRef, Inject, Input } from '@angular/core';
import { CDK_COMBOBOX, CdkCombobox } from './combobox';
import * as i0 from "@angular/core";
import * as i1 from "./combobox";
let nextId = 0;
export class CdkComboboxPopup {
    get role() {
        return this._role;
    }
    set role(value) {
        this._role = value;
    }
    get firstFocus() {
        return this._firstFocusElement;
    }
    set firstFocus(id) {
        this._firstFocusElement = id;
    }
    constructor(_elementRef, _combobox) {
        this._elementRef = _elementRef;
        this._combobox = _combobox;
        this._role = 'dialog';
        this.id = `cdk-combobox-popup-${nextId++}`;
    }
    ngOnInit() {
        this.registerWithPanel();
    }
    registerWithPanel() {
        this._combobox._registerContent(this.id, this._role);
    }
    focusFirstElement() {
        if (this._firstFocusElement) {
            this._firstFocusElement.focus();
        }
        else {
            this._elementRef.nativeElement.focus();
        }
    }
}
CdkComboboxPopup.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkComboboxPopup, deps: [{ token: i0.ElementRef }, { token: CDK_COMBOBOX }], target: i0.ɵɵFactoryTarget.Directive });
CdkComboboxPopup.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "15.1.0", type: CdkComboboxPopup, selector: "[cdkComboboxPopup]", inputs: { role: "role", firstFocus: "firstFocus", id: "id" }, host: { attributes: { "tabindex": "-1" }, listeners: { "focus": "focusFirstElement()" }, properties: { "attr.role": "role", "id": "id" }, classAttribute: "cdk-combobox-popup" }, exportAs: ["cdkComboboxPopup"], ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkComboboxPopup, decorators: [{
            type: Directive,
            args: [{
                    selector: '[cdkComboboxPopup]',
                    exportAs: 'cdkComboboxPopup',
                    host: {
                        'class': 'cdk-combobox-popup',
                        '[attr.role]': 'role',
                        '[id]': 'id',
                        'tabindex': '-1',
                        '(focus)': 'focusFirstElement()',
                    },
                }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i1.CdkCombobox, decorators: [{
                    type: Inject,
                    args: [CDK_COMBOBOX]
                }] }]; }, propDecorators: { role: [{
                type: Input
            }], firstFocus: [{
                type: Input
            }], id: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tYm9ib3gtcG9wdXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvY2RrLWV4cGVyaW1lbnRhbC9jb21ib2JveC9jb21ib2JveC1wb3B1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFTLE1BQU0sZUFBZSxDQUFDO0FBQzNFLE9BQU8sRUFBb0IsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLFlBQVksQ0FBQzs7O0FBRXhFLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztBQWFmLE1BQU0sT0FBTyxnQkFBZ0I7SUFDM0IsSUFDSSxJQUFJO1FBQ04sT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3BCLENBQUM7SUFDRCxJQUFJLElBQUksQ0FBQyxLQUF3QjtRQUMvQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNyQixDQUFDO0lBR0QsSUFDSSxVQUFVO1FBQ1osT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUM7SUFDakMsQ0FBQztJQUNELElBQUksVUFBVSxDQUFDLEVBQWU7UUFDNUIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBS0QsWUFDbUIsV0FBb0MsRUFDZCxTQUFzQjtRQUQ1QyxnQkFBVyxHQUFYLFdBQVcsQ0FBeUI7UUFDZCxjQUFTLEdBQVQsU0FBUyxDQUFhO1FBZnZELFVBQUssR0FBc0IsUUFBUSxDQUFDO1FBV25DLE9BQUUsR0FBRyxzQkFBc0IsTUFBTSxFQUFFLEVBQUUsQ0FBQztJQUs1QyxDQUFDO0lBRUosUUFBUTtRQUNOLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRCxpQkFBaUI7UUFDZixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxpQkFBaUI7UUFDZixJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtZQUMzQixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDakM7YUFBTTtZQUNMLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ3hDO0lBQ0gsQ0FBQzs7NkdBeENVLGdCQUFnQiw0Q0F1QmpCLFlBQVk7aUdBdkJYLGdCQUFnQjsyRkFBaEIsZ0JBQWdCO2tCQVg1QixTQUFTO21CQUFDO29CQUNULFFBQVEsRUFBRSxvQkFBb0I7b0JBQzlCLFFBQVEsRUFBRSxrQkFBa0I7b0JBQzVCLElBQUksRUFBRTt3QkFDSixPQUFPLEVBQUUsb0JBQW9CO3dCQUM3QixhQUFhLEVBQUUsTUFBTTt3QkFDckIsTUFBTSxFQUFFLElBQUk7d0JBQ1osVUFBVSxFQUFFLElBQUk7d0JBQ2hCLFNBQVMsRUFBRSxxQkFBcUI7cUJBQ2pDO2lCQUNGOzswQkF3QkksTUFBTTsyQkFBQyxZQUFZOzRDQXJCbEIsSUFBSTtzQkFEUCxLQUFLO2dCQVVGLFVBQVU7c0JBRGIsS0FBSztnQkFTRyxFQUFFO3NCQUFWLEtBQUsiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtEaXJlY3RpdmUsIEVsZW1lbnRSZWYsIEluamVjdCwgSW5wdXQsIE9uSW5pdH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0FyaWFIYXNQb3B1cFZhbHVlLCBDREtfQ09NQk9CT1gsIENka0NvbWJvYm94fSBmcm9tICcuL2NvbWJvYm94JztcblxubGV0IG5leHRJZCA9IDA7XG5cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ1tjZGtDb21ib2JveFBvcHVwXScsXG4gIGV4cG9ydEFzOiAnY2RrQ29tYm9ib3hQb3B1cCcsXG4gIGhvc3Q6IHtcbiAgICAnY2xhc3MnOiAnY2RrLWNvbWJvYm94LXBvcHVwJyxcbiAgICAnW2F0dHIucm9sZV0nOiAncm9sZScsXG4gICAgJ1tpZF0nOiAnaWQnLFxuICAgICd0YWJpbmRleCc6ICctMScsXG4gICAgJyhmb2N1cyknOiAnZm9jdXNGaXJzdEVsZW1lbnQoKScsXG4gIH0sXG59KVxuZXhwb3J0IGNsYXNzIENka0NvbWJvYm94UG9wdXA8VCA9IHVua25vd24+IGltcGxlbWVudHMgT25Jbml0IHtcbiAgQElucHV0KClcbiAgZ2V0IHJvbGUoKTogQXJpYUhhc1BvcHVwVmFsdWUge1xuICAgIHJldHVybiB0aGlzLl9yb2xlO1xuICB9XG4gIHNldCByb2xlKHZhbHVlOiBBcmlhSGFzUG9wdXBWYWx1ZSkge1xuICAgIHRoaXMuX3JvbGUgPSB2YWx1ZTtcbiAgfVxuICBwcml2YXRlIF9yb2xlOiBBcmlhSGFzUG9wdXBWYWx1ZSA9ICdkaWFsb2cnO1xuXG4gIEBJbnB1dCgpXG4gIGdldCBmaXJzdEZvY3VzKCk6IEhUTUxFbGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5fZmlyc3RGb2N1c0VsZW1lbnQ7XG4gIH1cbiAgc2V0IGZpcnN0Rm9jdXMoaWQ6IEhUTUxFbGVtZW50KSB7XG4gICAgdGhpcy5fZmlyc3RGb2N1c0VsZW1lbnQgPSBpZDtcbiAgfVxuICBwcml2YXRlIF9maXJzdEZvY3VzRWxlbWVudDogSFRNTEVsZW1lbnQ7XG5cbiAgQElucHV0KCkgaWQgPSBgY2RrLWNvbWJvYm94LXBvcHVwLSR7bmV4dElkKyt9YDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9lbGVtZW50UmVmOiBFbGVtZW50UmVmPEhUTUxFbGVtZW50PixcbiAgICBASW5qZWN0KENES19DT01CT0JPWCkgcHJpdmF0ZSByZWFkb25seSBfY29tYm9ib3g6IENka0NvbWJvYm94LFxuICApIHt9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5yZWdpc3RlcldpdGhQYW5lbCgpO1xuICB9XG5cbiAgcmVnaXN0ZXJXaXRoUGFuZWwoKTogdm9pZCB7XG4gICAgdGhpcy5fY29tYm9ib3guX3JlZ2lzdGVyQ29udGVudCh0aGlzLmlkLCB0aGlzLl9yb2xlKTtcbiAgfVxuXG4gIGZvY3VzRmlyc3RFbGVtZW50KCkge1xuICAgIGlmICh0aGlzLl9maXJzdEZvY3VzRWxlbWVudCkge1xuICAgICAgdGhpcy5fZmlyc3RGb2N1c0VsZW1lbnQuZm9jdXMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LmZvY3VzKCk7XG4gICAgfVxuICB9XG59XG4iXX0=