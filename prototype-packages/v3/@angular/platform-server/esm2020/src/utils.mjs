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
    console.log('Element Annotation added', element, serializedNgh);
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
                console.log('complete fired and length is ', applicationRef.components.length > 0);
                applicationRef.components.forEach((componentRef) => {
                    const element = componentRef.location.nativeElement;
                    if (element) {
                        console.log('Element exists and is about to get annotated');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1zZXJ2ZXIvc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxjQUFjLEVBQXdCLG1CQUFtQixFQUFFLGNBQWMsRUFBdUQsU0FBUyxFQUF3QixhQUFhLElBQUksWUFBWSxFQUFFLDBCQUEwQixJQUFJLHlCQUF5QixFQUFFLFVBQVUsR0FBRSxNQUFNLGVBQWUsQ0FBQztBQUNuUyxPQUFPLEVBQUMsbUJBQW1CLElBQUksa0JBQWtCLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDeEUsT0FBTyxFQUFDLHdCQUF3QixJQUFJLHVCQUF1QixFQUE2QixLQUFLLElBQUksSUFBSSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRzVILE9BQU8sRUFBQyxXQUFXLElBQUksVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3hELE9BQU8sRUFBQyxRQUFRLElBQUksT0FBTyxFQUFFLGNBQWMsSUFBSSxhQUFhLEVBQUUsS0FBSyxJQUFJLElBQUksRUFBbUIsTUFBTSxJQUFJLEtBQUssRUFBMkMsTUFBTSxlQUFlLENBQUM7QUFDOUssT0FBTyxFQUFDLFlBQVksSUFBSSxXQUFXLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDMUQsT0FBTyxFQUFDLGFBQWEsRUFBRSxjQUFjLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUN4RSxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFckMsT0FBTyxFQUFDLGVBQWUsRUFBRSxrQkFBa0IsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUMvRCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFDLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDN0UsT0FBTyxFQUFD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RyxFQUFFLGlCQUFpQixFQUFDLENBQUMsQ0FBQztJQUN6RixNQUFNLFlBQVksR0FBRztRQUNuQixtQkFBbUIsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBQ2hFLG1CQUFtQixDQUFDLFlBQVksQ0FBQztRQUNqQyxHQUFHLHNDQUFzQztRQUN6QyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUM7S0FDN0IsQ0FBQztJQUNGLE9BQU8sT0FBTyxDQUFDLFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxFQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckYsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztHQWlCRztBQUNILE1BQU0sVUFBVSxtQkFBbUIsQ0FDL0IsYUFBaUMsRUFDakMsT0FBNkU7SUFFL0UsTUFBTSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFDLEdBQUcsT0FBTyxDQUFDO0lBQ25FLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxjQUFjLEVBQUUsRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFDLENBQUMsQ0FBQztJQUNsRixPQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FwcGxpY2F0aW9uUmVmLCBFbnZpcm9ubWVudFByb3ZpZGVycywgaW1wb3J0UHJvdmlkZXJzRnJvbSwgSW5qZWN0aW9uVG9rZW4sIE5nTW9kdWxlRmFjdG9yeSwgTmdNb2R1bGVSZWYsIFBsYXRmb3JtUmVmLCBQcm92aWRlciwgUmVuZGVyZXIyLCBTdGF0aWNQcm92aWRlciwgVHlwZSwgybVnZXRMVmlld0J5SWQgYXMgZ2V0TFZpZXdCeUlkLCDJtWludGVybmFsQ3JlYXRlQXBwbGljYXRpb24gYXMgaW50ZXJuYWxDcmVhdGVBcHBsaWNhdGlvbiwgybVpc1Byb21pc2UsfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybVjb2xsZWN0TmF0aXZlTm9kZXMgYXMgY29sbGVjdE5hdGl2ZU5vZGVzfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybVDT05UQUlORVJfSEVBREVSX09GRlNFVCBhcyBDT05UQUlORVJfSEVBREVSX09GRlNFVCwgybVMQ29udGFpbmVyIGFzIExDb250YWluZXIsIMm1VFlQRSBhcyBUWVBFfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybVUQ29udGFpbmVyTm9kZSBhcyBUQ29udGFpbmVyTm9kZSwgybVUTm9kZSBhcyBUTm9kZSwgybVUTm9kZVR5cGUgYXMgVE5vZGVUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybVSTm9kZSBhcyBSTm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge8m1aXNSb290VmlldyBhcyBpc1Jvb3RWaWV3fSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybVDT05URVhUIGFzIENPTlRFWFQsIMm1SEVBREVSX09GRlNFVCBhcyBIRUFERVJfT0ZGU0VULCDJtUhPU1QgYXMgSE9TVCwgybVMVmlldyBhcyBMVmlldywgybVUVklFVyBhcyBUVklFVywgybVUVmlldyBhcyBUVmlldywgybVUVmlld1R5cGUgYXMgVFZpZXdUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ybV1bndyYXBSTm9kZSBhcyB1bndyYXBSTm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0Jyb3dzZXJNb2R1bGUsIMm1VFJBTlNJVElPTl9JRH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlcic7XG5pbXBvcnQge2ZpcnN0fSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7bmF2aWdhdGVCZXR3ZWVuLCBOb2RlTmF2aWdhdGlvblN0ZXB9IGZyb20gJy4vbm9kZV9uYXYnO1xuaW1wb3J0IHtQbGF0Zm9ybVN0YXRlfSBmcm9tICcuL3BsYXRmb3JtX3N0YXRlJztcbmltcG9ydCB7cGxhdGZvcm1EeW5hbWljU2VydmVyLCBwbGF0Zm9ybVNlcnZlciwgU2VydmVyTW9kdWxlfSBmcm9tICcuL3NlcnZlcic7XG5pbXBvcnQge0JFRk9SRV9BUFBfU0VSSUFMSVpFRCwgSU5JVElBTF9DT05GSUd9IGZyb20gJy4vdG9rZW5zJztcbmltcG9ydCB7VFJBTlNGRVJfU1RBVEVfU0VSSUFMSVpBVElPTl9QUk9WSURFUlN9IGZyb20gJy4vdHJhbnNmZXJfc3RhdGUnO1xuXG5pbnRlcmZhY2UgUGxhdGZvcm1PcHRpb25zIHtcbiAgZG9jdW1lbnQ/OiBzdHJpbmd8RG9jdW1lbnQ7XG4gIHVybD86IHN0cmluZztcbiAgcGxhdGZvcm1Qcm92aWRlcnM/OiBQcm92aWRlcltdO1xufVxuXG5mdW5jdGlvbiBfZ2V0UGxhdGZvcm0oXG4gICAgcGxhdGZvcm1GYWN0b3J5OiAoZXh0cmFQcm92aWRlcnM6IFN0YXRpY1Byb3ZpZGVyW10pID0+IFBsYXRmb3JtUmVmLFxuICAgIG9wdGlvbnM6IFBsYXRmb3JtT3B0aW9ucyk6IFBsYXRmb3JtUmVmIHtcbiAgY29uc3QgZXh0cmFQcm92aWRlcnMgPSBvcHRpb25zLnBsYXRmb3JtUHJvdmlkZXJzID8/IFtdO1xuICByZXR1cm4gcGxhdGZvcm1GYWN0b3J5KFtcbiAgICB7cHJvdmlkZTogSU5JVElBTF9DT05GSUcsIHVzZVZhbHVlOiB7ZG9jdW1lbnQ6IG9wdGlvbnMuZG9jdW1lbnQsIHVybDogb3B0aW9ucy51cmx9fSxcbiAgICBleHRyYVByb3ZpZGVycyxcbiAgXSk7XG59XG5cbi8qKlxuICogQWRkcyB0aGUgYG5nLXNlcnZlci1jb250ZXh0YCBhdHRyaWJ1dGUgdG8gaG9zdCBlbGVtZW50cyBvZiBhbGwgYm9vdHN0cmFwcGVkIGNvbXBvbmVudHNcbiAqIHdpdGhpbiBhIGdpdmVuIGFwcGxpY2F0aW9uLlxuICovXG5mdW5jdGlvbiBhcHBlbmRTZXJ2ZXJDb250ZXh0SW5mbyhzZXJ2ZXJDb250ZXh0OiBzdHJpbmcsIGFwcGxpY2F0aW9uUmVmOiBBcHBsaWNhdGlvblJlZikge1xuICBhcHBsaWNhdGlvblJlZi5jb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudFJlZikgPT4ge1xuICAgIGNvbnN0IHJlbmRlcmVyID0gY29tcG9uZW50UmVmLmluamVjdG9yLmdldChSZW5kZXJlcjIpO1xuICAgIGNvbnN0IGVsZW1lbnQgPSBjb21wb25lbnRSZWYubG9jYXRpb24ubmF0aXZlRWxlbWVudDtcbiAgICBpZiAoZWxlbWVudCkge1xuICAgICAgcmVuZGVyZXIuc2V0QXR0cmlidXRlKGVsZW1lbnQsICduZy1zZXJ2ZXItY29udGV4dCcsIHNlcnZlckNvbnRleHQpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIFRPRE86IGltcG9ydCBmcm9tIGBAYW5ndWxhci9jb3JlYCBpbnN0ZWFkLCB0aGlzIGlzIGp1c3QgYSBjb3B5LlxuZXhwb3J0IGVudW0gSTE4bkNyZWF0ZU9wQ29kZSB7XG4gIFNISUZUID0gMixcbiAgQVBQRU5EX0VBR0VSTFkgPSAwYjAxLFxuICBDT01NRU5UID0gMGIxMCxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMaXZlRG9tIHtcbiAgLyogYW5jaG9yIGlzIGFuIGluZGV4IGZyb20gTFZpZXcgKi9cbiAgY29udGFpbmVyczogUmVjb3JkPG51bWJlciwgQ29udGFpbmVyPjtcbiAgbm9kZXM6IFJlY29yZDxudW1iZXIsIHN0cmluZz47XG4gIHRlbXBsYXRlczogUmVjb3JkPG51bWJlciwgc3RyaW5nPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb250YWluZXIge1xuICB2aWV3czogVmlld1tdO1xuICAvLyBEZXNjcmliZXMgdGhlIG51bWJlciBvZiB0b3AgbGV2ZWwgbm9kZXMgaW4gdGhpcyBjb250YWluZXIuXG4gIC8vIE9ubHkgYXBwbGljYWJsZSB0byA8bmctY29udGFpbmVyPnMuXG4gIC8vXG4gIC8vIFRPRE86IGNvbnNpZGVyIG1vdmluZyB0aGlzIGluZm8gZWxzZXdoZXJlIHRvIGF2b2lkIGNvbmZ1c2lvblxuICAvLyBiZXR3ZWVuIHZpZXcgY29udGFpbmVycyAoPGRpdiAqbmdJZj4pIGFuZCBlbGVtZW50IGNvbnRhaW5lcnNcbiAgLy8gKDxuZy1jb250YWluZXI+cykuXG4gIG51bVJvb3ROb2Rlcz86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWaWV3IGV4dGVuZHMgTGl2ZURvbSB7XG4gIHRlbXBsYXRlOiBzdHJpbmc7XG4gIG51bVJvb3ROb2RlczogbnVtYmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNMQ29udGFpbmVyKHZhbHVlOiBSTm9kZXxMVmlld3xMQ29udGFpbmVyfHt9fG51bGwpOiB2YWx1ZSBpcyBMQ29udGFpbmVyIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlW1RZUEVdID09PSB0cnVlO1xufVxuXG5mdW5jdGlvbiBmaXJzdFJOb2RlSW5FbGVtZW50Q29udGFpbmVyKHRWaWV3OiBUVmlldywgbFZpZXc6IExWaWV3LCB0Tm9kZTogVE5vZGUpOiBSTm9kZXxudWxsIHtcbiAgY29uc3Qgcm9vdE5vZGVzOiBhbnlbXSA9IFtdO1xuICAvLyBUT0RPOiBmaW5kIG1vcmUgZWZmaWNpZW50IHdheSB0byBkbyB0aGlzLiBXZSBkb24ndCBuZWVkIHRvIHRyYXZlcnNlIHRoZSBlbnRpcmVcbiAgLy8gc3RydWN0dXJlLCB3ZSBjYW4ganVzdCBzdG9wIGFmdGVyIGV4YW1pbmluZyB0aGUgZmlyc3Qgbm9kZS5cbiAgY29sbGVjdE5hdGl2ZU5vZGVzKHRWaWV3LCBsVmlldywgdE5vZGUsIHJvb3ROb2Rlcyk7XG4gIHJldHVybiByb290Tm9kZXNbMF07XG59XG5cbmZ1bmN0aW9uIGlzUHJvamVjdGlvblROb2RlKHROb2RlOiBUTm9kZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gKHROb2RlLnR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikgPT09IFROb2RlVHlwZS5Qcm9qZWN0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUSTE4bk5vZGUob2JqOiBhbnkpOiBib29sZWFuIHtcbiAgLy8gVE9ETzogY29uc2lkZXIgYWRkaW5nIGEgbm9kZSB0eXBlIHRvIFRJMThuP1xuICByZXR1cm4gb2JqLmhhc093blByb3BlcnR5KCdjcmVhdGUnKSAmJiBvYmouaGFzT3duUHJvcGVydHkoJ3VwZGF0ZScpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZENsb3Nlc3RFbGVtZW50VE5vZGUodE5vZGU6IFROb2RlfG51bGwpOiBUTm9kZXxudWxsIHtcbiAgbGV0IHBhcmVudFROb2RlOiBUTm9kZXxudWxsID0gdE5vZGU7XG4gIC8vIEZJWE1FOiB0aGlzIGNvbmRpdGlvbiBzaG91bGQgYWxzbyB0YWtlIGludG8gYWNjb3VudCB3aGV0aGVyXG4gIC8vIHJlc3VsdGluZyB0Tm9kZSBpcyBub3QgbWFya2VkIGFzIGBpbnNlcnRCZWZvcmVJbmRleGAuXG4gIHdoaWxlIChwYXJlbnRUTm9kZSAhPT0gbnVsbCAmJlxuICAgICAgICAgKChwYXJlbnRUTm9kZS50eXBlICYgVE5vZGVUeXBlLkVsZW1lbnQpICE9PSBUTm9kZVR5cGUuRWxlbWVudCB8fFxuICAgICAgICAgIHBhcmVudFROb2RlLmluc2VydEJlZm9yZUluZGV4ICE9PSBudWxsKSkge1xuICAgIHROb2RlID0gcGFyZW50VE5vZGU7XG4gICAgcGFyZW50VE5vZGUgPSB0Tm9kZS5wYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHBhcmVudFROb2RlO1xufVxuXG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUxWaWV3KGxWaWV3OiBMVmlldywgaG9zdE5vZGU6IEVsZW1lbnQpOiBMaXZlRG9tIHtcbiAgY29uc3QgbmdoOiBMaXZlRG9tID0ge1xuICAgIGNvbnRhaW5lcnM6IHt9LFxuICAgIHRlbXBsYXRlczoge30sXG4gICAgbm9kZXM6IHt9LFxuICB9O1xuXG4gIGNvbnN0IHRWaWV3ID0gbFZpZXdbVFZJRVddO1xuICBmb3IgKGxldCBpID0gSEVBREVSX09GRlNFVDsgaSA8IHRWaWV3LmJpbmRpbmdTdGFydEluZGV4OyBpKyspIHtcbiAgICBkZWJ1Z2dlcjtcblxuICAgIGxldCB0YXJnZXROb2RlOiBOb2RlfG51bGwgPSBudWxsO1xuICAgIGNvbnN0IGFkanVzdGVkSW5kZXggPSBpIC0gSEVBREVSX09GRlNFVDtcbiAgICBjb25zdCB0Tm9kZSA9IHRWaWV3LmRhdGFbaV0gYXMgVENvbnRhaW5lck5vZGU7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodE5vZGUucHJvamVjdGlvbikpIHtcbiAgICAgIC8vIFRPRE86IGhhbmRsZSBgUk5vZGVbXWAgYXMgd2VsbC5cbiAgICAgIGZvciAoY29uc3QgaGVhZFROb2RlIG9mICh0Tm9kZS5wcm9qZWN0aW9uIGFzIGFueVtdKSkge1xuICAgICAgICAvLyBXZSBtYXkgaGF2ZSBgbnVsbGBzIGluIHNsb3RzIHdpdGggbm8gcHJvamVjdGVkIGNvbnRlbnQuXG4gICAgICAgIC8vIEFsc28sIGlmIHdlIHByb2Nlc3MgcmUtcHJvamVjdGVkIGNvbnRlbnQgKGkuZS4gYDxuZy1jb250ZW50PmBcbiAgICAgICAgLy8gYXBwZWFycyBhdCBwcm9qZWN0aW9uIGxvY2F0aW9uKSwgc2tpcCBhbm5vdGF0aW9ucyBmb3IgdGhpcyBjb250ZW50XG4gICAgICAgIC8vIHNpbmNlIGFsbCBET00gbm9kZXMgaW4gdGhpcyBwcm9qZWN0aW9uIHdlcmUgaGFuZGxlZCB3aGlsZSBwcm9jZXNzaW5nXG4gICAgICAgIC8vIGEgcGFyZW50IGxWaWV3LCB3aGljaCBjb250YWlucyB0aG9zZSBub2Rlcy5cbiAgICAgICAgaWYgKGhlYWRUTm9kZSAmJiAhaXNQcm9qZWN0aW9uVE5vZGUoaGVhZFROb2RlKSkge1xuICAgICAgICAgIG5naC5ub2Rlc1toZWFkVE5vZGUuaW5kZXggLSBIRUFERVJfT0ZGU0VUXSA9IGNhbGNQYXRoRm9yTm9kZSh0VmlldywgbFZpZXcsIGhlYWRUTm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzTENvbnRhaW5lcihsVmlld1tpXSkpIHtcbiAgICAgIC8vIHRoaXMgaXMgYSBjb250YWluZXJcbiAgICAgIGNvbnN0IHROb2RlID0gdFZpZXcuZGF0YVtpXSBhcyBUQ29udGFpbmVyTm9kZTtcbiAgICAgIGNvbnN0IGVtYmVkZGVkVFZpZXcgPSB0Tm9kZS50Vmlld3M7XG4gICAgICBpZiAoZW1iZWRkZWRUVmlldyAhPT0gbnVsbCkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShlbWJlZGRlZFRWaWV3KSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0aW5nIHROb2RlLnRWaWV3cyB0byBiZSBhbiBvYmplY3QsIGJ1dCBpdCdzIGFuIGFycmF5LmApO1xuICAgICAgICB9XG4gICAgICAgIG5naC50ZW1wbGF0ZXMhW2kgLSBIRUFERVJfT0ZGU0VUXSA9IGdldFRWaWV3U3NySWQoZW1iZWRkZWRUVmlldyk7XG4gICAgICB9XG5cbiAgICAgIHRhcmdldE5vZGUgPSB1bndyYXBSTm9kZShsVmlld1tpXVtIT1NUXSEpIGFzIE5vZGU7XG4gICAgICBjb25zdCBjb250YWluZXIgPSBzZXJpYWxpemVMQ29udGFpbmVyKGxWaWV3W2ldLCBob3N0Tm9kZSwgYWRqdXN0ZWRJbmRleCk7XG4gICAgICBuZ2guY29udGFpbmVycyFbYWRqdXN0ZWRJbmRleF0gPSBjb250YWluZXI7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGxWaWV3W2ldKSkge1xuICAgICAgLy8gdGhpcyBpcyBhIGNvbXBvbmVudFxuICAgICAgdGFyZ2V0Tm9kZSA9IHVud3JhcFJOb2RlKGxWaWV3W2ldW0hPU1RdISkgYXMgRWxlbWVudDtcbiAgICAgIGFubm90YXRlRm9ySHlkcmF0aW9uKHRhcmdldE5vZGUgYXMgRWxlbWVudCwgbFZpZXdbaV0pO1xuICAgIH0gZWxzZSBpZiAoaXNUSTE4bk5vZGUodE5vZGUpKSB7XG4gICAgICAvLyBQcm9jZXNzIGkxOG4gdGV4dCBub2Rlcy4uLlxuICAgICAgY29uc3QgY3JlYXRlT3BDb2RlcyA9ICh0Tm9kZSBhcyBhbnkpLmNyZWF0ZTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3JlYXRlT3BDb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBvcENvZGUgPSBjcmVhdGVPcENvZGVzW2krK10gYXMgYW55O1xuICAgICAgICBjb25zdCBhcHBlbmROb3cgPVxuICAgICAgICAgICAgKG9wQ29kZSAmIEkxOG5DcmVhdGVPcENvZGUuQVBQRU5EX0VBR0VSTFkpID09PSBJMThuQ3JlYXRlT3BDb2RlLkFQUEVORF9FQUdFUkxZO1xuICAgICAgICBjb25zdCBpbmRleCA9IG9wQ29kZSA+Pj4gSTE4bkNyZWF0ZU9wQ29kZS5TSElGVDtcbiAgICAgICAgY29uc3QgdE5vZGUgPSB0Vmlldy5kYXRhW2luZGV4XSBhcyBUTm9kZTtcbiAgICAgICAgLy8gaWYgKGFwcGVuZE5vdykge1xuICAgICAgICBjb25zdCBwYXJlbnRUTm9kZSA9IGZpbmRDbG9zZXN0RWxlbWVudFROb2RlKHROb2RlKTtcbiAgICAgICAgY29uc3QgcGF0aCA9IGNhbGNQYXRoRm9yTm9kZSh0VmlldywgbFZpZXcsIHROb2RlLCBwYXJlbnRUTm9kZSk7XG4gICAgICAgIG5naC5ub2Rlc1t0Tm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVRdID0gcGF0aDtcbiAgICAgICAgLy8gfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodE5vZGUuaW5zZXJ0QmVmb3JlSW5kZXgpIHtcbiAgICAgIGRlYnVnZ2VyO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodE5vZGUuaW5zZXJ0QmVmb3JlSW5kZXgpICYmIHROb2RlLmluc2VydEJlZm9yZUluZGV4WzBdICE9PSBudWxsKSB7XG4gICAgICAgIC8vIEEgcm9vdCBub2RlIHdpdGhpbiBpMThuIGJsb2NrLlxuICAgICAgICAvLyBUT0RPOiBhZGQgYSBjb21tZW50IG9uICp3aHkqIHdlIG5lZWQgYSBwYXRoIGhlcmUuXG4gICAgICAgIGNvbnN0IHBhdGggPSBjYWxjUGF0aEZvck5vZGUodFZpZXcsIGxWaWV3LCB0Tm9kZSk7XG4gICAgICAgIG5naC5ub2Rlc1t0Tm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVRdID0gcGF0aDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdE5vZGVUeXBlID0gdE5vZGUudHlwZTtcbiAgICAgIC8vIDxuZy1jb250YWluZXI+IGNhc2VcbiAgICAgIGlmICh0Tm9kZVR5cGUgJiBUTm9kZVR5cGUuRWxlbWVudENvbnRhaW5lcikge1xuICAgICAgICBjb25zdCByb290Tm9kZXM6IGFueVtdID0gW107XG4gICAgICAgIGNvbGxlY3ROYXRpdmVOb2Rlcyh0VmlldywgbFZpZXcsIHROb2RlLmNoaWxkLCByb290Tm9kZXMpO1xuXG4gICAgICAgIC8vIFRoaXMgaXMgYW4gXCJlbGVtZW50XCIgY29udGFpbmVyICh2cyBcInZpZXdcIiBjb250YWluZXIpLFxuICAgICAgICAvLyBzbyBpdCdzIG9ubHkgcmVwcmVzZW50ZWQgYnkgdGhlIG51bWJlciBvZiB0b3AtbGV2ZWwgbm9kZXNcbiAgICAgICAgLy8gYXMgYSBzaGlmdCB0byBnZXQgdG8gYSBjb3JyZXNwb25kaW5nIGNvbW1lbnQgbm9kZS5cbiAgICAgICAgY29uc3QgY29udGFpbmVyOiBDb250YWluZXIgPSB7XG4gICAgICAgICAgdmlld3M6IFtdLFxuICAgICAgICAgIG51bVJvb3ROb2Rlczogcm9vdE5vZGVzLmxlbmd0aCxcbiAgICAgICAgfTtcblxuICAgICAgICBuZ2guY29udGFpbmVyc1thZGp1c3RlZEluZGV4XSA9IGNvbnRhaW5lcjtcbiAgICAgIH0gZWxzZSBpZiAodE5vZGVUeXBlICYgVE5vZGVUeXBlLlByb2plY3Rpb24pIHtcbiAgICAgICAgLy8gQ3VycmVudCBUTm9kZSBoYXMgbm8gRE9NIGVsZW1lbnQgYXNzb2NpYXRlZCB3aXRoIGl0LFxuICAgICAgICAvLyBzbyB0aGUgZm9sbG93aW5nIG5vZGUgd291bGQgbm90IGJlIGFibGUgdG8gZmluZCBhbiBhbmNob3IuXG4gICAgICAgIC8vIFVzZSBmdWxsIHBhdGggaW5zdGVhZC5cbiAgICAgICAgbGV0IG5leHRUTm9kZSA9IHROb2RlLm5leHQ7XG4gICAgICAgIHdoaWxlIChuZXh0VE5vZGUgIT09IG51bGwgJiYgKG5leHRUTm9kZS50eXBlICYgVE5vZGVUeXBlLlByb2plY3Rpb24pKSB7XG4gICAgICAgICAgbmV4dFROb2RlID0gbmV4dFROb2RlLm5leHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5leHRUTm9kZSkge1xuICAgICAgICAgIGNvbnN0IGluZGV4ID0gbmV4dFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgICAgICAgICBjb25zdCBwYXRoID0gY2FsY1BhdGhGb3JOb2RlKHRWaWV3LCBsVmlldywgbmV4dFROb2RlKTtcbiAgICAgICAgICBuZ2gubm9kZXNbaW5kZXhdID0gcGF0aDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gLi4uIG90aGVyd2lzZSwgdGhpcyBpcyBhIERPTSBlbGVtZW50LCBmb3Igd2hpY2ggd2UgbWF5IG5lZWQgdG9cbiAgICAgICAgLy8gc2VyaWFsaXplIGluIHNvbWUgY2FzZXMuXG4gICAgICAgIHRhcmdldE5vZGUgPSBsVmlld1tpXSBhcyBOb2RlO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHByb2plY3Rpb24gbmV4dCBpcyBub3QgdGhlIHNhbWUgYXMgbmV4dCwgaW4gd2hpY2ggY2FzZVxuICAgICAgICAvLyB0aGUgbm9kZSB3b3VsZCBub3QgYmUgZm91bmQgYXQgY3JlYXRpb24gdGltZSBhdCBydW50aW1lIGFuZCB3ZVxuICAgICAgICAvLyBuZWVkIHRvIHByb3ZpZGUgYSBsb2NhdGlvbiB0byB0aGF0IG5vZGUuXG4gICAgICAgIGlmICh0Tm9kZS5wcm9qZWN0aW9uTmV4dCAmJiB0Tm9kZS5wcm9qZWN0aW9uTmV4dCAhPT0gdE5vZGUubmV4dCkge1xuICAgICAgICAgIGNvbnN0IG5leHRQcm9qZWN0ZWRUTm9kZSA9IHROb2RlLnByb2plY3Rpb25OZXh0O1xuICAgICAgICAgIGNvbnN0IGluZGV4ID0gbmV4dFByb2plY3RlZFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgICAgICAgICBjb25zdCBwYXRoID0gY2FsY1BhdGhGb3JOb2RlKHRWaWV3LCBsVmlldywgbmV4dFByb2plY3RlZFROb2RlKTtcbiAgICAgICAgICBuZ2gubm9kZXNbaW5kZXhdID0gcGF0aDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gbmdoO1xufVxuXG5mdW5jdGlvbiBjYWxjUGF0aEZvck5vZGUoXG4gICAgdFZpZXc6IFRWaWV3LCBsVmlldzogTFZpZXcsIHROb2RlOiBUTm9kZSwgcGFyZW50VE5vZGU/OiBUTm9kZXxudWxsKTogc3RyaW5nIHtcbiAgY29uc3QgaW5kZXggPSB0Tm9kZS5pbmRleDtcbiAgLy8gSWYgYG51bGxgIGlzIHBhc3NlZCBleHBsaWNpdGx5LCB1c2UgdGhpcyBhcyBhIHNpZ25hbCB0aGF0IHdlIHdhbnQgdG8gY2FsY3VsYXRlXG4gIC8vIHRoZSBwYXRoIHN0YXJ0aW5nIGZyb20gYGxWaWV3W0hPU1RdYC5cbiAgcGFyZW50VE5vZGUgPSBwYXJlbnRUTm9kZSA9PT0gbnVsbCA/IG51bGwgOiAocGFyZW50VE5vZGUgfHwgdE5vZGUucGFyZW50ISk7XG4gIGNvbnN0IHBhcmVudEluZGV4ID0gcGFyZW50VE5vZGUgPT09IG51bGwgPyAnaG9zdCcgOiBwYXJlbnRUTm9kZS5pbmRleDtcbiAgY29uc3QgcGFyZW50Uk5vZGUgPVxuICAgICAgcGFyZW50VE5vZGUgPT09IG51bGwgPyBsVmlld1tIT1NUXSA6IHVud3JhcFJOb2RlKGxWaWV3W3BhcmVudEluZGV4IGFzIG51bWJlcl0pO1xuICBsZXQgck5vZGUgPSB1bndyYXBSTm9kZShsVmlld1tpbmRleF0pO1xuICBpZiAodE5vZGUudHlwZSAmIFROb2RlVHlwZS5BbnlDb250YWluZXIpIHtcbiAgICAvLyBGb3IgPG5nLWNvbnRhaW5lcj4gbm9kZXMsIGluc3RlYWQgb2Ygc2VyaWFsaXppbmcgYSByZWZlcmVuY2VcbiAgICAvLyB0byB0aGUgYW5jaG9yIGNvbW1lbnQgbm9kZSwgc2VyaWFsaXplIGEgbG9jYXRpb24gb2YgdGhlIGZpcnN0XG4gICAgLy8gRE9NIGVsZW1lbnQuIFBhaXJlZCB3aXRoIHRoZSBjb250YWluZXIgc2l6ZSAoc2VyaWFsaXplZCBhcyBhIHBhcnRcbiAgICAvLyBvZiBgbmdoLmNvbnRhaW5lcnNgKSwgaXQgc2hvdWxkIGdpdmUgZW5vdWdoIGluZm9ybWF0aW9uIGZvciBydW50aW1lXG4gICAgLy8gdG8gaHlkcmF0ZSBub2RlcyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgICAvL1xuICAgIC8vIE5vdGU6IGZvciBFbGVtZW50Q29udGFpbmVycyAoaS5lLiBgPG5nLWNvbnRhaW5lcj5gIGVsZW1lbnRzKSwgd2UgdXNlXG4gICAgLy8gYSBmaXJzdCBjaGlsZCBmcm9tIHRoZSB0Tm9kZSBkYXRhIHN0cnVjdHVyZXMsIHNpbmNlIHdlIHdhbnQgdG8gY29sbGVjdFxuICAgIC8vIGFkZCByb290IG5vZGVzIHN0YXJ0aW5nIGZyb20gdGhlIGZpcnN0IGNoaWxkIG5vZGUgaW4gYSBjb250YWluZXIuXG4gICAgY29uc3QgY2hpbGRUTm9kZSA9IHROb2RlLnR5cGUgJiBUTm9kZVR5cGUuRWxlbWVudENvbnRhaW5lciA/IHROb2RlLmNoaWxkIDogdE5vZGU7XG4gICAgY29uc3QgZmlyc3RSTm9kZSA9IGZpcnN0Uk5vZGVJbkVsZW1lbnRDb250YWluZXIodFZpZXcsIGxWaWV3LCBjaGlsZFROb2RlISk7XG4gICAgLy8gSWYgY29udGFpbmVyIGlzIG5vdCBlbXB0eSwgdXNlIGEgcmVmZXJlbmNlIHRvIHRoZSBmaXJzdCBlbGVtZW50LFxuICAgIC8vIG90aGVyd2lzZSwgck5vZGUgd291bGQgcG9pbnQgdG8gYW4gYW5jaG9yIGNvbW1lbnQgbm9kZS5cbiAgICBpZiAoZmlyc3RSTm9kZSkge1xuICAgICAgck5vZGUgPSBmaXJzdFJOb2RlO1xuICAgIH1cbiAgfVxuICBkZWJ1Z2dlcjtcbiAgY29uc3QgcGF0aDogc3RyaW5nW10gPSBuYXZpZ2F0ZUJldHdlZW4ocGFyZW50Uk5vZGUgYXMgTm9kZSwgck5vZGUgYXMgTm9kZSkubWFwKG9wID0+IHtcbiAgICBzd2l0Y2ggKG9wKSB7XG4gICAgICBjYXNlIE5vZGVOYXZpZ2F0aW9uU3RlcC5GaXJzdENoaWxkOlxuICAgICAgICByZXR1cm4gJ2ZpcnN0Q2hpbGQnO1xuICAgICAgY2FzZSBOb2RlTmF2aWdhdGlvblN0ZXAuTmV4dFNpYmxpbmc6XG4gICAgICAgIHJldHVybiAnbmV4dFNpYmxpbmcnO1xuICAgIH1cbiAgfSk7XG4gIGlmIChwYXJlbnRJbmRleCA9PT0gJ2hvc3QnKSB7XG4gICAgLy8gVE9ETzogYWRkIHN1cHBvcnQgZm9yIGBob3N0YCB0byB0aGUgYGxvY2F0ZU5leHRSTm9kZWAgZm4uXG4gICAgcGF0aC51bnNoaWZ0KHBhcmVudEluZGV4KTtcbiAgfSBlbHNlIHtcbiAgICBwYXRoLnVuc2hpZnQoJycgKyAocGFyZW50SW5kZXggLSBIRUFERVJfT0ZGU0VUKSk7XG4gIH1cbiAgcmV0dXJuIHBhdGguam9pbignLicpO1xufVxuXG5sZXQgc3NySWQ6IG51bWJlciA9IDA7XG5jb25zdCBzc3JJZE1hcCA9IG5ldyBNYXA8VFZpZXcsIHN0cmluZz4oKTtcblxuZnVuY3Rpb24gZ2V0VFZpZXdTc3JJZCh0VmlldzogVFZpZXcpOiBzdHJpbmcge1xuICBpZiAoIXNzcklkTWFwLmhhcyh0VmlldykpIHtcbiAgICBzc3JJZE1hcC5zZXQodFZpZXcsIGB0JHtzc3JJZCsrfWApO1xuICB9XG4gIHJldHVybiBzc3JJZE1hcC5nZXQodFZpZXcpITtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplTENvbnRhaW5lcihsQ29udGFpbmVyOiBMQ29udGFpbmVyLCBob3N0Tm9kZTogRWxlbWVudCwgYW5jaG9yOiBudW1iZXIpOiBDb250YWluZXIge1xuICBjb25zdCBjb250YWluZXI6IENvbnRhaW5lciA9IHtcbiAgICB2aWV3czogW10sXG4gIH07XG5cbiAgZm9yIChsZXQgaSA9IENPTlRBSU5FUl9IRUFERVJfT0ZGU0VUOyBpIDwgbENvbnRhaW5lci5sZW5ndGg7IGkrKykge1xuICAgIGxldCBjaGlsZExWaWV3ID0gbENvbnRhaW5lcltpXSBhcyBMVmlldztcblxuICAgIC8vIEdldCBMVmlldyBmb3IgdW5kZXJseWluZyBjb21wb25lbnQuXG4gICAgaWYgKGlzUm9vdFZpZXcoY2hpbGRMVmlldykpIHtcbiAgICAgIGNoaWxkTFZpZXcgPSBjaGlsZExWaWV3W0hFQURFUl9PRkZTRVRdO1xuICAgIH1cbiAgICBjb25zdCBjaGlsZFRWaWV3ID0gY2hpbGRMVmlld1tUVklFV107XG5cbiAgICBsZXQgdGVtcGxhdGU7XG4gICAgaWYgKGNoaWxkVFZpZXcudHlwZSA9PT0gVFZpZXdUeXBlLkNvbXBvbmVudCkge1xuICAgICAgY29uc3QgY3R4ID0gY2hpbGRMVmlld1tDT05URVhUXTtcbiAgICAgIC8vIFRPRE86IHRoaXMgaXMgYSBoYWNrICh3ZSBjYXB0dXJlIGEgY29tcG9uZW50IGhvc3QgZWxlbWVudCBuYW1lKSxcbiAgICAgIC8vIHdlIG5lZWQgYSBtb3JlIHN0YWJsZSBzb2x1dGlvbiBoZXJlLCBmb3IgZXguIGEgd2F5IHRvIGdlbmVyYXRlXG4gICAgICAvLyBhIGNvbXBvbmVudCBpZC5cbiAgICAgIHRlbXBsYXRlID0gKGN0eCEuY29uc3RydWN0b3IgYXMgYW55KVsnybVjbXAnXS5zZWxlY3RvcnNbMF1bMF07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRlbXBsYXRlID0gZ2V0VFZpZXdTc3JJZChjaGlsZFRWaWV3KTtcbiAgICB9XG5cbiAgICBjb25zdCByb290Tm9kZXM6IGFueVtdID0gW107XG4gICAgY29sbGVjdE5hdGl2ZU5vZGVzKGNoaWxkVFZpZXcsIGNoaWxkTFZpZXcsIGNoaWxkVFZpZXcuZmlyc3RDaGlsZCwgcm9vdE5vZGVzKTtcblxuICAgIGNvbnRhaW5lci52aWV3cy5wdXNoKHtcbiAgICAgIHRlbXBsYXRlLCAgLy8gZnJvbSB3aGljaCB0ZW1wbGF0ZSBkaWQgdGhpcyBsVmlldyBvcmlnaW5hdGU/XG4gICAgICBudW1Sb290Tm9kZXM6IHJvb3ROb2Rlcy5sZW5ndGgsXG4gICAgICAuLi5zZXJpYWxpemVMVmlldyhsQ29udGFpbmVyW2ldIGFzIExWaWV3LCBob3N0Tm9kZSksXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gY29udGFpbmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TFZpZXdGcm9tUm9vdEVsZW1lbnQoZWxlbWVudDogRWxlbWVudCk6IExWaWV3IHtcbiAgY29uc3QgTU9OS0VZX1BBVENIX0tFWV9OQU1FID0gJ19fbmdDb250ZXh0X18nO1xuICBjb25zdCBkYXRhID0gKGVsZW1lbnQgYXMgYW55KVtNT05LRVlfUEFUQ0hfS0VZX05BTUVdO1xuICBsZXQgbFZpZXcgPSB0eXBlb2YgZGF0YSA9PT0gJ251bWJlcicgPyBnZXRMVmlld0J5SWQoZGF0YSkgOiBkYXRhIHx8IG51bGw7XG4gIGlmICghbFZpZXcpIHRocm93IG5ldyBFcnJvcignbm90IGZvdW5kJyk7ICAvLyBUT0RPOiBpcyBpdCBwb3NzaWJsZT9cblxuICBpZiAoaXNSb290VmlldyhsVmlldykpIHtcbiAgICBsVmlldyA9IGxWaWV3W0hFQURFUl9PRkZTRVRdO1xuICB9XG4gIHJldHVybiBsVmlldztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFubm90YXRlRm9ySHlkcmF0aW9uKGVsZW1lbnQ6IEVsZW1lbnQsIGxWaWV3OiBMVmlldyk6IHZvaWQge1xuICBjb25zdCByYXdOZ2ggPSBzZXJpYWxpemVMVmlldyhsVmlldywgZWxlbWVudCk7XG4gIGNvbnN0IHNlcmlhbGl6ZWROZ2ggPSBKU09OLnN0cmluZ2lmeShyYXdOZ2gpO1xuICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnbmdoJywgc2VyaWFsaXplZE5naCk7XG4gIGNvbnNvbGUubG9nKCdFbGVtZW50IEFubm90YXRpb24gYWRkZWQnLCBlbGVtZW50LCBzZXJpYWxpemVkTmdoKTtcbiAgZGVidWdnZXI7XG59XG5cbmZ1bmN0aW9uIF9yZW5kZXI8VD4oXG4gICAgcGxhdGZvcm06IFBsYXRmb3JtUmVmLFxuICAgIGJvb3RzdHJhcFByb21pc2U6IFByb21pc2U8TmdNb2R1bGVSZWY8VD58QXBwbGljYXRpb25SZWY+KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgcmV0dXJuIGJvb3RzdHJhcFByb21pc2UudGhlbigobW9kdWxlT3JBcHBsaWNhdGlvblJlZikgPT4ge1xuICAgIGNvbnN0IGVudmlyb25tZW50SW5qZWN0b3IgPSBtb2R1bGVPckFwcGxpY2F0aW9uUmVmLmluamVjdG9yO1xuICAgIGNvbnN0IHRyYW5zaXRpb25JZCA9IGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KMm1VFJBTlNJVElPTl9JRCwgbnVsbCk7XG4gICAgaWYgKCF0cmFuc2l0aW9uSWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgcmVuZGVyTW9kdWxlW0ZhY3RvcnldKCkgcmVxdWlyZXMgdGhlIHVzZSBvZiBCcm93c2VyTW9kdWxlLndpdGhTZXJ2ZXJUcmFuc2l0aW9uKCkgdG8gZW5zdXJlXG50aGUgc2VydmVyLXJlbmRlcmVkIGFwcCBjYW4gYmUgcHJvcGVybHkgYm9vdHN0cmFwcGVkIGludG8gYSBjbGllbnQgYXBwLmApO1xuICAgIH1cbiAgICBjb25zdCBhcHBsaWNhdGlvblJlZjogQXBwbGljYXRpb25SZWYgPSBtb2R1bGVPckFwcGxpY2F0aW9uUmVmIGluc3RhbmNlb2YgQXBwbGljYXRpb25SZWYgP1xuICAgICAgICBtb2R1bGVPckFwcGxpY2F0aW9uUmVmIDpcbiAgICAgICAgZW52aXJvbm1lbnRJbmplY3Rvci5nZXQoQXBwbGljYXRpb25SZWYpO1xuICAgIGNvbnN0IHNlcnZlckNvbnRleHQgPVxuICAgICAgICBzYW5pdGl6ZVNlcnZlckNvbnRleHQoZW52aXJvbm1lbnRJbmplY3Rvci5nZXQoU0VSVkVSX0NPTlRFWFQsIERFRkFVTFRfU0VSVkVSX0NPTlRFWFQpKTtcbiAgICByZXR1cm4gYXBwbGljYXRpb25SZWYuaXNTdGFibGUucGlwZShmaXJzdCgoaXNTdGFibGU6IGJvb2xlYW4pID0+IGlzU3RhYmxlKSlcbiAgICAgICAgLnRvUHJvbWlzZSgpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBhcHBlbmRTZXJ2ZXJDb250ZXh0SW5mbyhzZXJ2ZXJDb250ZXh0LCBhcHBsaWNhdGlvblJlZik7XG5cbiAgICAgICAgICBjb25zdCBwbGF0Zm9ybVN0YXRlID0gcGxhdGZvcm0uaW5qZWN0b3IuZ2V0KFBsYXRmb3JtU3RhdGUpO1xuXG4gICAgICAgICAgY29uc3QgYXN5bmNQcm9taXNlczogUHJvbWlzZTxhbnk+W10gPSBbXTtcblxuICAgICAgICAgIC8vIFJ1biBhbnkgQkVGT1JFX0FQUF9TRVJJQUxJWkVEIGNhbGxiYWNrcyBqdXN0IGJlZm9yZSByZW5kZXJpbmcgdG8gc3RyaW5nLlxuICAgICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9IGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KEJFRk9SRV9BUFBfU0VSSUFMSVpFRCwgbnVsbCk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNhbGxiYWNrIG9mIGNhbGxiYWNrcykge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrUmVzdWx0ID0gY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAoybVpc1Byb21pc2UoY2FsbGJhY2tSZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAvLyBUT0RPOiBpbiBUUzMuNywgY2FsbGJhY2tSZXN1bHQgaXMgdm9pZC5cbiAgICAgICAgICAgICAgICAgIGFzeW5jUHJvbWlzZXMucHVzaChjYWxsYmFja1Jlc3VsdCBhcyBhbnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBleGNlcHRpb25zLlxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignSWdub3JpbmcgQkVGT1JFX0FQUF9TRVJJQUxJWkVEIEV4Y2VwdGlvbjogJywgZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBjb21wbGV0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb21wbGV0ZSBmaXJlZCBhbmQgbGVuZ3RoIGlzICcsIGFwcGxpY2F0aW9uUmVmLmNvbXBvbmVudHMubGVuZ3RoID4gMClcbiAgICAgICAgICAgIGFwcGxpY2F0aW9uUmVmLmNvbXBvbmVudHMuZm9yRWFjaCgoY29tcG9uZW50UmVmKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBjb21wb25lbnRSZWYubG9jYXRpb24ubmF0aXZlRWxlbWVudDtcbiAgICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRWxlbWVudCBleGlzdHMgYW5kIGlzIGFib3V0IHRvIGdldCBhbm5vdGF0ZWQnKVxuICAgICAgICAgICAgICAgIGFubm90YXRlRm9ySHlkcmF0aW9uKGVsZW1lbnQsIGdldExWaWV3RnJvbVJvb3RFbGVtZW50KGVsZW1lbnQpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IHBsYXRmb3JtU3RhdGUucmVuZGVyVG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHBsYXRmb3JtLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmIChhc3luY1Byb21pc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBsZXRlKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIFByb21pc2VcbiAgICAgICAgICAgICAgLmFsbChhc3luY1Byb21pc2VzLm1hcCgoYXN5bmNQcm9taXNlKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFzeW5jUHJvbWlzZS5jYXRjaCgoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdJZ25vcmluZyBCRUZPUkVfQVBQX1NFUklBTElaRUQgRXhjZXB0aW9uOiAnLCBlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgIC50aGVuKGNvbXBsZXRlKTtcbiAgICAgICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFNwZWNpZmllcyB0aGUgdmFsdWUgdGhhdCBzaG91bGQgYmUgdXNlZCBpZiBubyBzZXJ2ZXIgY29udGV4dCB2YWx1ZSBoYXMgYmVlbiBwcm92aWRlZC5cbiAqL1xuY29uc3QgREVGQVVMVF9TRVJWRVJfQ09OVEVYVCA9ICdvdGhlcic7XG5cbi8qKlxuICogQW4gaW50ZXJuYWwgdG9rZW4gdGhhdCBhbGxvd3MgcHJvdmlkaW5nIGV4dHJhIGluZm9ybWF0aW9uIGFib3V0IHRoZSBzZXJ2ZXIgY29udGV4dFxuICogKGUuZy4gd2hldGhlciBTU1Igb3IgU1NHIHdhcyB1c2VkKS4gVGhlIHZhbHVlIGlzIGEgc3RyaW5nIGFuZCBjaGFyYWN0ZXJzIG90aGVyXG4gKiB0aGFuIFthLXpBLVowLTlcXC1dIGFyZSByZW1vdmVkLiBTZWUgdGhlIGRlZmF1bHQgdmFsdWUgaW4gYERFRkFVTFRfU0VSVkVSX0NPTlRFWFRgIGNvbnN0LlxuICovXG5leHBvcnQgY29uc3QgU0VSVkVSX0NPTlRFWFQgPSBuZXcgSW5qZWN0aW9uVG9rZW48c3RyaW5nPignU0VSVkVSX0NPTlRFWFQnKTtcblxuLyoqXG4gKiBTYW5pdGl6ZXMgcHJvdmlkZWQgc2VydmVyIGNvbnRleHQ6XG4gKiAtIHJlbW92ZXMgYWxsIGNoYXJhY3RlcnMgb3RoZXIgdGhhbiBhLXosIEEtWiwgMC05IGFuZCBgLWBcbiAqIC0gcmV0dXJucyBgb3RoZXJgIGlmIG5vdGhpbmcgaXMgcHJvdmlkZWQgb3IgdGhlIHN0cmluZyBpcyBlbXB0eSBhZnRlciBzYW5pdGl6YXRpb25cbiAqL1xuZnVuY3Rpb24gc2FuaXRpemVTZXJ2ZXJDb250ZXh0KHNlcnZlckNvbnRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNvbnRleHQgPSBzZXJ2ZXJDb250ZXh0LnJlcGxhY2UoL1teYS16QS1aMC05XFwtXS9nLCAnJyk7XG4gIHJldHVybiBjb250ZXh0Lmxlbmd0aCA+IDAgPyBjb250ZXh0IDogREVGQVVMVF9TRVJWRVJfQ09OVEVYVDtcbn1cblxuLyoqXG4gKiBCb290c3RyYXBzIGFuIGFwcGxpY2F0aW9uIHVzaW5nIHByb3ZpZGVkIE5nTW9kdWxlIGFuZCBzZXJpYWxpemVzIHRoZSBwYWdlIGNvbnRlbnQgdG8gc3RyaW5nLlxuICpcbiAqIEBwYXJhbSBtb2R1bGVUeXBlIEEgcmVmZXJlbmNlIHRvIGFuIE5nTW9kdWxlIHRoYXQgc2hvdWxkIGJlIHVzZWQgZm9yIGJvb3RzdHJhcC5cbiAqIEBwYXJhbSBvcHRpb25zIEFkZGl0aW9uYWwgY29uZmlndXJhdGlvbiBmb3IgdGhlIHJlbmRlciBvcGVyYXRpb246XG4gKiAgLSBgZG9jdW1lbnRgIC0gdGhlIGRvY3VtZW50IG9mIHRoZSBwYWdlIHRvIHJlbmRlciwgZWl0aGVyIGFzIGFuIEhUTUwgc3RyaW5nIG9yXG4gKiAgICAgICAgICAgICAgICAgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGBkb2N1bWVudGAgaW5zdGFuY2UuXG4gKiAgLSBgdXJsYCAtIHRoZSBVUkwgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYGV4dHJhUHJvdmlkZXJzYCAtIHNldCBvZiBwbGF0Zm9ybSBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlck1vZHVsZTxUPihcbiAgICBtb2R1bGVUeXBlOiBUeXBlPFQ+LFxuICAgIG9wdGlvbnM6IHtkb2N1bWVudD86IHN0cmluZ3xEb2N1bWVudDsgdXJsPzogc3RyaW5nOyBleHRyYVByb3ZpZGVycz86IFN0YXRpY1Byb3ZpZGVyW119KTpcbiAgICBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7ZG9jdW1lbnQsIHVybCwgZXh0cmFQcm92aWRlcnM6IHBsYXRmb3JtUHJvdmlkZXJzfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtRHluYW1pY1NlcnZlciwge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzfSk7XG4gIHJldHVybiBfcmVuZGVyKHBsYXRmb3JtLCBwbGF0Zm9ybS5ib290c3RyYXBNb2R1bGUobW9kdWxlVHlwZSkpO1xufVxuXG4vKipcbiAqIEJvb3RzdHJhcHMgYW4gaW5zdGFuY2Ugb2YgYW4gQW5ndWxhciBhcHBsaWNhdGlvbiBhbmQgcmVuZGVycyBpdCB0byBhIHN0cmluZy5cbiAqXG4gKiBOb3RlOiB0aGUgcm9vdCBjb21wb25lbnQgcGFzc2VkIGludG8gdGhpcyBmdW5jdGlvbiAqbXVzdCogYmUgYSBzdGFuZGFsb25lIG9uZSAoc2hvdWxkIGhhdmUgdGhlXG4gKiBgc3RhbmRhbG9uZTogdHJ1ZWAgZmxhZyBpbiB0aGUgYEBDb21wb25lbnRgIGRlY29yYXRvciBjb25maWcpLlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIEBDb21wb25lbnQoe1xuICogICBzdGFuZGFsb25lOiB0cnVlLFxuICogICB0ZW1wbGF0ZTogJ0hlbGxvIHdvcmxkISdcbiAqIH0pXG4gKiBjbGFzcyBSb290Q29tcG9uZW50IHt9XG4gKlxuICogY29uc3Qgb3V0cHV0OiBzdHJpbmcgPSBhd2FpdCByZW5kZXJBcHBsaWNhdGlvbihSb290Q29tcG9uZW50LCB7YXBwSWQ6ICdzZXJ2ZXItYXBwJ30pO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHJvb3RDb21wb25lbnQgQSByZWZlcmVuY2UgdG8gYSBTdGFuZGFsb25lIENvbXBvbmVudCB0aGF0IHNob3VsZCBiZSByZW5kZXJlZC5cbiAqIEBwYXJhbSBvcHRpb25zIEFkZGl0aW9uYWwgY29uZmlndXJhdGlvbiBmb3IgdGhlIHJlbmRlciBvcGVyYXRpb246XG4gKiAgLSBgYXBwSWRgIC0gYSBzdHJpbmcgaWRlbnRpZmllciBvZiB0aGlzIGFwcGxpY2F0aW9uLiBUaGUgYXBwSWQgaXMgdXNlZCB0byBwcmVmaXggYWxsXG4gKiAgICAgICAgICAgICAgc2VydmVyLWdlbmVyYXRlZCBzdHlsaW5ncyBhbmQgc3RhdGUga2V5cyBvZiB0aGUgYXBwbGljYXRpb24gaW4gVHJhbnNmZXJTdGF0ZVxuICogICAgICAgICAgICAgIHVzZS1jYXNlcy5cbiAqICAtIGBkb2N1bWVudGAgLSB0aGUgZG9jdW1lbnQgb2YgdGhlIHBhZ2UgdG8gcmVuZGVyLCBlaXRoZXIgYXMgYW4gSFRNTCBzdHJpbmcgb3JcbiAqICAgICAgICAgICAgICAgICBhcyBhIHJlZmVyZW5jZSB0byB0aGUgYGRvY3VtZW50YCBpbnN0YW5jZS5cbiAqICAtIGB1cmxgIC0gdGhlIFVSTCBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKiAgLSBgcHJvdmlkZXJzYCAtIHNldCBvZiBhcHBsaWNhdGlvbiBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYHBsYXRmb3JtUHJvdmlkZXJzYCAtIHRoZSBwbGF0Zm9ybSBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICpcbiAqIEByZXR1cm5zIEEgUHJvbWlzZSwgdGhhdCByZXR1cm5zIHNlcmlhbGl6ZWQgKHRvIGEgc3RyaW5nKSByZW5kZXJlZCBwYWdlLCBvbmNlIHJlc29sdmVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXZlbG9wZXJQcmV2aWV3XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJBcHBsaWNhdGlvbjxUPihyb290Q29tcG9uZW50OiBUeXBlPFQ+LCBvcHRpb25zOiB7XG4gIGFwcElkOiBzdHJpbmc7XG4gIGRvY3VtZW50Pzogc3RyaW5nIHwgRG9jdW1lbnQ7XG4gIHVybD86IHN0cmluZztcbiAgcHJvdmlkZXJzPzogQXJyYXk8UHJvdmlkZXJ8RW52aXJvbm1lbnRQcm92aWRlcnM+O1xuICBwbGF0Zm9ybVByb3ZpZGVycz86IFByb3ZpZGVyW107XG59KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3Qge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzLCBhcHBJZH0gPSBvcHRpb25zO1xuICBjb25zdCBwbGF0Zm9ybSA9IF9nZXRQbGF0Zm9ybShwbGF0Zm9ybUR5bmFtaWNTZXJ2ZXIsIHtkb2N1bWVudCwgdXJsLCBwbGF0Zm9ybVByb3ZpZGVyc30pO1xuICBjb25zdCBhcHBQcm92aWRlcnMgPSBbXG4gICAgaW1wb3J0UHJvdmlkZXJzRnJvbShCcm93c2VyTW9kdWxlLndpdGhTZXJ2ZXJUcmFuc2l0aW9uKHthcHBJZH0pKSxcbiAgICBpbXBvcnRQcm92aWRlcnNGcm9tKFNlcnZlck1vZHVsZSksXG4gICAgLi4uVFJBTlNGRVJfU1RBVEVfU0VSSUFMSVpBVElPTl9QUk9WSURFUlMsXG4gICAgLi4uKG9wdGlvbnMucHJvdmlkZXJzID8/IFtdKSxcbiAgXTtcbiAgcmV0dXJuIF9yZW5kZXIocGxhdGZvcm0sIGludGVybmFsQ3JlYXRlQXBwbGljYXRpb24oe3Jvb3RDb21wb25lbnQsIGFwcFByb3ZpZGVyc30pKTtcbn1cblxuLyoqXG4gKiBCb290c3RyYXBzIGFuIGFwcGxpY2F0aW9uIHVzaW5nIHByb3ZpZGVkIHtAbGluayBOZ01vZHVsZUZhY3Rvcnl9IGFuZCBzZXJpYWxpemVzIHRoZSBwYWdlIGNvbnRlbnRcbiAqIHRvIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0gbW9kdWxlRmFjdG9yeSBBbiBpbnN0YW5jZSBvZiB0aGUge0BsaW5rIE5nTW9kdWxlRmFjdG9yeX0gdGhhdCBzaG91bGQgYmUgdXNlZCBmb3JcbiAqICAgICBib290c3RyYXAuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSByZW5kZXIgb3BlcmF0aW9uOlxuICogIC0gYGRvY3VtZW50YCAtIHRoZSBkb2N1bWVudCBvZiB0aGUgcGFnZSB0byByZW5kZXIsIGVpdGhlciBhcyBhbiBIVE1MIHN0cmluZyBvclxuICogICAgICAgICAgICAgICAgIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBgZG9jdW1lbnRgIGluc3RhbmNlLlxuICogIC0gYHVybGAgLSB0aGUgVVJMIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqICAtIGBleHRyYVByb3ZpZGVyc2AgLSBzZXQgb2YgcGxhdGZvcm0gbGV2ZWwgcHJvdmlkZXJzIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKlxuICogQGRlcHJlY2F0ZWRcbiAqIFRoaXMgc3ltYm9sIGlzIG5vIGxvbmdlciBuZWNlc3NhcnkgYXMgb2YgQW5ndWxhciB2MTMuXG4gKiBVc2Uge0BsaW5rIHJlbmRlck1vZHVsZX0gQVBJIGluc3RlYWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJNb2R1bGVGYWN0b3J5PFQ+KFxuICAgIG1vZHVsZUZhY3Rvcnk6IE5nTW9kdWxlRmFjdG9yeTxUPixcbiAgICBvcHRpb25zOiB7ZG9jdW1lbnQ/OiBzdHJpbmc7IHVybD86IHN0cmluZzsgZXh0cmFQcm92aWRlcnM/OiBTdGF0aWNQcm92aWRlcltdfSk6XG4gICAgUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3Qge2RvY3VtZW50LCB1cmwsIGV4dHJhUHJvdmlkZXJzOiBwbGF0Zm9ybVByb3ZpZGVyc30gPSBvcHRpb25zO1xuICBjb25zdCBwbGF0Zm9ybSA9IF9nZXRQbGF0Zm9ybShwbGF0Zm9ybVNlcnZlciwge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzfSk7XG4gIHJldHVybiBfcmVuZGVyKHBsYXRmb3JtLCBwbGF0Zm9ybS5ib290c3RyYXBNb2R1bGVGYWN0b3J5KG1vZHVsZUZhY3RvcnkpKTtcbn1cbiJdfQ==