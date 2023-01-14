import { __awaiter } from 'tslib';
import Critters from 'critters';
import * as fs from 'fs';

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
                resourceContent = yield fs.promises.readFile(path, 'utf-8');
                this.resourceCache.set(path, resourceContent);
            }
            return resourceContent;
        });
    }
}
class InlineCriticalCssProcessor {
    constructor(options) {
        this.options = options;
        this.resourceCache = new Map();
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

export { InlineCriticalCssProcessor as ɵInlineCriticalCssProcessor };
//# sourceMappingURL=tools.mjs.map
