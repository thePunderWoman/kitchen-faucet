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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1zZXJ2ZXIvc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxjQUFjLEVBQXdCLG1CQUFtQixFQUFFLGNBQWMsRUFBdUQsU0FBUyxFQUF3QixtQkFBbUIsSUFBSSxrQkFBa0IsRUFBRSx3QkFBd0IsSUFBSSx1QkFBdUIsRUFBRSxRQUFRLElBQUksT0FBTyxFQUFFLGFBQWEsSUFBSSxZQUFZLEVBQUUsY0FBYyxJQUFJLGFBQWEsRUFBRSxLQUFLLElBQUksSUFBSSxFQUFFLDBCQUEwQixJQUFJLHlCQUF5QixFQUFFLFVBQVUsRUFBRSxXQUFXLElBQUksVUFBVSxFQUE0SSxNQUFNLElBQUksS0FBSyxFQUE0QyxLQUFLLElBQUksSUFBSSxFQUFFLFlBQVksSUFBSSxXQUFXLEdBQUUsTUFBTSxlQUFlLENBQUM7QUFDcHRCLE9BQU8sRUFBQyxhQUFhLEVBQUUsY0FBYyxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDeEUsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXJDLE9BQU8sRUFBQyxlQUFlLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDL0QsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxxQkFBcUIsRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdFLE9BQU8sRUFBQyxxQkFBcUIsRUFBRSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDL0QsT0FBTyxFQUFDLHNDQUFzQyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFReEUsU0FBUyxZQUFZLENBQ2pCLGVBQWtFLEVBQ2xFLE9BQXdCO0lBQzFCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxp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QUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FpQkc7QUFDSCxNQUFNLFVBQVUsbUJBQW1CLENBQy9CLGFBQWlDLEVBQ2pDLE9BQTZFO0lBRS9FLE1BQU0sRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBQyxHQUFHLE9BQU8sQ0FBQztJQUNuRSxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsY0FBYyxFQUFFLEVBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBQyxDQUFDLENBQUM7SUFDbEYsT0FBTyxPQUFPLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBcHBsaWNhdGlvblJlZiwgRW52aXJvbm1lbnRQcm92aWRlcnMsIGltcG9ydFByb3ZpZGVyc0Zyb20sIEluamVjdGlvblRva2VuLCBOZ01vZHVsZUZhY3RvcnksIE5nTW9kdWxlUmVmLCBQbGF0Zm9ybVJlZiwgUHJvdmlkZXIsIFJlbmRlcmVyMiwgU3RhdGljUHJvdmlkZXIsIFR5cGUsIMm1Y29sbGVjdE5hdGl2ZU5vZGVzIGFzIGNvbGxlY3ROYXRpdmVOb2RlcywgybVDT05UQUlORVJfSEVBREVSX09GRlNFVCBhcyBDT05UQUlORVJfSEVBREVSX09GRlNFVCwgybVDT05URVhUIGFzIENPTlRFWFQsIMm1Z2V0TFZpZXdCeUlkIGFzIGdldExWaWV3QnlJZCwgybVIRUFERVJfT0ZGU0VUIGFzIEhFQURFUl9PRkZTRVQsIMm1SE9TVCBhcyBIT1NULCDJtWludGVybmFsQ3JlYXRlQXBwbGljYXRpb24gYXMgaW50ZXJuYWxDcmVhdGVBcHBsaWNhdGlvbiwgybVpc1Byb21pc2UsIMm1aXNSb290VmlldyBhcyBpc1Jvb3RWaWV3LCDJtUxDb250YWluZXIgYXMgTENvbnRhaW5lciwgybVMVmlldyBhcyBMVmlldywgybVSTm9kZSBhcyBSTm9kZSwgybVUQ29udGFpbmVyTm9kZSBhcyBUQ29udGFpbmVyTm9kZSwgybVUTm9kZSBhcyBUTm9kZSwgybVUTm9kZVR5cGUgYXMgVE5vZGVUeXBlLCDJtVRWSUVXIGFzIFRWSUVXLCDJtVRWaWV3IGFzIFRWaWV3LCDJtVRWaWV3VHlwZSBhcyBUVmlld1R5cGUsIMm1VFlQRSBhcyBUWVBFLCDJtXVud3JhcFJOb2RlIGFzIHVud3JhcFJOb2RlLH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0Jyb3dzZXJNb2R1bGUsIMm1VFJBTlNJVElPTl9JRH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlcic7XG5pbXBvcnQge2ZpcnN0fSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7bmF2aWdhdGVCZXR3ZWVuLCBOb2RlTmF2aWdhdGlvblN0ZXB9IGZyb20gJy4vbm9kZV9uYXYnO1xuaW1wb3J0IHtQbGF0Zm9ybVN0YXRlfSBmcm9tICcuL3BsYXRmb3JtX3N0YXRlJztcbmltcG9ydCB7cGxhdGZvcm1EeW5hbWljU2VydmVyLCBwbGF0Zm9ybVNlcnZlciwgU2VydmVyTW9kdWxlfSBmcm9tICcuL3NlcnZlcic7XG5pbXBvcnQge0JFRk9SRV9BUFBfU0VSSUFMSVpFRCwgSU5JVElBTF9DT05GSUd9IGZyb20gJy4vdG9rZW5zJztcbmltcG9ydCB7VFJBTlNGRVJfU1RBVEVfU0VSSUFMSVpBVElPTl9QUk9WSURFUlN9IGZyb20gJy4vdHJhbnNmZXJfc3RhdGUnO1xuXG5pbnRlcmZhY2UgUGxhdGZvcm1PcHRpb25zIHtcbiAgZG9jdW1lbnQ/OiBzdHJpbmd8RG9jdW1lbnQ7XG4gIHVybD86IHN0cmluZztcbiAgcGxhdGZvcm1Qcm92aWRlcnM/OiBQcm92aWRlcltdO1xufVxuXG5mdW5jdGlvbiBfZ2V0UGxhdGZvcm0oXG4gICAgcGxhdGZvcm1GYWN0b3J5OiAoZXh0cmFQcm92aWRlcnM6IFN0YXRpY1Byb3ZpZGVyW10pID0+IFBsYXRmb3JtUmVmLFxuICAgIG9wdGlvbnM6IFBsYXRmb3JtT3B0aW9ucyk6IFBsYXRmb3JtUmVmIHtcbiAgY29uc3QgZXh0cmFQcm92aWRlcnMgPSBvcHRpb25zLnBsYXRmb3JtUHJvdmlkZXJzID8/IFtdO1xuICByZXR1cm4gcGxhdGZvcm1GYWN0b3J5KFtcbiAgICB7cHJvdmlkZTogSU5JVElBTF9DT05GSUcsIHVzZVZhbHVlOiB7ZG9jdW1lbnQ6IG9wdGlvbnMuZG9jdW1lbnQsIHVybDogb3B0aW9ucy51cmx9fSxcbiAgICBleHRyYVByb3ZpZGVycyxcbiAgXSk7XG59XG5cbi8qKlxuICogQWRkcyB0aGUgYG5nLXNlcnZlci1jb250ZXh0YCBhdHRyaWJ1dGUgdG8gaG9zdCBlbGVtZW50cyBvZiBhbGwgYm9vdHN0cmFwcGVkIGNvbXBvbmVudHNcbiAqIHdpdGhpbiBhIGdpdmVuIGFwcGxpY2F0aW9uLlxuICovXG5mdW5jdGlvbiBhcHBlbmRTZXJ2ZXJDb250ZXh0SW5mbyhzZXJ2ZXJDb250ZXh0OiBzdHJpbmcsIGFwcGxpY2F0aW9uUmVmOiBBcHBsaWNhdGlvblJlZikge1xuICBhcHBsaWNhdGlvblJlZi5jb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudFJlZikgPT4ge1xuICAgIGNvbnN0IHJlbmRlcmVyID0gY29tcG9uZW50UmVmLmluamVjdG9yLmdldChSZW5kZXJlcjIpO1xuICAgIGNvbnN0IGVsZW1lbnQgPSBjb21wb25lbnRSZWYubG9jYXRpb24ubmF0aXZlRWxlbWVudDtcbiAgICBpZiAoZWxlbWVudCkge1xuICAgICAgcmVuZGVyZXIuc2V0QXR0cmlidXRlKGVsZW1lbnQsICduZy1zZXJ2ZXItY29udGV4dCcsIHNlcnZlckNvbnRleHQpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIFRPRE86IGltcG9ydCBmcm9tIGBAYW5ndWxhci9jb3JlYCBpbnN0ZWFkLCB0aGlzIGlzIGp1c3QgYSBjb3B5LlxuZXhwb3J0IGVudW0gSTE4bkNyZWF0ZU9wQ29kZSB7XG4gIFNISUZUID0gMixcbiAgQVBQRU5EX0VBR0VSTFkgPSAwYjAxLFxuICBDT01NRU5UID0gMGIxMCxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMaXZlRG9tIHtcbiAgLyogYW5jaG9yIGlzIGFuIGluZGV4IGZyb20gTFZpZXcgKi9cbiAgY29udGFpbmVyczogUmVjb3JkPG51bWJlciwgQ29udGFpbmVyPjtcbiAgbm9kZXM6IFJlY29yZDxudW1iZXIsIHN0cmluZz47XG4gIHRlbXBsYXRlczogUmVjb3JkPG51bWJlciwgc3RyaW5nPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb250YWluZXIge1xuICB2aWV3czogVmlld1tdO1xuICAvLyBEZXNjcmliZXMgdGhlIG51bWJlciBvZiB0b3AgbGV2ZWwgbm9kZXMgaW4gdGhpcyBjb250YWluZXIuXG4gIC8vIE9ubHkgYXBwbGljYWJsZSB0byA8bmctY29udGFpbmVyPnMuXG4gIC8vXG4gIC8vIFRPRE86IGNvbnNpZGVyIG1vdmluZyB0aGlzIGluZm8gZWxzZXdoZXJlIHRvIGF2b2lkIGNvbmZ1c2lvblxuICAvLyBiZXR3ZWVuIHZpZXcgY29udGFpbmVycyAoPGRpdiAqbmdJZj4pIGFuZCBlbGVtZW50IGNvbnRhaW5lcnNcbiAgLy8gKDxuZy1jb250YWluZXI+cykuXG4gIG51bVJvb3ROb2Rlcz86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWaWV3IGV4dGVuZHMgTGl2ZURvbSB7XG4gIHRlbXBsYXRlOiBzdHJpbmc7XG4gIG51bVJvb3ROb2RlczogbnVtYmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNMQ29udGFpbmVyKHZhbHVlOiBSTm9kZXxMVmlld3xMQ29udGFpbmVyfHt9fG51bGwpOiB2YWx1ZSBpcyBMQ29udGFpbmVyIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlW1RZUEVdID09PSB0cnVlO1xufVxuXG5mdW5jdGlvbiBmaXJzdFJOb2RlSW5FbGVtZW50Q29udGFpbmVyKHRWaWV3OiBUVmlldywgbFZpZXc6IExWaWV3LCB0Tm9kZTogVE5vZGUpOiBSTm9kZXxudWxsIHtcbiAgY29uc3Qgcm9vdE5vZGVzOiBhbnlbXSA9IFtdO1xuICAvLyBUT0RPOiBmaW5kIG1vcmUgZWZmaWNpZW50IHdheSB0byBkbyB0aGlzLiBXZSBkb24ndCBuZWVkIHRvIHRyYXZlcnNlIHRoZSBlbnRpcmVcbiAgLy8gc3RydWN0dXJlLCB3ZSBjYW4ganVzdCBzdG9wIGFmdGVyIGV4YW1pbmluZyB0aGUgZmlyc3Qgbm9kZS5cbiAgY29sbGVjdE5hdGl2ZU5vZGVzKHRWaWV3LCBsVmlldywgdE5vZGUsIHJvb3ROb2Rlcyk7XG4gIHJldHVybiByb290Tm9kZXNbMF07XG59XG5cbmZ1bmN0aW9uIGlzUHJvamVjdGlvblROb2RlKHROb2RlOiBUTm9kZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gKHROb2RlLnR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikgPT09IFROb2RlVHlwZS5Qcm9qZWN0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUSTE4bk5vZGUob2JqOiBhbnkpOiBib29sZWFuIHtcbiAgLy8gVE9ETzogY29uc2lkZXIgYWRkaW5nIGEgbm9kZSB0eXBlIHRvIFRJMThuP1xuICByZXR1cm4gb2JqLmhhc093blByb3BlcnR5KCdjcmVhdGUnKSAmJiBvYmouaGFzT3duUHJvcGVydHkoJ3VwZGF0ZScpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZENsb3Nlc3RFbGVtZW50VE5vZGUodE5vZGU6IFROb2RlfG51bGwpOiBUTm9kZXxudWxsIHtcbiAgbGV0IHBhcmVudFROb2RlOiBUTm9kZXxudWxsID0gdE5vZGU7XG4gIC8vIEZJWE1FOiB0aGlzIGNvbmRpdGlvbiBzaG91bGQgYWxzbyB0YWtlIGludG8gYWNjb3VudCB3aGV0aGVyXG4gIC8vIHJlc3VsdGluZyB0Tm9kZSBpcyBub3QgbWFya2VkIGFzIGBpbnNlcnRCZWZvcmVJbmRleGAuXG4gIHdoaWxlIChwYXJlbnRUTm9kZSAhPT0gbnVsbCAmJlxuICAgICAgICAgKChwYXJlbnRUTm9kZS50eXBlICYgVE5vZGVUeXBlLkVsZW1lbnQpICE9PSBUTm9kZVR5cGUuRWxlbWVudCB8fFxuICAgICAgICAgIHBhcmVudFROb2RlLmluc2VydEJlZm9yZUluZGV4ICE9PSBudWxsKSkge1xuICAgIHROb2RlID0gcGFyZW50VE5vZGU7XG4gICAgcGFyZW50VE5vZGUgPSB0Tm9kZS5wYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHBhcmVudFROb2RlO1xufVxuXG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUxWaWV3KGxWaWV3OiBMVmlldywgaG9zdE5vZGU6IEVsZW1lbnQpOiBMaXZlRG9tIHtcbiAgY29uc3QgbmdoOiBMaXZlRG9tID0ge1xuICAgIGNvbnRhaW5lcnM6IHt9LFxuICAgIHRlbXBsYXRlczoge30sXG4gICAgbm9kZXM6IHt9LFxuICB9O1xuXG4gIGNvbnN0IHRWaWV3ID0gbFZpZXdbVFZJRVddO1xuICBmb3IgKGxldCBpID0gSEVBREVSX09GRlNFVDsgaSA8IHRWaWV3LmJpbmRpbmdTdGFydEluZGV4OyBpKyspIHtcbiAgICBsZXQgdGFyZ2V0Tm9kZTogTm9kZXxudWxsID0gbnVsbDtcbiAgICBjb25zdCBhZGp1c3RlZEluZGV4ID0gaSAtIEhFQURFUl9PRkZTRVQ7XG4gICAgY29uc3QgdE5vZGUgPSB0Vmlldy5kYXRhW2ldIGFzIFRDb250YWluZXJOb2RlO1xuICAgIC8vIHROb2RlIG1heSBiZSBudWxsIGluIHRoZSBjYXNlIG9mIGEgbG9jYWxSZWZcbiAgICBpZiAoIXROb2RlKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodE5vZGUucHJvamVjdGlvbikpIHtcbiAgICAgIC8vIFRPRE86IGhhbmRsZSBgUk5vZGVbXWAgYXMgd2VsbC5cbiAgICAgIGZvciAoY29uc3QgaGVhZFROb2RlIG9mICh0Tm9kZS5wcm9qZWN0aW9uIGFzIGFueVtdKSkge1xuICAgICAgICAvLyBXZSBtYXkgaGF2ZSBgbnVsbGBzIGluIHNsb3RzIHdpdGggbm8gcHJvamVjdGVkIGNvbnRlbnQuXG4gICAgICAgIC8vIEFsc28sIGlmIHdlIHByb2Nlc3MgcmUtcHJvamVjdGVkIGNvbnRlbnQgKGkuZS4gYDxuZy1jb250ZW50PmBcbiAgICAgICAgLy8gYXBwZWFycyBhdCBwcm9qZWN0aW9uIGxvY2F0aW9uKSwgc2tpcCBhbm5vdGF0aW9ucyBmb3IgdGhpcyBjb250ZW50XG4gICAgICAgIC8vIHNpbmNlIGFsbCBET00gbm9kZXMgaW4gdGhpcyBwcm9qZWN0aW9uIHdlcmUgaGFuZGxlZCB3aGlsZSBwcm9jZXNzaW5nXG4gICAgICAgIC8vIGEgcGFyZW50IGxWaWV3LCB3aGljaCBjb250YWlucyB0aG9zZSBub2Rlcy5cbiAgICAgICAgaWYgKGhlYWRUTm9kZSAmJiAhaXNQcm9qZWN0aW9uVE5vZGUoaGVhZFROb2RlKSkge1xuICAgICAgICAgIG5naC5ub2Rlc1toZWFkVE5vZGUuaW5kZXggLSBIRUFERVJfT0ZGU0VUXSA9IGNhbGNQYXRoRm9yTm9kZSh0VmlldywgbFZpZXcsIGhlYWRUTm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzTENvbnRhaW5lcihsVmlld1tpXSkpIHtcbiAgICAgIC8vIHRoaXMgaXMgYSBjb250YWluZXJcbiAgICAgIGNvbnN0IHROb2RlID0gdFZpZXcuZGF0YVtpXSBhcyBUQ29udGFpbmVyTm9kZTtcbiAgICAgIGNvbnN0IGVtYmVkZGVkVFZpZXcgPSB0Tm9kZS50Vmlld3M7XG4gICAgICBpZiAoZW1iZWRkZWRUVmlldyAhPT0gbnVsbCkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShlbWJlZGRlZFRWaWV3KSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0aW5nIHROb2RlLnRWaWV3cyB0byBiZSBhbiBvYmplY3QsIGJ1dCBpdCdzIGFuIGFycmF5LmApO1xuICAgICAgICB9XG4gICAgICAgIG5naC50ZW1wbGF0ZXMhW2kgLSBIRUFERVJfT0ZGU0VUXSA9IGdldFRWaWV3U3NySWQoZW1iZWRkZWRUVmlldyk7XG4gICAgICB9XG5cbiAgICAgIHRhcmdldE5vZGUgPSB1bndyYXBSTm9kZShsVmlld1tpXVtIT1NUXSEpIGFzIE5vZGU7XG4gICAgICBjb25zdCBjb250YWluZXIgPSBzZXJpYWxpemVMQ29udGFpbmVyKGxWaWV3W2ldLCBob3N0Tm9kZSwgYWRqdXN0ZWRJbmRleCk7XG4gICAgICBuZ2guY29udGFpbmVycyFbYWRqdXN0ZWRJbmRleF0gPSBjb250YWluZXI7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGxWaWV3W2ldKSkge1xuICAgICAgLy8gdGhpcyBpcyBhIGNvbXBvbmVudFxuICAgICAgdGFyZ2V0Tm9kZSA9IHVud3JhcFJOb2RlKGxWaWV3W2ldW0hPU1RdISkgYXMgRWxlbWVudDtcbiAgICAgIGFubm90YXRlRm9ySHlkcmF0aW9uKHRhcmdldE5vZGUgYXMgRWxlbWVudCwgbFZpZXdbaV0pO1xuICAgIH0gZWxzZSBpZiAoaXNUSTE4bk5vZGUodE5vZGUpKSB7XG4gICAgICAvLyBQcm9jZXNzIGkxOG4gdGV4dCBub2Rlcy4uLlxuICAgICAgY29uc3QgY3JlYXRlT3BDb2RlcyA9ICh0Tm9kZSBhcyBhbnkpLmNyZWF0ZTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3JlYXRlT3BDb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBvcENvZGUgPSBjcmVhdGVPcENvZGVzW2krK10gYXMgYW55O1xuICAgICAgICBjb25zdCBhcHBlbmROb3cgPVxuICAgICAgICAgICAgKG9wQ29kZSAmIEkxOG5DcmVhdGVPcENvZGUuQVBQRU5EX0VBR0VSTFkpID09PSBJMThuQ3JlYXRlT3BDb2RlLkFQUEVORF9FQUdFUkxZO1xuICAgICAgICBjb25zdCBpbmRleCA9IG9wQ29kZSA+Pj4gSTE4bkNyZWF0ZU9wQ29kZS5TSElGVDtcbiAgICAgICAgY29uc3QgdE5vZGUgPSB0Vmlldy5kYXRhW2luZGV4XSBhcyBUTm9kZTtcbiAgICAgICAgLy8gaWYgKGFwcGVuZE5vdykge1xuICAgICAgICBjb25zdCBwYXJlbnRUTm9kZSA9IGZpbmRDbG9zZXN0RWxlbWVudFROb2RlKHROb2RlKTtcbiAgICAgICAgY29uc3QgcGF0aCA9IGNhbGNQYXRoRm9yTm9kZSh0VmlldywgbFZpZXcsIHROb2RlLCBwYXJlbnRUTm9kZSk7XG4gICAgICAgIG5naC5ub2Rlc1t0Tm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVRdID0gcGF0aDtcbiAgICAgICAgLy8gfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodE5vZGUuaW5zZXJ0QmVmb3JlSW5kZXgpIHtcbiAgICAgIGRlYnVnZ2VyO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodE5vZGUuaW5zZXJ0QmVmb3JlSW5kZXgpICYmIHROb2RlLmluc2VydEJlZm9yZUluZGV4WzBdICE9PSBudWxsKSB7XG4gICAgICAgIC8vIEEgcm9vdCBub2RlIHdpdGhpbiBpMThuIGJsb2NrLlxuICAgICAgICAvLyBUT0RPOiBhZGQgYSBjb21tZW50IG9uICp3aHkqIHdlIG5lZWQgYSBwYXRoIGhlcmUuXG4gICAgICAgIGNvbnN0IHBhdGggPSBjYWxjUGF0aEZvck5vZGUodFZpZXcsIGxWaWV3LCB0Tm9kZSk7XG4gICAgICAgIG5naC5ub2Rlc1t0Tm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVRdID0gcGF0aDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdE5vZGVUeXBlID0gdE5vZGUudHlwZTtcbiAgICAgIC8vIDxuZy1jb250YWluZXI+IGNhc2VcbiAgICAgIGlmICh0Tm9kZVR5cGUgJiBUTm9kZVR5cGUuRWxlbWVudENvbnRhaW5lcikge1xuICAgICAgICBjb25zdCByb290Tm9kZXM6IGFueVtdID0gW107XG4gICAgICAgIGNvbGxlY3ROYXRpdmVOb2Rlcyh0VmlldywgbFZpZXcsIHROb2RlLmNoaWxkLCByb290Tm9kZXMpO1xuXG4gICAgICAgIC8vIFRoaXMgaXMgYW4gXCJlbGVtZW50XCIgY29udGFpbmVyICh2cyBcInZpZXdcIiBjb250YWluZXIpLFxuICAgICAgICAvLyBzbyBpdCdzIG9ubHkgcmVwcmVzZW50ZWQgYnkgdGhlIG51bWJlciBvZiB0b3AtbGV2ZWwgbm9kZXNcbiAgICAgICAgLy8gYXMgYSBzaGlmdCB0byBnZXQgdG8gYSBjb3JyZXNwb25kaW5nIGNvbW1lbnQgbm9kZS5cbiAgICAgICAgY29uc3QgY29udGFpbmVyOiBDb250YWluZXIgPSB7XG4gICAgICAgICAgdmlld3M6IFtdLFxuICAgICAgICAgIG51bVJvb3ROb2Rlczogcm9vdE5vZGVzLmxlbmd0aCxcbiAgICAgICAgfTtcblxuICAgICAgICBuZ2guY29udGFpbmVyc1thZGp1c3RlZEluZGV4XSA9IGNvbnRhaW5lcjtcbiAgICAgIH0gZWxzZSBpZiAodE5vZGVUeXBlICYgVE5vZGVUeXBlLlByb2plY3Rpb24pIHtcbiAgICAgICAgLy8gQ3VycmVudCBUTm9kZSBoYXMgbm8gRE9NIGVsZW1lbnQgYXNzb2NpYXRlZCB3aXRoIGl0LFxuICAgICAgICAvLyBzbyB0aGUgZm9sbG93aW5nIG5vZGUgd291bGQgbm90IGJlIGFibGUgdG8gZmluZCBhbiBhbmNob3IuXG4gICAgICAgIC8vIFVzZSBmdWxsIHBhdGggaW5zdGVhZC5cbiAgICAgICAgbGV0IG5leHRUTm9kZSA9IHROb2RlLm5leHQ7XG4gICAgICAgIHdoaWxlIChuZXh0VE5vZGUgIT09IG51bGwgJiYgKG5leHRUTm9kZS50eXBlICYgVE5vZGVUeXBlLlByb2plY3Rpb24pKSB7XG4gICAgICAgICAgbmV4dFROb2RlID0gbmV4dFROb2RlLm5leHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5leHRUTm9kZSkge1xuICAgICAgICAgIGNvbnN0IGluZGV4ID0gbmV4dFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgICAgICAgICBjb25zdCBwYXRoID0gY2FsY1BhdGhGb3JOb2RlKHRWaWV3LCBsVmlldywgbmV4dFROb2RlKTtcbiAgICAgICAgICBuZ2gubm9kZXNbaW5kZXhdID0gcGF0aDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gLi4uIG90aGVyd2lzZSwgdGhpcyBpcyBhIERPTSBlbGVtZW50LCBmb3Igd2hpY2ggd2UgbWF5IG5lZWQgdG9cbiAgICAgICAgLy8gc2VyaWFsaXplIGluIHNvbWUgY2FzZXMuXG4gICAgICAgIHRhcmdldE5vZGUgPSBsVmlld1tpXSBhcyBOb2RlO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHByb2plY3Rpb24gbmV4dCBpcyBub3QgdGhlIHNhbWUgYXMgbmV4dCwgaW4gd2hpY2ggY2FzZVxuICAgICAgICAvLyB0aGUgbm9kZSB3b3VsZCBub3QgYmUgZm91bmQgYXQgY3JlYXRpb24gdGltZSBhdCBydW50aW1lIGFuZCB3ZVxuICAgICAgICAvLyBuZWVkIHRvIHByb3ZpZGUgYSBsb2NhdGlvbiB0byB0aGF0IG5vZGUuXG4gICAgICAgIGlmICh0Tm9kZS5wcm9qZWN0aW9uTmV4dCAmJiB0Tm9kZS5wcm9qZWN0aW9uTmV4dCAhPT0gdE5vZGUubmV4dCkge1xuICAgICAgICAgIGNvbnN0IG5leHRQcm9qZWN0ZWRUTm9kZSA9IHROb2RlLnByb2plY3Rpb25OZXh0O1xuICAgICAgICAgIGNvbnN0IGluZGV4ID0gbmV4dFByb2plY3RlZFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgICAgICAgICBjb25zdCBwYXRoID0gY2FsY1BhdGhGb3JOb2RlKHRWaWV3LCBsVmlldywgbmV4dFByb2plY3RlZFROb2RlKTtcbiAgICAgICAgICBuZ2gubm9kZXNbaW5kZXhdID0gcGF0aDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gbmdoO1xufVxuXG5mdW5jdGlvbiBjYWxjUGF0aEZvck5vZGUoXG4gICAgdFZpZXc6IFRWaWV3LCBsVmlldzogTFZpZXcsIHROb2RlOiBUTm9kZSwgcGFyZW50VE5vZGU/OiBUTm9kZXxudWxsKTogc3RyaW5nIHtcbiAgY29uc3QgaW5kZXggPSB0Tm9kZS5pbmRleDtcbiAgLy8gSWYgYG51bGxgIGlzIHBhc3NlZCBleHBsaWNpdGx5LCB1c2UgdGhpcyBhcyBhIHNpZ25hbCB0aGF0IHdlIHdhbnQgdG8gY2FsY3VsYXRlXG4gIC8vIHRoZSBwYXRoIHN0YXJ0aW5nIGZyb20gYGxWaWV3W0hPU1RdYC5cbiAgcGFyZW50VE5vZGUgPSBwYXJlbnRUTm9kZSA9PT0gbnVsbCA/IG51bGwgOiAocGFyZW50VE5vZGUgfHwgdE5vZGUucGFyZW50ISk7XG4gIGNvbnN0IHBhcmVudEluZGV4ID0gcGFyZW50VE5vZGUgPT09IG51bGwgPyAnaG9zdCcgOiBwYXJlbnRUTm9kZS5pbmRleDtcbiAgY29uc3QgcGFyZW50Uk5vZGUgPVxuICAgICAgcGFyZW50VE5vZGUgPT09IG51bGwgPyBsVmlld1tIT1NUXSA6IHVud3JhcFJOb2RlKGxWaWV3W3BhcmVudEluZGV4IGFzIG51bWJlcl0pO1xuICBsZXQgck5vZGUgPSB1bndyYXBSTm9kZShsVmlld1tpbmRleF0pO1xuICBpZiAodE5vZGUudHlwZSAmIFROb2RlVHlwZS5BbnlDb250YWluZXIpIHtcbiAgICAvLyBGb3IgPG5nLWNvbnRhaW5lcj4gbm9kZXMsIGluc3RlYWQgb2Ygc2VyaWFsaXppbmcgYSByZWZlcmVuY2VcbiAgICAvLyB0byB0aGUgYW5jaG9yIGNvbW1lbnQgbm9kZSwgc2VyaWFsaXplIGEgbG9jYXRpb24gb2YgdGhlIGZpcnN0XG4gICAgLy8gRE9NIGVsZW1lbnQuIFBhaXJlZCB3aXRoIHRoZSBjb250YWluZXIgc2l6ZSAoc2VyaWFsaXplZCBhcyBhIHBhcnRcbiAgICAvLyBvZiBgbmdoLmNvbnRhaW5lcnNgKSwgaXQgc2hvdWxkIGdpdmUgZW5vdWdoIGluZm9ybWF0aW9uIGZvciBydW50aW1lXG4gICAgLy8gdG8gaHlkcmF0ZSBub2RlcyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgICAvL1xuICAgIC8vIE5vdGU6IGZvciBFbGVtZW50Q29udGFpbmVycyAoaS5lLiBgPG5nLWNvbnRhaW5lcj5gIGVsZW1lbnRzKSwgd2UgdXNlXG4gICAgLy8gYSBmaXJzdCBjaGlsZCBmcm9tIHRoZSB0Tm9kZSBkYXRhIHN0cnVjdHVyZXMsIHNpbmNlIHdlIHdhbnQgdG8gY29sbGVjdFxuICAgIC8vIGFkZCByb290IG5vZGVzIHN0YXJ0aW5nIGZyb20gdGhlIGZpcnN0IGNoaWxkIG5vZGUgaW4gYSBjb250YWluZXIuXG4gICAgY29uc3QgY2hpbGRUTm9kZSA9IHROb2RlLnR5cGUgJiBUTm9kZVR5cGUuRWxlbWVudENvbnRhaW5lciA/IHROb2RlLmNoaWxkIDogdE5vZGU7XG4gICAgY29uc3QgZmlyc3RSTm9kZSA9IGZpcnN0Uk5vZGVJbkVsZW1lbnRDb250YWluZXIodFZpZXcsIGxWaWV3LCBjaGlsZFROb2RlISk7XG4gICAgLy8gSWYgY29udGFpbmVyIGlzIG5vdCBlbXB0eSwgdXNlIGEgcmVmZXJlbmNlIHRvIHRoZSBmaXJzdCBlbGVtZW50LFxuICAgIC8vIG90aGVyd2lzZSwgck5vZGUgd291bGQgcG9pbnQgdG8gYW4gYW5jaG9yIGNvbW1lbnQgbm9kZS5cbiAgICBpZiAoZmlyc3RSTm9kZSkge1xuICAgICAgck5vZGUgPSBmaXJzdFJOb2RlO1xuICAgIH1cbiAgfVxuICBkZWJ1Z2dlcjtcbiAgY29uc3QgcGF0aDogc3RyaW5nW10gPSBuYXZpZ2F0ZUJldHdlZW4ocGFyZW50Uk5vZGUgYXMgTm9kZSwgck5vZGUgYXMgTm9kZSkubWFwKG9wID0+IHtcbiAgICBzd2l0Y2ggKG9wKSB7XG4gICAgICBjYXNlIE5vZGVOYXZpZ2F0aW9uU3RlcC5GaXJzdENoaWxkOlxuICAgICAgICByZXR1cm4gJ2ZpcnN0Q2hpbGQnO1xuICAgICAgY2FzZSBOb2RlTmF2aWdhdGlvblN0ZXAuTmV4dFNpYmxpbmc6XG4gICAgICAgIHJldHVybiAnbmV4dFNpYmxpbmcnO1xuICAgIH1cbiAgfSk7XG4gIGlmIChwYXJlbnRJbmRleCA9PT0gJ2hvc3QnKSB7XG4gICAgLy8gVE9ETzogYWRkIHN1cHBvcnQgZm9yIGBob3N0YCB0byB0aGUgYGxvY2F0ZU5leHRSTm9kZWAgZm4uXG4gICAgcGF0aC51bnNoaWZ0KHBhcmVudEluZGV4KTtcbiAgfSBlbHNlIHtcbiAgICBwYXRoLnVuc2hpZnQoJycgKyAocGFyZW50SW5kZXggLSBIRUFERVJfT0ZGU0VUKSk7XG4gIH1cbiAgcmV0dXJuIHBhdGguam9pbignLicpO1xufVxuXG5sZXQgc3NySWQ6IG51bWJlciA9IDA7XG5jb25zdCBzc3JJZE1hcCA9IG5ldyBNYXA8VFZpZXcsIHN0cmluZz4oKTtcblxuZnVuY3Rpb24gZ2V0VFZpZXdTc3JJZCh0VmlldzogVFZpZXcpOiBzdHJpbmcge1xuICBpZiAoIXNzcklkTWFwLmhhcyh0VmlldykpIHtcbiAgICBzc3JJZE1hcC5zZXQodFZpZXcsIGB0JHtzc3JJZCsrfWApO1xuICB9XG4gIHJldHVybiBzc3JJZE1hcC5nZXQodFZpZXcpITtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplTENvbnRhaW5lcihsQ29udGFpbmVyOiBMQ29udGFpbmVyLCBob3N0Tm9kZTogRWxlbWVudCwgYW5jaG9yOiBudW1iZXIpOiBDb250YWluZXIge1xuICBjb25zdCBjb250YWluZXI6IENvbnRhaW5lciA9IHtcbiAgICB2aWV3czogW10sXG4gIH07XG5cbiAgZm9yIChsZXQgaSA9IENPTlRBSU5FUl9IRUFERVJfT0ZGU0VUOyBpIDwgbENvbnRhaW5lci5sZW5ndGg7IGkrKykge1xuICAgIGxldCBjaGlsZExWaWV3ID0gbENvbnRhaW5lcltpXSBhcyBMVmlldztcblxuICAgIC8vIEdldCBMVmlldyBmb3IgdW5kZXJseWluZyBjb21wb25lbnQuXG4gICAgaWYgKGlzUm9vdFZpZXcoY2hpbGRMVmlldykpIHtcbiAgICAgIGNoaWxkTFZpZXcgPSBjaGlsZExWaWV3W0hFQURFUl9PRkZTRVRdO1xuICAgIH1cbiAgICBjb25zdCBjaGlsZFRWaWV3ID0gY2hpbGRMVmlld1tUVklFV107XG5cbiAgICBsZXQgdGVtcGxhdGU7XG4gICAgaWYgKGNoaWxkVFZpZXcudHlwZSA9PT0gVFZpZXdUeXBlLkNvbXBvbmVudCkge1xuICAgICAgY29uc3QgY3R4ID0gY2hpbGRMVmlld1tDT05URVhUXTtcbiAgICAgIC8vIFRPRE86IHRoaXMgaXMgYSBoYWNrICh3ZSBjYXB0dXJlIGEgY29tcG9uZW50IGhvc3QgZWxlbWVudCBuYW1lKSxcbiAgICAgIC8vIHdlIG5lZWQgYSBtb3JlIHN0YWJsZSBzb2x1dGlvbiBoZXJlLCBmb3IgZXguIGEgd2F5IHRvIGdlbmVyYXRlXG4gICAgICAvLyBhIGNvbXBvbmVudCBpZC5cbiAgICAgIHRlbXBsYXRlID0gKGN0eCEuY29uc3RydWN0b3IgYXMgYW55KVsnybVjbXAnXS5zZWxlY3RvcnNbMF1bMF07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRlbXBsYXRlID0gZ2V0VFZpZXdTc3JJZChjaGlsZFRWaWV3KTtcbiAgICB9XG5cbiAgICBjb25zdCByb290Tm9kZXM6IGFueVtdID0gW107XG4gICAgY29sbGVjdE5hdGl2ZU5vZGVzKGNoaWxkVFZpZXcsIGNoaWxkTFZpZXcsIGNoaWxkVFZpZXcuZmlyc3RDaGlsZCwgcm9vdE5vZGVzKTtcblxuICAgIGNvbnRhaW5lci52aWV3cy5wdXNoKHtcbiAgICAgIHRlbXBsYXRlLCAgLy8gZnJvbSB3aGljaCB0ZW1wbGF0ZSBkaWQgdGhpcyBsVmlldyBvcmlnaW5hdGU/XG4gICAgICBudW1Sb290Tm9kZXM6IHJvb3ROb2Rlcy5sZW5ndGgsXG4gICAgICAuLi5zZXJpYWxpemVMVmlldyhsQ29udGFpbmVyW2ldIGFzIExWaWV3LCBob3N0Tm9kZSksXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gY29udGFpbmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TFZpZXdGcm9tUm9vdEVsZW1lbnQoZWxlbWVudDogRWxlbWVudCk6IExWaWV3IHtcbiAgY29uc3QgTU9OS0VZX1BBVENIX0tFWV9OQU1FID0gJ19fbmdDb250ZXh0X18nO1xuICBjb25zdCBkYXRhID0gKGVsZW1lbnQgYXMgYW55KVtNT05LRVlfUEFUQ0hfS0VZX05BTUVdO1xuICBsZXQgbFZpZXcgPSB0eXBlb2YgZGF0YSA9PT0gJ251bWJlcicgPyBnZXRMVmlld0J5SWQoZGF0YSkgOiBkYXRhIHx8IG51bGw7XG4gIGlmICghbFZpZXcpIHRocm93IG5ldyBFcnJvcignbm90IGZvdW5kJyk7ICAvLyBUT0RPOiBpcyBpdCBwb3NzaWJsZT9cblxuICBpZiAoaXNSb290VmlldyhsVmlldykpIHtcbiAgICBsVmlldyA9IGxWaWV3W0hFQURFUl9PRkZTRVRdO1xuICB9XG4gIHJldHVybiBsVmlldztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFubm90YXRlRm9ySHlkcmF0aW9uKGVsZW1lbnQ6IEVsZW1lbnQsIGxWaWV3OiBMVmlldyk6IHZvaWQge1xuICBjb25zdCByYXdOZ2ggPSBzZXJpYWxpemVMVmlldyhsVmlldywgZWxlbWVudCk7XG4gIGNvbnN0IHNlcmlhbGl6ZWROZ2ggPSBKU09OLnN0cmluZ2lmeShyYXdOZ2gpO1xuICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnbmdoJywgc2VyaWFsaXplZE5naCk7XG4gIGRlYnVnZ2VyO1xufVxuXG5mdW5jdGlvbiBfcmVuZGVyPFQ+KFxuICAgIHBsYXRmb3JtOiBQbGF0Zm9ybVJlZixcbiAgICBib290c3RyYXBQcm9taXNlOiBQcm9taXNlPE5nTW9kdWxlUmVmPFQ+fEFwcGxpY2F0aW9uUmVmPik6IFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBib290c3RyYXBQcm9taXNlLnRoZW4oKG1vZHVsZU9yQXBwbGljYXRpb25SZWYpID0+IHtcbiAgICBjb25zdCBlbnZpcm9ubWVudEluamVjdG9yID0gbW9kdWxlT3JBcHBsaWNhdGlvblJlZi5pbmplY3RvcjtcbiAgICBjb25zdCB0cmFuc2l0aW9uSWQgPSBlbnZpcm9ubWVudEluamVjdG9yLmdldCjJtVRSQU5TSVRJT05fSUQsIG51bGwpO1xuICAgIGlmICghdHJhbnNpdGlvbklkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYHJlbmRlck1vZHVsZVtGYWN0b3J5XSgpIHJlcXVpcmVzIHRoZSB1c2Ugb2YgQnJvd3Nlck1vZHVsZS53aXRoU2VydmVyVHJhbnNpdGlvbigpIHRvIGVuc3VyZVxudGhlIHNlcnZlci1yZW5kZXJlZCBhcHAgY2FuIGJlIHByb3Blcmx5IGJvb3RzdHJhcHBlZCBpbnRvIGEgY2xpZW50IGFwcC5gKTtcbiAgICB9XG4gICAgY29uc3QgYXBwbGljYXRpb25SZWY6IEFwcGxpY2F0aW9uUmVmID0gbW9kdWxlT3JBcHBsaWNhdGlvblJlZiBpbnN0YW5jZW9mIEFwcGxpY2F0aW9uUmVmID9cbiAgICAgICAgbW9kdWxlT3JBcHBsaWNhdGlvblJlZiA6XG4gICAgICAgIGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KEFwcGxpY2F0aW9uUmVmKTtcbiAgICBjb25zdCBzZXJ2ZXJDb250ZXh0ID1cbiAgICAgICAgc2FuaXRpemVTZXJ2ZXJDb250ZXh0KGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KFNFUlZFUl9DT05URVhULCBERUZBVUxUX1NFUlZFUl9DT05URVhUKSk7XG4gICAgcmV0dXJuIGFwcGxpY2F0aW9uUmVmLmlzU3RhYmxlLnBpcGUoZmlyc3QoKGlzU3RhYmxlOiBib29sZWFuKSA9PiBpc1N0YWJsZSkpXG4gICAgICAgIC50b1Byb21pc2UoKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgYXBwZW5kU2VydmVyQ29udGV4dEluZm8oc2VydmVyQ29udGV4dCwgYXBwbGljYXRpb25SZWYpO1xuXG4gICAgICAgICAgY29uc3QgcGxhdGZvcm1TdGF0ZSA9IHBsYXRmb3JtLmluamVjdG9yLmdldChQbGF0Zm9ybVN0YXRlKTtcblxuICAgICAgICAgIGNvbnN0IGFzeW5jUHJvbWlzZXM6IFByb21pc2U8YW55PltdID0gW107XG5cbiAgICAgICAgICAvLyBSdW4gYW55IEJFRk9SRV9BUFBfU0VSSUFMSVpFRCBjYWxsYmFja3MganVzdCBiZWZvcmUgcmVuZGVyaW5nIHRvIHN0cmluZy5cbiAgICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBlbnZpcm9ubWVudEluamVjdG9yLmdldChCRUZPUkVfQVBQX1NFUklBTElaRUQsIG51bGwpO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjYWxsYmFjayBvZiBjYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYWxsYmFja1Jlc3VsdCA9IGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgaWYgKMm1aXNQcm9taXNlKGNhbGxiYWNrUmVzdWx0KSkge1xuICAgICAgICAgICAgICAgICAgLy8gVE9ETzogaW4gVFMzLjcsIGNhbGxiYWNrUmVzdWx0IGlzIHZvaWQuXG4gICAgICAgICAgICAgICAgICBhc3luY1Byb21pc2VzLnB1c2goY2FsbGJhY2tSZXN1bHQgYXMgYW55KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXhjZXB0aW9ucy5cbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0lnbm9yaW5nIEJFRk9SRV9BUFBfU0VSSUFMSVpFRCBFeGNlcHRpb246ICcsIGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgY29tcGxldGUgPSAoKSA9PiB7XG4gICAgICAgICAgICBhcHBsaWNhdGlvblJlZi5jb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudFJlZikgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gY29tcG9uZW50UmVmLmxvY2F0aW9uLm5hdGl2ZUVsZW1lbnQ7XG4gICAgICAgICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgYW5ub3RhdGVGb3JIeWRyYXRpb24oZWxlbWVudCwgZ2V0TFZpZXdGcm9tUm9vdEVsZW1lbnQoZWxlbWVudCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3Qgb3V0cHV0ID0gcGxhdGZvcm1TdGF0ZS5yZW5kZXJUb1N0cmluZygpO1xuICAgICAgICAgICAgcGxhdGZvcm0uZGVzdHJveSgpO1xuICAgICAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKGFzeW5jUHJvbWlzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcGxldGUoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gUHJvbWlzZVxuICAgICAgICAgICAgICAuYWxsKGFzeW5jUHJvbWlzZXMubWFwKChhc3luY1Byb21pc2UpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXN5bmNQcm9taXNlLmNhdGNoKChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0lnbm9yaW5nIEJFRk9SRV9BUFBfU0VSSUFMSVpFRCBFeGNlcHRpb246ICcsIGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgLnRoZW4oY29tcGxldGUpO1xuICAgICAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogU3BlY2lmaWVzIHRoZSB2YWx1ZSB0aGF0IHNob3VsZCBiZSB1c2VkIGlmIG5vIHNlcnZlciBjb250ZXh0IHZhbHVlIGhhcyBiZWVuIHByb3ZpZGVkLlxuICovXG5jb25zdCBERUZBVUxUX1NFUlZFUl9DT05URVhUID0gJ290aGVyJztcblxuLyoqXG4gKiBBbiBpbnRlcm5hbCB0b2tlbiB0aGF0IGFsbG93cyBwcm92aWRpbmcgZXh0cmEgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHNlcnZlciBjb250ZXh0XG4gKiAoZS5nLiB3aGV0aGVyIFNTUiBvciBTU0cgd2FzIHVzZWQpLiBUaGUgdmFsdWUgaXMgYSBzdHJpbmcgYW5kIGNoYXJhY3RlcnMgb3RoZXJcbiAqIHRoYW4gW2EtekEtWjAtOVxcLV0gYXJlIHJlbW92ZWQuIFNlZSB0aGUgZGVmYXVsdCB2YWx1ZSBpbiBgREVGQVVMVF9TRVJWRVJfQ09OVEVYVGAgY29uc3QuXG4gKi9cbmV4cG9ydCBjb25zdCBTRVJWRVJfQ09OVEVYVCA9IG5ldyBJbmplY3Rpb25Ub2tlbjxzdHJpbmc+KCdTRVJWRVJfQ09OVEVYVCcpO1xuXG4vKipcbiAqIFNhbml0aXplcyBwcm92aWRlZCBzZXJ2ZXIgY29udGV4dDpcbiAqIC0gcmVtb3ZlcyBhbGwgY2hhcmFjdGVycyBvdGhlciB0aGFuIGEteiwgQS1aLCAwLTkgYW5kIGAtYFxuICogLSByZXR1cm5zIGBvdGhlcmAgaWYgbm90aGluZyBpcyBwcm92aWRlZCBvciB0aGUgc3RyaW5nIGlzIGVtcHR5IGFmdGVyIHNhbml0aXphdGlvblxuICovXG5mdW5jdGlvbiBzYW5pdGl6ZVNlcnZlckNvbnRleHQoc2VydmVyQ29udGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY29udGV4dCA9IHNlcnZlckNvbnRleHQucmVwbGFjZSgvW15hLXpBLVowLTlcXC1dL2csICcnKTtcbiAgcmV0dXJuIGNvbnRleHQubGVuZ3RoID4gMCA/IGNvbnRleHQgOiBERUZBVUxUX1NFUlZFUl9DT05URVhUO1xufVxuXG4vKipcbiAqIEJvb3RzdHJhcHMgYW4gYXBwbGljYXRpb24gdXNpbmcgcHJvdmlkZWQgTmdNb2R1bGUgYW5kIHNlcmlhbGl6ZXMgdGhlIHBhZ2UgY29udGVudCB0byBzdHJpbmcuXG4gKlxuICogQHBhcmFtIG1vZHVsZVR5cGUgQSByZWZlcmVuY2UgdG8gYW4gTmdNb2R1bGUgdGhhdCBzaG91bGQgYmUgdXNlZCBmb3IgYm9vdHN0cmFwLlxuICogQHBhcmFtIG9wdGlvbnMgQWRkaXRpb25hbCBjb25maWd1cmF0aW9uIGZvciB0aGUgcmVuZGVyIG9wZXJhdGlvbjpcbiAqICAtIGBkb2N1bWVudGAgLSB0aGUgZG9jdW1lbnQgb2YgdGhlIHBhZ2UgdG8gcmVuZGVyLCBlaXRoZXIgYXMgYW4gSFRNTCBzdHJpbmcgb3JcbiAqICAgICAgICAgICAgICAgICBhcyBhIHJlZmVyZW5jZSB0byB0aGUgYGRvY3VtZW50YCBpbnN0YW5jZS5cbiAqICAtIGB1cmxgIC0gdGhlIFVSTCBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKiAgLSBgZXh0cmFQcm92aWRlcnNgIC0gc2V0IG9mIHBsYXRmb3JtIGxldmVsIHByb3ZpZGVycyBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyTW9kdWxlPFQ+KFxuICAgIG1vZHVsZVR5cGU6IFR5cGU8VD4sXG4gICAgb3B0aW9uczoge2RvY3VtZW50Pzogc3RyaW5nfERvY3VtZW50OyB1cmw/OiBzdHJpbmc7IGV4dHJhUHJvdmlkZXJzPzogU3RhdGljUHJvdmlkZXJbXX0pOlxuICAgIFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHtkb2N1bWVudCwgdXJsLCBleHRyYVByb3ZpZGVyczogcGxhdGZvcm1Qcm92aWRlcnN9ID0gb3B0aW9ucztcbiAgY29uc3QgcGxhdGZvcm0gPSBfZ2V0UGxhdGZvcm0ocGxhdGZvcm1EeW5hbWljU2VydmVyLCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnN9KTtcbiAgcmV0dXJuIF9yZW5kZXIocGxhdGZvcm0sIHBsYXRmb3JtLmJvb3RzdHJhcE1vZHVsZShtb2R1bGVUeXBlKSk7XG59XG5cbi8qKlxuICogQm9vdHN0cmFwcyBhbiBpbnN0YW5jZSBvZiBhbiBBbmd1bGFyIGFwcGxpY2F0aW9uIGFuZCByZW5kZXJzIGl0IHRvIGEgc3RyaW5nLlxuICpcbiAqIE5vdGU6IHRoZSByb290IGNvbXBvbmVudCBwYXNzZWQgaW50byB0aGlzIGZ1bmN0aW9uICptdXN0KiBiZSBhIHN0YW5kYWxvbmUgb25lIChzaG91bGQgaGF2ZSB0aGVcbiAqIGBzdGFuZGFsb25lOiB0cnVlYCBmbGFnIGluIHRoZSBgQENvbXBvbmVudGAgZGVjb3JhdG9yIGNvbmZpZykuXG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogQENvbXBvbmVudCh7XG4gKiAgIHN0YW5kYWxvbmU6IHRydWUsXG4gKiAgIHRlbXBsYXRlOiAnSGVsbG8gd29ybGQhJ1xuICogfSlcbiAqIGNsYXNzIFJvb3RDb21wb25lbnQge31cbiAqXG4gKiBjb25zdCBvdXRwdXQ6IHN0cmluZyA9IGF3YWl0IHJlbmRlckFwcGxpY2F0aW9uKFJvb3RDb21wb25lbnQsIHthcHBJZDogJ3NlcnZlci1hcHAnfSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gcm9vdENvbXBvbmVudCBBIHJlZmVyZW5jZSB0byBhIFN0YW5kYWxvbmUgQ29tcG9uZW50IHRoYXQgc2hvdWxkIGJlIHJlbmRlcmVkLlxuICogQHBhcmFtIG9wdGlvbnMgQWRkaXRpb25hbCBjb25maWd1cmF0aW9uIGZvciB0aGUgcmVuZGVyIG9wZXJhdGlvbjpcbiAqICAtIGBhcHBJZGAgLSBhIHN0cmluZyBpZGVudGlmaWVyIG9mIHRoaXMgYXBwbGljYXRpb24uIFRoZSBhcHBJZCBpcyB1c2VkIHRvIHByZWZpeCBhbGxcbiAqICAgICAgICAgICAgICBzZXJ2ZXItZ2VuZXJhdGVkIHN0eWxpbmdzIGFuZCBzdGF0ZSBrZXlzIG9mIHRoZSBhcHBsaWNhdGlvbiBpbiBUcmFuc2ZlclN0YXRlXG4gKiAgICAgICAgICAgICAgdXNlLWNhc2VzLlxuICogIC0gYGRvY3VtZW50YCAtIHRoZSBkb2N1bWVudCBvZiB0aGUgcGFnZSB0byByZW5kZXIsIGVpdGhlciBhcyBhbiBIVE1MIHN0cmluZyBvclxuICogICAgICAgICAgICAgICAgIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBgZG9jdW1lbnRgIGluc3RhbmNlLlxuICogIC0gYHVybGAgLSB0aGUgVVJMIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqICAtIGBwcm92aWRlcnNgIC0gc2V0IG9mIGFwcGxpY2F0aW9uIGxldmVsIHByb3ZpZGVycyBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKiAgLSBgcGxhdGZvcm1Qcm92aWRlcnNgIC0gdGhlIHBsYXRmb3JtIGxldmVsIHByb3ZpZGVycyBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKlxuICogQHJldHVybnMgQSBQcm9taXNlLCB0aGF0IHJldHVybnMgc2VyaWFsaXplZCAodG8gYSBzdHJpbmcpIHJlbmRlcmVkIHBhZ2UsIG9uY2UgcmVzb2x2ZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckFwcGxpY2F0aW9uPFQ+KHJvb3RDb21wb25lbnQ6IFR5cGU8VD4sIG9wdGlvbnM6IHtcbiAgYXBwSWQ6IHN0cmluZztcbiAgZG9jdW1lbnQ/OiBzdHJpbmcgfCBEb2N1bWVudDtcbiAgdXJsPzogc3RyaW5nO1xuICBwcm92aWRlcnM/OiBBcnJheTxQcm92aWRlcnxFbnZpcm9ubWVudFByb3ZpZGVycz47XG4gIHBsYXRmb3JtUHJvdmlkZXJzPzogUHJvdmlkZXJbXTtcbn0pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnMsIGFwcElkfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtRHluYW1pY1NlcnZlciwge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzfSk7XG4gIGNvbnN0IGFwcFByb3ZpZGVycyA9IFtcbiAgICBpbXBvcnRQcm92aWRlcnNGcm9tKEJyb3dzZXJNb2R1bGUud2l0aFNlcnZlclRyYW5zaXRpb24oe2FwcElkfSkpLFxuICAgIGltcG9ydFByb3ZpZGVyc0Zyb20oU2VydmVyTW9kdWxlKSxcbiAgICAuLi5UUkFOU0ZFUl9TVEFURV9TRVJJQUxJWkFUSU9OX1BST1ZJREVSUyxcbiAgICAuLi4ob3B0aW9ucy5wcm92aWRlcnMgPz8gW10pLFxuICBdO1xuICByZXR1cm4gX3JlbmRlcihwbGF0Zm9ybSwgaW50ZXJuYWxDcmVhdGVBcHBsaWNhdGlvbih7cm9vdENvbXBvbmVudCwgYXBwUHJvdmlkZXJzfSkpO1xufVxuXG4vKipcbiAqIEJvb3RzdHJhcHMgYW4gYXBwbGljYXRpb24gdXNpbmcgcHJvdmlkZWQge0BsaW5rIE5nTW9kdWxlRmFjdG9yeX0gYW5kIHNlcmlhbGl6ZXMgdGhlIHBhZ2UgY29udGVudFxuICogdG8gc3RyaW5nLlxuICpcbiAqIEBwYXJhbSBtb2R1bGVGYWN0b3J5IEFuIGluc3RhbmNlIG9mIHRoZSB7QGxpbmsgTmdNb2R1bGVGYWN0b3J5fSB0aGF0IHNob3VsZCBiZSB1c2VkIGZvclxuICogICAgIGJvb3RzdHJhcC5cbiAqIEBwYXJhbSBvcHRpb25zIEFkZGl0aW9uYWwgY29uZmlndXJhdGlvbiBmb3IgdGhlIHJlbmRlciBvcGVyYXRpb246XG4gKiAgLSBgZG9jdW1lbnRgIC0gdGhlIGRvY3VtZW50IG9mIHRoZSBwYWdlIHRvIHJlbmRlciwgZWl0aGVyIGFzIGFuIEhUTUwgc3RyaW5nIG9yXG4gKiAgICAgICAgICAgICAgICAgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGBkb2N1bWVudGAgaW5zdGFuY2UuXG4gKiAgLSBgdXJsYCAtIHRoZSBVUkwgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYGV4dHJhUHJvdmlkZXJzYCAtIHNldCBvZiBwbGF0Zm9ybSBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqXG4gKiBAZGVwcmVjYXRlZFxuICogVGhpcyBzeW1ib2wgaXMgbm8gbG9uZ2VyIG5lY2Vzc2FyeSBhcyBvZiBBbmd1bGFyIHYxMy5cbiAqIFVzZSB7QGxpbmsgcmVuZGVyTW9kdWxlfSBBUEkgaW5zdGVhZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlck1vZHVsZUZhY3Rvcnk8VD4oXG4gICAgbW9kdWxlRmFjdG9yeTogTmdNb2R1bGVGYWN0b3J5PFQ+LFxuICAgIG9wdGlvbnM6IHtkb2N1bWVudD86IHN0cmluZzsgdXJsPzogc3RyaW5nOyBleHRyYVByb3ZpZGVycz86IFN0YXRpY1Byb3ZpZGVyW119KTpcbiAgICBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7ZG9jdW1lbnQsIHVybCwgZXh0cmFQcm92aWRlcnM6IHBsYXRmb3JtUHJvdmlkZXJzfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtU2VydmVyLCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnN9KTtcbiAgcmV0dXJuIF9yZW5kZXIocGxhdGZvcm0sIHBsYXRmb3JtLmJvb3RzdHJhcE1vZHVsZUZhY3RvcnkobW9kdWxlRmFjdG9yeSkpO1xufVxuIl19