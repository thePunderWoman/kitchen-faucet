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
            userAgent: headers?.['user-agent'],
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

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
    async readFile(path) {
        let resourceContent = this.resourceCache.get(path);
        if (resourceContent === undefined) {
            resourceContent = await promises.readFile(path);
            this.resourceCache.set(path, resourceContent);
        }
        return resourceContent.toString();
    }
}
class InlineCriticalCssProcessor {
    constructor(options, resourceCache) {
        this.options = options;
        this.resourceCache = resourceCache;
    }
    async process(html, options) {
        const critters = new CrittersExtended({ ...this.options, ...options }, this.resourceCache);
        const content = await critters.process(html);
        return {
            content,
            errors: critters.errors.length ? critters.errors : undefined,
            warnings: critters.warnings.length ? critters.warnings : undefined,
        };
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

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class Engine {
    constructor() {
        this.fileExistsCache = new Map();
        this.htmlFileCache = new Map();
        this.resourceLoaderCache = new Map();
        this.inlineCriticalCssProcessor = new InlineCriticalCssProcessor({ minify: true }, this.resourceLoaderCache);
    }
    async render(options) {
        const { pathname, origin } = new URL(options.url);
        const prerenderedSnapshot = await this.getPrerenderedSnapshot(options.publicPath, pathname);
        if (prerenderedSnapshot) {
            return prerenderedSnapshot;
        }
        let htmlContent = await this.getHtmlTemplate(options.publicPath, pathname, options.htmlFilename);
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
                referrer: options.headers?.referrer,
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
            const ngRenderMode = await new Promise((resolve) => {
                const interval = setInterval(() => {
                    const ngDOMMode = dom?.window.ngRenderMode;
                    if (ngDOMMode && typeof ngDOMMode === 'object') {
                        // Poll until ngDOMMode is an object.
                        clearTimeout(stablizationTimeout);
                        clearInterval(interval);
                        resolve(ngDOMMode);
                    }
                }, 30);
            });
            await ngRenderMode.getWhenStable();
            doc.querySelector('[ng-version]')?.setAttribute('ng-clover', '');
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
            const baseHref = doc.querySelector('base[href]')?.getAttribute('href') ?? '';
            const { content: contentWithInlineCSS, warnings, errors, } = await this.inlineCriticalCssProcessor.process(content, {
                outputPath: path.join(options.publicPath, baseHref),
            });
            // eslint-disable-next-line no-console
            warnings?.forEach((m) => console.warn(m));
            // eslint-disable-next-line no-console
            errors?.forEach((m) => console.error(m));
            return contentWithInlineCSS;
        }
        finally {
            dom?.window.close();
        }
    }
    async getPrerenderedSnapshot(publicPath, pathname) {
        // Remove leading forward slash.
        const pagePath = path.resolve(publicPath, pathname.substring(1), 'index.html');
        const content = await this.readHTMLFile(pagePath);
        return content?.includes('ng-version=')
            ? content // Page is pre-rendered
            : undefined;
    }
    async getHtmlTemplate(publicPath, pathname, htmlFilename = 'index.html') {
        const files = [path.join(publicPath, htmlFilename)];
        const potentialLocalePath = pathname.split('/', 2)[1]; // potential base href
        if (potentialLocalePath) {
            files.push(path.join(publicPath, potentialLocalePath, htmlFilename));
        }
        for (const file of files) {
            const content = await this.readHTMLFile(file);
            if (content) {
                return content;
            }
        }
        throw new Error(`Cannot file HTML file. Looked in: ${files.join(', ')}`);
    }
    async fileExists(filePath) {
        const fileExists = this.fileExistsCache.get(filePath);
        if (fileExists === undefined) {
            try {
                await fs.promises.access(filePath, fs.constants.F_OK);
                this.fileExistsCache.set(filePath, true);
                return true;
            }
            catch {
                this.fileExistsCache.set(filePath, false);
                return false;
            }
        }
        return fileExists;
    }
    async readHTMLFile(filePath) {
        if (this.htmlFileCache.has(filePath)) {
            return this.htmlFileCache.get(filePath);
        }
        if (await this.fileExists(filePath)) {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            this.htmlFileCache.set(filePath, content);
            return content;
        }
        return undefined;
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
