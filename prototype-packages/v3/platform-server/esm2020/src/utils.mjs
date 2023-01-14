/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ApplicationRef, importProvidersFrom, InjectionToken, Renderer2, ɵgetLViewById as getLViewById, ɵinternalCreateApplication as internalCreateApplication, ɵisPromise, } from '@angular/core';
import { ɵcollectNativeNodes as collectNativeNodes } from '@angular/core';
import { ɵCONTAINER_HEADER_OFFSET as CONTAINER_HEADER_OFFSET, ɵTYPE as TYPE } from '@angular/core';
import { ɵisRootView as isRootView } from '@angular/core';
import { ɵCONTEXT as CONTEXT, ɵHEADER_OFFSET as HEADER_OFFSET, ɵHOST as HOST, ɵTVIEW as TVIEW } from '@angular/core';
import { ɵunwrapRNode as unwrapRNode } from '@angular/core';
import { BrowserModule, ɵTRANSITION_ID } from '@angular/platform-browser';
import { first } from 'rxjs/operators';
import { navigateBetween, NodeNavigationStep } from './node_nav';
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
// TODO: import from `@angular/core` instead, this is just a copy.
export var I18nCreateOpCode;
(function (I18nCreateOpCode) {
    I18nCreateOpCode[I18nCreateOpCode["SHIFT"] = 2] = "SHIFT";
    I18nCreateOpCode[I18nCreateOpCode["APPEND_EAGERLY"] = 1] = "APPEND_EAGERLY";
    I18nCreateOpCode[I18nCreateOpCode["COMMENT"] = 2] = "COMMENT";
})(I18nCreateOpCode || (I18nCreateOpCode = {}));
export function isLContainer(value) {
    return Array.isArray(value) && value[TYPE] === true;
}
function firstRNodeInElementContainer(tView, lView, tNode) {
    const rootNodes = [];
    // TODO: find more efficient way to do this. We don't need to traverse the entire
    // structure, we can just stop after examining the first node.
    collectNativeNodes(tView, lView, tNode, rootNodes);
    return rootNodes[0];
}
function isProjectionTNode(tNode) {
    return (tNode.type & 16 /* TNodeType.Projection */) === 16 /* TNodeType.Projection */;
}
export function isTI18nNode(obj) {
    // TODO: consider adding a node type to TI18n?
    return obj.hasOwnProperty('create') && obj.hasOwnProperty('update');
}
export function findClosestElementTNode(tNode) {
    let parentTNode = tNode;
    // FIXME: this condition should also take into account whether
    // resulting tNode is not marked as `insertBeforeIndex`.
    while (parentTNode !== null &&
        ((parentTNode.type & 2 /* TNodeType.Element */) !== 2 /* TNodeType.Element */ ||
            parentTNode.insertBeforeIndex !== null)) {
        tNode = parentTNode;
        parentTNode = tNode.parent;
    }
    return parentTNode;
}
function serializeLView(lView, hostNode) {
    const ngh = {
        containers: {},
        templates: {},
        nodes: {},
    };
    const tView = lView[TVIEW];
    for (let i = HEADER_OFFSET; i < tView.bindingStartIndex; i++) {
        debugger;
        let targetNode = null;
        const adjustedIndex = i - HEADER_OFFSET;
        const tNode = tView.data[i];
        // tNode may be null in the case of a localRef
        if (!tNode) {
            continue;
        }
        if (Array.isArray(tNode.projection)) {
            // TODO: handle `RNode[]` as well.
            for (const headTNode of tNode.projection) {
                // We may have `null`s in slots with no projected content.
                // Also, if we process re-projected content (i.e. `<ng-content>`
                // appears at projection location), skip annotations for this content
                // since all DOM nodes in this projection were handled while processing
                // a parent lView, which contains those nodes.
                if (headTNode && !isProjectionTNode(headTNode)) {
                    ngh.nodes[headTNode.index - HEADER_OFFSET] = calcPathForNode(tView, lView, headTNode);
                }
            }
        }
        if (isLContainer(lView[i])) {
            // this is a container
            const tNode = tView.data[i];
            const embeddedTView = tNode.tViews;
            if (embeddedTView !== null) {
                if (Array.isArray(embeddedTView)) {
                    throw new Error(`Expecting tNode.tViews to be an object, but it's an array.`);
                }
                ngh.templates[i - HEADER_OFFSET] = getTViewSsrId(embeddedTView);
            }
            targetNode = unwrapRNode(lView[i][HOST]);
            const container = serializeLContainer(lView[i], hostNode, adjustedIndex);
            ngh.containers[adjustedIndex] = container;
        }
        else if (Array.isArray(lView[i])) {
            // this is a component
            targetNode = unwrapRNode(lView[i][HOST]);
            annotateForHydration(targetNode, lView[i]);
        }
        else if (isTI18nNode(tNode)) {
            // Process i18n text nodes...
            const createOpCodes = tNode.create;
            for (let i = 0; i < createOpCodes.length; i++) {
                const opCode = createOpCodes[i++];
                const appendNow = (opCode & I18nCreateOpCode.APPEND_EAGERLY) === I18nCreateOpCode.APPEND_EAGERLY;
                const index = opCode >>> I18nCreateOpCode.SHIFT;
                const tNode = tView.data[index];
                // if (appendNow) {
                const parentTNode = findClosestElementTNode(tNode);
                const path = calcPathForNode(tView, lView, tNode, parentTNode);
                ngh.nodes[tNode.index - HEADER_OFFSET] = path;
                // }
            }
        }
        else if (tNode.insertBeforeIndex) {
            debugger;
            if (Array.isArray(tNode.insertBeforeIndex) && tNode.insertBeforeIndex[0] !== null) {
                // A root node within i18n block.
                // TODO: add a comment on *why* we need a path here.
                const path = calcPathForNode(tView, lView, tNode);
                ngh.nodes[tNode.index - HEADER_OFFSET] = path;
            }
        }
        else {
            const tNodeType = tNode.type;
            // <ng-container> case
            if (tNodeType & 8 /* TNodeType.ElementContainer */) {
                const rootNodes = [];
                collectNativeNodes(tView, lView, tNode.child, rootNodes);
                // This is an "element" container (vs "view" container),
                // so it's only represented by the number of top-level nodes
                // as a shift to get to a corresponding comment node.
                const container = {
                    views: [],
                    numRootNodes: rootNodes.length,
                };
                ngh.containers[adjustedIndex] = container;
            }
            else if (tNodeType & 16 /* TNodeType.Projection */) {
                // Current TNode has no DOM element associated with it,
                // so the following node would not be able to find an anchor.
                // Use full path instead.
                let nextTNode = tNode.next;
                while (nextTNode !== null && (nextTNode.type & 16 /* TNodeType.Projection */)) {
                    nextTNode = nextTNode.next;
                }
                if (nextTNode) {
                    const index = nextTNode.index - HEADER_OFFSET;
                    const path = calcPathForNode(tView, lView, nextTNode);
                    ngh.nodes[index] = path;
                }
            }
            else {
                // ... otherwise, this is a DOM element, for which we may need to
                // serialize in some cases.
                targetNode = lView[i];
                // Check if projection next is not the same as next, in which case
                // the node would not be found at creation time at runtime and we
                // need to provide a location to that node.
                if (tNode.projectionNext && tNode.projectionNext !== tNode.next) {
                    const nextProjectedTNode = tNode.projectionNext;
                    const index = nextProjectedTNode.index - HEADER_OFFSET;
                    const path = calcPathForNode(tView, lView, nextProjectedTNode);
                    ngh.nodes[index] = path;
                }
            }
        }
    }
    return ngh;
}
function calcPathForNode(tView, lView, tNode, parentTNode) {
    const index = tNode.index;
    // If `null` is passed explicitly, use this as a signal that we want to calculate
    // the path starting from `lView[HOST]`.
    parentTNode = parentTNode === null ? null : (parentTNode || tNode.parent);
    const parentIndex = parentTNode === null ? 'host' : parentTNode.index;
    const parentRNode = parentTNode === null ? lView[HOST] : unwrapRNode(lView[parentIndex]);
    let rNode = unwrapRNode(lView[index]);
    if (tNode.type & 12 /* TNodeType.AnyContainer */) {
        // For <ng-container> nodes, instead of serializing a reference
        // to the anchor comment node, serialize a location of the first
        // DOM element. Paired with the container size (serialized as a part
        // of `ngh.containers`), it should give enough information for runtime
        // to hydrate nodes in this container.
        //
        // Note: for ElementContainers (i.e. `<ng-container>` elements), we use
        // a first child from the tNode data structures, since we want to collect
        // add root nodes starting from the first child node in a container.
        const childTNode = tNode.type & 8 /* TNodeType.ElementContainer */ ? tNode.child : tNode;
        const firstRNode = firstRNodeInElementContainer(tView, lView, childTNode);
        // If container is not empty, use a reference to the first element,
        // otherwise, rNode would point to an anchor comment node.
        if (firstRNode) {
            rNode = firstRNode;
        }
    }
    debugger;
    const path = navigateBetween(parentRNode, rNode).map(op => {
        switch (op) {
            case NodeNavigationStep.FirstChild:
                return 'firstChild';
            case NodeNavigationStep.NextSibling:
                return 'nextSibling';
        }
    });
    if (parentIndex === 'host') {
        // TODO: add support for `host` to the `locateNextRNode` fn.
        path.unshift(parentIndex);
    }
    else {
        path.unshift('' + (parentIndex - HEADER_OFFSET));
    }
    return path.join('.');
}
let ssrId = 0;
const ssrIdMap = new Map();
function getTViewSsrId(tView) {
    if (!ssrIdMap.has(tView)) {
        ssrIdMap.set(tView, `t${ssrId++}`);
    }
    return ssrIdMap.get(tView);
}
function serializeLContainer(lContainer, hostNode, anchor) {
    const container = {
        views: [],
    };
    for (let i = CONTAINER_HEADER_OFFSET; i < lContainer.length; i++) {
        let childLView = lContainer[i];
        // Get LView for underlying component.
        if (isRootView(childLView)) {
            childLView = childLView[HEADER_OFFSET];
        }
        const childTView = childLView[TVIEW];
        let template;
        if (childTView.type === 1 /* TViewType.Component */) {
            const ctx = childLView[CONTEXT];
            // TODO: this is a hack (we capture a component host element name),
            // we need a more stable solution here, for ex. a way to generate
            // a component id.
            template = ctx.constructor['ɵcmp'].selectors[0][0];
        }
        else {
            template = getTViewSsrId(childTView);
        }
        const rootNodes = [];
        collectNativeNodes(childTView, childLView, childTView.firstChild, rootNodes);
        container.views.push({
            template,
            numRootNodes: rootNodes.length,
            ...serializeLView(lContainer[i], hostNode),
        });
    }
    return container;
}
export function getLViewFromRootElement(element) {
    const MONKEY_PATCH_KEY_NAME = '__ngContext__';
    const data = element[MONKEY_PATCH_KEY_NAME];
    let lView = typeof data === 'number' ? getLViewById(data) : data || null;
    if (!lView)
        throw new Error('not found'); // TODO: is it possible?
    if (isRootView(lView)) {
        lView = lView[HEADER_OFFSET];
    }
    return lView;
}
export function annotateForHydration(element, lView) {
    const rawNgh = serializeLView(lView, element);
    const serializedNgh = JSON.stringify(rawNgh);
    element.setAttribute('ngh', serializedNgh);
    debugger;
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
                applicationRef.components.forEach((componentRef) => {
                    const element = componentRef.location.nativeElement;
                    if (element) {
                        annotateForHydration(element, getLViewFromRootElement(element));
                    }
                });
                const output = platformState.renderToString();
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
    const { document, url, extraProviders: platformProviders } = options;
    const platform = _getPlatform(platformDynamicServer, { document, url, platformProviders });
    return _render(platform, platform.bootstrapModule(moduleType));
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
    const { document, url, platformProviders, appId } = options;
    const platform = _getPlatform(platformDynamicServer, { document, url, platformProviders });
    const appProviders = [
        importProvidersFrom(BrowserModule.withServerTransition({ appId })),
        importProvidersFrom(ServerModule),
        ...TRANSFER_STATE_SERIALIZATION_PROVIDERS,
        ...(options.providers ?? []),
    ];
    return _render(platform, internalCreateApplication({ rootComponent, appProviders }));
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
    return _render(platform, platform.bootstrapModuleFactory(moduleFactory));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1zZXJ2ZXIvc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxjQUFjLEVBQXdCLG1CQUFtQixFQUFFLGNBQWMsRUFBdUQsU0FBUyxFQUF3QixhQUFhLElBQUksWUFBWSxFQUFFLDBCQUEwQixJQUFJLHlCQUF5QixFQUFFLFVBQVUsR0FBRSxNQUFNLGVBQWUsQ0FBQztBQUNuUyxPQUFPLEVBQUMsbUJBQW1CLElBQUksa0JBQWtCLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDeEUsT0FBTyxFQUFDLHdCQUF3QixJQUFJLHVCQUF1QixFQUE2QixLQUFLLElBQUksSUFBSSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRzVILE9BQU8sRUFBQyxXQUFXLElBQUksVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3hELE9BQU8sRUFBQyxRQUFRLElBQUksT0FBTyxFQUFFLGNBQWMsSUFBSSxhQUFhLEVBQUUsS0FBSyxJQUFJLElBQUksRUFBbUIsTUFBTSxJQUFJLEtBQUssRUFBMkMsTUFBTSxlQUFlLENBQUM7QUFDOUssT0FBTyxFQUFDLFlBQVksSUFBSSxXQUFXLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDMUQsT0FBTyxFQUFDLGFBQWEsRUFBRSxjQUFjLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUN4RSxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFckMsT0FBTyxFQUFDLGVBQWUsRUFBRSxrQkFBa0IsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUMvRCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFDLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDN0UsT0FBTyxFQUFD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Q0FBQztRQUNqQyxHQUFHLHNDQUFzQztRQUN6QyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUM7S0FDN0IsQ0FBQztJQUNGLE9BQU8sT0FBTyxDQUFDLFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxFQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckYsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztHQWlCRztBQUNILE1BQU0sVUFBVSxtQkFBbUIsQ0FDL0IsYUFBaUMsRUFDakMsT0FBNkU7SUFFL0UsTUFBTSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFDLEdBQUcsT0FBTyxDQUFDO0lBQ25FLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxjQUFjLEVBQUUsRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFDLENBQUMsQ0FBQztJQUNsRixPQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FwcGxpY2F0aW9uUmVmLCBFbnZpcm9ubWVudFByb3ZpZGVycywgaW1wb3J0UHJvdmlkZXJzRnJvbSwgSW5qZWN0aW9uVG9rZW4sIE5nTW9kdWxlRmFjdG9yeSwgTmdNb2R1bGVSZWYsIFBsYXRmb3JtUmVmLCBQcm92aWRlciwgUmVuZGVyZXIyLCBTdGF0aWNQcm92aWRlciwgVHlwZSwgybVnZXRMVmlld0J5SWQgYXMgZ2V0TFZpZXdCeUlkLCDJtWludGVybmFsQ3JlYXRlQXBwbGljYXRpb24gYXMgaW50ZXJuYWxDcmVhdGVBcHBsaWNhdGlvbiwgybVpc1Byb21pc2UsfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybVjb2xsZWN0TmF0aXZlTm9kZXMgYXMgY29sbGVjdE5hdGl2ZU5vZGVzfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybVDT05UQUlORVJfSEVBREVSX09GRlNFVCBhcyBDT05UQUlORVJfSEVBREVSX09GRlNFVCwgybVMQ29udGFpbmVyIGFzIExDb250YWluZXIsIMm1VFlQRSBhcyBUWVBFfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybVUQ29udGFpbmVyTm9kZSBhcyBUQ29udGFpbmVyTm9kZSwgybVUTm9kZSBhcyBUTm9kZSwgybVUTm9kZVR5cGUgYXMgVE5vZGVUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybVSTm9kZSBhcyBSTm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge8m1aXNSb290VmlldyBhcyBpc1Jvb3RWaWV3fSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybVDT05URVhUIGFzIENPTlRFWFQsIMm1SEVBREVSX09GRlNFVCBhcyBIRUFERVJfT0ZGU0VULCDJtUhPU1QgYXMgSE9TVCwgybVMVmlldyBhcyBMVmlldywgybVUVklFVyBhcyBUVklFVywgybVUVmlldyBhcyBUVmlldywgybVUVmlld1R5cGUgYXMgVFZpZXdUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybV1bndyYXBSTm9kZSBhcyB1bndyYXBSTm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0Jyb3dzZXJNb2R1bGUsIMm1VFJBTlNJVElPTl9JRH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlcic7XG5pbXBvcnQge2ZpcnN0fSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7bmF2aWdhdGVCZXR3ZWVuLCBOb2RlTmF2aWdhdGlvblN0ZXB9IGZyb20gJy4vbm9kZV9uYXYnO1xuaW1wb3J0IHtQbGF0Zm9ybVN0YXRlfSBmcm9tICcuL3BsYXRmb3JtX3N0YXRlJztcbmltcG9ydCB7cGxhdGZvcm1EeW5hbWljU2VydmVyLCBwbGF0Zm9ybVNlcnZlciwgU2VydmVyTW9kdWxlfSBmcm9tICcuL3NlcnZlcic7XG5pbXBvcnQge0JFRk9SRV9BUFBfU0VSSUFMSVpFRCwgSU5JVElBTF9DT05GSUd9IGZyb20gJy4vdG9rZW5zJztcbmltcG9ydCB7VFJBTlNGRVJfU1RBVEVfU0VSSUFMSVpBVElPTl9QUk9WSURFUlN9IGZyb20gJy4vdHJhbnNmZXJfc3RhdGUnO1xuXG5pbnRlcmZhY2UgUGxhdGZvcm1PcHRpb25zIHtcbiAgZG9jdW1lbnQ/OiBzdHJpbmd8RG9jdW1lbnQ7XG4gIHVybD86IHN0cmluZztcbiAgcGxhdGZvcm1Qcm92aWRlcnM/OiBQcm92aWRlcltdO1xufVxuXG5mdW5jdGlvbiBfZ2V0UGxhdGZvcm0oXG4gICAgcGxhdGZvcm1GYWN0b3J5OiAoZXh0cmFQcm92aWRlcnM6IFN0YXRpY1Byb3ZpZGVyW10pID0+IFBsYXRmb3JtUmVmLFxuICAgIG9wdGlvbnM6IFBsYXRmb3JtT3B0aW9ucyk6IFBsYXRmb3JtUmVmIHtcbiAgY29uc3QgZXh0cmFQcm92aWRlcnMgPSBvcHRpb25zLnBsYXRmb3JtUHJvdmlkZXJzID8/IFtdO1xuICByZXR1cm4gcGxhdGZvcm1GYWN0b3J5KFtcbiAgICB7cHJvdmlkZTogSU5JVElBTF9DT05GSUcsIHVzZVZhbHVlOiB7ZG9jdW1lbnQ6IG9wdGlvbnMuZG9jdW1lbnQsIHVybDogb3B0aW9ucy51cmx9fSxcbiAgICBleHRyYVByb3ZpZGVycyxcbiAgXSk7XG59XG5cbi8qKlxuICogQWRkcyB0aGUgYG5nLXNlcnZlci1jb250ZXh0YCBhdHRyaWJ1dGUgdG8gaG9zdCBlbGVtZW50cyBvZiBhbGwgYm9vdHN0cmFwcGVkIGNvbXBvbmVudHNcbiAqIHdpdGhpbiBhIGdpdmVuIGFwcGxpY2F0aW9uLlxuICovXG5mdW5jdGlvbiBhcHBlbmRTZXJ2ZXJDb250ZXh0SW5mbyhzZXJ2ZXJDb250ZXh0OiBzdHJpbmcsIGFwcGxpY2F0aW9uUmVmOiBBcHBsaWNhdGlvblJlZikge1xuICBhcHBsaWNhdGlvblJlZi5jb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudFJlZikgPT4ge1xuICAgIGNvbnN0IHJlbmRlcmVyID0gY29tcG9uZW50UmVmLmluamVjdG9yLmdldChSZW5kZXJlcjIpO1xuICAgIGNvbnN0IGVsZW1lbnQgPSBjb21wb25lbnRSZWYubG9jYXRpb24ubmF0aXZlRWxlbWVudDtcbiAgICBpZiAoZWxlbWVudCkge1xuICAgICAgcmVuZGVyZXIuc2V0QXR0cmlidXRlKGVsZW1lbnQsICduZy1zZXJ2ZXItY29udGV4dCcsIHNlcnZlckNvbnRleHQpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIFRPRE86IGltcG9ydCBmcm9tIGBAYW5ndWxhci9jb3JlYCBpbnN0ZWFkLCB0aGlzIGlzIGp1c3QgYSBjb3B5LlxuZXhwb3J0IGVudW0gSTE4bkNyZWF0ZU9wQ29kZSB7XG4gIFNISUZUID0gMixcbiAgQVBQRU5EX0VBR0VSTFkgPSAwYjAxLFxuICBDT01NRU5UID0gMGIxMCxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMaXZlRG9tIHtcbiAgLyogYW5jaG9yIGlzIGFuIGluZGV4IGZyb20gTFZpZXcgKi9cbiAgY29udGFpbmVyczogUmVjb3JkPG51bWJlciwgQ29udGFpbmVyPjtcbiAgbm9kZXM6IFJlY29yZDxudW1iZXIsIHN0cmluZz47XG4gIHRlbXBsYXRlczogUmVjb3JkPG51bWJlciwgc3RyaW5nPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb250YWluZXIge1xuICB2aWV3czogVmlld1tdO1xuICAvLyBEZXNjcmliZXMgdGhlIG51bWJlciBvZiB0b3AgbGV2ZWwgbm9kZXMgaW4gdGhpcyBjb250YWluZXIuXG4gIC8vIE9ubHkgYXBwbGljYWJsZSB0byA8bmctY29udGFpbmVyPnMuXG4gIC8vXG4gIC8vIFRPRE86IGNvbnNpZGVyIG1vdmluZyB0aGlzIGluZm8gZWxzZXdoZXJlIHRvIGF2b2lkIGNvbmZ1c2lvblxuICAvLyBiZXR3ZWVuIHZpZXcgY29udGFpbmVycyAoPGRpdiAqbmdJZj4pIGFuZCBlbGVtZW50IGNvbnRhaW5lcnNcbiAgLy8gKDxuZy1jb250YWluZXI+cykuXG4gIG51bVJvb3ROb2Rlcz86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWaWV3IGV4dGVuZHMgTGl2ZURvbSB7XG4gIHRlbXBsYXRlOiBzdHJpbmc7XG4gIG51bVJvb3ROb2RlczogbnVtYmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNMQ29udGFpbmVyKHZhbHVlOiBSTm9kZXxMVmlld3xMQ29udGFpbmVyfHt9fG51bGwpOiB2YWx1ZSBpcyBMQ29udGFpbmVyIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlW1RZUEVdID09PSB0cnVlO1xufVxuXG5mdW5jdGlvbiBmaXJzdFJOb2RlSW5FbGVtZW50Q29udGFpbmVyKHRWaWV3OiBUVmlldywgbFZpZXc6IExWaWV3LCB0Tm9kZTogVE5vZGUpOiBSTm9kZXxudWxsIHtcbiAgY29uc3Qgcm9vdE5vZGVzOiBhbnlbXSA9IFtdO1xuICAvLyBUT0RPOiBmaW5kIG1vcmUgZWZmaWNpZW50IHdheSB0byBkbyB0aGlzLiBXZSBkb24ndCBuZWVkIHRvIHRyYXZlcnNlIHRoZSBlbnRpcmVcbiAgLy8gc3RydWN0dXJlLCB3ZSBjYW4ganVzdCBzdG9wIGFmdGVyIGV4YW1pbmluZyB0aGUgZmlyc3Qgbm9kZS5cbiAgY29sbGVjdE5hdGl2ZU5vZGVzKHRWaWV3LCBsVmlldywgdE5vZGUsIHJvb3ROb2Rlcyk7XG4gIHJldHVybiByb290Tm9kZXNbMF07XG59XG5cbmZ1bmN0aW9uIGlzUHJvamVjdGlvblROb2RlKHROb2RlOiBUTm9kZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gKHROb2RlLnR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikgPT09IFROb2RlVHlwZS5Qcm9qZWN0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUSTE4bk5vZGUob2JqOiBhbnkpOiBib29sZWFuIHtcbiAgLy8gVE9ETzogY29uc2lkZXIgYWRkaW5nIGEgbm9kZSB0eXBlIHRvIFRJMThuP1xuICByZXR1cm4gb2JqLmhhc093blByb3BlcnR5KCdjcmVhdGUnKSAmJiBvYmouaGFzT3duUHJvcGVydHkoJ3VwZGF0ZScpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZENsb3Nlc3RFbGVtZW50VE5vZGUodE5vZGU6IFROb2RlfG51bGwpOiBUTm9kZXxudWxsIHtcbiAgbGV0IHBhcmVudFROb2RlOiBUTm9kZXxudWxsID0gdE5vZGU7XG4gIC8vIEZJWE1FOiB0aGlzIGNvbmRpdGlvbiBzaG91bGQgYWxzbyB0YWtlIGludG8gYWNjb3VudCB3aGV0aGVyXG4gIC8vIHJlc3VsdGluZyB0Tm9kZSBpcyBub3QgbWFya2VkIGFzIGBpbnNlcnRCZWZvcmVJbmRleGAuXG4gIHdoaWxlIChwYXJlbnRUTm9kZSAhPT0gbnVsbCAmJlxuICAgICAgICAgKChwYXJlbnRUTm9kZS50eXBlICYgVE5vZGVUeXBlLkVsZW1lbnQpICE9PSBUTm9kZVR5cGUuRWxlbWVudCB8fFxuICAgICAgICAgIHBhcmVudFROb2RlLmluc2VydEJlZm9yZUluZGV4ICE9PSBudWxsKSkge1xuICAgIHROb2RlID0gcGFyZW50VE5vZGU7XG4gICAgcGFyZW50VE5vZGUgPSB0Tm9kZS5wYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHBhcmVudFROb2RlO1xufVxuXG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUxWaWV3KGxWaWV3OiBMVmlldywgaG9zdE5vZGU6IEVsZW1lbnQpOiBMaXZlRG9tIHtcbiAgY29uc3QgbmdoOiBMaXZlRG9tID0ge1xuICAgIGNvbnRhaW5lcnM6IHt9LFxuICAgIHRlbXBsYXRlczoge30sXG4gICAgbm9kZXM6IHt9LFxuICB9O1xuXG4gIGNvbnN0IHRWaWV3ID0gbFZpZXdbVFZJRVddO1xuICBmb3IgKGxldCBpID0gSEVBREVSX09GRlNFVDsgaSA8IHRWaWV3LmJpbmRpbmdTdGFydEluZGV4OyBpKyspIHtcbiAgICBkZWJ1Z2dlcjtcblxuICAgIGxldCB0YXJnZXROb2RlOiBOb2RlfG51bGwgPSBudWxsO1xuICAgIGNvbnN0IGFkanVzdGVkSW5kZXggPSBpIC0gSEVBREVSX09GRlNFVDtcbiAgICBjb25zdCB0Tm9kZSA9IHRWaWV3LmRhdGFbaV0gYXMgVENvbnRhaW5lck5vZGU7XG4gICAgLy8gdE5vZGUgbWF5IGJlIG51bGwgaW4gdGhlIGNhc2Ugb2YgYSBsb2NhbFJlZlxuICAgIGlmICghdE5vZGUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0Tm9kZS5wcm9qZWN0aW9uKSkge1xuICAgICAgLy8gVE9ETzogaGFuZGxlIGBSTm9kZVtdYCBhcyB3ZWxsLlxuICAgICAgZm9yIChjb25zdCBoZWFkVE5vZGUgb2YgKHROb2RlLnByb2plY3Rpb24gYXMgYW55W10pKSB7XG4gICAgICAgIC8vIFdlIG1heSBoYXZlIGBudWxsYHMgaW4gc2xvdHMgd2l0aCBubyBwcm9qZWN0ZWQgY29udGVudC5cbiAgICAgICAgLy8gQWxzbywgaWYgd2UgcHJvY2VzcyByZS1wcm9qZWN0ZWQgY29udGVudCAoaS5lLiBgPG5nLWNvbnRlbnQ+YFxuICAgICAgICAvLyBhcHBlYXJzIGF0IHByb2plY3Rpb24gbG9jYXRpb24pLCBza2lwIGFubm90YXRpb25zIGZvciB0aGlzIGNvbnRlbnRcbiAgICAgICAgLy8gc2luY2UgYWxsIERPTSBub2RlcyBpbiB0aGlzIHByb2plY3Rpb24gd2VyZSBoYW5kbGVkIHdoaWxlIHByb2Nlc3NpbmdcbiAgICAgICAgLy8gYSBwYXJlbnQgbFZpZXcsIHdoaWNoIGNvbnRhaW5zIHRob3NlIG5vZGVzLlxuICAgICAgICBpZiAoaGVhZFROb2RlICYmICFpc1Byb2plY3Rpb25UTm9kZShoZWFkVE5vZGUpKSB7XG4gICAgICAgICAgbmdoLm5vZGVzW2hlYWRUTm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVRdID0gY2FsY1BhdGhGb3JOb2RlKHRWaWV3LCBsVmlldywgaGVhZFROb2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNMQ29udGFpbmVyKGxWaWV3W2ldKSkge1xuICAgICAgLy8gdGhpcyBpcyBhIGNvbnRhaW5lclxuICAgICAgY29uc3QgdE5vZGUgPSB0Vmlldy5kYXRhW2ldIGFzIFRDb250YWluZXJOb2RlO1xuICAgICAgY29uc3QgZW1iZWRkZWRUVmlldyA9IHROb2RlLnRWaWV3cztcbiAgICAgIGlmIChlbWJlZGRlZFRWaWV3ICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGVtYmVkZGVkVFZpZXcpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RpbmcgdE5vZGUudFZpZXdzIHRvIGJlIGFuIG9iamVjdCwgYnV0IGl0J3MgYW4gYXJyYXkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgbmdoLnRlbXBsYXRlcyFbaSAtIEhFQURFUl9PRkZTRVRdID0gZ2V0VFZpZXdTc3JJZChlbWJlZGRlZFRWaWV3KTtcbiAgICAgIH1cblxuICAgICAgdGFyZ2V0Tm9kZSA9IHVud3JhcFJOb2RlKGxWaWV3W2ldW0hPU1RdISkgYXMgTm9kZTtcbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9IHNlcmlhbGl6ZUxDb250YWluZXIobFZpZXdbaV0sIGhvc3ROb2RlLCBhZGp1c3RlZEluZGV4KTtcbiAgICAgIG5naC5jb250YWluZXJzIVthZGp1c3RlZEluZGV4XSA9IGNvbnRhaW5lcjtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkobFZpZXdbaV0pKSB7XG4gICAgICAvLyB0aGlzIGlzIGEgY29tcG9uZW50XG4gICAgICB0YXJnZXROb2RlID0gdW53cmFwUk5vZGUobFZpZXdbaV1bSE9TVF0hKSBhcyBFbGVtZW50O1xuICAgICAgYW5ub3RhdGVGb3JIeWRyYXRpb24odGFyZ2V0Tm9kZSBhcyBFbGVtZW50LCBsVmlld1tpXSk7XG4gICAgfSBlbHNlIGlmIChpc1RJMThuTm9kZSh0Tm9kZSkpIHtcbiAgICAgIC8vIFByb2Nlc3MgaTE4biB0ZXh0IG5vZGVzLi4uXG4gICAgICBjb25zdCBjcmVhdGVPcENvZGVzID0gKHROb2RlIGFzIGFueSkuY3JlYXRlO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjcmVhdGVPcENvZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IG9wQ29kZSA9IGNyZWF0ZU9wQ29kZXNbaSsrXSBhcyBhbnk7XG4gICAgICAgIGNvbnN0IGFwcGVuZE5vdyA9XG4gICAgICAgICAgICAob3BDb2RlICYgSTE4bkNyZWF0ZU9wQ29kZS5BUFBFTkRfRUFHRVJMWSkgPT09IEkxOG5DcmVhdGVPcENvZGUuQVBQRU5EX0VBR0VSTFk7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gb3BDb2RlID4+PiBJMThuQ3JlYXRlT3BDb2RlLlNISUZUO1xuICAgICAgICBjb25zdCB0Tm9kZSA9IHRWaWV3LmRhdGFbaW5kZXhdIGFzIFROb2RlO1xuICAgICAgICAvLyBpZiAoYXBwZW5kTm93KSB7XG4gICAgICAgIGNvbnN0IHBhcmVudFROb2RlID0gZmluZENsb3Nlc3RFbGVtZW50VE5vZGUodE5vZGUpO1xuICAgICAgICBjb25zdCBwYXRoID0gY2FsY1BhdGhGb3JOb2RlKHRWaWV3LCBsVmlldywgdE5vZGUsIHBhcmVudFROb2RlKTtcbiAgICAgICAgbmdoLm5vZGVzW3ROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVF0gPSBwYXRoO1xuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0Tm9kZS5pbnNlcnRCZWZvcmVJbmRleCkge1xuICAgICAgZGVidWdnZXI7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0Tm9kZS5pbnNlcnRCZWZvcmVJbmRleCkgJiYgdE5vZGUuaW5zZXJ0QmVmb3JlSW5kZXhbMF0gIT09IG51bGwpIHtcbiAgICAgICAgLy8gQSByb290IG5vZGUgd2l0aGluIGkxOG4gYmxvY2suXG4gICAgICAgIC8vIFRPRE86IGFkZCBhIGNvbW1lbnQgb24gKndoeSogd2UgbmVlZCBhIHBhdGggaGVyZS5cbiAgICAgICAgY29uc3QgcGF0aCA9IGNhbGNQYXRoRm9yTm9kZSh0VmlldywgbFZpZXcsIHROb2RlKTtcbiAgICAgICAgbmdoLm5vZGVzW3ROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVF0gPSBwYXRoO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0Tm9kZVR5cGUgPSB0Tm9kZS50eXBlO1xuICAgICAgLy8gPG5nLWNvbnRhaW5lcj4gY2FzZVxuICAgICAgaWYgKHROb2RlVHlwZSAmIFROb2RlVHlwZS5FbGVtZW50Q29udGFpbmVyKSB7XG4gICAgICAgIGNvbnN0IHJvb3ROb2RlczogYW55W10gPSBbXTtcbiAgICAgICAgY29sbGVjdE5hdGl2ZU5vZGVzKHRWaWV3LCBsVmlldywgdE5vZGUuY2hpbGQsIHJvb3ROb2Rlcyk7XG5cbiAgICAgICAgLy8gVGhpcyBpcyBhbiBcImVsZW1lbnRcIiBjb250YWluZXIgKHZzIFwidmlld1wiIGNvbnRhaW5lciksXG4gICAgICAgIC8vIHNvIGl0J3Mgb25seSByZXByZXNlbnRlZCBieSB0aGUgbnVtYmVyIG9mIHRvcC1sZXZlbCBub2Rlc1xuICAgICAgICAvLyBhcyBhIHNoaWZ0IHRvIGdldCB0byBhIGNvcnJlc3BvbmRpbmcgY29tbWVudCBub2RlLlxuICAgICAgICBjb25zdCBjb250YWluZXI6IENvbnRhaW5lciA9IHtcbiAgICAgICAgICB2aWV3czogW10sXG4gICAgICAgICAgbnVtUm9vdE5vZGVzOiByb290Tm9kZXMubGVuZ3RoLFxuICAgICAgICB9O1xuXG4gICAgICAgIG5naC5jb250YWluZXJzW2FkanVzdGVkSW5kZXhdID0gY29udGFpbmVyO1xuICAgICAgfSBlbHNlIGlmICh0Tm9kZVR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikge1xuICAgICAgICAvLyBDdXJyZW50IFROb2RlIGhhcyBubyBET00gZWxlbWVudCBhc3NvY2lhdGVkIHdpdGggaXQsXG4gICAgICAgIC8vIHNvIHRoZSBmb2xsb3dpbmcgbm9kZSB3b3VsZCBub3QgYmUgYWJsZSB0byBmaW5kIGFuIGFuY2hvci5cbiAgICAgICAgLy8gVXNlIGZ1bGwgcGF0aCBpbnN0ZWFkLlxuICAgICAgICBsZXQgbmV4dFROb2RlID0gdE5vZGUubmV4dDtcbiAgICAgICAgd2hpbGUgKG5leHRUTm9kZSAhPT0gbnVsbCAmJiAobmV4dFROb2RlLnR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikpIHtcbiAgICAgICAgICBuZXh0VE5vZGUgPSBuZXh0VE5vZGUubmV4dDtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmV4dFROb2RlKSB7XG4gICAgICAgICAgY29uc3QgaW5kZXggPSBuZXh0VE5vZGUuaW5kZXggLSBIRUFERVJfT0ZGU0VUO1xuICAgICAgICAgIGNvbnN0IHBhdGggPSBjYWxjUGF0aEZvck5vZGUodFZpZXcsIGxWaWV3LCBuZXh0VE5vZGUpO1xuICAgICAgICAgIG5naC5ub2Rlc1tpbmRleF0gPSBwYXRoO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyAuLi4gb3RoZXJ3aXNlLCB0aGlzIGlzIGEgRE9NIGVsZW1lbnQsIGZvciB3aGljaCB3ZSBtYXkgbmVlZCB0b1xuICAgICAgICAvLyBzZXJpYWxpemUgaW4gc29tZSBjYXNlcy5cbiAgICAgICAgdGFyZ2V0Tm9kZSA9IGxWaWV3W2ldIGFzIE5vZGU7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgcHJvamVjdGlvbiBuZXh0IGlzIG5vdCB0aGUgc2FtZSBhcyBuZXh0LCBpbiB3aGljaCBjYXNlXG4gICAgICAgIC8vIHRoZSBub2RlIHdvdWxkIG5vdCBiZSBmb3VuZCBhdCBjcmVhdGlvbiB0aW1lIGF0IHJ1bnRpbWUgYW5kIHdlXG4gICAgICAgIC8vIG5lZWQgdG8gcHJvdmlkZSBhIGxvY2F0aW9uIHRvIHRoYXQgbm9kZS5cbiAgICAgICAgaWYgKHROb2RlLnByb2plY3Rpb25OZXh0ICYmIHROb2RlLnByb2plY3Rpb25OZXh0ICE9PSB0Tm9kZS5uZXh0KSB7XG4gICAgICAgICAgY29uc3QgbmV4dFByb2plY3RlZFROb2RlID0gdE5vZGUucHJvamVjdGlvbk5leHQ7XG4gICAgICAgICAgY29uc3QgaW5kZXggPSBuZXh0UHJvamVjdGVkVE5vZGUuaW5kZXggLSBIRUFERVJfT0ZGU0VUO1xuICAgICAgICAgIGNvbnN0IHBhdGggPSBjYWxjUGF0aEZvck5vZGUodFZpZXcsIGxWaWV3LCBuZXh0UHJvamVjdGVkVE5vZGUpO1xuICAgICAgICAgIG5naC5ub2Rlc1tpbmRleF0gPSBwYXRoO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBuZ2g7XG59XG5cbmZ1bmN0aW9uIGNhbGNQYXRoRm9yTm9kZShcbiAgICB0VmlldzogVFZpZXcsIGxWaWV3OiBMVmlldywgdE5vZGU6IFROb2RlLCBwYXJlbnRUTm9kZT86IFROb2RlfG51bGwpOiBzdHJpbmcge1xuICBjb25zdCBpbmRleCA9IHROb2RlLmluZGV4O1xuICAvLyBJZiBgbnVsbGAgaXMgcGFzc2VkIGV4cGxpY2l0bHksIHVzZSB0aGlzIGFzIGEgc2lnbmFsIHRoYXQgd2Ugd2FudCB0byBjYWxjdWxhdGVcbiAgLy8gdGhlIHBhdGggc3RhcnRpbmcgZnJvbSBgbFZpZXdbSE9TVF1gLlxuICBwYXJlbnRUTm9kZSA9IHBhcmVudFROb2RlID09PSBudWxsID8gbnVsbCA6IChwYXJlbnRUTm9kZSB8fCB0Tm9kZS5wYXJlbnQhKTtcbiAgY29uc3QgcGFyZW50SW5kZXggPSBwYXJlbnRUTm9kZSA9PT0gbnVsbCA/ICdob3N0JyA6IHBhcmVudFROb2RlLmluZGV4O1xuICBjb25zdCBwYXJlbnRSTm9kZSA9XG4gICAgICBwYXJlbnRUTm9kZSA9PT0gbnVsbCA/IGxWaWV3W0hPU1RdIDogdW53cmFwUk5vZGUobFZpZXdbcGFyZW50SW5kZXggYXMgbnVtYmVyXSk7XG4gIGxldCByTm9kZSA9IHVud3JhcFJOb2RlKGxWaWV3W2luZGV4XSk7XG4gIGlmICh0Tm9kZS50eXBlICYgVE5vZGVUeXBlLkFueUNvbnRhaW5lcikge1xuICAgIC8vIEZvciA8bmctY29udGFpbmVyPiBub2RlcywgaW5zdGVhZCBvZiBzZXJpYWxpemluZyBhIHJlZmVyZW5jZVxuICAgIC8vIHRvIHRoZSBhbmNob3IgY29tbWVudCBub2RlLCBzZXJpYWxpemUgYSBsb2NhdGlvbiBvZiB0aGUgZmlyc3RcbiAgICAvLyBET00gZWxlbWVudC4gUGFpcmVkIHdpdGggdGhlIGNvbnRhaW5lciBzaXplIChzZXJpYWxpemVkIGFzIGEgcGFydFxuICAgIC8vIG9mIGBuZ2guY29udGFpbmVyc2ApLCBpdCBzaG91bGQgZ2l2ZSBlbm91Z2ggaW5mb3JtYXRpb24gZm9yIHJ1bnRpbWVcbiAgICAvLyB0byBoeWRyYXRlIG5vZGVzIGluIHRoaXMgY29udGFpbmVyLlxuICAgIC8vXG4gICAgLy8gTm90ZTogZm9yIEVsZW1lbnRDb250YWluZXJzIChpLmUuIGA8bmctY29udGFpbmVyPmAgZWxlbWVudHMpLCB3ZSB1c2VcbiAgICAvLyBhIGZpcnN0IGNoaWxkIGZyb20gdGhlIHROb2RlIGRhdGEgc3RydWN0dXJlcywgc2luY2Ugd2Ugd2FudCB0byBjb2xsZWN0XG4gICAgLy8gYWRkIHJvb3Qgbm9kZXMgc3RhcnRpbmcgZnJvbSB0aGUgZmlyc3QgY2hpbGQgbm9kZSBpbiBhIGNvbnRhaW5lci5cbiAgICBjb25zdCBjaGlsZFROb2RlID0gdE5vZGUudHlwZSAmIFROb2RlVHlwZS5FbGVtZW50Q29udGFpbmVyID8gdE5vZGUuY2hpbGQgOiB0Tm9kZTtcbiAgICBjb25zdCBmaXJzdFJOb2RlID0gZmlyc3RSTm9kZUluRWxlbWVudENvbnRhaW5lcih0VmlldywgbFZpZXcsIGNoaWxkVE5vZGUhKTtcbiAgICAvLyBJZiBjb250YWluZXIgaXMgbm90IGVtcHR5LCB1c2UgYSByZWZlcmVuY2UgdG8gdGhlIGZpcnN0IGVsZW1lbnQsXG4gICAgLy8gb3RoZXJ3aXNlLCByTm9kZSB3b3VsZCBwb2ludCB0byBhbiBhbmNob3IgY29tbWVudCBub2RlLlxuICAgIGlmIChmaXJzdFJOb2RlKSB7XG4gICAgICByTm9kZSA9IGZpcnN0Uk5vZGU7XG4gICAgfVxuICB9XG4gIGRlYnVnZ2VyO1xuICBjb25zdCBwYXRoOiBzdHJpbmdbXSA9IG5hdmlnYXRlQmV0d2VlbihwYXJlbnRSTm9kZSBhcyBOb2RlLCByTm9kZSBhcyBOb2RlKS5tYXAob3AgPT4ge1xuICAgIHN3aXRjaCAob3ApIHtcbiAgICAgIGNhc2UgTm9kZU5hdmlnYXRpb25TdGVwLkZpcnN0Q2hpbGQ6XG4gICAgICAgIHJldHVybiAnZmlyc3RDaGlsZCc7XG4gICAgICBjYXNlIE5vZGVOYXZpZ2F0aW9uU3RlcC5OZXh0U2libGluZzpcbiAgICAgICAgcmV0dXJuICduZXh0U2libGluZyc7XG4gICAgfVxuICB9KTtcbiAgaWYgKHBhcmVudEluZGV4ID09PSAnaG9zdCcpIHtcbiAgICAvLyBUT0RPOiBhZGQgc3VwcG9ydCBmb3IgYGhvc3RgIHRvIHRoZSBgbG9jYXRlTmV4dFJOb2RlYCBmbi5cbiAgICBwYXRoLnVuc2hpZnQocGFyZW50SW5kZXgpO1xuICB9IGVsc2Uge1xuICAgIHBhdGgudW5zaGlmdCgnJyArIChwYXJlbnRJbmRleCAtIEhFQURFUl9PRkZTRVQpKTtcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKCcuJyk7XG59XG5cbmxldCBzc3JJZDogbnVtYmVyID0gMDtcbmNvbnN0IHNzcklkTWFwID0gbmV3IE1hcDxUVmlldywgc3RyaW5nPigpO1xuXG5mdW5jdGlvbiBnZXRUVmlld1NzcklkKHRWaWV3OiBUVmlldyk6IHN0cmluZyB7XG4gIGlmICghc3NySWRNYXAuaGFzKHRWaWV3KSkge1xuICAgIHNzcklkTWFwLnNldCh0VmlldywgYHQke3NzcklkKyt9YCk7XG4gIH1cbiAgcmV0dXJuIHNzcklkTWFwLmdldCh0VmlldykhO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVMQ29udGFpbmVyKGxDb250YWluZXI6IExDb250YWluZXIsIGhvc3ROb2RlOiBFbGVtZW50LCBhbmNob3I6IG51bWJlcik6IENvbnRhaW5lciB7XG4gIGNvbnN0IGNvbnRhaW5lcjogQ29udGFpbmVyID0ge1xuICAgIHZpZXdzOiBbXSxcbiAgfTtcblxuICBmb3IgKGxldCBpID0gQ09OVEFJTkVSX0hFQURFUl9PRkZTRVQ7IGkgPCBsQ29udGFpbmVyLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGNoaWxkTFZpZXcgPSBsQ29udGFpbmVyW2ldIGFzIExWaWV3O1xuXG4gICAgLy8gR2V0IExWaWV3IGZvciB1bmRlcmx5aW5nIGNvbXBvbmVudC5cbiAgICBpZiAoaXNSb290VmlldyhjaGlsZExWaWV3KSkge1xuICAgICAgY2hpbGRMVmlldyA9IGNoaWxkTFZpZXdbSEVBREVSX09GRlNFVF07XG4gICAgfVxuICAgIGNvbnN0IGNoaWxkVFZpZXcgPSBjaGlsZExWaWV3W1RWSUVXXTtcblxuICAgIGxldCB0ZW1wbGF0ZTtcbiAgICBpZiAoY2hpbGRUVmlldy50eXBlID09PSBUVmlld1R5cGUuQ29tcG9uZW50KSB7XG4gICAgICBjb25zdCBjdHggPSBjaGlsZExWaWV3W0NPTlRFWFRdO1xuICAgICAgLy8gVE9ETzogdGhpcyBpcyBhIGhhY2sgKHdlIGNhcHR1cmUgYSBjb21wb25lbnQgaG9zdCBlbGVtZW50IG5hbWUpLFxuICAgICAgLy8gd2UgbmVlZCBhIG1vcmUgc3RhYmxlIHNvbHV0aW9uIGhlcmUsIGZvciBleC4gYSB3YXkgdG8gZ2VuZXJhdGVcbiAgICAgIC8vIGEgY29tcG9uZW50IGlkLlxuICAgICAgdGVtcGxhdGUgPSAoY3R4IS5jb25zdHJ1Y3RvciBhcyBhbnkpWyfJtWNtcCddLnNlbGVjdG9yc1swXVswXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGVtcGxhdGUgPSBnZXRUVmlld1NzcklkKGNoaWxkVFZpZXcpO1xuICAgIH1cblxuICAgIGNvbnN0IHJvb3ROb2RlczogYW55W10gPSBbXTtcbiAgICBjb2xsZWN0TmF0aXZlTm9kZXMoY2hpbGRUVmlldywgY2hpbGRMVmlldywgY2hpbGRUVmlldy5maXJzdENoaWxkLCByb290Tm9kZXMpO1xuXG4gICAgY29udGFpbmVyLnZpZXdzLnB1c2goe1xuICAgICAgdGVtcGxhdGUsICAvLyBmcm9tIHdoaWNoIHRlbXBsYXRlIGRpZCB0aGlzIGxWaWV3IG9yaWdpbmF0ZT9cbiAgICAgIG51bVJvb3ROb2Rlczogcm9vdE5vZGVzLmxlbmd0aCxcbiAgICAgIC4uLnNlcmlhbGl6ZUxWaWV3KGxDb250YWluZXJbaV0gYXMgTFZpZXcsIGhvc3ROb2RlKSxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBjb250YWluZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMVmlld0Zyb21Sb290RWxlbWVudChlbGVtZW50OiBFbGVtZW50KTogTFZpZXcge1xuICBjb25zdCBNT05LRVlfUEFUQ0hfS0VZX05BTUUgPSAnX19uZ0NvbnRleHRfXyc7XG4gIGNvbnN0IGRhdGEgPSAoZWxlbWVudCBhcyBhbnkpW01PTktFWV9QQVRDSF9LRVlfTkFNRV07XG4gIGxldCBsVmlldyA9IHR5cGVvZiBkYXRhID09PSAnbnVtYmVyJyA/IGdldExWaWV3QnlJZChkYXRhKSA6IGRhdGEgfHwgbnVsbDtcbiAgaWYgKCFsVmlldykgdGhyb3cgbmV3IEVycm9yKCdub3QgZm91bmQnKTsgIC8vIFRPRE86IGlzIGl0IHBvc3NpYmxlP1xuXG4gIGlmIChpc1Jvb3RWaWV3KGxWaWV3KSkge1xuICAgIGxWaWV3ID0gbFZpZXdbSEVBREVSX09GRlNFVF07XG4gIH1cbiAgcmV0dXJuIGxWaWV3O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5ub3RhdGVGb3JIeWRyYXRpb24oZWxlbWVudDogRWxlbWVudCwgbFZpZXc6IExWaWV3KTogdm9pZCB7XG4gIGNvbnN0IHJhd05naCA9IHNlcmlhbGl6ZUxWaWV3KGxWaWV3LCBlbGVtZW50KTtcbiAgY29uc3Qgc2VyaWFsaXplZE5naCA9IEpTT04uc3RyaW5naWZ5KHJhd05naCk7XG4gIGVsZW1lbnQuc2V0QXR0cmlidXRlKCduZ2gnLCBzZXJpYWxpemVkTmdoKTtcbiAgZGVidWdnZXI7XG59XG5cbmZ1bmN0aW9uIF9yZW5kZXI8VD4oXG4gICAgcGxhdGZvcm06IFBsYXRmb3JtUmVmLFxuICAgIGJvb3RzdHJhcFByb21pc2U6IFByb21pc2U8TmdNb2R1bGVSZWY8VD58QXBwbGljYXRpb25SZWY+KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgcmV0dXJuIGJvb3RzdHJhcFByb21pc2UudGhlbigobW9kdWxlT3JBcHBsaWNhdGlvblJlZikgPT4ge1xuICAgIGNvbnN0IGVudmlyb25tZW50SW5qZWN0b3IgPSBtb2R1bGVPckFwcGxpY2F0aW9uUmVmLmluamVjdG9yO1xuICAgIGNvbnN0IHRyYW5zaXRpb25JZCA9IGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KMm1VFJBTlNJVElPTl9JRCwgbnVsbCk7XG4gICAgaWYgKCF0cmFuc2l0aW9uSWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgcmVuZGVyTW9kdWxlW0ZhY3RvcnldKCkgcmVxdWlyZXMgdGhlIHVzZSBvZiBCcm93c2VyTW9kdWxlLndpdGhTZXJ2ZXJUcmFuc2l0aW9uKCkgdG8gZW5zdXJlXG50aGUgc2VydmVyLXJlbmRlcmVkIGFwcCBjYW4gYmUgcHJvcGVybHkgYm9vdHN0cmFwcGVkIGludG8gYSBjbGllbnQgYXBwLmApO1xuICAgIH1cbiAgICBjb25zdCBhcHBsaWNhdGlvblJlZjogQXBwbGljYXRpb25SZWYgPSBtb2R1bGVPckFwcGxpY2F0aW9uUmVmIGluc3RhbmNlb2YgQXBwbGljYXRpb25SZWYgP1xuICAgICAgICBtb2R1bGVPckFwcGxpY2F0aW9uUmVmIDpcbiAgICAgICAgZW52aXJvbm1lbnRJbmplY3Rvci5nZXQoQXBwbGljYXRpb25SZWYpO1xuICAgIGNvbnN0IHNlcnZlckNvbnRleHQgPVxuICAgICAgICBzYW5pdGl6ZVNlcnZlckNvbnRleHQoZW52aXJvbm1lbnRJbmplY3Rvci5nZXQoU0VSVkVSX0NPTlRFWFQsIERFRkFVTFRfU0VSVkVSX0NPTlRFWFQpKTtcbiAgICByZXR1cm4gYXBwbGljYXRpb25SZWYuaXNTdGFibGUucGlwZShmaXJzdCgoaXNTdGFibGU6IGJvb2xlYW4pID0+IGlzU3RhYmxlKSlcbiAgICAgICAgLnRvUHJvbWlzZSgpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBhcHBlbmRTZXJ2ZXJDb250ZXh0SW5mbyhzZXJ2ZXJDb250ZXh0LCBhcHBsaWNhdGlvblJlZik7XG5cbiAgICAgICAgICBjb25zdCBwbGF0Zm9ybVN0YXRlID0gcGxhdGZvcm0uaW5qZWN0b3IuZ2V0KFBsYXRmb3JtU3RhdGUpO1xuXG4gICAgICAgICAgY29uc3QgYXN5bmNQcm9taXNlczogUHJvbWlzZTxhbnk+W10gPSBbXTtcblxuICAgICAgICAgIC8vIFJ1biBhbnkgQkVGT1JFX0FQUF9TRVJJQUxJWkVEIGNhbGxiYWNrcyBqdXN0IGJlZm9yZSByZW5kZXJpbmcgdG8gc3RyaW5nLlxuICAgICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9IGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KEJFRk9SRV9BUFBfU0VSSUFMSVpFRCwgbnVsbCk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNhbGxiYWNrIG9mIGNhbGxiYWNrcykge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrUmVzdWx0ID0gY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAoybVpc1Byb21pc2UoY2FsbGJhY2tSZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAvLyBUT0RPOiBpbiBUUzMuNywgY2FsbGJhY2tSZXN1bHQgaXMgdm9pZC5cbiAgICAgICAgICAgICAgICAgIGFzeW5jUHJvbWlzZXMucHVzaChjYWxsYmFja1Jlc3VsdCBhcyBhbnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBleGNlcHRpb25zLlxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignSWdub3JpbmcgQkVGT1JFX0FQUF9TRVJJQUxJWkVEIEV4Y2VwdGlvbjogJywgZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBjb21wbGV0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGFwcGxpY2F0aW9uUmVmLmNvbXBvbmVudHMuZm9yRWFjaCgoY29tcG9uZW50UmVmKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBjb21wb25lbnRSZWYubG9jYXRpb24ubmF0aXZlRWxlbWVudDtcbiAgICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBhbm5vdGF0ZUZvckh5ZHJhdGlvbihlbGVtZW50LCBnZXRMVmlld0Zyb21Sb290RWxlbWVudChlbGVtZW50KSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBvdXRwdXQgPSBwbGF0Zm9ybVN0YXRlLnJlbmRlclRvU3RyaW5nKCk7XG4gICAgICAgICAgICBwbGF0Zm9ybS5kZXN0cm95KCk7XG4gICAgICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAoYXN5bmNQcm9taXNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBjb21wbGV0ZSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBQcm9taXNlXG4gICAgICAgICAgICAgIC5hbGwoYXN5bmNQcm9taXNlcy5tYXAoKGFzeW5jUHJvbWlzZSkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBhc3luY1Byb21pc2UuY2F0Y2goKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignSWdub3JpbmcgQkVGT1JFX0FQUF9TRVJJQUxJWkVEIEV4Y2VwdGlvbjogJywgZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAudGhlbihjb21wbGV0ZSk7XG4gICAgICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBTcGVjaWZpZXMgdGhlIHZhbHVlIHRoYXQgc2hvdWxkIGJlIHVzZWQgaWYgbm8gc2VydmVyIGNvbnRleHQgdmFsdWUgaGFzIGJlZW4gcHJvdmlkZWQuXG4gKi9cbmNvbnN0IERFRkFVTFRfU0VSVkVSX0NPTlRFWFQgPSAnb3RoZXInO1xuXG4vKipcbiAqIEFuIGludGVybmFsIHRva2VuIHRoYXQgYWxsb3dzIHByb3ZpZGluZyBleHRyYSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgc2VydmVyIGNvbnRleHRcbiAqIChlLmcuIHdoZXRoZXIgU1NSIG9yIFNTRyB3YXMgdXNlZCkuIFRoZSB2YWx1ZSBpcyBhIHN0cmluZyBhbmQgY2hhcmFjdGVycyBvdGhlclxuICogdGhhbiBbYS16QS1aMC05XFwtXSBhcmUgcmVtb3ZlZC4gU2VlIHRoZSBkZWZhdWx0IHZhbHVlIGluIGBERUZBVUxUX1NFUlZFUl9DT05URVhUYCBjb25zdC5cbiAqL1xuZXhwb3J0IGNvbnN0IFNFUlZFUl9DT05URVhUID0gbmV3IEluamVjdGlvblRva2VuPHN0cmluZz4oJ1NFUlZFUl9DT05URVhUJyk7XG5cbi8qKlxuICogU2FuaXRpemVzIHByb3ZpZGVkIHNlcnZlciBjb250ZXh0OlxuICogLSByZW1vdmVzIGFsbCBjaGFyYWN0ZXJzIG90aGVyIHRoYW4gYS16LCBBLVosIDAtOSBhbmQgYC1gXG4gKiAtIHJldHVybnMgYG90aGVyYCBpZiBub3RoaW5nIGlzIHByb3ZpZGVkIG9yIHRoZSBzdHJpbmcgaXMgZW1wdHkgYWZ0ZXIgc2FuaXRpemF0aW9uXG4gKi9cbmZ1bmN0aW9uIHNhbml0aXplU2VydmVyQ29udGV4dChzZXJ2ZXJDb250ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjb250ZXh0ID0gc2VydmVyQ29udGV4dC5yZXBsYWNlKC9bXmEtekEtWjAtOVxcLV0vZywgJycpO1xuICByZXR1cm4gY29udGV4dC5sZW5ndGggPiAwID8gY29udGV4dCA6IERFRkFVTFRfU0VSVkVSX0NPTlRFWFQ7XG59XG5cbi8qKlxuICogQm9vdHN0cmFwcyBhbiBhcHBsaWNhdGlvbiB1c2luZyBwcm92aWRlZCBOZ01vZHVsZSBhbmQgc2VyaWFsaXplcyB0aGUgcGFnZSBjb250ZW50IHRvIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0gbW9kdWxlVHlwZSBBIHJlZmVyZW5jZSB0byBhbiBOZ01vZHVsZSB0aGF0IHNob3VsZCBiZSB1c2VkIGZvciBib290c3RyYXAuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSByZW5kZXIgb3BlcmF0aW9uOlxuICogIC0gYGRvY3VtZW50YCAtIHRoZSBkb2N1bWVudCBvZiB0aGUgcGFnZSB0byByZW5kZXIsIGVpdGhlciBhcyBhbiBIVE1MIHN0cmluZyBvclxuICogICAgICAgICAgICAgICAgIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBgZG9jdW1lbnRgIGluc3RhbmNlLlxuICogIC0gYHVybGAgLSB0aGUgVVJMIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqICAtIGBleHRyYVByb3ZpZGVyc2AgLSBzZXQgb2YgcGxhdGZvcm0gbGV2ZWwgcHJvdmlkZXJzIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJNb2R1bGU8VD4oXG4gICAgbW9kdWxlVHlwZTogVHlwZTxUPixcbiAgICBvcHRpb25zOiB7ZG9jdW1lbnQ/OiBzdHJpbmd8RG9jdW1lbnQ7IHVybD86IHN0cmluZzsgZXh0cmFQcm92aWRlcnM/OiBTdGF0aWNQcm92aWRlcltdfSk6XG4gICAgUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3Qge2RvY3VtZW50LCB1cmwsIGV4dHJhUHJvdmlkZXJzOiBwbGF0Zm9ybVByb3ZpZGVyc30gPSBvcHRpb25zO1xuICBjb25zdCBwbGF0Zm9ybSA9IF9nZXRQbGF0Zm9ybShwbGF0Zm9ybUR5bmFtaWNTZXJ2ZXIsIHtkb2N1bWVudCwgdXJsLCBwbGF0Zm9ybVByb3ZpZGVyc30pO1xuICByZXR1cm4gX3JlbmRlcihwbGF0Zm9ybSwgcGxhdGZvcm0uYm9vdHN0cmFwTW9kdWxlKG1vZHVsZVR5cGUpKTtcbn1cblxuLyoqXG4gKiBCb290c3RyYXBzIGFuIGluc3RhbmNlIG9mIGFuIEFuZ3VsYXIgYXBwbGljYXRpb24gYW5kIHJlbmRlcnMgaXQgdG8gYSBzdHJpbmcuXG4gKlxuICogTm90ZTogdGhlIHJvb3QgY29tcG9uZW50IHBhc3NlZCBpbnRvIHRoaXMgZnVuY3Rpb24gKm11c3QqIGJlIGEgc3RhbmRhbG9uZSBvbmUgKHNob3VsZCBoYXZlIHRoZVxuICogYHN0YW5kYWxvbmU6IHRydWVgIGZsYWcgaW4gdGhlIGBAQ29tcG9uZW50YCBkZWNvcmF0b3IgY29uZmlnKS5cbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBAQ29tcG9uZW50KHtcbiAqICAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAqICAgdGVtcGxhdGU6ICdIZWxsbyB3b3JsZCEnXG4gKiB9KVxuICogY2xhc3MgUm9vdENvbXBvbmVudCB7fVxuICpcbiAqIGNvbnN0IG91dHB1dDogc3RyaW5nID0gYXdhaXQgcmVuZGVyQXBwbGljYXRpb24oUm9vdENvbXBvbmVudCwge2FwcElkOiAnc2VydmVyLWFwcCd9KTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSByb290Q29tcG9uZW50IEEgcmVmZXJlbmNlIHRvIGEgU3RhbmRhbG9uZSBDb21wb25lbnQgdGhhdCBzaG91bGQgYmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSByZW5kZXIgb3BlcmF0aW9uOlxuICogIC0gYGFwcElkYCAtIGEgc3RyaW5nIGlkZW50aWZpZXIgb2YgdGhpcyBhcHBsaWNhdGlvbi4gVGhlIGFwcElkIGlzIHVzZWQgdG8gcHJlZml4IGFsbFxuICogICAgICAgICAgICAgIHNlcnZlci1nZW5lcmF0ZWQgc3R5bGluZ3MgYW5kIHN0YXRlIGtleXMgb2YgdGhlIGFwcGxpY2F0aW9uIGluIFRyYW5zZmVyU3RhdGVcbiAqICAgICAgICAgICAgICB1c2UtY2FzZXMuXG4gKiAgLSBgZG9jdW1lbnRgIC0gdGhlIGRvY3VtZW50IG9mIHRoZSBwYWdlIHRvIHJlbmRlciwgZWl0aGVyIGFzIGFuIEhUTUwgc3RyaW5nIG9yXG4gKiAgICAgICAgICAgICAgICAgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGBkb2N1bWVudGAgaW5zdGFuY2UuXG4gKiAgLSBgdXJsYCAtIHRoZSBVUkwgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYHByb3ZpZGVyc2AgLSBzZXQgb2YgYXBwbGljYXRpb24gbGV2ZWwgcHJvdmlkZXJzIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqICAtIGBwbGF0Zm9ybVByb3ZpZGVyc2AgLSB0aGUgcGxhdGZvcm0gbGV2ZWwgcHJvdmlkZXJzIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqXG4gKiBAcmV0dXJucyBBIFByb21pc2UsIHRoYXQgcmV0dXJucyBzZXJpYWxpemVkICh0byBhIHN0cmluZykgcmVuZGVyZWQgcGFnZSwgb25jZSByZXNvbHZlZC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAZGV2ZWxvcGVyUHJldmlld1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQXBwbGljYXRpb248VD4ocm9vdENvbXBvbmVudDogVHlwZTxUPiwgb3B0aW9uczoge1xuICBhcHBJZDogc3RyaW5nO1xuICBkb2N1bWVudD86IHN0cmluZyB8IERvY3VtZW50O1xuICB1cmw/OiBzdHJpbmc7XG4gIHByb3ZpZGVycz86IEFycmF5PFByb3ZpZGVyfEVudmlyb25tZW50UHJvdmlkZXJzPjtcbiAgcGxhdGZvcm1Qcm92aWRlcnM/OiBQcm92aWRlcltdO1xufSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHtkb2N1bWVudCwgdXJsLCBwbGF0Zm9ybVByb3ZpZGVycywgYXBwSWR9ID0gb3B0aW9ucztcbiAgY29uc3QgcGxhdGZvcm0gPSBfZ2V0UGxhdGZvcm0ocGxhdGZvcm1EeW5hbWljU2VydmVyLCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnN9KTtcbiAgY29uc3QgYXBwUHJvdmlkZXJzID0gW1xuICAgIGltcG9ydFByb3ZpZGVyc0Zyb20oQnJvd3Nlck1vZHVsZS53aXRoU2VydmVyVHJhbnNpdGlvbih7YXBwSWR9KSksXG4gICAgaW1wb3J0UHJvdmlkZXJzRnJvbShTZXJ2ZXJNb2R1bGUpLFxuICAgIC4uLlRSQU5TRkVSX1NUQVRFX1NFUklBTElaQVRJT05fUFJPVklERVJTLFxuICAgIC4uLihvcHRpb25zLnByb3ZpZGVycyA/PyBbXSksXG4gIF07XG4gIHJldHVybiBfcmVuZGVyKHBsYXRmb3JtLCBpbnRlcm5hbENyZWF0ZUFwcGxpY2F0aW9uKHtyb290Q29tcG9uZW50LCBhcHBQcm92aWRlcnN9KSk7XG59XG5cbi8qKlxuICogQm9vdHN0cmFwcyBhbiBhcHBsaWNhdGlvbiB1c2luZyBwcm92aWRlZCB7QGxpbmsgTmdNb2R1bGVGYWN0b3J5fSBhbmQgc2VyaWFsaXplcyB0aGUgcGFnZSBjb250ZW50XG4gKiB0byBzdHJpbmcuXG4gKlxuICogQHBhcmFtIG1vZHVsZUZhY3RvcnkgQW4gaW5zdGFuY2Ugb2YgdGhlIHtAbGluayBOZ01vZHVsZUZhY3Rvcnl9IHRoYXQgc2hvdWxkIGJlIHVzZWQgZm9yXG4gKiAgICAgYm9vdHN0cmFwLlxuICogQHBhcmFtIG9wdGlvbnMgQWRkaXRpb25hbCBjb25maWd1cmF0aW9uIGZvciB0aGUgcmVuZGVyIG9wZXJhdGlvbjpcbiAqICAtIGBkb2N1bWVudGAgLSB0aGUgZG9jdW1lbnQgb2YgdGhlIHBhZ2UgdG8gcmVuZGVyLCBlaXRoZXIgYXMgYW4gSFRNTCBzdHJpbmcgb3JcbiAqICAgICAgICAgICAgICAgICBhcyBhIHJlZmVyZW5jZSB0byB0aGUgYGRvY3VtZW50YCBpbnN0YW5jZS5cbiAqICAtIGB1cmxgIC0gdGhlIFVSTCBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKiAgLSBgZXh0cmFQcm92aWRlcnNgIC0gc2V0IG9mIHBsYXRmb3JtIGxldmVsIHByb3ZpZGVycyBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKlxuICogQHB1YmxpY0FwaVxuICpcbiAqIEBkZXByZWNhdGVkXG4gKiBUaGlzIHN5bWJvbCBpcyBubyBsb25nZXIgbmVjZXNzYXJ5IGFzIG9mIEFuZ3VsYXIgdjEzLlxuICogVXNlIHtAbGluayByZW5kZXJNb2R1bGV9IEFQSSBpbnN0ZWFkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyTW9kdWxlRmFjdG9yeTxUPihcbiAgICBtb2R1bGVGYWN0b3J5OiBOZ01vZHVsZUZhY3Rvcnk8VD4sXG4gICAgb3B0aW9uczoge2RvY3VtZW50Pzogc3RyaW5nOyB1cmw/OiBzdHJpbmc7IGV4dHJhUHJvdmlkZXJzPzogU3RhdGljUHJvdmlkZXJbXX0pOlxuICAgIFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHtkb2N1bWVudCwgdXJsLCBleHRyYVByb3ZpZGVyczogcGxhdGZvcm1Qcm92aWRlcnN9ID0gb3B0aW9ucztcbiAgY29uc3QgcGxhdGZvcm0gPSBfZ2V0UGxhdGZvcm0ocGxhdGZvcm1TZXJ2ZXIsIHtkb2N1bWVudCwgdXJsLCBwbGF0Zm9ybVByb3ZpZGVyc30pO1xuICByZXR1cm4gX3JlbmRlcihwbGF0Zm9ybSwgcGxhdGZvcm0uYm9vdHN0cmFwTW9kdWxlRmFjdG9yeShtb2R1bGVGYWN0b3J5KSk7XG59XG4iXX0=