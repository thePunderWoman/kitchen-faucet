/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CdkRowSelection } from './row-selection';
import { CdkSelectAll } from './select-all';
import { CdkSelection } from './selection';
import { CdkSelectionColumn } from './selection-column';
import { CdkSelectionToggle } from './selection-toggle';
import * as i0 from "@angular/core";
export class CdkSelectionModule {
}
CdkSelectionModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkSelectionModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
CdkSelectionModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: CdkSelectionModule, declarations: [CdkSelection,
        CdkSelectionToggle,
        CdkSelectAll,
        CdkSelectionColumn,
        CdkRowSelection], imports: [CommonModule, CdkTableModule], exports: [CdkSelection, CdkSelectionToggle, CdkSelectAll, CdkSelectionColumn, CdkRowSelection] });
CdkSelectionModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkSelectionModule, imports: [CommonModule, CdkTableModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkSelectionModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [CommonModule, CdkTableModule],
                    exports: [CdkSelection, CdkSelectionToggle, CdkSelectAll, CdkSelectionColumn, CdkRowSelection],
                    declarations: [
                        CdkSelection,
                        CdkSelectionToggle,
                        CdkSelectAll,
                        CdkSelectionColumn,
                        CdkRowSelection,
                    ],
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0aW9uLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jZGstZXhwZXJpbWVudGFsL3NlbGVjdGlvbi9zZWxlY3Rpb24tbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUNsRCxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDN0MsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUV2QyxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDaEQsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMxQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ3pDLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3RELE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDOztBQWF0RCxNQUFNLE9BQU8sa0JBQWtCOzsrR0FBbEIsa0JBQWtCO2dIQUFsQixrQkFBa0IsaUJBUDNCLFlBQVk7UUFDWixrQkFBa0I7UUFDbEIsWUFBWTtRQUNaLGtCQUFrQjtRQUNsQixlQUFlLGFBUFAsWUFBWSxFQUFFLGNBQWMsYUFDNUIsWUFBWSxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxlQUFlO2dIQVNsRixrQkFBa0IsWUFWbkIsWUFBWSxFQUFFLGNBQWM7MkZBVTNCLGtCQUFrQjtrQkFYOUIsUUFBUTttQkFBQztvQkFDUixPQUFPLEVBQUUsQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDO29CQUN2QyxPQUFPLEVBQUUsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsQ0FBQztvQkFDOUYsWUFBWSxFQUFFO3dCQUNaLFlBQVk7d0JBQ1osa0JBQWtCO3dCQUNsQixZQUFZO3dCQUNaLGtCQUFrQjt3QkFDbEIsZUFBZTtxQkFDaEI7aUJBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDZGtUYWJsZU1vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvY2RrL3RhYmxlJztcbmltcG9ydCB7Q29tbW9uTW9kdWxlfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtOZ01vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7Q2RrUm93U2VsZWN0aW9ufSBmcm9tICcuL3Jvdy1zZWxlY3Rpb24nO1xuaW1wb3J0IHtDZGtTZWxlY3RBbGx9IGZyb20gJy4vc2VsZWN0LWFsbCc7XG5pbXBvcnQge0Nka1NlbGVjdGlvbn0gZnJvbSAnLi9zZWxlY3Rpb24nO1xuaW1wb3J0IHtDZGtTZWxlY3Rpb25Db2x1bW59IGZyb20gJy4vc2VsZWN0aW9uLWNvbHVtbic7XG5pbXBvcnQge0Nka1NlbGVjdGlvblRvZ2dsZX0gZnJvbSAnLi9zZWxlY3Rpb24tdG9nZ2xlJztcblxuQE5nTW9kdWxlKHtcbiAgaW1wb3J0czogW0NvbW1vbk1vZHVsZSwgQ2RrVGFibGVNb2R1bGVdLFxuICBleHBvcnRzOiBbQ2RrU2VsZWN0aW9uLCBDZGtTZWxlY3Rpb25Ub2dnbGUsIENka1NlbGVjdEFsbCwgQ2RrU2VsZWN0aW9uQ29sdW1uLCBDZGtSb3dTZWxlY3Rpb25dLFxuICBkZWNsYXJhdGlvbnM6IFtcbiAgICBDZGtTZWxlY3Rpb24sXG4gICAgQ2RrU2VsZWN0aW9uVG9nZ2xlLFxuICAgIENka1NlbGVjdEFsbCxcbiAgICBDZGtTZWxlY3Rpb25Db2x1bW4sXG4gICAgQ2RrUm93U2VsZWN0aW9uLFxuICBdLFxufSlcbmV4cG9ydCBjbGFzcyBDZGtTZWxlY3Rpb25Nb2R1bGUge31cbiJdfQ==