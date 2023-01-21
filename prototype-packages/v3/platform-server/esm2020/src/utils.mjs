/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ApplicationRef, importProvidersFrom, InjectionToken, Renderer2, ɵcollectNativeNodes as collectNativeNodes, ɵCONTAINER_HEADER_OFFSET as CONTAINER_HEADER_OFFSET, ɵCONTEXT as CONTEXT, ɵgetLViewById as getLViewById, ɵHEADER_OFFSET as HEADER_OFFSET, ɵHOST as HOST, ɵinternalCreateApplication as internalCreateApplication, ɵisPromise, ɵisRootView as isRootView, ɵnavigateParentTNodes as navigateParentTNodes, ɵTVIEW as TVIEW, ɵTYPE as TYPE, ɵunwrapRNode as unwrapRNode } from '@angular/core';
import { BrowserModule, ɵTRANSITION_ID } from '@angular/platform-browser';
import { first } from 'rxjs/operators';
import { navigateBetween, NodeNavigationStep } from './node_nav';
import { PlatformState } from './platform_state';
import { platformDynamicServer, platformServer, ServerModule } from './server';
import { BEFORE_APP_SERIALIZED, INITIAL_CONFIG } from './tokens';
import { TRANSFER_STATE_SERIALIZATION_PROVIDERS } from './transfer_state';
const NG_NON_HYDRATABLE = 'ngNonHydratable';
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
function hasNgNonHydratableAttr(tNode) {
    // TODO: we need to iterate over `tNode.mergedAttrs` better
    // to avoid cases when `ngNonHydratable` is an attribute value,
    // e.g. `<div title="ngNonHydratable"></div>`.
    return !!tNode.mergedAttrs?.includes('ngNonHydratable');
}
function isInNonHydratableBlock(tNode, lView) {
    const foundTNode = navigateParentTNodes(tNode, lView, hasNgNonHydratableAttr);
    // in a block when we have a TNode and it's different than the root node
    return foundTNode !== null && foundTNode !== tNode;
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
                    if (!isInNonHydratableBlock(headTNode, lView)) {
                        ngh.nodes[headTNode.index - HEADER_OFFSET] = calcPathForNode(tView, lView, headTNode);
                    }
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
                // Check to see if it has ngNonHydratable
                targetNode = unwrapRNode(hostNode);
                if (!targetNode.hasAttribute(NG_NON_HYDRATABLE)) {
                    annotateForHydration(targetNode, hostNode);
                }
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
            // Check to see if it has ngNonHydratable
            targetNode = unwrapRNode(lView[i][HOST]);
            if (!targetNode.hasAttribute('ngNonHydratable')) {
                annotateForHydration(targetNode, lView[i]);
            }
        }
        else if (isTI18nNode(tNode)) {
            // Process i18n text nodes...
            const createOpCodes = tNode.create;
            for (let i = 0; i < createOpCodes.length; i++) {
                const opCode = createOpCodes[i++];
                const appendNow = (opCode & I18nCreateOpCode.APPEND_EAGERLY) === I18nCreateOpCode.APPEND_EAGERLY;
                const index = opCode >>> I18nCreateOpCode.SHIFT;
                const tNode = tView.data[index];
                if (!isInNonHydratableBlock(tNode, lView)) {
                    // if (appendNow) {
                    const parentTNode = findClosestElementTNode(tNode);
                    const path = calcPathForNode(tView, lView, tNode, parentTNode);
                    ngh.nodes[tNode.index - HEADER_OFFSET] = path;
                }
                // }
            }
        }
        else if (tNode.insertBeforeIndex) {
            if (Array.isArray(tNode.insertBeforeIndex) && tNode.insertBeforeIndex[0] !== null) {
                // A root node within i18n block.
                // TODO: add a comment on *why* we need a path here.
                if (!isInNonHydratableBlock(tNode, lView)) {
                    const path = calcPathForNode(tView, lView, tNode);
                    ngh.nodes[tNode.index - HEADER_OFFSET] = path;
                }
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
                    if (!isInNonHydratableBlock(nextTNode, lView)) {
                        const path = calcPathForNode(tView, lView, nextTNode);
                        ngh.nodes[index] = path;
                    }
                }
            }
            else {
                // Check if projection next is not the same as next, in which case
                // the node would not be found at creation time at runtime and we
                // need to provide a location to that node.
                if (tNode.projectionNext && tNode.projectionNext !== tNode.next) {
                    const nextProjectedTNode = tNode.projectionNext;
                    const index = nextProjectedTNode.index - HEADER_OFFSET;
                    if (!isInNonHydratableBlock(nextProjectedTNode, lView)) {
                        const path = calcPathForNode(tView, lView, nextProjectedTNode);
                        ngh.nodes[index] = path;
                    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1zZXJ2ZXIvc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxjQUFjLEVBQXdCLG1CQUFtQixFQUFFLGNBQWMsRUFBdUQsU0FBUyxFQUF3QixtQkFBbUIsSUFBSSxrQkFBa0IsRUFBRSx3QkFBd0IsSUFBSSx1QkFBdUIsRUFBRSxRQUFRLElBQUksT0FBTyxFQUFFLGFBQWEsSUFBSSxZQUFZLEVBQUUsY0FBYyxJQUFJLGFBQWEsRUFBRSxLQUFLLElBQUksSUFBSSxFQUFFLDBCQUEwQixJQUFJLHlCQUF5QixFQUFFLFVBQVUsRUFBRSxXQUFXLElBQUksVUFBVSxFQUE4QyxxQkFBcUIsSUFBSSxvQkFBb0IsRUFBZ0csTUFBTSxJQUFJLEtBQUssRUFBNEMsS0FBSyxJQUFJLElBQUksRUFBRSxZQUFZLElBQUksV0FBVyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ2x3QixPQUFPLEVBQUMsYUFBYSxFQUFFLGNBQWMsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBQ3hFLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVyQyxPQUFPLEVBQUMsZUFBZSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQy9ELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQUMscUJBQXFCLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3RSxPQUFPLEVBQUMscUJBQXFCLEVBQUUsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQy9ELE9BQU8sRUFBQyxzQ0FBc0MsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBUXhFLE1BQU0saUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7QUFFNUMsU0FBUyxZQUFZLENBQ2pCLGVBQWtFLEVBQ2xFLE9BQXdCO0lBQzFCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLENBQUM7SUFDdkQsT0FBTyxlQUFlLENBQUM7UUFDckIsRUFBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxFQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUM7UUFDbkYsY0FBYztLQUNmLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFTLHVCQUF1QixDQUFDLGFBQXFCLEVBQUUsY0FBOEI7SUFDcEYsY0FBYyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRTtRQUNqRCxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztRQUNwRCxJQUFJLE9BQU8sRUFBRTtZQUNYLFFBQVEsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1NBQ3BFO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsa0VBQWtFO0FBQ2xFLE1BQU0sQ0FBTixJQUFZLGdCQUlYO0FBSkQsV0FBWSxnQkFBZ0I7SUFDMUIseURBQVMsQ0FBQTtJQUNULDJFQUFxQixDQUFBO0lBQ3JCLDZEQUFjLENBQUE7QUFDaEIsQ0FBQyxFQUpXLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFJM0I7QUF5QkQsTUFBTSxVQUFVLFlBQVksQ0FBQyxLQUFxQztJQUNoRSxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQztBQUN0RCxDQUFDO0FBRUQsU0FBUyw0QkFBNEIsQ0FBQyxLQUFZLEVBQUUsS0FBWSxFQUFFLEtBQVk7SUFDNUUsTUFBTSxTQUFTLEdBQVUsRUFBRSxDQUFDO0lBQzVCLGlGQUFpRjtJQUNqRiw4REFBOEQ7SUFDOUQsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbkQsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEIsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsS0FBWTtJQUNyQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksZ0NBQXVCLENBQUMsa0NBQXlCLENBQUM7QUFDdEUsQ0FBQztBQUVELE1BQU0sVUFBVSxXQUFXLENBQUMsR0FBUTtJQUNsQyw4Q0FBOEM7SUFDOUMsT0FBTyxHQUFHLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdEUsQ0FBQztBQUVELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxLQUFpQjtJQUN2RCxJQUFJLFdBQVcsR0FBZSxLQUFLLENBQUM7SUFDcEMsOERBQThEO0lBQzlELHdEQUF3RDtJQUN4RCxPQUFPLFdBQVcsS0FBSyxJQUFJO1FBQ3BCLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSw0QkFBb0IsQ0FBQyw4QkFBc0I7WUFDNUQsV0FBVyxDQUFDLGlCQUFpQixLQUFLLElBQUksQ0FBQyxFQUFFO1FBQy9DLEtBQUssR0FBRyxXQUFXLENBQUM7UUFDcEIsV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7S0FDNUI7SUFDRCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDO0FBRUQsU0FBUyxzQkFBc0IsQ0FBQyxLQUFZO0lBQzFDLDJEQUEyRDtJQUMzRCwrREFBK0Q7SUFDL0QsOENBQThDO0lBQzlDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDMUQsQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUMsS0FBWSxFQUFFLEtBQVk7SUFDeEQsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsS0FBYyxFQUFFLEtBQUssRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3ZGLHdFQUF3RTtJQUN4RSxPQUFPLFVBQVUsS0FBSyxJQUFJLElBQUksVUFBVSxLQUFLLEtBQUssQ0FBQztBQUNyRCxDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsS0FBWSxFQUFFLFFBQWlCO0lBQ3JELE1BQU0sR0FBRyxHQUFZO1FBQ25CLFVBQVUsRUFBRSxFQUFFO1FBQ2QsU0FBUyxFQUFFLEVBQUU7UUFDYixLQUFLLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFFRixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxhQUFhLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM1RCxJQUFJLFVBQVUsR0FBYyxJQUFJLENBQUM7UUFDakMsTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFHLGFBQWEsQ0FBQztRQUN4QyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBbUIsQ0FBQztRQUM5Qyw4Q0FBOEM7UUFDOUMsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLFNBQVM7U0FDVjtRQUNELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDbkMsa0NBQWtDO1lBQ2xDLEtBQUssTUFBTSxTQUFTLElBQUssS0FBSyxDQUFDLFVBQW9CLEVBQUU7Z0JBQ25ELDBEQUEwRDtnQkFDMUQsZ0VBQWdFO2dCQUNoRSxxRUFBcUU7Z0JBQ3JFLHVFQUF1RTtnQkFDdkUsOENBQThDO2dCQUM5QyxJQUFJLFNBQVMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUFFO29CQUM5QyxJQUFJLENBQUMsc0JBQXNCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUFFO3dCQUM3QyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7cUJBQ3ZGO2lCQUNGO2FBQ0Y7U0FDRjtRQUNELElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzFCLHNCQUFzQjtZQUN0QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBbUIsQ0FBQztZQUM5QyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQ25DLElBQUksYUFBYSxLQUFLLElBQUksRUFBRTtnQkFDMUIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFO29CQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLDREQUE0RCxDQUFDLENBQUM7aUJBQy9FO2dCQUNELEdBQUcsQ0FBQyxTQUFVLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQzthQUNsRTtZQUNELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUUsQ0FBQztZQUNqQyw2REFBNkQ7WUFDN0QsaURBQWlEO1lBQ2pELHdDQUF3QztZQUN4QyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzNCLHNCQUFzQjtnQkFDdEIseUNBQXlDO2dCQUN6QyxVQUFVLEdBQUcsV0FBVyxDQUFDLFFBQWlCLENBQVksQ0FBQztnQkFDdkQsSUFBSSxDQUFFLFVBQTBCLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7b0JBQ2hFLG9CQUFvQixDQUFDLFVBQXFCLEVBQUUsUUFBaUIsQ0FBQyxDQUFDO2lCQUNoRTthQUNGO2lCQUFNO2dCQUNMLHlCQUF5QjtnQkFDekIsVUFBVSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQVMsQ0FBQzthQUM1QztZQUNELE1BQU0sU0FBUyxHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDekUsR0FBRyxDQUFDLFVBQVcsQ0FBQyxhQUFhLENBQUMsR0FBRyxTQUFTLENBQUM7U0FDNUM7YUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDbEMsc0JBQXNCO1lBQ3RCLHlDQUF5QztZQUN6QyxVQUFVLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUUsQ0FBWSxDQUFDO1lBQ3JELElBQUksQ0FBRSxVQUEwQixDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO2dCQUNoRSxvQkFBb0IsQ0FBQyxVQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3ZEO1NBQ0Y7YUFBTSxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUM3Qiw2QkFBNkI7WUFDN0IsTUFBTSxhQUFhLEdBQUksS0FBYSxDQUFDLE1BQU0sQ0FBQztZQUM1QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDN0MsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFRLENBQUM7Z0JBQ3pDLE1BQU0sU0FBUyxHQUNYLENBQUMsTUFBTSxHQUFHLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxLQUFLLGdCQUFnQixDQUFDLGNBQWMsQ0FBQztnQkFDbkYsTUFBTSxLQUFLLEdBQUcsTUFBTSxLQUFLLGdCQUFnQixDQUFDLEtBQUssQ0FBQztnQkFDaEQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQVUsQ0FBQztnQkFDekMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRTtvQkFDekMsbUJBQW1CO29CQUNuQixNQUFNLFdBQVcsR0FBRyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDbkQsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO29CQUMvRCxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDO2lCQUMvQztnQkFDRCxJQUFJO2FBQ0w7U0FDRjthQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixFQUFFO1lBQ2xDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUNqRixpQ0FBaUM7Z0JBQ2pDLG9EQUFvRDtnQkFDcEQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRTtvQkFDekMsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ2xELEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUM7aUJBQy9DO2FBQ0Y7U0FDRjthQUFNO1lBQ0wsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztZQUM3QixzQkFBc0I7WUFDdEIsSUFBSSxTQUFTLHFDQUE2QixFQUFFO2dCQUMxQyxNQUFNLFNBQVMsR0FBVSxFQUFFLENBQUM7Z0JBQzVCLGtCQUFrQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFFekQsd0RBQXdEO2dCQUN4RCw0REFBNEQ7Z0JBQzVELHFEQUFxRDtnQkFDckQsTUFBTSxTQUFTLEdBQWM7b0JBQzNCLEtBQUssRUFBRSxFQUFFO29CQUNULFlBQVksRUFBRSxTQUFTLENBQUMsTUFBTTtpQkFDL0IsQ0FBQztnQkFFRixHQUFHLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxHQUFHLFNBQVMsQ0FBQzthQUMzQztpQkFBTSxJQUFJLFNBQVMsZ0NBQXVCLEVBQUU7Z0JBQzNDLHVEQUF1RDtnQkFDdkQsNkRBQTZEO2dCQUM3RCx5QkFBeUI7Z0JBQ3pCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQzNCLE9BQU8sU0FBUyxLQUFLLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdDQUF1QixDQUFDLEVBQUU7b0JBQ3BFLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO2lCQUM1QjtnQkFDRCxJQUFJLFNBQVMsRUFBRTtvQkFDYixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQztvQkFDOUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRTt3QkFDN0MsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7d0JBQ3RELEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDO3FCQUN6QjtpQkFDRjthQUNGO2lCQUFNO2dCQUNMLGtFQUFrRTtnQkFDbEUsaUVBQWlFO2dCQUNqRSwyQ0FBMkM7Z0JBQzNDLElBQUksS0FBSyxDQUFDLGNBQWMsSUFBSSxLQUFLLENBQUMsY0FBYyxLQUFLLEtBQUssQ0FBQyxJQUFJLEVBQUU7b0JBQy9ELE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQztvQkFDaEQsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQztvQkFDdkQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxFQUFFO3dCQUN0RCxNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO3dCQUMvRCxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQztxQkFDekI7aUJBQ0Y7YUFDRjtTQUNGO0tBQ0Y7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FDcEIsS0FBWSxFQUFFLEtBQVksRUFBRSxLQUFZLEVBQUUsV0FBd0I7SUFDcEUsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQztJQUMxQixpRkFBaUY7SUFDakYsd0NBQXdDO0lBQ3hDLFdBQVcsR0FBRyxXQUFXLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQyxNQUFPLENBQUMsQ0FBQztJQUMzRSxNQUFNLFdBQVcsR0FBRyxXQUFXLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7SUFDdEUsTUFBTSxXQUFXLEdBQ2IsV0FBVyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQXFCLENBQUMsQ0FBQyxDQUFDO0lBQ25GLElBQUksS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN0QyxJQUFJLEtBQUssQ0FBQyxJQUFJLGtDQUF5QixFQUFFO1FBQ3ZDLCtEQUErRDtRQUMvRCxnRUFBZ0U7UUFDaEUsb0VBQW9FO1FBQ3BFLHNFQUFzRTtRQUN0RSxzQ0FBc0M7UUFDdEMsRUFBRTtRQUNGLHVFQUF1RTtRQUN2RSx5RUFBeUU7UUFDekUsb0VBQW9FO1FBQ3BFLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLHFDQUE2QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDakYsTUFBTSxVQUFVLEdBQUcsNEJBQTRCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFXLENBQUMsQ0FBQztRQUMzRSxtRUFBbUU7UUFDbkUsMERBQTBEO1FBQzFELElBQUksVUFBVSxFQUFFO1lBQ2QsS0FBSyxHQUFHLFVBQVUsQ0FBQztTQUNwQjtLQUNGO0lBQ0QsTUFBTSxJQUFJLEdBQWEsZUFBZSxDQUFDLFdBQW1CLEVBQUUsS0FBYSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1FBQ2xGLFFBQVEsRUFBRSxFQUFFO1lBQ1YsS0FBSyxrQkFBa0IsQ0FBQyxVQUFVO2dCQUNoQyxPQUFPLFlBQVksQ0FBQztZQUN0QixLQUFLLGtCQUFrQixDQUFDLFdBQVc7Z0JBQ2pDLE9BQU8sYUFBYSxDQUFDO1NBQ3hCO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLFdBQVcsS0FBSyxNQUFNLEVBQUU7UUFDMUIsNERBQTREO1FBQzVELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDM0I7U0FBTTtRQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUM7S0FDbEQ7SUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDeEIsQ0FBQztBQUVELElBQUksS0FBSyxHQUFXLENBQUMsQ0FBQztBQUN0QixNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztBQUUxQyxTQUFTLGFBQWEsQ0FBQyxLQUFZO0lBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3hCLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ3BDO0lBQ0QsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFDO0FBQzlCLENBQUM7QUFFRCxTQUFTLG1CQUFtQixDQUFDLFVBQXNCLEVBQUUsUUFBaUIsRUFBRSxNQUFjO0lBQ3BGLE1BQU0sU0FBUyxHQUFjO1FBQzNCLEtBQUssRUFBRSxFQUFFO0tBQ1YsQ0FBQztJQUVGLEtBQUssSUFBSSxDQUFDLEdBQUcsdUJBQXVCLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDaEUsSUFBSSxVQUFVLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBVSxDQUFDO1FBRXhDLHNDQUFzQztRQUN0QyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUMxQixVQUFVLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQ3hDO1FBQ0QsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXJDLElBQUksUUFBUSxDQUFDO1FBQ2IsSUFBSSxVQUFVLENBQUMsSUFBSSxnQ0FBd0IsRUFBRTtZQUMzQyxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEMsbUVBQW1FO1lBQ25FLGlFQUFpRTtZQUNqRSxrQkFBa0I7WUFDbEIsUUFBUSxHQUFJLEdBQUksQ0FBQyxXQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM5RDthQUFNO1lBQ0wsUUFBUSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUN0QztRQUVELE1BQU0sU0FBUyxHQUFVLEVBQUUsQ0FBQztRQUM1QixrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFN0UsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDbkIsUUFBUTtZQUNSLFlBQVksRUFBRSxTQUFTLENBQUMsTUFBTTtZQUM5QixHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFVLEVBQUUsUUFBUSxDQUFDO1NBQ3BELENBQUMsQ0FBQztLQUNKO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQztBQUVELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxPQUFnQjtJQUN0RCxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBQztJQUM5QyxNQUFNLElBQUksR0FBSSxPQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUNyRCxJQUFJLEtBQUssR0FBRyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztJQUN6RSxJQUFJLENBQUMsS0FBSztRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBRSx3QkFBd0I7SUFFbkUsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDckIsS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztLQUM5QjtJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQUVELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxPQUFnQixFQUFFLEtBQVk7SUFDakUsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM5QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzdDLE9BQU8sQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FDWixRQUFxQixFQUNyQixnQkFBd0Q7SUFDMUQsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFO1FBQ3RELE1BQU0sbUJBQW1CLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO1FBQzVELE1BQU0sWUFBWSxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNqQixNQUFNLElBQUksS0FBSyxDQUNYO3dFQUM4RCxDQUFDLENBQUM7U0FDckU7UUFDRCxNQUFNLGNBQWMsR0FBbUIsc0JBQXNCLFlBQVksY0FBYyxDQUFDLENBQUM7WUFDckYsc0JBQXNCLENBQUMsQ0FBQztZQUN4QixtQkFBbUIsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDNUMsTUFBTSxhQUFhLEdBQ2YscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7UUFDM0YsT0FBTyxjQUFjLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFpQixFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUN0RSxTQUFTLEVBQUU7YUFDWCxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1QsdUJBQXVCLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBRXZELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRTNELE1BQU0sYUFBYSxHQUFtQixFQUFFLENBQUM7WUFFekMsMkVBQTJFO1lBQzNFLE1BQU0sU0FBUyxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV2RSxJQUFJLFNBQVMsRUFBRTtnQkFDYixLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtvQkFDaEMsSUFBSTt3QkFDRixNQUFNLGNBQWMsR0FBRyxRQUFRLEVBQUUsQ0FBQzt3QkFDbEMsSUFBSSxVQUFVLENBQUMsY0FBYyxDQUFDLEVBQUU7NEJBQzlCLDBDQUEwQzs0QkFDMUMsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFxQixDQUFDLENBQUM7eUJBQzNDO3FCQUNGO29CQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUNWLHFCQUFxQjt3QkFDckIsT0FBTyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxDQUFDLENBQUMsQ0FBQztxQkFDL0Q7aUJBQ0Y7YUFDRjtZQUVELE1BQU0sUUFBUSxHQUFHLEdBQUcsRUFBRTtnQkFDcEIsY0FBYyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRTtvQkFDakQsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7b0JBQ3BELElBQUksT0FBTyxFQUFFO3dCQUNYLG9CQUFvQixDQUFDLE9BQU8sRUFBRSx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUNqRTtnQkFDSCxDQUFDLENBQUMsQ0FBQztnQkFFSCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzlDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbkIsT0FBTyxNQUFNLENBQUM7WUFDaEIsQ0FBQyxDQUFDO1lBRUYsSUFBSSxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDOUIsT0FBTyxRQUFRLEVBQUUsQ0FBQzthQUNuQjtZQUVELE9BQU8sT0FBTztpQkFDVCxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksRUFBRSxFQUFFO2dCQUN0QyxPQUFPLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDOUIsT0FBTyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDaEUsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztpQkFDRixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFDVCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDO0FBRXZDOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQVMsZ0JBQWdCLENBQUMsQ0FBQztBQUUzRTs7OztHQUlHO0FBQ0gsU0FBUyxxQkFBcUIsQ0FBQyxhQUFxQjtJQUNsRCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdELE9BQU8sT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUM7QUFDL0QsQ0FBQztBQUVEOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FDeEIsVUFBbUIsRUFDbkIsT0FBc0Y7SUFFeEYsTUFBTSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFDLEdBQUcsT0FBTyxDQUFDO0lBQ25FLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsRUFBRSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUMsQ0FBQyxDQUFDO0lBQ3pGLE9BQU8sT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDakUsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBK0JHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFJLGFBQXNCLEVBQUUsT0FNNUQ7SUFDQyxNQUFNLEVBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUM7SUFDMUQsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLHFCQUFxQixFQUFFLEVBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBQyxDQUFDLENBQUM7SUFDekYsTUFBTSxZQUFZLEdBQUc7UUFDbkIsbUJBQW1CLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUNoRSxtQkFBbUIsQ0FBQyxZQUFZLENBQUM7UUFDakMsR0FBRyxzQ0FBc0M7UUFDekMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDO0tBQzdCLENBQUM7SUFDRixPQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUseUJBQXlCLENBQUMsRUFBQyxhQUFhLEVBQUUsWUFBWSxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JGLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FpQkc7QUFDSCxNQUFNLFVBQVUsbUJBQW1CLENBQy9CLGFBQWlDLEVBQ2pDLE9BQTZFO0lBRS9FLE1BQU0sRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBQyxHQUFHLE9BQU8sQ0FBQztJQUNuRSxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsY0FBYyxFQUFFLEVBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBQyxDQUFDLENBQUM7SUFDbEYsT0FBTyxPQUFPLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBcHBsaWNhdGlvblJlZiwgRW52aXJvbm1lbnRQcm92aWRlcnMsIGltcG9ydFByb3ZpZGVyc0Zyb20sIEluamVjdGlvblRva2VuLCBOZ01vZHVsZUZhY3RvcnksIE5nTW9kdWxlUmVmLCBQbGF0Zm9ybVJlZiwgUHJvdmlkZXIsIFJlbmRlcmVyMiwgU3RhdGljUHJvdmlkZXIsIFR5cGUsIMm1Y29sbGVjdE5hdGl2ZU5vZGVzIGFzIGNvbGxlY3ROYXRpdmVOb2RlcywgybVDT05UQUlORVJfSEVBREVSX09GRlNFVCBhcyBDT05UQUlORVJfSEVBREVSX09GRlNFVCwgybVDT05URVhUIGFzIENPTlRFWFQsIMm1Z2V0TFZpZXdCeUlkIGFzIGdldExWaWV3QnlJZCwgybVIRUFERVJfT0ZGU0VUIGFzIEhFQURFUl9PRkZTRVQsIMm1SE9TVCBhcyBIT1NULCDJtWludGVybmFsQ3JlYXRlQXBwbGljYXRpb24gYXMgaW50ZXJuYWxDcmVhdGVBcHBsaWNhdGlvbiwgybVpc1Byb21pc2UsIMm1aXNSb290VmlldyBhcyBpc1Jvb3RWaWV3LCDJtUxDb250YWluZXIgYXMgTENvbnRhaW5lciwgybVMVmlldyBhcyBMVmlldywgybVuYXZpZ2F0ZVBhcmVudFROb2RlcyBhcyBuYXZpZ2F0ZVBhcmVudFROb2RlcywgybVSTm9kZSBhcyBSTm9kZSwgybVUQ29udGFpbmVyTm9kZSBhcyBUQ29udGFpbmVyTm9kZSwgybVUTm9kZSBhcyBUTm9kZSwgybVUTm9kZVR5cGUgYXMgVE5vZGVUeXBlLCDJtVRWSUVXIGFzIFRWSUVXLCDJtVRWaWV3IGFzIFRWaWV3LCDJtVRWaWV3VHlwZSBhcyBUVmlld1R5cGUsIMm1VFlQRSBhcyBUWVBFLCDJtXVud3JhcFJOb2RlIGFzIHVud3JhcFJOb2RlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QnJvd3Nlck1vZHVsZSwgybVUUkFOU0lUSU9OX0lEfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyJztcbmltcG9ydCB7Zmlyc3R9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtuYXZpZ2F0ZUJldHdlZW4sIE5vZGVOYXZpZ2F0aW9uU3RlcH0gZnJvbSAnLi9ub2RlX25hdic7XG5pbXBvcnQge1BsYXRmb3JtU3RhdGV9IGZyb20gJy4vcGxhdGZvcm1fc3RhdGUnO1xuaW1wb3J0IHtwbGF0Zm9ybUR5bmFtaWNTZXJ2ZXIsIHBsYXRmb3JtU2VydmVyLCBTZXJ2ZXJNb2R1bGV9IGZyb20gJy4vc2VydmVyJztcbmltcG9ydCB7QkVGT1JFX0FQUF9TRVJJQUxJWkVELCBJTklUSUFMX0NPTkZJR30gZnJvbSAnLi90b2tlbnMnO1xuaW1wb3J0IHtUUkFOU0ZFUl9TVEFURV9TRVJJQUxJWkFUSU9OX1BST1ZJREVSU30gZnJvbSAnLi90cmFuc2Zlcl9zdGF0ZSc7XG5cbmludGVyZmFjZSBQbGF0Zm9ybU9wdGlvbnMge1xuICBkb2N1bWVudD86IHN0cmluZ3xEb2N1bWVudDtcbiAgdXJsPzogc3RyaW5nO1xuICBwbGF0Zm9ybVByb3ZpZGVycz86IFByb3ZpZGVyW107XG59XG5cbmNvbnN0IE5HX05PTl9IWURSQVRBQkxFID0gJ25nTm9uSHlkcmF0YWJsZSc7XG5cbmZ1bmN0aW9uIF9nZXRQbGF0Zm9ybShcbiAgICBwbGF0Zm9ybUZhY3Rvcnk6IChleHRyYVByb3ZpZGVyczogU3RhdGljUHJvdmlkZXJbXSkgPT4gUGxhdGZvcm1SZWYsXG4gICAgb3B0aW9uczogUGxhdGZvcm1PcHRpb25zKTogUGxhdGZvcm1SZWYge1xuICBjb25zdCBleHRyYVByb3ZpZGVycyA9IG9wdGlvbnMucGxhdGZvcm1Qcm92aWRlcnMgPz8gW107XG4gIHJldHVybiBwbGF0Zm9ybUZhY3RvcnkoW1xuICAgIHtwcm92aWRlOiBJTklUSUFMX0NPTkZJRywgdXNlVmFsdWU6IHtkb2N1bWVudDogb3B0aW9ucy5kb2N1bWVudCwgdXJsOiBvcHRpb25zLnVybH19LFxuICAgIGV4dHJhUHJvdmlkZXJzLFxuICBdKTtcbn1cblxuLyoqXG4gKiBBZGRzIHRoZSBgbmctc2VydmVyLWNvbnRleHRgIGF0dHJpYnV0ZSB0byBob3N0IGVsZW1lbnRzIG9mIGFsbCBib290c3RyYXBwZWQgY29tcG9uZW50c1xuICogd2l0aGluIGEgZ2l2ZW4gYXBwbGljYXRpb24uXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZFNlcnZlckNvbnRleHRJbmZvKHNlcnZlckNvbnRleHQ6IHN0cmluZywgYXBwbGljYXRpb25SZWY6IEFwcGxpY2F0aW9uUmVmKSB7XG4gIGFwcGxpY2F0aW9uUmVmLmNvbXBvbmVudHMuZm9yRWFjaCgoY29tcG9uZW50UmVmKSA9PiB7XG4gICAgY29uc3QgcmVuZGVyZXIgPSBjb21wb25lbnRSZWYuaW5qZWN0b3IuZ2V0KFJlbmRlcmVyMik7XG4gICAgY29uc3QgZWxlbWVudCA9IGNvbXBvbmVudFJlZi5sb2NhdGlvbi5uYXRpdmVFbGVtZW50O1xuICAgIGlmIChlbGVtZW50KSB7XG4gICAgICByZW5kZXJlci5zZXRBdHRyaWJ1dGUoZWxlbWVudCwgJ25nLXNlcnZlci1jb250ZXh0Jywgc2VydmVyQ29udGV4dCk7XG4gICAgfVxuICB9KTtcbn1cblxuLy8gVE9ETzogaW1wb3J0IGZyb20gYEBhbmd1bGFyL2NvcmVgIGluc3RlYWQsIHRoaXMgaXMganVzdCBhIGNvcHkuXG5leHBvcnQgZW51bSBJMThuQ3JlYXRlT3BDb2RlIHtcbiAgU0hJRlQgPSAyLFxuICBBUFBFTkRfRUFHRVJMWSA9IDBiMDEsXG4gIENPTU1FTlQgPSAwYjEwLFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIExpdmVEb20ge1xuICAvKiBhbmNob3IgaXMgYW4gaW5kZXggZnJvbSBMVmlldyAqL1xuICBjb250YWluZXJzOiBSZWNvcmQ8bnVtYmVyLCBDb250YWluZXI+O1xuICBub2RlczogUmVjb3JkPG51bWJlciwgc3RyaW5nPjtcbiAgdGVtcGxhdGVzOiBSZWNvcmQ8bnVtYmVyLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbnRhaW5lciB7XG4gIHZpZXdzOiBWaWV3W107XG4gIC8vIERlc2NyaWJlcyB0aGUgbnVtYmVyIG9mIHRvcCBsZXZlbCBub2RlcyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgLy8gT25seSBhcHBsaWNhYmxlIHRvIDxuZy1jb250YWluZXI+cy5cbiAgLy9cbiAgLy8gVE9ETzogY29uc2lkZXIgbW92aW5nIHRoaXMgaW5mbyBlbHNld2hlcmUgdG8gYXZvaWQgY29uZnVzaW9uXG4gIC8vIGJldHdlZW4gdmlldyBjb250YWluZXJzICg8ZGl2ICpuZ0lmPikgYW5kIGVsZW1lbnQgY29udGFpbmVyc1xuICAvLyAoPG5nLWNvbnRhaW5lcj5zKS5cbiAgbnVtUm9vdE5vZGVzPzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFZpZXcgZXh0ZW5kcyBMaXZlRG9tIHtcbiAgdGVtcGxhdGU6IHN0cmluZztcbiAgbnVtUm9vdE5vZGVzOiBudW1iZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0xDb250YWluZXIodmFsdWU6IFJOb2RlfExWaWV3fExDb250YWluZXJ8e318bnVsbCk6IHZhbHVlIGlzIExDb250YWluZXIge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWVbVFlQRV0gPT09IHRydWU7XG59XG5cbmZ1bmN0aW9uIGZpcnN0Uk5vZGVJbkVsZW1lbnRDb250YWluZXIodFZpZXc6IFRWaWV3LCBsVmlldzogTFZpZXcsIHROb2RlOiBUTm9kZSk6IFJOb2RlfG51bGwge1xuICBjb25zdCByb290Tm9kZXM6IGFueVtdID0gW107XG4gIC8vIFRPRE86IGZpbmQgbW9yZSBlZmZpY2llbnQgd2F5IHRvIGRvIHRoaXMuIFdlIGRvbid0IG5lZWQgdG8gdHJhdmVyc2UgdGhlIGVudGlyZVxuICAvLyBzdHJ1Y3R1cmUsIHdlIGNhbiBqdXN0IHN0b3AgYWZ0ZXIgZXhhbWluaW5nIHRoZSBmaXJzdCBub2RlLlxuICBjb2xsZWN0TmF0aXZlTm9kZXModFZpZXcsIGxWaWV3LCB0Tm9kZSwgcm9vdE5vZGVzKTtcbiAgcmV0dXJuIHJvb3ROb2Rlc1swXTtcbn1cblxuZnVuY3Rpb24gaXNQcm9qZWN0aW9uVE5vZGUodE5vZGU6IFROb2RlKTogYm9vbGVhbiB7XG4gIHJldHVybiAodE5vZGUudHlwZSAmIFROb2RlVHlwZS5Qcm9qZWN0aW9uKSA9PT0gVE5vZGVUeXBlLlByb2plY3Rpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RJMThuTm9kZShvYmo6IGFueSk6IGJvb2xlYW4ge1xuICAvLyBUT0RPOiBjb25zaWRlciBhZGRpbmcgYSBub2RlIHR5cGUgdG8gVEkxOG4/XG4gIHJldHVybiBvYmouaGFzT3duUHJvcGVydHkoJ2NyZWF0ZScpICYmIG9iai5oYXNPd25Qcm9wZXJ0eSgndXBkYXRlJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQ2xvc2VzdEVsZW1lbnRUTm9kZSh0Tm9kZTogVE5vZGV8bnVsbCk6IFROb2RlfG51bGwge1xuICBsZXQgcGFyZW50VE5vZGU6IFROb2RlfG51bGwgPSB0Tm9kZTtcbiAgLy8gRklYTUU6IHRoaXMgY29uZGl0aW9uIHNob3VsZCBhbHNvIHRha2UgaW50byBhY2NvdW50IHdoZXRoZXJcbiAgLy8gcmVzdWx0aW5nIHROb2RlIGlzIG5vdCBtYXJrZWQgYXMgYGluc2VydEJlZm9yZUluZGV4YC5cbiAgd2hpbGUgKHBhcmVudFROb2RlICE9PSBudWxsICYmXG4gICAgICAgICAoKHBhcmVudFROb2RlLnR5cGUgJiBUTm9kZVR5cGUuRWxlbWVudCkgIT09IFROb2RlVHlwZS5FbGVtZW50IHx8XG4gICAgICAgICAgcGFyZW50VE5vZGUuaW5zZXJ0QmVmb3JlSW5kZXggIT09IG51bGwpKSB7XG4gICAgdE5vZGUgPSBwYXJlbnRUTm9kZTtcbiAgICBwYXJlbnRUTm9kZSA9IHROb2RlLnBhcmVudDtcbiAgfVxuICByZXR1cm4gcGFyZW50VE5vZGU7XG59XG5cbmZ1bmN0aW9uIGhhc05nTm9uSHlkcmF0YWJsZUF0dHIodE5vZGU6IFROb2RlKTogYm9vbGVhbiB7XG4gIC8vIFRPRE86IHdlIG5lZWQgdG8gaXRlcmF0ZSBvdmVyIGB0Tm9kZS5tZXJnZWRBdHRyc2AgYmV0dGVyXG4gIC8vIHRvIGF2b2lkIGNhc2VzIHdoZW4gYG5nTm9uSHlkcmF0YWJsZWAgaXMgYW4gYXR0cmlidXRlIHZhbHVlLFxuICAvLyBlLmcuIGA8ZGl2IHRpdGxlPVwibmdOb25IeWRyYXRhYmxlXCI+PC9kaXY+YC5cbiAgcmV0dXJuICEhdE5vZGUubWVyZ2VkQXR0cnM/LmluY2x1ZGVzKCduZ05vbkh5ZHJhdGFibGUnKTtcbn1cblxuZnVuY3Rpb24gaXNJbk5vbkh5ZHJhdGFibGVCbG9jayh0Tm9kZTogVE5vZGUsIGxWaWV3OiBMVmlldyk6IGJvb2xlYW4ge1xuICBjb25zdCBmb3VuZFROb2RlID0gbmF2aWdhdGVQYXJlbnRUTm9kZXModE5vZGUgYXMgVE5vZGUsIGxWaWV3LCBoYXNOZ05vbkh5ZHJhdGFibGVBdHRyKTtcbiAgLy8gaW4gYSBibG9jayB3aGVuIHdlIGhhdmUgYSBUTm9kZSBhbmQgaXQncyBkaWZmZXJlbnQgdGhhbiB0aGUgcm9vdCBub2RlXG4gIHJldHVybiBmb3VuZFROb2RlICE9PSBudWxsICYmIGZvdW5kVE5vZGUgIT09IHROb2RlO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVMVmlldyhsVmlldzogTFZpZXcsIGhvc3ROb2RlOiBFbGVtZW50KTogTGl2ZURvbSB7XG4gIGNvbnN0IG5naDogTGl2ZURvbSA9IHtcbiAgICBjb250YWluZXJzOiB7fSxcbiAgICB0ZW1wbGF0ZXM6IHt9LFxuICAgIG5vZGVzOiB7fSxcbiAgfTtcblxuICBjb25zdCB0VmlldyA9IGxWaWV3W1RWSUVXXTtcbiAgZm9yIChsZXQgaSA9IEhFQURFUl9PRkZTRVQ7IGkgPCB0Vmlldy5iaW5kaW5nU3RhcnRJbmRleDsgaSsrKSB7XG4gICAgbGV0IHRhcmdldE5vZGU6IE5vZGV8bnVsbCA9IG51bGw7XG4gICAgY29uc3QgYWRqdXN0ZWRJbmRleCA9IGkgLSBIRUFERVJfT0ZGU0VUO1xuICAgIGNvbnN0IHROb2RlID0gdFZpZXcuZGF0YVtpXSBhcyBUQ29udGFpbmVyTm9kZTtcbiAgICAvLyB0Tm9kZSBtYXkgYmUgbnVsbCBpbiB0aGUgY2FzZSBvZiBhIGxvY2FsUmVmXG4gICAgaWYgKCF0Tm9kZSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHROb2RlLnByb2plY3Rpb24pKSB7XG4gICAgICAvLyBUT0RPOiBoYW5kbGUgYFJOb2RlW11gIGFzIHdlbGwuXG4gICAgICBmb3IgKGNvbnN0IGhlYWRUTm9kZSBvZiAodE5vZGUucHJvamVjdGlvbiBhcyBhbnlbXSkpIHtcbiAgICAgICAgLy8gV2UgbWF5IGhhdmUgYG51bGxgcyBpbiBzbG90cyB3aXRoIG5vIHByb2plY3RlZCBjb250ZW50LlxuICAgICAgICAvLyBBbHNvLCBpZiB3ZSBwcm9jZXNzIHJlLXByb2plY3RlZCBjb250ZW50IChpLmUuIGA8bmctY29udGVudD5gXG4gICAgICAgIC8vIGFwcGVhcnMgYXQgcHJvamVjdGlvbiBsb2NhdGlvbiksIHNraXAgYW5ub3RhdGlvbnMgZm9yIHRoaXMgY29udGVudFxuICAgICAgICAvLyBzaW5jZSBhbGwgRE9NIG5vZGVzIGluIHRoaXMgcHJvamVjdGlvbiB3ZXJlIGhhbmRsZWQgd2hpbGUgcHJvY2Vzc2luZ1xuICAgICAgICAvLyBhIHBhcmVudCBsVmlldywgd2hpY2ggY29udGFpbnMgdGhvc2Ugbm9kZXMuXG4gICAgICAgIGlmIChoZWFkVE5vZGUgJiYgIWlzUHJvamVjdGlvblROb2RlKGhlYWRUTm9kZSkpIHtcbiAgICAgICAgICBpZiAoIWlzSW5Ob25IeWRyYXRhYmxlQmxvY2soaGVhZFROb2RlLCBsVmlldykpIHtcbiAgICAgICAgICAgIG5naC5ub2Rlc1toZWFkVE5vZGUuaW5kZXggLSBIRUFERVJfT0ZGU0VUXSA9IGNhbGNQYXRoRm9yTm9kZSh0VmlldywgbFZpZXcsIGhlYWRUTm9kZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc0xDb250YWluZXIobFZpZXdbaV0pKSB7XG4gICAgICAvLyB0aGlzIGlzIGEgY29udGFpbmVyXG4gICAgICBjb25zdCB0Tm9kZSA9IHRWaWV3LmRhdGFbaV0gYXMgVENvbnRhaW5lck5vZGU7XG4gICAgICBjb25zdCBlbWJlZGRlZFRWaWV3ID0gdE5vZGUudFZpZXdzO1xuICAgICAgaWYgKGVtYmVkZGVkVFZpZXcgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZW1iZWRkZWRUVmlldykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGluZyB0Tm9kZS50Vmlld3MgdG8gYmUgYW4gb2JqZWN0LCBidXQgaXQncyBhbiBhcnJheS5gKTtcbiAgICAgICAgfVxuICAgICAgICBuZ2gudGVtcGxhdGVzIVtpIC0gSEVBREVSX09GRlNFVF0gPSBnZXRUVmlld1NzcklkKGVtYmVkZGVkVFZpZXcpO1xuICAgICAgfVxuICAgICAgY29uc3QgaG9zdE5vZGUgPSBsVmlld1tpXVtIT1NUXSE7XG4gICAgICAvLyBMVmlld1tpXVtIT1NUXSBjYW4gYmUgMiBkaWZmZXJlbnQgdHlwZXM6IEVpdGhlciBhIERPTSBOb2RlXG4gICAgICAvLyAgb3IgYW4gTFZpZXcgQXJyYXkgdGhhdCByZXByZXNlbnRzIGEgY29tcG9uZW50XG4gICAgICAvLyBXZSBvbmx5IGhhbmRsZSB0aGUgRE9NIE5vZGUgY2FzZSBoZXJlXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShob3N0Tm9kZSkpIHtcbiAgICAgICAgLy8gdGhpcyBpcyBhIGNvbXBvbmVudFxuICAgICAgICAvLyBDaGVjayB0byBzZWUgaWYgaXQgaGFzIG5nTm9uSHlkcmF0YWJsZVxuICAgICAgICB0YXJnZXROb2RlID0gdW53cmFwUk5vZGUoaG9zdE5vZGUgYXMgTFZpZXcpIGFzIEVsZW1lbnQ7XG4gICAgICAgIGlmICghKHRhcmdldE5vZGUgYXMgSFRNTEVsZW1lbnQpLmhhc0F0dHJpYnV0ZShOR19OT05fSFlEUkFUQUJMRSkpIHtcbiAgICAgICAgICBhbm5vdGF0ZUZvckh5ZHJhdGlvbih0YXJnZXROb2RlIGFzIEVsZW1lbnQsIGhvc3ROb2RlIGFzIExWaWV3KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gdGhpcyBpcyBhIHJlZ3VsYXIgbm9kZVxuICAgICAgICB0YXJnZXROb2RlID0gdW53cmFwUk5vZGUoaG9zdE5vZGUpIGFzIE5vZGU7XG4gICAgICB9XG4gICAgICBjb25zdCBjb250YWluZXIgPSBzZXJpYWxpemVMQ29udGFpbmVyKGxWaWV3W2ldLCBob3N0Tm9kZSwgYWRqdXN0ZWRJbmRleCk7XG4gICAgICBuZ2guY29udGFpbmVycyFbYWRqdXN0ZWRJbmRleF0gPSBjb250YWluZXI7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGxWaWV3W2ldKSkge1xuICAgICAgLy8gdGhpcyBpcyBhIGNvbXBvbmVudFxuICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIGl0IGhhcyBuZ05vbkh5ZHJhdGFibGVcbiAgICAgIHRhcmdldE5vZGUgPSB1bndyYXBSTm9kZShsVmlld1tpXVtIT1NUXSEpIGFzIEVsZW1lbnQ7XG4gICAgICBpZiAoISh0YXJnZXROb2RlIGFzIEhUTUxFbGVtZW50KS5oYXNBdHRyaWJ1dGUoJ25nTm9uSHlkcmF0YWJsZScpKSB7XG4gICAgICAgIGFubm90YXRlRm9ySHlkcmF0aW9uKHRhcmdldE5vZGUgYXMgRWxlbWVudCwgbFZpZXdbaV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUSTE4bk5vZGUodE5vZGUpKSB7XG4gICAgICAvLyBQcm9jZXNzIGkxOG4gdGV4dCBub2Rlcy4uLlxuICAgICAgY29uc3QgY3JlYXRlT3BDb2RlcyA9ICh0Tm9kZSBhcyBhbnkpLmNyZWF0ZTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3JlYXRlT3BDb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBvcENvZGUgPSBjcmVhdGVPcENvZGVzW2krK10gYXMgYW55O1xuICAgICAgICBjb25zdCBhcHBlbmROb3cgPVxuICAgICAgICAgICAgKG9wQ29kZSAmIEkxOG5DcmVhdGVPcENvZGUuQVBQRU5EX0VBR0VSTFkpID09PSBJMThuQ3JlYXRlT3BDb2RlLkFQUEVORF9FQUdFUkxZO1xuICAgICAgICBjb25zdCBpbmRleCA9IG9wQ29kZSA+Pj4gSTE4bkNyZWF0ZU9wQ29kZS5TSElGVDtcbiAgICAgICAgY29uc3QgdE5vZGUgPSB0Vmlldy5kYXRhW2luZGV4XSBhcyBUTm9kZTtcbiAgICAgICAgaWYgKCFpc0luTm9uSHlkcmF0YWJsZUJsb2NrKHROb2RlLCBsVmlldykpIHtcbiAgICAgICAgICAvLyBpZiAoYXBwZW5kTm93KSB7XG4gICAgICAgICAgY29uc3QgcGFyZW50VE5vZGUgPSBmaW5kQ2xvc2VzdEVsZW1lbnRUTm9kZSh0Tm9kZSk7XG4gICAgICAgICAgY29uc3QgcGF0aCA9IGNhbGNQYXRoRm9yTm9kZSh0VmlldywgbFZpZXcsIHROb2RlLCBwYXJlbnRUTm9kZSk7XG4gICAgICAgICAgbmdoLm5vZGVzW3ROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVF0gPSBwYXRoO1xuICAgICAgICB9XG4gICAgICAgIC8vIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHROb2RlLmluc2VydEJlZm9yZUluZGV4KSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0Tm9kZS5pbnNlcnRCZWZvcmVJbmRleCkgJiYgdE5vZGUuaW5zZXJ0QmVmb3JlSW5kZXhbMF0gIT09IG51bGwpIHtcbiAgICAgICAgLy8gQSByb290IG5vZGUgd2l0aGluIGkxOG4gYmxvY2suXG4gICAgICAgIC8vIFRPRE86IGFkZCBhIGNvbW1lbnQgb24gKndoeSogd2UgbmVlZCBhIHBhdGggaGVyZS5cbiAgICAgICAgaWYgKCFpc0luTm9uSHlkcmF0YWJsZUJsb2NrKHROb2RlLCBsVmlldykpIHtcbiAgICAgICAgICBjb25zdCBwYXRoID0gY2FsY1BhdGhGb3JOb2RlKHRWaWV3LCBsVmlldywgdE5vZGUpO1xuICAgICAgICAgIG5naC5ub2Rlc1t0Tm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVRdID0gcGF0aDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0Tm9kZVR5cGUgPSB0Tm9kZS50eXBlO1xuICAgICAgLy8gPG5nLWNvbnRhaW5lcj4gY2FzZVxuICAgICAgaWYgKHROb2RlVHlwZSAmIFROb2RlVHlwZS5FbGVtZW50Q29udGFpbmVyKSB7XG4gICAgICAgIGNvbnN0IHJvb3ROb2RlczogYW55W10gPSBbXTtcbiAgICAgICAgY29sbGVjdE5hdGl2ZU5vZGVzKHRWaWV3LCBsVmlldywgdE5vZGUuY2hpbGQsIHJvb3ROb2Rlcyk7XG5cbiAgICAgICAgLy8gVGhpcyBpcyBhbiBcImVsZW1lbnRcIiBjb250YWluZXIgKHZzIFwidmlld1wiIGNvbnRhaW5lciksXG4gICAgICAgIC8vIHNvIGl0J3Mgb25seSByZXByZXNlbnRlZCBieSB0aGUgbnVtYmVyIG9mIHRvcC1sZXZlbCBub2Rlc1xuICAgICAgICAvLyBhcyBhIHNoaWZ0IHRvIGdldCB0byBhIGNvcnJlc3BvbmRpbmcgY29tbWVudCBub2RlLlxuICAgICAgICBjb25zdCBjb250YWluZXI6IENvbnRhaW5lciA9IHtcbiAgICAgICAgICB2aWV3czogW10sXG4gICAgICAgICAgbnVtUm9vdE5vZGVzOiByb290Tm9kZXMubGVuZ3RoLFxuICAgICAgICB9O1xuXG4gICAgICAgIG5naC5jb250YWluZXJzW2FkanVzdGVkSW5kZXhdID0gY29udGFpbmVyO1xuICAgICAgfSBlbHNlIGlmICh0Tm9kZVR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikge1xuICAgICAgICAvLyBDdXJyZW50IFROb2RlIGhhcyBubyBET00gZWxlbWVudCBhc3NvY2lhdGVkIHdpdGggaXQsXG4gICAgICAgIC8vIHNvIHRoZSBmb2xsb3dpbmcgbm9kZSB3b3VsZCBub3QgYmUgYWJsZSB0byBmaW5kIGFuIGFuY2hvci5cbiAgICAgICAgLy8gVXNlIGZ1bGwgcGF0aCBpbnN0ZWFkLlxuICAgICAgICBsZXQgbmV4dFROb2RlID0gdE5vZGUubmV4dDtcbiAgICAgICAgd2hpbGUgKG5leHRUTm9kZSAhPT0gbnVsbCAmJiAobmV4dFROb2RlLnR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikpIHtcbiAgICAgICAgICBuZXh0VE5vZGUgPSBuZXh0VE5vZGUubmV4dDtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmV4dFROb2RlKSB7XG4gICAgICAgICAgY29uc3QgaW5kZXggPSBuZXh0VE5vZGUuaW5kZXggLSBIRUFERVJfT0ZGU0VUO1xuICAgICAgICAgIGlmICghaXNJbk5vbkh5ZHJhdGFibGVCbG9jayhuZXh0VE5vZGUsIGxWaWV3KSkge1xuICAgICAgICAgICAgY29uc3QgcGF0aCA9IGNhbGNQYXRoRm9yTm9kZSh0VmlldywgbFZpZXcsIG5leHRUTm9kZSk7XG4gICAgICAgICAgICBuZ2gubm9kZXNbaW5kZXhdID0gcGF0aDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHByb2plY3Rpb24gbmV4dCBpcyBub3QgdGhlIHNhbWUgYXMgbmV4dCwgaW4gd2hpY2ggY2FzZVxuICAgICAgICAvLyB0aGUgbm9kZSB3b3VsZCBub3QgYmUgZm91bmQgYXQgY3JlYXRpb24gdGltZSBhdCBydW50aW1lIGFuZCB3ZVxuICAgICAgICAvLyBuZWVkIHRvIHByb3ZpZGUgYSBsb2NhdGlvbiB0byB0aGF0IG5vZGUuXG4gICAgICAgIGlmICh0Tm9kZS5wcm9qZWN0aW9uTmV4dCAmJiB0Tm9kZS5wcm9qZWN0aW9uTmV4dCAhPT0gdE5vZGUubmV4dCkge1xuICAgICAgICAgIGNvbnN0IG5leHRQcm9qZWN0ZWRUTm9kZSA9IHROb2RlLnByb2plY3Rpb25OZXh0O1xuICAgICAgICAgIGNvbnN0IGluZGV4ID0gbmV4dFByb2plY3RlZFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgICAgICAgICBpZiAoIWlzSW5Ob25IeWRyYXRhYmxlQmxvY2sobmV4dFByb2plY3RlZFROb2RlLCBsVmlldykpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBjYWxjUGF0aEZvck5vZGUodFZpZXcsIGxWaWV3LCBuZXh0UHJvamVjdGVkVE5vZGUpO1xuICAgICAgICAgICAgbmdoLm5vZGVzW2luZGV4XSA9IHBhdGg7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBuZ2g7XG59XG5cbmZ1bmN0aW9uIGNhbGNQYXRoRm9yTm9kZShcbiAgICB0VmlldzogVFZpZXcsIGxWaWV3OiBMVmlldywgdE5vZGU6IFROb2RlLCBwYXJlbnRUTm9kZT86IFROb2RlfG51bGwpOiBzdHJpbmcge1xuICBjb25zdCBpbmRleCA9IHROb2RlLmluZGV4O1xuICAvLyBJZiBgbnVsbGAgaXMgcGFzc2VkIGV4cGxpY2l0bHksIHVzZSB0aGlzIGFzIGEgc2lnbmFsIHRoYXQgd2Ugd2FudCB0byBjYWxjdWxhdGVcbiAgLy8gdGhlIHBhdGggc3RhcnRpbmcgZnJvbSBgbFZpZXdbSE9TVF1gLlxuICBwYXJlbnRUTm9kZSA9IHBhcmVudFROb2RlID09PSBudWxsID8gbnVsbCA6IChwYXJlbnRUTm9kZSB8fCB0Tm9kZS5wYXJlbnQhKTtcbiAgY29uc3QgcGFyZW50SW5kZXggPSBwYXJlbnRUTm9kZSA9PT0gbnVsbCA/ICdob3N0JyA6IHBhcmVudFROb2RlLmluZGV4O1xuICBjb25zdCBwYXJlbnRSTm9kZSA9XG4gICAgICBwYXJlbnRUTm9kZSA9PT0gbnVsbCA/IGxWaWV3W0hPU1RdIDogdW53cmFwUk5vZGUobFZpZXdbcGFyZW50SW5kZXggYXMgbnVtYmVyXSk7XG4gIGxldCByTm9kZSA9IHVud3JhcFJOb2RlKGxWaWV3W2luZGV4XSk7XG4gIGlmICh0Tm9kZS50eXBlICYgVE5vZGVUeXBlLkFueUNvbnRhaW5lcikge1xuICAgIC8vIEZvciA8bmctY29udGFpbmVyPiBub2RlcywgaW5zdGVhZCBvZiBzZXJpYWxpemluZyBhIHJlZmVyZW5jZVxuICAgIC8vIHRvIHRoZSBhbmNob3IgY29tbWVudCBub2RlLCBzZXJpYWxpemUgYSBsb2NhdGlvbiBvZiB0aGUgZmlyc3RcbiAgICAvLyBET00gZWxlbWVudC4gUGFpcmVkIHdpdGggdGhlIGNvbnRhaW5lciBzaXplIChzZXJpYWxpemVkIGFzIGEgcGFydFxuICAgIC8vIG9mIGBuZ2guY29udGFpbmVyc2ApLCBpdCBzaG91bGQgZ2l2ZSBlbm91Z2ggaW5mb3JtYXRpb24gZm9yIHJ1bnRpbWVcbiAgICAvLyB0byBoeWRyYXRlIG5vZGVzIGluIHRoaXMgY29udGFpbmVyLlxuICAgIC8vXG4gICAgLy8gTm90ZTogZm9yIEVsZW1lbnRDb250YWluZXJzIChpLmUuIGA8bmctY29udGFpbmVyPmAgZWxlbWVudHMpLCB3ZSB1c2VcbiAgICAvLyBhIGZpcnN0IGNoaWxkIGZyb20gdGhlIHROb2RlIGRhdGEgc3RydWN0dXJlcywgc2luY2Ugd2Ugd2FudCB0byBjb2xsZWN0XG4gICAgLy8gYWRkIHJvb3Qgbm9kZXMgc3RhcnRpbmcgZnJvbSB0aGUgZmlyc3QgY2hpbGQgbm9kZSBpbiBhIGNvbnRhaW5lci5cbiAgICBjb25zdCBjaGlsZFROb2RlID0gdE5vZGUudHlwZSAmIFROb2RlVHlwZS5FbGVtZW50Q29udGFpbmVyID8gdE5vZGUuY2hpbGQgOiB0Tm9kZTtcbiAgICBjb25zdCBmaXJzdFJOb2RlID0gZmlyc3RSTm9kZUluRWxlbWVudENvbnRhaW5lcih0VmlldywgbFZpZXcsIGNoaWxkVE5vZGUhKTtcbiAgICAvLyBJZiBjb250YWluZXIgaXMgbm90IGVtcHR5LCB1c2UgYSByZWZlcmVuY2UgdG8gdGhlIGZpcnN0IGVsZW1lbnQsXG4gICAgLy8gb3RoZXJ3aXNlLCByTm9kZSB3b3VsZCBwb2ludCB0byBhbiBhbmNob3IgY29tbWVudCBub2RlLlxuICAgIGlmIChmaXJzdFJOb2RlKSB7XG4gICAgICByTm9kZSA9IGZpcnN0Uk5vZGU7XG4gICAgfVxuICB9XG4gIGNvbnN0IHBhdGg6IHN0cmluZ1tdID0gbmF2aWdhdGVCZXR3ZWVuKHBhcmVudFJOb2RlIGFzIE5vZGUsIHJOb2RlIGFzIE5vZGUpLm1hcChvcCA9PiB7XG4gICAgc3dpdGNoIChvcCkge1xuICAgICAgY2FzZSBOb2RlTmF2aWdhdGlvblN0ZXAuRmlyc3RDaGlsZDpcbiAgICAgICAgcmV0dXJuICdmaXJzdENoaWxkJztcbiAgICAgIGNhc2UgTm9kZU5hdmlnYXRpb25TdGVwLk5leHRTaWJsaW5nOlxuICAgICAgICByZXR1cm4gJ25leHRTaWJsaW5nJztcbiAgICB9XG4gIH0pO1xuICBpZiAocGFyZW50SW5kZXggPT09ICdob3N0Jykge1xuICAgIC8vIFRPRE86IGFkZCBzdXBwb3J0IGZvciBgaG9zdGAgdG8gdGhlIGBsb2NhdGVOZXh0Uk5vZGVgIGZuLlxuICAgIHBhdGgudW5zaGlmdChwYXJlbnRJbmRleCk7XG4gIH0gZWxzZSB7XG4gICAgcGF0aC51bnNoaWZ0KCcnICsgKHBhcmVudEluZGV4IC0gSEVBREVSX09GRlNFVCkpO1xuICB9XG4gIHJldHVybiBwYXRoLmpvaW4oJy4nKTtcbn1cblxubGV0IHNzcklkOiBudW1iZXIgPSAwO1xuY29uc3Qgc3NySWRNYXAgPSBuZXcgTWFwPFRWaWV3LCBzdHJpbmc+KCk7XG5cbmZ1bmN0aW9uIGdldFRWaWV3U3NySWQodFZpZXc6IFRWaWV3KTogc3RyaW5nIHtcbiAgaWYgKCFzc3JJZE1hcC5oYXModFZpZXcpKSB7XG4gICAgc3NySWRNYXAuc2V0KHRWaWV3LCBgdCR7c3NySWQrK31gKTtcbiAgfVxuICByZXR1cm4gc3NySWRNYXAuZ2V0KHRWaWV3KSE7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUxDb250YWluZXIobENvbnRhaW5lcjogTENvbnRhaW5lciwgaG9zdE5vZGU6IEVsZW1lbnQsIGFuY2hvcjogbnVtYmVyKTogQ29udGFpbmVyIHtcbiAgY29uc3QgY29udGFpbmVyOiBDb250YWluZXIgPSB7XG4gICAgdmlld3M6IFtdLFxuICB9O1xuXG4gIGZvciAobGV0IGkgPSBDT05UQUlORVJfSEVBREVSX09GRlNFVDsgaSA8IGxDb250YWluZXIubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgY2hpbGRMVmlldyA9IGxDb250YWluZXJbaV0gYXMgTFZpZXc7XG5cbiAgICAvLyBHZXQgTFZpZXcgZm9yIHVuZGVybHlpbmcgY29tcG9uZW50LlxuICAgIGlmIChpc1Jvb3RWaWV3KGNoaWxkTFZpZXcpKSB7XG4gICAgICBjaGlsZExWaWV3ID0gY2hpbGRMVmlld1tIRUFERVJfT0ZGU0VUXTtcbiAgICB9XG4gICAgY29uc3QgY2hpbGRUVmlldyA9IGNoaWxkTFZpZXdbVFZJRVddO1xuXG4gICAgbGV0IHRlbXBsYXRlO1xuICAgIGlmIChjaGlsZFRWaWV3LnR5cGUgPT09IFRWaWV3VHlwZS5Db21wb25lbnQpIHtcbiAgICAgIGNvbnN0IGN0eCA9IGNoaWxkTFZpZXdbQ09OVEVYVF07XG4gICAgICAvLyBUT0RPOiB0aGlzIGlzIGEgaGFjayAod2UgY2FwdHVyZSBhIGNvbXBvbmVudCBob3N0IGVsZW1lbnQgbmFtZSksXG4gICAgICAvLyB3ZSBuZWVkIGEgbW9yZSBzdGFibGUgc29sdXRpb24gaGVyZSwgZm9yIGV4LiBhIHdheSB0byBnZW5lcmF0ZVxuICAgICAgLy8gYSBjb21wb25lbnQgaWQuXG4gICAgICB0ZW1wbGF0ZSA9IChjdHghLmNvbnN0cnVjdG9yIGFzIGFueSlbJ8m1Y21wJ10uc2VsZWN0b3JzWzBdWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZW1wbGF0ZSA9IGdldFRWaWV3U3NySWQoY2hpbGRUVmlldyk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm9vdE5vZGVzOiBhbnlbXSA9IFtdO1xuICAgIGNvbGxlY3ROYXRpdmVOb2RlcyhjaGlsZFRWaWV3LCBjaGlsZExWaWV3LCBjaGlsZFRWaWV3LmZpcnN0Q2hpbGQsIHJvb3ROb2Rlcyk7XG5cbiAgICBjb250YWluZXIudmlld3MucHVzaCh7XG4gICAgICB0ZW1wbGF0ZSwgIC8vIGZyb20gd2hpY2ggdGVtcGxhdGUgZGlkIHRoaXMgbFZpZXcgb3JpZ2luYXRlP1xuICAgICAgbnVtUm9vdE5vZGVzOiByb290Tm9kZXMubGVuZ3RoLFxuICAgICAgLi4uc2VyaWFsaXplTFZpZXcobENvbnRhaW5lcltpXSBhcyBMVmlldywgaG9zdE5vZGUpLFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGNvbnRhaW5lcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldExWaWV3RnJvbVJvb3RFbGVtZW50KGVsZW1lbnQ6IEVsZW1lbnQpOiBMVmlldyB7XG4gIGNvbnN0IE1PTktFWV9QQVRDSF9LRVlfTkFNRSA9ICdfX25nQ29udGV4dF9fJztcbiAgY29uc3QgZGF0YSA9IChlbGVtZW50IGFzIGFueSlbTU9OS0VZX1BBVENIX0tFWV9OQU1FXTtcbiAgbGV0IGxWaWV3ID0gdHlwZW9mIGRhdGEgPT09ICdudW1iZXInID8gZ2V0TFZpZXdCeUlkKGRhdGEpIDogZGF0YSB8fCBudWxsO1xuICBpZiAoIWxWaWV3KSB0aHJvdyBuZXcgRXJyb3IoJ25vdCBmb3VuZCcpOyAgLy8gVE9ETzogaXMgaXQgcG9zc2libGU/XG5cbiAgaWYgKGlzUm9vdFZpZXcobFZpZXcpKSB7XG4gICAgbFZpZXcgPSBsVmlld1tIRUFERVJfT0ZGU0VUXTtcbiAgfVxuICByZXR1cm4gbFZpZXc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbm5vdGF0ZUZvckh5ZHJhdGlvbihlbGVtZW50OiBFbGVtZW50LCBsVmlldzogTFZpZXcpOiB2b2lkIHtcbiAgY29uc3QgcmF3TmdoID0gc2VyaWFsaXplTFZpZXcobFZpZXcsIGVsZW1lbnQpO1xuICBjb25zdCBzZXJpYWxpemVkTmdoID0gSlNPTi5zdHJpbmdpZnkocmF3TmdoKTtcbiAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ25naCcsIHNlcmlhbGl6ZWROZ2gpO1xufVxuXG5mdW5jdGlvbiBfcmVuZGVyPFQ+KFxuICAgIHBsYXRmb3JtOiBQbGF0Zm9ybVJlZixcbiAgICBib290c3RyYXBQcm9taXNlOiBQcm9taXNlPE5nTW9kdWxlUmVmPFQ+fEFwcGxpY2F0aW9uUmVmPik6IFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBib290c3RyYXBQcm9taXNlLnRoZW4oKG1vZHVsZU9yQXBwbGljYXRpb25SZWYpID0+IHtcbiAgICBjb25zdCBlbnZpcm9ubWVudEluamVjdG9yID0gbW9kdWxlT3JBcHBsaWNhdGlvblJlZi5pbmplY3RvcjtcbiAgICBjb25zdCB0cmFuc2l0aW9uSWQgPSBlbnZpcm9ubWVudEluamVjdG9yLmdldCjJtVRSQU5TSVRJT05fSUQsIG51bGwpO1xuICAgIGlmICghdHJhbnNpdGlvbklkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYHJlbmRlck1vZHVsZVtGYWN0b3J5XSgpIHJlcXVpcmVzIHRoZSB1c2Ugb2YgQnJvd3Nlck1vZHVsZS53aXRoU2VydmVyVHJhbnNpdGlvbigpIHRvIGVuc3VyZVxudGhlIHNlcnZlci1yZW5kZXJlZCBhcHAgY2FuIGJlIHByb3Blcmx5IGJvb3RzdHJhcHBlZCBpbnRvIGEgY2xpZW50IGFwcC5gKTtcbiAgICB9XG4gICAgY29uc3QgYXBwbGljYXRpb25SZWY6IEFwcGxpY2F0aW9uUmVmID0gbW9kdWxlT3JBcHBsaWNhdGlvblJlZiBpbnN0YW5jZW9mIEFwcGxpY2F0aW9uUmVmID9cbiAgICAgICAgbW9kdWxlT3JBcHBsaWNhdGlvblJlZiA6XG4gICAgICAgIGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KEFwcGxpY2F0aW9uUmVmKTtcbiAgICBjb25zdCBzZXJ2ZXJDb250ZXh0ID1cbiAgICAgICAgc2FuaXRpemVTZXJ2ZXJDb250ZXh0KGVudmlyb25tZW50SW5qZWN0b3IuZ2V0KFNFUlZFUl9DT05URVhULCBERUZBVUxUX1NFUlZFUl9DT05URVhUKSk7XG4gICAgcmV0dXJuIGFwcGxpY2F0aW9uUmVmLmlzU3RhYmxlLnBpcGUoZmlyc3QoKGlzU3RhYmxlOiBib29sZWFuKSA9PiBpc1N0YWJsZSkpXG4gICAgICAgIC50b1Byb21pc2UoKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgYXBwZW5kU2VydmVyQ29udGV4dEluZm8oc2VydmVyQ29udGV4dCwgYXBwbGljYXRpb25SZWYpO1xuXG4gICAgICAgICAgY29uc3QgcGxhdGZvcm1TdGF0ZSA9IHBsYXRmb3JtLmluamVjdG9yLmdldChQbGF0Zm9ybVN0YXRlKTtcblxuICAgICAgICAgIGNvbnN0IGFzeW5jUHJvbWlzZXM6IFByb21pc2U8YW55PltdID0gW107XG5cbiAgICAgICAgICAvLyBSdW4gYW55IEJFRk9SRV9BUFBfU0VSSUFMSVpFRCBjYWxsYmFja3MganVzdCBiZWZvcmUgcmVuZGVyaW5nIHRvIHN0cmluZy5cbiAgICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBlbnZpcm9ubWVudEluamVjdG9yLmdldChCRUZPUkVfQVBQX1NFUklBTElaRUQsIG51bGwpO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjYWxsYmFjayBvZiBjYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYWxsYmFja1Jlc3VsdCA9IGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgaWYgKMm1aXNQcm9taXNlKGNhbGxiYWNrUmVzdWx0KSkge1xuICAgICAgICAgICAgICAgICAgLy8gVE9ETzogaW4gVFMzLjcsIGNhbGxiYWNrUmVzdWx0IGlzIHZvaWQuXG4gICAgICAgICAgICAgICAgICBhc3luY1Byb21pc2VzLnB1c2goY2FsbGJhY2tSZXN1bHQgYXMgYW55KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXhjZXB0aW9ucy5cbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0lnbm9yaW5nIEJFRk9SRV9BUFBfU0VSSUFMSVpFRCBFeGNlcHRpb246ICcsIGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgY29tcGxldGUgPSAoKSA9PiB7XG4gICAgICAgICAgICBhcHBsaWNhdGlvblJlZi5jb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudFJlZikgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gY29tcG9uZW50UmVmLmxvY2F0aW9uLm5hdGl2ZUVsZW1lbnQ7XG4gICAgICAgICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgYW5ub3RhdGVGb3JIeWRyYXRpb24oZWxlbWVudCwgZ2V0TFZpZXdGcm9tUm9vdEVsZW1lbnQoZWxlbWVudCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3Qgb3V0cHV0ID0gcGxhdGZvcm1TdGF0ZS5yZW5kZXJUb1N0cmluZygpO1xuICAgICAgICAgICAgcGxhdGZvcm0uZGVzdHJveSgpO1xuICAgICAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKGFzeW5jUHJvbWlzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcGxldGUoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gUHJvbWlzZVxuICAgICAgICAgICAgICAuYWxsKGFzeW5jUHJvbWlzZXMubWFwKChhc3luY1Byb21pc2UpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXN5bmNQcm9taXNlLmNhdGNoKChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0lnbm9yaW5nIEJFRk9SRV9BUFBfU0VSSUFMSVpFRCBFeGNlcHRpb246ICcsIGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgLnRoZW4oY29tcGxldGUpO1xuICAgICAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogU3BlY2lmaWVzIHRoZSB2YWx1ZSB0aGF0IHNob3VsZCBiZSB1c2VkIGlmIG5vIHNlcnZlciBjb250ZXh0IHZhbHVlIGhhcyBiZWVuIHByb3ZpZGVkLlxuICovXG5jb25zdCBERUZBVUxUX1NFUlZFUl9DT05URVhUID0gJ290aGVyJztcblxuLyoqXG4gKiBBbiBpbnRlcm5hbCB0b2tlbiB0aGF0IGFsbG93cyBwcm92aWRpbmcgZXh0cmEgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHNlcnZlciBjb250ZXh0XG4gKiAoZS5nLiB3aGV0aGVyIFNTUiBvciBTU0cgd2FzIHVzZWQpLiBUaGUgdmFsdWUgaXMgYSBzdHJpbmcgYW5kIGNoYXJhY3RlcnMgb3RoZXJcbiAqIHRoYW4gW2EtekEtWjAtOVxcLV0gYXJlIHJlbW92ZWQuIFNlZSB0aGUgZGVmYXVsdCB2YWx1ZSBpbiBgREVGQVVMVF9TRVJWRVJfQ09OVEVYVGAgY29uc3QuXG4gKi9cbmV4cG9ydCBjb25zdCBTRVJWRVJfQ09OVEVYVCA9IG5ldyBJbmplY3Rpb25Ub2tlbjxzdHJpbmc+KCdTRVJWRVJfQ09OVEVYVCcpO1xuXG4vKipcbiAqIFNhbml0aXplcyBwcm92aWRlZCBzZXJ2ZXIgY29udGV4dDpcbiAqIC0gcmVtb3ZlcyBhbGwgY2hhcmFjdGVycyBvdGhlciB0aGFuIGEteiwgQS1aLCAwLTkgYW5kIGAtYFxuICogLSByZXR1cm5zIGBvdGhlcmAgaWYgbm90aGluZyBpcyBwcm92aWRlZCBvciB0aGUgc3RyaW5nIGlzIGVtcHR5IGFmdGVyIHNhbml0aXphdGlvblxuICovXG5mdW5jdGlvbiBzYW5pdGl6ZVNlcnZlckNvbnRleHQoc2VydmVyQ29udGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY29udGV4dCA9IHNlcnZlckNvbnRleHQucmVwbGFjZSgvW15hLXpBLVowLTlcXC1dL2csICcnKTtcbiAgcmV0dXJuIGNvbnRleHQubGVuZ3RoID4gMCA/IGNvbnRleHQgOiBERUZBVUxUX1NFUlZFUl9DT05URVhUO1xufVxuXG4vKipcbiAqIEJvb3RzdHJhcHMgYW4gYXBwbGljYXRpb24gdXNpbmcgcHJvdmlkZWQgTmdNb2R1bGUgYW5kIHNlcmlhbGl6ZXMgdGhlIHBhZ2UgY29udGVudCB0byBzdHJpbmcuXG4gKlxuICogQHBhcmFtIG1vZHVsZVR5cGUgQSByZWZlcmVuY2UgdG8gYW4gTmdNb2R1bGUgdGhhdCBzaG91bGQgYmUgdXNlZCBmb3IgYm9vdHN0cmFwLlxuICogQHBhcmFtIG9wdGlvbnMgQWRkaXRpb25hbCBjb25maWd1cmF0aW9uIGZvciB0aGUgcmVuZGVyIG9wZXJhdGlvbjpcbiAqICAtIGBkb2N1bWVudGAgLSB0aGUgZG9jdW1lbnQgb2YgdGhlIHBhZ2UgdG8gcmVuZGVyLCBlaXRoZXIgYXMgYW4gSFRNTCBzdHJpbmcgb3JcbiAqICAgICAgICAgICAgICAgICBhcyBhIHJlZmVyZW5jZSB0byB0aGUgYGRvY3VtZW50YCBpbnN0YW5jZS5cbiAqICAtIGB1cmxgIC0gdGhlIFVSTCBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKiAgLSBgZXh0cmFQcm92aWRlcnNgIC0gc2V0IG9mIHBsYXRmb3JtIGxldmVsIHByb3ZpZGVycyBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyTW9kdWxlPFQ+KFxuICAgIG1vZHVsZVR5cGU6IFR5cGU8VD4sXG4gICAgb3B0aW9uczoge2RvY3VtZW50Pzogc3RyaW5nfERvY3VtZW50OyB1cmw/OiBzdHJpbmc7IGV4dHJhUHJvdmlkZXJzPzogU3RhdGljUHJvdmlkZXJbXX0pOlxuICAgIFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHtkb2N1bWVudCwgdXJsLCBleHRyYVByb3ZpZGVyczogcGxhdGZvcm1Qcm92aWRlcnN9ID0gb3B0aW9ucztcbiAgY29uc3QgcGxhdGZvcm0gPSBfZ2V0UGxhdGZvcm0ocGxhdGZvcm1EeW5hbWljU2VydmVyLCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnN9KTtcbiAgcmV0dXJuIF9yZW5kZXIocGxhdGZvcm0sIHBsYXRmb3JtLmJvb3RzdHJhcE1vZHVsZShtb2R1bGVUeXBlKSk7XG59XG5cbi8qKlxuICogQm9vdHN0cmFwcyBhbiBpbnN0YW5jZSBvZiBhbiBBbmd1bGFyIGFwcGxpY2F0aW9uIGFuZCByZW5kZXJzIGl0IHRvIGEgc3RyaW5nLlxuICpcbiAqIE5vdGU6IHRoZSByb290IGNvbXBvbmVudCBwYXNzZWQgaW50byB0aGlzIGZ1bmN0aW9uICptdXN0KiBiZSBhIHN0YW5kYWxvbmUgb25lIChzaG91bGQgaGF2ZSB0aGVcbiAqIGBzdGFuZGFsb25lOiB0cnVlYCBmbGFnIGluIHRoZSBgQENvbXBvbmVudGAgZGVjb3JhdG9yIGNvbmZpZykuXG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogQENvbXBvbmVudCh7XG4gKiAgIHN0YW5kYWxvbmU6IHRydWUsXG4gKiAgIHRlbXBsYXRlOiAnSGVsbG8gd29ybGQhJ1xuICogfSlcbiAqIGNsYXNzIFJvb3RDb21wb25lbnQge31cbiAqXG4gKiBjb25zdCBvdXRwdXQ6IHN0cmluZyA9IGF3YWl0IHJlbmRlckFwcGxpY2F0aW9uKFJvb3RDb21wb25lbnQsIHthcHBJZDogJ3NlcnZlci1hcHAnfSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gcm9vdENvbXBvbmVudCBBIHJlZmVyZW5jZSB0byBhIFN0YW5kYWxvbmUgQ29tcG9uZW50IHRoYXQgc2hvdWxkIGJlIHJlbmRlcmVkLlxuICogQHBhcmFtIG9wdGlvbnMgQWRkaXRpb25hbCBjb25maWd1cmF0aW9uIGZvciB0aGUgcmVuZGVyIG9wZXJhdGlvbjpcbiAqICAtIGBhcHBJZGAgLSBhIHN0cmluZyBpZGVudGlmaWVyIG9mIHRoaXMgYXBwbGljYXRpb24uIFRoZSBhcHBJZCBpcyB1c2VkIHRvIHByZWZpeCBhbGxcbiAqICAgICAgICAgICAgICBzZXJ2ZXItZ2VuZXJhdGVkIHN0eWxpbmdzIGFuZCBzdGF0ZSBrZXlzIG9mIHRoZSBhcHBsaWNhdGlvbiBpbiBUcmFuc2ZlclN0YXRlXG4gKiAgICAgICAgICAgICAgdXNlLWNhc2VzLlxuICogIC0gYGRvY3VtZW50YCAtIHRoZSBkb2N1bWVudCBvZiB0aGUgcGFnZSB0byByZW5kZXIsIGVpdGhlciBhcyBhbiBIVE1MIHN0cmluZyBvclxuICogICAgICAgICAgICAgICAgIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBgZG9jdW1lbnRgIGluc3RhbmNlLlxuICogIC0gYHVybGAgLSB0aGUgVVJMIGZvciB0aGUgY3VycmVudCByZW5kZXIgcmVxdWVzdC5cbiAqICAtIGBwcm92aWRlcnNgIC0gc2V0IG9mIGFwcGxpY2F0aW9uIGxldmVsIHByb3ZpZGVycyBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKiAgLSBgcGxhdGZvcm1Qcm92aWRlcnNgIC0gdGhlIHBsYXRmb3JtIGxldmVsIHByb3ZpZGVycyBmb3IgdGhlIGN1cnJlbnQgcmVuZGVyIHJlcXVlc3QuXG4gKlxuICogQHJldHVybnMgQSBQcm9taXNlLCB0aGF0IHJldHVybnMgc2VyaWFsaXplZCAodG8gYSBzdHJpbmcpIHJlbmRlcmVkIHBhZ2UsIG9uY2UgcmVzb2x2ZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckFwcGxpY2F0aW9uPFQ+KHJvb3RDb21wb25lbnQ6IFR5cGU8VD4sIG9wdGlvbnM6IHtcbiAgYXBwSWQ6IHN0cmluZztcbiAgZG9jdW1lbnQ/OiBzdHJpbmcgfCBEb2N1bWVudDtcbiAgdXJsPzogc3RyaW5nO1xuICBwcm92aWRlcnM/OiBBcnJheTxQcm92aWRlcnxFbnZpcm9ubWVudFByb3ZpZGVycz47XG4gIHBsYXRmb3JtUHJvdmlkZXJzPzogUHJvdmlkZXJbXTtcbn0pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnMsIGFwcElkfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtRHluYW1pY1NlcnZlciwge2RvY3VtZW50LCB1cmwsIHBsYXRmb3JtUHJvdmlkZXJzfSk7XG4gIGNvbnN0IGFwcFByb3ZpZGVycyA9IFtcbiAgICBpbXBvcnRQcm92aWRlcnNGcm9tKEJyb3dzZXJNb2R1bGUud2l0aFNlcnZlclRyYW5zaXRpb24oe2FwcElkfSkpLFxuICAgIGltcG9ydFByb3ZpZGVyc0Zyb20oU2VydmVyTW9kdWxlKSxcbiAgICAuLi5UUkFOU0ZFUl9TVEFURV9TRVJJQUxJWkFUSU9OX1BST1ZJREVSUyxcbiAgICAuLi4ob3B0aW9ucy5wcm92aWRlcnMgPz8gW10pLFxuICBdO1xuICByZXR1cm4gX3JlbmRlcihwbGF0Zm9ybSwgaW50ZXJuYWxDcmVhdGVBcHBsaWNhdGlvbih7cm9vdENvbXBvbmVudCwgYXBwUHJvdmlkZXJzfSkpO1xufVxuXG4vKipcbiAqIEJvb3RzdHJhcHMgYW4gYXBwbGljYXRpb24gdXNpbmcgcHJvdmlkZWQge0BsaW5rIE5nTW9kdWxlRmFjdG9yeX0gYW5kIHNlcmlhbGl6ZXMgdGhlIHBhZ2UgY29udGVudFxuICogdG8gc3RyaW5nLlxuICpcbiAqIEBwYXJhbSBtb2R1bGVGYWN0b3J5IEFuIGluc3RhbmNlIG9mIHRoZSB7QGxpbmsgTmdNb2R1bGVGYWN0b3J5fSB0aGF0IHNob3VsZCBiZSB1c2VkIGZvclxuICogICAgIGJvb3RzdHJhcC5cbiAqIEBwYXJhbSBvcHRpb25zIEFkZGl0aW9uYWwgY29uZmlndXJhdGlvbiBmb3IgdGhlIHJlbmRlciBvcGVyYXRpb246XG4gKiAgLSBgZG9jdW1lbnRgIC0gdGhlIGRvY3VtZW50IG9mIHRoZSBwYWdlIHRvIHJlbmRlciwgZWl0aGVyIGFzIGFuIEhUTUwgc3RyaW5nIG9yXG4gKiAgICAgICAgICAgICAgICAgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGBkb2N1bWVudGAgaW5zdGFuY2UuXG4gKiAgLSBgdXJsYCAtIHRoZSBVUkwgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICogIC0gYGV4dHJhUHJvdmlkZXJzYCAtIHNldCBvZiBwbGF0Zm9ybSBsZXZlbCBwcm92aWRlcnMgZm9yIHRoZSBjdXJyZW50IHJlbmRlciByZXF1ZXN0LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqXG4gKiBAZGVwcmVjYXRlZFxuICogVGhpcyBzeW1ib2wgaXMgbm8gbG9uZ2VyIG5lY2Vzc2FyeSBhcyBvZiBBbmd1bGFyIHYxMy5cbiAqIFVzZSB7QGxpbmsgcmVuZGVyTW9kdWxlfSBBUEkgaW5zdGVhZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlck1vZHVsZUZhY3Rvcnk8VD4oXG4gICAgbW9kdWxlRmFjdG9yeTogTmdNb2R1bGVGYWN0b3J5PFQ+LFxuICAgIG9wdGlvbnM6IHtkb2N1bWVudD86IHN0cmluZzsgdXJsPzogc3RyaW5nOyBleHRyYVByb3ZpZGVycz86IFN0YXRpY1Byb3ZpZGVyW119KTpcbiAgICBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7ZG9jdW1lbnQsIHVybCwgZXh0cmFQcm92aWRlcnM6IHBsYXRmb3JtUHJvdmlkZXJzfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHBsYXRmb3JtID0gX2dldFBsYXRmb3JtKHBsYXRmb3JtU2VydmVyLCB7ZG9jdW1lbnQsIHVybCwgcGxhdGZvcm1Qcm92aWRlcnN9KTtcbiAgcmV0dXJuIF9yZW5kZXIocGxhdGZvcm0sIHBsYXRmb3JtLmJvb3RzdHJhcE1vZHVsZUZhY3RvcnkobW9kdWxlRmFjdG9yeSkpO1xufVxuIl19