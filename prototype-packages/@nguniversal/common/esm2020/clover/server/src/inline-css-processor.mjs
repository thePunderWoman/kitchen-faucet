/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import Critters from 'critters';
import { promises } from 'fs';
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
            resourceContent = await promises.readFile(path);
            this.resourceCache.set(path, resourceContent);
        }
        return resourceContent.toString();
    }
}
export class InlineCriticalCssProcessor {
    constructor(options, resourceCache) {
        this.options = options;
        this.resourceCache = resourceCache;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lLWNzcy1wcm9jZXNzb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2NvbW1vbi9jbG92ZXIvc2VydmVyL3NyYy9pbmxpbmUtY3NzLXByb2Nlc3Nvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQztBQWlCOUIsTUFBTSxnQkFBaUIsU0FBUSxRQUFRO0lBSXJDLFlBQ21CLGVBQ2dCLEVBQ2hCLGFBQWtDO1FBRW5ELEtBQUssQ0FBQztZQUNKLE1BQU0sRUFBRTtnQkFDTixJQUFJLEVBQUUsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDMUMsS0FBSyxFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3pDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO2FBQ2Y7WUFDRCxRQUFRLEVBQUUsTUFBTTtZQUNoQixJQUFJLEVBQUUsZUFBZSxDQUFDLFVBQVU7WUFDaEMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxTQUFTO1lBQ3JDLFFBQVEsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU07WUFDbEMsV0FBVyxFQUFFLEtBQUs7WUFDbEIsa0JBQWtCLEVBQUUsS0FBSztZQUN6QixnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsV0FBVyxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFDO1FBcEJjLG9CQUFlLEdBQWYsZUFBZSxDQUNDO1FBQ2hCLGtCQUFhLEdBQWIsYUFBYSxDQUFxQjtRQU41QyxhQUFRLEdBQWEsRUFBRSxDQUFDO1FBQ3hCLFdBQU0sR0FBYSxFQUFFLENBQUM7SUF3Qi9CLENBQUM7SUFFZSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQVk7UUFDekMsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkQsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFO1lBQ2pDLGVBQWUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1NBQy9DO1FBRUQsT0FBTyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDcEMsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLDBCQUEwQjtJQUNyQyxZQUNxQixPQUEwQyxFQUM1QyxhQUFrQztRQURoQyxZQUFPLEdBQVAsT0FBTyxDQUFtQztRQUM1QyxrQkFBYSxHQUFiLGFBQWEsQ0FBcUI7SUFDbEQsQ0FBQztJQUVKLEtBQUssQ0FBQyxPQUFPLENBQ1gsSUFBWSxFQUNaLE9BQXdDO1FBRXhDLE1BQU0sUUFBUSxHQUFHLElBQUksZ0JBQWdCLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDM0YsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTdDLE9BQU87WUFDTCxPQUFPO1lBQ1AsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQzVELFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUNuRSxDQUFDO0lBQ0osQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCBDcml0dGVycyBmcm9tICdjcml0dGVycyc7XG5pbXBvcnQgeyBwcm9taXNlcyB9IGZyb20gJ2ZzJztcblxuZXhwb3J0IGludGVyZmFjZSBJbmxpbmVDcml0aWNhbENzc1Byb2Nlc3NPcHRpb25zIHtcbiAgb3V0cHV0UGF0aD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbmxpbmVDcml0aWNhbENzc1Byb2Nlc3Nvck9wdGlvbnMge1xuICBtaW5pZnk/OiBib29sZWFuO1xuICBkZXBsb3lVcmw/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5saW5lQ3JpdGljYWxDc3NSZXN1bHQge1xuICBjb250ZW50OiBzdHJpbmc7XG4gIHdhcm5pbmdzPzogc3RyaW5nW107XG4gIGVycm9ycz86IHN0cmluZ1tdO1xufVxuXG5jbGFzcyBDcml0dGVyc0V4dGVuZGVkIGV4dGVuZHMgQ3JpdHRlcnMge1xuICByZWFkb25seSB3YXJuaW5nczogc3RyaW5nW10gPSBbXTtcbiAgcmVhZG9ubHkgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uc0V4dGVuZGVkOiBJbmxpbmVDcml0aWNhbENzc1Byb2Nlc3Nvck9wdGlvbnMgJlxuICAgICAgSW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzT3B0aW9ucyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJlc291cmNlQ2FjaGU6IE1hcDxzdHJpbmcsIEJ1ZmZlcj4sXG4gICkge1xuICAgIHN1cGVyKHtcbiAgICAgIGxvZ2dlcjoge1xuICAgICAgICB3YXJuOiAoczogc3RyaW5nKSA9PiB0aGlzLndhcm5pbmdzLnB1c2gocyksXG4gICAgICAgIGVycm9yOiAoczogc3RyaW5nKSA9PiB0aGlzLmVycm9ycy5wdXNoKHMpLFxuICAgICAgICBpbmZvOiAoKSA9PiB7fSxcbiAgICAgIH0sXG4gICAgICBsb2dMZXZlbDogJ3dhcm4nLFxuICAgICAgcGF0aDogb3B0aW9uc0V4dGVuZGVkLm91dHB1dFBhdGgsXG4gICAgICBwdWJsaWNQYXRoOiBvcHRpb25zRXh0ZW5kZWQuZGVwbG95VXJsLFxuICAgICAgY29tcHJlc3M6ICEhb3B0aW9uc0V4dGVuZGVkLm1pbmlmeSxcbiAgICAgIHBydW5lU291cmNlOiBmYWxzZSxcbiAgICAgIHJlZHVjZUlubGluZVN0eWxlczogZmFsc2UsXG4gICAgICBtZXJnZVN0eWxlc2hlZXRzOiBmYWxzZSxcbiAgICAgIHByZWxvYWQ6ICdtZWRpYScsXG4gICAgICBub3NjcmlwdEZhbGxiYWNrOiB0cnVlLFxuICAgICAgaW5saW5lRm9udHM6IHRydWUsXG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgb3ZlcnJpZGUgYXN5bmMgcmVhZEZpbGUocGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBsZXQgcmVzb3VyY2VDb250ZW50ID0gdGhpcy5yZXNvdXJjZUNhY2hlLmdldChwYXRoKTtcbiAgICBpZiAocmVzb3VyY2VDb250ZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlc291cmNlQ29udGVudCA9IGF3YWl0IHByb21pc2VzLnJlYWRGaWxlKHBhdGgpO1xuICAgICAgdGhpcy5yZXNvdXJjZUNhY2hlLnNldChwYXRoLCByZXNvdXJjZUNvbnRlbnQpO1xuICAgIH1cblxuICAgIHJldHVybiByZXNvdXJjZUNvbnRlbnQudG9TdHJpbmcoKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcm90ZWN0ZWQgcmVhZG9ubHkgb3B0aW9uczogSW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3JPcHRpb25zLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVzb3VyY2VDYWNoZTogTWFwPHN0cmluZywgQnVmZmVyPixcbiAgKSB7fVxuXG4gIGFzeW5jIHByb2Nlc3MoXG4gICAgaHRtbDogc3RyaW5nLFxuICAgIG9wdGlvbnM6IElubGluZUNyaXRpY2FsQ3NzUHJvY2Vzc09wdGlvbnMsXG4gICk6IFByb21pc2U8SW5saW5lQ3JpdGljYWxDc3NSZXN1bHQ+IHtcbiAgICBjb25zdCBjcml0dGVycyA9IG5ldyBDcml0dGVyc0V4dGVuZGVkKHsgLi4udGhpcy5vcHRpb25zLCAuLi5vcHRpb25zIH0sIHRoaXMucmVzb3VyY2VDYWNoZSk7XG4gICAgY29uc3QgY29udGVudCA9IGF3YWl0IGNyaXR0ZXJzLnByb2Nlc3MoaHRtbCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29udGVudCxcbiAgICAgIGVycm9yczogY3JpdHRlcnMuZXJyb3JzLmxlbmd0aCA/IGNyaXR0ZXJzLmVycm9ycyA6IHVuZGVmaW5lZCxcbiAgICAgIHdhcm5pbmdzOiBjcml0dGVycy53YXJuaW5ncy5sZW5ndGggPyBjcml0dGVycy53YXJuaW5ncyA6IHVuZGVmaW5lZCxcbiAgICB9O1xuICB9XG59XG4iXX0=