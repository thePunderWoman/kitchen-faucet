/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable, Self, NgZone } from '@angular/core';
import { ControlContainer } from '@angular/forms';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { EditEventDispatcher } from './edit-event-dispatcher';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
import * as i2 from "./edit-event-dispatcher";
/**
 * Used for communication between the form within the edit lens and the
 * table that launched it. Provided by CdkEditControl within the lens.
 */
export class EditRef {
    constructor(_form, _editEventDispatcher, _ngZone) {
        this._form = _form;
        this._editEventDispatcher = _editEventDispatcher;
        this._ngZone = _ngZone;
        /** Emits the final value of this edit instance before closing. */
        this._finalValueSubject = new Subject();
        this.finalValue = this._finalValueSubject;
        /** Emits when the user tabs out of this edit lens before closing. */
        this._blurredSubject = new Subject();
        this.blurred = this._blurredSubject;
        this._editEventDispatcher.setActiveEditRef(this);
    }
    /**
     * Called by the host directive's OnInit hook. Reads the initial state of the
     * form and overrides it with persisted state from previous openings, if
     * applicable.
     */
    init(previousFormValue) {
        // Wait for the zone to stabilize before caching the initial value.
        // This ensures that all form controls have been initialized.
        this._ngZone.onStable.pipe(take(1)).subscribe(() => {
            this.updateRevertValue();
            if (previousFormValue) {
                this.reset(previousFormValue);
            }
        });
    }
    ngOnDestroy() {
        this._editEventDispatcher.unsetActiveEditRef(this);
        this._finalValueSubject.next(this._form.value);
        this._finalValueSubject.complete();
    }
    /** Whether the attached form is in a valid state. */
    isValid() {
        return this._form.valid;
    }
    /** Set the form's current value as what it will be set to on revert/reset. */
    updateRevertValue() {
        this._revertFormValue = this._form.value;
    }
    /** Tells the table to close the edit popup. */
    close() {
        this._editEventDispatcher.editing.next(null);
    }
    /** Notifies the active edit that the user has moved focus out of the lens. */
    blur() {
        this._blurredSubject.next();
    }
    /**
     * Resets the form value to the specified value or the previously set
     * revert value.
     */
    reset(value) {
        this._form.reset(value || this._revertFormValue);
    }
}
EditRef.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: EditRef, deps: [{ token: i1.ControlContainer, self: true }, { token: i2.EditEventDispatcher }, { token: i0.NgZone }], target: i0.ɵɵFactoryTarget.Injectable });
EditRef.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: EditRef });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: EditRef, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i1.ControlContainer, decorators: [{
                    type: Self
                }] }, { type: i2.EditEventDispatcher }, { type: i0.NgZone }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdC1yZWYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvY2RrLWV4cGVyaW1lbnRhbC9wb3BvdmVyLWVkaXQvZWRpdC1yZWYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFVBQVUsRUFBYSxJQUFJLEVBQUUsTUFBTSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ2xFLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2hELE9BQU8sRUFBYSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDekMsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXBDLE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLHlCQUF5QixDQUFDOzs7O0FBRTVEOzs7R0FHRztBQUVILE1BQU0sT0FBTyxPQUFPO0lBWWxCLFlBQzJCLEtBQXVCLEVBQy9CLG9CQUE2RCxFQUM3RCxPQUFlO1FBRlAsVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFDL0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF5QztRQUM3RCxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBZGxDLGtFQUFrRTtRQUNqRCx1QkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBYSxDQUFDO1FBQ3RELGVBQVUsR0FBMEIsSUFBSSxDQUFDLGtCQUFrQixDQUFDO1FBRXJFLHFFQUFxRTtRQUNwRCxvQkFBZSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDOUMsWUFBTyxHQUFxQixJQUFJLENBQUMsZUFBZSxDQUFDO1FBVXhELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILElBQUksQ0FBQyxpQkFBd0M7UUFDM0MsbUVBQW1FO1FBQ25FLDZEQUE2RDtRQUM3RCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtZQUNqRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN6QixJQUFJLGlCQUFpQixFQUFFO2dCQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7YUFDL0I7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUVELHFEQUFxRDtJQUNyRCxPQUFPO1FBQ0wsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztJQUMxQixDQUFDO0lBRUQsOEVBQThFO0lBQzlFLGlCQUFpQjtRQUNmLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztJQUMzQyxDQUFDO0lBRUQsK0NBQStDO0lBQy9DLEtBQUs7UUFDSCxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsOEVBQThFO0lBQzlFLElBQUk7UUFDRixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsS0FBaUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ25ELENBQUM7O29HQXBFVSxPQUFPO3dHQUFQLE9BQU87MkZBQVAsT0FBTztrQkFEbkIsVUFBVTs7MEJBY04sSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0luamVjdGFibGUsIE9uRGVzdHJveSwgU2VsZiwgTmdab25lfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q29udHJvbENvbnRhaW5lcn0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7dGFrZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0VkaXRFdmVudERpc3BhdGNoZXJ9IGZyb20gJy4vZWRpdC1ldmVudC1kaXNwYXRjaGVyJztcblxuLyoqXG4gKiBVc2VkIGZvciBjb21tdW5pY2F0aW9uIGJldHdlZW4gdGhlIGZvcm0gd2l0aGluIHRoZSBlZGl0IGxlbnMgYW5kIHRoZVxuICogdGFibGUgdGhhdCBsYXVuY2hlZCBpdC4gUHJvdmlkZWQgYnkgQ2RrRWRpdENvbnRyb2wgd2l0aGluIHRoZSBsZW5zLlxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgRWRpdFJlZjxGb3JtVmFsdWU+IGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLyoqIEVtaXRzIHRoZSBmaW5hbCB2YWx1ZSBvZiB0aGlzIGVkaXQgaW5zdGFuY2UgYmVmb3JlIGNsb3NpbmcuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgX2ZpbmFsVmFsdWVTdWJqZWN0ID0gbmV3IFN1YmplY3Q8Rm9ybVZhbHVlPigpO1xuICByZWFkb25seSBmaW5hbFZhbHVlOiBPYnNlcnZhYmxlPEZvcm1WYWx1ZT4gPSB0aGlzLl9maW5hbFZhbHVlU3ViamVjdDtcblxuICAvKiogRW1pdHMgd2hlbiB0aGUgdXNlciB0YWJzIG91dCBvZiB0aGlzIGVkaXQgbGVucyBiZWZvcmUgY2xvc2luZy4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSBfYmx1cnJlZFN1YmplY3QgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuICByZWFkb25seSBibHVycmVkOiBPYnNlcnZhYmxlPHZvaWQ+ID0gdGhpcy5fYmx1cnJlZFN1YmplY3Q7XG5cbiAgLyoqIFRoZSB2YWx1ZSB0byBzZXQgdGhlIGZvcm0gYmFjayB0byBvbiByZXZlcnQuICovXG4gIHByaXZhdGUgX3JldmVydEZvcm1WYWx1ZTogRm9ybVZhbHVlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIEBTZWxmKCkgcHJpdmF0ZSByZWFkb25seSBfZm9ybTogQ29udHJvbENvbnRhaW5lcixcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9lZGl0RXZlbnREaXNwYXRjaGVyOiBFZGl0RXZlbnREaXNwYXRjaGVyPEVkaXRSZWY8Rm9ybVZhbHVlPj4sXG4gICAgcHJpdmF0ZSByZWFkb25seSBfbmdab25lOiBOZ1pvbmUsXG4gICkge1xuICAgIHRoaXMuX2VkaXRFdmVudERpc3BhdGNoZXIuc2V0QWN0aXZlRWRpdFJlZih0aGlzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgYnkgdGhlIGhvc3QgZGlyZWN0aXZlJ3MgT25Jbml0IGhvb2suIFJlYWRzIHRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZVxuICAgKiBmb3JtIGFuZCBvdmVycmlkZXMgaXQgd2l0aCBwZXJzaXN0ZWQgc3RhdGUgZnJvbSBwcmV2aW91cyBvcGVuaW5ncywgaWZcbiAgICogYXBwbGljYWJsZS5cbiAgICovXG4gIGluaXQocHJldmlvdXNGb3JtVmFsdWU6IEZvcm1WYWx1ZSB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgIC8vIFdhaXQgZm9yIHRoZSB6b25lIHRvIHN0YWJpbGl6ZSBiZWZvcmUgY2FjaGluZyB0aGUgaW5pdGlhbCB2YWx1ZS5cbiAgICAvLyBUaGlzIGVuc3VyZXMgdGhhdCBhbGwgZm9ybSBjb250cm9scyBoYXZlIGJlZW4gaW5pdGlhbGl6ZWQuXG4gICAgdGhpcy5fbmdab25lLm9uU3RhYmxlLnBpcGUodGFrZSgxKSkuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgIHRoaXMudXBkYXRlUmV2ZXJ0VmFsdWUoKTtcbiAgICAgIGlmIChwcmV2aW91c0Zvcm1WYWx1ZSkge1xuICAgICAgICB0aGlzLnJlc2V0KHByZXZpb3VzRm9ybVZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuX2VkaXRFdmVudERpc3BhdGNoZXIudW5zZXRBY3RpdmVFZGl0UmVmKHRoaXMpO1xuICAgIHRoaXMuX2ZpbmFsVmFsdWVTdWJqZWN0Lm5leHQodGhpcy5fZm9ybS52YWx1ZSk7XG4gICAgdGhpcy5fZmluYWxWYWx1ZVN1YmplY3QuY29tcGxldGUoKTtcbiAgfVxuXG4gIC8qKiBXaGV0aGVyIHRoZSBhdHRhY2hlZCBmb3JtIGlzIGluIGEgdmFsaWQgc3RhdGUuICovXG4gIGlzVmFsaWQoKTogYm9vbGVhbiB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLl9mb3JtLnZhbGlkO1xuICB9XG5cbiAgLyoqIFNldCB0aGUgZm9ybSdzIGN1cnJlbnQgdmFsdWUgYXMgd2hhdCBpdCB3aWxsIGJlIHNldCB0byBvbiByZXZlcnQvcmVzZXQuICovXG4gIHVwZGF0ZVJldmVydFZhbHVlKCk6IHZvaWQge1xuICAgIHRoaXMuX3JldmVydEZvcm1WYWx1ZSA9IHRoaXMuX2Zvcm0udmFsdWU7XG4gIH1cblxuICAvKiogVGVsbHMgdGhlIHRhYmxlIHRvIGNsb3NlIHRoZSBlZGl0IHBvcHVwLiAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9lZGl0RXZlbnREaXNwYXRjaGVyLmVkaXRpbmcubmV4dChudWxsKTtcbiAgfVxuXG4gIC8qKiBOb3RpZmllcyB0aGUgYWN0aXZlIGVkaXQgdGhhdCB0aGUgdXNlciBoYXMgbW92ZWQgZm9jdXMgb3V0IG9mIHRoZSBsZW5zLiAqL1xuICBibHVyKCk6IHZvaWQge1xuICAgIHRoaXMuX2JsdXJyZWRTdWJqZWN0Lm5leHQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgdGhlIGZvcm0gdmFsdWUgdG8gdGhlIHNwZWNpZmllZCB2YWx1ZSBvciB0aGUgcHJldmlvdXNseSBzZXRcbiAgICogcmV2ZXJ0IHZhbHVlLlxuICAgKi9cbiAgcmVzZXQodmFsdWU/OiBGb3JtVmFsdWUpOiB2b2lkIHtcbiAgICB0aGlzLl9mb3JtLnJlc2V0KHZhbHVlIHx8IHRoaXMuX3JldmVydEZvcm1WYWx1ZSk7XG4gIH1cbn1cbiJdfQ==