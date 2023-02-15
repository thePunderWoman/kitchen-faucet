/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable, NgZone } from '@angular/core';
import { combineLatest, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, share, skip, startWith } from 'rxjs/operators';
import { _closest } from '@angular/cdk-experimental/popover-edit';
import { HEADER_ROW_SELECTOR } from './selectors';
import * as i0 from "@angular/core";
/** Coordinates events between the column resize directives. */
export class HeaderRowEventDispatcher {
    constructor(_ngZone) {
        this._ngZone = _ngZone;
        /**
         * Emits the currently hovered header cell or null when no header cells are hovered.
         * Exposed publicly for events to feed in, but subscribers should use headerCellHoveredDistinct,
         * defined below.
         */
        this.headerCellHovered = new Subject();
        /**
         * Emits the header cell for which a user-triggered resize is active or null
         * when no resize is in progress.
         */
        this.overlayHandleActiveForCell = new Subject();
        /** Distinct and shared version of headerCellHovered. */
        this.headerCellHoveredDistinct = this.headerCellHovered.pipe(distinctUntilChanged(), share());
        /**
         * Emits the header that is currently hovered or hosting an active resize event (with active
         * taking precedence).
         */
        this.headerRowHoveredOrActiveDistinct = combineLatest([
            this.headerCellHoveredDistinct.pipe(map(cell => _closest(cell, HEADER_ROW_SELECTOR)), startWith(null), distinctUntilChanged()),
            this.overlayHandleActiveForCell.pipe(map(cell => _closest(cell, HEADER_ROW_SELECTOR)), startWith(null), distinctUntilChanged()),
        ]).pipe(skip(1), // Ignore initial [null, null] emission.
        map(([hovered, active]) => active || hovered), distinctUntilChanged(), share());
        this._headerRowHoveredOrActiveDistinctReenterZone = this.headerRowHoveredOrActiveDistinct.pipe(this._enterZone(), share());
        // Optimization: Share row events observable with subsequent callers.
        // At startup, calls will be sequential by row (and typically there's only one).
        this._lastSeenRow = null;
        this._lastSeenRowHover = null;
    }
    /**
     * Emits whether the specified row should show its overlay controls.
     * Emission occurs within the NgZone.
     */
    resizeOverlayVisibleForHeaderRow(row) {
        if (row !== this._lastSeenRow) {
            this._lastSeenRow = row;
            this._lastSeenRowHover = this._headerRowHoveredOrActiveDistinctReenterZone.pipe(map(hoveredRow => hoveredRow === row), distinctUntilChanged(), share());
        }
        return this._lastSeenRowHover;
    }
    _enterZone() {
        return (source) => new Observable(observer => source.subscribe({
            next: value => this._ngZone.run(() => observer.next(value)),
            error: err => observer.error(err),
            complete: () => observer.complete(),
        }));
    }
}
HeaderRowEventDispatcher.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: HeaderRowEventDispatcher, deps: [{ token: i0.NgZone }], target: i0.ɵɵFactoryTarget.Injectable });
HeaderRowEventDispatcher.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: HeaderRowEventDispatcher });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: HeaderRowEventDispatcher, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i0.NgZone }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtZGlzcGF0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jZGstZXhwZXJpbWVudGFsL2NvbHVtbi1yZXNpemUvZXZlbnQtZGlzcGF0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNqRCxPQUFPLEVBQUMsYUFBYSxFQUE0QixVQUFVLEVBQUUsT0FBTyxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ2xGLE9BQU8sRUFBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVqRixPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sd0NBQXdDLENBQUM7QUFFaEUsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0sYUFBYSxDQUFDOztBQUVoRCwrREFBK0Q7QUFFL0QsTUFBTSxPQUFPLHdCQUF3QjtJQWNuQyxZQUE2QixPQUFlO1FBQWYsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQWI1Qzs7OztXQUlHO1FBQ00sc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQWtCLENBQUM7UUFFM0Q7OztXQUdHO1FBQ00sK0JBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQWtCLENBQUM7UUFJcEUsd0RBQXdEO1FBQy9DLDhCQUF5QixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRWxHOzs7V0FHRztRQUNNLHFDQUFnQyxHQUFHLGFBQWEsQ0FBQztZQUN4RCxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUNqQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLENBQUMsRUFDaEQsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUNmLG9CQUFvQixFQUFFLENBQ3ZCO1lBQ0QsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FDbEMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLEVBQ2hELFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFDZixvQkFBb0IsRUFBRSxDQUN2QjtTQUNGLENBQUMsQ0FBQyxJQUFJLENBQ0wsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLHdDQUF3QztRQUNqRCxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxFQUM3QyxvQkFBb0IsRUFBRSxFQUN0QixLQUFLLEVBQUUsQ0FDUixDQUFDO1FBRWUsaURBQTRDLEdBQzNELElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFekUscUVBQXFFO1FBQ3JFLGdGQUFnRjtRQUN4RSxpQkFBWSxHQUFtQixJQUFJLENBQUM7UUFDcEMsc0JBQWlCLEdBQStCLElBQUksQ0FBQztJQWpDZCxDQUFDO0lBbUNoRDs7O09BR0c7SUFDSCxnQ0FBZ0MsQ0FBQyxHQUFZO1FBQzNDLElBQUksR0FBRyxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDN0IsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUM7WUFDeEIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyw0Q0FBNEMsQ0FBQyxJQUFJLENBQzdFLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFVBQVUsS0FBSyxHQUFHLENBQUMsRUFDckMsb0JBQW9CLEVBQUUsRUFDdEIsS0FBSyxFQUFFLENBQ1IsQ0FBQztTQUNIO1FBRUQsT0FBTyxJQUFJLENBQUMsaUJBQWtCLENBQUM7SUFDakMsQ0FBQztJQUVPLFVBQVU7UUFDaEIsT0FBTyxDQUFDLE1BQXFCLEVBQUUsRUFBRSxDQUMvQixJQUFJLFVBQVUsQ0FBSSxRQUFRLENBQUMsRUFBRSxDQUMzQixNQUFNLENBQUMsU0FBUyxDQUFDO1lBQ2YsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMzRCxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztZQUNqQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtTQUNwQyxDQUFDLENBQ0gsQ0FBQztJQUNOLENBQUM7O3FIQTNFVSx3QkFBd0I7eUhBQXhCLHdCQUF3QjsyRkFBeEIsd0JBQXdCO2tCQURwQyxVQUFVIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0YWJsZSwgTmdab25lfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Y29tYmluZUxhdGVzdCwgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uLCBPYnNlcnZhYmxlLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7ZGlzdGluY3RVbnRpbENoYW5nZWQsIG1hcCwgc2hhcmUsIHNraXAsIHN0YXJ0V2l0aH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge19jbG9zZXN0fSBmcm9tICdAYW5ndWxhci9jZGstZXhwZXJpbWVudGFsL3BvcG92ZXItZWRpdCc7XG5cbmltcG9ydCB7SEVBREVSX1JPV19TRUxFQ1RPUn0gZnJvbSAnLi9zZWxlY3RvcnMnO1xuXG4vKiogQ29vcmRpbmF0ZXMgZXZlbnRzIGJldHdlZW4gdGhlIGNvbHVtbiByZXNpemUgZGlyZWN0aXZlcy4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBIZWFkZXJSb3dFdmVudERpc3BhdGNoZXIge1xuICAvKipcbiAgICogRW1pdHMgdGhlIGN1cnJlbnRseSBob3ZlcmVkIGhlYWRlciBjZWxsIG9yIG51bGwgd2hlbiBubyBoZWFkZXIgY2VsbHMgYXJlIGhvdmVyZWQuXG4gICAqIEV4cG9zZWQgcHVibGljbHkgZm9yIGV2ZW50cyB0byBmZWVkIGluLCBidXQgc3Vic2NyaWJlcnMgc2hvdWxkIHVzZSBoZWFkZXJDZWxsSG92ZXJlZERpc3RpbmN0LFxuICAgKiBkZWZpbmVkIGJlbG93LlxuICAgKi9cbiAgcmVhZG9ubHkgaGVhZGVyQ2VsbEhvdmVyZWQgPSBuZXcgU3ViamVjdDxFbGVtZW50IHwgbnVsbD4oKTtcblxuICAvKipcbiAgICogRW1pdHMgdGhlIGhlYWRlciBjZWxsIGZvciB3aGljaCBhIHVzZXItdHJpZ2dlcmVkIHJlc2l6ZSBpcyBhY3RpdmUgb3IgbnVsbFxuICAgKiB3aGVuIG5vIHJlc2l6ZSBpcyBpbiBwcm9ncmVzcy5cbiAgICovXG4gIHJlYWRvbmx5IG92ZXJsYXlIYW5kbGVBY3RpdmVGb3JDZWxsID0gbmV3IFN1YmplY3Q8RWxlbWVudCB8IG51bGw+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBfbmdab25lOiBOZ1pvbmUpIHt9XG5cbiAgLyoqIERpc3RpbmN0IGFuZCBzaGFyZWQgdmVyc2lvbiBvZiBoZWFkZXJDZWxsSG92ZXJlZC4gKi9cbiAgcmVhZG9ubHkgaGVhZGVyQ2VsbEhvdmVyZWREaXN0aW5jdCA9IHRoaXMuaGVhZGVyQ2VsbEhvdmVyZWQucGlwZShkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLCBzaGFyZSgpKTtcblxuICAvKipcbiAgICogRW1pdHMgdGhlIGhlYWRlciB0aGF0IGlzIGN1cnJlbnRseSBob3ZlcmVkIG9yIGhvc3RpbmcgYW4gYWN0aXZlIHJlc2l6ZSBldmVudCAod2l0aCBhY3RpdmVcbiAgICogdGFraW5nIHByZWNlZGVuY2UpLlxuICAgKi9cbiAgcmVhZG9ubHkgaGVhZGVyUm93SG92ZXJlZE9yQWN0aXZlRGlzdGluY3QgPSBjb21iaW5lTGF0ZXN0KFtcbiAgICB0aGlzLmhlYWRlckNlbGxIb3ZlcmVkRGlzdGluY3QucGlwZShcbiAgICAgIG1hcChjZWxsID0+IF9jbG9zZXN0KGNlbGwsIEhFQURFUl9ST1dfU0VMRUNUT1IpKSxcbiAgICAgIHN0YXJ0V2l0aChudWxsKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgKSxcbiAgICB0aGlzLm92ZXJsYXlIYW5kbGVBY3RpdmVGb3JDZWxsLnBpcGUoXG4gICAgICBtYXAoY2VsbCA9PiBfY2xvc2VzdChjZWxsLCBIRUFERVJfUk9XX1NFTEVDVE9SKSksXG4gICAgICBzdGFydFdpdGgobnVsbCksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICksXG4gIF0pLnBpcGUoXG4gICAgc2tpcCgxKSwgLy8gSWdub3JlIGluaXRpYWwgW251bGwsIG51bGxdIGVtaXNzaW9uLlxuICAgIG1hcCgoW2hvdmVyZWQsIGFjdGl2ZV0pID0+IGFjdGl2ZSB8fCBob3ZlcmVkKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHNoYXJlKCksXG4gICk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBfaGVhZGVyUm93SG92ZXJlZE9yQWN0aXZlRGlzdGluY3RSZWVudGVyWm9uZSA9XG4gICAgdGhpcy5oZWFkZXJSb3dIb3ZlcmVkT3JBY3RpdmVEaXN0aW5jdC5waXBlKHRoaXMuX2VudGVyWm9uZSgpLCBzaGFyZSgpKTtcblxuICAvLyBPcHRpbWl6YXRpb246IFNoYXJlIHJvdyBldmVudHMgb2JzZXJ2YWJsZSB3aXRoIHN1YnNlcXVlbnQgY2FsbGVycy5cbiAgLy8gQXQgc3RhcnR1cCwgY2FsbHMgd2lsbCBiZSBzZXF1ZW50aWFsIGJ5IHJvdyAoYW5kIHR5cGljYWxseSB0aGVyZSdzIG9ubHkgb25lKS5cbiAgcHJpdmF0ZSBfbGFzdFNlZW5Sb3c6IEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBfbGFzdFNlZW5Sb3dIb3ZlcjogT2JzZXJ2YWJsZTxib29sZWFuPiB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBFbWl0cyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgcm93IHNob3VsZCBzaG93IGl0cyBvdmVybGF5IGNvbnRyb2xzLlxuICAgKiBFbWlzc2lvbiBvY2N1cnMgd2l0aGluIHRoZSBOZ1pvbmUuXG4gICAqL1xuICByZXNpemVPdmVybGF5VmlzaWJsZUZvckhlYWRlclJvdyhyb3c6IEVsZW1lbnQpOiBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgICBpZiAocm93ICE9PSB0aGlzLl9sYXN0U2VlblJvdykge1xuICAgICAgdGhpcy5fbGFzdFNlZW5Sb3cgPSByb3c7XG4gICAgICB0aGlzLl9sYXN0U2VlblJvd0hvdmVyID0gdGhpcy5faGVhZGVyUm93SG92ZXJlZE9yQWN0aXZlRGlzdGluY3RSZWVudGVyWm9uZS5waXBlKFxuICAgICAgICBtYXAoaG92ZXJlZFJvdyA9PiBob3ZlcmVkUm93ID09PSByb3cpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICBzaGFyZSgpLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fbGFzdFNlZW5Sb3dIb3ZlciE7XG4gIH1cblxuICBwcml2YXRlIF9lbnRlclpvbmU8VD4oKTogTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPFQ+IHtcbiAgICByZXR1cm4gKHNvdXJjZTogT2JzZXJ2YWJsZTxUPikgPT5cbiAgICAgIG5ldyBPYnNlcnZhYmxlPFQ+KG9ic2VydmVyID0+XG4gICAgICAgIHNvdXJjZS5zdWJzY3JpYmUoe1xuICAgICAgICAgIG5leHQ6IHZhbHVlID0+IHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gb2JzZXJ2ZXIubmV4dCh2YWx1ZSkpLFxuICAgICAgICAgIGVycm9yOiBlcnIgPT4gb2JzZXJ2ZXIuZXJyb3IoZXJyKSxcbiAgICAgICAgICBjb21wbGV0ZTogKCkgPT4gb2JzZXJ2ZXIuY29tcGxldGUoKSxcbiAgICAgICAgfSksXG4gICAgICApO1xuICB9XG59XG4iXX0=