/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
    async readFile(path) {
        let resourceContent = this.resourceCache.get(path);
        if (resourceContent === undefined) {
            resourceContent = await fs.promises.readFile(path, 'utf-8');
            this.resourceCache.set(path, resourceContent);
        }
        return resourceContent;
    }
}
export class InlineCriticalCssProcessor {
    constructor(options) {
        this.options = options;
        this.resourceCache = new Map();
    }
    async process(html, options) {
        const critters = new CrittersExtended({ ...this.options, ...options }, this.resourceCache);
        const content = await critters.process(html);
        return {
            content,
            errors: critters.errors.length ? critters.errors : undefined,
            warnings: critters.warnings.length ? critters.warnings : undefined,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lLWNzcy1wcm9jZXNzb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2NvbW1vbi90b29scy9zcmMvaW5saW5lLWNzcy1wcm9jZXNzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBaUJ6QixNQUFNLGdCQUFpQixTQUFRLFFBQVE7SUFJckMsWUFDbUIsZUFDZ0IsRUFDaEIsYUFBa0M7UUFFbkQsS0FBSyxDQUFDO1lBQ0osTUFBTSxFQUFFO2dCQUNOLElBQUksRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxLQUFLLEVBQUUsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUM7YUFDZjtZQUNELFFBQVEsRUFBRSxNQUFNO1lBQ2hCLElBQUksRUFBRSxlQUFlLENBQUMsVUFBVTtZQUNoQyxVQUFVLEVBQUUsZUFBZSxDQUFDLFNBQVM7WUFDckMsUUFBUSxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTTtZQUNsQyxXQUFXLEVBQUUsS0FBSztZQUNsQixrQkFBa0IsRUFBRSxLQUFLO1lBQ3pCLGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsT0FBTyxFQUFFLE9BQU87WUFDaEIsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixXQUFXLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUM7UUFwQmMsb0JBQWUsR0FBZixlQUFlLENBQ0M7UUFDaEIsa0JBQWEsR0FBYixhQUFhLENBQXFCO1FBTjVDLGFBQVEsR0FBYSxFQUFFLENBQUM7UUFDeEIsV0FBTSxHQUFhLEVBQUUsQ0FBQztJQXdCL0IsQ0FBQztJQUVlLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBWTtRQUN6QyxJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuRCxJQUFJLGVBQWUsS0FBSyxTQUFTLEVBQUU7WUFDakMsZUFBZSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzVELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztTQUMvQztRQUVELE9BQU8sZUFBZSxDQUFDO0lBQ3pCLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTywwQkFBMEI7SUFHckMsWUFBK0IsT0FBMEM7UUFBMUMsWUFBTyxHQUFQLE9BQU8sQ0FBbUM7UUFGeEQsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUVpQixDQUFDO0lBRTdFLEtBQUssQ0FBQyxPQUFPLENBQ1gsSUFBWSxFQUNaLE9BQXdDO1FBRXhDLE1BQU0sUUFBUSxHQUFHLElBQUksZ0JBQWdCLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDM0YsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTdDLE9BQU87WUFDTCxPQUFPO1lBQ1AsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQzVELFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUNuRSxDQUFDO0lBQ0osQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCBDcml0dGVycyBmcm9tICdjcml0dGVycyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzT3B0aW9ucyB7XG4gIG91dHB1dFBhdGg/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3JPcHRpb25zIHtcbiAgbWluaWZ5PzogYm9vbGVhbjtcbiAgZGVwbG95VXJsPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIElubGluZUNyaXRpY2FsQ3NzUmVzdWx0IHtcbiAgY29udGVudDogc3RyaW5nO1xuICB3YXJuaW5ncz86IHN0cmluZ1tdO1xuICBlcnJvcnM/OiBzdHJpbmdbXTtcbn1cblxuY2xhc3MgQ3JpdHRlcnNFeHRlbmRlZCBleHRlbmRzIENyaXR0ZXJzIHtcbiAgcmVhZG9ubHkgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gIHJlYWRvbmx5IGVycm9yczogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnNFeHRlbmRlZDogSW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3JPcHRpb25zICZcbiAgICAgIElubGluZUNyaXRpY2FsQ3NzUHJvY2Vzc09wdGlvbnMsXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXNvdXJjZUNhY2hlOiBNYXA8c3RyaW5nLCBzdHJpbmc+LFxuICApIHtcbiAgICBzdXBlcih7XG4gICAgICBsb2dnZXI6IHtcbiAgICAgICAgd2FybjogKHM6IHN0cmluZykgPT4gdGhpcy53YXJuaW5ncy5wdXNoKHMpLFxuICAgICAgICBlcnJvcjogKHM6IHN0cmluZykgPT4gdGhpcy5lcnJvcnMucHVzaChzKSxcbiAgICAgICAgaW5mbzogKCkgPT4ge30sXG4gICAgICB9LFxuICAgICAgbG9nTGV2ZWw6ICd3YXJuJyxcbiAgICAgIHBhdGg6IG9wdGlvbnNFeHRlbmRlZC5vdXRwdXRQYXRoLFxuICAgICAgcHVibGljUGF0aDogb3B0aW9uc0V4dGVuZGVkLmRlcGxveVVybCxcbiAgICAgIGNvbXByZXNzOiAhIW9wdGlvbnNFeHRlbmRlZC5taW5pZnksXG4gICAgICBwcnVuZVNvdXJjZTogZmFsc2UsXG4gICAgICByZWR1Y2VJbmxpbmVTdHlsZXM6IGZhbHNlLFxuICAgICAgbWVyZ2VTdHlsZXNoZWV0czogZmFsc2UsXG4gICAgICBwcmVsb2FkOiAnbWVkaWEnLFxuICAgICAgbm9zY3JpcHRGYWxsYmFjazogdHJ1ZSxcbiAgICAgIGlubGluZUZvbnRzOiB0cnVlLFxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIG92ZXJyaWRlIGFzeW5jIHJlYWRGaWxlKHBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgbGV0IHJlc291cmNlQ29udGVudCA9IHRoaXMucmVzb3VyY2VDYWNoZS5nZXQocGF0aCk7XG4gICAgaWYgKHJlc291cmNlQ29udGVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXNvdXJjZUNvbnRlbnQgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShwYXRoLCAndXRmLTgnKTtcbiAgICAgIHRoaXMucmVzb3VyY2VDYWNoZS5zZXQocGF0aCwgcmVzb3VyY2VDb250ZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzb3VyY2VDb250ZW50O1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbmxpbmVDcml0aWNhbENzc1Byb2Nlc3NvciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVzb3VyY2VDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRvbmx5IG9wdGlvbnM6IElubGluZUNyaXRpY2FsQ3NzUHJvY2Vzc29yT3B0aW9ucykge31cblxuICBhc3luYyBwcm9jZXNzKFxuICAgIGh0bWw6IHN0cmluZyxcbiAgICBvcHRpb25zOiBJbmxpbmVDcml0aWNhbENzc1Byb2Nlc3NPcHRpb25zLFxuICApOiBQcm9taXNlPElubGluZUNyaXRpY2FsQ3NzUmVzdWx0PiB7XG4gICAgY29uc3QgY3JpdHRlcnMgPSBuZXcgQ3JpdHRlcnNFeHRlbmRlZCh7IC4uLnRoaXMub3B0aW9ucywgLi4ub3B0aW9ucyB9LCB0aGlzLnJlc291cmNlQ2FjaGUpO1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCBjcml0dGVycy5wcm9jZXNzKGh0bWwpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbnRlbnQsXG4gICAgICBlcnJvcnM6IGNyaXR0ZXJzLmVycm9ycy5sZW5ndGggPyBjcml0dGVycy5lcnJvcnMgOiB1bmRlZmluZWQsXG4gICAgICB3YXJuaW5nczogY3JpdHRlcnMud2FybmluZ3MubGVuZ3RoID8gY3JpdHRlcnMud2FybmluZ3MgOiB1bmRlZmluZWQsXG4gICAgfTtcbiAgfVxufVxuIl19