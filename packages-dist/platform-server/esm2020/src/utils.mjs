/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { APP_ID, ApplicationRef, importProvidersFrom, InjectionToken, Renderer2, ɵannotateForHydration as annotateForHydration, ɵgetSsrProfiler as getSsrProfiler, ɵinternalCreateApplication as internalCreateApplication, ɵIS_HYDRATION_FEATURE_ENABLED as IS_HYDRATION_FEATURE_ENABLED, ɵisPromise } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { first } from 'rxjs/operators';
import { PlatformState } from './platform_state';
import { platformDynamicServer, platformServer, ServerModule } from './server';
import { BEFORE_APP_SERIALIZED, INITIAL_CONFIG } from './tokens';
import { TRANSFER_STATE_SERIALIZATION_PROVIDERS } from './transfer_state';
function _getPlatform(platformFactory, options) {
    const extraProviders = options.platformProviders ?? [];
    return platformFactory([
        { provide: INITIAL_CONFIG, useValue: { document: options.document, url: options.url } },
        extraProviders,
    ]);
}
/**
 * Adds the `ng-server-context` attribute to host elements of all bootstrapped components
 * within a given application.
 */
function appendServerContextInfo(serverContext, applicationRef) {
    applicationRef.components.forEach((componentRef) => {
        const renderer = componentRef.injector.get(Renderer2);
        const element = componentRef.location.nativeElement;
        if (element) {
            renderer.setAttribute(element, 'ng-server-context', serverContext);
        }
    });
}
function _render(platform, bootstrapPromise, profiler) {
    return bootstrapPromise.then((moduleOrApplicationRef) => {
        const environmentInjector = moduleOrApplicationRef.injector;
        const transitionId = environmentInjector.get(APP_ID, null);
        if (!transitionId) {
            throw new Error(`renderModule[Factory]() requires the use of BrowserModule.withServerTransition() to ensure
the server-rendered app can be properly bootstrapped into a client app.`);
        }
        const applicationRef = moduleOrApplicationRef instanceof ApplicationRef ?
            moduleOrApplicationRef :
            environmentInjector.get(ApplicationRef);
        const serverContext = sanitizeServerContext(environmentInjector.get(SERVER_CONTEXT, DEFAULT_SERVER_CONTEXT));
        return applicationRef.isStable.pipe(first((isStable) => isStable))
            .toPromise()
            .then(() => {
            appendServerContextInfo(serverContext, applicationRef);
            const platformState = platform.injector.get(PlatformState);
            const asyncPromises = [];
            // Run any BEFORE_APP_SERIALIZED callbacks just before rendering to string.
            const callbacks = environmentInjector.get(BEFORE_APP_SERIALIZED, null);
            if (callbacks) {
                for (const callback of callbacks) {
                    try {
                        const callbackResult = callback();
                        if (ɵisPromise(callbackResult)) {
                            // TODO: in TS3.7, callbackResult is void.
                            asyncPromises.push(callbackResult);
                        }
                    }
                    catch (e) {
                        // Ignore exceptions.
                        console.warn('Ignoring BEFORE_APP_SERIALIZED Exception: ', e);
                    }
                }
            }
            const complete = () => {
                if (applicationRef.injector.get(IS_HYDRATION_FEATURE_ENABLED, false)) {
                    const annotate = () => annotateForHydration(applicationRef, platformState.getDocument(), profiler);
                    if (profiler) {
                        profiler.invokeAndMeasure(annotate, "Overall hydration time (in ms)" /* SsrPerfMetrics.OverallHydrationTime */);
                    }
                    else {
                        annotate();
                    }
                }
                const renderToString = () => platformState.renderToString();
                let output;
                if (profiler) {
                    output =
                        profiler?.invokeAndMeasure(renderToString, "Overall DOM serialization time (in ms)" /* SsrPerfMetrics.DomSerializationTime */);
                    profiler.incrementMetricValue("Overall HTML size (in character length)" /* SsrPerfMetrics.OverallHtmlSize */, output.length);
                }
                else {
                    output = renderToString();
                }
                platform.destroy();
                return output;
            };
            if (asyncPromises.length === 0) {
                return complete();
            }
            return Promise
                .all(asyncPromises.map((asyncPromise) => {
                return asyncPromise.catch((e) => {
                    console.warn('Ignoring BEFORE_APP_SERIALIZED Exception: ', e);
                });
            }))
                .then(complete);
        });
    });
}
/**
 * Specifies the value that should be used if no server context value has been provided.
 */
const DEFAULT_SERVER_CONTEXT = 'other';
/**
 * An internal token that allows providing extra information about the server context
 * (e.g. whether SSR or SSG was used). The value is a string and characters other
 * than [a-zA-Z0-9\-] are removed. See the default value in `DEFAULT_SERVER_CONTEXT` const.
 */
