import { __awaiter } from 'tslib';
import * as fs from 'fs';
import { promises } from 'fs';
import { ResourceLoader, JSDOM, CookieJar } from 'jsdom';
import * as path from 'path';
import { normalize } from 'path';
import { URL } from 'url';
import Critters from 'critters';

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class CustomResourceLoader extends ResourceLoader {
    constructor(headers, publicPath, baseUrl, fileCache) {
        super({
            userAgent: headers === null || headers === void 0 ? void 0 : headers['user-agent'],
        });
        this.headers = headers;
        this.publicPath = publicPath;
        this.baseUrl = baseUrl;
        this.fileCache = fileCache;
    }
    fetch(url, _options) {
        if (!url.endsWith('.js') || !url.startsWith(this.baseUrl)) {
            return null;
        }
        const path = normalize(url.replace(this.baseUrl, this.publicPath));
        if (this.fileCache.has(path)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const filePromise = Promise.resolve(this.fileCache.get(path));
            filePromise.abort = () => undefined;
            return filePromise;
        }
        const promise = promises.readFile(path, 'utf-8').then((content) => {
            if (path.includes('runtime.')) {
                // JSDOM doesn't support type=module, which will be added to lazy loaded scripts.
                // https://github.com/jsdom/jsdom/issues/2475
                content = content.replace(/\.type\s?=\s?['"]module["']/, '');
            }
            this.fileCache.set(path, Buffer.from(content));
            return content;
        });
        promise.abort = () => undefined;
        return promise;
    }
}

class CrittersExtended extends Critters {
    constructor(optionsExtended, resourceCache) {
        super({
            logger: {
                warn: (s) => this.warnings.push(s),
                error: (s) => this.errors.push(s),
                info: () => { },
            },
            logLevel: 'warn',
            path: optionsExtended.outputPath,
            publicPath: optionsExtended.deployUrl,
            compress: !!optionsExtended.minify,
            pruneSource: false,
            reduceInlineStyles: false,
            mergeStylesheets: false,
            preload: 'media',
            noscriptFallback: true,
            inlineFonts: true,
        });
        this.optionsExtended = optionsExtended;
        this.resourceCache = resourceCache;
        this.warnings = [];
        this.errors = [];
    }
    readFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            let resourceContent = this.resourceCache.get(path);
            if (resourceContent === undefined) {
                resourceContent = yield promises.readFile(path);
                this.resourceCache.set(path, resourceContent);
            }
            return resourceContent.toString();
        });
    }
}
class InlineCriticalCssProcessor {
    constructor(options, resourceCache) {
        this.options = options;
        this.resourceCache = resourceCache;
    }
    process(html, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const critters = new CrittersExtended(Object.assign(Object.assign({}, this.options), options), this.resourceCache);
            const content = yield critters.process(html);
            return {
                content,
                errors: critters.errors.length ? critters.errors : undefined,
                warnings: critters.warnings.length ? critters.warnings : undefined,
            };
        });
    }
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function noop() { }
function augmentWindowWithStubs(window) {
    window.resizeBy = noop;
    window.resizeTo = noop;
    window.scroll = noop;
    window.scrollBy = noop;
    window.scrollTo = noop;
}

class Engine {
    constructor() {
        this.fileExistsCache = new Map();
        this.htmlFileCache = new Map();
        this.resourceLoaderCache = new Map();
        this.inlineCriticalCssProcessor = new InlineCriticalCssProcessor({ minify: true }, this.resourceLoaderCache);
    }
    render(options) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const { pathname, origin } = new URL(options.url);
            const prerenderedSnapshot = yield this.getPrerenderedSnapshot(options.publicPath, pathname);
            if (prerenderedSnapshot) {
                return prerenderedSnapshot;
            }
            let htmlContent = yield this.getHtmlTemplate(options.publicPath, pathname, options.htmlFilename);
            const inlineCriticalCss = options.inlineCriticalCss !== false;
            const customResourceLoader = new CustomResourceLoader(options.headers, options.publicPath, origin, this.resourceLoaderCache);
            let dom;
            if (inlineCriticalCss) {
                // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
                htmlContent = htmlContent.replace(/ media="print" onload="this\.media='all'"><noscript><link .+?><\/noscript>/g, '>');
            }
            // JSDOM doesn't support type=module
            // https://github.com/jsdom/jsdom/issues/2475
            htmlContent = htmlContent.replace(/ type="module"/g, '');
            try {
                dom = new JSDOM(htmlContent, {
                    runScripts: 'dangerously',
                    resources: customResourceLoader,
                    url: options.url,
                    referrer: (_a = options.headers) === null || _a === void 0 ? void 0 : _a.referrer,
                    cookieJar: new CookieJar(undefined, {
                        allowSpecialUseDomain: true,
                    }),
                    beforeParse: (window) => {
                        augmentWindowWithStubs(window);
                        window.ngRenderMode = true;
                    },
                });
                const doc = dom.window.document;
                // 60s timeout.
                const stablizationTimeout = setTimeout(() => {
                    throw new Error('Angular application failed to stablize after in time.');
                }, 60000);
                const ngRenderMode = yield new Promise((resolve) => {
                    const interval = setInterval(() => {
                        const ngDOMMode = dom === null || dom === void 0 ? void 0 : dom.window.ngRenderMode;
                        if (ngDOMMode && typeof ngDOMMode === 'object') {
                            // Poll until ngDOMMode is an object.
                            clearTimeout(stablizationTimeout);
                            clearInterval(interval);
                            resolve(ngDOMMode);
                        }
                    }, 30);
                });
                yield ngRenderMode.getWhenStable();
                (_b = doc.querySelector('[ng-version]')) === null || _b === void 0 ? void 0 : _b.setAttribute('ng-clover', '');
                // Add Angular state
                const state = ngRenderMode.getSerializedState();
                if (state) {
                    const script = doc.createElement('script');
                    script.id = `${ngRenderMode.appId}-state`;
                    script.setAttribute('type', 'application/json');
                    script.textContent = state;
                    doc.body.appendChild(script);
                }
                const content = dom.serialize();
                if (!inlineCriticalCss) {
                    return content;
                }
                const baseHref = (_d = (_c = doc.querySelector('base[href]')) === null || _c === void 0 ? void 0 : _c.getAttribute('href')) !== null && _d !== void 0 ? _d : '';
                const { content: contentWithInlineCSS, warnings, errors, } = yield this.inlineCriticalCssProcessor.process(content, {
                    outputPath: path.join(options.publicPath, baseHref),
                });
                // eslint-disable-next-line no-console
                warnings === null || warnings === void 0 ? void 0 : warnings.forEach((m) => console.warn(m));
                // eslint-disable-next-line no-console
                errors === null || errors === void 0 ? void 0 : errors.forEach((m) => console.error(m));
                return contentWithInlineCSS;
            }
            finally {
                dom === null || dom === void 0 ? void 0 : dom.window.close();
            }
        });
    }
    getPrerenderedSnapshot(publicPath, pathname) {
        return __awaiter(this, void 0, void 0, function* () {
            // Remove leading forward slash.
            const pagePath = path.resolve(publicPath, pathname.substring(1), 'index.html');
            const content = yield this.readHTMLFile(pagePath);
            return (content === null || content === void 0 ? void 0 : content.includes('ng-version='))
                ? content // Page is pre-rendered
                : undefined;
        });
    }
    getHtmlTemplate(publicPath, pathname, htmlFilename = 'index.html') {
        return __awaiter(this, void 0, void 0, function* () {
            const files = [path.join(publicPath, htmlFilename)];
            const potentialLocalePath = pathname.split('/', 2)[1]; // potential base href
            if (potentialLocalePath) {
                files.push(path.join(publicPath, potentialLocalePath, htmlFilename));
            }
            for (const file of files) {
                const content = yield this.readHTMLFile(file);
                if (content) {
                    return content;
                }
            }
            throw new Error(`Cannot file HTML file. Looked in: ${files.join(', ')}`);
        });
    }
    fileExists(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileExists = this.fileExistsCache.get(filePath);
            if (fileExists === undefined) {
                try {
                    yield fs.promises.access(filePath, fs.constants.F_OK);
                    this.fileExistsCache.set(filePath, true);
                    return true;
                }
                catch (_a) {
                    this.fileExistsCache.set(filePath, false);
                    return false;
                }
            }
            return fileExists;
        });
    }
    readHTMLFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.htmlFileCache.has(filePath)) {
                return this.htmlFileCache.get(filePath);
            }
            if (yield this.fileExists(filePath)) {
                const content = yield fs.promises.readFile(filePath, 'utf-8');
                this.htmlFileCache.set(filePath, content);
                return content;
            }
            return undefined;
        });
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
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * Generated bundle index. Do not edit.
 */

export { Engine };
//# sourceMappingURL=server.mjs.map
