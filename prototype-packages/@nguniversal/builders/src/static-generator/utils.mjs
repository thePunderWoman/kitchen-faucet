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
import * as path from 'path';
/**
 * Returns the union of routes, the contents of routesFile if given,
 * and the static routes extracted if guessRoutes is set to true.
 */
export function getRoutes(options, tsConfigPath, context) {
    return __awaiter(this, void 0, void 0, function* () {
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
                routes.push(...parseAngularRoutes(path.join(workspaceRoot, tsConfigPath))
                    .map((routeObj) => routeObj.path)
                    .filter((route) => !route.includes('*') && !route.includes(':')));
            }
            catch (e) {
                logger.error('Unable to extract routes from application.', e);
            }
        }
        return [...routes.map((r) => (r === '' ? '/' : r))];
    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2J1aWxkZXJzL3NyYy9zdGF0aWMtZ2VuZXJhdG9yL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUlILE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUNsRCxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUc3Qjs7O0dBR0c7QUFDSCxNQUFNLFVBQWdCLFNBQVMsQ0FDN0IsT0FBZ0MsRUFDaEMsWUFBZ0MsRUFDaEMsT0FBdUI7O1FBRXZCLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxFQUFFLEdBQUcsT0FBTyxDQUFDO1FBQ2hDLE1BQU0sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLEdBQUcsT0FBTyxDQUFDO1FBQzFDLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRTtZQUN0QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLElBQUksQ0FDVCxHQUFHLEVBQUU7aUJBQ0YsWUFBWSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7aUJBQ3BDLEtBQUssQ0FBQyxPQUFPLENBQUM7aUJBQ2QsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ3RCLENBQUM7U0FDSDtRQUVELElBQUksT0FBTyxDQUFDLFdBQVcsSUFBSSxZQUFZLEVBQUU7WUFDdkMsSUFBSTtnQkFDRixNQUFNLENBQUMsSUFBSSxDQUNULEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7cUJBQzFELEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztxQkFDaEMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ25FLENBQUM7YUFDSDtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxLQUFLLENBQUMsNENBQTRDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDL0Q7U0FDRjtRQUVELE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztDQUFBO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsT0FBOEI7SUFDL0QsSUFBSSxPQUFPLE9BQU8sQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDckM7U0FBTTtRQUNMLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksWUFBWSxDQUFDO0tBQzdDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgcGFyc2VBbmd1bGFyUm91dGVzIH0gZnJvbSAnZ3Vlc3MtcGFyc2VyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgUHJlcmVuZGVyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdW5pb24gb2Ygcm91dGVzLCB0aGUgY29udGVudHMgb2Ygcm91dGVzRmlsZSBpZiBnaXZlbixcbiAqIGFuZCB0aGUgc3RhdGljIHJvdXRlcyBleHRyYWN0ZWQgaWYgZ3Vlc3NSb3V0ZXMgaXMgc2V0IHRvIHRydWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRSb3V0ZXMoXG4gIG9wdGlvbnM6IFByZXJlbmRlckJ1aWxkZXJPcHRpb25zLFxuICB0c0NvbmZpZ1BhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4pOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gIGNvbnN0IHsgcm91dGVzID0gW10gfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHsgbG9nZ2VyLCB3b3Jrc3BhY2VSb290IH0gPSBjb250ZXh0O1xuICBpZiAob3B0aW9ucy5yb3V0ZXNGaWxlKSB7XG4gICAgY29uc3Qgcm91dGVzRmlsZVBhdGggPSBwYXRoLmpvaW4od29ya3NwYWNlUm9vdCwgb3B0aW9ucy5yb3V0ZXNGaWxlKTtcbiAgICByb3V0ZXMucHVzaChcbiAgICAgIC4uLmZzXG4gICAgICAgIC5yZWFkRmlsZVN5bmMocm91dGVzRmlsZVBhdGgsICd1dGY4JylcbiAgICAgICAgLnNwbGl0KC9cXHI/XFxuLylcbiAgICAgICAgLmZpbHRlcigodikgPT4gISF2KSxcbiAgICApO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuZ3Vlc3NSb3V0ZXMgJiYgdHNDb25maWdQYXRoKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJvdXRlcy5wdXNoKFxuICAgICAgICAuLi5wYXJzZUFuZ3VsYXJSb3V0ZXMocGF0aC5qb2luKHdvcmtzcGFjZVJvb3QsIHRzQ29uZmlnUGF0aCkpXG4gICAgICAgICAgLm1hcCgocm91dGVPYmopID0+IHJvdXRlT2JqLnBhdGgpXG4gICAgICAgICAgLmZpbHRlcigocm91dGUpID0+ICFyb3V0ZS5pbmNsdWRlcygnKicpICYmICFyb3V0ZS5pbmNsdWRlcygnOicpKSxcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdVbmFibGUgdG8gZXh0cmFjdCByb3V0ZXMgZnJvbSBhcHBsaWNhdGlvbi4nLCBlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gWy4uLnJvdXRlcy5tYXAoKHIpID0+IChyID09PSAnJyA/ICcvJyA6IHIpKV07XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbmFtZSBvZiB0aGUgaW5kZXggZmlsZSBvdXRwdXR0ZWQgYnkgdGhlIGJyb3dzZXIgYnVpbGRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEluZGV4T3V0cHV0RmlsZShvcHRpb25zOiBCcm93c2VyQnVpbGRlck9wdGlvbnMpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIG9wdGlvbnMuaW5kZXggPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHBhdGguYmFzZW5hbWUob3B0aW9ucy5pbmRleCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuaW5kZXgub3V0cHV0IHx8ICdpbmRleC5odG1sJztcbiAgfVxufVxuIl19