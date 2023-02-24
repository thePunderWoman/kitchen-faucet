/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CommonModule, DOCUMENT, XhrFactory, ɵPLATFORM_BROWSER_ID as PLATFORM_BROWSER_ID } from '@angular/common';
import { APP_ID, ApplicationModule, createPlatformFactory, ErrorHandler, inject, Inject, InjectionToken, makeEnvironmentProviders, NgModule, NgZone, Optional, PLATFORM_ID, PLATFORM_INITIALIZER, platformCore, RendererFactory2, SkipSelf, Testability, TestabilityRegistry, ɵINJECTOR_SCOPE as INJECTOR_SCOPE, ɵinternalCreateApplication as internalCreateApplication, ɵinternalProvideHydrationSupport as internalProvideHydrationSupport, ɵsetDocument, ɵTESTABILITY as TESTABILITY, ɵTESTABILITY_GETTER as TESTABILITY_GETTER, ɵTRANSFER_STATE as TRANSFER_STATE } from '@angular/core';
import { BrowserDomAdapter } from './browser/browser_adapter';
import { BrowserGetTestability } from './browser/testability';
import { BrowserXhr } from './browser/xhr';
import { DomRendererFactory2, REMOVE_STYLES_ON_COMPONENT_DESTROY } from './dom/dom_renderer';
import { DomEventsPlugin } from './dom/events/dom_events';
import { EVENT_MANAGER_PLUGINS, EventManager } from './dom/events/event_manager';
import { KeyEventsPlugin } from './dom/events/key_events';
import { DomSharedStylesHost, SharedStylesHost } from './dom/shared_styles_host';
import { TransferState } from './platform-browser';
import * as i0 from "@angular/core";
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || !!ngDevMode;
/**
 * Bootstraps an instance of an Angular application and renders a standalone component as the
 * application's root component. More information about standalone components can be found in [this
 * guide](guide/standalone-components).
 *
 * @usageNotes
 * The root component passed into this function *must* be a standalone one (should have the
 * `standalone: true` flag in the `@Component` decorator config).
 *
 * ```typescript
 * @Component({
 *   standalone: true,
 *   template: 'Hello world!'
 * })
 * class RootComponent {}
 *
 * const appRef: ApplicationRef = await bootstrapApplication(RootComponent);
 * ```
 *
 * You can add the list of providers that should be available in the application injector by
 * specifying the `providers` field in an object passed as the second argument:
 *
 * ```typescript
 * await bootstrapApplication(RootComponent, {
 *   providers: [
 *     {provide: BACKEND_URL, useValue: 'https://yourdomain.com/api'}
 *   ]
 * });
 * ```
 *
 * The `importProvidersFrom` helper method can be used to collect all providers from any
 * existing NgModule (and transitively from all NgModules that it imports):
 *
 * ```typescript
 * await bootstrapApplication(RootComponent, {
 *   providers: [
 *     importProvidersFrom(SomeNgModule)
 *   ]
 * });
 * ```
 *
 * Note: the `bootstrapApplication` method doesn't include [Testability](api/core/Testability) by
 * default. You can add [Testability](api/core/Testability) by getting the list of necessary
 * providers using `provideProtractorTestingSupport()` function and adding them into the `providers`
 * array, for example:
 *
 * ```typescript
 * import {provideProtractorTestingSupport} from '@angular/platform-browser';
 *
 * await bootstrapApplication(RootComponent, {providers: [provideProtractorTestingSupport()]});
 * ```
 *
 * @param rootComponent A reference to a standalone component that should be rendered.
 * @param options Extra configuration for the bootstrap operation, see `ApplicationConfig` for
 *     additional info.
 * @returns A promise that returns an `ApplicationRef` instance once resolved.
 *
 * @publicApi
 */
export function bootstrapApplication(rootComponent, options) {
    return internalCreateApplication({ rootComponent, ...createProvidersConfig(options) });
}
/**
 * Create an instance of an Angular application without bootstrapping any components. This is useful
 * for the situation where one wants to decouple application environment creation (a platform and
 * associated injectors) from rendering components on a screen. Components can be subsequently
 * bootstrapped on the returned `ApplicationRef`.
 *
 * @param options Extra configuration for the application environment, see `ApplicationConfig` for
 *     additional info.
 * @returns A promise that returns an `ApplicationRef` instance once resolved.
 *
 * @publicApi
 */
export function createApplication(options) {
    return internalCreateApplication(createProvidersConfig(options));
}
function createProvidersConfig(options) {
    return {
        appProviders: [
            ...BROWSER_MODULE_PROVIDERS,
            ...(options?.providers ?? []),
        ],
        platformProviders: INTERNAL_BROWSER_PLATFORM_PROVIDERS
    };
}
/**
 * Returns a set of providers required to setup [Testability](api/core/Testability) for an
 * application bootstrapped using the `bootstrapApplication` function. The set of providers is
 * needed to support testing an application with Protractor (which relies on the Testability APIs
 * to be present).
 *
 * @returns An array of providers required to setup Testability for an application and make it
 *     available for testing using Protractor.
 *
 * @publicApi
 */
export function provideProtractorTestingSupport() {
    // Return a copy to prevent changes to the original array in case any in-place
    // alterations are performed to the `provideProtractorTestingSupport` call results in app code.
    return [...TESTABILITY_PROVIDERS];
}
/**
 * TODO: add docs
 *
 * @publicApi
 * @developerPreview
 */
export function provideHydrationSupport() {
    return makeEnvironmentProviders([
        ...internalProvideHydrationSupport(),
        { provide: TRANSFER_STATE, useFactory: () => inject(TransferState) }
    ]);
}
export function initDomAdapter() {
    BrowserDomAdapter.makeCurrent();
}
export function errorHandler() {
    return new ErrorHandler();
}
export function _document() {
    // Tell ivy about the global document
    ɵsetDocument(document);
    return document;
}
export const INTERNAL_BROWSER_PLATFORM_PROVIDERS = [
    { provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID },
    { provide: PLATFORM_INITIALIZER, useValue: initDomAdapter, multi: true },
    { provide: DOCUMENT, useFactory: _document, deps: [] },
];
/**
 * A factory function that returns a `PlatformRef` instance associated with browser service
 * providers.
 *
 * @publicApi
 */
export const platformBrowser = createPlatformFactory(platformCore, 'browser', INTERNAL_BROWSER_PLATFORM_PROVIDERS);
/**
 * Internal marker to signal whether providers from the `BrowserModule` are already present in DI.
 * This is needed to avoid loading `BrowserModule` providers twice. We can't rely on the
 * `BrowserModule` presence itself, since the standalone-based bootstrap just imports
 * `BrowserModule` providers without referencing the module itself.
 */
const BROWSER_MODULE_PROVIDERS_MARKER = new InjectionToken(NG_DEV_MODE ? 'BrowserModule Providers Marker' : '');
const TESTABILITY_PROVIDERS = [
    {
        provide: TESTABILITY_GETTER,
        useClass: BrowserGetTestability,
        deps: [],
    },
    {
        provide: TESTABILITY,
        useClass: Testability,
        deps: [NgZone, TestabilityRegistry, TESTABILITY_GETTER]
    },
    {
        provide: Testability,
        useClass: Testability,
        deps: [NgZone, TestabilityRegistry, TESTABILITY_GETTER]
    }
];
const BROWSER_MODULE_PROVIDERS = [
    { provide: INJECTOR_SCOPE, useValue: 'root' },
    { provide: ErrorHandler, useFactory: errorHandler, deps: [] }, {
        provide: EVENT_MANAGER_PLUGINS,
        useClass: DomEventsPlugin,
        multi: true,
        deps: [DOCUMENT, NgZone, PLATFORM_ID]
    },
    { provide: EVENT_MANAGER_PLUGINS, useClass: KeyEventsPlugin, multi: true, deps: [DOCUMENT] }, {
        provide: DomRendererFactory2,
        useClass: DomRendererFactory2,
        deps: [EventManager, DomSharedStylesHost, APP_ID, REMOVE_STYLES_ON_COMPONENT_DESTROY]
    },
    { provide: RendererFactory2, useExisting: DomRendererFactory2 },
    { provide: SharedStylesHost, useExisting: DomSharedStylesHost }, DomSharedStylesHost, EventManager,
    { provide: XhrFactory, useClass: BrowserXhr, deps: [] },
    NG_DEV_MODE ? { provide: BROWSER_MODULE_PROVIDERS_MARKER, useValue: true } : []
];
/**
 * Exports required infrastructure for all Angular apps.
 * Included by default in all Angular apps created with the CLI
 * `new` command.
 * Re-exports `CommonModule` and `ApplicationModule`, making their
 * exports and providers available to all apps.
 *
 * @publicApi
 */
