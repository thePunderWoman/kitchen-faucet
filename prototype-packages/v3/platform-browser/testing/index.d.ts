/**
 * @license Angular v15.1.0-next.2+sha-aab62c7-with-local-changes
 * (c) 2010-2022 Google LLC. https://angular.io/
 * License: MIT
 */


import * as i0 from '@angular/core';
import * as i1 from '@angular/platform-browser';
import { PlatformRef } from '@angular/core';
import { StaticProvider } from '@angular/core';

/**
 * NgModule for testing.
 *
 * @publicApi
 */
export declare class BrowserTestingModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<BrowserTestingModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<BrowserTestingModule, never, never, [typeof i1.BrowserModule]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<BrowserTestingModule>;
}

/**
 * Platform for testing
 *
 * @publicApi
 */
export declare const platformBrowserTesting: (extraProviders?: StaticProvider[] | undefined) => PlatformRef;

export { }