/**
 * @license Angular v15.1.0-next.2+sha-1939ca0-with-local-changes
 * (c) 2010-2022 Google LLC. https://angular.io/
 * License: MIT
 */

import { ɵsetRootDomAdapter, DOCUMENT, XhrFactory, PlatformLocation, ɵgetDOM, ɵPLATFORM_SERVER_ID, ViewportScroller, ɵNullViewportScroller } from '@angular/common';
import * as i0 from '@angular/core';
import { Injectable, Inject, InjectionToken, inject, EnvironmentInjector, Optional, ViewEncapsulation, RendererStyleFlags2, APP_ID, NgModule, Injector, PLATFORM_ID, PLATFORM_INITIALIZER, ɵALLOW_MULTIPLE_PLATFORMS, RendererFactory2, NgZone, Testability, ɵTESTABILITY, ɵsetDocument, createPlatformFactory, platformCore, Renderer2, ɵTYPE, ɵcollectNativeNodes, ɵTVIEW, ɵHEADER_OFFSET, ɵHOST, ɵunwrapRNode, ɵCONTAINER_HEADER_OFFSET, ɵisRootView, ɵCONTEXT, ɵgetLViewById, ApplicationRef, ɵisPromise, importProvidersFrom, ɵinternalCreateApplication, Version } from '@angular/core';
import * as i1 from '@angular/platform-browser';
import { ɵBrowserDomAdapter, ɵflattenStyles, ɵNAMESPACE_URIS, ɵshimContentAttribute, ɵshimHostAttribute, ɵSharedStylesHost, ɵTRANSITION_ID, TransferState, ɵescapeHtml, EVENT_MANAGER_PLUGINS, BrowserModule } from '@angular/platform-browser';
import * as domino from 'domino';
import { ɵAnimationEngine } from '@angular/animations/browser';
import { ɵHttpInterceptorHandler, HttpBackend, HttpHandler, HttpClientModule } from '@angular/common/http';
import { ɵplatformCoreDynamic } from '@angular/platform-browser-dynamic';
import { ɵAnimationRendererFactory, NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, Subject } from 'rxjs';
import * as xhr2 from 'xhr2';
import * as url from 'url';
import { DomElementSchemaRegistry } from '@angular/compiler';
import { first } from 'rxjs/operators';

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function setDomTypes() {
    // Make all Domino types available in the global env.
    Object.assign(global, domino.impl);
    global['KeyboardEvent'] = domino.impl.Event;
}
/**
 * Parses a document string to a Document object.
 */
function parseDocument(html, url = '/') {
    let window = domino.createWindow(html, url);
    let doc = window.document;
    return doc;
}
/**
 * Serializes a document to string.
 */
function serializeDocument(doc) {
    return doc.serialize();
}
/**
 * DOM Adapter for the server platform based on https://github.com/fgnass/domino.
 */
class DominoAdapter extends ɵBrowserDomAdapter {
    constructor() {
        super(...arguments);
        this.supportsDOMEvents = false;
    }
    static makeCurrent() {
        setDomTypes();
        ɵsetRootDomAdapter(new DominoAdapter());
    }
    createHtmlDocument() {
        return parseDocument('<html><head><title>fakeTitle</title></head><body></body></html>');
    }
    getDefaultDocument() {
        if (!DominoAdapter.defaultDoc) {
            DominoAdapter.defaultDoc = domino.createDocument();
        }
        return DominoAdapter.defaultDoc;
    }
    isElementNode(node) {
        return node ? node.nodeType === DominoAdapter.defaultDoc.ELEMENT_NODE : false;
    }
    isShadowRoot(node) {
        return node.shadowRoot == node;
    }
    /** @deprecated No longer being used in Ivy code. To be removed in version 14. */
    getGlobalEventTarget(doc, target) {
        if (target === 'window') {
            return doc.defaultView;
        }
        if (target === 'document') {
            return doc;
        }
        if (target === 'body') {
            return doc.body;
        }
        return null;
    }
    getBaseHref(doc) {
        // TODO(alxhub): Need relative path logic from BrowserDomAdapter here?
        return doc.documentElement.querySelector('base')?.getAttribute('href') || '';
    }
    dispatchEvent(el, evt) {
        el.dispatchEvent(evt);
        // Dispatch the event to the window also.
        const doc = el.ownerDocument || el;
        const win = doc.defaultView;
        if (win) {
            win.dispatchEvent(evt);
        }
    }
    getUserAgent() {
        return 'Fake user agent';
    }
    getCookie(name) {
        throw new Error('getCookie has not been implemented');
    }
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Representation of the current platform state.
 *
 * @publicApi
 */
class PlatformState {
    constructor(_doc) {
        this._doc = _doc;
    }
    /**
     * Renders the current state of the platform to string.
     */
    renderToString() {
        return serializeDocument(this._doc);
    }
    /**
     * Returns the current DOM state.
     */
    getDocument() {
        return this._doc;
    }
}
PlatformState.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: PlatformState, deps: [{ token: DOCUMENT }], target: i0.ɵɵFactoryTarget.Injectable });
PlatformState.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: PlatformState });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: PlatformState, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }]; } });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * The DI token for setting the initial config for the platform.
 *
 * @publicApi
 */
const INITIAL_CONFIG = new InjectionToken('Server.INITIAL_CONFIG');
/**
 * A function that will be executed when calling `renderApplication`, `renderModuleFactory` or
 * `renderModule` just before current platform state is rendered to string.
 *
 * @publicApi
 */
const BEFORE_APP_SERIALIZED = new InjectionToken('Server.RENDER_MODULE_HOOK');

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// @see https://www.w3.org/Protocols/HTTP/1.1/draft-ietf-http-v11-spec-01#URI-syntax
const isAbsoluteUrl = /^[a-zA-Z\-\+.]+:\/\//;
class ServerXhr {
    build() {
        return new xhr2.XMLHttpRequest();
    }
}
ServerXhr.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerXhr, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
ServerXhr.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerXhr });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerXhr, decorators: [{
            type: Injectable
        }] });
class ZoneMacroTaskWrapper {
    wrap(request) {
        return new Observable((observer) => {
            let task = null;
            let scheduled = false;
            let sub = null;
            let savedResult = null;
            let savedError = null;
            const scheduleTask = (_task) => {
                task = _task;
                scheduled = true;
                const delegate = this.delegate(request);
                sub = delegate.subscribe(res => savedResult = res, err => {
                    if (!scheduled) {
                        throw new Error('An http observable was completed twice. This shouldn\'t happen, please file a bug.');
                    }
                    savedError = err;
                    scheduled = false;
                    task.invoke();
                }, () => {
                    if (!scheduled) {
                        throw new Error('An http observable was completed twice. This shouldn\'t happen, please file a bug.');
                    }
                    scheduled = false;
                    task.invoke();
                });
            };
            const cancelTask = (_task) => {
                if (!scheduled) {
                    return;
                }
                scheduled = false;
                if (sub) {
                    sub.unsubscribe();
                    sub = null;
                }
            };
            const onComplete = () => {
                if (savedError !== null) {
                    observer.error(savedError);
                }
                else {
                    observer.next(savedResult);
                    observer.complete();
                }
            };
            // MockBackend for Http is synchronous, which means that if scheduleTask is by
            // scheduleMacroTask, the request will hit MockBackend and the response will be
            // sent, causing task.invoke() to be called.
            const _task = Zone.current.scheduleMacroTask('ZoneMacroTaskWrapper.subscribe', onComplete, {}, () => null, cancelTask);
            scheduleTask(_task);
            return () => {
                if (scheduled && task) {
                    task.zone.cancelTask(task);
                    scheduled = false;
                }
                if (sub) {
                    sub.unsubscribe();
                    sub = null;
                }
            };
        });
    }
}
class ZoneClientBackend extends ZoneMacroTaskWrapper {
    constructor(backend, platformLocation, config) {
        super();
        this.backend = backend;
        this.platformLocation = platformLocation;
        this.config = config;
    }
    handle(request) {
        const { href, protocol, hostname, port } = this.platformLocation;
        if (this.config.useAbsoluteUrl && !isAbsoluteUrl.test(request.url) &&
            isAbsoluteUrl.test(href)) {
            const baseHref = this.platformLocation.getBaseHrefFromDOM() || href;
            const urlPrefix = `${protocol}//${hostname}` + (port ? `:${port}` : '');
            const baseUrl = new URL(baseHref, urlPrefix);
            const url = new URL(request.url, baseUrl);
            return this.wrap(request.clone({ url: url.toString() }));
        }
        return this.wrap(request);
    }
    delegate(request) {
        return this.backend.handle(request);
    }
}
function zoneWrappedInterceptorHandler(platformLocation, config) {
    return new ZoneClientBackend(new ɵHttpInterceptorHandler(inject(HttpBackend), inject(EnvironmentInjector)), platformLocation, config);
}
const SERVER_HTTP_PROVIDERS = [
    { provide: XhrFactory, useClass: ServerXhr }, {
        provide: HttpHandler,
        useFactory: zoneWrappedInterceptorHandler,
        deps: [PlatformLocation, INITIAL_CONFIG]
    }
];

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function parseUrl(urlStr) {
    const parsedUrl = url.parse(urlStr);
    return {
        hostname: parsedUrl.hostname || '',
        protocol: parsedUrl.protocol || '',
        port: parsedUrl.port || '',
        pathname: parsedUrl.pathname || '',
        search: parsedUrl.search || '',
        hash: parsedUrl.hash || '',
    };
}
/**
 * Server-side implementation of URL state. Implements `pathname`, `search`, and `hash`
 * but not the state stack.
 */
class ServerPlatformLocation {
    constructor(_doc, _config) {
        this._doc = _doc;
        this.href = '/';
        this.hostname = '/';
        this.protocol = '/';
        this.port = '/';
        this.pathname = '/';
        this.search = '';
        this.hash = '';
        this._hashUpdate = new Subject();
        const config = _config;
        if (!config) {
            return;
        }
        if (config.url) {
            const url = parseUrl(config.url);
            this.protocol = url.protocol;
            this.hostname = url.hostname;
            this.port = url.port;
            this.pathname = url.pathname;
            this.search = url.search;
            this.hash = url.hash;
            this.href = _doc.location.href;
        }
        if (config.useAbsoluteUrl) {
            if (!config.baseUrl) {
                throw new Error(`"PlatformConfig.baseUrl" must be set if "useAbsoluteUrl" is true`);
            }
            const url = parseUrl(config.baseUrl);
            this.protocol = url.protocol;
            this.hostname = url.hostname;
            this.port = url.port;
        }
    }
    getBaseHrefFromDOM() {
        return ɵgetDOM().getBaseHref(this._doc);
    }
    onPopState(fn) {
        // No-op: a state stack is not implemented, so
        // no events will ever come.
        return () => { };
    }
    onHashChange(fn) {
        const subscription = this._hashUpdate.subscribe(fn);
        return () => subscription.unsubscribe();
    }
    get url() {
        return `${this.pathname}${this.search}${this.hash}`;
    }
    setHash(value, oldUrl) {
        if (this.hash === value) {
            // Don't fire events if the hash has not changed.
            return;
        }
        this.hash = value;
        const newUrl = this.url;
        scheduleMicroTask(() => this._hashUpdate.next({ type: 'hashchange', state: null, oldUrl, newUrl }));
    }
    replaceState(state, title, newUrl) {
        const oldUrl = this.url;
        const parsedUrl = parseUrl(newUrl);
        this.pathname = parsedUrl.pathname;
        this.search = parsedUrl.search;
        this.setHash(parsedUrl.hash, oldUrl);
    }
    pushState(state, title, newUrl) {
        this.replaceState(state, title, newUrl);
    }
    forward() {
        throw new Error('Not implemented');
    }
    back() {
        throw new Error('Not implemented');
    }
    // History API isn't available on server, therefore return undefined
    getState() {
        return undefined;
    }
}
ServerPlatformLocation.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerPlatformLocation, deps: [{ token: DOCUMENT }, { token: INITIAL_CONFIG, optional: true }], target: i0.ɵɵFactoryTarget.Injectable });
ServerPlatformLocation.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerPlatformLocation });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerPlatformLocation, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [INITIAL_CONFIG]
                }] }]; } });
function scheduleMicroTask(fn) {
    Zone.current.scheduleMicroTask('scheduleMicrotask', fn);
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class ServerEventManagerPlugin /* extends EventManagerPlugin which is private */ {
    constructor(doc) {
        this.doc = doc;
    }
    // Handle all events on the server.
    supports(eventName) {
        return true;
    }
    addEventListener(element, eventName, handler) {
        return ɵgetDOM().onAndCancel(element, eventName, handler);
    }
    /** @deprecated No longer being used in Ivy code. To be removed in version 14. */
    addGlobalEventListener(element, eventName, handler) {
        const target = ɵgetDOM().getGlobalEventTarget(this.doc, element);
        if (!target) {
            throw new Error(`Unsupported event target ${target} for event ${eventName}`);
        }
        return this.addEventListener(target, eventName, handler);
    }
}
ServerEventManagerPlugin.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerEventManagerPlugin /* extends EventManagerPlugin which is private */, deps: [{ token: DOCUMENT }], target: i0.ɵɵFactoryTarget.Injectable });
ServerEventManagerPlugin.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerEventManagerPlugin /* extends EventManagerPlugin which is private */ });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerEventManagerPlugin /* extends EventManagerPlugin which is private */, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }]; } });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const EMPTY_ARRAY = [];
const DEFAULT_SCHEMA = new DomElementSchemaRegistry();
class ServerRendererFactory2 {
    constructor(eventManager, ngZone, document, sharedStylesHost) {
        this.eventManager = eventManager;
        this.ngZone = ngZone;
        this.document = document;
        this.sharedStylesHost = sharedStylesHost;
        this.rendererByCompId = new Map();
        this.schema = DEFAULT_SCHEMA;
        this.defaultRenderer = new DefaultServerRenderer2(eventManager, document, ngZone, this.schema);
    }
    createRenderer(element, type) {
        if (!element || !type) {
            return this.defaultRenderer;
        }
        switch (type.encapsulation) {
            case ViewEncapsulation.Emulated: {
                let renderer = this.rendererByCompId.get(type.id);
                if (!renderer) {
                    renderer = new EmulatedEncapsulationServerRenderer2(this.eventManager, this.document, this.ngZone, this.sharedStylesHost, this.schema, type);
                    this.rendererByCompId.set(type.id, renderer);
                }
                renderer.applyToHost(element);
                return renderer;
            }
            default: {
                if (!this.rendererByCompId.has(type.id)) {
                    const styles = ɵflattenStyles(type.id, type.styles);
                    this.sharedStylesHost.addStyles(styles);
                    this.rendererByCompId.set(type.id, this.defaultRenderer);
                }
                return this.defaultRenderer;
            }
        }
    }
    begin() { }
    end() { }
}
ServerRendererFactory2.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerRendererFactory2, deps: [{ token: i1.EventManager }, { token: i0.NgZone }, { token: DOCUMENT }, { token: i1.ɵSharedStylesHost }], target: i0.ɵɵFactoryTarget.Injectable });
ServerRendererFactory2.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerRendererFactory2 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerRendererFactory2, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i1.EventManager }, { type: i0.NgZone }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }, { type: i1.ɵSharedStylesHost }]; } });
class DefaultServerRenderer2 {
    constructor(eventManager, document, ngZone, schema) {
        this.eventManager = eventManager;
        this.document = document;
        this.ngZone = ngZone;
        this.schema = schema;
        this.data = Object.create(null);
        this.destroyNode = null;
    }
    destroy() { }
    createElement(name, namespace) {
        if (namespace) {
            const doc = this.document || ɵgetDOM().getDefaultDocument();
            return doc.createElementNS(ɵNAMESPACE_URIS[namespace], name);
        }
        return ɵgetDOM().createElement(name, this.document);
    }
    createComment(value) {
        return ɵgetDOM().getDefaultDocument().createComment(value);
    }
    createText(value) {
        const doc = ɵgetDOM().getDefaultDocument();
        return doc.createTextNode(value);
    }
    appendChild(parent, newChild) {
        const targetParent = isTemplateNode(parent) ? parent.content : parent;
        targetParent.appendChild(newChild);
    }
    insertBefore(parent, newChild, refChild) {
        if (parent) {
            const targetParent = isTemplateNode(parent) ? parent.content : parent;
            targetParent.insertBefore(newChild, refChild);
        }
    }
    removeChild(parent, oldChild) {
        if (parent) {
            parent.removeChild(oldChild);
        }
    }
    selectRootElement(selectorOrNode, preserveContent) {
        const el = typeof selectorOrNode === 'string' ? this.document.querySelector(selectorOrNode) :
            selectorOrNode;
        if (!el) {
            throw new Error(`The selector "${selectorOrNode}" did not match any elements`);
        }
        if (!preserveContent) {
            while (el.firstChild) {
                el.removeChild(el.firstChild);
            }
        }
        return el;
    }
    parentNode(node) {
        return node.parentNode;
    }
    nextSibling(node) {
        return node.nextSibling;
    }
    setAttribute(el, name, value, namespace) {
        if (namespace) {
            el.setAttributeNS(ɵNAMESPACE_URIS[namespace], namespace + ':' + name, value);
        }
        else {
            el.setAttribute(name, value);
        }
    }
    removeAttribute(el, name, namespace) {
        if (namespace) {
            el.removeAttributeNS(ɵNAMESPACE_URIS[namespace], name);
        }
        else {
            el.removeAttribute(name);
        }
    }
    addClass(el, name) {
        el.classList.add(name);
    }
    removeClass(el, name) {
        el.classList.remove(name);
    }
    setStyle(el, style, value, flags) {
        style = style.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        value = value == null ? '' : `${value}`.trim();
        const styleMap = _readStyleAttribute(el);
        if (flags & RendererStyleFlags2.Important) {
            value += ' !important';
        }
        styleMap[style] = value;
        _writeStyleAttribute(el, styleMap);
    }
    removeStyle(el, style, flags) {
        // IE requires '' instead of null
        // see https://github.com/angular/angular/issues/7916
        this.setStyle(el, style, '', flags);
    }
    // The value was validated already as a property binding, against the property name.
    // To know this value is safe to use as an attribute, the security context of the
    // attribute with the given name is checked against that security context of the
    // property.
    _isSafeToReflectProperty(tagName, propertyName) {
        return this.schema.securityContext(tagName, propertyName, true) ===
            this.schema.securityContext(tagName, propertyName, false);
    }
    setProperty(el, name, value) {
        checkNoSyntheticProp(name, 'property');
        if (name === 'innerText') {
            // Domino does not support innerText. Just map it to textContent.
            el.textContent = value;
        }
        el[name] = value;
        // Mirror property values for known HTML element properties in the attributes.
        // Skip `innerhtml` which is conservatively marked as an attribute for security
        // purposes but is not actually an attribute.
        const tagName = el.tagName.toLowerCase();
        if (value != null && (typeof value === 'number' || typeof value == 'string') &&
            name.toLowerCase() !== 'innerhtml' && this.schema.hasElement(tagName, EMPTY_ARRAY) &&
            this.schema.hasProperty(tagName, name, EMPTY_ARRAY) &&
            this._isSafeToReflectProperty(tagName, name)) {
            this.setAttribute(el, name, value.toString());
        }
    }
    setValue(node, value) {
        node.textContent = value;
    }
    listen(target, eventName, callback) {
        checkNoSyntheticProp(eventName, 'listener');
        if (typeof target === 'string') {
            return this.eventManager.addGlobalEventListener(target, eventName, this.decoratePreventDefault(callback));
        }
        return this.eventManager.addEventListener(target, eventName, this.decoratePreventDefault(callback));
    }
    decoratePreventDefault(eventHandler) {
        return (event) => {
            // Ivy uses `Function` as a special token that allows us to unwrap the function
            // so that it can be invoked programmatically by `DebugNode.triggerEventHandler`.
            if (event === Function) {
                return eventHandler;
            }
            // Run the event handler inside the ngZone because event handlers are not patched
            // by Zone on the server. This is required only for tests.
            const allowDefaultBehavior = this.ngZone.runGuarded(() => eventHandler(event));
            if (allowDefaultBehavior === false) {
                event.preventDefault();
                event.returnValue = false;
            }
            return undefined;
        };
    }
}
const AT_CHARCODE = '@'.charCodeAt(0);
function checkNoSyntheticProp(name, nameKind) {
    if (name.charCodeAt(0) === AT_CHARCODE) {
        throw new Error(`Unexpected synthetic ${nameKind} ${name} found. Please make sure that:
  - Either \`BrowserAnimationsModule\` or \`NoopAnimationsModule\` are imported in your application.
  - There is corresponding configuration for the animation named \`${name}\` defined in the \`animations\` field of the \`@Component\` decorator (see https://angular.io/api/core/Component#animations).`);
    }
}
function isTemplateNode(node) {
    return node.tagName === 'TEMPLATE' && node.content !== undefined;
}
class EmulatedEncapsulationServerRenderer2 extends DefaultServerRenderer2 {
    constructor(eventManager, document, ngZone, sharedStylesHost, schema, component) {
        super(eventManager, document, ngZone, schema);
        this.component = component;
        // Add a 's' prefix to style attributes to indicate server.
        const componentId = 's' + component.id;
        const styles = ɵflattenStyles(componentId, component.styles);
        sharedStylesHost.addStyles(styles);
        this.contentAttr = ɵshimContentAttribute(componentId);
        this.hostAttr = ɵshimHostAttribute(componentId);
    }
    applyToHost(element) {
        super.setAttribute(element, this.hostAttr, '');
    }
    createElement(parent, name) {
        const el = super.createElement(parent, name);
        super.setAttribute(el, this.contentAttr, '');
        return el;
    }
}
function _readStyleAttribute(element) {
    const styleMap = {};
    const styleAttribute = element.getAttribute('style');
    if (styleAttribute) {
        const styleList = styleAttribute.split(/;+/g);
        for (let i = 0; i < styleList.length; i++) {
            const style = styleList[i].trim();
            if (style.length > 0) {
                const colonIndex = style.indexOf(':');
                if (colonIndex === -1) {
                    throw new Error(`Invalid CSS style: ${style}`);
                }
                const name = style.slice(0, colonIndex).trim();
                styleMap[name] = style.slice(colonIndex + 1).trim();
            }
        }
    }
    return styleMap;
}
function _writeStyleAttribute(element, styleMap) {
    // We have to construct the `style` attribute ourselves, instead of going through
    // `element.style.setProperty` like the other renderers, because `setProperty` won't
    // write newer CSS properties that Domino doesn't know about like `clip-path`.
    let styleAttrValue = '';
    for (const key in styleMap) {
        const newValue = styleMap[key];
        if (newValue != null && newValue !== '') {
            styleAttrValue += key + ':' + newValue + ';';
        }
    }
    if (styleAttrValue) {
        element.setAttribute('style', styleAttrValue);
    }
    else {
        element.removeAttribute('style');
    }
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class ServerStylesHost extends ɵSharedStylesHost {
    constructor(doc, transitionId) {
        super();
        this.doc = doc;
        this.transitionId = transitionId;
        this.head = null;
        this._styleNodes = new Set();
        this.head = doc.getElementsByTagName('head')[0];
    }
    _addStyle(style) {
        let adapter = ɵgetDOM();
        const el = adapter.createElement('style');
        el.textContent = style;
        if (!!this.transitionId) {
            el.setAttribute('ng-transition', this.transitionId);
        }
        this.head.appendChild(el);
        this._styleNodes.add(el);
    }
    onStylesAdded(additions) {
        additions.forEach(style => this._addStyle(style));
    }
    ngOnDestroy() {
        this._styleNodes.forEach(styleNode => styleNode.remove());
    }
}
ServerStylesHost.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerStylesHost, deps: [{ token: DOCUMENT }, { token: ɵTRANSITION_ID, optional: true }], target: i0.ɵɵFactoryTarget.Injectable });
ServerStylesHost.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerStylesHost });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerStylesHost, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [ɵTRANSITION_ID]
                }] }]; } });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const TRANSFER_STATE_SERIALIZATION_PROVIDERS = [{
        provide: BEFORE_APP_SERIALIZED,
        useFactory: serializeTransferStateFactory,
        deps: [DOCUMENT, APP_ID, TransferState],
        multi: true,
    }];
