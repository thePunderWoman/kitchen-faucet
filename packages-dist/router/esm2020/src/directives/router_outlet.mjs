/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectorRef, Directive, EnvironmentInjector, EventEmitter, inject, Input, Output, ViewContainerRef, ɵRuntimeError as RuntimeError, } from '@angular/core';
import { ChildrenOutletContexts } from '../router_outlet_context';
import { ActivatedRoute } from '../router_state';
import { PRIMARY_OUTLET } from '../shared';
import * as i0 from "@angular/core";
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || ngDevMode;
/**
 * @description
 *
 * Acts as a placeholder that Angular dynamically fills based on the current router state.
 *
 * Each outlet can have a unique name, determined by the optional `name` attribute.
 * The name cannot be set or changed dynamically. If not set, default value is "primary".
 *
 * ```
 * <router-outlet></router-outlet>
 * <router-outlet name='left'></router-outlet>
 * <router-outlet name='right'></router-outlet>
 * ```
 *
 * Named outlets can be the targets of secondary routes.
 * The `Route` object for a secondary route has an `outlet` property to identify the target outlet:
 *
 * `{path: <base-path>, component: <component>, outlet: <target_outlet_name>}`
 *
 * Using named outlets and secondary routes, you can target multiple outlets in
 * the same `RouterLink` directive.
 *
 * The router keeps track of separate branches in a navigation tree for each named outlet and
 * generates a representation of that tree in the URL.
 * The URL for a secondary route uses the following syntax to specify both the primary and secondary
 * routes at the same time:
 *
 * `http://base-path/primary-route-path(outlet-name:route-path)`
 *
 * A router outlet emits an activate event when a new component is instantiated,
 * deactivate event when a component is destroyed.
 * An attached event emits when the `RouteReuseStrategy` instructs the outlet to reattach the
 * subtree, and the detached event emits when the `RouteReuseStrategy` instructs the outlet to
 * detach the subtree.
 *
 * ```
 * <router-outlet
 *   (activate)='onActivate($event)'
 *   (deactivate)='onDeactivate($event)'
 *   (attach)='onAttach($event)'
 *   (detach)='onDetach($event)'></router-outlet>
 * ```
 *
 * @see [Routing tutorial](guide/router-tutorial-toh#named-outlets "Example of a named
 * outlet and secondary route configuration").
 * @see `RouterLink`
 * @see `Route`
 * @ngModule RouterModule
 *
 * @publicApi
 */
export class RouterOutlet {
    constructor() {
        this.activated = null;
        this._activatedRoute = null;
        /**
         * The name of the outlet
         *
         * @see [named outlets](guide/router-tutorial-toh#displaying-multiple-routes-in-named-outlets)
         */
        this.name = PRIMARY_OUTLET;
        this.activateEvents = new EventEmitter();
        this.deactivateEvents = new EventEmitter();
        /**
         * Emits an attached component instance when the `RouteReuseStrategy` instructs to re-attach a
         * previously detached subtree.
         **/
        this.attachEvents = new EventEmitter();
        /**
         * Emits a detached component instance when the `RouteReuseStrategy` instructs to detach the
         * subtree.
         */
        this.detachEvents = new EventEmitter();
        this.parentContexts = inject(ChildrenOutletContexts);
        this.location = inject(ViewContainerRef);
        this.changeDetector = inject(ChangeDetectorRef);
        this.environmentInjector = inject(EnvironmentInjector);
    }
    /** @nodoc */
    ngOnChanges(changes) {
        if (changes['name']) {
            const { firstChange, previousValue } = changes['name'];
            if (firstChange) {
                // The first change is handled by ngOnInit. Because ngOnChanges doesn't get called when no
                // input is set at all, we need to centrally handle the first change there.
                return;
            }
            // unregister with the old name
            if (this.isTrackedInParentContexts(previousValue)) {
                this.deactivate();
                this.parentContexts.onChildOutletDestroyed(previousValue);
            }
            // register the new name
            this.initializeOutletWithName();
        }
    }
    /** @nodoc */
    ngOnDestroy() {
        // Ensure that the registered outlet is this one before removing it on the context.
        if (this.isTrackedInParentContexts(this.name)) {
            this.parentContexts.onChildOutletDestroyed(this.name);
        }
    }
    isTrackedInParentContexts(outletName) {
        return this.parentContexts.getContext(outletName)?.outlet === this;
    }
    /** @nodoc */
    ngOnInit() {
        this.initializeOutletWithName();
    }
    initializeOutletWithName() {
        this.parentContexts.onChildOutletCreated(this.name, this);
        if (this.activated) {
            return;
        }
        // If the outlet was not instantiated at the time the route got activated we need to populate
        // the outlet when it is initialized (ie inside a NgIf)
        const context = this.parentContexts.getContext(this.name);
        if (context?.route) {
            if (context.attachRef) {
                // `attachRef` is populated when there is an existing component to mount
                this.attach(context.attachRef, context.route);
            }
            else {
                // otherwise the component defined in the configuration is created
                this.activateWith(context.route, context.injector);
            }
        }
    }
    get isActivated() {
        return !!this.activated;
    }
    /**
     * @returns The currently activated component instance.
     * @throws An error if the outlet is not activated.
     */
    get component() {
        if (!this.activated)
            throw new RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, NG_DEV_MODE && 'Outlet is not activated');
        return this.activated.instance;
    }
    get activatedRoute() {
        if (!this.activated)
            throw new RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, NG_DEV_MODE && 'Outlet is not activated');
        return this._activatedRoute;
    }
    get activatedRouteData() {
        if (this._activatedRoute) {
            return this._activatedRoute.snapshot.data;
        }
        return {};
    }
    /**
     * Called when the `RouteReuseStrategy` instructs to detach the subtree
     */
    detach() {
        if (!this.activated)
            throw new RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, NG_DEV_MODE && 'Outlet is not activated');
        this.location.detach();
        const cmp = this.activated;
        this.activated = null;
        this._activatedRoute = null;
        this.detachEvents.emit(cmp.instance);
        return cmp;
    }
    /**
     * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree
     */
    attach(ref, activatedRoute) {
        this.activated = ref;
        this._activatedRoute = activatedRoute;
        this.location.insert(ref.hostView);
        this.attachEvents.emit(ref.instance);
    }
    deactivate() {
        if (this.activated) {
            const c = this.component;
            this.activated.destroy();
            this.activated = null;
            this._activatedRoute = null;
            this.deactivateEvents.emit(c);
        }
    }
    activateWith(activatedRoute, resolverOrInjector) {
        if (this.isActivated) {
            throw new RuntimeError(4013 /* RuntimeErrorCode.OUTLET_ALREADY_ACTIVATED */, NG_DEV_MODE && 'Cannot activate an already activated outlet');
        }
        this._activatedRoute = activatedRoute;
        const location = this.location;
        const snapshot = activatedRoute.snapshot;
        const component = snapshot.component;
        const childContexts = this.parentContexts.getOrCreateContext(this.name).children;
        const injector = new OutletInjector(activatedRoute, childContexts, location.injector);
        // Indicate that a host view created for this component
        // might be lazy-loaded and corresponding DOM nodes should be
        // retained during the hydration. Note: a component might be
        // eagerly loaded (via `component` field), but this route might
        // have async guards and resolvers.
        const lazy = true;
        if (resolverOrInjector && isComponentFactoryResolver(resolverOrInjector)) {
            const factory = resolverOrInjector.resolveComponentFactory(component);
            this.activated =
                location.createComponent(factory, location.length, injector, undefined, undefined, lazy);
        }
        else {
            const environmentInjector = resolverOrInjector ?? this.environmentInjector;
            this.activated = location.createComponent(component, { index: location.length, injector, environmentInjector, lazy });
        }
        // Calling `markForCheck` to make sure we will run the change detection when the
        // `RouterOutlet` is inside a `ChangeDetectionStrategy.OnPush` component.
        this.changeDetector.markForCheck();
        this.activateEvents.emit(this.activated.instance);
    }
}
RouterOutlet.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.2.0+sha-e45a8b6-with-local-changes", ngImport: i0, type: RouterOutlet, deps: [], target: i0.ɵɵFactoryTarget.Directive });
RouterOutlet.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "15.2.0+sha-e45a8b6-with-local-changes", type: RouterOutlet, isStandalone: true, selector: "router-outlet", inputs: { name: "name" }, outputs: { activateEvents: "activate", deactivateEvents: "deactivate", attachEvents: "attach", detachEvents: "detach" }, exportAs: ["outlet"], usesOnChanges: true, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.2.0+sha-e45a8b6-with-local-changes", ngImport: i0, type: RouterOutlet, decorators: [{
            type: Directive,
            args: [{
                    selector: 'router-outlet',
                    exportAs: 'outlet',
                    standalone: true,
                }]
        }], propDecorators: { name: [{
                type: Input
            }], activateEvents: [{
                type: Output,
                args: ['activate']
            }], deactivateEvents: [{
                type: Output,
                args: ['deactivate']
            }], attachEvents: [{
                type: Output,
                args: ['attach']
            }], detachEvents: [{
                type: Output,
                args: ['detach']
            }] } });