export const SERVER_CONTEXT = new InjectionToken('SERVER_CONTEXT');
/**
 * Sanitizes provided server context:
 * - removes all characters other than a-z, A-Z, 0-9 and `-`
 * - returns `other` if nothing is provided or the string is empty after sanitization
 */
function sanitizeServerContext(serverContext) {
    const context = serverContext.replace(/[^a-zA-Z0-9\-]/g, '');
    return context.length > 0 ? context : DEFAULT_SERVER_CONTEXT;
}
/**
 * Bootstraps an application using provided NgModule and serializes the page content to string.
 *
 * @param moduleType A reference to an NgModule that should be used for bootstrap.
 * @param options Additional configuration for the render operation:
 *  - `document` - the document of the page to render, either as an HTML string or
 *                 as a reference to the `document` instance.
 *  - `url` - the URL for the current render request.
 *  - `extraProviders` - set of platform level providers for the current render request.
 *
 * @publicApi
 */
export function renderModule(moduleType, options) {
    const profiler = getSsrProfiler();
    if (profiler) {
        profiler.startTimespan("Overall SSR time (in ms)" /* SsrPerfMetrics.OverallSsrTime */);
    }
    const { document, url, extraProviders: platformProviders } = options;
    const platform = _getPlatform(platformDynamicServer, { document, url, platformProviders });
    const output = _render(platform, platform.bootstrapModule(moduleType), profiler);
    output.then((result) => {
        if (profiler) {
            profiler.stopTimespan("Overall SSR time (in ms)" /* SsrPerfMetrics.OverallSsrTime */);
            const metrics = profiler.serializeMetrics();
            console.log(metrics);
        }
        return result;
    });
    return output;
}
/**
 * Bootstraps an instance of an Angular application and renders it to a string.
 *
 * Note: the root component passed into this function *must* be a standalone one (should have the
 * `standalone: true` flag in the `@Component` decorator config).
 *
 * ```typescript
 * @Component({
 *   standalone: true,
 *   template: 'Hello world!'
 * })
 * class RootComponent {}
 *
 * const output: string = await renderApplication(RootComponent, {appId: 'server-app'});
 * ```
 *
 * @param rootComponent A reference to a Standalone Component that should be rendered.
 * @param options Additional configuration for the render operation:
 *  - `appId` - a string identifier of this application. The appId is used to prefix all
 *              server-generated stylings and state keys of the application in TransferState
 *              use-cases.
 *  - `document` - the document of the page to render, either as an HTML string or
 *                 as a reference to the `document` instance.
 *  - `url` - the URL for the current render request.
 *  - `providers` - set of application level providers for the current render request.
 *  - `platformProviders` - the platform level providers for the current render request.
 *
 * @returns A Promise, that returns serialized (to a string) rendered page, once resolved.
 *
 * @publicApi
 * @developerPreview
 */
export function renderApplication(rootComponent, options) {
    const profiler = getSsrProfiler();
    if (profiler) {
        profiler.startTimespan("Overall SSR time (in ms)" /* SsrPerfMetrics.OverallSsrTime */);
    }
    const { document, url, platformProviders, appId } = options;
    const platform = _getPlatform(platformDynamicServer, { document, url, platformProviders });
    const appProviders = [
        importProvidersFrom(BrowserModule.withServerTransition({ appId })),
        importProvidersFrom(ServerModule),
        ...TRANSFER_STATE_SERIALIZATION_PROVIDERS,
        ...(options.providers ?? []),
    ];
    const output = _render(platform, internalCreateApplication({ rootComponent, appProviders }), profiler);
    output.then((result) => {
        if (profiler) {
            profiler.stopTimespan("Overall SSR time (in ms)" /* SsrPerfMetrics.OverallSsrTime */);
            const metrics = profiler.serializeMetrics();
            console.log(metrics);
        }
        return result;
    });
    return output;
}
/**
 * Bootstraps an application using provided {@link NgModuleFactory} and serializes the page content
 * to string.
 *
 * @param moduleFactory An instance of the {@link NgModuleFactory} that should be used for
 *     bootstrap.
 * @param options Additional configuration for the render operation:
 *  - `document` - the document of the page to render, either as an HTML string or
 *                 as a reference to the `document` instance.
 *  - `url` - the URL for the current render request.
 *  - `extraProviders` - set of platform level providers for the current render request.
 *
 * @publicApi
 *
 * @deprecated
 * This symbol is no longer necessary as of Angular v13.
 * Use {@link renderModule} API instead.
 */
