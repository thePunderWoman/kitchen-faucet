/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { promises } from 'fs';
import { ResourceLoader } from 'jsdom';
import { normalize } from 'path';
export class CustomResourceLoader extends ResourceLoader {
    constructor(headers, publicPath, baseUrl, fileCache) {
        super({
            userAgent: headers?.['user-agent'],
        });
        this.headers = headers;
        this.publicPath = publicPath;
        this.baseUrl = baseUrl;
        this.fileCache = fileCache;
    }
    fetch(url, _options) {
        if (!url.endsWith('.js') || !url.startsWith(this.baseUrl)) {
            return null;
        }
        const path = normalize(url.replace(this.baseUrl, this.publicPath));
        if (this.fileCache.has(path)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const filePromise = Promise.resolve(this.fileCache.get(path));
            filePromise.abort = () => undefined;
            return filePromise;
        }
        const promise = promises.readFile(path, 'utf-8').then((content) => {
            if (path.includes('runtime.')) {
                // JSDOM doesn't support type=module, which will be added to lazy loaded scripts.
                // https://github.com/jsdom/jsdom/issues/2475
                content = content.replace(/\.type\s?=\s?['"]module["']/, '');
            }
            this.fileCache.set(path, Buffer.from(content));
            return content;
        });
        promise.abort = () => undefined;
        return promise;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tLXJlc291cmNlLWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL21vZHVsZXMvY29tbW9uL2Nsb3Zlci9zZXJ2ZXIvc3JjL2N1c3RvbS1yZXNvdXJjZS1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQztBQUM5QixPQUFPLEVBQWtDLGNBQWMsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUN2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBRWpDLE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxjQUFjO0lBQ3RELFlBQ1csT0FBa0UsRUFDMUQsVUFBa0IsRUFDbEIsT0FBZSxFQUNmLFNBQThCO1FBRS9DLEtBQUssQ0FBQztZQUNKLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQXVCO1NBQ3pELENBQUMsQ0FBQztRQVBNLFlBQU8sR0FBUCxPQUFPLENBQTJEO1FBQzFELGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLGNBQVMsR0FBVCxTQUFTLENBQXFCO0lBS2pELENBQUM7SUFFRCxLQUFLLENBQUMsR0FBVyxFQUFFLFFBQXNCO1FBQ3ZDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDekQsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM1QixvRUFBb0U7WUFDcEUsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBNkIsQ0FBQztZQUMzRixXQUFXLENBQUMsS0FBSyxHQUFHLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQztZQUVwQyxPQUFPLFdBQVcsQ0FBQztTQUNwQjtRQUVELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ2hFLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDN0IsaUZBQWlGO2dCQUNqRiw2Q0FBNkM7Z0JBQzdDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLDZCQUE2QixFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQzlEO1lBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUUvQyxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDLENBQTZCLENBQUM7UUFFL0IsT0FBTyxDQUFDLEtBQUssR0FBRyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUM7UUFFaEMsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHByb21pc2VzIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgQWJvcnRhYmxlUHJvbWlzZSwgRmV0Y2hPcHRpb25zLCBSZXNvdXJjZUxvYWRlciB9IGZyb20gJ2pzZG9tJztcbmltcG9ydCB7IG5vcm1hbGl6ZSB9IGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgY2xhc3MgQ3VzdG9tUmVzb3VyY2VMb2FkZXIgZXh0ZW5kcyBSZXNvdXJjZUxvYWRlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHJlYWRvbmx5IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHVuZGVmaW5lZCB8IHN0cmluZ1tdPiB8IHVuZGVmaW5lZCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHB1YmxpY1BhdGg6IHN0cmluZyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJhc2VVcmw6IHN0cmluZyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVDYWNoZTogTWFwPHN0cmluZywgQnVmZmVyPixcbiAgKSB7XG4gICAgc3VwZXIoe1xuICAgICAgdXNlckFnZW50OiBoZWFkZXJzPy5bJ3VzZXItYWdlbnQnXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgfSk7XG4gIH1cblxuICBmZXRjaCh1cmw6IHN0cmluZywgX29wdGlvbnM6IEZldGNoT3B0aW9ucyk6IEFib3J0YWJsZVByb21pc2U8QnVmZmVyPiB8IG51bGwge1xuICAgIGlmICghdXJsLmVuZHNXaXRoKCcuanMnKSB8fCAhdXJsLnN0YXJ0c1dpdGgodGhpcy5iYXNlVXJsKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGF0aCA9IG5vcm1hbGl6ZSh1cmwucmVwbGFjZSh0aGlzLmJhc2VVcmwsIHRoaXMucHVibGljUGF0aCkpO1xuICAgIGlmICh0aGlzLmZpbGVDYWNoZS5oYXMocGF0aCkpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICBjb25zdCBmaWxlUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSh0aGlzLmZpbGVDYWNoZS5nZXQocGF0aCkhKSBhcyBBYm9ydGFibGVQcm9taXNlPEJ1ZmZlcj47XG4gICAgICBmaWxlUHJvbWlzZS5hYm9ydCA9ICgpID0+IHVuZGVmaW5lZDtcblxuICAgICAgcmV0dXJuIGZpbGVQcm9taXNlO1xuICAgIH1cblxuICAgIGNvbnN0IHByb21pc2UgPSBwcm9taXNlcy5yZWFkRmlsZShwYXRoLCAndXRmLTgnKS50aGVuKChjb250ZW50KSA9PiB7XG4gICAgICBpZiAocGF0aC5pbmNsdWRlcygncnVudGltZS4nKSkge1xuICAgICAgICAvLyBKU0RPTSBkb2Vzbid0IHN1cHBvcnQgdHlwZT1tb2R1bGUsIHdoaWNoIHdpbGwgYmUgYWRkZWQgdG8gbGF6eSBsb2FkZWQgc2NyaXB0cy5cbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2pzZG9tL2pzZG9tL2lzc3Vlcy8yNDc1XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1xcLnR5cGVcXHM/PVxccz9bJ1wiXW1vZHVsZVtcIiddLywgJycpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmZpbGVDYWNoZS5zZXQocGF0aCwgQnVmZmVyLmZyb20oY29udGVudCkpO1xuXG4gICAgICByZXR1cm4gY29udGVudDtcbiAgICB9KSBhcyBBYm9ydGFibGVQcm9taXNlPEJ1ZmZlcj47XG5cbiAgICBwcm9taXNlLmFib3J0ID0gKCkgPT4gdW5kZWZpbmVkO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cbn1cbiJdfQ==