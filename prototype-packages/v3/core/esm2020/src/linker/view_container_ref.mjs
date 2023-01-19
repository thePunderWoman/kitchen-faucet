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
import { ComponentFactory as R3ComponentFactory, setCurrentHydrationInfo as setCurrentHydrationInfoForComponentRef } from '../render3/component_ref';
import { getComponentDef } from '../render3/definition';
import { getParentInjectorLocation, NodeInjector } from '../render3/di';
import { locateDehydratedViewsInContainer, markRNodeAsClaimedForHydration } from '../render3/hydration';
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
import { setCurrentHydrationInfo as setCurrentHydrationInfoForTemplateRef } from './template_ref';
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
        let origHydrationInfo = null;
        const ssrId = templateRef.ssrId;
        if (ssrId) {
            const newHydrationInfo = findMatchingDehydratedView(this._lContainer, ssrId);
            origHydrationInfo = setCurrentHydrationInfoForTemplateRef(newHydrationInfo);
        }
        debugger;
        const viewRef = templateRef.createEmbeddedView(context || {}, injector);
        if (ssrId) {
            // Reset hydration info...
            setCurrentHydrationInfoForTemplateRef(origHydrationInfo);
        }
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
        let origHydrationInfo = null;
        if (dehydratedView) {
            // Pointer to a host DOM element.
            rNode = dehydratedView.firstChild;
            // Read hydration info and pass it over to the component view.
            const ngh = rNode.getAttribute('ngh');
            if (ngh) {
                const hydrationInfo = JSON.parse(ngh);
                hydrationInfo.firstChild = rNode.firstChild;
                rNode.removeAttribute('ngh');
                origHydrationInfo = setCurrentHydrationInfoForComponentRef(hydrationInfo);
                ngDevMode && markRNodeAsClaimedForHydration(rNode);
            }
        }
        const componentRef = componentFactory.create(contextInjector, projectableNodes, rNode, environmentInjector);
        setCurrentHydrationInfoForComponentRef(null);
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
    if (ngh) {
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
            if (ngh && nghContainer && Array.isArray(nghContainer.dehydratedViews)) {
                // When we create an LContainer based on `<ng-container>`, the container
                // is already processed, including dehydrated views info. Reuse this info
                // and erase it in the ngh data to avoid memory leaks.
                dehydratedViews = nghContainer.dehydratedViews;
                nghContainer.dehydratedViews = [];
            }
        }
        else {
            if (ngh) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld19jb250YWluZXJfcmVmLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvbGlua2VyL3ZpZXdfY29udGFpbmVyX3JlZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFHSCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMsTUFBTSxFQUFPLE1BQU0sbUJBQW1CLENBQUM7QUFDL0MsT0FBTyxFQUFDLGtCQUFrQixFQUFFLGNBQWMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ3JFLE9BQU8sRUFBQyxnQkFBZ0IsSUFBSSxrQkFBa0IsRUFBRSx1QkFBdUIsSUFBSSxzQ0FBc0MsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ25KLE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMseUJBQXlCLEVBQUUsWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3RFLE9BQU8sRUFBbUIsZ0NBQWdDLEVBQW1CLDhCQUE4QixFQUFlLE1BQU0sc0JBQXNCLENBQUM7QUFDdkosT0FBTyxFQUFDLGFBQWEsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGdDQUFnQyxDQUFDO0FBQy9FLE9BQU8sRUFBQyx1QkFBdUIsRUFBRSxnQkFBZ0IsRUFBYyxNQUFNLEVBQUUsU0FBUyxFQUFDLE1BQU0saUNBQWlDLENBQUM7QUFJekgsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBNkIsYUFBYSxFQUFRLGNBQWMsRUFBZ0MsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFDMUssT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZELE9BQU8sRUFBQyxrQkFBa0IsRUFBRSxZ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QixDQUFDLEVBQUU7UUFDdkQseUNBQXlDO1FBQ3pDLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3JELElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDOUIsc0VBQXNFO1lBQ3RFLDhEQUE4RDtZQUM5RCxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDO1lBRTFGLElBQUksbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLEVBQUU7Z0JBQzVCLGFBQWEsR0FBRyxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFFckQsb0RBQW9EO2dCQUNwRCxlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ2hEO1NBQ0Y7S0FDRjtJQUNELE9BQU8sYUFBYSxDQUFDO0FBQ3ZCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtJbmplY3Rvcn0gZnJvbSAnLi4vZGkvaW5qZWN0b3InO1xuaW1wb3J0IHtFbnZpcm9ubWVudEluamVjdG9yfSBmcm9tICcuLi9kaS9yM19pbmplY3Rvcic7XG5pbXBvcnQge2lzVHlwZSwgVHlwZX0gZnJvbSAnLi4vaW50ZXJmYWNlL3R5cGUnO1xuaW1wb3J0IHthc3NlcnROb2RlSW5qZWN0b3IsIGFzc2VydFJDb21tZW50fSBmcm9tICcuLi9yZW5kZXIzL2Fzc2VydCc7XG5pbXBvcnQge0NvbXBvbmVudEZhY3RvcnkgYXMgUjNDb21wb25lbnRGYWN0b3J5LCBzZXRDdXJyZW50SHlkcmF0aW9uSW5mbyBhcyBzZXRDdXJyZW50SHlkcmF0aW9uSW5mb0ZvckNvbXBvbmVudFJlZn0gZnJvbSAnLi4vcmVuZGVyMy9jb21wb25lbnRfcmVmJztcbmltcG9ydCB7Z2V0Q29tcG9uZW50RGVmfSBmcm9tICcuLi9yZW5kZXIzL2RlZmluaXRpb24nO1xuaW1wb3J0IHtnZXRQYXJlbnRJbmplY3RvckxvY2F0aW9uLCBOb2RlSW5qZWN0b3J9IGZyb20gJy4uL3JlbmRlcjMvZGknO1xuaW1wb3J0IHtmaW5kRXhpc3RpbmdOb2RlLCBsb2NhdGVEZWh5ZHJhdGVkVmlld3NJbkNvbnRhaW5lciwgbG9jYXRlTmV4dFJOb2RlLCBtYXJrUk5vZGVBc0NsYWltZWRGb3JIeWRyYXRpb24sIHNpYmxpbmdBZnRlcn0gZnJvbSAnLi4vcmVuZGVyMy9oeWRyYXRpb24nO1xuaW1wb3J0IHthZGRUb1ZpZXdUcmVlLCBjcmVhdGVMQ29udGFpbmVyfSBmcm9tICcuLi9yZW5kZXIzL2luc3RydWN0aW9ucy9zaGFyZWQnO1xuaW1wb3J0IHtDT05UQUlORVJfSEVBREVSX09GRlNFVCwgREVIWURSQVRFRF9WSUVXUywgTENvbnRhaW5lciwgTkFUSVZFLCBWSUVXX1JFRlN9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9jb250YWluZXInO1xuaW1wb3J0IHtOb2RlSW5qZWN0b3JPZmZzZXR9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9pbmplY3Rvcic7XG5pbXBvcnQge1RDb250YWluZXJOb2RlLCBURGlyZWN0aXZlSG9zdE5vZGUsIFRFbGVtZW50Q29udGFpbmVyTm9kZSwgVEVsZW1lbnROb2RlLCBUTm9kZVR5cGV9IGZyb20gJy4uL3JlbmRlcjMvaW50ZXJmYWNlcy9ub2RlJztcbmltcG9ydCB7UkNvbW1lbnQsIFJFbGVtZW50LCBSTm9kZX0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3JlbmRlcmVyX2RvbSc7XG5pbXBvcnQge2lzTENvbnRhaW5lcn0gZnJvbSAnLi4vcmVuZGVyMy9pbnRlcmZhY2VzL3R5cGVfY2hlY2tzJztcbmltcG9ydCB7REVDTEFSQVRJT05fQ09NUE9ORU5UX1ZJRVcsIEhFQURFUl9PRkZTRVQsIEhPU1QsIEhZRFJBVElPTl9JTkZPLCBMVmlldywgTmdoQ29udGFpbmVyLCBOZ2hWaWV3LCBQQVJFTlQsIFJFTkRFUkVSLCBUX0hPU1QsIFRWSUVXfSBmcm9tICcuLi9yZW5kZXIzL2ludGVyZmFjZXMvdmlldyc7XG5pbXBvcnQge2Fzc2VydFROb2RlVHlwZX0gZnJvbSAnLi4vcmVuZGVyMy9ub2RlX2Fzc2VydCc7XG5pbXBvcnQge2FkZFZpZXdUb0NvbnRhaW5lciwgZGVzdHJveUxWaWV3LCBkZXRhY2hWaWV3LCBnZXRCZWZvcmVOb2RlRm9yVmlldywgaW5zZXJ0VmlldywgbmF0aXZlSW5zZXJ0QmVmb3JlLCBuYXRpdmVOZXh0U2libGluZywgbmF0aXZlUGFyZW50Tm9kZX0gZnJvbSAnLi4vcmVuZGVyMy9ub2RlX21hbmlwdWxhdGlvbic7XG5pbXBvcnQge2dldEN1cnJlbnRUTm9kZSwgZ2V0TFZpZXd9IGZyb20gJy4uL3JlbmRlcjMvc3RhdGUnO1xuaW1wb3J0IHtnZXRQYXJlbnRJbmplY3RvckluZGV4LCBnZXRQYXJlbnRJbmplY3RvclZpZXcsIGhhc1BhcmVudEluamVjdG9yfSBmcm9tICcuLi9yZW5kZXIzL3V0aWwvaW5qZWN0b3JfdXRpbHMnO1xuaW1wb3J0IHtnZXROYXRpdmVCeVROb2RlLCB1bndyYXBSTm9kZSwgdmlld0F0dGFjaGVkVG9Db250YWluZXJ9IGZyb20gJy4uL3JlbmRlcjMvdXRpbC92aWV3X3V0aWxzJztcbmltcG9ydCB7Vmlld1JlZiBhcyBSM1ZpZXdSZWZ9IGZyb20gJy4uL3JlbmRlcjMvdmlld19yZWYnO1xuaW1wb3J0IHthZGRUb0FycmF5LCByZW1vdmVGcm9tQXJyYXl9IGZyb20gJy4uL3V0aWwvYXJyYXlfdXRpbHMnO1xuaW1wb3J0IHthc3NlcnREZWZpbmVkLCBhc3NlcnRFcXVhbCwgYXNzZXJ0R3JlYXRlclRoYW4sIGFzc2VydExlc3NUaGFuLCB0aHJvd0Vycm9yfSBmcm9tICcuLi91dGlsL2Fzc2VydCc7XG5cbmltcG9ydCB7Q29tcG9uZW50RmFjdG9yeSwgQ29tcG9uZW50UmVmfSBmcm9tICcuL2NvbXBvbmVudF9mYWN0b3J5JztcbmltcG9ydCB7Y3JlYXRlRWxlbWVudFJlZiwgRWxlbWVudFJlZn0gZnJvbSAnLi9lbGVtZW50X3JlZic7XG5pbXBvcnQge05nTW9kdWxlUmVmfSBmcm9tICcuL25nX21vZHVsZV9mYWN0b3J5JztcbmltcG9ydCB7c2V0Q3VycmVudEh5ZHJhdGlvbkluZm8gYXMgc2V0Q3VycmVudEh5ZHJhdGlvbkluZm9Gb3JUZW1wbGF0ZVJlZiwgVGVtcGxhdGVSZWZ9IGZyb20gJy4vdGVtcGxhdGVfcmVmJztcbmltcG9ydCB7RW1iZWRkZWRWaWV3UmVmLCBWaWV3UmVmfSBmcm9tICcuL3ZpZXdfcmVmJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY29udGFpbmVyIHdoZXJlIG9uZSBvciBtb3JlIHZpZXdzIGNhbiBiZSBhdHRhY2hlZCB0byBhIGNvbXBvbmVudC5cbiAqXG4gKiBDYW4gY29udGFpbiAqaG9zdCB2aWV3cyogKGNyZWF0ZWQgYnkgaW5zdGFudGlhdGluZyBhXG4gKiBjb21wb25lbnQgd2l0aCB0aGUgYGNyZWF0ZUNvbXBvbmVudCgpYCBtZXRob2QpLCBhbmQgKmVtYmVkZGVkIHZpZXdzKlxuICogKGNyZWF0ZWQgYnkgaW5zdGFudGlhdGluZyBhIGBUZW1wbGF0ZVJlZmAgd2l0aCB0aGUgYGNyZWF0ZUVtYmVkZGVkVmlldygpYCBtZXRob2QpLlxuICpcbiAqIEEgdmlldyBjb250YWluZXIgaW5zdGFuY2UgY2FuIGNvbnRhaW4gb3RoZXIgdmlldyBjb250YWluZXJzLFxuICogY3JlYXRpbmcgYSBbdmlldyBoaWVyYXJjaHldKGd1aWRlL2dsb3NzYXJ5I3ZpZXctdHJlZSkuXG4gKlxuICogQHNlZSBgQ29tcG9uZW50UmVmYFxuICogQHNlZSBgRW1iZWRkZWRWaWV3UmVmYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFZpZXdDb250YWluZXJSZWYge1xuICAvKipcbiAgICogQW5jaG9yIGVsZW1lbnQgdGhhdCBzcGVjaWZpZXMgdGhlIGxvY2F0aW9uIG9mIHRoaXMgY29udGFpbmVyIGluIHRoZSBjb250YWluaW5nIHZpZXcuXG4gICAqIEVhY2ggdmlldyBjb250YWluZXIgY2FuIGhhdmUgb25seSBvbmUgYW5jaG9yIGVsZW1lbnQsIGFuZCBlYWNoIGFuY2hvciBlbGVtZW50XG4gICAqIGNhbiBoYXZlIG9ubHkgYSBzaW5nbGUgdmlldyBjb250YWluZXIuXG4gICAqXG4gICAqIFJvb3QgZWxlbWVudHMgb2Ygdmlld3MgYXR0YWNoZWQgdG8gdGhpcyBjb250YWluZXIgYmVjb21lIHNpYmxpbmdzIG9mIHRoZSBhbmNob3IgZWxlbWVudCBpblxuICAgKiB0aGUgcmVuZGVyZWQgdmlldy5cbiAgICpcbiAgICogQWNjZXNzIHRoZSBgVmlld0NvbnRhaW5lclJlZmAgb2YgYW4gZWxlbWVudCBieSBwbGFjaW5nIGEgYERpcmVjdGl2ZWAgaW5qZWN0ZWRcbiAgICogd2l0aCBgVmlld0NvbnRhaW5lclJlZmAgb24gdGhlIGVsZW1lbnQsIG9yIHVzZSBhIGBWaWV3Q2hpbGRgIHF1ZXJ5LlxuICAgKlxuICAgKiA8IS0tIFRPRE86IHJlbmFtZSB0byBhbmNob3JFbGVtZW50IC0tPlxuICAgKi9cbiAgYWJzdHJhY3QgZ2V0IGVsZW1lbnQoKTogRWxlbWVudFJlZjtcblxuICAvKipcbiAgICogVGhlIFtkZXBlbmRlbmN5IGluamVjdG9yXShndWlkZS9nbG9zc2FyeSNpbmplY3RvcikgZm9yIHRoaXMgdmlldyBjb250YWluZXIuXG4gICAqL1xuICBhYnN0cmFjdCBnZXQgaW5qZWN0b3IoKTogSW5qZWN0b3I7XG5cbiAgLyoqIEBkZXByZWNhdGVkIE5vIHJlcGxhY2VtZW50ICovXG4gIGFic3RyYWN0IGdldCBwYXJlbnRJbmplY3RvcigpOiBJbmplY3RvcjtcblxuICAvKipcbiAgICogRGVzdHJveXMgYWxsIHZpZXdzIGluIHRoaXMgY29udGFpbmVyLlxuICAgKi9cbiAgYWJzdHJhY3QgY2xlYXIoKTogdm9pZDtcblxuICAvKipcbiAgICogUmV0cmlldmVzIGEgdmlldyBmcm9tIHRoaXMgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gaW5kZXggVGhlIDAtYmFzZWQgaW5kZXggb2YgdGhlIHZpZXcgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm5zIFRoZSBgVmlld1JlZmAgaW5zdGFuY2UsIG9yIG51bGwgaWYgdGhlIGluZGV4IGlzIG91dCBvZiByYW5nZS5cbiAgICovXG4gIGFic3RyYWN0IGdldChpbmRleDogbnVtYmVyKTogVmlld1JlZnxudWxsO1xuXG4gIC8qKlxuICAgKiBSZXBvcnRzIGhvdyBtYW55IHZpZXdzIGFyZSBjdXJyZW50bHkgYXR0YWNoZWQgdG8gdGhpcyBjb250YWluZXIuXG4gICAqIEByZXR1cm5zIFRoZSBudW1iZXIgb2Ygdmlld3MuXG4gICAqL1xuICBhYnN0cmFjdCBnZXQgbGVuZ3RoKCk6IG51bWJlcjtcblxuICAvKipcbiAgICogSW5zdGFudGlhdGVzIGFuIGVtYmVkZGVkIHZpZXcgYW5kIGluc2VydHMgaXRcbiAgICogaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogQHBhcmFtIHRlbXBsYXRlUmVmIFRoZSBIVE1MIHRlbXBsYXRlIHRoYXQgZGVmaW5lcyB0aGUgdmlldy5cbiAgICogQHBhcmFtIGNvbnRleHQgVGhlIGRhdGEtYmluZGluZyBjb250ZXh0IG9mIHRoZSBlbWJlZGRlZCB2aWV3LCBhcyBkZWNsYXJlZFxuICAgKiBpbiB0aGUgYDxuZy10ZW1wbGF0ZT5gIHVzYWdlLlxuICAgKiBAcGFyYW0gb3B0aW9ucyBFeHRyYSBjb25maWd1cmF0aW9uIGZvciB0aGUgY3JlYXRlZCB2aWV3LiBJbmNsdWRlczpcbiAgICogICogaW5kZXg6IFRoZSAwLWJhc2VkIGluZGV4IGF0IHdoaWNoIHRvIGluc2VydCB0aGUgbmV3IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogICAgICAgICAgIElmIG5vdCBzcGVjaWZpZWQsIGFwcGVuZHMgdGhlIG5ldyB2aWV3IGFzIHRoZSBsYXN0IGVudHJ5LlxuICAgKiAgKiBpbmplY3RvcjogSW5qZWN0b3IgdG8gYmUgdXNlZCB3aXRoaW4gdGhlIGVtYmVkZGVkIHZpZXcuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBgVmlld1JlZmAgaW5zdGFuY2UgZm9yIHRoZSBuZXdseSBjcmVhdGVkIHZpZXcuXG4gICAqL1xuICBhYnN0cmFjdCBjcmVhdGVFbWJlZGRlZFZpZXc8Qz4odGVtcGxhdGVSZWY6IFRlbXBsYXRlUmVmPEM+LCBjb250ZXh0PzogQywgb3B0aW9ucz86IHtcbiAgICBpbmRleD86IG51bWJlcixcbiAgICBpbmplY3Rvcj86IEluamVjdG9yXG4gIH0pOiBFbWJlZGRlZFZpZXdSZWY8Qz47XG5cbiAgLyoqXG4gICAqIEluc3RhbnRpYXRlcyBhbiBlbWJlZGRlZCB2aWV3IGFuZCBpbnNlcnRzIGl0XG4gICAqIGludG8gdGhpcyBjb250YWluZXIuXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZVJlZiBUaGUgSFRNTCB0ZW1wbGF0ZSB0aGF0IGRlZmluZXMgdGhlIHZpZXcuXG4gICAqIEBwYXJhbSBjb250ZXh0IFRoZSBkYXRhLWJpbmRpbmcgY29udGV4dCBvZiB0aGUgZW1iZWRkZWQgdmlldywgYXMgZGVjbGFyZWRcbiAgICogaW4gdGhlIGA8bmctdGVtcGxhdGU+YCB1c2FnZS5cbiAgICogQHBhcmFtIGluZGV4IFRoZSAwLWJhc2VkIGluZGV4IGF0IHdoaWNoIHRvIGluc2VydCB0aGUgbmV3IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICogSWYgbm90IHNwZWNpZmllZCwgYXBwZW5kcyB0aGUgbmV3IHZpZXcgYXMgdGhlIGxhc3QgZW50cnkuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBgVmlld1JlZmAgaW5zdGFuY2UgZm9yIHRoZSBuZXdseSBjcmVhdGVkIHZpZXcuXG4gICAqL1xuICBhYnN0cmFjdCBjcmVhdGVFbWJlZGRlZFZpZXc8Qz4odGVtcGxhdGVSZWY6IFRlbXBsYXRlUmVmPEM+LCBjb250ZXh0PzogQywgaW5kZXg/OiBudW1iZXIpOlxuICAgICAgRW1iZWRkZWRWaWV3UmVmPEM+O1xuXG4gIC8qKlxuICAgKiBJbnN0YW50aWF0ZXMgYSBzaW5nbGUgY29tcG9uZW50IGFuZCBpbnNlcnRzIGl0cyBob3N0IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lci5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBvbmVudFR5cGUgQ29tcG9uZW50IFR5cGUgdG8gdXNlLlxuICAgKiBAcGFyYW0gb3B0aW9ucyBBbiBvYmplY3QgdGhhdCBjb250YWlucyBleHRyYSBwYXJhbWV0ZXJzOlxuICAgKiAgKiBpbmRleDogdGhlIGluZGV4IGF0IHdoaWNoIHRvIGluc2VydCB0aGUgbmV3IGNvbXBvbmVudCdzIGhvc3QgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKiAgICAgICAgICAgSWYgbm90IHNwZWNpZmllZCwgYXBwZW5kcyB0aGUgbmV3IHZpZXcgYXMgdGhlIGxhc3QgZW50cnkuXG4gICAqICAqIGluamVjdG9yOiB0aGUgaW5qZWN0b3IgdG8gdXNlIGFzIHRoZSBwYXJlbnQgZm9yIHRoZSBuZXcgY29tcG9uZW50LlxuICAgKiAgKiBuZ01vZHVsZVJlZjogYW4gTmdNb2R1bGVSZWYgb2YgdGhlIGNvbXBvbmVudCdzIE5nTW9kdWxlLCB5b3Ugc2hvdWxkIGFsbW9zdCBhbHdheXMgcHJvdmlkZVxuICAgKiAgICAgICAgICAgICAgICAgdGhpcyB0byBlbnN1cmUgdGhhdCBhbGwgZXhwZWN0ZWQgcHJvdmlkZXJzIGFyZSBhdmFpbGFibGUgZm9yIHRoZSBjb21wb25lbnRcbiAgICogICAgICAgICAgICAgICAgIGluc3RhbnRpYXRpb24uXG4gICAqICAqIGVudmlyb25tZW50SW5qZWN0b3I6IGFuIEVudmlyb25tZW50SW5qZWN0b3Igd2hpY2ggd2lsbCBwcm92aWRlIHRoZSBjb21wb25lbnQncyBlbnZpcm9ubWVudC5cbiAgICogICAgICAgICAgICAgICAgIHlvdSBzaG91bGQgYWxtb3N0IGFsd2F5cyBwcm92aWRlIHRoaXMgdG8gZW5zdXJlIHRoYXQgYWxsIGV4cGVjdGVkIHByb3ZpZGVyc1xuICAgKiAgICAgICAgICAgICAgICAgYXJlIGF2YWlsYWJsZSBmb3IgdGhlIGNvbXBvbmVudCBpbnN0YW50aWF0aW9uLiBUaGlzIG9wdGlvbiBpcyBpbnRlbmRlZCB0b1xuICAgKiAgICAgICAgICAgICAgICAgcmVwbGFjZSB0aGUgYG5nTW9kdWxlUmVmYCBwYXJhbWV0ZXIuXG4gICAqICAqIHByb2plY3RhYmxlTm9kZXM6IGxpc3Qgb2YgRE9NIG5vZGVzIHRoYXQgc2hvdWxkIGJlIHByb2plY3RlZCB0aHJvdWdoXG4gICAqICAgICAgICAgICAgICAgICAgICAgIFtgPG5nLWNvbnRlbnQ+YF0oYXBpL2NvcmUvbmctY29udGVudCkgb2YgdGhlIG5ldyBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBuZXcgYENvbXBvbmVudFJlZmAgd2hpY2ggY29udGFpbnMgdGhlIGNvbXBvbmVudCBpbnN0YW5jZSBhbmQgdGhlIGhvc3Qgdmlldy5cbiAgICovXG4gIGFic3RyYWN0IGNyZWF0ZUNvbXBvbmVudDxDPihjb21wb25lbnRUeXBlOiBUeXBlPEM+LCBvcHRpb25zPzoge1xuICAgIGluZGV4PzogbnVtYmVyLFxuICAgIGluamVjdG9yPzogSW5qZWN0b3IsXG4gICAgbmdNb2R1bGVSZWY/OiBOZ01vZHVsZVJlZjx1bmtub3duPixcbiAgICBlbnZpcm9ubWVudEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3RvcnxOZ01vZHVsZVJlZjx1bmtub3duPixcbiAgICBwcm9qZWN0YWJsZU5vZGVzPzogTm9kZVtdW10sXG4gIH0pOiBDb21wb25lbnRSZWY8Qz47XG5cbiAgLyoqXG4gICAqIEluc3RhbnRpYXRlcyBhIHNpbmdsZSBjb21wb25lbnQgYW5kIGluc2VydHMgaXRzIGhvc3QgdmlldyBpbnRvIHRoaXMgY29udGFpbmVyLlxuICAgKlxuICAgKiBAcGFyYW0gY29tcG9uZW50RmFjdG9yeSBDb21wb25lbnQgZmFjdG9yeSB0byB1c2UuXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgaW5kZXggYXQgd2hpY2ggdG8gaW5zZXJ0IHRoZSBuZXcgY29tcG9uZW50J3MgaG9zdCB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqIElmIG5vdCBzcGVjaWZpZWQsIGFwcGVuZHMgdGhlIG5ldyB2aWV3IGFzIHRoZSBsYXN0IGVudHJ5LlxuICAgKiBAcGFyYW0gaW5qZWN0b3IgVGhlIGluamVjdG9yIHRvIHVzZSBhcyB0aGUgcGFyZW50IGZvciB0aGUgbmV3IGNvbXBvbmVudC5cbiAgICogQHBhcmFtIHByb2plY3RhYmxlTm9kZXMgTGlzdCBvZiBET00gbm9kZXMgdGhhdCBzaG91bGQgYmUgcHJvamVjdGVkIHRocm91Z2hcbiAgICogICAgIFtgPG5nLWNvbnRlbnQ+YF0oYXBpL2NvcmUvbmctY29udGVudCkgb2YgdGhlIG5ldyBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAqIEBwYXJhbSBuZ01vZHVsZVJlZiBBbiBpbnN0YW5jZSBvZiB0aGUgTmdNb2R1bGVSZWYgdGhhdCByZXByZXNlbnQgYW4gTmdNb2R1bGUuXG4gICAqIFRoaXMgaW5mb3JtYXRpb24gaXMgdXNlZCB0byByZXRyaWV2ZSBjb3JyZXNwb25kaW5nIE5nTW9kdWxlIGluamVjdG9yLlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgbmV3IGBDb21wb25lbnRSZWZgIHdoaWNoIGNvbnRhaW5zIHRoZSBjb21wb25lbnQgaW5zdGFuY2UgYW5kIHRoZSBob3N0IHZpZXcuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIEFuZ3VsYXIgbm8gbG9uZ2VyIHJlcXVpcmVzIGNvbXBvbmVudCBmYWN0b3JpZXMgdG8gZHluYW1pY2FsbHkgY3JlYXRlIGNvbXBvbmVudHMuXG4gICAqICAgICBVc2UgZGlmZmVyZW50IHNpZ25hdHVyZSBvZiB0aGUgYGNyZWF0ZUNvbXBvbmVudGAgbWV0aG9kLCB3aGljaCBhbGxvd3MgcGFzc2luZ1xuICAgKiAgICAgQ29tcG9uZW50IGNsYXNzIGRpcmVjdGx5LlxuICAgKi9cbiAgYWJzdHJhY3QgY3JlYXRlQ29tcG9uZW50PEM+KFxuICAgICAgY29tcG9uZW50RmFjdG9yeTogQ29tcG9uZW50RmFjdG9yeTxDPiwgaW5kZXg/OiBudW1iZXIsIGluamVjdG9yPzogSW5qZWN0b3IsXG4gICAgICBwcm9qZWN0YWJsZU5vZGVzPzogYW55W11bXSxcbiAgICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yfE5nTW9kdWxlUmVmPGFueT4pOiBDb21wb25lbnRSZWY8Qz47XG5cbiAgLyoqXG4gICAqIEluc2VydHMgYSB2aWV3IGludG8gdGhpcyBjb250YWluZXIuXG4gICAqIEBwYXJhbSB2aWV3UmVmIFRoZSB2aWV3IHRvIGluc2VydC5cbiAgICogQHBhcmFtIGluZGV4IFRoZSAwLWJhc2VkIGluZGV4IGF0IHdoaWNoIHRvIGluc2VydCB0aGUgdmlldy5cbiAgICogSWYgbm90IHNwZWNpZmllZCwgYXBwZW5kcyB0aGUgbmV3IHZpZXcgYXMgdGhlIGxhc3QgZW50cnkuXG4gICAqIEByZXR1cm5zIFRoZSBpbnNlcnRlZCBgVmlld1JlZmAgaW5zdGFuY2UuXG4gICAqXG4gICAqL1xuICBhYnN0cmFjdCBpbnNlcnQodmlld1JlZjogVmlld1JlZiwgaW5kZXg/OiBudW1iZXIpOiBWaWV3UmVmO1xuXG4gIC8qKlxuICAgKiBNb3ZlcyBhIHZpZXcgdG8gYSBuZXcgbG9jYXRpb24gaW4gdGhpcyBjb250YWluZXIuXG4gICAqIEBwYXJhbSB2aWV3UmVmIFRoZSB2aWV3IHRvIG1vdmUuXG4gICAqIEBwYXJhbSBpbmRleCBUaGUgMC1iYXNlZCBpbmRleCBvZiB0aGUgbmV3IGxvY2F0aW9uLlxuICAgKiBAcmV0dXJucyBUaGUgbW92ZWQgYFZpZXdSZWZgIGluc3RhbmNlLlxuICAgKi9cbiAgYWJzdHJhY3QgbW92ZSh2aWV3UmVmOiBWaWV3UmVmLCBjdXJyZW50SW5kZXg6IG51bWJlcik6IFZpZXdSZWY7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGluZGV4IG9mIGEgdmlldyB3aXRoaW4gdGhlIGN1cnJlbnQgY29udGFpbmVyLlxuICAgKiBAcGFyYW0gdmlld1JlZiBUaGUgdmlldyB0byBxdWVyeS5cbiAgICogQHJldHVybnMgVGhlIDAtYmFzZWQgaW5kZXggb2YgdGhlIHZpZXcncyBwb3NpdGlvbiBpbiB0aGlzIGNvbnRhaW5lcixcbiAgICogb3IgYC0xYCBpZiB0aGlzIGNvbnRhaW5lciBkb2Vzbid0IGNvbnRhaW4gdGhlIHZpZXcuXG4gICAqL1xuICBhYnN0cmFjdCBpbmRleE9mKHZpZXdSZWY6IFZpZXdSZWYpOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGEgdmlldyBhdHRhY2hlZCB0byB0aGlzIGNvbnRhaW5lclxuICAgKiBAcGFyYW0gaW5kZXggVGhlIDAtYmFzZWQgaW5kZXggb2YgdGhlIHZpZXcgdG8gZGVzdHJveS5cbiAgICogSWYgbm90IHNwZWNpZmllZCwgdGhlIGxhc3QgdmlldyBpbiB0aGUgY29udGFpbmVyIGlzIHJlbW92ZWQuXG4gICAqL1xuICBhYnN0cmFjdCByZW1vdmUoaW5kZXg/OiBudW1iZXIpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBEZXRhY2hlcyBhIHZpZXcgZnJvbSB0aGlzIGNvbnRhaW5lciB3aXRob3V0IGRlc3Ryb3lpbmcgaXQuXG4gICAqIFVzZSBhbG9uZyB3aXRoIGBpbnNlcnQoKWAgdG8gbW92ZSBhIHZpZXcgd2l0aGluIHRoZSBjdXJyZW50IGNvbnRhaW5lci5cbiAgICogQHBhcmFtIGluZGV4IFRoZSAwLWJhc2VkIGluZGV4IG9mIHRoZSB2aWV3IHRvIGRldGFjaC5cbiAgICogSWYgbm90IHNwZWNpZmllZCwgdGhlIGxhc3QgdmlldyBpbiB0aGUgY29udGFpbmVyIGlzIGRldGFjaGVkLlxuICAgKi9cbiAgYWJzdHJhY3QgZGV0YWNoKGluZGV4PzogbnVtYmVyKTogVmlld1JlZnxudWxsO1xuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogQG5vY29sbGFwc2VcbiAgICovXG4gIHN0YXRpYyBfX05HX0VMRU1FTlRfSURfXzogKCkgPT4gVmlld0NvbnRhaW5lclJlZiA9IGluamVjdFZpZXdDb250YWluZXJSZWY7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIFZpZXdDb250YWluZXJSZWYgYW5kIHN0b3JlcyBpdCBvbiB0aGUgaW5qZWN0b3IuIE9yLCBpZiB0aGUgVmlld0NvbnRhaW5lclJlZlxuICogYWxyZWFkeSBleGlzdHMsIHJldHJpZXZlcyB0aGUgZXhpc3RpbmcgVmlld0NvbnRhaW5lclJlZi5cbiAqXG4gKiBAcmV0dXJucyBUaGUgVmlld0NvbnRhaW5lclJlZiBpbnN0YW5jZSB0byB1c2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluamVjdFZpZXdDb250YWluZXJSZWYoKTogVmlld0NvbnRhaW5lclJlZiB7XG4gIGNvbnN0IHByZXZpb3VzVE5vZGUgPSBnZXRDdXJyZW50VE5vZGUoKSBhcyBURWxlbWVudE5vZGUgfCBURWxlbWVudENvbnRhaW5lck5vZGUgfCBUQ29udGFpbmVyTm9kZTtcbiAgcmV0dXJuIGNyZWF0ZUNvbnRhaW5lclJlZihwcmV2aW91c1ROb2RlLCBnZXRMVmlldygpKTtcbn1cblxuY29uc3QgVkVfVmlld0NvbnRhaW5lclJlZiA9IFZpZXdDb250YWluZXJSZWY7XG5cbi8vIFRPRE8oYWx4aHViKTogY2xlYW5pbmcgdXAgdGhpcyBpbmRpcmVjdGlvbiB0cmlnZ2VycyBhIHN1YnRsZSBidWcgaW4gQ2xvc3VyZSBpbiBnMy4gT25jZSB0aGUgZml4XG4vLyBmb3IgdGhhdCBsYW5kcywgdGhpcyBjYW4gYmUgY2xlYW5lZCB1cC5cbmNvbnN0IFIzVmlld0NvbnRhaW5lclJlZiA9IGNsYXNzIFZpZXdDb250YWluZXJSZWYgZXh0ZW5kcyBWRV9WaWV3Q29udGFpbmVyUmVmIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIF9sQ29udGFpbmVyOiBMQ29udGFpbmVyLFxuICAgICAgcHJpdmF0ZSBfaG9zdFROb2RlOiBURWxlbWVudE5vZGV8VENvbnRhaW5lck5vZGV8VEVsZW1lbnRDb250YWluZXJOb2RlLFxuICAgICAgcHJpdmF0ZSBfaG9zdExWaWV3OiBMVmlldykge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBvdmVycmlkZSBnZXQgZWxlbWVudCgpOiBFbGVtZW50UmVmIHtcbiAgICByZXR1cm4gY3JlYXRlRWxlbWVudFJlZih0aGlzLl9ob3N0VE5vZGUsIHRoaXMuX2hvc3RMVmlldyk7XG4gIH1cblxuICBvdmVycmlkZSBnZXQgaW5qZWN0b3IoKTogSW5qZWN0b3Ige1xuICAgIHJldHVybiBuZXcgTm9kZUluamVjdG9yKHRoaXMuX2hvc3RUTm9kZSwgdGhpcy5faG9zdExWaWV3KTtcbiAgfVxuXG4gIC8qKiBAZGVwcmVjYXRlZCBObyByZXBsYWNlbWVudCAqL1xuICBvdmVycmlkZSBnZXQgcGFyZW50SW5qZWN0b3IoKTogSW5qZWN0b3Ige1xuICAgIGNvbnN0IHBhcmVudExvY2F0aW9uID0gZ2V0UGFyZW50SW5qZWN0b3JMb2NhdGlvbih0aGlzLl9ob3N0VE5vZGUsIHRoaXMuX2hvc3RMVmlldyk7XG4gICAgaWYgKGhhc1BhcmVudEluamVjdG9yKHBhcmVudExvY2F0aW9uKSkge1xuICAgICAgY29uc3QgcGFyZW50VmlldyA9IGdldFBhcmVudEluamVjdG9yVmlldyhwYXJlbnRMb2NhdGlvbiwgdGhpcy5faG9zdExWaWV3KTtcbiAgICAgIGNvbnN0IGluamVjdG9ySW5kZXggPSBnZXRQYXJlbnRJbmplY3RvckluZGV4KHBhcmVudExvY2F0aW9uKTtcbiAgICAgIG5nRGV2TW9kZSAmJiBhc3NlcnROb2RlSW5qZWN0b3IocGFyZW50VmlldywgaW5qZWN0b3JJbmRleCk7XG4gICAgICBjb25zdCBwYXJlbnRUTm9kZSA9XG4gICAgICAgICAgcGFyZW50Vmlld1tUVklFV10uZGF0YVtpbmplY3RvckluZGV4ICsgTm9kZUluamVjdG9yT2Zmc2V0LlROT0RFXSBhcyBURWxlbWVudE5vZGU7XG4gICAgICByZXR1cm4gbmV3IE5vZGVJbmplY3RvcihwYXJlbnRUTm9kZSwgcGFyZW50Vmlldyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBuZXcgTm9kZUluamVjdG9yKG51bGwsIHRoaXMuX2hvc3RMVmlldyk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgY2xlYXIoKTogdm9pZCB7XG4gICAgd2hpbGUgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5yZW1vdmUodGhpcy5sZW5ndGggLSAxKTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBnZXQoaW5kZXg6IG51bWJlcik6IFZpZXdSZWZ8bnVsbCB7XG4gICAgY29uc3Qgdmlld1JlZnMgPSBnZXRWaWV3UmVmcyh0aGlzLl9sQ29udGFpbmVyKTtcbiAgICByZXR1cm4gdmlld1JlZnMgIT09IG51bGwgJiYgdmlld1JlZnNbaW5kZXhdIHx8IG51bGw7XG4gIH1cblxuICBvdmVycmlkZSBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2xDb250YWluZXIubGVuZ3RoIC0gQ09OVEFJTkVSX0hFQURFUl9PRkZTRVQ7XG4gIH1cblxuICBvdmVycmlkZSBjcmVhdGVFbWJlZGRlZFZpZXc8Qz4odGVtcGxhdGVSZWY6IFRlbXBsYXRlUmVmPEM+LCBjb250ZXh0PzogQywgb3B0aW9ucz86IHtcbiAgICBpbmRleD86IG51bWJlcixcbiAgICBpbmplY3Rvcj86IEluamVjdG9yXG4gIH0pOiBFbWJlZGRlZFZpZXdSZWY8Qz47XG4gIG92ZXJyaWRlIGNyZWF0ZUVtYmVkZGVkVmlldzxDPih0ZW1wbGF0ZVJlZjogVGVtcGxhdGVSZWY8Qz4sIGNvbnRleHQ/OiBDLCBpbmRleD86IG51bWJlcik6XG4gICAgICBFbWJlZGRlZFZpZXdSZWY8Qz47XG4gIG92ZXJyaWRlIGNyZWF0ZUVtYmVkZGVkVmlldzxDPih0ZW1wbGF0ZVJlZjogVGVtcGxhdGVSZWY8Qz4sIGNvbnRleHQ/OiBDLCBpbmRleE9yT3B0aW9ucz86IG51bWJlcnx7XG4gICAgaW5kZXg/OiBudW1iZXIsXG4gICAgaW5qZWN0b3I/OiBJbmplY3RvclxuICB9KTogRW1iZWRkZWRWaWV3UmVmPEM+IHtcbiAgICBsZXQgaW5kZXg6IG51bWJlcnx1bmRlZmluZWQ7XG4gICAgbGV0IGluamVjdG9yOiBJbmplY3Rvcnx1bmRlZmluZWQ7XG5cbiAgICBpZiAodHlwZW9mIGluZGV4T3JPcHRpb25zID09PSAnbnVtYmVyJykge1xuICAgICAgaW5kZXggPSBpbmRleE9yT3B0aW9ucztcbiAgICB9IGVsc2UgaWYgKGluZGV4T3JPcHRpb25zICE9IG51bGwpIHtcbiAgICAgIGluZGV4ID0gaW5kZXhPck9wdGlvbnMuaW5kZXg7XG4gICAgICBpbmplY3RvciA9IGluZGV4T3JPcHRpb25zLmluamVjdG9yO1xuICAgIH1cblxuICAgIGxldCBvcmlnSHlkcmF0aW9uSW5mbzogTmdoVmlld3xudWxsID0gbnVsbDtcbiAgICBjb25zdCBzc3JJZCA9ICh0ZW1wbGF0ZVJlZiBhcyB1bmtub3duIGFzIHtzc3JJZDogc3RyaW5nIHwgbnVsbH0pLnNzcklkO1xuICAgIGlmIChzc3JJZCkge1xuICAgICAgY29uc3QgbmV3SHlkcmF0aW9uSW5mbyA9IGZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3KHRoaXMuX2xDb250YWluZXIsIHNzcklkKTtcbiAgICAgIG9yaWdIeWRyYXRpb25JbmZvID0gc2V0Q3VycmVudEh5ZHJhdGlvbkluZm9Gb3JUZW1wbGF0ZVJlZihuZXdIeWRyYXRpb25JbmZvKTtcbiAgICB9XG5cbiAgICBkZWJ1Z2dlcjtcblxuICAgIGNvbnN0IHZpZXdSZWYgPSB0ZW1wbGF0ZVJlZi5jcmVhdGVFbWJlZGRlZFZpZXcoY29udGV4dCB8fCA8YW55Pnt9LCBpbmplY3Rvcik7XG5cbiAgICBpZiAoc3NySWQpIHtcbiAgICAgIC8vIFJlc2V0IGh5ZHJhdGlvbiBpbmZvLi4uXG4gICAgICBzZXRDdXJyZW50SHlkcmF0aW9uSW5mb0ZvclRlbXBsYXRlUmVmKG9yaWdIeWRyYXRpb25JbmZvKTtcbiAgICB9XG4gICAgdGhpcy5pbnNlcnQodmlld1JlZiwgaW5kZXgpO1xuICAgIHJldHVybiB2aWV3UmVmO1xuICB9XG5cbiAgb3ZlcnJpZGUgY3JlYXRlQ29tcG9uZW50PEM+KGNvbXBvbmVudFR5cGU6IFR5cGU8Qz4sIG9wdGlvbnM/OiB7XG4gICAgaW5kZXg/OiBudW1iZXIsXG4gICAgaW5qZWN0b3I/OiBJbmplY3RvcixcbiAgICBwcm9qZWN0YWJsZU5vZGVzPzogTm9kZVtdW10sXG4gICAgbmdNb2R1bGVSZWY/OiBOZ01vZHVsZVJlZjx1bmtub3duPixcbiAgfSk6IENvbXBvbmVudFJlZjxDPjtcbiAgLyoqXG4gICAqIEBkZXByZWNhdGVkIEFuZ3VsYXIgbm8gbG9uZ2VyIHJlcXVpcmVzIGNvbXBvbmVudCBmYWN0b3JpZXMgdG8gZHluYW1pY2FsbHkgY3JlYXRlIGNvbXBvbmVudHMuXG4gICAqICAgICBVc2UgZGlmZmVyZW50IHNpZ25hdHVyZSBvZiB0aGUgYGNyZWF0ZUNvbXBvbmVudGAgbWV0aG9kLCB3aGljaCBhbGxvd3MgcGFzc2luZ1xuICAgKiAgICAgQ29tcG9uZW50IGNsYXNzIGRpcmVjdGx5LlxuICAgKi9cbiAgb3ZlcnJpZGUgY3JlYXRlQ29tcG9uZW50PEM+KFxuICAgICAgY29tcG9uZW50RmFjdG9yeTogQ29tcG9uZW50RmFjdG9yeTxDPiwgaW5kZXg/OiBudW1iZXJ8dW5kZWZpbmVkLFxuICAgICAgaW5qZWN0b3I/OiBJbmplY3Rvcnx1bmRlZmluZWQsIHByb2plY3RhYmxlTm9kZXM/OiBhbnlbXVtdfHVuZGVmaW5lZCxcbiAgICAgIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yfE5nTW9kdWxlUmVmPGFueT58dW5kZWZpbmVkKTogQ29tcG9uZW50UmVmPEM+O1xuICBvdmVycmlkZSBjcmVhdGVDb21wb25lbnQ8Qz4oXG4gICAgICBjb21wb25lbnRGYWN0b3J5T3JUeXBlOiBDb21wb25lbnRGYWN0b3J5PEM+fFR5cGU8Qz4sIGluZGV4T3JPcHRpb25zPzogbnVtYmVyfHVuZGVmaW5lZHx7XG4gICAgICAgIGluZGV4PzogbnVtYmVyLFxuICAgICAgICBpbmplY3Rvcj86IEluamVjdG9yLFxuICAgICAgICBuZ01vZHVsZVJlZj86IE5nTW9kdWxlUmVmPHVua25vd24+LFxuICAgICAgICBlbnZpcm9ubWVudEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3RvcnxOZ01vZHVsZVJlZjx1bmtub3duPixcbiAgICAgICAgcHJvamVjdGFibGVOb2Rlcz86IE5vZGVbXVtdLFxuICAgICAgfSxcbiAgICAgIGluamVjdG9yPzogSW5qZWN0b3J8dW5kZWZpbmVkLCBwcm9qZWN0YWJsZU5vZGVzPzogYW55W11bXXx1bmRlZmluZWQsXG4gICAgICBlbnZpcm9ubWVudEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3RvcnxOZ01vZHVsZVJlZjxhbnk+fHVuZGVmaW5lZCk6IENvbXBvbmVudFJlZjxDPiB7XG4gICAgY29uc3QgaXNDb21wb25lbnRGYWN0b3J5ID0gY29tcG9uZW50RmFjdG9yeU9yVHlwZSAmJiAhaXNUeXBlKGNvbXBvbmVudEZhY3RvcnlPclR5cGUpO1xuICAgIGxldCBpbmRleDogbnVtYmVyfHVuZGVmaW5lZDtcblxuICAgIC8vIFRoaXMgZnVuY3Rpb24gc3VwcG9ydHMgMiBzaWduYXR1cmVzIGFuZCB3ZSBuZWVkIHRvIGhhbmRsZSBvcHRpb25zIGNvcnJlY3RseSBmb3IgYm90aDpcbiAgICAvLyAgIDEuIFdoZW4gZmlyc3QgYXJndW1lbnQgaXMgYSBDb21wb25lbnQgdHlwZS4gVGhpcyBzaWduYXR1cmUgYWxzbyByZXF1aXJlcyBleHRyYVxuICAgIC8vICAgICAgb3B0aW9ucyB0byBiZSBwcm92aWRlZCBhcyBhcyBvYmplY3QgKG1vcmUgZXJnb25vbWljIG9wdGlvbikuXG4gICAgLy8gICAyLiBGaXJzdCBhcmd1bWVudCBpcyBhIENvbXBvbmVudCBmYWN0b3J5LiBJbiB0aGlzIGNhc2UgZXh0cmEgb3B0aW9ucyBhcmUgcmVwcmVzZW50ZWQgYXNcbiAgICAvLyAgICAgIHBvc2l0aW9uYWwgYXJndW1lbnRzLiBUaGlzIHNpZ25hdHVyZSBpcyBsZXNzIGVyZ29ub21pYyBhbmQgd2lsbCBiZSBkZXByZWNhdGVkLlxuICAgIGlmIChpc0NvbXBvbmVudEZhY3RvcnkpIHtcbiAgICAgIGlmIChuZ0Rldk1vZGUpIHtcbiAgICAgICAgYXNzZXJ0RXF1YWwoXG4gICAgICAgICAgICB0eXBlb2YgaW5kZXhPck9wdGlvbnMgIT09ICdvYmplY3QnLCB0cnVlLFxuICAgICAgICAgICAgJ0l0IGxvb2tzIGxpa2UgQ29tcG9uZW50IGZhY3Rvcnkgd2FzIHByb3ZpZGVkIGFzIHRoZSBmaXJzdCBhcmd1bWVudCAnICtcbiAgICAgICAgICAgICAgICAnYW5kIGFuIG9wdGlvbnMgb2JqZWN0IGFzIHRoZSBzZWNvbmQgYXJndW1lbnQuIFRoaXMgY29tYmluYXRpb24gb2YgYXJndW1lbnRzICcgK1xuICAgICAgICAgICAgICAgICdpcyBpbmNvbXBhdGlibGUuIFlvdSBjYW4gZWl0aGVyIGNoYW5nZSB0aGUgZmlyc3QgYXJndW1lbnQgdG8gcHJvdmlkZSBDb21wb25lbnQgJyArXG4gICAgICAgICAgICAgICAgJ3R5cGUgb3IgY2hhbmdlIHRoZSBzZWNvbmQgYXJndW1lbnQgdG8gYmUgYSBudW1iZXIgKHJlcHJlc2VudGluZyBhbiBpbmRleCBhdCAnICtcbiAgICAgICAgICAgICAgICAnd2hpY2ggdG8gaW5zZXJ0IHRoZSBuZXcgY29tcG9uZW50XFwncyBob3N0IHZpZXcgaW50byB0aGlzIGNvbnRhaW5lciknKTtcbiAgICAgIH1cbiAgICAgIGluZGV4ID0gaW5kZXhPck9wdGlvbnMgYXMgbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAobmdEZXZNb2RlKSB7XG4gICAgICAgIGFzc2VydERlZmluZWQoXG4gICAgICAgICAgICBnZXRDb21wb25lbnREZWYoY29tcG9uZW50RmFjdG9yeU9yVHlwZSksXG4gICAgICAgICAgICBgUHJvdmlkZWQgQ29tcG9uZW50IGNsYXNzIGRvZXNuJ3QgY29udGFpbiBDb21wb25lbnQgZGVmaW5pdGlvbi4gYCArXG4gICAgICAgICAgICAgICAgYFBsZWFzZSBjaGVjayB3aGV0aGVyIHByb3ZpZGVkIGNsYXNzIGhhcyBAQ29tcG9uZW50IGRlY29yYXRvci5gKTtcbiAgICAgICAgYXNzZXJ0RXF1YWwoXG4gICAgICAgICAgICB0eXBlb2YgaW5kZXhPck9wdGlvbnMgIT09ICdudW1iZXInLCB0cnVlLFxuICAgICAgICAgICAgJ0l0IGxvb2tzIGxpa2UgQ29tcG9uZW50IHR5cGUgd2FzIHByb3ZpZGVkIGFzIHRoZSBmaXJzdCBhcmd1bWVudCAnICtcbiAgICAgICAgICAgICAgICAnYW5kIGEgbnVtYmVyIChyZXByZXNlbnRpbmcgYW4gaW5kZXggYXQgd2hpY2ggdG8gaW5zZXJ0IHRoZSBuZXcgY29tcG9uZW50XFwncyAnICtcbiAgICAgICAgICAgICAgICAnaG9zdCB2aWV3IGludG8gdGhpcyBjb250YWluZXIgYXMgdGhlIHNlY29uZCBhcmd1bWVudC4gVGhpcyBjb21iaW5hdGlvbiBvZiBhcmd1bWVudHMgJyArXG4gICAgICAgICAgICAgICAgJ2lzIGluY29tcGF0aWJsZS4gUGxlYXNlIHVzZSBhbiBvYmplY3QgYXMgdGhlIHNlY29uZCBhcmd1bWVudCBpbnN0ZWFkLicpO1xuICAgICAgfVxuICAgICAgY29uc3Qgb3B0aW9ucyA9IChpbmRleE9yT3B0aW9ucyB8fCB7fSkgYXMge1xuICAgICAgICBpbmRleD86IG51bWJlcixcbiAgICAgICAgaW5qZWN0b3I/OiBJbmplY3RvcixcbiAgICAgICAgbmdNb2R1bGVSZWY/OiBOZ01vZHVsZVJlZjx1bmtub3duPixcbiAgICAgICAgZW52aXJvbm1lbnRJbmplY3Rvcj86IEVudmlyb25tZW50SW5qZWN0b3IgfCBOZ01vZHVsZVJlZjx1bmtub3duPixcbiAgICAgICAgcHJvamVjdGFibGVOb2Rlcz86IE5vZGVbXVtdLFxuICAgICAgfTtcbiAgICAgIGlmIChuZ0Rldk1vZGUgJiYgb3B0aW9ucy5lbnZpcm9ubWVudEluamVjdG9yICYmIG9wdGlvbnMubmdNb2R1bGVSZWYpIHtcbiAgICAgICAgdGhyb3dFcnJvcihcbiAgICAgICAgICAgIGBDYW5ub3QgcGFzcyBib3RoIGVudmlyb25tZW50SW5qZWN0b3IgYW5kIG5nTW9kdWxlUmVmIG9wdGlvbnMgdG8gY3JlYXRlQ29tcG9uZW50KCkuYCk7XG4gICAgICB9XG4gICAgICBpbmRleCA9IG9wdGlvbnMuaW5kZXg7XG4gICAgICBpbmplY3RvciA9IG9wdGlvbnMuaW5qZWN0b3I7XG4gICAgICBwcm9qZWN0YWJsZU5vZGVzID0gb3B0aW9ucy5wcm9qZWN0YWJsZU5vZGVzO1xuICAgICAgZW52aXJvbm1lbnRJbmplY3RvciA9IG9wdGlvbnMuZW52aXJvbm1lbnRJbmplY3RvciB8fCBvcHRpb25zLm5nTW9kdWxlUmVmO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBvbmVudEZhY3Rvcnk6IENvbXBvbmVudEZhY3Rvcnk8Qz4gPSBpc0NvbXBvbmVudEZhY3RvcnkgP1xuICAgICAgICBjb21wb25lbnRGYWN0b3J5T3JUeXBlIGFzIENvbXBvbmVudEZhY3Rvcnk8Qz46XG4gICAgICAgIG5ldyBSM0NvbXBvbmVudEZhY3RvcnkoZ2V0Q29tcG9uZW50RGVmKGNvbXBvbmVudEZhY3RvcnlPclR5cGUpISk7XG4gICAgY29uc3QgY29udGV4dEluamVjdG9yID0gaW5qZWN0b3IgfHwgdGhpcy5wYXJlbnRJbmplY3RvcjtcblxuICAgIC8vIElmIGFuIGBOZ01vZHVsZVJlZmAgaXMgbm90IHByb3ZpZGVkIGV4cGxpY2l0bHksIHRyeSByZXRyaWV2aW5nIGl0IGZyb20gdGhlIERJIHRyZWUuXG4gICAgaWYgKCFlbnZpcm9ubWVudEluamVjdG9yICYmIChjb21wb25lbnRGYWN0b3J5IGFzIGFueSkubmdNb2R1bGUgPT0gbnVsbCkge1xuICAgICAgLy8gRm9yIHRoZSBgQ29tcG9uZW50RmFjdG9yeWAgY2FzZSwgZW50ZXJpbmcgdGhpcyBsb2dpYyBpcyB2ZXJ5IHVubGlrZWx5LCBzaW5jZSB3ZSBleHBlY3QgdGhhdFxuICAgICAgLy8gYW4gaW5zdGFuY2Ugb2YgYSBgQ29tcG9uZW50RmFjdG9yeWAsIHJlc29sdmVkIHZpYSBgQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyYCB3b3VsZCBoYXZlIGFuXG4gICAgICAvLyBgbmdNb2R1bGVgIGZpZWxkLiBUaGlzIGlzIHBvc3NpYmxlIGluIHNvbWUgdGVzdCBzY2VuYXJpb3MgYW5kIHBvdGVudGlhbGx5IGluIHNvbWUgSklULWJhc2VkXG4gICAgICAvLyB1c2UtY2FzZXMuIEZvciB0aGUgYENvbXBvbmVudEZhY3RvcnlgIGNhc2Ugd2UgcHJlc2VydmUgYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgYW5kIHRyeVxuICAgICAgLy8gdXNpbmcgYSBwcm92aWRlZCBpbmplY3RvciBmaXJzdCwgdGhlbiBmYWxsIGJhY2sgdG8gdGhlIHBhcmVudCBpbmplY3RvciBvZiB0aGlzXG4gICAgICAvLyBgVmlld0NvbnRhaW5lclJlZmAgaW5zdGFuY2UuXG4gICAgICAvL1xuICAgICAgLy8gRm9yIHRoZSBmYWN0b3J5LWxlc3MgY2FzZSwgaXQncyBjcml0aWNhbCB0byBlc3RhYmxpc2ggYSBjb25uZWN0aW9uIHdpdGggdGhlIG1vZHVsZVxuICAgICAgLy8gaW5qZWN0b3IgdHJlZSAoYnkgcmV0cmlldmluZyBhbiBpbnN0YW5jZSBvZiBhbiBgTmdNb2R1bGVSZWZgIGFuZCBhY2Nlc3NpbmcgaXRzIGluamVjdG9yKSxcbiAgICAgIC8vIHNvIHRoYXQgYSBjb21wb25lbnQgY2FuIHVzZSBESSB0b2tlbnMgcHJvdmlkZWQgaW4gTWdNb2R1bGVzLiBGb3IgdGhpcyByZWFzb24sIHdlIGNhbiBub3RcbiAgICAgIC8vIHJlbHkgb24gdGhlIHByb3ZpZGVkIGluamVjdG9yLCBzaW5jZSBpdCBtaWdodCBiZSBkZXRhY2hlZCBmcm9tIHRoZSBESSB0cmVlIChmb3IgZXhhbXBsZSwgaWZcbiAgICAgIC8vIGl0IHdhcyBjcmVhdGVkIHZpYSBgSW5qZWN0b3IuY3JlYXRlYCB3aXRob3V0IHNwZWNpZnlpbmcgYSBwYXJlbnQgaW5qZWN0b3IsIG9yIGlmIGFuXG4gICAgICAvLyBpbmplY3RvciBpcyByZXRyaWV2ZWQgZnJvbSBhbiBgTmdNb2R1bGVSZWZgIGNyZWF0ZWQgdmlhIGBjcmVhdGVOZ01vZHVsZWAgdXNpbmcgYW5cbiAgICAgIC8vIE5nTW9kdWxlIG91dHNpZGUgb2YgYSBtb2R1bGUgdHJlZSkuIEluc3RlYWQsIHdlIGFsd2F5cyB1c2UgYFZpZXdDb250YWluZXJSZWZgJ3MgcGFyZW50XG4gICAgICAvLyBpbmplY3Rvciwgd2hpY2ggaXMgbm9ybWFsbHkgY29ubmVjdGVkIHRvIHRoZSBESSB0cmVlLCB3aGljaCBpbmNsdWRlcyBtb2R1bGUgaW5qZWN0b3JcbiAgICAgIC8vIHN1YnRyZWUuXG4gICAgICBjb25zdCBfaW5qZWN0b3IgPSBpc0NvbXBvbmVudEZhY3RvcnkgPyBjb250ZXh0SW5qZWN0b3IgOiB0aGlzLnBhcmVudEluamVjdG9yO1xuXG4gICAgICAvLyBETyBOT1QgUkVGQUNUT1IuIFRoZSBjb2RlIGhlcmUgdXNlZCB0byBoYXZlIGEgYGluamVjdG9yLmdldChOZ01vZHVsZVJlZiwgbnVsbCkgfHxcbiAgICAgIC8vIHVuZGVmaW5lZGAgZXhwcmVzc2lvbiB3aGljaCBzZWVtcyB0byBjYXVzZSBpbnRlcm5hbCBnb29nbGUgYXBwcyB0byBmYWlsLiBUaGlzIGlzIGRvY3VtZW50ZWRcbiAgICAgIC8vIGluIHRoZSBmb2xsb3dpbmcgaW50ZXJuYWwgYnVnIGlzc3VlOiBnby9iLzE0Mjk2NzgwMlxuICAgICAgY29uc3QgcmVzdWx0ID0gX2luamVjdG9yLmdldChFbnZpcm9ubWVudEluamVjdG9yLCBudWxsKTtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgZW52aXJvbm1lbnRJbmplY3RvciA9IHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPOiB0aGlzIGlzIG5vdCBjb3JyZWN0IGZvciBzZWxlY3RvcnMgbGlrZSBgYXBwW3BhcmFtXWAsXG4gICAgLy8gd2UgbmVlZCB0byByZWx5IG9uIHNvbWUgb3RoZXIgaW5mbyAobGlrZSBjb21wb25lbnQgaWQpLlxuICAgIGNvbnN0IGVsZW1lbnROYW1lID0gY29tcG9uZW50RmFjdG9yeS5zZWxlY3RvcjtcbiAgICBjb25zdCBkZWh5ZHJhdGVkVmlldyA9IGZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3KHRoaXMuX2xDb250YWluZXIsIGVsZW1lbnROYW1lKTtcbiAgICBsZXQgck5vZGU7XG4gICAgbGV0IG9yaWdIeWRyYXRpb25JbmZvOiBOZ2hWaWV3fG51bGwgPSBudWxsO1xuXG4gICAgaWYgKGRlaHlkcmF0ZWRWaWV3KSB7XG4gICAgICAvLyBQb2ludGVyIHRvIGEgaG9zdCBET00gZWxlbWVudC5cbiAgICAgIHJOb2RlID0gZGVoeWRyYXRlZFZpZXcuZmlyc3RDaGlsZDtcblxuICAgICAgLy8gUmVhZCBoeWRyYXRpb24gaW5mbyBhbmQgcGFzcyBpdCBvdmVyIHRvIHRoZSBjb21wb25lbnQgdmlldy5cbiAgICAgIGNvbnN0IG5naCA9IChyTm9kZSBhcyBIVE1MRWxlbWVudCkuZ2V0QXR0cmlidXRlKCduZ2gnKTtcbiAgICAgIGlmIChuZ2gpIHtcbiAgICAgICAgY29uc3QgaHlkcmF0aW9uSW5mbyA9IEpTT04ucGFyc2UobmdoKSBhcyBOZ2hWaWV3O1xuICAgICAgICBoeWRyYXRpb25JbmZvLmZpcnN0Q2hpbGQgPSByTm9kZS5maXJzdENoaWxkIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAock5vZGUgYXMgSFRNTEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZSgnbmdoJyk7XG4gICAgICAgIG9yaWdIeWRyYXRpb25JbmZvID0gc2V0Q3VycmVudEh5ZHJhdGlvbkluZm9Gb3JDb21wb25lbnRSZWYoaHlkcmF0aW9uSW5mbyk7XG4gICAgICAgIG5nRGV2TW9kZSAmJiBtYXJrUk5vZGVBc0NsYWltZWRGb3JIeWRyYXRpb24ock5vZGUhKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb21wb25lbnRSZWYgPVxuICAgICAgICBjb21wb25lbnRGYWN0b3J5LmNyZWF0ZShjb250ZXh0SW5qZWN0b3IsIHByb2plY3RhYmxlTm9kZXMsIHJOb2RlLCBlbnZpcm9ubWVudEluamVjdG9yKTtcblxuICAgIHNldEN1cnJlbnRIeWRyYXRpb25JbmZvRm9yQ29tcG9uZW50UmVmKG51bGwpO1xuXG4gICAgdGhpcy5pbnNlcnQoY29tcG9uZW50UmVmLmhvc3RWaWV3LCBpbmRleCk7XG4gICAgcmV0dXJuIGNvbXBvbmVudFJlZjtcbiAgfVxuXG4gIG92ZXJyaWRlIGluc2VydCh2aWV3UmVmOiBWaWV3UmVmLCBpbmRleD86IG51bWJlcik6IFZpZXdSZWYge1xuICAgIGNvbnN0IGxWaWV3ID0gKHZpZXdSZWYgYXMgUjNWaWV3UmVmPGFueT4pLl9sVmlldyE7XG4gICAgY29uc3QgdFZpZXcgPSBsVmlld1tUVklFV107XG5cbiAgICBpZiAobmdEZXZNb2RlICYmIHZpZXdSZWYuZGVzdHJveWVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBpbnNlcnQgYSBkZXN0cm95ZWQgVmlldyBpbiBhIFZpZXdDb250YWluZXIhJyk7XG4gICAgfVxuXG4gICAgaWYgKHZpZXdBdHRhY2hlZFRvQ29udGFpbmVyKGxWaWV3KSkge1xuICAgICAgLy8gSWYgdmlldyBpcyBhbHJlYWR5IGF0dGFjaGVkLCBkZXRhY2ggaXQgZmlyc3Qgc28gd2UgY2xlYW4gdXAgcmVmZXJlbmNlcyBhcHByb3ByaWF0ZWx5LlxuXG4gICAgICBjb25zdCBwcmV2SWR4ID0gdGhpcy5pbmRleE9mKHZpZXdSZWYpO1xuXG4gICAgICAvLyBBIHZpZXcgbWlnaHQgYmUgYXR0YWNoZWQgZWl0aGVyIHRvIHRoaXMgb3IgYSBkaWZmZXJlbnQgY29udGFpbmVyLiBUaGUgYHByZXZJZHhgIGZvclxuICAgICAgLy8gdGhvc2UgY2FzZXMgd2lsbCBiZTpcbiAgICAgIC8vIGVxdWFsIHRvIC0xIGZvciB2aWV3cyBhdHRhY2hlZCB0byB0aGlzIFZpZXdDb250YWluZXJSZWZcbiAgICAgIC8vID49IDAgZm9yIHZpZXdzIGF0dGFjaGVkIHRvIGEgZGlmZmVyZW50IFZpZXdDb250YWluZXJSZWZcbiAgICAgIGlmIChwcmV2SWR4ICE9PSAtMSkge1xuICAgICAgICB0aGlzLmRldGFjaChwcmV2SWR4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHByZXZMQ29udGFpbmVyID0gbFZpZXdbUEFSRU5UXSBhcyBMQ29udGFpbmVyO1xuICAgICAgICBuZ0Rldk1vZGUgJiZcbiAgICAgICAgICAgIGFzc2VydEVxdWFsKFxuICAgICAgICAgICAgICAgIGlzTENvbnRhaW5lcihwcmV2TENvbnRhaW5lciksIHRydWUsXG4gICAgICAgICAgICAgICAgJ0FuIGF0dGFjaGVkIHZpZXcgc2hvdWxkIGhhdmUgaXRzIFBBUkVOVCBwb2ludCB0byBhIGNvbnRhaW5lci4nKTtcblxuXG4gICAgICAgIC8vIFdlIG5lZWQgdG8gcmUtY3JlYXRlIGEgUjNWaWV3Q29udGFpbmVyUmVmIGluc3RhbmNlIHNpbmNlIHRob3NlIGFyZSBub3Qgc3RvcmVkIG9uXG4gICAgICAgIC8vIExWaWV3IChub3IgYW55d2hlcmUgZWxzZSkuXG4gICAgICAgIGNvbnN0IHByZXZWQ1JlZiA9IG5ldyBSM1ZpZXdDb250YWluZXJSZWYoXG4gICAgICAgICAgICBwcmV2TENvbnRhaW5lciwgcHJldkxDb250YWluZXJbVF9IT1NUXSBhcyBURGlyZWN0aXZlSG9zdE5vZGUsIHByZXZMQ29udGFpbmVyW1BBUkVOVF0pO1xuXG4gICAgICAgIHByZXZWQ1JlZi5kZXRhY2gocHJldlZDUmVmLmluZGV4T2Yodmlld1JlZikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIExvZ2ljYWwgb3BlcmF0aW9uIG9mIGFkZGluZyBgTFZpZXdgIHRvIGBMQ29udGFpbmVyYFxuICAgIGNvbnN0IGFkanVzdGVkSWR4ID0gdGhpcy5fYWRqdXN0SW5kZXgoaW5kZXgpO1xuICAgIGNvbnN0IGxDb250YWluZXIgPSB0aGlzLl9sQ29udGFpbmVyO1xuICAgIGluc2VydFZpZXcodFZpZXcsIGxWaWV3LCBsQ29udGFpbmVyLCBhZGp1c3RlZElkeCk7XG5cbiAgICAvLyBQaHlzaWNhbCBvcGVyYXRpb24gb2YgYWRkaW5nIHRoZSBET00gbm9kZXMuXG4gICAgLy9cbiAgICAvLyBJZiBhbiBMVmlldyBoYXMgaHlkcmF0aW9uIGluZm8sIGF2b2lkIGluc2VydGluZyBlbGVtZW50c1xuICAgIC8vIGVsZW1lbnRzIGludG8gdGhlIERPTSBhcyB0aGV5IGFyZSBhbHJlYWR5IGF0dGFjaGVkLlxuICAgIC8vXG4gICAgLy8gVE9ETzogc2hvdWxkIHdlIHJlc2V0IHRoZSBgSFlEUkFUSU9OX0lORk9gIGFmdGVyd2FyZHM/XG4gICAgLy8gICAgICAgV2l0aG91dCB0aGF0IHRoZXJlIG1pZ2h0IGJlIGEgcHJvYmxlbSBsYXRlciBvbiB3aGVuXG4gICAgLy8gICAgICAgd2UnZCB0cnkgdG8gaW5zZXJ0L21vdmUgdGhlIHZpZXcgYWdhaW4/XG4gICAgaWYgKCFsVmlld1tIWURSQVRJT05fSU5GT10pIHtcbiAgICAgIGNvbnN0IGJlZm9yZU5vZGUgPSBnZXRCZWZvcmVOb2RlRm9yVmlldyhhZGp1c3RlZElkeCwgbENvbnRhaW5lcik7XG4gICAgICBjb25zdCByZW5kZXJlciA9IGxWaWV3W1JFTkRFUkVSXTtcbiAgICAgIGNvbnN0IHBhcmVudFJOb2RlID0gbmF0aXZlUGFyZW50Tm9kZShyZW5kZXJlciwgbENvbnRhaW5lcltOQVRJVkVdIGFzIFJFbGVtZW50IHwgUkNvbW1lbnQpO1xuICAgICAgaWYgKHBhcmVudFJOb2RlICE9PSBudWxsKSB7XG4gICAgICAgIGFkZFZpZXdUb0NvbnRhaW5lcih0VmlldywgbENvbnRhaW5lcltUX0hPU1RdLCByZW5kZXJlciwgbFZpZXcsIHBhcmVudFJOb2RlLCBiZWZvcmVOb2RlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAodmlld1JlZiBhcyBSM1ZpZXdSZWY8YW55PikuYXR0YWNoVG9WaWV3Q29udGFpbmVyUmVmKCk7XG4gICAgYWRkVG9BcnJheShnZXRPckNyZWF0ZVZpZXdSZWZzKGxDb250YWluZXIpLCBhZGp1c3RlZElkeCwgdmlld1JlZik7XG5cbiAgICByZXR1cm4gdmlld1JlZjtcbiAgfVxuXG4gIG92ZXJyaWRlIG1vdmUodmlld1JlZjogVmlld1JlZiwgbmV3SW5kZXg6IG51bWJlcik6IFZpZXdSZWYge1xuICAgIGlmIChuZ0Rldk1vZGUgJiYgdmlld1JlZi5kZXN0cm95ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IG1vdmUgYSBkZXN0cm95ZWQgVmlldyBpbiBhIFZpZXdDb250YWluZXIhJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmluc2VydCh2aWV3UmVmLCBuZXdJbmRleCk7XG4gIH1cblxuICBvdmVycmlkZSBpbmRleE9mKHZpZXdSZWY6IFZpZXdSZWYpOiBudW1iZXIge1xuICAgIGNvbnN0IHZpZXdSZWZzQXJyID0gZ2V0Vmlld1JlZnModGhpcy5fbENvbnRhaW5lcik7XG4gICAgcmV0dXJuIHZpZXdSZWZzQXJyICE9PSBudWxsID8gdmlld1JlZnNBcnIuaW5kZXhPZih2aWV3UmVmKSA6IC0xO1xuICB9XG5cbiAgb3ZlcnJpZGUgcmVtb3ZlKGluZGV4PzogbnVtYmVyKTogdm9pZCB7XG4gICAgY29uc3QgYWRqdXN0ZWRJZHggPSB0aGlzLl9hZGp1c3RJbmRleChpbmRleCwgLTEpO1xuICAgIGNvbnN0IGRldGFjaGVkVmlldyA9IGRldGFjaFZpZXcodGhpcy5fbENvbnRhaW5lciwgYWRqdXN0ZWRJZHgpO1xuXG4gICAgaWYgKGRldGFjaGVkVmlldykge1xuICAgICAgLy8gQmVmb3JlIGRlc3Ryb3lpbmcgdGhlIHZpZXcsIHJlbW92ZSBpdCBmcm9tIHRoZSBjb250YWluZXIncyBhcnJheSBvZiBgVmlld1JlZmBzLlxuICAgICAgLy8gVGhpcyBlbnN1cmVzIHRoZSB2aWV3IGNvbnRhaW5lciBsZW5ndGggaXMgdXBkYXRlZCBiZWZvcmUgY2FsbGluZ1xuICAgICAgLy8gYGRlc3Ryb3lMVmlld2AsIHdoaWNoIGNvdWxkIHJlY3Vyc2l2ZWx5IGNhbGwgdmlldyBjb250YWluZXIgbWV0aG9kcyB0aGF0XG4gICAgICAvLyByZWx5IG9uIGFuIGFjY3VyYXRlIGNvbnRhaW5lciBsZW5ndGguXG4gICAgICAvLyAoZS5nLiBhIG1ldGhvZCBvbiB0aGlzIHZpZXcgY29udGFpbmVyIGJlaW5nIGNhbGxlZCBieSBhIGNoaWxkIGRpcmVjdGl2ZSdzIE9uRGVzdHJveVxuICAgICAgLy8gbGlmZWN5Y2xlIGhvb2spXG4gICAgICByZW1vdmVGcm9tQXJyYXkoZ2V0T3JDcmVhdGVWaWV3UmVmcyh0aGlzLl9sQ29udGFpbmVyKSwgYWRqdXN0ZWRJZHgpO1xuICAgICAgZGVzdHJveUxWaWV3KGRldGFjaGVkVmlld1tUVklFV10sIGRldGFjaGVkVmlldyk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgZGV0YWNoKGluZGV4PzogbnVtYmVyKTogVmlld1JlZnxudWxsIHtcbiAgICBjb25zdCBhZGp1c3RlZElkeCA9IHRoaXMuX2FkanVzdEluZGV4KGluZGV4LCAtMSk7XG4gICAgY29uc3QgdmlldyA9IGRldGFjaFZpZXcodGhpcy5fbENvbnRhaW5lciwgYWRqdXN0ZWRJZHgpO1xuXG4gICAgY29uc3Qgd2FzRGV0YWNoZWQgPVxuICAgICAgICB2aWV3ICYmIHJlbW92ZUZyb21BcnJheShnZXRPckNyZWF0ZVZpZXdSZWZzKHRoaXMuX2xDb250YWluZXIpLCBhZGp1c3RlZElkeCkgIT0gbnVsbDtcbiAgICByZXR1cm4gd2FzRGV0YWNoZWQgPyBuZXcgUjNWaWV3UmVmKHZpZXchKSA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIF9hZGp1c3RJbmRleChpbmRleD86IG51bWJlciwgc2hpZnQ6IG51bWJlciA9IDApIHtcbiAgICBpZiAoaW5kZXggPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoICsgc2hpZnQ7XG4gICAgfVxuICAgIGlmIChuZ0Rldk1vZGUpIHtcbiAgICAgIGFzc2VydEdyZWF0ZXJUaGFuKGluZGV4LCAtMSwgYFZpZXdSZWYgaW5kZXggbXVzdCBiZSBwb3NpdGl2ZSwgZ290ICR7aW5kZXh9YCk7XG4gICAgICAvLyArMSBiZWNhdXNlIGl0J3MgbGVnYWwgdG8gaW5zZXJ0IGF0IHRoZSBlbmQuXG4gICAgICBhc3NlcnRMZXNzVGhhbihpbmRleCwgdGhpcy5sZW5ndGggKyAxICsgc2hpZnQsICdpbmRleCcpO1xuICAgIH1cbiAgICByZXR1cm4gaW5kZXg7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGdldFZpZXdSZWZzKGxDb250YWluZXI6IExDb250YWluZXIpOiBWaWV3UmVmW118bnVsbCB7XG4gIHJldHVybiBsQ29udGFpbmVyW1ZJRVdfUkVGU10gYXMgVmlld1JlZltdO1xufVxuXG5mdW5jdGlvbiBnZXRPckNyZWF0ZVZpZXdSZWZzKGxDb250YWluZXI6IExDb250YWluZXIpOiBWaWV3UmVmW10ge1xuICByZXR1cm4gKGxDb250YWluZXJbVklFV19SRUZTXSB8fCAobENvbnRhaW5lcltWSUVXX1JFRlNdID0gW10pKSBhcyBWaWV3UmVmW107XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIFZpZXdDb250YWluZXJSZWYgYW5kIHN0b3JlcyBpdCBvbiB0aGUgaW5qZWN0b3IuXG4gKlxuICogQHBhcmFtIFZpZXdDb250YWluZXJSZWZUb2tlbiBUaGUgVmlld0NvbnRhaW5lclJlZiB0eXBlXG4gKiBAcGFyYW0gRWxlbWVudFJlZlRva2VuIFRoZSBFbGVtZW50UmVmIHR5cGVcbiAqIEBwYXJhbSBob3N0VE5vZGUgVGhlIG5vZGUgdGhhdCBpcyByZXF1ZXN0aW5nIGEgVmlld0NvbnRhaW5lclJlZlxuICogQHBhcmFtIGhvc3RMVmlldyBUaGUgdmlldyB0byB3aGljaCB0aGUgbm9kZSBiZWxvbmdzXG4gKiBAcmV0dXJucyBUaGUgVmlld0NvbnRhaW5lclJlZiBpbnN0YW5jZSB0byB1c2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbnRhaW5lclJlZihcbiAgICBob3N0VE5vZGU6IFRFbGVtZW50Tm9kZXxUQ29udGFpbmVyTm9kZXxURWxlbWVudENvbnRhaW5lck5vZGUsXG4gICAgaG9zdExWaWV3OiBMVmlldyk6IFZpZXdDb250YWluZXJSZWYge1xuICBuZ0Rldk1vZGUgJiYgYXNzZXJ0VE5vZGVUeXBlKGhvc3RUTm9kZSwgVE5vZGVUeXBlLkFueUNvbnRhaW5lciB8IFROb2RlVHlwZS5BbnlSTm9kZSk7XG5cbiAgbGV0IGxDb250YWluZXI6IExDb250YWluZXI7XG4gIGxldCBuZ2hDb250YWluZXI6IE5naENvbnRhaW5lcjtcbiAgbGV0IGRlaHlkcmF0ZWRWaWV3czogTmdoVmlld1tdID0gW107XG4gIGNvbnN0IG5naCA9IGhvc3RMVmlld1tIWURSQVRJT05fSU5GT107XG4gIGlmIChuZ2gpIHtcbiAgICBjb25zdCBpbmRleCA9IGhvc3RUTm9kZS5pbmRleCAtIEhFQURFUl9PRkZTRVQ7XG4gICAgbmdoQ29udGFpbmVyID0gbmdoLmNvbnRhaW5lcnNbaW5kZXhdO1xuICAgIG5nRGV2TW9kZSAmJlxuICAgICAgICBhc3NlcnREZWZpbmVkKG5naENvbnRhaW5lciwgJ1RoZXJlIGlzIG5vIGh5ZHJhdGlvbiBpbmZvIGF2YWlsYWJsZSBmb3IgdGhpcyBjb250YWluZXInKTtcbiAgfVxuXG4gIGNvbnN0IHNsb3RWYWx1ZSA9IGhvc3RMVmlld1tob3N0VE5vZGUuaW5kZXhdO1xuICBpZiAoaXNMQ29udGFpbmVyKHNsb3RWYWx1ZSkpIHtcbiAgICAvLyBJZiB0aGUgaG9zdCBpcyBhIGNvbnRhaW5lciwgd2UgZG9uJ3QgbmVlZCB0byBjcmVhdGUgYSBuZXcgTENvbnRhaW5lclxuICAgIGxDb250YWluZXIgPSBzbG90VmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgbGV0IGNvbW1lbnROb2RlOiBSQ29tbWVudDtcbiAgICAvLyBJZiB0aGUgaG9zdCBpcyBhbiBlbGVtZW50IGNvbnRhaW5lciwgdGhlIG5hdGl2ZSBob3N0IGVsZW1lbnQgaXMgZ3VhcmFudGVlZCB0byBiZSBhXG4gICAgLy8gY29tbWVudCBhbmQgd2UgY2FuIHJldXNlIHRoYXQgY29tbWVudCBhcyBhbmNob3IgZWxlbWVudCBmb3IgdGhlIG5ldyBMQ29udGFpbmVyLlxuICAgIC8vIFRoZSBjb21tZW50IG5vZGUgaW4gcXVlc3Rpb24gaXMgYWxyZWFkeSBwYXJ0IG9mIHRoZSBET00gc3RydWN0dXJlIHNvIHdlIGRvbid0IG5lZWQgdG8gYXBwZW5kXG4gICAgLy8gaXQgYWdhaW4uXG4gICAgaWYgKGhvc3RUTm9kZS50eXBlICYgVE5vZGVUeXBlLkVsZW1lbnRDb250YWluZXIpIHtcbiAgICAgIGNvbW1lbnROb2RlID0gdW53cmFwUk5vZGUoc2xvdFZhbHVlKSBhcyBSQ29tbWVudDtcbiAgICAgIGlmIChuZ2ggJiYgbmdoQ29udGFpbmVyISAmJiBBcnJheS5pc0FycmF5KG5naENvbnRhaW5lci5kZWh5ZHJhdGVkVmlld3MpKSB7XG4gICAgICAgIC8vIFdoZW4gd2UgY3JlYXRlIGFuIExDb250YWluZXIgYmFzZWQgb24gYDxuZy1jb250YWluZXI+YCwgdGhlIGNvbnRhaW5lclxuICAgICAgICAvLyBpcyBhbHJlYWR5IHByb2Nlc3NlZCwgaW5jbHVkaW5nIGRlaHlkcmF0ZWQgdmlld3MgaW5mby4gUmV1c2UgdGhpcyBpbmZvXG4gICAgICAgIC8vIGFuZCBlcmFzZSBpdCBpbiB0aGUgbmdoIGRhdGEgdG8gYXZvaWQgbWVtb3J5IGxlYWtzLlxuICAgICAgICBkZWh5ZHJhdGVkVmlld3MgPSBuZ2hDb250YWluZXIuZGVoeWRyYXRlZFZpZXdzITtcbiAgICAgICAgbmdoQ29udGFpbmVyLmRlaHlkcmF0ZWRWaWV3cyA9IFtdO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAobmdoKSB7XG4gICAgICAgIC8vIFN0YXJ0IHdpdGggYSBub2RlIHRoYXQgaW1tZWRpYXRlbHkgZm9sbG93cyB0aGUgRE9NIG5vZGUgZm91bmRcbiAgICAgICAgLy8gaW4gYW4gTFZpZXcgc2xvdC4gVGhpcyBub2RlIGlzOlxuICAgICAgICAvLyAtIGVpdGhlciBhbiBhbmNob3IgY29tbWVudCBub2RlIG9mIHRoaXMgY29udGFpbmVyIGlmIGl0J3MgZW1wdHlcbiAgICAgICAgLy8gLSBvciBhIGZpcnN0IGVsZW1lbnQgb2YgdGhlIGZpcnN0IHZpZXcgaW4gdGhpcyBjb250YWluZXJcbiAgICAgICAgbGV0IGN1cnJlbnRSTm9kZSA9ICh1bndyYXBSTm9kZShzbG90VmFsdWUpIGFzIFJOb2RlKS5uZXh0U2libGluZztcbiAgICAgICAgLy8gVE9ETzogQWRkIGFzc2VydCB0aGF0IHRoZSBjdXJyZW50Uk5vZGUgZXhpc3RzXG4gICAgICAgIGNvbnN0IFthbmNob3JSTm9kZSwgdmlld3NdID0gbG9jYXRlRGVoeWRyYXRlZFZpZXdzSW5Db250YWluZXIoY3VycmVudFJOb2RlISwgbmdoQ29udGFpbmVyISk7XG5cbiAgICAgICAgY29tbWVudE5vZGUgPSBhbmNob3JSTm9kZSBhcyBSQ29tbWVudDtcbiAgICAgICAgZGVoeWRyYXRlZFZpZXdzID0gdmlld3M7XG5cbiAgICAgICAgbmdEZXZNb2RlICYmXG4gICAgICAgICAgICBhc3NlcnRSQ29tbWVudChjb21tZW50Tm9kZSwgJ0V4cGVjdGluZyBhIGNvbW1lbnQgbm9kZSBpbiB0ZW1wbGF0ZSBpbnN0cnVjdGlvbicpO1xuICAgICAgICBuZ0Rldk1vZGUgJiYgbWFya1JOb2RlQXNDbGFpbWVkRm9ySHlkcmF0aW9uKGNvbW1lbnROb2RlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHRoZSBob3N0IGlzIGEgcmVndWxhciBlbGVtZW50LCB3ZSBoYXZlIHRvIGluc2VydCBhIGNvbW1lbnQgbm9kZSBtYW51YWxseSB3aGljaCB3aWxsXG4gICAgICAgIC8vIGJlIHVzZWQgYXMgYW4gYW5jaG9yIHdoZW4gaW5zZXJ0aW5nIGVsZW1lbnRzLiBJbiB0aGlzIHNwZWNpZmljIGNhc2Ugd2UgdXNlIGxvdy1sZXZlbCBET01cbiAgICAgICAgLy8gbWFuaXB1bGF0aW9uIHRvIGluc2VydCBpdC5cbiAgICAgICAgY29uc3QgcmVuZGVyZXIgPSBob3N0TFZpZXdbUkVOREVSRVJdO1xuICAgICAgICBuZ0Rldk1vZGUgJiYgbmdEZXZNb2RlLnJlbmRlcmVyQ3JlYXRlQ29tbWVudCsrO1xuICAgICAgICBjb21tZW50Tm9kZSA9IHJlbmRlcmVyLmNyZWF0ZUNvbW1lbnQobmdEZXZNb2RlID8gJ2NvbnRhaW5lcicgOiAnJyk7XG5cbiAgICAgICAgY29uc3QgaG9zdE5hdGl2ZSA9IGdldE5hdGl2ZUJ5VE5vZGUoaG9zdFROb2RlLCBob3N0TFZpZXcpITtcbiAgICAgICAgY29uc3QgcGFyZW50T2ZIb3N0TmF0aXZlID0gbmF0aXZlUGFyZW50Tm9kZShyZW5kZXJlciwgaG9zdE5hdGl2ZSk7XG4gICAgICAgIG5hdGl2ZUluc2VydEJlZm9yZShcbiAgICAgICAgICAgIHJlbmRlcmVyLCBwYXJlbnRPZkhvc3ROYXRpdmUhLCBjb21tZW50Tm9kZSwgbmF0aXZlTmV4dFNpYmxpbmcocmVuZGVyZXIsIGhvc3ROYXRpdmUpLFxuICAgICAgICAgICAgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGhvc3RMVmlld1tob3N0VE5vZGUuaW5kZXhdID0gbENvbnRhaW5lciA9XG4gICAgICAgIGNyZWF0ZUxDb250YWluZXIoc2xvdFZhbHVlLCBob3N0TFZpZXcsIGNvbW1lbnROb2RlLCBob3N0VE5vZGUpO1xuXG4gICAgaWYgKG5naCAmJiBkZWh5ZHJhdGVkVmlld3MubGVuZ3RoID4gMCkge1xuICAgICAgbENvbnRhaW5lcltERUhZRFJBVEVEX1ZJRVdTXSA9IGRlaHlkcmF0ZWRWaWV3cztcbiAgICB9XG5cbiAgICBhZGRUb1ZpZXdUcmVlKGhvc3RMVmlldywgbENvbnRhaW5lcik7XG4gIH1cblxuICByZXR1cm4gbmV3IFIzVmlld0NvbnRhaW5lclJlZihsQ29udGFpbmVyLCBob3N0VE5vZGUsIGhvc3RMVmlldyk7XG59XG5cbmZ1bmN0aW9uIGZpbmRNYXRjaGluZ0RlaHlkcmF0ZWRWaWV3KGxDb250YWluZXI6IExDb250YWluZXIsIHRlbXBsYXRlOiBzdHJpbmcpOiBOZ2hWaWV3fG51bGwge1xuICBsZXQgaHlkcmF0aW9uSW5mbzogTmdoVmlld3xudWxsID0gbnVsbDtcbiAgaWYgKGxDb250YWluZXIgIT09IG51bGwgJiYgbENvbnRhaW5lcltERUhZRFJBVEVEX1ZJRVdTXSkge1xuICAgIC8vIERvZXMgdGhlIHRhcmdldCBjb250YWluZXIgaGF2ZSBhIHZpZXc/XG4gICAgY29uc3QgZGVoeWRyYXRlZFZpZXdzID0gbENvbnRhaW5lcltERUhZRFJBVEVEX1ZJRVdTXTtcbiAgICBpZiAoZGVoeWRyYXRlZFZpZXdzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIFRPRE86IHRha2UgaW50byBhY2NvdW50IGFuIGluZGV4IG9mIGEgdmlldyB3aXRoaW4gVmlld0NvbnRhaW5lclJlZixcbiAgICAgIC8vIG90aGVyd2lzZSwgd2UgbWF5IGVuZCB1cCByZXVzaW5nIHdyb25nIG5vZGVzIGZyb20gbGl2ZSBET00/XG4gICAgICBjb25zdCBkZWh5ZHJhdGVkVmlld0luZGV4ID0gZGVoeWRyYXRlZFZpZXdzLmZpbmRJbmRleCh2aWV3ID0+IHZpZXcudGVtcGxhdGUgPT09IHRlbXBsYXRlKTtcblxuICAgICAgaWYgKGRlaHlkcmF0ZWRWaWV3SW5kZXggPiAtMSkge1xuICAgICAgICBoeWRyYXRpb25JbmZvID0gZGVoeWRyYXRlZFZpZXdzW2RlaHlkcmF0ZWRWaWV3SW5kZXhdO1xuXG4gICAgICAgIC8vIERyb3AgdGhpcyB2aWV3IGZyb20gdGhlIGxpc3Qgb2YgZGUtaHlkcmF0ZWQgb25lcy5cbiAgICAgICAgZGVoeWRyYXRlZFZpZXdzLnNwbGljZShkZWh5ZHJhdGVkVmlld0luZGV4LCAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGh5ZHJhdGlvbkluZm87XG59XG4iXX0=