export function renderModuleFactory(moduleFactory, options) {
    const { document, url, extraProviders: platformProviders } = options;
    const platform = _getPlatform(platformServer, { document, url, platformProviders });
    return _render(platform, platform.bootstrapModuleFactory(moduleFactory), null);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1zZXJ2ZXIvc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxNQUFNLEVBQUUsY0FBYyxFQUF3QixtQkFBbUIsRUFBRSxjQUFjLEVBQXVELFNBQVMsRUFBd0IscUJBQXFCLElBQUksb0JBQW9CLEVBQUUsZUFBZSxJQUFJLGNBQWMsRUFBRSwwQkFBMEIsSUFBSSx5QkFBeUIsRUFBRSw2QkFBNkIsSUFBSSw0QkFBNEIsRUFBRSxVQUFVLEVBQWdILE1BQU0sZUFBZSxDQUFDO0FBQzNnQixPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDeEQsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXJDLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQUMscUJBQXFCLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3RSxPQUFPLEVBQUMscUJBQXFCLEVBQUUsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQy9ELE9BQU8sRUFBQyxzQ0FBc0MsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBUXhFLFNBQVMsWUFBWSxDQUNqQixlQUFrRSxFQUNsRSxPQUF3QjtJQUMxQixNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDO0lBQ3ZELE9BQU8sZUFBZSxDQUFDO1FBQ3JCLEVBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsRUFBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBQyxFQUFDO1FBQ25GLGNBQWM7S0FDZixDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7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O0lBRS9FLE1BQU0sRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBQyxHQUFHLE9BQU8sQ0FBQztJQUNuRSxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsY0FBYyxFQUFFLEVBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBQyxDQUFDLENBQUM7SUFDbEYsT0FBTyxPQUFPLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNqRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVBQX0lELCBBcHBsaWNhdGlvblJlZiwgRW52aXJvbm1lbnRQcm92aWRlcnMsIGltcG9ydFByb3ZpZGVyc0Zyb20sIEluamVjdGlvblRva2VuLCBOZ01vZHVsZUZhY3RvcnksIE5nTW9kdWxlUmVmLCBQbGF0Zm9ybVJlZiwgUHJvdmlkZXIsIFJlbmRlcmVyMiwgU3RhdGljUHJvdmlkZXIsIFR5cGUsIMm1YW5ub3RhdGVGb3JIeWRyYXRpb24gYXMgYW5ub3RhdGVGb3JIeWRyYXRpb24sIMm1Z2V0U3NyUHJvZmlsZXIgYXMgZ2V0U3NyUHJvZmlsZXIsIMm1aW50ZXJuYWxDcmVhdGVBcHBsaWNhdGlvbiBhcyBpbnRlcm5hbENyZWF0ZUFwcGxpY2F0aW9uLCDJtUlTX0hZRFJBVElPTl9GRUFUVVJFX0VOQUJMRUQgYXMgSVNfSFlEUkFUSU9OX0ZFQVRVUkVfRU5BQkxFRCwgybVpc1Byb21pc2UsIMm1aXNTc3JQcm9maWxlckVuYWJsZWQgYXMgaXNTc3JQcm9maWxlckVuYWJsZWQsIMm1U3NyUGVyZk1ldHJpY3MgYXMgU3NyUGVyZk1ldHJpY3MsIMm1U3NyUHJvZmlsZXIgYXMgU3NyUHJvZmlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtCcm93c2VyTW9kdWxlfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyJztcbmltcG9ydCB7Zmlyc3R9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtQbGF0Zm9ybVN0YXRlfSBmcm9tICcuL3BsYXRmb3JtX3N0YXRlJztcbmltcG9ydCB7cGxhdGZvcm1EeW5hbWljU2VydmVyLCBwbGF0Zm9ybVNlcnZlciwgU2VydmVyTW9kdWxlfSBmcm9tICcuL3NlcnZlcic7XG5pbXBvcnQge0JFRk9SRV9BUFBfU0VSSUFMSVpFRCwgSU5JVElBTF9DT05GSUd9IGZyb20gJy4vdG9rZW5zJztcbmltcG9ydCB7VFJBTlNGRVJfU1RBVEVfU0VSSUFMSVpBVElPTl9QUk9WSURFUlN9IGZyb20gJy4vdHJhbnNmZXJfc3RhdGUnO1xuXG5pbnRlcmZhY2UgUGxhdGZvcm1PcHRpb25zIHtcbiAgZG9jdW1lbnQ/OiBzdHJpbmd8RG9jdW1lbnQ7XG4gIHVybD86IHN0cmluZztcbiAgcGxhdGZvcm1Qcm92aWRlcnM/OiBQcm92aWRlcltdO1xufVxuXG5mdW5jdGlvbiBfZ2V0UGxhdGZvcm0oXG4gICAgcGxhdGZvcm1GYWN0b3J5OiAoZXh0cmFQcm92aWRlcnM6IFN0YXRpY1Byb3ZpZGVyW10pID0+IFBsYXRmb3JtUmVmLFxuICAgIG9wdGlvbnM6IFBsYXRmb3JtT3B0aW9ucyk6IFBsYXRmb3JtUmVmIHtcbiAgY29uc3QgZXh0cmFQcm92aWRlcnMgPSBvcHRpb25zLnBsYXRmb3JtUHJvdmlkZXJzID8/IFtdO1xuICByZXR1cm4gcGxhdGZvcm1GYWN0b3J5KFtcbiAgICB7cHJvdmlkZTogSU5JVElBTF9DT05GSUcsIHVzZVZhbHVlOiB7ZG9jdW1lbnQ6IG9wdGlvbnMuZG9jdW1lbnQsIHVybDogb3B0aW9ucy51cmx9fSxcbiAgICBleHRyYVByb3ZpZGVycyxcbiAgXSk7XG59XG5cbi8qKlxuICogQWRkcyB0aGUgYG5nLXNlcnZlci1jb250ZXh0YCBhdHRyaWJ1dGUgdG8gaG9zdCBlbGVtZW50cyBvZiBhbGwgYm9vdHN0cmFwcGVkIGNvbXBvbmVudHNcbiAqIHdpdGhpbiBhIGdpdmVuIGFwcGxpY2F0aW9uLlxuICovXG5mdW5jdGlvbiBhcHBlbmRTZXJ2ZXJDb250ZXh0SW5mbyhzZXJ2ZXJDb250ZXh0OiBzdHJpbmcsIGFwcGxpY2F0aW9uUmVmOiBBcHBsaWNhdGlvblJlZikge1xuICBhcHBsaWNhdGlvblJlZi5jb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudFJlZikgPT4ge1xuICAgIGNvbnN0IHJlbmRlcmVyID0gY29tcG9uZW50UmVmLmluamVjdG9yLmdldChSZW5kZXJlcjIpO1xuICAgIGNvbnN0IGVsZW1lbnQgPSBjb21wb25lbnRSZWYubG9jYXRpb24ubmF0aXZlRWxlbWVudDtcbiAgICBpZiAoZWxlbWVudCkge1xuICAgICAgcmVuZGVyZXIuc2V0QXR0cmlidXRlKGVsZW1lbnQsICduZy1zZXJ2ZXItY29udGV4dCcsIHNlcnZlckNvbnRleHQpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIF9yZW5kZXI8VD4oXG4gICAgcGxhdGZvcm06IFBsYXRmb3JtUmVmLCBib290c3RyYXBQcm9taXNlOiBQcm9taXNlPE5nTW9kdWxlUmVmPFQ+fEFwcGxpY2F0aW9uUmVmPixcbiAgICBwcm9maWxlcjogU3NyUHJvZmlsZXJ8bnVsbCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBib290c3RyYXBQcm9taXNlLnRoZW4oKG1vZHVsZU9yQXBwbGljYXRpb25SZWYpID0+IHtcbiAgICBjb25zdCBlbnZpcm9ubWVudEluamVjdG9yID0gbW9kdWxlT3JBcHBsaWNhdGlvblJlZi5pbmplY3RvcjtcbiAgICBjb25zdCB0cmFuc2l0aW9uSWQgPSBlbnZpcm9ubWVudEluamVjdG9yLmdldChBUFBfSUQsIG51bGwpO1xuICAgIGlmICghdHJhbnNpdGlvbklkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYHJlbmRlck1vZHVsZVtGYWN0b3J5XSgpIHJlcXVpcmVzIHRoZSB1c2Ugb2YgQnJvd3Nlck1vZHVsZS53aXRoU2VydmVyVHJhbnNpdGlvbigpIHRvIGVuc3VyZVxudGhlIHNlcnZlci1yZW5kZXJlZCBhcHAgY2FuIGJlIHByb3Blcmx5IGJvb3RzdHJhcHBlZCBpbnRvIGEgY2xpZW50IGFwcC5gKTtcbiAgICB9XG4gICAgY29uc3QgYXBwbGljYXRpb25SZWY6IEFwcGxpY2F0aW9uUmVmID0gbW9kdWxlT3JBcHBsaWNhdGlvblJlZiBpbnN0YW5jZW9mIEFwcGxpY2F0aW9uUmVmID9cbiAgICAgICAgbW9kdWxlT3JBcHBsaWNhdGlvblJlZiA6XG4gICAgICAgIGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KEFwcGxpY2F0aW9uUmVmKTtcbiAgICBjb25zdCBzZXJ2ZXJDb250ZXh0ID1cbiAgICAgICAgc2FuaXRpemVTZXJ2ZXJDb250ZXh0KGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KFNFUlZFUl9DT05URVhULCBERUZBVUxUX1NFUlZFUl9DT05URVhUKSk7XG4gICAgcmV0dXJuIGFwcGxpY2F0aW9uUmVmLmlzU3RhYmxlLnBpcGUoZmlyc3QoKGlzU3RhYmxlOiBib29sZWFuKSA9PiBpc1N0YWJsZSkpXG4gICAgICAgIC50b1Byb21pc2UoKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgYXBwZW5kU2VydmVyQ29udGV4dEluZm8oc2VydmVyQ29udGV4dCwgYXBwbGljYXRpb25SZWYpO1xuXG4gICAgICAgICAgY29uc3QgcGxhdGZvcm1TdGF0ZSA9IHBsYXRmb3JtLmluamVjdG9yLmdldChQbGF0Zm9ybVN0YXRlKTtcblxuICAgICAgICAgIGNvbnN0IGFzeW5jUHJvbWlzZXM6IFByb21pc2U8YW55PltdID0gW107XG5cbiAgICAgICAgICAvLyBSdW4gYW55IEJFRk9SRV9BUFBfU0VSSUFMSVpFRCBjYWxsYmFja3MganVzdCBiZWZvcmUgcmVuZGVyaW5nIHRvIHN0cmluZy5cbiAgICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBlbnZpcm9ubWVudEluamVjdG9yLmdldChCRUZPUkVfQVBQX1NFUklBTElaRUQsIG51bGwpO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjYWxsYmFjayBvZiBjYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYWxsYmFja1Jlc3VsdCA9IGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgaWYgKMm1aXNQcm9taXNlKGNhbGxiYWNrUmVzdWx0KSkge1xuICAgICAgICAgICAgICAgICAgLy8gVE9ETzogaW4gVFMzLjcsIGNhbGxiYWNrUmVzdWx0IGlzIHZvaWQuXG4gICAgICAgICAgICAgICAgICBhc3luY1Byb21pc2VzLnB1c2goY2FsbGJhY2tSZXN1bHQgYXMgYW55KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXhjZXB0aW9ucy5cbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0lnbm9yaW5nIEJFRk9SRV9BUFBfU0VSSUFMSVpFRCBFeGNlcHRpb246ICcsIGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgY29tcGxldGUgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoYXBwbGljYXRpb25SZWYuaW5qZWN0b3IuZ2V0KElTX0hZRFJBVElPTl9GRUFUVVJFX0VOQUJMRUQsIGZhbHNlKSkge1xuICAgICAgICAgICAgICBjb25zdCBhbm5vdGF0ZSA9ICgpID0+XG4gICAgICAgICAgICAgICAgICBhbm5vdGF0ZUZvckh5ZHJhdGlvbihhcHBsaWNhdGlvblJlZiwgcGxhdGZvcm1TdGF0ZS5nZXREb2N1bWVudCgpLCBwcm9maWxlcik7XG4gICAgICAgICAgICAgIGlmIChwcm9maWxlcikge1xuICAgICAgICAgICAgICAgIHByb2ZpbGVyLmludm9rZUFuZE1lYXN1cmUoYW5ub3RhdGUsIFNzclBlcmZNZXRyaWNzLk92ZXJhbGxIeWRyYXRpb25UaW1lKVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFubm90YXRlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVuZGVyVG9TdHJpbmcgPSAoKSA9PiBwbGF0Zm9ybVN0YXRlLnJlbmRlclRvU3RyaW5nKCk7XG4gICAgICAgICAgICBsZXQgb3V0cHV0OiBzdHJpbmc7XG4gICAgICAgICAgICBpZiAocHJvZmlsZXIpIHtcbiAgICAgICAgICAgICAgb3V0cHV0ID1cbiAgICAgICAgICAgICAgICAgIHByb2ZpbGVyPy5pbnZva2VBbmRNZWFzdXJlKHJlbmRlclRvU3RyaW5nLCBTc3JQZXJmTWV0cmljcy5Eb21TZXJpYWxpemF0aW9uVGltZSk7XG4gICAgICAgICAgICAgIHByb2ZpbGVyLmluY3JlbWVudE1ldHJpY1ZhbHVlKFNzclBlcmZNZXRyaWNzLk92ZXJhbGxIdG1sU2l6ZSwgb3V0cHV0Lmxlbmd0aCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXRwdXQgPSByZW5kZXJUb1N0cmluZygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwbGF0Zm9ybS5kZXN0cm95KCk7XG4gICAgICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAoYXN5bmNQcm9taXNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBjb21wbGV0ZSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBQcm9taXNlXG4gICAgICAgICAgICAgIC5hbGwoYXN5bmNQcm9taXNlcy5tYXAoKGFzeW5jUHJvbWlzZSkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBhc3luY1Byb21pc2UuY2F0Y2goKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignSWdub3JpbmcgQkVGT1JFX0FQUF9TRVJJQUxJWkVEIEV4Y2VwdGlvbjogJywgZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAudGhlbihjb21wbGV0ZSk7XG4gICAgICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBTcGVjaWZpZXMgdGhlIHZhbHVlIHRoYXQgc2hvdWxkIGJlIHVzZWQgaWYgbm8gc2VydmVyIGNvbnRleHQgdmFsdWUgaGFzIGJlZW4gcHJvdmlkZWQuXG4gKi9cbmNvbnN0IERFRkFVTFRfU0VSVkVSX0NPTlRFWFQgPSAnb3RoZXInO1xuXG4vKipcbiAqIEFuIGludGVybmFsIHRva2VuIHRoYXQgYWxsb3dzIHByb3ZpZGluZyBleHRyYSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgc2VydmVyIGNvbnRleHRcbiAqIChlLmcuIHdoZXRoZXIgU1NSIG9yIFNTRyB3YXMgdXNlZCkuIFRoZSB2YWx1ZSBpcyBhIHN0cmluZyBhbmQgY2hhcmFjdGVycyBvdGhlclxuICogdGhhbiBbYS16QS1aMC05XFwtXSBhcmUgcmVtb3ZlZC4gU2VlIHRoZSBkZWZhdWx0IHZhbHVlIGluIGBERUZBVUxUX1NFUlZFUl9DT05URVhUYCBjb25zdC5cbiAqL1xuZXhwb3J0IGNvbnN0IFNFUlZFUl9DT05URVhUID0gbmV3IEluamVjdGlvblRva2VuPHN0cmluZz4oJ1NFUlZFUl9DT05URVhUJyk7XG5cbi8qKlxuICogU2FuaXRpemVzIHByb3ZpZGVkIHNlcnZlciBjb250ZXh0OlxuICogLSByZW1vdmVzIGFsbCBjaGFyYWN0ZXJzIG90aGVyIHRoYW4gYS16LCBBLVosIDAtOSBhbmQgYC1gXG4gKiAtIHJldHVybnMgYG90aGVyYCBpZiBub3RoaW5nIGlzIHByb3ZpZGVkIG9yIHRoZSBzdHJpbmcgaXMgZW1wdHkgYWZ0ZXIgc2FuaXRpemF0aW9uXG4gKi9cbmZ1bmN0aW9uIHNhbml0aXplU2VydmVyQ29udGV4dChzZXJ2ZXJDb250ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjb250ZXh0ID0gc2VydmVyQ29udGV4dC5yZXBsYWNlKC9bXmEtekEtWjAtOVxcLV0vZywgJycpO1xuICByZXR1cm4gY29udGV4dC5sZW5ndGggPiAwID8gY29udGV4dCA6IERFRkFVTFRfU0VSVkVSX0NPTlRFWFQ7XG59XG5cbi8qKlxuICogQm9vdHN0cmFwcyBhbiBhcHBsaWNhdGlvbiB1c2luZyBwcm92aWRlZCBOZ01vZHVsZSBhbmQgc2VyaWFsaXplcyB0aGUgcGFnZSBjb250ZW50IHRvIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0gbW9kdWxlVHlwZSBBIHJlZmVyZW5jZSB0byBhbiBOZ01vZHVsZSB0aGF0IHNob3VsZCBiZSB1c2VkIGZvciBib290c3RyYXAuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSByZW5kZXIgb3BlcmF0aW9uOlxuICogIC0gYGRvY3VtZW50YCAtIHRoZSBkb2N1bWVudCBvZiB0aGUgcGFnZSB0byByZW5kZXIsIGVpdGhlciBhcyBhbiBIVE1MIHN0cmluZyBvclxuICogICAgICAgICAgICAgICAgIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBgZG9jdW1lbnRgIGluc3RhbmNlLlxuICogIC0gYHVybGAgLSB0aGUgVVJMIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqICAtIGBleHRyYVByb3ZpZGVyc2AgLSBzZXQgb2YgcGxhdGZvcm0gbGV2ZWwgcHJvdmlkZXJzIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJNb2R1bGU8VD4oXG4gICAgbW9kdWxlVHlwZTogVHlwZTxUPixcbiAgICBvcHRpb25zOiB7ZG9jdW1lbnQ/OiBzdHJpbmd8RG9jdW1lbnQ7IHVybD86IHN0cmluZzsgZXh0cmFQcm92aWRlcnM/OiBTdGF0aWNQcm92aWRlcltdfSk6XG4gICAgUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgcHJvZmlsZXIgPSBnZXRTc3JQcm9maWxlcigpO1xuICBpZiAocHJvZmlsZXIpIHtcbiAgICBwcm9maWxlci5zdGFydFRpbWVzcGFuKFNzclBlcmZNZXRyaWNzLk92ZXJhbGxTc3JUaW1lKTtcbiAgfVxuICBjb25zdCB7ZG9jdW1lbnQsIHVybCwgZXh0cmFQcm92aWRlcnM6IHBsYXRmb3JtUHJvdmlkZXJzfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtRHluYW1pY1NlcnZlciwge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzfSk7XG4gIGNvbnN0IG91dHB1dCA9IF9yZW5kZXIocGxhdGZvcm0sIHBsYXRmb3JtLmJvb3RzdHJhcE1vZHVsZShtb2R1bGVUeXBlKSwgcHJvZmlsZXIpO1xuICBvdXRwdXQudGhlbigocmVzdWx0OiBzdHJpbmcpID0+IHtcbiAgICBpZiAocHJvZmlsZXIpIHtcbiAgICAgIHByb2ZpbGVyLnN0b3BUaW1lc3BhbihTc3JQZXJmTWV0cmljcy5PdmVyYWxsU3NyVGltZSk7XG4gICAgICBjb25zdCBtZXRyaWNzID0gcHJvZmlsZXIuc2VyaWFsaXplTWV0cmljcygpO1xuICAgICAgY29uc29sZS5sb2cobWV0cmljcyk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG4vKipcbiAqIEJvb3RzdHJhcHMgYW4gaW5zdGFuY2Ugb2YgYW4gQW5ndWxhciBhcHBsaWNhdGlvbiBhbmQgcmVuZGVycyBpdCB0byBhIHN0cmluZy5cbiAqXG4gKiBOb3RlOiB0aGUgcm9vdCBjb21wb25lbnQgcGFzc2VkIGludG8gdGhpcyBmdW5jdGlvbiAqbXVzdCogYmUgYSBzdGFuZGFsb25lIG9uZSAoc2hvdWxkIGhhdmUgdGhlXG4gKiBgc3RhbmRhbG9uZTogdHJ1ZWAgZmxhZyBpbiB0aGUgYEBDb21wb25lbnRgIGRlY29yYXRvciBjb25maWcpLlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIEBDb21wb25lbnQoe1xuICogICBzdGFuZGFsb25lOiB0cnVlLFxuICogICB0ZW1wbGF0ZTogJ0hlbGxvIHdvcmxkISdcbiAqIH0pXG4gKiBjbGFzcyBSb290Q29tcG9uZW50IHt9XG4gKlxuICogY29uc3Qgb3V0cHV0OiBzdHJpbmcgPSBhd2FpdCByZW5kZXJBcHBsaWNhdGlvbihSb290Q29tcG9uZW50LCB7YXBwSWQ6ICdzZXJ2ZXItYXBwJ30pO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHJvb3RDb21wb25lbnQgQSByZWZlcmVuY2UgdG8gYSBTdGFuZGFsb25lIENvbXBvbmVudCB0aGF0IHNob3VsZCBiZSByZW5kZXJlZC5cbiAqIEBwYXJhbSBvcHRpb25zIEFkZGl0aW9uYWwgY29uZmlndXJhdGlvbiBmb3IgdGhlIHJlbmRlciBvcGVyYXRpb246XG4gKiAgLSBgYXBwSWRgIC0gYSBzdHJpbmcgaWRlbnRpZmllciBvZiB0aGlzIGFwcGxpY2F0aW9uLiBUaGUgYXBwSWQgaXMgdXNlZCB0byBwcmVmaXggYWxsXG4gKiAgICAgICAgICAgICAgc2VydmVyLWdlbmVyYXRlZCBzdHlsaW5ncyBhbmQgc3RhdGUga2V5cyBvZiB0aGUgYXBwbGljYXRpb24gaW4gVHJhbnNmZXJTdGF0ZVxuICogICAgICAgICAgICAgIHVzZS1jYXNlcy5cbiAqICAtIGBkb2N1bWVudGAgLSB0aGUgZG9jdW1lbnQgb2YgdGhlIHBhZ2UgdG8gcmVuZGVyLCBlaXRoZXIgYXMgYW4gSFRNTCBzdHJpbmcgb3JcbiAqICAgICAgICAgICAgICAgICBhcyBhIHJlZmVyZW5jZSB0byB0aGUgYGRvY3VtZW50YCBpbnN0YW5jZS5cbiAqICAtIGB1cmxgIC0gdGhlIFVSTCBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKiAgLSBgcHJvdmlkZXJzYCAtIHNldCBvZiBhcHBsaWNhdGlvbiBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYHBsYXRmb3JtUHJvdmlkZXJzYCAtIHRoZSBwbGF0Zm9ybSBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICpcbiAqIEByZXR1cm5zIEEgUHJvbWlzZSwgdGhhdCByZXR1cm5zIHNlcmlhbGl6ZWQgKHRvIGEgc3RyaW5nKSByZW5kZXJlZCBwYWdlLCBvbmNlIHJlc29sdmVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXZlbG9wZXJQcmV2aWV3XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJBcHBsaWNhdGlvbjxUPihyb290Q29tcG9uZW50OiBUeXBlPFQ+LCBvcHRpb25zOiB7XG4gIGFwcElkOiBzdHJpbmc7XG4gIGRvY3VtZW50Pzogc3RyaW5nIHwgRG9jdW1lbnQ7XG4gIHVybD86IHN0cmluZztcbiAgcHJvdmlkZXJzPzogQXJyYXk8UHJvdmlkZXJ8RW52aXJvbm1lbnRQcm92aWRlcnM+O1xuICBwbGF0Zm9ybVByb3ZpZGVycz86IFByb3ZpZGVyW107XG59KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgcHJvZmlsZXIgPSBnZXRTc3JQcm9maWxlcigpO1xuICBpZiAocHJvZmlsZXIpIHtcbiAgICBwcm9maWxlci5zdGFydFRpbWVzcGFuKFNzclBlcmZNZXRyaWNzLk92ZXJhbGxTc3JUaW1lKTtcbiAgfVxuICBjb25zdCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnMsIGFwcElkfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtRHluYW1pY1NlcnZlciwge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzfSk7XG4gIGNvbnN0IGFwcFByb3ZpZGVycyA9IFtcbiAgICBpbXBvcnRQcm92aWRlcnNGcm9tKEJyb3dzZXJNb2R1bGUud2l0aFNlcnZlclRyYW5zaXRpb24oe2FwcElkfSkpLFxuICAgIGltcG9ydFByb3ZpZGVyc0Zyb20oU2VydmVyTW9kdWxlKSxcbiAgICAuLi5UUkFOU0ZFUl9TVEFURV9TRVJJQUxJWkFUSU9OX1BST1ZJREVSUyxcbiAgICAuLi4ob3B0aW9ucy5wcm92aWRlcnMgPz8gW10pLFxuICBdO1xuICBjb25zdCBvdXRwdXQgPVxuICAgICAgX3JlbmRlcihwbGF0Zm9ybSwgaW50ZXJuYWxDcmVhdGVBcHBsaWNhdGlvbih7cm9vdENvbXBvbmVudCwgYXBwUHJvdmlkZXJzfSksIHByb2ZpbGVyKTtcbiAgb3V0cHV0LnRoZW4oKHJlc3VsdDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHByb2ZpbGVyKSB7XG4gICAgICBwcm9maWxlci5zdG9wVGltZXNwYW4oU3NyUGVyZk1ldHJpY3MuT3ZlcmFsbFNzclRpbWUpO1xuICAgICAgY29uc3QgbWV0cmljcyA9IHByb2ZpbGVyLnNlcmlhbGl6ZU1ldHJpY3MoKTtcbiAgICAgIGNvbnNvbGUubG9nKG1ldHJpY3MpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuLyoqXG4gKiBCb290c3RyYXBzIGFuIGFwcGxpY2F0aW9uIHVzaW5nIHByb3ZpZGVkIHtAbGluayBOZ01vZHVsZUZhY3Rvcnl9IGFuZCBzZXJpYWxpemVzIHRoZSBwYWdlIGNvbnRlbnRcbiAqIHRvIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0gbW9kdWxlRmFjdG9yeSBBbiBpbnN0YW5jZSBvZiB0aGUge0BsaW5rIE5nTW9kdWxlRmFjdG9yeX0gdGhhdCBzaG91bGQgYmUgdXNlZCBmb3JcbiAqICAgICBib290c3RyYXAuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSByZW5kZXIgb3BlcmF0aW9uOlxuICogIC0gYGRvY3VtZW50YCAtIHRoZSBkb2N1bWVudCBvZiB0aGUgcGFnZSB0byByZW5kZXIsIGVpdGhlciBhcyBhbiBIVE1MIHN0cmluZyBvclxuICogICAgICAgICAgICAgICAgIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBgZG9jdW1lbnRgIGluc3RhbmNlLlxuICogIC0gYHVybGAgLSB0aGUgVVJMIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqICAtIGBleHRyYVByb3ZpZGVyc2AgLSBzZXQgb2YgcGxhdGZvcm0gbGV2ZWwgcHJvdmlkZXJzIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKlxuICogQGRlcHJlY2F0ZWRcbiAqIFRoaXMgc3ltYm9sIGlzIG5vIGxvbmdlciBuZWNlc3NhcnkgYXMgb2YgQW5ndWxhciB2MTMuXG4gKiBVc2Uge0BsaW5rIHJlbmRlck1vZHVsZX0gQVBJIGluc3RlYWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJNb2R1bGVGYWN0b3J5PFQ+KFxuICAgIG1vZHVsZUZhY3Rvcnk6IE5nTW9kdWxlRmFjdG9yeTxUPixcbiAgICBvcHRpb25zOiB7ZG9jdW1lbnQ/OiBzdHJpbmc7IHVybD86IHN0cmluZzsgZXh0cmFQcm92aWRlcnM/OiBTdGF0aWNQcm92aWRlcltdfSk6XG4gICAgUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3Qge2RvY3VtZW50LCB1cmwsIGV4dHJhUHJvdmlkZXJzOiBwbGF0Zm9ybVByb3ZpZGVyc30gPSBvcHRpb25zO1xuICBjb25zdCBwbGF0Zm9ybSA9IF9nZXRQbGF0Zm9ybShwbGF0Zm9ybVNlcnZlciwge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzfSk7XG4gIHJldHVybiBfcmVuZGVyKHBsYXRmb3JtLCBwbGF0Zm9ybS5ib290c3RyYXBNb2R1bGVGYWN0b3J5KG1vZHVsZUZhY3RvcnkpLCBudWxsKTtcbn1cbiJdfQ==