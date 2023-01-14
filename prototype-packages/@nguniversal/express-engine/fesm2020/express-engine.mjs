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
        try {
            const renderOptions = { ...options };
            if (!setupOptions.bootstrap && !renderOptions.bootstrap) {
                throw new Error('You must pass in a NgModule to be bootstrapped');
            }
            const { req } = renderOptions;
            const res = renderOptions.res ?? req.res;
            renderOptions.url =
                renderOptions.url ?? `${req.protocol}://${req.get('host') || ''}${req.baseUrl}${req.url}`;
            renderOptions.documentFilePath = renderOptions.documentFilePath ?? filePath;
            renderOptions.providers = [...(renderOptions.providers ?? []), getReqResProviders(req, res)];
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            renderOptions.publicPath =
                renderOptions.publicPath ?? setupOptions.publicPath ?? options.settings?.views;
            renderOptions.inlineCriticalCss =
                renderOptions.inlineCriticalCss ?? setupOptions.inlineCriticalCss;
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
