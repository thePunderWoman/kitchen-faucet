/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import { CookieJar, JSDOM } from 'jsdom';
import * as path from 'path';
import { URL } from 'url';
import { CustomResourceLoader } from './custom-resource-loader';
import { InlineCriticalCssProcessor } from './inline-css-processor';
import { augmentWindowWithStubs } from './stubs';
export class Engine {
    constructor() {
        this.fileExistsCache = new Map();
        this.htmlFileCache = new Map();
        this.resourceLoaderCache = new Map();
        this.inlineCriticalCssProcessor = new InlineCriticalCssProcessor({ minify: true }, this.resourceLoaderCache);
    }
    async render(options) {
        const { pathname, origin } = new URL(options.url);
        const prerenderedSnapshot = await this.getPrerenderedSnapshot(options.publicPath, pathname);
        if (prerenderedSnapshot) {
            return prerenderedSnapshot;
        }
        let htmlContent = await this.getHtmlTemplate(options.publicPath, pathname, options.htmlFilename);
        const inlineCriticalCss = options.inlineCriticalCss !== false;
        const customResourceLoader = new CustomResourceLoader(options.headers, options.publicPath, origin, this.resourceLoaderCache);
        let dom;
        if (inlineCriticalCss) {
            // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
            htmlContent = htmlContent.replace(/ media="print" onload="this\.media='all'"><noscript><link .+?><\/noscript>/g, '>');
        }
        // JSDOM doesn't support type=module
        // https://github.com/jsdom/jsdom/issues/2475
        htmlContent = htmlContent.replace(/ type="module"/g, '');
        try {
            dom = new JSDOM(htmlContent, {
                runScripts: 'dangerously',
                resources: customResourceLoader,
                url: options.url,
                referrer: options.headers?.referrer,
                cookieJar: new CookieJar(undefined, {
                    allowSpecialUseDomain: true,
                }),
                beforeParse: (window) => {
                    augmentWindowWithStubs(window);
                    window.ngRenderMode = true;
                },
            });
            const doc = dom.window.document;
            // 60s timeout.
            const stablizationTimeout = setTimeout(() => {
                throw new Error('Angular application failed to stablize after in time.');
            }, 60000);
            const ngRenderMode = await new Promise((resolve) => {
                const interval = setInterval(() => {
                    const ngDOMMode = dom?.window.ngRenderMode;
                    if (ngDOMMode && typeof ngDOMMode === 'object') {
                        // Poll until ngDOMMode is an object.
                        clearTimeout(stablizationTimeout);
                        clearInterval(interval);
                        resolve(ngDOMMode);
                    }
                }, 30);
            });
            await ngRenderMode.getWhenStable();
            doc.querySelector('[ng-version]')?.setAttribute('ng-clover', '');
            // Add Angular state
            const state = ngRenderMode.getSerializedState();
            if (state) {
                const script = doc.createElement('script');
                script.id = `${ngRenderMode.appId}-state`;
                script.setAttribute('type', 'application/json');
                script.textContent = state;
                doc.body.appendChild(script);
            }
            const content = dom.serialize();
            if (!inlineCriticalCss) {
                return content;
            }
            const baseHref = doc.querySelector('base[href]')?.getAttribute('href') ?? '';
            const { content: contentWithInlineCSS, warnings, errors, } = await this.inlineCriticalCssProcessor.process(content, {
                outputPath: path.join(options.publicPath, baseHref),
            });
            // eslint-disable-next-line no-console
            warnings?.forEach((m) => console.warn(m));
            // eslint-disable-next-line no-console
            errors?.forEach((m) => console.error(m));
            return contentWithInlineCSS;
        }
        finally {
            dom?.window.close();
        }
    }
    async getPrerenderedSnapshot(publicPath, pathname) {
        // Remove leading forward slash.
        const pagePath = path.resolve(publicPath, pathname.substring(1), 'index.html');
        const content = await this.readHTMLFile(pagePath);
        return content?.includes('ng-version=')
            ? content // Page is pre-rendered
            : undefined;
    }
    async getHtmlTemplate(publicPath, pathname, htmlFilename = 'index.html') {
        const files = [path.join(publicPath, htmlFilename)];
        const potentialLocalePath = pathname.split('/', 2)[1]; // potential base href
        if (potentialLocalePath) {
            files.push(path.join(publicPath, potentialLocalePath, htmlFilename));
        }
        for (const file of files) {
            const content = await this.readHTMLFile(file);
            if (content) {
                return content;
            }
        }
        throw new Error(`Cannot file HTML file. Looked in: ${files.join(', ')}`);
    }
    async fileExists(filePath) {
        const fileExists = this.fileExistsCache.get(filePath);
        if (fileExists === undefined) {
            try {
                await fs.promises.access(filePath, fs.constants.F_OK);
                this.fileExistsCache.set(filePath, true);
                return true;
            }
            catch {
                this.fileExistsCache.set(filePath, false);
                return false;
            }
        }
        return fileExists;
    }
    async readHTMLFile(filePath) {
        if (this.htmlFileCache.has(filePath)) {
            return this.htmlFileCache.get(filePath);
        }
        if (await this.fileExists(filePath)) {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            this.htmlFileCache.set(filePath, content);
            return content;
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLWVuZ2luZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL21vZHVsZXMvY29tbW9uL2Nsb3Zlci9zZXJ2ZXIvc3JjL3NlcnZlci1lbmdpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBTUgsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUMxQixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFVakQsTUFBTSxPQUFPLE1BQU07SUFBbkI7UUFDbUIsb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQztRQUM3QyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzFDLHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQ2hELCtCQUEwQixHQUFHLElBQUksMEJBQTBCLENBQzFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUNoQixJQUFJLENBQUMsbUJBQW1CLENBQ3pCLENBQUM7SUFpTEosQ0FBQztJQS9LQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQXNCO1FBQ2pDLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLFVB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QUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUU7WUFDNUIsSUFBSTtnQkFDRixNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0RCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBRXpDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFBQyxNQUFNO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFFMUMsT0FBTyxLQUFLLENBQUM7YUFDZDtTQUNGO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBZ0I7UUFDekMsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNwQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3pDO1FBRUQsSUFBSSxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDbkMsTUFBTSxPQUFPLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDOUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRTFDLE9BQU8sT0FBTyxDQUFDO1NBQ2hCO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIMm1TkdSZW5kZXJNb2RlIGFzIE5HUmVuZGVyTW9kZSxcbiAgybVOR1JlbmRlck1vZGVBUEkgYXMgTkdSZW5kZXJNb2RlQVBJLFxufSBmcm9tICdAbmd1bml2ZXJzYWwvY29tbW9uL2Nsb3Zlcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeyBDb29raWVKYXIsIEpTRE9NIH0gZnJvbSAnanNkb20nO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFVSTCB9IGZyb20gJ3VybCc7XG5pbXBvcnQgeyBDdXN0b21SZXNvdXJjZUxvYWRlciB9IGZyb20gJy4vY3VzdG9tLXJlc291cmNlLWxvYWRlcic7XG5pbXBvcnQgeyBJbmxpbmVDcml0aWNhbENzc1Byb2Nlc3NvciB9IGZyb20gJy4vaW5saW5lLWNzcy1wcm9jZXNzb3InO1xuaW1wb3J0IHsgYXVnbWVudFdpbmRvd1dpdGhTdHVicyB9IGZyb20gJy4vc3R1YnMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlck9wdGlvbnMge1xuICBoZWFkZXJzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgdW5kZWZpbmVkIHwgc3RyaW5nW10+O1xuICB1cmw6IHN0cmluZztcbiAgaW5saW5lQ3JpdGljYWxDc3M/OiBib29sZWFuO1xuICBodG1sRmlsZW5hbWU/OiBzdHJpbmc7XG4gIHB1YmxpY1BhdGg6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEVuZ2luZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgZmlsZUV4aXN0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgaHRtbEZpbGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVzb3VyY2VMb2FkZXJDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBCdWZmZXI+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgaW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3IgPSBuZXcgSW5saW5lQ3JpdGljYWxDc3NQcm9jZXNzb3IoXG4gICAgeyBtaW5pZnk6IHRydWUgfSxcbiAgICB0aGlzLnJlc291cmNlTG9hZGVyQ2FjaGUsXG4gICk7XG5cbiAgYXN5bmMgcmVuZGVyKG9wdGlvbnM6IFJlbmRlck9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHsgcGF0aG5hbWUsIG9yaWdpbiB9ID0gbmV3IFVSTChvcHRpb25zLnVybCk7XG4gICAgY29uc3QgcHJlcmVuZGVyZWRTbmFwc2hvdCA9IGF3YWl0IHRoaXMuZ2V0UHJlcmVuZGVyZWRTbmFwc2hvdChvcHRpb25zLnB1YmxpY1BhdGgsIHBhdGhuYW1lKTtcblxuICAgIGlmIChwcmVyZW5kZXJlZFNuYXBzaG90KSB7XG4gICAgICByZXR1cm4gcHJlcmVuZGVyZWRTbmFwc2hvdDtcbiAgICB9XG5cbiAgICBsZXQgaHRtbENvbnRlbnQgPSBhd2FpdCB0aGlzLmdldEh0bWxUZW1wbGF0ZShcbiAgICAgIG9wdGlvbnMucHVibGljUGF0aCxcbiAgICAgIHBhdGhuYW1lLFxuICAgICAgb3B0aW9ucy5odG1sRmlsZW5hbWUsXG4gICAgKTtcbiAgICBjb25zdCBpbmxpbmVDcml0aWNhbENzcyA9IG9wdGlvbnMuaW5saW5lQ3JpdGljYWxDc3MgIT09IGZhbHNlO1xuXG4gICAgY29uc3QgY3VzdG9tUmVzb3VyY2VMb2FkZXIgPSBuZXcgQ3VzdG9tUmVzb3VyY2VMb2FkZXIoXG4gICAgICBvcHRpb25zLmhlYWRlcnMsXG4gICAgICBvcHRpb25zLnB1YmxpY1BhdGgsXG4gICAgICBvcmlnaW4sXG4gICAgICB0aGlzLnJlc291cmNlTG9hZGVyQ2FjaGUsXG4gICAgKTtcblxuICAgIGxldCBkb206IEpTRE9NIHwgdW5kZWZpbmVkO1xuXG4gICAgaWYgKGlubGluZUNyaXRpY2FsQ3NzKSB7XG4gICAgICAvLyBXb3JrYXJvdW5kIGZvciBodHRwczovL2dpdGh1Yi5jb20vR29vZ2xlQ2hyb21lTGFicy9jcml0dGVycy9pc3N1ZXMvNjRcbiAgICAgIGh0bWxDb250ZW50ID0gaHRtbENvbnRlbnQucmVwbGFjZShcbiAgICAgICAgLyBtZWRpYT1cInByaW50XCIgb25sb2FkPVwidGhpc1xcLm1lZGlhPSdhbGwnXCI+PG5vc2NyaXB0PjxsaW5rIC4rPz48XFwvbm9zY3JpcHQ+L2csXG4gICAgICAgICc+JyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gSlNET00gZG9lc24ndCBzdXBwb3J0IHR5cGU9bW9kdWxlXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2pzZG9tL2pzZG9tL2lzc3Vlcy8yNDc1XG4gICAgaHRtbENvbnRlbnQgPSBodG1sQ29udGVudC5yZXBsYWNlKC8gdHlwZT1cIm1vZHVsZVwiL2csICcnKTtcblxuICAgIHRyeSB7XG4gICAgICBkb20gPSBuZXcgSlNET00oaHRtbENvbnRlbnQsIHtcbiAgICAgICAgcnVuU2NyaXB0czogJ2Rhbmdlcm91c2x5JyxcbiAgICAgICAgcmVzb3VyY2VzOiBjdXN0b21SZXNvdXJjZUxvYWRlcixcbiAgICAgICAgdXJsOiBvcHRpb25zLnVybCxcbiAgICAgICAgcmVmZXJyZXI6IG9wdGlvbnMuaGVhZGVycz8ucmVmZXJyZXIgYXMgc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgICAgICBjb29raWVKYXI6IG5ldyBDb29raWVKYXIodW5kZWZpbmVkLCB7XG4gICAgICAgICAgYWxsb3dTcGVjaWFsVXNlRG9tYWluOiB0cnVlLFxuICAgICAgICB9KSxcbiAgICAgICAgYmVmb3JlUGFyc2U6ICh3aW5kb3cpID0+IHtcbiAgICAgICAgICBhdWdtZW50V2luZG93V2l0aFN0dWJzKHdpbmRvdyk7XG4gICAgICAgICAgd2luZG93Lm5nUmVuZGVyTW9kZSA9IHRydWU7XG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgZG9jID0gZG9tLndpbmRvdy5kb2N1bWVudDtcblxuICAgICAgLy8gNjBzIHRpbWVvdXQuXG4gICAgICBjb25zdCBzdGFibGl6YXRpb25UaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQW5ndWxhciBhcHBsaWNhdGlvbiBmYWlsZWQgdG8gc3RhYmxpemUgYWZ0ZXIgaW4gdGltZS4nKTtcbiAgICAgIH0sIDYwMDAwKTtcblxuICAgICAgY29uc3QgbmdSZW5kZXJNb2RlID0gYXdhaXQgbmV3IFByb21pc2U8TkdSZW5kZXJNb2RlQVBJPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICBjb25zdCBpbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICBjb25zdCBuZ0RPTU1vZGUgPSBkb20/LndpbmRvdy5uZ1JlbmRlck1vZGUgYXMgTkdSZW5kZXJNb2RlO1xuICAgICAgICAgIGlmIChuZ0RPTU1vZGUgJiYgdHlwZW9mIG5nRE9NTW9kZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIC8vIFBvbGwgdW50aWwgbmdET01Nb2RlIGlzIGFuIG9iamVjdC5cbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzdGFibGl6YXRpb25UaW1lb3V0KTtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgcmVzb2x2ZShuZ0RPTU1vZGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgMzApO1xuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IG5nUmVuZGVyTW9kZS5nZXRXaGVuU3RhYmxlKCk7XG4gICAgICBkb2MucXVlcnlTZWxlY3RvcignW25nLXZlcnNpb25dJyk/LnNldEF0dHJpYnV0ZSgnbmctY2xvdmVyJywgJycpO1xuXG4gICAgICAvLyBBZGQgQW5ndWxhciBzdGF0ZVxuICAgICAgY29uc3Qgc3RhdGUgPSBuZ1JlbmRlck1vZGUuZ2V0U2VyaWFsaXplZFN0YXRlKCk7XG4gICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgY29uc3Qgc2NyaXB0ID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgICBzY3JpcHQuaWQgPSBgJHtuZ1JlbmRlck1vZGUuYXBwSWR9LXN0YXRlYDtcbiAgICAgICAgc2NyaXB0LnNldEF0dHJpYnV0ZSgndHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgIHNjcmlwdC50ZXh0Q29udGVudCA9IHN0YXRlO1xuICAgICAgICBkb2MuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjb250ZW50ID0gZG9tLnNlcmlhbGl6ZSgpO1xuICAgICAgaWYgKCFpbmxpbmVDcml0aWNhbENzcykge1xuICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYmFzZUhyZWYgPSBkb2MucXVlcnlTZWxlY3RvcignYmFzZVtocmVmXScpPy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSA/PyAnJztcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgY29udGVudDogY29udGVudFdpdGhJbmxpbmVDU1MsXG4gICAgICAgIHdhcm5pbmdzLFxuICAgICAgICBlcnJvcnMsXG4gICAgICB9ID0gYXdhaXQgdGhpcy5pbmxpbmVDcml0aWNhbENzc1Byb2Nlc3Nvci5wcm9jZXNzKGNvbnRlbnQsIHtcbiAgICAgICAgb3V0cHV0UGF0aDogcGF0aC5qb2luKG9wdGlvbnMucHVibGljUGF0aCwgYmFzZUhyZWYpLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICB3YXJuaW5ncz8uZm9yRWFjaCgobSkgPT4gY29uc29sZS53YXJuKG0pKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBlcnJvcnM/LmZvckVhY2goKG0pID0+IGNvbnNvbGUuZXJyb3IobSkpO1xuXG4gICAgICByZXR1cm4gY29udGVudFdpdGhJbmxpbmVDU1M7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGRvbT8ud2luZG93LmNsb3NlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRQcmVyZW5kZXJlZFNuYXBzaG90KFxuICAgIHB1YmxpY1BhdGg6IHN0cmluZyxcbiAgICBwYXRobmFtZTogc3RyaW5nLFxuICApOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgIC8vIFJlbW92ZSBsZWFkaW5nIGZvcndhcmQgc2xhc2guXG4gICAgY29uc3QgcGFnZVBhdGggPSBwYXRoLnJlc29sdmUocHVibGljUGF0aCwgcGF0aG5hbWUuc3Vic3RyaW5nKDEpLCAnaW5kZXguaHRtbCcpO1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLnJlYWRIVE1MRmlsZShwYWdlUGF0aCk7XG5cbiAgICByZXR1cm4gY29udGVudD8uaW5jbHVkZXMoJ25nLXZlcnNpb249JylcbiAgICAgID8gY29udGVudCAvLyBQYWdlIGlzIHByZS1yZW5kZXJlZFxuICAgICAgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldEh0bWxUZW1wbGF0ZShcbiAgICBwdWJsaWNQYXRoOiBzdHJpbmcsXG4gICAgcGF0aG5hbWU6IHN0cmluZyxcbiAgICBodG1sRmlsZW5hbWUgPSAnaW5kZXguaHRtbCcsXG4gICk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgZmlsZXMgPSBbcGF0aC5qb2luKHB1YmxpY1BhdGgsIGh0bWxGaWxlbmFtZSldO1xuXG4gICAgY29uc3QgcG90ZW50aWFsTG9jYWxlUGF0aCA9IHBhdGhuYW1lLnNwbGl0KCcvJywgMilbMV07IC8vIHBvdGVudGlhbCBiYXNlIGhyZWZcbiAgICBpZiAocG90ZW50aWFsTG9jYWxlUGF0aCkge1xuICAgICAgZmlsZXMucHVzaChwYXRoLmpvaW4ocHVibGljUGF0aCwgcG90ZW50aWFsTG9jYWxlUGF0aCwgaHRtbEZpbGVuYW1lKSk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5yZWFkSFRNTEZpbGUoZmlsZSk7XG4gICAgICBpZiAoY29udGVudCkge1xuICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBmaWxlIEhUTUwgZmlsZS4gTG9va2VkIGluOiAke2ZpbGVzLmpvaW4oJywgJyl9YCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZpbGVFeGlzdHMoZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGZpbGVFeGlzdHMgPSB0aGlzLmZpbGVFeGlzdHNDYWNoZS5nZXQoZmlsZVBhdGgpO1xuICAgIGlmIChmaWxlRXhpc3RzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLnByb21pc2VzLmFjY2VzcyhmaWxlUGF0aCwgZnMuY29uc3RhbnRzLkZfT0spO1xuICAgICAgICB0aGlzLmZpbGVFeGlzdHNDYWNoZS5zZXQoZmlsZVBhdGgsIHRydWUpO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRoaXMuZmlsZUV4aXN0c0NhY2hlLnNldChmaWxlUGF0aCwgZmFsc2UpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmlsZUV4aXN0cztcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVhZEhUTUxGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgIGlmICh0aGlzLmh0bWxGaWxlQ2FjaGUuaGFzKGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuaHRtbEZpbGVDYWNoZS5nZXQoZmlsZVBhdGgpO1xuICAgIH1cblxuICAgIGlmIChhd2FpdCB0aGlzLmZpbGVFeGlzdHMoZmlsZVBhdGgpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoZmlsZVBhdGgsICd1dGYtOCcpO1xuICAgICAgdGhpcy5odG1sRmlsZUNhY2hlLnNldChmaWxlUGF0aCwgY29udGVudCk7XG5cbiAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cbiJdfQ==