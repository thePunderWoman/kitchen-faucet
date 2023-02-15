/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModule } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { DateFnsAdapter } from './date-fns-adapter';
import { MAT_DATE_FNS_FORMATS } from './date-fns-formats';
import * as i0 from "@angular/core";
export * from './date-fns-adapter';
export * from './date-fns-formats';
export class DateFnsModule {
}
DateFnsModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DateFnsModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
DateFnsModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: DateFnsModule });
DateFnsModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DateFnsModule, providers: [
        {
            provide: DateAdapter,
            useClass: DateFnsAdapter,
            deps: [MAT_DATE_LOCALE],
        },
    ] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DateFnsModule, decorators: [{
            type: NgModule,
            args: [{
                    providers: [
                        {
                            provide: DateAdapter,
                            useClass: DateFnsAdapter,
                            deps: [MAT_DATE_LOCALE],
                        },
                    ],
                }]
        }] });
export class MatDateFnsModule {
}
MatDateFnsModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatDateFnsModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
MatDateFnsModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: MatDateFnsModule, imports: [DateFnsModule] });
MatDateFnsModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatDateFnsModule, providers: [{ provide: MAT_DATE_FORMATS, useValue: MAT_DATE_FNS_FORMATS }], imports: [DateFnsModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatDateFnsModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [DateFnsModule],
                    providers: [{ provide: MAT_DATE_FORMATS, useValue: MAT_DATE_FNS_FORMATS }],
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbWF0ZXJpYWwtZGF0ZS1mbnMtYWRhcHRlci9hZGFwdGVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUN0RixPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDbEQsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7O0FBRXhELGNBQWMsb0JBQW9CLENBQUM7QUFDbkMsY0FBYyxvQkFBb0IsQ0FBQztBQVduQyxNQUFNLE9BQU8sYUFBYTs7MEdBQWIsYUFBYTsyR0FBYixhQUFhOzJHQUFiLGFBQWEsYUFSYjtRQUNUO1lBQ0UsT0FBTyxFQUFFLFdBQVc7WUFDcEIsUUFBUSxFQUFFLGNBQWM7WUFDeEIsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDO1NBQ3hCO0tBQ0Y7MkZBRVUsYUFBYTtrQkFUekIsUUFBUTttQkFBQztvQkFDUixTQUFTLEVBQUU7d0JBQ1Q7NEJBQ0UsT0FBTyxFQUFFLFdBQVc7NEJBQ3BCLFFBQVEsRUFBRSxjQUFjOzRCQUN4QixJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQUM7eUJBQ3hCO3FCQUNGO2lCQUNGOztBQU9ELE1BQU0sT0FBTyxnQkFBZ0I7OzZHQUFoQixnQkFBZ0I7OEdBQWhCLGdCQUFnQixZQU5oQixhQUFhOzhHQU1iLGdCQUFnQixhQUZoQixDQUFDLEVBQUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBQyxDQUFDLFlBRDlELGFBQWE7MkZBR1osZ0JBQWdCO2tCQUo1QixRQUFRO21CQUFDO29CQUNSLE9BQU8sRUFBRSxDQUFDLGFBQWEsQ0FBQztvQkFDeEIsU0FBUyxFQUFFLENBQUMsRUFBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFDLENBQUM7aUJBQ3pFIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TmdNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtEYXRlQWRhcHRlciwgTUFUX0RBVEVfRk9STUFUUywgTUFUX0RBVEVfTE9DQUxFfSBmcm9tICdAYW5ndWxhci9tYXRlcmlhbC9jb3JlJztcbmltcG9ydCB7RGF0ZUZuc0FkYXB0ZXJ9IGZyb20gJy4vZGF0ZS1mbnMtYWRhcHRlcic7XG5pbXBvcnQge01BVF9EQVRFX0ZOU19GT1JNQVRTfSBmcm9tICcuL2RhdGUtZm5zLWZvcm1hdHMnO1xuXG5leHBvcnQgKiBmcm9tICcuL2RhdGUtZm5zLWFkYXB0ZXInO1xuZXhwb3J0ICogZnJvbSAnLi9kYXRlLWZucy1mb3JtYXRzJztcblxuQE5nTW9kdWxlKHtcbiAgcHJvdmlkZXJzOiBbXG4gICAge1xuICAgICAgcHJvdmlkZTogRGF0ZUFkYXB0ZXIsXG4gICAgICB1c2VDbGFzczogRGF0ZUZuc0FkYXB0ZXIsXG4gICAgICBkZXBzOiBbTUFUX0RBVEVfTE9DQUxFXSxcbiAgICB9LFxuICBdLFxufSlcbmV4cG9ydCBjbGFzcyBEYXRlRm5zTW9kdWxlIHt9XG5cbkBOZ01vZHVsZSh7XG4gIGltcG9ydHM6IFtEYXRlRm5zTW9kdWxlXSxcbiAgcHJvdmlkZXJzOiBbe3Byb3ZpZGU6IE1BVF9EQVRFX0ZPUk1BVFMsIHVzZVZhbHVlOiBNQVRfREFURV9GTlNfRk9STUFUU31dLFxufSlcbmV4cG9ydCBjbGFzcyBNYXREYXRlRm5zTW9kdWxlIHt9XG4iXX0=