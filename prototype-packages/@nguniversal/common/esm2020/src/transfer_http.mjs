/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { HTTP_INTERCEPTORS, HttpHeaders, HttpResponse, } from '@angular/common/http';
import { ApplicationRef, Injectable, NgModule } from '@angular/core';
import { BrowserTransferStateModule, TransferState, makeStateKey, } from '@angular/platform-browser';
import { of as observableOf } from 'rxjs';
import { filter, take, tap } from 'rxjs/operators';
import * as i0 from "@angular/core";
import * as i1 from "@angular/platform-browser";
function getHeadersMap(headers) {
    const headersMap = {};
    for (const key of headers.keys()) {
        const values = headers.getAll(key);
        if (values !== null) {
            headersMap[key] = values;
        }
    }
    return headersMap;
}
export class TransferHttpCacheInterceptor {
    invalidateCacheEntry(url) {
        Object.keys(this.transferState['store']).forEach((key) => key.includes(url) ? this.transferState.remove(makeStateKey(key)) : null);
    }
    makeCacheKey(method, url, params, responseType) {
        // make the params encoded same as a url so it's easy to identify
        const encodedParams = params
            .keys()
            .sort()
            .map((k) => `${k}=${params.getAll(k)}`)
            .join('&');
        const key = (method === 'GET' ? 'G.' : 'H.') + responseType + '.' + url + '?' + encodedParams;
        return makeStateKey(key);
    }
    constructor(appRef, transferState) {
        this.transferState = transferState;
        this.isCacheActive = true;
        // Stop using the cache if the application has stabilized, indicating initial rendering is
        // complete.
        appRef.isStable
            .pipe(filter((isStable) => isStable), take(1))
            .subscribe(() => {
            this.isCacheActive = false;
        });
    }
    intercept(req, next) {
        // Stop using the cache if there is a mutating call.
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            this.isCacheActive = false;
            this.invalidateCacheEntry(req.url);
        }
        if (!this.isCacheActive) {
            // Cache is no longer active. Pass the request through.
            return next.handle(req);
        }
        const storeKey = this.makeCacheKey(req.method, req.url, req.params, req.responseType);
        if (this.transferState.hasKey(storeKey)) {
            // Request found in cache. Respond using it.
            const response = this.transferState.get(storeKey, {});
            let body = response.body;
            switch (response.responseType) {
                case 'arraybuffer':
                    {
                        // If we're in Node...
                        if (typeof Buffer !== 'undefined') {
                            const buf = Buffer.from(response.body);
                            body = new ArrayBuffer(buf.length);
                            const view = new Uint8Array(body);
                            for (let i = 0; i < buf.length; ++i) {
                                view[i] = buf[i];
                            }
                        }
                        else if (typeof TextEncoder !== 'undefined') {
                            // Modern browsers implement TextEncode.
                            body = new TextEncoder().encode(response.body).buffer;
                        }
                    }
                    break;
                case 'blob':
                    body = new Blob([response.body]);
                    break;
            }
            return observableOf(new HttpResponse({
                body,
                headers: new HttpHeaders(response.headers),
                status: response.status,
                statusText: response.statusText,
                url: response.url,
            }));
        }
        else {
            // Request not found in cache. Make the request and cache it.
            const httpEvent = next.handle(req);
            return httpEvent.pipe(tap((event) => {
                if (event instanceof HttpResponse) {
                    this.transferState.set(storeKey, {
                        body: event.body,
                        headers: getHeadersMap(event.headers),
                        status: event.status,
                        statusText: event.statusText,
                        url: event.url || '',
                        responseType: req.responseType,
                    });
                }
            }));
        }
    }
}
TransferHttpCacheInterceptor.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheInterceptor, deps: [{ token: i0.ApplicationRef }, { token: i1.TransferState }], target: i0.ɵɵFactoryTarget.Injectable });
TransferHttpCacheInterceptor.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheInterceptor });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheInterceptor, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i0.ApplicationRef }, { type: i1.TransferState }]; } });
/**
 * An NgModule used in conjunction with `ServerTransferHttpCacheModule` to transfer cached HTTP
 * calls from the server to the client application.
 */
export class TransferHttpCacheModule {
}
TransferHttpCacheModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
TransferHttpCacheModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheModule, imports: [BrowserTransferStateModule] });
TransferHttpCacheModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheModule, providers: [
        TransferHttpCacheInterceptor,
        { provide: HTTP_INTERCEPTORS, useExisting: TransferHttpCacheInterceptor, multi: true },
    ], imports: [BrowserTransferStateModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [BrowserTransferStateModule],
                    providers: [
                        TransferHttpCacheInterceptor,
                        { provide: HTTP_INTERCEPTORS, useExisting: TransferHttpCacheInterceptor, multi: true },
                    ],
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmZXJfaHR0cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL21vZHVsZXMvY29tbW9uL3NyYy90cmFuc2Zlcl9odHRwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFDTCxpQkFBaUIsRUFHakIsV0FBVyxFQUlYLFlBQVksR0FDYixNQUFNLHNCQUFzQixDQUFDO0FBQzlCLE9BQU8sRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNyRSxPQUFPLEVBQ0wsMEJBQTBCLEVBRTFCLGFBQWEsRUFDYixZQUFZLEdBQ2IsTUFBTSwyQkFBMkIsQ0FBQztBQUNuQyxPQUFPLEVBQWMsRUFBRSxJQUFJLFlBQVksRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUN0RCxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQzs7O0FBYW5ELFNBQVMsYUFBYSxDQUFDLE9BQW9CO0lBQ3pDLE1BQU0sVUFBVSxHQUE2QixFQUFFLENBQUM7SUFDaEQsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDaEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7WUFDbkIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQztTQUMxQjtLQUNGO0lBRUQsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQztBQUdELE1BQU0sT0FBTyw0QkFBNEI7SUFHL0Isb0JBQW9CLENBQUMsR0FBVztRQUN0QyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUN2RCxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUN4RSxDQUFDO0lBQ0osQ0FBQztJQUVPLFlBQVksQ0FDbEIsTUFBYyxFQUNkLEdBQVcsRUFDWCxNQUFrQixFQUNsQixZQUEwQjtRQUUxQixpRUFBaUU7UUFDakUsTUFBTSxhQUFhLEdBQUcsTUFBTTthQUN6QixJQUFJLEVBQUU7YUFDTixJQUFJLEVBQUU7YUFDTixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzthQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFYixNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLGFBQWEsQ0FBQztRQUU5RixPQUFPLFlBQVksQ0FBdUIsR0FBRyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELFlBQVksTUFBc0IsRUFBVSxhQUE0QjtRQUE1QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQTFCaEUsa0JBQWEsR0FBRyxJQUFJLENBQUM7UUEyQjNCLDBGQUEwRjtRQUMxRixZQUFZO1FBQ1osTUFBTSxDQUFDLFFBQVE7YUFDWixJQUFJLENBQ0gsTUFBTSxDQUFDLENBQUMsUUFBaUIsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQ3ZDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDUjthQUNBLFNBQVMsQ0FBQyxHQUFHLEVBQUU7WUFDZCxJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCxTQUFTLENBQUMsR0FBcUIsRUFBRSxJQUFpQjtRQUNoRCxvREFBb0Q7UUFDcEQsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEtBQUssSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRTtZQUNqRCxJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztZQUMzQixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3BDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDdkIsdURBQXVEO1lBQ3ZELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN6QjtRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRXRGLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDdkMsNENBQTRDO1lBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN0RCxJQUFJLElBQUksR0FBNEMsUUFBUSxDQUFDLElBQUksQ0FBQztZQUVsRSxRQUFRLFFBQVEsQ0FBQyxZQUFZLEVBQUU7Z0JBQzdCLEtBQUssYUFBYTtvQkFDaEI7d0JBQ0Usc0JBQXNCO3dCQUN0QixJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRTs0QkFDakMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ3ZDLElBQUksR0FBRyxJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7NEJBQ25DLE1BQU0sSUFBSSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtnQ0FDbkMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzs2QkFDbEI7eUJBQ0Y7NkJBQU0sSUFBSSxPQUFPLFdBQVcsS0FBSyxXQUFXLEVBQUU7NEJBQzdDLHdDQUF3Qzs0QkFDeEMsSUFBSSxHQUFHLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUM7eUJBQ3ZEO3FCQUNGO29CQUNELE1BQU07Z0JBQ1IsS0FBSyxNQUFNO29CQUNULElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNqQyxNQUFNO2FBQ1Q7WUFFRCxPQUFPLFlBQVksQ0FDakIsSUFBSSxZQUFZLENBQU07Z0JBQ3BCLElBQUk7Z0JBQ0osT0FBTyxFQUFFLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7Z0JBQzFDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTtnQkFDdkIsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO2dCQUMvQixHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUc7YUFDbEIsQ0FBQyxDQUNILENBQUM7U0FDSDthQUFNO1lBQ0wsNkRBQTZEO1lBQzdELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFbkMsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUNuQixHQUFHLENBQUMsQ0FBQyxLQUF5QixFQUFFLEVBQUU7Z0JBQ2hDLElBQUksS0FBSyxZQUFZLFlBQVksRUFBRTtvQkFDakMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQXVCLFFBQVEsRUFBRTt3QkFDckQsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO3dCQUNoQixPQUFPLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7d0JBQ3JDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTt3QkFDcEIsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO3dCQUM1QixHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxFQUFFO3dCQUNwQixZQUFZLEVBQUUsR0FBRyxDQUFDLFlBQVk7cUJBQy9CLENBQUMsQ0FBQztpQkFDSjtZQUNILENBQUMsQ0FBQyxDQUNILENBQUM7U0FDSDtJQUNILENBQUM7O3lIQTdHVSw0QkFBNEI7NkhBQTVCLDRCQUE0QjsyRkFBNUIsNEJBQTRCO2tCQUR4QyxVQUFVOztBQWlIWDs7O0dBR0c7QUFRSCxNQUFNLE9BQU8sdUJBQXVCOztvSEFBdkIsdUJBQXVCO3FIQUF2Qix1QkFBdUIsWUFOeEIsMEJBQTBCO3FIQU16Qix1QkFBdUIsYUFMdkI7UUFDVCw0QkFBNEI7UUFDNUIsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLDRCQUE0QixFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7S0FDdkYsWUFKUywwQkFBMEI7MkZBTXpCLHVCQUF1QjtrQkFQbkMsUUFBUTttQkFBQztvQkFDUixPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQztvQkFDckMsU0FBUyxFQUFFO3dCQUNULDRCQUE0Qjt3QkFDNUIsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLDRCQUE0QixFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7cUJBQ3ZGO2lCQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIEhUVFBfSU5URVJDRVBUT1JTLFxuICBIdHRwRXZlbnQsXG4gIEh0dHBIYW5kbGVyLFxuICBIdHRwSGVhZGVycyxcbiAgSHR0cEludGVyY2VwdG9yLFxuICBIdHRwUGFyYW1zLFxuICBIdHRwUmVxdWVzdCxcbiAgSHR0cFJlc3BvbnNlLFxufSBmcm9tICdAYW5ndWxhci9jb21tb24vaHR0cCc7XG5pbXBvcnQgeyBBcHBsaWNhdGlvblJlZiwgSW5qZWN0YWJsZSwgTmdNb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7XG4gIEJyb3dzZXJUcmFuc2ZlclN0YXRlTW9kdWxlLFxuICBTdGF0ZUtleSxcbiAgVHJhbnNmZXJTdGF0ZSxcbiAgbWFrZVN0YXRlS2V5LFxufSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyJztcbmltcG9ydCB7IE9ic2VydmFibGUsIG9mIGFzIG9ic2VydmFibGVPZiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZmlsdGVyLCB0YWtlLCB0YXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbnR5cGUgUmVzcG9uc2VUeXBlID0gSHR0cFJlcXVlc3Q8dW5rbm93bj5bJ3Jlc3BvbnNlVHlwZSddO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRyYW5zZmVySHR0cFJlc3BvbnNlIHtcbiAgYm9keT86IGFueSB8IG51bGw7XG4gIGhlYWRlcnM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT47XG4gIHN0YXR1cz86IG51bWJlcjtcbiAgc3RhdHVzVGV4dD86IHN0cmluZztcbiAgdXJsPzogc3RyaW5nO1xuICByZXNwb25zZVR5cGU/OiBSZXNwb25zZVR5cGU7XG59XG5cbmZ1bmN0aW9uIGdldEhlYWRlcnNNYXAoaGVhZGVyczogSHR0cEhlYWRlcnMpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4ge1xuICBjb25zdCBoZWFkZXJzTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7fTtcbiAgZm9yIChjb25zdCBrZXkgb2YgaGVhZGVycy5rZXlzKCkpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBoZWFkZXJzLmdldEFsbChrZXkpO1xuICAgIGlmICh2YWx1ZXMgIT09IG51bGwpIHtcbiAgICAgIGhlYWRlcnNNYXBba2V5XSA9IHZhbHVlcztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaGVhZGVyc01hcDtcbn1cblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFRyYW5zZmVySHR0cENhY2hlSW50ZXJjZXB0b3IgaW1wbGVtZW50cyBIdHRwSW50ZXJjZXB0b3Ige1xuICBwcml2YXRlIGlzQ2FjaGVBY3RpdmUgPSB0cnVlO1xuXG4gIHByaXZhdGUgaW52YWxpZGF0ZUNhY2hlRW50cnkodXJsOiBzdHJpbmcpIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLnRyYW5zZmVyU3RhdGVbJ3N0b3JlJ10pLmZvckVhY2goKGtleSkgPT5cbiAgICAgIGtleS5pbmNsdWRlcyh1cmwpID8gdGhpcy50cmFuc2ZlclN0YXRlLnJlbW92ZShtYWtlU3RhdGVLZXkoa2V5KSkgOiBudWxsLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIG1ha2VDYWNoZUtleShcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICB1cmw6IHN0cmluZyxcbiAgICBwYXJhbXM6IEh0dHBQYXJhbXMsXG4gICAgcmVzcG9uc2VUeXBlOiBSZXNwb25zZVR5cGUsXG4gICk6IFN0YXRlS2V5PFRyYW5zZmVySHR0cFJlc3BvbnNlPiB7XG4gICAgLy8gbWFrZSB0aGUgcGFyYW1zIGVuY29kZWQgc2FtZSBhcyBhIHVybCBzbyBpdCdzIGVhc3kgdG8gaWRlbnRpZnlcbiAgICBjb25zdCBlbmNvZGVkUGFyYW1zID0gcGFyYW1zXG4gICAgICAua2V5cygpXG4gICAgICAuc29ydCgpXG4gICAgICAubWFwKChrKSA9PiBgJHtrfT0ke3BhcmFtcy5nZXRBbGwoayl9YClcbiAgICAgIC5qb2luKCcmJyk7XG5cbiAgICBjb25zdCBrZXkgPSAobWV0aG9kID09PSAnR0VUJyA/ICdHLicgOiAnSC4nKSArIHJlc3BvbnNlVHlwZSArICcuJyArIHVybCArICc/JyArIGVuY29kZWRQYXJhbXM7XG5cbiAgICByZXR1cm4gbWFrZVN0YXRlS2V5PFRyYW5zZmVySHR0cFJlc3BvbnNlPihrZXkpO1xuICB9XG5cbiAgY29uc3RydWN0b3IoYXBwUmVmOiBBcHBsaWNhdGlvblJlZiwgcHJpdmF0ZSB0cmFuc2ZlclN0YXRlOiBUcmFuc2ZlclN0YXRlKSB7XG4gICAgLy8gU3RvcCB1c2luZyB0aGUgY2FjaGUgaWYgdGhlIGFwcGxpY2F0aW9uIGhhcyBzdGFiaWxpemVkLCBpbmRpY2F0aW5nIGluaXRpYWwgcmVuZGVyaW5nIGlzXG4gICAgLy8gY29tcGxldGUuXG4gICAgYXBwUmVmLmlzU3RhYmxlXG4gICAgICAucGlwZShcbiAgICAgICAgZmlsdGVyKChpc1N0YWJsZTogYm9vbGVhbikgPT4gaXNTdGFibGUpLFxuICAgICAgICB0YWtlKDEpLFxuICAgICAgKVxuICAgICAgLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICAgIHRoaXMuaXNDYWNoZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgfSk7XG4gIH1cblxuICBpbnRlcmNlcHQocmVxOiBIdHRwUmVxdWVzdDxhbnk+LCBuZXh0OiBIdHRwSGFuZGxlcik6IE9ic2VydmFibGU8SHR0cEV2ZW50PGFueT4+IHtcbiAgICAvLyBTdG9wIHVzaW5nIHRoZSBjYWNoZSBpZiB0aGVyZSBpcyBhIG11dGF0aW5nIGNhbGwuXG4gICAgaWYgKHJlcS5tZXRob2QgIT09ICdHRVQnICYmIHJlcS5tZXRob2QgIT09ICdIRUFEJykge1xuICAgICAgdGhpcy5pc0NhY2hlQWN0aXZlID0gZmFsc2U7XG4gICAgICB0aGlzLmludmFsaWRhdGVDYWNoZUVudHJ5KHJlcS51cmwpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5pc0NhY2hlQWN0aXZlKSB7XG4gICAgICAvLyBDYWNoZSBpcyBubyBsb25nZXIgYWN0aXZlLiBQYXNzIHRoZSByZXF1ZXN0IHRocm91Z2guXG4gICAgICByZXR1cm4gbmV4dC5oYW5kbGUocmVxKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdG9yZUtleSA9IHRoaXMubWFrZUNhY2hlS2V5KHJlcS5tZXRob2QsIHJlcS51cmwsIHJlcS5wYXJhbXMsIHJlcS5yZXNwb25zZVR5cGUpO1xuXG4gICAgaWYgKHRoaXMudHJhbnNmZXJTdGF0ZS5oYXNLZXkoc3RvcmVLZXkpKSB7XG4gICAgICAvLyBSZXF1ZXN0IGZvdW5kIGluIGNhY2hlLiBSZXNwb25kIHVzaW5nIGl0LlxuICAgICAgY29uc3QgcmVzcG9uc2UgPSB0aGlzLnRyYW5zZmVyU3RhdGUuZ2V0KHN0b3JlS2V5LCB7fSk7XG4gICAgICBsZXQgYm9keTogQXJyYXlCdWZmZXIgfCBCbG9iIHwgc3RyaW5nIHwgdW5kZWZpbmVkID0gcmVzcG9uc2UuYm9keTtcblxuICAgICAgc3dpdGNoIChyZXNwb25zZS5yZXNwb25zZVR5cGUpIHtcbiAgICAgICAgY2FzZSAnYXJyYXlidWZmZXInOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIC8vIElmIHdlJ3JlIGluIE5vZGUuLi5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICBjb25zdCBidWYgPSBCdWZmZXIuZnJvbShyZXNwb25zZS5ib2R5KTtcbiAgICAgICAgICAgICAgYm9keSA9IG5ldyBBcnJheUJ1ZmZlcihidWYubGVuZ3RoKTtcbiAgICAgICAgICAgICAgY29uc3QgdmlldyA9IG5ldyBVaW50OEFycmF5KGJvZHkpO1xuICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJ1Zi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgIHZpZXdbaV0gPSBidWZbaV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIFRleHRFbmNvZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAvLyBNb2Rlcm4gYnJvd3NlcnMgaW1wbGVtZW50IFRleHRFbmNvZGUuXG4gICAgICAgICAgICAgIGJvZHkgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUocmVzcG9uc2UuYm9keSkuYnVmZmVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnYmxvYic6XG4gICAgICAgICAgYm9keSA9IG5ldyBCbG9iKFtyZXNwb25zZS5ib2R5XSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYnNlcnZhYmxlT2YoXG4gICAgICAgIG5ldyBIdHRwUmVzcG9uc2U8YW55Pih7XG4gICAgICAgICAgYm9keSxcbiAgICAgICAgICBoZWFkZXJzOiBuZXcgSHR0cEhlYWRlcnMocmVzcG9uc2UuaGVhZGVycyksXG4gICAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dCxcbiAgICAgICAgICB1cmw6IHJlc3BvbnNlLnVybCxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBSZXF1ZXN0IG5vdCBmb3VuZCBpbiBjYWNoZS4gTWFrZSB0aGUgcmVxdWVzdCBhbmQgY2FjaGUgaXQuXG4gICAgICBjb25zdCBodHRwRXZlbnQgPSBuZXh0LmhhbmRsZShyZXEpO1xuXG4gICAgICByZXR1cm4gaHR0cEV2ZW50LnBpcGUoXG4gICAgICAgIHRhcCgoZXZlbnQ6IEh0dHBFdmVudDx1bmtub3duPikgPT4ge1xuICAgICAgICAgIGlmIChldmVudCBpbnN0YW5jZW9mIEh0dHBSZXNwb25zZSkge1xuICAgICAgICAgICAgdGhpcy50cmFuc2ZlclN0YXRlLnNldDxUcmFuc2Zlckh0dHBSZXNwb25zZT4oc3RvcmVLZXksIHtcbiAgICAgICAgICAgICAgYm9keTogZXZlbnQuYm9keSxcbiAgICAgICAgICAgICAgaGVhZGVyczogZ2V0SGVhZGVyc01hcChldmVudC5oZWFkZXJzKSxcbiAgICAgICAgICAgICAgc3RhdHVzOiBldmVudC5zdGF0dXMsXG4gICAgICAgICAgICAgIHN0YXR1c1RleHQ6IGV2ZW50LnN0YXR1c1RleHQsXG4gICAgICAgICAgICAgIHVybDogZXZlbnQudXJsIHx8ICcnLFxuICAgICAgICAgICAgICByZXNwb25zZVR5cGU6IHJlcS5yZXNwb25zZVR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBOZ01vZHVsZSB1c2VkIGluIGNvbmp1bmN0aW9uIHdpdGggYFNlcnZlclRyYW5zZmVySHR0cENhY2hlTW9kdWxlYCB0byB0cmFuc2ZlciBjYWNoZWQgSFRUUFxuICogY2FsbHMgZnJvbSB0aGUgc2VydmVyIHRvIHRoZSBjbGllbnQgYXBwbGljYXRpb24uXG4gKi9cbkBOZ01vZHVsZSh7XG4gIGltcG9ydHM6IFtCcm93c2VyVHJhbnNmZXJTdGF0ZU1vZHVsZV0sXG4gIHByb3ZpZGVyczogW1xuICAgIFRyYW5zZmVySHR0cENhY2hlSW50ZXJjZXB0b3IsXG4gICAgeyBwcm92aWRlOiBIVFRQX0lOVEVSQ0VQVE9SUywgdXNlRXhpc3Rpbmc6IFRyYW5zZmVySHR0cENhY2hlSW50ZXJjZXB0b3IsIG11bHRpOiB0cnVlIH0sXG4gIF0sXG59KVxuZXhwb3J0IGNsYXNzIFRyYW5zZmVySHR0cENhY2hlTW9kdWxlIHt9XG4iXX0=