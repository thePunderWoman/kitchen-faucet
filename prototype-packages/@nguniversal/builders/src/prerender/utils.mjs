/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as fs from 'fs';
import { parseAngularRoutes } from 'guess-parser';
import * as os from 'os';
import * as path from 'path';
/**
 * Returns the union of routes, the contents of routesFile if given,
 * and the static routes extracted if guessRoutes is set to true.
 */
export function getRoutes(options, tsConfigPath, context) {
    return __awaiter(this, void 0, void 0, function* () {
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
                routes = routes.concat(parseAngularRoutes(path.join(workspaceRoot, tsConfigPath))
                    .map((routeObj) => routeObj.path)
                    .filter((route) => !route.includes('*') && !route.includes(':')));
            }
            catch (e) {
                logger.error('Unable to extract routes from application.', e);
            }
        }
        routes = routes.map((r) => (r === '' ? '/' : r));
        return [...new Set(routes)];
    });
}
/**
 * Evenly shards items in an array.
 * e.g. shardArray([1, 2, 3, 4], 2) => [[1, 2], [3, 4]]
 */
export function shardArray(items, maxNoOfShards = os.cpus().length - 1 || 1) {
    const shardedArray = [];
    const numShards = Math.min(maxNoOfShards, items.length);
    for (let i = 0; i < numShards; i++) {
        shardedArray.push(items.filter((_, index) => index % numShards === i));
    }
    return shardedArray;
}
/**
 * Returns the name of the index file outputted by the browser builder.
 */
