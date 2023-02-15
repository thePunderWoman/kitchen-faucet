/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Directionality } from '@angular/cdk/bidi';
import { Overlay } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';
import * as i0 from "@angular/core";
import * as i1 from "@angular/cdk/bidi";
import * as i2 from "@angular/cdk/overlay";
/**
 * Overridable factory responsible for configuring how cdkPopoverEdit popovers are positioned
 * and sized.
 */
export class PopoverEditPositionStrategyFactory {
}
PopoverEditPositionStrategyFactory.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: PopoverEditPositionStrategyFactory, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
PopoverEditPositionStrategyFactory.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: PopoverEditPositionStrategyFactory });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: PopoverEditPositionStrategyFactory, decorators: [{
            type: Injectable
        }] });
/**
 * Default implementation of PopoverEditPositionStrategyFactory.
 * Uses a FlexibleConnectedPositionStrategy anchored to the start + top of the cell.
 * Note: This will change to CoverPositionStrategy once it implemented.
 */
export class DefaultPopoverEditPositionStrategyFactory extends PopoverEditPositionStrategyFactory {
    constructor(direction, overlay) {
        super();
        this.direction = direction;
        this.overlay = overlay;
    }
    positionStrategyForCells(cells) {
        return this.overlay
            .position()
            .flexibleConnectedTo(cells[0])
            .withGrowAfterOpen()
            .withPush()
            .withViewportMargin(16)
            .withPositions([
            {
                originX: 'start',
                originY: 'top',
                overlayX: 'start',
                overlayY: 'top',
            },
        ]);
    }
    sizeConfigForCells(cells) {
        if (cells.length === 0) {
            return {};
        }
        if (cells.length === 1) {
            return { width: cells[0].getBoundingClientRect().width };
        }
        let firstCell, lastCell;
        if (this.direction.value === 'ltr') {
            firstCell = cells[0];
            lastCell = cells[cells.length - 1];
        }
        else {
            lastCell = cells[0];
            firstCell = cells[cells.length - 1];
        }
        return { width: lastCell.getBoundingClientRect().right - firstCell.getBoundingClientRect().left };
    }
}
DefaultPopoverEditPositionStrategyFactory.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DefaultPopoverEditPositionStrategyFactory, deps: [{ token: i1.Directionality }, { token: i2.Overlay }], target: i0.ɵɵFactoryTarget.Injectable });
DefaultPopoverEditPositionStrategyFactory.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DefaultPopoverEditPositionStrategyFactory });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DefaultPopoverEditPositionStrategyFactory, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i1.Directionality }, { type: i2.Overlay }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wb3Zlci1lZGl0LXBvc2l0aW9uLXN0cmF0ZWd5LWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvY2RrLWV4cGVyaW1lbnRhbC9wb3BvdmVyLWVkaXQvcG9wb3Zlci1lZGl0LXBvc2l0aW9uLXN0cmF0ZWd5LWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxPQUFPLEVBQXNDLE1BQU0sc0JBQXNCLENBQUM7QUFDbEYsT0FBTyxFQUFDLFVBQVUsRUFBQyxNQUFNLGVBQWUsQ0FBQzs7OztBQUV6Qzs7O0dBR0c7QUFFSCxNQUFNLE9BQWdCLGtDQUFrQzs7K0hBQWxDLGtDQUFrQzttSUFBbEMsa0NBQWtDOzJGQUFsQyxrQ0FBa0M7a0JBRHZELFVBQVU7O0FBZVg7Ozs7R0FJRztBQUVILE1BQU0sT0FBTyx5Q0FBMEMsU0FBUSxrQ0FBa0M7SUFDL0YsWUFBK0IsU0FBeUIsRUFBcUIsT0FBZ0I7UUFDM0YsS0FBSyxFQUFFLENBQUM7UUFEcUIsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7UUFBcUIsWUFBTyxHQUFQLE9BQU8sQ0FBUztJQUU3RixDQUFDO0lBRUQsd0JBQXdCLENBQUMsS0FBb0I7UUFDM0MsT0FBTyxJQUFJLENBQUMsT0FBTzthQUNoQixRQUFRLEVBQUU7YUFDVixtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDN0IsaUJBQWlCLEVBQUU7YUFDbkIsUUFBUSxFQUFFO2FBQ1Ysa0JBQWtCLENBQUMsRUFBRSxDQUFDO2FBQ3RCLGFBQWEsQ0FBQztZQUNiO2dCQUNFLE9BQU8sRUFBRSxPQUFPO2dCQUNoQixPQUFPLEVBQUUsS0FBSztnQkFDZCxRQUFRLEVBQUUsT0FBTztnQkFDakIsUUFBUSxFQUFFLEtBQUs7YUFDaEI7U0FDRixDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsS0FBb0I7UUFDckMsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN0QixPQUFPLEVBQUUsQ0FBQztTQUNYO1FBRUQsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN0QixPQUFPLEVBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLEtBQUssRUFBQyxDQUFDO1NBQ3hEO1FBRUQsSUFBSSxTQUFTLEVBQUUsUUFBUSxDQUFDO1FBQ3hCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEtBQUssS0FBSyxFQUFFO1lBQ2xDLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckIsUUFBUSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3BDO2FBQU07WUFDTCxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLFNBQVMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztTQUNyQztRQUVELE9BQU8sRUFBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDO0lBQ2xHLENBQUM7O3NJQXpDVSx5Q0FBeUM7MElBQXpDLHlDQUF5QzsyRkFBekMseUNBQXlDO2tCQURyRCxVQUFVIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RGlyZWN0aW9uYWxpdHl9IGZyb20gJ0Bhbmd1bGFyL2Nkay9iaWRpJztcbmltcG9ydCB7T3ZlcmxheSwgT3ZlcmxheVNpemVDb25maWcsIFBvc2l0aW9uU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2Nkay9vdmVybGF5JztcbmltcG9ydCB7SW5qZWN0YWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbi8qKlxuICogT3ZlcnJpZGFibGUgZmFjdG9yeSByZXNwb25zaWJsZSBmb3IgY29uZmlndXJpbmcgaG93IGNka1BvcG92ZXJFZGl0IHBvcG92ZXJzIGFyZSBwb3NpdGlvbmVkXG4gKiBhbmQgc2l6ZWQuXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQb3BvdmVyRWRpdFBvc2l0aW9uU3RyYXRlZ3lGYWN0b3J5IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBQb3NpdGlvblN0cmF0ZWd5IGJhc2VkIG9uIHRoZSBzcGVjaWZpZWQgdGFibGUgY2VsbHMuXG4gICAqIFRoZSBjZWxscyB3aWxsIGJlIHByb3ZpZGVkIGluIERPTSBvcmRlci5cbiAgICovXG4gIGFic3RyYWN0IHBvc2l0aW9uU3RyYXRlZ3lGb3JDZWxscyhjZWxsczogSFRNTEVsZW1lbnRbXSk6IFBvc2l0aW9uU3RyYXRlZ3k7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gT3ZlcmxheVNpemVDb25maWcgYmFzZWQgb24gdGhlIHNwZWNpZmllZCB0YWJsZSBjZWxscy5cbiAgICogVGhlIGNlbGxzIHdpbGwgYmUgcHJvdmlkZWQgaW4gRE9NIG9yZGVyLlxuICAgKi9cbiAgYWJzdHJhY3Qgc2l6ZUNvbmZpZ0ZvckNlbGxzKGNlbGxzOiBIVE1MRWxlbWVudFtdKTogT3ZlcmxheVNpemVDb25maWc7XG59XG5cbi8qKlxuICogRGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBvZiBQb3BvdmVyRWRpdFBvc2l0aW9uU3RyYXRlZ3lGYWN0b3J5LlxuICogVXNlcyBhIEZsZXhpYmxlQ29ubmVjdGVkUG9zaXRpb25TdHJhdGVneSBhbmNob3JlZCB0byB0aGUgc3RhcnQgKyB0b3Agb2YgdGhlIGNlbGwuXG4gKiBOb3RlOiBUaGlzIHdpbGwgY2hhbmdlIHRvIENvdmVyUG9zaXRpb25TdHJhdGVneSBvbmNlIGl0IGltcGxlbWVudGVkLlxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgRGVmYXVsdFBvcG92ZXJFZGl0UG9zaXRpb25TdHJhdGVneUZhY3RvcnkgZXh0ZW5kcyBQb3BvdmVyRWRpdFBvc2l0aW9uU3RyYXRlZ3lGYWN0b3J5IHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRvbmx5IGRpcmVjdGlvbjogRGlyZWN0aW9uYWxpdHksIHByb3RlY3RlZCByZWFkb25seSBvdmVybGF5OiBPdmVybGF5KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHBvc2l0aW9uU3RyYXRlZ3lGb3JDZWxscyhjZWxsczogSFRNTEVsZW1lbnRbXSk6IFBvc2l0aW9uU3RyYXRlZ3kge1xuICAgIHJldHVybiB0aGlzLm92ZXJsYXlcbiAgICAgIC5wb3NpdGlvbigpXG4gICAgICAuZmxleGlibGVDb25uZWN0ZWRUbyhjZWxsc1swXSlcbiAgICAgIC53aXRoR3Jvd0FmdGVyT3BlbigpXG4gICAgICAud2l0aFB1c2goKVxuICAgICAgLndpdGhWaWV3cG9ydE1hcmdpbigxNilcbiAgICAgIC53aXRoUG9zaXRpb25zKFtcbiAgICAgICAge1xuICAgICAgICAgIG9yaWdpblg6ICdzdGFydCcsXG4gICAgICAgICAgb3JpZ2luWTogJ3RvcCcsXG4gICAgICAgICAgb3ZlcmxheVg6ICdzdGFydCcsXG4gICAgICAgICAgb3ZlcmxheVk6ICd0b3AnLFxuICAgICAgICB9LFxuICAgICAgXSk7XG4gIH1cblxuICBzaXplQ29uZmlnRm9yQ2VsbHMoY2VsbHM6IEhUTUxFbGVtZW50W10pOiBPdmVybGF5U2l6ZUNvbmZpZyB7XG4gICAgaWYgKGNlbGxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIGlmIChjZWxscy5sZW5ndGggPT09IDEpIHtcbiAgICAgIHJldHVybiB7d2lkdGg6IGNlbGxzWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRofTtcbiAgICB9XG5cbiAgICBsZXQgZmlyc3RDZWxsLCBsYXN0Q2VsbDtcbiAgICBpZiAodGhpcy5kaXJlY3Rpb24udmFsdWUgPT09ICdsdHInKSB7XG4gICAgICBmaXJzdENlbGwgPSBjZWxsc1swXTtcbiAgICAgIGxhc3RDZWxsID0gY2VsbHNbY2VsbHMubGVuZ3RoIC0gMV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxhc3RDZWxsID0gY2VsbHNbMF07XG4gICAgICBmaXJzdENlbGwgPSBjZWxsc1tjZWxscy5sZW5ndGggLSAxXTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3dpZHRoOiBsYXN0Q2VsbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5yaWdodCAtIGZpcnN0Q2VsbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0fTtcbiAgfVxufVxuIl19