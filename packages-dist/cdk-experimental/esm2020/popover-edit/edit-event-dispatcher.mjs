/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable, NgZone } from '@angular/core';
import { combineLatest, Observable, pipe, Subject } from 'rxjs';
import { audit, auditTime, debounceTime, distinctUntilChanged, filter, map, skip, startWith, shareReplay, } from 'rxjs/operators';
import { CELL_SELECTOR, ROW_SELECTOR } from './constants';
import { closest } from './polyfill';
import * as i0 from "@angular/core";
/** The delay applied to mouse events before hiding or showing hover content. */
const MOUSE_EVENT_DELAY_MS = 40;
/** The delay for reacting to focus/blur changes. */
const FOCUS_DELAY = 0;
// Note: this class is generic, rather than referencing EditRef directly, in order to avoid
// circular imports. If we were to reference it here, importing the registry into the
// class that is registering itself will introduce a circular import.
/**
 * Service for sharing delegated events and state for triggering table edits.
 */
export class EditEventDispatcher {
    /** The EditRef for the currently active edit lens (if any). */
    get editRef() {
        return this._editRef;
    }
    constructor(_ngZone) {
        this._ngZone = _ngZone;
        /** A subject that indicates which table cell is currently editing (unless it is disabled). */
        this.editing = new Subject();
        /** A subject that indicates which table row is currently hovered. */
        this.hovering = new Subject();
        /** A subject that indicates which table row currently contains focus. */
        this.focused = new Subject();
        /** A subject that indicates all elements in the table matching ROW_SELECTOR. */
        this.allRows = new Subject();
        /** A subject that emits mouse move events from the table indicating the targeted row. */
        this.mouseMove = new Subject();
        // TODO: Use WeakSet once IE11 support is dropped.
        /**
         * Tracks the currently disabled editable cells - edit calls will be ignored
         * for these cells.
         */
        this.disabledCells = new WeakMap();
        this._editRef = null;
        // Optimization: Precompute common pipeable operators used per row/cell.
        this._distinctUntilChanged = distinctUntilChanged();
        this._startWithNull = startWith(null);
        this._distinctShare = pipe(this._distinctUntilChanged, shareReplay(1));
        this._startWithNullDistinct = pipe(this._startWithNull, this._distinctUntilChanged);
        this.editingAndEnabled = this.editing.pipe(filter(cell => cell == null || !this.disabledCells.has(cell)), shareReplay(1));
        /** An observable that emits the row containing focus or an active edit. */
        this.editingOrFocused = combineLatest([
            this.editingAndEnabled.pipe(map(cell => closest(cell, ROW_SELECTOR)), this._startWithNull),
            this.focused.pipe(this._startWithNull),
        ]).pipe(map(([editingRow, focusedRow]) => focusedRow || editingRow), this._distinctUntilChanged, auditTime(FOCUS_DELAY), // Use audit to skip over blur events to the next focused element.
        this._distinctUntilChanged, shareReplay(1));
        /** Tracks rows that contain hover content with a reference count. */
        this._rowsWithHoverContent = new WeakMap();
        /** The table cell that has an active edit lens (or null). */
        this._currentlyEditing = null;
        /** The combined set of row hover content states organized by row. */
        this._hoveredContentStateDistinct = combineLatest([
            this._getFirstRowWithHoverContent(),
            this._getLastRowWithHoverContent(),
            this.editingOrFocused,
            this.hovering.pipe(distinctUntilChanged(), audit(row => this.mouseMove.pipe(filter(mouseMoveRow => row === mouseMoveRow), this._startWithNull, debounceTime(MOUSE_EVENT_DELAY_MS))), this._startWithNullDistinct),
        ]).pipe(skip(1), // Skip the initial emission of [null, null, null, null].
        map(computeHoverContentState), distinctUntilChanged(areMapEntriesEqual), 
        // Optimization: Enter the zone before shareReplay so that we trigger a single
        // ApplicationRef.tick for all row updates.
        this._enterZone(), shareReplay(1));
        this._editingAndEnabledDistinct = this.editingAndEnabled.pipe(distinctUntilChanged(), this._enterZone(), shareReplay(1));
        // Optimization: Share row events observable with subsequent callers.
        // At startup, calls will be sequential by row.
        this._lastSeenRow = null;
        this._lastSeenRowHoverOrFocus = null;
        this._editingAndEnabledDistinct.subscribe(cell => {
            this._currentlyEditing = cell;
        });
    }
    /**
     * Gets an Observable that emits true when the specified element's cell
     * is editing and false when not.
     */
    editingCell(element) {
        let cell = null;
        return this._editingAndEnabledDistinct.pipe(map(editCell => editCell === (cell || (cell = closest(element, CELL_SELECTOR)))), this._distinctUntilChanged);
    }
    /**
     * Stops editing for the specified cell. If the specified cell is not the current
     * edit cell, does nothing.
     */
    doneEditingCell(element) {
        const cell = closest(element, CELL_SELECTOR);
        if (this._currentlyEditing === cell) {
            this.editing.next(null);
        }
    }
    /** Sets the currently active EditRef. */
    setActiveEditRef(ref) {
        this._editRef = ref;
    }
    /** Unset the currently active EditRef, if the specified editRef is active. */
    unsetActiveEditRef(ref) {
        if (this._editRef !== ref) {
            return;
        }
        this._editRef = null;
    }
    /** Adds the specified table row to be tracked for first/last row comparisons. */
    registerRowWithHoverContent(row) {
        this._rowsWithHoverContent.set(row, (this._rowsWithHoverContent.get(row) || 0) + 1);
    }
    /**
     * Reference decrements and ultimately removes the specified table row from first/last row
     * comparisons.
     */
    deregisterRowWithHoverContent(row) {
        const refCount = this._rowsWithHoverContent.get(row) || 0;
        if (refCount <= 1) {
            this._rowsWithHoverContent.delete(row);
        }
        else {
            this._rowsWithHoverContent.set(row, refCount - 1);
        }
    }
    /**
     * Gets an Observable that emits true when the specified element's row
     * contains the focused element or is being hovered over and false when not.
     * Hovering is defined as when the mouse has momentarily stopped moving over the cell.
     */
    hoverOrFocusOnRow(row) {
        if (row !== this._lastSeenRow) {
            this._lastSeenRow = row;
            this._lastSeenRowHoverOrFocus = this._hoveredContentStateDistinct.pipe(map(state => state.get(row) || 0 /* HoverContentState.OFF */), this._distinctShare);
        }
        return this._lastSeenRowHoverOrFocus;
    }
    /**
     * RxJS operator that enters the Angular zone, used to reduce boilerplate in
     * re-entering the zone for stream pipelines.
     */
    _enterZone() {
        return (source) => new Observable(observer => source.subscribe({
            next: value => this._ngZone.run(() => observer.next(value)),
            error: err => observer.error(err),
            complete: () => observer.complete(),
        }));
    }
    _getFirstRowWithHoverContent() {
        return this._mapAllRowsToSingleRow(rows => {
            for (let i = 0, row; (row = rows[i]); i++) {
                if (this._rowsWithHoverContent.has(row)) {
                    return row;
                }
            }
            return null;
        });
    }
    _getLastRowWithHoverContent() {
        return this._mapAllRowsToSingleRow(rows => {
            for (let i = rows.length - 1, row; (row = rows[i]); i--) {
                if (this._rowsWithHoverContent.has(row)) {
                    return row;
                }
            }
            return null;
        });
    }
    _mapAllRowsToSingleRow(mapper) {
        return this.allRows.pipe(map(mapper), this._startWithNullDistinct);
    }
}
EditEventDispatcher.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: EditEventDispatcher, deps: [{ token: i0.NgZone }], target: i0.ɵɵFactoryTarget.Injectable });
EditEventDispatcher.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: EditEventDispatcher });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: EditEventDispatcher, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i0.NgZone }]; } });
function computeHoverContentState([firstRow, lastRow, activeRow, hoverRow,]) {
    const hoverContentState = new Map();
    // Add focusable rows.
    for (const focussableRow of [
        firstRow,
        lastRow,
        activeRow && activeRow.previousElementSibling,
        activeRow && activeRow.nextElementSibling,
    ]) {
        if (focussableRow) {
            hoverContentState.set(focussableRow, 1 /* HoverContentState.FOCUSABLE */);
        }
    }
    // Add/overwrite with fully visible rows.
    for (const onRow of [activeRow, hoverRow]) {
        if (onRow) {
            hoverContentState.set(onRow, 2 /* HoverContentState.ON */);
        }
    }
    return hoverContentState;
}
function areMapEntriesEqual(a, b) {
    if (a.size !== b.size) {
        return false;
    }
    // TODO: use Map.prototype.entries once we're off IE11.
    for (const aKey of Array.from(a.keys())) {
        if (b.get(aKey) !== a.get(aKey)) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdC1ldmVudC1kaXNwYXRjaGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2Nkay1leHBlcmltZW50YWwvcG9wb3Zlci1lZGl0L2VkaXQtZXZlbnQtZGlzcGF0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNqRCxPQUFPLEVBQUMsYUFBYSxFQUE0QixVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUN4RixPQUFPLEVBQ0wsS0FBSyxFQUNMLFNBQVMsRUFDVCxZQUFZLEVBQ1osb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixHQUFHLEVBQ0gsSUFBSSxFQUNKLFNBQVMsRUFDVCxXQUFXLEdBQ1osTUFBTSxnQkFBZ0IsQ0FBQztBQUV4QixPQUFPLEVBQUMsYUFBYSxFQUFFLFlBQVksRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUN4RCxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDOztBQUVuQyxnRkFBZ0Y7QUFDaEYsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLENBQUM7QUFFaEMsb0RBQW9EO0FBQ3BELE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQztBQWN0QiwyRkFBMkY7QUFDM0YscUZBQXFGO0FBQ3JGLHFFQUFxRTtBQUVyRTs7R0FFRztBQUVILE1BQU0sT0FBTyxtQkFBbUI7SUF1QjlCLCtEQUErRDtJQUMvRCxJQUFJLE9BQU87UUFDVCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdkIsQ0FBQztJQWdGRCxZQUE2QixPQUFlO1FBQWYsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQXpHNUMsOEZBQThGO1FBQ3JGLFlBQU8sR0FBRyxJQUFJLE9BQU8sRUFBa0IsQ0FBQztRQUVqRCxxRUFBcUU7UUFDNUQsYUFBUSxHQUFHLElBQUksT0FBTyxF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O1FBQ3JCLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFFRCx1REFBdUQ7SUFDdkQsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1FBQ3ZDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQy9CLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7S0FDRjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0luamVjdGFibGUsIE5nWm9uZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge2NvbWJpbmVMYXRlc3QsIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbiwgT2JzZXJ2YWJsZSwgcGlwZSwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge1xuICBhdWRpdCxcbiAgYXVkaXRUaW1lLFxuICBkZWJvdW5jZVRpbWUsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBmaWx0ZXIsXG4gIG1hcCxcbiAgc2tpcCxcbiAgc3RhcnRXaXRoLFxuICBzaGFyZVJlcGxheSxcbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0NFTExfU0VMRUNUT1IsIFJPV19TRUxFQ1RPUn0gZnJvbSAnLi9jb25zdGFudHMnO1xuaW1wb3J0IHtjbG9zZXN0fSBmcm9tICcuL3BvbHlmaWxsJztcblxuLyoqIFRoZSBkZWxheSBhcHBsaWVkIHRvIG1vdXNlIGV2ZW50cyBiZWZvcmUgaGlkaW5nIG9yIHNob3dpbmcgaG92ZXIgY29udGVudC4gKi9cbmNvbnN0IE1PVVNFX0VWRU5UX0RFTEFZX01TID0gNDA7XG5cbi8qKiBUaGUgZGVsYXkgZm9yIHJlYWN0aW5nIHRvIGZvY3VzL2JsdXIgY2hhbmdlcy4gKi9cbmNvbnN0IEZPQ1VTX0RFTEFZID0gMDtcblxuLyoqXG4gKiBUaGUgcG9zc2libGUgc3RhdGVzIGZvciBob3ZlciBjb250ZW50OlxuICogT0ZGIC0gTm90IHJlbmRlcmVkLlxuICogRk9DVVNBQkxFIC0gUmVuZGVyZWQgaW4gdGhlIGRvbSBhbmQgc3R5bGVkIGZvciBpdHMgY29udGVudHMgdG8gYmUgZm9jdXNhYmxlIGJ1dCBpbnZpc2libGUuXG4gKiBPTiAtIFJlbmRlcmVkIGFuZCBmdWxseSB2aXNpYmxlLlxuICovXG5leHBvcnQgY29uc3QgZW51bSBIb3ZlckNvbnRlbnRTdGF0ZSB7XG4gIE9GRiA9IDAsXG4gIEZPQ1VTQUJMRSxcbiAgT04sXG59XG5cbi8vIE5vdGU6IHRoaXMgY2xhc3MgaXMgZ2VuZXJpYywgcmF0aGVyIHRoYW4gcmVmZXJlbmNpbmcgRWRpdFJlZiBkaXJlY3RseSwgaW4gb3JkZXIgdG8gYXZvaWRcbi8vIGNpcmN1bGFyIGltcG9ydHMuIElmIHdlIHdlcmUgdG8gcmVmZXJlbmNlIGl0IGhlcmUsIGltcG9ydGluZyB0aGUgcmVnaXN0cnkgaW50byB0aGVcbi8vIGNsYXNzIHRoYXQgaXMgcmVnaXN0ZXJpbmcgaXRzZWxmIHdpbGwgaW50cm9kdWNlIGEgY2lyY3VsYXIgaW1wb3J0LlxuXG4vKipcbiAqIFNlcnZpY2UgZm9yIHNoYXJpbmcgZGVsZWdhdGVkIGV2ZW50cyBhbmQgc3RhdGUgZm9yIHRyaWdnZXJpbmcgdGFibGUgZWRpdHMuXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBFZGl0RXZlbnREaXNwYXRjaGVyPFI+IHtcbiAgLyoqIEEgc3ViamVjdCB0aGF0IGluZGljYXRlcyB3aGljaCB0YWJsZSBjZWxsIGlzIGN1cnJlbnRseSBlZGl0aW5nICh1bmxlc3MgaXQgaXMgZGlzYWJsZWQpLiAqL1xuICByZWFkb25seSBlZGl0aW5nID0gbmV3IFN1YmplY3Q8RWxlbWVudCB8IG51bGw+KCk7XG5cbiAgLyoqIEEgc3ViamVjdCB0aGF0IGluZGljYXRlcyB3aGljaCB0YWJsZSByb3cgaXMgY3VycmVudGx5IGhvdmVyZWQuICovXG4gIHJlYWRvbmx5IGhvdmVyaW5nID0gbmV3IFN1YmplY3Q8RWxlbWVudCB8IG51bGw+KCk7XG5cbiAgLyoqIEEgc3ViamVjdCB0aGF0IGluZGljYXRlcyB3aGljaCB0YWJsZSByb3cgY3VycmVudGx5IGNvbnRhaW5zIGZvY3VzLiAqL1xuICByZWFkb25seSBmb2N1c2VkID0gbmV3IFN1YmplY3Q8RWxlbWVudCB8IG51bGw+KCk7XG5cbiAgLyoqIEEgc3ViamVjdCB0aGF0IGluZGljYXRlcyBhbGwgZWxlbWVudHMgaW4gdGhlIHRhYmxlIG1hdGNoaW5nIFJPV19TRUxFQ1RPUi4gKi9cbiAgcmVhZG9ubHkgYWxsUm93cyA9IG5ldyBTdWJqZWN0PE5vZGVMaXN0PigpO1xuXG4gIC8qKiBBIHN1YmplY3QgdGhhdCBlbWl0cyBtb3VzZSBtb3ZlIGV2ZW50cyBmcm9tIHRoZSB0YWJsZSBpbmRpY2F0aW5nIHRoZSB0YXJnZXRlZCByb3cuICovXG4gIHJlYWRvbmx5IG1vdXNlTW92ZSA9IG5ldyBTdWJqZWN0PEVsZW1lbnQgfCBudWxsPigpO1xuXG4gIC8vIFRPRE86IFVzZSBXZWFrU2V0IG9uY2UgSUUxMSBzdXBwb3J0IGlzIGRyb3BwZWQuXG4gIC8qKlxuICAgKiBUcmFja3MgdGhlIGN1cnJlbnRseSBkaXNhYmxlZCBlZGl0YWJsZSBjZWxscyAtIGVkaXQgY2FsbHMgd2lsbCBiZSBpZ25vcmVkXG4gICAqIGZvciB0aGVzZSBjZWxscy5cbiAgICovXG4gIHJlYWRvbmx5IGRpc2FibGVkQ2VsbHMgPSBuZXcgV2Vha01hcDxFbGVtZW50LCBib29sZWFuPigpO1xuXG4gIC8qKiBUaGUgRWRpdFJlZiBmb3IgdGhlIGN1cnJlbnRseSBhY3RpdmUgZWRpdCBsZW5zIChpZiBhbnkpLiAqL1xuICBnZXQgZWRpdFJlZigpOiBSIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuX2VkaXRSZWY7XG4gIH1cbiAgcHJpdmF0ZSBfZWRpdFJlZjogUiB8IG51bGwgPSBudWxsO1xuXG4gIC8vIE9wdGltaXphdGlvbjogUHJlY29tcHV0ZSBjb21tb24gcGlwZWFibGUgb3BlcmF0b3JzIHVzZWQgcGVyIHJvdy9jZWxsLlxuICBwcml2YXRlIHJlYWRvbmx5IF9kaXN0aW5jdFVudGlsQ2hhbmdlZCA9IGRpc3RpbmN0VW50aWxDaGFuZ2VkPFxuICAgIEVsZW1lbnQgfCBIb3ZlckNvbnRlbnRTdGF0ZSB8IGJvb2xlYW4gfCBudWxsXG4gID4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBfc3RhcnRXaXRoTnVsbCA9IHN0YXJ0V2l0aDxFbGVtZW50IHwgbnVsbD4obnVsbCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2Rpc3RpbmN0U2hhcmUgPSBwaXBlKFxuICAgIHRoaXMuX2Rpc3RpbmN0VW50aWxDaGFuZ2VkIGFzIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxIb3ZlckNvbnRlbnRTdGF0ZT4sXG4gICAgc2hhcmVSZXBsYXkoMSksXG4gICk7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3N0YXJ0V2l0aE51bGxEaXN0aW5jdCA9IHBpcGUoXG4gICAgdGhpcy5fc3RhcnRXaXRoTnVsbCxcbiAgICB0aGlzLl9kaXN0aW5jdFVudGlsQ2hhbmdlZCBhcyBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248RWxlbWVudCB8IG51bGw+LFxuICApO1xuXG4gIHJlYWRvbmx5IGVkaXRpbmdBbmRFbmFibGVkID0gdGhpcy5lZGl0aW5nLnBpcGUoXG4gICAgZmlsdGVyKGNlbGwgPT4gY2VsbCA9PSBudWxsIHx8ICF0aGlzLmRpc2FibGVkQ2VsbHMuaGFzKGNlbGwpKSxcbiAgICBzaGFyZVJlcGxheSgxKSxcbiAgKTtcblxuICAvKiogQW4gb2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSByb3cgY29udGFpbmluZyBmb2N1cyBvciBhbiBhY3RpdmUgZWRpdC4gKi9cbiAgcmVhZG9ubHkgZWRpdGluZ09yRm9jdXNlZCA9IGNvbWJpbmVMYXRlc3QoW1xuICAgIHRoaXMuZWRpdGluZ0FuZEVuYWJsZWQucGlwZShcbiAgICAgIG1hcChjZWxsID0+IGNsb3Nlc3QoY2VsbCwgUk9XX1NFTEVDVE9SKSksXG4gICAgICB0aGlzLl9zdGFydFdpdGhOdWxsLFxuICAgICksXG4gICAgdGhpcy5mb2N1c2VkLnBpcGUodGhpcy5fc3RhcnRXaXRoTnVsbCksXG4gIF0pLnBpcGUoXG4gICAgbWFwKChbZWRpdGluZ1JvdywgZm9jdXNlZFJvd10pID0+IGZvY3VzZWRSb3cgfHwgZWRpdGluZ1JvdyksXG4gICAgdGhpcy5fZGlzdGluY3RVbnRpbENoYW5nZWQgYXMgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPEVsZW1lbnQgfCBudWxsPixcbiAgICBhdWRpdFRpbWUoRk9DVVNfREVMQVkpLCAvLyBVc2UgYXVkaXQgdG8gc2tpcCBvdmVyIGJsdXIgZXZlbnRzIHRvIHRoZSBuZXh0IGZvY3VzZWQgZWxlbWVudC5cbiAgICB0aGlzLl9kaXN0aW5jdFVudGlsQ2hhbmdlZCBhcyBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248RWxlbWVudCB8IG51bGw+LFxuICAgIHNoYXJlUmVwbGF5KDEpLFxuICApO1xuXG4gIC8qKiBUcmFja3Mgcm93cyB0aGF0IGNvbnRhaW4gaG92ZXIgY29udGVudCB3aXRoIGEgcmVmZXJlbmNlIGNvdW50LiAqL1xuICBwcml2YXRlIF9yb3dzV2l0aEhvdmVyQ29udGVudCA9IG5ldyBXZWFrTWFwPEVsZW1lbnQsIG51bWJlcj4oKTtcblxuICAvKiogVGhlIHRhYmxlIGNlbGwgdGhhdCBoYXMgYW4gYWN0aXZlIGVkaXQgbGVucyAob3IgbnVsbCkuICovXG4gIHByaXZhdGUgX2N1cnJlbnRseUVkaXRpbmc6IEVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuICAvKiogVGhlIGNvbWJpbmVkIHNldCBvZiByb3cgaG92ZXIgY29udGVudCBzdGF0ZXMgb3JnYW5pemVkIGJ5IHJvdy4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSBfaG92ZXJlZENvbnRlbnRTdGF0ZURpc3RpbmN0ID0gY29tYmluZUxhdGVzdChbXG4gICAgdGhpcy5fZ2V0Rmlyc3RSb3dXaXRoSG92ZXJDb250ZW50KCksXG4gICAgdGhpcy5fZ2V0TGFzdFJvd1dpdGhIb3ZlckNvbnRlbnQoKSxcbiAgICB0aGlzLmVkaXRpbmdPckZvY3VzZWQsXG4gICAgdGhpcy5ob3ZlcmluZy5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIGF1ZGl0KHJvdyA9PlxuICAgICAgICB0aGlzLm1vdXNlTW92ZS5waXBlKFxuICAgICAgICAgIGZpbHRlcihtb3VzZU1vdmVSb3cgPT4gcm93ID09PSBtb3VzZU1vdmVSb3cpLFxuICAgICAgICAgIHRoaXMuX3N0YXJ0V2l0aE51bGwsXG4gICAgICAgICAgZGVib3VuY2VUaW1lKE1PVVNFX0VWRU5UX0RFTEFZX01TKSxcbiAgICAgICAgKSxcbiAgICAgICksXG4gICAgICB0aGlzLl9zdGFydFdpdGhOdWxsRGlzdGluY3QsXG4gICAgKSxcbiAgXSkucGlwZShcbiAgICBza2lwKDEpLCAvLyBTa2lwIHRoZSBpbml0aWFsIGVtaXNzaW9uIG9mIFtudWxsLCBudWxsLCBudWxsLCBudWxsXS5cbiAgICBtYXAoY29tcHV0ZUhvdmVyQ29udGVudFN0YXRlKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZChhcmVNYXBFbnRyaWVzRXF1YWwpLFxuICAgIC8vIE9wdGltaXphdGlvbjogRW50ZXIgdGhlIHpvbmUgYmVmb3JlIHNoYXJlUmVwbGF5IHNvIHRoYXQgd2UgdHJpZ2dlciBhIHNpbmdsZVxuICAgIC8vIEFwcGxpY2F0aW9uUmVmLnRpY2sgZm9yIGFsbCByb3cgdXBkYXRlcy5cbiAgICB0aGlzLl9lbnRlclpvbmUoKSxcbiAgICBzaGFyZVJlcGxheSgxKSxcbiAgKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IF9lZGl0aW5nQW5kRW5hYmxlZERpc3RpbmN0ID0gdGhpcy5lZGl0aW5nQW5kRW5hYmxlZC5waXBlKFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgdGhpcy5fZW50ZXJab25lKCksXG4gICAgc2hhcmVSZXBsYXkoMSksXG4gICk7XG5cbiAgLy8gT3B0aW1pemF0aW9uOiBTaGFyZSByb3cgZXZlbnRzIG9ic2VydmFibGUgd2l0aCBzdWJzZXF1ZW50IGNhbGxlcnMuXG4gIC8vIEF0IHN0YXJ0dXAsIGNhbGxzIHdpbGwgYmUgc2VxdWVudGlhbCBieSByb3cuXG4gIHByaXZhdGUgX2xhc3RTZWVuUm93OiBFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgX2xhc3RTZWVuUm93SG92ZXJPckZvY3VzOiBPYnNlcnZhYmxlPEhvdmVyQ29udGVudFN0YXRlPiB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgX25nWm9uZTogTmdab25lKSB7XG4gICAgdGhpcy5fZWRpdGluZ0FuZEVuYWJsZWREaXN0aW5jdC5zdWJzY3JpYmUoY2VsbCA9PiB7XG4gICAgICB0aGlzLl9jdXJyZW50bHlFZGl0aW5nID0gY2VsbDtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyB0cnVlIHdoZW4gdGhlIHNwZWNpZmllZCBlbGVtZW50J3MgY2VsbFxuICAgKiBpcyBlZGl0aW5nIGFuZCBmYWxzZSB3aGVuIG5vdC5cbiAgICovXG4gIGVkaXRpbmdDZWxsKGVsZW1lbnQ6IEVsZW1lbnQgfCBFdmVudFRhcmdldCk6IE9ic2VydmFibGU8Ym9vbGVhbj4ge1xuICAgIGxldCBjZWxsOiBFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgICByZXR1cm4gdGhpcy5fZWRpdGluZ0FuZEVuYWJsZWREaXN0aW5jdC5waXBlKFxuICAgICAgbWFwKGVkaXRDZWxsID0+IGVkaXRDZWxsID09PSAoY2VsbCB8fCAoY2VsbCA9IGNsb3Nlc3QoZWxlbWVudCwgQ0VMTF9TRUxFQ1RPUikpKSksXG4gICAgICB0aGlzLl9kaXN0aW5jdFVudGlsQ2hhbmdlZCBhcyBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248Ym9vbGVhbj4sXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9wcyBlZGl0aW5nIGZvciB0aGUgc3BlY2lmaWVkIGNlbGwuIElmIHRoZSBzcGVjaWZpZWQgY2VsbCBpcyBub3QgdGhlIGN1cnJlbnRcbiAgICogZWRpdCBjZWxsLCBkb2VzIG5vdGhpbmcuXG4gICAqL1xuICBkb25lRWRpdGluZ0NlbGwoZWxlbWVudDogRWxlbWVudCB8IEV2ZW50VGFyZ2V0KTogdm9pZCB7XG4gICAgY29uc3QgY2VsbCA9IGNsb3Nlc3QoZWxlbWVudCwgQ0VMTF9TRUxFQ1RPUik7XG5cbiAgICBpZiAodGhpcy5fY3VycmVudGx5RWRpdGluZyA9PT0gY2VsbCkge1xuICAgICAgdGhpcy5lZGl0aW5nLm5leHQobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNldHMgdGhlIGN1cnJlbnRseSBhY3RpdmUgRWRpdFJlZi4gKi9cbiAgc2V0QWN0aXZlRWRpdFJlZihyZWY6IFIpIHtcbiAgICB0aGlzLl9lZGl0UmVmID0gcmVmO1xuICB9XG5cbiAgLyoqIFVuc2V0IHRoZSBjdXJyZW50bHkgYWN0aXZlIEVkaXRSZWYsIGlmIHRoZSBzcGVjaWZpZWQgZWRpdFJlZiBpcyBhY3RpdmUuICovXG4gIHVuc2V0QWN0aXZlRWRpdFJlZihyZWY6IFIpIHtcbiAgICBpZiAodGhpcy5fZWRpdFJlZiAhPT0gcmVmKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fZWRpdFJlZiA9IG51bGw7XG4gIH1cblxuICAvKiogQWRkcyB0aGUgc3BlY2lmaWVkIHRhYmxlIHJvdyB0byBiZSB0cmFja2VkIGZvciBmaXJzdC9sYXN0IHJvdyBjb21wYXJpc29ucy4gKi9cbiAgcmVnaXN0ZXJSb3dXaXRoSG92ZXJDb250ZW50KHJvdzogRWxlbWVudCk6IHZvaWQge1xuICAgIHRoaXMuX3Jvd3NXaXRoSG92ZXJDb250ZW50LnNldChyb3csICh0aGlzLl9yb3dzV2l0aEhvdmVyQ29udGVudC5nZXQocm93KSB8fCAwKSArIDEpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmVyZW5jZSBkZWNyZW1lbnRzIGFuZCB1bHRpbWF0ZWx5IHJlbW92ZXMgdGhlIHNwZWNpZmllZCB0YWJsZSByb3cgZnJvbSBmaXJzdC9sYXN0IHJvd1xuICAgKiBjb21wYXJpc29ucy5cbiAgICovXG4gIGRlcmVnaXN0ZXJSb3dXaXRoSG92ZXJDb250ZW50KHJvdzogRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IHJlZkNvdW50ID0gdGhpcy5fcm93c1dpdGhIb3ZlckNvbnRlbnQuZ2V0KHJvdykgfHwgMDtcblxuICAgIGlmIChyZWZDb3VudCA8PSAxKSB7XG4gICAgICB0aGlzLl9yb3dzV2l0aEhvdmVyQ29udGVudC5kZWxldGUocm93KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcm93c1dpdGhIb3ZlckNvbnRlbnQuc2V0KHJvdywgcmVmQ291bnQgLSAxKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhbiBPYnNlcnZhYmxlIHRoYXQgZW1pdHMgdHJ1ZSB3aGVuIHRoZSBzcGVjaWZpZWQgZWxlbWVudCdzIHJvd1xuICAgKiBjb250YWlucyB0aGUgZm9jdXNlZCBlbGVtZW50IG9yIGlzIGJlaW5nIGhvdmVyZWQgb3ZlciBhbmQgZmFsc2Ugd2hlbiBub3QuXG4gICAqIEhvdmVyaW5nIGlzIGRlZmluZWQgYXMgd2hlbiB0aGUgbW91c2UgaGFzIG1vbWVudGFyaWx5IHN0b3BwZWQgbW92aW5nIG92ZXIgdGhlIGNlbGwuXG4gICAqL1xuICBob3Zlck9yRm9jdXNPblJvdyhyb3c6IEVsZW1lbnQpOiBPYnNlcnZhYmxlPEhvdmVyQ29udGVudFN0YXRlPiB7XG4gICAgaWYgKHJvdyAhPT0gdGhpcy5fbGFzdFNlZW5Sb3cpIHtcbiAgICAgIHRoaXMuX2xhc3RTZWVuUm93ID0gcm93O1xuICAgICAgdGhpcy5fbGFzdFNlZW5Sb3dIb3Zlck9yRm9jdXMgPSB0aGlzLl9ob3ZlcmVkQ29udGVudFN0YXRlRGlzdGluY3QucGlwZShcbiAgICAgICAgbWFwKHN0YXRlID0+IHN0YXRlLmdldChyb3cpIHx8IEhvdmVyQ29udGVudFN0YXRlLk9GRiksXG4gICAgICAgIHRoaXMuX2Rpc3RpbmN0U2hhcmUsXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9sYXN0U2VlblJvd0hvdmVyT3JGb2N1cyE7XG4gIH1cblxuICAvKipcbiAgICogUnhKUyBvcGVyYXRvciB0aGF0IGVudGVycyB0aGUgQW5ndWxhciB6b25lLCB1c2VkIHRvIHJlZHVjZSBib2lsZXJwbGF0ZSBpblxuICAgKiByZS1lbnRlcmluZyB0aGUgem9uZSBmb3Igc3RyZWFtIHBpcGVsaW5lcy5cbiAgICovXG4gIHByaXZhdGUgX2VudGVyWm9uZTxUPigpOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248VD4ge1xuICAgIHJldHVybiAoc291cmNlOiBPYnNlcnZhYmxlPFQ+KSA9PlxuICAgICAgbmV3IE9ic2VydmFibGU8VD4ob2JzZXJ2ZXIgPT5cbiAgICAgICAgc291cmNlLnN1YnNjcmliZSh7XG4gICAgICAgICAgbmV4dDogdmFsdWUgPT4gdGhpcy5fbmdab25lLnJ1bigoKSA9PiBvYnNlcnZlci5uZXh0KHZhbHVlKSksXG4gICAgICAgICAgZXJyb3I6IGVyciA9PiBvYnNlcnZlci5lcnJvcihlcnIpLFxuICAgICAgICAgIGNvbXBsZXRlOiAoKSA9PiBvYnNlcnZlci5jb21wbGV0ZSgpLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gIH1cblxuICBwcml2YXRlIF9nZXRGaXJzdFJvd1dpdGhIb3ZlckNvbnRlbnQoKTogT2JzZXJ2YWJsZTxFbGVtZW50IHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLl9tYXBBbGxSb3dzVG9TaW5nbGVSb3cocm93cyA9PiB7XG4gICAgICBmb3IgKGxldCBpID0gMCwgcm93OyAocm93ID0gcm93c1tpXSk7IGkrKykge1xuICAgICAgICBpZiAodGhpcy5fcm93c1dpdGhIb3ZlckNvbnRlbnQuaGFzKHJvdyBhcyBFbGVtZW50KSkge1xuICAgICAgICAgIHJldHVybiByb3cgYXMgRWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9nZXRMYXN0Um93V2l0aEhvdmVyQ29udGVudCgpOiBPYnNlcnZhYmxlPEVsZW1lbnQgfCBudWxsPiB7XG4gICAgcmV0dXJuIHRoaXMuX21hcEFsbFJvd3NUb1NpbmdsZVJvdyhyb3dzID0+IHtcbiAgICAgIGZvciAobGV0IGkgPSByb3dzLmxlbmd0aCAtIDEsIHJvdzsgKHJvdyA9IHJvd3NbaV0pOyBpLS0pIHtcbiAgICAgICAgaWYgKHRoaXMuX3Jvd3NXaXRoSG92ZXJDb250ZW50Lmhhcyhyb3cgYXMgRWxlbWVudCkpIHtcbiAgICAgICAgICByZXR1cm4gcm93IGFzIEVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfbWFwQWxsUm93c1RvU2luZ2xlUm93KFxuICAgIG1hcHBlcjogKHJvd3M6IE5vZGVMaXN0KSA9PiBFbGVtZW50IHwgbnVsbCxcbiAgKTogT2JzZXJ2YWJsZTxFbGVtZW50IHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLmFsbFJvd3MucGlwZShtYXAobWFwcGVyKSwgdGhpcy5fc3RhcnRXaXRoTnVsbERpc3RpbmN0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb21wdXRlSG92ZXJDb250ZW50U3RhdGUoW1xuICBmaXJzdFJvdyxcbiAgbGFzdFJvdyxcbiAgYWN0aXZlUm93LFxuICBob3ZlclJvdyxcbl06IChFbGVtZW50IHwgbnVsbClbXSk6IE1hcDxFbGVtZW50LCBIb3ZlckNvbnRlbnRTdGF0ZT4ge1xuICBjb25zdCBob3ZlckNvbnRlbnRTdGF0ZSA9IG5ldyBNYXA8RWxlbWVudCwgSG92ZXJDb250ZW50U3RhdGU+KCk7XG5cbiAgLy8gQWRkIGZvY3VzYWJsZSByb3dzLlxuICBmb3IgKGNvbnN0IGZvY3Vzc2FibGVSb3cgb2YgW1xuICAgIGZpcnN0Um93LFxuICAgIGxhc3RSb3csXG4gICAgYWN0aXZlUm93ICYmIGFjdGl2ZVJvdy5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLFxuICAgIGFjdGl2ZVJvdyAmJiBhY3RpdmVSb3cubmV4dEVsZW1lbnRTaWJsaW5nLFxuICBdKSB7XG4gICAgaWYgKGZvY3Vzc2FibGVSb3cpIHtcbiAgICAgIGhvdmVyQ29udGVudFN0YXRlLnNldChmb2N1c3NhYmxlUm93IGFzIEVsZW1lbnQsIEhvdmVyQ29udGVudFN0YXRlLkZPQ1VTQUJMRSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQWRkL292ZXJ3cml0ZSB3aXRoIGZ1bGx5IHZpc2libGUgcm93cy5cbiAgZm9yIChjb25zdCBvblJvdyBvZiBbYWN0aXZlUm93LCBob3ZlclJvd10pIHtcbiAgICBpZiAob25Sb3cpIHtcbiAgICAgIGhvdmVyQ29udGVudFN0YXRlLnNldChvblJvdywgSG92ZXJDb250ZW50U3RhdGUuT04pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBob3ZlckNvbnRlbnRTdGF0ZTtcbn1cblxuZnVuY3Rpb24gYXJlTWFwRW50cmllc0VxdWFsPEssIFY+KGE6IE1hcDxLLCBWPiwgYjogTWFwPEssIFY+KTogYm9vbGVhbiB7XG4gIGlmIChhLnNpemUgIT09IGIuc2l6ZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFRPRE86IHVzZSBNYXAucHJvdG90eXBlLmVudHJpZXMgb25jZSB3ZSdyZSBvZmYgSUUxMS5cbiAgZm9yIChjb25zdCBhS2V5IG9mIEFycmF5LmZyb20oYS5rZXlzKCkpKSB7XG4gICAgaWYgKGIuZ2V0KGFLZXkpICE9PSBhLmdldChhS2V5KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuIl19