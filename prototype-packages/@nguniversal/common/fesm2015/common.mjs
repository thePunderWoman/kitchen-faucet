import { HttpResponse, HttpHeaders, HTTP_INTERCEPTORS } from '@angular/common/http';
import * as i0 from '@angular/core';
import { Injectable, NgModule, APP_INITIALIZER } from '@angular/core';
import * as i1 from '@angular/platform-browser';
import { makeStateKey, BrowserTransferStateModule } from '@angular/platform-browser';
import { of } from 'rxjs';
import { filter, take, tap } from 'rxjs/operators';
import { DOCUMENT } from '@angular/common';

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
class TransferHttpCacheInterceptor {
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
            return of(new HttpResponse({
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
class TransferHttpCacheModule {
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

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function domContentLoadedFactory(doc) {
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
class StateTransferInitializerModule {
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

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * Generated bundle index. Do not edit.
 */

export { StateTransferInitializerModule, TransferHttpCacheModule, TransferHttpCacheInterceptor as ɵTransferHttpCacheInterceptor };
//# sourceMappingURL=common.mjs.map
