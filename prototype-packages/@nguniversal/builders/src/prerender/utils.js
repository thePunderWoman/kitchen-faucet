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
exports.getIndexOutputFile = exports.shardArray = exports.getRoutes = void 0;
const fs = __importStar(require("fs"));
const guess_parser_1 = require("guess-parser");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
/**
 * Returns the union of routes, the contents of routesFile if given,
 * and the static routes extracted if guessRoutes is set to true.
 */
async function getRoutes(options, tsConfigPath, context) {
    let routes = options.routes || [];
    const { logger, workspaceRoot } = context;
    if (options.routesFile) {
        const routesFilePath = path.join(workspaceRoot, options.routesFile);
        routes = routes.concat(fs
            .readFileSync(routesFilePath, 'utf8')
            .split(/\r?\n/)
            .filter((v) => !!v));
    }
    if (options.guessRoutes && tsConfigPath) {
        try {
            routes = routes.concat((0, guess_parser_1.parseAngularRoutes)(path.join(workspaceRoot, tsConfigPath))
                .map((routeObj) => routeObj.path)
                .filter((route) => !route.includes('*') && !route.includes(':')));
        }
        catch (e) {
            logger.error('Unable to extract routes from application.', e);
        }
    }
    routes = routes.map((r) => (r === '' ? '/' : r));
    return [...new Set(routes)];
}
exports.getRoutes = getRoutes;
/**
 * Evenly shards items in an array.
 * e.g. shardArray([1, 2, 3, 4], 2) => [[1, 2], [3, 4]]
 */
