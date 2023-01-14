/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { DOCUMENT } from '@angular/common';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import * as i0 from "@angular/core";
export function domContentLoadedFactory(doc) {
    return () => new Promise((resolve, _reject) => {
        if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
            resolve();
            return;
        }
        const contentLoaded = () => {
            doc.removeEventListener('DOMContentLoaded', contentLoaded);
            resolve();
        };
        doc.addEventListener('DOMContentLoaded', contentLoaded);
    });
}
export class StateTransferInitializerModule {
}
StateTransferInitializerModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: StateTransferInitializerModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
StateTransferInitializerModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: StateTransferInitializerModule });
StateTransferInitializerModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: StateTransferInitializerModule, providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useFactory: domContentLoadedFactory,
            deps: [DOCUMENT],
        },
    ] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: StateTransferInitializerModule, decorators: [{
            type: NgModule,
            args: [{
                    providers: [
                        {
                            provide: APP_INITIALIZER,
                            multi: true,
                            useFactory: domContentLoadedFactory,
                            deps: [DOCUMENT],
                        },
                    ],
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21tb24vc3JjL3N0YXRlLXRyYW5zZmVyLWluaXRpYWxpemVyL21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7O0FBRTFELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxHQUFhO0lBQ25ELE9BQU8sR0FBRyxFQUFFLENBQ1YsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDL0IsSUFBSSxHQUFHLENBQUMsVUFBVSxLQUFLLFVBQVUsSUFBSSxHQUFHLENBQUMsVUFBVSxLQUFLLGFBQWEsRUFBRTtZQUNyRSxPQUFPLEVBQUUsQ0FBQztZQUVWLE9BQU87U0FDUjtRQUVELE1BQU0sYUFBYSxHQUFHLEdBQUcsRUFBRTtZQUN6QixHQUFHLENBQUMsbUJBQW1CLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDM0QsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDLENBQUM7UUFFRixHQUFHLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDMUQsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBWUQsTUFBTSxPQUFPLDhCQUE4Qjs7MkhBQTlCLDhCQUE4Qjs0SEFBOUIsOEJBQThCOzRIQUE5Qiw4QkFBOEIsYUFUOUI7UUFDVDtZQUNFLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLEtBQUssRUFBRSxJQUFJO1lBQ1gsVUFBVSxFQUFFLHVCQUF1QjtZQUNuQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUM7U0FDakI7S0FDRjsyRkFFVSw4QkFBOEI7a0JBVjFDLFFBQVE7bUJBQUM7b0JBQ1IsU0FBUyxFQUFFO3dCQUNUOzRCQUNFLE9BQU8sRUFBRSxlQUFlOzRCQUN4QixLQUFLLEVBQUUsSUFBSTs0QkFDWCxVQUFVLEVBQUUsdUJBQXVCOzRCQUNuQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUM7eUJBQ2pCO3FCQUNGO2lCQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IERPQ1VNRU5UIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7IEFQUF9JTklUSUFMSVpFUiwgTmdNb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGRvbUNvbnRlbnRMb2FkZWRGYWN0b3J5KGRvYzogRG9jdW1lbnQpOiAoKSA9PiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuICgpID0+XG4gICAgbmV3IFByb21pc2UoKHJlc29sdmUsIF9yZWplY3QpID0+IHtcbiAgICAgIGlmIChkb2MucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJyB8fCBkb2MucmVhZHlTdGF0ZSA9PT0gJ2ludGVyYWN0aXZlJykge1xuICAgICAgICByZXNvbHZlKCk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjb250ZW50TG9hZGVkID0gKCkgPT4ge1xuICAgICAgICBkb2MucmVtb3ZlRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGNvbnRlbnRMb2FkZWQpO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuXG4gICAgICBkb2MuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGNvbnRlbnRMb2FkZWQpO1xuICAgIH0pO1xufVxuXG5ATmdNb2R1bGUoe1xuICBwcm92aWRlcnM6IFtcbiAgICB7XG4gICAgICBwcm92aWRlOiBBUFBfSU5JVElBTElaRVIsXG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIHVzZUZhY3Rvcnk6IGRvbUNvbnRlbnRMb2FkZWRGYWN0b3J5LFxuICAgICAgZGVwczogW0RPQ1VNRU5UXSxcbiAgICB9LFxuICBdLFxufSlcbmV4cG9ydCBjbGFzcyBTdGF0ZVRyYW5zZmVySW5pdGlhbGl6ZXJNb2R1bGUge31cbiJdfQ==