/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ApplicationRef, importProvidersFrom, InjectionToken, Renderer2, ɵannotateForHydration as annotateForHydration, ɵinternalCreateApplication as internalCreateApplication, ɵisPromise } from '@angular/core';
import { BrowserModule, ɵTRANSITION_ID } from '@angular/platform-browser';
import { first } from 'rxjs/operators';
import { PlatformState } from './platform_state';
import { platformDynamicServer, platformServer, ServerModule } from './server';
import { BEFORE_APP_SERIALIZED, INITIAL_CONFIG } from './tokens';
import { TRANSFER_STATE_SERIALIZATION_PROVIDERS } from './transfer_state';
/**
 * Enables extra profiling output in the console (such as
 * an execution time of a particular function/subsystem).
 */
const ENABLE_PROFILING = true;
// Make sure this flag is in sync with a similar one in `core`.
// TODO: remove this flag eventually, we should always produce optimized keys.
const ENABLE_HYDRATION_KEY_COMPRESSION = false;
function _getPlatform(platformFactory, options) {
    const extraProviders = options.platformProviders ?? [];
    return platformFactory([
        { provide: INITIAL_CONFIG, useValue: { document: options.document, url: options.url } },
        extraProviders
    ]);
}
/**
 * Adds the `ng-server-context` attribute to host elements of all bootstrapped components
 * within a given application.
 */
function appendServerContextInfo(serverContext, applicationRef) {
    applicationRef.components.forEach(componentRef => {
        const renderer = componentRef.injector.get(Renderer2);
        const element = componentRef.location.nativeElement;
        if (element) {
            renderer.setAttribute(element, 'ng-server-context', serverContext);
        }
    });
}
function _render(platform, bootstrapPromise) {
    return bootstrapPromise.then((moduleOrApplicationRef) => {
        const environmentInjector = moduleOrApplicationRef.injector;
        const transitionId = environmentInjector.get(ɵTRANSITION_ID, null);
        if (!transitionId) {
            throw new Error(`renderModule[Factory]() requires the use of BrowserModule.withServerTransition() to ensure
the server-rendered app can be properly bootstrapped into a client app.`);
        }
        const applicationRef = moduleOrApplicationRef instanceof ApplicationRef ?
            moduleOrApplicationRef :
            environmentInjector.get(ApplicationRef);
        const serverContext = sanitizeServerContext(environmentInjector.get(SERVER_CONTEXT, DEFAULT_SERVER_CONTEXT));
        return applicationRef.isStable.pipe((first((isStable) => isStable)))
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
                let preAnnotatedOutput = null;
                if (ENABLE_PROFILING) {
                    // Check the HTML output size before we add extra markers.
                    preAnnotatedOutput = platformState.renderToString();
                    console.log('Pre-annotated output size: ', preAnnotatedOutput.length);
                }
                const doc = platformState.getDocument();
                applicationRef.components.forEach(componentRef => {
                    const element = componentRef.location.nativeElement;
                    if (element) {
                        const debugKey = '* Hydration annotation time';
                        ENABLE_PROFILING && console.time(debugKey);
                        annotateForHydration(doc, element, ENABLE_HYDRATION_KEY_COMPRESSION);
                        ENABLE_PROFILING && console.timeEnd(debugKey);
                    }
                });
                ENABLE_PROFILING && console.time('renderToString');
                let output = platformState.renderToString();
                ENABLE_PROFILING && console.timeEnd('renderToString');
                // Shortens `<!--1|5-->` to `<!1|5>`.
                output = compressCommentNodes(output);
                if (ENABLE_PROFILING) {
                    const overheadInBytes = output.length - preAnnotatedOutput.length;
                    const overheadInPercent = Math.round((overheadInBytes / output.length) * 10000) / 100;
                    console.log('* Hydration annotation HTML size overhead: ', overheadInBytes, ' chars, ', overheadInPercent, '%');
                }
                platform.destroy();
                return output;
            };
            if (asyncPromises.length === 0) {
                return complete();
            }
            return Promise
                .all(asyncPromises.map(asyncPromise => {
                return asyncPromise.catch(e => {
                    console.warn('Ignoring BEFORE_APP_SERIALIZED Exception: ', e);
                });
            }))
                .then(complete);
        });
    });
}
/**
 * Helper function to replace serialized comment nodes with
 * a more compact representation, i.e. `<!--1|5-->` -> `<!1|5>`.
 * Ideally, it should be a part of Domino and there should be
 * no need to go over the HTML string once again, but Domino
 * doesn't support this at the moment.
 */
function compressCommentNodes(content) {
    // Match patterns like: `*|<number>`, `*?<number>` and `*?vcr<number>`.
    const shorten = () => content.replace(/<!--(.*?([|?]\d+|vcr\d+))-->/g, '<!$1>');
    if (ENABLE_PROFILING) {
        const lengthBefore = content.length;
        console.time('compactCommentNodes');
        content = shorten();
        const lengthAfter = content.length;
        console.timeEnd('compactCommentNodes');
        console.log('compactCommentNodes: original size: ', lengthBefore, ', new size: ', lengthAfter, ', saved: ', lengthBefore - lengthAfter);
    }
    else {
        content = shorten(); // same as above, but without extra logging
    }
    return content;
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
    ENABLE_PROFILING && console.log('--------------');
    ENABLE_PROFILING && console.time('renderModule (total time)');
    const { document, url, extraProviders: platformProviders } = options;
    ENABLE_PROFILING && console.time('createPlatform');
    const platform = _getPlatform(platformDynamicServer, { document, url, platformProviders });
    ENABLE_PROFILING && console.timeEnd('createPlatform');
    return _render(platform, platform.bootstrapModule(moduleType)).then((result) => {
        ENABLE_PROFILING && console.timeEnd('renderModule (total time)');
        ENABLE_PROFILING && console.log('--------------');
        return result;
    });
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
    ENABLE_PROFILING && console.log('--------------');
    ENABLE_PROFILING && console.time('renderApplication (total time)');
    const { document, url, platformProviders, appId } = options;
    ENABLE_PROFILING && console.time('createPlatform');
    const platform = _getPlatform(platformDynamicServer, { document, url, platformProviders });
    ENABLE_PROFILING && console.timeEnd('createPlatform');
    const appProviders = [
        importProvidersFrom(BrowserModule.withServerTransition({ appId })),
        importProvidersFrom(ServerModule),
        ...TRANSFER_STATE_SERIALIZATION_PROVIDERS,
        ...(options.providers ?? []),
    ];
    return _render(platform, internalCreateApplication({ rootComponent, appProviders }))
        .then((result) => {
        ENABLE_PROFILING && console.timeEnd('renderApplication (total time)');
        ENABLE_PROFILING && console.log('--------------');
        return result;
    });
}
/**
 * Bootstraps an application using provided {@link NgModuleFactory} and serializes the page
 * content to string.
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
    return _render(platform, platform.bootstrapModuleFactory(moduleFactory));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1zZXJ2ZXIvc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxjQUFjLEVBQXdCLG1CQUFtQixFQUFFLGNBQWMsRUFBdUQsU0FBUyxFQUF3QixxQkFBcUIsSUFBSSxvQkFBb0IsRUFBRSwwQkFBMEIsSUFBSSx5QkFBeUIsRUFBRSxVQUFVLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDbFQsT0FBTyxFQUFDLGFBQWEsRUFBRSxjQUFjLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUN4RSxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFckMsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxxQkFBcUIsRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdFLE9BQU8sRUFBQyxxQkFBcUIsRUFBRSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDL0QsT0FBTyxFQUFDLHNDQUFzQyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFFeEU7OztHQUdHO0FBQ0gsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7QUFFOUIsK0RBQStEO0FBQy9ELDhFQUE4RTtBQUM5RSxNQUFNLGdDQUFnQyxHQUFHLEtBQUssQ0FBQztBQVEvQyxTQUFTLFlBQVksQ0FDakIsZUFBa0UsRUFDbEUsT0FBd0I7SUFDMUIsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixJQUFJLEVBQUUsQ0FBQztJQUN2RCxPQUFPLGVBQWUsQ0FBQztRQUNyQixFQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLEVBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBQztRQUNuRixjQUFjO0tBQ2YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQVMsdUJBQXVCLENBQUMsYUFBcUIsRUFBRSxjQUE4QjtJQUNwRixjQUFjLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUMvQyxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztRQUNwRCxJQUFJLE9BQU8sRUFBRTtZQUNYLFFBQVEsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1NBQ3BFO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBUyxPQUFPLENBQ1osUUFBcUIsRUFDckIsZ0JBQXdEO0lBQzFELE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsc0JBQXNCLEVBQUUsRUFBRTtRQUN0RCxNQUFNLG1CQUFtQixHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztRQUM1RCxNQUFNLFlBQVksR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDakIsTUFBTSxJQUFJLEtBQUssQ0FDWDt3RUFDOEQsQ0FBQyxDQUFDO1NBQ3JFO1FBQ0QsTUFBTSxjQUFjLEdBQW1CLHNCQUFzQixZQUFZLGNBQWMsQ0FBQyxDQUFDO1lBQ3JGLHNCQUFzQixDQUFDLENBQUM7WUFDeEIsbUJBQW1CLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sYUFBYSxHQUNmLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO1FBQzNGLE9BQU8sY0FBYyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFpQixFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2FBQ3hFLFNBQVMsRUFBRTthQUNYLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDVCx1QkFBdUIsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFFdkQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7WUFFM0QsTUFBTSxhQUFhLEdBQW1CLEVBQUUsQ0FBQztZQUV6QywyRUFBMkU7WUFDM0UsTUFBTSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBRXZFLElBQUksU0FBUyxFQUFFO2dCQUNiLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO29CQUNoQyxJQUFJO3dCQUNGLE1BQU0sY0FBYyxHQUFHLFFBQVEsRUFBRSxDQUFDO3dCQUNsQyxJQUFJLFVBQVUsQ0FBQyxjQUFjLENBQUMsRUFBRTs0QkFDOUIsMENBQTBDOzRCQUMxQyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQXFCLENBQUMsQ0FBQzt5QkFDM0M7cUJBRUY7b0JBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQ1YscUJBQXFCO3dCQUNyQixPQUFPLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLENBQUMsQ0FBQyxDQUFDO3FCQUMvRDtpQkFDRjthQUNGO1lBRUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxFQUFFO2dCQUNwQixJQUFJLGtCQUFrQixHQUFnQixJQUFJLENBQUM7Z0JBQzNDLElBQUksZ0JBQWdCLEVBQUU7b0JBQ3BCLDBEQUEwRDtvQkFDMUQsa0JBQWtCLEdBQUcsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUN2RTtnQkFFRCxNQUFNLEdBQUcsR0FBRyxhQUFhLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3hDLGNBQWMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFO29CQUMvQyxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztvQkFDcEQsSUFBSSxPQUFPLEVBQUU7d0JBQ1gsTUFBTSxRQUFRLEdBQUcsNkJBQTZCLENBQUM7d0JBQy9DLGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQzNDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQzt3QkFDckUsZ0JBQWdCLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztxQkFDL0M7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsZ0JBQWdCLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNuRCxJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzVDLGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFFdEQscUNBQXFDO2dCQUNyQyxNQUFNLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRXRDLElBQUksZ0JBQWdCLEVBQUU7b0JBQ3BCLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsa0JBQW1CLENBQUMsTUFBTSxDQUFDO29CQUNuRSxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQztvQkFDdEYsT0FBTyxDQUFDLEdBQUcsQ0FDUCw2Q0FBNkMsRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUMxRSxpQkFBaUIsRUFBRSxHQUFHLENBQUMsQ0FBQztpQkFDN0I7Z0JBRUQsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNuQixPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDLENBQUM7WUFFRixJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUM5QixPQUFPLFFBQVEsRUFBRSxDQUFDO2FBQ25CO1lBRUQsT0FBTyxPQUFPO2lCQUNULEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUNwQyxPQUFPLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUMsNENBQTRDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hFLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7aUJBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RCLENBQUMsQ0FBQyxDQUFDO0lBQ1QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBUyxvQkFBb0IsQ0FBQyxPQUFlO0lBQzNDLHVFQUF1RTtJQUN2RSxNQUFNLE9BQU8sR0FBRyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLCtCQUErQixFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRWhGLElBQUksZ0JBQWdCLEVBQUU7UUFDcEIsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFcEMsT0FBTyxHQUFHLE9BQU8sRUFBRSxDQUFDO1FBRXBCLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDbkMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQ1Asc0NBQXNDLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQ2pGLFdBQVcsRUFBRSxZQUFZLEdBQUcsV0FBVyxDQUFDLENBQUM7S0FDOUM7U0FBTTtRQUNMLE9BQU8sR0FBRyxPQUFPLEVBQUUsQ0FBQyxDQUFFLDJDQUEyQztLQUNsRTtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDO0FBRXZDOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQVMsZ0JBQWdCLENBQUMsQ0FBQztBQUUzRTs7OztHQUlHO0FBQ0gsU0FBUyxxQkFBcUIsQ0FBQyxhQUFxQjtJQUNsRCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdELE9BQU8sT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUM7QUFDL0QsQ0FBQztBQUVEOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBSSxVQUFtQixFQUFFLE9BSXBEO0lBQ0MsZ0JBQWdCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2xELGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUM5RCxNQUFNLEVBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUMsR0FBRyxPQUFPLENBQUM7SUFDbkUsZ0JBQWdCLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsRUFBRSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUMsQ0FBQyxDQUFDO0lBQ3pGLGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN0RCxPQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQWMsRUFBRSxFQUFFO1FBQ3JGLGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUNqRSxnQkFBZ0IsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbEQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0ErQkc7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQUksYUFBc0IsRUFBRSxPQU01RDtJQUNDLGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNsRCxnQkFBZ0IsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7SUFDbkUsTUFBTSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFDLEdBQUcsT0FBTyxDQUFDO0lBQzFELGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNuRCxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMscUJBQXFCLEVBQUUsRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFDLENBQUMsQ0FBQztJQUN6RixnQkFBZ0IsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDdEQsTUFBTSxZQUFZLEdBQUc7UUFDbkIsbUJBQW1CLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUNoRSxtQkFBbUIsQ0FBQyxZQUFZLENBQUM7UUFDakMsR0FBRyxzQ0FBc0M7UUFDekMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDO0tBQzdCLENBQUM7SUFDRixPQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUseUJBQXlCLENBQUMsRUFBQyxhQUFhLEVBQUUsWUFBWSxFQUFDLENBQUMsQ0FBQztTQUM3RSxJQUFJLENBQUMsQ0FBQyxNQUFjLEVBQUUsRUFBRTtRQUN2QixnQkFBZ0IsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDdEUsZ0JBQWdCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2xELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztHQWlCRztBQUNILE1BQU0sVUFBVSxtQkFBbUIsQ0FBSSxhQUFpQyxFQUFFLE9BSXpFO0lBQ0MsTUFBTSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFDLEdBQUcsT0FBTyxDQUFDO0lBQ25FLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxjQUFjLEVBQUUsRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFDLENBQUMsQ0FBQztJQUNsRixPQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FwcGxpY2F0aW9uUmVmLCBFbnZpcm9ubWVudFByb3ZpZGVycywgaW1wb3J0UHJvdmlkZXJzRnJvbSwgSW5qZWN0aW9uVG9rZW4sIE5nTW9kdWxlRmFjdG9yeSwgTmdNb2R1bGVSZWYsIFBsYXRmb3JtUmVmLCBQcm92aWRlciwgUmVuZGVyZXIyLCBTdGF0aWNQcm92aWRlciwgVHlwZSwgybVhbm5vdGF0ZUZvckh5ZHJhdGlvbiBhcyBhbm5vdGF0ZUZvckh5ZHJhdGlvbiwgybVpbnRlcm5hbENyZWF0ZUFwcGxpY2F0aW9uIGFzIGludGVybmFsQ3JlYXRlQXBwbGljYXRpb24sIMm1aXNQcm9taXNlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QnJvd3Nlck1vZHVsZSwgybVUUkFOU0lUSU9OX0lEfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyJztcbmltcG9ydCB7Zmlyc3R9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtQbGF0Zm9ybVN0YXRlfSBmcm9tICcuL3BsYXRmb3JtX3N0YXRlJztcbmltcG9ydCB7cGxhdGZvcm1EeW5hbWljU2VydmVyLCBwbGF0Zm9ybVNlcnZlciwgU2VydmVyTW9kdWxlfSBmcm9tICcuL3NlcnZlcic7XG5pbXBvcnQge0JFRk9SRV9BUFBfU0VSSUFMSVpFRCwgSU5JVElBTF9DT05GSUd9IGZyb20gJy4vdG9rZW5zJztcbmltcG9ydCB7VFJBTlNGRVJfU1RBVEVfU0VSSUFMSVpBVElPTl9QUk9WSURFUlN9IGZyb20gJy4vdHJhbnNmZXJfc3RhdGUnO1xuXG4vKipcbiAqIEVuYWJsZXMgZXh0cmEgcHJvZmlsaW5nIG91dHB1dCBpbiB0aGUgY29uc29sZSAoc3VjaCBhc1xuICogYW4gZXhlY3V0aW9uIHRpbWUgb2YgYSBwYXJ0aWN1bGFyIGZ1bmN0aW9uL3N1YnN5c3RlbSkuXG4gKi9cbmNvbnN0IEVOQUJMRV9QUk9GSUxJTkcgPSB0cnVlO1xuXG4vLyBNYWtlIHN1cmUgdGhpcyBmbGFnIGlzIGluIHN5bmMgd2l0aCBhIHNpbWlsYXIgb25lIGluIGBjb3JlYC5cbi8vIFRPRE86IHJlbW92ZSB0aGlzIGZsYWcgZXZlbnR1YWxseSwgd2Ugc2hvdWxkIGFsd2F5cyBwcm9kdWNlIG9wdGltaXplZCBrZXlzLlxuY29uc3QgRU5BQkxFX0hZRFJBVElPTl9LRVlfQ09NUFJFU1NJT04gPSBmYWxzZTtcblxuaW50ZXJmYWNlIFBsYXRmb3JtT3B0aW9ucyB7XG4gIGRvY3VtZW50Pzogc3RyaW5nfERvY3VtZW50O1xuICB1cmw/OiBzdHJpbmc7XG4gIHBsYXRmb3JtUHJvdmlkZXJzPzogUHJvdmlkZXJbXTtcbn1cblxuZnVuY3Rpb24gX2dldFBsYXRmb3JtKFxuICAgIHBsYXRmb3JtRmFjdG9yeTogKGV4dHJhUHJvdmlkZXJzOiBTdGF0aWNQcm92aWRlcltdKSA9PiBQbGF0Zm9ybVJlZixcbiAgICBvcHRpb25zOiBQbGF0Zm9ybU9wdGlvbnMpOiBQbGF0Zm9ybVJlZiB7XG4gIGNvbnN0IGV4dHJhUHJvdmlkZXJzID0gb3B0aW9ucy5wbGF0Zm9ybVByb3ZpZGVycyA/PyBbXTtcbiAgcmV0dXJuIHBsYXRmb3JtRmFjdG9yeShbXG4gICAge3Byb3ZpZGU6IElOSVRJQUxfQ09ORklHLCB1c2VWYWx1ZToge2RvY3VtZW50OiBvcHRpb25zLmRvY3VtZW50LCB1cmw6IG9wdGlvbnMudXJsfX0sXG4gICAgZXh0cmFQcm92aWRlcnNcbiAgXSk7XG59XG5cbi8qKlxuICogQWRkcyB0aGUgYG5nLXNlcnZlci1jb250ZXh0YCBhdHRyaWJ1dGUgdG8gaG9zdCBlbGVtZW50cyBvZiBhbGwgYm9vdHN0cmFwcGVkIGNvbXBvbmVudHNcbiAqIHdpdGhpbiBhIGdpdmVuIGFwcGxpY2F0aW9uLlxuICovXG5mdW5jdGlvbiBhcHBlbmRTZXJ2ZXJDb250ZXh0SW5mbyhzZXJ2ZXJDb250ZXh0OiBzdHJpbmcsIGFwcGxpY2F0aW9uUmVmOiBBcHBsaWNhdGlvblJlZikge1xuICBhcHBsaWNhdGlvblJlZi5jb21wb25lbnRzLmZvckVhY2goY29tcG9uZW50UmVmID0+IHtcbiAgICBjb25zdCByZW5kZXJlciA9IGNvbXBvbmVudFJlZi5pbmplY3Rvci5nZXQoUmVuZGVyZXIyKTtcbiAgICBjb25zdCBlbGVtZW50ID0gY29tcG9uZW50UmVmLmxvY2F0aW9uLm5hdGl2ZUVsZW1lbnQ7XG4gICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgIHJlbmRlcmVyLnNldEF0dHJpYnV0ZShlbGVtZW50LCAnbmctc2VydmVyLWNvbnRleHQnLCBzZXJ2ZXJDb250ZXh0KTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBfcmVuZGVyPFQ+KFxuICAgIHBsYXRmb3JtOiBQbGF0Zm9ybVJlZixcbiAgICBib290c3RyYXBQcm9taXNlOiBQcm9taXNlPE5nTW9kdWxlUmVmPFQ+fEFwcGxpY2F0aW9uUmVmPik6IFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBib290c3RyYXBQcm9taXNlLnRoZW4oKG1vZHVsZU9yQXBwbGljYXRpb25SZWYpID0+IHtcbiAgICBjb25zdCBlbnZpcm9ubWVudEluamVjdG9yID0gbW9kdWxlT3JBcHBsaWNhdGlvblJlZi5pbmplY3RvcjtcbiAgICBjb25zdCB0cmFuc2l0aW9uSWQgPSBlbnZpcm9ubWVudEluamVjdG9yLmdldCjJtVRSQU5TSVRJT05fSUQsIG51bGwpO1xuICAgIGlmICghdHJhbnNpdGlvbklkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYHJlbmRlck1vZHVsZVtGYWN0b3J5XSgpIHJlcXVpcmVzIHRoZSB1c2Ugb2YgQnJvd3Nlck1vZHVsZS53aXRoU2VydmVyVHJhbnNpdGlvbigpIHRvIGVuc3VyZVxudGhlIHNlcnZlci1yZW5kZXJlZCBhcHAgY2FuIGJlIHByb3Blcmx5IGJvb3RzdHJhcHBlZCBpbnRvIGEgY2xpZW50IGFwcC5gKTtcbiAgICB9XG4gICAgY29uc3QgYXBwbGljYXRpb25SZWY6IEFwcGxpY2F0aW9uUmVmID0gbW9kdWxlT3JBcHBsaWNhdGlvblJlZiBpbnN0YW5jZW9mIEFwcGxpY2F0aW9uUmVmID9cbiAgICAgICAgbW9kdWxlT3JBcHBsaWNhdGlvblJlZiA6XG4gICAgICAgIGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KEFwcGxpY2F0aW9uUmVmKTtcbiAgICBjb25zdCBzZXJ2ZXJDb250ZXh0ID1cbiAgICAgICAgc2FuaXRpemVTZXJ2ZXJDb250ZXh0KGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KFNFUlZFUl9DT05URVhULCBERUZBVUxUX1NFUlZFUl9DT05URVhUKSk7XG4gICAgcmV0dXJuIGFwcGxpY2F0aW9uUmVmLmlzU3RhYmxlLnBpcGUoKGZpcnN0KChpc1N0YWJsZTogYm9vbGVhbikgPT4gaXNTdGFibGUpKSlcbiAgICAgICAgLnRvUHJvbWlzZSgpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBhcHBlbmRTZXJ2ZXJDb250ZXh0SW5mbyhzZXJ2ZXJDb250ZXh0LCBhcHBsaWNhdGlvblJlZik7XG5cbiAgICAgICAgICBjb25zdCBwbGF0Zm9ybVN0YXRlID0gcGxhdGZvcm0uaW5qZWN0b3IuZ2V0KFBsYXRmb3JtU3RhdGUpO1xuXG4gICAgICAgICAgY29uc3QgYXN5bmNQcm9taXNlczogUHJvbWlzZTxhbnk+W10gPSBbXTtcblxuICAgICAgICAgIC8vIFJ1biBhbnkgQkVGT1JFX0FQUF9TRVJJQUxJWkVEIGNhbGxiYWNrcyBqdXN0IGJlZm9yZSByZW5kZXJpbmcgdG8gc3RyaW5nLlxuICAgICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9IGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KEJFRk9SRV9BUFBfU0VSSUFMSVpFRCwgbnVsbCk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNhbGxiYWNrIG9mIGNhbGxiYWNrcykge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrUmVzdWx0ID0gY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAoybVpc1Byb21pc2UoY2FsbGJhY2tSZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAvLyBUT0RPOiBpbiBUUzMuNywgY2FsbGJhY2tSZXN1bHQgaXMgdm9pZC5cbiAgICAgICAgICAgICAgICAgIGFzeW5jUHJvbWlzZXMucHVzaChjYWxsYmFja1Jlc3VsdCBhcyBhbnkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGV4Y2VwdGlvbnMuXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdJZ25vcmluZyBCRUZPUkVfQVBQX1NFUklBTElaRUQgRXhjZXB0aW9uOiAnLCBlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGNvbXBsZXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgbGV0IHByZUFubm90YXRlZE91dHB1dDogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgICAgICAgICAgaWYgKEVOQUJMRV9QUk9GSUxJTkcpIHtcbiAgICAgICAgICAgICAgLy8gQ2hlY2sgdGhlIEhUTUwgb3V0cHV0IHNpemUgYmVmb3JlIHdlIGFkZCBleHRyYSBtYXJrZXJzLlxuICAgICAgICAgICAgICBwcmVBbm5vdGF0ZWRPdXRwdXQgPSBwbGF0Zm9ybVN0YXRlLnJlbmRlclRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQcmUtYW5ub3RhdGVkIG91dHB1dCBzaXplOiAnLCBwcmVBbm5vdGF0ZWRPdXRwdXQubGVuZ3RoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZG9jID0gcGxhdGZvcm1TdGF0ZS5nZXREb2N1bWVudCgpO1xuICAgICAgICAgICAgYXBwbGljYXRpb25SZWYuY29tcG9uZW50cy5mb3JFYWNoKGNvbXBvbmVudFJlZiA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBjb21wb25lbnRSZWYubG9jYXRpb24ubmF0aXZlRWxlbWVudDtcbiAgICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWJ1Z0tleSA9ICcqIEh5ZHJhdGlvbiBhbm5vdGF0aW9uIHRpbWUnO1xuICAgICAgICAgICAgICAgIEVOQUJMRV9QUk9GSUxJTkcgJiYgY29uc29sZS50aW1lKGRlYnVnS2V5KTtcbiAgICAgICAgICAgICAgICBhbm5vdGF0ZUZvckh5ZHJhdGlvbihkb2MsIGVsZW1lbnQsIEVOQUJMRV9IWURSQVRJT05fS0VZX0NPTVBSRVNTSU9OKTtcbiAgICAgICAgICAgICAgICBFTkFCTEVfUFJPRklMSU5HICYmIGNvbnNvbGUudGltZUVuZChkZWJ1Z0tleSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBFTkFCTEVfUFJPRklMSU5HICYmIGNvbnNvbGUudGltZSgncmVuZGVyVG9TdHJpbmcnKTtcbiAgICAgICAgICAgIGxldCBvdXRwdXQgPSBwbGF0Zm9ybVN0YXRlLnJlbmRlclRvU3RyaW5nKCk7XG4gICAgICAgICAgICBFTkFCTEVfUFJPRklMSU5HICYmIGNvbnNvbGUudGltZUVuZCgncmVuZGVyVG9TdHJpbmcnKTtcblxuICAgICAgICAgICAgLy8gU2hvcnRlbnMgYDwhLS0xfDUtLT5gIHRvIGA8ITF8NT5gLlxuICAgICAgICAgICAgb3V0cHV0ID0gY29tcHJlc3NDb21tZW50Tm9kZXMob3V0cHV0KTtcblxuICAgICAgICAgICAgaWYgKEVOQUJMRV9QUk9GSUxJTkcpIHtcbiAgICAgICAgICAgICAgY29uc3Qgb3ZlcmhlYWRJbkJ5dGVzID0gb3V0cHV0Lmxlbmd0aCAtIHByZUFubm90YXRlZE91dHB1dCEubGVuZ3RoO1xuICAgICAgICAgICAgICBjb25zdCBvdmVyaGVhZEluUGVyY2VudCA9IE1hdGgucm91bmQoKG92ZXJoZWFkSW5CeXRlcyAvIG91dHB1dC5sZW5ndGgpICogMTAwMDApIC8gMTAwO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICAgICcqIEh5ZHJhdGlvbiBhbm5vdGF0aW9uIEhUTUwgc2l6ZSBvdmVyaGVhZDogJywgb3ZlcmhlYWRJbkJ5dGVzLCAnIGNoYXJzLCAnLFxuICAgICAgICAgICAgICAgICAgb3ZlcmhlYWRJblBlcmNlbnQsICclJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHBsYXRmb3JtLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmIChhc3luY1Byb21pc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBsZXRlKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIFByb21pc2VcbiAgICAgICAgICAgICAgLmFsbChhc3luY1Byb21pc2VzLm1hcChhc3luY1Byb21pc2UgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBhc3luY1Byb21pc2UuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0lnbm9yaW5nIEJFRk9SRV9BUFBfU0VSSUFMSVpFRCBFeGNlcHRpb246ICcsIGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgLnRoZW4oY29tcGxldGUpO1xuICAgICAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIHJlcGxhY2Ugc2VyaWFsaXplZCBjb21tZW50IG5vZGVzIHdpdGhcbiAqIGEgbW9yZSBjb21wYWN0IHJlcHJlc2VudGF0aW9uLCBpLmUuIGA8IS0tMXw1LS0+YCAtPiBgPCExfDU+YC5cbiAqIElkZWFsbHksIGl0IHNob3VsZCBiZSBhIHBhcnQgb2YgRG9taW5vIGFuZCB0aGVyZSBzaG91bGQgYmVcbiAqIG5vIG5lZWQgdG8gZ28gb3ZlciB0aGUgSFRNTCBzdHJpbmcgb25jZSBhZ2FpbiwgYnV0IERvbWlub1xuICogZG9lc24ndCBzdXBwb3J0IHRoaXMgYXQgdGhlIG1vbWVudC5cbiAqL1xuZnVuY3Rpb24gY29tcHJlc3NDb21tZW50Tm9kZXMoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy8gTWF0Y2ggcGF0dGVybnMgbGlrZTogYCp8PG51bWJlcj5gLCBgKj88bnVtYmVyPmAgYW5kIGAqP3ZjcjxudW1iZXI+YC5cbiAgY29uc3Qgc2hvcnRlbiA9ICgpID0+IGNvbnRlbnQucmVwbGFjZSgvPCEtLSguKj8oW3w/XVxcZCt8dmNyXFxkKykpLS0+L2csICc8ISQxPicpO1xuXG4gIGlmIChFTkFCTEVfUFJPRklMSU5HKSB7XG4gICAgY29uc3QgbGVuZ3RoQmVmb3JlID0gY29udGVudC5sZW5ndGg7XG4gICAgY29uc29sZS50aW1lKCdjb21wYWN0Q29tbWVudE5vZGVzJyk7XG5cbiAgICBjb250ZW50ID0gc2hvcnRlbigpO1xuXG4gICAgY29uc3QgbGVuZ3RoQWZ0ZXIgPSBjb250ZW50Lmxlbmd0aDtcbiAgICBjb25zb2xlLnRpbWVFbmQoJ2NvbXBhY3RDb21tZW50Tm9kZXMnKTtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgJ2NvbXBhY3RDb21tZW50Tm9kZXM6IG9yaWdpbmFsIHNpemU6ICcsIGxlbmd0aEJlZm9yZSwgJywgbmV3IHNpemU6ICcsIGxlbmd0aEFmdGVyLFxuICAgICAgICAnLCBzYXZlZDogJywgbGVuZ3RoQmVmb3JlIC0gbGVuZ3RoQWZ0ZXIpO1xuICB9IGVsc2Uge1xuICAgIGNvbnRlbnQgPSBzaG9ydGVuKCk7ICAvLyBzYW1lIGFzIGFib3ZlLCBidXQgd2l0aG91dCBleHRyYSBsb2dnaW5nXG4gIH1cbiAgcmV0dXJuIGNvbnRlbnQ7XG59XG5cbi8qKlxuICogU3BlY2lmaWVzIHRoZSB2YWx1ZSB0aGF0IHNob3VsZCBiZSB1c2VkIGlmIG5vIHNlcnZlciBjb250ZXh0IHZhbHVlIGhhcyBiZWVuIHByb3ZpZGVkLlxuICovXG5jb25zdCBERUZBVUxUX1NFUlZFUl9DT05URVhUID0gJ290aGVyJztcblxuLyoqXG4gKiBBbiBpbnRlcm5hbCB0b2tlbiB0aGF0IGFsbG93cyBwcm92aWRpbmcgZXh0cmEgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHNlcnZlciBjb250ZXh0XG4gKiAoZS5nLiB3aGV0aGVyIFNTUiBvciBTU0cgd2FzIHVzZWQpLiBUaGUgdmFsdWUgaXMgYSBzdHJpbmcgYW5kIGNoYXJhY3RlcnMgb3RoZXJcbiAqIHRoYW4gW2EtekEtWjAtOVxcLV0gYXJlIHJlbW92ZWQuIFNlZSB0aGUgZGVmYXVsdCB2YWx1ZSBpbiBgREVGQVVMVF9TRVJWRVJfQ09OVEVYVGAgY29uc3QuXG4gKi9cbmV4cG9ydCBjb25zdCBTRVJWRVJfQ09OVEVYVCA9IG5ldyBJbmplY3Rpb25Ub2tlbjxzdHJpbmc+KCdTRVJWRVJfQ09OVEVYVCcpO1xuXG4vKipcbiAqIFNhbml0aXplcyBwcm92aWRlZCBzZXJ2ZXIgY29udGV4dDpcbiAqIC0gcmVtb3ZlcyBhbGwgY2hhcmFjdGVycyBvdGhlciB0aGFuIGEteiwgQS1aLCAwLTkgYW5kIGAtYFxuICogLSByZXR1cm5zIGBvdGhlcmAgaWYgbm90aGluZyBpcyBwcm92aWRlZCBvciB0aGUgc3RyaW5nIGlzIGVtcHR5IGFmdGVyIHNhbml0aXphdGlvblxuICovXG5mdW5jdGlvbiBzYW5pdGl6ZVNlcnZlckNvbnRleHQoc2VydmVyQ29udGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY29udGV4dCA9IHNlcnZlckNvbnRleHQucmVwbGFjZSgvW15hLXpBLVowLTlcXC1dL2csICcnKTtcbiAgcmV0dXJuIGNvbnRleHQubGVuZ3RoID4gMCA/IGNvbnRleHQgOiBERUZBVUxUX1NFUlZFUl9DT05URVhUO1xufVxuXG4vKipcbiAqIEJvb3RzdHJhcHMgYW4gYXBwbGljYXRpb24gdXNpbmcgcHJvdmlkZWQgTmdNb2R1bGUgYW5kIHNlcmlhbGl6ZXMgdGhlIHBhZ2UgY29udGVudCB0byBzdHJpbmcuXG4gKlxuICogQHBhcmFtIG1vZHVsZVR5cGUgQSByZWZlcmVuY2UgdG8gYW4gTmdNb2R1bGUgdGhhdCBzaG91bGQgYmUgdXNlZCBmb3IgYm9vdHN0cmFwLlxuICogQHBhcmFtIG9wdGlvbnMgQWRkaXRpb25hbCBjb25maWd1cmF0aW9uIGZvciB0aGUgcmVuZGVyIG9wZXJhdGlvbjpcbiAqICAtIGBkb2N1bWVudGAgLSB0aGUgZG9jdW1lbnQgb2YgdGhlIHBhZ2UgdG8gcmVuZGVyLCBlaXRoZXIgYXMgYW4gSFRNTCBzdHJpbmcgb3JcbiAqICAgICAgICAgICAgICAgICBhcyBhIHJlZmVyZW5jZSB0byB0aGUgYGRvY3VtZW50YCBpbnN0YW5jZS5cbiAqICAtIGB1cmxgIC0gdGhlIFVSTCBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKiAgLSBgZXh0cmFQcm92aWRlcnNgIC0gc2V0IG9mIHBsYXRmb3JtIGxldmVsIHByb3ZpZGVycyBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyTW9kdWxlPFQ+KG1vZHVsZVR5cGU6IFR5cGU8VD4sIG9wdGlvbnM6IHtcbiAgZG9jdW1lbnQ/OiBzdHJpbmd8RG9jdW1lbnQsXG4gIHVybD86IHN0cmluZyxcbiAgZXh0cmFQcm92aWRlcnM/OiBTdGF0aWNQcm92aWRlcltdLFxufSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIEVOQUJMRV9QUk9GSUxJTkcgJiYgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tJyk7XG4gIEVOQUJMRV9QUk9GSUxJTkcgJiYgY29uc29sZS50aW1lKCdyZW5kZXJNb2R1bGUgKHRvdGFsIHRpbWUpJyk7XG4gIGNvbnN0IHtkb2N1bWVudCwgdXJsLCBleHRyYVByb3ZpZGVyczogcGxhdGZvcm1Qcm92aWRlcnN9ID0gb3B0aW9ucztcbiAgRU5BQkxFX1BST0ZJTElORyAmJiBjb25zb2xlLnRpbWUoJ2NyZWF0ZVBsYXRmb3JtJyk7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtRHluYW1pY1NlcnZlciwge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzfSk7XG4gIEVOQUJMRV9QUk9GSUxJTkcgJiYgY29uc29sZS50aW1lRW5kKCdjcmVhdGVQbGF0Zm9ybScpO1xuICByZXR1cm4gX3JlbmRlcihwbGF0Zm9ybSwgcGxhdGZvcm0uYm9vdHN0cmFwTW9kdWxlKG1vZHVsZVR5cGUpKS50aGVuKChyZXN1bHQ6IHN0cmluZykgPT4ge1xuICAgIEVOQUJMRV9QUk9GSUxJTkcgJiYgY29uc29sZS50aW1lRW5kKCdyZW5kZXJNb2R1bGUgKHRvdGFsIHRpbWUpJyk7XG4gICAgRU5BQkxFX1BST0ZJTElORyAmJiBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0nKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn1cblxuLyoqXG4gKiBCb290c3RyYXBzIGFuIGluc3RhbmNlIG9mIGFuIEFuZ3VsYXIgYXBwbGljYXRpb24gYW5kIHJlbmRlcnMgaXQgdG8gYSBzdHJpbmcuXG4gKlxuICogTm90ZTogdGhlIHJvb3QgY29tcG9uZW50IHBhc3NlZCBpbnRvIHRoaXMgZnVuY3Rpb24gKm11c3QqIGJlIGEgc3RhbmRhbG9uZSBvbmUgKHNob3VsZCBoYXZlIHRoZVxuICogYHN0YW5kYWxvbmU6IHRydWVgIGZsYWcgaW4gdGhlIGBAQ29tcG9uZW50YCBkZWNvcmF0b3IgY29uZmlnKS5cbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBAQ29tcG9uZW50KHtcbiAqICAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAqICAgdGVtcGxhdGU6ICdIZWxsbyB3b3JsZCEnXG4gKiB9KVxuICogY2xhc3MgUm9vdENvbXBvbmVudCB7fVxuICpcbiAqIGNvbnN0IG91dHB1dDogc3RyaW5nID0gYXdhaXQgcmVuZGVyQXBwbGljYXRpb24oUm9vdENvbXBvbmVudCwge2FwcElkOiAnc2VydmVyLWFwcCd9KTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSByb290Q29tcG9uZW50IEEgcmVmZXJlbmNlIHRvIGEgU3RhbmRhbG9uZSBDb21wb25lbnQgdGhhdCBzaG91bGQgYmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSByZW5kZXIgb3BlcmF0aW9uOlxuICogIC0gYGFwcElkYCAtIGEgc3RyaW5nIGlkZW50aWZpZXIgb2YgdGhpcyBhcHBsaWNhdGlvbi4gVGhlIGFwcElkIGlzIHVzZWQgdG8gcHJlZml4IGFsbFxuICogICAgICAgICAgICAgIHNlcnZlci1nZW5lcmF0ZWQgc3R5bGluZ3MgYW5kIHN0YXRlIGtleXMgb2YgdGhlIGFwcGxpY2F0aW9uIGluIFRyYW5zZmVyU3RhdGVcbiAqICAgICAgICAgICAgICB1c2UtY2FzZXMuXG4gKiAgLSBgZG9jdW1lbnRgIC0gdGhlIGRvY3VtZW50IG9mIHRoZSBwYWdlIHRvIHJlbmRlciwgZWl0aGVyIGFzIGFuIEhUTUwgc3RyaW5nIG9yXG4gKiAgICAgICAgICAgICAgICAgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGBkb2N1bWVudGAgaW5zdGFuY2UuXG4gKiAgLSBgdXJsYCAtIHRoZSBVUkwgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYHByb3ZpZGVyc2AgLSBzZXQgb2YgYXBwbGljYXRpb24gbGV2ZWwgcHJvdmlkZXJzIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqICAtIGBwbGF0Zm9ybVByb3ZpZGVyc2AgLSB0aGUgcGxhdGZvcm0gbGV2ZWwgcHJvdmlkZXJzIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqXG4gKiBAcmV0dXJucyBBIFByb21pc2UsIHRoYXQgcmV0dXJucyBzZXJpYWxpemVkICh0byBhIHN0cmluZykgcmVuZGVyZWQgcGFnZSwgb25jZSByZXNvbHZlZC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAZGV2ZWxvcGVyUHJldmlld1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQXBwbGljYXRpb248VD4ocm9vdENvbXBvbmVudDogVHlwZTxUPiwgb3B0aW9uczoge1xuICBhcHBJZDogc3RyaW5nLFxuICBkb2N1bWVudD86IHN0cmluZ3xEb2N1bWVudCxcbiAgdXJsPzogc3RyaW5nLFxuICBwcm92aWRlcnM/OiBBcnJheTxQcm92aWRlcnxFbnZpcm9ubWVudFByb3ZpZGVycz4sXG4gIHBsYXRmb3JtUHJvdmlkZXJzPzogUHJvdmlkZXJbXSxcbn0pOiBQcm9taXNlPHN0cmluZz4ge1xuICBFTkFCTEVfUFJPRklMSU5HICYmIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLScpO1xuICBFTkFCTEVfUFJPRklMSU5HICYmIGNvbnNvbGUudGltZSgncmVuZGVyQXBwbGljYXRpb24gKHRvdGFsIHRpbWUpJyk7XG4gIGNvbnN0IHtkb2N1bWVudCwgdXJsLCBwbGF0Zm9ybVByb3ZpZGVycywgYXBwSWR9ID0gb3B0aW9ucztcbiAgRU5BQkxFX1BST0ZJTElORyAmJiBjb25zb2xlLnRpbWUoJ2NyZWF0ZVBsYXRmb3JtJyk7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtRHluYW1pY1NlcnZlciwge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzfSk7XG4gIEVOQUJMRV9QUk9GSUxJTkcgJiYgY29uc29sZS50aW1lRW5kKCdjcmVhdGVQbGF0Zm9ybScpO1xuICBjb25zdCBhcHBQcm92aWRlcnMgPSBbXG4gICAgaW1wb3J0UHJvdmlkZXJzRnJvbShCcm93c2VyTW9kdWxlLndpdGhTZXJ2ZXJUcmFuc2l0aW9uKHthcHBJZH0pKSxcbiAgICBpbXBvcnRQcm92aWRlcnNGcm9tKFNlcnZlck1vZHVsZSksXG4gICAgLi4uVFJBTlNGRVJfU1RBVEVfU0VSSUFMSVpBVElPTl9QUk9WSURFUlMsXG4gICAgLi4uKG9wdGlvbnMucHJvdmlkZXJzID8/IFtdKSxcbiAgXTtcbiAgcmV0dXJuIF9yZW5kZXIocGxhdGZvcm0sIGludGVybmFsQ3JlYXRlQXBwbGljYXRpb24oe3Jvb3RDb21wb25lbnQsIGFwcFByb3ZpZGVyc30pKVxuICAgICAgLnRoZW4oKHJlc3VsdDogc3RyaW5nKSA9PiB7XG4gICAgICAgIEVOQUJMRV9QUk9GSUxJTkcgJiYgY29uc29sZS50aW1lRW5kKCdyZW5kZXJBcHBsaWNhdGlvbiAodG90YWwgdGltZSknKTtcbiAgICAgICAgRU5BQkxFX1BST0ZJTElORyAmJiBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0nKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0pO1xufVxuXG4vKipcbiAqIEJvb3RzdHJhcHMgYW4gYXBwbGljYXRpb24gdXNpbmcgcHJvdmlkZWQge0BsaW5rIE5nTW9kdWxlRmFjdG9yeX0gYW5kIHNlcmlhbGl6ZXMgdGhlIHBhZ2VcbiAqIGNvbnRlbnQgdG8gc3RyaW5nLlxuICpcbiAqIEBwYXJhbSBtb2R1bGVGYWN0b3J5IEFuIGluc3RhbmNlIG9mIHRoZSB7QGxpbmsgTmdNb2R1bGVGYWN0b3J5fSB0aGF0IHNob3VsZCBiZSB1c2VkIGZvclxuICogICAgIGJvb3RzdHJhcC5cbiAqIEBwYXJhbSBvcHRpb25zIEFkZGl0aW9uYWwgY29uZmlndXJhdGlvbiBmb3IgdGhlIHJlbmRlciBvcGVyYXRpb246XG4gKiAgLSBgZG9jdW1lbnRgIC0gdGhlIGRvY3VtZW50IG9mIHRoZSBwYWdlIHRvIHJlbmRlciwgZWl0aGVyIGFzIGFuIEhUTUwgc3RyaW5nIG9yXG4gKiAgICAgICAgICAgICAgICAgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGBkb2N1bWVudGAgaW5zdGFuY2UuXG4gKiAgLSBgdXJsYCAtIHRoZSBVUkwgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYGV4dHJhUHJvdmlkZXJzYCAtIHNldCBvZiBwbGF0Zm9ybSBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqXG4gKiBAZGVwcmVjYXRlZFxuICogVGhpcyBzeW1ib2wgaXMgbm8gbG9uZ2VyIG5lY2Vzc2FyeSBhcyBvZiBBbmd1bGFyIHYxMy5cbiAqIFVzZSB7QGxpbmsgcmVuZGVyTW9kdWxlfSBBUEkgaW5zdGVhZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlck1vZHVsZUZhY3Rvcnk8VD4obW9kdWxlRmFjdG9yeTogTmdNb2R1bGVGYWN0b3J5PFQ+LCBvcHRpb25zOiB7XG4gIGRvY3VtZW50Pzogc3RyaW5nLFxuICB1cmw/OiBzdHJpbmcsXG4gIGV4dHJhUHJvdmlkZXJzPzogU3RhdGljUHJvdmlkZXJbXSxcbn0pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7ZG9jdW1lbnQsIHVybCwgZXh0cmFQcm92aWRlcnM6IHBsYXRmb3JtUHJvdmlkZXJzfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtU2VydmVyLCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnN9KTtcbiAgcmV0dXJuIF9yZW5kZXIocGxhdGZvcm0sIHBsYXRmb3JtLmJvb3RzdHJhcE1vZHVsZUZhY3RvcnkobW9kdWxlRmFjdG9yeSkpO1xufVxuIl19