function serializeTransferStateFactory(doc, appId, transferStore) {
    return () => {
        // The `.toJSON` here causes the `onSerialize` callbacks to be called.
        // These callbacks can be used to provide the value for a given key.
        const content = transferStore.toJson();
        if (transferStore.isEmpty) {
            // The state is empty, nothing to transfer,
            // avoid creating an extra `<script>` tag in this case.
            return;
        }
        const script = doc.createElement('script');
        script.id = appId + '-state';
        script.setAttribute('type', 'application/json');
        script.textContent = ɵescapeHtml(content);
        doc.body.appendChild(script);
    };
}
/**
 * NgModule to install on the server side while using the `TransferState` to transfer state from
 * server to client.
 *
 * Note: this module is not needed if the `renderApplication` function is used.
 * The `renderApplication` makes all providers from this module available in the application.
 *
 * @publicApi
 * @deprecated no longer needed, you can inject the `TransferState` in an app without providing
 *     this module.
 */
class ServerTransferStateModule {
}
ServerTransferStateModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerTransferStateModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
ServerTransferStateModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerTransferStateModule });
ServerTransferStateModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerTransferStateModule });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerTransferStateModule, decorators: [{
            type: NgModule,
            args: [{}]
        }] });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const INTERNAL_SERVER_PLATFORM_PROVIDERS = [
    { provide: DOCUMENT, useFactory: _document, deps: [Injector] },
    { provide: PLATFORM_ID, useValue: ɵPLATFORM_SERVER_ID },
    { provide: PLATFORM_INITIALIZER, useFactory: initDominoAdapter, multi: true }, {
        provide: PlatformLocation,
        useClass: ServerPlatformLocation,
        deps: [DOCUMENT, [Optional, INITIAL_CONFIG]]
    },
    { provide: PlatformState, deps: [DOCUMENT] },
    // Add special provider that allows multiple instances of platformServer* to be created.
    { provide: ɵALLOW_MULTIPLE_PLATFORMS, useValue: true }
];
function initDominoAdapter() {
    return () => {
        DominoAdapter.makeCurrent();
    };
}
function instantiateServerRendererFactory(renderer, engine, zone) {
    return new ɵAnimationRendererFactory(renderer, engine, zone);
}
const SERVER_RENDER_PROVIDERS = [
    ServerRendererFactory2,
    {
        provide: RendererFactory2,
        useFactory: instantiateServerRendererFactory,
        deps: [ServerRendererFactory2, ɵAnimationEngine, NgZone]
    },
    ServerStylesHost,
    { provide: ɵSharedStylesHost, useExisting: ServerStylesHost },
    { provide: EVENT_MANAGER_PLUGINS, multi: true, useClass: ServerEventManagerPlugin },
];
/**
 * The ng module for the server.
 *
 * @publicApi
 */
class ServerModule {
}
ServerModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
ServerModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerModule, imports: [HttpClientModule, NoopAnimationsModule], exports: [BrowserModule] });
ServerModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerModule, providers: [
        TRANSFER_STATE_SERIALIZATION_PROVIDERS,
        SERVER_RENDER_PROVIDERS,
        SERVER_HTTP_PROVIDERS,
        { provide: Testability, useValue: null },
        { provide: ɵTESTABILITY, useValue: null },
        { provide: ViewportScroller, useClass: ɵNullViewportScroller },
    ], imports: [HttpClientModule, NoopAnimationsModule, BrowserModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-1939ca0-with-local-changes", ngImport: i0, type: ServerModule, decorators: [{
            type: NgModule,
            args: [{
                    exports: [BrowserModule],
                    imports: [HttpClientModule, NoopAnimationsModule],
                    providers: [
                        TRANSFER_STATE_SERIALIZATION_PROVIDERS,
                        SERVER_RENDER_PROVIDERS,
                        SERVER_HTTP_PROVIDERS,
                        { provide: Testability, useValue: null },
                        { provide: ɵTESTABILITY, useValue: null },
                        { provide: ViewportScroller, useClass: ɵNullViewportScroller },
                    ],
                }]
        }] });
function _document(injector) {
    const config = injector.get(INITIAL_CONFIG, null);
    let document;
    if (config && config.document) {
        document = typeof config.document === 'string' ? parseDocument(config.document, config.url) :
            config.document;
    }
    else {
        document = ɵgetDOM().createHtmlDocument();
    }
    // Tell ivy about the global document
    ɵsetDocument(document);
    return document;
}
/**
 * @publicApi
 */
const platformServer = createPlatformFactory(platformCore, 'server', INTERNAL_SERVER_PLATFORM_PROVIDERS);
/**
 * The server platform that supports the runtime compiler.
 *
 * @publicApi
 */
