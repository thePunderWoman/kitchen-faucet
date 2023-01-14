/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { DOCUMENT, ɵPLATFORM_SERVER_ID as PLATFORM_SERVER_ID } from '@angular/common';
import { APP_ID, ApplicationRef, Inject, NgModule, Optional, PLATFORM_ID, } from '@angular/core';
import { BrowserModule, ɵDomSharedStylesHost as DomSharedStylesHost, ɵSharedStylesHost as SharedStylesHost, TransferState, ɵescapeHtml as escapeHtml, } from '@angular/platform-browser';
import { filter, mapTo, take } from 'rxjs/operators';
import { SSRStylesHost } from './styles_host';
import * as i0 from "@angular/core";
import * as i1 from "@angular/platform-browser";
export class RendererModule {
    constructor(applicationRef, transferState, appId) {
        this.applicationRef = applicationRef;
        this.transferState = transferState;
        this.appId = appId;
        if (typeof ngRenderMode !== 'undefined' && ngRenderMode) {
            ngRenderMode = {
                getSerializedState: () => this.transferState ? escapeHtml(this.transferState.toJson()) : undefined,
                appId: this.appId,
                getWhenStable: () => this.applicationRef.isStable
                    .pipe(filter((isStable) => isStable), take(1), mapTo(undefined))
                    .toPromise(),
            };
        }
    }
    static forRoot() {
        return {
            ngModule: RendererModule,
            providers: [
                ...(typeof ngRenderMode !== 'undefined' && ngRenderMode
                    ? [
                        { provide: PLATFORM_ID, useValue: PLATFORM_SERVER_ID },
                        { provide: SSRStylesHost, useClass: SSRStylesHost, deps: [DOCUMENT, APP_ID] },
                    ]
                    : [{ provide: SSRStylesHost, useClass: SSRStylesHost, deps: [DOCUMENT] }]),
                { provide: SharedStylesHost, useExisting: SSRStylesHost },
                { provide: DomSharedStylesHost, useClass: SSRStylesHost },
            ],
        };
    }
}
RendererModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: RendererModule, deps: [{ token: i0.ApplicationRef }, { token: i1.TransferState, optional: true }, { token: APP_ID, optional: true }], target: i0.ɵɵFactoryTarget.NgModule });
RendererModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: RendererModule, exports: [BrowserModule] });
RendererModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: RendererModule, imports: [BrowserModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: RendererModule, decorators: [{
            type: NgModule,
            args: [{
                    exports: [BrowserModule],
                    imports: [],
                    providers: [],
                }]
        }], ctorParameters: function () { return [{ type: i0.ApplicationRef }, { type: i1.TransferState, decorators: [{
                    type: Optional
                }] }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [APP_ID]
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21tb24vY2xvdmVyL3NyYy9tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsSUFBSSxrQkFBa0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3RGLE9BQU8sRUFDTCxNQUFNLEVBQ04sY0FBYyxFQUNkLE1BQU0sRUFFTixRQUFRLEVBQ1IsUUFBUSxFQUNSLFdBQVcsR0FDWixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQ0wsYUFBYSxFQUNiLG9CQUFvQixJQUFJLG1CQUFtQixFQUMzQyxpQkFBaUIsSUFBSSxnQkFBZ0IsRUFDckMsYUFBYSxFQUNiLFdBQVcsSUFBSSxVQUFVLEdBQzFCLE1BQU0sMkJBQTJCLENBQUM7QUFDbkMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDckQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGVBQWUsQ0FBQzs7O0FBZ0I5QyxNQUFNLE9BQU8sY0FBYztJQUN6QixZQUNVLGNBQThCLEVBQ2xCLGFBQTZCLEVBQ2IsS0FBYztRQUYxQyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDbEIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ2IsVUFBSyxHQUFMLEtBQUssQ0FBUztRQUVsRCxJQUFJLE9BQU8sWUFBWSxLQUFLLFdBQVcsSUFBSSxZQUFZLEVBQUU7WUFDdkQsWUFBWSxHQUFHO2dCQUNiLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxDQUN2QixJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUMxRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLGFBQWEsRUFBRSxHQUFHLEVBQUUsQ0FDbEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRO3FCQUN6QixJQUFJLENBQ0gsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFDOUIsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FDakI7cUJBQ0EsU0FBUyxFQUFFO2FBQ2pCLENBQUM7U0FDSDtJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsT0FBTztRQUNaLE9BQU87WUFDTCxRQUFRLEVBQUUsY0FBYztZQUN4QixTQUFTLEVBQUU7Z0JBQ1QsR0FBRyxDQUFDLE9BQU8sWUFBWSxLQUFLLFdBQVcsSUFBSSxZQUFZO29CQUNyRCxDQUFDLENBQUM7d0JBQ0UsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRTt3QkFDdEQsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFO3FCQUM5RTtvQkFDSCxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzVFLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUU7Z0JBQ3pELEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUU7YUFDMUQ7U0FDRixDQUFDO0lBQ0osQ0FBQzs7MkdBckNVLGNBQWMsNkZBSUgsTUFBTTs0R0FKakIsY0FBYyxZQUpmLGFBQWE7NEdBSVosY0FBYyxZQUpmLGFBQWE7MkZBSVosY0FBYztrQkFMMUIsUUFBUTttQkFBQztvQkFDUixPQUFPLEVBQUUsQ0FBQyxhQUFhLENBQUM7b0JBQ3hCLE9BQU8sRUFBRSxFQUFFO29CQUNYLFNBQVMsRUFBRSxFQUFFO2lCQUNkOzswQkFJSSxRQUFROzswQkFDUixRQUFROzswQkFBSSxNQUFNOzJCQUFDLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgRE9DVU1FTlQsIMm1UExBVEZPUk1fU0VSVkVSX0lEIGFzIFBMQVRGT1JNX1NFUlZFUl9JRCB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge1xuICBBUFBfSUQsXG4gIEFwcGxpY2F0aW9uUmVmLFxuICBJbmplY3QsXG4gIE1vZHVsZVdpdGhQcm92aWRlcnMsXG4gIE5nTW9kdWxlLFxuICBPcHRpb25hbCxcbiAgUExBVEZPUk1fSUQsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtcbiAgQnJvd3Nlck1vZHVsZSxcbiAgybVEb21TaGFyZWRTdHlsZXNIb3N0IGFzIERvbVNoYXJlZFN0eWxlc0hvc3QsXG4gIMm1U2hhcmVkU3R5bGVzSG9zdCBhcyBTaGFyZWRTdHlsZXNIb3N0LFxuICBUcmFuc2ZlclN0YXRlLFxuICDJtWVzY2FwZUh0bWwgYXMgZXNjYXBlSHRtbCxcbn0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlcic7XG5pbXBvcnQgeyBmaWx0ZXIsIG1hcFRvLCB0YWtlIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgU1NSU3R5bGVzSG9zdCB9IGZyb20gJy4vc3R5bGVzX2hvc3QnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5HUmVuZGVyTW9kZUFQSSB7XG4gIGdldFNlcmlhbGl6ZWRTdGF0ZTogKCkgPT4gc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBnZXRXaGVuU3RhYmxlOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xuICBhcHBJZD86IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgTkdSZW5kZXJNb2RlID0gYm9vbGVhbiB8IHVuZGVmaW5lZCB8IE5HUmVuZGVyTW9kZUFQSTtcbmRlY2xhcmUgbGV0IG5nUmVuZGVyTW9kZTogTkdSZW5kZXJNb2RlO1xuXG5ATmdNb2R1bGUoe1xuICBleHBvcnRzOiBbQnJvd3Nlck1vZHVsZV0sXG4gIGltcG9ydHM6IFtdLFxuICBwcm92aWRlcnM6IFtdLFxufSlcbmV4cG9ydCBjbGFzcyBSZW5kZXJlck1vZHVsZSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgYXBwbGljYXRpb25SZWY6IEFwcGxpY2F0aW9uUmVmLFxuICAgIEBPcHRpb25hbCgpIHByaXZhdGUgdHJhbnNmZXJTdGF0ZT86IFRyYW5zZmVyU3RhdGUsXG4gICAgQE9wdGlvbmFsKCkgQEluamVjdChBUFBfSUQpIHByaXZhdGUgYXBwSWQ/OiBzdHJpbmcsXG4gICkge1xuICAgIGlmICh0eXBlb2YgbmdSZW5kZXJNb2RlICE9PSAndW5kZWZpbmVkJyAmJiBuZ1JlbmRlck1vZGUpIHtcbiAgICAgIG5nUmVuZGVyTW9kZSA9IHtcbiAgICAgICAgZ2V0U2VyaWFsaXplZFN0YXRlOiAoKSA9PlxuICAgICAgICAgIHRoaXMudHJhbnNmZXJTdGF0ZSA/IGVzY2FwZUh0bWwodGhpcy50cmFuc2ZlclN0YXRlLnRvSnNvbigpKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgYXBwSWQ6IHRoaXMuYXBwSWQsXG4gICAgICAgIGdldFdoZW5TdGFibGU6ICgpID0+XG4gICAgICAgICAgdGhpcy5hcHBsaWNhdGlvblJlZi5pc1N0YWJsZVxuICAgICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAgIGZpbHRlcigoaXNTdGFibGUpID0+IGlzU3RhYmxlKSxcbiAgICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgICAgbWFwVG8odW5kZWZpbmVkKSxcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIC50b1Byb21pc2UoKSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGZvclJvb3QoKTogTW9kdWxlV2l0aFByb3ZpZGVyczxSZW5kZXJlck1vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogUmVuZGVyZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAgLi4uKHR5cGVvZiBuZ1JlbmRlck1vZGUgIT09ICd1bmRlZmluZWQnICYmIG5nUmVuZGVyTW9kZVxuICAgICAgICAgID8gW1xuICAgICAgICAgICAgICB7IHByb3ZpZGU6IFBMQVRGT1JNX0lELCB1c2VWYWx1ZTogUExBVEZPUk1fU0VSVkVSX0lEIH0sXG4gICAgICAgICAgICAgIHsgcHJvdmlkZTogU1NSU3R5bGVzSG9zdCwgdXNlQ2xhc3M6IFNTUlN0eWxlc0hvc3QsIGRlcHM6IFtET0NVTUVOVCwgQVBQX0lEXSB9LFxuICAgICAgICAgICAgXVxuICAgICAgICAgIDogW3sgcHJvdmlkZTogU1NSU3R5bGVzSG9zdCwgdXNlQ2xhc3M6IFNTUlN0eWxlc0hvc3QsIGRlcHM6IFtET0NVTUVOVF0gfV0pLFxuICAgICAgICB7IHByb3ZpZGU6IFNoYXJlZFN0eWxlc0hvc3QsIHVzZUV4aXN0aW5nOiBTU1JTdHlsZXNIb3N0IH0sXG4gICAgICAgIHsgcHJvdmlkZTogRG9tU2hhcmVkU3R5bGVzSG9zdCwgdXNlQ2xhc3M6IFNTUlN0eWxlc0hvc3QgfSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxufVxuIl19