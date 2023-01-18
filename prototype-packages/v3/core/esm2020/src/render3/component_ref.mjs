/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { convertToBitFlags } from '../di/injector_compatibility';
import { EnvironmentInjector } from '../di/r3_injector';
import { RuntimeError } from '../errors';
import { ComponentFactory as AbstractComponentFactory, ComponentRef as AbstractComponentRef } from '../linker/component_factory';
import { ComponentFactoryResolver as AbstractComponentFactoryResolver } from '../linker/component_factory_resolver';
import { createElementRef } from '../linker/element_ref';
import { RendererFactory2 } from '../render/api';
import { Sanitizer } from '../sanitization/sanitizer';
import { assertDefined, assertGreaterThan, assertIndexInRange } from '../util/assert';
import { VERSION } from '../version';
import { NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR } from '../view/provider_flags';
import { assertComponentType } from './assert';
import { attachPatchData } from './context_discovery';
import { getComponentDef } from './definition';
import { getNodeInjectable, NodeInjector } from './di';
import { throwProviderNotFoundError } from './errors_di';
import { registerPostOrderHooks } from './hooks';
import { IS_HYDRATION_ENABLED, markRNodeAsClaimedForHydration } from './hydration';
import { reportUnknownPropertyError } from './instructions/element_validation';
import { addToViewTree, createLView, createTView, executeContentQueries, getOrCreateComponentTView, getOrCreateTNode, initializeDirectives, invokeDirectivesHostBindings, locateHostElement, markAsComponentHost, markDirtyIfOnPush, renderView, setInputsForProperty } from './instructions/shared';
import { CONTEXT, HEADER_OFFSET, HYDRATION_INFO, TVIEW } from './interfaces/view';
import { MATH_ML_NAMESPACE, SVG_NAMESPACE } from './namespaces';
import { createElementNode, setupStaticAttributes, writeDirectClass } from './node_manipulation';
import { extractAttrsAndClassesFromSelector, stringifyCSSSelectorList } from './node_selector_matcher';
import { enterView, getCurrentTNode, getLView, leaveView } from './state';
import { computeStaticStyling } from './styling/static_styling';
import { mergeHostAttrs, setUpAttributes } from './util/attrs_utils';
import { stringifyForError } from './util/stringify_utils';
import { getNativeByTNode, getTNode } from './util/view_utils';
import { RootViewRef } from './view_ref';
export class ComponentFactoryResolver extends AbstractComponentFactoryResolver {
    /**
     * @param ngModule The NgModuleRef to which all resolved factories are bound.
     */
    constructor(ngModule) {
        super();
        this.ngModule = ngModule;
    }
    resolveComponentFactory(component) {
        ngDevMode && assertComponentType(component);
        const componentDef = getComponentDef(component);
        return new ComponentFactory(componentDef, this.ngModule);
    }
}
function toRefArray(map) {
    const array = [];
    for (let nonMinified in map) {
        if (map.hasOwnProperty(nonMinified)) {
            const minified = map[nonMinified];
            array.push({ propName: minified, templateName: nonMinified });
        }
    }
    return array;
}
function getNamespace(elementName) {
    const name = elementName.toLowerCase();
    return name === 'svg' ? SVG_NAMESPACE : (name === 'math' ? MATH_ML_NAMESPACE : null);
}
/**
 * Injector that looks up a value using a specific injector, before falling back to the module
 * injector. Used primarily when creating components or embedded views dynamically.
 */
class ChainedInjector {
    constructor(injector, parentInjector) {
        this.injector = injector;
        this.parentInjector = parentInjector;
    }
    get(token, notFoundValue, flags) {
        flags = convertToBitFlags(flags);
        const value = this.injector.get(token, NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR, flags);
        if (value !== NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR ||
            notFoundValue === NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR) {
            // Return the value from the root element injector when
            // - it provides it
            //   (value !== NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR)
            // - the module injector should not be checked
            //   (notFoundValue === NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR)
            return value;
        }
        return this.parentInjector.get(token, notFoundValue, flags);
    }
}
/**
 * ComponentFactory interface implementation.
 */
export class ComponentFactory extends AbstractComponentFactory {
    get inputs() {
        return toRefArray(this.componentDef.inputs);
    }
    get outputs() {
        return toRefArray(this.componentDef.outputs);
    }
    /**
     * @param componentDef The component definition.
     * @param ngModule The NgModuleRef to which the factory is bound.
     */
    constructor(componentDef, ngModule) {
        super();
        this.componentDef = componentDef;
        this.ngModule = ngModule;
        this.componentType = componentDef.type;
        this.selector = stringifyCSSSelectorList(componentDef.selectors);
        this.ngContentSelectors =
            componentDef.ngContentSelectors ? componentDef.ngContentSelectors : [];
        this.isBoundToModule = !!ngModule;
    }
    create(injector, projectableNodes, rootSelectorOrNode, environmentInjector) {
        environmentInjector = environmentInjector || this.ngModule;
        let realEnvironmentInjector = environmentInjector instanceof EnvironmentInjector ?
            environmentInjector :
            environmentInjector?.injector;
        if (realEnvironmentInjector && this.componentDef.getStandaloneInjector !== null) {
            realEnvironmentInjector = this.componentDef.getStandaloneInjector(realEnvironmentInjector) ||
                realEnvironmentInjector;
        }
        const rootViewInjector = realEnvironmentInjector ? new ChainedInjector(injector, realEnvironmentInjector) : injector;
        const rendererFactory = rootViewInjector.get(RendererFactory2, null);
        if (rendererFactory === null) {
            throw new RuntimeError(407 /* RuntimeErrorCode.RENDERER_NOT_FOUND */, ngDevMode &&
                'Angular was not able to inject a renderer (RendererFactory2). ' +
                    'Likely this is due to a broken DI hierarchy. ' +
                    'Make sure that any injector used to create this component has a correct parent.');
        }
        const sanitizer = rootViewInjector.get(Sanitizer, null);
        const hostRenderer = rendererFactory.createRenderer(null, this.componentDef);
        // Determine a tag name used for creating host elements when this component is created
        // dynamically. Default to 'div' if this component did not specify any tag name in its selector.
        const elementName = this.componentDef.selectors[0][0] || 'div';
        const ishydrationEnabled = rootViewInjector.get(IS_HYDRATION_ENABLED, false);
        const hostRNode = rootSelectorOrNode ?
            locateHostElement(hostRenderer, rootSelectorOrNode, this.componentDef.encapsulation, ishydrationEnabled) :
            createElementNode(hostRenderer, elementName, getNamespace(elementName));
        const rootFlags = this.componentDef.onPush ? 32 /* LViewFlags.Dirty */ | 256 /* LViewFlags.IsRoot */ :
            16 /* LViewFlags.CheckAlways */ | 256 /* LViewFlags.IsRoot */;
        // Create the root view. Uses empty TView and ContentTemplate.
        const rootTView = createTView(0 /* TViewType.Root */, null, null, 1, 0, null, null, null, null, null);
        const rootLView = createLView(null, rootTView, null, rootFlags, null, null, rendererFactory, hostRenderer, sanitizer, rootViewInjector, null);
        // rootView is the parent when bootstrapping
        // TODO(misko): it looks like we are entering view here but we don't really need to as
        // `renderView` does that. However as the code is written it is needed because
        // `createRootComponentView` and `createRootComponent` both read global state. Fixing those
        // issues would allow us to drop this.
        enterView(rootLView);
        let component;
        let tElementNode;
        try {
            const rootComponentDef = this.componentDef;
            let rootDirectives;
            let hostDirectiveDefs = null;
            if (rootComponentDef.findHostDirectiveDefs) {
                rootDirectives = [];
                hostDirectiveDefs = new Map();
                rootComponentDef.findHostDirectiveDefs(rootComponentDef, rootDirectives, hostDirectiveDefs);
                rootDirectives.push(rootComponentDef);
            }
            else {
                rootDirectives = [rootComponentDef];
            }
            const hostTNode = createRootComponentTNode(rootLView, hostRNode);
            const componentView = createRootComponentView(hostTNode, hostRNode, rootComponentDef, rootDirectives, rootLView, rendererFactory, hostRenderer, null, hydrationInfo ?? undefined);
            tElementNode = getTNode(rootTView, HEADER_OFFSET);
            // TODO(crisbeto): in practice `hostRNode` should always be defined, but there are some tests
            // where the renderer is mocked out and `undefined` is returned. We should update the tests so
            // that this check can be removed.
            if (hostRNode) {
                setRootNodeAttributes(hostRenderer, rootComponentDef, hostRNode, rootSelectorOrNode);
            }
            if (projectableNodes !== undefined) {
                projectNodes(tElementNode, this.ngContentSelectors, projectableNodes);
            }
            // TODO: should LifecycleHooksFeature and other host features be generated by the compiler and
            // executed here?
            // Angular 5 reference: https://stackblitz.com/edit/lifecycle-hooks-vcref
            component = createRootComponent(componentView, rootComponentDef, rootDirectives, hostDirectiveDefs, rootLView, [LifecycleHooksFeature]);
            renderView(rootTView, rootLView, null);
        }
        finally {
            leaveView();
        }
        return new ComponentRef(this.componentType, component, createElementRef(tElementNode, rootLView), rootLView, tElementNode);
    }
}
/**
 * Represents an instance of a Component created via a {@link ComponentFactory}.
 *
 * `ComponentRef` provides access to the Component Instance as well other objects related to this
 * Component Instance and allows you to destroy the Component Instance via the {@link #destroy}
 * method.
 *
 */
export class ComponentRef extends AbstractComponentRef {
    constructor(componentType, instance, location, _rootLView, _tNode) {
        super();
        this.location = location;
        this._rootLView = _rootLView;
        this._tNode = _tNode;
        this.instance = instance;
        this.hostView = this.changeDetectorRef = new RootViewRef(_rootLView);
        this.componentType = componentType;
    }
    setInput(name, value) {
        const inputData = this._tNode.inputs;
        let dataValue;
        if (inputData !== null && (dataValue = inputData[name])) {
            const lView = this._rootLView;
            setInputsForProperty(lView[TVIEW], lView, dataValue, name, value);
            markDirtyIfOnPush(lView, this._tNode.index);
        }
        else {
            if (ngDevMode) {
                const cmpNameForError = stringifyForError(this.componentType);
                let message = `Can't set value of the '${name}' input on the '${cmpNameForError}' component. `;
                message += `Make sure that the '${name}' property is annotated with @Input() or a mapped @Input('${name}') exists.`;
                reportUnknownPropertyError(message);
            }
        }
    }
    get injector() {
        return new NodeInjector(this._tNode, this._rootLView);
    }
    destroy() {
        this.hostView.destroy();
    }
    onDestroy(callback) {
        this.hostView.onDestroy(callback);
    }
}
// TODO: A hack to not pull in the NullInjector from @angular/core.
export const NULL_INJECTOR = {
    get: (token, notFoundValue) => {
        throwProviderNotFoundError(token, 'NullInjector');
    }
};
/** Creates a TNode that can be used to instantiate a root component. */
function createRootComponentTNode(lView, rNode) {
    const tView = lView[TVIEW];
    const index = HEADER_OFFSET;
    ngDevMode && assertIndexInRange(lView, index);
    lView[index] = rNode;
    // '#host' is added here as we don't know the real host DOM name (we don't want to read it) and at
    // the same time we want to communicate the debug `TNode` that this is a special `TNode`
    // representing a host element.
    return getOrCreateTNode(tView, index, 2 /* TNodeType.Element */, '#host', null);
}
/**
 * Creates the root component view and the root component node.
 *
 * @param rNode Render host element.
 * @param rootComponentDef ComponentDef
 * @param rootView The parent view where the host node is stored
 * @param rendererFactory Factory to be used for creating child renderers.
 * @param hostRenderer The current renderer
 * @param sanitizer The sanitizer, if provided
 *
 * @returns Component view created
 */
function createRootComponentView(tNode, rNode, rootComponentDef, rootDirectives, rootView, rendererFactory, hostRenderer, sanitizer, hydrationInfo) {
    const tView = rootView[TVIEW];
    applyRootComponentStyling(rootDirectives, tNode, rNode, hostRenderer);
    const viewRenderer = rendererFactory.createRenderer(rNode, rootComponentDef);
    const componentView = createLView(rootView, getOrCreateComponentTView(rootComponentDef), null, rootComponentDef.onPush ? 32 /* LViewFlags.Dirty */ : 16 /* LViewFlags.CheckAlways */, rootView[tNode.index], tNode, rendererFactory, viewRenderer, sanitizer || null, null, null, hydrationInfo);
    // TODO: avoid duplication of this code.
    // (there is similar one in shared.ts and view_container_ref.ts)
    const hostRNode = rNode;
    const rawNgh = hostRNode.getAttribute('ngh');
    if (rawNgh) {
        const ngh = JSON.parse(rawNgh);
        ngh.firstChild = hostRNode.firstChild;
        componentView[HYDRATION_INFO] = ngh;
        hostRNode.removeAttribute('ngh');
        ngDevMode && markRNodeAsClaimedForHydration(rNode);
    }
    if (tView.firstCreatePass) {
        markAsComponentHost(tView, tNode, rootDirectives.length - 1);
    }
    addToViewTree(rootView, componentView);
    // Store component view at node index, with node as the HOST
    return rootView[tNode.index] = componentView;
}
/** Sets up the styling information on a root component. */
function applyRootComponentStyling(rootDirectives, tNode, rNode, hostRenderer) {
    for (const def of rootDirectives) {
        tNode.mergedAttrs = mergeHostAttrs(tNode.mergedAttrs, def.hostAttrs);
    }
    if (tNode.mergedAttrs !== null) {
        computeStaticStyling(tNode, tNode.mergedAttrs, true);
        if (rNode !== null) {
            setupStaticAttributes(hostRenderer, rNode, tNode);
        }
    }
}
/**
 * Creates a root component and sets it up with features and host bindings.Shared by
 * renderComponent() and ViewContainerRef.createComponent().
 */
function createRootComponent(componentView, rootComponentDef, rootDirectives, hostDirectiveDefs, rootLView, hostFeatures) {
    const rootTNode = getCurrentTNode();
    ngDevMode && assertDefined(rootTNode, 'tNode should have been already created');
    const tView = rootLView[TVIEW];
    const native = getNativeByTNode(rootTNode, rootLView);
    initializeDirectives(tView, rootLView, rootTNode, rootDirectives, null, hostDirectiveDefs);
    for (let i = 0; i < rootDirectives.length; i++) {
        const directiveIndex = rootTNode.directiveStart + i;
        const directiveInstance = getNodeInjectable(rootLView, tView, directiveIndex, rootTNode);
        attachPatchData(directiveInstance, rootLView);
    }
    invokeDirectivesHostBindings(tView, rootLView, rootTNode);
    if (native) {
        attachPatchData(native, rootLView);
    }
    // We're guaranteed for the `componentOffset` to be positive here
    // since a root component always matches a component def.
    ngDevMode &&
        assertGreaterThan(rootTNode.componentOffset, -1, 'componentOffset must be great than -1');
    const component = getNodeInjectable(rootLView, tView, rootTNode.directiveStart + rootTNode.componentOffset, rootTNode);
    componentView[CONTEXT] = rootLView[CONTEXT] = component;
    if (hostFeatures !== null) {
        for (const feature of hostFeatures) {
            feature(component, rootComponentDef);
        }
    }
    // We want to generate an empty QueryList for root content queries for backwards
    // compatibility with ViewEngine.
    executeContentQueries(tView, rootTNode, componentView);
    return component;
}
/** Sets the static attributes on a root component. */
function setRootNodeAttributes(hostRenderer, componentDef, hostRNode, rootSelectorOrNode) {
    if (rootSelectorOrNode) {
        setUpAttributes(hostRenderer, hostRNode, ['ng-version', VERSION.full]);
    }
    else {
        // If host element is created as a part of this function call (i.e. `rootSelectorOrNode`
        // is not defined), also apply attributes and classes extracted from component selector.
        // Extract attributes and classes from the first selector only to match VE behavior.
        const { attrs, classes } = extractAttrsAndClassesFromSelector(componentDef.selectors[0]);
        if (attrs) {
            setUpAttributes(hostRenderer, hostRNode, attrs);
        }
        if (classes && classes.length > 0) {
            writeDirectClass(hostRenderer, hostRNode, classes.join(' '));
        }
    }
}
/** Projects the `projectableNodes` that were specified when creating a root component. */
function projectNodes(tNode, ngContentSelectors, projectableNodes) {
    const projection = tNode.projection = [];
    for (let i = 0; i < ngContentSelectors.length; i++) {
        const nodesforSlot = projectableNodes[i];
        // Projectable nodes can be passed as array of arrays or an array of iterables (ngUpgrade
        // case). Here we do normalize passed data structure to be an array of arrays to avoid
        // complex checks down the line.
        // We also normalize the length of the passed in projectable nodes (to match the number of
        // <ng-container> slots defined by a component).
        projection.push(nodesforSlot != null ? Array.from(nodesforSlot) : null);
    }
}
/**
 * Used to enable lifecycle hooks on the root component.
 *
 * Include this feature when calling `renderComponent` if the root component
 * you are rendering has lifecycle hooks defined. Otherwise, the hooks won't
 * be called properly.
 *
 * Example:
 *
 * ```
 * renderComponent(AppComponent, {hostFeatures: [LifecycleHooksFeature]});
 * ```
 */
export function LifecycleHooksFeature() {
    const tNode = getCurrentTNode();
    ngDevMode && assertDefined(tNode, 'TNode is required');
    registerPostOrderHooks(getLView()[TVIEW], tNode);
}
let hydrationInfo = null;
export function setCurrentHydrationInfo(info) {
    const origHydrationInfo = info;
    hydrationInfo = info;
    return origHydrationInfo;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50X3JlZi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvcmUvc3JjL3JlbmRlcjMvY29tcG9uZW50X3JlZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFJSCxPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSw4QkFBOEIsQ0FBQztBQUcvRCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMsWUFBWSxFQUFtQixNQUFNLFdBQVcsQ0FBQztBQUV6RCxPQUFPLEVBQUMsZ0JBQWdCLElBQUksd0JBQXdCLEVBQUUsWUFBWSxJQUFJLG9CQUFvQixFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDL0gsT0FBTyxFQUFDLHdCQUF3QixJQUFJLGdDQUFnQyxFQUFDLE1BQU0sc0NBQXNDLENBQUM7QUFDbEgsT0FBTyxFQUFDLGdCQUFnQixFQUFhLE1BQU0sdUJBQXVCLENBQUM7QUFFbkUsT0FBTyxFQUFZLGdCQUFnQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzFELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUNwRCxPQUFPLEVBQUMsYUFBYSxFQUFFLGlCQUFpQixFQUFFLGtCQUFrQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDcEYsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLFlBQVksQ0FBQztBQUNuQyxPQUFPLEVBQUMscUNBQXFDLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUU3RSxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDN0MsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3BELE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDN0MsT0FBTyxFQUFDLGlCQUFpQixFQUFFLFlBQVksRUFBQyxNQUFNLE1BQU0sQ0FB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LGlCQUFpQixHQUFHLElBQUksQ0FBQztJQUMvQixhQUFhLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLE9BQU8saUJBQWlCLENBQUM7QUFDM0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NoYW5nZURldGVjdG9yUmVmfSBmcm9tICcuLi9jaGFuZ2VfZGV0ZWN0aW9uL2NoYW5nZV9kZXRlY3Rvcl9yZWYnO1xuaW1wb3J0IHtJbmplY3Rvcn0gZnJvbSAnLi4vZGkvaW5qZWN0b3InO1xuaW1wb3J0IHtjb252ZXJ0VG9CaXRGbGFnc30gZnJvbSAnLi4vZGkvaW5qZWN0b3JfY29tcGF0aWJpbGl0eSc7XG5pbXBvcnQge0luamVjdEZsYWdzLCBJbmplY3RPcHRpb25zfSBmcm9tICcuLi9kaS9pbnRlcmZhY2UvaW5qZWN0b3InO1xuaW1wb3J0IHtQcm92aWRlclRva2VufSBmcm9tICcuLi9kaS9wcm92aWRlcl90b2tlbic7XG5pbXBvcnQge0Vudmlyb25tZW50SW5qZWN0b3J9IGZyb20gJy4uL2RpL3IzX2luamVjdG9yJztcbmltcG9ydCB7UnVudGltZUVycm9yLCBSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuLi9lcnJvcnMnO1xuaW1wb3J0IHtUeXBlfSBmcm9tICcuLi9pbnRlcmZhY2UvdHlwZSc7XG5pbXBvcnQge0NvbXBvbmVudEZhY3RvcnkgYXMgQWJzdHJhY3RDb21wb25lbnRGYWN0b3J5LCBDb21wb25lbnRSZWYgYXMgQWJzdHJhY3RDb21wb25lbnRSZWZ9IGZyb20gJy4uL2xpbmtlci9jb21wb25lbnRfZmFjdG9yeSc7XG5pbXBvcnQge0NvbXBvbmVudEZhY3RvcnlSZXNvbHZlciBhcyBBYnN0cmFjdENvbXBvbmVudEZhY3RvcnlSZXNvbHZlcn0gZnJvbSAnLi4vbGlua2VyL2NvbXBvbmVudF9mYWN0b3J5X3Jlc29sdmVyJztcbmltcG9ydCB7Y3JlYXRlRWxlbWVudFJlZiwgRWxlbWVudFJlZn0gZnJvbSAnLi4vbGlua2VyL2VsZW1lbnRfcmVmJztcbmltcG9ydCB7TmdNb2R1bGVSZWZ9IGZyb20gJy4uL2xpbmtlci9uZ19tb2R1bGVfZmFjdG9yeSc7XG5pbXBvcnQge1JlbmRlcmVyMiwgUmVuZGVyZXJGYWN0b3J5Mn0gZnJvbSAnLi4vcmVuZGVyL2FwaSc7XG5pbXBvcnQge1Nhbml0aXplcn0gZnJvbSAnLi4vc2FuaXRpemF0aW9uL3Nhbml0aXplcic7XG5pbXBvcnQge2Fzc2VydERlZmluZWQsIGFzc2VydEdyZWF0ZXJUaGFuLCBhc3NlcnRJbmRleEluUmFuZ2V9IGZyb20gJy4uL3V0aWwvYXNzZXJ0JztcbmltcG9ydCB7VkVSU0lPTn0gZnJvbSAnLi4vdmVyc2lvbic7XG5pbXBvcnQge05PVF9GT1VORF9DSEVDS19PTkxZX0VMRU1FTlRfSU5KRUNUT1J9IGZyb20gJy4uL3ZpZXcvcHJvdmlkZXJfZmxhZ3MnO1xuXG5pbXBvcnQge2Fzc2VydENvbXBvbmVudFR5cGV9IGZyb20gJy4vYXNzZXJ0JztcbmltcG9ydCB7YXR0YWNoUGF0Y2hEYXRhfSBmcm9tICcuL2NvbnRleHRfZGlzY292ZXJ5JztcbmltcG9ydCB7Z2V0Q29tcG9uZW50RGVmfSBmcm9tICcuL2RlZmluaXRpb24nO1xuaW1wb3J0IHtnZXROb2RlSW5qZWN0YWJsZSwgTm9kZUluamVjdG9yfSBmcm9tICcuL2RpJztcbmltcG9ydCB7dGhyb3dQcm92aWRlck5vdEZvdW5kRXJyb3J9IGZyb20gJy4vZXJyb3JzX2RpJztcbmltcG9ydCB7cmVnaXN0ZXJQb3N0T3JkZXJIb29rc30gZnJvbSAnLi9ob29rcyc7XG5pbXBvcnQge0lTX0hZRFJBVElPTl9FTkFCTEVELCBtYXJrUk5vZGVBc0NsYWltZWRGb3JIeWRyYXRpb259IGZyb20gJy4vaHlkcmF0aW9uJztcbmltcG9ydCB7cmVwb3J0VW5rbm93blByb3BlcnR5RXJyb3J9IGZyb20gJy4vaW5zdHJ1Y3Rpb25zL2VsZW1lbnRfdmFsaWRhdGlvbic7XG5pbXBvcnQge2FkZFRvVmlld1RyZWUsIGNyZWF0ZUxWaWV3LCBjcmVhdGVUVmlldywgZXhlY3V0ZUNvbnRlbnRRdWVyaWVzLCBnZXRPckNyZWF0ZUNvbXBvbmVudFRWaWV3LCBnZXRPckNyZWF0ZVROb2RlLCBpbml0aWFsaXplRGlyZWN0aXZlcywgaW52b2tlRGlyZWN0aXZlc0hvc3RCaW5kaW5ncywgbG9jYXRlSG9zdEVsZW1lbnQsIG1hcmtBc0NvbXBvbmVudEhvc3QsIG1hcmtEaXJ0eUlmT25QdXNoLCByZW5kZXJWaWV3LCBzZXRJbnB1dHNGb3JQcm9wZXJ0eX0gZnJvbSAnLi9pbnN0cnVjdGlvbnMvc2hhcmVkJztcbmltcG9ydCB7Q29tcG9uZW50RGVmLCBEaXJlY3RpdmVEZWYsIEhvc3REaXJlY3RpdmVEZWZzfSBmcm9tICcuL2ludGVyZmFjZXMvZGVmaW5pdGlvbic7XG5pbXBvcnQge1Byb3BlcnR5QWxpYXNWYWx1ZSwgVENvbnRhaW5lck5vZGUsIFRFbGVtZW50Q29udGFpbmVyTm9kZSwgVEVsZW1lbnROb2RlLCBUTm9kZSwgVE5vZGVUeXBlfSBmcm9tICcuL2ludGVyZmFjZXMvbm9kZSc7XG5pbXBvcnQge1JlbmRlcmVyLCBSZW5kZXJlckZhY3Rvcnl9IGZyb20gJy4vaW50ZXJmYWNlcy9yZW5kZXJlcic7XG5pbXBvcnQge1JFbGVtZW50LCBSTm9kZX0gZnJvbSAnLi9pbnRlcmZhY2VzL3JlbmRlcmVyX2RvbSc7XG5pbXBvcnQge0NPTlRFWFQsIEhFQURFUl9PRkZTRVQsIEhZRFJBVElPTl9JTkZPLCBMVmlldywgTFZpZXdGbGFncywgTmdoRG9tLCBOZ2hWaWV3LCBUVklFVywgVFZpZXdUeXBlfSBmcm9tICcuL2ludGVyZmFjZXMvdmlldyc7XG5pbXBvcnQge01BVEhfTUxfTkFNRVNQQUNFLCBTVkdfTkFNRVNQQUNFfSBmcm9tICcuL25hbWVzcGFjZXMnO1xuaW1wb3J0IHtjcmVhdGVFbGVtZW50Tm9kZSwgc2V0dXBTdGF0aWNBdHRyaWJ1dGVzLCB3cml0ZURpcmVjdENsYXNzfSBmcm9tICcuL25vZGVfbWFuaXB1bGF0aW9uJztcbmltcG9ydCB7ZXh0cmFjdEF0dHJzQW5kQ2xhc3Nlc0Zyb21TZWxlY3Rvciwgc3RyaW5naWZ5Q1NTU2VsZWN0b3JMaXN0fSBmcm9tICcuL25vZGVfc2VsZWN0b3JfbWF0Y2hlcic7XG5pbXBvcnQge2VudGVyVmlldywgZ2V0Q3VycmVudFROb2RlLCBnZXRMVmlldywgbGVhdmVWaWV3fSBmcm9tICcuL3N0YXRlJztcbmltcG9ydCB7Y29tcHV0ZVN0YXRpY1N0eWxpbmd9IGZyb20gJy4vc3R5bGluZy9zdGF0aWNfc3R5bGluZyc7XG5pbXBvcnQge21lcmdlSG9zdEF0dHJzLCBzZXRVcEF0dHJpYnV0ZXN9IGZyb20gJy4vdXRpbC9hdHRyc191dGlscyc7XG5pbXBvcnQge3N0cmluZ2lmeUZvckVycm9yfSBmcm9tICcuL3V0aWwvc3RyaW5naWZ5X3V0aWxzJztcbmltcG9ydCB7Z2V0TmF0aXZlQnlUTm9kZSwgZ2V0VE5vZGV9IGZyb20gJy4vdXRpbC92aWV3X3V0aWxzJztcbmltcG9ydCB7Um9vdFZpZXdSZWYsIFZpZXdSZWZ9IGZyb20gJy4vdmlld19yZWYnO1xuXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyIGV4dGVuZHMgQWJzdHJhY3RDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIge1xuICAvKipcbiAgICogQHBhcmFtIG5nTW9kdWxlIFRoZSBOZ01vZHVsZVJlZiB0byB3aGljaCBhbGwgcmVzb2x2ZWQgZmFjdG9yaWVzIGFyZSBib3VuZC5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbmdNb2R1bGU/OiBOZ01vZHVsZVJlZjxhbnk+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlc29sdmVDb21wb25lbnRGYWN0b3J5PFQ+KGNvbXBvbmVudDogVHlwZTxUPik6IEFic3RyYWN0Q29tcG9uZW50RmFjdG9yeTxUPiB7XG4gICAgbmdEZXZNb2RlICYmIGFzc2VydENvbXBvbmVudFR5cGUoY29tcG9uZW50KTtcbiAgICBjb25zdCBjb21wb25lbnREZWYgPSBnZXRDb21wb25lbnREZWYoY29tcG9uZW50KSE7XG4gICAgcmV0dXJuIG5ldyBDb21wb25lbnRGYWN0b3J5KGNvbXBvbmVudERlZiwgdGhpcy5uZ01vZHVsZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdG9SZWZBcnJheShtYXA6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KToge3Byb3BOYW1lOiBzdHJpbmc7IHRlbXBsYXRlTmFtZTogc3RyaW5nO31bXSB7XG4gIGNvbnN0IGFycmF5OiB7cHJvcE5hbWU6IHN0cmluZzsgdGVtcGxhdGVOYW1lOiBzdHJpbmc7fVtdID0gW107XG4gIGZvciAobGV0IG5vbk1pbmlmaWVkIGluIG1hcCkge1xuICAgIGlmIChtYXAuaGFzT3duUHJvcGVydHkobm9uTWluaWZpZWQpKSB7XG4gICAgICBjb25zdCBtaW5pZmllZCA9IG1hcFtub25NaW5pZmllZF07XG4gICAgICBhcnJheS5wdXNoKHtwcm9wTmFtZTogbWluaWZpZWQsIHRlbXBsYXRlTmFtZTogbm9uTWluaWZpZWR9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFycmF5O1xufVxuXG5mdW5jdGlvbiBnZXROYW1lc3BhY2UoZWxlbWVudE5hbWU6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgbmFtZSA9IGVsZW1lbnROYW1lLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiBuYW1lID09PSAnc3ZnJyA/IFNWR19OQU1FU1BBQ0UgOiAobmFtZSA9PT0gJ21hdGgnID8gTUFUSF9NTF9OQU1FU1BBQ0UgOiBudWxsKTtcbn1cblxuLyoqXG4gKiBJbmplY3RvciB0aGF0IGxvb2tzIHVwIGEgdmFsdWUgdXNpbmcgYSBzcGVjaWZpYyBpbmplY3RvciwgYmVmb3JlIGZhbGxpbmcgYmFjayB0byB0aGUgbW9kdWxlXG4gKiBpbmplY3Rvci4gVXNlZCBwcmltYXJpbHkgd2hlbiBjcmVhdGluZyBjb21wb25lbnRzIG9yIGVtYmVkZGVkIHZpZXdzIGR5bmFtaWNhbGx5LlxuICovXG5jbGFzcyBDaGFpbmVkSW5qZWN0b3IgaW1wbGVtZW50cyBJbmplY3RvciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaW5qZWN0b3I6IEluamVjdG9yLCBwcml2YXRlIHBhcmVudEluamVjdG9yOiBJbmplY3Rvcikge31cblxuICBnZXQ8VD4odG9rZW46IFByb3ZpZGVyVG9rZW48VD4sIG5vdEZvdW5kVmFsdWU/OiBULCBmbGFncz86IEluamVjdEZsYWdzfEluamVjdE9wdGlvbnMpOiBUIHtcbiAgICBmbGFncyA9IGNvbnZlcnRUb0JpdEZsYWdzKGZsYWdzKTtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMuaW5qZWN0b3IuZ2V0PFR8dHlwZW9mIE5PVF9GT1VORF9DSEVDS19PTkxZX0VMRU1FTlRfSU5KRUNUT1I+KFxuICAgICAgICB0b2tlbiwgTk9UX0ZPVU5EX0NIRUNLX09OTFlfRUxFTUVOVF9JTkpFQ1RPUiwgZmxhZ3MpO1xuXG4gICAgaWYgKHZhbHVlICE9PSBOT1RfRk9VTkRfQ0hFQ0tfT05MWV9FTEVNRU5UX0lOSkVDVE9SIHx8XG4gICAgICAgIG5vdEZvdW5kVmFsdWUgPT09IChOT1RfRk9VTkRfQ0hFQ0tfT05MWV9FTEVNRU5UX0lOSkVDVE9SIGFzIHVua25vd24gYXMgVCkpIHtcbiAgICAgIC8vIFJldHVybiB0aGUgdmFsdWUgZnJvbSB0aGUgcm9vdCBlbGVtZW50IGluamVjdG9yIHdoZW5cbiAgICAgIC8vIC0gaXQgcHJvdmlkZXMgaXRcbiAgICAgIC8vICAgKHZhbHVlICE9PSBOT1RfRk9VTkRfQ0hFQ0tfT05MWV9FTEVNRU5UX0lOSkVDVE9SKVxuICAgICAgLy8gLSB0aGUgbW9kdWxlIGluamVjdG9yIHNob3VsZCBub3QgYmUgY2hlY2tlZFxuICAgICAgLy8gICAobm90Rm91bmRWYWx1ZSA9PT0gTk9UX0ZPVU5EX0NIRUNLX09OTFlfRUxFTUVOVF9JTkpFQ1RPUilcbiAgICAgIHJldHVybiB2YWx1ZSBhcyBUO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnBhcmVudEluamVjdG9yLmdldCh0b2tlbiwgbm90Rm91bmRWYWx1ZSwgZmxhZ3MpO1xuICB9XG59XG5cbi8qKlxuICogQ29tcG9uZW50RmFjdG9yeSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb25lbnRGYWN0b3J5PFQ+IGV4dGVuZHMgQWJzdHJhY3RDb21wb25lbnRGYWN0b3J5PFQ+IHtcbiAgb3ZlcnJpZGUgc2VsZWN0b3I6IHN0cmluZztcbiAgb3ZlcnJpZGUgY29tcG9uZW50VHlwZTogVHlwZTxhbnk+O1xuICBvdmVycmlkZSBuZ0NvbnRlbnRTZWxlY3RvcnM6IHN0cmluZ1tdO1xuICBpc0JvdW5kVG9Nb2R1bGU6IGJvb2xlYW47XG5cbiAgb3ZlcnJpZGUgZ2V0IGlucHV0cygpOiB7cHJvcE5hbWU6IHN0cmluZzsgdGVtcGxhdGVOYW1lOiBzdHJpbmc7fVtdIHtcbiAgICByZXR1cm4gdG9SZWZBcnJheSh0aGlzLmNvbXBvbmVudERlZi5pbnB1dHMpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0IG91dHB1dHMoKToge3Byb3BOYW1lOiBzdHJpbmc7IHRlbXBsYXRlTmFtZTogc3RyaW5nO31bXSB7XG4gICAgcmV0dXJuIHRvUmVmQXJyYXkodGhpcy5jb21wb25lbnREZWYub3V0cHV0cyk7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIGNvbXBvbmVudERlZiBUaGUgY29tcG9uZW50IGRlZmluaXRpb24uXG4gICAqIEBwYXJhbSBuZ01vZHVsZSBUaGUgTmdNb2R1bGVSZWYgdG8gd2hpY2ggdGhlIGZhY3RvcnkgaXMgYm91bmQuXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbXBvbmVudERlZjogQ29tcG9uZW50RGVmPGFueT4sIHByaXZhdGUgbmdNb2R1bGU/OiBOZ01vZHVsZVJlZjxhbnk+KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmNvbXBvbmVudFR5cGUgPSBjb21wb25lbnREZWYudHlwZTtcbiAgICB0aGlzLnNlbGVjdG9yID0gc3RyaW5naWZ5Q1NTU2VsZWN0b3JMaXN0KGNvbXBvbmVudERlZi5zZWxlY3RvcnMpO1xuICAgIHRoaXMubmdDb250ZW50U2VsZWN0b3JzID1cbiAgICAgICAgY29tcG9uZW50RGVmLm5nQ29udGVudFNlbGVjdG9ycyA/IGNvbXBvbmVudERlZi5uZ0NvbnRlbnRTZWxlY3RvcnMgOiBbXTtcbiAgICB0aGlzLmlzQm91bmRUb01vZHVsZSA9ICEhbmdNb2R1bGU7XG4gIH1cblxuICBvdmVycmlkZSBjcmVhdGUoXG4gICAgICBpbmplY3RvcjogSW5qZWN0b3IsIHByb2plY3RhYmxlTm9kZXM/OiBhbnlbXVtdfHVuZGVmaW5lZCwgcm9vdFNlbGVjdG9yT3JOb2RlPzogYW55LFxuICAgICAgZW52aXJvbm1lbnRJbmplY3Rvcj86IE5nTW9kdWxlUmVmPGFueT58RW52aXJvbm1lbnRJbmplY3RvcnxcbiAgICAgIHVuZGVmaW5lZCk6IEFic3RyYWN0Q29tcG9uZW50UmVmPFQ+IHtcbiAgICBlbnZpcm9ubWVudEluamVjdG9yID0gZW52aXJvbm1lbnRJbmplY3RvciB8fCB0aGlzLm5nTW9kdWxlO1xuXG4gICAgbGV0IHJlYWxFbnZpcm9ubWVudEluamVjdG9yID0gZW52aXJvbm1lbnRJbmplY3RvciBpbnN0YW5jZW9mIEVudmlyb25tZW50SW5qZWN0b3IgP1xuICAgICAgICBlbnZpcm9ubWVudEluamVjdG9yIDpcbiAgICAgICAgZW52aXJvbm1lbnRJbmplY3Rvcj8uaW5qZWN0b3I7XG5cbiAgICBpZiAocmVhbEVudmlyb25tZW50SW5qZWN0b3IgJiYgdGhpcy5jb21wb25lbnREZWYuZ2V0U3RhbmRhbG9uZUluamVjdG9yICE9PSBudWxsKSB7XG4gICAgICByZWFsRW52aXJvbm1lbnRJbmplY3RvciA9IHRoaXMuY29tcG9uZW50RGVmLmdldFN0YW5kYWxvbmVJbmplY3RvcihyZWFsRW52aXJvbm1lbnRJbmplY3RvcikgfHxcbiAgICAgICAgICByZWFsRW52aXJvbm1lbnRJbmplY3RvcjtcbiAgICB9XG5cbiAgICBjb25zdCByb290Vmlld0luamVjdG9yID1cbiAgICAgICAgcmVhbEVudmlyb25tZW50SW5qZWN0b3IgPyBuZXcgQ2hhaW5lZEluamVjdG9yKGluamVjdG9yLCByZWFsRW52aXJvbm1lbnRJbmplY3RvcikgOiBpbmplY3RvcjtcblxuICAgIGNvbnN0IHJlbmRlcmVyRmFjdG9yeSA9IHJvb3RWaWV3SW5qZWN0b3IuZ2V0KFJlbmRlcmVyRmFjdG9yeTIsIG51bGwpO1xuICAgIGlmIChyZW5kZXJlckZhY3RvcnkgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5SRU5ERVJFUl9OT1RfRk9VTkQsXG4gICAgICAgICAgbmdEZXZNb2RlICYmXG4gICAgICAgICAgICAgICdBbmd1bGFyIHdhcyBub3QgYWJsZSB0byBpbmplY3QgYSByZW5kZXJlciAoUmVuZGVyZXJGYWN0b3J5MikuICcgK1xuICAgICAgICAgICAgICAgICAgJ0xpa2VseSB0aGlzIGlzIGR1ZSB0byBhIGJyb2tlbiBESSBoaWVyYXJjaHkuICcgK1xuICAgICAgICAgICAgICAgICAgJ01ha2Ugc3VyZSB0aGF0IGFueSBpbmplY3RvciB1c2VkIHRvIGNyZWF0ZSB0aGlzIGNvbXBvbmVudCBoYXMgYSBjb3JyZWN0IHBhcmVudC4nKTtcbiAgICB9XG4gICAgY29uc3Qgc2FuaXRpemVyID0gcm9vdFZpZXdJbmplY3Rvci5nZXQoU2FuaXRpemVyLCBudWxsKTtcblxuICAgIGNvbnN0IGhvc3RSZW5kZXJlciA9IHJlbmRlcmVyRmFjdG9yeS5jcmVhdGVSZW5kZXJlcihudWxsLCB0aGlzLmNvbXBvbmVudERlZik7XG4gICAgLy8gRGV0ZXJtaW5lIGEgdGFnIG5hbWUgdXNlZCBmb3IgY3JlYXRpbmcgaG9zdCBlbGVtZW50cyB3aGVuIHRoaXMgY29tcG9uZW50IGlzIGNyZWF0ZWRcbiAgICAvLyBkeW5hbWljYWxseS4gRGVmYXVsdCB0byAnZGl2JyBpZiB0aGlzIGNvbXBvbmVudCBkaWQgbm90IHNwZWNpZnkgYW55IHRhZyBuYW1lIGluIGl0cyBzZWxlY3Rvci5cbiAgICBjb25zdCBlbGVtZW50TmFtZSA9IHRoaXMuY29tcG9uZW50RGVmLnNlbGVjdG9yc1swXVswXSBhcyBzdHJpbmcgfHwgJ2Rpdic7XG4gICAgY29uc3QgaXNoeWRyYXRpb25FbmFibGVkID0gcm9vdFZpZXdJbmplY3Rvci5nZXQoSVNfSFlEUkFUSU9OX0VOQUJMRUQsIGZhbHNlKTtcbiAgICBjb25zdCBob3N0Uk5vZGUgPSByb290U2VsZWN0b3JPck5vZGUgP1xuICAgICAgICBsb2NhdGVIb3N0RWxlbWVudChcbiAgICAgICAgICAgIGhvc3RSZW5kZXJlciwgcm9vdFNlbGVjdG9yT3JOb2RlLCB0aGlzLmNvbXBvbmVudERlZi5lbmNhcHN1bGF0aW9uLCBpc2h5ZHJhdGlvbkVuYWJsZWQpIDpcbiAgICAgICAgY3JlYXRlRWxlbWVudE5vZGUoaG9zdFJlbmRlcmVyLCBlbGVtZW50TmFtZSwgZ2V0TmFtZXNwYWNlKGVsZW1lbnROYW1lKSk7XG5cbiAgICBjb25zdCByb290RmxhZ3MgPSB0aGlzLmNvbXBvbmVudERlZi5vblB1c2ggPyBMVmlld0ZsYWdzLkRpcnR5IHwgTFZpZXdGbGFncy5Jc1Jvb3QgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExWaWV3RmxhZ3MuQ2hlY2tBbHdheXMgfCBMVmlld0ZsYWdzLklzUm9vdDtcblxuICAgIC8vIENyZWF0ZSB0aGUgcm9vdCB2aWV3LiBVc2VzIGVtcHR5IFRWaWV3IGFuZCBDb250ZW50VGVtcGxhdGUuXG4gICAgY29uc3Qgcm9vdFRWaWV3ID0gY3JlYXRlVFZpZXcoVFZpZXdUeXBlLlJvb3QsIG51bGwsIG51bGwsIDEsIDAsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwpO1xuICAgIGNvbnN0IHJvb3RMVmlldyA9IGNyZWF0ZUxWaWV3KFxuICAgICAgICBudWxsLCByb290VFZpZXcsIG51bGwsIHJvb3RGbGFncywgbnVsbCwgbnVsbCwgcmVuZGVyZXJGYWN0b3J5LCBob3N0UmVuZGVyZXIsIHNhbml0aXplcixcbiAgICAgICAgcm9vdFZpZXdJbmplY3RvciwgbnVsbCk7XG5cbiAgICAvLyByb290VmlldyBpcyB0aGUgcGFyZW50IHdoZW4gYm9vdHN0cmFwcGluZ1xuICAgIC8vIFRPRE8obWlza28pOiBpdCBsb29rcyBsaWtlIHdlIGFyZSBlbnRlcmluZyB2aWV3IGhlcmUgYnV0IHdlIGRvbid0IHJlYWxseSBuZWVkIHRvIGFzXG4gICAgLy8gYHJlbmRlclZpZXdgIGRvZXMgdGhhdC4gSG93ZXZlciBhcyB0aGUgY29kZSBpcyB3cml0dGVuIGl0IGlzIG5lZWRlZCBiZWNhdXNlXG4gICAgLy8gYGNyZWF0ZVJvb3RDb21wb25lbnRWaWV3YCBhbmQgYGNyZWF0ZVJvb3RDb21wb25lbnRgIGJvdGggcmVhZCBnbG9iYWwgc3RhdGUuIEZpeGluZyB0aG9zZVxuICAgIC8vIGlzc3VlcyB3b3VsZCBhbGxvdyB1cyB0byBkcm9wIHRoaXMuXG4gICAgZW50ZXJWaWV3KHJvb3RMVmlldyk7XG5cbiAgICBsZXQgY29tcG9uZW50OiBUO1xuICAgIGxldCB0RWxlbWVudE5vZGU6IFRFbGVtZW50Tm9kZTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCByb290Q29tcG9uZW50RGVmID0gdGhpcy5jb21wb25lbnREZWY7XG4gICAgICBsZXQgcm9vdERpcmVjdGl2ZXM6IERpcmVjdGl2ZURlZjx1bmtub3duPltdO1xuICAgICAgbGV0IGhvc3REaXJlY3RpdmVEZWZzOiBIb3N0RGlyZWN0aXZlRGVmc3xudWxsID0gbnVsbDtcblxuICAgICAgaWYgKHJvb3RDb21wb25lbnREZWYuZmluZEhvc3REaXJlY3RpdmVEZWZzKSB7XG4gICAgICAgIHJvb3REaXJlY3RpdmVzID0gW107XG4gICAgICAgIGhvc3REaXJlY3RpdmVEZWZzID0gbmV3IE1hcCgpO1xuICAgICAgICByb290Q29tcG9uZW50RGVmLmZpbmRIb3N0RGlyZWN0aXZlRGVmcyhyb290Q29tcG9uZW50RGVmLCByb290RGlyZWN0aXZlcywgaG9zdERpcmVjdGl2ZURlZnMpO1xuICAgICAgICByb290RGlyZWN0aXZlcy5wdXNoKHJvb3RDb21wb25lbnREZWYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcm9vdERpcmVjdGl2ZXMgPSBbcm9vdENvbXBvbmVudERlZl07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGhvc3RUTm9kZSA9IGNyZWF0ZVJvb3RDb21wb25lbnRUTm9kZShyb290TFZpZXcsIGhvc3RSTm9kZSk7XG4gICAgICBjb25zdCBjb21wb25lbnRWaWV3ID0gY3JlYXRlUm9vdENvbXBvbmVudFZpZXcoXG4gICAgICAgICAgaG9zdFROb2RlLCBob3N0Uk5vZGUsIHJvb3RDb21wb25lbnREZWYsIHJvb3REaXJlY3RpdmVzLCByb290TFZpZXcsIHJlbmRlcmVyRmFjdG9yeSxcbiAgICAgICAgICBob3N0UmVuZGVyZXIsIG51bGwsIGh5ZHJhdGlvbkluZm8gPz8gdW5kZWZpbmVkKTtcblxuICAgICAgdEVsZW1lbnROb2RlID0gZ2V0VE5vZGUocm9vdFRWaWV3LCBIRUFERVJfT0ZGU0VUKSBhcyBURWxlbWVudE5vZGU7XG5cbiAgICAgIC8vIFRPRE8oY3Jpc2JldG8pOiBpbiBwcmFjdGljZSBgaG9zdFJOb2RlYCBzaG91bGQgYWx3YXlzIGJlIGRlZmluZWQsIGJ1dCB0aGVyZSBhcmUgc29tZSB0ZXN0c1xuICAgICAgLy8gd2hlcmUgdGhlIHJlbmRlcmVyIGlzIG1vY2tlZCBvdXQgYW5kIGB1bmRlZmluZWRgIGlzIHJldHVybmVkLiBXZSBzaG91bGQgdXBkYXRlIHRoZSB0ZXN0cyBzb1xuICAgICAgLy8gdGhhdCB0aGlzIGNoZWNrIGNhbiBiZSByZW1vdmVkLlxuICAgICAgaWYgKGhvc3RSTm9kZSkge1xuICAgICAgICBzZXRSb290Tm9kZUF0dHJpYnV0ZXMoaG9zdFJlbmRlcmVyLCByb290Q29tcG9uZW50RGVmLCBob3N0Uk5vZGUsIHJvb3RTZWxlY3Rvck9yTm9kZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwcm9qZWN0YWJsZU5vZGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcHJvamVjdE5vZGVzKHRFbGVtZW50Tm9kZSwgdGhpcy5uZ0NvbnRlbnRTZWxlY3RvcnMsIHByb2plY3RhYmxlTm9kZXMpO1xuICAgICAgfVxuXG4gICAgICAvLyBUT0RPOiBzaG91bGQgTGlmZWN5Y2xlSG9va3NGZWF0dXJlIGFuZCBvdGhlciBob3N0IGZlYXR1cmVzIGJlIGdlbmVyYXRlZCBieSB0aGUgY29tcGlsZXIgYW5kXG4gICAgICAvLyBleGVjdXRlZCBoZXJlP1xuICAgICAgLy8gQW5ndWxhciA1IHJlZmVyZW5jZTogaHR0cHM6Ly9zdGFja2JsaXR6LmNvbS9lZGl0L2xpZmVjeWNsZS1ob29rcy12Y3JlZlxuICAgICAgY29tcG9uZW50ID0gY3JlYXRlUm9vdENvbXBvbmVudChcbiAgICAgICAgICBjb21wb25lbnRWaWV3LCByb290Q29tcG9uZW50RGVmLCByb290RGlyZWN0aXZlcywgaG9zdERpcmVjdGl2ZURlZnMsIHJvb3RMVmlldyxcbiAgICAgICAgICBbTGlmZWN5Y2xlSG9va3NGZWF0dXJlXSk7XG4gICAgICByZW5kZXJWaWV3KHJvb3RUVmlldywgcm9vdExWaWV3LCBudWxsKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgbGVhdmVWaWV3KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBDb21wb25lbnRSZWYoXG4gICAgICAgIHRoaXMuY29tcG9uZW50VHlwZSwgY29tcG9uZW50LCBjcmVhdGVFbGVtZW50UmVmKHRFbGVtZW50Tm9kZSwgcm9vdExWaWV3KSwgcm9vdExWaWV3LFxuICAgICAgICB0RWxlbWVudE5vZGUpO1xuICB9XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhbiBpbnN0YW5jZSBvZiBhIENvbXBvbmVudCBjcmVhdGVkIHZpYSBhIHtAbGluayBDb21wb25lbnRGYWN0b3J5fS5cbiAqXG4gKiBgQ29tcG9uZW50UmVmYCBwcm92aWRlcyBhY2Nlc3MgdG8gdGhlIENvbXBvbmVudCBJbnN0YW5jZSBhcyB3ZWxsIG90aGVyIG9iamVjdHMgcmVsYXRlZCB0byB0aGlzXG4gKiBDb21wb25lbnQgSW5zdGFuY2UgYW5kIGFsbG93cyB5b3UgdG8gZGVzdHJveSB0aGUgQ29tcG9uZW50IEluc3RhbmNlIHZpYSB0aGUge0BsaW5rICNkZXN0cm95fVxuICogbWV0aG9kLlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvbmVudFJlZjxUPiBleHRlbmRzIEFic3RyYWN0Q29tcG9uZW50UmVmPFQ+IHtcbiAgb3ZlcnJpZGUgaW5zdGFuY2U6IFQ7XG4gIG92ZXJyaWRlIGhvc3RWaWV3OiBWaWV3UmVmPFQ+O1xuICBvdmVycmlkZSBjaGFuZ2VEZXRlY3RvclJlZjogQ2hhbmdlRGV0ZWN0b3JSZWY7XG4gIG92ZXJyaWRlIGNvbXBvbmVudFR5cGU6IFR5cGU8VD47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBjb21wb25lbnRUeXBlOiBUeXBlPFQ+LCBpbnN0YW5jZTogVCwgcHVibGljIGxvY2F0aW9uOiBFbGVtZW50UmVmLCBwcml2YXRlIF9yb290TFZpZXc6IExWaWV3LFxuICAgICAgcHJpdmF0ZSBfdE5vZGU6IFRFbGVtZW50Tm9kZXxUQ29udGFpbmVyTm9kZXxURWxlbWVudENvbnRhaW5lck5vZGUpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcbiAgICB0aGlzLmhvc3RWaWV3ID0gdGhpcy5jaGFuZ2VEZXRlY3RvclJlZiA9IG5ldyBSb290Vmlld1JlZjxUPihfcm9vdExWaWV3KTtcbiAgICB0aGlzLmNvbXBvbmVudFR5cGUgPSBjb21wb25lbnRUeXBlO1xuICB9XG5cbiAgb3ZlcnJpZGUgc2V0SW5wdXQobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIGNvbnN0IGlucHV0RGF0YSA9IHRoaXMuX3ROb2RlLmlucHV0cztcbiAgICBsZXQgZGF0YVZhbHVlOiBQcm9wZXJ0eUFsaWFzVmFsdWV8dW5kZWZpbmVkO1xuICAgIGlmIChpbnB1dERhdGEgIT09IG51bGwgJiYgKGRhdGFWYWx1ZSA9IGlucHV0RGF0YVtuYW1lXSkpIHtcbiAgICAgIGNvbnN0IGxWaWV3ID0gdGhpcy5fcm9vdExWaWV3O1xuICAgICAgc2V0SW5wdXRzRm9yUHJvcGVydHkobFZpZXdbVFZJRVddLCBsVmlldywgZGF0YVZhbHVlLCBuYW1lLCB2YWx1ZSk7XG4gICAgICBtYXJrRGlydHlJZk9uUHVzaChsVmlldywgdGhpcy5fdE5vZGUuaW5kZXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAobmdEZXZNb2RlKSB7XG4gICAgICAgIGNvbnN0IGNtcE5hbWVGb3JFcnJvciA9IHN0cmluZ2lmeUZvckVycm9yKHRoaXMuY29tcG9uZW50VHlwZSk7XG4gICAgICAgIGxldCBtZXNzYWdlID1cbiAgICAgICAgICAgIGBDYW4ndCBzZXQgdmFsdWUgb2YgdGhlICcke25hbWV9JyBpbnB1dCBvbiB0aGUgJyR7Y21wTmFtZUZvckVycm9yfScgY29tcG9uZW50LiBgO1xuICAgICAgICBtZXNzYWdlICs9IGBNYWtlIHN1cmUgdGhhdCB0aGUgJyR7XG4gICAgICAgICAgICBuYW1lfScgcHJvcGVydHkgaXMgYW5ub3RhdGVkIHdpdGggQElucHV0KCkgb3IgYSBtYXBwZWQgQElucHV0KCcke25hbWV9JykgZXhpc3RzLmA7XG4gICAgICAgIHJlcG9ydFVua25vd25Qcm9wZXJ0eUVycm9yKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIGdldCBpbmplY3RvcigpOiBJbmplY3RvciB7XG4gICAgcmV0dXJuIG5ldyBOb2RlSW5qZWN0b3IodGhpcy5fdE5vZGUsIHRoaXMuX3Jvb3RMVmlldyk7XG4gIH1cblxuICBvdmVycmlkZSBkZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuaG9zdFZpZXcuZGVzdHJveSgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgb25EZXN0cm95KGNhbGxiYWNrOiAoKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5ob3N0Vmlldy5vbkRlc3Ryb3koY2FsbGJhY2spO1xuICB9XG59XG5cbi8qKiBSZXByZXNlbnRzIGEgSG9zdEZlYXR1cmUgZnVuY3Rpb24uICovXG50eXBlIEhvc3RGZWF0dXJlID0gKDxUPihjb21wb25lbnQ6IFQsIGNvbXBvbmVudERlZjogQ29tcG9uZW50RGVmPFQ+KSA9PiB2b2lkKTtcblxuLy8gVE9ETzogQSBoYWNrIHRvIG5vdCBwdWxsIGluIHRoZSBOdWxsSW5qZWN0b3IgZnJvbSBAYW5ndWxhci9jb3JlLlxuZXhwb3J0IGNvbnN0IE5VTExfSU5KRUNUT1I6IEluamVjdG9yID0ge1xuICBnZXQ6ICh0b2tlbjogYW55LCBub3RGb3VuZFZhbHVlPzogYW55KSA9PiB7XG4gICAgdGhyb3dQcm92aWRlck5vdEZvdW5kRXJyb3IodG9rZW4sICdOdWxsSW5qZWN0b3InKTtcbiAgfVxufTtcblxuLyoqIENyZWF0ZXMgYSBUTm9kZSB0aGF0IGNhbiBiZSB1c2VkIHRvIGluc3RhbnRpYXRlIGEgcm9vdCBjb21wb25lbnQuICovXG5mdW5jdGlvbiBjcmVhdGVSb290Q29tcG9uZW50VE5vZGUobFZpZXc6IExWaWV3LCByTm9kZTogUk5vZGUpOiBURWxlbWVudE5vZGUge1xuICBjb25zdCB0VmlldyA9IGxWaWV3W1RWSUVXXTtcbiAgY29uc3QgaW5kZXggPSBIRUFERVJfT0ZGU0VUO1xuICBuZ0Rldk1vZGUgJiYgYXNzZXJ0SW5kZXhJblJhbmdlKGxWaWV3LCBpbmRleCk7XG4gIGxWaWV3W2luZGV4XSA9IHJOb2RlO1xuXG4gIC8vICcjaG9zdCcgaXMgYWRkZWQgaGVyZSBhcyB3ZSBkb24ndCBrbm93IHRoZSByZWFsIGhvc3QgRE9NIG5hbWUgKHdlIGRvbid0IHdhbnQgdG8gcmVhZCBpdCkgYW5kIGF0XG4gIC8vIHRoZSBzYW1lIHRpbWUgd2Ugd2FudCB0byBjb21tdW5pY2F0ZSB0aGUgZGVidWcgYFROb2RlYCB0aGF0IHRoaXMgaXMgYSBzcGVjaWFsIGBUTm9kZWBcbiAgLy8gcmVwcmVzZW50aW5nIGEgaG9zdCBlbGVtZW50LlxuICByZXR1cm4gZ2V0T3JDcmVhdGVUTm9kZSh0VmlldywgaW5kZXgsIFROb2RlVHlwZS5FbGVtZW50LCAnI2hvc3QnLCBudWxsKTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIHRoZSByb290IGNvbXBvbmVudCB2aWV3IGFuZCB0aGUgcm9vdCBjb21wb25lbnQgbm9kZS5cbiAqXG4gKiBAcGFyYW0gck5vZGUgUmVuZGVyIGhvc3QgZWxlbWVudC5cbiAqIEBwYXJhbSByb290Q29tcG9uZW50RGVmIENvbXBvbmVudERlZlxuICogQHBhcmFtIHJvb3RWaWV3IFRoZSBwYXJlbnQgdmlldyB3aGVyZSB0aGUgaG9zdCBub2RlIGlzIHN0b3JlZFxuICogQHBhcmFtIHJlbmRlcmVyRmFjdG9yeSBGYWN0b3J5IHRvIGJlIHVzZWQgZm9yIGNyZWF0aW5nIGNoaWxkIHJlbmRlcmVycy5cbiAqIEBwYXJhbSBob3N0UmVuZGVyZXIgVGhlIGN1cnJlbnQgcmVuZGVyZXJcbiAqIEBwYXJhbSBzYW5pdGl6ZXIgVGhlIHNhbml0aXplciwgaWYgcHJvdmlkZWRcbiAqXG4gKiBAcmV0dXJucyBDb21wb25lbnQgdmlldyBjcmVhdGVkXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVJvb3RDb21wb25lbnRWaWV3KFxuICAgIHROb2RlOiBURWxlbWVudE5vZGUsIHJOb2RlOiBSRWxlbWVudHxudWxsLCByb290Q29tcG9uZW50RGVmOiBDb21wb25lbnREZWY8YW55PixcbiAgICByb290RGlyZWN0aXZlczogRGlyZWN0aXZlRGVmPGFueT5bXSwgcm9vdFZpZXc6IExWaWV3LCByZW5kZXJlckZhY3Rvcnk6IFJlbmRlcmVyRmFjdG9yeSxcbiAgICBob3N0UmVuZGVyZXI6IFJlbmRlcmVyLCBzYW5pdGl6ZXI/OiBTYW5pdGl6ZXJ8bnVsbCwgaHlkcmF0aW9uSW5mbz86IE5naFZpZXcpOiBMVmlldyB7XG4gIGNvbnN0IHRWaWV3ID0gcm9vdFZpZXdbVFZJRVddO1xuICBhcHBseVJvb3RDb21wb25lbnRTdHlsaW5nKHJvb3REaXJlY3RpdmVzLCB0Tm9kZSwgck5vZGUsIGhvc3RSZW5kZXJlcik7XG5cbiAgY29uc3Qgdmlld1JlbmRlcmVyID0gcmVuZGVyZXJGYWN0b3J5LmNyZWF0ZVJlbmRlcmVyKHJOb2RlLCByb290Q29tcG9uZW50RGVmKTtcbiAgY29uc3QgY29tcG9uZW50VmlldyA9IGNyZWF0ZUxWaWV3KFxuICAgICAgcm9vdFZpZXcsIGdldE9yQ3JlYXRlQ29tcG9uZW50VFZpZXcocm9vdENvbXBvbmVudERlZiksIG51bGwsXG4gICAgICByb290Q29tcG9uZW50RGVmLm9uUHVzaCA/IExWaWV3RmxhZ3MuRGlydHkgOiBMVmlld0ZsYWdzLkNoZWNrQWx3YXlzLCByb290Vmlld1t0Tm9kZS5pbmRleF0sXG4gICAgICB0Tm9kZSwgcmVuZGVyZXJGYWN0b3J5LCB2aWV3UmVuZGVyZXIsIHNhbml0aXplciB8fCBudWxsLCBudWxsLCBudWxsLCBoeWRyYXRpb25JbmZvKTtcblxuXG4gIC8vIFRPRE86IGF2b2lkIGR1cGxpY2F0aW9uIG9mIHRoaXMgY29kZS5cbiAgLy8gKHRoZXJlIGlzIHNpbWlsYXIgb25lIGluIHNoYXJlZC50cyBhbmQgdmlld19jb250YWluZXJfcmVmLnRzKVxuICBjb25zdCBob3N0Uk5vZGUgPSByTm9kZSBhcyBIVE1MRWxlbWVudDtcbiAgY29uc3QgcmF3TmdoID0gaG9zdFJOb2RlLmdldEF0dHJpYnV0ZSgnbmdoJyk7XG4gIGlmIChyYXdOZ2gpIHtcbiAgICBjb25zdCBuZ2ggPSBKU09OLnBhcnNlKHJhd05naCkgYXMgTmdoRG9tO1xuICAgIG5naC5maXJzdENoaWxkID0gaG9zdFJOb2RlLmZpcnN0Q2hpbGQgYXMgSFRNTEVsZW1lbnQ7XG4gICAgY29tcG9uZW50Vmlld1tIWURSQVRJT05fSU5GT10gPSBuZ2g7XG4gICAgaG9zdFJOb2RlLnJlbW92ZUF0dHJpYnV0ZSgnbmdoJyk7XG4gICAgbmdEZXZNb2RlICYmIG1hcmtSTm9kZUFzQ2xhaW1lZEZvckh5ZHJhdGlvbihyTm9kZSEpO1xuICB9XG5cbiAgaWYgKHRWaWV3LmZpcnN0Q3JlYXRlUGFzcykge1xuICAgIG1hcmtBc0NvbXBvbmVudEhvc3QodFZpZXcsIHROb2RlLCByb290RGlyZWN0aXZlcy5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIGFkZFRvVmlld1RyZWUocm9vdFZpZXcsIGNvbXBvbmVudFZpZXcpO1xuXG4gIC8vIFN0b3JlIGNvbXBvbmVudCB2aWV3IGF0IG5vZGUgaW5kZXgsIHdpdGggbm9kZSBhcyB0aGUgSE9TVFxuICByZXR1cm4gcm9vdFZpZXdbdE5vZGUuaW5kZXhdID0gY29tcG9uZW50Vmlldztcbn1cblxuLyoqIFNldHMgdXAgdGhlIHN0eWxpbmcgaW5mb3JtYXRpb24gb24gYSByb290IGNvbXBvbmVudC4gKi9cbmZ1bmN0aW9uIGFwcGx5Um9vdENvbXBvbmVudFN0eWxpbmcoXG4gICAgcm9vdERpcmVjdGl2ZXM6IERpcmVjdGl2ZURlZjxhbnk+W10sIHROb2RlOiBURWxlbWVudE5vZGUsIHJOb2RlOiBSRWxlbWVudHxudWxsLFxuICAgIGhvc3RSZW5kZXJlcjogUmVuZGVyZXIpOiB2b2lkIHtcbiAgZm9yIChjb25zdCBkZWYgb2Ygcm9vdERpcmVjdGl2ZXMpIHtcbiAgICB0Tm9kZS5tZXJnZWRBdHRycyA9IG1lcmdlSG9zdEF0dHJzKHROb2RlLm1lcmdlZEF0dHJzLCBkZWYuaG9zdEF0dHJzKTtcbiAgfVxuXG4gIGlmICh0Tm9kZS5tZXJnZWRBdHRycyAhPT0gbnVsbCkge1xuICAgIGNvbXB1dGVTdGF0aWNTdHlsaW5nKHROb2RlLCB0Tm9kZS5tZXJnZWRBdHRycywgdHJ1ZSk7XG5cbiAgICBpZiAock5vZGUgIT09IG51bGwpIHtcbiAgICAgIHNldHVwU3RhdGljQXR0cmlidXRlcyhob3N0UmVuZGVyZXIsIHJOb2RlLCB0Tm9kZSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIHJvb3QgY29tcG9uZW50IGFuZCBzZXRzIGl0IHVwIHdpdGggZmVhdHVyZXMgYW5kIGhvc3QgYmluZGluZ3MuU2hhcmVkIGJ5XG4gKiByZW5kZXJDb21wb25lbnQoKSBhbmQgVmlld0NvbnRhaW5lclJlZi5jcmVhdGVDb21wb25lbnQoKS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlUm9vdENvbXBvbmVudDxUPihcbiAgICBjb21wb25lbnRWaWV3OiBMVmlldywgcm9vdENvbXBvbmVudERlZjogQ29tcG9uZW50RGVmPFQ+LCByb290RGlyZWN0aXZlczogRGlyZWN0aXZlRGVmPGFueT5bXSxcbiAgICBob3N0RGlyZWN0aXZlRGVmczogSG9zdERpcmVjdGl2ZURlZnN8bnVsbCwgcm9vdExWaWV3OiBMVmlldyxcbiAgICBob3N0RmVhdHVyZXM6IEhvc3RGZWF0dXJlW118bnVsbCk6IGFueSB7XG4gIGNvbnN0IHJvb3RUTm9kZSA9IGdldEN1cnJlbnRUTm9kZSgpIGFzIFRFbGVtZW50Tm9kZTtcbiAgbmdEZXZNb2RlICYmIGFzc2VydERlZmluZWQocm9vdFROb2RlLCAndE5vZGUgc2hvdWxkIGhhdmUgYmVlbiBhbHJlYWR5IGNyZWF0ZWQnKTtcbiAgY29uc3QgdFZpZXcgPSByb290TFZpZXdbVFZJRVddO1xuICBjb25zdCBuYXRpdmUgPSBnZXROYXRpdmVCeVROb2RlKHJvb3RUTm9kZSwgcm9vdExWaWV3KTtcblxuICBpbml0aWFsaXplRGlyZWN0aXZlcyh0Vmlldywgcm9vdExWaWV3LCByb290VE5vZGUsIHJvb3REaXJlY3RpdmVzLCBudWxsLCBob3N0RGlyZWN0aXZlRGVmcyk7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCByb290RGlyZWN0aXZlcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGRpcmVjdGl2ZUluZGV4ID0gcm9vdFROb2RlLmRpcmVjdGl2ZVN0YXJ0ICsgaTtcbiAgICBjb25zdCBkaXJlY3RpdmVJbnN0YW5jZSA9IGdldE5vZGVJbmplY3RhYmxlKHJvb3RMVmlldywgdFZpZXcsIGRpcmVjdGl2ZUluZGV4LCByb290VE5vZGUpO1xuICAgIGF0dGFjaFBhdGNoRGF0YShkaXJlY3RpdmVJbnN0YW5jZSwgcm9vdExWaWV3KTtcbiAgfVxuXG4gIGludm9rZURpcmVjdGl2ZXNIb3N0QmluZGluZ3ModFZpZXcsIHJvb3RMVmlldywgcm9vdFROb2RlKTtcblxuICBpZiAobmF0aXZlKSB7XG4gICAgYXR0YWNoUGF0Y2hEYXRhKG5hdGl2ZSwgcm9vdExWaWV3KTtcbiAgfVxuXG4gIC8vIFdlJ3JlIGd1YXJhbnRlZWQgZm9yIHRoZSBgY29tcG9uZW50T2Zmc2V0YCB0byBiZSBwb3NpdGl2ZSBoZXJlXG4gIC8vIHNpbmNlIGEgcm9vdCBjb21wb25lbnQgYWx3YXlzIG1hdGNoZXMgYSBjb21wb25lbnQgZGVmLlxuICBuZ0Rldk1vZGUgJiZcbiAgICAgIGFzc2VydEdyZWF0ZXJUaGFuKHJvb3RUTm9kZS5jb21wb25lbnRPZmZzZXQsIC0xLCAnY29tcG9uZW50T2Zmc2V0IG11c3QgYmUgZ3JlYXQgdGhhbiAtMScpO1xuICBjb25zdCBjb21wb25lbnQgPSBnZXROb2RlSW5qZWN0YWJsZShcbiAgICAgIHJvb3RMVmlldywgdFZpZXcsIHJvb3RUTm9kZS5kaXJlY3RpdmVTdGFydCArIHJvb3RUTm9kZS5jb21wb25lbnRPZmZzZXQsIHJvb3RUTm9kZSk7XG4gIGNvbXBvbmVudFZpZXdbQ09OVEVYVF0gPSByb290TFZpZXdbQ09OVEVYVF0gPSBjb21wb25lbnQ7XG5cbiAgaWYgKGhvc3RGZWF0dXJlcyAhPT0gbnVsbCkge1xuICAgIGZvciAoY29uc3QgZmVhdHVyZSBvZiBob3N0RmVhdHVyZXMpIHtcbiAgICAgIGZlYXR1cmUoY29tcG9uZW50LCByb290Q29tcG9uZW50RGVmKTtcbiAgICB9XG4gIH1cblxuICAvLyBXZSB3YW50IHRvIGdlbmVyYXRlIGFuIGVtcHR5IFF1ZXJ5TGlzdCBmb3Igcm9vdCBjb250ZW50IHF1ZXJpZXMgZm9yIGJhY2t3YXJkc1xuICAvLyBjb21wYXRpYmlsaXR5IHdpdGggVmlld0VuZ2luZS5cbiAgZXhlY3V0ZUNvbnRlbnRRdWVyaWVzKHRWaWV3LCByb290VE5vZGUsIGNvbXBvbmVudFZpZXcpO1xuXG4gIHJldHVybiBjb21wb25lbnQ7XG59XG5cbi8qKiBTZXRzIHRoZSBzdGF0aWMgYXR0cmlidXRlcyBvbiBhIHJvb3QgY29tcG9uZW50LiAqL1xuZnVuY3Rpb24gc2V0Um9vdE5vZGVBdHRyaWJ1dGVzKFxuICAgIGhvc3RSZW5kZXJlcjogUmVuZGVyZXIyLCBjb21wb25lbnREZWY6IENvbXBvbmVudERlZjx1bmtub3duPiwgaG9zdFJOb2RlOiBSRWxlbWVudCxcbiAgICByb290U2VsZWN0b3JPck5vZGU6IGFueSkge1xuICBpZiAocm9vdFNlbGVjdG9yT3JOb2RlKSB7XG4gICAgc2V0VXBBdHRyaWJ1dGVzKGhvc3RSZW5kZXJlciwgaG9zdFJOb2RlLCBbJ25nLXZlcnNpb24nLCBWRVJTSU9OLmZ1bGxdKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBJZiBob3N0IGVsZW1lbnQgaXMgY3JlYXRlZCBhcyBhIHBhcnQgb2YgdGhpcyBmdW5jdGlvbiBjYWxsIChpLmUuIGByb290U2VsZWN0b3JPck5vZGVgXG4gICAgLy8gaXMgbm90IGRlZmluZWQpLCBhbHNvIGFwcGx5IGF0dHJpYnV0ZXMgYW5kIGNsYXNzZXMgZXh0cmFjdGVkIGZyb20gY29tcG9uZW50IHNlbGVjdG9yLlxuICAgIC8vIEV4dHJhY3QgYXR0cmlidXRlcyBhbmQgY2xhc3NlcyBmcm9tIHRoZSBmaXJzdCBzZWxlY3RvciBvbmx5IHRvIG1hdGNoIFZFIGJlaGF2aW9yLlxuICAgIGNvbnN0IHthdHRycywgY2xhc3Nlc30gPSBleHRyYWN0QXR0cnNBbmRDbGFzc2VzRnJvbVNlbGVjdG9yKGNvbXBvbmVudERlZi5zZWxlY3RvcnNbMF0pO1xuICAgIGlmIChhdHRycykge1xuICAgICAgc2V0VXBBdHRyaWJ1dGVzKGhvc3RSZW5kZXJlciwgaG9zdFJOb2RlLCBhdHRycyk7XG4gICAgfVxuICAgIGlmIChjbGFzc2VzICYmIGNsYXNzZXMubGVuZ3RoID4gMCkge1xuICAgICAgd3JpdGVEaXJlY3RDbGFzcyhob3N0UmVuZGVyZXIsIGhvc3RSTm9kZSwgY2xhc3Nlcy5qb2luKCcgJykpO1xuICAgIH1cbiAgfVxufVxuXG4vKiogUHJvamVjdHMgdGhlIGBwcm9qZWN0YWJsZU5vZGVzYCB0aGF0IHdlcmUgc3BlY2lmaWVkIHdoZW4gY3JlYXRpbmcgYSByb290IGNvbXBvbmVudC4gKi9cbmZ1bmN0aW9uIHByb2plY3ROb2RlcyhcbiAgICB0Tm9kZTogVEVsZW1lbnROb2RlLCBuZ0NvbnRlbnRTZWxlY3RvcnM6IHN0cmluZ1tdLCBwcm9qZWN0YWJsZU5vZGVzOiBhbnlbXVtdKSB7XG4gIGNvbnN0IHByb2plY3Rpb246IChUTm9kZXxSTm9kZVtdfG51bGwpW10gPSB0Tm9kZS5wcm9qZWN0aW9uID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbmdDb250ZW50U2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgbm9kZXNmb3JTbG90ID0gcHJvamVjdGFibGVOb2Rlc1tpXTtcbiAgICAvLyBQcm9qZWN0YWJsZSBub2RlcyBjYW4gYmUgcGFzc2VkIGFzIGFycmF5IG9mIGFycmF5cyBvciBhbiBhcnJheSBvZiBpdGVyYWJsZXMgKG5nVXBncmFkZVxuICAgIC8vIGNhc2UpLiBIZXJlIHdlIGRvIG5vcm1hbGl6ZSBwYXNzZWQgZGF0YSBzdHJ1Y3R1cmUgdG8gYmUgYW4gYXJyYXkgb2YgYXJyYXlzIHRvIGF2b2lkXG4gICAgLy8gY29tcGxleCBjaGVja3MgZG93biB0aGUgbGluZS5cbiAgICAvLyBXZSBhbHNvIG5vcm1hbGl6ZSB0aGUgbGVuZ3RoIG9mIHRoZSBwYXNzZWQgaW4gcHJvamVjdGFibGUgbm9kZXMgKHRvIG1hdGNoIHRoZSBudW1iZXIgb2ZcbiAgICAvLyA8bmctY29udGFpbmVyPiBzbG90cyBkZWZpbmVkIGJ5IGEgY29tcG9uZW50KS5cbiAgICBwcm9qZWN0aW9uLnB1c2gobm9kZXNmb3JTbG90ICE9IG51bGwgPyBBcnJheS5mcm9tKG5vZGVzZm9yU2xvdCkgOiBudWxsKTtcbiAgfVxufVxuXG4vKipcbiAqIFVzZWQgdG8gZW5hYmxlIGxpZmVjeWNsZSBob29rcyBvbiB0aGUgcm9vdCBjb21wb25lbnQuXG4gKlxuICogSW5jbHVkZSB0aGlzIGZlYXR1cmUgd2hlbiBjYWxsaW5nIGByZW5kZXJDb21wb25lbnRgIGlmIHRoZSByb290IGNvbXBvbmVudFxuICogeW91IGFyZSByZW5kZXJpbmcgaGFzIGxpZmVjeWNsZSBob29rcyBkZWZpbmVkLiBPdGhlcndpc2UsIHRoZSBob29rcyB3b24ndFxuICogYmUgY2FsbGVkIHByb3Blcmx5LlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiByZW5kZXJDb21wb25lbnQoQXBwQ29tcG9uZW50LCB7aG9zdEZlYXR1cmVzOiBbTGlmZWN5Y2xlSG9va3NGZWF0dXJlXX0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBMaWZlY3ljbGVIb29rc0ZlYXR1cmUoKTogdm9pZCB7XG4gIGNvbnN0IHROb2RlID0gZ2V0Q3VycmVudFROb2RlKCkhO1xuICBuZ0Rldk1vZGUgJiYgYXNzZXJ0RGVmaW5lZCh0Tm9kZSwgJ1ROb2RlIGlzIHJlcXVpcmVkJyk7XG4gIHJlZ2lzdGVyUG9zdE9yZGVySG9va3MoZ2V0TFZpZXcoKVtUVklFV10sIHROb2RlKTtcbn1cblxubGV0IGh5ZHJhdGlvbkluZm86IE5naFZpZXd8bnVsbCA9IG51bGw7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRDdXJyZW50SHlkcmF0aW9uSW5mbyhpbmZvOiBOZ2hWaWV3fG51bGwpOiBOZ2hWaWV3fG51bGwge1xuICBjb25zdCBvcmlnSHlkcmF0aW9uSW5mbyA9IGluZm87XG4gIGh5ZHJhdGlvbkluZm8gPSBpbmZvO1xuICByZXR1cm4gb3JpZ0h5ZHJhdGlvbkluZm87XG59XG4iXX0=