/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EnvironmentInjector } from '../di/r3_injector';
import { CONTAINERS } from '../hydration/interfaces';
import { isInSkipHydrationBlock } from '../hydration/skip_hydration';
import { isNodeDisconnected, markRNodeAsClaimedForHydration, retrieveNghInfo } from '../hydration/utils';
import { findMatchingDehydratedView, locateDehydratedViewsInContainer } from '../hydration/views';
import { isType } from '../interface/type';
import { assertNodeInjector, assertRComment } from '../render3/assert';
import { ComponentFactory as R3ComponentFactory } from '../render3/component_ref';
import { getComponentDef } from '../render3/definition';
import { getParentInjectorLocation, NodeInjector } from '../render3/di';
import { addToViewTree, createLContainer } from '../render3/instructions/shared';
import { CONTAINER_HEADER_OFFSET, DEHYDRATED_VIEWS, NATIVE, VIEW_REFS } from '../render3/interfaces/container';
import { isLContainer } from '../render3/interfaces/type_checks';
import { HEADER_OFFSET, HYDRATION_INFO, PARENT, RENDERER, T_HOST, TVIEW } from '../render3/interfaces/view';
import { assertTNodeType } from '../render3/node_assert';
import { addViewToContainer, destroyLView, detachView, getBeforeNodeForView, insertView, nativeInsertBefore, nativeNextSibling, nativeParentNode } from '../render3/node_manipulation';
import { getCurrentTNode, getLView } from '../render3/state';
import { getParentInjectorIndex, getParentInjectorView, hasParentInjector } from '../render3/util/injector_utils';
import { getNativeByTNode, unwrapRNode, viewAttachedToContainer } from '../render3/util/view_utils';
import { ViewRef as R3ViewRef } from '../render3/view_ref';
import { addToArray, removeFromArray } from '../util/array_utils';
import { assertDefined, assertEqual, assertGreaterThan, assertLessThan, throwError } from '../util/assert';
import { createElementRef } from './element_ref';
/**
 * Represents a container where one or more views can be attached to a component.
 *
 * Can contain *host views* (created by instantiating a
 * component with the `createComponent()` method), and *embedded views*
 * (created by instantiating a `TemplateRef` with the `createEmbeddedView()` method).
 *
 * A view container instance can contain other view containers,
 * creating a [view hierarchy](guide/glossary#view-tree).
 *
 * @see `ComponentRef`
 * @see `EmbeddedViewRef`
 *
 * @publicApi
 */
export class ViewContainerRef {
}
/**
 * @internal
 * @nocollapse
 */
ViewContainerRef.__NG_ELEMENT_ID__ = injectViewContainerRef;
/**
 * Creates a ViewContainerRef and stores it on the injector. Or, if the ViewContainerRef
 * already exists, retrieves the existing ViewContainerRef.
 *
 * @returns The ViewContainerRef instance to use
 */
export function injectViewContainerRef() {
    const previousTNode = getCurrentTNode();
    return createContainerRef(previousTNode, getLView());
}
const VE_ViewContainerRef = ViewContainerRef;
// TODO(alxhub): cleaning up this indirection triggers a subtle bug in Closure in g3. Once the fix
// for that lands, this can be cleaned up.
const R3ViewContainerRef = class ViewContainerRef extends VE_ViewContainerRef {
    constructor(_lContainer, _hostTNode, _hostLView) {
        super();
        this._lContainer = _lContainer;
        this._hostTNode = _hostTNode;
        this._hostLView = _hostLView;
    }
    get element() {
        return createElementRef(this._hostTNode, this._hostLView);
    }
    get injector() {
        return new NodeInjector(this._hostTNode, this._hostLView);
    }
    /** @deprecated No replacement */
    get parentInjector() {
        const parentLocation = getParentInjectorLocation(this._hostTNode, this._hostLView);
        if (hasParentInjector(parentLocation)) {
            const parentView = getParentInjectorView(parentLocation, this._hostLView);
            const injectorIndex = getParentInjectorIndex(parentLocation);
            ngDevMode && assertNodeInjector(parentView, injectorIndex);
            const parentTNode = parentView[TVIEW].data[injectorIndex + 8 /* NodeInjectorOffset.TNODE */];
            return new NodeInjector(parentTNode, parentView);
        }
        else {
            return new NodeInjector(null, this._hostLView);
        }
    }
    clear() {
        while (this.length > 0) {
            this.remove(this.length - 1);
        }
    }
    get(index) {
        const viewRefs = getViewRefs(this._lContainer);
        return viewRefs !== null && viewRefs[index] || null;
    }
    get length() {
        return this._lContainer.length - CONTAINER_HEADER_OFFSET;
    }
    createEmbeddedView(templateRef, context, indexOrOptions) {
        let index;
        let injector;
        if (typeof indexOrOptions === 'number') {
            index = indexOrOptions;
        }
        else if (indexOrOptions != null) {
            index = indexOrOptions.index;
            injector = indexOrOptions.injector;
        }
        let hydrationInfo = null;
        const ssrId = templateRef.ssrId;
        if (ssrId) {
            hydrationInfo = findMatchingDehydratedView(this._lContainer, ssrId);
        }
        const viewRef = templateRef.createEmbeddedViewImpl(context || {}, injector, hydrationInfo);
        this.insertImpl(viewRef, index, !!hydrationInfo);
        return viewRef;
    }
    createComponent(componentFactoryOrType, indexOrOptions, injector, projectableNodes, environmentInjector) {
        const isComponentFactory = componentFactoryOrType && !isType(componentFactoryOrType);
        let index;
        // This function supports 2 signatures and we need to handle options correctly for both:
        //   1. When first argument is a Component type. This signature also requires extra
        //      options to be provided as as object (more ergonomic option).
        //   2. First argument is a Component factory. In this case extra options are represented as
        //      positional arguments. This signature is less ergonomic and will be deprecated.
        if (isComponentFactory) {
            if (ngDevMode) {
                assertEqual(typeof indexOrOptions !== 'object', true, 'It looks like Component factory was provided as the first argument ' +
                    'and an options object as the second argument. This combination of arguments ' +
                    'is incompatible. You can either change the first argument to provide Component ' +
                    'type or change the second argument to be a number (representing an index at ' +
                    'which to insert the new component\'s host view into this container)');
            }
            index = indexOrOptions;
        }
        else {
            if (ngDevMode) {
                assertDefined(getComponentDef(componentFactoryOrType), `Provided Component class doesn't contain Component definition. ` +
                    `Please check whether provided class has @Component decorator.`);
                assertEqual(typeof indexOrOptions !== 'number', true, 'It looks like Component type was provided as the first argument ' +
                    'and a number (representing an index at which to insert the new component\'s ' +
                    'host view into this container as the second argument. This combination of arguments ' +
                    'is incompatible. Please use an object as the second argument instead.');
            }
            const options = (indexOrOptions || {});
            if (ngDevMode && options.environmentInjector && options.ngModuleRef) {
                throwError(`Cannot pass both environmentInjector and ngModuleRef options to createComponent().`);
            }
            index = options.index;
            injector = options.injector;
            projectableNodes = options.projectableNodes;
            environmentInjector = options.environmentInjector || options.ngModuleRef;
        }
        const componentFactory = isComponentFactory ?
            componentFactoryOrType :
            new R3ComponentFactory(getComponentDef(componentFactoryOrType));
        const contextInjector = injector || this.parentInjector;
        // If an `NgModuleRef` is not provided explicitly, try retrieving it from the DI tree.
        if (!environmentInjector && componentFactory.ngModule == null) {
            // For the `ComponentFactory` case, entering this logic is very unlikely, since we expect that
            // an instance of a `ComponentFactory`, resolved via `ComponentFactoryResolver` would have an
            // `ngModule` field. This is possible in some test scenarios and potentially in some JIT-based
            // use-cases. For the `ComponentFactory` case we preserve backwards-compatibility and try
            // using a provided injector first, then fall back to the parent injector of this
            // `ViewContainerRef` instance.
            //
            // For the factory-less case, it's critical to establish a connection with the module
            // injector tree (by retrieving an instance of an `NgModuleRef` and accessing its injector),
            // so that a component can use DI tokens provided in MgModules. For this reason, we can not
            // rely on the provided injector, since it might be detached from the DI tree (for example, if
            // it was created via `Injector.create` without specifying a parent injector, or if an
            // injector is retrieved from an `NgModuleRef` created via `createNgModule` using an
            // NgModule outside of a module tree). Instead, we always use `ViewContainerRef`'s parent
            // injector, which is normally connected to the DI tree, which includes module injector
            // subtree.
            const _injector = isComponentFactory ? contextInjector : this.parentInjector;
            // DO NOT REFACTOR. The code here used to have a `injector.get(NgModuleRef, null) ||
            // undefined` expression which seems to cause internal google apps to fail. This is documented
            // in the following internal bug issue: go/b/142967802
            const result = _injector.get(EnvironmentInjector, null);
            if (result) {
                environmentInjector = result;
            }
        }
        // TODO: this is not correct for selectors like `app[param]`,
        // we need to rely on some other info (like component id),
        // see https://github.com/angular/angular/pull/48253.
        const componentDef = getComponentDef(componentFactory.componentType);
        const dehydratedView = findMatchingDehydratedView(this._lContainer, componentDef.id);
        let rNode;
        let hydrationInfo = null;
        if (dehydratedView) {
            // Pointer to a host DOM element.
            rNode = dehydratedView.firstChild;
            // Read hydration info and pass it over to the component view.
            hydrationInfo = retrieveNghInfo(rNode, environmentInjector);
        }
        const componentRef = componentFactory.createImpl(contextInjector, projectableNodes, rNode, environmentInjector, hydrationInfo);
        this.insertImpl(componentRef.hostView, index, !!hydrationInfo);
        return componentRef;
    }
    insert(viewRef, index) {
        return this.insertImpl(viewRef, index, false);
    }
    insertImpl(viewRef, index, preventDOMInsertion) {
        const lView = viewRef._lView;
        const tView = lView[TVIEW];
        if (ngDevMode && viewRef.destroyed) {
            throw new Error('Cannot insert a destroyed View in a ViewContainer!');
        }
        if (viewAttachedToContainer(lView)) {
            // If view is already attached, detach it first so we clean up references appropriately.
            const prevIdx = this.indexOf(viewRef);
            // A view might be attached either to this or a different container. The `prevIdx` for
            // those cases will be:
            // equal to -1 for views attached to this ViewContainerRef
            // >= 0 for views attached to a different ViewContainerRef
            if (prevIdx !== -1) {
                this.detach(prevIdx);
            }
            else {
                const prevLContainer = lView[PARENT];
                ngDevMode &&
                    assertEqual(isLContainer(prevLContainer), true, 'An attached view should have its PARENT point to a container.');
                // We need to re-create a R3ViewContainerRef instance since those are not stored on
                // LView (nor anywhere else).
                const prevVCRef = new R3ViewContainerRef(prevLContainer, prevLContainer[T_HOST], prevLContainer[PARENT]);
                prevVCRef.detach(prevVCRef.indexOf(viewRef));
            }
        }
        // Logical operation of adding `LView` to `LContainer`
        const adjustedIdx = this._adjustIndex(index);
        const lContainer = this._lContainer;
        insertView(tView, lView, lContainer, adjustedIdx);
        // Physical operation of adding the DOM nodes.
        if (!preventDOMInsertion) {
            const beforeNode = getBeforeNodeForView(adjustedIdx, lContainer);
            const renderer = lView[RENDERER];
            const parentRNode = nativeParentNode(renderer, lContainer[NATIVE]);
            if (parentRNode !== null) {
                addViewToContainer(tView, lContainer[T_HOST], renderer, lView, parentRNode, beforeNode);
            }
        }
        viewRef.attachToViewContainerRef();
        addToArray(getOrCreateViewRefs(lContainer), adjustedIdx, viewRef);
        return viewRef;
    }
    move(viewRef, newIndex) {
        if (ngDevMode && viewRef.destroyed) {
            throw new Error('Cannot move a destroyed View in a ViewContainer!');
        }
        return this.insert(viewRef, newIndex);
    }
    indexOf(viewRef) {
        const viewRefsArr = getViewRefs(this._lContainer);
        return viewRefsArr !== null ? viewRefsArr.indexOf(viewRef) : -1;
    }
    remove(index) {
        const adjustedIdx = this._adjustIndex(index, -1);
        const detachedView = detachView(this._lContainer, adjustedIdx);
        if (detachedView) {
            // Before destroying the view, remove it from the container's array of `ViewRef`s.
            // This ensures the view container length is updated before calling
            // `destroyLView`, which could recursively call view container methods that
            // rely on an accurate container length.
            // (e.g. a method on this view container being called by a child directive's OnDestroy
            // lifecycle hook)
            removeFromArray(getOrCreateViewRefs(this._lContainer), adjustedIdx);
            destroyLView(detachedView[TVIEW], detachedView);
        }
    }
    detach(index) {
        const adjustedIdx = this._adjustIndex(index, -1);
        const view = detachView(this._lContainer, adjustedIdx);
        const wasDetached = view && removeFromArray(getOrCreateViewRefs(this._lContainer), adjustedIdx) != null;
        return wasDetached ? new R3ViewRef(view) : null;
    }
    _adjustIndex(index, shift = 0) {
        if (index == null) {
            return this.length + shift;
        }
        if (ngDevMode) {
            assertGreaterThan(index, -1, `ViewRef index must be positive, got ${index}`);
            // +1 because it's legal to insert at the end.
            assertLessThan(index, this.length + 1 + shift, 'index');
        }
        return index;
    }
};
function getViewRefs(lContainer) {
    return lContainer[VIEW_REFS];
}
function getOrCreateViewRefs(lContainer) {
    return (lContainer[VIEW_REFS] || (lContainer[VIEW_REFS] = []));
}
/**
 * Creates a ViewContainerRef and stores it on the injector.
 *
 * @param ViewContainerRefToken The ViewContainerRef type
 * @param ElementRefToken The ElementRef type
 * @param hostTNode The node that is requesting a ViewContainerRef
 * @param hostLView The view to which the node belongs
 * @returns The ViewContainerRef instance to use
 */
