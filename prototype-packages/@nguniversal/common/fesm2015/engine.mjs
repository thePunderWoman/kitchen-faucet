import { __awaiter } from 'tslib';
import { ɵSERVER_CONTEXT, INITIAL_CONFIG, renderModule } from '@angular/platform-server';
import { ɵInlineCriticalCssProcessor } from '@nguniversal/common/tools';
import * as fs from 'fs';
import { resolve, dirname } from 'path';
import { URL } from 'url';

/**
 * A common rendering engine utility. This abstracts the logic
 * for handling the platformServer compiler, the module cache, and
 * the document loader
 */
class CommonEngine {
    constructor(module, providers = []) {
        this.module = module;
        this.providers = providers;
        this.templateCache = new Map();
        this.pageExists = new Map();
        this.inlineCriticalCssProcessor = new ɵInlineCriticalCssProcessor({
            minify: true,
        });
    }
    /**
     * Render an HTML document for a specific URL with specified
     * render options
     */
    render(opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { inlineCriticalCss = true } = opts;
            if (opts.publicPath && opts.documentFilePath && opts.url !== undefined) {
                const url = new URL(opts.url);
                // Remove leading forward slash.
                const pathname = url.pathname.substring(1);
                const pagePath = resolve(opts.publicPath, pathname, 'index.html');
                if (pagePath !== resolve(opts.documentFilePath)) {
                    // View path doesn't match with prerender path.
                    let pageExists = this.pageExists.get(pagePath);
                    if (pageExists === undefined) {
                        pageExists = yield exists(pagePath);
                        this.pageExists.set(pagePath, pageExists);
                    }
                    if (pageExists) {
                        // Serve pre-rendered page.
                        return fs.promises.readFile(pagePath, 'utf-8');
                    }
                }
            }
            // if opts.document dosen't exist then opts.documentFilePath must
            const extraProviders = [
                { provide: ɵSERVER_CONTEXT, useValue: 'ssr' },
                ...((_a = opts.providers) !== null && _a !== void 0 ? _a : []),
                ...this.providers,
            ];
            let doc = opts.document;
            if (!doc && opts.documentFilePath) {
                doc = yield this.getDocument(opts.documentFilePath);
            }
            if (doc) {
                extraProviders.push({
                    provide: INITIAL_CONFIG,
                    useValue: {
                        document: inlineCriticalCss
                            ? // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
                                doc.replace(/ media="print" onload="this\.media='all'"><noscript><link .+?><\/noscript>/g, '>')
                            : doc,
                        url: opts.url,
                    },
                });
            }
            const moduleOrFactory = this.module || opts.bootstrap;
            if (!moduleOrFactory) {
                throw new Error('A module or bootstrap option must be provided.');
            }
            const html = yield renderModule(moduleOrFactory, { extraProviders });
            if (!inlineCriticalCss) {
                return html;
            }
            const { content, errors, warnings } = yield this.inlineCriticalCssProcessor.process(html, {
                outputPath: (_b = opts.publicPath) !== null && _b !== void 0 ? _b : (opts.documentFilePath ? dirname(opts.documentFilePath) : ''),
            });
            // eslint-disable-next-line no-console
            warnings === null || warnings === void 0 ? void 0 : warnings.forEach((m) => console.warn(m));
            // eslint-disable-next-line no-console
            errors === null || errors === void 0 ? void 0 : errors.forEach((m) => console.error(m));
            return content;
        });
    }
    /** Retrieve the document from the cache or the filesystem */
    getDocument(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = this.templateCache.get(filePath);
            if (!doc) {
                doc = yield fs.promises.readFile(filePath, 'utf-8');
                this.templateCache.set(filePath, doc);
            }
            return doc;
        });
    }
}
function exists(path) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield fs.promises.access(path, fs.constants.F_OK);
            return true;
        }
        catch (_a) {
            return false;
        }
    });
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

export { CommonEngine };
//# sourceMappingURL=engine.mjs.map
