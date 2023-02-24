/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { APP_ID, ApplicationRef, importProvidersFrom, InjectionToken, Renderer2, ɵannotateForHydration as annotateForHydration, ɵgetSsrProfiler as getSsrProfiler, ɵinternalCreateApplication as internalCreateApplication, ɵIS_HYDRATION_FEATURE_ENABLED as IS_HYDRATION_FEATURE_ENABLED, ɵisPromise, ɵTRANSFER_STATE_TOKEN_ID as TRANSFER_STATE_TOKEN_ID } from '@angular/core';
import { BrowserModule, makeStateKey, TransferState } from '@angular/platform-browser';
import { first } from 'rxjs/operators';
import { PlatformState } from './platform_state';
import { platformDynamicServer, platformServer, ServerModule } from './server';
import { BEFORE_APP_SERIALIZED, INITIAL_CONFIG } from './tokens';
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
const NGH_DATA_KEY = makeStateKey(TRANSFER_STATE_TOKEN_ID);
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
            const beforeAppSerializedPromises = [];
            // Generate extra annotation for hydration.
            if (applicationRef.injector.get(IS_HYDRATION_FEATURE_ENABLED, false)) {
                const annotate = () => {
                    const transferStateService = applicationRef.injector.get(TransferState);
                    return annotateForHydration(applicationRef, platformState.getDocument(), transferStateService, profiler);
                };
                if (profiler) {
                    profiler.invokeAndMeasure(annotate, "Overall hydration time (in ms)" /* SsrPerfMetrics.OverallHydrationTime */);
                }
                else {
                    annotate();
                }
            }
            // Run any BEFORE_APP_SERIALIZED callbacks just before rendering to string.
            const callbacks = environmentInjector.get(BEFORE_APP_SERIALIZED, null);
            if (callbacks) {
                for (const callback of callbacks) {
                    try {
                        const callbackResult = callback();
                        if (ɵisPromise(callbackResult)) {
                            // TODO: in TS3.7, callbackResult is void.
                            beforeAppSerializedPromises.push(callbackResult);
                        }
                    }
                    catch (e) {
                        // Ignore exceptions.
                        console.warn('Ignoring BEFORE_APP_SERIALIZED Exception: ', e);
                    }
                }
            }
            const complete = () => {
                const renderToString = () => platformState.renderToString();
                let output;
                if (profiler) {
                    const transferState = applicationRef.injector.get(TransferState);
                    const nghData = transferState.get(NGH_DATA_KEY, []) ?? [];
                    profiler.incrementMetricValue("Hydration annotation size (in character length)" /* SsrPerfMetrics.NghAnnotationSize */, JSON.stringify(nghData).length);
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
            if (beforeAppSerializedPromises.length === 0) {
                return complete();
            }
            return Promise
                .all(beforeAppSerializedPromises.map((asyncPromise) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1zZXJ2ZXIvc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxNQUFNLEVBQUUsY0FBYyxFQUF3QixtQkFBbUIsRUFBRSxjQUFjLEVBQXVELFNBQVMsRUFBd0IscUJBQXFCLElBQUksb0JBQW9CLEVBQUUsZUFBZSxJQUFJLGNBQWMsRUFBRSwwQkFBMEIsSUFBSSx5QkFBeUIsRUFBRSw2QkFBNkIsSUFBSSw0QkFBNEIsRUFBRSxVQUFVLEVBQWlILHdCQUF3QixJQUFJLHVCQUF1QixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ2hrQixPQUFPLEVBQUMsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRixPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFckMsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxxQkFBcUIsRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdFLE9BQU8sRUFBQyxxQkFBcUIsRUFBRSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFRL0QsU0FBUyxZQUFZLENBQ2pCLGVBQWtFLEVBQ2xFLE9BQXdCO0lBQzFCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLENBQUM7SUFDdkQsT0FBTyxlQUFlLENBQUM7UUFDckIsRUFBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxFQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUM7UUFDbkYsY0FBYztLQUNmLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRDs7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QUFFLFlBQVksRUFBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUYsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQWMsRUFBRSxFQUFFO1FBQzdCLElBQUksUUFBUSxFQUFFO1lBQ1osUUFBUSxDQUFDLFlBQVksZ0VBQStCLENBQUM7WUFDckQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN0QjtRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztHQWlCRztBQUNILE1BQU0sVUFBVSxtQkFBbUIsQ0FDL0IsYUFBaUMsRUFDakMsT0FBNkU7SUFFL0UsTUFBTSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFDLEdBQUcsT0FBTyxDQUFDO0lBQ25FLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxjQUFjLEVBQUUsRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFDLENBQUMsQ0FBQztJQUNsRixPQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2pGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBUFBfSUQsIEFwcGxpY2F0aW9uUmVmLCBFbnZpcm9ubWVudFByb3ZpZGVycywgaW1wb3J0UHJvdmlkZXJzRnJvbSwgSW5qZWN0aW9uVG9rZW4sIE5nTW9kdWxlRmFjdG9yeSwgTmdNb2R1bGVSZWYsIFBsYXRmb3JtUmVmLCBQcm92aWRlciwgUmVuZGVyZXIyLCBTdGF0aWNQcm92aWRlciwgVHlwZSwgybVhbm5vdGF0ZUZvckh5ZHJhdGlvbiBhcyBhbm5vdGF0ZUZvckh5ZHJhdGlvbiwgybVnZXRTc3JQcm9maWxlciBhcyBnZXRTc3JQcm9maWxlciwgybVpbnRlcm5hbENyZWF0ZUFwcGxpY2F0aW9uIGFzIGludGVybmFsQ3JlYXRlQXBwbGljYXRpb24sIMm1SVNfSFlEUkFUSU9OX0ZFQVRVUkVfRU5BQkxFRCBhcyBJU19IWURSQVRJT05fRkVBVFVSRV9FTkFCTEVELCDJtWlzUHJvbWlzZSwgybVpc1NzclByb2ZpbGVyRW5hYmxlZCBhcyBpc1NzclByb2ZpbGVyRW5hYmxlZCwgybVTc3JQZXJmTWV0cmljcyBhcyBTc3JQZXJmTWV0cmljcywgybVTc3JQcm9maWxlciBhcyBTc3JQcm9maWxlciwgybVUUkFOU0ZFUl9TVEFURV9UT0tFTl9JRCBhcyBUUkFOU0ZFUl9TVEFURV9UT0tFTl9JRH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0Jyb3dzZXJNb2R1bGUsIG1ha2VTdGF0ZUtleSwgVHJhbnNmZXJTdGF0ZX0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlcic7XG5pbXBvcnQge2ZpcnN0fSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7UGxhdGZvcm1TdGF0ZX0gZnJvbSAnLi9wbGF0Zm9ybV9zdGF0ZSc7XG5pbXBvcnQge3BsYXRmb3JtRHluYW1pY1NlcnZlciwgcGxhdGZvcm1TZXJ2ZXIsIFNlcnZlck1vZHVsZX0gZnJvbSAnLi9zZXJ2ZXInO1xuaW1wb3J0IHtCRUZPUkVfQVBQX1NFUklBTElaRUQsIElOSVRJQUxfQ09ORklHfSBmcm9tICcuL3Rva2Vucyc7XG5cbmludGVyZmFjZSBQbGF0Zm9ybU9wdGlvbnMge1xuICBkb2N1bWVudD86IHN0cmluZ3xEb2N1bWVudDtcbiAgdXJsPzogc3RyaW5nO1xuICBwbGF0Zm9ybVByb3ZpZGVycz86IFByb3ZpZGVyW107XG59XG5cbmZ1bmN0aW9uIF9nZXRQbGF0Zm9ybShcbiAgICBwbGF0Zm9ybUZhY3Rvcnk6IChleHRyYVByb3ZpZGVyczogU3RhdGljUHJvdmlkZXJbXSkgPT4gUGxhdGZvcm1SZWYsXG4gICAgb3B0aW9uczogUGxhdGZvcm1PcHRpb25zKTogUGxhdGZvcm1SZWYge1xuICBjb25zdCBleHRyYVByb3ZpZGVycyA9IG9wdGlvbnMucGxhdGZvcm1Qcm92aWRlcnMgPz8gW107XG4gIHJldHVybiBwbGF0Zm9ybUZhY3RvcnkoW1xuICAgIHtwcm92aWRlOiBJTklUSUFMX0NPTkZJRywgdXNlVmFsdWU6IHtkb2N1bWVudDogb3B0aW9ucy5kb2N1bWVudCwgdXJsOiBvcHRpb25zLnVybH19LFxuICAgIGV4dHJhUHJvdmlkZXJzLFxuICBdKTtcbn1cblxuLyoqXG4gKiBBZGRzIHRoZSBgbmctc2VydmVyLWNvbnRleHRgIGF0dHJpYnV0ZSB0byBob3N0IGVsZW1lbnRzIG9mIGFsbCBib290c3RyYXBwZWQgY29tcG9uZW50c1xuICogd2l0aGluIGEgZ2l2ZW4gYXBwbGljYXRpb24uXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZFNlcnZlckNvbnRleHRJbmZvKHNlcnZlckNvbnRleHQ6IHN0cmluZywgYXBwbGljYXRpb25SZWY6IEFwcGxpY2F0aW9uUmVmKSB7XG4gIGFwcGxpY2F0aW9uUmVmLmNvbXBvbmVudHMuZm9yRWFjaCgoY29tcG9uZW50UmVmKSA9PiB7XG4gICAgY29uc3QgcmVuZGVyZXIgPSBjb21wb25lbnRSZWYuaW5qZWN0b3IuZ2V0KFJlbmRlcmVyMik7XG4gICAgY29uc3QgZWxlbWVudCA9IGNvbXBvbmVudFJlZi5sb2NhdGlvbi5uYXRpdmVFbGVtZW50O1xuICAgIGlmIChlbGVtZW50KSB7XG4gICAgICByZW5kZXJlci5zZXRBdHRyaWJ1dGUoZWxlbWVudCwgJ25nLXNlcnZlci1jb250ZXh0Jywgc2VydmVyQ29udGV4dCk7XG4gICAgfVxuICB9KTtcbn1cblxuY29uc3QgTkdIX0RBVEFfS0VZID0gbWFrZVN0YXRlS2V5PEFycmF5PHVua25vd24+PihUUkFOU0ZFUl9TVEFURV9UT0tFTl9JRCk7XG5cbmZ1bmN0aW9uIF9yZW5kZXI8VD4oXG4gICAgcGxhdGZvcm06IFBsYXRmb3JtUmVmLCBib290c3RyYXBQcm9taXNlOiBQcm9taXNlPE5nTW9kdWxlUmVmPFQ+fEFwcGxpY2F0aW9uUmVmPixcbiAgICBwcm9maWxlcjogU3NyUHJvZmlsZXJ8bnVsbCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBib290c3RyYXBQcm9taXNlLnRoZW4oKG1vZHVsZU9yQXBwbGljYXRpb25SZWYpID0+IHtcbiAgICBjb25zdCBlbnZpcm9ubWVudEluamVjdG9yID0gbW9kdWxlT3JBcHBsaWNhdGlvblJlZi5pbmplY3RvcjtcbiAgICBjb25zdCB0cmFuc2l0aW9uSWQgPSBlbnZpcm9ubWVudEluamVjdG9yLmdldChBUFBfSUQsIG51bGwpO1xuICAgIGlmICghdHJhbnNpdGlvbklkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYHJlbmRlck1vZHVsZVtGYWN0b3J5XSgpIHJlcXVpcmVzIHRoZSB1c2Ugb2YgQnJvd3Nlck1vZHVsZS53aXRoU2VydmVyVHJhbnNpdGlvbigpIHRvIGVuc3VyZVxudGhlIHNlcnZlci1yZW5kZXJlZCBhcHAgY2FuIGJlIHByb3Blcmx5IGJvb3RzdHJhcHBlZCBpbnRvIGEgY2xpZW50IGFwcC5gKTtcbiAgICB9XG4gICAgY29uc3QgYXBwbGljYXRpb25SZWY6IEFwcGxpY2F0aW9uUmVmID0gbW9kdWxlT3JBcHBsaWNhdGlvblJlZiBpbnN0YW5jZW9mIEFwcGxpY2F0aW9uUmVmID9cbiAgICAgICAgbW9kdWxlT3JBcHBsaWNhdGlvblJlZiA6XG4gICAgICAgIGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KEFwcGxpY2F0aW9uUmVmKTtcbiAgICBjb25zdCBzZXJ2ZXJDb250ZXh0ID1cbiAgICAgICAgc2FuaXRpemVTZXJ2ZXJDb250ZXh0KGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KFNFUlZFUl9DT05URVhULCBERUZBVUxUX1NFUlZFUl9DT05URVhUKSk7XG4gICAgcmV0dXJuIGFwcGxpY2F0aW9uUmVmLmlzU3RhYmxlLnBpcGUoZmlyc3QoKGlzU3RhYmxlOiBib29sZWFuKSA9PiBpc1N0YWJsZSkpXG4gICAgICAgIC50b1Byb21pc2UoKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgYXBwZW5kU2VydmVyQ29udGV4dEluZm8oc2VydmVyQ29udGV4dCwgYXBwbGljYXRpb25SZWYpO1xuXG4gICAgICAgICAgY29uc3QgcGxhdGZvcm1TdGF0ZSA9IHBsYXRmb3JtLmluamVjdG9yLmdldChQbGF0Zm9ybVN0YXRlKTtcblxuICAgICAgICAgIGNvbnN0IGJlZm9yZUFwcFNlcmlhbGl6ZWRQcm9taXNlczogUHJvbWlzZTxhbnk+W10gPSBbXTtcblxuICAgICAgICAgIC8vIEdlbmVyYXRlIGV4dHJhIGFubm90YXRpb24gZm9yIGh5ZHJhdGlvbi5cbiAgICAgICAgICBpZiAoYXBwbGljYXRpb25SZWYuaW5qZWN0b3IuZ2V0KElTX0hZRFJBVElPTl9GRUFUVVJFX0VOQUJMRUQsIGZhbHNlKSkge1xuICAgICAgICAgICAgY29uc3QgYW5ub3RhdGUgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHRyYW5zZmVyU3RhdGVTZXJ2aWNlID0gYXBwbGljYXRpb25SZWYuaW5qZWN0b3IuZ2V0KFRyYW5zZmVyU3RhdGUpO1xuICAgICAgICAgICAgICByZXR1cm4gYW5ub3RhdGVGb3JIeWRyYXRpb24oXG4gICAgICAgICAgICAgICAgICBhcHBsaWNhdGlvblJlZiwgcGxhdGZvcm1TdGF0ZS5nZXREb2N1bWVudCgpLCB0cmFuc2ZlclN0YXRlU2VydmljZSwgcHJvZmlsZXIpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChwcm9maWxlcikge1xuICAgICAgICAgICAgICBwcm9maWxlci5pbnZva2VBbmRNZWFzdXJlKGFubm90YXRlLCBTc3JQZXJmTWV0cmljcy5PdmVyYWxsSHlkcmF0aW9uVGltZSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGFubm90YXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gUnVuIGFueSBCRUZPUkVfQVBQX1NFUklBTElaRUQgY2FsbGJhY2tzIGp1c3QgYmVmb3JlIHJlbmRlcmluZyB0byBzdHJpbmcuXG4gICAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gZW52aXJvbm1lbnRJbmplY3Rvci5nZXQoQkVGT1JFX0FQUF9TRVJJQUxJWkVELCBudWxsKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFja3MpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FsbGJhY2tSZXN1bHQgPSBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGlmICjJtWlzUHJvbWlzZShjYWxsYmFja1Jlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGluIFRTMy43LCBjYWxsYmFja1Jlc3VsdCBpcyB2b2lkLlxuICAgICAgICAgICAgICAgICAgYmVmb3JlQXBwU2VyaWFsaXplZFByb21pc2VzLnB1c2goY2FsbGJhY2tSZXN1bHQgYXMgYW55KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXhjZXB0aW9ucy5cbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0lnbm9yaW5nIEJFRk9SRV9BUFBfU0VSSUFMSVpFRCBFeGNlcHRpb246ICcsIGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgY29tcGxldGUgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZW5kZXJUb1N0cmluZyA9ICgpID0+IHBsYXRmb3JtU3RhdGUucmVuZGVyVG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGxldCBvdXRwdXQ6IHN0cmluZztcbiAgICAgICAgICAgIGlmIChwcm9maWxlcikge1xuICAgICAgICAgICAgICBjb25zdCB0cmFuc2ZlclN0YXRlID0gYXBwbGljYXRpb25SZWYuaW5qZWN0b3IuZ2V0KFRyYW5zZmVyU3RhdGUpO1xuICAgICAgICAgICAgICBjb25zdCBuZ2hEYXRhID0gdHJhbnNmZXJTdGF0ZS5nZXQoTkdIX0RBVEFfS0VZLCBbXSkgPz8gW107XG4gICAgICAgICAgICAgIHByb2ZpbGVyLmluY3JlbWVudE1ldHJpY1ZhbHVlKFxuICAgICAgICAgICAgICAgICAgU3NyUGVyZk1ldHJpY3MuTmdoQW5ub3RhdGlvblNpemUsIEpTT04uc3RyaW5naWZ5KG5naERhdGEpLmxlbmd0aCk7XG4gICAgICAgICAgICAgIG91dHB1dCA9XG4gICAgICAgICAgICAgICAgICBwcm9maWxlcj8uaW52b2tlQW5kTWVhc3VyZShyZW5kZXJUb1N0cmluZywgU3NyUGVyZk1ldHJpY3MuRG9tU2VyaWFsaXphdGlvblRpbWUpO1xuICAgICAgICAgICAgICBwcm9maWxlci5pbmNyZW1lbnRNZXRyaWNWYWx1ZShTc3JQZXJmTWV0cmljcy5PdmVyYWxsSHRtbFNpemUsIG91dHB1dC5sZW5ndGgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgb3V0cHV0ID0gcmVuZGVyVG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcGxhdGZvcm0uZGVzdHJveSgpO1xuICAgICAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKGJlZm9yZUFwcFNlcmlhbGl6ZWRQcm9taXNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBjb21wbGV0ZSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBQcm9taXNlXG4gICAgICAgICAgICAgIC5hbGwoYmVmb3JlQXBwU2VyaWFsaXplZFByb21pc2VzLm1hcCgoYXN5bmNQcm9taXNlKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFzeW5jUHJvbWlzZS5jYXRjaCgoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdJZ25vcmluZyBCRUZPUkVfQVBQX1NFUklBTElaRUQgRXhjZXB0aW9uOiAnLCBlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgIC50aGVuKGNvbXBsZXRlKTtcbiAgICAgICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFNwZWNpZmllcyB0aGUgdmFsdWUgdGhhdCBzaG91bGQgYmUgdXNlZCBpZiBubyBzZXJ2ZXIgY29udGV4dCB2YWx1ZSBoYXMgYmVlbiBwcm92aWRlZC5cbiAqL1xuY29uc3QgREVGQVVMVF9TRVJWRVJfQ09OVEVYVCA9ICdvdGhlcic7XG5cbi8qKlxuICogQW4gaW50ZXJuYWwgdG9rZW4gdGhhdCBhbGxvd3MgcHJvdmlkaW5nIGV4dHJhIGluZm9ybWF0aW9uIGFib3V0IHRoZSBzZXJ2ZXIgY29udGV4dFxuICogKGUuZy4gd2hldGhlciBTU1Igb3IgU1NHIHdhcyB1c2VkKS4gVGhlIHZhbHVlIGlzIGEgc3RyaW5nIGFuZCBjaGFyYWN0ZXJzIG90aGVyXG4gKiB0aGFuIFthLXpBLVowLTlcXC1dIGFyZSByZW1vdmVkLiBTZWUgdGhlIGRlZmF1bHQgdmFsdWUgaW4gYERFRkFVTFRfU0VSVkVSX0NPTlRFWFRgIGNvbnN0LlxuICovXG5leHBvcnQgY29uc3QgU0VSVkVSX0NPTlRFWFQgPSBuZXcgSW5qZWN0aW9uVG9rZW48c3RyaW5nPignU0VSVkVSX0NPTlRFWFQnKTtcblxuLyoqXG4gKiBTYW5pdGl6ZXMgcHJvdmlkZWQgc2VydmVyIGNvbnRleHQ6XG4gKiAtIHJlbW92ZXMgYWxsIGNoYXJhY3RlcnMgb3RoZXIgdGhhbiBhLXosIEEtWiwgMC05IGFuZCBgLWBcbiAqIC0gcmV0dXJucyBgb3RoZXJgIGlmIG5vdGhpbmcgaXMgcHJvdmlkZWQgb3IgdGhlIHN0cmluZyBpcyBlbXB0eSBhZnRlciBzYW5pdGl6YXRpb25cbiAqL1xuZnVuY3Rpb24gc2FuaXRpemVTZXJ2ZXJDb250ZXh0KHNlcnZlckNvbnRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNvbnRleHQgPSBzZXJ2ZXJDb250ZXh0LnJlcGxhY2UoL1teYS16QS1aMC05XFwtXS9nLCAnJyk7XG4gIHJldHVybiBjb250ZXh0Lmxlbmd0aCA+IDAgPyBjb250ZXh0IDogREVGQVVMVF9TRVJWRVJfQ09OVEVYVDtcbn1cblxuLyoqXG4gKiBCb290c3RyYXBzIGFuIGFwcGxpY2F0aW9uIHVzaW5nIHByb3ZpZGVkIE5nTW9kdWxlIGFuZCBzZXJpYWxpemVzIHRoZSBwYWdlIGNvbnRlbnQgdG8gc3RyaW5nLlxuICpcbiAqIEBwYXJhbSBtb2R1bGVUeXBlIEEgcmVmZXJlbmNlIHRvIGFuIE5nTW9kdWxlIHRoYXQgc2hvdWxkIGJlIHVzZWQgZm9yIGJvb3RzdHJhcC5cbiAqIEBwYXJhbSBvcHRpb25zIEFkZGl0aW9uYWwgY29uZmlndXJhdGlvbiBmb3IgdGhlIHJlbmRlciBvcGVyYXRpb246XG4gKiAgLSBgZG9jdW1lbnRgIC0gdGhlIGRvY3VtZW50IG9mIHRoZSBwYWdlIHRvIHJlbmRlciwgZWl0aGVyIGFzIGFuIEhUTUwgc3RyaW5nIG9yXG4gKiAgICAgICAgICAgICAgICAgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGBkb2N1bWVudGAgaW5zdGFuY2UuXG4gKiAgLSBgdXJsYCAtIHRoZSBVUkwgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYGV4dHJhUHJvdmlkZXJzYCAtIHNldCBvZiBwbGF0Zm9ybSBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlck1vZHVsZTxUPihcbiAgICBtb2R1bGVUeXBlOiBUeXBlPFQ+LFxuICAgIG9wdGlvbnM6IHtkb2N1bWVudD86IHN0cmluZ3xEb2N1bWVudDsgdXJsPzogc3RyaW5nOyBleHRyYVByb3ZpZGVycz86IFN0YXRpY1Byb3ZpZGVyW119KTpcbiAgICBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBwcm9maWxlciA9IGdldFNzclByb2ZpbGVyKCk7XG4gIGlmIChwcm9maWxlcikge1xuICAgIHByb2ZpbGVyLnN0YXJ0VGltZXNwYW4oU3NyUGVyZk1ldHJpY3MuT3ZlcmFsbFNzclRpbWUpO1xuICB9XG4gIGNvbnN0IHtkb2N1bWVudCwgdXJsLCBleHRyYVByb3ZpZGVyczogcGxhdGZvcm1Qcm92aWRlcnN9ID0gb3B0aW9ucztcbiAgY29uc3QgcGxhdGZvcm0gPSBfZ2V0UGxhdGZvcm0ocGxhdGZvcm1EeW5hbWljU2VydmVyLCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnN9KTtcbiAgY29uc3Qgb3V0cHV0ID0gX3JlbmRlcihwbGF0Zm9ybSwgcGxhdGZvcm0uYm9vdHN0cmFwTW9kdWxlKG1vZHVsZVR5cGUpLCBwcm9maWxlcik7XG4gIG91dHB1dC50aGVuKChyZXN1bHQ6IHN0cmluZykgPT4ge1xuICAgIGlmIChwcm9maWxlcikge1xuICAgICAgcHJvZmlsZXIuc3RvcFRpbWVzcGFuKFNzclBlcmZNZXRyaWNzLk92ZXJhbGxTc3JUaW1lKTtcbiAgICAgIGNvbnN0IG1ldHJpY3MgPSBwcm9maWxlci5zZXJpYWxpemVNZXRyaWNzKCk7XG4gICAgICBjb25zb2xlLmxvZyhtZXRyaWNzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cbi8qKlxuICogQm9vdHN0cmFwcyBhbiBpbnN0YW5jZSBvZiBhbiBBbmd1bGFyIGFwcGxpY2F0aW9uIGFuZCByZW5kZXJzIGl0IHRvIGEgc3RyaW5nLlxuICpcbiAqIE5vdGU6IHRoZSByb290IGNvbXBvbmVudCBwYXNzZWQgaW50byB0aGlzIGZ1bmN0aW9uICptdXN0KiBiZSBhIHN0YW5kYWxvbmUgb25lIChzaG91bGQgaGF2ZSB0aGVcbiAqIGBzdGFuZGFsb25lOiB0cnVlYCBmbGFnIGluIHRoZSBgQENvbXBvbmVudGAgZGVjb3JhdG9yIGNvbmZpZykuXG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogQENvbXBvbmVudCh7XG4gKiAgIHN0YW5kYWxvbmU6IHRydWUsXG4gKiAgIHRlbXBsYXRlOiAnSGVsbG8gd29ybGQhJ1xuICogfSlcbiAqIGNsYXNzIFJvb3RDb21wb25lbnQge31cbiAqXG4gKiBjb25zdCBvdXRwdXQ6IHN0cmluZyA9IGF3YWl0IHJlbmRlckFwcGxpY2F0aW9uKFJvb3RDb21wb25lbnQsIHthcHBJZDogJ3NlcnZlci1hcHAnfSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gcm9vdENvbXBvbmVudCBBIHJlZmVyZW5jZSB0byBhIFN0YW5kYWxvbmUgQ29tcG9uZW50IHRoYXQgc2hvdWxkIGJlIHJlbmRlcmVkLlxuICogQHBhcmFtIG9wdGlvbnMgQWRkaXRpb25hbCBjb25maWd1cmF0aW9uIGZvciB0aGUgcmVuZGVyIG9wZXJhdGlvbjpcbiAqICAtIGBhcHBJZGAgLSBhIHN0cmluZyBpZGVudGlmaWVyIG9mIHRoaXMgYXBwbGljYXRpb24uIFRoZSBhcHBJZCBpcyB1c2VkIHRvIHByZWZpeCBhbGxcbiAqICAgICAgICAgICAgICBzZXJ2ZXItZ2VuZXJhdGVkIHN0eWxpbmdzIGFuZCBzdGF0ZSBrZXlzIG9mIHRoZSBhcHBsaWNhdGlvbiBpbiBUcmFuc2ZlclN0YXRlXG4gKiAgICAgICAgICAgICAgdXNlLWNhc2VzLlxuICogIC0gYGRvY3VtZW50YCAtIHRoZSBkb2N1bWVudCBvZiB0aGUgcGFnZSB0byByZW5kZXIsIGVpdGhlciBhcyBhbiBIVE1MIHN0cmluZyBvclxuICogICAgICAgICAgICAgICAgIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBgZG9jdW1lbnRgIGluc3RhbmNlLlxuICogIC0gYHVybGAgLSB0aGUgVVJMIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqICAtIGBwcm92aWRlcnNgIC0gc2V0IG9mIGFwcGxpY2F0aW9uIGxldmVsIHByb3ZpZGVycyBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKiAgLSBgcGxhdGZvcm1Qcm92aWRlcnNgIC0gdGhlIHBsYXRmb3JtIGxldmVsIHByb3ZpZGVycyBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKlxuICogQHJldHVybnMgQSBQcm9taXNlLCB0aGF0IHJldHVybnMgc2VyaWFsaXplZCAodG8gYSBzdHJpbmcpIHJlbmRlcmVkIHBhZ2UsIG9uY2UgcmVzb2x2ZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckFwcGxpY2F0aW9uPFQ+KHJvb3RDb21wb25lbnQ6IFR5cGU8VD4sIG9wdGlvbnM6IHtcbiAgYXBwSWQ6IHN0cmluZztcbiAgZG9jdW1lbnQ/OiBzdHJpbmcgfCBEb2N1bWVudDtcbiAgdXJsPzogc3RyaW5nO1xuICBwcm92aWRlcnM/OiBBcnJheTxQcm92aWRlcnxFbnZpcm9ubWVudFByb3ZpZGVycz47XG4gIHBsYXRmb3JtUHJvdmlkZXJzPzogUHJvdmlkZXJbXTtcbn0pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBwcm9maWxlciA9IGdldFNzclByb2ZpbGVyKCk7XG4gIGlmIChwcm9maWxlcikge1xuICAgIHByb2ZpbGVyLnN0YXJ0VGltZXNwYW4oU3NyUGVyZk1ldHJpY3MuT3ZlcmFsbFNzclRpbWUpO1xuICB9XG4gIGNvbnN0IHtkb2N1bWVudCwgdXJsLCBwbGF0Zm9ybVByb3ZpZGVycywgYXBwSWR9ID0gb3B0aW9ucztcbiAgY29uc3QgcGxhdGZvcm0gPSBfZ2V0UGxhdGZvcm0ocGxhdGZvcm1EeW5hbWljU2VydmVyLCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnN9KTtcbiAgY29uc3QgYXBwUHJvdmlkZXJzID0gW1xuICAgIGltcG9ydFByb3ZpZGVyc0Zyb20oQnJvd3Nlck1vZHVsZS53aXRoU2VydmVyVHJhbnNpdGlvbih7YXBwSWR9KSksXG4gICAgaW1wb3J0UHJvdmlkZXJzRnJvbShTZXJ2ZXJNb2R1bGUpLFxuICAgIC4uLihvcHRpb25zLnByb3ZpZGVycyA/PyBbXSksXG4gIF07XG4gIGNvbnN0IG91dHB1dCA9XG4gICAgICBfcmVuZGVyKHBsYXRmb3JtLCBpbnRlcm5hbENyZWF0ZUFwcGxpY2F0aW9uKHtyb290Q29tcG9uZW50LCBhcHBQcm92aWRlcnN9KSwgcHJvZmlsZXIpO1xuICBvdXRwdXQudGhlbigocmVzdWx0OiBzdHJpbmcpID0+IHtcbiAgICBpZiAocHJvZmlsZXIpIHtcbiAgICAgIHByb2ZpbGVyLnN0b3BUaW1lc3BhbihTc3JQZXJmTWV0cmljcy5PdmVyYWxsU3NyVGltZSk7XG4gICAgICBjb25zdCBtZXRyaWNzID0gcHJvZmlsZXIuc2VyaWFsaXplTWV0cmljcygpO1xuICAgICAgY29uc29sZS5sb2cobWV0cmljcyk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG4vKipcbiAqIEJvb3RzdHJhcHMgYW4gYXBwbGljYXRpb24gdXNpbmcgcHJvdmlkZWQge0BsaW5rIE5nTW9kdWxlRmFjdG9yeX0gYW5kIHNlcmlhbGl6ZXMgdGhlIHBhZ2UgY29udGVudFxuICogdG8gc3RyaW5nLlxuICpcbiAqIEBwYXJhbSBtb2R1bGVGYWN0b3J5IEFuIGluc3RhbmNlIG9mIHRoZSB7QGxpbmsgTmdNb2R1bGVGYWN0b3J5fSB0aGF0IHNob3VsZCBiZSB1c2VkIGZvclxuICogICAgIGJvb3RzdHJhcC5cbiAqIEBwYXJhbSBvcHRpb25zIEFkZGl0aW9uYWwgY29uZmlndXJhdGlvbiBmb3IgdGhlIHJlbmRlciBvcGVyYXRpb246XG4gKiAgLSBgZG9jdW1lbnRgIC0gdGhlIGRvY3VtZW50IG9mIHRoZSBwYWdlIHRvIHJlbmRlciwgZWl0aGVyIGFzIGFuIEhUTUwgc3RyaW5nIG9yXG4gKiAgICAgICAgICAgICAgICAgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGBkb2N1bWVudGAgaW5zdGFuY2UuXG4gKiAgLSBgdXJsYCAtIHRoZSBVUkwgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYGV4dHJhUHJvdmlkZXJzYCAtIHNldCBvZiBwbGF0Zm9ybSBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqXG4gKiBAZGVwcmVjYXRlZFxuICogVGhpcyBzeW1ib2wgaXMgbm8gbG9uZ2VyIG5lY2Vzc2FyeSBhcyBvZiBBbmd1bGFyIHYxMy5cbiAqIFVzZSB7QGxpbmsgcmVuZGVyTW9kdWxlfSBBUEkgaW5zdGVhZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlck1vZHVsZUZhY3Rvcnk8VD4oXG4gICAgbW9kdWxlRmFjdG9yeTogTmdNb2R1bGVGYWN0b3J5PFQ+LFxuICAgIG9wdGlvbnM6IHtkb2N1bWVudD86IHN0cmluZzsgdXJsPzogc3RyaW5nOyBleHRyYVByb3ZpZGVycz86IFN0YXRpY1Byb3ZpZGVyW119KTpcbiAgICBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7ZG9jdW1lbnQsIHVybCwgZXh0cmFQcm92aWRlcnM6IHBsYXRmb3JtUHJvdmlkZXJzfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtU2VydmVyLCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnN9KTtcbiAgcmV0dXJuIF9yZW5kZXIocGxhdGZvcm0sIHBsYXRmb3JtLmJvb3RzdHJhcE1vZHVsZUZhY3RvcnkobW9kdWxlRmFjdG9yeSksIG51bGwpO1xufVxuIl19