export class BrowserModule {
    constructor(providersAlreadyPresent) {
        if (NG_DEV_MODE && providersAlreadyPresent) {
            throw new Error(`Providers from the \`BrowserModule\` have already been loaded. If you need access ` +
                `to common directives such as NgIf and NgFor, import the \`CommonModule\` instead.`);
        }
    }
    /**
     * Configures a browser-based app to transition from a server-rendered app, if
     * one is present on the page.
     *
     * @param params An object containing an identifier for the app to transition.
     * The ID must match between the client and server versions of the app.
     * @returns The reconfigured `BrowserModule` to import into the app's root `AppModule`.
     */
    static withServerTransition(params) {
        return {
            ngModule: BrowserModule,
            providers: [
                { provide: APP_ID, useValue: params.appId },
            ],
        };
    }
}
BrowserModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.2.0+sha-e45a8b6-with-local-changes", ngImport: i0, type: BrowserModule, deps: [{ token: BROWSER_MODULE_PROVIDERS_MARKER, optional: true, skipSelf: true }], target: i0.ɵɵFactoryTarget.NgModule });
BrowserModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.2.0+sha-e45a8b6-with-local-changes", ngImport: i0, type: BrowserModule, exports: [CommonModule, ApplicationModule] });
BrowserModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.2.0+sha-e45a8b6-with-local-changes", ngImport: i0, type: BrowserModule, providers: [...BROWSER_MODULE_PROVIDERS, ...TESTABILITY_PROVIDERS], imports: [CommonModule, ApplicationModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.2.0+sha-e45a8b6-with-local-changes", ngImport: i0, type: BrowserModule, decorators: [{
            type: NgModule,
            args: [{
                    providers: [...BROWSER_MODULE_PROVIDERS, ...TESTABILITY_PROVIDERS],
                    exports: [CommonModule, ApplicationModule],
                }]
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: SkipSelf
                }, {
                    type: Inject,
                    args: [BROWSER_MODULE_PROVIDERS_MARKER]
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3BsYXRmb3JtLWJyb3dzZXIvc3JjL2Jyb3dzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixJQUFJLG1CQUFtQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDaEgsT0FBTyxFQUFDLE1BQU0sRUFBRSxpQkFBaUIsRUFBa0IscUJBQXFCLEVBQXdCLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBdUIsUUFBUSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLG9CQUFvQixFQUFFLFlBQVksRUFBeUIsZ0JBQWdCLEVBQUUsUUFBUSxFQUFrQixXQUFXLEVBQUUsbUJBQW1CLEVBQVEsZUFBZSxJQUFJLGNBQWMsRUFBRSwwQkFBMEIsSUFBSSx5QkFBeUIsRUFBRSxnQ0FBZ0MsSUFBSSwrQkFBK0IsRUFBRSxZQUFZLEVBQUUsWUFBWSxJQUFJLFdBQVcsRUFBRSxtQkFBbUIsSUFBSSxrQkFBa0IsRUFBRSxlQUFlLElBQUksY0FBYyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRXBxQixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUM1RCxPQUFPLEVBQUMscUJBQXFCLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3pDLE9BQU8sRUFBQyxtQkFBbUIsRUFBRSxrQ0FBa0MsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQzNGLE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMscUJBQXFCLEVBQUUsWUFBWSxFQUFDLE1BQU0sNEJBQTRCLENB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ckQsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7Q0FDOUUsQ0FBQztBQUVGOzs7Ozs7OztHQVFHO0FBS0gsTUFBTSxPQUFPLGFBQWE7SUFDeEIsWUFDWSx1QkFBcUM7UUFDL0MsSUFBSSxXQUFXLElBQUksdUJBQXVCLEVBQUU7WUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FDWCxvRkFBb0Y7Z0JBQ3BGLG1GQUFtRixDQUFDLENBQUM7U0FDMUY7SUFDSCxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxNQUF1QjtRQUNqRCxPQUFPO1lBQ0wsUUFBUSxFQUFFLGFBQWE7WUFDdkIsU0FBUyxFQUFFO2dCQUNULEVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBQzthQUMxQztTQUNGLENBQUM7SUFDSixDQUFDOztxSEF6QlUsYUFBYSxrQkFDb0IsK0JBQStCO3NIQURoRSxhQUFhLFlBRmQsWUFBWSxFQUFFLGlCQUFpQjtzSEFFOUIsYUFBYSxhQUhiLENBQUMsR0FBRyx3QkFBd0IsRUFBRSxHQUFHLHFCQUFxQixDQUFDLFlBQ3hELFlBQVksRUFBRSxpQkFBaUI7c0dBRTlCLGFBQWE7a0JBSnpCLFFBQVE7bUJBQUM7b0JBQ1IsU0FBUyxFQUFFLENBQUMsR0FBRyx3QkFBd0IsRUFBRSxHQUFHLHFCQUFxQixDQUFDO29CQUNsRSxPQUFPLEVBQUUsQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLENBQUM7aUJBQzNDOzswQkFFYyxRQUFROzswQkFBSSxRQUFROzswQkFBSSxNQUFNOzJCQUFDLCtCQUErQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbW1vbk1vZHVsZSwgRE9DVU1FTlQsIFhockZhY3RvcnksIMm1UExBVEZPUk1fQlJPV1NFUl9JRCBhcyBQTEFURk9STV9CUk9XU0VSX0lEfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBUFBfSUQsIEFwcGxpY2F0aW9uTW9kdWxlLCBBcHBsaWNhdGlvblJlZiwgY3JlYXRlUGxhdGZvcm1GYWN0b3J5LCBFbnZpcm9ubWVudFByb3ZpZGVycywgRXJyb3JIYW5kbGVyLCBpbmplY3QsIEluamVjdCwgSW5qZWN0aW9uVG9rZW4sIG1ha2VFbnZpcm9ubWVudFByb3ZpZGVycywgTW9kdWxlV2l0aFByb3ZpZGVycywgTmdNb2R1bGUsIE5nWm9uZSwgT3B0aW9uYWwsIFBMQVRGT1JNX0lELCBQTEFURk9STV9JTklUSUFMSVpFUiwgcGxhdGZvcm1Db3JlLCBQbGF0Zm9ybVJlZiwgUHJvdmlkZXIsIFJlbmRlcmVyRmFjdG9yeTIsIFNraXBTZWxmLCBTdGF0aWNQcm92aWRlciwgVGVzdGFiaWxpdHksIFRlc3RhYmlsaXR5UmVnaXN0cnksIFR5cGUsIMm1SU5KRUNUT1JfU0NPUEUgYXMgSU5KRUNUT1JfU0NPUEUsIMm1aW50ZXJuYWxDcmVhdGVBcHBsaWNhdGlvbiBhcyBpbnRlcm5hbENyZWF0ZUFwcGxpY2F0aW9uLCDJtWludGVybmFsUHJvdmlkZUh5ZHJhdGlvblN1cHBvcnQgYXMgaW50ZXJuYWxQcm92aWRlSHlkcmF0aW9uU3VwcG9ydCwgybVzZXREb2N1bWVudCwgybVURVNUQUJJTElUWSBhcyBURVNUQUJJTElUWSwgybVURVNUQUJJTElUWV9HRVRURVIgYXMgVEVTVEFCSUxJVFlfR0VUVEVSLCDJtVRSQU5TRkVSX1NUQVRFIGFzIFRSQU5TRkVSX1NUQVRFfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtCcm93c2VyRG9tQWRhcHRlcn0gZnJvbSAnLi9icm93c2VyL2Jyb3dzZXJfYWRhcHRlcic7XG5pbXBvcnQge0Jyb3dzZXJHZXRUZXN0YWJpbGl0eX0gZnJvbSAnLi9icm93c2VyL3Rlc3RhYmlsaXR5JztcbmltcG9ydCB7QnJvd3Nlclhocn0gZnJvbSAnLi9icm93c2VyL3hocic7XG5pbXBvcnQge0RvbVJlbmRlcmVyRmFjdG9yeTIsIFJFTU9WRV9TVFlMRVNfT05fQ09NUE9ORU5UX0RFU1RST1l9IGZyb20gJy4vZG9tL2RvbV9yZW5kZXJlcic7XG5pbXBvcnQge0RvbUV2ZW50c1BsdWdpbn0gZnJvbSAnLi9kb20vZXZlbnRzL2RvbV9ldmVudHMnO1xuaW1wb3J0IHtFVkVOVF9NQU5BR0VSX1BMVUdJTlMsIEV2ZW50TWFuYWdlcn0gZnJvbSAnLi9kb20vZXZlbnRzL2V2ZW50X21hbmFnZXInO1xuaW1wb3J0IHtLZXlFdmVudHNQbHVnaW59IGZyb20gJy4vZG9tL2V2ZW50cy9rZXlfZXZlbnRzJztcbmltcG9ydCB7RG9tU2hhcmVkU3R5bGVzSG9zdCwgU2hhcmVkU3R5bGVzSG9zdH0gZnJvbSAnLi9kb20vc2hhcmVkX3N0eWxlc19ob3N0JztcbmltcG9ydCB7VHJhbnNmZXJTdGF0ZX0gZnJvbSAnLi9wbGF0Zm9ybS1icm93c2VyJztcblxuY29uc3QgTkdfREVWX01PREUgPSB0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCAhIW5nRGV2TW9kZTtcblxuLyoqXG4gKiBTZXQgb2YgY29uZmlnIG9wdGlvbnMgYXZhaWxhYmxlIGR1cmluZyB0aGUgYXBwbGljYXRpb24gYm9vdHN0cmFwIG9wZXJhdGlvbi5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwbGljYXRpb25Db25maWcge1xuICAvKipcbiAgICogTGlzdCBvZiBwcm92aWRlcnMgdGhhdCBzaG91bGQgYmUgYXZhaWxhYmxlIHRvIHRoZSByb290IGNvbXBvbmVudCBhbmQgYWxsIGl0cyBjaGlsZHJlbi5cbiAgICovXG4gIHByb3ZpZGVyczogQXJyYXk8UHJvdmlkZXJ8RW52aXJvbm1lbnRQcm92aWRlcnM+O1xufVxuXG4vKipcbiAqIEJvb3RzdHJhcHMgYW4gaW5zdGFuY2Ugb2YgYW4gQW5ndWxhciBhcHBsaWNhdGlvbiBhbmQgcmVuZGVycyBhIHN0YW5kYWxvbmUgY29tcG9uZW50IGFzIHRoZVxuICogYXBwbGljYXRpb24ncyByb290IGNvbXBvbmVudC4gTW9yZSBpbmZvcm1hdGlvbiBhYm91dCBzdGFuZGFsb25lIGNvbXBvbmVudHMgY2FuIGJlIGZvdW5kIGluIFt0aGlzXG4gKiBndWlkZV0oZ3VpZGUvc3RhbmRhbG9uZS1jb21wb25lbnRzKS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICogVGhlIHJvb3QgY29tcG9uZW50IHBhc3NlZCBpbnRvIHRoaXMgZnVuY3Rpb24gKm11c3QqIGJlIGEgc3RhbmRhbG9uZSBvbmUgKHNob3VsZCBoYXZlIHRoZVxuICogYHN0YW5kYWxvbmU6IHRydWVgIGZsYWcgaW4gdGhlIGBAQ29tcG9uZW50YCBkZWNvcmF0b3IgY29uZmlnKS5cbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBAQ29tcG9uZW50KHtcbiAqICAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAqICAgdGVtcGxhdGU6ICdIZWxsbyB3b3JsZCEnXG4gKiB9KVxuICogY2xhc3MgUm9vdENvbXBvbmVudCB7fVxuICpcbiAqIGNvbnN0IGFwcFJlZjogQXBwbGljYXRpb25SZWYgPSBhd2FpdCBib290c3RyYXBBcHBsaWNhdGlvbihSb290Q29tcG9uZW50KTtcbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gYWRkIHRoZSBsaXN0IG9mIHByb3ZpZGVycyB0aGF0IHNob3VsZCBiZSBhdmFpbGFibGUgaW4gdGhlIGFwcGxpY2F0aW9uIGluamVjdG9yIGJ5XG4gKiBzcGVjaWZ5aW5nIHRoZSBgcHJvdmlkZXJzYCBmaWVsZCBpbiBhbiBvYmplY3QgcGFzc2VkIGFzIHRoZSBzZWNvbmQgYXJndW1lbnQ6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogYXdhaXQgYm9vdHN0cmFwQXBwbGljYXRpb24oUm9vdENvbXBvbmVudCwge1xuICogICBwcm92aWRlcnM6IFtcbiAqICAgICB7cHJvdmlkZTogQkFDS0VORF9VUkwsIHVzZVZhbHVlOiAnaHR0cHM6Ly95b3VyZG9tYWluLmNvbS9hcGknfVxuICogICBdXG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIFRoZSBgaW1wb3J0UHJvdmlkZXJzRnJvbWAgaGVscGVyIG1ldGhvZCBjYW4gYmUgdXNlZCB0byBjb2xsZWN0IGFsbCBwcm92aWRlcnMgZnJvbSBhbnlcbiAqIGV4aXN0aW5nIE5nTW9kdWxlIChhbmQgdHJhbnNpdGl2ZWx5IGZyb20gYWxsIE5nTW9kdWxlcyB0aGF0IGl0IGltcG9ydHMpOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGF3YWl0IGJvb3RzdHJhcEFwcGxpY2F0aW9uKFJvb3RDb21wb25lbnQsIHtcbiAqICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgaW1wb3J0UHJvdmlkZXJzRnJvbShTb21lTmdNb2R1bGUpXG4gKiAgIF1cbiAqIH0pO1xuICogYGBgXG4gKlxuICogTm90ZTogdGhlIGBib290c3RyYXBBcHBsaWNhdGlvbmAgbWV0aG9kIGRvZXNuJ3QgaW5jbHVkZSBbVGVzdGFiaWxpdHldKGFwaS9jb3JlL1Rlc3RhYmlsaXR5KSBieVxuICogZGVmYXVsdC4gWW91IGNhbiBhZGQgW1Rlc3RhYmlsaXR5XShhcGkvY29yZS9UZXN0YWJpbGl0eSkgYnkgZ2V0dGluZyB0aGUgbGlzdCBvZiBuZWNlc3NhcnlcbiAqIHByb3ZpZGVycyB1c2luZyBgcHJvdmlkZVByb3RyYWN0b3JUZXN0aW5nU3VwcG9ydCgpYCBmdW5jdGlvbiBhbmQgYWRkaW5nIHRoZW0gaW50byB0aGUgYHByb3ZpZGVyc2BcbiAqIGFycmF5LCBmb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQge3Byb3ZpZGVQcm90cmFjdG9yVGVzdGluZ1N1cHBvcnR9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXInO1xuICpcbiAqIGF3YWl0IGJvb3RzdHJhcEFwcGxpY2F0aW9uKFJvb3RDb21wb25lbnQsIHtwcm92aWRlcnM6IFtwcm92aWRlUHJvdHJhY3RvclRlc3RpbmdTdXBwb3J0KCldfSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gcm9vdENvbXBvbmVudCBBIHJlZmVyZW5jZSB0byBhIHN0YW5kYWxvbmUgY29tcG9uZW50IHRoYXQgc2hvdWxkIGJlIHJlbmRlcmVkLlxuICogQHBhcmFtIG9wdGlvbnMgRXh0cmEgY29uZmlndXJhdGlvbiBmb3IgdGhlIGJvb3RzdHJhcCBvcGVyYXRpb24sIHNlZSBgQXBwbGljYXRpb25Db25maWdgIGZvclxuICogICAgIGFkZGl0aW9uYWwgaW5mby5cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJldHVybnMgYW4gYEFwcGxpY2F0aW9uUmVmYCBpbnN0YW5jZSBvbmNlIHJlc29sdmVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJvb3RzdHJhcEFwcGxpY2F0aW9uKFxuICAgIHJvb3RDb21wb25lbnQ6IFR5cGU8dW5rbm93bj4sIG9wdGlvbnM/OiBBcHBsaWNhdGlvbkNvbmZpZyk6IFByb21pc2U8QXBwbGljYXRpb25SZWY+IHtcbiAgcmV0dXJuIGludGVybmFsQ3JlYXRlQXBwbGljYXRpb24oe3Jvb3RDb21wb25lbnQsIC4uLmNyZWF0ZVByb3ZpZGVyc0NvbmZpZyhvcHRpb25zKX0pO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiBhbiBBbmd1bGFyIGFwcGxpY2F0aW9uIHdpdGhvdXQgYm9vdHN0cmFwcGluZyBhbnkgY29tcG9uZW50cy4gVGhpcyBpcyB1c2VmdWxcbiAqIGZvciB0aGUgc2l0dWF0aW9uIHdoZXJlIG9uZSB3YW50cyB0byBkZWNvdXBsZSBhcHBsaWNhdGlvbiBlbnZpcm9ubWVudCBjcmVhdGlvbiAoYSBwbGF0Zm9ybSBhbmRcbiAqIGFzc29jaWF0ZWQgaW5qZWN0b3JzKSBmcm9tIHJlbmRlcmluZyBjb21wb25lbnRzIG9uIGEgc2NyZWVuLiBDb21wb25lbnRzIGNhbiBiZSBzdWJzZXF1ZW50bHlcbiAqIGJvb3RzdHJhcHBlZCBvbiB0aGUgcmV0dXJuZWQgYEFwcGxpY2F0aW9uUmVmYC5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBFeHRyYSBjb25maWd1cmF0aW9uIGZvciB0aGUgYXBwbGljYXRpb24gZW52aXJvbm1lbnQsIHNlZSBgQXBwbGljYXRpb25Db25maWdgIGZvclxuICogICAgIGFkZGl0aW9uYWwgaW5mby5cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJldHVybnMgYW4gYEFwcGxpY2F0aW9uUmVmYCBpbnN0YW5jZSBvbmNlIHJlc29sdmVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUFwcGxpY2F0aW9uKG9wdGlvbnM/OiBBcHBsaWNhdGlvbkNvbmZpZykge1xuICByZXR1cm4gaW50ZXJuYWxDcmVhdGVBcHBsaWNhdGlvbihjcmVhdGVQcm92aWRlcnNDb25maWcob3B0aW9ucykpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQcm92aWRlcnNDb25maWcob3B0aW9ucz86IEFwcGxpY2F0aW9uQ29uZmlnKSB7XG4gIHJldHVybiB7XG4gICAgYXBwUHJvdmlkZXJzOiBbXG4gICAgICAuLi5CUk9XU0VSX01PRFVMRV9QUk9WSURFUlMsXG4gICAgICAuLi4ob3B0aW9ucz8ucHJvdmlkZXJzID8/IFtdKSxcbiAgICBdLFxuICAgIHBsYXRmb3JtUHJvdmlkZXJzOiBJTlRFUk5BTF9CUk9XU0VSX1BMQVRGT1JNX1BST1ZJREVSU1xuICB9O1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBzZXQgb2YgcHJvdmlkZXJzIHJlcXVpcmVkIHRvIHNldHVwIFtUZXN0YWJpbGl0eV0oYXBpL2NvcmUvVGVzdGFiaWxpdHkpIGZvciBhblxuICogYXBwbGljYXRpb24gYm9vdHN0cmFwcGVkIHVzaW5nIHRoZSBgYm9vdHN0cmFwQXBwbGljYXRpb25gIGZ1bmN0aW9uLiBUaGUgc2V0IG9mIHByb3ZpZGVycyBpc1xuICogbmVlZGVkIHRvIHN1cHBvcnQgdGVzdGluZyBhbiBhcHBsaWNhdGlvbiB3aXRoIFByb3RyYWN0b3IgKHdoaWNoIHJlbGllcyBvbiB0aGUgVGVzdGFiaWxpdHkgQVBJc1xuICogdG8gYmUgcHJlc2VudCkuXG4gKlxuICogQHJldHVybnMgQW4gYXJyYXkgb2YgcHJvdmlkZXJzIHJlcXVpcmVkIHRvIHNldHVwIFRlc3RhYmlsaXR5IGZvciBhbiBhcHBsaWNhdGlvbiBhbmQgbWFrZSBpdFxuICogICAgIGF2YWlsYWJsZSBmb3IgdGVzdGluZyB1c2luZyBQcm90cmFjdG9yLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVQcm90cmFjdG9yVGVzdGluZ1N1cHBvcnQoKTogUHJvdmlkZXJbXSB7XG4gIC8vIFJldHVybiBhIGNvcHkgdG8gcHJldmVudCBjaGFuZ2VzIHRvIHRoZSBvcmlnaW5hbCBhcnJheSBpbiBjYXNlIGFueSBpbi1wbGFjZVxuICAvLyBhbHRlcmF0aW9ucyBhcmUgcGVyZm9ybWVkIHRvIHRoZSBgcHJvdmlkZVByb3RyYWN0b3JUZXN0aW5nU3VwcG9ydGAgY2FsbCByZXN1bHRzIGluIGFwcCBjb2RlLlxuICByZXR1cm4gWy4uLlRFU1RBQklMSVRZX1BST1ZJREVSU107XG59XG5cbi8qKlxuICogVE9ETzogYWRkIGRvY3NcbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAZGV2ZWxvcGVyUHJldmlld1xuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZUh5ZHJhdGlvblN1cHBvcnQoKTogRW52aXJvbm1lbnRQcm92aWRlcnMge1xuICByZXR1cm4gbWFrZUVudmlyb25tZW50UHJvdmlkZXJzKFtcbiAgICAuLi5pbnRlcm5hbFByb3ZpZGVIeWRyYXRpb25TdXBwb3J0KCksXG4gICAge3Byb3ZpZGU6IFRSQU5TRkVSX1NUQVRFLCB1c2VGYWN0b3J5OiAoKSA9PiBpbmplY3QoVHJhbnNmZXJTdGF0ZSl9XG4gIF0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdERvbUFkYXB0ZXIoKSB7XG4gIEJyb3dzZXJEb21BZGFwdGVyLm1ha2VDdXJyZW50KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcnJvckhhbmRsZXIoKTogRXJyb3JIYW5kbGVyIHtcbiAgcmV0dXJuIG5ldyBFcnJvckhhbmRsZXIoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9kb2N1bWVudCgpOiBhbnkge1xuICAvLyBUZWxsIGl2eSBhYm91dCB0aGUgZ2xvYmFsIGRvY3VtZW50XG4gIMm1c2V0RG9jdW1lbnQoZG9jdW1lbnQpO1xuICByZXR1cm4gZG9jdW1lbnQ7XG59XG5cbmV4cG9ydCBjb25zdCBJTlRFUk5BTF9CUk9XU0VSX1BMQVRGT1JNX1BST1ZJREVSUzogU3RhdGljUHJvdmlkZXJbXSA9IFtcbiAge3Byb3ZpZGU6IFBMQVRGT1JNX0lELCB1c2VWYWx1ZTogUExBVEZPUk1fQlJPV1NFUl9JRH0sXG4gIHtwcm92aWRlOiBQTEFURk9STV9JTklUSUFMSVpFUiwgdXNlVmFsdWU6IGluaXREb21BZGFwdGVyLCBtdWx0aTogdHJ1ZX0sXG4gIHtwcm92aWRlOiBET0NVTUVOVCwgdXNlRmFjdG9yeTogX2RvY3VtZW50LCBkZXBzOiBbXX0sXG5dO1xuXG4vKipcbiAqIEEgZmFjdG9yeSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBgUGxhdGZvcm1SZWZgIGluc3RhbmNlIGFzc29jaWF0ZWQgd2l0aCBicm93c2VyIHNlcnZpY2VcbiAqIHByb3ZpZGVycy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjb25zdCBwbGF0Zm9ybUJyb3dzZXI6IChleHRyYVByb3ZpZGVycz86IFN0YXRpY1Byb3ZpZGVyW10pID0+IFBsYXRmb3JtUmVmID1cbiAgICBjcmVhdGVQbGF0Zm9ybUZhY3RvcnkocGxhdGZvcm1Db3JlLCAnYnJvd3NlcicsIElOVEVSTkFMX0JST1dTRVJfUExBVEZPUk1fUFJPVklERVJTKTtcblxuLyoqXG4gKiBJbnRlcm5hbCBtYXJrZXIgdG8gc2lnbmFsIHdoZXRoZXIgcHJvdmlkZXJzIGZyb20gdGhlIGBCcm93c2VyTW9kdWxlYCBhcmUgYWxyZWFkeSBwcmVzZW50IGluIERJLlxuICogVGhpcyBpcyBuZWVkZWQgdG8gYXZvaWQgbG9hZGluZyBgQnJvd3Nlck1vZHVsZWAgcHJvdmlkZXJzIHR3aWNlLiBXZSBjYW4ndCByZWx5IG9uIHRoZVxuICogYEJyb3dzZXJNb2R1bGVgIHByZXNlbmNlIGl0c2VsZiwgc2luY2UgdGhlIHN0YW5kYWxvbmUtYmFzZWQgYm9vdHN0cmFwIGp1c3QgaW1wb3J0c1xuICogYEJyb3dzZXJNb2R1bGVgIHByb3ZpZGVycyB3aXRob3V0IHJlZmVyZW5jaW5nIHRoZSBtb2R1bGUgaXRzZWxmLlxuICovXG5jb25zdCBCUk9XU0VSX01PRFVMRV9QUk9WSURFUlNfTUFSS0VSID1cbiAgICBuZXcgSW5qZWN0aW9uVG9rZW4oTkdfREVWX01PREUgPyAnQnJvd3Nlck1vZHVsZSBQcm92aWRlcnMgTWFya2VyJyA6ICcnKTtcblxuY29uc3QgVEVTVEFCSUxJVFlfUFJPVklERVJTID0gW1xuICB7XG4gICAgcHJvdmlkZTogVEVTVEFCSUxJVFlfR0VUVEVSLFxuICAgIHVzZUNsYXNzOiBCcm93c2VyR2V0VGVzdGFiaWxpdHksXG4gICAgZGVwczogW10sXG4gIH0sXG4gIHtcbiAgICBwcm92aWRlOiBURVNUQUJJTElUWSxcbiAgICB1c2VDbGFzczogVGVzdGFiaWxpdHksXG4gICAgZGVwczogW05nWm9uZSwgVGVzdGFiaWxpdHlSZWdpc3RyeSwgVEVTVEFCSUxJVFlfR0VUVEVSXVxuICB9LFxuICB7XG4gICAgcHJvdmlkZTogVGVzdGFiaWxpdHksICAvLyBBbHNvIHByb3ZpZGUgYXMgYFRlc3RhYmlsaXR5YCBmb3IgYmFja3dhcmRzLWNvbXBhdGliaWxpdHkuXG4gICAgdXNlQ2xhc3M6IFRlc3RhYmlsaXR5LFxuICAgIGRlcHM6IFtOZ1pvbmUsIFRlc3RhYmlsaXR5UmVnaXN0cnksIFRFU1RBQklMSVRZX0dFVFRFUl1cbiAgfVxuXTtcblxuY29uc3QgQlJPV1NFUl9NT0RVTEVfUFJPVklERVJTOiBQcm92aWRlcltdID0gW1xuICB7cHJvdmlkZTogSU5KRUNUT1JfU0NPUEUsIHVzZVZhbHVlOiAncm9vdCd9LFxuICB7cHJvdmlkZTogRXJyb3JIYW5kbGVyLCB1c2VGYWN0b3J5OiBlcnJvckhhbmRsZXIsIGRlcHM6IFtdfSwge1xuICAgIHByb3ZpZGU6IEVWRU5UX01BTkFHRVJfUExVR0lOUyxcbiAgICB1c2VDbGFzczogRG9tRXZlbnRzUGx1Z2luLFxuICAgIG11bHRpOiB0cnVlLFxuICAgIGRlcHM6IFtET0NVTUVOVCwgTmdab25lLCBQTEFURk9STV9JRF1cbiAgfSxcbiAge3Byb3ZpZGU6IEVWRU5UX01BTkFHRVJfUExVR0lOUywgdXNlQ2xhc3M6IEtleUV2ZW50c1BsdWdpbiwgbXVsdGk6IHRydWUsIGRlcHM6IFtET0NVTUVOVF19LCB7XG4gICAgcHJvdmlkZTogRG9tUmVuZGVyZXJGYWN0b3J5MixcbiAgICB1c2VDbGFzczogRG9tUmVuZGVyZXJGYWN0b3J5MixcbiAgICBkZXBzOiBbRXZlbnRNYW5hZ2VyLCBEb21TaGFyZWRTdHlsZXNIb3N0LCBBUFBfSUQsIFJFTU9WRV9TVFlMRVNfT05fQ09NUE9ORU5UX0RFU1RST1ldXG4gIH0sXG4gIHtwcm92aWRlOiBSZW5kZXJlckZhY3RvcnkyLCB1c2VFeGlzdGluZzogRG9tUmVuZGVyZXJGYWN0b3J5Mn0sXG4gIHtwcm92aWRlOiBTaGFyZWRTdHlsZXNIb3N0LCB1c2VFeGlzdGluZzogRG9tU2hhcmVkU3R5bGVzSG9zdH0sIERvbVNoYXJlZFN0eWxlc0hvc3QsIEV2ZW50TWFuYWdlcixcbiAge3Byb3ZpZGU6IFhockZhY3RvcnksIHVzZUNsYXNzOiBCcm93c2VyWGhyLCBkZXBzOiBbXX0sXG4gIE5HX0RFVl9NT0RFID8ge3Byb3ZpZGU6IEJST1dTRVJfTU9EVUxFX1BST1ZJREVSU19NQVJLRVIsIHVzZVZhbHVlOiB0cnVlfSA6IFtdXG5dO1xuXG4vKipcbiAqIEV4cG9ydHMgcmVxdWlyZWQgaW5mcmFzdHJ1Y3R1cmUgZm9yIGFsbCBBbmd1bGFyIGFwcHMuXG4gKiBJbmNsdWRlZCBieSBkZWZhdWx0IGluIGFsbCBBbmd1bGFyIGFwcHMgY3JlYXRlZCB3aXRoIHRoZSBDTElcbiAqIGBuZXdgIGNvbW1hbmQuXG4gKiBSZS1leHBvcnRzIGBDb21tb25Nb2R1bGVgIGFuZCBgQXBwbGljYXRpb25Nb2R1bGVgLCBtYWtpbmcgdGhlaXJcbiAqIGV4cG9ydHMgYW5kIHByb3ZpZGVycyBhdmFpbGFibGUgdG8gYWxsIGFwcHMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ATmdNb2R1bGUoe1xuICBwcm92aWRlcnM6IFsuLi5CUk9XU0VSX01PRFVMRV9QUk9WSURFUlMsIC4uLlRFU1RBQklMSVRZX1BST1ZJREVSU10sXG4gIGV4cG9ydHM6IFtDb21tb25Nb2R1bGUsIEFwcGxpY2F0aW9uTW9kdWxlXSxcbn0pXG5leHBvcnQgY2xhc3MgQnJvd3Nlck1vZHVsZSB7XG4gIGNvbnN0cnVjdG9yKEBPcHRpb25hbCgpIEBTa2lwU2VsZigpIEBJbmplY3QoQlJPV1NFUl9NT0RVTEVfUFJPVklERVJTX01BUktFUilcbiAgICAgICAgICAgICAgcHJvdmlkZXJzQWxyZWFkeVByZXNlbnQ6IGJvb2xlYW58bnVsbCkge1xuICAgIGlmIChOR19ERVZfTU9ERSAmJiBwcm92aWRlcnNBbHJlYWR5UHJlc2VudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBQcm92aWRlcnMgZnJvbSB0aGUgXFxgQnJvd3Nlck1vZHVsZVxcYCBoYXZlIGFscmVhZHkgYmVlbiBsb2FkZWQuIElmIHlvdSBuZWVkIGFjY2VzcyBgICtcbiAgICAgICAgICBgdG8gY29tbW9uIGRpcmVjdGl2ZXMgc3VjaCBhcyBOZ0lmIGFuZCBOZ0ZvciwgaW1wb3J0IHRoZSBcXGBDb21tb25Nb2R1bGVcXGAgaW5zdGVhZC5gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29uZmlndXJlcyBhIGJyb3dzZXItYmFzZWQgYXBwIHRvIHRyYW5zaXRpb24gZnJvbSBhIHNlcnZlci1yZW5kZXJlZCBhcHAsIGlmXG4gICAqIG9uZSBpcyBwcmVzZW50IG9uIHRoZSBwYWdlLlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIEFuIG9iamVjdCBjb250YWluaW5nIGFuIGlkZW50aWZpZXIgZm9yIHRoZSBhcHAgdG8gdHJhbnNpdGlvbi5cbiAgICogVGhlIElEIG11c3QgbWF0Y2ggYmV0d2VlbiB0aGUgY2xpZW50IGFuZCBzZXJ2ZXIgdmVyc2lvbnMgb2YgdGhlIGFwcC5cbiAgICogQHJldHVybnMgVGhlIHJlY29uZmlndXJlZCBgQnJvd3Nlck1vZHVsZWAgdG8gaW1wb3J0IGludG8gdGhlIGFwcCdzIHJvb3QgYEFwcE1vZHVsZWAuXG4gICAqL1xuICBzdGF0aWMgd2l0aFNlcnZlclRyYW5zaXRpb24ocGFyYW1zOiB7YXBwSWQ6IHN0cmluZ30pOiBNb2R1bGVXaXRoUHJvdmlkZXJzPEJyb3dzZXJNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IEJyb3dzZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAge3Byb3ZpZGU6IEFQUF9JRCwgdXNlVmFsdWU6IHBhcmFtcy5hcHBJZH0sXG4gICAgICBdLFxuICAgIH07XG4gIH1cbn1cbiJdfQ==