function shardArray(items, maxNoOfShards = os.cpus().length - 1 || 1) {
    const shardedArray = [];
    const numShards = Math.min(maxNoOfShards, items.length);
    for (let i = 0; i < numShards; i++) {
        shardedArray.push(items.filter((_, index) => index % numShards === i));
    }
    return shardedArray;
}
exports.shardArray = shardArray;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2J1aWxkZXJzL3NyYy9wcmVyZW5kZXIvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFJSCx1Q0FBeUI7QUFDekIsK0NBQWtEO0FBQ2xELHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFHN0I7OztHQUdHO0FBQ0ksS0FBSyxVQUFVLFNBQVMsQ0FDN0IsT0FBZ0MsRUFDaEMsWUFBZ0MsRUFDaEMsT0FBdUI7SUFFdkIsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUM7SUFDbEMsTUFBTSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDMUMsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO1FBQ3RCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNwRSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FDcEIsRUFBRTthQUNDLFlBQVksQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO2FBQ3BDLEtBQUssQ0FBQyxPQUFPLENBQUM7YUFDZCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDdEIsQ0FBQztLQUNIO0lBRUQsSUFBSSxPQUFPLENBQUMsV0FBVyxJQUFJLFlBQVksRUFBRTtRQUN2QyxJQUFJO1lBQ0YsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQ3BCLElBQUEsaUNBQWtCLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7aUJBQ3ZELEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztpQkFDaEMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ25FLENBQUM7U0FDSDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUMvRDtLQUNGO0lBRUQsTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRWpELE9BQU8sQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQWhDRCw4QkFnQ0M7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixVQUFVLENBQUksS0FBVSxFQUFFLGFBQWEsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDO0lBQ2pGLE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQztJQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNsQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEdBQUcsU0FBUyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDeEU7SUFFRCxPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDO0FBUkQsZ0NBUUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLGtCQUFrQixDQUFDLE9BQThCO0lBQy9ELElBQUksT0FBTyxPQUFPLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRTtRQUNyQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3JDO1NBQU07UUFDTCxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLFlBQVksQ0FBQztLQUM3QztBQUNILENBQUM7QUFORCxnREFNQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgcGFyc2VBbmd1bGFyUm91dGVzIH0gZnJvbSAnZ3Vlc3MtcGFyc2VyJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBQcmVyZW5kZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vbW9kZWxzJztcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB1bmlvbiBvZiByb3V0ZXMsIHRoZSBjb250ZW50cyBvZiByb3V0ZXNGaWxlIGlmIGdpdmVuLFxuICogYW5kIHRoZSBzdGF0aWMgcm91dGVzIGV4dHJhY3RlZCBpZiBndWVzc1JvdXRlcyBpcyBzZXQgdG8gdHJ1ZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFJvdXRlcyhcbiAgb3B0aW9uczogUHJlcmVuZGVyQnVpbGRlck9wdGlvbnMsXG4gIHRzQ29uZmlnUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbik6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgbGV0IHJvdXRlcyA9IG9wdGlvbnMucm91dGVzIHx8IFtdO1xuICBjb25zdCB7IGxvZ2dlciwgd29ya3NwYWNlUm9vdCB9ID0gY29udGV4dDtcbiAgaWYgKG9wdGlvbnMucm91dGVzRmlsZSkge1xuICAgIGNvbnN0IHJvdXRlc0ZpbGVQYXRoID0gcGF0aC5qb2luKHdvcmtzcGFjZVJvb3QsIG9wdGlvbnMucm91dGVzRmlsZSk7XG4gICAgcm91dGVzID0gcm91dGVzLmNvbmNhdChcbiAgICAgIGZzXG4gICAgICAgIC5yZWFkRmlsZVN5bmMocm91dGVzRmlsZVBhdGgsICd1dGY4JylcbiAgICAgICAgLnNwbGl0KC9cXHI/XFxuLylcbiAgICAgICAgLmZpbHRlcigodikgPT4gISF2KSxcbiAgICApO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuZ3Vlc3NSb3V0ZXMgJiYgdHNDb25maWdQYXRoKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJvdXRlcyA9IHJvdXRlcy5jb25jYXQoXG4gICAgICAgIHBhcnNlQW5ndWxhclJvdXRlcyhwYXRoLmpvaW4od29ya3NwYWNlUm9vdCwgdHNDb25maWdQYXRoKSlcbiAgICAgICAgICAubWFwKChyb3V0ZU9iaikgPT4gcm91dGVPYmoucGF0aClcbiAgICAgICAgICAuZmlsdGVyKChyb3V0ZSkgPT4gIXJvdXRlLmluY2x1ZGVzKCcqJykgJiYgIXJvdXRlLmluY2x1ZGVzKCc6JykpLFxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1VuYWJsZSB0byBleHRyYWN0IHJvdXRlcyBmcm9tIGFwcGxpY2F0aW9uLicsIGUpO1xuICAgIH1cbiAgfVxuXG4gIHJvdXRlcyA9IHJvdXRlcy5tYXAoKHIpID0+IChyID09PSAnJyA/ICcvJyA6IHIpKTtcblxuICByZXR1cm4gWy4uLm5ldyBTZXQocm91dGVzKV07XG59XG5cbi8qKlxuICogRXZlbmx5IHNoYXJkcyBpdGVtcyBpbiBhbiBhcnJheS5cbiAqIGUuZy4gc2hhcmRBcnJheShbMSwgMiwgMywgNF0sIDIpID0+IFtbMSwgMl0sIFszLCA0XV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNoYXJkQXJyYXk8VD4oaXRlbXM6IFRbXSwgbWF4Tm9PZlNoYXJkcyA9IG9zLmNwdXMoKS5sZW5ndGggLSAxIHx8IDEpOiBUW11bXSB7XG4gIGNvbnN0IHNoYXJkZWRBcnJheSA9IFtdO1xuICBjb25zdCBudW1TaGFyZHMgPSBNYXRoLm1pbihtYXhOb09mU2hhcmRzLCBpdGVtcy5sZW5ndGgpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVNoYXJkczsgaSsrKSB7XG4gICAgc2hhcmRlZEFycmF5LnB1c2goaXRlbXMuZmlsdGVyKChfLCBpbmRleCkgPT4gaW5kZXggJSBudW1TaGFyZHMgPT09IGkpKTtcbiAgfVxuXG4gIHJldHVybiBzaGFyZGVkQXJyYXk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbmFtZSBvZiB0aGUgaW5kZXggZmlsZSBvdXRwdXR0ZWQgYnkgdGhlIGJyb3dzZXIgYnVpbGRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEluZGV4T3V0cHV0RmlsZShvcHRpb25zOiBCcm93c2VyQnVpbGRlck9wdGlvbnMpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIG9wdGlvbnMuaW5kZXggPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHBhdGguYmFzZW5hbWUob3B0aW9ucy5pbmRleCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuaW5kZXgub3V0cHV0IHx8ICdpbmRleC5odG1sJztcbiAgfVxufVxuIl19