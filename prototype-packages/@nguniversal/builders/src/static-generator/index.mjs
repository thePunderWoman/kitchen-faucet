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
import { createBuilder, targetFromTargetString, } from '@angular-devkit/architect';
import { normalizeOptimization } from '@angular-devkit/build-angular/src/utils/normalize-optimization';
import { augmentAppWithServiceWorker } from '@angular-devkit/build-angular/src/utils/service-worker';
import express from 'express';
import * as http from 'http';
import ora from 'ora';
import { cpus } from 'os';
import * as path from 'path';
import Piscina from 'piscina';
import { promisify } from 'util';
import { getAvailablePort } from '../ssr-dev-server/utils';
import { getRoutes } from './utils';
/**
 * Builds the browser and server, then renders each route in options.routes
 * and writes them to prerender/<route>/index.html for each output path in
 * the browser result.
 */
export function execute(options, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const browserTarget = targetFromTargetString(options.browserTarget);
        const browserOptions = (yield context.getTargetOptions(browserTarget));
        const routes = yield getRoutes(options, browserOptions.tsConfig, context);
        if (!routes.length) {
            throw new Error(`Could not find any routes to generate.`);
        }
        const { result } = yield context.scheduleTarget(browserTarget, {
            watch: false,
            serviceWorker: false,
        });
        const { success, error, outputPaths } = (yield result);
        if (!success) {
            return { success, error };
        }
        const { styles: normalizedStylesOptimization } = normalizeOptimization(browserOptions.optimization);
        const worker = createWorker();
        try {
            for (const outputPath of outputPaths) {
                const spinner = ora(`Prerendering ${routes.length} route(s) to ${outputPath}...`).start();
                const staticServer = yield createStaticServer(outputPath);
                try {
                    yield Promise.all(routes.map((route) => {
                        const options = {
                            inlineCriticalCss: normalizedStylesOptimization.inlineCritical,
                            outputPath,
                            route,
                            port: staticServer.port,
                        };
                        return worker.run(options, { name: 'render' });
                    }));
                    spinner.succeed(`Prerendering routes to ${outputPath} complete.`);
                    if (browserOptions.serviceWorker) {
                        const swResult = yield generateServiceWorker(context, outputPath, browserOptions);
                        if (!swResult.success) {
                            return swResult;
                        }
                    }
                }
                catch (error) {
                    spinner.fail(`Prerendering routes to ${outputPath} failed.`);
                    return { success: false, error: error.message };
                }
                finally {
                    yield staticServer.close();
                }
            }
            return { success: true };
        }
        finally {
            void worker.destroy();
        }
    });
}
function createStaticServer(browserOutputRoot) {
    return __awaiter(this, void 0, void 0, function* () {
        const app = express();
        app.use(express.static(browserOutputRoot));
        const port = yield getAvailablePort();
        const server = new http.Server(app);
        yield new Promise((res) => server.listen(port, res));
        return {
            close: promisify(server.close.bind(server)),
            port,
        };
    });
}
function createWorker() {
    const maxThreads = Math.max(Math.min(cpus().length, 6) - 1, 1);
    const worker = new Piscina({
        filename: path.join(__dirname, 'worker.js'),
        name: 'render',
        maxThreads,
    });
    return worker;
}
function generateServiceWorker(context, outputPath, browserOptions) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const spinner = ora(`Generating service worker for ${outputPath}...`).start();
        try {
            const projectName = (_a = context.target) === null || _a === void 0 ? void 0 : _a.project;
            if (!projectName) {
                throw new Error('The builder requires a target.');
            }
            const projectMetadata = yield context.getProjectMetadata(projectName);
            const projectRoot = path.join(context.workspaceRoot, (_b = projectMetadata.root) !== null && _b !== void 0 ? _b : '');
            yield augmentAppWithServiceWorker(projectRoot, context.workspaceRoot, outputPath, browserOptions.baseHref || '/', browserOptions.ngswConfigPath);
            spinner.succeed(`Service worker generation for ${outputPath} complete.`);
            return { success: true };
        }
        catch (error) {
            spinner.fail(`Service worker generation for ${outputPath} failed.`);
            return { success: false, error: error.message };
        }
    });
}
export default createBuilder(execute);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2J1aWxkZXJzL3NyYy9zdGF0aWMtZ2VuZXJhdG9yL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILE9BQU8sRUFHTCxhQUFhLEVBQ2Isc0JBQXNCLEdBQ3ZCLE1BQU0sMkJBQTJCLENBQUM7QUFFbkMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDdkcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDckcsT0FBTyxPQUFPLE1BQU0sU0FBUyxDQUFDO0FBQzlCLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sR0FBRyxNQUFNLEtBQUssQ0FBQztBQUN0QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzFCLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sT0FBTyxNQUFNLFNBQVMsQ0FBQztBQUM5QixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTNELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFHcEM7Ozs7R0FJRztBQUNILE1BQU0sVUFBZ0IsT0FBTyxDQUMzQixPQUFnQyxFQUNoQyxPQUF1Qjs7UUFFdkIsTUFBTSxhQUFhLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sY0FBYyxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsZ0JBQWdCLENBQ3BELGFBQWEsQ0FDZCxDQUFxQyxDQUFDO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLE1BQU0sU0FBUyxDQUFDLE9BQU8sRUFBRSxjQUFjLENB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T0FBTyxDQUFDLGFBQWEsRUFDckIsTUFBQyxlQUFlLENBQUMsSUFBMkIsbUNBQUksRUFBRSxDQUNuRCxDQUFDO1lBRUYsTUFBTSwyQkFBMkIsQ0FDL0IsV0FBVyxFQUNYLE9BQU8sQ0FBQyxhQUFhLEVBQ3JCLFVBQVUsRUFDVixjQUFjLENBQUMsUUFBUSxJQUFJLEdBQUcsRUFDOUIsY0FBYyxDQUFDLGNBQWMsQ0FDOUIsQ0FBQztZQUVGLE9BQU8sQ0FBQyxPQUFPLENBQUMsaUNBQWlDLFVBQVUsWUFBWSxDQUFDLENBQUM7WUFFekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztTQUMxQjtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsVUFBVSxVQUFVLENBQUMsQ0FBQztZQUVwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ2pEOztDQUNGO0FBRUQsZUFBZSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgQnVpbGRlckNvbnRleHQsXG4gIEJ1aWxkZXJPdXRwdXQsXG4gIGNyZWF0ZUJ1aWxkZXIsXG4gIHRhcmdldEZyb21UYXJnZXRTdHJpbmcsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJPcHRpb25zLCBCcm93c2VyQnVpbGRlck91dHB1dCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbmltcG9ydCB7IG5vcm1hbGl6ZU9wdGltaXphdGlvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy91dGlscy9ub3JtYWxpemUtb3B0aW1pemF0aW9uJztcbmltcG9ydCB7IGF1Z21lbnRBcHBXaXRoU2VydmljZVdvcmtlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy91dGlscy9zZXJ2aWNlLXdvcmtlcic7XG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgb3JhIGZyb20gJ29yYSc7XG5pbXBvcnQgeyBjcHVzIH0gZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBQaXNjaW5hIGZyb20gJ3Bpc2NpbmEnO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgeyBnZXRBdmFpbGFibGVQb3J0IH0gZnJvbSAnLi4vc3NyLWRldi1zZXJ2ZXIvdXRpbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFByZXJlbmRlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgZ2V0Um91dGVzIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBSZW5kZXJPcHRpb25zIH0gZnJvbSAnLi93b3JrZXInO1xuXG4vKipcbiAqIEJ1aWxkcyB0aGUgYnJvd3NlciBhbmQgc2VydmVyLCB0aGVuIHJlbmRlcnMgZWFjaCByb3V0ZSBpbiBvcHRpb25zLnJvdXRlc1xuICogYW5kIHdyaXRlcyB0aGVtIHRvIHByZXJlbmRlci88cm91dGU+L2luZGV4Lmh0bWwgZm9yIGVhY2ggb3V0cHV0IHBhdGggaW5cbiAqIHRoZSBicm93c2VyIHJlc3VsdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoXG4gIG9wdGlvbnM6IFByZXJlbmRlckJ1aWxkZXJPcHRpb25zLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbik6IFByb21pc2U8QnVpbGRlck91dHB1dD4ge1xuICBjb25zdCBicm93c2VyVGFyZ2V0ID0gdGFyZ2V0RnJvbVRhcmdldFN0cmluZyhvcHRpb25zLmJyb3dzZXJUYXJnZXQpO1xuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IChhd2FpdCBjb250ZXh0LmdldFRhcmdldE9wdGlvbnMoXG4gICAgYnJvd3NlclRhcmdldCxcbiAgKSkgYXMgdW5rbm93biBhcyBCcm93c2VyQnVpbGRlck9wdGlvbnM7XG4gIGNvbnN0IHJvdXRlcyA9IGF3YWl0IGdldFJvdXRlcyhvcHRpb25zLCBicm93c2VyT3B0aW9ucy50c0NvbmZpZywgY29udGV4dCk7XG5cbiAgaWYgKCFyb3V0ZXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBhbnkgcm91dGVzIHRvIGdlbmVyYXRlLmApO1xuICB9XG5cbiAgY29uc3QgeyByZXN1bHQgfSA9IGF3YWl0IGNvbnRleHQuc2NoZWR1bGVUYXJnZXQoYnJvd3NlclRhcmdldCwge1xuICAgIHdhdGNoOiBmYWxzZSxcbiAgICBzZXJ2aWNlV29ya2VyOiBmYWxzZSxcbiAgfSk7XG5cbiAgY29uc3QgeyBzdWNjZXNzLCBlcnJvciwgb3V0cHV0UGF0aHMgfSA9IChhd2FpdCByZXN1bHQpIGFzIEJyb3dzZXJCdWlsZGVyT3V0cHV0O1xuICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICByZXR1cm4geyBzdWNjZXNzLCBlcnJvciB9IGFzIEJ1aWxkZXJPdXRwdXQ7XG4gIH1cblxuICBjb25zdCB7IHN0eWxlczogbm9ybWFsaXplZFN0eWxlc09wdGltaXphdGlvbiB9ID0gbm9ybWFsaXplT3B0aW1pemF0aW9uKFxuICAgIGJyb3dzZXJPcHRpb25zLm9wdGltaXphdGlvbixcbiAgKTtcblxuICBjb25zdCB3b3JrZXIgPSBjcmVhdGVXb3JrZXIoKTtcbiAgdHJ5IHtcbiAgICBmb3IgKGNvbnN0IG91dHB1dFBhdGggb2Ygb3V0cHV0UGF0aHMpIHtcbiAgICAgIGNvbnN0IHNwaW5uZXIgPSBvcmEoYFByZXJlbmRlcmluZyAke3JvdXRlcy5sZW5ndGh9IHJvdXRlKHMpIHRvICR7b3V0cHV0UGF0aH0uLi5gKS5zdGFydCgpO1xuXG4gICAgICBjb25zdCBzdGF0aWNTZXJ2ZXIgPSBhd2FpdCBjcmVhdGVTdGF0aWNTZXJ2ZXIob3V0cHV0UGF0aCk7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICByb3V0ZXMubWFwKChyb3V0ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9uczogUmVuZGVyT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgaW5saW5lQ3JpdGljYWxDc3M6IG5vcm1hbGl6ZWRTdHlsZXNPcHRpbWl6YXRpb24uaW5saW5lQ3JpdGljYWwsXG4gICAgICAgICAgICAgIG91dHB1dFBhdGgsXG4gICAgICAgICAgICAgIHJvdXRlLFxuICAgICAgICAgICAgICBwb3J0OiBzdGF0aWNTZXJ2ZXIucG9ydCxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiB3b3JrZXIucnVuKG9wdGlvbnMsIHsgbmFtZTogJ3JlbmRlcicgfSk7XG4gICAgICAgICAgfSksXG4gICAgICAgICk7XG5cbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKGBQcmVyZW5kZXJpbmcgcm91dGVzIHRvICR7b3V0cHV0UGF0aH0gY29tcGxldGUuYCk7XG5cbiAgICAgICAgaWYgKGJyb3dzZXJPcHRpb25zLnNlcnZpY2VXb3JrZXIpIHtcbiAgICAgICAgICBjb25zdCBzd1Jlc3VsdCA9IGF3YWl0IGdlbmVyYXRlU2VydmljZVdvcmtlcihjb250ZXh0LCBvdXRwdXRQYXRoLCBicm93c2VyT3B0aW9ucyk7XG4gICAgICAgICAgaWYgKCFzd1Jlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICByZXR1cm4gc3dSZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzcGlubmVyLmZhaWwoYFByZXJlbmRlcmluZyByb3V0ZXMgdG8gJHtvdXRwdXRQYXRofSBmYWlsZWQuYCk7XG5cbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBhd2FpdCBzdGF0aWNTZXJ2ZXIuY2xvc2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gIH0gZmluYWxseSB7XG4gICAgdm9pZCB3b3JrZXIuZGVzdHJveSgpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVN0YXRpY1NlcnZlcihicm93c2VyT3V0cHV0Um9vdDogc3RyaW5nKTogUHJvbWlzZTx7XG4gIGNsb3NlOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xuICBwb3J0OiBudW1iZXI7XG59PiB7XG4gIGNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcbiAgYXBwLnVzZShleHByZXNzLnN0YXRpYyhicm93c2VyT3V0cHV0Um9vdCkpO1xuICBjb25zdCBwb3J0ID0gYXdhaXQgZ2V0QXZhaWxhYmxlUG9ydCgpO1xuICBjb25zdCBzZXJ2ZXIgPSBuZXcgaHR0cC5TZXJ2ZXIoYXBwKTtcbiAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlcykgPT4gc2VydmVyLmxpc3Rlbihwb3J0LCByZXMpKTtcblxuICByZXR1cm4ge1xuICAgIGNsb3NlOiBwcm9taXNpZnkoc2VydmVyLmNsb3NlLmJpbmQoc2VydmVyKSksXG4gICAgcG9ydCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlV29ya2VyKCk6IFBpc2NpbmEge1xuICBjb25zdCBtYXhUaHJlYWRzID0gTWF0aC5tYXgoTWF0aC5taW4oY3B1cygpLmxlbmd0aCwgNikgLSAxLCAxKTtcblxuICBjb25zdCB3b3JrZXIgPSBuZXcgUGlzY2luYSh7XG4gICAgZmlsZW5hbWU6IHBhdGguam9pbihfX2Rpcm5hbWUsICd3b3JrZXIuanMnKSxcbiAgICBuYW1lOiAncmVuZGVyJyxcbiAgICBtYXhUaHJlYWRzLFxuICB9KTtcblxuICByZXR1cm4gd29ya2VyO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVNlcnZpY2VXb3JrZXIoXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBvdXRwdXRQYXRoOiBzdHJpbmcsXG4gIGJyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlck9wdGlvbnMsXG4pOiBQcm9taXNlPEJ1aWxkZXJPdXRwdXQ+IHtcbiAgY29uc3Qgc3Bpbm5lciA9IG9yYShgR2VuZXJhdGluZyBzZXJ2aWNlIHdvcmtlciBmb3IgJHtvdXRwdXRQYXRofS4uLmApLnN0YXJ0KCk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBwcm9qZWN0TmFtZSA9IGNvbnRleHQudGFyZ2V0Py5wcm9qZWN0O1xuICAgIGlmICghcHJvamVjdE5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGJ1aWxkZXIgcmVxdWlyZXMgYSB0YXJnZXQuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdE1ldGFkYXRhID0gYXdhaXQgY29udGV4dC5nZXRQcm9qZWN0TWV0YWRhdGEocHJvamVjdE5hbWUpO1xuICAgIGNvbnN0IHByb2plY3RSb290ID0gcGF0aC5qb2luKFxuICAgICAgY29udGV4dC53b3Jrc3BhY2VSb290LFxuICAgICAgKHByb2plY3RNZXRhZGF0YS5yb290IGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgPz8gJycsXG4gICAgKTtcblxuICAgIGF3YWl0IGF1Z21lbnRBcHBXaXRoU2VydmljZVdvcmtlcihcbiAgICAgIHByb2plY3RSb290LFxuICAgICAgY29udGV4dC53b3Jrc3BhY2VSb290LFxuICAgICAgb3V0cHV0UGF0aCxcbiAgICAgIGJyb3dzZXJPcHRpb25zLmJhc2VIcmVmIHx8ICcvJyxcbiAgICAgIGJyb3dzZXJPcHRpb25zLm5nc3dDb25maWdQYXRoLFxuICAgICk7XG5cbiAgICBzcGlubmVyLnN1Y2NlZWQoYFNlcnZpY2Ugd29ya2VyIGdlbmVyYXRpb24gZm9yICR7b3V0cHV0UGF0aH0gY29tcGxldGUuYCk7XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgc3Bpbm5lci5mYWlsKGBTZXJ2aWNlIHdvcmtlciBnZW5lcmF0aW9uIGZvciAke291dHB1dFBhdGh9IGZhaWxlZC5gKTtcblxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNyZWF0ZUJ1aWxkZXIoZXhlY3V0ZSk7XG4iXX0=