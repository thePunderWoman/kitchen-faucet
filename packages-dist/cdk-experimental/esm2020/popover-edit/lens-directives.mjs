/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Subject } from 'rxjs';
import { Directive, ElementRef, EventEmitter, Input } from '@angular/core';
import { hasModifierKey } from '@angular/cdk/keycodes';
import { EDIT_PANE_SELECTOR } from './constants';
import { closest } from './polyfill';
import { EditRef } from './edit-ref';
import * as i0 from "@angular/core";
import * as i1 from "./edit-ref";
/**
 * A directive that attaches to a form within the edit lens.
 * It coordinates the form state with the table-wide edit system and handles
 * closing the edit lens when the form is submitted or the user clicks
 * out.
 */
export class CdkEditControl {
    constructor(elementRef, editRef) {
        this.elementRef = elementRef;
        this.editRef = editRef;
        this.destroyed = new Subject();
        /**
         * Specifies what should happen when the user clicks outside of the edit lens.
         * The default behavior is to close the lens without submitting the form.
         */
        this.clickOutBehavior = 'close';
        this.preservedFormValueChange = new EventEmitter();
        /**
         * Determines whether the lens will close on form submit if the form is not in a valid
         * state. By default the lens will remain open.
         */
        this.ignoreSubmitUnlessValid = true;
    }
    ngOnInit() {
        this.editRef.init(this.preservedFormValue);
        this.editRef.finalValue.subscribe(this.preservedFormValueChange);
        this.editRef.blurred.subscribe(() => this._handleBlur());
    }
    ngOnDestroy() {
        this.destroyed.next();
        this.destroyed.complete();
    }
    /**
     * Called when the form submits. If ignoreSubmitUnlessValid is true, checks
     * the form for validity before proceeding.
     * Updates the revert state with the latest submitted value then closes the edit.
     */
    handleFormSubmit() {
        if (this.ignoreSubmitUnlessValid && !this.editRef.isValid()) {
            return;
        }
        this.editRef.updateRevertValue();
        this.editRef.close();
    }
    /** Called on Escape keyup. Closes the edit. */
    close() {
        // todo - allow this behavior to be customized as well, such as calling
        // reset before close
        this.editRef.close();
    }
    /**
     * Called on click anywhere in the document.
     * If the click was outside of the lens, trigger the specified click out behavior.
     */
    handlePossibleClickOut(evt) {
        if (closest(evt.target, EDIT_PANE_SELECTOR)) {
            return;
        }
        switch (this.clickOutBehavior) {
            case 'submit':
                // Manually cause the form to submit before closing.
                this._triggerFormSubmit();
                this.editRef.close();
                break;
            case 'close':
                this.editRef.close();
                break;
            default:
                break;
        }
    }
    _handleKeydown(event) {
        if (event.key === 'Escape' && !hasModifierKey(event)) {
            this.close();
            event.preventDefault();
        }
    }
    /** Triggers submit on tab out if clickOutBehavior is 'submit'. */
    _handleBlur() {
        if (this.clickOutBehavior === 'submit') {
            // Manually cause the form to submit before closing.
            this._triggerFormSubmit();
        }
    }
    _triggerFormSubmit() {
        this.elementRef.nativeElement.dispatchEvent(new Event('submit'));
    }
}
CdkEditControl.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkEditControl, deps: [{ token: i0.ElementRef }, { token: i1.EditRef }], target: i0.ɵɵFactoryTarget.Directive });
CdkEditControl.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "15.1.0", type: CdkEditControl, selector: "form[cdkEditControl]", inputs: { clickOutBehavior: ["cdkEditControlClickOutBehavior", "clickOutBehavior"], preservedFormValue: ["cdkEditControlPreservedFormValue", "preservedFormValue"], ignoreSubmitUnlessValid: ["cdkEditControlIgnoreSubmitUnlessValid", "ignoreSubmitUnlessValid"] }, outputs: { preservedFormValueChange: "cdkEditControlPreservedFormValueChange" }, host: { listeners: { "ngSubmit": "handleFormSubmit()", "document:click": "handlePossibleClickOut($event)", "keydown": "_handleKeydown($event)" } }, providers: [EditRef], ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkEditControl, decorators: [{
            type: Directive,
            args: [{
                    selector: 'form[cdkEditControl]',
                    inputs: [
                        'clickOutBehavior: cdkEditControlClickOutBehavior',
                        'preservedFormValue: cdkEditControlPreservedFormValue',
                        'ignoreSubmitUnlessValid: cdkEditControlIgnoreSubmitUnlessValid',
                    ],
                    outputs: ['preservedFormValueChange: cdkEditControlPreservedFormValueChange'],
                    providers: [EditRef],
                    host: {
                        '(ngSubmit)': 'handleFormSubmit()',
                        '(document:click)': 'handlePossibleClickOut($event)',
                        '(keydown)': '_handleKeydown($event)',
                    },
                }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i1.EditRef }]; } });
