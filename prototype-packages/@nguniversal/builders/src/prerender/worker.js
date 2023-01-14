"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const node_worker_threads_1 = require("node:worker_threads");
const utils_1 = require("../utils/utils");
/**
 * The fully resolved path to the zone.js package that will be loaded during worker initialization.
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { zonePackage } = node_worker_threads_1.workerData;
/**
 * Renders each route in routes and writes them to <outputPath>/<route>/index.html.
 */
async function render({ indexFile, deployUrl, minifyCss, outputPath, serverBundlePath, route, inlineCriticalCss, }) {
    var _a;
    const result = {};
    const browserIndexOutputPath = path.join(outputPath, indexFile);
    const outputFolderPath = path.join(outputPath, route);
    const outputIndexPath = path.join(outputFolderPath, 'index.html');
    const { AppServerModule, renderModule, ɵSERVER_CONTEXT } = (await (_a = serverBundlePath, Promise.resolve().then(() => __importStar(require(_a)))));
    (0, node_assert_1.default)(renderModule, `renderModule was not exported from: ${serverBundlePath}.`);
    (0, node_assert_1.default)(AppServerModule, `AppServerModule was not exported from: ${serverBundlePath}.`);
    (0, node_assert_1.default)(ɵSERVER_CONTEXT, `ɵSERVER_CONTEXT was not exported from: ${serverBundlePath}.`);
    const indexBaseName = fs.existsSync(path.join(outputPath, 'index.original.html'))
        ? 'index.original.html'
        : indexFile;
    const browserIndexInputPath = path.join(outputPath, indexBaseName);
    let document = await fs.promises.readFile(browserIndexInputPath, 'utf8');
    if (inlineCriticalCss) {
        // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
        document = document.replace(/ media="print" onload="this\.media='all'"><noscript><link .+?><\/noscript>/g, '>');
    }
    let html = await renderModule(AppServerModule, {
        document,
        url: route,
        extraProviders: [
            {
                provide: ɵSERVER_CONTEXT,
                useValue: 'ssg',
            },
        ],
    });
    if (inlineCriticalCss) {
        const inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
            deployUrl: deployUrl,
            minify: minifyCss,
        });
        const { content, warnings, errors } = await inlineCriticalCssProcessor.process(html, {
            outputPath,
        });
        result.errors = errors;
        result.warnings = warnings;
        html = content;
    }
    // This case happens when we are prerendering "/".
    if (browserIndexOutputPath === outputIndexPath) {
        const browserIndexOutputPathOriginal = path.join(outputPath, 'index.original.html');
        fs.renameSync(browserIndexOutputPath, browserIndexOutputPathOriginal);
    }
    fs.mkdirSync(outputFolderPath, { recursive: true });
    fs.writeFileSync(outputIndexPath, html);
    return result;
}
let InlineCriticalCssProcessor;
/**
 * Initializes the worker when it is first created by loading the Zone.js package
 * into the worker instance.
 *
 * @returns A promise resolving to the render function of the worker.
 */
async function initialize() {
    var _a;
    const { ɵInlineCriticalCssProcessor } = await (0, utils_1.loadEsmModule)('@nguniversal/common/tools');
    InlineCriticalCssProcessor = ɵInlineCriticalCssProcessor;
    // Setup Zone.js
    await (_a = zonePackage, Promise.resolve().then(() => __importStar(require(_a))));
    // Return the render function for use
    return render;
}
/**
 * The default export will be the promise returned by the initialize function.
 * This is awaited by piscina prior to using the Worker.
 */
