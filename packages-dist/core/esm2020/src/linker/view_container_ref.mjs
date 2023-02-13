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
            hydrationInfo = retrieveNghInfo(rNode);
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
    const isCreating = !ngh || isInSkipHydrationBlock(hostTNode, hostLView) ||
        isNodeDisconnected(ngh, hostTNode.index - HEADER_OFFSET);
    if (!isCreating) {
        const index = hostTNode.index - HEADER_OFFSET;
        nghContainer = ngh[CONTAINERS][index];
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
        if (!isCreating && nghContainer && Array.isArray(nghContainer.dehydratedViews)) {
            // When we create an LContainer based on `<ng-container>`, the container
            // is already processed, including dehydrated views info. Reuse this info
            // and erase it in the ngh data to avoid memory leaks.
            dehydratedViews = nghContainer.dehydratedViews;
            nghContainer.dehydratedViews = [];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld19jb250YWluZXJfcmVmLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvbGlua2VyL3ZpZXdfY29udGFpbmVyX3JlZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFHSCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMsVUFBVSxFQUFnQyxNQUFNLHlCQUF5QixDQUFDO0FBQ2xGLE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQ25FLE9BQU8sRUFBQyxrQkFBa0IsRUFBRSw4QkFBOEIsRUFBRSxlQUFlLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUN2RyxPQUFPLEVBQUMsMEJBQTBCLEVBQUUsZ0NBQWdDLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRyxPQUFPLEVBQUMsTUFBTSxFQUFPLE1BQU0sbUJBQW1CLENBQUM7QUFDL0MsT0FBTyxFQUFDLGtCQUFrQixFQUFFLGNBQWMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ3JFLE9BQU8sRUFBQyxnQkFBZ0IsSUFBSSxrQkFBa0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ2hGLE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMseUJBQXlCLEVBQUUsWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3RFLE9BQU8sRUFBQyxhQUFhLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMvRSxPQUFPLEVBQUMsdUJBQXVCLEVBQUUsZ0JBQWdCLEVBQWMsTUFBTSxFQUFFLFNBQVMsRUFBQyxNQUFNLGlDQUFpQyxDQUFDO0FBSXpILE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUMsYUFBYSxFQUFFLGNBQWMsRUFBUyxN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R0FBRyxnQ0FBZ0MsQ0FBQyxZQUFhLEVBQUUsWUFBYSxDQUFDLENBQUM7WUFFNUYsV0FBVyxHQUFHLFdBQXVCLENBQUM7WUFDdEMsZUFBZSxHQUFHLEtBQUssQ0FBQztZQUV4QixTQUFTLElBQUksY0FBYyxDQUFDLFdBQVcsRUFBRSxrREFBa0QsQ0FBQyxDQUFDO1lBQzdGLFNBQVMsSUFBSSw4QkFBOEIsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUMxRDtLQUNGO0lBQ0QsTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbEYsSUFBSSxHQUFHLElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDckMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsZUFBZSxDQUFDO0tBQ2hEO0lBQ0QsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQztBQUVELE1BQU0sVUFBVSxvQ0FBb0M7SUFDbEQsK0JBQStCLEdBQUcsOEJBQThCLENBQUM7QUFDbkUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0luamVjdG9yfSBmcm9tICcuLi9kaS9pbmplY3Rvcic7XG5pbXBvcnQge0Vudmlyb25tZW50SW5qZWN0b3J9IGZyb20gJy4uL2RpL3IzX2luamVjdG9yJztcbmltcG9ydCB7Q09OVEFJTkVSUywgTmdoQ29udGFpbmVyLCBOZ2hEb20sIE5naFZpZXd9IGZyb20gJy4uL2h5ZHJhdGlvbi9pbnRlcmZhY2VzJztcbmltcG9ydCB7aXNJblNraXBIeWRyYXRpb25CbG9ja30gZnJvbSAnLi4vaHlkcmF0aW9uL3NraXBfaHlkcmF0aW9uJztcbmltcG9ydCB7aXNOb2RlRGlzY29ubmVjdGVkLCBtYXJrUk5vZGVBc0NsYWltZWRGb3JIeWRyYXRpb24sIHJldHJpZXZlTmdoSW5mb30gZnJvbSAnLi4vaHlkcmF0aW9uL3V0aWxzJztcbmltcG9ydCB7ZmluZE1hdGNoaW5nRGVoeWRyYXRlZFZpZXcsIGxvY2F0ZURlaHlkcmF0ZWRWaWV3c0luQ29udGFpbmVyfSBmcm9tICcuLi9oeWRyYXRpb24vdmlld3MnO1xuaW1wb3J0IHtpc1R5cGUsIFR5cGV9IGZyb20gJy4uL2ludGVyZmFjZS90eXBlJztcbmltcG9ydCB7YXNzZXJ0Tm9kZUluamVjdG9yLCBhc3NlcnRSQ29tbWVudH0gZnJvbSAnLi4vcmVuZGVyMy9hc3NlcnQnO1xuaW1wb3J0IHtDb21wb25lbnRGYWN0b3J5IGFzIFIzQ29tcG9uZW50RmFjdG9yeX0gZnJvbSAnLi4vcmVuZGVyMy9jb21wb25lbnRfcmVmJztcbmltcG9ydCB7Z2V0Q29tcG9uZW50RGVmfSBmcm9tICcuLi9yZW5kZXIzL2RlZmluaXRpb24nO1xuaW1wb3J0IHtnZXRQYXJlbnRJbmplY3RvckxvY2F0aW9uLCBOb2RlSW5qZWN0b3J9IGZyb20gJy4uL3JlbmRlcjMvZGknO1xuaW1wb3J0IHthZGRUb1ZpZXdUcmVlLCBjcmVhdGVMQ29udGFpbmVyfSBmcm9tICcuLi9yZW5kZXIzL2luc3RydWN0aW9ucy9zaGFyZWQnO1xuaW1wb3J0IHtDT05UQUlORVJfSEVBREVSX09GRlNFVCwgREVIWURSQVRFRF9WSUVXUywgTENvbnRhaW5lciwgTkFUSVZFLCBWSUVXX1JFRlN9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9jb250YWluZXInO1xuaW1wb3J0IHtOb2RlSW5qZWN0b3JPZmZzZXR9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9pbmplY3Rvcic7XG5pbXBvcnQge1RDb250YWluZXJOb2RlLCBURGlyZWN0aXZlSG9zdE5vZGUsIFRFbGVtZW50Q29udGFpbmVyTm9kZSwgVEVsZW1lbnROb2RlLCBUTm9kZSwgVE5vZGVUeXBlfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvbm9kZSc7XG5pbXBvcnQge1JDb21tZW50LCBSRWxlbWVudCwgUk5vZGV9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9yZW5kZXJlcl9kb20nO1xuaW1wb3J0IHtpc0xDb250YWluZXJ9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy90eXBlX2NoZWNrcyc7XG5pbXBvcnQge0hFQURFUl9PRkZTRVQsIEhZRFJBVElPTl9JTkZPLCBMVmlldywgUEFSRU5ULCBSRU5ERVJFUiwgVF9IT1NULCBUVklFV30gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3ZpZXcnO1xuaW1wb3J0IHthc3NlcnRUTm9kZVR5cGV9IGZyb20gJy4uL3JlbmRlcjMvbm9kZV9hc3NlcnQnO1xuaW1wb3J0IHthZGRWaWV3VG9Db250YWluZXIsIGRlc3Ryb3lMVmlldywgZGV0YWNoVmlldywgZ2V0QmVmb3JlTm9kZUZvclZpZXcsIGluc2VydFZpZXcsIG5hdGl2ZUluc2VydEJlZm9yZSwgbmF0aXZlTmV4dFNpYmxpbmcsIG5hdGl2ZVBhcmVudE5vZGV9IGZyb20gJy4uL3JlbmRlcjMvbm9kZV9tYW5pcHVsYXRpb24nO1xuaW1wb3J0IHtnZXRDdXJyZW50VE5vZGUsIGdldExWaWV3fSBmcm9tICcuLi9yZW5kZXIzL3N0YXRlJztcbmltcG9ydCB7Z2V0UGFyZW50SW5qZWN0b3JJbmRleCwgZ2V0UGFyZW50SW5qZWN0b3JWaWV3LCBoYXNQYXJlbnRJbmplY3Rvcn0gZnJvbSAnLi4vcmVuZGVyMy91dGlsL2luamVjdG9yX3V0aWxzJztcbmltcG9ydCB7Z2V0TmF0aXZlQnlUTm9kZSwgdW53cmFwUk5vZGUsIHZpZXdBdHRhY2hlZFRvQ29udGFpbmVyfSBmcm9tICcuLi9yZW5kZXIzL3V0aWwvdmlld191dGlscyc7XG5pbXBvcnQge1ZpZXdSZWYgYXMgUjNWaWV3UmVmfSBmcm9tICcuLi9yZW5kZXIzL3ZpZXdfcmVmJztcbmltcG9ydCB7YWRkVG9BcnJheSwgcmVtb3ZlRnJvbUFycmF5fSBmcm9tICcuLi91dGlsL2FycmF5X3V0aWxzJztcbmltcG9ydCB7YXNzZXJ0RGVmaW5lZCwgYXNzZXJ0RXF1YWwsIGFzc2VydEdyZWF0ZXJUaGFuLCBhc3NlcnRMZXNzVGhhbiwgdGhyb3dFcnJvcn0gZnJvbSAnLi4vdXRpbC9hc3NlcnQnO1xuXG5pbXBvcnQge0NvbXBvbmVudEZhY3RvcnksIENvbXBvbmVudFJlZn0gZnJvbSAnLi9jb21wb25lbnRfZmFjdG9yeSc7XG5pbXBvcnQge2NyZWF0ZUVsZW1lbnRSZWYsIEVsZW1lbnRSZWZ9IGZyb20gJy4vZWxlbWVudF9yZWYnO1xuaW1wb3J0IHtOZ01vZHVsZVJlZn0gZnJvbSAnLi9uZ19tb2R1bGVfZmFjdG9yeSc7XG5pbXBvcnQge1RlbXBsYXRlUmVmfSBmcm9tICcuL3RlbXBsYXRlX3JlZic7XG5pbXBvcnQge0VtYmVkZGVkVmlld1JlZiwgVmlld1JlZn0gZnJvbSAnLi92aWV3X3JlZic7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNvbnRhaW5lciB3aGVyZSBvbmUgb3IgbW9yZSB2aWV3cyBjYW4gYmUgYXR0YWNoZWQgdG8gYSBjb21wb25lbnQuXG4gKlxuICogQ2FuIGNvbnRhaW4gKmhvc3Qgdmlld3MqIChjcmVhdGVkIGJ5IGluc3RhbnRpYXRpbmcgYVxuICogY29tcG9uZW50IHdpdGggdGhlIGBjcmVhdGVDb21wb25lbnQoKWAgbWV0aG9kKSwgYW5kICplbWJlZGRlZCB2aWV3cypcbiAqIChjcmVhdGVkIGJ5IGluc3RhbnRpYXRpbmcgYSBgVGVtcGxhdGVSZWZgIHdpdGggdGhlIGBjcmVhdGVFbWJlZGRlZFZpZXcoKWAgbWV0aG9kKS5cbiAqXG4gKiBBIHZpZXcgY29udGFpbmVyIGluc3RhbmNlIGNhbiBjb250YWluIG90aGVyIHZpZXcgY29udGFpbmVycyxcbiAqIGNyZWF0aW5nIGEgW3ZpZXcgaGllcmFyY2h5XShndWlkZS9nbG9zc2FyeSN2aWV3LXRyZWUpLlxuICpcbiAqIEBzZWUgYENvbXBvbmVudFJlZmBcbiAqIEBzZWUgYEVtYmVkZGVkVmlld1JlZmBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBWaWV3Q29udGFpbmVyUmVmIHtcbiAgLyoqXG4gICAqIEFuY2hvciBlbGVtZW50IHRoYXQgc3BlY2lmaWVzIHRoZSBsb2NhdGlvbiBvZiB0aGlzIGNvbnRhaW5lciBpbiB0aGUgY29udGFpbmluZyB2aWV3LlxuICAgKiBFYWNoIHZpZXcgY29udGFpbmVyIGNhbiBoYXZlIG9ubHkgb25lIGFuY2hvciBlbGVtZW50LCBhbmQgZWFjaCBhbmNob3IgZWxlbWVudFxuICAgKiBjYW4gaGF2ZSBvbmx5IGEgc2luZ2xlIHZpZXcgY29udGFpbmVyLlxuICAgKlxuICAgKiBSb290IGVsZW1lbnRzIG9mIHZpZXdzIGF0dGFjaGVkIHRvIHRoaXMgY29udGFpbmVyIGJlY29tZSBzaWJsaW5ncyBvZiB0aGUgYW5jaG9yIGVsZW1lbnQgaW5cbiAgICogdGhlIHJlbmRlcmVkIHZpZXcuXG4gICAqXG4gICAqIEFjY2VzcyB0aGUgYFZpZXdDb250YWluZXJSZWZgIG9mIGFuIGVsZW1lbnQgYnkgcGxhY2luZyBhIGBEaXJlY3RpdmVgIGluamVjdGVkXG4gICAqIHdpdGggYFZpZXdDb250YWluZXJSZWZgIG9uIHRoZSBlbGVtZW50LCBvciB1c2UgYSBgVmlld0NoaWxkYCBxdWVyeS5cbiAgICpcbiAgICogPCEtLSBUT0RPOiByZW5hbWUgdG8gYW5jaG9yRWxlbWVudCAtLT5cbiAgICovXG4gIGFic3RyYWN0IGdldCBlbGVtZW50KCk6IEVsZW1lbnRSZWY7XG5cbiAgLyoqXG4gICAqIFRoZSBbZGVwZW5kZW5jeSBpbmplY3Rvcl0oZ3VpZGUvZ2xvc3NhcnkjaW5qZWN0b3IpIGZvciB0aGlzIHZpZXcgY29udGFpbmVyLlxuICAgKi9cbiAgYWJzdHJhY3QgZ2V0IGluamVjdG9yKCk6IEluamVjdG9yO1xuXG4gIC8qKiBAZGVwcmVjYXRlZCBObyByZXBsYWNlbWVudCAqL1xuICBhYnN0cmFjdCBnZXQgcGFyZW50SW5qZWN0b3IoKTogSW5qZWN0b3I7XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFsbCB2aWV3cyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgICovXG4gIGFic3RyYWN0IGNsZWFyKCk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhIHZpZXcgZnJvbSB0aGlzIGNvbnRhaW5lci5cbiAgICogQHBhcmFtIGluZGV4IFRoZSAwLWJhc2VkIGluZGV4IG9mIHRoZSB2aWV3IHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJucyBUaGUgYFZpZXdSZWZgIGluc3RhbmNlLCBvciBudWxsIGlmIHRoZSBpbmRleCBpcyBvdXQgb2YgcmFuZ2UuXG4gICAqL1xuICBhYnN0cmFjdCBnZXQoaW5kZXg6IG51bWJlcik6IFZpZXdSZWZ8bnVsbDtcblxuICAvKipcbiAgICogUmVwb3J0cyBob3cgbWFueSB2aWV3cyBhcmUgY3VycmVudGx5IGF0dGFjaGVkIHRvIHRoaXMgY29udGFpbmVyLlxuICAgKiBAcmV0dXJucyBUaGUgbnVtYmVyIG9mIHZpZXdzLlxuICAgKi9cbiAgYWJzdHJhY3QgZ2V0IGxlbmd0aCgpOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEluc3RhbnRpYXRlcyBhbiBlbWJlZGRlZCB2aWV3IGFuZCBpbnNlcnRzIGl0XG4gICAqIGludG8gdGhpcyBjb250YWluZXIuXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZVJlZiBUaGUgSFRNTCB0ZW1wbGF0ZSB0aGF0IGRlZmluZXMgdGhlIHZpZXcuXG4gICAqIEBwYXJhbSBjb250ZXh0IFRoZSBkYXRhLWJpbmRpbmcgY29udGV4dCBvZiB0aGUgZW1iZWRkZWQgdmlldywgYXMgZGVjbGFyZWRcbiAgICogaW4gdGhlIGA8bmctdGVtcGxhdGU+YCB1c2FnZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgRXh0cmEgY29uZmlndXJhdGlvbiBmb3IgdGhlIGNyZWF0ZWQgdmlldy4gSW5jbHVkZXM6XG4gICAqICAqIGluZGV4OiBUaGUgMC1iYXNlZCBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIG5ldyB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqICAgICAgICAgICBJZiBub3Qgc3BlY2lmaWVkLCBhcHBlbmRzIHRoZSBuZXcgdmlldyBhcyB0aGUgbGFzdCBlbnRyeS5cbiAgICogICogaW5qZWN0b3I6IEluamVjdG9yIHRvIGJlIHVzZWQgd2l0aGluIHRoZSBlbWJlZGRlZCB2aWV3LlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgYFZpZXdSZWZgIGluc3RhbmNlIGZvciB0aGUgbmV3bHkgY3JlYXRlZCB2aWV3LlxuICAgKi9cbiAgYWJzdHJhY3QgY3JlYXRlRW1iZWRkZWRWaWV3PEM+KHRlbXBsYXRlUmVmOiBUZW1wbGF0ZVJlZjxDPiwgY29udGV4dD86IEMsIG9wdGlvbnM/OiB7XG4gICAgaW5kZXg/OiBudW1iZXIsXG4gICAgaW5qZWN0b3I/OiBJbmplY3RvclxuICB9KTogRW1iZWRkZWRWaWV3UmVmPEM+O1xuXG4gIC8qKlxuICAgKiBJbnN0YW50aWF0ZXMgYW4gZW1iZWRkZWQgdmlldyBhbmQgaW5zZXJ0cyBpdFxuICAgKiBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gdGVtcGxhdGVSZWYgVGhlIEhUTUwgdGVtcGxhdGUgdGhhdCBkZWZpbmVzIHRoZSB2aWV3LlxuICAgKiBAcGFyYW0gY29udGV4dCBUaGUgZGF0YS1iaW5kaW5nIGNvbnRleHQgb2YgdGhlIGVtYmVkZGVkIHZpZXcsIGFzIGRlY2xhcmVkXG4gICAqIGluIHRoZSBgPG5nLXRlbXBsYXRlPmAgdXNhZ2UuXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgMC1iYXNlZCBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIG5ldyB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqIElmIG5vdCBzcGVjaWZpZWQsIGFwcGVuZHMgdGhlIG5ldyB2aWV3IGFzIHRoZSBsYXN0IGVudHJ5LlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgYFZpZXdSZWZgIGluc3RhbmNlIGZvciB0aGUgbmV3bHkgY3JlYXRlZCB2aWV3LlxuICAgKi9cbiAgYWJzdHJhY3QgY3JlYXRlRW1iZWRkZWRWaWV3PEM+KHRlbXBsYXRlUmVmOiBUZW1wbGF0ZVJlZjxDPiwgY29udGV4dD86IEMsIGluZGV4PzogbnVtYmVyKTpcbiAgICAgIEVtYmVkZGVkVmlld1JlZjxDPjtcblxuICAvKipcbiAgICogSW5zdGFudGlhdGVzIGEgc2luZ2xlIGNvbXBvbmVudCBhbmQgaW5zZXJ0cyBpdHMgaG9zdCB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqXG4gICAqIEBwYXJhbSBjb21wb25lbnRUeXBlIENvbXBvbmVudCBUeXBlIHRvIHVzZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgZXh0cmEgcGFyYW1ldGVyczpcbiAgICogICogaW5kZXg6IHRoZSBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIG5ldyBjb21wb25lbnQncyBob3N0IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogICAgICAgICAgIElmIG5vdCBzcGVjaWZpZWQsIGFwcGVuZHMgdGhlIG5ldyB2aWV3IGFzIHRoZSBsYXN0IGVudHJ5LlxuICAgKiAgKiBpbmplY3RvcjogdGhlIGluamVjdG9yIHRvIHVzZSBhcyB0aGUgcGFyZW50IGZvciB0aGUgbmV3IGNvbXBvbmVudC5cbiAgICogICogbmdNb2R1bGVSZWY6IGFuIE5nTW9kdWxlUmVmIG9mIHRoZSBjb21wb25lbnQncyBOZ01vZHVsZSwgeW91IHNob3VsZCBhbG1vc3QgYWx3YXlzIHByb3ZpZGVcbiAgICogICAgICAgICAgICAgICAgIHRoaXMgdG8gZW5zdXJlIHRoYXQgYWxsIGV4cGVjdGVkIHByb3ZpZGVycyBhcmUgYXZhaWxhYmxlIGZvciB0aGUgY29tcG9uZW50XG4gICAqICAgICAgICAgICAgICAgICBpbnN0YW50aWF0aW9uLlxuICAgKiAgKiBlbnZpcm9ubWVudEluamVjdG9yOiBhbiBFbnZpcm9ubWVudEluamVjdG9yIHdoaWNoIHdpbGwgcHJvdmlkZSB0aGUgY29tcG9uZW50J3MgZW52aXJvbm1lbnQuXG4gICAqICAgICAgICAgICAgICAgICB5b3Ugc2hvdWxkIGFsbW9zdCBhbHdheXMgcHJvdmlkZSB0aGlzIHRvIGVuc3VyZSB0aGF0IGFsbCBleHBlY3RlZCBwcm92aWRlcnNcbiAgICogICAgICAgICAgICAgICAgIGFyZSBhdmFpbGFibGUgZm9yIHRoZSBjb21wb25lbnQgaW5zdGFudGlhdGlvbi4gVGhpcyBvcHRpb24gaXMgaW50ZW5kZWQgdG9cbiAgICogICAgICAgICAgICAgICAgIHJlcGxhY2UgdGhlIGBuZ01vZHVsZVJlZmAgcGFyYW1ldGVyLlxuICAgKiAgKiBwcm9qZWN0YWJsZU5vZGVzOiBsaXN0IG9mIERPTSBub2RlcyB0aGF0IHNob3VsZCBiZSBwcm9qZWN0ZWQgdGhyb3VnaFxuICAgKiAgICAgICAgICAgICAgICAgICAgICBbYDxuZy1jb250ZW50PmBdKGFwaS9jb3JlL25nLWNvbnRlbnQpIG9mIHRoZSBuZXcgY29tcG9uZW50IGluc3RhbmNlLlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgbmV3IGBDb21wb25lbnRSZWZgIHdoaWNoIGNvbnRhaW5zIHRoZSBjb21wb25lbnQgaW5zdGFuY2UgYW5kIHRoZSBob3N0IHZpZXcuXG4gICAqL1xuICBhYnN0cmFjdCBjcmVhdGVDb21wb25lbnQ8Qz4oY29tcG9uZW50VHlwZTogVHlwZTxDPiwgb3B0aW9ucz86IHtcbiAgICBpbmRleD86IG51bWJlcixcbiAgICBpbmplY3Rvcj86IEluamVjdG9yLFxuICAgIG5nTW9kdWxlUmVmPzogTmdNb2R1bGVSZWY8dW5rbm93bj4sXG4gICAgZW52aXJvbm1lbnRJbmplY3Rvcj86IEVudmlyb25tZW50SW5qZWN0b3J8TmdNb2R1bGVSZWY8dW5rbm93bj4sXG4gICAgcHJvamVjdGFibGVOb2Rlcz86IE5vZGVbXVtdLFxuICB9KTogQ29tcG9uZW50UmVmPEM+O1xuXG4gIC8qKlxuICAgKiBJbnN0YW50aWF0ZXMgYSBzaW5nbGUgY29tcG9uZW50IGFuZCBpbnNlcnRzIGl0cyBob3N0IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBvbmVudEZhY3RvcnkgQ29tcG9uZW50IGZhY3RvcnkgdG8gdXNlLlxuICAgKiBAcGFyYW0gaW5kZXggVGhlIGluZGV4IGF0IHdoaWNoIHRvIGluc2VydCB0aGUgbmV3IGNvbXBvbmVudCdzIGhvc3QgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKiBJZiBub3Qgc3BlY2lmaWVkLCBhcHBlbmRzIHRoZSBuZXcgdmlldyBhcyB0aGUgbGFzdCBlbnRyeS5cbiAgICogQHBhcmFtIGluamVjdG9yIFRoZSBpbmplY3RvciB0byB1c2UgYXMgdGhlIHBhcmVudCBmb3IgdGhlIG5ldyBjb21wb25lbnQuXG4gICAqIEBwYXJhbSBwcm9qZWN0YWJsZU5vZGVzIExpc3Qgb2YgRE9NIG5vZGVzIHRoYXQgc2hvdWxkIGJlIHByb2plY3RlZCB0aHJvdWdoXG4gICAqICAgICBbYDxuZy1jb250ZW50PmBdKGFwaS9jb3JlL25nLWNvbnRlbnQpIG9mIHRoZSBuZXcgY29tcG9uZW50IGluc3RhbmNlLlxuICAgKiBAcGFyYW0gbmdNb2R1bGVSZWYgQW4gaW5zdGFuY2Ugb2YgdGhlIE5nTW9kdWxlUmVmIHRoYXQgcmVwcmVzZW50IGFuIE5nTW9kdWxlLlxuICAgKiBUaGlzIGluZm9ybWF0aW9uIGlzIHVzZWQgdG8gcmV0cmlldmUgY29ycmVzcG9uZGluZyBOZ01vZHVsZSBpbmplY3Rvci5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIG5ldyBgQ29tcG9uZW50UmVmYCB3aGljaCBjb250YWlucyB0aGUgY29tcG9uZW50IGluc3RhbmNlIGFuZCB0aGUgaG9zdCB2aWV3LlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBBbmd1bGFyIG5vIGxvbmdlciByZXF1aXJlcyBjb21wb25lbnQgZmFjdG9yaWVzIHRvIGR5bmFtaWNhbGx5IGNyZWF0ZSBjb21wb25lbnRzLlxuICAgKiAgICAgVXNlIGRpZmZlcmVudCBzaWduYXR1cmUgb2YgdGhlIGBjcmVhdGVDb21wb25lbnRgIG1ldGhvZCwgd2hpY2ggYWxsb3dzIHBhc3NpbmdcbiAgICogICAgIENvbXBvbmVudCBjbGFzcyBkaXJlY3RseS5cbiAgICovXG4gIGFic3RyYWN0IGNyZWF0ZUNvbXBvbmVudDxDPihcbiAgICAgIGNvbXBvbmVudEZhY3Rvcnk6IENvbXBvbmVudEZhY3Rvcnk8Qz4sIGluZGV4PzogbnVtYmVyLCBpbmplY3Rvcj86IEluamVjdG9yLFxuICAgICAgcHJvamVjdGFibGVOb2Rlcz86IGFueVtdW10sXG4gICAgICBlbnZpcm9ubWVudEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3RvcnxOZ01vZHVsZVJlZjxhbnk+KTogQ29tcG9uZW50UmVmPEM+O1xuXG4gIC8qKlxuICAgKiBJbnNlcnRzIGEgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gdmlld1JlZiBUaGUgdmlldyB0byBpbnNlcnQuXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgMC1iYXNlZCBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIHZpZXcuXG4gICAqIElmIG5vdCBzcGVjaWZpZWQsIGFwcGVuZHMgdGhlIG5ldyB2aWV3IGFzIHRoZSBsYXN0IGVudHJ5LlxuICAgKiBAcmV0dXJucyBUaGUgaW5zZXJ0ZWQgYFZpZXdSZWZgIGluc3RhbmNlLlxuICAgKlxuICAgKi9cbiAgYWJzdHJhY3QgaW5zZXJ0KHZpZXdSZWY6IFZpZXdSZWYsIGluZGV4PzogbnVtYmVyKTogVmlld1JlZjtcblxuICAvKipcbiAgICogTW92ZXMgYSB2aWV3IHRvIGEgbmV3IGxvY2F0aW9uIGluIHRoaXMgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gdmlld1JlZiBUaGUgdmlldyB0byBtb3ZlLlxuICAgKiBAcGFyYW0gaW5kZXggVGhlIDAtYmFzZWQgaW5kZXggb2YgdGhlIG5ldyBsb2NhdGlvbi5cbiAgICogQHJldHVybnMgVGhlIG1vdmVkIGBWaWV3UmVmYCBpbnN0YW5jZS5cbiAgICovXG4gIGFic3RyYWN0IG1vdmUodmlld1JlZjogVmlld1JlZiwgY3VycmVudEluZGV4OiBudW1iZXIpOiBWaWV3UmVmO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBpbmRleCBvZiBhIHZpZXcgd2l0aGluIHRoZSBjdXJyZW50IGNvbnRhaW5lci5cbiAgICogQHBhcmFtIHZpZXdSZWYgVGhlIHZpZXcgdG8gcXVlcnkuXG4gICAqIEByZXR1cm5zIFRoZSAwLWJhc2VkIGluZGV4IG9mIHRoZSB2aWV3J3MgcG9zaXRpb24gaW4gdGhpcyBjb250YWluZXIsXG4gICAqIG9yIGAtMWAgaWYgdGhpcyBjb250YWluZXIgZG9lc24ndCBjb250YWluIHRoZSB2aWV3LlxuICAgKi9cbiAgYWJzdHJhY3QgaW5kZXhPZih2aWV3UmVmOiBWaWV3UmVmKTogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhIHZpZXcgYXR0YWNoZWQgdG8gdGhpcyBjb250YWluZXJcbiAgICogQHBhcmFtIGluZGV4IFRoZSAwLWJhc2VkIGluZGV4IG9mIHRoZSB2aWV3IHRvIGRlc3Ryb3kuXG4gICAqIElmIG5vdCBzcGVjaWZpZWQsIHRoZSBsYXN0IHZpZXcgaW4gdGhlIGNvbnRhaW5lciBpcyByZW1vdmVkLlxuICAgKi9cbiAgYWJzdHJhY3QgcmVtb3ZlKGluZGV4PzogbnVtYmVyKTogdm9pZDtcblxuICAvKipcbiAgICogRGV0YWNoZXMgYSB2aWV3IGZyb20gdGhpcyBjb250YWluZXIgd2l0aG91dCBkZXN0cm95aW5nIGl0LlxuICAgKiBVc2UgYWxvbmcgd2l0aCBgaW5zZXJ0KClgIHRvIG1vdmUgYSB2aWV3IHdpdGhpbiB0aGUgY3VycmVudCBjb250YWluZXIuXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgMC1iYXNlZCBpbmRleCBvZiB0aGUgdmlldyB0byBkZXRhY2guXG4gICAqIElmIG5vdCBzcGVjaWZpZWQsIHRoZSBsYXN0IHZpZXcgaW4gdGhlIGNvbnRhaW5lciBpcyBkZXRhY2hlZC5cbiAgICovXG4gIGFic3RyYWN0IGRldGFjaChpbmRleD86IG51bWJlcik6IFZpZXdSZWZ8bnVsbDtcblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIEBub2NvbGxhcHNlXG4gICAqL1xuICBzdGF0aWMgX19OR19FTEVNRU5UX0lEX186ICgpID0+IFZpZXdDb250YWluZXJSZWYgPSBpbmplY3RWaWV3Q29udGFpbmVyUmVmO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBWaWV3Q29udGFpbmVyUmVmIGFuZCBzdG9yZXMgaXQgb24gdGhlIGluamVjdG9yLiBPciwgaWYgdGhlIFZpZXdDb250YWluZXJSZWZcbiAqIGFscmVhZHkgZXhpc3RzLCByZXRyaWV2ZXMgdGhlIGV4aXN0aW5nIFZpZXdDb250YWluZXJSZWYuXG4gKlxuICogQHJldHVybnMgVGhlIFZpZXdDb250YWluZXJSZWYgaW5zdGFuY2UgdG8gdXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmplY3RWaWV3Q29udGFpbmVyUmVmKCk6IFZpZXdDb250YWluZXJSZWYge1xuICBjb25zdCBwcmV2aW91c1ROb2RlID0gZ2V0Q3VycmVudFROb2RlKCkgYXMgVEVsZW1lbnROb2RlIHwgVEVsZW1lbnRDb250YWluZXJOb2RlIHwgVENvbnRhaW5lck5vZGU7XG4gIHJldHVybiBjcmVhdGVDb250YWluZXJSZWYocHJldmlvdXNUTm9kZSwgZ2V0TFZpZXcoKSk7XG59XG5cbmNvbnN0IFZFX1ZpZXdDb250YWluZXJSZWYgPSBWaWV3Q29udGFpbmVyUmVmO1xuXG4vLyBUT0RPKGFseGh1Yik6IGNsZWFuaW5nIHVwIHRoaXMgaW5kaXJlY3Rpb24gdHJpZ2dlcnMgYSBzdWJ0bGUgYnVnIGluIENsb3N1cmUgaW4gZzMuIE9uY2UgdGhlIGZpeFxuLy8gZm9yIHRoYXQgbGFuZHMsIHRoaXMgY2FuIGJlIGNsZWFuZWQgdXAuXG5jb25zdCBSM1ZpZXdDb250YWluZXJSZWYgPSBjbGFzcyBWaWV3Q29udGFpbmVyUmVmIGV4dGVuZHMgVkVfVmlld0NvbnRhaW5lclJlZiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBfbENvbnRhaW5lcjogTENvbnRhaW5lcixcbiAgICAgIHByaXZhdGUgX2hvc3RUTm9kZTogVEVsZW1lbnROb2RlfFRDb250YWluZXJOb2RlfFRFbGVtZW50Q29udGFpbmVyTm9kZSxcbiAgICAgIHByaXZhdGUgX2hvc3RMVmlldzogTFZpZXcpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0IGVsZW1lbnQoKTogRWxlbWVudFJlZiB7XG4gICAgcmV0dXJuIGNyZWF0ZUVsZW1lbnRSZWYodGhpcy5faG9zdFROb2RlLCB0aGlzLl9ob3N0TFZpZXcpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0IGluamVjdG9yKCk6IEluamVjdG9yIHtcbiAgICByZXR1cm4gbmV3IE5vZGVJbmplY3Rvcih0aGlzLl9ob3N0VE5vZGUsIHRoaXMuX2hvc3RMVmlldyk7XG4gIH1cblxuICAvKiogQGRlcHJlY2F0ZWQgTm8gcmVwbGFjZW1lbnQgKi9cbiAgb3ZlcnJpZGUgZ2V0IHBhcmVudEluamVjdG9yKCk6IEluamVjdG9yIHtcbiAgICBjb25zdCBwYXJlbnRMb2NhdGlvbiA9IGdldFBhcmVudEluamVjdG9yTG9jYXRpb24odGhpcy5faG9zdFROb2RlLCB0aGlzLl9ob3N0TFZpZXcpO1xuICAgIGlmIChoYXNQYXJlbnRJbmplY3RvcihwYXJlbnRMb2NhdGlvbikpIHtcbiAgICAgIGNvbnN0IHBhcmVudFZpZXcgPSBnZXRQYXJlbnRJbmplY3RvclZpZXcocGFyZW50TG9jYXRpb24sIHRoaXMuX2hvc3RMVmlldyk7XG4gICAgICBjb25zdCBpbmplY3RvckluZGV4ID0gZ2V0UGFyZW50SW5qZWN0b3JJbmRleChwYXJlbnRMb2NhdGlvbik7XG4gICAgICBuZ0Rldk1vZGUgJiYgYXNzZXJ0Tm9kZUluamVjdG9yKHBhcmVudFZpZXcsIGluamVjdG9ySW5kZXgpO1xuICAgICAgY29uc3QgcGFyZW50VE5vZGUgPVxuICAgICAgICAgIHBhcmVudFZpZXdbVFZJRVddLmRhdGFbaW5qZWN0b3JJbmRleCArIE5vZGVJbmplY3Rvck9mZnNldC5UTk9ERV0gYXMgVEVsZW1lbnROb2RlO1xuICAgICAgcmV0dXJuIG5ldyBOb2RlSW5qZWN0b3IocGFyZW50VE5vZGUsIHBhcmVudFZpZXcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IE5vZGVJbmplY3RvcihudWxsLCB0aGlzLl9ob3N0TFZpZXcpO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGNsZWFyKCk6IHZvaWQge1xuICAgIHdoaWxlICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMucmVtb3ZlKHRoaXMubGVuZ3RoIC0gMSk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0KGluZGV4OiBudW1iZXIpOiBWaWV3UmVmfG51bGwge1xuICAgIGNvbnN0IHZpZXdSZWZzID0gZ2V0Vmlld1JlZnModGhpcy5fbENvbnRhaW5lcik7XG4gICAgcmV0dXJuIHZpZXdSZWZzICE9PSBudWxsICYmIHZpZXdSZWZzW2luZGV4XSB8fCBudWxsO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9sQ29udGFpbmVyLmxlbmd0aCAtIENPTlRBSU5FUl9IRUFERVJfT0ZGU0VUO1xuICB9XG5cbiAgb3ZlcnJpZGUgY3JlYXRlRW1iZWRkZWRWaWV3PEM+KHRlbXBsYXRlUmVmOiBUZW1wbGF0ZVJlZjxDPiwgY29udGV4dD86IEMsIG9wdGlvbnM/OiB7XG4gICAgaW5kZXg/OiBudW1iZXIsXG4gICAgaW5qZWN0b3I/OiBJbmplY3RvclxuICB9KTogRW1iZWRkZWRWaWV3UmVmPEM+O1xuICBvdmVycmlkZSBjcmVhdGVFbWJlZGRlZFZpZXc8Qz4odGVtcGxhdGVSZWY6IFRlbXBsYXRlUmVmPEM+LCBjb250ZXh0PzogQywgaW5kZXg/OiBudW1iZXIpOlxuICAgICAgRW1iZWRkZWRWaWV3UmVmPEM+O1xuICBvdmVycmlkZSBjcmVhdGVFbWJlZGRlZFZpZXc8Qz4odGVtcGxhdGVSZWY6IFRlbXBsYXRlUmVmPEM+LCBjb250ZXh0PzogQywgaW5kZXhPck9wdGlvbnM/OiBudW1iZXJ8e1xuICAgIGluZGV4PzogbnVtYmVyLFxuICAgIGluamVjdG9yPzogSW5qZWN0b3JcbiAgfSk6IEVtYmVkZGVkVmlld1JlZjxDPiB7XG4gICAgbGV0IGluZGV4OiBudW1iZXJ8dW5kZWZpbmVkO1xuICAgIGxldCBpbmplY3RvcjogSW5qZWN0b3J8dW5kZWZpbmVkO1xuXG4gICAgaWYgKHR5cGVvZiBpbmRleE9yT3B0aW9ucyA9PT0gJ251bWJlcicpIHtcbiAgICAgIGluZGV4ID0gaW5kZXhPck9wdGlvbnM7XG4gICAgfSBlbHNlIGlmIChpbmRleE9yT3B0aW9ucyAhPSBudWxsKSB7XG4gICAgICBpbmRleCA9IGluZGV4T3JPcHRpb25zLmluZGV4O1xuICAgICAgaW5qZWN0b3IgPSBpbmRleE9yT3B0aW9ucy5pbmplY3RvcjtcbiAgICB9XG5cbiAgICBsZXQgaHlkcmF0aW9uSW5mbzogTmdoVmlld3xudWxsID0gbnVsbDtcbiAgICBjb25zdCBzc3JJZCA9ICh0ZW1wbGF0ZVJlZiBhcyB1bmtub3duIGFzIHtzc3JJZDogc3RyaW5nIHwgbnVsbH0pLnNzcklkO1xuICAgIGlmIChzc3JJZCkge1xuICAgICAgaHlkcmF0aW9uSW5mbyA9IGZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3KHRoaXMuX2xDb250YWluZXIsIHNzcklkKTtcbiAgICB9XG5cbiAgICBjb25zdCB2aWV3UmVmID0gdGVtcGxhdGVSZWYuY3JlYXRlRW1iZWRkZWRWaWV3SW1wbChjb250ZXh0IHx8IDxhbnk+e30sIGluamVjdG9yLCBoeWRyYXRpb25JbmZvKTtcblxuICAgIHRoaXMuaW5zZXJ0SW1wbCh2aWV3UmVmLCBpbmRleCwgISFoeWRyYXRpb25JbmZvKTtcbiAgICByZXR1cm4gdmlld1JlZjtcbiAgfVxuXG4gIG92ZXJyaWRlIGNyZWF0ZUNvbXBvbmVudDxDPihjb21wb25lbnRUeXBlOiBUeXBlPEM+LCBvcHRpb25zPzoge1xuICAgIGluZGV4PzogbnVtYmVyLFxuICAgIGluamVjdG9yPzogSW5qZWN0b3IsXG4gICAgcHJvamVjdGFibGVOb2Rlcz86IE5vZGVbXVtdLFxuICAgIG5nTW9kdWxlUmVmPzogTmdNb2R1bGVSZWY8dW5rbm93bj4sXG4gIH0pOiBDb21wb25lbnRSZWY8Qz47XG4gIC8qKlxuICAgKiBAZGVwcmVjYXRlZCBBbmd1bGFyIG5vIGxvbmdlciByZXF1aXJlcyBjb21wb25lbnQgZmFjdG9yaWVzIHRvIGR5bmFtaWNhbGx5IGNyZWF0ZSBjb21wb25lbnRzLlxuICAgKiAgICAgVXNlIGRpZmZlcmVudCBzaWduYXR1cmUgb2YgdGhlIGBjcmVhdGVDb21wb25lbnRgIG1ldGhvZCwgd2hpY2ggYWxsb3dzIHBhc3NpbmdcbiAgICogICAgIENvbXBvbmVudCBjbGFzcyBkaXJlY3RseS5cbiAgICovXG4gIG92ZXJyaWRlIGNyZWF0ZUNvbXBvbmVudDxDPihcbiAgICAgIGNvbXBvbmVudEZhY3Rvcnk6IENvbXBvbmVudEZhY3Rvcnk8Qz4sIGluZGV4PzogbnVtYmVyfHVuZGVmaW5lZCxcbiAgICAgIGluamVjdG9yPzogSW5qZWN0b3J8dW5kZWZpbmVkLCBwcm9qZWN0YWJsZU5vZGVzPzogYW55W11bXXx1bmRlZmluZWQsXG4gICAgICBlbnZpcm9ubWVudEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3RvcnxOZ01vZHVsZVJlZjxhbnk+fHVuZGVmaW5lZCk6IENvbXBvbmVudFJlZjxDPjtcbiAgb3ZlcnJpZGUgY3JlYXRlQ29tcG9uZW50PEM+KFxuICAgICAgY29tcG9uZW50RmFjdG9yeU9yVHlwZTogQ29tcG9uZW50RmFjdG9yeTxDPnxUeXBlPEM+LCBpbmRleE9yT3B0aW9ucz86IG51bWJlcnx1bmRlZmluZWR8e1xuICAgICAgICBpbmRleD86IG51bWJlcixcbiAgICAgICAgaW5qZWN0b3I/OiBJbmplY3RvcixcbiAgICAgICAgbmdNb2R1bGVSZWY/OiBOZ01vZHVsZVJlZjx1bmtub3duPixcbiAgICAgICAgZW52aXJvbm1lbnRJbmplY3Rvcj86IEVudmlyb25tZW50SW5qZWN0b3J8TmdNb2R1bGVSZWY8dW5rbm93bj4sXG4gICAgICAgIHByb2plY3RhYmxlTm9kZXM/OiBOb2RlW11bXSxcbiAgICAgIH0sXG4gICAgICBpbmplY3Rvcj86IEluamVjdG9yfHVuZGVmaW5lZCwgcHJvamVjdGFibGVOb2Rlcz86IGFueVtdW118dW5kZWZpbmVkLFxuICAgICAgZW52aXJvbm1lbnRJbmplY3Rvcj86IEVudmlyb25tZW50SW5qZWN0b3J8TmdNb2R1bGVSZWY8YW55Pnx1bmRlZmluZWQpOiBDb21wb25lbnRSZWY8Qz4ge1xuICAgIGNvbnN0IGlzQ29tcG9uZW50RmFjdG9yeSA9IGNvbXBvbmVudEZhY3RvcnlPclR5cGUgJiYgIWlzVHlwZShjb21wb25lbnRGYWN0b3J5T3JUeXBlKTtcbiAgICBsZXQgaW5kZXg6IG51bWJlcnx1bmRlZmluZWQ7XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIHN1cHBvcnRzIDIgc2lnbmF0dXJlcyBhbmQgd2UgbmVlZCB0byBoYW5kbGUgb3B0aW9ucyBjb3JyZWN0bHkgZm9yIGJvdGg6XG4gICAgLy8gICAxLiBXaGVuIGZpcnN0IGFyZ3VtZW50IGlzIGEgQ29tcG9uZW50IHR5cGUuIFRoaXMgc2lnbmF0dXJlIGFsc28gcmVxdWlyZXMgZXh0cmFcbiAgICAvLyAgICAgIG9wdGlvbnMgdG8gYmUgcHJvdmlkZWQgYXMgYXMgb2JqZWN0IChtb3JlIGVyZ29ub21pYyBvcHRpb24pLlxuICAgIC8vICAgMi4gRmlyc3QgYXJndW1lbnQgaXMgYSBDb21wb25lbnQgZmFjdG9yeS4gSW4gdGhpcyBjYXNlIGV4dHJhIG9wdGlvbnMgYXJlIHJlcHJlc2VudGVkIGFzXG4gICAgLy8gICAgICBwb3NpdGlvbmFsIGFyZ3VtZW50cy4gVGhpcyBzaWduYXR1cmUgaXMgbGVzcyBlcmdvbm9taWMgYW5kIHdpbGwgYmUgZGVwcmVjYXRlZC5cbiAgICBpZiAoaXNDb21wb25lbnRGYWN0b3J5KSB7XG4gICAgICBpZiAobmdEZXZNb2RlKSB7XG4gICAgICAgIGFzc2VydEVxdWFsKFxuICAgICAgICAgICAgdHlwZW9mIGluZGV4T3JPcHRpb25zICE9PSAnb2JqZWN0JywgdHJ1ZSxcbiAgICAgICAgICAgICdJdCBsb29rcyBsaWtlIENvbXBvbmVudCBmYWN0b3J5IHdhcyBwcm92aWRlZCBhcyB0aGUgZmlyc3QgYXJndW1lbnQgJyArXG4gICAgICAgICAgICAgICAgJ2FuZCBhbiBvcHRpb25zIG9iamVjdCBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50LiBUaGlzIGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyAnICtcbiAgICAgICAgICAgICAgICAnaXMgaW5jb21wYXRpYmxlLiBZb3UgY2FuIGVpdGhlciBjaGFuZ2UgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHByb3ZpZGUgQ29tcG9uZW50ICcgK1xuICAgICAgICAgICAgICAgICd0eXBlIG9yIGNoYW5nZSB0aGUgc2Vjb25kIGFyZ3VtZW50IHRvIGJlIGEgbnVtYmVyIChyZXByZXNlbnRpbmcgYW4gaW5kZXggYXQgJyArXG4gICAgICAgICAgICAgICAgJ3doaWNoIHRvIGluc2VydCB0aGUgbmV3IGNvbXBvbmVudFxcJ3MgaG9zdCB2aWV3IGludG8gdGhpcyBjb250YWluZXIpJyk7XG4gICAgICB9XG4gICAgICBpbmRleCA9IGluZGV4T3JPcHRpb25zIGFzIG51bWJlciB8IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG5nRGV2TW9kZSkge1xuICAgICAgICBhc3NlcnREZWZpbmVkKFxuICAgICAgICAgICAgZ2V0Q29tcG9uZW50RGVmKGNvbXBvbmVudEZhY3RvcnlPclR5cGUpLFxuICAgICAgICAgICAgYFByb3ZpZGVkIENvbXBvbmVudCBjbGFzcyBkb2Vzbid0IGNvbnRhaW4gQ29tcG9uZW50IGRlZmluaXRpb24uIGAgK1xuICAgICAgICAgICAgICAgIGBQbGVhc2UgY2hlY2sgd2hldGhlciBwcm92aWRlZCBjbGFzcyBoYXMgQENvbXBvbmVudCBkZWNvcmF0b3IuYCk7XG4gICAgICAgIGFzc2VydEVxdWFsKFxuICAgICAgICAgICAgdHlwZW9mIGluZGV4T3JPcHRpb25zICE9PSAnbnVtYmVyJywgdHJ1ZSxcbiAgICAgICAgICAgICdJdCBsb29rcyBsaWtlIENvbXBvbmVudCB0eXBlIHdhcyBwcm92aWRlZCBhcyB0aGUgZmlyc3QgYXJndW1lbnQgJyArXG4gICAgICAgICAgICAgICAgJ2FuZCBhIG51bWJlciAocmVwcmVzZW50aW5nIGFuIGluZGV4IGF0IHdoaWNoIHRvIGluc2VydCB0aGUgbmV3IGNvbXBvbmVudFxcJ3MgJyArXG4gICAgICAgICAgICAgICAgJ2hvc3QgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyIGFzIHRoZSBzZWNvbmQgYXJndW1lbnQuIFRoaXMgY29tYmluYXRpb24gb2YgYXJndW1lbnRzICcgK1xuICAgICAgICAgICAgICAgICdpcyBpbmNvbXBhdGlibGUuIFBsZWFzZSB1c2UgYW4gb2JqZWN0IGFzIHRoZSBzZWNvbmQgYXJndW1lbnQgaW5zdGVhZC4nKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG9wdGlvbnMgPSAoaW5kZXhPck9wdGlvbnMgfHwge30pIGFzIHtcbiAgICAgICAgaW5kZXg/OiBudW1iZXIsXG4gICAgICAgIGluamVjdG9yPzogSW5qZWN0b3IsXG4gICAgICAgIG5nTW9kdWxlUmVmPzogTmdNb2R1bGVSZWY8dW5rbm93bj4sXG4gICAgICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yIHwgTmdNb2R1bGVSZWY8dW5rbm93bj4sXG4gICAgICAgIHByb2plY3RhYmxlTm9kZXM/OiBOb2RlW11bXSxcbiAgICAgIH07XG4gICAgICBpZiAobmdEZXZNb2RlICYmIG9wdGlvbnMuZW52aXJvbm1lbnRJbmplY3RvciAmJiBvcHRpb25zLm5nTW9kdWxlUmVmKSB7XG4gICAgICAgIHRocm93RXJyb3IoXG4gICAgICAgICAgICBgQ2Fubm90IHBhc3MgYm90aCBlbnZpcm9ubWVudEluamVjdG9yIGFuZCBuZ01vZHVsZVJlZiBvcHRpb25zIHRvIGNyZWF0ZUNvbXBvbmVudCgpLmApO1xuICAgICAgfVxuICAgICAgaW5kZXggPSBvcHRpb25zLmluZGV4O1xuICAgICAgaW5qZWN0b3IgPSBvcHRpb25zLmluamVjdG9yO1xuICAgICAgcHJvamVjdGFibGVOb2RlcyA9IG9wdGlvbnMucHJvamVjdGFibGVOb2RlcztcbiAgICAgIGVudmlyb25tZW50SW5qZWN0b3IgPSBvcHRpb25zLmVudmlyb25tZW50SW5qZWN0b3IgfHwgb3B0aW9ucy5uZ01vZHVsZVJlZjtcbiAgICB9XG5cbiAgICBjb25zdCBjb21wb25lbnRGYWN0b3J5OiBDb21wb25lbnRGYWN0b3J5PEM+ID0gaXNDb21wb25lbnRGYWN0b3J5ID9cbiAgICAgICAgY29tcG9uZW50RmFjdG9yeU9yVHlwZSBhcyBDb21wb25lbnRGYWN0b3J5PEM+OlxuICAgICAgICBuZXcgUjNDb21wb25lbnRGYWN0b3J5KGdldENvbXBvbmVudERlZihjb21wb25lbnRGYWN0b3J5T3JUeXBlKSEpO1xuICAgIGNvbnN0IGNvbnRleHRJbmplY3RvciA9IGluamVjdG9yIHx8IHRoaXMucGFyZW50SW5qZWN0b3I7XG5cbiAgICAvLyBJZiBhbiBgTmdNb2R1bGVSZWZgIGlzIG5vdCBwcm92aWRlZCBleHBsaWNpdGx5LCB0cnkgcmV0cmlldmluZyBpdCBmcm9tIHRoZSBESSB0cmVlLlxuICAgIGlmICghZW52aXJvbm1lbnRJbmplY3RvciAmJiAoY29tcG9uZW50RmFjdG9yeSBhcyBhbnkpLm5nTW9kdWxlID09IG51bGwpIHtcbiAgICAgIC8vIEZvciB0aGUgYENvbXBvbmVudEZhY3RvcnlgIGNhc2UsIGVudGVyaW5nIHRoaXMgbG9naWMgaXMgdmVyeSB1bmxpa2VseSwgc2luY2Ugd2UgZXhwZWN0IHRoYXRcbiAgICAgIC8vIGFuIGluc3RhbmNlIG9mIGEgYENvbXBvbmVudEZhY3RvcnlgLCByZXNvbHZlZCB2aWEgYENvbXBvbmVudEZhY3RvcnlSZXNvbHZlcmAgd291bGQgaGF2ZSBhblxuICAgICAgLy8gYG5nTW9kdWxlYCBmaWVsZC4gVGhpcyBpcyBwb3NzaWJsZSBpbiBzb21lIHRlc3Qgc2NlbmFyaW9zIGFuZCBwb3RlbnRpYWxseSBpbiBzb21lIEpJVC1iYXNlZFxuICAgICAgLy8gdXNlLWNhc2VzLiBGb3IgdGhlIGBDb21wb25lbnRGYWN0b3J5YCBjYXNlIHdlIHByZXNlcnZlIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IGFuZCB0cnlcbiAgICAgIC8vIHVzaW5nIGEgcHJvdmlkZWQgaW5qZWN0b3IgZmlyc3QsIHRoZW4gZmFsbCBiYWNrIHRvIHRoZSBwYXJlbnQgaW5qZWN0b3Igb2YgdGhpc1xuICAgICAgLy8gYFZpZXdDb250YWluZXJSZWZgIGluc3RhbmNlLlxuICAgICAgLy9cbiAgICAgIC8vIEZvciB0aGUgZmFjdG9yeS1sZXNzIGNhc2UsIGl0J3MgY3JpdGljYWwgdG8gZXN0YWJsaXNoIGEgY29ubmVjdGlvbiB3aXRoIHRoZSBtb2R1bGVcbiAgICAgIC8vIGluamVjdG9yIHRyZWUgKGJ5IHJldHJpZXZpbmcgYW4gaW5zdGFuY2Ugb2YgYW4gYE5nTW9kdWxlUmVmYCBhbmQgYWNjZXNzaW5nIGl0cyBpbmplY3RvciksXG4gICAgICAvLyBzbyB0aGF0IGEgY29tcG9uZW50IGNhbiB1c2UgREkgdG9rZW5zIHByb3ZpZGVkIGluIE1nTW9kdWxlcy4gRm9yIHRoaXMgcmVhc29uLCB3ZSBjYW4gbm90XG4gICAgICAvLyByZWx5IG9uIHRoZSBwcm92aWRlZCBpbmplY3Rvciwgc2luY2UgaXQgbWlnaHQgYmUgZGV0YWNoZWQgZnJvbSB0aGUgREkgdHJlZSAoZm9yIGV4YW1wbGUsIGlmXG4gICAgICAvLyBpdCB3YXMgY3JlYXRlZCB2aWEgYEluamVjdG9yLmNyZWF0ZWAgd2l0aG91dCBzcGVjaWZ5aW5nIGEgcGFyZW50IGluamVjdG9yLCBvciBpZiBhblxuICAgICAgLy8gaW5qZWN0b3IgaXMgcmV0cmlldmVkIGZyb20gYW4gYE5nTW9kdWxlUmVmYCBjcmVhdGVkIHZpYSBgY3JlYXRlTmdNb2R1bGVgIHVzaW5nIGFuXG4gICAgICAvLyBOZ01vZHVsZSBvdXRzaWRlIG9mIGEgbW9kdWxlIHRyZWUpLiBJbnN0ZWFkLCB3ZSBhbHdheXMgdXNlIGBWaWV3Q29udGFpbmVyUmVmYCdzIHBhcmVudFxuICAgICAgLy8gaW5qZWN0b3IsIHdoaWNoIGlzIG5vcm1hbGx5IGNvbm5lY3RlZCB0byB0aGUgREkgdHJlZSwgd2hpY2ggaW5jbHVkZXMgbW9kdWxlIGluamVjdG9yXG4gICAgICAvLyBzdWJ0cmVlLlxuICAgICAgY29uc3QgX2luamVjdG9yID0gaXNDb21wb25lbnRGYWN0b3J5ID8gY29udGV4dEluamVjdG9yIDogdGhpcy5wYXJlbnRJbmplY3RvcjtcblxuICAgICAgLy8gRE8gTk9UIFJFRkFDVE9SLiBUaGUgY29kZSBoZXJlIHVzZWQgdG8gaGF2ZSBhIGBpbmplY3Rvci5nZXQoTmdNb2R1bGVSZWYsIG51bGwpIHx8XG4gICAgICAvLyB1bmRlZmluZWRgIGV4cHJlc3Npb24gd2hpY2ggc2VlbXMgdG8gY2F1c2UgaW50ZXJuYWwgZ29vZ2xlIGFwcHMgdG8gZmFpbC4gVGhpcyBpcyBkb2N1bWVudGVkXG4gICAgICAvLyBpbiB0aGUgZm9sbG93aW5nIGludGVybmFsIGJ1ZyBpc3N1ZTogZ28vYi8xNDI5Njc4MDJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IF9pbmplY3Rvci5nZXQoRW52aXJvbm1lbnRJbmplY3RvciwgbnVsbCk7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIGVudmlyb25tZW50SW5qZWN0b3IgPSByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETzogdGhpcyBpcyBub3QgY29ycmVjdCBmb3Igc2VsZWN0b3JzIGxpa2UgYGFwcFtwYXJhbV1gLFxuICAgIC8vIHdlIG5lZWQgdG8gcmVseSBvbiBzb21lIG90aGVyIGluZm8gKGxpa2UgY29tcG9uZW50IGlkKSxcbiAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9wdWxsLzQ4MjUzLlxuICAgIGNvbnN0IGNvbXBvbmVudERlZiA9IGdldENvbXBvbmVudERlZihjb21wb25lbnRGYWN0b3J5LmNvbXBvbmVudFR5cGUpITtcbiAgICBjb25zdCBkZWh5ZHJhdGVkVmlldyA9IGZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3KHRoaXMuX2xDb250YWluZXIsIGNvbXBvbmVudERlZi5pZCk7XG4gICAgbGV0IHJOb2RlO1xuICAgIGxldCBoeWRyYXRpb25JbmZvOiBOZ2hEb218bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoZGVoeWRyYXRlZFZpZXcpIHtcbiAgICAgIC8vIFBvaW50ZXIgdG8gYSBob3N0IERPTSBlbGVtZW50LlxuICAgICAgck5vZGUgPSBkZWh5ZHJhdGVkVmlldy5maXJzdENoaWxkO1xuXG4gICAgICAvLyBSZWFkIGh5ZHJhdGlvbiBpbmZvIGFuZCBwYXNzIGl0IG92ZXIgdG8gdGhlIGNvbXBvbmVudCB2aWV3LlxuICAgICAgaHlkcmF0aW9uSW5mbyA9IHJldHJpZXZlTmdoSW5mbyhyTm9kZSBhcyBSRWxlbWVudCk7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcG9uZW50UmVmID0gY29tcG9uZW50RmFjdG9yeS5jcmVhdGVJbXBsKFxuICAgICAgICBjb250ZXh0SW5qZWN0b3IsIHByb2plY3RhYmxlTm9kZXMsIHJOb2RlLCBlbnZpcm9ubWVudEluamVjdG9yLCBoeWRyYXRpb25JbmZvKTtcbiAgICB0aGlzLmluc2VydEltcGwoY29tcG9uZW50UmVmLmhvc3RWaWV3LCBpbmRleCwgISFoeWRyYXRpb25JbmZvKTtcbiAgICByZXR1cm4gY29tcG9uZW50UmVmO1xuICB9XG5cbiAgb3ZlcnJpZGUgaW5zZXJ0KHZpZXdSZWY6IFZpZXdSZWYsIGluZGV4PzogbnVtYmVyKTogVmlld1JlZiB7XG4gICAgcmV0dXJuIHRoaXMuaW5zZXJ0SW1wbCh2aWV3UmVmLCBpbmRleCwgZmFsc2UpO1xuICB9XG5cbiAgcHJpdmF0ZSBpbnNlcnRJbXBsKHZpZXdSZWY6IFZpZXdSZWYsIGluZGV4PzogbnVtYmVyLCBwcmV2ZW50RE9NSW5zZXJ0aW9uPzogYm9vbGVhbik6IFZpZXdSZWYge1xuICAgIGNvbnN0IGxWaWV3ID0gKHZpZXdSZWYgYXMgUjNWaWV3UmVmPGFueT4pLl9sVmlldyE7XG4gICAgY29uc3QgdFZpZXcgPSBsVmlld1tUVklFV107XG5cbiAgICBpZiAobmdEZXZNb2RlICYmIHZpZXdSZWYuZGVzdHJveWVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBpbnNlcnQgYSBkZXN0cm95ZWQgVmlldyBpbiBhIFZpZXdDb250YWluZXIhJyk7XG4gICAgfVxuXG4gICAgaWYgKHZpZXdBdHRhY2hlZFRvQ29udGFpbmVyKGxWaWV3KSkge1xuICAgICAgLy8gSWYgdmlldyBpcyBhbHJlYWR5IGF0dGFjaGVkLCBkZXRhY2ggaXQgZmlyc3Qgc28gd2UgY2xlYW4gdXAgcmVmZXJlbmNlcyBhcHByb3ByaWF0ZWx5LlxuXG4gICAgICBjb25zdCBwcmV2SWR4ID0gdGhpcy5pbmRleE9mKHZpZXdSZWYpO1xuXG4gICAgICAvLyBBIHZpZXcgbWlnaHQgYmUgYXR0YWNoZWQgZWl0aGVyIHRvIHRoaXMgb3IgYSBkaWZmZXJlbnQgY29udGFpbmVyLiBUaGUgYHByZXZJZHhgIGZvclxuICAgICAgLy8gdGhvc2UgY2FzZXMgd2lsbCBiZTpcbiAgICAgIC8vIGVxdWFsIHRvIC0xIGZvciB2aWV3cyBhdHRhY2hlZCB0byB0aGlzIFZpZXdDb250YWluZXJSZWZcbiAgICAgIC8vID49IDAgZm9yIHZpZXdzIGF0dGFjaGVkIHRvIGEgZGlmZmVyZW50IFZpZXdDb250YWluZXJSZWZcbiAgICAgIGlmIChwcmV2SWR4ICE9PSAtMSkge1xuICAgICAgICB0aGlzLmRldGFjaChwcmV2SWR4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHByZXZMQ29udGFpbmVyID0gbFZpZXdbUEFSRU5UXSBhcyBMQ29udGFpbmVyO1xuICAgICAgICBuZ0Rldk1vZGUgJiZcbiAgICAgICAgICAgIGFzc2VydEVxdWFsKFxuICAgICAgICAgICAgICAgIGlzTENvbnRhaW5lcihwcmV2TENvbnRhaW5lciksIHRydWUsXG4gICAgICAgICAgICAgICAgJ0FuIGF0dGFjaGVkIHZpZXcgc2hvdWxkIGhhdmUgaXRzIFBBUkVOVCBwb2ludCB0byBhIGNvbnRhaW5lci4nKTtcblxuXG4gICAgICAgIC8vIFdlIG5lZWQgdG8gcmUtY3JlYXRlIGEgUjNWaWV3Q29udGFpbmVyUmVmIGluc3RhbmNlIHNpbmNlIHRob3NlIGFyZSBub3Qgc3RvcmVkIG9uXG4gICAgICAgIC8vIExWaWV3IChub3IgYW55d2hlcmUgZWxzZSkuXG4gICAgICAgIGNvbnN0IHByZXZWQ1JlZiA9IG5ldyBSM1ZpZXdDb250YWluZXJSZWYoXG4gICAgICAgICAgICBwcmV2TENvbnRhaW5lciwgcHJldkxDb250YWluZXJbVF9IT1NUXSBhcyBURGlyZWN0aXZlSG9zdE5vZGUsIHByZXZMQ29udGFpbmVyW1BBUkVOVF0pO1xuXG4gICAgICAgIHByZXZWQ1JlZi5kZXRhY2gocHJldlZDUmVmLmluZGV4T2Yodmlld1JlZikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIExvZ2ljYWwgb3BlcmF0aW9uIG9mIGFkZGluZyBgTFZpZXdgIHRvIGBMQ29udGFpbmVyYFxuICAgIGNvbnN0IGFkanVzdGVkSWR4ID0gdGhpcy5fYWRqdXN0SW5kZXgoaW5kZXgpO1xuICAgIGNvbnN0IGxDb250YWluZXIgPSB0aGlzLl9sQ29udGFpbmVyO1xuICAgIGluc2VydFZpZXcodFZpZXcsIGxWaWV3LCBsQ29udGFpbmVyLCBhZGp1c3RlZElkeCk7XG5cbiAgICAvLyBQaHlzaWNhbCBvcGVyYXRpb24gb2YgYWRkaW5nIHRoZSBET00gbm9kZXMuXG4gICAgaWYgKCFwcmV2ZW50RE9NSW5zZXJ0aW9uKSB7XG4gICAgICBjb25zdCBiZWZvcmVOb2RlID0gZ2V0QmVmb3JlTm9kZUZvclZpZXcoYWRqdXN0ZWRJZHgsIGxDb250YWluZXIpO1xuICAgICAgY29uc3QgcmVuZGVyZXIgPSBsVmlld1tSRU5ERVJFUl07XG4gICAgICBjb25zdCBwYXJlbnRSTm9kZSA9IG5hdGl2ZVBhcmVudE5vZGUocmVuZGVyZXIsIGxDb250YWluZXJbTkFUSVZFXSBhcyBSRWxlbWVudCB8IFJDb21tZW50KTtcbiAgICAgIGlmIChwYXJlbnRSTm9kZSAhPT0gbnVsbCkge1xuICAgICAgICBhZGRWaWV3VG9Db250YWluZXIodFZpZXcsIGxDb250YWluZXJbVF9IT1NUXSwgcmVuZGVyZXIsIGxWaWV3LCBwYXJlbnRSTm9kZSwgYmVmb3JlTm9kZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgKHZpZXdSZWYgYXMgUjNWaWV3UmVmPGFueT4pLmF0dGFjaFRvVmlld0NvbnRhaW5lclJlZigpO1xuICAgIGFkZFRvQXJyYXkoZ2V0T3JDcmVhdGVWaWV3UmVmcyhsQ29udGFpbmVyKSwgYWRqdXN0ZWRJZHgsIHZpZXdSZWYpO1xuXG4gICAgcmV0dXJuIHZpZXdSZWY7XG4gIH1cblxuICBvdmVycmlkZSBtb3ZlKHZpZXdSZWY6IFZpZXdSZWYsIG5ld0luZGV4OiBudW1iZXIpOiBWaWV3UmVmIHtcbiAgICBpZiAobmdEZXZNb2RlICYmIHZpZXdSZWYuZGVzdHJveWVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBtb3ZlIGEgZGVzdHJveWVkIFZpZXcgaW4gYSBWaWV3Q29udGFpbmVyIScpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5pbnNlcnQodmlld1JlZiwgbmV3SW5kZXgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgaW5kZXhPZih2aWV3UmVmOiBWaWV3UmVmKTogbnVtYmVyIHtcbiAgICBjb25zdCB2aWV3UmVmc0FyciA9IGdldFZpZXdSZWZzKHRoaXMuX2xDb250YWluZXIpO1xuICAgIHJldHVybiB2aWV3UmVmc0FyciAhPT0gbnVsbCA/IHZpZXdSZWZzQXJyLmluZGV4T2Yodmlld1JlZikgOiAtMTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlbW92ZShpbmRleD86IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IGFkanVzdGVkSWR4ID0gdGhpcy5fYWRqdXN0SW5kZXgoaW5kZXgsIC0xKTtcbiAgICBjb25zdCBkZXRhY2hlZFZpZXcgPSBkZXRhY2hWaWV3KHRoaXMuX2xDb250YWluZXIsIGFkanVzdGVkSWR4KTtcblxuICAgIGlmIChkZXRhY2hlZFZpZXcpIHtcbiAgICAgIC8vIEJlZm9yZSBkZXN0cm95aW5nIHRoZSB2aWV3LCByZW1vdmUgaXQgZnJvbSB0aGUgY29udGFpbmVyJ3MgYXJyYXkgb2YgYFZpZXdSZWZgcy5cbiAgICAgIC8vIFRoaXMgZW5zdXJlcyB0aGUgdmlldyBjb250YWluZXIgbGVuZ3RoIGlzIHVwZGF0ZWQgYmVmb3JlIGNhbGxpbmdcbiAgICAgIC8vIGBkZXN0cm95TFZpZXdgLCB3aGljaCBjb3VsZCByZWN1cnNpdmVseSBjYWxsIHZpZXcgY29udGFpbmVyIG1ldGhvZHMgdGhhdFxuICAgICAgLy8gcmVseSBvbiBhbiBhY2N1cmF0ZSBjb250YWluZXIgbGVuZ3RoLlxuICAgICAgLy8gKGUuZy4gYSBtZXRob2Qgb24gdGhpcyB2aWV3IGNvbnRhaW5lciBiZWluZyBjYWxsZWQgYnkgYSBjaGlsZCBkaXJlY3RpdmUncyBPbkRlc3Ryb3lcbiAgICAgIC8vIGxpZmVjeWNsZSBob29rKVxuICAgICAgcmVtb3ZlRnJvbUFycmF5KGdldE9yQ3JlYXRlVmlld1JlZnModGhpcy5fbENvbnRhaW5lciksIGFkanVzdGVkSWR4KTtcbiAgICAgIGRlc3Ryb3lMVmlldyhkZXRhY2hlZFZpZXdbVFZJRVddLCBkZXRhY2hlZFZpZXcpO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGRldGFjaChpbmRleD86IG51bWJlcik6IFZpZXdSZWZ8bnVsbCB7XG4gICAgY29uc3QgYWRqdXN0ZWRJZHggPSB0aGlzLl9hZGp1c3RJbmRleChpbmRleCwgLTEpO1xuICAgIGNvbnN0IHZpZXcgPSBkZXRhY2hWaWV3KHRoaXMuX2xDb250YWluZXIsIGFkanVzdGVkSWR4KTtcblxuICAgIGNvbnN0IHdhc0RldGFjaGVkID1cbiAgICAgICAgdmlldyAmJiByZW1vdmVGcm9tQXJyYXkoZ2V0T3JDcmVhdGVWaWV3UmVmcyh0aGlzLl9sQ29udGFpbmVyKSwgYWRqdXN0ZWRJZHgpICE9IG51bGw7XG4gICAgcmV0dXJuIHdhc0RldGFjaGVkID8gbmV3IFIzVmlld1JlZih2aWV3ISkgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWRqdXN0SW5kZXgoaW5kZXg/OiBudW1iZXIsIHNoaWZ0OiBudW1iZXIgPSAwKSB7XG4gICAgaWYgKGluZGV4ID09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLmxlbmd0aCArIHNoaWZ0O1xuICAgIH1cbiAgICBpZiAobmdEZXZNb2RlKSB7XG4gICAgICBhc3NlcnRHcmVhdGVyVGhhbihpbmRleCwgLTEsIGBWaWV3UmVmIGluZGV4IG11c3QgYmUgcG9zaXRpdmUsIGdvdCAke2luZGV4fWApO1xuICAgICAgLy8gKzEgYmVjYXVzZSBpdCdzIGxlZ2FsIHRvIGluc2VydCBhdCB0aGUgZW5kLlxuICAgICAgYXNzZXJ0TGVzc1RoYW4oaW5kZXgsIHRoaXMubGVuZ3RoICsgMSArIHNoaWZ0LCAnaW5kZXgnKTtcbiAgICB9XG4gICAgcmV0dXJuIGluZGV4O1xuICB9XG59O1xuXG5mdW5jdGlvbiBnZXRWaWV3UmVmcyhsQ29udGFpbmVyOiBMQ29udGFpbmVyKTogVmlld1JlZltdfG51bGwge1xuICByZXR1cm4gbENvbnRhaW5lcltWSUVXX1JFRlNdIGFzIFZpZXdSZWZbXTtcbn1cblxuZnVuY3Rpb24gZ2V0T3JDcmVhdGVWaWV3UmVmcyhsQ29udGFpbmVyOiBMQ29udGFpbmVyKTogVmlld1JlZltdIHtcbiAgcmV0dXJuIChsQ29udGFpbmVyW1ZJRVdfUkVGU10gfHwgKGxDb250YWluZXJbVklFV19SRUZTXSA9IFtdKSkgYXMgVmlld1JlZltdO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBWaWV3Q29udGFpbmVyUmVmIGFuZCBzdG9yZXMgaXQgb24gdGhlIGluamVjdG9yLlxuICpcbiAqIEBwYXJhbSBWaWV3Q29udGFpbmVyUmVmVG9rZW4gVGhlIFZpZXdDb250YWluZXJSZWYgdHlwZVxuICogQHBhcmFtIEVsZW1lbnRSZWZUb2tlbiBUaGUgRWxlbWVudFJlZiB0eXBlXG4gKiBAcGFyYW0gaG9zdFROb2RlIFRoZSBub2RlIHRoYXQgaXMgcmVxdWVzdGluZyBhIFZpZXdDb250YWluZXJSZWZcbiAqIEBwYXJhbSBob3N0TFZpZXcgVGhlIHZpZXcgdG8gd2hpY2ggdGhlIG5vZGUgYmVsb25nc1xuICogQHJldHVybnMgVGhlIFZpZXdDb250YWluZXJSZWYgaW5zdGFuY2UgdG8gdXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb250YWluZXJSZWYoXG4gICAgaG9zdFROb2RlOiBURWxlbWVudE5vZGV8VENvbnRhaW5lck5vZGV8VEVsZW1lbnRDb250YWluZXJOb2RlLFxuICAgIGhvc3RMVmlldzogTFZpZXcpOiBWaWV3Q29udGFpbmVyUmVmIHtcbiAgbmdEZXZNb2RlICYmIGFzc2VydFROb2RlVHlwZShob3N0VE5vZGUsIFROb2RlVHlwZS5BbnlDb250YWluZXIgfCBUTm9kZVR5cGUuQW55Uk5vZGUpO1xuXG4gIGxldCBsQ29udGFpbmVyOiBMQ29udGFpbmVyO1xuICBjb25zdCBzbG90VmFsdWUgPSBob3N0TFZpZXdbaG9zdFROb2RlLmluZGV4XTtcbiAgaWYgKGlzTENvbnRhaW5lcihzbG90VmFsdWUpKSB7XG4gICAgLy8gSWYgdGhlIGhvc3QgaXMgYSBjb250YWluZXIsIHdlIGRvbid0IG5lZWQgdG8gY3JlYXRlIGEgbmV3IExDb250YWluZXJcbiAgICBsQ29udGFpbmVyID0gc2xvdFZhbHVlO1xuICB9IGVsc2Uge1xuICAgIGxDb250YWluZXIgPSBfbG9jYXRlT3JDcmVhdGVDb250YWluZXJSZWZJbXBsKGhvc3RMVmlldywgaG9zdFROb2RlLCBzbG90VmFsdWUpO1xuICAgIGhvc3RMVmlld1tob3N0VE5vZGUuaW5kZXhdID0gbENvbnRhaW5lcjtcbiAgICBhZGRUb1ZpZXdUcmVlKGhvc3RMVmlldywgbENvbnRhaW5lcik7XG4gIH1cblxuICByZXR1cm4gbmV3IFIzVmlld0NvbnRhaW5lclJlZihsQ29udGFpbmVyLCBob3N0VE5vZGUsIGhvc3RMVmlldyk7XG59XG5cbmZ1bmN0aW9uIGluc2VydEFuY2hvck5vZGUoaG9zdExWaWV3OiBMVmlldywgaG9zdFROb2RlOiBUTm9kZSk6IFJDb21tZW50IHtcbiAgLy8gSWYgdGhlIGhvc3QgaXMgYSByZWd1bGFyIGVsZW1lbnQsIHdlIGhhdmUgdG8gaW5zZXJ0IGEgY29tbWVudCBub2RlIG1hbnVhbGx5IHdoaWNoIHdpbGxcbiAgLy8gYmUgdXNlZCBhcyBhbiBhbmNob3Igd2hlbiBpbnNlcnRpbmcgZWxlbWVudHMuIEluIHRoaXMgc3BlY2lmaWMgY2FzZSB3ZSB1c2UgbG93LWxldmVsIERPTVxuICAvLyBtYW5pcHVsYXRpb24gdG8gaW5zZXJ0IGl0LlxuICBjb25zdCByZW5kZXJlciA9IGhvc3RMVmlld1tSRU5ERVJFUl07XG4gIG5nRGV2TW9kZSAmJiBuZ0Rldk1vZGUucmVuZGVyZXJDcmVhdGVDb21tZW50Kys7XG4gIGNvbnN0IGNvbW1lbnROb2RlID0gcmVuZGVyZXIuY3JlYXRlQ29tbWVudChuZ0Rldk1vZGUgPyAnY29udGFpbmVyJyA6ICcnKTtcblxuICBjb25zdCBob3N0TmF0aXZlID0gZ2V0TmF0aXZlQnlUTm9kZShob3N0VE5vZGUsIGhvc3RMVmlldykhO1xuICBjb25zdCBwYXJlbnRPZkhvc3ROYXRpdmUgPSBuYXRpdmVQYXJlbnROb2RlKHJlbmRlcmVyLCBob3N0TmF0aXZlKTtcbiAgbmF0aXZlSW5zZXJ0QmVmb3JlKFxuICAgICAgcmVuZGVyZXIsIHBhcmVudE9mSG9zdE5hdGl2ZSEsIGNvbW1lbnROb2RlLCBuYXRpdmVOZXh0U2libGluZyhyZW5kZXJlciwgaG9zdE5hdGl2ZSksIGZhbHNlKTtcbiAgcmV0dXJuIGNvbW1lbnROb2RlO1xufVxuXG4vKipcbiAqIFJlZmVyZW5jZSB0byB0aGUgY3VycmVudCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgY3JlYXRlIGNvbnRhaW5lciByZWYgZnVuY3Rpb24uXG4gKiBJZiBoeWRyYXRpb24gaXMgZW5hYmxlZCwgdGhpcyBpbXBsZW1lbnRhdGlvbiBpcyBzd2FwcGVkIHdpdGggYSB2ZXJzaW9uIHRoYXRcbiAqIHBlcmZvcm1zIGxvb2t1cHMgaW4gbGl2ZSBET00uXG4gKi9cbmxldCBfbG9jYXRlT3JDcmVhdGVDb250YWluZXJSZWZJbXBsID0gKGhvc3RMVmlldzogTFZpZXcsIGhvc3RUTm9kZTogVE5vZGUsIHNsb3RWYWx1ZTogYW55KSA9PiB7XG4gIGxldCBjb21tZW50Tm9kZTogUkNvbW1lbnQ7XG4gIC8vIElmIHRoZSBob3N0IGlzIGFuIGVsZW1lbnQgY29udGFpbmVyLCB0aGUgbmF0aXZlIGhvc3QgZWxlbWVudCBpcyBndWFyYW50ZWVkIHRvIGJlIGFcbiAgLy8gY29tbWVudCBhbmQgd2UgY2FuIHJldXNlIHRoYXQgY29tbWVudCBhcyBhbmNob3IgZWxlbWVudCBmb3IgdGhlIG5ldyBMQ29udGFpbmVyLlxuICAvLyBUaGUgY29tbWVudCBub2RlIGluIHF1ZXN0aW9uIGlzIGFscmVhZHkgcGFydCBvZiB0aGUgRE9NIHN0cnVjdHVyZSBzbyB3ZSBkb24ndCBuZWVkIHRvIGFwcGVuZFxuICAvLyBpdCBhZ2Fpbi5cbiAgaWYgKGhvc3RUTm9kZS50eXBlICYgVE5vZGVUeXBlLkVsZW1lbnRDb250YWluZXIpIHtcbiAgICBjb21tZW50Tm9kZSA9IHVud3JhcFJOb2RlKHNsb3RWYWx1ZSkgYXMgUkNvbW1lbnQ7XG4gIH0gZWxzZSB7XG4gICAgY29tbWVudE5vZGUgPSBpbnNlcnRBbmNob3JOb2RlKGhvc3RMVmlldywgaG9zdFROb2RlKTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVMQ29udGFpbmVyKHNsb3RWYWx1ZSwgaG9zdExWaWV3LCBjb21tZW50Tm9kZSwgaG9zdFROb2RlKTtcbn07XG5cbmZ1bmN0aW9uIGxvY2F0ZU9yQ3JlYXRlQ29udGFpbmVyUmVmSW1wbChcbiAgICBob3N0TFZpZXc6IExWaWV3LCBob3N0VE5vZGU6IFROb2RlLCBzbG90VmFsdWU6IGFueSk6IExDb250YWluZXIge1xuICBsZXQgbmdoQ29udGFpbmVyOiBOZ2hDb250YWluZXI7XG4gIGxldCBkZWh5ZHJhdGVkVmlld3M6IE5naFZpZXdbXSA9IFtdO1xuICBjb25zdCBuZ2ggPSBob3N0TFZpZXdbSFlEUkFUSU9OX0lORk9dO1xuICBjb25zdCBpc0NyZWF0aW5nID0gIW5naCB8fCBpc0luU2tpcEh5ZHJhdGlvbkJsb2NrKGhvc3RUTm9kZSwgaG9zdExWaWV3KSB8fFxuICAgICAgaXNOb2RlRGlzY29ubmVjdGVkKG5naCwgaG9zdFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVCk7XG4gIGlmICghaXNDcmVhdGluZykge1xuICAgIGNvbnN0IGluZGV4ID0gaG9zdFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgICBuZ2hDb250YWluZXIgPSBuZ2ghW0NPTlRBSU5FUlNdIVtpbmRleF07XG4gICAgbmdEZXZNb2RlICYmXG4gICAgICAgIGFzc2VydERlZmluZWQobmdoQ29udGFpbmVyLCAnVGhlcmUgaXMgbm8gaHlkcmF0aW9uIGluZm8gYXZhaWxhYmxlIGZvciB0aGlzIGNvbnRhaW5lcicpO1xuICB9XG5cbiAgbGV0IGNvbW1lbnROb2RlOiBSQ29tbWVudDtcbiAgLy8gSWYgdGhlIGhvc3QgaXMgYW4gZWxlbWVudCBjb250YWluZXIsIHRoZSBuYXRpdmUgaG9zdCBlbGVtZW50IGlzIGd1YXJhbnRlZWQgdG8gYmUgYVxuICAvLyBjb21tZW50IGFuZCB3ZSBjYW4gcmV1c2UgdGhhdCBjb21tZW50IGFzIGFuY2hvciBlbGVtZW50IGZvciB0aGUgbmV3IExDb250YWluZXIuXG4gIC8vIFRoZSBjb21tZW50IG5vZGUgaW4gcXVlc3Rpb24gaXMgYWxyZWFkeSBwYXJ0IG9mIHRoZSBET00gc3RydWN0dXJlIHNvIHdlIGRvbid0IG5lZWQgdG8gYXBwZW5kXG4gIC8vIGl0IGFnYWluLlxuICBpZiAoaG9zdFROb2RlLnR5cGUgJiBUTm9kZVR5cGUuRWxlbWVudENvbnRhaW5lcikge1xuICAgIGNvbW1lbnROb2RlID0gdW53cmFwUk5vZGUoc2xvdFZhbHVlKSBhcyBSQ29tbWVudDtcbiAgICBpZiAoIWlzQ3JlYXRpbmcgJiYgbmdoQ29udGFpbmVyISAmJiBBcnJheS5pc0FycmF5KG5naENvbnRhaW5lci5kZWh5ZHJhdGVkVmlld3MpKSB7XG4gICAgICAvLyBXaGVuIHdlIGNyZWF0ZSBhbiBMQ29udGFpbmVyIGJhc2VkIG9uIGA8bmctY29udGFpbmVyPmAsIHRoZSBjb250YWluZXJcbiAgICAgIC8vIGlzIGFscmVhZHkgcHJvY2Vzc2VkLCBpbmNsdWRpbmcgZGVoeWRyYXRlZCB2aWV3cyBpbmZvLiBSZXVzZSB0aGlzIGluZm9cbiAgICAgIC8vIGFuZCBlcmFzZSBpdCBpbiB0aGUgbmdoIGRhdGEgdG8gYXZvaWQgbWVtb3J5IGxlYWtzLlxuICAgICAgZGVoeWRyYXRlZFZpZXdzID0gbmdoQ29udGFpbmVyLmRlaHlkcmF0ZWRWaWV3cyE7XG4gICAgICBuZ2hDb250YWluZXIuZGVoeWRyYXRlZFZpZXdzID0gW107XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChpc0NyZWF0aW5nKSB7XG4gICAgICBjb21tZW50Tm9kZSA9IGluc2VydEFuY2hvck5vZGUoaG9zdExWaWV3LCBob3N0VE5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTdGFydCB3aXRoIGEgbm9kZSB0aGF0IGltbWVkaWF0ZWx5IGZvbGxvd3MgdGhlIERPTSBub2RlIGZvdW5kXG4gICAgICAvLyBpbiBhbiBMVmlldyBzbG90LiBUaGlzIG5vZGUgaXM6XG4gICAgICAvLyAtIGVpdGhlciBhbiBhbmNob3IgY29tbWVudCBub2RlIG9mIHRoaXMgY29udGFpbmVyIGlmIGl0J3MgZW1wdHlcbiAgICAgIC8vIC0gb3IgYSBmaXJzdCBlbGVtZW50IG9mIHRoZSBmaXJzdCB2aWV3IGluIHRoaXMgY29udGFpbmVyXG4gICAgICBsZXQgY3VycmVudFJOb2RlID0gKHVud3JhcFJOb2RlKHNsb3RWYWx1ZSkgYXMgUk5vZGUpLm5leHRTaWJsaW5nO1xuICAgICAgLy8gVE9ETzogQWRkIGFzc2VydCB0aGF0IHRoZSBjdXJyZW50Uk5vZGUgZXhpc3RzXG4gICAgICBjb25zdCBbYW5jaG9yUk5vZGUsIHZpZXdzXSA9IGxvY2F0ZURlaHlkcmF0ZWRWaWV3c0luQ29udGFpbmVyKGN1cnJlbnRSTm9kZSEsIG5naENvbnRhaW5lciEpO1xuXG4gICAgICBjb21tZW50Tm9kZSA9IGFuY2hvclJOb2RlIGFzIFJDb21tZW50O1xuICAgICAgZGVoeWRyYXRlZFZpZXdzID0gdmlld3M7XG5cbiAgICAgIG5nRGV2TW9kZSAmJiBhc3NlcnRSQ29tbWVudChjb21tZW50Tm9kZSwgJ0V4cGVjdGluZyBhIGNvbW1lbnQgbm9kZSBpbiB0ZW1wbGF0ZSBpbnN0cnVjdGlvbicpO1xuICAgICAgbmdEZXZNb2RlICYmIG1hcmtSTm9kZUFzQ2xhaW1lZEZvckh5ZHJhdGlvbihjb21tZW50Tm9kZSk7XG4gICAgfVxuICB9XG4gIGNvbnN0IGxDb250YWluZXIgPSBjcmVhdGVMQ29udGFpbmVyKHNsb3RWYWx1ZSwgaG9zdExWaWV3LCBjb21tZW50Tm9kZSwgaG9zdFROb2RlKTtcbiAgaWYgKG5naCAmJiBkZWh5ZHJhdGVkVmlld3MubGVuZ3RoID4gMCkge1xuICAgIGxDb250YWluZXJbREVIWURSQVRFRF9WSUVXU10gPSBkZWh5ZHJhdGVkVmlld3M7XG4gIH1cbiAgcmV0dXJuIGxDb250YWluZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbmFibGVMb2NhdGVPckNyZWF0ZUNvbnRhaW5lclJlZkltcGwoKSB7XG4gIF9sb2NhdGVPckNyZWF0ZUNvbnRhaW5lclJlZkltcGwgPSBsb2NhdGVPckNyZWF0ZUNvbnRhaW5lclJlZkltcGw7XG59XG4iXX0=