const platformDynamicServer = createPlatformFactory(ɵplatformCoreDynamic, 'serverDynamic', INTERNAL_SERVER_PLATFORM_PROVIDERS);

var NodeNavigationStep;
(function (NodeNavigationStep) {
    NodeNavigationStep[NodeNavigationStep["FirstChild"] = 0] = "FirstChild";
    NodeNavigationStep[NodeNavigationStep["NextSibling"] = 1] = "NextSibling";
})(NodeNavigationStep || (NodeNavigationStep = {}));
/**
 * Generate a list of DOM navigation operations to get from node `start` to node `finish`.
 *
 * Note: assumes that node `start` occurs before node `finish` in an in-order traversal of the DOM
 * tree. That is, we should be able to get from `start` to `finish` purely by using `.firstChild`
 * and `.nextSibling` operations.
 */
function navigateBetween(start, finish) {
    if (start === finish) {
        return [];
    }
    else if (start.parentElement == null || finish.parentElement == null) {
        // throw new Error(`Ran off the top of the document when navigating between nodes`);
        console.log('Ran off the top of the document when navigating between nodes', start.tagName ?? start.nodeType, finish.tagName ?? finish.nodeType);
        return [];
    }
    else if (start.parentElement === finish.parentElement) {
        return navigateBetweenSiblings(start, finish);
    }
    else {
        // `finish` is a child of its parent, so the parent will always have a child.
        const parent = finish.parentElement;
        return [
            // First navigate to `finish`'s parent.
            ...navigateBetween(start, parent),
            // Then to its first child.
            NodeNavigationStep.FirstChild,
            // And finally from that node to `finish` (maybe a no-op if we're already there).
            ...navigateBetween(parent.firstChild, finish),
        ];
    }
}
function navigateBetweenSiblings(start, finish) {
    const nav = [];
    let node = null;
    for (node = start; node != null && node !== finish; node = node.nextSibling) {
        nav.push(NodeNavigationStep.NextSibling);
    }
    if (node === null) {
        // throw new Error(`Is finish before start? Hit end of siblings before finding start`);
        console.log(`Is finish before start? Hit end of siblings before finding start`);
        return [];
    }
    return nav;
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
var I18nCreateOpCode;
(function (I18nCreateOpCode) {
    I18nCreateOpCode[I18nCreateOpCode["SHIFT"] = 2] = "SHIFT";
    I18nCreateOpCode[I18nCreateOpCode["APPEND_EAGERLY"] = 1] = "APPEND_EAGERLY";
    I18nCreateOpCode[I18nCreateOpCode["COMMENT"] = 2] = "COMMENT";
})(I18nCreateOpCode || (I18nCreateOpCode = {}));
function isLContainer(value) {
    return Array.isArray(value) && value[ɵTYPE] === true;
}
function firstRNodeInElementContainer(tView, lView, tNode) {
    const rootNodes = [];
    // TODO: find more efficient way to do this. We don't need to traverse the entire
    // structure, we can just stop after examining the first node.
    ɵcollectNativeNodes(tView, lView, tNode, rootNodes);
    return rootNodes[0];
}
function isProjectionTNode(tNode) {
    return (tNode.type & 16 /* TNodeType.Projection */) === 16 /* TNodeType.Projection */;
}
function isTI18nNode(obj) {
    // TODO: consider adding a node type to TI18n?
    return obj.hasOwnProperty('create') && obj.hasOwnProperty('update');
}
function findClosestElementTNode(tNode) {
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
    const tView = lView[ɵTVIEW];
    for (let i = ɵHEADER_OFFSET; i < tView.bindingStartIndex; i++) {
        let targetNode = null;
        const adjustedIndex = i - ɵHEADER_OFFSET;
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
                    ngh.nodes[headTNode.index - ɵHEADER_OFFSET] = calcPathForNode(tView, lView, headTNode);
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
                ngh.templates[i - ɵHEADER_OFFSET] = getTViewSsrId(embeddedTView);
            }
            const hostNode = lView[i][ɵHOST];
            // LView[i][HOST] can be 2 different types: Either a DOM Node
            //  or an LView Array that represents a component
            // We only handle the DOM Node case here
            if (Array.isArray(hostNode)) {
                // this is a component
                targetNode = ɵunwrapRNode(hostNode);
                annotateForHydration(targetNode, hostNode);
            }
            else {
                // this is a regular node
                targetNode = ɵunwrapRNode(hostNode);
            }
            const container = serializeLContainer(lView[i], hostNode, adjustedIndex);
            ngh.containers[adjustedIndex] = container;
        }
        else if (Array.isArray(lView[i])) {
            // this is a component
            targetNode = ɵunwrapRNode(lView[i][ɵHOST]);
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
                ngh.nodes[tNode.index - ɵHEADER_OFFSET] = path;
                // }
            }
        }
        else if (tNode.insertBeforeIndex) {
            if (Array.isArray(tNode.insertBeforeIndex) && tNode.insertBeforeIndex[0] !== null) {
                // A root node within i18n block.
                // TODO: add a comment on *why* we need a path here.
                const path = calcPathForNode(tView, lView, tNode);
                ngh.nodes[tNode.index - ɵHEADER_OFFSET] = path;
            }
        }
        else {
            const tNodeType = tNode.type;
            // <ng-container> case
            if (tNodeType & 8 /* TNodeType.ElementContainer */) {
                const rootNodes = [];
                ɵcollectNativeNodes(tView, lView, tNode.child, rootNodes);
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
                    const index = nextTNode.index - ɵHEADER_OFFSET;
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
                    console.log('INDEX: ', i - ɵHEADER_OFFSET);
                    console.log('TAGNAME: ', targetNode.tagName);
                    ngh.nodes[i - ɵHEADER_OFFSET] = "-";
                    continue;
                }
                // Check if projection next is not the same as next, in which case
                // the node would not be found at creation time at runtime and we
                // need to provide a location to that node.
                if (tNode.projectionNext && tNode.projectionNext !== tNode.next) {
                    const nextProjectedTNode = tNode.projectionNext;
                    const index = nextProjectedTNode.index - ɵHEADER_OFFSET;
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
    const parentRNode = parentTNode === null ? lView[ɵHOST] : ɵunwrapRNode(lView[parentIndex]);
    let rNode = ɵunwrapRNode(lView[index]);
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
        path.unshift('' + (parentIndex - ɵHEADER_OFFSET));
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
    for (let i = ɵCONTAINER_HEADER_OFFSET; i < lContainer.length; i++) {
        let childLView = lContainer[i];
        // Get LView for underlying component.
        if (ɵisRootView(childLView)) {
            childLView = childLView[ɵHEADER_OFFSET];
        }
        const childTView = childLView[ɵTVIEW];
        let template;
        if (childTView.type === 1 /* TViewType.Component */) {
            const ctx = childLView[ɵCONTEXT];
            // TODO: this is a hack (we capture a component host element name),
            // we need a more stable solution here, for ex. a way to generate
            // a component id.
            template = ctx.constructor['ɵcmp'].selectors[0][0];
        }
        else {
            template = getTViewSsrId(childTView);
        }
        const rootNodes = [];
        ɵcollectNativeNodes(childTView, childLView, childTView.firstChild, rootNodes);
        container.views.push({
            template,
            numRootNodes: rootNodes.length,
            ...serializeLView(lContainer[i], hostNode),
        });
    }
    return container;
}
function getLViewFromRootElement(element) {
    const MONKEY_PATCH_KEY_NAME = '__ngContext__';
    const data = element[MONKEY_PATCH_KEY_NAME];
    let lView = typeof data === 'number' ? ɵgetLViewById(data) : data || null;
    if (!lView)
        throw new Error('not found'); // TODO: is it possible?
    if (ɵisRootView(lView)) {
        lView = lView[ɵHEADER_OFFSET];
    }
    return lView;
}
function annotateForHydration(element, lView) {
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
const SERVER_CONTEXT = new InjectionToken('SERVER_CONTEXT');
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
function renderModule(moduleType, options) {
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
function renderApplication(rootComponent, options) {
    const { document, url, platformProviders, appId } = options;
    const platform = _getPlatform(platformDynamicServer, { document, url, platformProviders });
    const appProviders = [
        importProvidersFrom(BrowserModule.withServerTransition({ appId })),
        importProvidersFrom(ServerModule),
        ...TRANSFER_STATE_SERIALIZATION_PROVIDERS,
        ...(options.providers ?? []),
    ];
    return _render(platform, ɵinternalCreateApplication({ rootComponent, appProviders }));
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
function renderModuleFactory(moduleFactory, options) {
    const { document, url, extraProviders: platformProviders } = options;
    const platform = _getPlatform(platformServer, { document, url, platformProviders });
    return _render(platform, platform.bootstrapModuleFactory(moduleFactory));
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * @publicApi
 */
const VERSION = new Version('15.1.0-next.2+sha-1939ca0-with-local-changes');

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// This file only reexports content of the `src` folder. Keep it that way.

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * Generated bundle index. Do not edit.
 */

export { BEFORE_APP_SERIALIZED, INITIAL_CONFIG, PlatformState, ServerModule, ServerTransferStateModule, VERSION, platformDynamicServer, platformServer, renderApplication, renderModule, renderModuleFactory, INTERNAL_SERVER_PLATFORM_PROVIDERS as ɵINTERNAL_SERVER_PLATFORM_PROVIDERS, SERVER_CONTEXT as ɵSERVER_CONTEXT, SERVER_RENDER_PROVIDERS as ɵSERVER_RENDER_PROVIDERS, ServerRendererFactory2 as ɵServerRendererFactory2, setDomTypes as ɵsetDomTypes };
//# sourceMappingURL=platform-server.mjs.map
