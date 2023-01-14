import { ApplicationRef } from '@angular/core';
import { HttpEvent } from '@angular/common/http';
import { HttpHandler } from '@angular/common/http';
import { HttpInterceptor } from '@angular/common/http';
import { HttpRequest } from '@angular/common/http';
import * as i0 from '@angular/core';
import * as i1 from '@angular/platform-browser';
import { Observable } from 'rxjs';
import { TransferState } from '@angular/platform-browser';

export declare class StateTransferInitializerModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<StateTransferInitializerModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<StateTransferInitializerModule, never, never, never>;
    static ɵinj: i0.ɵɵInjectorDeclaration<StateTransferInitializerModule>;
}

/**
 * An NgModule used in conjunction with `ServerTransferHttpCacheModule` to transfer cached HTTP
 * calls from the server to the client application.
 */
export declare class TransferHttpCacheModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<TransferHttpCacheModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<TransferHttpCacheModule, never, [typeof i1.BrowserTransferStateModule], never>;
    static ɵinj: i0.ɵɵInjectorDeclaration<TransferHttpCacheModule>;
}

export declare class ɵTransferHttpCacheInterceptor implements HttpInterceptor {
    private transferState;
    private isCacheActive;
    private invalidateCacheEntry;
    private makeCacheKey;
    constructor(appRef: ApplicationRef, transferState: TransferState);
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>;
    static ɵfac: i0.ɵɵFactoryDeclaration<ɵTransferHttpCacheInterceptor, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<ɵTransferHttpCacheInterceptor>;
}

export { }
