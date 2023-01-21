/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EnvironmentInjector } from '../di/r3_injector';
import { isType } from '../interface/type';
import { assertNodeInjector, assertRComment } from '../render3/assert';
import { ComponentFactory as R3ComponentFactory } from '../render3/component_ref';
import { getComponentDef } from '../render3/definition';
import { getParentInjectorLocation, NodeInjector } from '../render3/di';
import { locateDehydratedViewsInContainer, markRNodeAsClaimedForHydration } from '../render3/hydration';
import { addToViewTree, createLContainer, navigateParentTNodes } from '../render3/instructions/shared';
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
        const viewRef = templateRef.createEmbeddedViewWithHydration(context || {}, injector, hydrationInfo);
        this.insert(viewRef, index);
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
        // we need to rely on some other info (like component id).
        const elementName = componentFactory.selector;
        const dehydratedView = findMatchingDehydratedView(this._lContainer, elementName);
        let rNode;
        let hydrationDomInfo = null;
        if (dehydratedView) {
            // Pointer to a host DOM element.
            rNode = dehydratedView.firstChild;
            // Read hydration info and pass it over to the component view.
            const ngh = rNode.getAttribute('ngh');
            if (ngh) {
                hydrationDomInfo = JSON.parse(ngh);
                hydrationDomInfo.firstChild = rNode.firstChild;
                rNode.removeAttribute('ngh');
                ngDevMode && markRNodeAsClaimedForHydration(rNode);
            }
        }
        const componentRef = componentFactory.createWithHydration(contextInjector, projectableNodes, rNode, environmentInjector, hydrationDomInfo);
        this.insert(componentRef.hostView, index);
        return componentRef;
    }
    insert(viewRef, index) {
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
        //
        // If an LView has hydration info, avoid inserting elements
        // elements into the DOM as they are already attached.
        //
        // TODO: should we reset the `HYDRATION_INFO` afterwards?
        //       Without that there might be a problem later on when
        //       we'd try to insert/move the view again?
        if (!lView[HYDRATION_INFO]) {
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
    let nghContainer;
    let dehydratedViews = [];
    const ngh = hostLView[HYDRATION_INFO];
    const isCreating = !ngh || isInNonHydratableBlock(hostTNode, hostLView);
    if (!isCreating) {
        const index = hostTNode.index - HEADER_OFFSET;
        nghContainer = ngh.containers[index];
        ngDevMode &&
            assertDefined(nghContainer, 'There is no hydration info available for this container');
    }
    const slotValue = hostLView[hostTNode.index];
    if (isLContainer(slotValue)) {
        // If the host is a container, we don't need to create a new LContainer
        lContainer = slotValue;
    }
    else {
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
            if (!isCreating) {
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
                    assertRComment(commentNode, 'Expecting a comment node in template instruction');
                ngDevMode && markRNodeAsClaimedForHydration(commentNode);
            }
            else {
                // If the host is a regular element, we have to insert a comment node manually which will
                // be used as an anchor when inserting elements. In this specific case we use low-level DOM
                // manipulation to insert it.
                const renderer = hostLView[RENDERER];
                ngDevMode && ngDevMode.rendererCreateComment++;
                commentNode = renderer.createComment(ngDevMode ? 'container' : '');
                const hostNative = getNativeByTNode(hostTNode, hostLView);
                const parentOfHostNative = nativeParentNode(renderer, hostNative);
                nativeInsertBefore(renderer, parentOfHostNative, commentNode, nativeNextSibling(renderer, hostNative), false);
            }
        }
        hostLView[hostTNode.index] = lContainer =
            createLContainer(slotValue, hostLView, commentNode, hostTNode);
        if (ngh && dehydratedViews.length > 0) {
            lContainer[DEHYDRATED_VIEWS] = dehydratedViews;
        }
        addToViewTree(hostLView, lContainer);
    }
    return new R3ViewContainerRef(lContainer, hostTNode, hostLView);
}
function findMatchingDehydratedView(lContainer, template) {
    let hydrationInfo = null;
    if (lContainer !== null && lContainer[DEHYDRATED_VIEWS]) {
        // Does the target container have a view?
        const dehydratedViews = lContainer[DEHYDRATED_VIEWS];
        if (dehydratedViews.length > 0) {
            // TODO: take into account an index of a view within ViewContainerRef,
            // otherwise, we may end up reusing wrong nodes from live DOM?
            const dehydratedViewIndex = dehydratedViews.findIndex(view => view.template === template);
            if (dehydratedViewIndex > -1) {
                hydrationInfo = dehydratedViews[dehydratedViewIndex];
                // Drop this view from the list of de-hydrated ones.
                dehydratedViews.splice(dehydratedViewIndex, 1);
            }
        }
    }
    return hydrationInfo;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld19jb250YWluZXJfcmVmLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvbGlua2VyL3ZpZXdfY29udGFpbmVyX3JlZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFHSCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMsTUFBTSxFQUFPLE1BQU0sbUJBQW1CLENBQUM7QUFDL0MsT0FBTyxFQUFDLGtCQUFrQixFQUFFLGNBQWMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ3JFLE9BQU8sRUFBQyxnQkFBZ0IsSUFBSSxrQkFBa0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ2hGLE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMseUJBQXlCLEVBQUUsWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3RFLE9BQU8sRUFBbUIsZ0NBQWdDLEVBQW1CLDhCQUE4QixFQUFlLE1BQU0sc0JBQXNCLENBQUM7QUFDdkosT0FBTyxFQUFDLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBQyxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JHLE9BQU8sRUFBQyx1QkFBdUIsRUFBRSxnQkFBZ0IsRUFBYyxNQUFNLEVBQUUsU0FBUyxFQUFDLE1BQU0saUNBQWlDLENBQUM7QUFJekgsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBNkIsYUFBYSxFQUFRLGNBQWMsRUFBZ0MsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFTLE1BQU0sNEJBQTRCLENBQUM7QUFDbEwsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZELE9BQU8sRUFBQyxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsVUFB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QUUsU0FBUyxDQUFDLENBQUM7QUFDbEUsQ0FBQztBQUVELFNBQVMsMEJBQTBCLENBQUMsVUFBc0IsRUFBRSxRQUFnQjtJQUMxRSxJQUFJLGFBQWEsR0FBaUIsSUFBSSxDQUFDO0lBQ3ZDLElBQUksVUFBVSxLQUFLLElBQUksSUFBSSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtRQUN2RCx5Q0FBeUM7UUFDekMsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDckQsSUFBSSxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM5QixzRUFBc0U7WUFDdEUsOERBQThEO1lBQzlELE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLENBQUM7WUFFMUYsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsRUFBRTtnQkFDNUIsYUFBYSxHQUFHLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUVyRCxvREFBb0Q7Z0JBQ3BELGVBQWUsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDaEQ7U0FDRjtLQUNGO0lBQ0QsT0FBTyxhQUFhLENBQUM7QUFDdkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0luamVjdG9yfSBmcm9tICcuLi9kaS9pbmplY3Rvcic7XG5pbXBvcnQge0Vudmlyb25tZW50SW5qZWN0b3J9IGZyb20gJy4uL2RpL3IzX2luamVjdG9yJztcbmltcG9ydCB7aXNUeXBlLCBUeXBlfSBmcm9tICcuLi9pbnRlcmZhY2UvdHlwZSc7XG5pbXBvcnQge2Fzc2VydE5vZGVJbmplY3RvciwgYXNzZXJ0UkNvbW1lbnR9IGZyb20gJy4uL3JlbmRlcjMvYXNzZXJ0JztcbmltcG9ydCB7Q29tcG9uZW50RmFjdG9yeSBhcyBSM0NvbXBvbmVudEZhY3Rvcnl9IGZyb20gJy4uL3JlbmRlcjMvY29tcG9uZW50X3JlZic7XG5pbXBvcnQge2dldENvbXBvbmVudERlZn0gZnJvbSAnLi4vcmVuZGVyMy9kZWZpbml0aW9uJztcbmltcG9ydCB7Z2V0UGFyZW50SW5qZWN0b3JMb2NhdGlvbiwgTm9kZUluamVjdG9yfSBmcm9tICcuLi9yZW5kZXIzL2RpJztcbmltcG9ydCB7ZmluZEV4aXN0aW5nTm9kZSwgbG9jYXRlRGVoeWRyYXRlZFZpZXdzSW5Db250YWluZXIsIGxvY2F0ZU5leHRSTm9kZSwgbWFya1JOb2RlQXNDbGFpbWVkRm9ySHlkcmF0aW9uLCBzaWJsaW5nQWZ0ZXJ9IGZyb20gJy4uL3JlbmRlcjMvaHlkcmF0aW9uJztcbmltcG9ydCB7YWRkVG9WaWV3VHJlZSwgY3JlYXRlTENvbnRhaW5lciwgbmF2aWdhdGVQYXJlbnRUTm9kZXN9IGZyb20gJy4uL3JlbmRlcjMvaW5zdHJ1Y3Rpb25zL3NoYXJlZCc7XG5pbXBvcnQge0NPTlRBSU5FUl9IRUFERVJfT0ZGU0VULCBERUhZRFJBVEVEX1ZJRVdTLCBMQ29udGFpbmVyLCBOQVRJVkUsIFZJRVdfUkVGU30gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL2NvbnRhaW5lcic7XG5pbXBvcnQge05vZGVJbmplY3Rvck9mZnNldH0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL2luamVjdG9yJztcbmltcG9ydCB7VENvbnRhaW5lck5vZGUsIFREaXJlY3RpdmVIb3N0Tm9kZSwgVEVsZW1lbnRDb250YWluZXJOb2RlLCBURWxlbWVudE5vZGUsIFROb2RlLCBUTm9kZVR5cGV9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9ub2RlJztcbmltcG9ydCB7UkNvbW1lbnQsIFJFbGVtZW50LCBSTm9kZX0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3JlbmRlcmVyX2RvbSc7XG5pbXBvcnQge2lzTENvbnRhaW5lcn0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3R5cGVfY2hlY2tzJztcbmltcG9ydCB7REVDTEFSQVRJT05fQ09NUE9ORU5UX1ZJRVcsIEhFQURFUl9PRkZTRVQsIEhPU1QsIEhZRFJBVElPTl9JTkZPLCBMVmlldywgTmdoQ29udGFpbmVyLCBOZ2hWaWV3LCBQQVJFTlQsIFJFTkRFUkVSLCBUX0hPU1QsIFRWSUVXLCBOZ2hEb219IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy92aWV3JztcbmltcG9ydCB7YXNzZXJ0VE5vZGVUeXBlfSBmcm9tICcuLi9yZW5kZXIzL25vZGVfYXNzZXJ0JztcbmltcG9ydCB7YWRkVmlld1RvQ29udGFpbmVyLCBkZXN0cm95TFZpZXcsIGRldGFjaFZpZXcsIGdldEJlZm9yZU5vZGVGb3JWaWV3LCBpbnNlcnRWaWV3LCBuYXRpdmVJbnNlcnRCZWZvcmUsIG5hdGl2ZU5leHRTaWJsaW5nLCBuYXRpdmVQYXJlbnROb2RlfSBmcm9tICcuLi9yZW5kZXIzL25vZGVfbWFuaXB1bGF0aW9uJztcbmltcG9ydCB7Z2V0Q3VycmVudFROb2RlLCBnZXRMVmlld30gZnJvbSAnLi4vcmVuZGVyMy9zdGF0ZSc7XG5pbXBvcnQge2dldFBhcmVudEluamVjdG9ySW5kZXgsIGdldFBhcmVudEluamVjdG9yVmlldywgaGFzUGFyZW50SW5qZWN0b3J9IGZyb20gJy4uL3JlbmRlcjMvdXRpbC9pbmplY3Rvcl91dGlscyc7XG5pbXBvcnQge2dldE5hdGl2ZUJ5VE5vZGUsIHVud3JhcFJOb2RlLCB2aWV3QXR0YWNoZWRUb0NvbnRhaW5lcn0gZnJvbSAnLi4vcmVuZGVyMy91dGlsL3ZpZXdfdXRpbHMnO1xuaW1wb3J0IHtWaWV3UmVmIGFzIFIzVmlld1JlZn0gZnJvbSAnLi4vcmVuZGVyMy92aWV3X3JlZic7XG5pbXBvcnQge2FkZFRvQXJyYXksIHJlbW92ZUZyb21BcnJheX0gZnJvbSAnLi4vdXRpbC9hcnJheV91dGlscyc7XG5pbXBvcnQge2Fzc2VydERlZmluZWQsIGFzc2VydEVxdWFsLCBhc3NlcnRHcmVhdGVyVGhhbiwgYXNzZXJ0TGVzc1RoYW4sIHRocm93RXJyb3J9IGZyb20gJy4uL3V0aWwvYXNzZXJ0JztcblxuaW1wb3J0IHtDb21wb25lbnRGYWN0b3J5LCBDb21wb25lbnRSZWZ9IGZyb20gJy4vY29tcG9uZW50X2ZhY3RvcnknO1xuaW1wb3J0IHtjcmVhdGVFbGVtZW50UmVmLCBFbGVtZW50UmVmfSBmcm9tICcuL2VsZW1lbnRfcmVmJztcbmltcG9ydCB7TmdNb2R1bGVSZWZ9IGZyb20gJy4vbmdfbW9kdWxlX2ZhY3RvcnknO1xuaW1wb3J0IHtUZW1wbGF0ZVJlZn0gZnJvbSAnLi90ZW1wbGF0ZV9yZWYnO1xuaW1wb3J0IHtFbWJlZGRlZFZpZXdSZWYsIFZpZXdSZWZ9IGZyb20gJy4vdmlld19yZWYnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBjb250YWluZXIgd2hlcmUgb25lIG9yIG1vcmUgdmlld3MgY2FuIGJlIGF0dGFjaGVkIHRvIGEgY29tcG9uZW50LlxuICpcbiAqIENhbiBjb250YWluICpob3N0IHZpZXdzKiAoY3JlYXRlZCBieSBpbnN0YW50aWF0aW5nIGFcbiAqIGNvbXBvbmVudCB3aXRoIHRoZSBgY3JlYXRlQ29tcG9uZW50KClgIG1ldGhvZCksIGFuZCAqZW1iZWRkZWQgdmlld3MqXG4gKiAoY3JlYXRlZCBieSBpbnN0YW50aWF0aW5nIGEgYFRlbXBsYXRlUmVmYCB3aXRoIHRoZSBgY3JlYXRlRW1iZWRkZWRWaWV3KClgIG1ldGhvZCkuXG4gKlxuICogQSB2aWV3IGNvbnRhaW5lciBpbnN0YW5jZSBjYW4gY29udGFpbiBvdGhlciB2aWV3IGNvbnRhaW5lcnMsXG4gKiBjcmVhdGluZyBhIFt2aWV3IGhpZXJhcmNoeV0oZ3VpZGUvZ2xvc3Nhcnkjdmlldy10cmVlKS5cbiAqXG4gKiBAc2VlIGBDb21wb25lbnRSZWZgXG4gKiBAc2VlIGBFbWJlZGRlZFZpZXdSZWZgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVmlld0NvbnRhaW5lclJlZiB7XG4gIC8qKlxuICAgKiBBbmNob3IgZWxlbWVudCB0aGF0IHNwZWNpZmllcyB0aGUgbG9jYXRpb24gb2YgdGhpcyBjb250YWluZXIgaW4gdGhlIGNvbnRhaW5pbmcgdmlldy5cbiAgICogRWFjaCB2aWV3IGNvbnRhaW5lciBjYW4gaGF2ZSBvbmx5IG9uZSBhbmNob3IgZWxlbWVudCwgYW5kIGVhY2ggYW5jaG9yIGVsZW1lbnRcbiAgICogY2FuIGhhdmUgb25seSBhIHNpbmdsZSB2aWV3IGNvbnRhaW5lci5cbiAgICpcbiAgICogUm9vdCBlbGVtZW50cyBvZiB2aWV3cyBhdHRhY2hlZCB0byB0aGlzIGNvbnRhaW5lciBiZWNvbWUgc2libGluZ3Mgb2YgdGhlIGFuY2hvciBlbGVtZW50IGluXG4gICAqIHRoZSByZW5kZXJlZCB2aWV3LlxuICAgKlxuICAgKiBBY2Nlc3MgdGhlIGBWaWV3Q29udGFpbmVyUmVmYCBvZiBhbiBlbGVtZW50IGJ5IHBsYWNpbmcgYSBgRGlyZWN0aXZlYCBpbmplY3RlZFxuICAgKiB3aXRoIGBWaWV3Q29udGFpbmVyUmVmYCBvbiB0aGUgZWxlbWVudCwgb3IgdXNlIGEgYFZpZXdDaGlsZGAgcXVlcnkuXG4gICAqXG4gICAqIDwhLS0gVE9ETzogcmVuYW1lIHRvIGFuY2hvckVsZW1lbnQgLS0+XG4gICAqL1xuICBhYnN0cmFjdCBnZXQgZWxlbWVudCgpOiBFbGVtZW50UmVmO1xuXG4gIC8qKlxuICAgKiBUaGUgW2RlcGVuZGVuY3kgaW5qZWN0b3JdKGd1aWRlL2dsb3NzYXJ5I2luamVjdG9yKSBmb3IgdGhpcyB2aWV3IGNvbnRhaW5lci5cbiAgICovXG4gIGFic3RyYWN0IGdldCBpbmplY3RvcigpOiBJbmplY3RvcjtcblxuICAvKiogQGRlcHJlY2F0ZWQgTm8gcmVwbGFjZW1lbnQgKi9cbiAgYWJzdHJhY3QgZ2V0IHBhcmVudEluamVjdG9yKCk6IEluamVjdG9yO1xuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbGwgdmlld3MgaW4gdGhpcyBjb250YWluZXIuXG4gICAqL1xuICBhYnN0cmFjdCBjbGVhcigpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYSB2aWV3IGZyb20gdGhpcyBjb250YWluZXIuXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgMC1iYXNlZCBpbmRleCBvZiB0aGUgdmlldyB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgVGhlIGBWaWV3UmVmYCBpbnN0YW5jZSwgb3IgbnVsbCBpZiB0aGUgaW5kZXggaXMgb3V0IG9mIHJhbmdlLlxuICAgKi9cbiAgYWJzdHJhY3QgZ2V0KGluZGV4OiBudW1iZXIpOiBWaWV3UmVmfG51bGw7XG5cbiAgLyoqXG4gICAqIFJlcG9ydHMgaG93IG1hbnkgdmlld3MgYXJlIGN1cnJlbnRseSBhdHRhY2hlZCB0byB0aGlzIGNvbnRhaW5lci5cbiAgICogQHJldHVybnMgVGhlIG51bWJlciBvZiB2aWV3cy5cbiAgICovXG4gIGFic3RyYWN0IGdldCBsZW5ndGgoKTogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBJbnN0YW50aWF0ZXMgYW4gZW1iZWRkZWQgdmlldyBhbmQgaW5zZXJ0cyBpdFxuICAgKiBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gdGVtcGxhdGVSZWYgVGhlIEhUTUwgdGVtcGxhdGUgdGhhdCBkZWZpbmVzIHRoZSB2aWV3LlxuICAgKiBAcGFyYW0gY29udGV4dCBUaGUgZGF0YS1iaW5kaW5nIGNvbnRleHQgb2YgdGhlIGVtYmVkZGVkIHZpZXcsIGFzIGRlY2xhcmVkXG4gICAqIGluIHRoZSBgPG5nLXRlbXBsYXRlPmAgdXNhZ2UuXG4gICAqIEBwYXJhbSBvcHRpb25zIEV4dHJhIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBjcmVhdGVkIHZpZXcuIEluY2x1ZGVzOlxuICAgKiAgKiBpbmRleDogVGhlIDAtYmFzZWQgaW5kZXggYXQgd2hpY2ggdG8gaW5zZXJ0IHRoZSBuZXcgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKiAgICAgICAgICAgSWYgbm90IHNwZWNpZmllZCwgYXBwZW5kcyB0aGUgbmV3IHZpZXcgYXMgdGhlIGxhc3QgZW50cnkuXG4gICAqICAqIGluamVjdG9yOiBJbmplY3RvciB0byBiZSB1c2VkIHdpdGhpbiB0aGUgZW1iZWRkZWQgdmlldy5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIGBWaWV3UmVmYCBpbnN0YW5jZSBmb3IgdGhlIG5ld2x5IGNyZWF0ZWQgdmlldy5cbiAgICovXG4gIGFic3RyYWN0IGNyZWF0ZUVtYmVkZGVkVmlldzxDPih0ZW1wbGF0ZVJlZjogVGVtcGxhdGVSZWY8Qz4sIGNvbnRleHQ/OiBDLCBvcHRpb25zPzoge1xuICAgIGluZGV4PzogbnVtYmVyLFxuICAgIGluamVjdG9yPzogSW5qZWN0b3JcbiAgfSk6IEVtYmVkZGVkVmlld1JlZjxDPjtcblxuICAvKipcbiAgICogSW5zdGFudGlhdGVzIGFuIGVtYmVkZGVkIHZpZXcgYW5kIGluc2VydHMgaXRcbiAgICogaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogQHBhcmFtIHRlbXBsYXRlUmVmIFRoZSBIVE1MIHRlbXBsYXRlIHRoYXQgZGVmaW5lcyB0aGUgdmlldy5cbiAgICogQHBhcmFtIGNvbnRleHQgVGhlIGRhdGEtYmluZGluZyBjb250ZXh0IG9mIHRoZSBlbWJlZGRlZCB2aWV3LCBhcyBkZWNsYXJlZFxuICAgKiBpbiB0aGUgYDxuZy10ZW1wbGF0ZT5gIHVzYWdlLlxuICAgKiBAcGFyYW0gaW5kZXggVGhlIDAtYmFzZWQgaW5kZXggYXQgd2hpY2ggdG8gaW5zZXJ0IHRoZSBuZXcgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKiBJZiBub3Qgc3BlY2lmaWVkLCBhcHBlbmRzIHRoZSBuZXcgdmlldyBhcyB0aGUgbGFzdCBlbnRyeS5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIGBWaWV3UmVmYCBpbnN0YW5jZSBmb3IgdGhlIG5ld2x5IGNyZWF0ZWQgdmlldy5cbiAgICovXG4gIGFic3RyYWN0IGNyZWF0ZUVtYmVkZGVkVmlldzxDPih0ZW1wbGF0ZVJlZjogVGVtcGxhdGVSZWY8Qz4sIGNvbnRleHQ/OiBDLCBpbmRleD86IG51bWJlcik6XG4gICAgICBFbWJlZGRlZFZpZXdSZWY8Qz47XG5cbiAgLyoqXG4gICAqIEluc3RhbnRpYXRlcyBhIHNpbmdsZSBjb21wb25lbnQgYW5kIGluc2VydHMgaXRzIGhvc3QgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKlxuICAgKiBAcGFyYW0gY29tcG9uZW50VHlwZSBDb21wb25lbnQgVHlwZSB0byB1c2UuXG4gICAqIEBwYXJhbSBvcHRpb25zIEFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGV4dHJhIHBhcmFtZXRlcnM6XG4gICAqICAqIGluZGV4OiB0aGUgaW5kZXggYXQgd2hpY2ggdG8gaW5zZXJ0IHRoZSBuZXcgY29tcG9uZW50J3MgaG9zdCB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqICAgICAgICAgICBJZiBub3Qgc3BlY2lmaWVkLCBhcHBlbmRzIHRoZSBuZXcgdmlldyBhcyB0aGUgbGFzdCBlbnRyeS5cbiAgICogICogaW5qZWN0b3I6IHRoZSBpbmplY3RvciB0byB1c2UgYXMgdGhlIHBhcmVudCBmb3IgdGhlIG5ldyBjb21wb25lbnQuXG4gICAqICAqIG5nTW9kdWxlUmVmOiBhbiBOZ01vZHVsZVJlZiBvZiB0aGUgY29tcG9uZW50J3MgTmdNb2R1bGUsIHlvdSBzaG91bGQgYWxtb3N0IGFsd2F5cyBwcm92aWRlXG4gICAqICAgICAgICAgICAgICAgICB0aGlzIHRvIGVuc3VyZSB0aGF0IGFsbCBleHBlY3RlZCBwcm92aWRlcnMgYXJlIGF2YWlsYWJsZSBmb3IgdGhlIGNvbXBvbmVudFxuICAgKiAgICAgICAgICAgICAgICAgaW5zdGFudGlhdGlvbi5cbiAgICogICogZW52aXJvbm1lbnRJbmplY3RvcjogYW4gRW52aXJvbm1lbnRJbmplY3RvciB3aGljaCB3aWxsIHByb3ZpZGUgdGhlIGNvbXBvbmVudCdzIGVudmlyb25tZW50LlxuICAgKiAgICAgICAgICAgICAgICAgeW91IHNob3VsZCBhbG1vc3QgYWx3YXlzIHByb3ZpZGUgdGhpcyB0byBlbnN1cmUgdGhhdCBhbGwgZXhwZWN0ZWQgcHJvdmlkZXJzXG4gICAqICAgICAgICAgICAgICAgICBhcmUgYXZhaWxhYmxlIGZvciB0aGUgY29tcG9uZW50IGluc3RhbnRpYXRpb24uIFRoaXMgb3B0aW9uIGlzIGludGVuZGVkIHRvXG4gICAqICAgICAgICAgICAgICAgICByZXBsYWNlIHRoZSBgbmdNb2R1bGVSZWZgIHBhcmFtZXRlci5cbiAgICogICogcHJvamVjdGFibGVOb2RlczogbGlzdCBvZiBET00gbm9kZXMgdGhhdCBzaG91bGQgYmUgcHJvamVjdGVkIHRocm91Z2hcbiAgICogICAgICAgICAgICAgICAgICAgICAgW2A8bmctY29udGVudD5gXShhcGkvY29yZS9uZy1jb250ZW50KSBvZiB0aGUgbmV3IGNvbXBvbmVudCBpbnN0YW5jZS5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIG5ldyBgQ29tcG9uZW50UmVmYCB3aGljaCBjb250YWlucyB0aGUgY29tcG9uZW50IGluc3RhbmNlIGFuZCB0aGUgaG9zdCB2aWV3LlxuICAgKi9cbiAgYWJzdHJhY3QgY3JlYXRlQ29tcG9uZW50PEM+KGNvbXBvbmVudFR5cGU6IFR5cGU8Qz4sIG9wdGlvbnM/OiB7XG4gICAgaW5kZXg/OiBudW1iZXIsXG4gICAgaW5qZWN0b3I/OiBJbmplY3RvcixcbiAgICBuZ01vZHVsZVJlZj86IE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yfE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgIHByb2plY3RhYmxlTm9kZXM/OiBOb2RlW11bXSxcbiAgfSk6IENvbXBvbmVudFJlZjxDPjtcblxuICAvKipcbiAgICogSW5zdGFudGlhdGVzIGEgc2luZ2xlIGNvbXBvbmVudCBhbmQgaW5zZXJ0cyBpdHMgaG9zdCB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqXG4gICAqIEBwYXJhbSBjb21wb25lbnRGYWN0b3J5IENvbXBvbmVudCBmYWN0b3J5IHRvIHVzZS5cbiAgICogQHBhcmFtIGluZGV4IFRoZSBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIG5ldyBjb21wb25lbnQncyBob3N0IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogSWYgbm90IHNwZWNpZmllZCwgYXBwZW5kcyB0aGUgbmV3IHZpZXcgYXMgdGhlIGxhc3QgZW50cnkuXG4gICAqIEBwYXJhbSBpbmplY3RvciBUaGUgaW5qZWN0b3IgdG8gdXNlIGFzIHRoZSBwYXJlbnQgZm9yIHRoZSBuZXcgY29tcG9uZW50LlxuICAgKiBAcGFyYW0gcHJvamVjdGFibGVOb2RlcyBMaXN0IG9mIERPTSBub2RlcyB0aGF0IHNob3VsZCBiZSBwcm9qZWN0ZWQgdGhyb3VnaFxuICAgKiAgICAgW2A8bmctY29udGVudD5gXShhcGkvY29yZS9uZy1jb250ZW50KSBvZiB0aGUgbmV3IGNvbXBvbmVudCBpbnN0YW5jZS5cbiAgICogQHBhcmFtIG5nTW9kdWxlUmVmIEFuIGluc3RhbmNlIG9mIHRoZSBOZ01vZHVsZVJlZiB0aGF0IHJlcHJlc2VudCBhbiBOZ01vZHVsZS5cbiAgICogVGhpcyBpbmZvcm1hdGlvbiBpcyB1c2VkIHRvIHJldHJpZXZlIGNvcnJlc3BvbmRpbmcgTmdNb2R1bGUgaW5qZWN0b3IuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBuZXcgYENvbXBvbmVudFJlZmAgd2hpY2ggY29udGFpbnMgdGhlIGNvbXBvbmVudCBpbnN0YW5jZSBhbmQgdGhlIGhvc3Qgdmlldy5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgQW5ndWxhciBubyBsb25nZXIgcmVxdWlyZXMgY29tcG9uZW50IGZhY3RvcmllcyB0byBkeW5hbWljYWxseSBjcmVhdGUgY29tcG9uZW50cy5cbiAgICogICAgIFVzZSBkaWZmZXJlbnQgc2lnbmF0dXJlIG9mIHRoZSBgY3JlYXRlQ29tcG9uZW50YCBtZXRob2QsIHdoaWNoIGFsbG93cyBwYXNzaW5nXG4gICAqICAgICBDb21wb25lbnQgY2xhc3MgZGlyZWN0bHkuXG4gICAqL1xuICBhYnN0cmFjdCBjcmVhdGVDb21wb25lbnQ8Qz4oXG4gICAgICBjb21wb25lbnRGYWN0b3J5OiBDb21wb25lbnRGYWN0b3J5PEM+LCBpbmRleD86IG51bWJlciwgaW5qZWN0b3I/OiBJbmplY3RvcixcbiAgICAgIHByb2plY3RhYmxlTm9kZXM/OiBhbnlbXVtdLFxuICAgICAgZW52aXJvbm1lbnRJbmplY3Rvcj86IEVudmlyb25tZW50SW5qZWN0b3J8TmdNb2R1bGVSZWY8YW55Pik6IENvbXBvbmVudFJlZjxDPjtcblxuICAvKipcbiAgICogSW5zZXJ0cyBhIHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogQHBhcmFtIHZpZXdSZWYgVGhlIHZpZXcgdG8gaW5zZXJ0LlxuICAgKiBAcGFyYW0gaW5kZXggVGhlIDAtYmFzZWQgaW5kZXggYXQgd2hpY2ggdG8gaW5zZXJ0IHRoZSB2aWV3LlxuICAgKiBJZiBub3Qgc3BlY2lmaWVkLCBhcHBlbmRzIHRoZSBuZXcgdmlldyBhcyB0aGUgbGFzdCBlbnRyeS5cbiAgICogQHJldHVybnMgVGhlIGluc2VydGVkIGBWaWV3UmVmYCBpbnN0YW5jZS5cbiAgICpcbiAgICovXG4gIGFic3RyYWN0IGluc2VydCh2aWV3UmVmOiBWaWV3UmVmLCBpbmRleD86IG51bWJlcik6IFZpZXdSZWY7XG5cbiAgLyoqXG4gICAqIE1vdmVzIGEgdmlldyB0byBhIG5ldyBsb2NhdGlvbiBpbiB0aGlzIGNvbnRhaW5lci5cbiAgICogQHBhcmFtIHZpZXdSZWYgVGhlIHZpZXcgdG8gbW92ZS5cbiAgICogQHBhcmFtIGluZGV4IFRoZSAwLWJhc2VkIGluZGV4IG9mIHRoZSBuZXcgbG9jYXRpb24uXG4gICAqIEByZXR1cm5zIFRoZSBtb3ZlZCBgVmlld1JlZmAgaW5zdGFuY2UuXG4gICAqL1xuICBhYnN0cmFjdCBtb3ZlKHZpZXdSZWY6IFZpZXdSZWYsIGN1cnJlbnRJbmRleDogbnVtYmVyKTogVmlld1JlZjtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgaW5kZXggb2YgYSB2aWV3IHdpdGhpbiB0aGUgY3VycmVudCBjb250YWluZXIuXG4gICAqIEBwYXJhbSB2aWV3UmVmIFRoZSB2aWV3IHRvIHF1ZXJ5LlxuICAgKiBAcmV0dXJucyBUaGUgMC1iYXNlZCBpbmRleCBvZiB0aGUgdmlldydzIHBvc2l0aW9uIGluIHRoaXMgY29udGFpbmVyLFxuICAgKiBvciBgLTFgIGlmIHRoaXMgY29udGFpbmVyIGRvZXNuJ3QgY29udGFpbiB0aGUgdmlldy5cbiAgICovXG4gIGFic3RyYWN0IGluZGV4T2Yodmlld1JlZjogVmlld1JlZik6IG51bWJlcjtcblxuICAvKipcbiAgICogRGVzdHJveXMgYSB2aWV3IGF0dGFjaGVkIHRvIHRoaXMgY29udGFpbmVyXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgMC1iYXNlZCBpbmRleCBvZiB0aGUgdmlldyB0byBkZXN0cm95LlxuICAgKiBJZiBub3Qgc3BlY2lmaWVkLCB0aGUgbGFzdCB2aWV3IGluIHRoZSBjb250YWluZXIgaXMgcmVtb3ZlZC5cbiAgICovXG4gIGFic3RyYWN0IHJlbW92ZShpbmRleD86IG51bWJlcik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIERldGFjaGVzIGEgdmlldyBmcm9tIHRoaXMgY29udGFpbmVyIHdpdGhvdXQgZGVzdHJveWluZyBpdC5cbiAgICogVXNlIGFsb25nIHdpdGggYGluc2VydCgpYCB0byBtb3ZlIGEgdmlldyB3aXRoaW4gdGhlIGN1cnJlbnQgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gaW5kZXggVGhlIDAtYmFzZWQgaW5kZXggb2YgdGhlIHZpZXcgdG8gZGV0YWNoLlxuICAgKiBJZiBub3Qgc3BlY2lmaWVkLCB0aGUgbGFzdCB2aWV3IGluIHRoZSBjb250YWluZXIgaXMgZGV0YWNoZWQuXG4gICAqL1xuICBhYnN0cmFjdCBkZXRhY2goaW5kZXg/OiBudW1iZXIpOiBWaWV3UmVmfG51bGw7XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKiBAbm9jb2xsYXBzZVxuICAgKi9cbiAgc3RhdGljIF9fTkdfRUxFTUVOVF9JRF9fOiAoKSA9PiBWaWV3Q29udGFpbmVyUmVmID0gaW5qZWN0Vmlld0NvbnRhaW5lclJlZjtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgVmlld0NvbnRhaW5lclJlZiBhbmQgc3RvcmVzIGl0IG9uIHRoZSBpbmplY3Rvci4gT3IsIGlmIHRoZSBWaWV3Q29udGFpbmVyUmVmXG4gKiBhbHJlYWR5IGV4aXN0cywgcmV0cmlldmVzIHRoZSBleGlzdGluZyBWaWV3Q29udGFpbmVyUmVmLlxuICpcbiAqIEByZXR1cm5zIFRoZSBWaWV3Q29udGFpbmVyUmVmIGluc3RhbmNlIHRvIHVzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5qZWN0Vmlld0NvbnRhaW5lclJlZigpOiBWaWV3Q29udGFpbmVyUmVmIHtcbiAgY29uc3QgcHJldmlvdXNUTm9kZSA9IGdldEN1cnJlbnRUTm9kZSgpIGFzIFRFbGVtZW50Tm9kZSB8IFRFbGVtZW50Q29udGFpbmVyTm9kZSB8IFRDb250YWluZXJOb2RlO1xuICByZXR1cm4gY3JlYXRlQ29udGFpbmVyUmVmKHByZXZpb3VzVE5vZGUsIGdldExWaWV3KCkpO1xufVxuXG5jb25zdCBWRV9WaWV3Q29udGFpbmVyUmVmID0gVmlld0NvbnRhaW5lclJlZjtcblxuLy8gVE9ETyhhbHhodWIpOiBjbGVhbmluZyB1cCB0aGlzIGluZGlyZWN0aW9uIHRyaWdnZXJzIGEgc3VidGxlIGJ1ZyBpbiBDbG9zdXJlIGluIGczLiBPbmNlIHRoZSBmaXhcbi8vIGZvciB0aGF0IGxhbmRzLCB0aGlzIGNhbiBiZSBjbGVhbmVkIHVwLlxuY29uc3QgUjNWaWV3Q29udGFpbmVyUmVmID0gY2xhc3MgVmlld0NvbnRhaW5lclJlZiBleHRlbmRzIFZFX1ZpZXdDb250YWluZXJSZWYge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgX2xDb250YWluZXI6IExDb250YWluZXIsXG4gICAgICBwcml2YXRlIF9ob3N0VE5vZGU6IFRFbGVtZW50Tm9kZXxUQ29udGFpbmVyTm9kZXxURWxlbWVudENvbnRhaW5lck5vZGUsXG4gICAgICBwcml2YXRlIF9ob3N0TFZpZXc6IExWaWV3KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldCBlbGVtZW50KCk6IEVsZW1lbnRSZWYge1xuICAgIHJldHVybiBjcmVhdGVFbGVtZW50UmVmKHRoaXMuX2hvc3RUTm9kZSwgdGhpcy5faG9zdExWaWV3KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldCBpbmplY3RvcigpOiBJbmplY3RvciB7XG4gICAgcmV0dXJuIG5ldyBOb2RlSW5qZWN0b3IodGhpcy5faG9zdFROb2RlLCB0aGlzLl9ob3N0TFZpZXcpO1xuICB9XG5cbiAgLyoqIEBkZXByZWNhdGVkIE5vIHJlcGxhY2VtZW50ICovXG4gIG92ZXJyaWRlIGdldCBwYXJlbnRJbmplY3RvcigpOiBJbmplY3RvciB7XG4gICAgY29uc3QgcGFyZW50TG9jYXRpb24gPSBnZXRQYXJlbnRJbmplY3RvckxvY2F0aW9uKHRoaXMuX2hvc3RUTm9kZSwgdGhpcy5faG9zdExWaWV3KTtcbiAgICBpZiAoaGFzUGFyZW50SW5qZWN0b3IocGFyZW50TG9jYXRpb24pKSB7XG4gICAgICBjb25zdCBwYXJlbnRWaWV3ID0gZ2V0UGFyZW50SW5qZWN0b3JWaWV3KHBhcmVudExvY2F0aW9uLCB0aGlzLl9ob3N0TFZpZXcpO1xuICAgICAgY29uc3QgaW5qZWN0b3JJbmRleCA9IGdldFBhcmVudEluamVjdG9ySW5kZXgocGFyZW50TG9jYXRpb24pO1xuICAgICAgbmdEZXZNb2RlICYmIGFzc2VydE5vZGVJbmplY3RvcihwYXJlbnRWaWV3LCBpbmplY3RvckluZGV4KTtcbiAgICAgIGNvbnN0IHBhcmVudFROb2RlID1cbiAgICAgICAgICBwYXJlbnRWaWV3W1RWSUVXXS5kYXRhW2luamVjdG9ySW5kZXggKyBOb2RlSW5qZWN0b3JPZmZzZXQuVE5PREVdIGFzIFRFbGVtZW50Tm9kZTtcbiAgICAgIHJldHVybiBuZXcgTm9kZUluamVjdG9yKHBhcmVudFROb2RlLCBwYXJlbnRWaWV3KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5ldyBOb2RlSW5qZWN0b3IobnVsbCwgdGhpcy5faG9zdExWaWV3KTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBjbGVhcigpOiB2b2lkIHtcbiAgICB3aGlsZSAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLnJlbW92ZSh0aGlzLmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGdldChpbmRleDogbnVtYmVyKTogVmlld1JlZnxudWxsIHtcbiAgICBjb25zdCB2aWV3UmVmcyA9IGdldFZpZXdSZWZzKHRoaXMuX2xDb250YWluZXIpO1xuICAgIHJldHVybiB2aWV3UmVmcyAhPT0gbnVsbCAmJiB2aWV3UmVmc1tpbmRleF0gfHwgbnVsbDtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fbENvbnRhaW5lci5sZW5ndGggLSBDT05UQUlORVJfSEVBREVSX09GRlNFVDtcbiAgfVxuXG4gIG92ZXJyaWRlIGNyZWF0ZUVtYmVkZGVkVmlldzxDPih0ZW1wbGF0ZVJlZjogVGVtcGxhdGVSZWY8Qz4sIGNvbnRleHQ/OiBDLCBvcHRpb25zPzoge1xuICAgIGluZGV4PzogbnVtYmVyLFxuICAgIGluamVjdG9yPzogSW5qZWN0b3JcbiAgfSk6IEVtYmVkZGVkVmlld1JlZjxDPjtcbiAgb3ZlcnJpZGUgY3JlYXRlRW1iZWRkZWRWaWV3PEM+KHRlbXBsYXRlUmVmOiBUZW1wbGF0ZVJlZjxDPiwgY29udGV4dD86IEMsIGluZGV4PzogbnVtYmVyKTpcbiAgICAgIEVtYmVkZGVkVmlld1JlZjxDPjtcbiAgb3ZlcnJpZGUgY3JlYXRlRW1iZWRkZWRWaWV3PEM+KHRlbXBsYXRlUmVmOiBUZW1wbGF0ZVJlZjxDPiwgY29udGV4dD86IEMsIGluZGV4T3JPcHRpb25zPzogbnVtYmVyfHtcbiAgICBpbmRleD86IG51bWJlcixcbiAgICBpbmplY3Rvcj86IEluamVjdG9yXG4gIH0pOiBFbWJlZGRlZFZpZXdSZWY8Qz4ge1xuICAgIGxldCBpbmRleDogbnVtYmVyfHVuZGVmaW5lZDtcbiAgICBsZXQgaW5qZWN0b3I6IEluamVjdG9yfHVuZGVmaW5lZDtcblxuICAgIGlmICh0eXBlb2YgaW5kZXhPck9wdGlvbnMgPT09ICdudW1iZXInKSB7XG4gICAgICBpbmRleCA9IGluZGV4T3JPcHRpb25zO1xuICAgIH0gZWxzZSBpZiAoaW5kZXhPck9wdGlvbnMgIT0gbnVsbCkge1xuICAgICAgaW5kZXggPSBpbmRleE9yT3B0aW9ucy5pbmRleDtcbiAgICAgIGluamVjdG9yID0gaW5kZXhPck9wdGlvbnMuaW5qZWN0b3I7XG4gICAgfVxuXG4gICAgbGV0IGh5ZHJhdGlvbkluZm86IE5naFZpZXd8bnVsbCA9IG51bGw7XG4gICAgY29uc3Qgc3NySWQgPSAodGVtcGxhdGVSZWYgYXMgdW5rbm93biBhcyB7c3NySWQ6IHN0cmluZyB8IG51bGx9KS5zc3JJZDtcbiAgICBpZiAoc3NySWQpIHtcbiAgICAgIGh5ZHJhdGlvbkluZm8gPSBmaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlldyh0aGlzLl9sQ29udGFpbmVyLCBzc3JJZCk7XG4gICAgfVxuXG4gICAgY29uc3Qgdmlld1JlZiA9IHRlbXBsYXRlUmVmLmNyZWF0ZUVtYmVkZGVkVmlld1dpdGhIeWRyYXRpb24oY29udGV4dCB8fCA8YW55Pnt9LCBpbmplY3RvciwgaHlkcmF0aW9uSW5mbyk7XG5cbiAgICB0aGlzLmluc2VydCh2aWV3UmVmLCBpbmRleCk7XG4gICAgcmV0dXJuIHZpZXdSZWY7XG4gIH1cblxuICBvdmVycmlkZSBjcmVhdGVDb21wb25lbnQ8Qz4oY29tcG9uZW50VHlwZTogVHlwZTxDPiwgb3B0aW9ucz86IHtcbiAgICBpbmRleD86IG51bWJlcixcbiAgICBpbmplY3Rvcj86IEluamVjdG9yLFxuICAgIHByb2plY3RhYmxlTm9kZXM/OiBOb2RlW11bXSxcbiAgICBuZ01vZHVsZVJlZj86IE5nTW9kdWxlUmVmPHVua25vd24+LFxuICB9KTogQ29tcG9uZW50UmVmPEM+O1xuICAvKipcbiAgICogQGRlcHJlY2F0ZWQgQW5ndWxhciBubyBsb25nZXIgcmVxdWlyZXMgY29tcG9uZW50IGZhY3RvcmllcyB0byBkeW5hbWljYWxseSBjcmVhdGUgY29tcG9uZW50cy5cbiAgICogICAgIFVzZSBkaWZmZXJlbnQgc2lnbmF0dXJlIG9mIHRoZSBgY3JlYXRlQ29tcG9uZW50YCBtZXRob2QsIHdoaWNoIGFsbG93cyBwYXNzaW5nXG4gICAqICAgICBDb21wb25lbnQgY2xhc3MgZGlyZWN0bHkuXG4gICAqL1xuICBvdmVycmlkZSBjcmVhdGVDb21wb25lbnQ8Qz4oXG4gICAgICBjb21wb25lbnRGYWN0b3J5OiBDb21wb25lbnRGYWN0b3J5PEM+LCBpbmRleD86IG51bWJlcnx1bmRlZmluZWQsXG4gICAgICBpbmplY3Rvcj86IEluamVjdG9yfHVuZGVmaW5lZCwgcHJvamVjdGFibGVOb2Rlcz86IGFueVtdW118dW5kZWZpbmVkLFxuICAgICAgZW52aXJvbm1lbnRJbmplY3Rvcj86IEVudmlyb25tZW50SW5qZWN0b3J8TmdNb2R1bGVSZWY8YW55Pnx1bmRlZmluZWQpOiBDb21wb25lbnRSZWY8Qz47XG4gIG92ZXJyaWRlIGNyZWF0ZUNvbXBvbmVudDxDPihcbiAgICAgIGNvbXBvbmVudEZhY3RvcnlPclR5cGU6IENvbXBvbmVudEZhY3Rvcnk8Qz58VHlwZTxDPiwgaW5kZXhPck9wdGlvbnM/OiBudW1iZXJ8dW5kZWZpbmVkfHtcbiAgICAgICAgaW5kZXg/OiBudW1iZXIsXG4gICAgICAgIGluamVjdG9yPzogSW5qZWN0b3IsXG4gICAgICAgIG5nTW9kdWxlUmVmPzogTmdNb2R1bGVSZWY8dW5rbm93bj4sXG4gICAgICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yfE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgICAgICBwcm9qZWN0YWJsZU5vZGVzPzogTm9kZVtdW10sXG4gICAgICB9LFxuICAgICAgaW5qZWN0b3I/OiBJbmplY3Rvcnx1bmRlZmluZWQsIHByb2plY3RhYmxlTm9kZXM/OiBhbnlbXVtdfHVuZGVmaW5lZCxcbiAgICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yfE5nTW9kdWxlUmVmPGFueT58dW5kZWZpbmVkKTogQ29tcG9uZW50UmVmPEM+IHtcbiAgICBjb25zdCBpc0NvbXBvbmVudEZhY3RvcnkgPSBjb21wb25lbnRGYWN0b3J5T3JUeXBlICYmICFpc1R5cGUoY29tcG9uZW50RmFjdG9yeU9yVHlwZSk7XG4gICAgbGV0IGluZGV4OiBudW1iZXJ8dW5kZWZpbmVkO1xuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBzdXBwb3J0cyAyIHNpZ25hdHVyZXMgYW5kIHdlIG5lZWQgdG8gaGFuZGxlIG9wdGlvbnMgY29ycmVjdGx5IGZvciBib3RoOlxuICAgIC8vICAgMS4gV2hlbiBmaXJzdCBhcmd1bWVudCBpcyBhIENvbXBvbmVudCB0eXBlLiBUaGlzIHNpZ25hdHVyZSBhbHNvIHJlcXVpcmVzIGV4dHJhXG4gICAgLy8gICAgICBvcHRpb25zIHRvIGJlIHByb3ZpZGVkIGFzIGFzIG9iamVjdCAobW9yZSBlcmdvbm9taWMgb3B0aW9uKS5cbiAgICAvLyAgIDIuIEZpcnN0IGFyZ3VtZW50IGlzIGEgQ29tcG9uZW50IGZhY3RvcnkuIEluIHRoaXMgY2FzZSBleHRyYSBvcHRpb25zIGFyZSByZXByZXNlbnRlZCBhc1xuICAgIC8vICAgICAgcG9zaXRpb25hbCBhcmd1bWVudHMuIFRoaXMgc2lnbmF0dXJlIGlzIGxlc3MgZXJnb25vbWljIGFuZCB3aWxsIGJlIGRlcHJlY2F0ZWQuXG4gICAgaWYgKGlzQ29tcG9uZW50RmFjdG9yeSkge1xuICAgICAgaWYgKG5nRGV2TW9kZSkge1xuICAgICAgICBhc3NlcnRFcXVhbChcbiAgICAgICAgICAgIHR5cGVvZiBpbmRleE9yT3B0aW9ucyAhPT0gJ29iamVjdCcsIHRydWUsXG4gICAgICAgICAgICAnSXQgbG9va3MgbGlrZSBDb21wb25lbnQgZmFjdG9yeSB3YXMgcHJvdmlkZWQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50ICcgK1xuICAgICAgICAgICAgICAgICdhbmQgYW4gb3B0aW9ucyBvYmplY3QgYXMgdGhlIHNlY29uZCBhcmd1bWVudC4gVGhpcyBjb21iaW5hdGlvbiBvZiBhcmd1bWVudHMgJyArXG4gICAgICAgICAgICAgICAgJ2lzIGluY29tcGF0aWJsZS4gWW91IGNhbiBlaXRoZXIgY2hhbmdlIHRoZSBmaXJzdCBhcmd1bWVudCB0byBwcm92aWRlIENvbXBvbmVudCAnICtcbiAgICAgICAgICAgICAgICAndHlwZSBvciBjaGFuZ2UgdGhlIHNlY29uZCBhcmd1bWVudCB0byBiZSBhIG51bWJlciAocmVwcmVzZW50aW5nIGFuIGluZGV4IGF0ICcgK1xuICAgICAgICAgICAgICAgICd3aGljaCB0byBpbnNlcnQgdGhlIG5ldyBjb21wb25lbnRcXCdzIGhvc3QgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyKScpO1xuICAgICAgfVxuICAgICAgaW5kZXggPSBpbmRleE9yT3B0aW9ucyBhcyBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChuZ0Rldk1vZGUpIHtcbiAgICAgICAgYXNzZXJ0RGVmaW5lZChcbiAgICAgICAgICAgIGdldENvbXBvbmVudERlZihjb21wb25lbnRGYWN0b3J5T3JUeXBlKSxcbiAgICAgICAgICAgIGBQcm92aWRlZCBDb21wb25lbnQgY2xhc3MgZG9lc24ndCBjb250YWluIENvbXBvbmVudCBkZWZpbml0aW9uLiBgICtcbiAgICAgICAgICAgICAgICBgUGxlYXNlIGNoZWNrIHdoZXRoZXIgcHJvdmlkZWQgY2xhc3MgaGFzIEBDb21wb25lbnQgZGVjb3JhdG9yLmApO1xuICAgICAgICBhc3NlcnRFcXVhbChcbiAgICAgICAgICAgIHR5cGVvZiBpbmRleE9yT3B0aW9ucyAhPT0gJ251bWJlcicsIHRydWUsXG4gICAgICAgICAgICAnSXQgbG9va3MgbGlrZSBDb21wb25lbnQgdHlwZSB3YXMgcHJvdmlkZWQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50ICcgK1xuICAgICAgICAgICAgICAgICdhbmQgYSBudW1iZXIgKHJlcHJlc2VudGluZyBhbiBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIG5ldyBjb21wb25lbnRcXCdzICcgK1xuICAgICAgICAgICAgICAgICdob3N0IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lciBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50LiBUaGlzIGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyAnICtcbiAgICAgICAgICAgICAgICAnaXMgaW5jb21wYXRpYmxlLiBQbGVhc2UgdXNlIGFuIG9iamVjdCBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50IGluc3RlYWQuJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBvcHRpb25zID0gKGluZGV4T3JPcHRpb25zIHx8IHt9KSBhcyB7XG4gICAgICAgIGluZGV4PzogbnVtYmVyLFxuICAgICAgICBpbmplY3Rvcj86IEluamVjdG9yLFxuICAgICAgICBuZ01vZHVsZVJlZj86IE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgICAgICBlbnZpcm9ubWVudEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3RvciB8IE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgICAgICBwcm9qZWN0YWJsZU5vZGVzPzogTm9kZVtdW10sXG4gICAgICB9O1xuICAgICAgaWYgKG5nRGV2TW9kZSAmJiBvcHRpb25zLmVudmlyb25tZW50SW5qZWN0b3IgJiYgb3B0aW9ucy5uZ01vZHVsZVJlZikge1xuICAgICAgICB0aHJvd0Vycm9yKFxuICAgICAgICAgICAgYENhbm5vdCBwYXNzIGJvdGggZW52aXJvbm1lbnRJbmplY3RvciBhbmQgbmdNb2R1bGVSZWYgb3B0aW9ucyB0byBjcmVhdGVDb21wb25lbnQoKS5gKTtcbiAgICAgIH1cbiAgICAgIGluZGV4ID0gb3B0aW9ucy5pbmRleDtcbiAgICAgIGluamVjdG9yID0gb3B0aW9ucy5pbmplY3RvcjtcbiAgICAgIHByb2plY3RhYmxlTm9kZXMgPSBvcHRpb25zLnByb2plY3RhYmxlTm9kZXM7XG4gICAgICBlbnZpcm9ubWVudEluamVjdG9yID0gb3B0aW9ucy5lbnZpcm9ubWVudEluamVjdG9yIHx8IG9wdGlvbnMubmdNb2R1bGVSZWY7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcG9uZW50RmFjdG9yeTogQ29tcG9uZW50RmFjdG9yeTxDPiA9IGlzQ29tcG9uZW50RmFjdG9yeSA/XG4gICAgICAgIGNvbXBvbmVudEZhY3RvcnlPclR5cGUgYXMgQ29tcG9uZW50RmFjdG9yeTxDPjpcbiAgICAgICAgbmV3IFIzQ29tcG9uZW50RmFjdG9yeShnZXRDb21wb25lbnREZWYoY29tcG9uZW50RmFjdG9yeU9yVHlwZSkhKTtcbiAgICBjb25zdCBjb250ZXh0SW5qZWN0b3IgPSBpbmplY3RvciB8fCB0aGlzLnBhcmVudEluamVjdG9yO1xuXG4gICAgLy8gSWYgYW4gYE5nTW9kdWxlUmVmYCBpcyBub3QgcHJvdmlkZWQgZXhwbGljaXRseSwgdHJ5IHJldHJpZXZpbmcgaXQgZnJvbSB0aGUgREkgdHJlZS5cbiAgICBpZiAoIWVudmlyb25tZW50SW5qZWN0b3IgJiYgKGNvbXBvbmVudEZhY3RvcnkgYXMgYW55KS5uZ01vZHVsZSA9PSBudWxsKSB7XG4gICAgICAvLyBGb3IgdGhlIGBDb21wb25lbnRGYWN0b3J5YCBjYXNlLCBlbnRlcmluZyB0aGlzIGxvZ2ljIGlzIHZlcnkgdW5saWtlbHksIHNpbmNlIHdlIGV4cGVjdCB0aGF0XG4gICAgICAvLyBhbiBpbnN0YW5jZSBvZiBhIGBDb21wb25lbnRGYWN0b3J5YCwgcmVzb2x2ZWQgdmlhIGBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXJgIHdvdWxkIGhhdmUgYW5cbiAgICAgIC8vIGBuZ01vZHVsZWAgZmllbGQuIFRoaXMgaXMgcG9zc2libGUgaW4gc29tZSB0ZXN0IHNjZW5hcmlvcyBhbmQgcG90ZW50aWFsbHkgaW4gc29tZSBKSVQtYmFzZWRcbiAgICAgIC8vIHVzZS1jYXNlcy4gRm9yIHRoZSBgQ29tcG9uZW50RmFjdG9yeWAgY2FzZSB3ZSBwcmVzZXJ2ZSBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBhbmQgdHJ5XG4gICAgICAvLyB1c2luZyBhIHByb3ZpZGVkIGluamVjdG9yIGZpcnN0LCB0aGVuIGZhbGwgYmFjayB0byB0aGUgcGFyZW50IGluamVjdG9yIG9mIHRoaXNcbiAgICAgIC8vIGBWaWV3Q29udGFpbmVyUmVmYCBpbnN0YW5jZS5cbiAgICAgIC8vXG4gICAgICAvLyBGb3IgdGhlIGZhY3RvcnktbGVzcyBjYXNlLCBpdCdzIGNyaXRpY2FsIHRvIGVzdGFibGlzaCBhIGNvbm5lY3Rpb24gd2l0aCB0aGUgbW9kdWxlXG4gICAgICAvLyBpbmplY3RvciB0cmVlIChieSByZXRyaWV2aW5nIGFuIGluc3RhbmNlIG9mIGFuIGBOZ01vZHVsZVJlZmAgYW5kIGFjY2Vzc2luZyBpdHMgaW5qZWN0b3IpLFxuICAgICAgLy8gc28gdGhhdCBhIGNvbXBvbmVudCBjYW4gdXNlIERJIHRva2VucyBwcm92aWRlZCBpbiBNZ01vZHVsZXMuIEZvciB0aGlzIHJlYXNvbiwgd2UgY2FuIG5vdFxuICAgICAgLy8gcmVseSBvbiB0aGUgcHJvdmlkZWQgaW5qZWN0b3IsIHNpbmNlIGl0IG1pZ2h0IGJlIGRldGFjaGVkIGZyb20gdGhlIERJIHRyZWUgKGZvciBleGFtcGxlLCBpZlxuICAgICAgLy8gaXQgd2FzIGNyZWF0ZWQgdmlhIGBJbmplY3Rvci5jcmVhdGVgIHdpdGhvdXQgc3BlY2lmeWluZyBhIHBhcmVudCBpbmplY3Rvciwgb3IgaWYgYW5cbiAgICAgIC8vIGluamVjdG9yIGlzIHJldHJpZXZlZCBmcm9tIGFuIGBOZ01vZHVsZVJlZmAgY3JlYXRlZCB2aWEgYGNyZWF0ZU5nTW9kdWxlYCB1c2luZyBhblxuICAgICAgLy8gTmdNb2R1bGUgb3V0c2lkZSBvZiBhIG1vZHVsZSB0cmVlKS4gSW5zdGVhZCwgd2UgYWx3YXlzIHVzZSBgVmlld0NvbnRhaW5lclJlZmAncyBwYXJlbnRcbiAgICAgIC8vIGluamVjdG9yLCB3aGljaCBpcyBub3JtYWxseSBjb25uZWN0ZWQgdG8gdGhlIERJIHRyZWUsIHdoaWNoIGluY2x1ZGVzIG1vZHVsZSBpbmplY3RvclxuICAgICAgLy8gc3VidHJlZS5cbiAgICAgIGNvbnN0IF9pbmplY3RvciA9IGlzQ29tcG9uZW50RmFjdG9yeSA/IGNvbnRleHRJbmplY3RvciA6IHRoaXMucGFyZW50SW5qZWN0b3I7XG5cbiAgICAgIC8vIERPIE5PVCBSRUZBQ1RPUi4gVGhlIGNvZGUgaGVyZSB1c2VkIHRvIGhhdmUgYSBgaW5qZWN0b3IuZ2V0KE5nTW9kdWxlUmVmLCBudWxsKSB8fFxuICAgICAgLy8gdW5kZWZpbmVkYCBleHByZXNzaW9uIHdoaWNoIHNlZW1zIHRvIGNhdXNlIGludGVybmFsIGdvb2dsZSBhcHBzIHRvIGZhaWwuIFRoaXMgaXMgZG9jdW1lbnRlZFxuICAgICAgLy8gaW4gdGhlIGZvbGxvd2luZyBpbnRlcm5hbCBidWcgaXNzdWU6IGdvL2IvMTQyOTY3ODAyXG4gICAgICBjb25zdCByZXN1bHQgPSBfaW5qZWN0b3IuZ2V0KEVudmlyb25tZW50SW5qZWN0b3IsIG51bGwpO1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICBlbnZpcm9ubWVudEluamVjdG9yID0gcmVzdWx0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE86IHRoaXMgaXMgbm90IGNvcnJlY3QgZm9yIHNlbGVjdG9ycyBsaWtlIGBhcHBbcGFyYW1dYCxcbiAgICAvLyB3ZSBuZWVkIHRvIHJlbHkgb24gc29tZSBvdGhlciBpbmZvIChsaWtlIGNvbXBvbmVudCBpZCkuXG4gICAgY29uc3QgZWxlbWVudE5hbWUgPSBjb21wb25lbnRGYWN0b3J5LnNlbGVjdG9yO1xuICAgIGNvbnN0IGRlaHlkcmF0ZWRWaWV3ID0gZmluZE1hdGNoaW5nRGVoeWRyYXRlZFZpZXcodGhpcy5fbENvbnRhaW5lciwgZWxlbWVudE5hbWUpO1xuICAgIGxldCByTm9kZTtcbiAgICBsZXQgaHlkcmF0aW9uRG9tSW5mbzogTmdoRG9tfG51bGwgPSBudWxsO1xuXG4gICAgaWYgKGRlaHlkcmF0ZWRWaWV3KSB7XG4gICAgICAvLyBQb2ludGVyIHRvIGEgaG9zdCBET00gZWxlbWVudC5cbiAgICAgIHJOb2RlID0gZGVoeWRyYXRlZFZpZXcuZmlyc3RDaGlsZDtcblxuICAgICAgLy8gUmVhZCBoeWRyYXRpb24gaW5mbyBhbmQgcGFzcyBpdCBvdmVyIHRvIHRoZSBjb21wb25lbnQgdmlldy5cbiAgICAgIGNvbnN0IG5naCA9IChyTm9kZSBhcyBIVE1MRWxlbWVudCkuZ2V0QXR0cmlidXRlKCduZ2gnKTtcbiAgICAgIGlmIChuZ2gpIHtcbiAgICAgICAgaHlkcmF0aW9uRG9tSW5mbyA9IEpTT04ucGFyc2UobmdoKSBhcyBOZ2hEb207XG4gICAgICAgIGh5ZHJhdGlvbkRvbUluZm8uZmlyc3RDaGlsZCA9IHJOb2RlLmZpcnN0Q2hpbGQgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgIChyTm9kZSBhcyBIVE1MRWxlbWVudCkucmVtb3ZlQXR0cmlidXRlKCduZ2gnKTtcbiAgICAgICAgbmdEZXZNb2RlICYmIG1hcmtSTm9kZUFzQ2xhaW1lZEZvckh5ZHJhdGlvbihyTm9kZSEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbXBvbmVudFJlZiA9XG4gICAgICAgIGNvbXBvbmVudEZhY3RvcnkuY3JlYXRlV2l0aEh5ZHJhdGlvbihjb250ZXh0SW5qZWN0b3IsIHByb2plY3RhYmxlTm9kZXMsIHJOb2RlLCBlbnZpcm9ubWVudEluamVjdG9yLCBoeWRyYXRpb25Eb21JbmZvKTtcblxuICAgIHRoaXMuaW5zZXJ0KGNvbXBvbmVudFJlZi5ob3N0VmlldywgaW5kZXgpO1xuICAgIHJldHVybiBjb21wb25lbnRSZWY7XG4gIH1cblxuICBvdmVycmlkZSBpbnNlcnQodmlld1JlZjogVmlld1JlZiwgaW5kZXg/OiBudW1iZXIpOiBWaWV3UmVmIHtcbiAgICBjb25zdCBsVmlldyA9ICh2aWV3UmVmIGFzIFIzVmlld1JlZjxhbnk+KS5fbFZpZXchO1xuICAgIGNvbnN0IHRWaWV3ID0gbFZpZXdbVFZJRVddO1xuXG4gICAgaWYgKG5nRGV2TW9kZSAmJiB2aWV3UmVmLmRlc3Ryb3llZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgaW5zZXJ0IGEgZGVzdHJveWVkIFZpZXcgaW4gYSBWaWV3Q29udGFpbmVyIScpO1xuICAgIH1cblxuICAgIGlmICh2aWV3QXR0YWNoZWRUb0NvbnRhaW5lcihsVmlldykpIHtcbiAgICAgIC8vIElmIHZpZXcgaXMgYWxyZWFkeSBhdHRhY2hlZCwgZGV0YWNoIGl0IGZpcnN0IHNvIHdlIGNsZWFuIHVwIHJlZmVyZW5jZXMgYXBwcm9wcmlhdGVseS5cblxuICAgICAgY29uc3QgcHJldklkeCA9IHRoaXMuaW5kZXhPZih2aWV3UmVmKTtcblxuICAgICAgLy8gQSB2aWV3IG1pZ2h0IGJlIGF0dGFjaGVkIGVpdGhlciB0byB0aGlzIG9yIGEgZGlmZmVyZW50IGNvbnRhaW5lci4gVGhlIGBwcmV2SWR4YCBmb3JcbiAgICAgIC8vIHRob3NlIGNhc2VzIHdpbGwgYmU6XG4gICAgICAvLyBlcXVhbCB0byAtMSBmb3Igdmlld3MgYXR0YWNoZWQgdG8gdGhpcyBWaWV3Q29udGFpbmVyUmVmXG4gICAgICAvLyA+PSAwIGZvciB2aWV3cyBhdHRhY2hlZCB0byBhIGRpZmZlcmVudCBWaWV3Q29udGFpbmVyUmVmXG4gICAgICBpZiAocHJldklkeCAhPT0gLTEpIHtcbiAgICAgICAgdGhpcy5kZXRhY2gocHJldklkeCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwcmV2TENvbnRhaW5lciA9IGxWaWV3W1BBUkVOVF0gYXMgTENvbnRhaW5lcjtcbiAgICAgICAgbmdEZXZNb2RlICYmXG4gICAgICAgICAgICBhc3NlcnRFcXVhbChcbiAgICAgICAgICAgICAgICBpc0xDb250YWluZXIocHJldkxDb250YWluZXIpLCB0cnVlLFxuICAgICAgICAgICAgICAgICdBbiBhdHRhY2hlZCB2aWV3IHNob3VsZCBoYXZlIGl0cyBQQVJFTlQgcG9pbnQgdG8gYSBjb250YWluZXIuJyk7XG5cblxuICAgICAgICAvLyBXZSBuZWVkIHRvIHJlLWNyZWF0ZSBhIFIzVmlld0NvbnRhaW5lclJlZiBpbnN0YW5jZSBzaW5jZSB0aG9zZSBhcmUgbm90IHN0b3JlZCBvblxuICAgICAgICAvLyBMVmlldyAobm9yIGFueXdoZXJlIGVsc2UpLlxuICAgICAgICBjb25zdCBwcmV2VkNSZWYgPSBuZXcgUjNWaWV3Q29udGFpbmVyUmVmKFxuICAgICAgICAgICAgcHJldkxDb250YWluZXIsIHByZXZMQ29udGFpbmVyW1RfSE9TVF0gYXMgVERpcmVjdGl2ZUhvc3ROb2RlLCBwcmV2TENvbnRhaW5lcltQQVJFTlRdKTtcblxuICAgICAgICBwcmV2VkNSZWYuZGV0YWNoKHByZXZWQ1JlZi5pbmRleE9mKHZpZXdSZWYpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBMb2dpY2FsIG9wZXJhdGlvbiBvZiBhZGRpbmcgYExWaWV3YCB0byBgTENvbnRhaW5lcmBcbiAgICBjb25zdCBhZGp1c3RlZElkeCA9IHRoaXMuX2FkanVzdEluZGV4KGluZGV4KTtcbiAgICBjb25zdCBsQ29udGFpbmVyID0gdGhpcy5fbENvbnRhaW5lcjtcbiAgICBpbnNlcnRWaWV3KHRWaWV3LCBsVmlldywgbENvbnRhaW5lciwgYWRqdXN0ZWRJZHgpO1xuXG4gICAgLy8gUGh5c2ljYWwgb3BlcmF0aW9uIG9mIGFkZGluZyB0aGUgRE9NIG5vZGVzLlxuICAgIC8vXG4gICAgLy8gSWYgYW4gTFZpZXcgaGFzIGh5ZHJhdGlvbiBpbmZvLCBhdm9pZCBpbnNlcnRpbmcgZWxlbWVudHNcbiAgICAvLyBlbGVtZW50cyBpbnRvIHRoZSBET00gYXMgdGhleSBhcmUgYWxyZWFkeSBhdHRhY2hlZC5cbiAgICAvL1xuICAgIC8vIFRPRE86IHNob3VsZCB3ZSByZXNldCB0aGUgYEhZRFJBVElPTl9JTkZPYCBhZnRlcndhcmRzP1xuICAgIC8vICAgICAgIFdpdGhvdXQgdGhhdCB0aGVyZSBtaWdodCBiZSBhIHByb2JsZW0gbGF0ZXIgb24gd2hlblxuICAgIC8vICAgICAgIHdlJ2QgdHJ5IHRvIGluc2VydC9tb3ZlIHRoZSB2aWV3IGFnYWluP1xuICAgIGlmICghbFZpZXdbSFlEUkFUSU9OX0lORk9dKSB7XG4gICAgICBjb25zdCBiZWZvcmVOb2RlID0gZ2V0QmVmb3JlTm9kZUZvclZpZXcoYWRqdXN0ZWRJZHgsIGxDb250YWluZXIpO1xuICAgICAgY29uc3QgcmVuZGVyZXIgPSBsVmlld1tSRU5ERVJFUl07XG4gICAgICBjb25zdCBwYXJlbnRSTm9kZSA9IG5hdGl2ZVBhcmVudE5vZGUocmVuZGVyZXIsIGxDb250YWluZXJbTkFUSVZFXSBhcyBSRWxlbWVudCB8IFJDb21tZW50KTtcbiAgICAgIGlmIChwYXJlbnRSTm9kZSAhPT0gbnVsbCkge1xuICAgICAgICBhZGRWaWV3VG9Db250YWluZXIodFZpZXcsIGxDb250YWluZXJbVF9IT1NUXSwgcmVuZGVyZXIsIGxWaWV3LCBwYXJlbnRSTm9kZSwgYmVmb3JlTm9kZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgKHZpZXdSZWYgYXMgUjNWaWV3UmVmPGFueT4pLmF0dGFjaFRvVmlld0NvbnRhaW5lclJlZigpO1xuICAgIGFkZFRvQXJyYXkoZ2V0T3JDcmVhdGVWaWV3UmVmcyhsQ29udGFpbmVyKSwgYWRqdXN0ZWRJZHgsIHZpZXdSZWYpO1xuXG4gICAgcmV0dXJuIHZpZXdSZWY7XG4gIH1cblxuICBvdmVycmlkZSBtb3ZlKHZpZXdSZWY6IFZpZXdSZWYsIG5ld0luZGV4OiBudW1iZXIpOiBWaWV3UmVmIHtcbiAgICBpZiAobmdEZXZNb2RlICYmIHZpZXdSZWYuZGVzdHJveWVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBtb3ZlIGEgZGVzdHJveWVkIFZpZXcgaW4gYSBWaWV3Q29udGFpbmVyIScpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5pbnNlcnQodmlld1JlZiwgbmV3SW5kZXgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgaW5kZXhPZih2aWV3UmVmOiBWaWV3UmVmKTogbnVtYmVyIHtcbiAgICBjb25zdCB2aWV3UmVmc0FyciA9IGdldFZpZXdSZWZzKHRoaXMuX2xDb250YWluZXIpO1xuICAgIHJldHVybiB2aWV3UmVmc0FyciAhPT0gbnVsbCA/IHZpZXdSZWZzQXJyLmluZGV4T2Yodmlld1JlZikgOiAtMTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlbW92ZShpbmRleD86IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IGFkanVzdGVkSWR4ID0gdGhpcy5fYWRqdXN0SW5kZXgoaW5kZXgsIC0xKTtcbiAgICBjb25zdCBkZXRhY2hlZFZpZXcgPSBkZXRhY2hWaWV3KHRoaXMuX2xDb250YWluZXIsIGFkanVzdGVkSWR4KTtcblxuICAgIGlmIChkZXRhY2hlZFZpZXcpIHtcbiAgICAgIC8vIEJlZm9yZSBkZXN0cm95aW5nIHRoZSB2aWV3LCByZW1vdmUgaXQgZnJvbSB0aGUgY29udGFpbmVyJ3MgYXJyYXkgb2YgYFZpZXdSZWZgcy5cbiAgICAgIC8vIFRoaXMgZW5zdXJlcyB0aGUgdmlldyBjb250YWluZXIgbGVuZ3RoIGlzIHVwZGF0ZWQgYmVmb3JlIGNhbGxpbmdcbiAgICAgIC8vIGBkZXN0cm95TFZpZXdgLCB3aGljaCBjb3VsZCByZWN1cnNpdmVseSBjYWxsIHZpZXcgY29udGFpbmVyIG1ldGhvZHMgdGhhdFxuICAgICAgLy8gcmVseSBvbiBhbiBhY2N1cmF0ZSBjb250YWluZXIgbGVuZ3RoLlxuICAgICAgLy8gKGUuZy4gYSBtZXRob2Qgb24gdGhpcyB2aWV3IGNvbnRhaW5lciBiZWluZyBjYWxsZWQgYnkgYSBjaGlsZCBkaXJlY3RpdmUncyBPbkRlc3Ryb3lcbiAgICAgIC8vIGxpZmVjeWNsZSBob29rKVxuICAgICAgcmVtb3ZlRnJvbUFycmF5KGdldE9yQ3JlYXRlVmlld1JlZnModGhpcy5fbENvbnRhaW5lciksIGFkanVzdGVkSWR4KTtcbiAgICAgIGRlc3Ryb3lMVmlldyhkZXRhY2hlZFZpZXdbVFZJRVddLCBkZXRhY2hlZFZpZXcpO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGRldGFjaChpbmRleD86IG51bWJlcik6IFZpZXdSZWZ8bnVsbCB7XG4gICAgY29uc3QgYWRqdXN0ZWRJZHggPSB0aGlzLl9hZGp1c3RJbmRleChpbmRleCwgLTEpO1xuICAgIGNvbnN0IHZpZXcgPSBkZXRhY2hWaWV3KHRoaXMuX2xDb250YWluZXIsIGFkanVzdGVkSWR4KTtcblxuICAgIGNvbnN0IHdhc0RldGFjaGVkID1cbiAgICAgICAgdmlldyAmJiByZW1vdmVGcm9tQXJyYXkoZ2V0T3JDcmVhdGVWaWV3UmVmcyh0aGlzLl9sQ29udGFpbmVyKSwgYWRqdXN0ZWRJZHgpICE9IG51bGw7XG4gICAgcmV0dXJuIHdhc0RldGFjaGVkID8gbmV3IFIzVmlld1JlZih2aWV3ISkgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWRqdXN0SW5kZXgoaW5kZXg/OiBudW1iZXIsIHNoaWZ0OiBudW1iZXIgPSAwKSB7XG4gICAgaWYgKGluZGV4ID09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLmxlbmd0aCArIHNoaWZ0O1xuICAgIH1cbiAgICBpZiAobmdEZXZNb2RlKSB7XG4gICAgICBhc3NlcnRHcmVhdGVyVGhhbihpbmRleCwgLTEsIGBWaWV3UmVmIGluZGV4IG11c3QgYmUgcG9zaXRpdmUsIGdvdCAke2luZGV4fWApO1xuICAgICAgLy8gKzEgYmVjYXVzZSBpdCdzIGxlZ2FsIHRvIGluc2VydCBhdCB0aGUgZW5kLlxuICAgICAgYXNzZXJ0TGVzc1RoYW4oaW5kZXgsIHRoaXMubGVuZ3RoICsgMSArIHNoaWZ0LCAnaW5kZXgnKTtcbiAgICB9XG4gICAgcmV0dXJuIGluZGV4O1xuICB9XG59O1xuXG5mdW5jdGlvbiBoYXNOZ05vbkh5ZHJhdGFibGVBdHRyKHROb2RlOiBUTm9kZSk6IGJvb2xlYW4ge1xuICAvLyBUT0RPOiB3ZSBuZWVkIHRvIGl0ZXJhdGUgb3ZlciBgdE5vZGUubWVyZ2VkQXR0cnNgIGJldHRlclxuICAvLyB0byBhdm9pZCBjYXNlcyB3aGVuIGBuZ05vbkh5ZHJhdGFibGVgIGlzIGFuIGF0dHJpYnV0ZSB2YWx1ZSxcbiAgLy8gZS5nLiBgPGRpdiB0aXRsZT1cIm5nTm9uSHlkcmF0YWJsZVwiPjwvZGl2PmAuXG4gIHJldHVybiAhIXROb2RlLm1lcmdlZEF0dHJzPy5pbmNsdWRlcygnbmdOb25IeWRyYXRhYmxlJyk7XG59XG5cbmZ1bmN0aW9uIGlzSW5Ob25IeWRyYXRhYmxlQmxvY2sodE5vZGU6IFROb2RlLCBsVmlldzogTFZpZXcpOiBib29sZWFuIHtcbiAgY29uc3QgZm91bmRUTm9kZSA9IG5hdmlnYXRlUGFyZW50VE5vZGVzKHROb2RlIGFzIFROb2RlLCBsVmlldywgaGFzTmdOb25IeWRyYXRhYmxlQXR0cik7XG4gIC8vIGluIGEgYmxvY2sgd2hlbiB3ZSBoYXZlIGEgVE5vZGUgYW5kIGl0J3MgZGlmZmVyZW50IHRoYW4gdGhlIHJvb3Qgbm9kZVxuICByZXR1cm4gZm91bmRUTm9kZSAhPT0gbnVsbCAmJiBmb3VuZFROb2RlICE9PSB0Tm9kZTtcbn1cblxuZnVuY3Rpb24gZ2V0Vmlld1JlZnMobENvbnRhaW5lcjogTENvbnRhaW5lcik6IFZpZXdSZWZbXXxudWxsIHtcbiAgcmV0dXJuIGxDb250YWluZXJbVklFV19SRUZTXSBhcyBWaWV3UmVmW107XG59XG5cbmZ1bmN0aW9uIGdldE9yQ3JlYXRlVmlld1JlZnMobENvbnRhaW5lcjogTENvbnRhaW5lcik6IFZpZXdSZWZbXSB7XG4gIHJldHVybiAobENvbnRhaW5lcltWSUVXX1JFRlNdIHx8IChsQ29udGFpbmVyW1ZJRVdfUkVGU10gPSBbXSkpIGFzIFZpZXdSZWZbXTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgVmlld0NvbnRhaW5lclJlZiBhbmQgc3RvcmVzIGl0IG9uIHRoZSBpbmplY3Rvci5cbiAqXG4gKiBAcGFyYW0gVmlld0NvbnRhaW5lclJlZlRva2VuIFRoZSBWaWV3Q29udGFpbmVyUmVmIHR5cGVcbiAqIEBwYXJhbSBFbGVtZW50UmVmVG9rZW4gVGhlIEVsZW1lbnRSZWYgdHlwZVxuICogQHBhcmFtIGhvc3RUTm9kZSBUaGUgbm9kZSB0aGF0IGlzIHJlcXVlc3RpbmcgYSBWaWV3Q29udGFpbmVyUmVmXG4gKiBAcGFyYW0gaG9zdExWaWV3IFRoZSB2aWV3IHRvIHdoaWNoIHRoZSBub2RlIGJlbG9uZ3NcbiAqIEByZXR1cm5zIFRoZSBWaWV3Q29udGFpbmVyUmVmIGluc3RhbmNlIHRvIHVzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29udGFpbmVyUmVmKFxuICAgIGhvc3RUTm9kZTogVEVsZW1lbnROb2RlfFRDb250YWluZXJOb2RlfFRFbGVtZW50Q29udGFpbmVyTm9kZSxcbiAgICBob3N0TFZpZXc6IExWaWV3KTogVmlld0NvbnRhaW5lclJlZiB7XG4gIG5nRGV2TW9kZSAmJiBhc3NlcnRUTm9kZVR5cGUoaG9zdFROb2RlLCBUTm9kZVR5cGUuQW55Q29udGFpbmVyIHwgVE5vZGVUeXBlLkFueVJOb2RlKTtcblxuICBsZXQgbENvbnRhaW5lcjogTENvbnRhaW5lcjtcbiAgbGV0IG5naENvbnRhaW5lcjogTmdoQ29udGFpbmVyO1xuICBsZXQgZGVoeWRyYXRlZFZpZXdzOiBOZ2hWaWV3W10gPSBbXTtcbiAgY29uc3QgbmdoID0gaG9zdExWaWV3W0hZRFJBVElPTl9JTkZPXTtcbiAgY29uc3QgaXNDcmVhdGluZyA9ICFuZ2ggfHwgaXNJbk5vbkh5ZHJhdGFibGVCbG9jayhob3N0VE5vZGUsIGhvc3RMVmlldyk7XG4gIGlmICghaXNDcmVhdGluZykge1xuICAgIGNvbnN0IGluZGV4ID0gaG9zdFROb2RlLmluZGV4IC0gSEVBREVSX09GRlNFVDtcbiAgICBuZ2hDb250YWluZXIgPSBuZ2guY29udGFpbmVyc1tpbmRleF07XG4gICAgbmdEZXZNb2RlICYmXG4gICAgICAgIGFzc2VydERlZmluZWQobmdoQ29udGFpbmVyLCAnVGhlcmUgaXMgbm8gaHlkcmF0aW9uIGluZm8gYXZhaWxhYmxlIGZvciB0aGlzIGNvbnRhaW5lcicpO1xuICB9XG5cbiAgY29uc3Qgc2xvdFZhbHVlID0gaG9zdExWaWV3W2hvc3RUTm9kZS5pbmRleF07XG4gIGlmIChpc0xDb250YWluZXIoc2xvdFZhbHVlKSkge1xuICAgIC8vIElmIHRoZSBob3N0IGlzIGEgY29udGFpbmVyLCB3ZSBkb24ndCBuZWVkIHRvIGNyZWF0ZSBhIG5ldyBMQ29udGFpbmVyXG4gICAgbENvbnRhaW5lciA9IHNsb3RWYWx1ZTtcbiAgfSBlbHNlIHtcbiAgICBsZXQgY29tbWVudE5vZGU6IFJDb21tZW50O1xuICAgIC8vIElmIHRoZSBob3N0IGlzIGFuIGVsZW1lbnQgY29udGFpbmVyLCB0aGUgbmF0aXZlIGhvc3QgZWxlbWVudCBpcyBndWFyYW50ZWVkIHRvIGJlIGFcbiAgICAvLyBjb21tZW50IGFuZCB3ZSBjYW4gcmV1c2UgdGhhdCBjb21tZW50IGFzIGFuY2hvciBlbGVtZW50IGZvciB0aGUgbmV3IExDb250YWluZXIuXG4gICAgLy8gVGhlIGNvbW1lbnQgbm9kZSBpbiBxdWVzdGlvbiBpcyBhbHJlYWR5IHBhcnQgb2YgdGhlIERPTSBzdHJ1Y3R1cmUgc28gd2UgZG9uJ3QgbmVlZCB0byBhcHBlbmRcbiAgICAvLyBpdCBhZ2Fpbi5cbiAgICBpZiAoaG9zdFROb2RlLnR5cGUgJiBUTm9kZVR5cGUuRWxlbWVudENvbnRhaW5lcikge1xuICAgICAgY29tbWVudE5vZGUgPSB1bndyYXBSTm9kZShzbG90VmFsdWUpIGFzIFJDb21tZW50O1xuICAgICAgaWYgKCFpc0NyZWF0aW5nICYmIG5naENvbnRhaW5lciEgJiYgQXJyYXkuaXNBcnJheShuZ2hDb250YWluZXIuZGVoeWRyYXRlZFZpZXdzKSkge1xuICAgICAgICAvLyBXaGVuIHdlIGNyZWF0ZSBhbiBMQ29udGFpbmVyIGJhc2VkIG9uIGA8bmctY29udGFpbmVyPmAsIHRoZSBjb250YWluZXJcbiAgICAgICAgLy8gaXMgYWxyZWFkeSBwcm9jZXNzZWQsIGluY2x1ZGluZyBkZWh5ZHJhdGVkIHZpZXdzIGluZm8uIFJldXNlIHRoaXMgaW5mb1xuICAgICAgICAvLyBhbmQgZXJhc2UgaXQgaW4gdGhlIG5naCBkYXRhIHRvIGF2b2lkIG1lbW9yeSBsZWFrcy5cbiAgICAgICAgZGVoeWRyYXRlZFZpZXdzID0gbmdoQ29udGFpbmVyLmRlaHlkcmF0ZWRWaWV3cyE7XG4gICAgICAgIG5naENvbnRhaW5lci5kZWh5ZHJhdGVkVmlld3MgPSBbXTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFpc0NyZWF0aW5nKSB7XG4gICAgICAgIC8vIFN0YXJ0IHdpdGggYSBub2RlIHRoYXQgaW1tZWRpYXRlbHkgZm9sbG93cyB0aGUgRE9NIG5vZGUgZm91bmRcbiAgICAgICAgLy8gaW4gYW4gTFZpZXcgc2xvdC4gVGhpcyBub2RlIGlzOlxuICAgICAgICAvLyAtIGVpdGhlciBhbiBhbmNob3IgY29tbWVudCBub2RlIG9mIHRoaXMgY29udGFpbmVyIGlmIGl0J3MgZW1wdHlcbiAgICAgICAgLy8gLSBvciBhIGZpcnN0IGVsZW1lbnQgb2YgdGhlIGZpcnN0IHZpZXcgaW4gdGhpcyBjb250YWluZXJcbiAgICAgICAgbGV0IGN1cnJlbnRSTm9kZSA9ICh1bndyYXBSTm9kZShzbG90VmFsdWUpIGFzIFJOb2RlKS5uZXh0U2libGluZztcbiAgICAgICAgLy8gVE9ETzogQWRkIGFzc2VydCB0aGF0IHRoZSBjdXJyZW50Uk5vZGUgZXhpc3RzXG4gICAgICAgIGNvbnN0IFthbmNob3JSTm9kZSwgdmlld3NdID0gbG9jYXRlRGVoeWRyYXRlZFZpZXdzSW5Db250YWluZXIoY3VycmVudFJOb2RlISwgbmdoQ29udGFpbmVyISk7XG5cbiAgICAgICAgY29tbWVudE5vZGUgPSBhbmNob3JSTm9kZSBhcyBSQ29tbWVudDtcbiAgICAgICAgZGVoeWRyYXRlZFZpZXdzID0gdmlld3M7XG5cbiAgICAgICAgbmdEZXZNb2RlICYmXG4gICAgICAgICAgICBhc3NlcnRSQ29tbWVudChjb21tZW50Tm9kZSwgJ0V4cGVjdGluZyBhIGNvbW1lbnQgbm9kZSBpbiB0ZW1wbGF0ZSBpbnN0cnVjdGlvbicpO1xuICAgICAgICBuZ0Rldk1vZGUgJiYgbWFya1JOb2RlQXNDbGFpbWVkRm9ySHlkcmF0aW9uKGNvbW1lbnROb2RlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHRoZSBob3N0IGlzIGEgcmVndWxhciBlbGVtZW50LCB3ZSBoYXZlIHRvIGluc2VydCBhIGNvbW1lbnQgbm9kZSBtYW51YWxseSB3aGljaCB3aWxsXG4gICAgICAgIC8vIGJlIHVzZWQgYXMgYW4gYW5jaG9yIHdoZW4gaW5zZXJ0aW5nIGVsZW1lbnRzLiBJbiB0aGlzIHNwZWNpZmljIGNhc2Ugd2UgdXNlIGxvdy1sZXZlbCBET01cbiAgICAgICAgLy8gbWFuaXB1bGF0aW9uIHRvIGluc2VydCBpdC5cbiAgICAgICAgY29uc3QgcmVuZGVyZXIgPSBob3N0TFZpZXdbUkVOREVSRVJdO1xuICAgICAgICBuZ0Rldk1vZGUgJiYgbmdEZXZNb2RlLnJlbmRlcmVyQ3JlYXRlQ29tbWVudCsrO1xuICAgICAgICBjb21tZW50Tm9kZSA9IHJlbmRlcmVyLmNyZWF0ZUNvbW1lbnQobmdEZXZNb2RlID8gJ2NvbnRhaW5lcicgOiAnJyk7XG5cbiAgICAgICAgY29uc3QgaG9zdE5hdGl2ZSA9IGdldE5hdGl2ZUJ5VE5vZGUoaG9zdFROb2RlLCBob3N0TFZpZXcpITtcbiAgICAgICAgY29uc3QgcGFyZW50T2ZIb3N0TmF0aXZlID0gbmF0aXZlUGFyZW50Tm9kZShyZW5kZXJlciwgaG9zdE5hdGl2ZSk7XG4gICAgICAgIG5hdGl2ZUluc2VydEJlZm9yZShcbiAgICAgICAgICAgIHJlbmRlcmVyLCBwYXJlbnRPZkhvc3ROYXRpdmUhLCBjb21tZW50Tm9kZSwgbmF0aXZlTmV4dFNpYmxpbmcocmVuZGVyZXIsIGhvc3ROYXRpdmUpLFxuICAgICAgICAgICAgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGhvc3RMVmlld1tob3N0VE5vZGUuaW5kZXhdID0gbENvbnRhaW5lciA9XG4gICAgICAgIGNyZWF0ZUxDb250YWluZXIoc2xvdFZhbHVlLCBob3N0TFZpZXcsIGNvbW1lbnROb2RlLCBob3N0VE5vZGUpO1xuXG4gICAgaWYgKG5naCAmJiBkZWh5ZHJhdGVkVmlld3MubGVuZ3RoID4gMCkge1xuICAgICAgbENvbnRhaW5lcltERUhZRFJBVEVEX1ZJRVdTXSA9IGRlaHlkcmF0ZWRWaWV3cztcbiAgICB9XG5cbiAgICBhZGRUb1ZpZXdUcmVlKGhvc3RMVmlldywgbENvbnRhaW5lcik7XG4gIH1cblxuICByZXR1cm4gbmV3IFIzVmlld0NvbnRhaW5lclJlZihsQ29udGFpbmVyLCBob3N0VE5vZGUsIGhvc3RMVmlldyk7XG59XG5cbmZ1bmN0aW9uIGZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3KGxDb250YWluZXI6IExDb250YWluZXIsIHRlbXBsYXRlOiBzdHJpbmcpOiBOZ2hWaWV3fG51bGwge1xuICBsZXQgaHlkcmF0aW9uSW5mbzogTmdoVmlld3xudWxsID0gbnVsbDtcbiAgaWYgKGxDb250YWluZXIgIT09IG51bGwgJiYgbENvbnRhaW5lcltERUhZRFJBVEVEX1ZJRVdTXSkge1xuICAgIC8vIERvZXMgdGhlIHRhcmdldCBjb250YWluZXIgaGF2ZSBhIHZpZXc/XG4gICAgY29uc3QgZGVoeWRyYXRlZFZpZXdzID0gbENvbnRhaW5lcltERUhZRFJBVEVEX1ZJRVdTXTtcbiAgICBpZiAoZGVoeWRyYXRlZFZpZXdzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIFRPRE86IHRha2UgaW50byBhY2NvdW50IGFuIGluZGV4IG9mIGEgdmlldyB3aXRoaW4gVmlld0NvbnRhaW5lclJlZixcbiAgICAgIC8vIG90aGVyd2lzZSwgd2UgbWF5IGVuZCB1cCByZXVzaW5nIHdyb25nIG5vZGVzIGZyb20gbGl2ZSBET00/XG4gICAgICBjb25zdCBkZWh5ZHJhdGVkVmlld0luZGV4ID0gZGVoeWRyYXRlZFZpZXdzLmZpbmRJbmRleCh2aWV3ID0+IHZpZXcudGVtcGxhdGUgPT09IHRlbXBsYXRlKTtcblxuICAgICAgaWYgKGRlaHlkcmF0ZWRWaWV3SW5kZXggPiAtMSkge1xuICAgICAgICBoeWRyYXRpb25JbmZvID0gZGVoeWRyYXRlZFZpZXdzW2RlaHlkcmF0ZWRWaWV3SW5kZXhdO1xuXG4gICAgICAgIC8vIERyb3AgdGhpcyB2aWV3IGZyb20gdGhlIGxpc3Qgb2YgZGUtaHlkcmF0ZWQgb25lcy5cbiAgICAgICAgZGVoeWRyYXRlZFZpZXdzLnNwbGljZShkZWh5ZHJhdGVkVmlld0luZGV4LCAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGh5ZHJhdGlvbkluZm87XG59XG4iXX0=