export function createContainerRef(hostTNode, hostLView) {
    ngDevMode && assertTNodeType(hostTNode, 12 /* TNodeType.AnyContainer */ | 3 /* TNodeType.AnyRNode */);
    let lContainer;
    const slotValue = hostLView[hostTNode.index];
    if (isLContainer(slotValue)) {
        // If the host is a container, we don't need to create a new LContainer
        lContainer = slotValue;
    }
    else {
        lContainer = _locateOrCreateContainerRefImpl(hostLView, hostTNode, slotValue);
        hostLView[hostTNode.index] = lContainer;
        addToViewTree(hostLView, lContainer);
    }
    return new R3ViewContainerRef(lContainer, hostTNode, hostLView);
}
function insertAnchorNode(hostLView, hostTNode) {
    // If the host is a regular element, we have to insert a comment node manually which will
    // be used as an anchor when inserting elements. In this specific case we use low-level DOM
    // manipulation to insert it.
    const renderer = hostLView[RENDERER];
    ngDevMode && ngDevMode.rendererCreateComment++;
    const commentNode = renderer.createComment(ngDevMode ? 'container' : '');
    const hostNative = getNativeByTNode(hostTNode, hostLView);
    const parentOfHostNative = nativeParentNode(renderer, hostNative);
    nativeInsertBefore(renderer, parentOfHostNative, commentNode, nativeNextSibling(renderer, hostNative), false);
    return commentNode;
}
/**
 * Reference to the current implementation of the create container ref function.
 * If hydration is enabled, this implementation is swapped with a version that
 * performs lookups in live DOM.
 */
