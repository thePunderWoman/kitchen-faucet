import { CommonEngine } from '@nguniversal/common/engine';
import { REQUEST, RESPONSE } from '@nguniversal/express-engine/tokens';

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * This is an express engine for handling Angular Applications
 */
function ngExpressEngine(setupOptions) {
    const engine = new CommonEngine(setupOptions.bootstrap, setupOptions.providers);
    return function (filePath, options, callback) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            const renderOptions = Object.assign({}, options);
            if (!setupOptions.bootstrap && !renderOptions.bootstrap) {
                throw new Error('You must pass in a NgModule to be bootstrapped');
            }
            const { req } = renderOptions;
            const res = (_a = renderOptions.res) !== null && _a !== void 0 ? _a : req.res;
            renderOptions.url =
                (_b = renderOptions.url) !== null && _b !== void 0 ? _b : `${req.protocol}://${req.get('host') || ''}${req.baseUrl}${req.url}`;
            renderOptions.documentFilePath = (_c = renderOptions.documentFilePath) !== null && _c !== void 0 ? _c : filePath;
            renderOptions.providers = [...((_d = renderOptions.providers) !== null && _d !== void 0 ? _d : []), getReqResProviders(req, res)];
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            renderOptions.publicPath =
                (_f = (_e = renderOptions.publicPath) !== null && _e !== void 0 ? _e : setupOptions.publicPath) !== null && _f !== void 0 ? _f : (_g = options.settings) === null || _g === void 0 ? void 0 : _g.views;
            renderOptions.inlineCriticalCss =
                (_h = renderOptions.inlineCriticalCss) !== null && _h !== void 0 ? _h : setupOptions.inlineCriticalCss;
            engine
                .render(renderOptions)
                .then((html) => callback(null, html))
                .catch(callback);
        }
        catch (err) {
            callback(err);
        }
    };
}
/**
 * Get providers of the request and response
 */
function getReqResProviders(req, res) {
    const providers = [
        {
            provide: REQUEST,
            useValue: req,
        },
    ];
    if (res) {
        providers.push({
            provide: RESPONSE,
            useValue: res,
        });
    }
    return providers;
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

export { ngExpressEngine };
//# sourceMappingURL=express-engine.mjs.map
