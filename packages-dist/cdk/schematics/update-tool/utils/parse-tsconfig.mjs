"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTsconfigFile = exports.TsconfigParseError = void 0;
const ts = require("typescript");
const virtual_host_1 = require("./virtual-host");
const path_1 = require("path");
const diagnostics_1 = require("./diagnostics");
/** Class capturing a tsconfig parse error. */
class TsconfigParseError extends Error {
}
exports.TsconfigParseError = TsconfigParseError;
/**
 * Attempts to parse the specified tsconfig file.
 *
 * @throws {TsconfigParseError} If the tsconfig could not be read or parsed.
 */
function parseTsconfigFile(tsconfigPath, fileSystem) {
    if (!fileSystem.fileExists(tsconfigPath)) {
        throw new TsconfigParseError(`Tsconfig cannot not be read: ${tsconfigPath}`);
    }
    const { config, error } = ts.readConfigFile(tsconfigPath, p => fileSystem.read(fileSystem.resolve(p)));
    // If there is a config reading error, we never attempt to parse the config.
    if (error) {
        throw new TsconfigParseError((0, diagnostics_1.formatDiagnostics)([error], fileSystem));
    }
    const parsed = ts.parseJsonConfigFileContent(config, new virtual_host_1.FileSystemHost(fileSystem), (0, path_1.dirname)(tsconfigPath), {});
    if (parsed.errors.length) {
        throw new TsconfigParseError((0, diagnostics_1.formatDiagnostics)(parsed.errors, fileSystem));
    }
    return parsed;
}
exports.parseTsconfigFile = parseTsconfigFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtdHNjb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvY2RrL3NjaGVtYXRpY3MvdXBkYXRlLXRvb2wvdXRpbHMvcGFyc2UtdHNjb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsaUNBQWlDO0FBRWpDLGlEQUE4QztBQUM5QywrQkFBNkI7QUFDN0IsK0NBQWdEO0FBRWhELDhDQUE4QztBQUM5QyxNQUFhLGtCQUFtQixTQUFRLEtBQUs7Q0FBRztBQUFoRCxnREFBZ0Q7QUFFaEQ7Ozs7R0FJRztBQUNILFNBQWdCLGlCQUFpQixDQUMvQixZQUEyQixFQUMzQixVQUFzQjtJQUV0QixJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUN4QyxNQUFNLElBQUksa0JBQWtCLENBQUMsZ0NBQWdDLFlBQVksRUFBRSxDQUFDLENBQUM7S0FDOUU7SUFFRCxNQUFNLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQyxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQ3ZDLFlBQVksRUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUM3QyxDQUFDO0lBRUYsNEVBQTRFO0lBQzVFLElBQUksS0FBSyxFQUFFO1FBQ1QsTUFBTSxJQUFJLGtCQUFrQixDQUFDLElBQUEsK0JBQWlCLEVBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO0tBQ3RFO0lBRUQsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLDBCQUEwQixDQUMxQyxNQUFNLEVBQ04sSUFBSSw2QkFBYyxDQUFDLFVBQVUsQ0FBQyxFQUM5QixJQUFBLGNBQU8sRUFBQyxZQUFZLENBQUMsRUFDckIsRUFBRSxDQUNILENBQUM7SUFFRixJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO1FBQ3hCLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyxJQUFBLCtCQUFpQixFQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztLQUM1RTtJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUE5QkQsOENBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtGaWxlU3lzdGVtLCBXb3Jrc3BhY2VQYXRofSBmcm9tICcuLi9maWxlLXN5c3RlbSc7XG5pbXBvcnQge0ZpbGVTeXN0ZW1Ib3N0fSBmcm9tICcuL3ZpcnR1YWwtaG9zdCc7XG5pbXBvcnQge2Rpcm5hbWV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtmb3JtYXREaWFnbm9zdGljc30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5cbi8qKiBDbGFzcyBjYXB0dXJpbmcgYSB0c2NvbmZpZyBwYXJzZSBlcnJvci4gKi9cbmV4cG9ydCBjbGFzcyBUc2NvbmZpZ1BhcnNlRXJyb3IgZXh0ZW5kcyBFcnJvciB7fVxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIHBhcnNlIHRoZSBzcGVjaWZpZWQgdHNjb25maWcgZmlsZS5cbiAqXG4gKiBAdGhyb3dzIHtUc2NvbmZpZ1BhcnNlRXJyb3J9IElmIHRoZSB0c2NvbmZpZyBjb3VsZCBub3QgYmUgcmVhZCBvciBwYXJzZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRzY29uZmlnRmlsZShcbiAgdHNjb25maWdQYXRoOiBXb3Jrc3BhY2VQYXRoLFxuICBmaWxlU3lzdGVtOiBGaWxlU3lzdGVtLFxuKTogdHMuUGFyc2VkQ29tbWFuZExpbmUge1xuICBpZiAoIWZpbGVTeXN0ZW0uZmlsZUV4aXN0cyh0c2NvbmZpZ1BhdGgpKSB7XG4gICAgdGhyb3cgbmV3IFRzY29uZmlnUGFyc2VFcnJvcihgVHNjb25maWcgY2Fubm90IG5vdCBiZSByZWFkOiAke3RzY29uZmlnUGF0aH1gKTtcbiAgfVxuXG4gIGNvbnN0IHtjb25maWcsIGVycm9yfSA9IHRzLnJlYWRDb25maWdGaWxlKFxuICAgIHRzY29uZmlnUGF0aCxcbiAgICBwID0+IGZpbGVTeXN0ZW0ucmVhZChmaWxlU3lzdGVtLnJlc29sdmUocCkpISxcbiAgKTtcblxuICAvLyBJZiB0aGVyZSBpcyBhIGNvbmZpZyByZWFkaW5nIGVycm9yLCB3ZSBuZXZlciBhdHRlbXB0IHRvIHBhcnNlIHRoZSBjb25maWcuXG4gIGlmIChlcnJvcikge1xuICAgIHRocm93IG5ldyBUc2NvbmZpZ1BhcnNlRXJyb3IoZm9ybWF0RGlhZ25vc3RpY3MoW2Vycm9yXSwgZmlsZVN5c3RlbSkpO1xuICB9XG5cbiAgY29uc3QgcGFyc2VkID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoXG4gICAgY29uZmlnLFxuICAgIG5ldyBGaWxlU3lzdGVtSG9zdChmaWxlU3lzdGVtKSxcbiAgICBkaXJuYW1lKHRzY29uZmlnUGF0aCksXG4gICAge30sXG4gICk7XG5cbiAgaWYgKHBhcnNlZC5lcnJvcnMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFRzY29uZmlnUGFyc2VFcnJvcihmb3JtYXREaWFnbm9zdGljcyhwYXJzZWQuZXJyb3JzLCBmaWxlU3lzdGVtKSk7XG4gIH1cblxuICByZXR1cm4gcGFyc2VkO1xufVxuIl19