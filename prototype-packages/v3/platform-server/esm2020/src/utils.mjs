/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ApplicationRef, importProvidersFrom, InjectionToken, Renderer2, ɵcollectNativeNodes as collectNativeNodes, ɵCONTAINER_HEADER_OFFSET as CONTAINER_HEADER_OFFSET, ɵCONTEXT as CONTEXT, ɵgetLViewById as getLViewById, ɵHEADER_OFFSET as HEADER_OFFSET, ɵHOST as HOST, ɵinternalCreateApplication as internalCreateApplication, ɵisPromise, ɵisRootView as isRootView, ɵTVIEW as TVIEW, ɵTYPE as TYPE, ɵunwrapRNode as unwrapRNode, } from '@angular/core';
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
            const hostNode = lView[i][HOST];
            // LView[i][HOST] can be 2 different types: Either a DOM Node
            //  or an LView Array that represents a component
            // We only handle the DOM Node case here
            if (Array.isArray(hostNode)) {
                // this is a component
                targetNode = unwrapRNode(hostNode);
                annotateForHydration(targetNode, hostNode);
            }
            else {
                // this is a regular node
                targetNode = unwrapRNode(hostNode);
            }
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
                if (!isConnected(targetNode)) {
                    debugger;
                    console.log('INDEX: ', i - HEADER_OFFSET);
                    console.log('TAGNAME: ', targetNode.tagName);
                    ngh.nodes[i - HEADER_OFFSET] = "-";
                    continue;
                }
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
function isConnected(originalNode) {
    let node = originalNode;
    while (node != null) {
        if (node.nodeType === Node.DOCUMENT_NODE) {
            return true;
        }
        node = node.parentNode;
        if (node != null && node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            node = node.host;
        }
    }
    return false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1zZXJ2ZXIvc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxjQUFjLEVBQXdCLG1CQUFtQixFQUFFLGNBQWMsRUFBdUQsU0FBUyxFQUF3QixtQkFBbUIsSUFBSSxrQkFBa0IsRUFBRSx3QkFBd0IsSUFBSSx1QkFBdUIsRUFBRSxRQUFRLElBQUksT0FBTyxFQUFFLGFBQWEsSUFBSSxZQUFZLEVBQUUsY0FBYyxJQUFJLGFBQWEsRUFBRSxLQUFLLElBQUksSUFBSSxFQUFFLDBCQUEwQixJQUFJLHlCQUF5QixFQUFFLFVBQVUsRUFBRSxXQUFXLElBQUksVUFBVSxFQUE0SSxNQUFNLElBQUksS0FBSyxFQUE0QyxLQUFLLElBQUksSUFBSSxFQUFFLFlBQVksSUFBSSxXQUFXLEdBQUUsTUFBTSxlQUFlLENBQUM7QUFDcHRCLE9BQU8sRUFBQyxhQUFhLEVBQUUsY0FBYyxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDeEUsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXJDLE9BQU8sRUFBQyxlQUFlLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDL0QsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxxQkFBcUIsRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdFLE9BQU8sRUFBQyxxQkFBcUIsRUFBRSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDL0QsT0FBTyxFQUFDLHNDQUFzQyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFReEUsU0FBUyxZQUFZLENBQ2pCLGVBQWtFLEVBQ2xFLE9BQXdCO0lBQzFCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxp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TUFBTSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFDLEdBQUcsT0FBTyxDQUFDO0lBQ25FLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxjQUFjLEVBQUUsRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFDLENBQUMsQ0FBQztJQUNsRixPQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FwcGxpY2F0aW9uUmVmLCBFbnZpcm9ubWVudFByb3ZpZGVycywgaW1wb3J0UHJvdmlkZXJzRnJvbSwgSW5qZWN0aW9uVG9rZW4sIE5nTW9kdWxlRmFjdG9yeSwgTmdNb2R1bGVSZWYsIFBsYXRmb3JtUmVmLCBQcm92aWRlciwgUmVuZGVyZXIyLCBTdGF0aWNQcm92aWRlciwgVHlwZSwgybVjb2xsZWN0TmF0aXZlTm9kZXMgYXMgY29sbGVjdE5hdGl2ZU5vZGVzLCDJtUNPTlRBSU5FUl9IRUFERVJfT0ZGU0VUIGFzIENPTlRBSU5FUl9IRUFERVJfT0ZGU0VULCDJtUNPTlRFWFQgYXMgQ09OVEVYVCwgybVnZXRMVmlld0J5SWQgYXMgZ2V0TFZpZXdCeUlkLCDJtUhFQURFUl9PRkZTRVQgYXMgSEVBREVSX09GRlNFVCwgybVIT1NUIGFzIEhPU1QsIMm1aW50ZXJuYWxDcmVhdGVBcHBsaWNhdGlvbiBhcyBpbnRlcm5hbENyZWF0ZUFwcGxpY2F0aW9uLCDJtWlzUHJvbWlzZSwgybVpc1Jvb3RWaWV3IGFzIGlzUm9vdFZpZXcsIMm1TENvbnRhaW5lciBhcyBMQ29udGFpbmVyLCDJtUxWaWV3IGFzIExWaWV3LCDJtVJOb2RlIGFzIFJOb2RlLCDJtVRDb250YWluZXJOb2RlIGFzIFRDb250YWluZXJOb2RlLCDJtVROb2RlIGFzIFROb2RlLCDJtVROb2RlVHlwZSBhcyBUTm9kZVR5cGUsIMm1VFZJRVcgYXMgVFZJRVcsIMm1VFZpZXcgYXMgVFZpZXcsIMm1VFZpZXdUeXBlIGFzIFRWaWV3VHlwZSwgybVUWVBFIGFzIFRZUEUsIMm1dW53cmFwUk5vZGUgYXMgdW53cmFwUk5vZGUsfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QnJvd3Nlck1vZHVsZSwgybVUUkFOU0lUSU9OX0lEfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyJztcbmltcG9ydCB7Zmlyc3R9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtuYXZpZ2F0ZUJldHdlZW4sIE5vZGVOYXZpZ2F0aW9uU3RlcH0gZnJvbSAnLi9ub2RlX25hdic7XG5pbXBvcnQge1BsYXRmb3JtU3RhdGV9IGZyb20gJy4vcGxhdGZvcm1fc3RhdGUnO1xuaW1wb3J0IHtwbGF0Zm9ybUR5bmFtaWNTZXJ2ZXIsIHBsYXRmb3JtU2VydmVyLCBTZXJ2ZXJNb2R1bGV9IGZyb20gJy4vc2VydmVyJztcbmltcG9ydCB7QkVGT1JFX0FQUF9TRVJJQUxJWkVELCBJTklUSUFMX0NPTkZJR30gZnJvbSAnLi90b2tlbnMnO1xuaW1wb3J0IHtUUkFOU0ZFUl9TVEFURV9TRVJJQUxJWkFUSU9OX1BST1ZJREVSU30gZnJvbSAnLi90cmFuc2Zlcl9zdGF0ZSc7XG5cbmludGVyZmFjZSBQbGF0Zm9ybU9wdGlvbnMge1xuICBkb2N1bWVudD86IHN0cmluZ3xEb2N1bWVudDtcbiAgdXJsPzogc3RyaW5nO1xuICBwbGF0Zm9ybVByb3ZpZGVycz86IFByb3ZpZGVyW107XG59XG5cbmZ1bmN0aW9uIF9nZXRQbGF0Zm9ybShcbiAgICBwbGF0Zm9ybUZhY3Rvcnk6IChleHRyYVByb3ZpZGVyczogU3RhdGljUHJvdmlkZXJbXSkgPT4gUGxhdGZvcm1SZWYsXG4gICAgb3B0aW9uczogUGxhdGZvcm1PcHRpb25zKTogUGxhdGZvcm1SZWYge1xuICBjb25zdCBleHRyYVByb3ZpZGVycyA9IG9wdGlvbnMucGxhdGZvcm1Qcm92aWRlcnMgPz8gW107XG4gIHJldHVybiBwbGF0Zm9ybUZhY3RvcnkoW1xuICAgIHtwcm92aWRlOiBJTklUSUFMX0NPTkZJRywgdXNlVmFsdWU6IHtkb2N1bWVudDogb3B0aW9ucy5kb2N1bWVudCwgdXJsOiBvcHRpb25zLnVybH19LFxuICAgIGV4dHJhUHJvdmlkZXJzLFxuICBdKTtcbn1cblxuLyoqXG4gKiBBZGRzIHRoZSBgbmctc2VydmVyLWNvbnRleHRgIGF0dHJpYnV0ZSB0byBob3N0IGVsZW1lbnRzIG9mIGFsbCBib290c3RyYXBwZWQgY29tcG9uZW50c1xuICogd2l0aGluIGEgZ2l2ZW4gYXBwbGljYXRpb24uXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZFNlcnZlckNvbnRleHRJbmZvKHNlcnZlckNvbnRleHQ6IHN0cmluZywgYXBwbGljYXRpb25SZWY6IEFwcGxpY2F0aW9uUmVmKSB7XG4gIGFwcGxpY2F0aW9uUmVmLmNvbXBvbmVudHMuZm9yRWFjaCgoY29tcG9uZW50UmVmKSA9PiB7XG4gICAgY29uc3QgcmVuZGVyZXIgPSBjb21wb25lbnRSZWYuaW5qZWN0b3IuZ2V0KFJlbmRlcmVyMik7XG4gICAgY29uc3QgZWxlbWVudCA9IGNvbXBvbmVudFJlZi5sb2NhdGlvbi5uYXRpdmVFbGVtZW50O1xuICAgIGlmIChlbGVtZW50KSB7XG4gICAgICByZW5kZXJlci5zZXRBdHRyaWJ1dGUoZWxlbWVudCwgJ25nLXNlcnZlci1jb250ZXh0Jywgc2VydmVyQ29udGV4dCk7XG4gICAgfVxuICB9KTtcbn1cblxuLy8gVE9ETzogaW1wb3J0IGZyb20gYEBhbmd1bGFyL2NvcmVgIGluc3RlYWQsIHRoaXMgaXMganVzdCBhIGNvcHkuXG5leHBvcnQgZW51bSBJMThuQ3JlYXRlT3BDb2RlIHtcbiAgU0hJRlQgPSAyLFxuICBBUFBFTkRfRUFHRVJMWSA9IDBiMDEsXG4gIENPTU1FTlQgPSAwYjEwLFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExpdmVEb20ge1xuICAvKiBhbmNob3IgaXMgYW4gaW5kZXggZnJvbSBMVmlldyAqL1xuICBjb250YWluZXJzOiBSZWNvcmQ8bnVtYmVyLCBDb250YWluZXI+O1xuICBub2RlczogUmVjb3JkPG51bWJlciwgc3RyaW5nPjtcbiAgdGVtcGxhdGVzOiBSZWNvcmQ8bnVtYmVyLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbnRhaW5lciB7XG4gIHZpZXdzOiBWaWV3W107XG4gIC8vIERlc2NyaWJlcyB0aGUgbnVtYmVyIG9mIHRvcCBsZXZlbCBub2RlcyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgLy8gT25seSBhcHBsaWNhYmxlIHRvIDxuZy1jb250YWluZXI+cy5cbiAgLy9cbiAgLy8gVE9ETzogY29uc2lkZXIgbW92aW5nIHRoaXMgaW5mbyBlbHNld2hlcmUgdG8gYXZvaWQgY29uZnVzaW9uXG4gIC8vIGJldHdlZW4gdmlldyBjb250YWluZXJzICg8ZGl2ICpuZ0lmPikgYW5kIGVsZW1lbnQgY29udGFpbmVyc1xuICAvLyAoPG5nLWNvbnRhaW5lcj5zKS5cbiAgbnVtUm9vdE5vZGVzPzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFZpZXcgZXh0ZW5kcyBMaXZlRG9tIHtcbiAgdGVtcGxhdGU6IHN0cmluZztcbiAgbnVtUm9vdE5vZGVzOiBudW1iZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0xDb250YWluZXIodmFsdWU6IFJOb2RlfExWaWV3fExDb250YWluZXJ8e318bnVsbCk6IHZhbHVlIGlzIExDb250YWluZXIge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWVbVFlQRV0gPT09IHRydWU7XG59XG5cbmZ1bmN0aW9uIGZpcnN0Uk5vZGVJbkVsZW1lbnRDb250YWluZXIodFZpZXc6IFRWaWV3LCBsVmlldzogTFZpZXcsIHROb2RlOiBUTm9kZSk6IFJOb2RlfG51bGwge1xuICBjb25zdCByb290Tm9kZXM6IGFueVtdID0gW107XG4gIC8vIFRPRE86IGZpbmQgbW9yZSBlZmZpY2llbnQgd2F5IHRvIGRvIHRoaXMuIFdlIGRvbid0IG5lZWQgdG8gdHJhdmVyc2UgdGhlIGVudGlyZVxuICAvLyBzdHJ1Y3R1cmUsIHdlIGNhbiBqdXN0IHN0b3AgYWZ0ZXIgZXhhbWluaW5nIHRoZSBmaXJzdCBub2RlLlxuICBjb2xsZWN0TmF0aXZlTm9kZXModFZpZXcsIGxWaWV3LCB0Tm9kZSwgcm9vdE5vZGVzKTtcbiAgcmV0dXJuIHJvb3ROb2Rlc1swXTtcbn1cblxuZnVuY3Rpb24gaXNQcm9qZWN0aW9uVE5vZGUodE5vZGU6IFROb2RlKTogYm9vbGVhbiB7XG4gIHJldHVybiAodE5vZGUudHlwZSAmIFROb2RlVHlwZS5Qcm9qZWN0aW9uKSA9PT0gVE5vZGVUeXBlLlByb2plY3Rpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RJMThuTm9kZShvYmo6IGFueSk6IGJvb2xlYW4ge1xuICAvLyBUT0RPOiBjb25zaWRlciBhZGRpbmcgYSBub2RlIHR5cGUgdG8gVEkxOG4/XG4gIHJldHVybiBvYmouaGFzT3duUHJvcGVydHkoJ2NyZWF0ZScpICYmIG9iai5oYXNPd25Qcm9wZXJ0eSgndXBkYXRlJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQ2xvc2VzdEVsZW1lbnRUTm9kZSh0Tm9kZTogVE5vZGV8bnVsbCk6IFROb2RlfG51bGwge1xuICBsZXQgcGFyZW50VE5vZGU6IFROb2RlfG51bGwgPSB0Tm9kZTtcbiAgLy8gRklYTUU6IHRoaXMgY29uZGl0aW9uIHNob3VsZCBhbHNvIHRha2UgaW50byBhY2NvdW50IHdoZXRoZXJcbiAgLy8gcmVzdWx0aW5nIHROb2RlIGlzIG5vdCBtYXJrZWQgYXMgYGluc2VydEJlZm9yZUluZGV4YC5cbiAgd2hpbGUgKHBhcmVudFROb2RlICE9PSBudWxsICYmXG4gICAgICAgICAoKHBhcmVudFROb2RlLnR5cGUgJiBUTm9kZVR5cGUuRWxlbWVudCkgIT09IFROb2RlVHlwZS5FbGVtZW50IHx8XG4gICAgICAgICAgcGFyZW50VE5vZGUuaW5zZXJ0QmVmb3JlSW5kZXggIT09IG51bGwpKSB7XG4gICAgdE5vZGUgPSBwYXJlbnRUTm9kZTtcbiAgICBwYXJlbnRUTm9kZSA9IHROb2RlLnBhcmVudDtcbiAgfVxuICByZXR1cm4gcGFyZW50VE5vZGU7XG59XG5cblxuZnVuY3Rpb24gc2VyaWFsaXplTFZpZXcobFZpZXc6IExWaWV3LCBob3N0Tm9kZTogRWxlbWVudCk6IExpdmVEb20ge1xuICBjb25zdCBuZ2g6IExpdmVEb20gPSB7XG4gICAgY29udGFpbmVyczoge30sXG4gICAgdGVtcGxhdGVzOiB7fSxcbiAgICBub2Rlczoge30sXG4gIH07XG5cbiAgY29uc3QgdFZpZXcgPSBsVmlld1tUVklFV107XG4gIGZvciAobGV0IGkgPSBIRUFERVJfT0ZGU0VUOyBpIDwgdFZpZXcuYmluZGluZ1N0YXJ0SW5kZXg7IGkrKykge1xuICAgIGxldCB0YXJnZXROb2RlOiBOb2RlfG51bGwgPSBudWxsO1xuICAgIGNvbnN0IGFkanVzdGVkSW5kZXggPSBpIC0gSEVBREVSX09GRlNFVDtcbiAgICBjb25zdCB0Tm9kZSA9IHRWaWV3LmRhdGFbaV0gYXMgVENvbnRhaW5lck5vZGU7XG4gICAgLy8gdE5vZGUgbWF5IGJlIG51bGwgaW4gdGhlIGNhc2Ugb2YgYSBsb2NhbFJlZlxuICAgIGlmICghdE5vZGUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0Tm9kZS5wcm9qZWN0aW9uKSkge1xuICAgICAgLy8gVE9ETzogaGFuZGxlIGBSTm9kZVtdYCBhcyB3ZWxsLlxuICAgICAgZm9yIChjb25zdCBoZWFkVE5vZGUgb2YgKHROb2RlLnByb2plY3Rpb24gYXMgYW55W10pKSB7XG4gICAgICAgIC8vIFdlIG1heSBoYXZlIGBudWxsYHMgaW4gc2xvdHMgd2l0aCBubyBwcm9qZWN0ZWQgY29udGVudC5cbiAgICAgICAgLy8gQWxzbywgaWYgd2UgcHJvY2VzcyByZS1wcm9qZWN0ZWQgY29udGVudCAoaS5lLiBgPG5nLWNvbnRlbnQ+YFxuICAgICAgICAvLyBhcHBlYXJzIGF0IHByb2plY3Rpb24gbG9jYXRpb24pLCBza2lwIGFubm90YXRpb25zIGZvciB0aGlzIGNvbnRlbnRcbiAgICAgICAgLy8gc2luY2UgYWxsIERPTSBub2RlcyBpbiB0aGlzIHByb2plY3Rpb24gd2VyZSBoYW5kbGVkIHdoaWxlIHByb2Nlc3NpbmdcbiAgICAgICAgLy8gYSBwYXJlbnQgbFZpZXcsIHdoaWNoIGNvbnRhaW5zIHRob3NlIG5vZGVzLlxuICAgICAgICBpZiAoaGVhZFROb2RlICYmICFpc1Byb2plY3Rpb25UTm9kZShoZWFkVE5vZGUpKSB7XG4gICAgICAgICAgbmdoLm5vZGVzW2hlYWRUTm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVRdID0gY2FsY1BhdGhGb3JOb2RlKHRWaWV3LCBsVmlldywgaGVhZFROb2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNMQ29udGFpbmVyKGxWaWV3W2ldKSkge1xuICAgICAgLy8gdGhpcyBpcyBhIGNvbnRhaW5lclxuICAgICAgY29uc3QgdE5vZGUgPSB0Vmlldy5kYXRhW2ldIGFzIFRDb250YWluZXJOb2RlO1xuICAgICAgY29uc3QgZW1iZWRkZWRUVmlldyA9IHROb2RlLnRWaWV3cztcbiAgICAgIGlmIChlbWJlZGRlZFRWaWV3ICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGVtYmVkZGVkVFZpZXcpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RpbmcgdE5vZGUudFZpZXdzIHRvIGJlIGFuIG9iamVjdCwgYnV0IGl0J3MgYW4gYXJyYXkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgbmdoLnRlbXBsYXRlcyFbaSAtIEhFQURFUl9PRkZTRVRdID0gZ2V0VFZpZXdTc3JJZChlbWJlZGRlZFRWaWV3KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGhvc3ROb2RlID0gbFZpZXdbaV1bSE9TVF0hO1xuICAgICAgLy8gTFZpZXdbaV1bSE9TVF0gY2FuIGJlIDIgZGlmZmVyZW50IHR5cGVzOiBFaXRoZXIgYSBET00gTm9kZVxuICAgICAgLy8gIG9yIGFuIExWaWV3IEFycmF5IHRoYXQgcmVwcmVzZW50cyBhIGNvbXBvbmVudFxuICAgICAgLy8gV2Ugb25seSBoYW5kbGUgdGhlIERPTSBOb2RlIGNhc2UgaGVyZVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaG9zdE5vZGUpKSB7XG4gICAgICAgIC8vIHRoaXMgaXMgYSBjb21wb25lbnRcbiAgICAgICAgdGFyZ2V0Tm9kZSA9IHVud3JhcFJOb2RlKGhvc3ROb2RlIGFzIExWaWV3KSBhcyBFbGVtZW50O1xuICAgICAgICBhbm5vdGF0ZUZvckh5ZHJhdGlvbih0YXJnZXROb2RlIGFzIEVsZW1lbnQsIGhvc3ROb2RlIGFzIExWaWV3KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHRoaXMgaXMgYSByZWd1bGFyIG5vZGVcbiAgICAgICAgdGFyZ2V0Tm9kZSA9IHVud3JhcFJOb2RlKGhvc3ROb2RlKSBhcyBOb2RlO1xuICAgICAgfVxuICAgICAgY29uc3QgY29udGFpbmVyID0gc2VyaWFsaXplTENvbnRhaW5lcihsVmlld1tpXSwgaG9zdE5vZGUsIGFkanVzdGVkSW5kZXgpO1xuICAgICAgbmdoLmNvbnRhaW5lcnMhW2FkanVzdGVkSW5kZXhdID0gY29udGFpbmVyO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShsVmlld1tpXSkpIHtcbiAgICAgIC8vIHRoaXMgaXMgYSBjb21wb25lbnRcbiAgICAgIHRhcmdldE5vZGUgPSB1bndyYXBSTm9kZShsVmlld1tpXVtIT1NUXSEpIGFzIEVsZW1lbnQ7XG4gICAgICBhbm5vdGF0ZUZvckh5ZHJhdGlvbih0YXJnZXROb2RlIGFzIEVsZW1lbnQsIGxWaWV3W2ldKTtcbiAgICB9IGVsc2UgaWYgKGlzVEkxOG5Ob2RlKHROb2RlKSkge1xuICAgICAgLy8gUHJvY2VzcyBpMThuIHRleHQgbm9kZXMuLi5cbiAgICAgIGNvbnN0IGNyZWF0ZU9wQ29kZXMgPSAodE5vZGUgYXMgYW55KS5jcmVhdGU7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNyZWF0ZU9wQ29kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3Qgb3BDb2RlID0gY3JlYXRlT3BDb2Rlc1tpKytdIGFzIGFueTtcbiAgICAgICAgY29uc3QgYXBwZW5kTm93ID1cbiAgICAgICAgICAgIChvcENvZGUgJiBJMThuQ3JlYXRlT3BDb2RlLkFQUEVORF9FQUdFUkxZKSA9PT0gSTE4bkNyZWF0ZU9wQ29kZS5BUFBFTkRfRUFHRVJMWTtcbiAgICAgICAgY29uc3QgaW5kZXggPSBvcENvZGUgPj4+IEkxOG5DcmVhdGVPcENvZGUuU0hJRlQ7XG4gICAgICAgIGNvbnN0IHROb2RlID0gdFZpZXcuZGF0YVtpbmRleF0gYXMgVE5vZGU7XG4gICAgICAgIC8vIGlmIChhcHBlbmROb3cpIHtcbiAgICAgICAgY29uc3QgcGFyZW50VE5vZGUgPSBmaW5kQ2xvc2VzdEVsZW1lbnRUTm9kZSh0Tm9kZSk7XG4gICAgICAgIGNvbnN0IHBhdGggPSBjYWxjUGF0aEZvck5vZGUodFZpZXcsIGxWaWV3LCB0Tm9kZSwgcGFyZW50VE5vZGUpO1xuICAgICAgICBuZ2gubm9kZXNbdE5vZGUuaW5kZXggLSBIRUFERVJfT0ZGU0VUXSA9IHBhdGg7XG4gICAgICAgIC8vIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHROb2RlLmluc2VydEJlZm9yZUluZGV4KSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0Tm9kZS5pbnNlcnRCZWZvcmVJbmRleCkgJiYgdE5vZGUuaW5zZXJ0QmVmb3JlSW5kZXhbMF0gIT09IG51bGwpIHtcbiAgICAgICAgLy8gQSByb290IG5vZGUgd2l0aGluIGkxOG4gYmxvY2suXG4gICAgICAgIC8vIFRPRE86IGFkZCBhIGNvbW1lbnQgb24gKndoeSogd2UgbmVlZCBhIHBhdGggaGVyZS5cbiAgICAgICAgY29uc3QgcGF0aCA9IGNhbGNQYXRoRm9yTm9kZSh0VmlldywgbFZpZXcsIHROb2RlKTtcbiAgICAgICAgbmdoLm5vZGVzW3ROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVF0gPSBwYXRoO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0Tm9kZVR5cGUgPSB0Tm9kZS50eXBlO1xuICAgICAgLy8gPG5nLWNvbnRhaW5lcj4gY2FzZVxuICAgICAgaWYgKHROb2RlVHlwZSAmIFROb2RlVHlwZS5FbGVtZW50Q29udGFpbmVyKSB7XG4gICAgICAgIGNvbnN0IHJvb3ROb2RlczogYW55W10gPSBbXTtcbiAgICAgICAgY29sbGVjdE5hdGl2ZU5vZGVzKHRWaWV3LCBsVmlldywgdE5vZGUuY2hpbGQsIHJvb3ROb2Rlcyk7XG5cbiAgICAgICAgLy8gVGhpcyBpcyBhbiBcImVsZW1lbnRcIiBjb250YWluZXIgKHZzIFwidmlld1wiIGNvbnRhaW5lciksXG4gICAgICAgIC8vIHNvIGl0J3Mgb25seSByZXByZXNlbnRlZCBieSB0aGUgbnVtYmVyIG9mIHRvcC1sZXZlbCBub2Rlc1xuICAgICAgICAvLyBhcyBhIHNoaWZ0IHRvIGdldCB0byBhIGNvcnJlc3BvbmRpbmcgY29tbWVudCBub2RlLlxuICAgICAgICBjb25zdCBjb250YWluZXI6IENvbnRhaW5lciA9IHtcbiAgICAgICAgICB2aWV3czogW10sXG4gICAgICAgICAgbnVtUm9vdE5vZGVzOiByb290Tm9kZXMubGVuZ3RoLFxuICAgICAgICB9O1xuXG4gICAgICAgIG5naC5jb250YWluZXJzW2FkanVzdGVkSW5kZXhdID0gY29udGFpbmVyO1xuICAgICAgfSBlbHNlIGlmICh0Tm9kZVR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikge1xuICAgICAgICAvLyBDdXJyZW50IFROb2RlIGhhcyBubyBET00gZWxlbWVudCBhc3NvY2lhdGVkIHdpdGggaXQsXG4gICAgICAgIC8vIHNvIHRoZSBmb2xsb3dpbmcgbm9kZSB3b3VsZCBub3QgYmUgYWJsZSB0byBmaW5kIGFuIGFuY2hvci5cbiAgICAgICAgLy8gVXNlIGZ1bGwgcGF0aCBpbnN0ZWFkLlxuICAgICAgICBsZXQgbmV4dFROb2RlID0gdE5vZGUubmV4dDtcbiAgICAgICAgd2hpbGUgKG5leHRUTm9kZSAhPT0gbnVsbCAmJiAobmV4dFROb2RlLnR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikpIHtcbiAgICAgICAgICBuZXh0VE5vZGUgPSBuZXh0VE5vZGUubmV4dDtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmV4dFROb2RlKSB7XG4gICAgICAgICAgY29uc3QgaW5kZXggPSBuZXh0VE5vZGUuaW5kZXggLSBIRUFERVJfT0ZGU0VUO1xuICAgICAgICAgIGNvbnN0IHBhdGggPSBjYWxjUGF0aEZvck5vZGUodFZpZXcsIGxWaWV3LCBuZXh0VE5vZGUpO1xuICAgICAgICAgIG5naC5ub2Rlc1tpbmRleF0gPSBwYXRoO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyAuLi4gb3RoZXJ3aXNlLCB0aGlzIGlzIGEgRE9NIGVsZW1lbnQsIGZvciB3aGljaCB3ZSBtYXkgbmVlZCB0b1xuICAgICAgICAvLyBzZXJpYWxpemUgaW4gc29tZSBjYXNlcy5cbiAgICAgICAgdGFyZ2V0Tm9kZSA9IGxWaWV3W2ldIGFzIE5vZGU7XG4gICAgICAgIGlmICghaXNDb25uZWN0ZWQodGFyZ2V0Tm9kZSkpIHtcbiAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICBjb25zb2xlLmxvZygnSU5ERVg6ICcsIGkgLSBIRUFERVJfT0ZGU0VUKVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdUQUdOQU1FOiAnLCAodGFyZ2V0Tm9kZSBhcyBIVE1MRWxlbWVudCkudGFnTmFtZSlcbiAgICAgICAgICBuZ2gubm9kZXNbaSAtIEhFQURFUl9PRkZTRVRdID0gXCItXCI7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBwcm9qZWN0aW9uIG5leHQgaXMgbm90IHRoZSBzYW1lIGFzIG5leHQsIGluIHdoaWNoIGNhc2VcbiAgICAgICAgLy8gdGhlIG5vZGUgd291bGQgbm90IGJlIGZvdW5kIGF0IGNyZWF0aW9uIHRpbWUgYXQgcnVudGltZSBhbmQgd2VcbiAgICAgICAgLy8gbmVlZCB0byBwcm92aWRlIGEgbG9jYXRpb24gdG8gdGhhdCBub2RlLlxuICAgICAgICBpZiAodE5vZGUucHJvamVjdGlvbk5leHQgJiYgdE5vZGUucHJvamVjdGlvbk5leHQgIT09IHROb2RlLm5leHQpIHtcbiAgICAgICAgICBjb25zdCBuZXh0UHJvamVjdGVkVE5vZGUgPSB0Tm9kZS5wcm9qZWN0aW9uTmV4dDtcbiAgICAgICAgICBjb25zdCBpbmRleCA9IG5leHRQcm9qZWN0ZWRUTm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVQ7XG4gICAgICAgICAgY29uc3QgcGF0aCA9IGNhbGNQYXRoRm9yTm9kZSh0VmlldywgbFZpZXcsIG5leHRQcm9qZWN0ZWRUTm9kZSk7XG4gICAgICAgICAgbmdoLm5vZGVzW2luZGV4XSA9IHBhdGg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5naDtcbn1cblxuZnVuY3Rpb24gaXNDb25uZWN0ZWQob3JpZ2luYWxOb2RlOiBOb2RlKSA6IGJvb2xlYW4ge1xuICBsZXQgbm9kZSA6IE5vZGV8UGFyZW50Tm9kZXxudWxsID0gb3JpZ2luYWxOb2RlO1xuICB3aGlsZSAobm9kZSAhPSBudWxsKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuRE9DVU1FTlRfTk9ERSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICBpZiAobm9kZSAhPSBudWxsICYmIG5vZGUubm9kZVR5cGUgPT09IE5vZGUuRE9DVU1FTlRfRlJBR01FTlRfTk9ERSkge1xuICAgICAgbm9kZSA9IChub2RlIGFzIGFueSkuaG9zdDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBjYWxjUGF0aEZvck5vZGUoXG4gICAgdFZpZXc6IFRWaWV3LCBsVmlldzogTFZpZXcsIHROb2RlOiBUTm9kZSwgcGFyZW50VE5vZGU/OiBUTm9kZXxudWxsKTogc3RyaW5nIHtcbiAgY29uc3QgaW5kZXggPSB0Tm9kZS5pbmRleDtcbiAgLy8gSWYgYG51bGxgIGlzIHBhc3NlZCBleHBsaWNpdGx5LCB1c2UgdGhpcyBhcyBhIHNpZ25hbCB0aGF0IHdlIHdhbnQgdG8gY2FsY3VsYXRlXG4gIC8vIHRoZSBwYXRoIHN0YXJ0aW5nIGZyb20gYGxWaWV3W0hPU1RdYC5cbiAgcGFyZW50VE5vZGUgPSBwYXJlbnRUTm9kZSA9PT0gbnVsbCA/IG51bGwgOiAocGFyZW50VE5vZGUgfHwgdE5vZGUucGFyZW50ISk7XG4gIGNvbnN0IHBhcmVudEluZGV4ID0gcGFyZW50VE5vZGUgPT09IG51bGwgPyAnaG9zdCcgOiBwYXJlbnRUTm9kZS5pbmRleDtcbiAgY29uc3QgcGFyZW50Uk5vZGUgPVxuICAgICAgcGFyZW50VE5vZGUgPT09IG51bGwgPyBsVmlld1tIT1NUXSA6IHVud3JhcFJOb2RlKGxWaWV3W3BhcmVudEluZGV4IGFzIG51bWJlcl0pO1xuICBsZXQgck5vZGUgPSB1bndyYXBSTm9kZShsVmlld1tpbmRleF0pO1xuICBpZiAodE5vZGUudHlwZSAmIFROb2RlVHlwZS5BbnlDb250YWluZXIpIHtcbiAgICAvLyBGb3IgPG5nLWNvbnRhaW5lcj4gbm9kZXMsIGluc3RlYWQgb2Ygc2VyaWFsaXppbmcgYSByZWZlcmVuY2VcbiAgICAvLyB0byB0aGUgYW5jaG9yIGNvbW1lbnQgbm9kZSwgc2VyaWFsaXplIGEgbG9jYXRpb24gb2YgdGhlIGZpcnN0XG4gICAgLy8gRE9NIGVsZW1lbnQuIFBhaXJlZCB3aXRoIHRoZSBjb250YWluZXIgc2l6ZSAoc2VyaWFsaXplZCBhcyBhIHBhcnRcbiAgICAvLyBvZiBgbmdoLmNvbnRhaW5lcnNgKSwgaXQgc2hvdWxkIGdpdmUgZW5vdWdoIGluZm9ybWF0aW9uIGZvciBydW50aW1lXG4gICAgLy8gdG8gaHlkcmF0ZSBub2RlcyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgICAvL1xuICAgIC8vIE5vdGU6IGZvciBFbGVtZW50Q29udGFpbmVycyAoaS5lLiBgPG5nLWNvbnRhaW5lcj5gIGVsZW1lbnRzKSwgd2UgdXNlXG4gICAgLy8gYSBmaXJzdCBjaGlsZCBmcm9tIHRoZSB0Tm9kZSBkYXRhIHN0cnVjdHVyZXMsIHNpbmNlIHdlIHdhbnQgdG8gY29sbGVjdFxuICAgIC8vIGFkZCByb290IG5vZGVzIHN0YXJ0aW5nIGZyb20gdGhlIGZpcnN0IGNoaWxkIG5vZGUgaW4gYSBjb250YWluZXIuXG4gICAgY29uc3QgY2hpbGRUTm9kZSA9IHROb2RlLnR5cGUgJiBUTm9kZVR5cGUuRWxlbWVudENvbnRhaW5lciA/IHROb2RlLmNoaWxkIDogdE5vZGU7XG4gICAgY29uc3QgZmlyc3RSTm9kZSA9IGZpcnN0Uk5vZGVJbkVsZW1lbnRDb250YWluZXIodFZpZXcsIGxWaWV3LCBjaGlsZFROb2RlISk7XG4gICAgLy8gSWYgY29udGFpbmVyIGlzIG5vdCBlbXB0eSwgdXNlIGEgcmVmZXJlbmNlIHRvIHRoZSBmaXJzdCBlbGVtZW50LFxuICAgIC8vIG90aGVyd2lzZSwgck5vZGUgd291bGQgcG9pbnQgdG8gYW4gYW5jaG9yIGNvbW1lbnQgbm9kZS5cbiAgICBpZiAoZmlyc3RSTm9kZSkge1xuICAgICAgck5vZGUgPSBmaXJzdFJOb2RlO1xuICAgIH1cbiAgfVxuICBjb25zdCBwYXRoOiBzdHJpbmdbXSA9IG5hdmlnYXRlQmV0d2VlbihwYXJlbnRSTm9kZSBhcyBOb2RlLCByTm9kZSBhcyBOb2RlKS5tYXAob3AgPT4ge1xuICAgIHN3aXRjaCAob3ApIHtcbiAgICAgIGNhc2UgTm9kZU5hdmlnYXRpb25TdGVwLkZpcnN0Q2hpbGQ6XG4gICAgICAgIHJldHVybiAnZmlyc3RDaGlsZCc7XG4gICAgICBjYXNlIE5vZGVOYXZpZ2F0aW9uU3RlcC5OZXh0U2libGluZzpcbiAgICAgICAgcmV0dXJuICduZXh0U2libGluZyc7XG4gICAgfVxuICB9KTtcbiAgaWYgKHBhcmVudEluZGV4ID09PSAnaG9zdCcpIHtcbiAgICAvLyBUT0RPOiBhZGQgc3VwcG9ydCBmb3IgYGhvc3RgIHRvIHRoZSBgbG9jYXRlTmV4dFJOb2RlYCBmbi5cbiAgICBwYXRoLnVuc2hpZnQocGFyZW50SW5kZXgpO1xuICB9IGVsc2Uge1xuICAgIHBhdGgudW5zaGlmdCgnJyArIChwYXJlbnRJbmRleCAtIEhFQURFUl9PRkZTRVQpKTtcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKCcuJyk7XG59XG5cbmxldCBzc3JJZDogbnVtYmVyID0gMDtcbmNvbnN0IHNzcklkTWFwID0gbmV3IE1hcDxUVmlldywgc3RyaW5nPigpO1xuXG5mdW5jdGlvbiBnZXRUVmlld1NzcklkKHRWaWV3OiBUVmlldyk6IHN0cmluZyB7XG4gIGlmICghc3NySWRNYXAuaGFzKHRWaWV3KSkge1xuICAgIHNzcklkTWFwLnNldCh0VmlldywgYHQke3NzcklkKyt9YCk7XG4gIH1cbiAgcmV0dXJuIHNzcklkTWFwLmdldCh0VmlldykhO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVMQ29udGFpbmVyKGxDb250YWluZXI6IExDb250YWluZXIsIGhvc3ROb2RlOiBFbGVtZW50LCBhbmNob3I6IG51bWJlcik6IENvbnRhaW5lciB7XG4gIGNvbnN0IGNvbnRhaW5lcjogQ29udGFpbmVyID0ge1xuICAgIHZpZXdzOiBbXSxcbiAgfTtcblxuICBmb3IgKGxldCBpID0gQ09OVEFJTkVSX0hFQURFUl9PRkZTRVQ7IGkgPCBsQ29udGFpbmVyLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGNoaWxkTFZpZXcgPSBsQ29udGFpbmVyW2ldIGFzIExWaWV3O1xuXG4gICAgLy8gR2V0IExWaWV3IGZvciB1bmRlcmx5aW5nIGNvbXBvbmVudC5cbiAgICBpZiAoaXNSb290VmlldyhjaGlsZExWaWV3KSkge1xuICAgICAgY2hpbGRMVmlldyA9IGNoaWxkTFZpZXdbSEVBREVSX09GRlNFVF07XG4gICAgfVxuICAgIGNvbnN0IGNoaWxkVFZpZXcgPSBjaGlsZExWaWV3W1RWSUVXXTtcblxuICAgIGxldCB0ZW1wbGF0ZTtcbiAgICBpZiAoY2hpbGRUVmlldy50eXBlID09PSBUVmlld1R5cGUuQ29tcG9uZW50KSB7XG4gICAgICBjb25zdCBjdHggPSBjaGlsZExWaWV3W0NPTlRFWFRdO1xuICAgICAgLy8gVE9ETzogdGhpcyBpcyBhIGhhY2sgKHdlIGNhcHR1cmUgYSBjb21wb25lbnQgaG9zdCBlbGVtZW50IG5hbWUpLFxuICAgICAgLy8gd2UgbmVlZCBhIG1vcmUgc3RhYmxlIHNvbHV0aW9uIGhlcmUsIGZvciBleC4gYSB3YXkgdG8gZ2VuZXJhdGVcbiAgICAgIC8vIGEgY29tcG9uZW50IGlkLlxuICAgICAgdGVtcGxhdGUgPSAoY3R4IS5jb25zdHJ1Y3RvciBhcyBhbnkpWyfJtWNtcCddLnNlbGVjdG9yc1swXVswXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGVtcGxhdGUgPSBnZXRUVmlld1NzcklkKGNoaWxkVFZpZXcpO1xuICAgIH1cblxuICAgIGNvbnN0IHJvb3ROb2RlczogYW55W10gPSBbXTtcbiAgICBjb2xsZWN0TmF0aXZlTm9kZXMoY2hpbGRUVmlldywgY2hpbGRMVmlldywgY2hpbGRUVmlldy5maXJzdENoaWxkLCByb290Tm9kZXMpO1xuXG4gICAgY29udGFpbmVyLnZpZXdzLnB1c2goe1xuICAgICAgdGVtcGxhdGUsICAvLyBmcm9tIHdoaWNoIHRlbXBsYXRlIGRpZCB0aGlzIGxWaWV3IG9yaWdpbmF0ZT9cbiAgICAgIG51bVJvb3ROb2Rlczogcm9vdE5vZGVzLmxlbmd0aCxcbiAgICAgIC4uLnNlcmlhbGl6ZUxWaWV3KGxDb250YWluZXJbaV0gYXMgTFZpZXcsIGhvc3ROb2RlKSxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBjb250YWluZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMVmlld0Zyb21Sb290RWxlbWVudChlbGVtZW50OiBFbGVtZW50KTogTFZpZXcge1xuICBjb25zdCBNT05LRVlfUEFUQ0hfS0VZX05BTUUgPSAnX19uZ0NvbnRleHRfXyc7XG4gIGNvbnN0IGRhdGEgPSAoZWxlbWVudCBhcyBhbnkpW01PTktFWV9QQVRDSF9LRVlfTkFNRV07XG4gIGxldCBsVmlldyA9IHR5cGVvZiBkYXRhID09PSAnbnVtYmVyJyA/IGdldExWaWV3QnlJZChkYXRhKSA6IGRhdGEgfHwgbnVsbDtcbiAgaWYgKCFsVmlldykgdGhyb3cgbmV3IEVycm9yKCdub3QgZm91bmQnKTsgIC8vIFRPRE86IGlzIGl0IHBvc3NpYmxlP1xuXG4gIGlmIChpc1Jvb3RWaWV3KGxWaWV3KSkge1xuICAgIGxWaWV3ID0gbFZpZXdbSEVBREVSX09GRlNFVF07XG4gIH1cbiAgcmV0dXJuIGxWaWV3O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5ub3RhdGVGb3JIeWRyYXRpb24oZWxlbWVudDogRWxlbWVudCwgbFZpZXc6IExWaWV3KTogdm9pZCB7XG4gIGNvbnN0IHJhd05naCA9IHNlcmlhbGl6ZUxWaWV3KGxWaWV3LCBlbGVtZW50KTtcbiAgY29uc3Qgc2VyaWFsaXplZE5naCA9IEpTT04uc3RyaW5naWZ5KHJhd05naCk7XG4gIGVsZW1lbnQuc2V0QXR0cmlidXRlKCduZ2gnLCBzZXJpYWxpemVkTmdoKTtcbn1cblxuZnVuY3Rpb24gX3JlbmRlcjxUPihcbiAgICBwbGF0Zm9ybTogUGxhdGZvcm1SZWYsXG4gICAgYm9vdHN0cmFwUHJvbWlzZTogUHJvbWlzZTxOZ01vZHVsZVJlZjxUPnxBcHBsaWNhdGlvblJlZj4pOiBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gYm9vdHN0cmFwUHJvbWlzZS50aGVuKChtb2R1bGVPckFwcGxpY2F0aW9uUmVmKSA9PiB7XG4gICAgY29uc3QgZW52aXJvbm1lbnRJbmplY3RvciA9IG1vZHVsZU9yQXBwbGljYXRpb25SZWYuaW5qZWN0b3I7XG4gICAgY29uc3QgdHJhbnNpdGlvbklkID0gZW52aXJvbm1lbnRJbmplY3Rvci5nZXQoybVUUkFOU0lUSU9OX0lELCBudWxsKTtcbiAgICBpZiAoIXRyYW5zaXRpb25JZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGByZW5kZXJNb2R1bGVbRmFjdG9yeV0oKSByZXF1aXJlcyB0aGUgdXNlIG9mIEJyb3dzZXJNb2R1bGUud2l0aFNlcnZlclRyYW5zaXRpb24oKSB0byBlbnN1cmVcbnRoZSBzZXJ2ZXItcmVuZGVyZWQgYXBwIGNhbiBiZSBwcm9wZXJseSBib290c3RyYXBwZWQgaW50byBhIGNsaWVudCBhcHAuYCk7XG4gICAgfVxuICAgIGNvbnN0IGFwcGxpY2F0aW9uUmVmOiBBcHBsaWNhdGlvblJlZiA9IG1vZHVsZU9yQXBwbGljYXRpb25SZWYgaW5zdGFuY2VvZiBBcHBsaWNhdGlvblJlZiA/XG4gICAgICAgIG1vZHVsZU9yQXBwbGljYXRpb25SZWYgOlxuICAgICAgICBlbnZpcm9ubWVudEluamVjdG9yLmdldChBcHBsaWNhdGlvblJlZik7XG4gICAgY29uc3Qgc2VydmVyQ29udGV4dCA9XG4gICAgICAgIHNhbml0aXplU2VydmVyQ29udGV4dChlbnZpcm9ubWVudEluamVjdG9yLmdldChTRVJWRVJfQ09OVEVYVCwgREVGQVVMVF9TRVJWRVJfQ09OVEVYVCkpO1xuICAgIHJldHVybiBhcHBsaWNhdGlvblJlZi5pc1N0YWJsZS5waXBlKGZpcnN0KChpc1N0YWJsZTogYm9vbGVhbikgPT4gaXNTdGFibGUpKVxuICAgICAgICAudG9Qcm9taXNlKClcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGFwcGVuZFNlcnZlckNvbnRleHRJbmZvKHNlcnZlckNvbnRleHQsIGFwcGxpY2F0aW9uUmVmKTtcblxuICAgICAgICAgIGNvbnN0IHBsYXRmb3JtU3RhdGUgPSBwbGF0Zm9ybS5pbmplY3Rvci5nZXQoUGxhdGZvcm1TdGF0ZSk7XG5cbiAgICAgICAgICBjb25zdCBhc3luY1Byb21pc2VzOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuXG4gICAgICAgICAgLy8gUnVuIGFueSBCRUZPUkVfQVBQX1NFUklBTElaRUQgY2FsbGJhY2tzIGp1c3QgYmVmb3JlIHJlbmRlcmluZyB0byBzdHJpbmcuXG4gICAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gZW52aXJvbm1lbnRJbmplY3Rvci5nZXQoQkVGT1JFX0FQUF9TRVJJQUxJWkVELCBudWxsKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFja3MpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FsbGJhY2tSZXN1bHQgPSBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGlmICjJtWlzUHJvbWlzZShjYWxsYmFja1Jlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGluIFRTMy43LCBjYWxsYmFja1Jlc3VsdCBpcyB2b2lkLlxuICAgICAgICAgICAgICAgICAgYXN5bmNQcm9taXNlcy5wdXNoKGNhbGxiYWNrUmVzdWx0IGFzIGFueSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGV4Y2VwdGlvbnMuXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdJZ25vcmluZyBCRUZPUkVfQVBQX1NFUklBTElaRUQgRXhjZXB0aW9uOiAnLCBlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGNvbXBsZXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgYXBwbGljYXRpb25SZWYuY29tcG9uZW50cy5mb3JFYWNoKChjb21wb25lbnRSZWYpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IGNvbXBvbmVudFJlZi5sb2NhdGlvbi5uYXRpdmVFbGVtZW50O1xuICAgICAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIGFubm90YXRlRm9ySHlkcmF0aW9uKGVsZW1lbnQsIGdldExWaWV3RnJvbVJvb3RFbGVtZW50KGVsZW1lbnQpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IHBsYXRmb3JtU3RhdGUucmVuZGVyVG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHBsYXRmb3JtLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmIChhc3luY1Byb21pc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBsZXRlKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIFByb21pc2VcbiAgICAgICAgICAgICAgLmFsbChhc3luY1Byb21pc2VzLm1hcCgoYXN5bmNQcm9taXNlKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFzeW5jUHJvbWlzZS5jYXRjaCgoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdJZ25vcmluZyBCRUZPUkVfQVBQX1NFUklBTElaRUQgRXhjZXB0aW9uOiAnLCBlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgIC50aGVuKGNvbXBsZXRlKTtcbiAgICAgICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFNwZWNpZmllcyB0aGUgdmFsdWUgdGhhdCBzaG91bGQgYmUgdXNlZCBpZiBubyBzZXJ2ZXIgY29udGV4dCB2YWx1ZSBoYXMgYmVlbiBwcm92aWRlZC5cbiAqL1xuY29uc3QgREVGQVVMVF9TRVJWRVJfQ09OVEVYVCA9ICdvdGhlcic7XG5cbi8qKlxuICogQW4gaW50ZXJuYWwgdG9rZW4gdGhhdCBhbGxvd3MgcHJvdmlkaW5nIGV4dHJhIGluZm9ybWF0aW9uIGFib3V0IHRoZSBzZXJ2ZXIgY29udGV4dFxuICogKGUuZy4gd2hldGhlciBTU1Igb3IgU1NHIHdhcyB1c2VkKS4gVGhlIHZhbHVlIGlzIGEgc3RyaW5nIGFuZCBjaGFyYWN0ZXJzIG90aGVyXG4gKiB0aGFuIFthLXpBLVowLTlcXC1dIGFyZSByZW1vdmVkLiBTZWUgdGhlIGRlZmF1bHQgdmFsdWUgaW4gYERFRkFVTFRfU0VSVkVSX0NPTlRFWFRgIGNvbnN0LlxuICovXG5leHBvcnQgY29uc3QgU0VSVkVSX0NPTlRFWFQgPSBuZXcgSW5qZWN0aW9uVG9rZW48c3RyaW5nPignU0VSVkVSX0NPTlRFWFQnKTtcblxuLyoqXG4gKiBTYW5pdGl6ZXMgcHJvdmlkZWQgc2VydmVyIGNvbnRleHQ6XG4gKiAtIHJlbW92ZXMgYWxsIGNoYXJhY3RlcnMgb3RoZXIgdGhhbiBhLXosIEEtWiwgMC05IGFuZCBgLWBcbiAqIC0gcmV0dXJucyBgb3RoZXJgIGlmIG5vdGhpbmcgaXMgcHJvdmlkZWQgb3IgdGhlIHN0cmluZyBpcyBlbXB0eSBhZnRlciBzYW5pdGl6YXRpb25cbiAqL1xuZnVuY3Rpb24gc2FuaXRpemVTZXJ2ZXJDb250ZXh0KHNlcnZlckNvbnRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNvbnRleHQgPSBzZXJ2ZXJDb250ZXh0LnJlcGxhY2UoL1teYS16QS1aMC05XFwtXS9nLCAnJyk7XG4gIHJldHVybiBjb250ZXh0Lmxlbmd0aCA+IDAgPyBjb250ZXh0IDogREVGQVVMVF9TRVJWRVJfQ09OVEVYVDtcbn1cblxuLyoqXG4gKiBCb290c3RyYXBzIGFuIGFwcGxpY2F0aW9uIHVzaW5nIHByb3ZpZGVkIE5nTW9kdWxlIGFuZCBzZXJpYWxpemVzIHRoZSBwYWdlIGNvbnRlbnQgdG8gc3RyaW5nLlxuICpcbiAqIEBwYXJhbSBtb2R1bGVUeXBlIEEgcmVmZXJlbmNlIHRvIGFuIE5nTW9kdWxlIHRoYXQgc2hvdWxkIGJlIHVzZWQgZm9yIGJvb3RzdHJhcC5cbiAqIEBwYXJhbSBvcHRpb25zIEFkZGl0aW9uYWwgY29uZmlndXJhdGlvbiBmb3IgdGhlIHJlbmRlciBvcGVyYXRpb246XG4gKiAgLSBgZG9jdW1lbnRgIC0gdGhlIGRvY3VtZW50IG9mIHRoZSBwYWdlIHRvIHJlbmRlciwgZWl0aGVyIGFzIGFuIEhUTUwgc3RyaW5nIG9yXG4gKiAgICAgICAgICAgICAgICAgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGBkb2N1bWVudGAgaW5zdGFuY2UuXG4gKiAgLSBgdXJsYCAtIHRoZSBVUkwgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYGV4dHJhUHJvdmlkZXJzYCAtIHNldCBvZiBwbGF0Zm9ybSBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlck1vZHVsZTxUPihcbiAgICBtb2R1bGVUeXBlOiBUeXBlPFQ+LFxuICAgIG9wdGlvbnM6IHtkb2N1bWVudD86IHN0cmluZ3xEb2N1bWVudDsgdXJsPzogc3RyaW5nOyBleHRyYVByb3ZpZGVycz86IFN0YXRpY1Byb3ZpZGVyW119KTpcbiAgICBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7ZG9jdW1lbnQsIHVybCwgZXh0cmFQcm92aWRlcnM6IHBsYXRmb3JtUHJvdmlkZXJzfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtRHluYW1pY1NlcnZlciwge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzfSk7XG4gIHJldHVybiBfcmVuZGVyKHBsYXRmb3JtLCBwbGF0Zm9ybS5ib290c3RyYXBNb2R1bGUobW9kdWxlVHlwZSkpO1xufVxuXG4vKipcbiAqIEJvb3RzdHJhcHMgYW4gaW5zdGFuY2Ugb2YgYW4gQW5ndWxhciBhcHBsaWNhdGlvbiBhbmQgcmVuZGVycyBpdCB0byBhIHN0cmluZy5cbiAqXG4gKiBOb3RlOiB0aGUgcm9vdCBjb21wb25lbnQgcGFzc2VkIGludG8gdGhpcyBmdW5jdGlvbiAqbXVzdCogYmUgYSBzdGFuZGFsb25lIG9uZSAoc2hvdWxkIGhhdmUgdGhlXG4gKiBgc3RhbmRhbG9uZTogdHJ1ZWAgZmxhZyBpbiB0aGUgYEBDb21wb25lbnRgIGRlY29yYXRvciBjb25maWcpLlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIEBDb21wb25lbnQoe1xuICogICBzdGFuZGFsb25lOiB0cnVlLFxuICogICB0ZW1wbGF0ZTogJ0hlbGxvIHdvcmxkISdcbiAqIH0pXG4gKiBjbGFzcyBSb290Q29tcG9uZW50IHt9XG4gKlxuICogY29uc3Qgb3V0cHV0OiBzdHJpbmcgPSBhd2FpdCByZW5kZXJBcHBsaWNhdGlvbihSb290Q29tcG9uZW50LCB7YXBwSWQ6ICdzZXJ2ZXItYXBwJ30pO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHJvb3RDb21wb25lbnQgQSByZWZlcmVuY2UgdG8gYSBTdGFuZGFsb25lIENvbXBvbmVudCB0aGF0IHNob3VsZCBiZSByZW5kZXJlZC5cbiAqIEBwYXJhbSBvcHRpb25zIEFkZGl0aW9uYWwgY29uZmlndXJhdGlvbiBmb3IgdGhlIHJlbmRlciBvcGVyYXRpb246XG4gKiAgLSBgYXBwSWRgIC0gYSBzdHJpbmcgaWRlbnRpZmllciBvZiB0aGlzIGFwcGxpY2F0aW9uLiBUaGUgYXBwSWQgaXMgdXNlZCB0byBwcmVmaXggYWxsXG4gKiAgICAgICAgICAgICAgc2VydmVyLWdlbmVyYXRlZCBzdHlsaW5ncyBhbmQgc3RhdGUga2V5cyBvZiB0aGUgYXBwbGljYXRpb24gaW4gVHJhbnNmZXJTdGF0ZVxuICogICAgICAgICAgICAgIHVzZS1jYXNlcy5cbiAqICAtIGBkb2N1bWVudGAgLSB0aGUgZG9jdW1lbnQgb2YgdGhlIHBhZ2UgdG8gcmVuZGVyLCBlaXRoZXIgYXMgYW4gSFRNTCBzdHJpbmcgb3JcbiAqICAgICAgICAgICAgICAgICBhcyBhIHJlZmVyZW5jZSB0byB0aGUgYGRvY3VtZW50YCBpbnN0YW5jZS5cbiAqICAtIGB1cmxgIC0gdGhlIFVSTCBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKiAgLSBgcHJvdmlkZXJzYCAtIHNldCBvZiBhcHBsaWNhdGlvbiBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYHBsYXRmb3JtUHJvdmlkZXJzYCAtIHRoZSBwbGF0Zm9ybSBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICpcbiAqIEByZXR1cm5zIEEgUHJvbWlzZSwgdGhhdCByZXR1cm5zIHNlcmlhbGl6ZWQgKHRvIGEgc3RyaW5nKSByZW5kZXJlZCBwYWdlLCBvbmNlIHJlc29sdmVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXZlbG9wZXJQcmV2aWV3XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJBcHBsaWNhdGlvbjxUPihyb290Q29tcG9uZW50OiBUeXBlPFQ+LCBvcHRpb25zOiB7XG4gIGFwcElkOiBzdHJpbmc7XG4gIGRvY3VtZW50Pzogc3RyaW5nIHwgRG9jdW1lbnQ7XG4gIHVybD86IHN0cmluZztcbiAgcHJvdmlkZXJzPzogQXJyYXk8UHJvdmlkZXJ8RW52aXJvbm1lbnRQcm92aWRlcnM+O1xuICBwbGF0Zm9ybVByb3ZpZGVycz86IFByb3ZpZGVyW107XG59KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3Qge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzLCBhcHBJZH0gPSBvcHRpb25zO1xuICBjb25zdCBwbGF0Zm9ybSA9IF9nZXRQbGF0Zm9ybShwbGF0Zm9ybUR5bmFtaWNTZXJ2ZXIsIHtkb2N1bWVudCwgdXJsLCBwbGF0Zm9ybVByb3ZpZGVyc30pO1xuICBjb25zdCBhcHBQcm92aWRlcnMgPSBbXG4gICAgaW1wb3J0UHJvdmlkZXJzRnJvbShCcm93c2VyTW9kdWxlLndpdGhTZXJ2ZXJUcmFuc2l0aW9uKHthcHBJZH0pKSxcbiAgICBpbXBvcnRQcm92aWRlcnNGcm9tKFNlcnZlck1vZHVsZSksXG4gICAgLi4uVFJBTlNGRVJfU1RBVEVfU0VSSUFMSVpBVElPTl9QUk9WSURFUlMsXG4gICAgLi4uKG9wdGlvbnMucHJvdmlkZXJzID8/IFtdKSxcbiAgXTtcbiAgcmV0dXJuIF9yZW5kZXIocGxhdGZvcm0sIGludGVybmFsQ3JlYXRlQXBwbGljYXRpb24oe3Jvb3RDb21wb25lbnQsIGFwcFByb3ZpZGVyc30pKTtcbn1cblxuLyoqXG4gKiBCb290c3RyYXBzIGFuIGFwcGxpY2F0aW9uIHVzaW5nIHByb3ZpZGVkIHtAbGluayBOZ01vZHVsZUZhY3Rvcnl9IGFuZCBzZXJpYWxpemVzIHRoZSBwYWdlIGNvbnRlbnRcbiAqIHRvIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0gbW9kdWxlRmFjdG9yeSBBbiBpbnN0YW5jZSBvZiB0aGUge0BsaW5rIE5nTW9kdWxlRmFjdG9yeX0gdGhhdCBzaG91bGQgYmUgdXNlZCBmb3JcbiAqICAgICBib290c3RyYXAuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSByZW5kZXIgb3BlcmF0aW9uOlxuICogIC0gYGRvY3VtZW50YCAtIHRoZSBkb2N1bWVudCBvZiB0aGUgcGFnZSB0byByZW5kZXIsIGVpdGhlciBhcyBhbiBIVE1MIHN0cmluZyBvclxuICogICAgICAgICAgICAgICAgIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBgZG9jdW1lbnRgIGluc3RhbmNlLlxuICogIC0gYHVybGAgLSB0aGUgVVJMIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqICAtIGBleHRyYVByb3ZpZGVyc2AgLSBzZXQgb2YgcGxhdGZvcm0gbGV2ZWwgcHJvdmlkZXJzIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKlxuICogQGRlcHJlY2F0ZWRcbiAqIFRoaXMgc3ltYm9sIGlzIG5vIGxvbmdlciBuZWNlc3NhcnkgYXMgb2YgQW5ndWxhciB2MTMuXG4gKiBVc2Uge0BsaW5rIHJlbmRlck1vZHVsZX0gQVBJIGluc3RlYWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJNb2R1bGVGYWN0b3J5PFQ+KFxuICAgIG1vZHVsZUZhY3Rvcnk6IE5nTW9kdWxlRmFjdG9yeTxUPixcbiAgICBvcHRpb25zOiB7ZG9jdW1lbnQ/OiBzdHJpbmc7IHVybD86IHN0cmluZzsgZXh0cmFQcm92aWRlcnM/OiBTdGF0aWNQcm92aWRlcltdfSk6XG4gICAgUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3Qge2RvY3VtZW50LCB1cmwsIGV4dHJhUHJvdmlkZXJzOiBwbGF0Zm9ybVByb3ZpZGVyc30gPSBvcHRpb25zO1xuICBjb25zdCBwbGF0Zm9ybSA9IF9nZXRQbGF0Zm9ybShwbGF0Zm9ybVNlcnZlciwge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzfSk7XG4gIHJldHVybiBfcmVuZGVyKHBsYXRmb3JtLCBwbGF0Zm9ybS5ib290c3RyYXBNb2R1bGVGYWN0b3J5KG1vZHVsZUZhY3RvcnkpKTtcbn1cbiJdfQ==