class OutletInjector {
    constructor(route, childContexts, parent) {
        this.route = route;
        this.childContexts = childContexts;
        this.parent = parent;
    }
    get(token, notFoundValue) {
        if (token === ActivatedRoute) {
            return this.route;
        }
        if (token === ChildrenOutletContexts) {
            return this.childContexts;
        }
        return this.parent.get(token, notFoundValue);
    }
}
function isComponentFactoryResolver(item) {
    return !!item.resolveComponentFactory;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxpQkFBaUIsRUFBMEMsU0FBUyxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxNQUFNLEVBQVksS0FBSyxFQUFxQixNQUFNLEVBQWlCLGdCQUFnQixFQUFFLGFBQWEsSUFBSSxZQUFZLEdBQUUsTUFBTSxlQUFlLENBQUM7QUFJM1AsT0FBTyxFQUFDLHNCQUFzQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDaEUsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxXQUFXLENBQUM7O0FBRXpDLE1BQU0sV0FBVyxHQUFHLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7QUE0RmxFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtERztBQU1ILE1BQU0sT0FBTyxZQUFZO0lBTHpCO1FBTVUsY0FBUyxHQUEyQixJQUFJLENBQUM7UUFDekMsb0JBQWUsR0FBd0IsSUFBSSxDQUFDO1FBQ3BEOzs7O1dBSUc7UUFDTSxTQUFJLEdBQUcsY0FBYyxDQUFDO1FBRVgsbUJBQWMsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO1FBQ3ZDLHFCQUFnQixHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7UUFDakU7OztZQUdJO1FBQ2MsaUJBQVksR0FBRyxJQUFJLFlBQVksRUFBVyxDQUFDO1FBQzdEOzs7V0FHRztRQUNlLGlCQUFZLEdBQUcsSUFBSSxZQUFZLEVBQVcsQ0FBQztRQUVyRCxtQkFBYyxHQUFHLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FB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QjtRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDRjtBQUVELFNBQVMsMEJBQTBCLENBQUMsSUFBUztJQUMzQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUM7QUFDeEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NoYW5nZURldGVjdG9yUmVmLCBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIsIENvbXBvbmVudFJlZiwgRGlyZWN0aXZlLCBFbnZpcm9ubWVudEluamVjdG9yLCBFdmVudEVtaXR0ZXIsIGluamVjdCwgSW5qZWN0b3IsIElucHV0LCBPbkRlc3Ryb3ksIE9uSW5pdCwgT3V0cHV0LCBTaW1wbGVDaGFuZ2VzLCBWaWV3Q29udGFpbmVyUmVmLCDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3IsfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuLi9lcnJvcnMnO1xuaW1wb3J0IHtEYXRhfSBmcm9tICcuLi9tb2RlbHMnO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4uL3NoYXJlZCc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlO1xuXG4vKipcbiAqIEFuIGludGVyZmFjZSB0aGF0IGRlZmluZXMgdGhlIGNvbnRyYWN0IGZvciBkZXZlbG9waW5nIGEgY29tcG9uZW50IG91dGxldCBmb3IgdGhlIGBSb3V0ZXJgLlxuICpcbiAqIEFuIG91dGxldCBhY3RzIGFzIGEgcGxhY2Vob2xkZXIgdGhhdCBBbmd1bGFyIGR5bmFtaWNhbGx5IGZpbGxzIGJhc2VkIG9uIHRoZSBjdXJyZW50IHJvdXRlciBzdGF0ZS5cbiAqXG4gKiBBIHJvdXRlciBvdXRsZXQgc2hvdWxkIHJlZ2lzdGVyIGl0c2VsZiB3aXRoIHRoZSBgUm91dGVyYCB2aWFcbiAqIGBDaGlsZHJlbk91dGxldENvbnRleHRzI29uQ2hpbGRPdXRsZXRDcmVhdGVkYCBhbmQgdW5yZWdpc3RlciB3aXRoXG4gKiBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyNvbkNoaWxkT3V0bGV0RGVzdHJveWVkYC4gV2hlbiB0aGUgYFJvdXRlcmAgaWRlbnRpZmllcyBhIG1hdGNoZWQgYFJvdXRlYCxcbiAqIGl0IGxvb2tzIGZvciBhIHJlZ2lzdGVyZWQgb3V0bGV0IGluIHRoZSBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0c2AgYW5kIGFjdGl2YXRlcyBpdC5cbiAqXG4gKiBAc2VlIGBDaGlsZHJlbk91dGxldENvbnRleHRzYFxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlck91dGxldENvbnRyYWN0IHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGdpdmVuIG91dGxldCBpcyBhY3RpdmF0ZWQuXG4gICAqXG4gICAqIEFuIG91dGxldCBpcyBjb25zaWRlcmVkIFwiYWN0aXZhdGVkXCIgaWYgaXQgaGFzIGFuIGFjdGl2ZSBjb21wb25lbnQuXG4gICAqL1xuICBpc0FjdGl2YXRlZDogYm9vbGVhbjtcblxuICAvKiogVGhlIGluc3RhbmNlIG9mIHRoZSBhY3RpdmF0ZWQgY29tcG9uZW50IG9yIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuICovXG4gIGNvbXBvbmVudDogT2JqZWN0fG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBgRGF0YWAgb2YgdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgc25hcHNob3QuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZURhdGE6IERhdGE7XG5cbiAgLyoqXG4gICAqIFRoZSBgQWN0aXZhdGVkUm91dGVgIGZvciB0aGUgb3V0bGV0IG9yIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICAvKipcbiAgICogQ2FsbGVkIGJ5IHRoZSBgUm91dGVyYCB3aGVuIHRoZSBvdXRsZXQgc2hvdWxkIGFjdGl2YXRlIChjcmVhdGUgYSBjb21wb25lbnQpLlxuICAgKi9cbiAgYWN0aXZhdGVXaXRoKGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgZW52aXJvbm1lbnRJbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvcnxudWxsKTogdm9pZDtcbiAgLyoqXG4gICAqIENhbGxlZCBieSB0aGUgYFJvdXRlcmAgd2hlbiB0aGUgb3V0bGV0IHNob3VsZCBhY3RpdmF0ZSAoY3JlYXRlIGEgY29tcG9uZW50KS5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgUGFzc2luZyBhIHJlc29sdmVyIHRvIHJldHJpZXZlIGEgY29tcG9uZW50IGZhY3RvcnkgaXMgbm90IHJlcXVpcmVkIGFuZCBpc1xuICAgKiAgICAgZGVwcmVjYXRlZCBzaW5jZSB2MTQuXG4gICAqL1xuICBhY3RpdmF0ZVdpdGgoYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlLCByZXNvbHZlcjogQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyfG51bGwpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBBIHJlcXVlc3QgdG8gZGVzdHJveSB0aGUgY3VycmVudGx5IGFjdGl2YXRlZCBjb21wb25lbnQuXG4gICAqXG4gICAqIFdoZW4gYSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbmRpY2F0ZXMgdGhhdCBhbiBgQWN0aXZhdGVkUm91dGVgIHNob3VsZCBiZSByZW1vdmVkIGJ1dCBzdG9yZWQgZm9yXG4gICAqIGxhdGVyIHJlLXVzZSByYXRoZXIgdGhhbiBkZXN0cm95ZWQsIHRoZSBgUm91dGVyYCB3aWxsIGNhbGwgYGRldGFjaGAgaW5zdGVhZC5cbiAgICovXG4gIGRlYWN0aXZhdGUoKTogdm9pZDtcblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byBkZXRhY2ggdGhlIHN1YnRyZWUuXG4gICAqXG4gICAqIFRoaXMgaXMgc2ltaWxhciB0byBgZGVhY3RpdmF0ZWAsIGJ1dCB0aGUgYWN0aXZhdGVkIGNvbXBvbmVudCBzaG91bGQgX25vdF8gYmUgZGVzdHJveWVkLlxuICAgKiBJbnN0ZWFkLCBpdCBpcyByZXR1cm5lZCBzbyB0aGF0IGl0IGNhbiBiZSByZWF0dGFjaGVkIGxhdGVyIHZpYSB0aGUgYGF0dGFjaGAgbWV0aG9kLlxuICAgKi9cbiAgZGV0YWNoKCk6IENvbXBvbmVudFJlZjx1bmtub3duPjtcblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byByZS1hdHRhY2ggYSBwcmV2aW91c2x5IGRldGFjaGVkIHN1YnRyZWUuXG4gICAqL1xuICBhdHRhY2gocmVmOiBDb21wb25lbnRSZWY8dW5rbm93bj4sIGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIEVtaXRzIGFuIGFjdGl2YXRlIGV2ZW50IHdoZW4gYSBuZXcgY29tcG9uZW50IGlzIGluc3RhbnRpYXRlZFxuICAgKiovXG4gIGFjdGl2YXRlRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhIGRlYWN0aXZhdGUgZXZlbnQgd2hlbiBhIGNvbXBvbmVudCBpcyBkZXN0cm95ZWQuXG4gICAqL1xuICBkZWFjdGl2YXRlRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhbiBhdHRhY2hlZCBjb21wb25lbnQgaW5zdGFuY2Ugd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhXG4gICAqIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZS5cbiAgICoqL1xuICBhdHRhY2hFdmVudHM/OiBFdmVudEVtaXR0ZXI8dW5rbm93bj47XG5cbiAgLyoqXG4gICAqIEVtaXRzIGEgZGV0YWNoZWQgY29tcG9uZW50IGluc3RhbmNlIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byBkZXRhY2ggdGhlXG4gICAqIHN1YnRyZWUuXG4gICAqL1xuICBkZXRhY2hFdmVudHM/OiBFdmVudEVtaXR0ZXI8dW5rbm93bj47XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQWN0cyBhcyBhIHBsYWNlaG9sZGVyIHRoYXQgQW5ndWxhciBkeW5hbWljYWxseSBmaWxscyBiYXNlZCBvbiB0aGUgY3VycmVudCByb3V0ZXIgc3RhdGUuXG4gKlxuICogRWFjaCBvdXRsZXQgY2FuIGhhdmUgYSB1bmlxdWUgbmFtZSwgZGV0ZXJtaW5lZCBieSB0aGUgb3B0aW9uYWwgYG5hbWVgIGF0dHJpYnV0ZS5cbiAqIFRoZSBuYW1lIGNhbm5vdCBiZSBzZXQgb3IgY2hhbmdlZCBkeW5hbWljYWxseS4gSWYgbm90IHNldCwgZGVmYXVsdCB2YWx1ZSBpcyBcInByaW1hcnlcIi5cbiAqXG4gKiBgYGBcbiAqIDxyb3V0ZXItb3V0bGV0Pjwvcm91dGVyLW91dGxldD5cbiAqIDxyb3V0ZXItb3V0bGV0IG5hbWU9J2xlZnQnPjwvcm91dGVyLW91dGxldD5cbiAqIDxyb3V0ZXItb3V0bGV0IG5hbWU9J3JpZ2h0Jz48L3JvdXRlci1vdXRsZXQ+XG4gKiBgYGBcbiAqXG4gKiBOYW1lZCBvdXRsZXRzIGNhbiBiZSB0aGUgdGFyZ2V0cyBvZiBzZWNvbmRhcnkgcm91dGVzLlxuICogVGhlIGBSb3V0ZWAgb2JqZWN0IGZvciBhIHNlY29uZGFyeSByb3V0ZSBoYXMgYW4gYG91dGxldGAgcHJvcGVydHkgdG8gaWRlbnRpZnkgdGhlIHRhcmdldCBvdXRsZXQ6XG4gKlxuICogYHtwYXRoOiA8YmFzZS1wYXRoPiwgY29tcG9uZW50OiA8Y29tcG9uZW50Piwgb3V0bGV0OiA8dGFyZ2V0X291dGxldF9uYW1lPn1gXG4gKlxuICogVXNpbmcgbmFtZWQgb3V0bGV0cyBhbmQgc2Vjb25kYXJ5IHJvdXRlcywgeW91IGNhbiB0YXJnZXQgbXVsdGlwbGUgb3V0bGV0cyBpblxuICogdGhlIHNhbWUgYFJvdXRlckxpbmtgIGRpcmVjdGl2ZS5cbiAqXG4gKiBUaGUgcm91dGVyIGtlZXBzIHRyYWNrIG9mIHNlcGFyYXRlIGJyYW5jaGVzIGluIGEgbmF2aWdhdGlvbiB0cmVlIGZvciBlYWNoIG5hbWVkIG91dGxldCBhbmRcbiAqIGdlbmVyYXRlcyBhIHJlcHJlc2VudGF0aW9uIG9mIHRoYXQgdHJlZSBpbiB0aGUgVVJMLlxuICogVGhlIFVSTCBmb3IgYSBzZWNvbmRhcnkgcm91dGUgdXNlcyB0aGUgZm9sbG93aW5nIHN5bnRheCB0byBzcGVjaWZ5IGJvdGggdGhlIHByaW1hcnkgYW5kIHNlY29uZGFyeVxuICogcm91dGVzIGF0IHRoZSBzYW1lIHRpbWU6XG4gKlxuICogYGh0dHA6Ly9iYXNlLXBhdGgvcHJpbWFyeS1yb3V0ZS1wYXRoKG91dGxldC1uYW1lOnJvdXRlLXBhdGgpYFxuICpcbiAqIEEgcm91dGVyIG91dGxldCBlbWl0cyBhbiBhY3RpdmF0ZSBldmVudCB3aGVuIGEgbmV3IGNvbXBvbmVudCBpcyBpbnN0YW50aWF0ZWQsXG4gKiBkZWFjdGl2YXRlIGV2ZW50IHdoZW4gYSBjb21wb25lbnQgaXMgZGVzdHJveWVkLlxuICogQW4gYXR0YWNoZWQgZXZlbnQgZW1pdHMgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRoZSBvdXRsZXQgdG8gcmVhdHRhY2ggdGhlXG4gKiBzdWJ0cmVlLCBhbmQgdGhlIGRldGFjaGVkIGV2ZW50IGVtaXRzIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0aGUgb3V0bGV0IHRvXG4gKiBkZXRhY2ggdGhlIHN1YnRyZWUuXG4gKlxuICogYGBgXG4gKiA8cm91dGVyLW91dGxldFxuICogICAoYWN0aXZhdGUpPSdvbkFjdGl2YXRlKCRldmVudCknXG4gKiAgIChkZWFjdGl2YXRlKT0nb25EZWFjdGl2YXRlKCRldmVudCknXG4gKiAgIChhdHRhY2gpPSdvbkF0dGFjaCgkZXZlbnQpJ1xuICogICAoZGV0YWNoKT0nb25EZXRhY2goJGV2ZW50KSc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKlxuICogQHNlZSBbUm91dGluZyB0dXRvcmlhbF0oZ3VpZGUvcm91dGVyLXR1dG9yaWFsLXRvaCNuYW1lZC1vdXRsZXRzIFwiRXhhbXBsZSBvZiBhIG5hbWVkXG4gKiBvdXRsZXQgYW5kIHNlY29uZGFyeSByb3V0ZSBjb25maWd1cmF0aW9uXCIpLlxuICogQHNlZSBgUm91dGVyTGlua2BcbiAqIEBzZWUgYFJvdXRlYFxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAncm91dGVyLW91dGxldCcsXG4gIGV4cG9ydEFzOiAnb3V0bGV0JyxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyT3V0bGV0IGltcGxlbWVudHMgT25EZXN0cm95LCBPbkluaXQsIFJvdXRlck91dGxldENvbnRyYWN0IHtcbiAgcHJpdmF0ZSBhY3RpdmF0ZWQ6IENvbXBvbmVudFJlZjxhbnk+fG51bGwgPSBudWxsO1xuICBwcml2YXRlIF9hY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGV8bnVsbCA9IG51bGw7XG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgb3V0bGV0XG4gICAqXG4gICAqIEBzZWUgW25hbWVkIG91dGxldHNdKGd1aWRlL3JvdXRlci10dXRvcmlhbC10b2gjZGlzcGxheWluZy1tdWx0aXBsZS1yb3V0ZXMtaW4tbmFtZWQtb3V0bGV0cylcbiAgICovXG4gIEBJbnB1dCgpIG5hbWUgPSBQUklNQVJZX09VVExFVDtcblxuICBAT3V0cHV0KCdhY3RpdmF0ZScpIGFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoJ2RlYWN0aXZhdGUnKSBkZWFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIC8qKlxuICAgKiBFbWl0cyBhbiBhdHRhY2hlZCBjb21wb25lbnQgaW5zdGFuY2Ugd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhXG4gICAqIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZS5cbiAgICoqL1xuICBAT3V0cHV0KCdhdHRhY2gnKSBhdHRhY2hFdmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyPHVua25vd24+KCk7XG4gIC8qKlxuICAgKiBFbWl0cyBhIGRldGFjaGVkIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZVxuICAgKiBzdWJ0cmVlLlxuICAgKi9cbiAgQE91dHB1dCgnZGV0YWNoJykgZGV0YWNoRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjx1bmtub3duPigpO1xuXG4gIHByaXZhdGUgcGFyZW50Q29udGV4dHMgPSBpbmplY3QoQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk7XG4gIHByaXZhdGUgbG9jYXRpb24gPSBpbmplY3QoVmlld0NvbnRhaW5lclJlZik7XG4gIHByaXZhdGUgY2hhbmdlRGV0ZWN0b3IgPSBpbmplY3QoQ2hhbmdlRGV0ZWN0b3JSZWYpO1xuICBwcml2YXRlIGVudmlyb25tZW50SW5qZWN0b3IgPSBpbmplY3QoRW52aXJvbm1lbnRJbmplY3Rvcik7XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgaWYgKGNoYW5nZXNbJ25hbWUnXSkge1xuICAgICAgY29uc3Qge2ZpcnN0Q2hhbmdlLCBwcmV2aW91c1ZhbHVlfSA9IGNoYW5nZXNbJ25hbWUnXTtcbiAgICAgIGlmIChmaXJzdENoYW5nZSkge1xuICAgICAgICAvLyBUaGUgZmlyc3QgY2hhbmdlIGlzIGhhbmRsZWQgYnkgbmdPbkluaXQuIEJlY2F1c2UgbmdPbkNoYW5nZXMgZG9lc24ndCBnZXQgY2FsbGVkIHdoZW4gbm9cbiAgICAgICAgLy8gaW5wdXQgaXMgc2V0IGF0IGFsbCwgd2UgbmVlZCB0byBjZW50cmFsbHkgaGFuZGxlIHRoZSBmaXJzdCBjaGFuZ2UgdGhlcmUuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gdW5yZWdpc3RlciB3aXRoIHRoZSBvbGQgbmFtZVxuICAgICAgaWYgKHRoaXMuaXNUcmFja2VkSW5QYXJlbnRDb250ZXh0cyhwcmV2aW91c1ZhbHVlKSkge1xuICAgICAgICB0aGlzLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgdGhpcy5wYXJlbnRDb250ZXh0cy5vbkNoaWxkT3V0bGV0RGVzdHJveWVkKHByZXZpb3VzVmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gcmVnaXN0ZXIgdGhlIG5ldyBuYW1lXG4gICAgICB0aGlzLmluaXRpYWxpemVPdXRsZXRXaXRoTmFtZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgLy8gRW5zdXJlIHRoYXQgdGhlIHJlZ2lzdGVyZWQgb3V0bGV0IGlzIHRoaXMgb25lIGJlZm9yZSByZW1vdmluZyBpdCBvbiB0aGUgY29udGV4dC5cbiAgICBpZiAodGhpcy5pc1RyYWNrZWRJblBhcmVudENvbnRleHRzKHRoaXMubmFtZSkpIHtcbiAgICAgIHRoaXMucGFyZW50Q29udGV4dHMub25DaGlsZE91dGxldERlc3Ryb3llZCh0aGlzLm5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgaXNUcmFja2VkSW5QYXJlbnRDb250ZXh0cyhvdXRsZXROYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnRDb250ZXh0cy5nZXRDb250ZXh0KG91dGxldE5hbWUpPy5vdXRsZXQgPT09IHRoaXM7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIHRoaXMuaW5pdGlhbGl6ZU91dGxldFdpdGhOYW1lKCk7XG4gIH1cblxuICBwcml2YXRlIGluaXRpYWxpemVPdXRsZXRXaXRoTmFtZSgpIHtcbiAgICB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXRDcmVhdGVkKHRoaXMubmFtZSwgdGhpcyk7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIG91dGxldCB3YXMgbm90IGluc3RhbnRpYXRlZCBhdCB0aGUgdGltZSB0aGUgcm91dGUgZ290IGFjdGl2YXRlZCB3ZSBuZWVkIHRvIHBvcHVsYXRlXG4gICAgLy8gdGhlIG91dGxldCB3aGVuIGl0IGlzIGluaXRpYWxpemVkIChpZSBpbnNpZGUgYSBOZ0lmKVxuICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldENvbnRleHQodGhpcy5uYW1lKTtcbiAgICBpZiAoY29udGV4dD8ucm91dGUpIHtcbiAgICAgIGlmIChjb250ZXh0LmF0dGFjaFJlZikge1xuICAgICAgICAvLyBgYXR0YWNoUmVmYCBpcyBwb3B1bGF0ZWQgd2hlbiB0aGVyZSBpcyBhbiBleGlzdGluZyBjb21wb25lbnQgdG8gbW91bnRcbiAgICAgICAgdGhpcy5hdHRhY2goY29udGV4dC5hdHRhY2hSZWYsIGNvbnRleHQucm91dGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBjb21wb25lbnQgZGVmaW5lZCBpbiB0aGUgY29uZmlndXJhdGlvbiBpcyBjcmVhdGVkXG4gICAgICAgIHRoaXMuYWN0aXZhdGVXaXRoKGNvbnRleHQucm91dGUsIGNvbnRleHQuaW5qZWN0b3IpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldCBpc0FjdGl2YXRlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLmFjdGl2YXRlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBUaGUgY3VycmVudGx5IGFjdGl2YXRlZCBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAqIEB0aHJvd3MgQW4gZXJyb3IgaWYgdGhlIG91dGxldCBpcyBub3QgYWN0aXZhdGVkLlxuICAgKi9cbiAgZ2V0IGNvbXBvbmVudCgpOiBPYmplY3Qge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpXG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuT1VUTEVUX05PVF9BQ1RJVkFURUQsIE5HX0RFVl9NT0RFICYmICdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZSgpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZClcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5PVVRMRVRfTk9UX0FDVElWQVRFRCwgTkdfREVWX01PREUgJiYgJ091dGxldCBpcyBub3QgYWN0aXZhdGVkJyk7XG4gICAgcmV0dXJuIHRoaXMuX2FjdGl2YXRlZFJvdXRlIGFzIEFjdGl2YXRlZFJvdXRlO1xuICB9XG5cbiAgZ2V0IGFjdGl2YXRlZFJvdXRlRGF0YSgpOiBEYXRhIHtcbiAgICBpZiAodGhpcy5fYWN0aXZhdGVkUm91dGUpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hY3RpdmF0ZWRSb3V0ZS5zbmFwc2hvdC5kYXRhO1xuICAgIH1cbiAgICByZXR1cm4ge307XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byBkZXRhY2ggdGhlIHN1YnRyZWVcbiAgICovXG4gIGRldGFjaCgpOiBDb21wb25lbnRSZWY8YW55PiB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZClcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5PVVRMRVRfTk9UX0FDVElWQVRFRCwgTkdfREVWX01PREUgJiYgJ091dGxldCBpcyBub3QgYWN0aXZhdGVkJyk7XG4gICAgdGhpcy5sb2NhdGlvbi5kZXRhY2goKTtcbiAgICBjb25zdCBjbXAgPSB0aGlzLmFjdGl2YXRlZDtcbiAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBudWxsO1xuICAgIHRoaXMuZGV0YWNoRXZlbnRzLmVtaXQoY21wLmluc3RhbmNlKTtcbiAgICByZXR1cm4gY21wO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gcmUtYXR0YWNoIGEgcHJldmlvdXNseSBkZXRhY2hlZCBzdWJ0cmVlXG4gICAqL1xuICBhdHRhY2gocmVmOiBDb21wb25lbnRSZWY8YW55PiwgYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7XG4gICAgdGhpcy5hY3RpdmF0ZWQgPSByZWY7XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBhY3RpdmF0ZWRSb3V0ZTtcbiAgICB0aGlzLmxvY2F0aW9uLmluc2VydChyZWYuaG9zdFZpZXcpO1xuICAgIHRoaXMuYXR0YWNoRXZlbnRzLmVtaXQocmVmLmluc3RhbmNlKTtcbiAgfVxuXG4gIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5jb21wb25lbnQ7XG4gICAgICB0aGlzLmFjdGl2YXRlZC5kZXN0cm95KCk7XG4gICAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVFdmVudHMuZW1pdChjKTtcbiAgICB9XG4gIH1cblxuICBhY3RpdmF0ZVdpdGgoXG4gICAgICBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgICByZXNvbHZlck9ySW5qZWN0b3I/OiBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXJ8RW52aXJvbm1lbnRJbmplY3RvcnxudWxsKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmF0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5PVVRMRVRfQUxSRUFEWV9BQ1RJVkFURUQsXG4gICAgICAgICAgTkdfREVWX01PREUgJiYgJ0Nhbm5vdCBhY3RpdmF0ZSBhbiBhbHJlYWR5IGFjdGl2YXRlZCBvdXRsZXQnKTtcbiAgICB9XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBhY3RpdmF0ZWRSb3V0ZTtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMubG9jYXRpb247XG4gICAgY29uc3Qgc25hcHNob3QgPSBhY3RpdmF0ZWRSb3V0ZS5zbmFwc2hvdDtcbiAgICBjb25zdCBjb21wb25lbnQgPSBzbmFwc2hvdC5jb21wb25lbnQhO1xuICAgIGNvbnN0IGNoaWxkQ29udGV4dHMgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldE9yQ3JlYXRlQ29udGV4dCh0aGlzLm5hbWUpLmNoaWxkcmVuO1xuICAgIGNvbnN0IGluamVjdG9yID0gbmV3IE91dGxldEluamVjdG9yKGFjdGl2YXRlZFJvdXRlLCBjaGlsZENvbnRleHRzLCBsb2NhdGlvbi5pbmplY3Rvcik7XG5cbiAgICAvLyBJbmRpY2F0ZSB0aGF0IGEgaG9zdCB2aWV3IGNyZWF0ZWQgZm9yIHRoaXMgY29tcG9uZW50XG4gICAgLy8gbWlnaHQgYmUgbGF6eS1sb2FkZWQgYW5kIGNvcnJlc3BvbmRpbmcgRE9NIG5vZGVzIHNob3VsZCBiZVxuICAgIC8vIHJldGFpbmVkIGR1cmluZyB0aGUgaHlkcmF0aW9uLiBOb3RlOiBhIGNvbXBvbmVudCBtaWdodCBiZVxuICAgIC8vIGVhZ2VybHkgbG9hZGVkICh2aWEgYGNvbXBvbmVudGAgZmllbGQpLCBidXQgdGhpcyByb3V0ZSBtaWdodFxuICAgIC8vIGhhdmUgYXN5bmMgZ3VhcmRzIGFuZCByZXNvbHZlcnMuXG4gICAgY29uc3QgbGF6eSA9IHRydWU7XG4gICAgaWYgKHJlc29sdmVyT3JJbmplY3RvciAmJiBpc0NvbXBvbmVudEZhY3RvcnlSZXNvbHZlcihyZXNvbHZlck9ySW5qZWN0b3IpKSB7XG4gICAgICBjb25zdCBmYWN0b3J5ID0gcmVzb2x2ZXJPckluamVjdG9yLnJlc29sdmVDb21wb25lbnRGYWN0b3J5KGNvbXBvbmVudCk7XG4gICAgICB0aGlzLmFjdGl2YXRlZCA9XG4gICAgICAgICAgbG9jYXRpb24uY3JlYXRlQ29tcG9uZW50KGZhY3RvcnksIGxvY2F0aW9uLmxlbmd0aCwgaW5qZWN0b3IsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBsYXp5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZW52aXJvbm1lbnRJbmplY3RvciA9IHJlc29sdmVyT3JJbmplY3RvciA/PyB0aGlzLmVudmlyb25tZW50SW5qZWN0b3I7XG4gICAgICB0aGlzLmFjdGl2YXRlZCA9IGxvY2F0aW9uLmNyZWF0ZUNvbXBvbmVudChcbiAgICAgICAgICBjb21wb25lbnQsIHtpbmRleDogbG9jYXRpb24ubGVuZ3RoLCBpbmplY3RvciwgZW52aXJvbm1lbnRJbmplY3RvciwgbGF6eX0pO1xuICAgIH1cbiAgICAvLyBDYWxsaW5nIGBtYXJrRm9yQ2hlY2tgIHRvIG1ha2Ugc3VyZSB3ZSB3aWxsIHJ1biB0aGUgY2hhbmdlIGRldGVjdGlvbiB3aGVuIHRoZVxuICAgIC8vIGBSb3V0ZXJPdXRsZXRgIGlzIGluc2lkZSBhIGBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2hgIGNvbXBvbmVudC5cbiAgICB0aGlzLmNoYW5nZURldGVjdG9yLm1hcmtGb3JDaGVjaygpO1xuICAgIHRoaXMuYWN0aXZhdGVFdmVudHMuZW1pdCh0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZSk7XG4gIH1cbn1cblxuY2xhc3MgT3V0bGV0SW5qZWN0b3IgaW1wbGVtZW50cyBJbmplY3RvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsIHByaXZhdGUgY2hpbGRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyxcbiAgICAgIHByaXZhdGUgcGFyZW50OiBJbmplY3Rvcikge31cblxuICBnZXQodG9rZW46IGFueSwgbm90Rm91bmRWYWx1ZT86IGFueSk6IGFueSB7XG4gICAgaWYgKHRva2VuID09PSBBY3RpdmF0ZWRSb3V0ZSkge1xuICAgICAgcmV0dXJuIHRoaXMucm91dGU7XG4gICAgfVxuXG4gICAgaWYgKHRva2VuID09PSBDaGlsZHJlbk91dGxldENvbnRleHRzKSB7XG4gICAgICByZXR1cm4gdGhpcy5jaGlsZENvbnRleHRzO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnBhcmVudC5nZXQodG9rZW4sIG5vdEZvdW5kVmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyKGl0ZW06IGFueSk6IGl0ZW0gaXMgQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyIHtcbiAgcmV0dXJuICEhaXRlbS5yZXNvbHZlQ29tcG9uZW50RmFjdG9yeTtcbn1cbiJdfQ==