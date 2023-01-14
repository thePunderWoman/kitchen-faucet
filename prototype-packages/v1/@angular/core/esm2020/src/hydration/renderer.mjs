/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { getCurrentHydrationKey } from '../render3/state';
import { global } from '../util/global';
import { collectHydratableNodes } from './annotate';
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || !!ngDevMode;
// Make sure this flag is in sync with a similar one in `platform-server`.
// TODO: remove this flag eventually, we should always produce optimized keys.
const ENABLE_HYDRATION_KEY_COMPRESSION = false;
function assertNodeType(node, nodeType, key) {
    // TODO: improve error messages to make them more developer-friendly.
    if (!node) {
        throw new Error(`No node with the '${key}' key found in DOM.`);
    }
    if (node.nodeType !== nodeType) {
        const map = {
            [Node.ELEMENT_NODE]: 'ELEMENT_NODE',
            [Node.TEXT_NODE]: 'TEXT_NODE',
            [Node.COMMENT_NODE]: 'COMMENT_NODE',
        };
        throw new Error(`Unexpected node type for key ${key}! ` +
            `Expected ${map[nodeType] || nodeType}, ` +
            `but got ${map[node.nodeType] || node.nodeType}.`);
    }
}
function initDebugInfo(registry) {
    return {
        lastSeenRenderer: null,
        registry,
        hydratedNodes: 0,
        visitedNodes: 0,
        annotatedNodes: 0,
        initializedRenderersCount: 0,
    };
}
/**
 * Renderer that is invoked when an application hydrates after
 * being rendered on the server side. Once the hydration is completed,
 * this renderer just proxies calls to the regular DOM renderer.
 *
 * TODO:
 *  - Use `RuntimeError` for errors.
 *  - Better detect a situation when we can delegate to underlying renderer
 *    (we can probably do that sooner).
 */
