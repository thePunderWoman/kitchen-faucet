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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIndexOutputFile = exports.getRoutes = void 0;
const fs = __importStar(require("fs"));
const guess_parser_1 = require("guess-parser");
const path = __importStar(require("path"));
/**
 * Returns the union of routes, the contents of routesFile if given,
 * and the static routes extracted if guessRoutes is set to true.
 */
async function getRoutes(options, tsConfigPath, context) {
    const { routes = [] } = options;
    const { logger, workspaceRoot } = context;
    if (options.routesFile) {
        const routesFilePath = path.join(workspaceRoot, options.routesFile);
        routes.push(...fs
            .readFileSync(routesFilePath, 'utf8')
            .split(/\r?\n/)
            .filter((v) => !!v));
    }
    if (options.guessRoutes && tsConfigPath) {
        try {
            routes.push(...(0, guess_parser_1.parseAngularRoutes)(path.join(workspaceRoot, tsConfigPath))
                .map((routeObj) => routeObj.path)
                .filter((route) => !route.includes('*') && !route.includes(':')));
        }
        catch (e) {
            logger.error('Unable to extract routes from application.', e);
        }
    }
    return [...routes.map((r) => (r === '' ? '/' : r))];
}
exports.getRoutes = getRoutes;
/**
 * Returns the name of the index file outputted by the browser builder.
 */
function getIndexOutputFile(options) {
    if (typeof options.index === 'string') {
        return path.basename(options.index);
    }
    else {
        return options.index.output || 'index.html';
    }
}
exports.getIndexOutputFile = getIndexOutputFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2J1aWxkZXJzL3NyYy9zdGF0aWMtZ2VuZXJhdG9yL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBSUgsdUNBQXlCO0FBQ3pCLCtDQUFrRDtBQUNsRCwyQ0FBNkI7QUFHN0I7OztHQUdHO0FBQ0ksS0FBSyxVQUFVLFNBQVMsQ0FDN0IsT0FBZ0MsRUFDaEMsWUFBZ0MsRUFDaEMsT0FBdUI7SUFFdkIsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDaEMsTUFBTSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDMUMsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO1FBQ3RCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNwRSxNQUFNLENBQUMsSUFBSSxDQUNULEdBQUcsRUFBRTthQUNGLFlBQVksQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO2FBQ3BDLEtBQUssQ0FBQyxPQUFPLENBQUM7YUFDZCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDdEIsQ0FBQztLQUNIO0lBRUQsSUFBSSxPQUFPLENBQUMsV0FBVyxJQUFJLFlBQVksRUFBRTtRQUN2QyxJQUFJO1lBQ0YsTUFBTSxDQUFDLElBQUksQ0FDVCxHQUFHLElBQUEsaUNBQWtCLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7aUJBQzFELEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztpQkFDaEMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ25FLENBQUM7U0FDSDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUMvRDtLQUNGO0lBRUQsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RCxDQUFDO0FBOUJELDhCQThCQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0Isa0JBQWtCLENBQUMsT0FBOEI7SUFDL0QsSUFBSSxPQUFPLE9BQU8sQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDckM7U0FBTTtRQUNMLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksWUFBWSxDQUFDO0tBQzdDO0FBQ0gsQ0FBQztBQU5ELGdEQU1DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBCcm93c2VyQnVpbGRlck9wdGlvbnMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeyBwYXJzZUFuZ3VsYXJSb3V0ZXMgfSBmcm9tICdndWVzcy1wYXJzZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFNjaGVtYSBhcyBQcmVyZW5kZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB1bmlvbiBvZiByb3V0ZXMsIHRoZSBjb250ZW50cyBvZiByb3V0ZXNGaWxlIGlmIGdpdmVuLFxuICogYW5kIHRoZSBzdGF0aWMgcm91dGVzIGV4dHJhY3RlZCBpZiBndWVzc1JvdXRlcyBpcyBzZXQgdG8gdHJ1ZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFJvdXRlcyhcbiAgb3B0aW9uczogUHJlcmVuZGVyQnVpbGRlck9wdGlvbnMsXG4gIHRzQ29uZmlnUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbik6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgY29uc3QgeyByb3V0ZXMgPSBbXSB9ID0gb3B0aW9ucztcbiAgY29uc3QgeyBsb2dnZXIsIHdvcmtzcGFjZVJvb3QgfSA9IGNvbnRleHQ7XG4gIGlmIChvcHRpb25zLnJvdXRlc0ZpbGUpIHtcbiAgICBjb25zdCByb3V0ZXNGaWxlUGF0aCA9IHBhdGguam9pbih3b3Jrc3BhY2VSb290LCBvcHRpb25zLnJvdXRlc0ZpbGUpO1xuICAgIHJvdXRlcy5wdXNoKFxuICAgICAgLi4uZnNcbiAgICAgICAgLnJlYWRGaWxlU3luYyhyb3V0ZXNGaWxlUGF0aCwgJ3V0ZjgnKVxuICAgICAgICAuc3BsaXQoL1xccj9cXG4vKVxuICAgICAgICAuZmlsdGVyKCh2KSA9PiAhIXYpLFxuICAgICk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5ndWVzc1JvdXRlcyAmJiB0c0NvbmZpZ1BhdGgpIHtcbiAgICB0cnkge1xuICAgICAgcm91dGVzLnB1c2goXG4gICAgICAgIC4uLnBhcnNlQW5ndWxhclJvdXRlcyhwYXRoLmpvaW4od29ya3NwYWNlUm9vdCwgdHNDb25maWdQYXRoKSlcbiAgICAgICAgICAubWFwKChyb3V0ZU9iaikgPT4gcm91dGVPYmoucGF0aClcbiAgICAgICAgICAuZmlsdGVyKChyb3V0ZSkgPT4gIXJvdXRlLmluY2x1ZGVzKCcqJykgJiYgIXJvdXRlLmluY2x1ZGVzKCc6JykpLFxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1VuYWJsZSB0byBleHRyYWN0IHJvdXRlcyBmcm9tIGFwcGxpY2F0aW9uLicsIGUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbLi4ucm91dGVzLm1hcCgocikgPT4gKHIgPT09ICcnID8gJy8nIDogcikpXTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSBpbmRleCBmaWxlIG91dHB1dHRlZCBieSB0aGUgYnJvd3NlciBidWlsZGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW5kZXhPdXRwdXRGaWxlKG9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucy5pbmRleCA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gcGF0aC5iYXNlbmFtZShvcHRpb25zLmluZGV4KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb3B0aW9ucy5pbmRleC5vdXRwdXQgfHwgJ2luZGV4Lmh0bWwnO1xuICB9XG59XG4iXX0=