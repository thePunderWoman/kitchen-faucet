/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Directive, Inject, Optional, Self } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { of as observableOf, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { CdkSelection } from './selection';
import * as i0 from "@angular/core";
import * as i1 from "./selection";
/**
 * Makes the element a select-all toggle.
 *
 * Must be used within a parent `CdkSelection` directive. It toggles the selection states
 * of all the selection toggles connected with the `CdkSelection` directive.
 * If the element implements `ControlValueAccessor`, e.g. `MatCheckbox`, the directive
 * automatically connects it with the select-all state provided by the `CdkSelection` directive. If
 * not, use `checked$` to get the checked state, `indeterminate$` to get the indeterminate state,
 * and `toggle()` to change the selection state.
 */
export class CdkSelectAll {
    /**
     * Toggles the select-all state.
     * @param event The click event if the toggle is triggered by a (mouse or keyboard) click. If
     *     using with a native `<input type="checkbox">`, the parameter is required for the
     *     indeterminate state to work properly.
     */
    toggle(event) {
        // This is needed when applying the directive on a native <input type="checkbox">
        // checkbox. The default behavior needs to be prevented in order to support the indeterminate
        // state. The timeout is also needed so the checkbox can show the latest state.
        if (event) {
            event.preventDefault();
        }
        setTimeout(() => {
            this._selection.toggleSelectAll();
        });
    }
    constructor(_selection, _controlValueAccessor) {
        this._selection = _selection;
        this._controlValueAccessor = _controlValueAccessor;
        /**
         * The checked state of the toggle.
         * Resolves to `true` if all the values are selected, `false` if no value is selected.
         */
        this.checked = this._selection.change.pipe(switchMap(() => observableOf(this._selection.isAllSelected())));
        /**
         * The indeterminate state of the toggle.
         * Resolves to `true` if part (not all) of the values are selected, `false` if all values or no
         * value at all are selected.
         */
        this.indeterminate = this._selection.change.pipe(switchMap(() => observableOf(this._selection.isPartialSelected())));
        this._destroyed = new Subject();
    }
    ngOnInit() {
        this._assertValidParentSelection();
        this._configureControlValueAccessor();
    }
    _configureControlValueAccessor() {
        if (this._controlValueAccessor && this._controlValueAccessor.length) {
            this._controlValueAccessor[0].registerOnChange((e) => {
                if (e === true || e === false) {
                    this.toggle();
                }
            });
            this.checked.pipe(takeUntil(this._destroyed)).subscribe(state => {
                this._controlValueAccessor[0].writeValue(state);
            });
        }
    }
    _assertValidParentSelection() {
        if (!this._selection && (typeof ngDevMode === 'undefined' || ngDevMode)) {
            throw Error('CdkSelectAll: missing CdkSelection in the parent');
        }
        if (!this._selection.multiple && (typeof ngDevMode === 'undefined' || ngDevMode)) {
            throw Error('CdkSelectAll: CdkSelection must have cdkSelectionMultiple set to true');
        }
    }
    ngOnDestroy() {
        this._destroyed.next();
        this._destroyed.complete();
    }
}
CdkSelectAll.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkSelectAll, deps: [{ token: CdkSelection, optional: true }, { token: NG_VALUE_ACCESSOR, optional: true, self: true }], target: i0.ɵɵFactoryTarget.Directive });
CdkSelectAll.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "15.1.0", type: CdkSelectAll, selector: "[cdkSelectAll]", exportAs: ["cdkSelectAll"], ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkSelectAll, decorators: [{
            type: Directive,
            args: [{
                    selector: '[cdkSelectAll]',
                    exportAs: 'cdkSelectAll',
                }]
        }], ctorParameters: function () { return [{ type: i1.CdkSelection, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [CdkSelection]
                }] }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Self
                }, {
                    type: Inject,
                    args: [NG_VALUE_ACCESSOR]
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0LWFsbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jZGstZXhwZXJpbWVudGFsL3NlbGVjdGlvbi9zZWxlY3QtYWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxTQUFTLEVBQUUsTUFBTSxFQUFxQixRQUFRLEVBQUUsSUFBSSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ25GLE9BQU8sRUFBdUIsaUJBQWlCLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN2RSxPQUFPLEVBQWEsRUFBRSxJQUFJLFlBQVksRUFBRSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDN0QsT0FBTyxFQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVwRCxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sYUFBYSxDQUFDOzs7QUFFekM7Ozs7Ozs7OztHQVNHO0FBS0gsTUFBTSxPQUFPLFlBQVk7SUFrQnZCOzs7OztPQUtHO0lBQ0gsTUFBTSxDQUFDLEtBQWtCO1FBQ3ZCLGlGQUFpRjtRQUNqRiw2RkFBNkY7UUFDN0YsK0VBQStFO1FBQy9FLElBQUksS0FBSyxFQUFFO1lBQ1QsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1NBQ3hCO1FBRUQsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNkLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBSUQsWUFDcUQsVUFBMkIsRUFJN0QscUJBQTZDO1FBSlgsZUFBVSxHQUFWLFVBQVUsQ0FBaUI7UUFJN0QsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQTNDaEU7OztXQUdHO1FBQ00sWUFBTyxHQUF3QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2pFLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQy9ELENBQUM7UUFFRjs7OztXQUlHO1FBQ00sa0JBQWEsR0FBd0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUN2RSxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQ25FLENBQUM7UUFxQmUsZUFBVSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7SUFRL0MsQ0FBQztJQUVKLFFBQVE7UUFDTixJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztRQUNuQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0lBRU8sOEJBQThCO1FBQ3BDLElBQUksSUFBSSxDQUFDLHFCQUFxQixJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUU7WUFDbkUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBVSxFQUFFLEVBQUU7Z0JBQzVELElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFO29CQUM3QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7aUJBQ2Y7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzlELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbEQsQ0FBQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7SUFFTywyQkFBMkI7UUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksU0FBUyxDQUFDLEVBQUU7WUFDdkUsTUFBTSxLQUFLLENBQUMsa0RBQWtELENBQUMsQ0FBQztTQUNqRTtRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsSUFBSSxDQUFDLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUMsRUFBRTtZQUNoRixNQUFNLEtBQUssQ0FBQyx1RUFBdUUsQ0FBQyxDQUFDO1NBQ3RGO0lBQ0gsQ0FBQztJQUVELFdBQVc7UUFDVCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDN0IsQ0FBQzs7eUdBOUVVLFlBQVksa0JBd0NELFlBQVksNkJBR3hCLGlCQUFpQjs2RkEzQ2hCLFlBQVk7MkZBQVosWUFBWTtrQkFKeEIsU0FBUzttQkFBQztvQkFDVCxRQUFRLEVBQUUsZ0JBQWdCO29CQUMxQixRQUFRLEVBQUUsY0FBYztpQkFDekI7OzBCQXlDSSxRQUFROzswQkFBSSxNQUFNOzJCQUFDLFlBQVk7OzBCQUMvQixRQUFROzswQkFDUixJQUFJOzswQkFDSixNQUFNOzJCQUFDLGlCQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0RpcmVjdGl2ZSwgSW5qZWN0LCBPbkRlc3Ryb3ksIE9uSW5pdCwgT3B0aW9uYWwsIFNlbGZ9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtDb250cm9sVmFsdWVBY2Nlc3NvciwgTkdfVkFMVUVfQUNDRVNTT1J9IGZyb20gJ0Bhbmd1bGFyL2Zvcm1zJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgb2YgYXMgb2JzZXJ2YWJsZU9mLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7c3dpdGNoTWFwLCB0YWtlVW50aWx9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtDZGtTZWxlY3Rpb259IGZyb20gJy4vc2VsZWN0aW9uJztcblxuLyoqXG4gKiBNYWtlcyB0aGUgZWxlbWVudCBhIHNlbGVjdC1hbGwgdG9nZ2xlLlxuICpcbiAqIE11c3QgYmUgdXNlZCB3aXRoaW4gYSBwYXJlbnQgYENka1NlbGVjdGlvbmAgZGlyZWN0aXZlLiBJdCB0b2dnbGVzIHRoZSBzZWxlY3Rpb24gc3RhdGVzXG4gKiBvZiBhbGwgdGhlIHNlbGVjdGlvbiB0b2dnbGVzIGNvbm5lY3RlZCB3aXRoIHRoZSBgQ2RrU2VsZWN0aW9uYCBkaXJlY3RpdmUuXG4gKiBJZiB0aGUgZWxlbWVudCBpbXBsZW1lbnRzIGBDb250cm9sVmFsdWVBY2Nlc3NvcmAsIGUuZy4gYE1hdENoZWNrYm94YCwgdGhlIGRpcmVjdGl2ZVxuICogYXV0b21hdGljYWxseSBjb25uZWN0cyBpdCB3aXRoIHRoZSBzZWxlY3QtYWxsIHN0YXRlIHByb3ZpZGVkIGJ5IHRoZSBgQ2RrU2VsZWN0aW9uYCBkaXJlY3RpdmUuIElmXG4gKiBub3QsIHVzZSBgY2hlY2tlZCRgIHRvIGdldCB0aGUgY2hlY2tlZCBzdGF0ZSwgYGluZGV0ZXJtaW5hdGUkYCB0byBnZXQgdGhlIGluZGV0ZXJtaW5hdGUgc3RhdGUsXG4gKiBhbmQgYHRvZ2dsZSgpYCB0byBjaGFuZ2UgdGhlIHNlbGVjdGlvbiBzdGF0ZS5cbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAnW2Nka1NlbGVjdEFsbF0nLFxuICBleHBvcnRBczogJ2Nka1NlbGVjdEFsbCcsXG59KVxuZXhwb3J0IGNsYXNzIENka1NlbGVjdEFsbDxUPiBpbXBsZW1lbnRzIE9uRGVzdHJveSwgT25Jbml0IHtcbiAgLyoqXG4gICAqIFRoZSBjaGVja2VkIHN0YXRlIG9mIHRoZSB0b2dnbGUuXG4gICAqIFJlc29sdmVzIHRvIGB0cnVlYCBpZiBhbGwgdGhlIHZhbHVlcyBhcmUgc2VsZWN0ZWQsIGBmYWxzZWAgaWYgbm8gdmFsdWUgaXMgc2VsZWN0ZWQuXG4gICAqL1xuICByZWFkb25seSBjaGVja2VkOiBPYnNlcnZhYmxlPGJvb2xlYW4+ID0gdGhpcy5fc2VsZWN0aW9uLmNoYW5nZS5waXBlKFxuICAgIHN3aXRjaE1hcCgoKSA9PiBvYnNlcnZhYmxlT2YodGhpcy5fc2VsZWN0aW9uLmlzQWxsU2VsZWN0ZWQoKSkpLFxuICApO1xuXG4gIC8qKlxuICAgKiBUaGUgaW5kZXRlcm1pbmF0ZSBzdGF0ZSBvZiB0aGUgdG9nZ2xlLlxuICAgKiBSZXNvbHZlcyB0byBgdHJ1ZWAgaWYgcGFydCAobm90IGFsbCkgb2YgdGhlIHZhbHVlcyBhcmUgc2VsZWN0ZWQsIGBmYWxzZWAgaWYgYWxsIHZhbHVlcyBvciBub1xuICAgKiB2YWx1ZSBhdCBhbGwgYXJlIHNlbGVjdGVkLlxuICAgKi9cbiAgcmVhZG9ubHkgaW5kZXRlcm1pbmF0ZTogT2JzZXJ2YWJsZTxib29sZWFuPiA9IHRoaXMuX3NlbGVjdGlvbi5jaGFuZ2UucGlwZShcbiAgICBzd2l0Y2hNYXAoKCkgPT4gb2JzZXJ2YWJsZU9mKHRoaXMuX3NlbGVjdGlvbi5pc1BhcnRpYWxTZWxlY3RlZCgpKSksXG4gICk7XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIHNlbGVjdC1hbGwgc3RhdGUuXG4gICAqIEBwYXJhbSBldmVudCBUaGUgY2xpY2sgZXZlbnQgaWYgdGhlIHRvZ2dsZSBpcyB0cmlnZ2VyZWQgYnkgYSAobW91c2Ugb3Iga2V5Ym9hcmQpIGNsaWNrLiBJZlxuICAgKiAgICAgdXNpbmcgd2l0aCBhIG5hdGl2ZSBgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiPmAsIHRoZSBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQgZm9yIHRoZVxuICAgKiAgICAgaW5kZXRlcm1pbmF0ZSBzdGF0ZSB0byB3b3JrIHByb3Blcmx5LlxuICAgKi9cbiAgdG9nZ2xlKGV2ZW50PzogTW91c2VFdmVudCkge1xuICAgIC8vIFRoaXMgaXMgbmVlZGVkIHdoZW4gYXBwbHlpbmcgdGhlIGRpcmVjdGl2ZSBvbiBhIG5hdGl2ZSA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCI+XG4gICAgLy8gY2hlY2tib3guIFRoZSBkZWZhdWx0IGJlaGF2aW9yIG5lZWRzIHRvIGJlIHByZXZlbnRlZCBpbiBvcmRlciB0byBzdXBwb3J0IHRoZSBpbmRldGVybWluYXRlXG4gICAgLy8gc3RhdGUuIFRoZSB0aW1lb3V0IGlzIGFsc28gbmVlZGVkIHNvIHRoZSBjaGVja2JveCBjYW4gc2hvdyB0aGUgbGF0ZXN0IHN0YXRlLlxuICAgIGlmIChldmVudCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuX3NlbGVjdGlvbi50b2dnbGVTZWxlY3RBbGwoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVhZG9ubHkgX2Rlc3Ryb3llZCA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgQE9wdGlvbmFsKCkgQEluamVjdChDZGtTZWxlY3Rpb24pIHByaXZhdGUgcmVhZG9ubHkgX3NlbGVjdGlvbjogQ2RrU2VsZWN0aW9uPFQ+LFxuICAgIEBPcHRpb25hbCgpXG4gICAgQFNlbGYoKVxuICAgIEBJbmplY3QoTkdfVkFMVUVfQUNDRVNTT1IpXG4gICAgcHJpdmF0ZSByZWFkb25seSBfY29udHJvbFZhbHVlQWNjZXNzb3I6IENvbnRyb2xWYWx1ZUFjY2Vzc29yW10sXG4gICkge31cblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLl9hc3NlcnRWYWxpZFBhcmVudFNlbGVjdGlvbigpO1xuICAgIHRoaXMuX2NvbmZpZ3VyZUNvbnRyb2xWYWx1ZUFjY2Vzc29yKCk7XG4gIH1cblxuICBwcml2YXRlIF9jb25maWd1cmVDb250cm9sVmFsdWVBY2Nlc3NvcigpIHtcbiAgICBpZiAodGhpcy5fY29udHJvbFZhbHVlQWNjZXNzb3IgJiYgdGhpcy5fY29udHJvbFZhbHVlQWNjZXNzb3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLl9jb250cm9sVmFsdWVBY2Nlc3NvclswXS5yZWdpc3Rlck9uQ2hhbmdlKChlOiB1bmtub3duKSA9PiB7XG4gICAgICAgIGlmIChlID09PSB0cnVlIHx8IGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgdGhpcy50b2dnbGUoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB0aGlzLmNoZWNrZWQucGlwZSh0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKSkuc3Vic2NyaWJlKHN0YXRlID0+IHtcbiAgICAgICAgdGhpcy5fY29udHJvbFZhbHVlQWNjZXNzb3JbMF0ud3JpdGVWYWx1ZShzdGF0ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9hc3NlcnRWYWxpZFBhcmVudFNlbGVjdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX3NlbGVjdGlvbiAmJiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ0Nka1NlbGVjdEFsbDogbWlzc2luZyBDZGtTZWxlY3Rpb24gaW4gdGhlIHBhcmVudCcpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fc2VsZWN0aW9uLm11bHRpcGxlICYmICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpKSB7XG4gICAgICB0aHJvdyBFcnJvcignQ2RrU2VsZWN0QWxsOiBDZGtTZWxlY3Rpb24gbXVzdCBoYXZlIGNka1NlbGVjdGlvbk11bHRpcGxlIHNldCB0byB0cnVlJyk7XG4gICAgfVxuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5fZGVzdHJveWVkLm5leHQoKTtcbiAgICB0aGlzLl9kZXN0cm95ZWQuY29tcGxldGUoKTtcbiAgfVxufVxuIl19