/** Reverts the form to its initial or previously submitted state on click. */
export class CdkEditRevert {
    constructor(editRef) {
        this.editRef = editRef;
        /** Type of the button. Defaults to `button` to avoid accident form submits. */
        this.type = 'button';
    }
    revertEdit() {
        this.editRef.reset();
    }
}
CdkEditRevert.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkEditRevert, deps: [{ token: i1.EditRef }], target: i0.ɵɵFactoryTarget.Directive });
CdkEditRevert.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "15.1.0", type: CdkEditRevert, selector: "button[cdkEditRevert]", inputs: { type: "type" }, host: { attributes: { "type": "button" }, listeners: { "click": "revertEdit()" } }, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkEditRevert, decorators: [{
            type: Directive,
            args: [{
                    selector: 'button[cdkEditRevert]',
                    host: {
                        'type': 'button',
                        '(click)': 'revertEdit()',
                    },
                }]
        }], ctorParameters: function () { return [{ type: i1.EditRef }]; }, propDecorators: { type: [{
                type: Input
            }] } });
/** Closes the lens on click. */
export class CdkEditClose {
    constructor(elementRef, editRef) {
        this.elementRef = elementRef;
        this.editRef = editRef;
        const nativeElement = elementRef.nativeElement;
        // Prevent accidental form submits.
        if (nativeElement.nodeName === 'BUTTON' && !nativeElement.getAttribute('type')) {
            nativeElement.setAttribute('type', 'button');
        }
    }
    closeEdit() {
        // Note that we use `click` here, rather than a keyboard event, because some screen readers
        // will emit a fake click event instead of an enter keyboard event on buttons. For the keyboard
        // events we use `keydown`, rather than `keyup`, because we use `keydown` to open the overlay
        // as well. If we were to use `keyup`, the user could end up opening and closing within
        // the same event sequence if focus was moved quickly.
        this.editRef.close();
    }
}
CdkEditClose.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkEditClose, deps: [{ token: i0.ElementRef }, { token: i1.EditRef }], target: i0.ɵɵFactoryTarget.Directive });
CdkEditClose.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "15.1.0", type: CdkEditClose, selector: "[cdkEditClose]", host: { listeners: { "click": "closeEdit()", "keydown.enter": "closeEdit()", "keydown.space": "closeEdit()" } }, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkEditClose, decorators: [{
            type: Directive,
            args: [{
                    selector: '[cdkEditClose]',
                    host: {
                        '(click)': 'closeEdit()',
                        '(keydown.enter)': 'closeEdit()',
                        '(keydown.space)': 'closeEdit()',
                    },
                }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i1.EditRef }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVucy1kaXJlY3RpdmVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2Nkay1leHBlcmltZW50YWwvcG9wb3Zlci1lZGl0L2xlbnMtZGlyZWN0aXZlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sRUFBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBcUIsS0FBSyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzVGLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFDL0MsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLFlBQVksQ0FBQztBQUNuQyxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDOzs7QUFLbkM7Ozs7O0dBS0c7QUFnQkgsTUFBTSxPQUFPLGNBQWM7SUF1QnpCLFlBQStCLFVBQXNCLEVBQVcsT0FBMkI7UUFBNUQsZUFBVSxHQUFWLFVBQVUsQ0FBWTtRQUFXLFlBQU8sR0FBUCxPQUFPLENBQW9CO1FBdEJ4RSxjQUFTLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUVuRDs7O1dBR0c7UUFDSCxxQkFBZ0IsR0FBZ0MsT0FBTyxDQUFDO1FBUS9DLDZCQUF3QixHQUFHLElBQUksWUFBWSxFQUFhLENBQUM7UUFFbEU7OztXQUdHO1FBQ0gsNEJBQXVCLEdBQUcsSUFBSSxDQUFDO0lBRStELENBQUM7SUFFL0YsUUFBUTtRQUNOLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNqRSxJ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YixhQUFhOzJGQUFiLGFBQWE7a0JBUHpCLFNBQVM7bUJBQUM7b0JBQ1QsUUFBUSxFQUFFLHVCQUF1QjtvQkFDakMsSUFBSSxFQUFFO3dCQUNKLE1BQU0sRUFBRSxRQUFRO3dCQUNoQixTQUFTLEVBQUUsY0FBYztxQkFDMUI7aUJBQ0Y7OEZBR1UsSUFBSTtzQkFBWixLQUFLOztBQVNSLGdDQUFnQztBQVNoQyxNQUFNLE9BQU8sWUFBWTtJQUN2QixZQUNxQixVQUFtQyxFQUNuQyxPQUEyQjtRQUQzQixlQUFVLEdBQVYsVUFBVSxDQUF5QjtRQUNuQyxZQUFPLEdBQVAsT0FBTyxDQUFvQjtRQUU5QyxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBRS9DLG1DQUFtQztRQUNuQyxJQUFJLGFBQWEsQ0FBQyxRQUFRLEtBQUssUUFBUSxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM5RSxhQUFhLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztTQUM5QztJQUNILENBQUM7SUFFRCxTQUFTO1FBQ1AsMkZBQTJGO1FBQzNGLCtGQUErRjtRQUMvRiw2RkFBNkY7UUFDN0YsdUZBQXVGO1FBQ3ZGLHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3ZCLENBQUM7O3lHQXBCVSxZQUFZOzZGQUFaLFlBQVk7MkZBQVosWUFBWTtrQkFSeEIsU0FBUzttQkFBQztvQkFDVCxRQUFRLEVBQUUsZ0JBQWdCO29CQUMxQixJQUFJLEVBQUU7d0JBQ0osU0FBUyxFQUFFLGFBQWE7d0JBQ3hCLGlCQUFpQixFQUFFLGFBQWE7d0JBQ2hDLGlCQUFpQixFQUFFLGFBQWE7cUJBQ2pDO2lCQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7U3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge0RpcmVjdGl2ZSwgRWxlbWVudFJlZiwgRXZlbnRFbWl0dGVyLCBPbkRlc3Ryb3ksIE9uSW5pdCwgSW5wdXR9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtoYXNNb2RpZmllcktleX0gZnJvbSAnQGFuZ3VsYXIvY2RrL2tleWNvZGVzJztcbmltcG9ydCB7RURJVF9QQU5FX1NFTEVDVE9SfSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQge2Nsb3Nlc3R9IGZyb20gJy4vcG9seWZpbGwnO1xuaW1wb3J0IHtFZGl0UmVmfSBmcm9tICcuL2VkaXQtcmVmJztcblxuLyoqIE9wdGlvbnMgZm9yIHdoYXQgZG8gdG8gd2hlbiB0aGUgdXNlciBjbGlja3Mgb3V0c2lkZSBvZiBhbiBlZGl0IGxlbnMuICovXG5leHBvcnQgdHlwZSBQb3BvdmVyRWRpdENsaWNrT3V0QmVoYXZpb3IgPSAnY2xvc2UnIHwgJ3N1Ym1pdCcgfCAnbm9vcCc7XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCBhdHRhY2hlcyB0byBhIGZvcm0gd2l0aGluIHRoZSBlZGl0IGxlbnMuXG4gKiBJdCBjb29yZGluYXRlcyB0aGUgZm9ybSBzdGF0ZSB3aXRoIHRoZSB0YWJsZS13aWRlIGVkaXQgc3lzdGVtIGFuZCBoYW5kbGVzXG4gKiBjbG9zaW5nIHRoZSBlZGl0IGxlbnMgd2hlbiB0aGUgZm9ybSBpcyBzdWJtaXR0ZWQgb3IgdGhlIHVzZXIgY2xpY2tzXG4gKiBvdXQuXG4gKi9cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ2Zvcm1bY2RrRWRpdENvbnRyb2xdJyxcbiAgaW5wdXRzOiBbXG4gICAgJ2NsaWNrT3V0QmVoYXZpb3I6IGNka0VkaXRDb250cm9sQ2xpY2tPdXRCZWhhdmlvcicsXG4gICAgJ3ByZXNlcnZlZEZvcm1WYWx1ZTogY2RrRWRpdENvbnRyb2xQcmVzZXJ2ZWRGb3JtVmFsdWUnLFxuICAgICdpZ25vcmVTdWJtaXRVbmxlc3NWYWxpZDogY2RrRWRpdENvbnRyb2xJZ25vcmVTdWJtaXRVbmxlc3NWYWxpZCcsXG4gIF0sXG4gIG91dHB1dHM6IFsncHJlc2VydmVkRm9ybVZhbHVlQ2hhbmdlOiBjZGtFZGl0Q29udHJvbFByZXNlcnZlZEZvcm1WYWx1ZUNoYW5nZSddLFxuICBwcm92aWRlcnM6IFtFZGl0UmVmXSxcbiAgaG9zdDoge1xuICAgICcobmdTdWJtaXQpJzogJ2hhbmRsZUZvcm1TdWJtaXQoKScsXG4gICAgJyhkb2N1bWVudDpjbGljayknOiAnaGFuZGxlUG9zc2libGVDbGlja091dCgkZXZlbnQpJyxcbiAgICAnKGtleWRvd24pJzogJ19oYW5kbGVLZXlkb3duKCRldmVudCknLFxuICB9LFxufSlcbmV4cG9ydCBjbGFzcyBDZGtFZGl0Q29udHJvbDxGb3JtVmFsdWU+IGltcGxlbWVudHMgT25EZXN0cm95LCBPbkluaXQge1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgZGVzdHJveWVkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcblxuICAvKipcbiAgICogU3BlY2lmaWVzIHdoYXQgc2hvdWxkIGhhcHBlbiB3aGVuIHRoZSB1c2VyIGNsaWNrcyBvdXRzaWRlIG9mIHRoZSBlZGl0IGxlbnMuXG4gICAqIFRoZSBkZWZhdWx0IGJlaGF2aW9yIGlzIHRvIGNsb3NlIHRoZSBsZW5zIHdpdGhvdXQgc3VibWl0dGluZyB0aGUgZm9ybS5cbiAgICovXG4gIGNsaWNrT3V0QmVoYXZpb3I6IFBvcG92ZXJFZGl0Q2xpY2tPdXRCZWhhdmlvciA9ICdjbG9zZSc7XG5cbiAgLyoqXG4gICAqIEEgdHdvLXdheSBiaW5kaW5nIGZvciBzdG9yaW5nIHVuc3VibWl0dGVkIGZvcm0gc3RhdGUuIElmIG5vdCBwcm92aWRlZFxuICAgKiB0aGVuIGZvcm0gc3RhdGUgd2lsbCBiZSBkaXNjYXJkZWQgb24gY2xvc2UuIFRoZSBQZXJpc3RCeSBkaXJlY3RpdmUgaXMgb2ZmZXJlZFxuICAgKiBhcyBhIGNvbnZlbmllbnQgc2hvcnRjdXQgZm9yIHRoZXNlIGJpbmRpbmdzLlxuICAgKi9cbiAgcHJlc2VydmVkRm9ybVZhbHVlPzogRm9ybVZhbHVlO1xuICByZWFkb25seSBwcmVzZXJ2ZWRGb3JtVmFsdWVDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPEZvcm1WYWx1ZT4oKTtcblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBsZW5zIHdpbGwgY2xvc2Ugb24gZm9ybSBzdWJtaXQgaWYgdGhlIGZvcm0gaXMgbm90IGluIGEgdmFsaWRcbiAgICogc3RhdGUuIEJ5IGRlZmF1bHQgdGhlIGxlbnMgd2lsbCByZW1haW4gb3Blbi5cbiAgICovXG4gIGlnbm9yZVN1Ym1pdFVubGVzc1ZhbGlkID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZG9ubHkgZWxlbWVudFJlZjogRWxlbWVudFJlZiwgcmVhZG9ubHkgZWRpdFJlZjogRWRpdFJlZjxGb3JtVmFsdWU+KSB7fVxuXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIHRoaXMuZWRpdFJlZi5pbml0KHRoaXMucHJlc2VydmVkRm9ybVZhbHVlKTtcbiAgICB0aGlzLmVkaXRSZWYuZmluYWxWYWx1ZS5zdWJzY3JpYmUodGhpcy5wcmVzZXJ2ZWRGb3JtVmFsdWVDaGFuZ2UpO1xuICAgIHRoaXMuZWRpdFJlZi5ibHVycmVkLnN1YnNjcmliZSgoKSA9PiB0aGlzLl9oYW5kbGVCbHVyKCkpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kZXN0cm95ZWQubmV4dCgpO1xuICAgIHRoaXMuZGVzdHJveWVkLmNvbXBsZXRlKCk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGZvcm0gc3VibWl0cy4gSWYgaWdub3JlU3VibWl0VW5sZXNzVmFsaWQgaXMgdHJ1ZSwgY2hlY2tzXG4gICAqIHRoZSBmb3JtIGZvciB2YWxpZGl0eSBiZWZvcmUgcHJvY2VlZGluZy5cbiAgICogVXBkYXRlcyB0aGUgcmV2ZXJ0IHN0YXRlIHdpdGggdGhlIGxhdGVzdCBzdWJtaXR0ZWQgdmFsdWUgdGhlbiBjbG9zZXMgdGhlIGVkaXQuXG4gICAqL1xuICBoYW5kbGVGb3JtU3VibWl0KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlnbm9yZVN1Ym1pdFVubGVzc1ZhbGlkICYmICF0aGlzLmVkaXRSZWYuaXNWYWxpZCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5lZGl0UmVmLnVwZGF0ZVJldmVydFZhbHVlKCk7XG4gICAgdGhpcy5lZGl0UmVmLmNsb3NlKCk7XG4gIH1cblxuICAvKiogQ2FsbGVkIG9uIEVzY2FwZSBrZXl1cC4gQ2xvc2VzIHRoZSBlZGl0LiAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICAvLyB0b2RvIC0gYWxsb3cgdGhpcyBiZWhhdmlvciB0byBiZSBjdXN0b21pemVkIGFzIHdlbGwsIHN1Y2ggYXMgY2FsbGluZ1xuICAgIC8vIHJlc2V0IGJlZm9yZSBjbG9zZVxuICAgIHRoaXMuZWRpdFJlZi5jbG9zZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBvbiBjbGljayBhbnl3aGVyZSBpbiB0aGUgZG9jdW1lbnQuXG4gICAqIElmIHRoZSBjbGljayB3YXMgb3V0c2lkZSBvZiB0aGUgbGVucywgdHJpZ2dlciB0aGUgc3BlY2lmaWVkIGNsaWNrIG91dCBiZWhhdmlvci5cbiAgICovXG4gIGhhbmRsZVBvc3NpYmxlQ2xpY2tPdXQoZXZ0OiBFdmVudCk6IHZvaWQge1xuICAgIGlmIChjbG9zZXN0KGV2dC50YXJnZXQsIEVESVRfUEFORV9TRUxFQ1RPUikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3dpdGNoICh0aGlzLmNsaWNrT3V0QmVoYXZpb3IpIHtcbiAgICAgIGNhc2UgJ3N1Ym1pdCc6XG4gICAgICAgIC8vIE1hbnVhbGx5IGNhdXNlIHRoZSBmb3JtIHRvIHN1Ym1pdCBiZWZvcmUgY2xvc2luZy5cbiAgICAgICAgdGhpcy5fdHJpZ2dlckZvcm1TdWJtaXQoKTtcbiAgICAgICAgdGhpcy5lZGl0UmVmLmNsb3NlKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnY2xvc2UnOlxuICAgICAgICB0aGlzLmVkaXRSZWYuY2xvc2UoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBfaGFuZGxlS2V5ZG93bihldmVudDogS2V5Ym9hcmRFdmVudCkge1xuICAgIGlmIChldmVudC5rZXkgPT09ICdFc2NhcGUnICYmICFoYXNNb2RpZmllcktleShldmVudCkpIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFRyaWdnZXJzIHN1Ym1pdCBvbiB0YWIgb3V0IGlmIGNsaWNrT3V0QmVoYXZpb3IgaXMgJ3N1Ym1pdCcuICovXG4gIHByaXZhdGUgX2hhbmRsZUJsdXIoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY2xpY2tPdXRCZWhhdmlvciA9PT0gJ3N1Ym1pdCcpIHtcbiAgICAgIC8vIE1hbnVhbGx5IGNhdXNlIHRoZSBmb3JtIHRvIHN1Ym1pdCBiZWZvcmUgY2xvc2luZy5cbiAgICAgIHRoaXMuX3RyaWdnZXJGb3JtU3VibWl0KCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfdHJpZ2dlckZvcm1TdWJtaXQoKSB7XG4gICAgdGhpcy5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQhLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdzdWJtaXQnKSk7XG4gIH1cbn1cblxuLyoqIFJldmVydHMgdGhlIGZvcm0gdG8gaXRzIGluaXRpYWwgb3IgcHJldmlvdXNseSBzdWJtaXR0ZWQgc3RhdGUgb24gY2xpY2suICovXG5ARGlyZWN0aXZlKHtcbiAgc2VsZWN0b3I6ICdidXR0b25bY2RrRWRpdFJldmVydF0nLFxuICBob3N0OiB7XG4gICAgJ3R5cGUnOiAnYnV0dG9uJywgLy8gUHJldmVudHMgYWNjaWRlbnRhbCBmb3JtIHN1Ym1pdHMuXG4gICAgJyhjbGljayknOiAncmV2ZXJ0RWRpdCgpJyxcbiAgfSxcbn0pXG5leHBvcnQgY2xhc3MgQ2RrRWRpdFJldmVydDxGb3JtVmFsdWU+IHtcbiAgLyoqIFR5cGUgb2YgdGhlIGJ1dHRvbi4gRGVmYXVsdHMgdG8gYGJ1dHRvbmAgdG8gYXZvaWQgYWNjaWRlbnQgZm9ybSBzdWJtaXRzLiAqL1xuICBASW5wdXQoKSB0eXBlOiBzdHJpbmcgPSAnYnV0dG9uJztcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZG9ubHkgZWRpdFJlZjogRWRpdFJlZjxGb3JtVmFsdWU+KSB7fVxuXG4gIHJldmVydEVkaXQoKTogdm9pZCB7XG4gICAgdGhpcy5lZGl0UmVmLnJlc2V0KCk7XG4gIH1cbn1cblxuLyoqIENsb3NlcyB0aGUgbGVucyBvbiBjbGljay4gKi9cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ1tjZGtFZGl0Q2xvc2VdJyxcbiAgaG9zdDoge1xuICAgICcoY2xpY2spJzogJ2Nsb3NlRWRpdCgpJyxcbiAgICAnKGtleWRvd24uZW50ZXIpJzogJ2Nsb3NlRWRpdCgpJyxcbiAgICAnKGtleWRvd24uc3BhY2UpJzogJ2Nsb3NlRWRpdCgpJyxcbiAgfSxcbn0pXG5leHBvcnQgY2xhc3MgQ2RrRWRpdENsb3NlPEZvcm1WYWx1ZT4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcm90ZWN0ZWQgcmVhZG9ubHkgZWxlbWVudFJlZjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD4sXG4gICAgcHJvdGVjdGVkIHJlYWRvbmx5IGVkaXRSZWY6IEVkaXRSZWY8Rm9ybVZhbHVlPixcbiAgKSB7XG4gICAgY29uc3QgbmF0aXZlRWxlbWVudCA9IGVsZW1lbnRSZWYubmF0aXZlRWxlbWVudDtcblxuICAgIC8vIFByZXZlbnQgYWNjaWRlbnRhbCBmb3JtIHN1Ym1pdHMuXG4gICAgaWYgKG5hdGl2ZUVsZW1lbnQubm9kZU5hbWUgPT09ICdCVVRUT04nICYmICFuYXRpdmVFbGVtZW50LmdldEF0dHJpYnV0ZSgndHlwZScpKSB7XG4gICAgICBuYXRpdmVFbGVtZW50LnNldEF0dHJpYnV0ZSgndHlwZScsICdidXR0b24nKTtcbiAgICB9XG4gIH1cblxuICBjbG9zZUVkaXQoKTogdm9pZCB7XG4gICAgLy8gTm90ZSB0aGF0IHdlIHVzZSBgY2xpY2tgIGhlcmUsIHJhdGhlciB0aGFuIGEga2V5Ym9hcmQgZXZlbnQsIGJlY2F1c2Ugc29tZSBzY3JlZW4gcmVhZGVyc1xuICAgIC8vIHdpbGwgZW1pdCBhIGZha2UgY2xpY2sgZXZlbnQgaW5zdGVhZCBvZiBhbiBlbnRlciBrZXlib2FyZCBldmVudCBvbiBidXR0b25zLiBGb3IgdGhlIGtleWJvYXJkXG4gICAgLy8gZXZlbnRzIHdlIHVzZSBga2V5ZG93bmAsIHJhdGhlciB0aGFuIGBrZXl1cGAsIGJlY2F1c2Ugd2UgdXNlIGBrZXlkb3duYCB0byBvcGVuIHRoZSBvdmVybGF5XG4gICAgLy8gYXMgd2VsbC4gSWYgd2Ugd2VyZSB0byB1c2UgYGtleXVwYCwgdGhlIHVzZXIgY291bGQgZW5kIHVwIG9wZW5pbmcgYW5kIGNsb3Npbmcgd2l0aGluXG4gICAgLy8gdGhlIHNhbWUgZXZlbnQgc2VxdWVuY2UgaWYgZm9jdXMgd2FzIG1vdmVkIHF1aWNrbHkuXG4gICAgdGhpcy5lZGl0UmVmLmNsb3NlKCk7XG4gIH1cbn1cbiJdfQ==