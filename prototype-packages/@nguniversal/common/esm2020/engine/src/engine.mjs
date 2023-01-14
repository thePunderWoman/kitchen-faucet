/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { INITIAL_CONFIG, renderModule, ɵSERVER_CONTEXT } from '@angular/platform-server';
import { ɵInlineCriticalCssProcessor as InlineCriticalCssProcessor } from '@nguniversal/common/tools';
import * as fs from 'fs';
import { dirname, resolve } from 'path';
import { URL } from 'url';
/**
 * A common rendering engine utility. This abstracts the logic
 * for handling the platformServer compiler, the module cache, and
 * the document loader
 */
export class CommonEngine {
    constructor(module, providers = []) {
        this.module = module;
        this.providers = providers;
        this.templateCache = new Map();
        this.pageExists = new Map();
        this.inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
            minify: true,
        });
    }
    /**
     * Render an HTML document for a specific URL with specified
     * render options
     */
    async render(opts) {
        const { inlineCriticalCss = true } = opts;
        if (opts.publicPath && opts.documentFilePath && opts.url !== undefined) {
            const url = new URL(opts.url);
            // Remove leading forward slash.
            const pathname = url.pathname.substring(1);
            const pagePath = resolve(opts.publicPath, pathname, 'index.html');
            if (pagePath !== resolve(opts.documentFilePath)) {
                // View path doesn't match with prerender path.
                let pageExists = this.pageExists.get(pagePath);
                if (pageExists === undefined) {
                    pageExists = await exists(pagePath);
                    this.pageExists.set(pagePath, pageExists);
                }
                if (pageExists) {
                    // Serve pre-rendered page.
                    return fs.promises.readFile(pagePath, 'utf-8');
                }
            }
        }
        // if opts.document dosen't exist then opts.documentFilePath must
        const extraProviders = [
            { provide: ɵSERVER_CONTEXT, useValue: 'ssr' },
            ...(opts.providers ?? []),
            ...this.providers,
        ];
        let doc = opts.document;
        if (!doc && opts.documentFilePath) {
            doc = await this.getDocument(opts.documentFilePath);
        }
        if (doc) {
            extraProviders.push({
                provide: INITIAL_CONFIG,
                useValue: {
                    document: inlineCriticalCss
                        ? // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
                            doc.replace(/ media="print" onload="this\.media='all'"><noscript><link .+?><\/noscript>/g, '>')
                        : doc,
                    url: opts.url,
                },
            });
        }
        const moduleOrFactory = this.module || opts.bootstrap;
        if (!moduleOrFactory) {
            throw new Error('A module or bootstrap option must be provided.');
        }
        const html = await renderModule(moduleOrFactory, { extraProviders });
        if (!inlineCriticalCss) {
            return html;
        }
        const { content, errors, warnings } = await this.inlineCriticalCssProcessor.process(html, {
            outputPath: opts.publicPath ?? (opts.documentFilePath ? dirname(opts.documentFilePath) : ''),
        });
        // eslint-disable-next-line no-console
        warnings?.forEach((m) => console.warn(m));
        // eslint-disable-next-line no-console
        errors?.forEach((m) => console.error(m));
        return content;
    }
    /** Retrieve the document from the cache or the filesystem */
    async getDocument(filePath) {
        let doc = this.templateCache.get(filePath);
        if (!doc) {
            doc = await fs.promises.readFile(filePath, 'utf-8');
            this.templateCache.set(filePath, doc);
        }
        return doc;
    }
}
async function exists(path) {
    try {
        await fs.promises.access(path, fs.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5naW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21tb24vZW5naW5lL3NyYy9lbmdpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDekYsT0FBTyxFQUFFLDJCQUEyQixJQUFJLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDeEMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLEtBQUssQ0FBQztBQXFCMUI7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBS3ZCLFlBQW9CLE1BQWlCLEVBQVUsWUFBOEIsRUFBRTtRQUEzRCxXQUFNLEdBQU4sTUFBTSxDQUFXO1FBQVUsY0FBUyxHQUFULFNBQVMsQ0FBdUI7UUFKOUQsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUUxQyxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQW1CLENBQUM7UUFHdkQsSUFBSSxDQUFDLDBCQUEwQixHQUFHLElBQUksMEJBQTBCLENBQUM7WUFDL0QsTUFBTSxFQUFFLElBQUk7U0FDYixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFtQjtRQUM5QixNQUFNLEVBQUUsaUJBQWlCLEdBQUcsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRTFDLElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxTQUFTLEVBQUU7WUFDdEUsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFH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Q3RDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV6QyxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0lBRUQsNkRBQTZEO0lBQ3JELEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBZ0I7UUFDeEMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNSLEdBQUcsR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDdkM7UUFFRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FDRjtBQUVELEtBQUssVUFBVSxNQUFNLENBQUMsSUFBaUI7SUFDckMsSUFBSTtRQUNGLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbEQsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUFDLE1BQU07UUFDTixPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFN0YXRpY1Byb3ZpZGVyLCBUeXBlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBJTklUSUFMX0NPTkZJRywgcmVuZGVyTW9kdWxlLCDJtVNFUlZFUl9DT05URVhUIH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tc2VydmVyJztcbmltcG9ydCB7IMm1SW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3IgYXMgSW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3IgfSBmcm9tICdAbmd1bml2ZXJzYWwvY29tbW9uL3Rvb2xzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IGRpcm5hbWUsIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IFVSTCB9IGZyb20gJ3VybCc7XG5cbi8qKiBUaGVzZSBhcmUgdGhlIGFsbG93ZWQgb3B0aW9ucyBmb3IgdGhlIHJlbmRlciAqL1xuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJPcHRpb25zIHtcbiAgYm9vdHN0cmFwPzogVHlwZTx7fT47XG4gIHByb3ZpZGVycz86IFN0YXRpY1Byb3ZpZGVyW107XG4gIHVybD86IHN0cmluZztcbiAgZG9jdW1lbnQ/OiBzdHJpbmc7XG4gIGRvY3VtZW50RmlsZVBhdGg/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBSZWR1Y2UgcmVuZGVyIGJsb2NraW5nIHJlcXVlc3RzIGJ5IGlubGluaW5nIGNyaXRpY2FsIENTUy5cbiAgICogRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICovXG4gIGlubGluZUNyaXRpY2FsQ3NzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEJhc2UgcGF0aCBsb2NhdGlvbiBvZiBpbmRleCBmaWxlLlxuICAgKiBEZWZhdWx0cyB0byB0aGUgJ2RvY3VtZW50RmlsZVBhdGgnIGRpcm5hbWUgd2hlbiBub3QgcHJvdmlkZWQuXG4gICAqL1xuICBwdWJsaWNQYXRoPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgY29tbW9uIHJlbmRlcmluZyBlbmdpbmUgdXRpbGl0eS4gVGhpcyBhYnN0cmFjdHMgdGhlIGxvZ2ljXG4gKiBmb3IgaGFuZGxpbmcgdGhlIHBsYXRmb3JtU2VydmVyIGNvbXBpbGVyLCB0aGUgbW9kdWxlIGNhY2hlLCBhbmRcbiAqIHRoZSBkb2N1bWVudCBsb2FkZXJcbiAqL1xuZXhwb3J0IGNsYXNzIENvbW1vbkVuZ2luZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgdGVtcGxhdGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgaW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3I6IElubGluZUNyaXRpY2FsQ3NzUHJvY2Vzc29yO1xuICBwcml2YXRlIHJlYWRvbmx5IHBhZ2VFeGlzdHMgPSBuZXcgTWFwPHN0cmluZywgYm9vbGVhbj4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1vZHVsZT86IFR5cGU8e30+LCBwcml2YXRlIHByb3ZpZGVyczogU3RhdGljUHJvdmlkZXJbXSA9IFtdKSB7XG4gICAgdGhpcy5pbmxpbmVDcml0aWNhbENzc1Byb2Nlc3NvciA9IG5ldyBJbmxpbmVDcml0aWNhbENzc1Byb2Nlc3Nvcih7XG4gICAgICBtaW5pZnk6IHRydWUsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIGFuIEhUTUwgZG9jdW1lbnQgZm9yIGEgc3BlY2lmaWMgVVJMIHdpdGggc3BlY2lmaWVkXG4gICAqIHJlbmRlciBvcHRpb25zXG4gICAqL1xuICBhc3luYyByZW5kZXIob3B0czogUmVuZGVyT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgeyBpbmxpbmVDcml0aWNhbENzcyA9IHRydWUgfSA9IG9wdHM7XG5cbiAgICBpZiAob3B0cy5wdWJsaWNQYXRoICYmIG9wdHMuZG9jdW1lbnRGaWxlUGF0aCAmJiBvcHRzLnVybCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKG9wdHMudXJsKTtcbiAgICAgIC8vIFJlbW92ZSBsZWFkaW5nIGZvcndhcmQgc2xhc2guXG4gICAgICBjb25zdCBwYXRobmFtZSA9IHVybC5wYXRobmFtZS5zdWJzdHJpbmcoMSk7XG4gICAgICBjb25zdCBwYWdlUGF0aCA9IHJlc29sdmUob3B0cy5wdWJsaWNQYXRoLCBwYXRobmFtZSwgJ2luZGV4Lmh0bWwnKTtcblxuICAgICAgaWYgKHBhZ2VQYXRoICE9PSByZXNvbHZlKG9wdHMuZG9jdW1lbnRGaWxlUGF0aCkpIHtcbiAgICAgICAgLy8gVmlldyBwYXRoIGRvZXNuJ3QgbWF0Y2ggd2l0aCBwcmVyZW5kZXIgcGF0aC5cbiAgICAgICAgbGV0IHBhZ2VFeGlzdHMgPSB0aGlzLnBhZ2VFeGlzdHMuZ2V0KHBhZ2VQYXRoKTtcbiAgICAgICAgaWYgKHBhZ2VFeGlzdHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHBhZ2VFeGlzdHMgPSBhd2FpdCBleGlzdHMocGFnZVBhdGgpO1xuICAgICAgICAgIHRoaXMucGFnZUV4aXN0cy5zZXQocGFnZVBhdGgsIHBhZ2VFeGlzdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhZ2VFeGlzdHMpIHtcbiAgICAgICAgICAvLyBTZXJ2ZSBwcmUtcmVuZGVyZWQgcGFnZS5cbiAgICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMucmVhZEZpbGUocGFnZVBhdGgsICd1dGYtOCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gaWYgb3B0cy5kb2N1bWVudCBkb3Nlbid0IGV4aXN0IHRoZW4gb3B0cy5kb2N1bWVudEZpbGVQYXRoIG11c3RcbiAgICBjb25zdCBleHRyYVByb3ZpZGVyczogU3RhdGljUHJvdmlkZXJbXSA9IFtcbiAgICAgIHsgcHJvdmlkZTogybVTRVJWRVJfQ09OVEVYVCwgdXNlVmFsdWU6ICdzc3InIH0sXG4gICAgICAuLi4ob3B0cy5wcm92aWRlcnMgPz8gW10pLFxuICAgICAgLi4udGhpcy5wcm92aWRlcnMsXG4gICAgXTtcblxuICAgIGxldCBkb2MgPSBvcHRzLmRvY3VtZW50O1xuICAgIGlmICghZG9jICYmIG9wdHMuZG9jdW1lbnRGaWxlUGF0aCkge1xuICAgICAgZG9jID0gYXdhaXQgdGhpcy5nZXREb2N1bWVudChvcHRzLmRvY3VtZW50RmlsZVBhdGgpO1xuICAgIH1cblxuICAgIGlmIChkb2MpIHtcbiAgICAgIGV4dHJhUHJvdmlkZXJzLnB1c2goe1xuICAgICAgICBwcm92aWRlOiBJTklUSUFMX0NPTkZJRyxcbiAgICAgICAgdXNlVmFsdWU6IHtcbiAgICAgICAgICBkb2N1bWVudDogaW5saW5lQ3JpdGljYWxDc3NcbiAgICAgICAgICAgID8gLy8gV29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9naXRodWIuY29tL0dvb2dsZUNocm9tZUxhYnMvY3JpdHRlcnMvaXNzdWVzLzY0XG4gICAgICAgICAgICAgIGRvYy5yZXBsYWNlKFxuICAgICAgICAgICAgICAgIC8gbWVkaWE9XCJwcmludFwiIG9ubG9hZD1cInRoaXNcXC5tZWRpYT0nYWxsJ1wiPjxub3NjcmlwdD48bGluayAuKz8+PFxcL25vc2NyaXB0Pi9nLFxuICAgICAgICAgICAgICAgICc+JyxcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgOiBkb2MsXG4gICAgICAgICAgdXJsOiBvcHRzLnVybCxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZU9yRmFjdG9yeSA9IHRoaXMubW9kdWxlIHx8IG9wdHMuYm9vdHN0cmFwO1xuXG4gICAgaWYgKCFtb2R1bGVPckZhY3RvcnkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQSBtb2R1bGUgb3IgYm9vdHN0cmFwIG9wdGlvbiBtdXN0IGJlIHByb3ZpZGVkLicpO1xuICAgIH1cblxuICAgIGNvbnN0IGh0bWwgPSBhd2FpdCByZW5kZXJNb2R1bGUobW9kdWxlT3JGYWN0b3J5LCB7IGV4dHJhUHJvdmlkZXJzIH0pO1xuICAgIGlmICghaW5saW5lQ3JpdGljYWxDc3MpIHtcbiAgICAgIHJldHVybiBodG1sO1xuICAgIH1cblxuICAgIGNvbnN0IHsgY29udGVudCwgZXJyb3JzLCB3YXJuaW5ncyB9ID0gYXdhaXQgdGhpcy5pbmxpbmVDcml0aWNhbENzc1Byb2Nlc3Nvci5wcm9jZXNzKGh0bWwsIHtcbiAgICAgIG91dHB1dFBhdGg6IG9wdHMucHVibGljUGF0aCA/PyAob3B0cy5kb2N1bWVudEZpbGVQYXRoID8gZGlybmFtZShvcHRzLmRvY3VtZW50RmlsZVBhdGgpIDogJycpLFxuICAgIH0pO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICB3YXJuaW5ncz8uZm9yRWFjaCgobSkgPT4gY29uc29sZS53YXJuKG0pKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGVycm9ycz8uZm9yRWFjaCgobSkgPT4gY29uc29sZS5lcnJvcihtKSk7XG5cbiAgICByZXR1cm4gY29udGVudDtcbiAgfVxuXG4gIC8qKiBSZXRyaWV2ZSB0aGUgZG9jdW1lbnQgZnJvbSB0aGUgY2FjaGUgb3IgdGhlIGZpbGVzeXN0ZW0gKi9cbiAgcHJpdmF0ZSBhc3luYyBnZXREb2N1bWVudChmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBsZXQgZG9jID0gdGhpcy50ZW1wbGF0ZUNhY2hlLmdldChmaWxlUGF0aCk7XG5cbiAgICBpZiAoIWRvYykge1xuICAgICAgZG9jID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoZmlsZVBhdGgsICd1dGYtOCcpO1xuICAgICAgdGhpcy50ZW1wbGF0ZUNhY2hlLnNldChmaWxlUGF0aCwgZG9jKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZG9jO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGV4aXN0cyhwYXRoOiBmcy5QYXRoTGlrZSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLnByb21pc2VzLmFjY2VzcyhwYXRoLCBmcy5jb25zdGFudHMuRl9PSyk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=