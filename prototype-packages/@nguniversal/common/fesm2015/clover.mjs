import { ɵgetDOM, DOCUMENT, ɵPLATFORM_SERVER_ID } from '@angular/common';
import * as i0 from '@angular/core';
import { APP_ID, Injectable, Inject, Optional, PLATFORM_ID, NgModule } from '@angular/core';
import * as i1 from '@angular/platform-browser';
import { ɵSharedStylesHost, ɵescapeHtml, ɵDomSharedStylesHost, BrowserModule, makeStateKey, BrowserTransferStateModule } from '@angular/platform-browser';
import { filter, take, mapTo, tap } from 'rxjs/operators';
import { HttpResponse, HttpHeaders, HTTP_INTERCEPTORS } from '@angular/common/http';
import { of } from 'rxjs';

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class SSRStylesHost extends ɵSharedStylesHost {
    constructor(doc, appId) {
        var _a;
        super();
        this.doc = doc;
        this.appId = appId;
        this._styleNodes = new Set();
        this.head = this.doc.querySelector('head');
        const styles = (_a = this.head) === null || _a === void 0 ? void 0 : _a.querySelectorAll(`style[ng-style='${this.appId}']`);
        if (styles === null || styles === void 0 ? void 0 : styles.length) {
            const items = Array.from(styles);
            this._styleNodesInDOM = new Map(items.map((el) => [el.textContent, el]));
        }
    }
    _addStyle(style) {
        var _a, _b;
        const element = (_a = this._styleNodesInDOM) === null || _a === void 0 ? void 0 : _a.get(style);
        if (element) {
            if (typeof ngDevMode !== 'undefined' && ngDevMode) {
                element.setAttribute('_ng-style-re-used', '');
            }
            (_b = this._styleNodesInDOM) === null || _b === void 0 ? void 0 : _b.delete(style);
            this._styleNodes.add(element);
            return;
        }
        const el = ɵgetDOM().createElement('style');
        el.textContent = style;
        if (this.appId) {
            el.setAttribute('ng-style', this.appId);
        }
        if (this.head) {
            this.head.appendChild(el);
        }
        this._styleNodes.add(el);
    }
    onStylesAdded(additions) {
        additions.forEach((style) => this._addStyle(style));
    }
    addHost(_hostNode) {
        // stub
    }
    removeHost(_hostNode) {
        // stub
    }
    ngOnDestroy() {
        this._styleNodes.forEach((styleNode) => styleNode.remove());
    }
}
SSRStylesHost.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: SSRStylesHost, deps: [{ token: DOCUMENT }, { token: APP_ID, optional: true }], target: i0.ɵɵFactoryTarget.Injectable });
SSRStylesHost.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: SSRStylesHost });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: SSRStylesHost, decorators: [{
            type: Injectable
        }], ctorParameters: function () {
        return [{ type: Document, decorators: [{
                        type: Inject,
                        args: [DOCUMENT]
                    }] }, { type: undefined, decorators: [{
                        type: Optional
                    }, {
                        type: Inject,
                        args: [APP_ID]
                    }] }];
    } });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class RendererModule {
    constructor(applicationRef, transferState, appId) {
        this.applicationRef = applicationRef;
        this.transferState = transferState;
        this.appId = appId;
        if (typeof ngRenderMode !== 'undefined' && ngRenderMode) {
            ngRenderMode = {
                getSerializedState: () => this.transferState ? ɵescapeHtml(this.transferState.toJson()) : undefined,
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
                        { provide: PLATFORM_ID, useValue: ɵPLATFORM_SERVER_ID },
                        { provide: SSRStylesHost, useClass: SSRStylesHost, deps: [DOCUMENT, APP_ID] },
                    ]
                    : [{ provide: SSRStylesHost, useClass: SSRStylesHost, deps: [DOCUMENT] }]),
                { provide: ɵSharedStylesHost, useExisting: SSRStylesHost },
                { provide: ɵDomSharedStylesHost, useClass: SSRStylesHost },
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
        }], ctorParameters: function () {
        return [{ type: i0.ApplicationRef }, { type: i1.TransferState, decorators: [{
                        type: Optional
                    }] }, { type: undefined, decorators: [{
                        type: Optional
                    }, {
                        type: Inject,
                        args: [APP_ID]
                    }] }];
    } });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class TransferHttpCacheInterceptor {
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
            .pipe(filter((isStable) => isStable), take(1), tap(() => (this.isCacheActive = false)))
            .subscribe();
    }
    intercept(req, next) {
        if (!this.isCacheActive || !['GET', 'HEAD'].includes(req.method)) {
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
        // Request not found in cache. Make the request and cache it.
        const httpEvent = next.handle(req);
        return httpEvent.pipe(tap((event) => {
            var _a;
            if (event instanceof HttpResponse) {
                this.transferState.set(storeKey, {
                    body: event.body,
                    headers: this.getHeaders(event.headers),
                    status: event.status,
                    statusText: event.statusText,
                    url: (_a = event.url) !== null && _a !== void 0 ? _a : '',
                    responseType: req.responseType,
                });
            }
        }));
    }
    getHeaders(headers) {
        const headersMap = {};
        for (const key of headers.keys()) {
            const value = headers.getAll(key);
            if (typeof value === 'string') {
                headersMap[key] = value;
            }
        }
        return headersMap;
    }
}
TransferHttpCacheInterceptor.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheInterceptor, deps: [{ token: i0.ApplicationRef }, { token: i1.TransferState }], target: i0.ɵɵFactoryTarget.Injectable });
TransferHttpCacheInterceptor.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheInterceptor });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheInterceptor, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i0.ApplicationRef }, { type: i1.TransferState }]; } });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
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

export { RendererModule, TransferHttpCacheModule };
//# sourceMappingURL=clover.mjs.map