export class HydrationRenderer {
    constructor(document, state, config, delegate) {
        this.document = document;
        this.state = state;
        this.config = config;
        this.delegate = delegate;
        this.data = {};
        this.destroyNode = null;
        /**
         * Debugging information collected during the renderer execution.
         * Use a single debug object instance for all initialized renderers.
         */
        this.debug = global.__ngHydrationRendererDebug__;
        if (NG_DEV_MODE) {
            if (!global.__ngHydrationRendererDebug__) {
                // Expose globally for testing purposes.
                global.__ngHydrationRendererDebug__ = this.debug = initDebugInfo(this.registry);
            }
            this.debug.lastSeenRenderer = this;
            this.debug.initializedRenderersCount++;
        }
    }
    destroy() { }
    createElement(name, namespace) {
        let element;
        const key = getCurrentHydrationKey();
        if (!key || this.state.inDeoptMode || !(element = this.extractFromRegistry(key))) {
            return this.delegate.createElement(name, namespace);
        }
        if (element.nodeType !== Node.ELEMENT_NODE ||
            element.tagName.toLowerCase() !== name.toLowerCase()) {
            // We found an element based on the annotation, but the
            // element is wrong, thus entering the deopt mode.
            this.enterDeoptMode(key);
            return this.delegate.createElement(name, namespace);
        }
        else {
            this.markAsHydrated(element);
            // The `ngh` attribute was only needed to transfer hydration data
            // over the wire. It has no utility once an app hydrates.
            element.removeAttribute('ngh');
            return element;
        }
    }
    createComment(value) {
        let comment;
        const key = getCurrentHydrationKey();
        if (!key || this.state.inDeoptMode || !(comment = this.extractFromRegistry(key))) {
            return this.delegate.createComment(value);
        }
        if (comment.nodeType !== Node.COMMENT_NODE) {
            // We found an element based on the annotation, but the
            // element is wrong, thus entering the deopt mode.
            this.enterDeoptMode(key);
            return this.delegate.createComment(value);
        }
        else {
            this.markAsHydrated(comment);
            return comment;
        }
    }
    createText(value) {
        let marker;
        const key = (getCurrentHydrationKey() ?? '').replace('|', '?');
        if (!key || this.state.inDeoptMode || !(marker = this.extractFromRegistry(key))) {
            return this.delegate.createText(value);
        }
        // TODO: handle i18n case!
        if (marker.nodeType !== Node.COMMENT_NODE) {
            // We found an element based on the annotation, but the
            // element is wrong, thus entering the deopt mode.
            this.enterDeoptMode(key);
            return this.delegate.createText(value);
        }
        else {
            let textNode = marker.previousSibling;
            if (!textNode && value === '') {
                // We found a marker, but there is no text node in front of it.
                // This is likely due to the serialization where empty text nodes
                // are not present in an HTML, i.e. `<div><!23?1></div>`.
                // In this case - just create a text node using delegate renderer.
                textNode = this.delegate.createText(value);
            }
            else {
                NG_DEV_MODE && assertNodeType(textNode, Node.TEXT_NODE, key);
                this.markAsHydrated(textNode);
            }
            // This marker was only needed to carry over info
            // over the wire, it has no utility once app hydrates.
            marker.remove();
            return textNode;
        }
    }
    appendChild(parent, newChild) {
        if (newChild.__skipInsertion) {
            // Reset the flag for future operations if needed.
            newChild.__skipInsertion = false;
            return;
        }
        return this.delegate.appendChild(parent, newChild);
    }
    insertBefore(parent, newChild, refChild) {
        if (newChild.__skipInsertion) {
            // Reset the flag for future operations if needed.
            newChild.__skipInsertion = false;
            return;
        }
        return this.delegate.insertBefore(parent, newChild, refChild);
    }
    removeChild(parent, oldChild) {
        return this.delegate.removeChild(parent, oldChild);
    }
    // TODO: we should delegate here at some point.
    selectRootElement(selectorOrNode) {
        let element;
        if (typeof selectorOrNode === 'string') {
            element = this.document.querySelector(selectorOrNode);
            if (!element) {
                throw new Error(`The selector "${selectorOrNode}" did not match any elements`);
            }
        }
        else {
            element = selectorOrNode;
        }
        this.root = element;
        if (NG_DEV_MODE) {
            this.debug.root = element;
        }
        this.markAsHydrated(element);
        this.populateNodeRegistry();
        // The `ngh` attribute was only needed to transfer hydration data
        // over the wire. It has no utility once an app hydrates.
        element.removeAttribute('ngh');
        return element;
    }
    get registry() {
        return this.state.registry;
    }
    /**
     * Switches the renderer to the deopt mode:
     *  - stores the flag in a global state
     *  - removes all annotated DOM nodes, so they are re-created
     *    by the runtime logic from scratch (thus "deopt")
     */
    enterDeoptMode(key) {
        this.state.inDeoptMode = true;
        if (this.config.isStrictMode) {
            throw new Error(`Hydration renderer was unable to find proper node for key ${key}.`);
        }
        console.warn(`Entering deoptimized hydration mode starting from node with key: ${key}.`);
        this.registry.forEach((node, key) => {
            if (key.indexOf('?') > -1) { // this is a marker node
                const textNode = node.previousSibling;
                textNode?.remove();
            }
            node.remove();
        });
        this.registry.clear();
    }
    /**
     * Marks a node as "hydrated" or visited during
     * the hydration process.
     */
    markAsHydrated(node) {
        if (NG_DEV_MODE) {
            // Indicate that this node was processed
            // by the hydration logic, so we can verify
            // that we visited all nodes in tests.
            node.__hydrated = true;
        }
        node.__skipInsertion = true;
    }
    /**
     * Retrieves an entry from the node registry and removes a reference
     * from the registry. One element should be mapped just once, removing
     * it from the registry ensures no memory leaks.
     */
    extractFromRegistry(key) {
        const node = this.registry.get(key);
        if (NG_DEV_MODE && node) {
            this.debug.hydratedNodes++;
        }
        this.registry.delete(key);
        return node;
    }
    /**
     * Goes over the DOM structure to find and extract
     * nodes that were annotated during the SSR process.
     */
    populateNodeRegistry() {
        // TODO: an app may have multiple root components
        // and the `selectRootElement` function (thus this one as well)
        // would be called multiple times. Make sure we have registries
        // for each root component (and registries initialized lazily).
        if (this.state.isRegistryPopulated) {
            // The registry is already populated, exit.
            return;
        }
        this.state.isRegistryPopulated = true;
        NG_DEV_MODE && console.time('HydrationRenderer.populateNodeRegistry');
        const visitedNodes = collectHydratableNodes(this.root, this.registry, ENABLE_HYDRATION_KEY_COMPRESSION);
        if (NG_DEV_MODE) {
            console.timeEnd('HydrationRenderer.populateNodeRegistry');
            this.debug.visitedNodes = visitedNodes;
            this.debug.annotatedNodes = this.registry.size;
        }
    }
    parentNode(node) {
        return this.delegate.parentNode(node);
    }
    nextSibling(node) {
        return this.delegate.nextSibling(node);
    }
    setAttribute(el, name, value, namespace) {
        return this.delegate.setAttribute(el, name, value, namespace);
    }
    removeAttribute(el, name, namespace) {
        return this.delegate.removeAttribute(el, name, namespace);
    }
    addClass(el, name) {
        return this.delegate.addClass(el, name);
    }
    removeClass(el, name) {
        return this.delegate.removeClass(el, name);
    }
    setStyle(el, style, value, flags) {
        return this.delegate.setStyle(el, style, value, flags);
    }
    removeStyle(el, style, flags) {
        return this.delegate.removeStyle(el, style, flags);
    }
    setProperty(el, name, value) {
        return this.delegate.setProperty(el, name, value);
    }
    setValue(node, value) {
        return this.delegate.setValue(node, value);
    }
    listen(target, eventName, callback) {
        return this.delegate.listen(target, eventName, callback);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBSUgsT0FBTyxFQUFDLHNCQUFzQixFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDeEQsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXRDLE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUVsRCxNQUFNLFdBQVcsR0FBRyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUVwRSwwRUFBMEU7QUFDMUUsOEVBQThFO0FBQzlFLE1BQU0sZ0NBQWdDLEdBQUcsS0FBSyxDQUFDO0FBNkIvQyxTQUFTLGNBQWMsQ0FBQyxJQUFTLEVBQUUsUUFBZ0IsRUFBRSxHQUFXO0lBQzlELHFFQUFxRTtJQUNyRSxJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDO0tBQ2hFO0lBRUQsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRTtRQUM5QixNQUFNLEdBQUcsR0FBUTtZQUNmLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLGNBQWM7WUFDbkMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsV0FBVztZQUM3QixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxjQUFjO1NBQ3BDLENBQUM7UUFDRixNQUFNLElBQUksS0FBSyxDQUNYLGdDQUFnQyxHQUFHLElBQUk7WUFDdkMsWUFBWSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksUUFBUSxJQUFJO1lBQ3pDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztLQUN4RDtBQUNILENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxRQUE4QjtJQUNuRCxPQUFPO1FBQ0wsZ0JBQWdCLEVBQUUsSUFBSTtRQUN0QixRQUFRO1FBQ1IsYUFBYSxFQUFFLENBQUM7UUFDaEIsWUFBWSxFQUFFLENBQUM7UUFDZixjQUFjLEVBQUUsQ0FBQztRQUNqQix5QkFBeUIsRUFBRSxDQUFDO0tBQzdCLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQVc1QixZQUNZLFFBQWEsRUFBVSxLQUFxQixFQUFVLE1BQXVCLEVBQzdFLFFBQW1CO1FBRG5CLGFBQVEsR0FBUixRQUFRLENBQUs7UUFBVSxVQUFLLEdBQUwsS0FBSyxDQUFnQjtRQUFVLFdBQU0sR0FBTixNQUFNLENBQWlCO1FBQzdFLGFBQVEsR0FBUixRQUFRLENBQVc7UUFaL0IsU0FBSSxHQUFRLEVBQUUsQ0FBQztRQUNmLGdCQUFXLEdBQUcsSUFBSSxDQUFDO1FBR25COzs7V0FHRztRQUNLLFVBQUssR0FBd0IsTUFBYyxDQUFDLDRCQUE0QixDQUFDO1FBSy9FLElBQUksV0FBVyxFQUFFO1lBQ2YsSUFBSSxDQUFFLE1BQWMsQ0FBQyw0QkFBNEIsRUFBRTtnQkFDakQsd0NBQXdDO2dCQUN2QyxNQUFjLENBQUMsNEJBQTRCLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzFGO1lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7WUFDbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyx5QkFBMEIsRUFBRSxDQUFDO1NBQ3pDO0lBQ0gsQ0FBQztJQUVELE9BQU8sS0FBVSxDQUFDO0lBRWxCLGFBQWEsQ0FBQyxJQUFZLEVBQUUsU0FBa0I7UUFDNUMsSUFBSSxPQUFPLENBQUM7UUFDWixNQUFNLEdBQUcsR0FBRyxzQkFBc0IsRUFBRSxDQUFDO1FBRXJDLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtZQUNoRixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztTQUNyRDtRQUVELElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsWUFBWTtZQUN0QyxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUN4RCx1REFBdUQ7WUFDdkQsa0RBQWtEO1lBQ2xELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFekIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7U0FDckQ7YUFBTTtZQUNMLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFN0IsaUVBQWlFO1lBQ2pFLHlEQUF5RDtZQUN6RCxPQUFPLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRS9CLE9BQU8sT0FBTyxDQUFDO1NBQ2hCO0lBQ0gsQ0FBQztJQUVELGFBQWEsQ0FBQyxLQUFhO1FBQ3pCLElBQUksT0FBTyxDQUFDO1FBQ1osTUFBTSxHQUFHLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztRQUVyQyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDaEYsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUMzQztRQUVELElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQzFDLHVEQUF1RDtZQUN2RCxrREFBa0Q7WUFDbEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUV6QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzNDO2FBQU07WUFDTCxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRTdCLE9BQU8sT0FBTyxDQUFDO1NBQ2hCO0lBQ0gsQ0FBQztJQUVELFVBQVUsQ0FBQyxLQUFhO1FBQ3RCLElBQUksTUFBTSxDQUFDO1FBQ1gsTUFBTSxHQUFHLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFL0QsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQy9FLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDeEM7UUFFRCwwQkFBMEI7UUFFMUIsSUFBSSxNQUFNLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDekMsdURBQXVEO1lBQ3ZELGtEQUFrRDtZQUNsRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXpCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDeEM7YUFBTTtZQUNMLElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUM7WUFDdEMsSUFBSSxDQUFDLFFBQVEsSUFBSSxLQUFLLEtBQUssRUFBRSxFQUFFO2dCQUM3QiwrREFBK0Q7Z0JBQy9ELGlFQUFpRTtnQkFDakUseURBQXlEO2dCQUN6RCxrRUFBa0U7Z0JBQ2xFLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUM1QztpQkFBTTtnQkFDTCxXQUFXLElBQUksY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUM3RCxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQy9CO1lBRUQsaURBQWlEO1lBQ2pELHNEQUFzRDtZQUN0RCxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFFaEIsT0FBTyxRQUFRLENBQUM7U0FDakI7SUFDSCxDQUFDO0lBRUQsV0FBVyxDQUFDLE1BQVcsRUFBRSxRQUFhO1FBQ3BDLElBQUksUUFBUSxDQUFDLGVBQWUsRUFBRTtZQUM1QixrREFBa0Q7WUFDbEQsUUFBUSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7WUFDakMsT0FBTztTQUNSO1FBRUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELFlBQVksQ0FBQyxNQUFXLEVBQUUsUUFBYSxFQUFFLFFBQWE7UUFDcEQsSUFBSSxRQUFRLENBQUMsZUFBZSxFQUFFO1lBQzVCLGtEQUFrRDtZQUNsRCxRQUFRLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQztZQUNqQyxPQUFPO1NBQ1I7UUFFRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELFdBQVcsQ0FBQyxNQUFXLEVBQUUsUUFBYTtRQUNwQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQsK0NBQStDO0lBQy9DLGlCQUFpQixDQUFDLGNBQTBCO1FBQzFDLElBQUksT0FBWSxDQUFDO1FBQ2pCLElBQUksT0FBTyxjQUFjLEtBQUssUUFBUSxFQUFFO1lBQ3RDLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN0RCxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLGNBQWMsOEJBQThCLENBQUMsQ0FBQzthQUNoRjtTQUNGO2FBQU07WUFDTCxPQUFPLEdBQUcsY0FBYyxDQUFDO1NBQzFCO1FBQ0QsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7UUFDcEIsSUFBSSxXQUFXLEVBQUU7WUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7U0FDM0I7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBRTVCLGlFQUFpRTtRQUNqRSx5REFBeUQ7UUFDekQsT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUUvQixPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0lBRUQsSUFBWSxRQUFRO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7SUFDN0IsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssY0FBYyxDQUFDLEdBQVc7UUFDaEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQzlCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUU7WUFDNUIsTUFBTSxJQUFJLEtBQUssQ0FBQyw2REFBNkQsR0FBRyxHQUFHLENBQUMsQ0FBQztTQUN0RjtRQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsb0VBQW9FLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDekYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDbEMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUcsd0JBQXdCO2dCQUNwRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDO2dCQUN0QyxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUM7YUFDcEI7WUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFRDs7O09BR0c7SUFDSyxjQUFjLENBQUMsSUFBUztRQUM5QixJQUFJLFdBQVcsRUFBRTtZQUNmLHdDQUF3QztZQUN4QywyQ0FBMkM7WUFDM0Msc0NBQXNDO1lBQ3RDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1NBQ3hCO1FBQ0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7SUFDOUIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSyxtQkFBbUIsQ0FBQyxHQUFXO1FBQ3JDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtZQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWMsRUFBRSxDQUFDO1NBQzdCO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssb0JBQW9CO1FBQzFCLGlEQUFpRDtRQUNqRCwrREFBK0Q7UUFDL0QsK0RBQStEO1FBQy9ELCtEQUErRDtRQUMvRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUU7WUFDbEMsMkNBQTJDO1lBQzNDLE9BQU87U0FDUjtRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1FBRXRDLFdBQVcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxDQUFDLENBQUM7UUFFdEUsTUFBTSxZQUFZLEdBQ2Qsc0JBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLGdDQUFnQyxDQUFDLENBQUM7UUFFdkYsSUFBSSxXQUFXLEVBQUU7WUFDZixPQUFPLENBQUMsT0FBTyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7WUFDMUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQztJQUVELFVBQVUsQ0FBQyxJQUFTO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVELFdBQVcsQ0FBQyxJQUFTO1FBQ25CLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVELFlBQVksQ0FBQyxFQUFPLEVBQUUsSUFBWSxFQUFFLEtBQWEsRUFBRSxTQUFrQjtRQUNuRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxlQUFlLENBQUMsRUFBTyxFQUFFLElBQVksRUFBRSxTQUFrQjtRQUN2RCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVELFFBQVEsQ0FBQyxFQUFPLEVBQUUsSUFBWTtRQUM1QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsV0FBVyxDQUFDLEVBQU8sRUFBRSxJQUFZO1FBQy9CLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCxRQUFRLENBQUMsRUFBTyxFQUFFLEtBQWEsRUFBRSxLQUFVLEVBQUUsS0FBMEI7UUFDckUsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQsV0FBVyxDQUFDLEVBQU8sRUFBRSxLQUFhLEVBQUUsS0FBMEI7UUFDNUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCxXQUFXLENBQUMsRUFBTyxFQUFFLElBQVksRUFBRSxLQUFVO1FBQzNDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsUUFBUSxDQUFDLElBQVMsRUFBRSxLQUFhO1FBQy9CLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCxNQUFNLENBQ0YsTUFBc0MsRUFBRSxTQUFpQixFQUN6RCxRQUFpQztRQUNuQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDM0QsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UmVuZGVyZXIyLCBSZW5kZXJlclN0eWxlRmxhZ3MyfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtnZXRDdXJyZW50SHlkcmF0aW9uS2V5fSBmcm9tICcuLi9yZW5kZXIzL3N0YXRlJztcbmltcG9ydCB7Z2xvYmFsfSBmcm9tICcuLi91dGlsL2dsb2JhbCc7XG5cbmltcG9ydCB7Y29sbGVjdEh5ZHJhdGFibGVOb2Rlc30gZnJvbSAnLi9hbm5vdGF0ZSc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgISFuZ0Rldk1vZGU7XG5cbi8vIE1ha2Ugc3VyZSB0aGlzIGZsYWcgaXMgaW4gc3luYyB3aXRoIGEgc2ltaWxhciBvbmUgaW4gYHBsYXRmb3JtLXNlcnZlcmAuXG4vLyBUT0RPOiByZW1vdmUgdGhpcyBmbGFnIGV2ZW50dWFsbHksIHdlIHNob3VsZCBhbHdheXMgcHJvZHVjZSBvcHRpbWl6ZWQga2V5cy5cbmNvbnN0IEVOQUJMRV9IWURSQVRJT05fS0VZX0NPTVBSRVNTSU9OID0gZmFsc2U7XG5cbi8qKlxuICogUmVwcmVzZW50cyBoeWRyYXRpb24gc3RhdGUgZm9yIGFuIGFwcGxpY2F0aW9uLlxuICpcbiAqIFRPRE86IHRoaXMgc3RhdGUgc2hvdWxkIGJlIHJlZmFjdG9yZWQgdG8gZnVuY3Rpb24gY29ycmVjdGx5IHdpdGhcbiAqIG1vcmUgdGhhbiBvbmUgcm9vdCBjb21wb25lbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSHlkcmF0aW9uU3RhdGUge1xuICBpbkRlb3B0TW9kZTogYm9vbGVhbjtcbiAgaXNSZWdpc3RyeVBvcHVsYXRlZDogYm9vbGVhbjtcbiAgcmVnaXN0cnk6IE1hcDxzdHJpbmcsIEVsZW1lbnQ+OyAgLy8gcmVnaXN0cnkgb2YgYWxsIGFubm90YXRlZCBlbGVtZW50cyBmb3VuZCBvbiBhIHBhZ2VcbiAgZGVidWc6IHtba2V5OiBzdHJpbmddOiBhbnl9OyAgICAgLy8gZGVidWcgaW5mbyBjb2xsZWN0ZWQgZHVyaW5nIHRoZSBpbnZvY2F0aW9uXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSHlkcmF0aW9uQ29uZmlnIHtcbiAgaXNTdHJpY3RNb2RlOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgSHlkcmF0aW9uRGVidWdJbmZvIHtcbiAgbGFzdFNlZW5SZW5kZXJlcj86IFJlbmRlcmVyMnxudWxsO1xuICByZWdpc3RyeT86IE1hcDxhbnksIGFueT47XG4gIGh5ZHJhdGVkTm9kZXM/OiBudW1iZXI7XG4gIHZpc2l0ZWROb2Rlcz86IG51bWJlcjtcbiAgYW5ub3RhdGVkTm9kZXM/OiBudW1iZXI7XG4gIHJvb3Q/OiBhbnk7XG4gIGluaXRpYWxpemVkUmVuZGVyZXJzQ291bnQ/OiBudW1iZXI7XG59XG5cbmZ1bmN0aW9uIGFzc2VydE5vZGVUeXBlKG5vZGU6IGFueSwgbm9kZVR5cGU6IG51bWJlciwga2V5OiBzdHJpbmcpIHtcbiAgLy8gVE9ETzogaW1wcm92ZSBlcnJvciBtZXNzYWdlcyB0byBtYWtlIHRoZW0gbW9yZSBkZXZlbG9wZXItZnJpZW5kbHkuXG4gIGlmICghbm9kZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgTm8gbm9kZSB3aXRoIHRoZSAnJHtrZXl9JyBrZXkgZm91bmQgaW4gRE9NLmApO1xuICB9XG5cbiAgaWYgKG5vZGUubm9kZVR5cGUgIT09IG5vZGVUeXBlKSB7XG4gICAgY29uc3QgbWFwOiBhbnkgPSB7XG4gICAgICBbTm9kZS5FTEVNRU5UX05PREVdOiAnRUxFTUVOVF9OT0RFJyxcbiAgICAgIFtOb2RlLlRFWFRfTk9ERV06ICdURVhUX05PREUnLFxuICAgICAgW05vZGUuQ09NTUVOVF9OT0RFXTogJ0NPTU1FTlRfTk9ERScsXG4gICAgfTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBVbmV4cGVjdGVkIG5vZGUgdHlwZSBmb3Iga2V5ICR7a2V5fSEgYCArXG4gICAgICAgIGBFeHBlY3RlZCAke21hcFtub2RlVHlwZV0gfHwgbm9kZVR5cGV9LCBgICtcbiAgICAgICAgYGJ1dCBnb3QgJHttYXBbbm9kZS5ub2RlVHlwZV0gfHwgbm9kZS5ub2RlVHlwZX0uYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdERlYnVnSW5mbyhyZWdpc3RyeTogTWFwPHN0cmluZywgRWxlbWVudD4pIHtcbiAgcmV0dXJuIHtcbiAgICBsYXN0U2VlblJlbmRlcmVyOiBudWxsLFxuICAgIHJlZ2lzdHJ5LFxuICAgIGh5ZHJhdGVkTm9kZXM6IDAsXG4gICAgdmlzaXRlZE5vZGVzOiAwLFxuICAgIGFubm90YXRlZE5vZGVzOiAwLFxuICAgIGluaXRpYWxpemVkUmVuZGVyZXJzQ291bnQ6IDAsXG4gIH07XG59XG5cbi8qKlxuICogUmVuZGVyZXIgdGhhdCBpcyBpbnZva2VkIHdoZW4gYW4gYXBwbGljYXRpb24gaHlkcmF0ZXMgYWZ0ZXJcbiAqIGJlaW5nIHJlbmRlcmVkIG9uIHRoZSBzZXJ2ZXIgc2lkZS4gT25jZSB0aGUgaHlkcmF0aW9uIGlzIGNvbXBsZXRlZCxcbiAqIHRoaXMgcmVuZGVyZXIganVzdCBwcm94aWVzIGNhbGxzIHRvIHRoZSByZWd1bGFyIERPTSByZW5kZXJlci5cbiAqXG4gKiBUT0RPOlxuICogIC0gVXNlIGBSdW50aW1lRXJyb3JgIGZvciBlcnJvcnMuXG4gKiAgLSBCZXR0ZXIgZGV0ZWN0IGEgc2l0dWF0aW9uIHdoZW4gd2UgY2FuIGRlbGVnYXRlIHRvIHVuZGVybHlpbmcgcmVuZGVyZXJcbiAqICAgICh3ZSBjYW4gcHJvYmFibHkgZG8gdGhhdCBzb29uZXIpLlxuICovXG5leHBvcnQgY2xhc3MgSHlkcmF0aW9uUmVuZGVyZXIge1xuICBkYXRhOiBhbnkgPSB7fTtcbiAgZGVzdHJveU5vZGUgPSBudWxsO1xuICBwcml2YXRlIHJvb3Q/OiBFbGVtZW50OyAgLy8gcm9vdCBlbGVtZW50IHJlZmVyZW5jZVxuXG4gIC8qKlxuICAgKiBEZWJ1Z2dpbmcgaW5mb3JtYXRpb24gY29sbGVjdGVkIGR1cmluZyB0aGUgcmVuZGVyZXIgZXhlY3V0aW9uLlxuICAgKiBVc2UgYSBzaW5nbGUgZGVidWcgb2JqZWN0IGluc3RhbmNlIGZvciBhbGwgaW5pdGlhbGl6ZWQgcmVuZGVyZXJzLlxuICAgKi9cbiAgcHJpdmF0ZSBkZWJ1ZzogSHlkcmF0aW9uRGVidWdJbmZvID0gKGdsb2JhbCBhcyBhbnkpLl9fbmdIeWRyYXRpb25SZW5kZXJlckRlYnVnX187XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGRvY3VtZW50OiBhbnksIHByaXZhdGUgc3RhdGU6IEh5ZHJhdGlvblN0YXRlLCBwcml2YXRlIGNvbmZpZzogSHlkcmF0aW9uQ29uZmlnLFxuICAgICAgcHJpdmF0ZSBkZWxlZ2F0ZTogUmVuZGVyZXIyKSB7XG4gICAgaWYgKE5HX0RFVl9NT0RFKSB7XG4gICAgICBpZiAoIShnbG9iYWwgYXMgYW55KS5fX25nSHlkcmF0aW9uUmVuZGVyZXJEZWJ1Z19fKSB7XG4gICAgICAgIC8vIEV4cG9zZSBnbG9iYWxseSBmb3IgdGVzdGluZyBwdXJwb3Nlcy5cbiAgICAgICAgKGdsb2JhbCBhcyBhbnkpLl9fbmdIeWRyYXRpb25SZW5kZXJlckRlYnVnX18gPSB0aGlzLmRlYnVnID0gaW5pdERlYnVnSW5mbyh0aGlzLnJlZ2lzdHJ5KTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZGVidWcubGFzdFNlZW5SZW5kZXJlciA9IHRoaXM7XG4gICAgICB0aGlzLmRlYnVnLmluaXRpYWxpemVkUmVuZGVyZXJzQ291bnQhKys7XG4gICAgfVxuICB9XG5cbiAgZGVzdHJveSgpOiB2b2lkIHt9XG5cbiAgY3JlYXRlRWxlbWVudChuYW1lOiBzdHJpbmcsIG5hbWVzcGFjZT86IHN0cmluZyk6IGFueSB7XG4gICAgbGV0IGVsZW1lbnQ7XG4gICAgY29uc3Qga2V5ID0gZ2V0Q3VycmVudEh5ZHJhdGlvbktleSgpO1xuXG4gICAgaWYgKCFrZXkgfHwgdGhpcy5zdGF0ZS5pbkRlb3B0TW9kZSB8fCAhKGVsZW1lbnQgPSB0aGlzLmV4dHJhY3RGcm9tUmVnaXN0cnkoa2V5KSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmNyZWF0ZUVsZW1lbnQobmFtZSwgbmFtZXNwYWNlKTtcbiAgICB9XG5cbiAgICBpZiAoZWxlbWVudC5ub2RlVHlwZSAhPT0gTm9kZS5FTEVNRU5UX05PREUgfHxcbiAgICAgICAgZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgIT09IG5hbWUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgLy8gV2UgZm91bmQgYW4gZWxlbWVudCBiYXNlZCBvbiB0aGUgYW5ub3RhdGlvbiwgYnV0IHRoZVxuICAgICAgLy8gZWxlbWVudCBpcyB3cm9uZywgdGh1cyBlbnRlcmluZyB0aGUgZGVvcHQgbW9kZS5cbiAgICAgIHRoaXMuZW50ZXJEZW9wdE1vZGUoa2V5KTtcblxuICAgICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuY3JlYXRlRWxlbWVudChuYW1lLCBuYW1lc3BhY2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm1hcmtBc0h5ZHJhdGVkKGVsZW1lbnQpO1xuXG4gICAgICAvLyBUaGUgYG5naGAgYXR0cmlidXRlIHdhcyBvbmx5IG5lZWRlZCB0byB0cmFuc2ZlciBoeWRyYXRpb24gZGF0YVxuICAgICAgLy8gb3ZlciB0aGUgd2lyZS4gSXQgaGFzIG5vIHV0aWxpdHkgb25jZSBhbiBhcHAgaHlkcmF0ZXMuXG4gICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnbmdoJyk7XG5cbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZUNvbW1lbnQodmFsdWU6IHN0cmluZyk6IGFueSB7XG4gICAgbGV0IGNvbW1lbnQ7XG4gICAgY29uc3Qga2V5ID0gZ2V0Q3VycmVudEh5ZHJhdGlvbktleSgpO1xuXG4gICAgaWYgKCFrZXkgfHwgdGhpcy5zdGF0ZS5pbkRlb3B0TW9kZSB8fCAhKGNvbW1lbnQgPSB0aGlzLmV4dHJhY3RGcm9tUmVnaXN0cnkoa2V5KSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmNyZWF0ZUNvbW1lbnQodmFsdWUpO1xuICAgIH1cblxuICAgIGlmIChjb21tZW50Lm5vZGVUeXBlICE9PSBOb2RlLkNPTU1FTlRfTk9ERSkge1xuICAgICAgLy8gV2UgZm91bmQgYW4gZWxlbWVudCBiYXNlZCBvbiB0aGUgYW5ub3RhdGlvbiwgYnV0IHRoZVxuICAgICAgLy8gZWxlbWVudCBpcyB3cm9uZywgdGh1cyBlbnRlcmluZyB0aGUgZGVvcHQgbW9kZS5cbiAgICAgIHRoaXMuZW50ZXJEZW9wdE1vZGUoa2V5KTtcblxuICAgICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuY3JlYXRlQ29tbWVudCh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubWFya0FzSHlkcmF0ZWQoY29tbWVudCk7XG5cbiAgICAgIHJldHVybiBjb21tZW50O1xuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZVRleHQodmFsdWU6IHN0cmluZyk6IGFueSB7XG4gICAgbGV0IG1hcmtlcjtcbiAgICBjb25zdCBrZXkgPSAoZ2V0Q3VycmVudEh5ZHJhdGlvbktleSgpID8/ICcnKS5yZXBsYWNlKCd8JywgJz8nKTtcblxuICAgIGlmICgha2V5IHx8IHRoaXMuc3RhdGUuaW5EZW9wdE1vZGUgfHwgIShtYXJrZXIgPSB0aGlzLmV4dHJhY3RGcm9tUmVnaXN0cnkoa2V5KSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmNyZWF0ZVRleHQodmFsdWUpO1xuICAgIH1cblxuICAgIC8vIFRPRE86IGhhbmRsZSBpMThuIGNhc2UhXG5cbiAgICBpZiAobWFya2VyLm5vZGVUeXBlICE9PSBOb2RlLkNPTU1FTlRfTk9ERSkge1xuICAgICAgLy8gV2UgZm91bmQgYW4gZWxlbWVudCBiYXNlZCBvbiB0aGUgYW5ub3RhdGlvbiwgYnV0IHRoZVxuICAgICAgLy8gZWxlbWVudCBpcyB3cm9uZywgdGh1cyBlbnRlcmluZyB0aGUgZGVvcHQgbW9kZS5cbiAgICAgIHRoaXMuZW50ZXJEZW9wdE1vZGUoa2V5KTtcblxuICAgICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuY3JlYXRlVGV4dCh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB0ZXh0Tm9kZSA9IG1hcmtlci5wcmV2aW91c1NpYmxpbmc7XG4gICAgICBpZiAoIXRleHROb2RlICYmIHZhbHVlID09PSAnJykge1xuICAgICAgICAvLyBXZSBmb3VuZCBhIG1hcmtlciwgYnV0IHRoZXJlIGlzIG5vIHRleHQgbm9kZSBpbiBmcm9udCBvZiBpdC5cbiAgICAgICAgLy8gVGhpcyBpcyBsaWtlbHkgZHVlIHRvIHRoZSBzZXJpYWxpemF0aW9uIHdoZXJlIGVtcHR5IHRleHQgbm9kZXNcbiAgICAgICAgLy8gYXJlIG5vdCBwcmVzZW50IGluIGFuIEhUTUwsIGkuZS4gYDxkaXY+PCEyMz8xPjwvZGl2PmAuXG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSAtIGp1c3QgY3JlYXRlIGEgdGV4dCBub2RlIHVzaW5nIGRlbGVnYXRlIHJlbmRlcmVyLlxuICAgICAgICB0ZXh0Tm9kZSA9IHRoaXMuZGVsZWdhdGUuY3JlYXRlVGV4dCh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBOR19ERVZfTU9ERSAmJiBhc3NlcnROb2RlVHlwZSh0ZXh0Tm9kZSwgTm9kZS5URVhUX05PREUsIGtleSk7XG4gICAgICAgIHRoaXMubWFya0FzSHlkcmF0ZWQodGV4dE5vZGUpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGlzIG1hcmtlciB3YXMgb25seSBuZWVkZWQgdG8gY2Fycnkgb3ZlciBpbmZvXG4gICAgICAvLyBvdmVyIHRoZSB3aXJlLCBpdCBoYXMgbm8gdXRpbGl0eSBvbmNlIGFwcCBoeWRyYXRlcy5cbiAgICAgIG1hcmtlci5yZW1vdmUoKTtcblxuICAgICAgcmV0dXJuIHRleHROb2RlO1xuICAgIH1cbiAgfVxuXG4gIGFwcGVuZENoaWxkKHBhcmVudDogYW55LCBuZXdDaGlsZDogYW55KTogdm9pZCB7XG4gICAgaWYgKG5ld0NoaWxkLl9fc2tpcEluc2VydGlvbikge1xuICAgICAgLy8gUmVzZXQgdGhlIGZsYWcgZm9yIGZ1dHVyZSBvcGVyYXRpb25zIGlmIG5lZWRlZC5cbiAgICAgIG5ld0NoaWxkLl9fc2tpcEluc2VydGlvbiA9IGZhbHNlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmFwcGVuZENoaWxkKHBhcmVudCwgbmV3Q2hpbGQpO1xuICB9XG5cbiAgaW5zZXJ0QmVmb3JlKHBhcmVudDogYW55LCBuZXdDaGlsZDogYW55LCByZWZDaGlsZDogYW55KTogdm9pZCB7XG4gICAgaWYgKG5ld0NoaWxkLl9fc2tpcEluc2VydGlvbikge1xuICAgICAgLy8gUmVzZXQgdGhlIGZsYWcgZm9yIGZ1dHVyZSBvcGVyYXRpb25zIGlmIG5lZWRlZC5cbiAgICAgIG5ld0NoaWxkLl9fc2tpcEluc2VydGlvbiA9IGZhbHNlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmluc2VydEJlZm9yZShwYXJlbnQsIG5ld0NoaWxkLCByZWZDaGlsZCk7XG4gIH1cblxuICByZW1vdmVDaGlsZChwYXJlbnQ6IGFueSwgb2xkQ2hpbGQ6IGFueSk6IHZvaWQge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLnJlbW92ZUNoaWxkKHBhcmVudCwgb2xkQ2hpbGQpO1xuICB9XG5cbiAgLy8gVE9ETzogd2Ugc2hvdWxkIGRlbGVnYXRlIGhlcmUgYXQgc29tZSBwb2ludC5cbiAgc2VsZWN0Um9vdEVsZW1lbnQoc2VsZWN0b3JPck5vZGU6IHN0cmluZ3xhbnkpOiBhbnkge1xuICAgIGxldCBlbGVtZW50OiBhbnk7XG4gICAgaWYgKHR5cGVvZiBzZWxlY3Rvck9yTm9kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3JPck5vZGUpO1xuICAgICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHNlbGVjdG9yIFwiJHtzZWxlY3Rvck9yTm9kZX1cIiBkaWQgbm90IG1hdGNoIGFueSBlbGVtZW50c2ApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBlbGVtZW50ID0gc2VsZWN0b3JPck5vZGU7XG4gICAgfVxuICAgIHRoaXMucm9vdCA9IGVsZW1lbnQ7XG4gICAgaWYgKE5HX0RFVl9NT0RFKSB7XG4gICAgICB0aGlzLmRlYnVnLnJvb3QgPSBlbGVtZW50O1xuICAgIH1cbiAgICB0aGlzLm1hcmtBc0h5ZHJhdGVkKGVsZW1lbnQpO1xuICAgIHRoaXMucG9wdWxhdGVOb2RlUmVnaXN0cnkoKTtcblxuICAgIC8vIFRoZSBgbmdoYCBhdHRyaWJ1dGUgd2FzIG9ubHkgbmVlZGVkIHRvIHRyYW5zZmVyIGh5ZHJhdGlvbiBkYXRhXG4gICAgLy8gb3ZlciB0aGUgd2lyZS4gSXQgaGFzIG5vIHV0aWxpdHkgb25jZSBhbiBhcHAgaHlkcmF0ZXMuXG4gICAgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ25naCcpO1xuXG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cblxuICBwcml2YXRlIGdldCByZWdpc3RyeSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5yZWdpc3RyeTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTd2l0Y2hlcyB0aGUgcmVuZGVyZXIgdG8gdGhlIGRlb3B0IG1vZGU6XG4gICAqICAtIHN0b3JlcyB0aGUgZmxhZyBpbiBhIGdsb2JhbCBzdGF0ZVxuICAgKiAgLSByZW1vdmVzIGFsbCBhbm5vdGF0ZWQgRE9NIG5vZGVzLCBzbyB0aGV5IGFyZSByZS1jcmVhdGVkXG4gICAqICAgIGJ5IHRoZSBydW50aW1lIGxvZ2ljIGZyb20gc2NyYXRjaCAodGh1cyBcImRlb3B0XCIpXG4gICAqL1xuICBwcml2YXRlIGVudGVyRGVvcHRNb2RlKGtleTogc3RyaW5nKSB7XG4gICAgdGhpcy5zdGF0ZS5pbkRlb3B0TW9kZSA9IHRydWU7XG4gICAgaWYgKHRoaXMuY29uZmlnLmlzU3RyaWN0TW9kZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBIeWRyYXRpb24gcmVuZGVyZXIgd2FzIHVuYWJsZSB0byBmaW5kIHByb3BlciBub2RlIGZvciBrZXkgJHtrZXl9LmApO1xuICAgIH1cbiAgICBjb25zb2xlLndhcm4oYEVudGVyaW5nIGRlb3B0aW1pemVkIGh5ZHJhdGlvbiBtb2RlIHN0YXJ0aW5nIGZyb20gbm9kZSB3aXRoIGtleTogJHtrZXl9LmApO1xuICAgIHRoaXMucmVnaXN0cnkuZm9yRWFjaCgobm9kZSwga2V5KSA9PiB7XG4gICAgICBpZiAoa2V5LmluZGV4T2YoJz8nKSA+IC0xKSB7ICAvLyB0aGlzIGlzIGEgbWFya2VyIG5vZGVcbiAgICAgICAgY29uc3QgdGV4dE5vZGUgPSBub2RlLnByZXZpb3VzU2libGluZztcbiAgICAgICAgdGV4dE5vZGU/LnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgbm9kZS5yZW1vdmUoKTtcbiAgICB9KTtcbiAgICB0aGlzLnJlZ2lzdHJ5LmNsZWFyKCk7XG4gIH1cblxuICAvKipcbiAgICogTWFya3MgYSBub2RlIGFzIFwiaHlkcmF0ZWRcIiBvciB2aXNpdGVkIGR1cmluZ1xuICAgKiB0aGUgaHlkcmF0aW9uIHByb2Nlc3MuXG4gICAqL1xuICBwcml2YXRlIG1hcmtBc0h5ZHJhdGVkKG5vZGU6IGFueSkge1xuICAgIGlmIChOR19ERVZfTU9ERSkge1xuICAgICAgLy8gSW5kaWNhdGUgdGhhdCB0aGlzIG5vZGUgd2FzIHByb2Nlc3NlZFxuICAgICAgLy8gYnkgdGhlIGh5ZHJhdGlvbiBsb2dpYywgc28gd2UgY2FuIHZlcmlmeVxuICAgICAgLy8gdGhhdCB3ZSB2aXNpdGVkIGFsbCBub2RlcyBpbiB0ZXN0cy5cbiAgICAgIG5vZGUuX19oeWRyYXRlZCA9IHRydWU7XG4gICAgfVxuICAgIG5vZGUuX19za2lwSW5zZXJ0aW9uID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYW4gZW50cnkgZnJvbSB0aGUgbm9kZSByZWdpc3RyeSBhbmQgcmVtb3ZlcyBhIHJlZmVyZW5jZVxuICAgKiBmcm9tIHRoZSByZWdpc3RyeS4gT25lIGVsZW1lbnQgc2hvdWxkIGJlIG1hcHBlZCBqdXN0IG9uY2UsIHJlbW92aW5nXG4gICAqIGl0IGZyb20gdGhlIHJlZ2lzdHJ5IGVuc3VyZXMgbm8gbWVtb3J5IGxlYWtzLlxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0RnJvbVJlZ2lzdHJ5KGtleTogc3RyaW5nKSB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMucmVnaXN0cnkuZ2V0KGtleSk7XG4gICAgaWYgKE5HX0RFVl9NT0RFICYmIG5vZGUpIHtcbiAgICAgIHRoaXMuZGVidWcuaHlkcmF0ZWROb2RlcyErKztcbiAgICB9XG4gICAgdGhpcy5yZWdpc3RyeS5kZWxldGUoa2V5KTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHb2VzIG92ZXIgdGhlIERPTSBzdHJ1Y3R1cmUgdG8gZmluZCBhbmQgZXh0cmFjdFxuICAgKiBub2RlcyB0aGF0IHdlcmUgYW5ub3RhdGVkIGR1cmluZyB0aGUgU1NSIHByb2Nlc3MuXG4gICAqL1xuICBwcml2YXRlIHBvcHVsYXRlTm9kZVJlZ2lzdHJ5KCkge1xuICAgIC8vIFRPRE86IGFuIGFwcCBtYXkgaGF2ZSBtdWx0aXBsZSByb290IGNvbXBvbmVudHNcbiAgICAvLyBhbmQgdGhlIGBzZWxlY3RSb290RWxlbWVudGAgZnVuY3Rpb24gKHRodXMgdGhpcyBvbmUgYXMgd2VsbClcbiAgICAvLyB3b3VsZCBiZSBjYWxsZWQgbXVsdGlwbGUgdGltZXMuIE1ha2Ugc3VyZSB3ZSBoYXZlIHJlZ2lzdHJpZXNcbiAgICAvLyBmb3IgZWFjaCByb290IGNvbXBvbmVudCAoYW5kIHJlZ2lzdHJpZXMgaW5pdGlhbGl6ZWQgbGF6aWx5KS5cbiAgICBpZiAodGhpcy5zdGF0ZS5pc1JlZ2lzdHJ5UG9wdWxhdGVkKSB7XG4gICAgICAvLyBUaGUgcmVnaXN0cnkgaXMgYWxyZWFkeSBwb3B1bGF0ZWQsIGV4aXQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZS5pc1JlZ2lzdHJ5UG9wdWxhdGVkID0gdHJ1ZTtcblxuICAgIE5HX0RFVl9NT0RFICYmIGNvbnNvbGUudGltZSgnSHlkcmF0aW9uUmVuZGVyZXIucG9wdWxhdGVOb2RlUmVnaXN0cnknKTtcblxuICAgIGNvbnN0IHZpc2l0ZWROb2RlcyA9XG4gICAgICAgIGNvbGxlY3RIeWRyYXRhYmxlTm9kZXModGhpcy5yb290LCB0aGlzLnJlZ2lzdHJ5LCBFTkFCTEVfSFlEUkFUSU9OX0tFWV9DT01QUkVTU0lPTik7XG5cbiAgICBpZiAoTkdfREVWX01PREUpIHtcbiAgICAgIGNvbnNvbGUudGltZUVuZCgnSHlkcmF0aW9uUmVuZGVyZXIucG9wdWxhdGVOb2RlUmVnaXN0cnknKTtcbiAgICAgIHRoaXMuZGVidWcudmlzaXRlZE5vZGVzID0gdmlzaXRlZE5vZGVzO1xuICAgICAgdGhpcy5kZWJ1Zy5hbm5vdGF0ZWROb2RlcyA9IHRoaXMucmVnaXN0cnkuc2l6ZTtcbiAgICB9XG4gIH1cblxuICBwYXJlbnROb2RlKG5vZGU6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUucGFyZW50Tm9kZShub2RlKTtcbiAgfVxuXG4gIG5leHRTaWJsaW5nKG5vZGU6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUubmV4dFNpYmxpbmcobm9kZSk7XG4gIH1cblxuICBzZXRBdHRyaWJ1dGUoZWw6IGFueSwgbmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBuYW1lc3BhY2U/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5zZXRBdHRyaWJ1dGUoZWwsIG5hbWUsIHZhbHVlLCBuYW1lc3BhY2UpO1xuICB9XG5cbiAgcmVtb3ZlQXR0cmlidXRlKGVsOiBhbnksIG5hbWU6IHN0cmluZywgbmFtZXNwYWNlPzogc3RyaW5nKTogdm9pZCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUucmVtb3ZlQXR0cmlidXRlKGVsLCBuYW1lLCBuYW1lc3BhY2UpO1xuICB9XG5cbiAgYWRkQ2xhc3MoZWw6IGFueSwgbmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuYWRkQ2xhc3MoZWwsIG5hbWUpO1xuICB9XG5cbiAgcmVtb3ZlQ2xhc3MoZWw6IGFueSwgbmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUucmVtb3ZlQ2xhc3MoZWwsIG5hbWUpO1xuICB9XG5cbiAgc2V0U3R5bGUoZWw6IGFueSwgc3R5bGU6IHN0cmluZywgdmFsdWU6IGFueSwgZmxhZ3M6IFJlbmRlcmVyU3R5bGVGbGFnczIpOiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5zZXRTdHlsZShlbCwgc3R5bGUsIHZhbHVlLCBmbGFncyk7XG4gIH1cblxuICByZW1vdmVTdHlsZShlbDogYW55LCBzdHlsZTogc3RyaW5nLCBmbGFnczogUmVuZGVyZXJTdHlsZUZsYWdzMik6IHZvaWQge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLnJlbW92ZVN0eWxlKGVsLCBzdHlsZSwgZmxhZ3MpO1xuICB9XG5cbiAgc2V0UHJvcGVydHkoZWw6IGFueSwgbmFtZTogc3RyaW5nLCB2YWx1ZTogYW55KTogdm9pZCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuc2V0UHJvcGVydHkoZWwsIG5hbWUsIHZhbHVlKTtcbiAgfVxuXG4gIHNldFZhbHVlKG5vZGU6IGFueSwgdmFsdWU6IHN0cmluZyk6IHZvaWQge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLnNldFZhbHVlKG5vZGUsIHZhbHVlKTtcbiAgfVxuXG4gIGxpc3RlbihcbiAgICAgIHRhcmdldDogJ2RvY3VtZW50J3wnd2luZG93J3wnYm9keSd8YW55LCBldmVudE5hbWU6IHN0cmluZyxcbiAgICAgIGNhbGxiYWNrOiAoZXZlbnQ6IGFueSkgPT4gYm9vbGVhbik6ICgpID0+IHZvaWQge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmxpc3Rlbih0YXJnZXQsIGV2ZW50TmFtZSwgY2FsbGJhY2spO1xuICB9XG59XG4iXX0=