let _locateOrCreateContainerRefImpl = (hostLView, hostTNode, slotValue) => {
    let commentNode;
    // If the host is an element container, the native host element is guaranteed to be a
    // comment and we can reuse that comment as anchor element for the new LContainer.
    // The comment node in question is already part of the DOM structure so we don't need to append
    // it again.
    if (hostTNode.type & 8 /* TNodeType.ElementContainer */) {
        commentNode = unwrapRNode(slotValue);
    }
    else {
        commentNode = insertAnchorNode(hostLView, hostTNode);
    }
    return createLContainer(slotValue, hostLView, commentNode, hostTNode);
};
function locateOrCreateContainerRefImpl(hostLView, hostTNode, slotValue) {
    let nghContainer;
    let dehydratedViews = [];
    const ngh = hostLView[HYDRATION_INFO];
    const index = hostTNode.index - HEADER_OFFSET;
    const isCreating = !ngh || isInSkipHydrationBlock(hostTNode, hostLView) || isNodeDisconnected(ngh, index);
    if (!isCreating) {
        nghContainer = ngh.data[CONTAINERS][index];
        ngDevMode &&
            assertDefined(nghContainer, 'There is no hydration info available for this container');
    }
    let commentNode;
    // If the host is an element container, the native host element is guaranteed to be a
    // comment and we can reuse that comment as anchor element for the new LContainer.
    // The comment node in question is already part of the DOM structure so we don't need to append
    // it again.
    if (hostTNode.type & 8 /* TNodeType.ElementContainer */) {
        commentNode = unwrapRNode(slotValue);
        if (!isCreating) {
            const elementContainer = ngh.elementContainers?.[index];
            if (elementContainer && Array.isArray(elementContainer.dehydratedViews)) {
                // When we create an LContainer based on `<ng-container>`, the container
                // is already processed, including dehydrated views info. Reuse this info
                // and erase it in the ngh data to avoid memory leaks.
                dehydratedViews = elementContainer.dehydratedViews;
                elementContainer.dehydratedViews = [];
            }
        }
    }
    else {
        if (isCreating) {
            commentNode = insertAnchorNode(hostLView, hostTNode);
        }
        else {
            // Start with a node that immediately follows the DOM node found
            // in an LView slot. This node is:
            // - either an anchor comment node of this container if it's empty
            // - or a first element of the first view in this container
            let currentRNode = unwrapRNode(slotValue).nextSibling;
            // TODO: Add assert that the currentRNode exists
            const [anchorRNode, views] = locateDehydratedViewsInContainer(currentRNode, nghContainer);
            commentNode = anchorRNode;
            dehydratedViews = views;
            ngDevMode && assertRComment(commentNode, 'Expecting a comment node in template instruction');
            ngDevMode && markRNodeAsClaimedForHydration(commentNode);
        }
    }
    const lContainer = createLContainer(slotValue, hostLView, commentNode, hostTNode);
    if (ngh && dehydratedViews.length > 0) {
        lContainer[DEHYDRATED_VIEWS] = dehydratedViews;
    }
    return lContainer;
}
export function enableLocateOrCreateContainerRefImpl() {
    _locateOrCreateContainerRefImpl = locateOrCreateContainerRefImpl;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld19jb250YWluZXJfcmVmLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvbGlua2VyL3ZpZXdfY29udGFpbmVyX3JlZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFHSCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMsVUFBVSxFQUFnRCxNQUFNLHlCQUF5QixDQUFDO0FBQ2xHLE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQ25FLE9BQU8sRUFBQyxrQkFBa0IsRUFBRSw4QkFBOEIsRUFBRSxlQUFlLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUN2RyxPQUFPLEVBQUMsMEJBQTBCLEVBQUUsZ0NBQWdDLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRyxPQUFPLEVBQUMsTUFBTSxFQUFPLE1BQU0sbUJBQW1CLENBQUM7QUFDL0MsT0FBTyxFQUFDLGtCQUFrQixFQUFFLGNBQWMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ3JFLE9BQU8sRUFBQyxnQkFBZ0IsSUFBSSxrQkFBa0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ2hGLE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMseUJBQXlCLEVBQUUsWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3RFLE9BQU8sRUFBQyxhQUFhLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMvRSxPQUFPLEVBQUMsdUJBQXVCLEVBQUUsZ0JBQWdCLEVBQWMsTUFBTSxFQUFFLFNBQVMsRUFBQyxNQUFNLGlDQUFpQyxDQUFDO0FBSXpILE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUMsYUFBYSxFQUFFLGNBQWMsRUFBUyxN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WUFBWSxHQUFJLFdBQVcsQ0FBQyxTQUFTLENBQVcsQ0FBQyxXQUFXLENBQUM7WUFDakUsZ0RBQWdEO1lBQ2hELE1BQU0sQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLEdBQUcsZ0NBQWdDLENBQUMsWUFBYSxFQUFFLFlBQWEsQ0FBQyxDQUFDO1lBRTVGLFdBQVcsR0FBRyxXQUF1QixDQUFDO1lBQ3RDLGVBQWUsR0FBRyxLQUFLLENBQUM7WUFFeEIsU0FBUyxJQUFJLGNBQWMsQ0FBQyxXQUFXLEVBQUUsa0RBQWtELENBQUMsQ0FBQztZQUM3RixTQUFTLElBQUksOEJBQThCLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDMUQ7S0FDRjtJQUNELE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2xGLElBQUksR0FBRyxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3JDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLGVBQWUsQ0FBQztLQUNoRDtJQUNELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsb0NBQW9DO0lBQ2xELCtCQUErQixHQUFHLDhCQUE4QixDQUFDO0FBQ25FLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtJbmplY3Rvcn0gZnJvbSAnLi4vZGkvaW5qZWN0b3InO1xuaW1wb3J0IHtFbnZpcm9ubWVudEluamVjdG9yfSBmcm9tICcuLi9kaS9yM19pbmplY3Rvcic7XG5pbXBvcnQge0NPTlRBSU5FUlMsIE5naENvbnRhaW5lciwgTmdoRG9tSW5zdGFuY2UsIE5naFZpZXdJbnN0YW5jZX0gZnJvbSAnLi4vaHlkcmF0aW9uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtpc0luU2tpcEh5ZHJhdGlvbkJsb2NrfSBmcm9tICcuLi9oeWRyYXRpb24vc2tpcF9oeWRyYXRpb24nO1xuaW1wb3J0IHtpc05vZGVEaXNjb25uZWN0ZWQsIG1hcmtSTm9kZUFzQ2xhaW1lZEZvckh5ZHJhdGlvbiwgcmV0cmlldmVOZ2hJbmZvfSBmcm9tICcuLi9oeWRyYXRpb24vdXRpbHMnO1xuaW1wb3J0IHtmaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlldywgbG9jYXRlRGVoeWRyYXRlZFZpZXdzSW5Db250YWluZXJ9IGZyb20gJy4uL2h5ZHJhdGlvbi92aWV3cyc7XG5pbXBvcnQge2lzVHlwZSwgVHlwZX0gZnJvbSAnLi4vaW50ZXJmYWNlL3R5cGUnO1xuaW1wb3J0IHthc3NlcnROb2RlSW5qZWN0b3IsIGFzc2VydFJDb21tZW50fSBmcm9tICcuLi9yZW5kZXIzL2Fzc2VydCc7XG5pbXBvcnQge0NvbXBvbmVudEZhY3RvcnkgYXMgUjNDb21wb25lbnRGYWN0b3J5fSBmcm9tICcuLi9yZW5kZXIzL2NvbXBvbmVudF9yZWYnO1xuaW1wb3J0IHtnZXRDb21wb25lbnREZWZ9IGZyb20gJy4uL3JlbmRlcjMvZGVmaW5pdGlvbic7XG5pbXBvcnQge2dldFBhcmVudEluamVjdG9yTG9jYXRpb24sIE5vZGVJbmplY3Rvcn0gZnJvbSAnLi4vcmVuZGVyMy9kaSc7XG5pbXBvcnQge2FkZFRvVmlld1RyZWUsIGNyZWF0ZUxDb250YWluZXJ9IGZyb20gJy4uL3JlbmRlcjMvaW5zdHJ1Y3Rpb25zL3NoYXJlZCc7XG5pbXBvcnQge0NPTlRBSU5FUl9IRUFERVJfT0ZGU0VULCBERUhZRFJBVEVEX1ZJRVdTLCBMQ29udGFpbmVyLCBOQVRJVkUsIFZJRVdfUkVGU30gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL2NvbnRhaW5lcic7XG5pbXBvcnQge05vZGVJbmplY3Rvck9mZnNldH0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL2luamVjdG9yJztcbmltcG9ydCB7VENvbnRhaW5lck5vZGUsIFREaXJlY3RpdmVIb3N0Tm9kZSwgVEVsZW1lbnRDb250YWluZXJOb2RlLCBURWxlbWVudE5vZGUsIFROb2RlLCBUTm9kZVR5cGV9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9ub2RlJztcbmltcG9ydCB7UkNvbW1lbnQsIFJFbGVtZW50LCBSTm9kZX0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3JlbmRlcmVyX2RvbSc7XG5pbXBvcnQge2lzTENvbnRhaW5lcn0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3R5cGVfY2hlY2tzJztcbmltcG9ydCB7SEVBREVSX09GRlNFVCwgSFlEUkFUSU9OX0lORk8sIExWaWV3LCBQQVJFTlQsIFJFTkRFUkVSLCBUX0hPU1QsIFRWSUVXfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvdmlldyc7XG5pbXBvcnQge2Fzc2VydFROb2RlVHlwZX0gZnJvbSAnLi4vcmVuZGVyMy9ub2RlX2Fzc2VydCc7XG5pbXBvcnQge2FkZFZpZXdUb0NvbnRhaW5lciwgZGVzdHJveUxWaWV3LCBkZXRhY2hWaWV3LCBnZXRCZWZvcmVOb2RlRm9yVmlldywgaW5zZXJ0VmlldywgbmF0aXZlSW5zZXJ0QmVmb3JlLCBuYXRpdmVOZXh0U2libGluZywgbmF0aXZlUGFyZW50Tm9kZX0gZnJvbSAnLi4vcmVuZGVyMy9ub2RlX21hbmlwdWxhdGlvbic7XG5pbXBvcnQge2dldEN1cnJlbnRUTm9kZSwgZ2V0TFZpZXd9IGZyb20gJy4uL3JlbmRlcjMvc3RhdGUnO1xuaW1wb3J0IHtnZXRQYXJlbnRJbmplY3RvckluZGV4LCBnZXRQYXJlbnRJbmplY3RvclZpZXcsIGhhc1BhcmVudEluamVjdG9yfSBmcm9tICcuLi9yZW5kZXIzL3V0aWwvaW5qZWN0b3JfdXRpbHMnO1xuaW1wb3J0IHtnZXROYXRpdmVCeVROb2RlLCB1bndyYXBSTm9kZSwgdmlld0F0dGFjaGVkVG9Db250YWluZXJ9IGZyb20gJy4uL3JlbmRlcjMvdXRpbC92aWV3X3V0aWxzJztcbmltcG9ydCB7Vmlld1JlZiBhcyBSM1ZpZXdSZWZ9IGZyb20gJy4uL3JlbmRlcjMvdmlld19yZWYnO1xuaW1wb3J0IHthZGRUb0FycmF5LCByZW1vdmVGcm9tQXJyYXl9IGZyb20gJy4uL3V0aWwvYXJyYXlfdXRpbHMnO1xuaW1wb3J0IHthc3NlcnREZWZpbmVkLCBhc3NlcnRFcXVhbCwgYXNzZXJ0R3JlYXRlclRoYW4sIGFzc2VydExlc3NUaGFuLCB0aHJvd0Vycm9yfSBmcm9tICcuLi91dGlsL2Fzc2VydCc7XG5cbmltcG9ydCB7Q29tcG9uZW50RmFjdG9yeSwgQ29tcG9uZW50UmVmfSBmcm9tICcuL2NvbXBvbmVudF9mYWN0b3J5JztcbmltcG9ydCB7Y3JlYXRlRWxlbWVudFJlZiwgRWxlbWVudFJlZn0gZnJvbSAnLi9lbGVtZW50X3JlZic7XG5pbXBvcnQge05nTW9kdWxlUmVmfSBmcm9tICcuL25nX21vZHVsZV9mYWN0b3J5JztcbmltcG9ydCB7VGVtcGxhdGVSZWZ9IGZyb20gJy4vdGVtcGxhdGVfcmVmJztcbmltcG9ydCB7RW1iZWRkZWRWaWV3UmVmLCBWaWV3UmVmfSBmcm9tICcuL3ZpZXdfcmVmJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY29udGFpbmVyIHdoZXJlIG9uZSBvciBtb3JlIHZpZXdzIGNhbiBiZSBhdHRhY2hlZCB0byBhIGNvbXBvbmVudC5cbiAqXG4gKiBDYW4gY29udGFpbiAqaG9zdCB2aWV3cyogKGNyZWF0ZWQgYnkgaW5zdGFudGlhdGluZyBhXG4gKiBjb21wb25lbnQgd2l0aCB0aGUgYGNyZWF0ZUNvbXBvbmVudCgpYCBtZXRob2QpLCBhbmQgKmVtYmVkZGVkIHZpZXdzKlxuICogKGNyZWF0ZWQgYnkgaW5zdGFudGlhdGluZyBhIGBUZW1wbGF0ZVJlZmAgd2l0aCB0aGUgYGNyZWF0ZUVtYmVkZGVkVmlldygpYCBtZXRob2QpLlxuICpcbiAqIEEgdmlldyBjb250YWluZXIgaW5zdGFuY2UgY2FuIGNvbnRhaW4gb3RoZXIgdmlldyBjb250YWluZXJzLFxuICogY3JlYXRpbmcgYSBbdmlldyBoaWVyYXJjaHldKGd1aWRlL2dsb3NzYXJ5I3ZpZXctdHJlZSkuXG4gKlxuICogQHNlZSBgQ29tcG9uZW50UmVmYFxuICogQHNlZSBgRW1iZWRkZWRWaWV3UmVmYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFZpZXdDb250YWluZXJSZWYge1xuICAvKipcbiAgICogQW5jaG9yIGVsZW1lbnQgdGhhdCBzcGVjaWZpZXMgdGhlIGxvY2F0aW9uIG9mIHRoaXMgY29udGFpbmVyIGluIHRoZSBjb250YWluaW5nIHZpZXcuXG4gICAqIEVhY2ggdmlldyBjb250YWluZXIgY2FuIGhhdmUgb25seSBvbmUgYW5jaG9yIGVsZW1lbnQsIGFuZCBlYWNoIGFuY2hvciBlbGVtZW50XG4gICAqIGNhbiBoYXZlIG9ubHkgYSBzaW5nbGUgdmlldyBjb250YWluZXIuXG4gICAqXG4gICAqIFJvb3QgZWxlbWVudHMgb2Ygdmlld3MgYXR0YWNoZWQgdG8gdGhpcyBjb250YWluZXIgYmVjb21lIHNpYmxpbmdzIG9mIHRoZSBhbmNob3IgZWxlbWVudCBpblxuICAgKiB0aGUgcmVuZGVyZWQgdmlldy5cbiAgICpcbiAgICogQWNjZXNzIHRoZSBgVmlld0NvbnRhaW5lclJlZmAgb2YgYW4gZWxlbWVudCBieSBwbGFjaW5nIGEgYERpcmVjdGl2ZWAgaW5qZWN0ZWRcbiAgICogd2l0aCBgVmlld0NvbnRhaW5lclJlZmAgb24gdGhlIGVsZW1lbnQsIG9yIHVzZSBhIGBWaWV3Q2hpbGRgIHF1ZXJ5LlxuICAgKlxuICAgKiA8IS0tIFRPRE86IHJlbmFtZSB0byBhbmNob3JFbGVtZW50IC0tPlxuICAgKi9cbiAgYWJzdHJhY3QgZ2V0IGVsZW1lbnQoKTogRWxlbWVudFJlZjtcblxuICAvKipcbiAgICogVGhlIFtkZXBlbmRlbmN5IGluamVjdG9yXShndWlkZS9nbG9zc2FyeSNpbmplY3RvcikgZm9yIHRoaXMgdmlldyBjb250YWluZXIuXG4gICAqL1xuICBhYnN0cmFjdCBnZXQgaW5qZWN0b3IoKTogSW5qZWN0b3I7XG5cbiAgLyoqIEBkZXByZWNhdGVkIE5vIHJlcGxhY2VtZW50ICovXG4gIGFic3RyYWN0IGdldCBwYXJlbnRJbmplY3RvcigpOiBJbmplY3RvcjtcblxuICAvKipcbiAgICogRGVzdHJveXMgYWxsIHZpZXdzIGluIHRoaXMgY29udGFpbmVyLlxuICAgKi9cbiAgYWJzdHJhY3QgY2xlYXIoKTogdm9pZDtcblxuICAvKipcbiAgICogUmV0cmlldmVzIGEgdmlldyBmcm9tIHRoaXMgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gaW5kZXggVGhlIDAtYmFzZWQgaW5kZXggb2YgdGhlIHZpZXcgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm5zIFRoZSBgVmlld1JlZmAgaW5zdGFuY2UsIG9yIG51bGwgaWYgdGhlIGluZGV4IGlzIG91dCBvZiByYW5nZS5cbiAgICovXG4gIGFic3RyYWN0IGdldChpbmRleDogbnVtYmVyKTogVmlld1JlZnxudWxsO1xuXG4gIC8qKlxuICAgKiBSZXBvcnRzIGhvdyBtYW55IHZpZXdzIGFyZSBjdXJyZW50bHkgYXR0YWNoZWQgdG8gdGhpcyBjb250YWluZXIuXG4gICAqIEByZXR1cm5zIFRoZSBudW1iZXIgb2Ygdmlld3MuXG4gICAqL1xuICBhYnN0cmFjdCBnZXQgbGVuZ3RoKCk6IG51bWJlcjtcblxuICAvKipcbiAgICogSW5zdGFudGlhdGVzIGFuIGVtYmVkZGVkIHZpZXcgYW5kIGluc2VydHMgaXRcbiAgICogaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogQHBhcmFtIHRlbXBsYXRlUmVmIFRoZSBIVE1MIHRlbXBsYXRlIHRoYXQgZGVmaW5lcyB0aGUgdmlldy5cbiAgICogQHBhcmFtIGNvbnRleHQgVGhlIGRhdGEtYmluZGluZyBjb250ZXh0IG9mIHRoZSBlbWJlZGRlZCB2aWV3LCBhcyBkZWNsYXJlZFxuICAgKiBpbiB0aGUgYDxuZy10ZW1wbGF0ZT5gIHVzYWdlLlxuICAgKiBAcGFyYW0gb3B0aW9ucyBFeHRyYSBjb25maWd1cmF0aW9uIGZvciB0aGUgY3JlYXRlZCB2aWV3LiBJbmNsdWRlczpcbiAgICogICogaW5kZXg6IFRoZSAwLWJhc2VkIGluZGV4IGF0IHdoaWNoIHRvIGluc2VydCB0aGUgbmV3IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogICAgICAgICAgIElmIG5vdCBzcGVjaWZpZWQsIGFwcGVuZHMgdGhlIG5ldyB2aWV3IGFzIHRoZSBsYXN0IGVudHJ5LlxuICAgKiAgKiBpbmplY3RvcjogSW5qZWN0b3IgdG8gYmUgdXNlZCB3aXRoaW4gdGhlIGVtYmVkZGVkIHZpZXcuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBgVmlld1JlZmAgaW5zdGFuY2UgZm9yIHRoZSBuZXdseSBjcmVhdGVkIHZpZXcuXG4gICAqL1xuICBhYnN0cmFjdCBjcmVhdGVFbWJlZGRlZFZpZXc8Qz4odGVtcGxhdGVSZWY6IFRlbXBsYXRlUmVmPEM+LCBjb250ZXh0PzogQywgb3B0aW9ucz86IHtcbiAgICBpbmRleD86IG51bWJlcixcbiAgICBpbmplY3Rvcj86IEluamVjdG9yXG4gIH0pOiBFbWJlZGRlZFZpZXdSZWY8Qz47XG5cbiAgLyoqXG4gICAqIEluc3RhbnRpYXRlcyBhbiBlbWJlZGRlZCB2aWV3IGFuZCBpbnNlcnRzIGl0XG4gICAqIGludG8gdGhpcyBjb250YWluZXIuXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZVJlZiBUaGUgSFRNTCB0ZW1wbGF0ZSB0aGF0IGRlZmluZXMgdGhlIHZpZXcuXG4gICAqIEBwYXJhbSBjb250ZXh0IFRoZSBkYXRhLWJpbmRpbmcgY29udGV4dCBvZiB0aGUgZW1iZWRkZWQgdmlldywgYXMgZGVjbGFyZWRcbiAgICogaW4gdGhlIGA8bmctdGVtcGxhdGU+YCB1c2FnZS5cbiAgICogQHBhcmFtIGluZGV4IFRoZSAwLWJhc2VkIGluZGV4IGF0IHdoaWNoIHRvIGluc2VydCB0aGUgbmV3IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogSWYgbm90IHNwZWNpZmllZCwgYXBwZW5kcyB0aGUgbmV3IHZpZXcgYXMgdGhlIGxhc3QgZW50cnkuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBgVmlld1JlZmAgaW5zdGFuY2UgZm9yIHRoZSBuZXdseSBjcmVhdGVkIHZpZXcuXG4gICAqL1xuICBhYnN0cmFjdCBjcmVhdGVFbWJlZGRlZFZpZXc8Qz4odGVtcGxhdGVSZWY6IFRlbXBsYXRlUmVmPEM+LCBjb250ZXh0PzogQywgaW5kZXg/OiBudW1iZXIpOlxuICAgICAgRW1iZWRkZWRWaWV3UmVmPEM+O1xuXG4gIC8qKlxuICAgKiBJbnN0YW50aWF0ZXMgYSBzaW5nbGUgY29tcG9uZW50IGFuZCBpbnNlcnRzIGl0cyBob3N0IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBvbmVudFR5cGUgQ29tcG9uZW50IFR5cGUgdG8gdXNlLlxuICAgKiBAcGFyYW0gb3B0aW9ucyBBbiBvYmplY3QgdGhhdCBjb250YWlucyBleHRyYSBwYXJhbWV0ZXJzOlxuICAgKiAgKiBpbmRleDogdGhlIGluZGV4IGF0IHdoaWNoIHRvIGluc2VydCB0aGUgbmV3IGNvbXBvbmVudCdzIGhvc3QgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKiAgICAgICAgICAgSWYgbm90IHNwZWNpZmllZCwgYXBwZW5kcyB0aGUgbmV3IHZpZXcgYXMgdGhlIGxhc3QgZW50cnkuXG4gICAqICAqIGluamVjdG9yOiB0aGUgaW5qZWN0b3IgdG8gdXNlIGFzIHRoZSBwYXJlbnQgZm9yIHRoZSBuZXcgY29tcG9uZW50LlxuICAgKiAgKiBuZ01vZHVsZVJlZjogYW4gTmdNb2R1bGVSZWYgb2YgdGhlIGNvbXBvbmVudCdzIE5nTW9kdWxlLCB5b3Ugc2hvdWxkIGFsbW9zdCBhbHdheXMgcHJvdmlkZVxuICAgKiAgICAgICAgICAgICAgICAgdGhpcyB0byBlbnN1cmUgdGhhdCBhbGwgZXhwZWN0ZWQgcHJvdmlkZXJzIGFyZSBhdmFpbGFibGUgZm9yIHRoZSBjb21wb25lbnRcbiAgICogICAgICAgICAgICAgICAgIGluc3RhbnRpYXRpb24uXG4gICAqICAqIGVudmlyb25tZW50SW5qZWN0b3I6IGFuIEVudmlyb25tZW50SW5qZWN0b3Igd2hpY2ggd2lsbCBwcm92aWRlIHRoZSBjb21wb25lbnQncyBlbnZpcm9ubWVudC5cbiAgICogICAgICAgICAgICAgICAgIHlvdSBzaG91bGQgYWxtb3N0IGFsd2F5cyBwcm92aWRlIHRoaXMgdG8gZW5zdXJlIHRoYXQgYWxsIGV4cGVjdGVkIHByb3ZpZGVyc1xuICAgKiAgICAgICAgICAgICAgICAgYXJlIGF2YWlsYWJsZSBmb3IgdGhlIGNvbXBvbmVudCBpbnN0YW50aWF0aW9uLiBUaGlzIG9wdGlvbiBpcyBpbnRlbmRlZCB0b1xuICAgKiAgICAgICAgICAgICAgICAgcmVwbGFjZSB0aGUgYG5nTW9kdWxlUmVmYCBwYXJhbWV0ZXIuXG4gICAqICAqIHByb2plY3RhYmxlTm9kZXM6IGxpc3Qgb2YgRE9NIG5vZGVzIHRoYXQgc2hvdWxkIGJlIHByb2plY3RlZCB0aHJvdWdoXG4gICAqICAgICAgICAgICAgICAgICAgICAgIFtgPG5nLWNvbnRlbnQ+YF0oYXBpL2NvcmUvbmctY29udGVudCkgb2YgdGhlIG5ldyBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBuZXcgYENvbXBvbmVudFJlZmAgd2hpY2ggY29udGFpbnMgdGhlIGNvbXBvbmVudCBpbnN0YW5jZSBhbmQgdGhlIGhvc3Qgdmlldy5cbiAgICovXG4gIGFic3RyYWN0IGNyZWF0ZUNvbXBvbmVudDxDPihjb21wb25lbnRUeXBlOiBUeXBlPEM+LCBvcHRpb25zPzoge1xuICAgIGluZGV4PzogbnVtYmVyLFxuICAgIGluamVjdG9yPzogSW5qZWN0b3IsXG4gICAgbmdNb2R1bGVSZWY/OiBOZ01vZHVsZVJlZjx1bmtub3duPixcbiAgICBlbnZpcm9ubWVudEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3RvcnxOZ01vZHVsZVJlZjx1bmtub3duPixcbiAgICBwcm9qZWN0YWJsZU5vZGVzPzogTm9kZVtdW10sXG4gIH0pOiBDb21wb25lbnRSZWY8Qz47XG5cbiAgLyoqXG4gICAqIEluc3RhbnRpYXRlcyBhIHNpbmdsZSBjb21wb25lbnQgYW5kIGluc2VydHMgaXRzIGhvc3QgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKlxuICAgKiBAcGFyYW0gY29tcG9uZW50RmFjdG9yeSBDb21wb25lbnQgZmFjdG9yeSB0byB1c2UuXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgaW5kZXggYXQgd2hpY2ggdG8gaW5zZXJ0IHRoZSBuZXcgY29tcG9uZW50J3MgaG9zdCB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqIElmIG5vdCBzcGVjaWZpZWQsIGFwcGVuZHMgdGhlIG5ldyB2aWV3IGFzIHRoZSBsYXN0IGVudHJ5LlxuICAgKiBAcGFyYW0gaW5qZWN0b3IgVGhlIGluamVjdG9yIHRvIHVzZSBhcyB0aGUgcGFyZW50IGZvciB0aGUgbmV3IGNvbXBvbmVudC5cbiAgICogQHBhcmFtIHByb2plY3RhYmxlTm9kZXMgTGlzdCBvZiBET00gbm9kZXMgdGhhdCBzaG91bGQgYmUgcHJvamVjdGVkIHRocm91Z2hcbiAgICogICAgIFtgPG5nLWNvbnRlbnQ+YF0oYXBpL2NvcmUvbmctY29udGVudCkgb2YgdGhlIG5ldyBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAqIEBwYXJhbSBuZ01vZHVsZVJlZiBBbiBpbnN0YW5jZSBvZiB0aGUgTmdNb2R1bGVSZWYgdGhhdCByZXByZXNlbnQgYW4gTmdNb2R1bGUuXG4gICAqIFRoaXMgaW5mb3JtYXRpb24gaXMgdXNlZCB0byByZXRyaWV2ZSBjb3JyZXNwb25kaW5nIE5nTW9kdWxlIGluamVjdG9yLlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgbmV3IGBDb21wb25lbnRSZWZgIHdoaWNoIGNvbnRhaW5zIHRoZSBjb21wb25lbnQgaW5zdGFuY2UgYW5kIHRoZSBob3N0IHZpZXcuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIEFuZ3VsYXIgbm8gbG9uZ2VyIHJlcXVpcmVzIGNvbXBvbmVudCBmYWN0b3JpZXMgdG8gZHluYW1pY2FsbHkgY3JlYXRlIGNvbXBvbmVudHMuXG4gICAqICAgICBVc2UgZGlmZmVyZW50IHNpZ25hdHVyZSBvZiB0aGUgYGNyZWF0ZUNvbXBvbmVudGAgbWV0aG9kLCB3aGljaCBhbGxvd3MgcGFzc2luZ1xuICAgKiAgICAgQ29tcG9uZW50IGNsYXNzIGRpcmVjdGx5LlxuICAgKi9cbiAgYWJzdHJhY3QgY3JlYXRlQ29tcG9uZW50PEM+KFxuICAgICAgY29tcG9uZW50RmFjdG9yeTogQ29tcG9uZW50RmFjdG9yeTxDPiwgaW5kZXg/OiBudW1iZXIsIGluamVjdG9yPzogSW5qZWN0b3IsXG4gICAgICBwcm9qZWN0YWJsZU5vZGVzPzogYW55W11bXSxcbiAgICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yfE5nTW9kdWxlUmVmPGFueT4pOiBDb21wb25lbnRSZWY8Qz47XG5cbiAgLyoqXG4gICAqIEluc2VydHMgYSB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqIEBwYXJhbSB2aWV3UmVmIFRoZSB2aWV3IHRvIGluc2VydC5cbiAgICogQHBhcmFtIGluZGV4IFRoZSAwLWJhc2VkIGluZGV4IGF0IHdoaWNoIHRvIGluc2VydCB0aGUgdmlldy5cbiAgICogSWYgbm90IHNwZWNpZmllZCwgYXBwZW5kcyB0aGUgbmV3IHZpZXcgYXMgdGhlIGxhc3QgZW50cnkuXG4gICAqIEByZXR1cm5zIFRoZSBpbnNlcnRlZCBgVmlld1JlZmAgaW5zdGFuY2UuXG4gICAqXG4gICAqL1xuICBhYnN0cmFjdCBpbnNlcnQodmlld1JlZjogVmlld1JlZiwgaW5kZXg/OiBudW1iZXIpOiBWaWV3UmVmO1xuXG4gIC8qKlxuICAgKiBNb3ZlcyBhIHZpZXcgdG8gYSBuZXcgbG9jYXRpb24gaW4gdGhpcyBjb250YWluZXIuXG4gICAqIEBwYXJhbSB2aWV3UmVmIFRoZSB2aWV3IHRvIG1vdmUuXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgMC1iYXNlZCBpbmRleCBvZiB0aGUgbmV3IGxvY2F0aW9uLlxuICAgKiBAcmV0dXJucyBUaGUgbW92ZWQgYFZpZXdSZWZgIGluc3RhbmNlLlxuICAgKi9cbiAgYWJzdHJhY3QgbW92ZSh2aWV3UmVmOiBWaWV3UmVmLCBjdXJyZW50SW5kZXg6IG51bWJlcik6IFZpZXdSZWY7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGluZGV4IG9mIGEgdmlldyB3aXRoaW4gdGhlIGN1cnJlbnQgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gdmlld1JlZiBUaGUgdmlldyB0byBxdWVyeS5cbiAgICogQHJldHVybnMgVGhlIDAtYmFzZWQgaW5kZXggb2YgdGhlIHZpZXcncyBwb3NpdGlvbiBpbiB0aGlzIGNvbnRhaW5lcixcbiAgICogb3IgYC0xYCBpZiB0aGlzIGNvbnRhaW5lciBkb2Vzbid0IGNvbnRhaW4gdGhlIHZpZXcuXG4gICAqL1xuICBhYnN0cmFjdCBpbmRleE9mKHZpZXdSZWY6IFZpZXdSZWYpOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGEgdmlldyBhdHRhY2hlZCB0byB0aGlzIGNvbnRhaW5lclxuICAgKiBAcGFyYW0gaW5kZXggVGhlIDAtYmFzZWQgaW5kZXggb2YgdGhlIHZpZXcgdG8gZGVzdHJveS5cbiAgICogSWYgbm90IHNwZWNpZmllZCwgdGhlIGxhc3QgdmlldyBpbiB0aGUgY29udGFpbmVyIGlzIHJlbW92ZWQuXG4gICAqL1xuICBhYnN0cmFjdCByZW1vdmUoaW5kZXg/OiBudW1iZXIpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBEZXRhY2hlcyBhIHZpZXcgZnJvbSB0aGlzIGNvbnRhaW5lciB3aXRob3V0IGRlc3Ryb3lpbmcgaXQuXG4gICAqIFVzZSBhbG9uZyB3aXRoIGBpbnNlcnQoKWAgdG8gbW92ZSBhIHZpZXcgd2l0aGluIHRoZSBjdXJyZW50IGNvbnRhaW5lci5cbiAgICogQHBhcmFtIGluZGV4IFRoZSAwLWJhc2VkIGluZGV4IG9mIHRoZSB2aWV3IHRvIGRldGFjaC5cbiAgICogSWYgbm90IHNwZWNpZmllZCwgdGhlIGxhc3QgdmlldyBpbiB0aGUgY29udGFpbmVyIGlzIGRldGFjaGVkLlxuICAgKi9cbiAgYWJzdHJhY3QgZGV0YWNoKGluZGV4PzogbnVtYmVyKTogVmlld1JlZnxudWxsO1xuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogQG5vY29sbGFwc2VcbiAgICovXG4gIHN0YXRpYyBfX05HX0VMRU1FTlRfSURfXzogKCkgPT4gVmlld0NvbnRhaW5lclJlZiA9IGluamVjdFZpZXdDb250YWluZXJSZWY7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIFZpZXdDb250YWluZXJSZWYgYW5kIHN0b3JlcyBpdCBvbiB0aGUgaW5qZWN0b3IuIE9yLCBpZiB0aGUgVmlld0NvbnRhaW5lclJlZlxuICogYWxyZWFkeSBleGlzdHMsIHJldHJpZXZlcyB0aGUgZXhpc3RpbmcgVmlld0NvbnRhaW5lclJlZi5cbiAqXG4gKiBAcmV0dXJucyBUaGUgVmlld0NvbnRhaW5lclJlZiBpbnN0YW5jZSB0byB1c2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluamVjdFZpZXdDb250YWluZXJSZWYoKTogVmlld0NvbnRhaW5lclJlZiB7XG4gIGNvbnN0IHByZXZpb3VzVE5vZGUgPSBnZXRDdXJyZW50VE5vZGUoKSBhcyBURWxlbWVudE5vZGUgfCBURWxlbWVudENvbnRhaW5lck5vZGUgfCBUQ29udGFpbmVyTm9kZTtcbiAgcmV0dXJuIGNyZWF0ZUNvbnRhaW5lclJlZihwcmV2aW91c1ROb2RlLCBnZXRMVmlldygpKTtcbn1cblxuY29uc3QgVkVfVmlld0NvbnRhaW5lclJlZiA9IFZpZXdDb250YWluZXJSZWY7XG5cbi8vIFRPRE8oYWx4aHViKTogY2xlYW5pbmcgdXAgdGhpcyBpbmRpcmVjdGlvbiB0cmlnZ2VycyBhIHN1YnRsZSBidWcgaW4gQ2xvc3VyZSBpbiBnMy4gT25jZSB0aGUgZml4XG4vLyBmb3IgdGhhdCBsYW5kcywgdGhpcyBjYW4gYmUgY2xlYW5lZCB1cC5cbmNvbnN0IFIzVmlld0NvbnRhaW5lclJlZiA9IGNsYXNzIFZpZXdDb250YWluZXJSZWYgZXh0ZW5kcyBWRV9WaWV3Q29udGFpbmVyUmVmIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIF9sQ29udGFpbmVyOiBMQ29udGFpbmVyLFxuICAgICAgcHJpdmF0ZSBfaG9zdFROb2RlOiBURWxlbWVudE5vZGV8VENvbnRhaW5lck5vZGV8VEVsZW1lbnRDb250YWluZXJOb2RlLFxuICAgICAgcHJpdmF0ZSBfaG9zdExWaWV3OiBMVmlldykge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBvdmVycmlkZSBnZXQgZWxlbWVudCgpOiBFbGVtZW50UmVmIHtcbiAgICByZXR1cm4gY3JlYXRlRWxlbWVudFJlZih0aGlzLl9ob3N0VE5vZGUsIHRoaXMuX2hvc3RMVmlldyk7XG4gIH1cblxuICBvdmVycmlkZSBnZXQgaW5qZWN0b3IoKTogSW5qZWN0b3Ige1xuICAgIHJldHVybiBuZXcgTm9kZUluamVjdG9yKHRoaXMuX2hvc3RUTm9kZSwgdGhpcy5faG9zdExWaWV3KTtcbiAgfVxuXG4gIC8qKiBAZGVwcmVjYXRlZCBObyByZXBsYWNlbWVudCAqL1xuICBvdmVycmlkZSBnZXQgcGFyZW50SW5qZWN0b3IoKTogSW5qZWN0b3Ige1xuICAgIGNvbnN0IHBhcmVudExvY2F0aW9uID0gZ2V0UGFyZW50SW5qZWN0b3JMb2NhdGlvbih0aGlzLl9ob3N0VE5vZGUsIHRoaXMuX2hvc3RMVmlldyk7XG4gICAgaWYgKGhhc1BhcmVudEluamVjdG9yKHBhcmVudExvY2F0aW9uKSkge1xuICAgICAgY29uc3QgcGFyZW50VmlldyA9IGdldFBhcmVudEluamVjdG9yVmlldyhwYXJlbnRMb2NhdGlvbiwgdGhpcy5faG9zdExWaWV3KTtcbiAgICAgIGNvbnN0IGluamVjdG9ySW5kZXggPSBnZXRQYXJlbnRJbmplY3RvckluZGV4KHBhcmVudExvY2F0aW9uKTtcbiAgICAgIG5nRGV2TW9kZSAmJiBhc3NlcnROb2RlSW5qZWN0b3IocGFyZW50VmlldywgaW5qZWN0b3JJbmRleCk7XG4gICAgICBjb25zdCBwYXJlbnRUTm9kZSA9XG4gICAgICAgICAgcGFyZW50Vmlld1tUVklFV10uZGF0YVtpbmplY3RvckluZGV4ICsgTm9kZUluamVjdG9yT2Zmc2V0LlROT0RFXSBhcyBURWxlbWVudE5vZGU7XG4gICAgICByZXR1cm4gbmV3IE5vZGVJbmplY3RvcihwYXJlbnRUTm9kZSwgcGFyZW50Vmlldyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBuZXcgTm9kZUluamVjdG9yKG51bGwsIHRoaXMuX2hvc3RMVmlldyk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgY2xlYXIoKTogdm9pZCB7XG4gICAgd2hpbGUgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5yZW1vdmUodGhpcy5sZW5ndGggLSAxKTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBnZXQoaW5kZXg6IG51bWJlcik6IFZpZXdSZWZ8bnVsbCB7XG4gICAgY29uc3Qgdmlld1JlZnMgPSBnZXRWaWV3UmVmcyh0aGlzLl9sQ29udGFpbmVyKTtcbiAgICByZXR1cm4gdmlld1JlZnMgIT09IG51bGwgJiYgdmlld1JlZnNbaW5kZXhdIHx8IG51bGw7XG4gIH1cblxuICBvdmVycmlkZSBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2xDb250YWluZXIubGVuZ3RoIC0gQ09OVEFJTkVSX0hFQURFUl9PRkZTRVQ7XG4gIH1cblxuICBvdmVycmlkZSBjcmVhdGVFbWJlZGRlZFZpZXc8Qz4odGVtcGxhdGVSZWY6IFRlbXBsYXRlUmVmPEM+LCBjb250ZXh0PzogQywgb3B0aW9ucz86IHtcbiAgICBpbmRleD86IG51bWJlcixcbiAgICBpbmplY3Rvcj86IEluamVjdG9yXG4gIH0pOiBFbWJlZGRlZFZpZXdSZWY8Qz47XG4gIG92ZXJyaWRlIGNyZWF0ZUVtYmVkZGVkVmlldzxDPih0ZW1wbGF0ZVJlZjogVGVtcGxhdGVSZWY8Qz4sIGNvbnRleHQ/OiBDLCBpbmRleD86IG51bWJlcik6XG4gICAgICBFbWJlZGRlZFZpZXdSZWY8Qz47XG4gIG92ZXJyaWRlIGNyZWF0ZUVtYmVkZGVkVmlldzxDPih0ZW1wbGF0ZVJlZjogVGVtcGxhdGVSZWY8Qz4sIGNvbnRleHQ/OiBDLCBpbmRleE9yT3B0aW9ucz86IG51bWJlcnx7XG4gICAgaW5kZXg/OiBudW1iZXIsXG4gICAgaW5qZWN0b3I/OiBJbmplY3RvclxuICB9KTogRW1iZWRkZWRWaWV3UmVmPEM+IHtcbiAgICBsZXQgaW5kZXg6IG51bWJlcnx1bmRlZmluZWQ7XG4gICAgbGV0IGluamVjdG9yOiBJbmplY3Rvcnx1bmRlZmluZWQ7XG5cbiAgICBpZiAodHlwZW9mIGluZGV4T3JPcHRpb25zID09PSAnbnVtYmVyJykge1xuICAgICAgaW5kZXggPSBpbmRleE9yT3B0aW9ucztcbiAgICB9IGVsc2UgaWYgKGluZGV4T3JPcHRpb25zICE9IG51bGwpIHtcbiAgICAgIGluZGV4ID0gaW5kZXhPck9wdGlvbnMuaW5kZXg7XG4gICAgICBpbmplY3RvciA9IGluZGV4T3JPcHRpb25zLmluamVjdG9yO1xuICAgIH1cblxuICAgIGxldCBoeWRyYXRpb25JbmZvOiBOZ2hWaWV3SW5zdGFuY2V8bnVsbCA9IG51bGw7XG4gICAgY29uc3Qgc3NySWQgPSAodGVtcGxhdGVSZWYgYXMgdW5rbm93biBhcyB7c3NySWQ6IHN0cmluZyB8IG51bGx9KS5zc3JJZDtcbiAgICBpZiAoc3NySWQpIHtcbiAgICAgIGh5ZHJhdGlvbkluZm8gPSBmaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlldyh0aGlzLl9sQ29udGFpbmVyLCBzc3JJZCk7XG4gICAgfVxuXG4gICAgY29uc3Qgdmlld1JlZiA9IHRlbXBsYXRlUmVmLmNyZWF0ZUVtYmVkZGVkVmlld0ltcGwoY29udGV4dCB8fCA8YW55Pnt9LCBpbmplY3RvciwgaHlkcmF0aW9uSW5mbyk7XG5cbiAgICB0aGlzLmluc2VydEltcGwodmlld1JlZiwgaW5kZXgsICEhaHlkcmF0aW9uSW5mbyk7XG4gICAgcmV0dXJuIHZpZXdSZWY7XG4gIH1cblxuICBvdmVycmlkZSBjcmVhdGVDb21wb25lbnQ8Qz4oY29tcG9uZW50VHlwZTogVHlwZTxDPiwgb3B0aW9ucz86IHtcbiAgICBpbmRleD86IG51bWJlcixcbiAgICBpbmplY3Rvcj86IEluamVjdG9yLFxuICAgIHByb2plY3RhYmxlTm9kZXM/OiBOb2RlW11bXSxcbiAgICBuZ01vZHVsZVJlZj86IE5nTW9kdWxlUmVmPHVua25vd24+LFxuICB9KTogQ29tcG9uZW50UmVmPEM+O1xuICAvKipcbiAgICogQGRlcHJlY2F0ZWQgQW5ndWxhciBubyBsb25nZXIgcmVxdWlyZXMgY29tcG9uZW50IGZhY3RvcmllcyB0byBkeW5hbWljYWxseSBjcmVhdGUgY29tcG9uZW50cy5cbiAgICogICAgIFVzZSBkaWZmZXJlbnQgc2lnbmF0dXJlIG9mIHRoZSBgY3JlYXRlQ29tcG9uZW50YCBtZXRob2QsIHdoaWNoIGFsbG93cyBwYXNzaW5nXG4gICAqICAgICBDb21wb25lbnQgY2xhc3MgZGlyZWN0bHkuXG4gICAqL1xuICBvdmVycmlkZSBjcmVhdGVDb21wb25lbnQ8Qz4oXG4gICAgICBjb21wb25lbnRGYWN0b3J5OiBDb21wb25lbnRGYWN0b3J5PEM+LCBpbmRleD86IG51bWJlcnx1bmRlZmluZWQsXG4gICAgICBpbmplY3Rvcj86IEluamVjdG9yfHVuZGVmaW5lZCwgcHJvamVjdGFibGVOb2Rlcz86IGFueVtdW118dW5kZWZpbmVkLFxuICAgICAgZW52aXJvbm1lbnRJbmplY3Rvcj86IEVudmlyb25tZW50SW5qZWN0b3J8TmdNb2R1bGVSZWY8YW55Pnx1bmRlZmluZWQpOiBDb21wb25lbnRSZWY8Qz47XG4gIG92ZXJyaWRlIGNyZWF0ZUNvbXBvbmVudDxDPihcbiAgICAgIGNvbXBvbmVudEZhY3RvcnlPclR5cGU6IENvbXBvbmVudEZhY3Rvcnk8Qz58VHlwZTxDPiwgaW5kZXhPck9wdGlvbnM/OiBudW1iZXJ8dW5kZWZpbmVkfHtcbiAgICAgICAgaW5kZXg/OiBudW1iZXIsXG4gICAgICAgIGluamVjdG9yPzogSW5qZWN0b3IsXG4gICAgICAgIG5nTW9kdWxlUmVmPzogTmdNb2R1bGVSZWY8dW5rbm93bj4sXG4gICAgICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yfE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgICAgICBwcm9qZWN0YWJsZU5vZGVzPzogTm9kZVtdW10sXG4gICAgICB9LFxuICAgICAgaW5qZWN0b3I/OiBJbmplY3Rvcnx1bmRlZmluZWQsIHByb2plY3RhYmxlTm9kZXM/OiBhbnlbXVtdfHVuZGVmaW5lZCxcbiAgICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yfE5nTW9kdWxlUmVmPGFueT58dW5kZWZpbmVkKTogQ29tcG9uZW50UmVmPEM+IHtcbiAgICBjb25zdCBpc0NvbXBvbmVudEZhY3RvcnkgPSBjb21wb25lbnRGYWN0b3J5T3JUeXBlICYmICFpc1R5cGUoY29tcG9uZW50RmFjdG9yeU9yVHlwZSk7XG4gICAgbGV0IGluZGV4OiBudW1iZXJ8dW5kZWZpbmVkO1xuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBzdXBwb3J0cyAyIHNpZ25hdHVyZXMgYW5kIHdlIG5lZWQgdG8gaGFuZGxlIG9wdGlvbnMgY29ycmVjdGx5IGZvciBib3RoOlxuICAgIC8vICAgMS4gV2hlbiBmaXJzdCBhcmd1bWVudCBpcyBhIENvbXBvbmVudCB0eXBlLiBUaGlzIHNpZ25hdHVyZSBhbHNvIHJlcXVpcmVzIGV4dHJhXG4gICAgLy8gICAgICBvcHRpb25zIHRvIGJlIHByb3ZpZGVkIGFzIGFzIG9iamVjdCAobW9yZSBlcmdvbm9taWMgb3B0aW9uKS5cbiAgICAvLyAgIDIuIEZpcnN0IGFyZ3VtZW50IGlzIGEgQ29tcG9uZW50IGZhY3RvcnkuIEluIHRoaXMgY2FzZSBleHRyYSBvcHRpb25zIGFyZSByZXByZXNlbnRlZCBhc1xuICAgIC8vICAgICAgcG9zaXRpb25hbCBhcmd1bWVudHMuIFRoaXMgc2lnbmF0dXJlIGlzIGxlc3MgZXJnb25vbWljIGFuZCB3aWxsIGJlIGRlcHJlY2F0ZWQuXG4gICAgaWYgKGlzQ29tcG9uZW50RmFjdG9yeSkge1xuICAgICAgaWYgKG5nRGV2TW9kZSkge1xuICAgICAgICBhc3NlcnRFcXVhbChcbiAgICAgICAgICAgIHR5cGVvZiBpbmRleE9yT3B0aW9ucyAhPT0gJ29iamVjdCcsIHRydWUsXG4gICAgICAgICAgICAnSXQgbG9va3MgbGlrZSBDb21wb25lbnQgZmFjdG9yeSB3YXMgcHJvdmlkZWQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50ICcgK1xuICAgICAgICAgICAgICAgICdhbmQgYW4gb3B0aW9ucyBvYmplY3QgYXMgdGhlIHNlY29uZCBhcmd1bWVudC4gVGhpcyBjb21iaW5hdGlvbiBvZiBhcmd1bWVudHMgJyArXG4gICAgICAgICAgICAgICAgJ2lzIGluY29tcGF0aWJsZS4gWW91IGNhbiBlaXRoZXIgY2hhbmdlIHRoZSBmaXJzdCBhcmd1bWVudCB0byBwcm92aWRlIENvbXBvbmVudCAnICtcbiAgICAgICAgICAgICAgICAndHlwZSBvciBjaGFuZ2UgdGhlIHNlY29uZCBhcmd1bWVudCB0byBiZSBhIG51bWJlciAocmVwcmVzZW50aW5nIGFuIGluZGV4IGF0ICcgK1xuICAgICAgICAgICAgICAgICd3aGljaCB0byBpbnNlcnQgdGhlIG5ldyBjb21wb25lbnRcXCdzIGhvc3QgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyKScpO1xuICAgICAgfVxuICAgICAgaW5kZXggPSBpbmRleE9yT3B0aW9ucyBhcyBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChuZ0Rldk1vZGUpIHtcbiAgICAgICAgYXNzZXJ0RGVmaW5lZChcbiAgICAgICAgICAgIGdldENvbXBvbmVudERlZihjb21wb25lbnRGYWN0b3J5T3JUeXBlKSxcbiAgICAgICAgICAgIGBQcm92aWRlZCBDb21wb25lbnQgY2xhc3MgZG9lc24ndCBjb250YWluIENvbXBvbmVudCBkZWZpbml0aW9uLiBgICtcbiAgICAgICAgICAgICAgICBgUGxlYXNlIGNoZWNrIHdoZXRoZXIgcHJvdmlkZWQgY2xhc3MgaGFzIEBDb21wb25lbnQgZGVjb3JhdG9yLmApO1xuICAgICAgICBhc3NlcnRFcXVhbChcbiAgICAgICAgICAgIHR5cGVvZiBpbmRleE9yT3B0aW9ucyAhPT0gJ251bWJlcicsIHRydWUsXG4gICAgICAgICAgICAnSXQgbG9va3MgbGlrZSBDb21wb25lbnQgdHlwZSB3YXMgcHJvdmlkZWQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50ICcgK1xuICAgICAgICAgICAgICAgICdhbmQgYSBudW1iZXIgKHJlcHJlc2VudGluZyBhbiBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIG5ldyBjb21wb25lbnRcXCdzICcgK1xuICAgICAgICAgICAgICAgICdob3N0IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lciBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50LiBUaGlzIGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyAnICtcbiAgICAgICAgICAgICAgICAnaXMgaW5jb21wYXRpYmxlLiBQbGVhc2UgdXNlIGFuIG9iamVjdCBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50IGluc3RlYWQuJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBvcHRpb25zID0gKGluZGV4T3JPcHRpb25zIHx8IHt9KSBhcyB7XG4gICAgICAgIGluZGV4PzogbnVtYmVyLFxuICAgICAgICBpbmplY3Rvcj86IEluamVjdG9yLFxuICAgICAgICBuZ01vZHVsZVJlZj86IE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgICAgICBlbnZpcm9ubWVudEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3RvciB8IE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgICAgICBwcm9qZWN0YWJsZU5vZGVzPzogTm9kZVtdW10sXG4gICAgICB9O1xuICAgICAgaWYgKG5nRGV2TW9kZSAmJiBvcHRpb25zLmVudmlyb25tZW50SW5qZWN0b3IgJiYgb3B0aW9ucy5uZ01vZHVsZVJlZikge1xuICAgICAgICB0aHJvd0Vycm9yKFxuICAgICAgICAgICAgYENhbm5vdCBwYXNzIGJvdGggZW52aXJvbm1lbnRJbmplY3RvciBhbmQgbmdNb2R1bGVSZWYgb3B0aW9ucyB0byBjcmVhdGVDb21wb25lbnQoKS5gKTtcbiAgICAgIH1cbiAgICAgIGluZGV4ID0gb3B0aW9ucy5pbmRleDtcbiAgICAgIGluamVjdG9yID0gb3B0aW9ucy5pbmplY3RvcjtcbiAgICAgIHByb2plY3RhYmxlTm9kZXMgPSBvcHRpb25zLnByb2plY3RhYmxlTm9kZXM7XG4gICAgICBlbnZpcm9ubWVudEluamVjdG9yID0gb3B0aW9ucy5lbnZpcm9ubWVudEluamVjdG9yIHx8IG9wdGlvbnMubmdNb2R1bGVSZWY7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcG9uZW50RmFjdG9yeTogQ29tcG9uZW50RmFjdG9yeTxDPiA9IGlzQ29tcG9uZW50RmFjdG9yeSA/XG4gICAgICAgIGNvbXBvbmVudEZhY3RvcnlPclR5cGUgYXMgQ29tcG9uZW50RmFjdG9yeTxDPjpcbiAgICAgICAgbmV3IFIzQ29tcG9uZW50RmFjdG9yeShnZXRDb21wb25lbnREZWYoY29tcG9uZW50RmFjdG9yeU9yVHlwZSkhKTtcbiAgICBjb25zdCBjb250ZXh0SW5qZWN0b3IgPSBpbmplY3RvciB8fCB0aGlzLnBhcmVudEluamVjdG9yO1xuXG4gICAgLy8gSWYgYW4gYE5nTW9kdWxlUmVmYCBpcyBub3QgcHJvdmlkZWQgZXhwbGljaXRseSwgdHJ5IHJldHJpZXZpbmcgaXQgZnJvbSB0aGUgREkgdHJlZS5cbiAgICBpZiAoIWVudmlyb25tZW50SW5qZWN0b3IgJiYgKGNvbXBvbmVudEZhY3RvcnkgYXMgYW55KS5uZ01vZHVsZSA9PSBudWxsKSB7XG4gICAgICAvLyBGb3IgdGhlIGBDb21wb25lbnRGYWN0b3J5YCBjYXNlLCBlbnRlcmluZyB0aGlzIGxvZ2ljIGlzIHZlcnkgdW5saWtlbHksIHNpbmNlIHdlIGV4cGVjdCB0aGF0XG4gICAgICAvLyBhbiBpbnN0YW5jZSBvZiBhIGBDb21wb25lbnRGYWN0b3J5YCwgcmVzb2x2ZWQgdmlhIGBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXJgIHdvdWxkIGhhdmUgYW5cbiAgICAgIC8vIGBuZ01vZHVsZWAgZmllbGQuIFRoaXMgaXMgcG9zc2libGUgaW4gc29tZSB0ZXN0IHNjZW5hcmlvcyBhbmQgcG90ZW50aWFsbHkgaW4gc29tZSBKSVQtYmFzZWRcbiAgICAgIC8vIHVzZS1jYXNlcy4gRm9yIHRoZSBgQ29tcG9uZW50RmFjdG9yeWAgY2FzZSB3ZSBwcmVzZXJ2ZSBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBhbmQgdHJ5XG4gICAgICAvLyB1c2luZyBhIHByb3ZpZGVkIGluamVjdG9yIGZpcnN0LCB0aGVuIGZhbGwgYmFjayB0byB0aGUgcGFyZW50IGluamVjdG9yIG9mIHRoaXNcbiAgICAgIC8vIGBWaWV3Q29udGFpbmVyUmVmYCBpbnN0YW5jZS5cbiAgICAgIC8vXG4gICAgICAvLyBGb3IgdGhlIGZhY3RvcnktbGVzcyBjYXNlLCBpdCdzIGNyaXRpY2FsIHRvIGVzdGFibGlzaCBhIGNvbm5lY3Rpb24gd2l0aCB0aGUgbW9kdWxlXG4gICAgICAvLyBpbmplY3RvciB0cmVlIChieSByZXRyaWV2aW5nIGFuIGluc3RhbmNlIG9mIGFuIGBOZ01vZHVsZVJlZmAgYW5kIGFjY2Vzc2luZyBpdHMgaW5qZWN0b3IpLFxuICAgICAgLy8gc28gdGhhdCBhIGNvbXBvbmVudCBjYW4gdXNlIERJIHRva2VucyBwcm92aWRlZCBpbiBNZ01vZHVsZXMuIEZvciB0aGlzIHJlYXNvbiwgd2UgY2FuIG5vdFxuICAgICAgLy8gcmVseSBvbiB0aGUgcHJvdmlkZWQgaW5qZWN0b3IsIHNpbmNlIGl0IG1pZ2h0IGJlIGRldGFjaGVkIGZyb20gdGhlIERJIHRyZWUgKGZvciBleGFtcGxlLCBpZlxuICAgICAgLy8gaXQgd2FzIGNyZWF0ZWQgdmlhIGBJbmplY3Rvci5jcmVhdGVgIHdpdGhvdXQgc3BlY2lmeWluZyBhIHBhcmVudCBpbmplY3Rvciwgb3IgaWYgYW5cbiAgICAgIC8vIGluamVjdG9yIGlzIHJldHJpZXZlZCBmcm9tIGFuIGBOZ01vZHVsZVJlZmAgY3JlYXRlZCB2aWEgYGNyZWF0ZU5nTW9kdWxlYCB1c2luZyBhblxuICAgICAgLy8gTmdNb2R1bGUgb3V0c2lkZSBvZiBhIG1vZHVsZSB0cmVlKS4gSW5zdGVhZCwgd2UgYWx3YXlzIHVzZSBgVmlld0NvbnRhaW5lclJlZmAncyBwYXJlbnRcbiAgICAgIC8vIGluamVjdG9yLCB3aGljaCBpcyBub3JtYWxseSBjb25uZWN0ZWQgdG8gdGhlIERJIHRyZWUsIHdoaWNoIGluY2x1ZGVzIG1vZHVsZSBpbmplY3RvclxuICAgICAgLy8gc3VidHJlZS5cbiAgICAgIGNvbnN0IF9pbmplY3RvciA9IGlzQ29tcG9uZW50RmFjdG9yeSA/IGNvbnRleHRJbmplY3RvciA6IHRoaXMucGFyZW50SW5qZWN0b3I7XG5cbiAgICAgIC8vIERPIE5PVCBSRUZBQ1RPUi4gVGhlIGNvZGUgaGVyZSB1c2VkIHRvIGhhdmUgYSBgaW5qZWN0b3IuZ2V0KE5nTW9kdWxlUmVmLCBudWxsKSB8fFxuICAgICAgLy8gdW5kZWZpbmVkYCBleHByZXNzaW9uIHdoaWNoIHNlZW1zIHRvIGNhdXNlIGludGVybmFsIGdvb2dsZSBhcHBzIHRvIGZhaWwuIFRoaXMgaXMgZG9jdW1lbnRlZFxuICAgICAgLy8gaW4gdGhlIGZvbGxvd2luZyBpbnRlcm5hbCBidWcgaXNzdWU6IGdvL2IvMTQyOTY3ODAyXG4gICAgICBjb25zdCByZXN1bHQgPSBfaW5qZWN0b3IuZ2V0KEVudmlyb25tZW50SW5qZWN0b3IsIG51bGwpO1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICBlbnZpcm9ubWVudEluamVjdG9yID0gcmVzdWx0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE86IHRoaXMgaXMgbm90IGNvcnJlY3QgZm9yIHNlbGVjdG9ycyBsaWtlIGBhcHBbcGFyYW1dYCxcbiAgICAvLyB3ZSBuZWVkIHRvIHJlbHkgb24gc29tZSBvdGhlciBpbmZvIChsaWtlIGNvbXBvbmVudCBpZCksXG4gICAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvcHVsbC80ODI1My5cbiAgICBjb25zdCBjb21wb25lbnREZWYgPSBnZXRDb21wb25lbnREZWYoY29tcG9uZW50RmFjdG9yeS5jb21wb25lbnRUeXBlKSE7XG4gICAgY29uc3QgZGVoeWRyYXRlZFZpZXcgPSBmaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlldyh0aGlzLl9sQ29udGFpbmVyLCBjb21wb25lbnREZWYuaWQpO1xuICAgIGxldCByTm9kZTtcbiAgICBsZXQgaHlkcmF0aW9uSW5mbzogTmdoRG9tSW5zdGFuY2V8bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoZGVoeWRyYXRlZFZpZXcpIHtcbiAgICAgIC8vIFBvaW50ZXIgdG8gYSBob3N0IERPTSBlbGVtZW50LlxuICAgICAgck5vZGUgPSBkZWh5ZHJhdGVkVmlldy5maXJzdENoaWxkO1xuXG4gICAgICAvLyBSZWFkIGh5ZHJhdGlvbiBpbmZvIGFuZCBwYXNzIGl0IG92ZXIgdG8gdGhlIGNvbXBvbmVudCB2aWV3LlxuICAgICAgaHlkcmF0aW9uSW5mbyA9IHJldHJpZXZlTmdoSW5mbyhyTm9kZSBhcyBSRWxlbWVudCwgZW52aXJvbm1lbnRJbmplY3RvciBhcyBJbmplY3Rvcik7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcG9uZW50UmVmID0gY29tcG9uZW50RmFjdG9yeS5jcmVhdGVJbXBsKFxuICAgICAgICBjb250ZXh0SW5qZWN0b3IsIHByb2plY3RhYmxlTm9kZXMsIHJOb2RlLCBlbnZpcm9ubWVudEluamVjdG9yLCBoeWRyYXRpb25JbmZvKTtcbiAgICB0aGlzLmluc2VydEltcGwoY29tcG9uZW50UmVmLmhvc3RWaWV3LCBpbmRleCwgISFoeWRyYXRpb25JbmZvKTtcbiAgICByZXR1cm4gY29tcG9uZW50UmVmO1xuICB9XG5cbiAgb3ZlcnJpZGUgaW5zZXJ0KHZpZXdSZWY6IFZpZXdSZWYsIGluZGV4PzogbnVtYmVyKTogVmlld1JlZiB7XG4gICAgcmV0dXJuIHRoaXMuaW5zZXJ0SW1wbCh2aWV3UmVmLCBpbmRleCwgZmFsc2UpO1xuICB9XG5cbiAgcHJpdmF0ZSBpbnNlcnRJbXBsKHZpZXdSZWY6IFZpZXdSZWYsIGluZGV4PzogbnVtYmVyLCBwcmV2ZW50RE9NSW5zZXJ0aW9uPzogYm9vbGVhbik6IFZpZXdSZWYge1xuICAgIGNvbnN0IGxWaWV3ID0gKHZpZXdSZWYgYXMgUjNWaWV3UmVmPGFueT4pLl9sVmlldyE7XG4gICAgY29uc3QgdFZpZXcgPSBsVmlld1tUVklFV107XG5cbiAgICBpZiAobmdEZXZNb2RlICYmIHZpZXdSZWYuZGVzdHJveWVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBpbnNlcnQgYSBkZXN0cm95ZWQgVmlldyBpbiBhIFZpZXdDb250YWluZXIhJyk7XG4gICAgfVxuXG4gICAgaWYgKHZpZXdBdHRhY2hlZFRvQ29udGFpbmVyKGxWaWV3KSkge1xuICAgICAgLy8gSWYgdmlldyBpcyBhbHJlYWR5IGF0dGFjaGVkLCBkZXRhY2ggaXQgZmlyc3Qgc28gd2UgY2xlYW4gdXAgcmVmZXJlbmNlcyBhcHByb3ByaWF0ZWx5LlxuXG4gICAgICBjb25zdCBwcmV2SWR4ID0gdGhpcy5pbmRleE9mKHZpZXdSZWYpO1xuXG4gICAgICAvLyBBIHZpZXcgbWlnaHQgYmUgYXR0YWNoZWQgZWl0aGVyIHRvIHRoaXMgb3IgYSBkaWZmZXJlbnQgY29udGFpbmVyLiBUaGUgYHByZXZJZHhgIGZvclxuICAgICAgLy8gdGhvc2UgY2FzZXMgd2lsbCBiZTpcbiAgICAgIC8vIGVxdWFsIHRvIC0xIGZvciB2aWV3cyBhdHRhY2hlZCB0byB0aGlzIFZpZXdDb250YWluZXJSZWZcbiAgICAgIC8vID49IDAgZm9yIHZpZXdzIGF0dGFjaGVkIHRvIGEgZGlmZmVyZW50IFZpZXdDb250YWluZXJSZWZcbiAgICAgIGlmIChwcmV2SWR4ICE9PSAtMSkge1xuICAgICAgICB0aGlzLmRldGFjaChwcmV2SWR4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHByZXZMQ29udGFpbmVyID0gbFZpZXdbUEFSRU5UXSBhcyBMQ29udGFpbmVyO1xuICAgICAgICBuZ0Rldk1vZGUgJiZcbiAgICAgICAgICAgIGFzc2VydEVxdWFsKFxuICAgICAgICAgICAgICAgIGlzTENvbnRhaW5lcihwcmV2TENvbnRhaW5lciksIHRydWUsXG4gICAgICAgICAgICAgICAgJ0FuIGF0dGFjaGVkIHZpZXcgc2hvdWxkIGhhdmUgaXRzIFBBUkVOVCBwb2ludCB0byBhIGNvbnRhaW5lci4nKTtcblxuXG4gICAgICAgIC8vIFdlIG5lZWQgdG8gcmUtY3JlYXRlIGEgUjNWaWV3Q29udGFpbmVyUmVmIGluc3RhbmNlIHNpbmNlIHRob3NlIGFyZSBub3Qgc3RvcmVkIG9uXG4gICAgICAgIC8vIExWaWV3IChub3IgYW55d2hlcmUgZWxzZSkuXG4gICAgICAgIGNvbnN0IHByZXZWQ1JlZiA9IG5ldyBSM1ZpZXdDb250YWluZXJSZWYoXG4gICAgICAgICAgICBwcmV2TENvbnRhaW5lciwgcHJldkxDb250YWluZXJbVF9IT1NUXSBhcyBURGlyZWN0aXZlSG9zdE5vZGUsIHByZXZMQ29udGFpbmVyW1BBUkVOVF0pO1xuXG4gICAgICAgIHByZXZWQ1JlZi5kZXRhY2gocHJldlZDUmVmLmluZGV4T2Yodmlld1JlZikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIExvZ2ljYWwgb3BlcmF0aW9uIG9mIGFkZGluZyBgTFZpZXdgIHRvIGBMQ29udGFpbmVyYFxuICAgIGNvbnN0IGFkanVzdGVkSWR4ID0gdGhpcy5fYWRqdXN0SW5kZXgoaW5kZXgpO1xuICAgIGNvbnN0IGxDb250YWluZXIgPSB0aGlzLl9sQ29udGFpbmVyO1xuICAgIGluc2VydFZpZXcodFZpZXcsIGxWaWV3LCBsQ29udGFpbmVyLCBhZGp1c3RlZElkeCk7XG5cbiAgICAvLyBQaHlzaWNhbCBvcGVyYXRpb24gb2YgYWRkaW5nIHRoZSBET00gbm9kZXMuXG4gICAgaWYgKCFwcmV2ZW50RE9NSW5zZXJ0aW9uKSB7XG4gICAgICBjb25zdCBiZWZvcmVOb2RlID0gZ2V0QmVmb3JlTm9kZUZvclZpZXcoYWRqdXN0ZWRJZHgsIGxDb250YWluZXIpO1xuICAgICAgY29uc3QgcmVuZGVyZXIgPSBsVmlld1tSRU5ERVJFUl07XG4gICAgICBjb25zdCBwYXJlbnRSTm9kZSA9IG5hdGl2ZVBhcmVudE5vZGUocmVuZGVyZXIsIGxDb250YWluZXJbTkFUSVZFXSBhcyBSRWxlbWVudCB8IFJDb21tZW50KTtcbiAgICAgIGlmIChwYXJlbnRSTm9kZSAhPT0gbnVsbCkge1xuICAgICAgICBhZGRWaWV3VG9Db250YWluZXIodFZpZXcsIGxDb250YWluZXJbVF9IT1NUXSwgcmVuZGVyZXIsIGxWaWV3LCBwYXJlbnRSTm9kZSwgYmVmb3JlTm9kZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgKHZpZXdSZWYgYXMgUjNWaWV3UmVmPGFueT4pLmF0dGFjaFRvVmlld0NvbnRhaW5lclJlZigpO1xuICAgIGFkZFRvQXJyYXkoZ2V0T3JDcmVhdGVWaWV3UmVmcyhsQ29udGFpbmVyKSwgYWRqdXN0ZWRJZHgsIHZpZXdSZWYpO1xuXG4gICAgcmV0dXJuIHZpZXdSZWY7XG4gIH1cblxuICBvdmVycmlkZSBtb3ZlKHZpZXdSZWY6IFZpZXdSZWYsIG5ld0luZGV4OiBudW1iZXIpOiBWaWV3UmVmIHtcbiAgICBpZiAobmdEZXZNb2RlICYmIHZpZXdSZWYuZGVzdHJveWVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBtb3ZlIGEgZGVzdHJveWVkIFZpZXcgaW4gYSBWaWV3Q29udGFpbmVyIScpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5pbnNlcnQodmlld1JlZiwgbmV3SW5kZXgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgaW5kZXhPZih2aWV3UmVmOiBWaWV3UmVmKTogbnVtYmVyIHtcbiAgICBjb25zdCB2aWV3UmVmc0FyciA9IGdldFZpZXdSZWZzKHRoaXMuX2xDb250YWluZXIpO1xuICAgIHJldHVybiB2aWV3UmVmc0FyciAhPT0gbnVsbCA/IHZpZXdSZWZzQXJyLmluZGV4T2Yodmlld1JlZikgOiAtMTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlbW92ZShpbmRleD86IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IGFkanVzdGVkSWR4ID0gdGhpcy5fYWRqdXN0SW5kZXgoaW5kZXgsIC0xKTtcbiAgICBjb25zdCBkZXRhY2hlZFZpZXcgPSBkZXRhY2hWaWV3KHRoaXMuX2xDb250YWluZXIsIGFkanVzdGVkSWR4KTtcblxuICAgIGlmIChkZXRhY2hlZFZpZXcpIHtcbiAgICAgIC8vIEJlZm9yZSBkZXN0cm95aW5nIHRoZSB2aWV3LCByZW1vdmUgaXQgZnJvbSB0aGUgY29udGFpbmVyJ3MgYXJyYXkgb2YgYFZpZXdSZWZgcy5cbiAgICAgIC8vIFRoaXMgZW5zdXJlcyB0aGUgdmlldyBjb250YWluZXIgbGVuZ3RoIGlzIHVwZGF0ZWQgYmVmb3JlIGNhbGxpbmdcbiAgICAgIC8vIGBkZXN0cm95TFZpZXdgLCB3aGljaCBjb3VsZCByZWN1cnNpdmVseSBjYWxsIHZpZXcgY29udGFpbmVyIG1ldGhvZHMgdGhhdFxuICAgICAgLy8gcmVseSBvbiBhbiBhY2N1cmF0ZSBjb250YWluZXIgbGVuZ3RoLlxuICAgICAgLy8gKGUuZy4gYSBtZXRob2Qgb24gdGhpcyB2aWV3IGNvbnRhaW5lciBiZWluZyBjYWxsZWQgYnkgYSBjaGlsZCBkaXJlY3RpdmUncyBPbkRlc3Ryb3lcbiAgICAgIC8vIGxpZmVjeWNsZSBob29rKVxuICAgICAgcmVtb3ZlRnJvbUFycmF5KGdldE9yQ3JlYXRlVmlld1JlZnModGhpcy5fbENvbnRhaW5lciksIGFkanVzdGVkSWR4KTtcbiAgICAgIGRlc3Ryb3lMVmlldyhkZXRhY2hlZFZpZXdbVFZJRVddLCBkZXRhY2hlZFZpZXcpO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGRldGFjaChpbmRleD86IG51bWJlcik6IFZpZXdSZWZ8bnVsbCB7XG4gICAgY29uc3QgYWRqdXN0ZWRJZHggPSB0aGlzLl9hZGp1c3RJbmRleChpbmRleCwgLTEpO1xuICAgIGNvbnN0IHZpZXcgPSBkZXRhY2hWaWV3KHRoaXMuX2xDb250YWluZXIsIGFkanVzdGVkSWR4KTtcblxuICAgIGNvbnN0IHdhc0RldGFjaGVkID1cbiAgICAgICAgdmlldyAmJiByZW1vdmVGcm9tQXJyYXkoZ2V0T3JDcmVhdGVWaWV3UmVmcyh0aGlzLl9sQ29udGFpbmVyKSwgYWRqdXN0ZWRJZHgpICE9IG51bGw7XG4gICAgcmV0dXJuIHdhc0RldGFjaGVkID8gbmV3IFIzVmlld1JlZih2aWV3ISkgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWRqdXN0SW5kZXgoaW5kZXg/OiBudW1iZXIsIHNoaWZ0OiBudW1iZXIgPSAwKSB7XG4gICAgaWYgKGluZGV4ID09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLmxlbmd0aCArIHNoaWZ0O1xuICAgIH1cbiAgICBpZiAobmdEZXZNb2RlKSB7XG4gICAgICBhc3NlcnRHcmVhdGVyVGhhbihpbmRleCwgLTEsIGBWaWV3UmVmIGluZGV4IG11c3QgYmUgcG9zaXRpdmUsIGdvdCAke2luZGV4fWApO1xuICAgICAgLy8gKzEgYmVjYXVzZSBpdCdzIGxlZ2FsIHRvIGluc2VydCBhdCB0aGUgZW5kLlxuICAgICAgYXNzZXJ0TGVzc1RoYW4oaW5kZXgsIHRoaXMubGVuZ3RoICsgMSArIHNoaWZ0LCAnaW5kZXgnKTtcbiAgICB9XG4gICAgcmV0dXJuIGluZGV4O1xuICB9XG59O1xuXG5mdW5jdGlvbiBnZXRWaWV3UmVmcyhsQ29udGFpbmVyOiBMQ29udGFpbmVyKTogVmlld1JlZltdfG51bGwge1xuICByZXR1cm4gbENvbnRhaW5lcltWSUVXX1JFRlNdIGFzIFZpZXdSZWZbXTtcbn1cblxuZnVuY3Rpb24gZ2V0T3JDcmVhdGVWaWV3UmVmcyhsQ29udGFpbmVyOiBMQ29udGFpbmVyKTogVmlld1JlZltdIHtcbiAgcmV0dXJuIChsQ29udGFpbmVyW1ZJRVdfUkVGU10gfHwgKGxDb250YWluZXJbVklFV19SRUZTXSA9IFtdKSkgYXMgVmlld1JlZltdO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBWaWV3Q29udGFpbmVyUmVmIGFuZCBzdG9yZXMgaXQgb24gdGhlIGluamVjdG9yLlxuICpcbiAqIEBwYXJhbSBWaWV3Q29udGFpbmVyUmVmVG9rZW4gVGhlIFZpZXdDb250YWluZXJSZWYgdHlwZVxuICogQHBhcmFtIEVsZW1lbnRSZWZUb2tlbiBUaGUgRWxlbWVudFJlZiB0eXBlXG4gKiBAcGFyYW0gaG9zdFROb2RlIFRoZSBub2RlIHRoYXQgaXMgcmVxdWVzdGluZyBhIFZpZXdDb250YWluZXJSZWZcbiAqIEBwYXJhbSBob3N0TFZpZXcgVGhlIHZpZXcgdG8gd2hpY2ggdGhlIG5vZGUgYmVsb25nc1xuICogQHJldHVybnMgVGhlIFZpZXdDb250YWluZXJSZWYgaW5zdGFuY2UgdG8gdXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb250YWluZXJSZWYoXG4gICAgaG9zdFROb2RlOiBURWxlbWVudE5vZGV8VENvbnRhaW5lck5vZGV8VEVsZW1lbnRDb250YWluZXJOb2RlLFxuICAgIGhvc3RMVmlldzogTFZpZXcpOiBWaWV3Q29udGFpbmVyUmVmIHtcbiAgbmdEZXZNb2RlICYmIGFzc2VydFROb2RlVHlwZShob3N0VE5vZGUsIFROb2RlVHlwZS5BbnlDb250YWluZXIgfCBUTm9kZVR5cGUuQW55Uk5vZGUpO1xuXG4gIGxldCBsQ29udGFpbmVyOiBMQ29udGFpbmVyO1xuICBjb25zdCBzbG90VmFsdWUgPSBob3N0TFZpZXdbaG9zdFROb2RlLmluZGV4XTtcbiAgaWYgKGlzTENvbnRhaW5lcihzbG90VmFsdWUpKSB7XG4gICAgLy8gSWYgdGhlIGhvc3QgaXMgYSBjb250YWluZXIsIHdlIGRvbid0IG5lZWQgdG8gY3JlYXRlIGEgbmV3IExDb250YWluZXJcbiAgICBsQ29udGFpbmVyID0gc2xvdFZhbHVlO1xuICB9IGVsc2Uge1xuICAgIGxDb250YWluZXIgPSBfbG9jYXRlT3JDcmVhdGVDb250YWluZXJSZWZJbXBsKGhvc3RMVmlldywgaG9zdFROb2RlLCBzbG90VmFsdWUpO1xuICAgIGhvc3RMVmlld1tob3N0VE5vZGUuaW5kZXhdID0gbENvbnRhaW5lcjtcbiAgICBhZGRUb1ZpZXdUcmVlKGhvc3RMVmlldywgbENvbnRhaW5lcik7XG4gIH1cblxuICByZXR1cm4gbmV3IFIzVmlld0NvbnRhaW5lclJlZihsQ29udGFpbmVyLCBob3N0VE5vZGUsIGhvc3RMVmlldyk7XG59XG5cbmZ1bmN0aW9uIGluc2VydEFuY2hvck5vZGUoaG9zdExWaWV3OiBMVmlldywgaG9zdFROb2RlOiBUTm9kZSk6IFJDb21tZW50IHtcbiAgLy8gSWYgdGhlIGhvc3QgaXMgYSByZWd1bGFyIGVsZW1lbnQsIHdlIGhhdmUgdG8gaW5zZXJ0IGEgY29tbWVudCBub2RlIG1hbnVhbGx5IHdoaWNoIHdpbGxcbiAgLy8gYmUgdXNlZCBhcyBhbiBhbmNob3Igd2hlbiBpbnNlcnRpbmcgZWxlbWVudHMuIEluIHRoaXMgc3BlY2lmaWMgY2FzZSB3ZSB1c2UgbG93LWxldmVsIERPTVxuICAvLyBtYW5pcHVsYXRpb24gdG8gaW5zZXJ0IGl0LlxuICBjb25zdCByZW5kZXJlciA9IGhvc3RMVmlld1tSRU5ERVJFUl07XG4gIG5nRGV2TW9kZSAmJiBuZ0Rldk1vZGUucmVuZGVyZXJDcmVhdGVDb21tZW50Kys7XG4gIGNvbnN0IGNvbW1lbnROb2RlID0gcmVuZGVyZXIuY3JlYXRlQ29tbWVudChuZ0Rldk1vZGUgPyAnY29udGFpbmVyJyA6ICcnKTtcblxuICBjb25zdCBob3N0TmF0aXZlID0gZ2V0TmF0aXZlQnlUTm9kZShob3N0VE5vZGUsIGhvc3RMVmlldykhO1xuICBjb25zdCBwYXJlbnRPZkhvc3ROYXRpdmUgPSBuYXRpdmVQYXJlbnROb2RlKHJlbmRlcmVyLCBob3N0TmF0aXZlKTtcbiAgbmF0aXZlSW5zZXJ0QmVmb3JlKFxuICAgICAgcmVuZGVyZXIsIHBhcmVudE9mSG9zdE5hdGl2ZSEsIGNvbW1lbnROb2RlLCBuYXRpdmVOZXh0U2libGluZyhyZW5kZXJlciwgaG9zdE5hdGl2ZSksIGZhbHNlKTtcbiAgcmV0dXJuIGNvbW1lbnROb2RlO1xufVxuXG4vKipcbiAqIFJlZmVyZW5jZSB0byB0aGUgY3VycmVudCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgY3JlYXRlIGNvbnRhaW5lciByZWYgZnVuY3Rpb24uXG4gKiBJZiBoeWRyYXRpb24gaXMgZW5hYmxlZCwgdGhpcyBpbXBsZW1lbnRhdGlvbiBpcyBzd2FwcGVkIHdpdGggYSB2ZXJzaW9uIHRoYXRcbiAqIHBlcmZvcm1zIGxvb2t1cHMgaW4gbGl2ZSBET00uXG4gKi9cbmxldCBfbG9jYXRlT3JDcmVhdGVDb250YWluZXJSZWZJbXBsID0gKGhvc3RMVmlldzogTFZpZXcsIGhvc3RUTm9kZTogVE5vZGUsIHNsb3RWYWx1ZTogYW55KSA9PiB7XG4gIGxldCBjb21tZW50Tm9kZTogUkNvbW1lbnQ7XG4gIC8vIElmIHRoZSBob3N0IGlzIGFuIGVsZW1lbnQgY29udGFpbmVyLCB0aGUgbmF0aXZlIGhvc3QgZWxlbWVudCBpcyBndWFyYW50ZWVkIHRvIGJlIGFcbiAgLy8gY29tbWVudCBhbmQgd2UgY2FuIHJldXNlIHRoYXQgY29tbWVudCBhcyBhbmNob3IgZWxlbWVudCBmb3IgdGhlIG5ldyBMQ29udGFpbmVyLlxuICAvLyBUaGUgY29tbWVudCBub2RlIGluIHF1ZXN0aW9uIGlzIGFscmVhZHkgcGFydCBvZiB0aGUgRE9NIHN0cnVjdHVyZSBzbyB3ZSBkb24ndCBuZWVkIHRvIGFwcGVuZFxuICAvLyBpdCBhZ2Fpbi5cbiAgaWYgKGhvc3RUTm9kZS50eXBlICYgVE5vZGVUeXBlLkVsZW1lbnRDb250YWluZXIpIHtcbiAgICBjb21tZW50Tm9kZSA9IHVud3JhcFJOb2RlKHNsb3RWYWx1ZSkgYXMgUkNvbW1lbnQ7XG4gIH0gZWxzZSB7XG4gICAgY29tbWVudE5vZGUgPSBpbnNlcnRBbmNob3JOb2RlKGhvc3RMVmlldywgaG9zdFROb2RlKTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVMQ29udGFpbmVyKHNsb3RWYWx1ZSwgaG9zdExWaWV3LCBjb21tZW50Tm9kZSwgaG9zdFROb2RlKTtcbn07XG5cbmZ1bmN0aW9uIGxvY2F0ZU9yQ3JlYXRlQ29udGFpbmVyUmVmSW1wbChcbiAgICBob3N0TFZpZXc6IExWaWV3LCBob3N0VE5vZGU6IFROb2RlLCBzbG90VmFsdWU6IGFueSk6IExDb250YWluZXIge1xuICBsZXQgbmdoQ29udGFpbmVyOiBOZ2hDb250YWluZXI7XG4gIGxldCBkZWh5ZHJhdGVkVmlld3M6IE5naFZpZXdJbnN0YW5jZVtdID0gW107XG4gIGNvbnN0IG5naCA9IGhvc3RMVmlld1tIWURSQVRJT05fSU5GT107XG4gIGNvbnN0IGluZGV4ID0gaG9zdFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgY29uc3QgaXNDcmVhdGluZyA9XG4gICAgICAhbmdoIHx8IGlzSW5Ta2lwSHlkcmF0aW9uQmxvY2soaG9zdFROb2RlLCBob3N0TFZpZXcpIHx8IGlzTm9kZURpc2Nvbm5lY3RlZChuZ2gsIGluZGV4KTtcbiAgaWYgKCFpc0NyZWF0aW5nKSB7XG4gICAgbmdoQ29udGFpbmVyID0gbmdoIS5kYXRhW0NPTlRBSU5FUlNdIVtpbmRleF07XG4gICAgbmdEZXZNb2RlICYmXG4gICAgICAgIGFzc2VydERlZmluZWQobmdoQ29udGFpbmVyLCAnVGhlcmUgaXMgbm8gaHlkcmF0aW9uIGluZm8gYXZhaWxhYmxlIGZvciB0aGlzIGNvbnRhaW5lcicpO1xuICB9XG5cbiAgbGV0IGNvbW1lbnROb2RlOiBSQ29tbWVudDtcbiAgLy8gSWYgdGhlIGhvc3QgaXMgYW4gZWxlbWVudCBjb250YWluZXIsIHRoZSBuYXRpdmUgaG9zdCBlbGVtZW50IGlzIGd1YXJhbnRlZWQgdG8gYmUgYVxuICAvLyBjb21tZW50IGFuZCB3ZSBjYW4gcmV1c2UgdGhhdCBjb21tZW50IGFzIGFuY2hvciBlbGVtZW50IGZvciB0aGUgbmV3IExDb250YWluZXIuXG4gIC8vIFRoZSBjb21tZW50IG5vZGUgaW4gcXVlc3Rpb24gaXMgYWxyZWFkeSBwYXJ0IG9mIHRoZSBET00gc3RydWN0dXJlIHNvIHdlIGRvbid0IG5lZWQgdG8gYXBwZW5kXG4gIC8vIGl0IGFnYWluLlxuICBpZiAoaG9zdFROb2RlLnR5cGUgJiBUTm9kZVR5cGUuRWxlbWVudENvbnRhaW5lcikge1xuICAgIGNvbW1lbnROb2RlID0gdW53cmFwUk5vZGUoc2xvdFZhbHVlKSBhcyBSQ29tbWVudDtcbiAgICBpZiAoIWlzQ3JlYXRpbmcpIHtcbiAgICAgIGNvbnN0IGVsZW1lbnRDb250YWluZXIgPSBuZ2ghLmVsZW1lbnRDb250YWluZXJzPy5baW5kZXhdO1xuICAgICAgaWYgKGVsZW1lbnRDb250YWluZXIgJiYgQXJyYXkuaXNBcnJheShlbGVtZW50Q29udGFpbmVyLmRlaHlkcmF0ZWRWaWV3cykpIHtcbiAgICAgICAgLy8gV2hlbiB3ZSBjcmVhdGUgYW4gTENvbnRhaW5lciBiYXNlZCBvbiBgPG5nLWNvbnRhaW5lcj5gLCB0aGUgY29udGFpbmVyXG4gICAgICAgIC8vIGlzIGFscmVhZHkgcHJvY2Vzc2VkLCBpbmNsdWRpbmcgZGVoeWRyYXRlZCB2aWV3cyBpbmZvLiBSZXVzZSB0aGlzIGluZm9cbiAgICAgICAgLy8gYW5kIGVyYXNlIGl0IGluIHRoZSBuZ2ggZGF0YSB0byBhdm9pZCBtZW1vcnkgbGVha3MuXG4gICAgICAgIGRlaHlkcmF0ZWRWaWV3cyA9IGVsZW1lbnRDb250YWluZXIuZGVoeWRyYXRlZFZpZXdzO1xuICAgICAgICBlbGVtZW50Q29udGFpbmVyLmRlaHlkcmF0ZWRWaWV3cyA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoaXNDcmVhdGluZykge1xuICAgICAgY29tbWVudE5vZGUgPSBpbnNlcnRBbmNob3JOb2RlKGhvc3RMVmlldywgaG9zdFROb2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU3RhcnQgd2l0aCBhIG5vZGUgdGhhdCBpbW1lZGlhdGVseSBmb2xsb3dzIHRoZSBET00gbm9kZSBmb3VuZFxuICAgICAgLy8gaW4gYW4gTFZpZXcgc2xvdC4gVGhpcyBub2RlIGlzOlxuICAgICAgLy8gLSBlaXRoZXIgYW4gYW5jaG9yIGNvbW1lbnQgbm9kZSBvZiB0aGlzIGNvbnRhaW5lciBpZiBpdCdzIGVtcHR5XG4gICAgICAvLyAtIG9yIGEgZmlyc3QgZWxlbWVudCBvZiB0aGUgZmlyc3QgdmlldyBpbiB0aGlzIGNvbnRhaW5lclxuICAgICAgbGV0IGN1cnJlbnRSTm9kZSA9ICh1bndyYXBSTm9kZShzbG90VmFsdWUpIGFzIFJOb2RlKS5uZXh0U2libGluZztcbiAgICAgIC8vIFRPRE86IEFkZCBhc3NlcnQgdGhhdCB0aGUgY3VycmVudFJOb2RlIGV4aXN0c1xuICAgICAgY29uc3QgW2FuY2hvclJOb2RlLCB2aWV3c10gPSBsb2NhdGVEZWh5ZHJhdGVkVmlld3NJbkNvbnRhaW5lcihjdXJyZW50Uk5vZGUhLCBuZ2hDb250YWluZXIhKTtcblxuICAgICAgY29tbWVudE5vZGUgPSBhbmNob3JSTm9kZSBhcyBSQ29tbWVudDtcbiAgICAgIGRlaHlkcmF0ZWRWaWV3cyA9IHZpZXdzO1xuXG4gICAgICBuZ0Rldk1vZGUgJiYgYXNzZXJ0UkNvbW1lbnQoY29tbWVudE5vZGUsICdFeHBlY3RpbmcgYSBjb21tZW50IG5vZGUgaW4gdGVtcGxhdGUgaW5zdHJ1Y3Rpb24nKTtcbiAgICAgIG5nRGV2TW9kZSAmJiBtYXJrUk5vZGVBc0NsYWltZWRGb3JIeWRyYXRpb24oY29tbWVudE5vZGUpO1xuICAgIH1cbiAgfVxuICBjb25zdCBsQ29udGFpbmVyID0gY3JlYXRlTENvbnRhaW5lcihzbG90VmFsdWUsIGhvc3RMVmlldywgY29tbWVudE5vZGUsIGhvc3RUTm9kZSk7XG4gIGlmIChuZ2ggJiYgZGVoeWRyYXRlZFZpZXdzLmxlbmd0aCA+IDApIHtcbiAgICBsQ29udGFpbmVyW0RFSFlEUkFURURfVklFV1NdID0gZGVoeWRyYXRlZFZpZXdzO1xuICB9XG4gIHJldHVybiBsQ29udGFpbmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZW5hYmxlTG9jYXRlT3JDcmVhdGVDb250YWluZXJSZWZJbXBsKCkge1xuICBfbG9jYXRlT3JDcmVhdGVDb250YWluZXJSZWZJbXBsID0gbG9jYXRlT3JDcmVhdGVDb250YWluZXJSZWZJbXBsO1xufVxuIl19