exports.default = initialize();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9idWlsZGVycy9zcmMvcHJlcmVuZGVyL3dvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBS0gsOERBQWlDO0FBQ2pDLDRDQUE4QjtBQUM5QixnREFBa0M7QUFDbEMsNkRBQWlEO0FBQ2pELDBDQUErQztBQWdCL0M7OztHQUdHO0FBQ0gsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLGdDQUV2QixDQUFDO0FBRUY7O0dBRUc7QUFDSCxLQUFLLFVBQVUsTUFBTSxDQUFDLEVBQ3BCLFNBQVMsRUFDVCxTQUFTLEVBQ1QsU0FBUyxFQUNULFVBQVUsRUFDVixnQkFBZ0IsRUFDaEIsS0FBSyxFQUNMLGlCQUFpQixHQUNIOztJQUNkLE1BQU0sTUFBTSxHQUFHLEVBQWtCLENBQUM7SUFDbEMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNoRSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFFbEUsTUFBTSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLEdBQUcsQ0FBQyxZQUFhLGdCQUFnQiwwREFBQyxDQUl6RixDQUFDO0lBRUYsSUFBQSxxQkFBTSxFQUFDLFlBQVksRUFBRSx1Q0FBdUMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO0lBQ2pGLElBQUEscUJBQU0sRUFBQyxlQUFlLEVBQUUsMENBQTBDLGdCQUFnQixHQUFHLENBQUMsQ0FBQztJQUN2RixJQUFBLHFCQUFNLEVBQUMsZUFBZSxFQUFFLDBDQUEwQyxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7SUFFdkYsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQy9FLENBQUMsQ0FBQyxxQkFBcUI7UUFDdkIsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUNkLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDbkUsSUFBSSxRQUFRLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUV6RSxJQUFJLGlCQUFpQixFQUFFO1FBQ3JCLHdFQUF3RTtRQUN4RSxRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FDekIsNkVBQTZFLEVBQzdFLEdBQUcsQ0FDSixDQUFDO0tBQ0g7SUFFRCxJQUFJLElBQUksR0FBRyxNQUFNLFlBQVksQ0FBQyxlQUFlLEVBQUU7UUFDN0MsUUFBUTtRQUNSLEdBQUcsRUFBRSxLQUFLO1FBQ1YsY0FBYyxFQUFFO1lBQ2Q7Z0JBQ0UsT0FBTyxFQUFFLGVBQWU7Z0JBQ3hCLFFBQVEsRUFBRSxLQUFLO2FBQ2hCO1NBQ0Y7S0FDRixDQUFDLENBQUM7SUFFSCxJQUFJLGlCQUFpQixFQUFFO1FBQ3JCLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSwwQkFBMEIsQ0FBQztZQUNoRSxTQUFTLEVBQUUsU0FBUztZQUNwQixNQUFNLEVBQUUsU0FBUztTQUNsQixDQUFDLENBQUM7UUFFSCxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDbkYsVUFBVTtTQUNYLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQzNCLElBQUksR0FBRyxPQUFPLENBQUM7S0FDaEI7SUFFRCxrREFBa0Q7SUFDbEQsSUFBSSxzQkFBc0IsS0FBSyxlQUFlLEVBQUU7UUFDOUMsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3BGLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLEVBQUUsOEJBQThCLENBQUMsQ0FBQztLQUN2RTtJQUVELEVBQUUsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNwRCxFQUFFLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUV4QyxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBRUQsSUFBSSwwQkFBOEQsQ0FBQztBQUNuRTs7Ozs7R0FLRztBQUNILEtBQUssVUFBVSxVQUFVOztJQUN2QixNQUFNLEVBQUUsMkJBQTJCLEVBQUUsR0FBRyxNQUFNLElBQUEscUJBQWEsRUFFekQsMkJBQTJCLENBQUMsQ0FBQztJQUUvQiwwQkFBMEIsR0FBRywyQkFBMkIsQ0FBQztJQUV6RCxnQkFBZ0I7SUFDaEIsWUFBYSxXQUFXLDBEQUFDLENBQUM7SUFFMUIscUNBQXFDO0lBQ3JDLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxrQkFBZSxVQUFVLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFR5cGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB0eXBlICogYXMgcGxhdGZvcm1TZXJ2ZXIgZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tc2VydmVyJztcbmltcG9ydCB0eXBlIHsgybVJbmxpbmVDcml0aWNhbENzc1Byb2Nlc3NvciB9IGZyb20gJ0BuZ3VuaXZlcnNhbC9jb21tb24vdG9vbHMnO1xuaW1wb3J0IGFzc2VydCBmcm9tICdub2RlOmFzc2VydCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHdvcmtlckRhdGEgfSBmcm9tICdub2RlOndvcmtlcl90aHJlYWRzJztcbmltcG9ydCB7IGxvYWRFc21Nb2R1bGUgfSBmcm9tICcuLi91dGlscy91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVuZGVyT3B0aW9ucyB7XG4gIGluZGV4RmlsZTogc3RyaW5nO1xuICBkZXBsb3lVcmw6IHN0cmluZztcbiAgaW5saW5lQ3JpdGljYWxDc3M6IGJvb2xlYW47XG4gIG1pbmlmeUNzczogYm9vbGVhbjtcbiAgb3V0cHV0UGF0aDogc3RyaW5nO1xuICBzZXJ2ZXJCdW5kbGVQYXRoOiBzdHJpbmc7XG4gIHJvdXRlOiBzdHJpbmc7XG59XG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlclJlc3VsdCB7XG4gIGVycm9ycz86IHN0cmluZ1tdO1xuICB3YXJuaW5ncz86IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIFRoZSBmdWxseSByZXNvbHZlZCBwYXRoIHRvIHRoZSB6b25lLmpzIHBhY2thZ2UgdGhhdCB3aWxsIGJlIGxvYWRlZCBkdXJpbmcgd29ya2VyIGluaXRpYWxpemF0aW9uLlxuICogVGhpcyBpcyBwYXNzZWQgYXMgd29ya2VyRGF0YSB3aGVuIHNldHRpbmcgdXAgdGhlIHdvcmtlciB2aWEgdGhlIGBwaXNjaW5hYCBwYWNrYWdlLlxuICovXG5jb25zdCB7IHpvbmVQYWNrYWdlIH0gPSB3b3JrZXJEYXRhIGFzIHtcbiAgem9uZVBhY2thZ2U6IHN0cmluZztcbn07XG5cbi8qKlxuICogUmVuZGVycyBlYWNoIHJvdXRlIGluIHJvdXRlcyBhbmQgd3JpdGVzIHRoZW0gdG8gPG91dHB1dFBhdGg+Lzxyb3V0ZT4vaW5kZXguaHRtbC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVuZGVyKHtcbiAgaW5kZXhGaWxlLFxuICBkZXBsb3lVcmwsXG4gIG1pbmlmeUNzcyxcbiAgb3V0cHV0UGF0aCxcbiAgc2VydmVyQnVuZGxlUGF0aCxcbiAgcm91dGUsXG4gIGlubGluZUNyaXRpY2FsQ3NzLFxufTogUmVuZGVyT3B0aW9ucyk6IFByb21pc2U8UmVuZGVyUmVzdWx0PiB7XG4gIGNvbnN0IHJlc3VsdCA9IHt9IGFzIFJlbmRlclJlc3VsdDtcbiAgY29uc3QgYnJvd3NlckluZGV4T3V0cHV0UGF0aCA9IHBhdGguam9pbihvdXRwdXRQYXRoLCBpbmRleEZpbGUpO1xuICBjb25zdCBvdXRwdXRGb2xkZXJQYXRoID0gcGF0aC5qb2luKG91dHB1dFBhdGgsIHJvdXRlKTtcbiAgY29uc3Qgb3V0cHV0SW5kZXhQYXRoID0gcGF0aC5qb2luKG91dHB1dEZvbGRlclBhdGgsICdpbmRleC5odG1sJyk7XG5cbiAgY29uc3QgeyBBcHBTZXJ2ZXJNb2R1bGUsIHJlbmRlck1vZHVsZSwgybVTRVJWRVJfQ09OVEVYVCB9ID0gKGF3YWl0IGltcG9ydChzZXJ2ZXJCdW5kbGVQYXRoKSkgYXMge1xuICAgIHJlbmRlck1vZHVsZTogdHlwZW9mIHBsYXRmb3JtU2VydmVyLnJlbmRlck1vZHVsZSB8IHVuZGVmaW5lZDtcbiAgICDJtVNFUlZFUl9DT05URVhUOiB0eXBlb2YgcGxhdGZvcm1TZXJ2ZXIuybVTRVJWRVJfQ09OVEVYVCB8IHVuZGVmaW5lZDtcbiAgICBBcHBTZXJ2ZXJNb2R1bGU6IFR5cGU8dW5rbm93bj4gfCB1bmRlZmluZWQ7XG4gIH07XG5cbiAgYXNzZXJ0KHJlbmRlck1vZHVsZSwgYHJlbmRlck1vZHVsZSB3YXMgbm90IGV4cG9ydGVkIGZyb206ICR7c2VydmVyQnVuZGxlUGF0aH0uYCk7XG4gIGFzc2VydChBcHBTZXJ2ZXJNb2R1bGUsIGBBcHBTZXJ2ZXJNb2R1bGUgd2FzIG5vdCBleHBvcnRlZCBmcm9tOiAke3NlcnZlckJ1bmRsZVBhdGh9LmApO1xuICBhc3NlcnQoybVTRVJWRVJfQ09OVEVYVCwgYMm1U0VSVkVSX0NPTlRFWFQgd2FzIG5vdCBleHBvcnRlZCBmcm9tOiAke3NlcnZlckJ1bmRsZVBhdGh9LmApO1xuXG4gIGNvbnN0IGluZGV4QmFzZU5hbWUgPSBmcy5leGlzdHNTeW5jKHBhdGguam9pbihvdXRwdXRQYXRoLCAnaW5kZXgub3JpZ2luYWwuaHRtbCcpKVxuICAgID8gJ2luZGV4Lm9yaWdpbmFsLmh0bWwnXG4gICAgOiBpbmRleEZpbGU7XG4gIGNvbnN0IGJyb3dzZXJJbmRleElucHV0UGF0aCA9IHBhdGguam9pbihvdXRwdXRQYXRoLCBpbmRleEJhc2VOYW1lKTtcbiAgbGV0IGRvY3VtZW50ID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoYnJvd3NlckluZGV4SW5wdXRQYXRoLCAndXRmOCcpO1xuXG4gIGlmIChpbmxpbmVDcml0aWNhbENzcykge1xuICAgIC8vIFdvcmthcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9Hb29nbGVDaHJvbWVMYWJzL2NyaXR0ZXJzL2lzc3Vlcy82NFxuICAgIGRvY3VtZW50ID0gZG9jdW1lbnQucmVwbGFjZShcbiAgICAgIC8gbWVkaWE9XCJwcmludFwiIG9ubG9hZD1cInRoaXNcXC5tZWRpYT0nYWxsJ1wiPjxub3NjcmlwdD48bGluayAuKz8+PFxcL25vc2NyaXB0Pi9nLFxuICAgICAgJz4nLFxuICAgICk7XG4gIH1cblxuICBsZXQgaHRtbCA9IGF3YWl0IHJlbmRlck1vZHVsZShBcHBTZXJ2ZXJNb2R1bGUsIHtcbiAgICBkb2N1bWVudCxcbiAgICB1cmw6IHJvdXRlLFxuICAgIGV4dHJhUHJvdmlkZXJzOiBbXG4gICAgICB7XG4gICAgICAgIHByb3ZpZGU6IMm1U0VSVkVSX0NPTlRFWFQsXG4gICAgICAgIHVzZVZhbHVlOiAnc3NnJyxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSk7XG5cbiAgaWYgKGlubGluZUNyaXRpY2FsQ3NzKSB7XG4gICAgY29uc3QgaW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3IgPSBuZXcgSW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3Ioe1xuICAgICAgZGVwbG95VXJsOiBkZXBsb3lVcmwsXG4gICAgICBtaW5pZnk6IG1pbmlmeUNzcyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHsgY29udGVudCwgd2FybmluZ3MsIGVycm9ycyB9ID0gYXdhaXQgaW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3IucHJvY2VzcyhodG1sLCB7XG4gICAgICBvdXRwdXRQYXRoLFxuICAgIH0pO1xuICAgIHJlc3VsdC5lcnJvcnMgPSBlcnJvcnM7XG4gICAgcmVzdWx0Lndhcm5pbmdzID0gd2FybmluZ3M7XG4gICAgaHRtbCA9IGNvbnRlbnQ7XG4gIH1cblxuICAvLyBUaGlzIGNhc2UgaGFwcGVucyB3aGVuIHdlIGFyZSBwcmVyZW5kZXJpbmcgXCIvXCIuXG4gIGlmIChicm93c2VySW5kZXhPdXRwdXRQYXRoID09PSBvdXRwdXRJbmRleFBhdGgpIHtcbiAgICBjb25zdCBicm93c2VySW5kZXhPdXRwdXRQYXRoT3JpZ2luYWwgPSBwYXRoLmpvaW4ob3V0cHV0UGF0aCwgJ2luZGV4Lm9yaWdpbmFsLmh0bWwnKTtcbiAgICBmcy5yZW5hbWVTeW5jKGJyb3dzZXJJbmRleE91dHB1dFBhdGgsIGJyb3dzZXJJbmRleE91dHB1dFBhdGhPcmlnaW5hbCk7XG4gIH1cblxuICBmcy5ta2RpclN5bmMob3V0cHV0Rm9sZGVyUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIGZzLndyaXRlRmlsZVN5bmMob3V0cHV0SW5kZXhQYXRoLCBodG1sKTtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5sZXQgSW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3I6IHR5cGVvZiDJtUlubGluZUNyaXRpY2FsQ3NzUHJvY2Vzc29yO1xuLyoqXG4gKiBJbml0aWFsaXplcyB0aGUgd29ya2VyIHdoZW4gaXQgaXMgZmlyc3QgY3JlYXRlZCBieSBsb2FkaW5nIHRoZSBab25lLmpzIHBhY2thZ2VcbiAqIGludG8gdGhlIHdvcmtlciBpbnN0YW5jZS5cbiAqXG4gKiBAcmV0dXJucyBBIHByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSByZW5kZXIgZnVuY3Rpb24gb2YgdGhlIHdvcmtlci5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgY29uc3QgeyDJtUlubGluZUNyaXRpY2FsQ3NzUHJvY2Vzc29yIH0gPSBhd2FpdCBsb2FkRXNtTW9kdWxlPFxuICAgIHR5cGVvZiBpbXBvcnQoJ0BuZ3VuaXZlcnNhbC9jb21tb24vdG9vbHMnKVxuICA+KCdAbmd1bml2ZXJzYWwvY29tbW9uL3Rvb2xzJyk7XG5cbiAgSW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3IgPSDJtUlubGluZUNyaXRpY2FsQ3NzUHJvY2Vzc29yO1xuXG4gIC8vIFNldHVwIFpvbmUuanNcbiAgYXdhaXQgaW1wb3J0KHpvbmVQYWNrYWdlKTtcblxuICAvLyBSZXR1cm4gdGhlIHJlbmRlciBmdW5jdGlvbiBmb3IgdXNlXG4gIHJldHVybiByZW5kZXI7XG59XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgZXhwb3J0IHdpbGwgYmUgdGhlIHByb21pc2UgcmV0dXJuZWQgYnkgdGhlIGluaXRpYWxpemUgZnVuY3Rpb24uXG4gKiBUaGlzIGlzIGF3YWl0ZWQgYnkgcGlzY2luYSBwcmlvciB0byB1c2luZyB0aGUgV29ya2VyLlxuICovXG5leHBvcnQgZGVmYXVsdCBpbml0aWFsaXplKCk7XG4iXX0=