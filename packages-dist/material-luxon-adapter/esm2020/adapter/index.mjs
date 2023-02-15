/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModule } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_LUXON_DATE_ADAPTER_OPTIONS, LuxonDateAdapter } from './luxon-date-adapter';
import { MAT_LUXON_DATE_FORMATS } from './luxon-date-formats';
import * as i0 from "@angular/core";
export * from './luxon-date-adapter';
export * from './luxon-date-formats';
export class LuxonDateModule {
}
LuxonDateModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: LuxonDateModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
LuxonDateModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: LuxonDateModule });
LuxonDateModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: LuxonDateModule, providers: [
        {
            provide: DateAdapter,
            useClass: LuxonDateAdapter,
            deps: [MAT_DATE_LOCALE, MAT_LUXON_DATE_ADAPTER_OPTIONS],
        },
    ] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: LuxonDateModule, decorators: [{
            type: NgModule,
            args: [{
                    providers: [
                        {
                            provide: DateAdapter,
                            useClass: LuxonDateAdapter,
                            deps: [MAT_DATE_LOCALE, MAT_LUXON_DATE_ADAPTER_OPTIONS],
                        },
                    ],
                }]
        }] });
export class MatLuxonDateModule {
}
MatLuxonDateModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatLuxonDateModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
MatLuxonDateModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: MatLuxonDateModule, imports: [LuxonDateModule] });
MatLuxonDateModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatLuxonDateModule, providers: [{ provide: MAT_DATE_FORMATS, useValue: MAT_LUXON_DATE_FORMATS }], imports: [LuxonDateModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatLuxonDateModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [LuxonDateModule],
                    providers: [{ provide: MAT_DATE_FORMATS, useValue: MAT_LUXON_DATE_FORMATS }],
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbWF0ZXJpYWwtbHV4b24tYWRhcHRlci9hZGFwdGVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUN0RixPQUFPLEVBQUMsOEJBQThCLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQUN0RixPQUFPLEVBQUMsc0JBQXNCLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQzs7QUFFNUQsY0FBYyxzQkFBc0IsQ0FBQztBQUNyQyxjQUFjLHNCQUFzQixDQUFDO0FBV3JDLE1BQU0sT0FBTyxlQUFlOzs0R0FBZixlQUFlOzZHQUFmLGVBQWU7NkdBQWYsZUFBZSxhQVJmO1FBQ1Q7WUFDRSxPQUFPLEVBQUUsV0FBVztZQUNwQixRQUFRLEVBQUUsZ0JBQWdCO1lBQzFCLElBQUksRUFBRSxDQUFDLGVBQWUsRUFBRSw4QkFBOEIsQ0FBQztTQUN4RDtLQUNGOzJGQUVVLGVBQWU7a0JBVDNCLFFBQVE7bUJBQUM7b0JBQ1IsU0FBUyxFQUFFO3dCQUNUOzRCQUNFLE9BQU8sRUFBRSxXQUFXOzRCQUNwQixRQUFRLEVBQUUsZ0JBQWdCOzRCQUMxQixJQUFJLEVBQUUsQ0FBQyxlQUFlLEVBQUUsOEJBQThCLENBQUM7eUJBQ3hEO3FCQUNGO2lCQUNGOztBQU9ELE1BQU0sT0FBTyxrQkFBa0I7OytHQUFsQixrQkFBa0I7Z0hBQWxCLGtCQUFrQixZQU5sQixlQUFlO2dIQU1mLGtCQUFrQixhQUZsQixDQUFDLEVBQUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxzQkFBc0IsRUFBQyxDQUFDLFlBRGhFLGVBQWU7MkZBR2Qsa0JBQWtCO2tCQUo5QixRQUFRO21CQUFDO29CQUNSLE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQztvQkFDMUIsU0FBUyxFQUFFLENBQUMsRUFBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLHNCQUFzQixFQUFDLENBQUM7aUJBQzNFIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TmdNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtEYXRlQWRhcHRlciwgTUFUX0RBVEVfRk9STUFUUywgTUFUX0RBVEVfTE9DQUxFfSBmcm9tICdAYW5ndWxhci9tYXRlcmlhbC9jb3JlJztcbmltcG9ydCB7TUFUX0xVWE9OX0RBVEVfQURBUFRFUl9PUFRJT05TLCBMdXhvbkRhdGVBZGFwdGVyfSBmcm9tICcuL2x1eG9uLWRhdGUtYWRhcHRlcic7XG5pbXBvcnQge01BVF9MVVhPTl9EQVRFX0ZPUk1BVFN9IGZyb20gJy4vbHV4b24tZGF0ZS1mb3JtYXRzJztcblxuZXhwb3J0ICogZnJvbSAnLi9sdXhvbi1kYXRlLWFkYXB0ZXInO1xuZXhwb3J0ICogZnJvbSAnLi9sdXhvbi1kYXRlLWZvcm1hdHMnO1xuXG5ATmdNb2R1bGUoe1xuICBwcm92aWRlcnM6IFtcbiAgICB7XG4gICAgICBwcm92aWRlOiBEYXRlQWRhcHRlcixcbiAgICAgIHVzZUNsYXNzOiBMdXhvbkRhdGVBZGFwdGVyLFxuICAgICAgZGVwczogW01BVF9EQVRFX0xPQ0FMRSwgTUFUX0xVWE9OX0RBVEVfQURBUFRFUl9PUFRJT05TXSxcbiAgICB9LFxuICBdLFxufSlcbmV4cG9ydCBjbGFzcyBMdXhvbkRhdGVNb2R1bGUge31cblxuQE5nTW9kdWxlKHtcbiAgaW1wb3J0czogW0x1eG9uRGF0ZU1vZHVsZV0sXG4gIHByb3ZpZGVyczogW3twcm92aWRlOiBNQVRfREFURV9GT1JNQVRTLCB1c2VWYWx1ZTogTUFUX0xVWE9OX0RBVEVfRk9STUFUU31dLFxufSlcbmV4cG9ydCBjbGFzcyBNYXRMdXhvbkRhdGVNb2R1bGUge31cbiJdfQ==