/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EnvironmentInjector } from '../di/r3_injector';
import { validateMatchingNode } from '../hydration/error_handling';
import { CONTAINERS } from '../hydration/interfaces';
import { isInSkipHydrationBlock } from '../hydration/skip_hydration';
import { isNodeDisconnected, markRNodeAsClaimedForHydration, retrieveNghInfo } from '../hydration/utils';
import { findMatchingDehydratedView, locateDehydratedViewsInContainer } from '../hydration/views';
import { isType } from '../interface/type';
import { assertNodeInjector } from '../render3/assert';
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
    createComponent(componentFactoryOrType, indexOrOptions, injector, projectableNodes, environmentInjector, lazy) {
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
            lazy = options.lazy;
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
        const componentRef = componentFactory.createImpl(contextInjector, projectableNodes, rNode, environmentInjector, hydrationInfo, lazy);
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
            ngDevMode &&
                validateMatchingNode(commentNode, Node.COMMENT_NODE, null, hostLView, hostTNode, true);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld19jb250YWluZXJfcmVmLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvbGlua2VyL3ZpZXdfY29udGFpbmVyX3JlZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFHSCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUMsVUFBVSxFQUFnRCxNQUFNLHlCQUF5QixDQUFDO0FBQ2xHLE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQ25FLE9BQU8sRUFBQyxrQkFBa0IsRUFBRSw4QkFBOEIsRUFBRSxlQUFlLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUN2RyxPQUFPLEVBQUMsMEJBQTBCLEVBQUUsZ0NBQWdDLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRyxPQUFPLEVBQUMsTUFBTSxFQUFPLE1BQU0sbUJBQW1CLENBQUM7QUFDL0MsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDckQsT0FBTyxFQUFDLGdCQUFnQixJQUFJLGtCQUFrQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDaEYsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3RELE9BQU8sRUFBQyx5QkFBeUIsRUFBRSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdEUsT0FBTyxFQUFDLGFBQWEsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGdDQUFnQyxDQUFDO0FBQy9FLE9BQU8sRUFBQyx1QkFBdUIsRUFBRSxnQkFBZ0IsRUFBYyxNQUFNLEVBQUUsU0FBUyxFQUFDLE1BQU0saUNBQWlDLENBQUM7QUFJekgsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBQyxhQUFhLEVBQUUsY0FBYyxFQUFTLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBQ2pILE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUN2RCxPQUFPLEVBQUMsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxvQkFBb0IsRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSw4QkFBOEIsQ0FBQztBQUNyTCxPQUFPLEVBQUMsZUFBZSxFQUFFLFFBQVEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzNELE9BQU8sRUFBQyxzQkFBc0IsRUFBRSxxQkFBcUIsRUFBRSxpQkFBaUIsRUFBQyxNQUFNLGdDQUFnQyxDQUFDO0FBQ2hILE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsdUJBQXVCLEVBQUMsTUFBTSw0QkFBNEIsQ0FBQztBQUNsRyxPQUFPLEVBQUMsT0FBTyxJQUFJLFNBQVMsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3pELE9BQU8sRUFBQyxVQUFVLEVBQUUsZUFBZSxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFDaEUsT0FBTyxFQUFDLGFBQWEsRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBR3pHLE9BQU8sRUFBQyxnQkFBZ0IsRUFBYSxNQUFNLGVBQWUsQ0FBQztBQUszRDs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILE1BQU0sT0FBZ0IsZ0JBQWdCOztBQTJLcEM7OztHQUdHO0FBQ0ksa0NBQWlCLEdBQTJCLHNCQUFzQixDQUFDO0FBRzVFOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLHNCQUFzQjtJQUNwQyxNQUFNLGFBQWEsR0FBRyxlQUFlLEVBQTJELENBQUM7SUFDakcsT0FBTyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztBQUN2RCxDQUFDO0FBRUQsTUFBTSxtQkFBbUIsR0FBRyxnQkFBZ0IsQ0FBQztBQUU3QyxrR0FBa0c7QUFDbEcsMENBQTBDO0FBQzFDLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxnQkFBaUIsU0FBUSxtQkFBbUI7SUFDM0UsWUFDWSxXQUF1QixFQUN2QixVQUE2RCxFQUM3RCxVQUFpQjtRQUMzQixLQUFLLEVBQUUsQ0FBQztRQUhFLGdCQUFXLEdBQVgsV0FBVyxDQUFZO1FBQ3ZCLGVBQVUsR0FBVixVQUFVLENBQW1EO1FBQzdELGVBQVUsR0FBVixVQUFVLENBQU87SUFFN0IsQ0FBQztJQUVELElBQWEsT0FBTztRQUNsQixPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRCxJQUFhLFFBQVE7UUFDbkIsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRUQsaUNBQWlDO0lBQ2pDLElBQWEsY0FBYztRQUN6QixNQUFNLGNBQWMsR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuRixJQUFJLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ3JDLE1BQU0sVUFBVSxHQUFHLHFCQUFxQixDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUUsTUFBTSxhQUFhLEdBQUcsc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDN0QsU0FBUyxJQUFJLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMzRCxNQUFNLFdBQVcsR0FDYixVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsbUNBQTJCLENBQWlCLENBQUM7WUFDckYsT0FBTyxJQUFJLFlBQVksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDbEQ7YUFBTTtZQUNMLE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUM7SUFFUSxLQUFLO1FBQ1osT0FBTyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN0QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDOUI7SUFDSCxDQUFDO0lBRVEsR0FBRyxDQUFDLEtBQWE7UUFDeEIsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQyxPQUFPLFFBQVEsS0FBSyxJQUFJLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQztJQUN0RCxDQUFDO0lBRUQsSUFBYSxNQUFNO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsdUJBQXVCLENBQUM7SUFDM0QsQ0FBQztJQVFRLGtCQUFrQixDQUFJLFdBQTJCLEVBQUUsT0FBVyxFQUFFLGNBR3hFO1FBQ0MsSUFBSSxLQUF1QixDQUFDO1FBQzVCLElBQUksUUFBNEIsQ0FBQztRQUVqQyxJQUFJLE9BQU8sY0FBYyxLQUFLLFFBQVEsRUFBRTtZQUN0QyxLQUFLLEdBQUcsY0FBYyxDQUFDO1NBQ3hCO2FBQU0sSUFBSSxjQUFjLElBQUksSUFBSSxFQUFFO1lBQ2pDLEtBQUssR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDO1lBQzdCLFFBQVEsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDO1NBQ3BDO1FBRUQsSUFBSSxhQUFhLEdBQXlCLElBQUksQ0FBQztRQUMvQyxNQUFNLEtBQUssR0FBSSxXQUFpRCxDQUFDLEtBQUssQ0FBQztRQUN2RSxJQUFJLEtBQUssRUFBRTtZQUNULGFBQWEsR0FBRywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3JFO1FBRUQsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLHNCQUFzQixDQUFDLE9BQU8sSUFBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRWhHLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDakQsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQW1CUSxlQUFlLENBQ3BCLHNCQUFtRCxFQUFFLGNBT3BELEVBQ0QsUUFBNkIsRUFBRSxnQkFBb0MsRUFDbkUsbUJBQW9FLEVBQ3BFLElBQWM7UUFDaEIsTUFBTSxrQkFBa0IsR0FBRyxzQkFBc0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3JGLElBQUksS0FBdUIsQ0FBQztRQUU1Qix3RkFBd0Y7UUFDeEYsbUZBQW1GO1FBQ25GLG9FQUFvRTtRQUNwRSw0RkFBNEY7UUFDNUYsc0ZBQXNGO1FBQ3RGLElBQUksa0JBQWtCLEVBQUU7WUFDdEIsSUFBSSxTQUFTLEVBQUU7Z0JBQ2IsV0FBVyxDQUNQLE9BQU8sY0FBYyxLQUFLLFFBQVEsRUFBRSxJQUFJLEVBQ3hDLHFFQUFxRTtvQkFDakUsOEVBQThFO29CQUM5RSxpRkFBaUY7b0JBQ2pGLDhFQUE4RTtvQkFDOUUscUVBQXFFLENBQUMsQ0FBQzthQUNoRjtZQUNELEtBQUssR0FBRyxjQUFvQyxDQUFDO1NBQzlDO2FBQU07WUFDTCxJQUFJLFNBQVMsRUFBRTtnQkFDYixhQUFhLENBQ1QsZUFBZSxDQUFDLHNCQUFzQixDQUFDLEVBQ3ZDLGlFQUFpRTtvQkFDN0QsK0RBQStELENBQUMsQ0FBQztnQkFDekUsV0FBVyxDQUNQLE9BQU8sY0FBYyxLQUFLLFFBQVEsRUFBRSxJQUFJLEVBQ3hDLGtFQUFrRTtvQkFDOUQsOEVBQThFO29CQUM5RSxzRkFBc0Y7b0JBQ3RGLHVFQUF1RSxDQUFDLENBQUM7YUFDbEY7WUFDRCxNQUFNLE9BQU8sR0FBRyxDQUFDLGNBQWMsSUFBSSxFQUFFLENBT3BDLENBQUM7WUFDRixJQUFJLFNBQVMsSUFBSSxPQUFPLENBQUMsbUJBQW1CLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRTtnQkFDbkUsVUFBVSxDQUNOLG9GQUFvRixDQUFDLENBQUM7YUFDM0Y7WUFDRCxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztZQUN0QixRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztZQUM1QixnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7WUFDNUMsbUJBQW1CLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7WUFDekUsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDckI7UUFFRCxNQUFNLGdCQUFnQixHQUF3QixrQkFBa0IsQ0FBQyxDQUFDO1lBQzlELHNCQUE2QyxDQUFBLENBQUM7WUFDOUMsSUFBSSxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUUsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sZUFBZSxHQUFHLFFBQVEsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDO1FBRXhELHNGQUFzRjtRQUN0RixJQUFJLENBQUMsbUJBQW1CLElBQUssZ0JBQXdCLENBQUMsUUFBUSxJQUFJLElBQUksRUFBRTtZQUN0RSw4RkFBOEY7WUFDOUYsNkZBQTZGO1lBQzdGLDhGQUE4RjtZQUM5Rix5RkFBeUY7WUFDekYsaUZBQWlGO1lBQ2pGLCtCQUErQjtZQUMvQixFQUFFO1lBQ0YscUZBQXFGO1lBQ3JGLDRGQUE0RjtZQUM1RiwyRkFBMkY7WUFDM0YsOEZBQThGO1lBQzlGLHNGQUFzRjtZQUN0RixvRkFBb0Y7WUFDcEYseUZBQXlGO1lBQ3pGLHVGQUF1RjtZQUN2RixXQUFXO1lBQ1gsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztZQUU3RSxvRkFBb0Y7WUFDcEYsOEZBQThGO1lBQzlGLHNEQUFzRDtZQUN0RCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3hELElBQUksTUFBTSxFQUFFO2dCQUNWLG1CQUFtQixHQUFHLE1BQU0sQ0FBQzthQUM5QjtTQUNGO1FBRUQsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBRSxDQUFDO1FBQ3RFLE1BQU0sY0FBYyxHQUFHLDBCQUEwQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLElBQUksS0FBSyxDQUFDO1FBQ1YsSUFBSSxhQUFhLEdBQXdCLElBQUksQ0FBQztRQUU5QyxJQUFJLGNBQWMsRUFBRTtZQUNsQixpQ0FBaUM7WUFDakMsS0FBSyxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUM7WUFFbEMsOERBQThEO1lBQzlELGFBQWEsR0FBRyxlQUFlLENBQUMsS0FBaUIsRUFBRSxtQkFBK0IsQ0FBQyxDQUFDO1NBQ3JGO1FBRUQsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxDQUM1QyxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RixJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMvRCxPQUFPLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBRVEsTUFBTSxDQUFDLE9BQWdCLEVBQUUsS0FBYztRQUM5QyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRU8sVUFBVSxDQUFDLE9BQWdCLEVBQUUsS0FBYyxFQUFFLG1CQUE2QjtRQUNoRixNQUFNLEtBQUssR0FBSSxPQUEwQixDQUFDLE1BQU8sQ0FBQztRQUNsRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFM0IsSUFBSSxTQUFTLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRTtZQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7U0FDdkU7UUFFRCxJQUFJLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2xDLHdGQUF3RjtZQUV4RixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXRDLHNGQUFzRjtZQUN0Rix1QkFBdUI7WUFDdkIsMERBQTBEO1lBQzFELDBEQUEwRDtZQUMxRCxJQUFJLE9BQU8sS0FBSyxDQUFDLENBQUMsRUFBRTtnQkFDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUN0QjtpQkFBTTtnQkFDTCxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFlLENBQUM7Z0JBQ25ELFNBQVM7b0JBQ0wsV0FBVyxDQUNQLFlBQVksQ0FBQyxjQUFjLENBQUMsRUFBRSxJQUFJLEVBQ2xDLCtEQUErRCxDQUFDLENBQUM7Z0JBR3pFLG1GQUFtRjtnQkFDbkYsNkJBQTZCO2dCQUM3QixNQUFNLFNBQVMsR0FBRyxJQUFJLGtCQUFrQixDQUNwQyxjQUFjLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBdUIsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFFMUYsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7YUFDOUM7U0FDRjtRQUVELHNEQUFzRDtRQUN0RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDcEMsVUFBVSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRWxELDhDQUE4QztRQUM5QyxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDeEIsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNqQyxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBd0IsQ0FBQyxDQUFDO1lBQzFGLElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtnQkFDeEIsa0JBQWtCLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUN6RjtTQUNGO1FBRUEsT0FBMEIsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBQ3ZELFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFbEUsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUVRLElBQUksQ0FBQyxPQUFnQixFQUFFLFFBQWdCO1FBQzlDLElBQUksU0FBUyxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUU7WUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1NBQ3JFO1FBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRVEsT0FBTyxDQUFDLE9BQWdCO1FBQy9CLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbEQsT0FBTyxXQUFXLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRVEsTUFBTSxDQUFDLEtBQWM7UUFDNUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUUvRCxJQUFJLFlBQVksRUFBRTtZQUNoQixrRkFBa0Y7WUFDbEYsbUVBQW1FO1lBQ25FLDJFQUEyRTtZQUMzRSx3Q0FBd0M7WUFDeEMsc0ZBQXNGO1lBQ3RGLGtCQUFrQjtZQUNsQixlQUFlLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3BFLFlBQVksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDakQ7SUFDSCxDQUFDO0lBRVEsTUFBTSxDQUFDLEtBQWM7UUFDNUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUV2RCxNQUFNLFdBQVcsR0FDYixJQUFJLElBQUksZUFBZSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxXQUFXLENBQUMsSUFBSSxJQUFJLENBQUM7UUFDeEYsT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDbkQsQ0FBQztJQUVPLFlBQVksQ0FBQyxLQUFjLEVBQUUsUUFBZ0IsQ0FBQztRQUNwRCxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7WUFDakIsT0FBTyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztTQUM1QjtRQUNELElBQUksU0FBUyxFQUFFO1lBQ2IsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLHVDQUF1QyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQzdFLDhDQUE4QztZQUM5QyxjQUFjLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztTQUN6RDtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztDQUNGLENBQUM7QUFFRixTQUFTLFdBQVcsQ0FBQyxVQUFzQjtJQUN6QyxPQUFPLFVBQVUsQ0FBQyxTQUFTLENBQWMsQ0FBQztBQUM1QyxDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxVQUFzQjtJQUNqRCxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFjLENBQUM7QUFDOUUsQ0FBQztBQUVEOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUM5QixTQUE0RCxFQUM1RCxTQUFnQjtJQUNsQixTQUFTLElBQUksZUFBZSxDQUFDLFNBQVMsRUFBRSw0REFBMkMsQ0FBQyxDQUFDO0lBRXJGLElBQUksVUFBc0IsQ0FBQztJQUMzQixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzdDLElBQUksWUFBWSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBQzNCLHVFQUF1RTtRQUN2RSxVQUFVLEdBQUcsU0FBUyxDQUFDO0tBQ3hCO1NBQU07UUFDTCxVQUFVLEdBQUcsK0JBQStCLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM5RSxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLFVBQVUsQ0FBQztRQUN4QyxhQUFhLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0tBQ3RDO0lBRUQsT0FBTyxJQUFJLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDbEUsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsU0FBZ0IsRUFBRSxTQUFnQjtJQUMxRCx5RkFBeUY7SUFDekYsMkZBQTJGO0lBQzNGLDZCQUE2QjtJQUM3QixNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDckMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBQy9DLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRXpFLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUUsQ0FBQztJQUMzRCxNQUFNLGtCQUFrQixHQUFHLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNsRSxrQkFBa0IsQ0FDZCxRQUFRLEVBQUUsa0JBQW1CLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNoRyxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILElBQUksK0JBQStCLEdBQUcsQ0FBQyxTQUFnQixFQUFFLFNBQWdCLEVBQUUsU0FBYyxFQUFFLEVBQUU7SUFDM0YsSUFBSSxXQUFxQixDQUFDO0lBQzFCLHFGQUFxRjtJQUNyRixrRkFBa0Y7SUFDbEYsK0ZBQStGO0lBQy9GLFlBQVk7SUFDWixJQUFJLFNBQVMsQ0FBQyxJQUFJLHFDQUE2QixFQUFFO1FBQy9DLFdBQVcsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFhLENBQUM7S0FDbEQ7U0FBTTtRQUNMLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7S0FDdEQ7SUFFRCxPQUFPLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQztBQUVGLFNBQVMsOEJBQThCLENBQ25DLFNBQWdCLEVBQUUsU0FBZ0IsRUFBRSxTQUFjO0lBQ3BELElBQUksWUFBMEIsQ0FBQztJQUMvQixJQUFJLGVBQWUsR0FBc0IsRUFBRSxDQUFDO0lBQzVDLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN0QyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQztJQUM5QyxNQUFNLFVBQVUsR0FDWixDQUFDLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLElBQUksa0JBQWtCLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzNGLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDZixZQUFZLEdBQUcsR0FBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxTQUFTO1lBQ0wsYUFBYSxDQUFDLFlBQVksRUFBRSx5REFBeUQsQ0FBQyxDQUFDO0tBQzVGO0lBRUQsSUFBSSxXQUFxQixDQUFDO0lBQzFCLHFGQUFxRjtJQUNyRixrRkFBa0Y7SUFDbEYsK0ZBQStGO0lBQy9GLFlBQVk7SUFDWixJQUFJLFNBQVMsQ0FBQyxJQUFJLHFDQUE2QixFQUFFO1FBQy9DLFdBQVcsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFhLENBQUM7UUFDakQsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNmLE1BQU0sZ0JBQWdCLEdBQUcsR0FBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDekQsSUFBSSxnQkFBZ0IsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUN2RSx3RUFBd0U7Z0JBQ3hFLHlFQUF5RTtnQkFDekUsc0RBQXNEO2dCQUN0RCxlQUFlLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO2dCQUNuRCxnQkFBZ0IsQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO2FBQ3ZDO1NBQ0Y7S0FDRjtTQUFNO1FBQ0wsSUFBSSxVQUFVLEVBQUU7WUFDZCxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1NBQ3REO2FBQU07WUFDTCxnRUFBZ0U7WUFDaEUsa0NBQWtDO1lBQ2xDLGtFQUFrRTtZQUNsRSwyREFBMkQ7WUFDM0QsSUFBSSxZQUFZLEdBQUksV0FBVyxDQUFDLFNBQVMsQ0FBVyxDQUFDLFdBQVcsQ0FBQztZQUNqRSxnREFBZ0Q7WUFDaEQsTUFBTSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsR0FBRyxnQ0FBZ0MsQ0FBQyxZQUFhLEVBQUUsWUFBYSxDQUFDLENBQUM7WUFFNUYsV0FBVyxHQUFHLFdBQXVCLENBQUM7WUFDdEMsZUFBZSxHQUFHLEtBQUssQ0FBQztZQUV4QixTQUFTO2dCQUNMLG9CQUFvQixDQUNoQixXQUE4QixFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0YsU0FBUyxJQUFJLDhCQUE4QixDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQzFEO0tBQ0Y7SUFDRCxNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNsRixJQUFJLEdBQUcsSUFBSSxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNyQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxlQUFlLENBQUM7S0FDaEQ7SUFDRCxPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBRUQsTUFBTSxVQUFVLG9DQUFvQztJQUNsRCwrQkFBK0IsR0FBRyw4QkFBOEIsQ0FBQztBQUNuRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0b3J9IGZyb20gJy4uL2RpL2luamVjdG9yJztcbmltcG9ydCB7RW52aXJvbm1lbnRJbmplY3Rvcn0gZnJvbSAnLi4vZGkvcjNfaW5qZWN0b3InO1xuaW1wb3J0IHt2YWxpZGF0ZU1hdGNoaW5nTm9kZX0gZnJvbSAnLi4vaHlkcmF0aW9uL2Vycm9yX2hhbmRsaW5nJztcbmltcG9ydCB7Q09OVEFJTkVSUywgTmdoQ29udGFpbmVyLCBOZ2hEb21JbnN0YW5jZSwgTmdoVmlld0luc3RhbmNlfSBmcm9tICcuLi9oeWRyYXRpb24vaW50ZXJmYWNlcyc7XG5pbXBvcnQge2lzSW5Ta2lwSHlkcmF0aW9uQmxvY2t9IGZyb20gJy4uL2h5ZHJhdGlvbi9za2lwX2h5ZHJhdGlvbic7XG5pbXBvcnQge2lzTm9kZURpc2Nvbm5lY3RlZCwgbWFya1JOb2RlQXNDbGFpbWVkRm9ySHlkcmF0aW9uLCByZXRyaWV2ZU5naEluZm99IGZyb20gJy4uL2h5ZHJhdGlvbi91dGlscyc7XG5pbXBvcnQge2ZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3LCBsb2NhdGVEZWh5ZHJhdGVkVmlld3NJbkNvbnRhaW5lcn0gZnJvbSAnLi4vaHlkcmF0aW9uL3ZpZXdzJztcbmltcG9ydCB7aXNUeXBlLCBUeXBlfSBmcm9tICcuLi9pbnRlcmZhY2UvdHlwZSc7XG5pbXBvcnQge2Fzc2VydE5vZGVJbmplY3Rvcn0gZnJvbSAnLi4vcmVuZGVyMy9hc3NlcnQnO1xuaW1wb3J0IHtDb21wb25lbnRGYWN0b3J5IGFzIFIzQ29tcG9uZW50RmFjdG9yeX0gZnJvbSAnLi4vcmVuZGVyMy9jb21wb25lbnRfcmVmJztcbmltcG9ydCB7Z2V0Q29tcG9uZW50RGVmfSBmcm9tICcuLi9yZW5kZXIzL2RlZmluaXRpb24nO1xuaW1wb3J0IHtnZXRQYXJlbnRJbmplY3RvckxvY2F0aW9uLCBOb2RlSW5qZWN0b3J9IGZyb20gJy4uL3JlbmRlcjMvZGknO1xuaW1wb3J0IHthZGRUb1ZpZXdUcmVlLCBjcmVhdGVMQ29udGFpbmVyfSBmcm9tICcuLi9yZW5kZXIzL2luc3RydWN0aW9ucy9zaGFyZWQnO1xuaW1wb3J0IHtDT05UQUlORVJfSEVBREVSX09GRlNFVCwgREVIWURSQVRFRF9WSUVXUywgTENvbnRhaW5lciwgTkFUSVZFLCBWSUVXX1JFRlN9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9jb250YWluZXInO1xuaW1wb3J0IHtOb2RlSW5qZWN0b3JPZmZzZXR9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9pbmplY3Rvcic7XG5pbXBvcnQge1RDb250YWluZXJOb2RlLCBURGlyZWN0aXZlSG9zdE5vZGUsIFRFbGVtZW50Q29udGFpbmVyTm9kZSwgVEVsZW1lbnROb2RlLCBUTm9kZSwgVE5vZGVUeXBlfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvbm9kZSc7XG5pbXBvcnQge1JDb21tZW50LCBSRWxlbWVudCwgUk5vZGV9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9yZW5kZXJlcl9kb20nO1xuaW1wb3J0IHtpc0xDb250YWluZXJ9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy90eXBlX2NoZWNrcyc7XG5pbXBvcnQge0hFQURFUl9PRkZTRVQsIEhZRFJBVElPTl9JTkZPLCBMVmlldywgUEFSRU5ULCBSRU5ERVJFUiwgVF9IT1NULCBUVklFV30gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3ZpZXcnO1xuaW1wb3J0IHthc3NlcnRUTm9kZVR5cGV9IGZyb20gJy4uL3JlbmRlcjMvbm9kZV9hc3NlcnQnO1xuaW1wb3J0IHthZGRWaWV3VG9Db250YWluZXIsIGRlc3Ryb3lMVmlldywgZGV0YWNoVmlldywgZ2V0QmVmb3JlTm9kZUZvclZpZXcsIGluc2VydFZpZXcsIG5hdGl2ZUluc2VydEJlZm9yZSwgbmF0aXZlTmV4dFNpYmxpbmcsIG5hdGl2ZVBhcmVudE5vZGV9IGZyb20gJy4uL3JlbmRlcjMvbm9kZV9tYW5pcHVsYXRpb24nO1xuaW1wb3J0IHtnZXRDdXJyZW50VE5vZGUsIGdldExWaWV3fSBmcm9tICcuLi9yZW5kZXIzL3N0YXRlJztcbmltcG9ydCB7Z2V0UGFyZW50SW5qZWN0b3JJbmRleCwgZ2V0UGFyZW50SW5qZWN0b3JWaWV3LCBoYXNQYXJlbnRJbmplY3Rvcn0gZnJvbSAnLi4vcmVuZGVyMy91dGlsL2luamVjdG9yX3V0aWxzJztcbmltcG9ydCB7Z2V0TmF0aXZlQnlUTm9kZSwgdW53cmFwUk5vZGUsIHZpZXdBdHRhY2hlZFRvQ29udGFpbmVyfSBmcm9tICcuLi9yZW5kZXIzL3V0aWwvdmlld191dGlscyc7XG5pbXBvcnQge1ZpZXdSZWYgYXMgUjNWaWV3UmVmfSBmcm9tICcuLi9yZW5kZXIzL3ZpZXdfcmVmJztcbmltcG9ydCB7YWRkVG9BcnJheSwgcmVtb3ZlRnJvbUFycmF5fSBmcm9tICcuLi91dGlsL2FycmF5X3V0aWxzJztcbmltcG9ydCB7YXNzZXJ0RGVmaW5lZCwgYXNzZXJ0RXF1YWwsIGFzc2VydEdyZWF0ZXJUaGFuLCBhc3NlcnRMZXNzVGhhbiwgdGhyb3dFcnJvcn0gZnJvbSAnLi4vdXRpbC9hc3NlcnQnO1xuXG5pbXBvcnQge0NvbXBvbmVudEZhY3RvcnksIENvbXBvbmVudFJlZn0gZnJvbSAnLi9jb21wb25lbnRfZmFjdG9yeSc7XG5pbXBvcnQge2NyZWF0ZUVsZW1lbnRSZWYsIEVsZW1lbnRSZWZ9IGZyb20gJy4vZWxlbWVudF9yZWYnO1xuaW1wb3J0IHtOZ01vZHVsZVJlZn0gZnJvbSAnLi9uZ19tb2R1bGVfZmFjdG9yeSc7XG5pbXBvcnQge1RlbXBsYXRlUmVmfSBmcm9tICcuL3RlbXBsYXRlX3JlZic7XG5pbXBvcnQge0VtYmVkZGVkVmlld1JlZiwgVmlld1JlZn0gZnJvbSAnLi92aWV3X3JlZic7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNvbnRhaW5lciB3aGVyZSBvbmUgb3IgbW9yZSB2aWV3cyBjYW4gYmUgYXR0YWNoZWQgdG8gYSBjb21wb25lbnQuXG4gKlxuICogQ2FuIGNvbnRhaW4gKmhvc3Qgdmlld3MqIChjcmVhdGVkIGJ5IGluc3RhbnRpYXRpbmcgYVxuICogY29tcG9uZW50IHdpdGggdGhlIGBjcmVhdGVDb21wb25lbnQoKWAgbWV0aG9kKSwgYW5kICplbWJlZGRlZCB2aWV3cypcbiAqIChjcmVhdGVkIGJ5IGluc3RhbnRpYXRpbmcgYSBgVGVtcGxhdGVSZWZgIHdpdGggdGhlIGBjcmVhdGVFbWJlZGRlZFZpZXcoKWAgbWV0aG9kKS5cbiAqXG4gKiBBIHZpZXcgY29udGFpbmVyIGluc3RhbmNlIGNhbiBjb250YWluIG90aGVyIHZpZXcgY29udGFpbmVycyxcbiAqIGNyZWF0aW5nIGEgW3ZpZXcgaGllcmFyY2h5XShndWlkZS9nbG9zc2FyeSN2aWV3LXRyZWUpLlxuICpcbiAqIEBzZWUgYENvbXBvbmVudFJlZmBcbiAqIEBzZWUgYEVtYmVkZGVkVmlld1JlZmBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBWaWV3Q29udGFpbmVyUmVmIHtcbiAgLyoqXG4gICAqIEFuY2hvciBlbGVtZW50IHRoYXQgc3BlY2lmaWVzIHRoZSBsb2NhdGlvbiBvZiB0aGlzIGNvbnRhaW5lciBpbiB0aGUgY29udGFpbmluZyB2aWV3LlxuICAgKiBFYWNoIHZpZXcgY29udGFpbmVyIGNhbiBoYXZlIG9ubHkgb25lIGFuY2hvciBlbGVtZW50LCBhbmQgZWFjaCBhbmNob3IgZWxlbWVudFxuICAgKiBjYW4gaGF2ZSBvbmx5IGEgc2luZ2xlIHZpZXcgY29udGFpbmVyLlxuICAgKlxuICAgKiBSb290IGVsZW1lbnRzIG9mIHZpZXdzIGF0dGFjaGVkIHRvIHRoaXMgY29udGFpbmVyIGJlY29tZSBzaWJsaW5ncyBvZiB0aGUgYW5jaG9yIGVsZW1lbnQgaW5cbiAgICogdGhlIHJlbmRlcmVkIHZpZXcuXG4gICAqXG4gICAqIEFjY2VzcyB0aGUgYFZpZXdDb250YWluZXJSZWZgIG9mIGFuIGVsZW1lbnQgYnkgcGxhY2luZyBhIGBEaXJlY3RpdmVgIGluamVjdGVkXG4gICAqIHdpdGggYFZpZXdDb250YWluZXJSZWZgIG9uIHRoZSBlbGVtZW50LCBvciB1c2UgYSBgVmlld0NoaWxkYCBxdWVyeS5cbiAgICpcbiAgICogPCEtLSBUT0RPOiByZW5hbWUgdG8gYW5jaG9yRWxlbWVudCAtLT5cbiAgICovXG4gIGFic3RyYWN0IGdldCBlbGVtZW50KCk6IEVsZW1lbnRSZWY7XG5cbiAgLyoqXG4gICAqIFRoZSBbZGVwZW5kZW5jeSBpbmplY3Rvcl0oZ3VpZGUvZ2xvc3NhcnkjaW5qZWN0b3IpIGZvciB0aGlzIHZpZXcgY29udGFpbmVyLlxuICAgKi9cbiAgYWJzdHJhY3QgZ2V0IGluamVjdG9yKCk6IEluamVjdG9yO1xuXG4gIC8qKiBAZGVwcmVjYXRlZCBObyByZXBsYWNlbWVudCAqL1xuICBhYnN0cmFjdCBnZXQgcGFyZW50SW5qZWN0b3IoKTogSW5qZWN0b3I7XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFsbCB2aWV3cyBpbiB0aGlzIGNvbnRhaW5lci5cbiAgICovXG4gIGFic3RyYWN0IGNsZWFyKCk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhIHZpZXcgZnJvbSB0aGlzIGNvbnRhaW5lci5cbiAgICogQHBhcmFtIGluZGV4IFRoZSAwLWJhc2VkIGluZGV4IG9mIHRoZSB2aWV3IHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJucyBUaGUgYFZpZXdSZWZgIGluc3RhbmNlLCBvciBudWxsIGlmIHRoZSBpbmRleCBpcyBvdXQgb2YgcmFuZ2UuXG4gICAqL1xuICBhYnN0cmFjdCBnZXQoaW5kZXg6IG51bWJlcik6IFZpZXdSZWZ8bnVsbDtcblxuICAvKipcbiAgICogUmVwb3J0cyBob3cgbWFueSB2aWV3cyBhcmUgY3VycmVudGx5IGF0dGFjaGVkIHRvIHRoaXMgY29udGFpbmVyLlxuICAgKiBAcmV0dXJucyBUaGUgbnVtYmVyIG9mIHZpZXdzLlxuICAgKi9cbiAgYWJzdHJhY3QgZ2V0IGxlbmd0aCgpOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEluc3RhbnRpYXRlcyBhbiBlbWJlZGRlZCB2aWV3IGFuZCBpbnNlcnRzIGl0XG4gICAqIGludG8gdGhpcyBjb250YWluZXIuXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZVJlZiBUaGUgSFRNTCB0ZW1wbGF0ZSB0aGF0IGRlZmluZXMgdGhlIHZpZXcuXG4gICAqIEBwYXJhbSBjb250ZXh0IFRoZSBkYXRhLWJpbmRpbmcgY29udGV4dCBvZiB0aGUgZW1iZWRkZWQgdmlldywgYXMgZGVjbGFyZWRcbiAgICogaW4gdGhlIGA8bmctdGVtcGxhdGU+YCB1c2FnZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgRXh0cmEgY29uZmlndXJhdGlvbiBmb3IgdGhlIGNyZWF0ZWQgdmlldy4gSW5jbHVkZXM6XG4gICAqICAqIGluZGV4OiBUaGUgMC1iYXNlZCBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIG5ldyB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqICAgICAgICAgICBJZiBub3Qgc3BlY2lmaWVkLCBhcHBlbmRzIHRoZSBuZXcgdmlldyBhcyB0aGUgbGFzdCBlbnRyeS5cbiAgICogICogaW5qZWN0b3I6IEluamVjdG9yIHRvIGJlIHVzZWQgd2l0aGluIHRoZSBlbWJlZGRlZCB2aWV3LlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgYFZpZXdSZWZgIGluc3RhbmNlIGZvciB0aGUgbmV3bHkgY3JlYXRlZCB2aWV3LlxuICAgKi9cbiAgYWJzdHJhY3QgY3JlYXRlRW1iZWRkZWRWaWV3PEM+KHRlbXBsYXRlUmVmOiBUZW1wbGF0ZVJlZjxDPiwgY29udGV4dD86IEMsIG9wdGlvbnM/OiB7XG4gICAgaW5kZXg/OiBudW1iZXIsXG4gICAgaW5qZWN0b3I/OiBJbmplY3RvclxuICB9KTogRW1iZWRkZWRWaWV3UmVmPEM+O1xuXG4gIC8qKlxuICAgKiBJbnN0YW50aWF0ZXMgYW4gZW1iZWRkZWQgdmlldyBhbmQgaW5zZXJ0cyBpdFxuICAgKiBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gdGVtcGxhdGVSZWYgVGhlIEhUTUwgdGVtcGxhdGUgdGhhdCBkZWZpbmVzIHRoZSB2aWV3LlxuICAgKiBAcGFyYW0gY29udGV4dCBUaGUgZGF0YS1iaW5kaW5nIGNvbnRleHQgb2YgdGhlIGVtYmVkZGVkIHZpZXcsIGFzIGRlY2xhcmVkXG4gICAqIGluIHRoZSBgPG5nLXRlbXBsYXRlPmAgdXNhZ2UuXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgMC1iYXNlZCBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIG5ldyB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqIElmIG5vdCBzcGVjaWZpZWQsIGFwcGVuZHMgdGhlIG5ldyB2aWV3IGFzIHRoZSBsYXN0IGVudHJ5LlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgYFZpZXdSZWZgIGluc3RhbmNlIGZvciB0aGUgbmV3bHkgY3JlYXRlZCB2aWV3LlxuICAgKi9cbiAgYWJzdHJhY3QgY3JlYXRlRW1iZWRkZWRWaWV3PEM+KHRlbXBsYXRlUmVmOiBUZW1wbGF0ZVJlZjxDPiwgY29udGV4dD86IEMsIGluZGV4PzogbnVtYmVyKTpcbiAgICAgIEVtYmVkZGVkVmlld1JlZjxDPjtcblxuICAvKipcbiAgICogSW5zdGFudGlhdGVzIGEgc2luZ2xlIGNvbXBvbmVudCBhbmQgaW5zZXJ0cyBpdHMgaG9zdCB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqXG4gICAqIEBwYXJhbSBjb21wb25lbnRUeXBlIENvbXBvbmVudCBUeXBlIHRvIHVzZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgZXh0cmEgcGFyYW1ldGVyczpcbiAgICogICogaW5kZXg6IHRoZSBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIG5ldyBjb21wb25lbnQncyBob3N0IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogICAgICAgICAgIElmIG5vdCBzcGVjaWZpZWQsIGFwcGVuZHMgdGhlIG5ldyB2aWV3IGFzIHRoZSBsYXN0IGVudHJ5LlxuICAgKiAgKiBpbmplY3RvcjogdGhlIGluamVjdG9yIHRvIHVzZSBhcyB0aGUgcGFyZW50IGZvciB0aGUgbmV3IGNvbXBvbmVudC5cbiAgICogICogbmdNb2R1bGVSZWY6IGFuIE5nTW9kdWxlUmVmIG9mIHRoZSBjb21wb25lbnQncyBOZ01vZHVsZSwgeW91IHNob3VsZCBhbG1vc3QgYWx3YXlzIHByb3ZpZGVcbiAgICogICAgICAgICAgICAgICAgIHRoaXMgdG8gZW5zdXJlIHRoYXQgYWxsIGV4cGVjdGVkIHByb3ZpZGVycyBhcmUgYXZhaWxhYmxlIGZvciB0aGUgY29tcG9uZW50XG4gICAqICAgICAgICAgICAgICAgICBpbnN0YW50aWF0aW9uLlxuICAgKiAgKiBlbnZpcm9ubWVudEluamVjdG9yOiBhbiBFbnZpcm9ubWVudEluamVjdG9yIHdoaWNoIHdpbGwgcHJvdmlkZSB0aGUgY29tcG9uZW50J3MgZW52aXJvbm1lbnQuXG4gICAqICAgICAgICAgICAgICAgICB5b3Ugc2hvdWxkIGFsbW9zdCBhbHdheXMgcHJvdmlkZSB0aGlzIHRvIGVuc3VyZSB0aGF0IGFsbCBleHBlY3RlZCBwcm92aWRlcnNcbiAgICogICAgICAgICAgICAgICAgIGFyZSBhdmFpbGFibGUgZm9yIHRoZSBjb21wb25lbnQgaW5zdGFudGlhdGlvbi4gVGhpcyBvcHRpb24gaXMgaW50ZW5kZWQgdG9cbiAgICogICAgICAgICAgICAgICAgIHJlcGxhY2UgdGhlIGBuZ01vZHVsZVJlZmAgcGFyYW1ldGVyLlxuICAgKiAgKiBwcm9qZWN0YWJsZU5vZGVzOiBsaXN0IG9mIERPTSBub2RlcyB0aGF0IHNob3VsZCBiZSBwcm9qZWN0ZWQgdGhyb3VnaFxuICAgKiAgICAgICAgICAgICAgICAgICAgICBbYDxuZy1jb250ZW50PmBdKGFwaS9jb3JlL25nLWNvbnRlbnQpIG9mIHRoZSBuZXcgY29tcG9uZW50IGluc3RhbmNlLlxuICAgKiAgKiBsYXp5OiBib29sZWFuIGZsYWcgdGhhdCBpbmRpY2F0ZXMgd2hldGhlciB0aGlzIGNvbXBvbmVudCBpbnN0YW5jZSB3YXMgY3JlYXRlZCBhZnRlciBhblxuICAgKiAgICAgICAgICBpbml0aWFsIHJlbmRlcmluZyBhZnRlciBsYXp5LWxvYWRpbmcgY29tcG9uZW50J3MgY29kZS5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIG5ldyBgQ29tcG9uZW50UmVmYCB3aGljaCBjb250YWlucyB0aGUgY29tcG9uZW50IGluc3RhbmNlIGFuZCB0aGUgaG9zdCB2aWV3LlxuICAgKi9cbiAgYWJzdHJhY3QgY3JlYXRlQ29tcG9uZW50PEM+KGNvbXBvbmVudFR5cGU6IFR5cGU8Qz4sIG9wdGlvbnM/OiB7XG4gICAgaW5kZXg/OiBudW1iZXIsXG4gICAgaW5qZWN0b3I/OiBJbmplY3RvcixcbiAgICBuZ01vZHVsZVJlZj86IE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yfE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgIHByb2plY3RhYmxlTm9kZXM/OiBOb2RlW11bXSxcbiAgICBsYXp5PzogYm9vbGVhbixcbiAgfSk6IENvbXBvbmVudFJlZjxDPjtcblxuICAvKipcbiAgICogSW5zdGFudGlhdGVzIGEgc2luZ2xlIGNvbXBvbmVudCBhbmQgaW5zZXJ0cyBpdHMgaG9zdCB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqXG4gICAqIEBwYXJhbSBjb21wb25lbnRGYWN0b3J5IENvbXBvbmVudCBmYWN0b3J5IHRvIHVzZS5cbiAgICogQHBhcmFtIGluZGV4IFRoZSBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIG5ldyBjb21wb25lbnQncyBob3N0IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogSWYgbm90IHNwZWNpZmllZCwgYXBwZW5kcyB0aGUgbmV3IHZpZXcgYXMgdGhlIGxhc3QgZW50cnkuXG4gICAqIEBwYXJhbSBpbmplY3RvciBUaGUgaW5qZWN0b3IgdG8gdXNlIGFzIHRoZSBwYXJlbnQgZm9yIHRoZSBuZXcgY29tcG9uZW50LlxuICAgKiBAcGFyYW0gcHJvamVjdGFibGVOb2RlcyBMaXN0IG9mIERPTSBub2RlcyB0aGF0IHNob3VsZCBiZSBwcm9qZWN0ZWQgdGhyb3VnaFxuICAgKiAgICAgW2A8bmctY29udGVudD5gXShhcGkvY29yZS9uZy1jb250ZW50KSBvZiB0aGUgbmV3IGNvbXBvbmVudCBpbnN0YW5jZS5cbiAgICogQHBhcmFtIG5nTW9kdWxlUmVmIEFuIGluc3RhbmNlIG9mIHRoZSBOZ01vZHVsZVJlZiB0aGF0IHJlcHJlc2VudCBhbiBOZ01vZHVsZS5cbiAgICogVGhpcyBpbmZvcm1hdGlvbiBpcyB1c2VkIHRvIHJldHJpZXZlIGNvcnJlc3BvbmRpbmcgTmdNb2R1bGUgaW5qZWN0b3IuXG4gICAqIEBwYXJhbSBsYXp5IEEgZmxhZyB0aGF0IGluZGljYXRlcyB3aGV0aGVyIHRoaXMgY29tcG9uZW50IGluc3RhbmNlIHdhcyBjcmVhdGVkIGFmdGVyIGFuXG4gICAqICAgICAgICAgIGluaXRpYWwgcmVuZGVyaW5nIGFmdGVyIGxhenktbG9hZGluZyBjb21wb25lbnQncyBjb2RlLlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgbmV3IGBDb21wb25lbnRSZWZgIHdoaWNoIGNvbnRhaW5zIHRoZSBjb21wb25lbnQgaW5zdGFuY2UgYW5kIHRoZSBob3N0IHZpZXcuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIEFuZ3VsYXIgbm8gbG9uZ2VyIHJlcXVpcmVzIGNvbXBvbmVudCBmYWN0b3JpZXMgdG8gZHluYW1pY2FsbHkgY3JlYXRlIGNvbXBvbmVudHMuXG4gICAqICAgICBVc2UgZGlmZmVyZW50IHNpZ25hdHVyZSBvZiB0aGUgYGNyZWF0ZUNvbXBvbmVudGAgbWV0aG9kLCB3aGljaCBhbGxvd3MgcGFzc2luZ1xuICAgKiAgICAgQ29tcG9uZW50IGNsYXNzIGRpcmVjdGx5LlxuICAgKi9cbiAgYWJzdHJhY3QgY3JlYXRlQ29tcG9uZW50PEM+KFxuICAgICAgY29tcG9uZW50RmFjdG9yeTogQ29tcG9uZW50RmFjdG9yeTxDPiwgaW5kZXg/OiBudW1iZXIsIGluamVjdG9yPzogSW5qZWN0b3IsXG4gICAgICBwcm9qZWN0YWJsZU5vZGVzPzogYW55W11bXSwgZW52aXJvbm1lbnRJbmplY3Rvcj86IEVudmlyb25tZW50SW5qZWN0b3J8TmdNb2R1bGVSZWY8YW55PixcbiAgICAgIGxhenk/OiBib29sZWFuKTogQ29tcG9uZW50UmVmPEM+O1xuXG4gIC8qKlxuICAgKiBJbnNlcnRzIGEgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gdmlld1JlZiBUaGUgdmlldyB0byBpbnNlcnQuXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgMC1iYXNlZCBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIHZpZXcuXG4gICAqIElmIG5vdCBzcGVjaWZpZWQsIGFwcGVuZHMgdGhlIG5ldyB2aWV3IGFzIHRoZSBsYXN0IGVudHJ5LlxuICAgKiBAcmV0dXJucyBUaGUgaW5zZXJ0ZWQgYFZpZXdSZWZgIGluc3RhbmNlLlxuICAgKlxuICAgKi9cbiAgYWJzdHJhY3QgaW5zZXJ0KHZpZXdSZWY6IFZpZXdSZWYsIGluZGV4PzogbnVtYmVyKTogVmlld1JlZjtcblxuICAvKipcbiAgICogTW92ZXMgYSB2aWV3IHRvIGEgbmV3IGxvY2F0aW9uIGluIHRoaXMgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gdmlld1JlZiBUaGUgdmlldyB0byBtb3ZlLlxuICAgKiBAcGFyYW0gaW5kZXggVGhlIDAtYmFzZWQgaW5kZXggb2YgdGhlIG5ldyBsb2NhdGlvbi5cbiAgICogQHJldHVybnMgVGhlIG1vdmVkIGBWaWV3UmVmYCBpbnN0YW5jZS5cbiAgICovXG4gIGFic3RyYWN0IG1vdmUodmlld1JlZjogVmlld1JlZiwgY3VycmVudEluZGV4OiBudW1iZXIpOiBWaWV3UmVmO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBpbmRleCBvZiBhIHZpZXcgd2l0aGluIHRoZSBjdXJyZW50IGNvbnRhaW5lci5cbiAgICogQHBhcmFtIHZpZXdSZWYgVGhlIHZpZXcgdG8gcXVlcnkuXG4gICAqIEByZXR1cm5zIFRoZSAwLWJhc2VkIGluZGV4IG9mIHRoZSB2aWV3J3MgcG9zaXRpb24gaW4gdGhpcyBjb250YWluZXIsXG4gICAqIG9yIGAtMWAgaWYgdGhpcyBjb250YWluZXIgZG9lc24ndCBjb250YWluIHRoZSB2aWV3LlxuICAgKi9cbiAgYWJzdHJhY3QgaW5kZXhPZih2aWV3UmVmOiBWaWV3UmVmKTogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhIHZpZXcgYXR0YWNoZWQgdG8gdGhpcyBjb250YWluZXJcbiAgICogQHBhcmFtIGluZGV4IFRoZSAwLWJhc2VkIGluZGV4IG9mIHRoZSB2aWV3IHRvIGRlc3Ryb3kuXG4gICAqIElmIG5vdCBzcGVjaWZpZWQsIHRoZSBsYXN0IHZpZXcgaW4gdGhlIGNvbnRhaW5lciBpcyByZW1vdmVkLlxuICAgKi9cbiAgYWJzdHJhY3QgcmVtb3ZlKGluZGV4PzogbnVtYmVyKTogdm9pZDtcblxuICAvKipcbiAgICogRGV0YWNoZXMgYSB2aWV3IGZyb20gdGhpcyBjb250YWluZXIgd2l0aG91dCBkZXN0cm95aW5nIGl0LlxuICAgKiBVc2UgYWxvbmcgd2l0aCBgaW5zZXJ0KClgIHRvIG1vdmUgYSB2aWV3IHdpdGhpbiB0aGUgY3VycmVudCBjb250YWluZXIuXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgMC1iYXNlZCBpbmRleCBvZiB0aGUgdmlldyB0byBkZXRhY2guXG4gICAqIElmIG5vdCBzcGVjaWZpZWQsIHRoZSBsYXN0IHZpZXcgaW4gdGhlIGNvbnRhaW5lciBpcyBkZXRhY2hlZC5cbiAgICovXG4gIGFic3RyYWN0IGRldGFjaChpbmRleD86IG51bWJlcik6IFZpZXdSZWZ8bnVsbDtcblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIEBub2NvbGxhcHNlXG4gICAqL1xuICBzdGF0aWMgX19OR19FTEVNRU5UX0lEX186ICgpID0+IFZpZXdDb250YWluZXJSZWYgPSBpbmplY3RWaWV3Q29udGFpbmVyUmVmO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBWaWV3Q29udGFpbmVyUmVmIGFuZCBzdG9yZXMgaXQgb24gdGhlIGluamVjdG9yLiBPciwgaWYgdGhlIFZpZXdDb250YWluZXJSZWZcbiAqIGFscmVhZHkgZXhpc3RzLCByZXRyaWV2ZXMgdGhlIGV4aXN0aW5nIFZpZXdDb250YWluZXJSZWYuXG4gKlxuICogQHJldHVybnMgVGhlIFZpZXdDb250YWluZXJSZWYgaW5zdGFuY2UgdG8gdXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmplY3RWaWV3Q29udGFpbmVyUmVmKCk6IFZpZXdDb250YWluZXJSZWYge1xuICBjb25zdCBwcmV2aW91c1ROb2RlID0gZ2V0Q3VycmVudFROb2RlKCkgYXMgVEVsZW1lbnROb2RlIHwgVEVsZW1lbnRDb250YWluZXJOb2RlIHwgVENvbnRhaW5lck5vZGU7XG4gIHJldHVybiBjcmVhdGVDb250YWluZXJSZWYocHJldmlvdXNUTm9kZSwgZ2V0TFZpZXcoKSk7XG59XG5cbmNvbnN0IFZFX1ZpZXdDb250YWluZXJSZWYgPSBWaWV3Q29udGFpbmVyUmVmO1xuXG4vLyBUT0RPKGFseGh1Yik6IGNsZWFuaW5nIHVwIHRoaXMgaW5kaXJlY3Rpb24gdHJpZ2dlcnMgYSBzdWJ0bGUgYnVnIGluIENsb3N1cmUgaW4gZzMuIE9uY2UgdGhlIGZpeFxuLy8gZm9yIHRoYXQgbGFuZHMsIHRoaXMgY2FuIGJlIGNsZWFuZWQgdXAuXG5jb25zdCBSM1ZpZXdDb250YWluZXJSZWYgPSBjbGFzcyBWaWV3Q29udGFpbmVyUmVmIGV4dGVuZHMgVkVfVmlld0NvbnRhaW5lclJlZiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBfbENvbnRhaW5lcjogTENvbnRhaW5lcixcbiAgICAgIHByaXZhdGUgX2hvc3RUTm9kZTogVEVsZW1lbnROb2RlfFRDb250YWluZXJOb2RlfFRFbGVtZW50Q29udGFpbmVyTm9kZSxcbiAgICAgIHByaXZhdGUgX2hvc3RMVmlldzogTFZpZXcpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0IGVsZW1lbnQoKTogRWxlbWVudFJlZiB7XG4gICAgcmV0dXJuIGNyZWF0ZUVsZW1lbnRSZWYodGhpcy5faG9zdFROb2RlLCB0aGlzLl9ob3N0TFZpZXcpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0IGluamVjdG9yKCk6IEluamVjdG9yIHtcbiAgICByZXR1cm4gbmV3IE5vZGVJbmplY3Rvcih0aGlzLl9ob3N0VE5vZGUsIHRoaXMuX2hvc3RMVmlldyk7XG4gIH1cblxuICAvKiogQGRlcHJlY2F0ZWQgTm8gcmVwbGFjZW1lbnQgKi9cbiAgb3ZlcnJpZGUgZ2V0IHBhcmVudEluamVjdG9yKCk6IEluamVjdG9yIHtcbiAgICBjb25zdCBwYXJlbnRMb2NhdGlvbiA9IGdldFBhcmVudEluamVjdG9yTG9jYXRpb24odGhpcy5faG9zdFROb2RlLCB0aGlzLl9ob3N0TFZpZXcpO1xuICAgIGlmIChoYXNQYXJlbnRJbmplY3RvcihwYXJlbnRMb2NhdGlvbikpIHtcbiAgICAgIGNvbnN0IHBhcmVudFZpZXcgPSBnZXRQYXJlbnRJbmplY3RvclZpZXcocGFyZW50TG9jYXRpb24sIHRoaXMuX2hvc3RMVmlldyk7XG4gICAgICBjb25zdCBpbmplY3RvckluZGV4ID0gZ2V0UGFyZW50SW5qZWN0b3JJbmRleChwYXJlbnRMb2NhdGlvbik7XG4gICAgICBuZ0Rldk1vZGUgJiYgYXNzZXJ0Tm9kZUluamVjdG9yKHBhcmVudFZpZXcsIGluamVjdG9ySW5kZXgpO1xuICAgICAgY29uc3QgcGFyZW50VE5vZGUgPVxuICAgICAgICAgIHBhcmVudFZpZXdbVFZJRVddLmRhdGFbaW5qZWN0b3JJbmRleCArIE5vZGVJbmplY3Rvck9mZnNldC5UTk9ERV0gYXMgVEVsZW1lbnROb2RlO1xuICAgICAgcmV0dXJuIG5ldyBOb2RlSW5qZWN0b3IocGFyZW50VE5vZGUsIHBhcmVudFZpZXcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IE5vZGVJbmplY3RvcihudWxsLCB0aGlzLl9ob3N0TFZpZXcpO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGNsZWFyKCk6IHZvaWQge1xuICAgIHdoaWxlICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMucmVtb3ZlKHRoaXMubGVuZ3RoIC0gMSk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0KGluZGV4OiBudW1iZXIpOiBWaWV3UmVmfG51bGwge1xuICAgIGNvbnN0IHZpZXdSZWZzID0gZ2V0Vmlld1JlZnModGhpcy5fbENvbnRhaW5lcik7XG4gICAgcmV0dXJuIHZpZXdSZWZzICE9PSBudWxsICYmIHZpZXdSZWZzW2luZGV4XSB8fCBudWxsO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9sQ29udGFpbmVyLmxlbmd0aCAtIENPTlRBSU5FUl9IRUFERVJfT0ZGU0VUO1xuICB9XG5cbiAgb3ZlcnJpZGUgY3JlYXRlRW1iZWRkZWRWaWV3PEM+KHRlbXBsYXRlUmVmOiBUZW1wbGF0ZVJlZjxDPiwgY29udGV4dD86IEMsIG9wdGlvbnM/OiB7XG4gICAgaW5kZXg/OiBudW1iZXIsXG4gICAgaW5qZWN0b3I/OiBJbmplY3RvclxuICB9KTogRW1iZWRkZWRWaWV3UmVmPEM+O1xuICBvdmVycmlkZSBjcmVhdGVFbWJlZGRlZFZpZXc8Qz4odGVtcGxhdGVSZWY6IFRlbXBsYXRlUmVmPEM+LCBjb250ZXh0PzogQywgaW5kZXg/OiBudW1iZXIpOlxuICAgICAgRW1iZWRkZWRWaWV3UmVmPEM+O1xuICBvdmVycmlkZSBjcmVhdGVFbWJlZGRlZFZpZXc8Qz4odGVtcGxhdGVSZWY6IFRlbXBsYXRlUmVmPEM+LCBjb250ZXh0PzogQywgaW5kZXhPck9wdGlvbnM/OiBudW1iZXJ8e1xuICAgIGluZGV4PzogbnVtYmVyLFxuICAgIGluamVjdG9yPzogSW5qZWN0b3JcbiAgfSk6IEVtYmVkZGVkVmlld1JlZjxDPiB7XG4gICAgbGV0IGluZGV4OiBudW1iZXJ8dW5kZWZpbmVkO1xuICAgIGxldCBpbmplY3RvcjogSW5qZWN0b3J8dW5kZWZpbmVkO1xuXG4gICAgaWYgKHR5cGVvZiBpbmRleE9yT3B0aW9ucyA9PT0gJ251bWJlcicpIHtcbiAgICAgIGluZGV4ID0gaW5kZXhPck9wdGlvbnM7XG4gICAgfSBlbHNlIGlmIChpbmRleE9yT3B0aW9ucyAhPSBudWxsKSB7XG4gICAgICBpbmRleCA9IGluZGV4T3JPcHRpb25zLmluZGV4O1xuICAgICAgaW5qZWN0b3IgPSBpbmRleE9yT3B0aW9ucy5pbmplY3RvcjtcbiAgICB9XG5cbiAgICBsZXQgaHlkcmF0aW9uSW5mbzogTmdoVmlld0luc3RhbmNlfG51bGwgPSBudWxsO1xuICAgIGNvbnN0IHNzcklkID0gKHRlbXBsYXRlUmVmIGFzIHVua25vd24gYXMge3NzcklkOiBzdHJpbmcgfCBudWxsfSkuc3NySWQ7XG4gICAgaWYgKHNzcklkKSB7XG4gICAgICBoeWRyYXRpb25JbmZvID0gZmluZE1hdGNoaW5nRGVoeWRyYXRlZFZpZXcodGhpcy5fbENvbnRhaW5lciwgc3NySWQpO1xuICAgIH1cblxuICAgIGNvbnN0IHZpZXdSZWYgPSB0ZW1wbGF0ZVJlZi5jcmVhdGVFbWJlZGRlZFZpZXdJbXBsKGNvbnRleHQgfHwgPGFueT57fSwgaW5qZWN0b3IsIGh5ZHJhdGlvbkluZm8pO1xuXG4gICAgdGhpcy5pbnNlcnRJbXBsKHZpZXdSZWYsIGluZGV4LCAhIWh5ZHJhdGlvbkluZm8pO1xuICAgIHJldHVybiB2aWV3UmVmO1xuICB9XG5cbiAgb3ZlcnJpZGUgY3JlYXRlQ29tcG9uZW50PEM+KGNvbXBvbmVudFR5cGU6IFR5cGU8Qz4sIG9wdGlvbnM/OiB7XG4gICAgaW5kZXg/OiBudW1iZXIsXG4gICAgaW5qZWN0b3I/OiBJbmplY3RvcixcbiAgICBwcm9qZWN0YWJsZU5vZGVzPzogTm9kZVtdW10sXG4gICAgbmdNb2R1bGVSZWY/OiBOZ01vZHVsZVJlZjx1bmtub3duPixcbiAgICBsYXp5PzogYm9vbGVhbixcbiAgfSk6IENvbXBvbmVudFJlZjxDPjtcbiAgLyoqXG4gICAqIEBkZXByZWNhdGVkIEFuZ3VsYXIgbm8gbG9uZ2VyIHJlcXVpcmVzIGNvbXBvbmVudCBmYWN0b3JpZXMgdG8gZHluYW1pY2FsbHkgY3JlYXRlIGNvbXBvbmVudHMuXG4gICAqICAgICBVc2UgZGlmZmVyZW50IHNpZ25hdHVyZSBvZiB0aGUgYGNyZWF0ZUNvbXBvbmVudGAgbWV0aG9kLCB3aGljaCBhbGxvd3MgcGFzc2luZ1xuICAgKiAgICAgQ29tcG9uZW50IGNsYXNzIGRpcmVjdGx5LlxuICAgKi9cbiAgb3ZlcnJpZGUgY3JlYXRlQ29tcG9uZW50PEM+KFxuICAgICAgY29tcG9uZW50RmFjdG9yeTogQ29tcG9uZW50RmFjdG9yeTxDPiwgaW5kZXg/OiBudW1iZXJ8dW5kZWZpbmVkLFxuICAgICAgaW5qZWN0b3I/OiBJbmplY3Rvcnx1bmRlZmluZWQsIHByb2plY3RhYmxlTm9kZXM/OiBhbnlbXVtdfHVuZGVmaW5lZCxcbiAgICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yfE5nTW9kdWxlUmVmPGFueT58dW5kZWZpbmVkLFxuICAgICAgbGF6eT86IGJvb2xlYW4pOiBDb21wb25lbnRSZWY8Qz47XG4gIG92ZXJyaWRlIGNyZWF0ZUNvbXBvbmVudDxDPihcbiAgICAgIGNvbXBvbmVudEZhY3RvcnlPclR5cGU6IENvbXBvbmVudEZhY3Rvcnk8Qz58VHlwZTxDPiwgaW5kZXhPck9wdGlvbnM/OiBudW1iZXJ8dW5kZWZpbmVkfHtcbiAgICAgICAgaW5kZXg/OiBudW1iZXIsXG4gICAgICAgIGluamVjdG9yPzogSW5qZWN0b3IsXG4gICAgICAgIG5nTW9kdWxlUmVmPzogTmdNb2R1bGVSZWY8dW5rbm93bj4sXG4gICAgICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yfE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgICAgICBwcm9qZWN0YWJsZU5vZGVzPzogTm9kZVtdW10sXG4gICAgICAgIGxhenk/OiBib29sZWFuLFxuICAgICAgfSxcbiAgICAgIGluamVjdG9yPzogSW5qZWN0b3J8dW5kZWZpbmVkLCBwcm9qZWN0YWJsZU5vZGVzPzogYW55W11bXXx1bmRlZmluZWQsXG4gICAgICBlbnZpcm9ubWVudEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3RvcnxOZ01vZHVsZVJlZjxhbnk+fHVuZGVmaW5lZCxcbiAgICAgIGxhenk/OiBib29sZWFuKTogQ29tcG9uZW50UmVmPEM+IHtcbiAgICBjb25zdCBpc0NvbXBvbmVudEZhY3RvcnkgPSBjb21wb25lbnRGYWN0b3J5T3JUeXBlICYmICFpc1R5cGUoY29tcG9uZW50RmFjdG9yeU9yVHlwZSk7XG4gICAgbGV0IGluZGV4OiBudW1iZXJ8dW5kZWZpbmVkO1xuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBzdXBwb3J0cyAyIHNpZ25hdHVyZXMgYW5kIHdlIG5lZWQgdG8gaGFuZGxlIG9wdGlvbnMgY29ycmVjdGx5IGZvciBib3RoOlxuICAgIC8vICAgMS4gV2hlbiBmaXJzdCBhcmd1bWVudCBpcyBhIENvbXBvbmVudCB0eXBlLiBUaGlzIHNpZ25hdHVyZSBhbHNvIHJlcXVpcmVzIGV4dHJhXG4gICAgLy8gICAgICBvcHRpb25zIHRvIGJlIHByb3ZpZGVkIGFzIGFzIG9iamVjdCAobW9yZSBlcmdvbm9taWMgb3B0aW9uKS5cbiAgICAvLyAgIDIuIEZpcnN0IGFyZ3VtZW50IGlzIGEgQ29tcG9uZW50IGZhY3RvcnkuIEluIHRoaXMgY2FzZSBleHRyYSBvcHRpb25zIGFyZSByZXByZXNlbnRlZCBhc1xuICAgIC8vICAgICAgcG9zaXRpb25hbCBhcmd1bWVudHMuIFRoaXMgc2lnbmF0dXJlIGlzIGxlc3MgZXJnb25vbWljIGFuZCB3aWxsIGJlIGRlcHJlY2F0ZWQuXG4gICAgaWYgKGlzQ29tcG9uZW50RmFjdG9yeSkge1xuICAgICAgaWYgKG5nRGV2TW9kZSkge1xuICAgICAgICBhc3NlcnRFcXVhbChcbiAgICAgICAgICAgIHR5cGVvZiBpbmRleE9yT3B0aW9ucyAhPT0gJ29iamVjdCcsIHRydWUsXG4gICAgICAgICAgICAnSXQgbG9va3MgbGlrZSBDb21wb25lbnQgZmFjdG9yeSB3YXMgcHJvdmlkZWQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50ICcgK1xuICAgICAgICAgICAgICAgICdhbmQgYW4gb3B0aW9ucyBvYmplY3QgYXMgdGhlIHNlY29uZCBhcmd1bWVudC4gVGhpcyBjb21iaW5hdGlvbiBvZiBhcmd1bWVudHMgJyArXG4gICAgICAgICAgICAgICAgJ2lzIGluY29tcGF0aWJsZS4gWW91IGNhbiBlaXRoZXIgY2hhbmdlIHRoZSBmaXJzdCBhcmd1bWVudCB0byBwcm92aWRlIENvbXBvbmVudCAnICtcbiAgICAgICAgICAgICAgICAndHlwZSBvciBjaGFuZ2UgdGhlIHNlY29uZCBhcmd1bWVudCB0byBiZSBhIG51bWJlciAocmVwcmVzZW50aW5nIGFuIGluZGV4IGF0ICcgK1xuICAgICAgICAgICAgICAgICd3aGljaCB0byBpbnNlcnQgdGhlIG5ldyBjb21wb25lbnRcXCdzIGhvc3QgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyKScpO1xuICAgICAgfVxuICAgICAgaW5kZXggPSBpbmRleE9yT3B0aW9ucyBhcyBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChuZ0Rldk1vZGUpIHtcbiAgICAgICAgYXNzZXJ0RGVmaW5lZChcbiAgICAgICAgICAgIGdldENvbXBvbmVudERlZihjb21wb25lbnRGYWN0b3J5T3JUeXBlKSxcbiAgICAgICAgICAgIGBQcm92aWRlZCBDb21wb25lbnQgY2xhc3MgZG9lc24ndCBjb250YWluIENvbXBvbmVudCBkZWZpbml0aW9uLiBgICtcbiAgICAgICAgICAgICAgICBgUGxlYXNlIGNoZWNrIHdoZXRoZXIgcHJvdmlkZWQgY2xhc3MgaGFzIEBDb21wb25lbnQgZGVjb3JhdG9yLmApO1xuICAgICAgICBhc3NlcnRFcXVhbChcbiAgICAgICAgICAgIHR5cGVvZiBpbmRleE9yT3B0aW9ucyAhPT0gJ251bWJlcicsIHRydWUsXG4gICAgICAgICAgICAnSXQgbG9va3MgbGlrZSBDb21wb25lbnQgdHlwZSB3YXMgcHJvdmlkZWQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50ICcgK1xuICAgICAgICAgICAgICAgICdhbmQgYSBudW1iZXIgKHJlcHJlc2VudGluZyBhbiBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIG5ldyBjb21wb25lbnRcXCdzICcgK1xuICAgICAgICAgICAgICAgICdob3N0IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lciBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50LiBUaGlzIGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyAnICtcbiAgICAgICAgICAgICAgICAnaXMgaW5jb21wYXRpYmxlLiBQbGVhc2UgdXNlIGFuIG9iamVjdCBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50IGluc3RlYWQuJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBvcHRpb25zID0gKGluZGV4T3JPcHRpb25zIHx8IHt9KSBhcyB7XG4gICAgICAgIGluZGV4PzogbnVtYmVyLFxuICAgICAgICBpbmplY3Rvcj86IEluamVjdG9yLFxuICAgICAgICBuZ01vZHVsZVJlZj86IE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgICAgICBlbnZpcm9ubWVudEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3RvciB8IE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgICAgICBwcm9qZWN0YWJsZU5vZGVzPzogTm9kZVtdW10sXG4gICAgICAgIGxhenk/OiBib29sZWFuLFxuICAgICAgfTtcbiAgICAgIGlmIChuZ0Rldk1vZGUgJiYgb3B0aW9ucy5lbnZpcm9ubWVudEluamVjdG9yICYmIG9wdGlvbnMubmdNb2R1bGVSZWYpIHtcbiAgICAgICAgdGhyb3dFcnJvcihcbiAgICAgICAgICAgIGBDYW5ub3QgcGFzcyBib3RoIGVudmlyb25tZW50SW5qZWN0b3IgYW5kIG5nTW9kdWxlUmVmIG9wdGlvbnMgdG8gY3JlYXRlQ29tcG9uZW50KCkuYCk7XG4gICAgICB9XG4gICAgICBpbmRleCA9IG9wdGlvbnMuaW5kZXg7XG4gICAgICBpbmplY3RvciA9IG9wdGlvbnMuaW5qZWN0b3I7XG4gICAgICBwcm9qZWN0YWJsZU5vZGVzID0gb3B0aW9ucy5wcm9qZWN0YWJsZU5vZGVzO1xuICAgICAgZW52aXJvbm1lbnRJbmplY3RvciA9IG9wdGlvbnMuZW52aXJvbm1lbnRJbmplY3RvciB8fCBvcHRpb25zLm5nTW9kdWxlUmVmO1xuICAgICAgbGF6eSA9IG9wdGlvbnMubGF6eTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21wb25lbnRGYWN0b3J5OiBDb21wb25lbnRGYWN0b3J5PEM+ID0gaXNDb21wb25lbnRGYWN0b3J5ID9cbiAgICAgICAgY29tcG9uZW50RmFjdG9yeU9yVHlwZSBhcyBDb21wb25lbnRGYWN0b3J5PEM+OlxuICAgICAgICBuZXcgUjNDb21wb25lbnRGYWN0b3J5KGdldENvbXBvbmVudERlZihjb21wb25lbnRGYWN0b3J5T3JUeXBlKSEpO1xuICAgIGNvbnN0IGNvbnRleHRJbmplY3RvciA9IGluamVjdG9yIHx8IHRoaXMucGFyZW50SW5qZWN0b3I7XG5cbiAgICAvLyBJZiBhbiBgTmdNb2R1bGVSZWZgIGlzIG5vdCBwcm92aWRlZCBleHBsaWNpdGx5LCB0cnkgcmV0cmlldmluZyBpdCBmcm9tIHRoZSBESSB0cmVlLlxuICAgIGlmICghZW52aXJvbm1lbnRJbmplY3RvciAmJiAoY29tcG9uZW50RmFjdG9yeSBhcyBhbnkpLm5nTW9kdWxlID09IG51bGwpIHtcbiAgICAgIC8vIEZvciB0aGUgYENvbXBvbmVudEZhY3RvcnlgIGNhc2UsIGVudGVyaW5nIHRoaXMgbG9naWMgaXMgdmVyeSB1bmxpa2VseSwgc2luY2Ugd2UgZXhwZWN0IHRoYXRcbiAgICAgIC8vIGFuIGluc3RhbmNlIG9mIGEgYENvbXBvbmVudEZhY3RvcnlgLCByZXNvbHZlZCB2aWEgYENvbXBvbmVudEZhY3RvcnlSZXNvbHZlcmAgd291bGQgaGF2ZSBhblxuICAgICAgLy8gYG5nTW9kdWxlYCBmaWVsZC4gVGhpcyBpcyBwb3NzaWJsZSBpbiBzb21lIHRlc3Qgc2NlbmFyaW9zIGFuZCBwb3RlbnRpYWxseSBpbiBzb21lIEpJVC1iYXNlZFxuICAgICAgLy8gdXNlLWNhc2VzLiBGb3IgdGhlIGBDb21wb25lbnRGYWN0b3J5YCBjYXNlIHdlIHByZXNlcnZlIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IGFuZCB0cnlcbiAgICAgIC8vIHVzaW5nIGEgcHJvdmlkZWQgaW5qZWN0b3IgZmlyc3QsIHRoZW4gZmFsbCBiYWNrIHRvIHRoZSBwYXJlbnQgaW5qZWN0b3Igb2YgdGhpc1xuICAgICAgLy8gYFZpZXdDb250YWluZXJSZWZgIGluc3RhbmNlLlxuICAgICAgLy9cbiAgICAgIC8vIEZvciB0aGUgZmFjdG9yeS1sZXNzIGNhc2UsIGl0J3MgY3JpdGljYWwgdG8gZXN0YWJsaXNoIGEgY29ubmVjdGlvbiB3aXRoIHRoZSBtb2R1bGVcbiAgICAgIC8vIGluamVjdG9yIHRyZWUgKGJ5IHJldHJpZXZpbmcgYW4gaW5zdGFuY2Ugb2YgYW4gYE5nTW9kdWxlUmVmYCBhbmQgYWNjZXNzaW5nIGl0cyBpbmplY3RvciksXG4gICAgICAvLyBzbyB0aGF0IGEgY29tcG9uZW50IGNhbiB1c2UgREkgdG9rZW5zIHByb3ZpZGVkIGluIE1nTW9kdWxlcy4gRm9yIHRoaXMgcmVhc29uLCB3ZSBjYW4gbm90XG4gICAgICAvLyByZWx5IG9uIHRoZSBwcm92aWRlZCBpbmplY3Rvciwgc2luY2UgaXQgbWlnaHQgYmUgZGV0YWNoZWQgZnJvbSB0aGUgREkgdHJlZSAoZm9yIGV4YW1wbGUsIGlmXG4gICAgICAvLyBpdCB3YXMgY3JlYXRlZCB2aWEgYEluamVjdG9yLmNyZWF0ZWAgd2l0aG91dCBzcGVjaWZ5aW5nIGEgcGFyZW50IGluamVjdG9yLCBvciBpZiBhblxuICAgICAgLy8gaW5qZWN0b3IgaXMgcmV0cmlldmVkIGZyb20gYW4gYE5nTW9kdWxlUmVmYCBjcmVhdGVkIHZpYSBgY3JlYXRlTmdNb2R1bGVgIHVzaW5nIGFuXG4gICAgICAvLyBOZ01vZHVsZSBvdXRzaWRlIG9mIGEgbW9kdWxlIHRyZWUpLiBJbnN0ZWFkLCB3ZSBhbHdheXMgdXNlIGBWaWV3Q29udGFpbmVyUmVmYCdzIHBhcmVudFxuICAgICAgLy8gaW5qZWN0b3IsIHdoaWNoIGlzIG5vcm1hbGx5IGNvbm5lY3RlZCB0byB0aGUgREkgdHJlZSwgd2hpY2ggaW5jbHVkZXMgbW9kdWxlIGluamVjdG9yXG4gICAgICAvLyBzdWJ0cmVlLlxuICAgICAgY29uc3QgX2luamVjdG9yID0gaXNDb21wb25lbnRGYWN0b3J5ID8gY29udGV4dEluamVjdG9yIDogdGhpcy5wYXJlbnRJbmplY3RvcjtcblxuICAgICAgLy8gRE8gTk9UIFJFRkFDVE9SLiBUaGUgY29kZSBoZXJlIHVzZWQgdG8gaGF2ZSBhIGBpbmplY3Rvci5nZXQoTmdNb2R1bGVSZWYsIG51bGwpIHx8XG4gICAgICAvLyB1bmRlZmluZWRgIGV4cHJlc3Npb24gd2hpY2ggc2VlbXMgdG8gY2F1c2UgaW50ZXJuYWwgZ29vZ2xlIGFwcHMgdG8gZmFpbC4gVGhpcyBpcyBkb2N1bWVudGVkXG4gICAgICAvLyBpbiB0aGUgZm9sbG93aW5nIGludGVybmFsIGJ1ZyBpc3N1ZTogZ28vYi8xNDI5Njc4MDJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IF9pbmplY3Rvci5nZXQoRW52aXJvbm1lbnRJbmplY3RvciwgbnVsbCk7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIGVudmlyb25tZW50SW5qZWN0b3IgPSByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgY29tcG9uZW50RGVmID0gZ2V0Q29tcG9uZW50RGVmKGNvbXBvbmVudEZhY3RvcnkuY29tcG9uZW50VHlwZSkhO1xuICAgIGNvbnN0IGRlaHlkcmF0ZWRWaWV3ID0gZmluZE1hdGNoaW5nRGVoeWRyYXRlZFZpZXcodGhpcy5fbENvbnRhaW5lciwgY29tcG9uZW50RGVmLmlkKTtcbiAgICBsZXQgck5vZGU7XG4gICAgbGV0IGh5ZHJhdGlvbkluZm86IE5naERvbUluc3RhbmNlfG51bGwgPSBudWxsO1xuXG4gICAgaWYgKGRlaHlkcmF0ZWRWaWV3KSB7XG4gICAgICAvLyBQb2ludGVyIHRvIGEgaG9zdCBET00gZWxlbWVudC5cbiAgICAgIHJOb2RlID0gZGVoeWRyYXRlZFZpZXcuZmlyc3RDaGlsZDtcblxuICAgICAgLy8gUmVhZCBoeWRyYXRpb24gaW5mbyBhbmQgcGFzcyBpdCBvdmVyIHRvIHRoZSBjb21wb25lbnQgdmlldy5cbiAgICAgIGh5ZHJhdGlvbkluZm8gPSByZXRyaWV2ZU5naEluZm8ock5vZGUgYXMgUkVsZW1lbnQsIGVudmlyb25tZW50SW5qZWN0b3IgYXMgSW5qZWN0b3IpO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBvbmVudFJlZiA9IGNvbXBvbmVudEZhY3RvcnkuY3JlYXRlSW1wbChcbiAgICAgICAgY29udGV4dEluamVjdG9yLCBwcm9qZWN0YWJsZU5vZGVzLCByTm9kZSwgZW52aXJvbm1lbnRJbmplY3RvciwgaHlkcmF0aW9uSW5mbywgbGF6eSk7XG4gICAgdGhpcy5pbnNlcnRJbXBsKGNvbXBvbmVudFJlZi5ob3N0VmlldywgaW5kZXgsICEhaHlkcmF0aW9uSW5mbyk7XG4gICAgcmV0dXJuIGNvbXBvbmVudFJlZjtcbiAgfVxuXG4gIG92ZXJyaWRlIGluc2VydCh2aWV3UmVmOiBWaWV3UmVmLCBpbmRleD86IG51bWJlcik6IFZpZXdSZWYge1xuICAgIHJldHVybiB0aGlzLmluc2VydEltcGwodmlld1JlZiwgaW5kZXgsIGZhbHNlKTtcbiAgfVxuXG4gIHByaXZhdGUgaW5zZXJ0SW1wbCh2aWV3UmVmOiBWaWV3UmVmLCBpbmRleD86IG51bWJlciwgcHJldmVudERPTUluc2VydGlvbj86IGJvb2xlYW4pOiBWaWV3UmVmIHtcbiAgICBjb25zdCBsVmlldyA9ICh2aWV3UmVmIGFzIFIzVmlld1JlZjxhbnk+KS5fbFZpZXchO1xuICAgIGNvbnN0IHRWaWV3ID0gbFZpZXdbVFZJRVddO1xuXG4gICAgaWYgKG5nRGV2TW9kZSAmJiB2aWV3UmVmLmRlc3Ryb3llZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgaW5zZXJ0IGEgZGVzdHJveWVkIFZpZXcgaW4gYSBWaWV3Q29udGFpbmVyIScpO1xuICAgIH1cblxuICAgIGlmICh2aWV3QXR0YWNoZWRUb0NvbnRhaW5lcihsVmlldykpIHtcbiAgICAgIC8vIElmIHZpZXcgaXMgYWxyZWFkeSBhdHRhY2hlZCwgZGV0YWNoIGl0IGZpcnN0IHNvIHdlIGNsZWFuIHVwIHJlZmVyZW5jZXMgYXBwcm9wcmlhdGVseS5cblxuICAgICAgY29uc3QgcHJldklkeCA9IHRoaXMuaW5kZXhPZih2aWV3UmVmKTtcblxuICAgICAgLy8gQSB2aWV3IG1pZ2h0IGJlIGF0dGFjaGVkIGVpdGhlciB0byB0aGlzIG9yIGEgZGlmZmVyZW50IGNvbnRhaW5lci4gVGhlIGBwcmV2SWR4YCBmb3JcbiAgICAgIC8vIHRob3NlIGNhc2VzIHdpbGwgYmU6XG4gICAgICAvLyBlcXVhbCB0byAtMSBmb3Igdmlld3MgYXR0YWNoZWQgdG8gdGhpcyBWaWV3Q29udGFpbmVyUmVmXG4gICAgICAvLyA+PSAwIGZvciB2aWV3cyBhdHRhY2hlZCB0byBhIGRpZmZlcmVudCBWaWV3Q29udGFpbmVyUmVmXG4gICAgICBpZiAocHJldklkeCAhPT0gLTEpIHtcbiAgICAgICAgdGhpcy5kZXRhY2gocHJldklkeCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwcmV2TENvbnRhaW5lciA9IGxWaWV3W1BBUkVOVF0gYXMgTENvbnRhaW5lcjtcbiAgICAgICAgbmdEZXZNb2RlICYmXG4gICAgICAgICAgICBhc3NlcnRFcXVhbChcbiAgICAgICAgICAgICAgICBpc0xDb250YWluZXIocHJldkxDb250YWluZXIpLCB0cnVlLFxuICAgICAgICAgICAgICAgICdBbiBhdHRhY2hlZCB2aWV3IHNob3VsZCBoYXZlIGl0cyBQQVJFTlQgcG9pbnQgdG8gYSBjb250YWluZXIuJyk7XG5cblxuICAgICAgICAvLyBXZSBuZWVkIHRvIHJlLWNyZWF0ZSBhIFIzVmlld0NvbnRhaW5lclJlZiBpbnN0YW5jZSBzaW5jZSB0aG9zZSBhcmUgbm90IHN0b3JlZCBvblxuICAgICAgICAvLyBMVmlldyAobm9yIGFueXdoZXJlIGVsc2UpLlxuICAgICAgICBjb25zdCBwcmV2VkNSZWYgPSBuZXcgUjNWaWV3Q29udGFpbmVyUmVmKFxuICAgICAgICAgICAgcHJldkxDb250YWluZXIsIHByZXZMQ29udGFpbmVyW1RfSE9TVF0gYXMgVERpcmVjdGl2ZUhvc3ROb2RlLCBwcmV2TENvbnRhaW5lcltQQVJFTlRdKTtcblxuICAgICAgICBwcmV2VkNSZWYuZGV0YWNoKHByZXZWQ1JlZi5pbmRleE9mKHZpZXdSZWYpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBMb2dpY2FsIG9wZXJhdGlvbiBvZiBhZGRpbmcgYExWaWV3YCB0byBgTENvbnRhaW5lcmBcbiAgICBjb25zdCBhZGp1c3RlZElkeCA9IHRoaXMuX2FkanVzdEluZGV4KGluZGV4KTtcbiAgICBjb25zdCBsQ29udGFpbmVyID0gdGhpcy5fbENvbnRhaW5lcjtcbiAgICBpbnNlcnRWaWV3KHRWaWV3LCBsVmlldywgbENvbnRhaW5lciwgYWRqdXN0ZWRJZHgpO1xuXG4gICAgLy8gUGh5c2ljYWwgb3BlcmF0aW9uIG9mIGFkZGluZyB0aGUgRE9NIG5vZGVzLlxuICAgIGlmICghcHJldmVudERPTUluc2VydGlvbikge1xuICAgICAgY29uc3QgYmVmb3JlTm9kZSA9IGdldEJlZm9yZU5vZGVGb3JWaWV3KGFkanVzdGVkSWR4LCBsQ29udGFpbmVyKTtcbiAgICAgIGNvbnN0IHJlbmRlcmVyID0gbFZpZXdbUkVOREVSRVJdO1xuICAgICAgY29uc3QgcGFyZW50Uk5vZGUgPSBuYXRpdmVQYXJlbnROb2RlKHJlbmRlcmVyLCBsQ29udGFpbmVyW05BVElWRV0gYXMgUkVsZW1lbnQgfCBSQ29tbWVudCk7XG4gICAgICBpZiAocGFyZW50Uk5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgYWRkVmlld1RvQ29udGFpbmVyKHRWaWV3LCBsQ29udGFpbmVyW1RfSE9TVF0sIHJlbmRlcmVyLCBsVmlldywgcGFyZW50Uk5vZGUsIGJlZm9yZU5vZGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgICh2aWV3UmVmIGFzIFIzVmlld1JlZjxhbnk+KS5hdHRhY2hUb1ZpZXdDb250YWluZXJSZWYoKTtcbiAgICBhZGRUb0FycmF5KGdldE9yQ3JlYXRlVmlld1JlZnMobENvbnRhaW5lciksIGFkanVzdGVkSWR4LCB2aWV3UmVmKTtcblxuICAgIHJldHVybiB2aWV3UmVmO1xuICB9XG5cbiAgb3ZlcnJpZGUgbW92ZSh2aWV3UmVmOiBWaWV3UmVmLCBuZXdJbmRleDogbnVtYmVyKTogVmlld1JlZiB7XG4gICAgaWYgKG5nRGV2TW9kZSAmJiB2aWV3UmVmLmRlc3Ryb3llZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgbW92ZSBhIGRlc3Ryb3llZCBWaWV3IGluIGEgVmlld0NvbnRhaW5lciEnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaW5zZXJ0KHZpZXdSZWYsIG5ld0luZGV4KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGluZGV4T2Yodmlld1JlZjogVmlld1JlZik6IG51bWJlciB7XG4gICAgY29uc3Qgdmlld1JlZnNBcnIgPSBnZXRWaWV3UmVmcyh0aGlzLl9sQ29udGFpbmVyKTtcbiAgICByZXR1cm4gdmlld1JlZnNBcnIgIT09IG51bGwgPyB2aWV3UmVmc0Fyci5pbmRleE9mKHZpZXdSZWYpIDogLTE7XG4gIH1cblxuICBvdmVycmlkZSByZW1vdmUoaW5kZXg/OiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBhZGp1c3RlZElkeCA9IHRoaXMuX2FkanVzdEluZGV4KGluZGV4LCAtMSk7XG4gICAgY29uc3QgZGV0YWNoZWRWaWV3ID0gZGV0YWNoVmlldyh0aGlzLl9sQ29udGFpbmVyLCBhZGp1c3RlZElkeCk7XG5cbiAgICBpZiAoZGV0YWNoZWRWaWV3KSB7XG4gICAgICAvLyBCZWZvcmUgZGVzdHJveWluZyB0aGUgdmlldywgcmVtb3ZlIGl0IGZyb20gdGhlIGNvbnRhaW5lcidzIGFycmF5IG9mIGBWaWV3UmVmYHMuXG4gICAgICAvLyBUaGlzIGVuc3VyZXMgdGhlIHZpZXcgY29udGFpbmVyIGxlbmd0aCBpcyB1cGRhdGVkIGJlZm9yZSBjYWxsaW5nXG4gICAgICAvLyBgZGVzdHJveUxWaWV3YCwgd2hpY2ggY291bGQgcmVjdXJzaXZlbHkgY2FsbCB2aWV3IGNvbnRhaW5lciBtZXRob2RzIHRoYXRcbiAgICAgIC8vIHJlbHkgb24gYW4gYWNjdXJhdGUgY29udGFpbmVyIGxlbmd0aC5cbiAgICAgIC8vIChlLmcuIGEgbWV0aG9kIG9uIHRoaXMgdmlldyBjb250YWluZXIgYmVpbmcgY2FsbGVkIGJ5IGEgY2hpbGQgZGlyZWN0aXZlJ3MgT25EZXN0cm95XG4gICAgICAvLyBsaWZlY3ljbGUgaG9vaylcbiAgICAgIHJlbW92ZUZyb21BcnJheShnZXRPckNyZWF0ZVZpZXdSZWZzKHRoaXMuX2xDb250YWluZXIpLCBhZGp1c3RlZElkeCk7XG4gICAgICBkZXN0cm95TFZpZXcoZGV0YWNoZWRWaWV3W1RWSUVXXSwgZGV0YWNoZWRWaWV3KTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBkZXRhY2goaW5kZXg/OiBudW1iZXIpOiBWaWV3UmVmfG51bGwge1xuICAgIGNvbnN0IGFkanVzdGVkSWR4ID0gdGhpcy5fYWRqdXN0SW5kZXgoaW5kZXgsIC0xKTtcbiAgICBjb25zdCB2aWV3ID0gZGV0YWNoVmlldyh0aGlzLl9sQ29udGFpbmVyLCBhZGp1c3RlZElkeCk7XG5cbiAgICBjb25zdCB3YXNEZXRhY2hlZCA9XG4gICAgICAgIHZpZXcgJiYgcmVtb3ZlRnJvbUFycmF5KGdldE9yQ3JlYXRlVmlld1JlZnModGhpcy5fbENvbnRhaW5lciksIGFkanVzdGVkSWR4KSAhPSBudWxsO1xuICAgIHJldHVybiB3YXNEZXRhY2hlZCA/IG5ldyBSM1ZpZXdSZWYodmlldyEpIDogbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgX2FkanVzdEluZGV4KGluZGV4PzogbnVtYmVyLCBzaGlmdDogbnVtYmVyID0gMCkge1xuICAgIGlmIChpbmRleCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5sZW5ndGggKyBzaGlmdDtcbiAgICB9XG4gICAgaWYgKG5nRGV2TW9kZSkge1xuICAgICAgYXNzZXJ0R3JlYXRlclRoYW4oaW5kZXgsIC0xLCBgVmlld1JlZiBpbmRleCBtdXN0IGJlIHBvc2l0aXZlLCBnb3QgJHtpbmRleH1gKTtcbiAgICAgIC8vICsxIGJlY2F1c2UgaXQncyBsZWdhbCB0byBpbnNlcnQgYXQgdGhlIGVuZC5cbiAgICAgIGFzc2VydExlc3NUaGFuKGluZGV4LCB0aGlzLmxlbmd0aCArIDEgKyBzaGlmdCwgJ2luZGV4Jyk7XG4gICAgfVxuICAgIHJldHVybiBpbmRleDtcbiAgfVxufTtcblxuZnVuY3Rpb24gZ2V0Vmlld1JlZnMobENvbnRhaW5lcjogTENvbnRhaW5lcik6IFZpZXdSZWZbXXxudWxsIHtcbiAgcmV0dXJuIGxDb250YWluZXJbVklFV19SRUZTXSBhcyBWaWV3UmVmW107XG59XG5cbmZ1bmN0aW9uIGdldE9yQ3JlYXRlVmlld1JlZnMobENvbnRhaW5lcjogTENvbnRhaW5lcik6IFZpZXdSZWZbXSB7XG4gIHJldHVybiAobENvbnRhaW5lcltWSUVXX1JFRlNdIHx8IChsQ29udGFpbmVyW1ZJRVdfUkVGU10gPSBbXSkpIGFzIFZpZXdSZWZbXTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgVmlld0NvbnRhaW5lclJlZiBhbmQgc3RvcmVzIGl0IG9uIHRoZSBpbmplY3Rvci5cbiAqXG4gKiBAcGFyYW0gVmlld0NvbnRhaW5lclJlZlRva2VuIFRoZSBWaWV3Q29udGFpbmVyUmVmIHR5cGVcbiAqIEBwYXJhbSBFbGVtZW50UmVmVG9rZW4gVGhlIEVsZW1lbnRSZWYgdHlwZVxuICogQHBhcmFtIGhvc3RUTm9kZSBUaGUgbm9kZSB0aGF0IGlzIHJlcXVlc3RpbmcgYSBWaWV3Q29udGFpbmVyUmVmXG4gKiBAcGFyYW0gaG9zdExWaWV3IFRoZSB2aWV3IHRvIHdoaWNoIHRoZSBub2RlIGJlbG9uZ3NcbiAqIEByZXR1cm5zIFRoZSBWaWV3Q29udGFpbmVyUmVmIGluc3RhbmNlIHRvIHVzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29udGFpbmVyUmVmKFxuICAgIGhvc3RUTm9kZTogVEVsZW1lbnROb2RlfFRDb250YWluZXJOb2RlfFRFbGVtZW50Q29udGFpbmVyTm9kZSxcbiAgICBob3N0TFZpZXc6IExWaWV3KTogVmlld0NvbnRhaW5lclJlZiB7XG4gIG5nRGV2TW9kZSAmJiBhc3NlcnRUTm9kZVR5cGUoaG9zdFROb2RlLCBUTm9kZVR5cGUuQW55Q29udGFpbmVyIHwgVE5vZGVUeXBlLkFueVJOb2RlKTtcblxuICBsZXQgbENvbnRhaW5lcjogTENvbnRhaW5lcjtcbiAgY29uc3Qgc2xvdFZhbHVlID0gaG9zdExWaWV3W2hvc3RUTm9kZS5pbmRleF07XG4gIGlmIChpc0xDb250YWluZXIoc2xvdFZhbHVlKSkge1xuICAgIC8vIElmIHRoZSBob3N0IGlzIGEgY29udGFpbmVyLCB3ZSBkb24ndCBuZWVkIHRvIGNyZWF0ZSBhIG5ldyBMQ29udGFpbmVyXG4gICAgbENvbnRhaW5lciA9IHNsb3RWYWx1ZTtcbiAgfSBlbHNlIHtcbiAgICBsQ29udGFpbmVyID0gX2xvY2F0ZU9yQ3JlYXRlQ29udGFpbmVyUmVmSW1wbChob3N0TFZpZXcsIGhvc3RUTm9kZSwgc2xvdFZhbHVlKTtcbiAgICBob3N0TFZpZXdbaG9zdFROb2RlLmluZGV4XSA9IGxDb250YWluZXI7XG4gICAgYWRkVG9WaWV3VHJlZShob3N0TFZpZXcsIGxDb250YWluZXIpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSM1ZpZXdDb250YWluZXJSZWYobENvbnRhaW5lciwgaG9zdFROb2RlLCBob3N0TFZpZXcpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRBbmNob3JOb2RlKGhvc3RMVmlldzogTFZpZXcsIGhvc3RUTm9kZTogVE5vZGUpOiBSQ29tbWVudCB7XG4gIC8vIElmIHRoZSBob3N0IGlzIGEgcmVndWxhciBlbGVtZW50LCB3ZSBoYXZlIHRvIGluc2VydCBhIGNvbW1lbnQgbm9kZSBtYW51YWxseSB3aGljaCB3aWxsXG4gIC8vIGJlIHVzZWQgYXMgYW4gYW5jaG9yIHdoZW4gaW5zZXJ0aW5nIGVsZW1lbnRzLiBJbiB0aGlzIHNwZWNpZmljIGNhc2Ugd2UgdXNlIGxvdy1sZXZlbCBET01cbiAgLy8gbWFuaXB1bGF0aW9uIHRvIGluc2VydCBpdC5cbiAgY29uc3QgcmVuZGVyZXIgPSBob3N0TFZpZXdbUkVOREVSRVJdO1xuICBuZ0Rldk1vZGUgJiYgbmdEZXZNb2RlLnJlbmRlcmVyQ3JlYXRlQ29tbWVudCsrO1xuICBjb25zdCBjb21tZW50Tm9kZSA9IHJlbmRlcmVyLmNyZWF0ZUNvbW1lbnQobmdEZXZNb2RlID8gJ2NvbnRhaW5lcicgOiAnJyk7XG5cbiAgY29uc3QgaG9zdE5hdGl2ZSA9IGdldE5hdGl2ZUJ5VE5vZGUoaG9zdFROb2RlLCBob3N0TFZpZXcpITtcbiAgY29uc3QgcGFyZW50T2ZIb3N0TmF0aXZlID0gbmF0aXZlUGFyZW50Tm9kZShyZW5kZXJlciwgaG9zdE5hdGl2ZSk7XG4gIG5hdGl2ZUluc2VydEJlZm9yZShcbiAgICAgIHJlbmRlcmVyLCBwYXJlbnRPZkhvc3ROYXRpdmUhLCBjb21tZW50Tm9kZSwgbmF0aXZlTmV4dFNpYmxpbmcocmVuZGVyZXIsIGhvc3ROYXRpdmUpLCBmYWxzZSk7XG4gIHJldHVybiBjb21tZW50Tm9kZTtcbn1cblxuLyoqXG4gKiBSZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgaW1wbGVtZW50YXRpb24gb2YgdGhlIGNyZWF0ZSBjb250YWluZXIgcmVmIGZ1bmN0aW9uLlxuICogSWYgaHlkcmF0aW9uIGlzIGVuYWJsZWQsIHRoaXMgaW1wbGVtZW50YXRpb24gaXMgc3dhcHBlZCB3aXRoIGEgdmVyc2lvbiB0aGF0XG4gKiBwZXJmb3JtcyBsb29rdXBzIGluIGxpdmUgRE9NLlxuICovXG5sZXQgX2xvY2F0ZU9yQ3JlYXRlQ29udGFpbmVyUmVmSW1wbCA9IChob3N0TFZpZXc6IExWaWV3LCBob3N0VE5vZGU6IFROb2RlLCBzbG90VmFsdWU6IGFueSkgPT4ge1xuICBsZXQgY29tbWVudE5vZGU6IFJDb21tZW50O1xuICAvLyBJZiB0aGUgaG9zdCBpcyBhbiBlbGVtZW50IGNvbnRhaW5lciwgdGhlIG5hdGl2ZSBob3N0IGVsZW1lbnQgaXMgZ3VhcmFudGVlZCB0byBiZSBhXG4gIC8vIGNvbW1lbnQgYW5kIHdlIGNhbiByZXVzZSB0aGF0IGNvbW1lbnQgYXMgYW5jaG9yIGVsZW1lbnQgZm9yIHRoZSBuZXcgTENvbnRhaW5lci5cbiAgLy8gVGhlIGNvbW1lbnQgbm9kZSBpbiBxdWVzdGlvbiBpcyBhbHJlYWR5IHBhcnQgb2YgdGhlIERPTSBzdHJ1Y3R1cmUgc28gd2UgZG9uJ3QgbmVlZCB0byBhcHBlbmRcbiAgLy8gaXQgYWdhaW4uXG4gIGlmIChob3N0VE5vZGUudHlwZSAmIFROb2RlVHlwZS5FbGVtZW50Q29udGFpbmVyKSB7XG4gICAgY29tbWVudE5vZGUgPSB1bndyYXBSTm9kZShzbG90VmFsdWUpIGFzIFJDb21tZW50O1xuICB9IGVsc2Uge1xuICAgIGNvbW1lbnROb2RlID0gaW5zZXJ0QW5jaG9yTm9kZShob3N0TFZpZXcsIGhvc3RUTm9kZSk7XG4gIH1cblxuICByZXR1cm4gY3JlYXRlTENvbnRhaW5lcihzbG90VmFsdWUsIGhvc3RMVmlldywgY29tbWVudE5vZGUsIGhvc3RUTm9kZSk7XG59O1xuXG5mdW5jdGlvbiBsb2NhdGVPckNyZWF0ZUNvbnRhaW5lclJlZkltcGwoXG4gICAgaG9zdExWaWV3OiBMVmlldywgaG9zdFROb2RlOiBUTm9kZSwgc2xvdFZhbHVlOiBhbnkpOiBMQ29udGFpbmVyIHtcbiAgbGV0IG5naENvbnRhaW5lcjogTmdoQ29udGFpbmVyO1xuICBsZXQgZGVoeWRyYXRlZFZpZXdzOiBOZ2hWaWV3SW5zdGFuY2VbXSA9IFtdO1xuICBjb25zdCBuZ2ggPSBob3N0TFZpZXdbSFlEUkFUSU9OX0lORk9dO1xuICBjb25zdCBpbmRleCA9IGhvc3RUTm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVQ7XG4gIGNvbnN0IGlzQ3JlYXRpbmcgPVxuICAgICAgIW5naCB8fCBpc0luU2tpcEh5ZHJhdGlvbkJsb2NrKGhvc3RUTm9kZSwgaG9zdExWaWV3KSB8fCBpc05vZGVEaXNjb25uZWN0ZWQobmdoLCBpbmRleCk7XG4gIGlmICghaXNDcmVhdGluZykge1xuICAgIG5naENvbnRhaW5lciA9IG5naCEuZGF0YVtDT05UQUlORVJTXSFbaW5kZXhdO1xuICAgIG5nRGV2TW9kZSAmJlxuICAgICAgICBhc3NlcnREZWZpbmVkKG5naENvbnRhaW5lciwgJ1RoZXJlIGlzIG5vIGh5ZHJhdGlvbiBpbmZvIGF2YWlsYWJsZSBmb3IgdGhpcyBjb250YWluZXInKTtcbiAgfVxuXG4gIGxldCBjb21tZW50Tm9kZTogUkNvbW1lbnQ7XG4gIC8vIElmIHRoZSBob3N0IGlzIGFuIGVsZW1lbnQgY29udGFpbmVyLCB0aGUgbmF0aXZlIGhvc3QgZWxlbWVudCBpcyBndWFyYW50ZWVkIHRvIGJlIGFcbiAgLy8gY29tbWVudCBhbmQgd2UgY2FuIHJldXNlIHRoYXQgY29tbWVudCBhcyBhbmNob3IgZWxlbWVudCBmb3IgdGhlIG5ldyBMQ29udGFpbmVyLlxuICAvLyBUaGUgY29tbWVudCBub2RlIGluIHF1ZXN0aW9uIGlzIGFscmVhZHkgcGFydCBvZiB0aGUgRE9NIHN0cnVjdHVyZSBzbyB3ZSBkb24ndCBuZWVkIHRvIGFwcGVuZFxuICAvLyBpdCBhZ2Fpbi5cbiAgaWYgKGhvc3RUTm9kZS50eXBlICYgVE5vZGVUeXBlLkVsZW1lbnRDb250YWluZXIpIHtcbiAgICBjb21tZW50Tm9kZSA9IHVud3JhcFJOb2RlKHNsb3RWYWx1ZSkgYXMgUkNvbW1lbnQ7XG4gICAgaWYgKCFpc0NyZWF0aW5nKSB7XG4gICAgICBjb25zdCBlbGVtZW50Q29udGFpbmVyID0gbmdoIS5lbGVtZW50Q29udGFpbmVycz8uW2luZGV4XTtcbiAgICAgIGlmIChlbGVtZW50Q29udGFpbmVyICYmIEFycmF5LmlzQXJyYXkoZWxlbWVudENvbnRhaW5lci5kZWh5ZHJhdGVkVmlld3MpKSB7XG4gICAgICAgIC8vIFdoZW4gd2UgY3JlYXRlIGFuIExDb250YWluZXIgYmFzZWQgb24gYDxuZy1jb250YWluZXI+YCwgdGhlIGNvbnRhaW5lclxuICAgICAgICAvLyBpcyBhbHJlYWR5IHByb2Nlc3NlZCwgaW5jbHVkaW5nIGRlaHlkcmF0ZWQgdmlld3MgaW5mby4gUmV1c2UgdGhpcyBpbmZvXG4gICAgICAgIC8vIGFuZCBlcmFzZSBpdCBpbiB0aGUgbmdoIGRhdGEgdG8gYXZvaWQgbWVtb3J5IGxlYWtzLlxuICAgICAgICBkZWh5ZHJhdGVkVmlld3MgPSBlbGVtZW50Q29udGFpbmVyLmRlaHlkcmF0ZWRWaWV3cztcbiAgICAgICAgZWxlbWVudENvbnRhaW5lci5kZWh5ZHJhdGVkVmlld3MgPSBbXTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGlzQ3JlYXRpbmcpIHtcbiAgICAgIGNvbW1lbnROb2RlID0gaW5zZXJ0QW5jaG9yTm9kZShob3N0TFZpZXcsIGhvc3RUTm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFN0YXJ0IHdpdGggYSBub2RlIHRoYXQgaW1tZWRpYXRlbHkgZm9sbG93cyB0aGUgRE9NIG5vZGUgZm91bmRcbiAgICAgIC8vIGluIGFuIExWaWV3IHNsb3QuIFRoaXMgbm9kZSBpczpcbiAgICAgIC8vIC0gZWl0aGVyIGFuIGFuY2hvciBjb21tZW50IG5vZGUgb2YgdGhpcyBjb250YWluZXIgaWYgaXQncyBlbXB0eVxuICAgICAgLy8gLSBvciBhIGZpcnN0IGVsZW1lbnQgb2YgdGhlIGZpcnN0IHZpZXcgaW4gdGhpcyBjb250YWluZXJcbiAgICAgIGxldCBjdXJyZW50Uk5vZGUgPSAodW53cmFwUk5vZGUoc2xvdFZhbHVlKSBhcyBSTm9kZSkubmV4dFNpYmxpbmc7XG4gICAgICAvLyBUT0RPOiBBZGQgYXNzZXJ0IHRoYXQgdGhlIGN1cnJlbnRSTm9kZSBleGlzdHNcbiAgICAgIGNvbnN0IFthbmNob3JSTm9kZSwgdmlld3NdID0gbG9jYXRlRGVoeWRyYXRlZFZpZXdzSW5Db250YWluZXIoY3VycmVudFJOb2RlISwgbmdoQ29udGFpbmVyISk7XG5cbiAgICAgIGNvbW1lbnROb2RlID0gYW5jaG9yUk5vZGUgYXMgUkNvbW1lbnQ7XG4gICAgICBkZWh5ZHJhdGVkVmlld3MgPSB2aWV3cztcblxuICAgICAgbmdEZXZNb2RlICYmXG4gICAgICAgICAgdmFsaWRhdGVNYXRjaGluZ05vZGUoXG4gICAgICAgICAgICAgIGNvbW1lbnROb2RlIGFzIHVua25vd24gYXMgTm9kZSwgTm9kZS5DT01NRU5UX05PREUsIG51bGwsIGhvc3RMVmlldywgaG9zdFROb2RlLCB0cnVlKTtcbiAgICAgIG5nRGV2TW9kZSAmJiBtYXJrUk5vZGVBc0NsYWltZWRGb3JIeWRyYXRpb24oY29tbWVudE5vZGUpO1xuICAgIH1cbiAgfVxuICBjb25zdCBsQ29udGFpbmVyID0gY3JlYXRlTENvbnRhaW5lcihzbG90VmFsdWUsIGhvc3RMVmlldywgY29tbWVudE5vZGUsIGhvc3RUTm9kZSk7XG4gIGlmIChuZ2ggJiYgZGVoeWRyYXRlZFZpZXdzLmxlbmd0aCA+IDApIHtcbiAgICBsQ29udGFpbmVyW0RFSFlEUkFURURfVklFV1NdID0gZGVoeWRyYXRlZFZpZXdzO1xuICB9XG4gIHJldHVybiBsQ29udGFpbmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZW5hYmxlTG9jYXRlT3JDcmVhdGVDb250YWluZXJSZWZJbXBsKCkge1xuICBfbG9jYXRlT3JDcmVhdGVDb250YWluZXJSZWZJbXBsID0gbG9jYXRlT3JDcmVhdGVDb250YWluZXJSZWZJbXBsO1xufVxuIl19