export function getIndexOutputFile(options) {
    if (typeof options.index === 'string') {
        return path.basename(options.index);
    }
    else {
        return options.index.output || 'index.html';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2J1aWxkZXJzL3NyYy9wcmVyZW5kZXIvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBSUgsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ2xELE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBRzdCOzs7R0FHRztBQUNILE1BQU0sVUFBZ0IsU0FBUyxDQUM3QixPQUFnQyxFQUNoQyxZQUFnQyxFQUNoQyxPQUF1Qjs7UUFFdkIsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDbEMsTUFBTSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUM7UUFDMUMsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO1lBQ3RCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwRSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FDcEIsRUFBRTtpQkFDQyxZQUFZLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztpQkFDcEMsS0FBSyxDQUFDLE9BQU8sQ0FBQztpQkFDZCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDdEIsQ0FBQztTQUNIO1FBRUQsSUFBSSxPQUFPLENBQUMsV0FBVyxJQUFJLFlBQVksRUFBRTtZQUN2QyxJQUFJO2dCQUNGLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUNwQixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQztxQkFDdkQsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO3FCQUNoQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FDbkUsQ0FBQzthQUNIO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUMvRDtTQUNGO1FBRUQsTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWpELE9BQU8sQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUFBO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLFVBQVUsQ0FBSSxLQUFVLEVBQUUsYUFBYSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUM7SUFDakYsTUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDO0lBQ3hCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2xDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN4RTtJQUVELE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxPQUE4QjtJQUMvRCxJQUFJLE9BQU8sT0FBTyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7UUFDckMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNyQztTQUFNO1FBQ0wsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxZQUFZLENBQUM7S0FDN0M7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBCcm93c2VyQnVpbGRlck9wdGlvbnMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeyBwYXJzZUFuZ3VsYXJSb3V0ZXMgfSBmcm9tICdndWVzcy1wYXJzZXInO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFByZXJlbmRlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi9tb2RlbHMnO1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHVuaW9uIG9mIHJvdXRlcywgdGhlIGNvbnRlbnRzIG9mIHJvdXRlc0ZpbGUgaWYgZ2l2ZW4sXG4gKiBhbmQgdGhlIHN0YXRpYyByb3V0ZXMgZXh0cmFjdGVkIGlmIGd1ZXNzUm91dGVzIGlzIHNldCB0byB0cnVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Um91dGVzKFxuICBvcHRpb25zOiBQcmVyZW5kZXJCdWlsZGVyT3B0aW9ucyxcbiAgdHNDb25maWdQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICBsZXQgcm91dGVzID0gb3B0aW9ucy5yb3V0ZXMgfHwgW107XG4gIGNvbnN0IHsgbG9nZ2VyLCB3b3Jrc3BhY2VSb290IH0gPSBjb250ZXh0O1xuICBpZiAob3B0aW9ucy5yb3V0ZXNGaWxlKSB7XG4gICAgY29uc3Qgcm91dGVzRmlsZVBhdGggPSBwYXRoLmpvaW4od29ya3NwYWNlUm9vdCwgb3B0aW9ucy5yb3V0ZXNGaWxlKTtcbiAgICByb3V0ZXMgPSByb3V0ZXMuY29uY2F0KFxuICAgICAgZnNcbiAgICAgICAgLnJlYWRGaWxlU3luYyhyb3V0ZXNGaWxlUGF0aCwgJ3V0ZjgnKVxuICAgICAgICAuc3BsaXQoL1xccj9cXG4vKVxuICAgICAgICAuZmlsdGVyKCh2KSA9PiAhIXYpLFxuICAgICk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5ndWVzc1JvdXRlcyAmJiB0c0NvbmZpZ1BhdGgpIHtcbiAgICB0cnkge1xuICAgICAgcm91dGVzID0gcm91dGVzLmNvbmNhdChcbiAgICAgICAgcGFyc2VBbmd1bGFyUm91dGVzKHBhdGguam9pbih3b3Jrc3BhY2VSb290LCB0c0NvbmZpZ1BhdGgpKVxuICAgICAgICAgIC5tYXAoKHJvdXRlT2JqKSA9PiByb3V0ZU9iai5wYXRoKVxuICAgICAgICAgIC5maWx0ZXIoKHJvdXRlKSA9PiAhcm91dGUuaW5jbHVkZXMoJyonKSAmJiAhcm91dGUuaW5jbHVkZXMoJzonKSksXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignVW5hYmxlIHRvIGV4dHJhY3Qgcm91dGVzIGZyb20gYXBwbGljYXRpb24uJywgZSk7XG4gICAgfVxuICB9XG5cbiAgcm91dGVzID0gcm91dGVzLm1hcCgocikgPT4gKHIgPT09ICcnID8gJy8nIDogcikpO1xuXG4gIHJldHVybiBbLi4ubmV3IFNldChyb3V0ZXMpXTtcbn1cblxuLyoqXG4gKiBFdmVubHkgc2hhcmRzIGl0ZW1zIGluIGFuIGFycmF5LlxuICogZS5nLiBzaGFyZEFycmF5KFsxLCAyLCAzLCA0XSwgMikgPT4gW1sxLCAyXSwgWzMsIDRdXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2hhcmRBcnJheTxUPihpdGVtczogVFtdLCBtYXhOb09mU2hhcmRzID0gb3MuY3B1cygpLmxlbmd0aCAtIDEgfHwgMSk6IFRbXVtdIHtcbiAgY29uc3Qgc2hhcmRlZEFycmF5ID0gW107XG4gIGNvbnN0IG51bVNoYXJkcyA9IE1hdGgubWluKG1heE5vT2ZTaGFyZHMsIGl0ZW1zLmxlbmd0aCk7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtU2hhcmRzOyBpKyspIHtcbiAgICBzaGFyZGVkQXJyYXkucHVzaChpdGVtcy5maWx0ZXIoKF8sIGluZGV4KSA9PiBpbmRleCAlIG51bVNoYXJkcyA9PT0gaSkpO1xuICB9XG5cbiAgcmV0dXJuIHNoYXJkZWRBcnJheTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSBpbmRleCBmaWxlIG91dHB1dHRlZCBieSB0aGUgYnJvd3NlciBidWlsZGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW5kZXhPdXRwdXRGaWxlKG9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucy5pbmRleCA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gcGF0aC5iYXNlbmFtZShvcHRpb25zLmluZGV4KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb3B0aW9ucy5pbmRleC5vdXRwdXQgfHwgJ2luZGV4Lmh0bWwnO1xuICB9XG59XG4iXX0=