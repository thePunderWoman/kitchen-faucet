import { ApplicationRef } from '@angular/core';
import * as i0 from '@angular/core';
import * as i1 from '@angular/platform-browser';
import { ModuleWithProviders } from '@angular/core';
import { TransferState } from '@angular/platform-browser';

export declare class RendererModule {
    private applicationRef;
    private transferState?;
    private appId?;
    constructor(applicationRef: ApplicationRef, transferState?: TransferState | undefined, appId?: string | undefined);
    static forRoot(): ModuleWithProviders<RendererModule>;
    static ɵfac: i0.ɵɵFactoryDeclaration<RendererModule, [null, { optional: true; }, { optional: true; }]>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<RendererModule, never, never, [typeof i1.BrowserModule]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<RendererModule>;
}

export declare class TransferHttpCacheModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<TransferHttpCacheModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<TransferHttpCacheModule, never, [typeof i1.BrowserTransferStateModule], never>;
    static ɵinj: i0.ɵɵInjectorDeclaration<TransferHttpCacheModule>;
}

export declare type ɵNGRenderMode = boolean | undefined | ɵNGRenderModeAPI;

export declare interface ɵNGRenderModeAPI {
    getSerializedState: () => string | undefined;
    getWhenStable: () => Promise<void>;
    appId?: string;
}

export { }
