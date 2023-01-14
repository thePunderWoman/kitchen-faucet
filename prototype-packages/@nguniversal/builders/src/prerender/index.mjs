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
import * as fs from 'fs';
import ora from 'ora';
import * as path from 'path';
import Piscina from 'piscina';
import { getIndexOutputFile, getRoutes } from './utils';
/**
 * Schedules the server and browser builds and returns their results if both builds are successful.
 */
function _scheduleBuilds(options, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const browserTarget = targetFromTargetString(options.browserTarget);
        const serverTarget = targetFromTargetString(options.serverTarget);
        const browserTargetRun = yield context.scheduleTarget(browserTarget, {
            watch: false,
            serviceWorker: false,
            // todo: handle service worker augmentation
        });
        const serverTargetRun = yield context.scheduleTarget(serverTarget, {
            watch: false,
        });
        try {
            const [browserResult, serverResult] = yield Promise.all([
                browserTargetRun.result,
                serverTargetRun.result,
            ]);
            const success = browserResult.success && serverResult.success && browserResult.baseOutputPath !== undefined;
            const error = browserResult.error || serverResult.error;
            return { success, error, browserResult, serverResult };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
        finally {
            yield Promise.all([browserTargetRun.stop(), serverTargetRun.stop()]);
        }
    });
}
/**
 * Renders each route and writes them to
 * <route>/index.html for each output path in the browser result.
 */
function _renderUniversal(routes, context, browserResult, serverResult, browserOptions, numProcesses) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const projectName = context.target && context.target.project;
        if (!projectName) {
            throw new Error('The builder requires a target.');
        }
        const projectMetadata = yield context.getProjectMetadata(projectName);
        const projectRoot = path.join(context.workspaceRoot, (_a = projectMetadata.root) !== null && _a !== void 0 ? _a : '');
        // Users can specify a different base html file e.g. "src/home.html"
        const indexFile = getIndexOutputFile(browserOptions);
        const { styles: normalizedStylesOptimization } = normalizeOptimization(browserOptions.optimization);
        const zonePackage = require.resolve('zone.js', { paths: [context.workspaceRoot] });
        const { baseOutputPath = '' } = serverResult;
        const worker = new Piscina({
            filename: path.join(__dirname, 'worker.js'),
            maxThreads: numProcesses,
            workerData: { zonePackage },
        });
        try {
            // We need to render the routes for each locale from the browser output.
            for (const outputPath of browserResult.outputPaths) {
                const localeDirectory = path.relative(browserResult.baseOutputPath, outputPath);
                const serverBundlePath = path.join(baseOutputPath, localeDirectory, 'main.js');
                if (!fs.existsSync(serverBundlePath)) {
                    throw new Error(`Could not find the main bundle: ${serverBundlePath}`);
                }
                const spinner = ora(`Prerendering ${routes.length} route(s) to ${outputPath}...`).start();
                try {
                    const results = (yield Promise.all(routes.map((route) => {
                        const options = {
                            indexFile,
                            deployUrl: browserOptions.deployUrl || '',
                            inlineCriticalCss: !!normalizedStylesOptimization.inlineCritical,
                            minifyCss: !!normalizedStylesOptimization.minify,
                            outputPath,
                            route,
                            serverBundlePath,
                        };
                        return worker.run(options);
                    })));
                    let numErrors = 0;
                    for (const { errors, warnings } of results) {
                        spinner.stop();
                        errors === null || errors === void 0 ? void 0 : errors.forEach((e) => context.logger.error(e));
                        warnings === null || warnings === void 0 ? void 0 : warnings.forEach((e) => context.logger.warn(e));
                        spinner.start();
                        numErrors += (_b = errors === null || errors === void 0 ? void 0 : errors.length) !== null && _b !== void 0 ? _b : 0;
                    }
                    if (numErrors > 0) {
                        throw Error(`Rendering failed with ${numErrors} worker errors.`);
                    }
                }
                catch (error) {
                    spinner.fail(`Prerendering routes to ${outputPath} failed.`);
                    return { success: false, error: error.message };
                }
                spinner.succeed(`Prerendering routes to ${outputPath} complete.`);
                if (browserOptions.serviceWorker) {
                    spinner.start('Generating service worker...');
                    try {
                        yield augmentAppWithServiceWorker(projectRoot, context.workspaceRoot, outputPath, browserOptions.baseHref || '/', browserOptions.ngswConfigPath);
                    }
                    catch (error) {
                        spinner.fail('Service worker generation failed.');
                        return { success: false, error: error.message };
                    }
                    spinner.succeed('Service worker generation complete.');
                }
            }
        }
        finally {
            void worker.destroy();
        }
        return browserResult;
    });
}
/**
 * Builds the browser and server, then renders each route in options.routes
 * and writes them to prerender/<route>/index.html for each output path in
 * the browser result.
 */
export function execute(options, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const browserTarget = targetFromTargetString(options.browserTarget);
        const browserOptions = (yield context.getTargetOptions(browserTarget));
        const tsConfigPath = typeof browserOptions.tsConfig === 'string' ? browserOptions.tsConfig : undefined;
        const routes = yield getRoutes(options, tsConfigPath, context);
        if (!routes.length) {
            throw new Error(`Could not find any routes to prerender.`);
        }
        const result = yield _scheduleBuilds(options, context);
        const { success, error, browserResult, serverResult } = result;
        if (!success || !browserResult || !serverResult) {
            return { success, error };
        }
        return _renderUniversal(routes, context, browserResult, serverResult, browserOptions, options.numProcesses);
    });
}
export default createBuilder(execute);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2J1aWxkZXJzL3NyYy9wcmVyZW5kZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsT0FBTyxFQUdMLGFBQWEsRUFDYixzQkFBc0IsR0FDdkIsTUFBTSwyQkFBMkIsQ0FBQztBQUVuQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUN2RyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNyRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEdBQUcsTUFBTSxLQUFLLENBQUM7QUFDdEIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxPQUFPLE1BQU0sU0FBUyxDQUFDO0FBRTlCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxTQUFTLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFjeEQ7O0dBRUc7QUFDSCxTQUFlLGVBQWUsQ0FDNUIsT0FBZ0MsRUFDaEMsT0FBdUI7O1FBRXZCLE1BQU0sYUFBYSxHQUFHLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNwRSxNQUFNLFlBQVksR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFbEUsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFO1lBQ25FLEtBQUssRUFBRSxLQUFLO1lBQ1osYUFBYSxFQUFFLEtBQUs7WUFDcEIsMkNBQTJDO1NBQzVDLENBQUMsQ0FBQztRQUNILE1BQU0sZUFBZSxHQUFHLE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUU7WUFDakUsS0FBSyxFQUFFLEtBQUs7U0FDYixDQUFDLENBQUM7UUFFSCxJQUFJO1lB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QUF1Qjs7UUFFdkIsTUFBTSxhQUFhLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sY0FBYyxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsZ0JBQWdCLENBQ3BELGFBQWEsQ0FDZCxDQUFxQyxDQUFDO1FBQ3ZDLE1BQU0sWUFBWSxHQUNoQixPQUFPLGNBQWMsQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFFcEYsTUFBTSxNQUFNLEdBQUcsTUFBTSxTQUFTLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7U0FDNUQ7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdkQsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxHQUFHLE1BQU0sQ0FBQztRQUMvRCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFtQixDQUFDO1NBQzVDO1FBRUQsT0FBTyxnQkFBZ0IsQ0FDckIsTUFBTSxFQUNOLE9BQU8sRUFDUCxhQUFhLEVBQ2IsWUFBWSxFQUNaLGNBQWMsRUFDZCxPQUFPLENBQUMsWUFBWSxDQUNyQixDQUFDO0lBQ0osQ0FBQztDQUFBO0FBRUQsZUFBZSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgQnVpbGRlckNvbnRleHQsXG4gIEJ1aWxkZXJPdXRwdXQsXG4gIGNyZWF0ZUJ1aWxkZXIsXG4gIHRhcmdldEZyb21UYXJnZXRTdHJpbmcsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0IHsgbm9ybWFsaXplT3B0aW1pemF0aW9uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL3V0aWxzL25vcm1hbGl6ZS1vcHRpbWl6YXRpb24nO1xuaW1wb3J0IHsgYXVnbWVudEFwcFdpdGhTZXJ2aWNlV29ya2VyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL3V0aWxzL3NlcnZpY2Utd29ya2VyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBvcmEgZnJvbSAnb3JhJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgUGlzY2luYSBmcm9tICdwaXNjaW5hJztcbmltcG9ydCB7IFByZXJlbmRlckJ1aWxkZXJPcHRpb25zLCBQcmVyZW5kZXJCdWlsZGVyT3V0cHV0IH0gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHsgZ2V0SW5kZXhPdXRwdXRGaWxlLCBnZXRSb3V0ZXMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFJlbmRlck9wdGlvbnMsIFJlbmRlclJlc3VsdCB9IGZyb20gJy4vd29ya2VyJztcblxudHlwZSBCdWlsZEJ1aWxkZXJPdXRwdXQgPSBCdWlsZGVyT3V0cHV0ICYge1xuICBiYXNlT3V0cHV0UGF0aDogc3RyaW5nO1xuICBvdXRwdXRQYXRoczogc3RyaW5nW107XG4gIG91dHB1dFBhdGg6IHN0cmluZztcbn07XG5cbnR5cGUgU2NoZWR1bGVCdWlsZHNPdXRwdXQgPSBCdWlsZGVyT3V0cHV0ICYge1xuICBzZXJ2ZXJSZXN1bHQ/OiBCdWlsZEJ1aWxkZXJPdXRwdXQ7XG4gIGJyb3dzZXJSZXN1bHQ/OiBCdWlsZEJ1aWxkZXJPdXRwdXQ7XG59O1xuXG4vKipcbiAqIFNjaGVkdWxlcyB0aGUgc2VydmVyIGFuZCBicm93c2VyIGJ1aWxkcyBhbmQgcmV0dXJucyB0aGVpciByZXN1bHRzIGlmIGJvdGggYnVpbGRzIGFyZSBzdWNjZXNzZnVsLlxuICovXG5hc3luYyBmdW5jdGlvbiBfc2NoZWR1bGVCdWlsZHMoXG4gIG9wdGlvbnM6IFByZXJlbmRlckJ1aWxkZXJPcHRpb25zLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbik6IFByb21pc2U8U2NoZWR1bGVCdWlsZHNPdXRwdXQ+IHtcbiAgY29uc3QgYnJvd3NlclRhcmdldCA9IHRhcmdldEZyb21UYXJnZXRTdHJpbmcob3B0aW9ucy5icm93c2VyVGFyZ2V0KTtcbiAgY29uc3Qgc2VydmVyVGFyZ2V0ID0gdGFyZ2V0RnJvbVRhcmdldFN0cmluZyhvcHRpb25zLnNlcnZlclRhcmdldCk7XG5cbiAgY29uc3QgYnJvd3NlclRhcmdldFJ1biA9IGF3YWl0IGNvbnRleHQuc2NoZWR1bGVUYXJnZXQoYnJvd3NlclRhcmdldCwge1xuICAgIHdhdGNoOiBmYWxzZSxcbiAgICBzZXJ2aWNlV29ya2VyOiBmYWxzZSxcbiAgICAvLyB0b2RvOiBoYW5kbGUgc2VydmljZSB3b3JrZXIgYXVnbWVudGF0aW9uXG4gIH0pO1xuICBjb25zdCBzZXJ2ZXJUYXJnZXRSdW4gPSBhd2FpdCBjb250ZXh0LnNjaGVkdWxlVGFyZ2V0KHNlcnZlclRhcmdldCwge1xuICAgIHdhdGNoOiBmYWxzZSxcbiAgfSk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBbYnJvd3NlclJlc3VsdCwgc2VydmVyUmVzdWx0XSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgIGJyb3dzZXJUYXJnZXRSdW4ucmVzdWx0IGFzIHVua25vd24gYXMgQnVpbGRCdWlsZGVyT3V0cHV0LFxuICAgICAgc2VydmVyVGFyZ2V0UnVuLnJlc3VsdCBhcyB1bmtub3duIGFzIEJ1aWxkQnVpbGRlck91dHB1dCxcbiAgICBdKTtcblxuICAgIGNvbnN0IHN1Y2Nlc3MgPVxuICAgICAgYnJvd3NlclJlc3VsdC5zdWNjZXNzICYmIHNlcnZlclJlc3VsdC5zdWNjZXNzICYmIGJyb3dzZXJSZXN1bHQuYmFzZU91dHB1dFBhdGggIT09IHVuZGVmaW5lZDtcbiAgICBjb25zdCBlcnJvciA9IGJyb3dzZXJSZXN1bHQuZXJyb3IgfHwgKHNlcnZlclJlc3VsdC5lcnJvciBhcyBzdHJpbmcpO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzcywgZXJyb3IsIGJyb3dzZXJSZXN1bHQsIHNlcnZlclJlc3VsdCB9O1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlLm1lc3NhZ2UgfTtcbiAgfSBmaW5hbGx5IHtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChbYnJvd3NlclRhcmdldFJ1bi5zdG9wKCksIHNlcnZlclRhcmdldFJ1bi5zdG9wKCldKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlcnMgZWFjaCByb3V0ZSBhbmQgd3JpdGVzIHRoZW0gdG9cbiAqIDxyb3V0ZT4vaW5kZXguaHRtbCBmb3IgZWFjaCBvdXRwdXQgcGF0aCBpbiB0aGUgYnJvd3NlciByZXN1bHQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIF9yZW5kZXJVbml2ZXJzYWwoXG4gIHJvdXRlczogc3RyaW5nW10sXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBicm93c2VyUmVzdWx0OiBCdWlsZEJ1aWxkZXJPdXRwdXQsXG4gIHNlcnZlclJlc3VsdDogQnVpbGRCdWlsZGVyT3V0cHV0LFxuICBicm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJPcHRpb25zLFxuICBudW1Qcm9jZXNzZXM/OiBudW1iZXIsXG4pOiBQcm9taXNlPFByZXJlbmRlckJ1aWxkZXJPdXRwdXQ+IHtcbiAgY29uc3QgcHJvamVjdE5hbWUgPSBjb250ZXh0LnRhcmdldCAmJiBjb250ZXh0LnRhcmdldC5wcm9qZWN0O1xuICBpZiAoIXByb2plY3ROYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgYnVpbGRlciByZXF1aXJlcyBhIHRhcmdldC4nKTtcbiAgfVxuXG4gIGNvbnN0IHByb2plY3RNZXRhZGF0YSA9IGF3YWl0IGNvbnRleHQuZ2V0UHJvamVjdE1ldGFkYXRhKHByb2plY3ROYW1lKTtcbiAgY29uc3QgcHJvamVjdFJvb3QgPSBwYXRoLmpvaW4oXG4gICAgY29udGV4dC53b3Jrc3BhY2VSb290LFxuICAgIChwcm9qZWN0TWV0YWRhdGEucm9vdCBhcyBzdHJpbmcgfCB1bmRlZmluZWQpID8/ICcnLFxuICApO1xuXG4gIC8vIFVzZXJzIGNhbiBzcGVjaWZ5IGEgZGlmZmVyZW50IGJhc2UgaHRtbCBmaWxlIGUuZy4gXCJzcmMvaG9tZS5odG1sXCJcbiAgY29uc3QgaW5kZXhGaWxlID0gZ2V0SW5kZXhPdXRwdXRGaWxlKGJyb3dzZXJPcHRpb25zKTtcbiAgY29uc3QgeyBzdHlsZXM6IG5vcm1hbGl6ZWRTdHlsZXNPcHRpbWl6YXRpb24gfSA9IG5vcm1hbGl6ZU9wdGltaXphdGlvbihcbiAgICBicm93c2VyT3B0aW9ucy5vcHRpbWl6YXRpb24sXG4gICk7XG5cbiAgY29uc3Qgem9uZVBhY2thZ2UgPSByZXF1aXJlLnJlc29sdmUoJ3pvbmUuanMnLCB7IHBhdGhzOiBbY29udGV4dC53b3Jrc3BhY2VSb290XSB9KTtcblxuICBjb25zdCB7IGJhc2VPdXRwdXRQYXRoID0gJycgfSA9IHNlcnZlclJlc3VsdDtcbiAgY29uc3Qgd29ya2VyID0gbmV3IFBpc2NpbmEoe1xuICAgIGZpbGVuYW1lOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnd29ya2VyLmpzJyksXG4gICAgbWF4VGhyZWFkczogbnVtUHJvY2Vzc2VzLFxuICAgIHdvcmtlckRhdGE6IHsgem9uZVBhY2thZ2UgfSxcbiAgfSk7XG5cbiAgdHJ5IHtcbiAgICAvLyBXZSBuZWVkIHRvIHJlbmRlciB0aGUgcm91dGVzIGZvciBlYWNoIGxvY2FsZSBmcm9tIHRoZSBicm93c2VyIG91dHB1dC5cbiAgICBmb3IgKGNvbnN0IG91dHB1dFBhdGggb2YgYnJvd3NlclJlc3VsdC5vdXRwdXRQYXRocykge1xuICAgICAgY29uc3QgbG9jYWxlRGlyZWN0b3J5ID0gcGF0aC5yZWxhdGl2ZShicm93c2VyUmVzdWx0LmJhc2VPdXRwdXRQYXRoLCBvdXRwdXRQYXRoKTtcbiAgICAgIGNvbnN0IHNlcnZlckJ1bmRsZVBhdGggPSBwYXRoLmpvaW4oYmFzZU91dHB1dFBhdGgsIGxvY2FsZURpcmVjdG9yeSwgJ21haW4uanMnKTtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzZXJ2ZXJCdW5kbGVQYXRoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIHRoZSBtYWluIGJ1bmRsZTogJHtzZXJ2ZXJCdW5kbGVQYXRofWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzcGlubmVyID0gb3JhKGBQcmVyZW5kZXJpbmcgJHtyb3V0ZXMubGVuZ3RofSByb3V0ZShzKSB0byAke291dHB1dFBhdGh9Li4uYCkuc3RhcnQoKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IChhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICByb3V0ZXMubWFwKChyb3V0ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9uczogUmVuZGVyT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgaW5kZXhGaWxlLFxuICAgICAgICAgICAgICBkZXBsb3lVcmw6IGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCB8fCAnJyxcbiAgICAgICAgICAgICAgaW5saW5lQ3JpdGljYWxDc3M6ICEhbm9ybWFsaXplZFN0eWxlc09wdGltaXphdGlvbi5pbmxpbmVDcml0aWNhbCxcbiAgICAgICAgICAgICAgbWluaWZ5Q3NzOiAhIW5vcm1hbGl6ZWRTdHlsZXNPcHRpbWl6YXRpb24ubWluaWZ5LFxuICAgICAgICAgICAgICBvdXRwdXRQYXRoLFxuICAgICAgICAgICAgICByb3V0ZSxcbiAgICAgICAgICAgICAgc2VydmVyQnVuZGxlUGF0aCxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiB3b3JrZXIucnVuKG9wdGlvbnMpO1xuICAgICAgICAgIH0pLFxuICAgICAgICApKSBhcyBSZW5kZXJSZXN1bHRbXTtcbiAgICAgICAgbGV0IG51bUVycm9ycyA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgeyBlcnJvcnMsIHdhcm5pbmdzIH0gb2YgcmVzdWx0cykge1xuICAgICAgICAgIHNwaW5uZXIuc3RvcCgpO1xuICAgICAgICAgIGVycm9ycz8uZm9yRWFjaCgoZSkgPT4gY29udGV4dC5sb2dnZXIuZXJyb3IoZSkpO1xuICAgICAgICAgIHdhcm5pbmdzPy5mb3JFYWNoKChlKSA9PiBjb250ZXh0LmxvZ2dlci53YXJuKGUpKTtcbiAgICAgICAgICBzcGlubmVyLnN0YXJ0KCk7XG4gICAgICAgICAgbnVtRXJyb3JzICs9IGVycm9ycz8ubGVuZ3RoID8/IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bUVycm9ycyA+IDApIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcihgUmVuZGVyaW5nIGZhaWxlZCB3aXRoICR7bnVtRXJyb3JzfSB3b3JrZXIgZXJyb3JzLmApO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzcGlubmVyLmZhaWwoYFByZXJlbmRlcmluZyByb3V0ZXMgdG8gJHtvdXRwdXRQYXRofSBmYWlsZWQuYCk7XG5cbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICB9XG4gICAgICBzcGlubmVyLnN1Y2NlZWQoYFByZXJlbmRlcmluZyByb3V0ZXMgdG8gJHtvdXRwdXRQYXRofSBjb21wbGV0ZS5gKTtcblxuICAgICAgaWYgKGJyb3dzZXJPcHRpb25zLnNlcnZpY2VXb3JrZXIpIHtcbiAgICAgICAgc3Bpbm5lci5zdGFydCgnR2VuZXJhdGluZyBzZXJ2aWNlIHdvcmtlci4uLicpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGF1Z21lbnRBcHBXaXRoU2VydmljZVdvcmtlcihcbiAgICAgICAgICAgIHByb2plY3RSb290LFxuICAgICAgICAgICAgY29udGV4dC53b3Jrc3BhY2VSb290LFxuICAgICAgICAgICAgb3V0cHV0UGF0aCxcbiAgICAgICAgICAgIGJyb3dzZXJPcHRpb25zLmJhc2VIcmVmIHx8ICcvJyxcbiAgICAgICAgICAgIGJyb3dzZXJPcHRpb25zLm5nc3dDb25maWdQYXRoLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgc3Bpbm5lci5mYWlsKCdTZXJ2aWNlIHdvcmtlciBnZW5lcmF0aW9uIGZhaWxlZC4nKTtcblxuICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgICAgIHNwaW5uZXIuc3VjY2VlZCgnU2VydmljZSB3b3JrZXIgZ2VuZXJhdGlvbiBjb21wbGV0ZS4nKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZmluYWxseSB7XG4gICAgdm9pZCB3b3JrZXIuZGVzdHJveSgpO1xuICB9XG5cbiAgcmV0dXJuIGJyb3dzZXJSZXN1bHQ7XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBicm93c2VyIGFuZCBzZXJ2ZXIsIHRoZW4gcmVuZGVycyBlYWNoIHJvdXRlIGluIG9wdGlvbnMucm91dGVzXG4gKiBhbmQgd3JpdGVzIHRoZW0gdG8gcHJlcmVuZGVyLzxyb3V0ZT4vaW5kZXguaHRtbCBmb3IgZWFjaCBvdXRwdXQgcGF0aCBpblxuICogdGhlIGJyb3dzZXIgcmVzdWx0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShcbiAgb3B0aW9uczogUHJlcmVuZGVyQnVpbGRlck9wdGlvbnMsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuKTogUHJvbWlzZTxQcmVyZW5kZXJCdWlsZGVyT3V0cHV0PiB7XG4gIGNvbnN0IGJyb3dzZXJUYXJnZXQgPSB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nKG9wdGlvbnMuYnJvd3NlclRhcmdldCk7XG4gIGNvbnN0IGJyb3dzZXJPcHRpb25zID0gKGF3YWl0IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyhcbiAgICBicm93c2VyVGFyZ2V0LFxuICApKSBhcyB1bmtub3duIGFzIEJyb3dzZXJCdWlsZGVyT3B0aW9ucztcbiAgY29uc3QgdHNDb25maWdQYXRoID1cbiAgICB0eXBlb2YgYnJvd3Nlck9wdGlvbnMudHNDb25maWcgPT09ICdzdHJpbmcnID8gYnJvd3Nlck9wdGlvbnMudHNDb25maWcgOiB1bmRlZmluZWQ7XG5cbiAgY29uc3Qgcm91dGVzID0gYXdhaXQgZ2V0Um91dGVzKG9wdGlvbnMsIHRzQ29uZmlnUGF0aCwgY29udGV4dCk7XG4gIGlmICghcm91dGVzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYW55IHJvdXRlcyB0byBwcmVyZW5kZXIuYCk7XG4gIH1cblxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBfc2NoZWR1bGVCdWlsZHMob3B0aW9ucywgY29udGV4dCk7XG4gIGNvbnN0IHsgc3VjY2VzcywgZXJyb3IsIGJyb3dzZXJSZXN1bHQsIHNlcnZlclJlc3VsdCB9ID0gcmVzdWx0O1xuICBpZiAoIXN1Y2Nlc3MgfHwgIWJyb3dzZXJSZXN1bHQgfHwgIXNlcnZlclJlc3VsdCkge1xuICAgIHJldHVybiB7IHN1Y2Nlc3MsIGVycm9yIH0gYXMgQnVpbGRlck91dHB1dDtcbiAgfVxuXG4gIHJldHVybiBfcmVuZGVyVW5pdmVyc2FsKFxuICAgIHJvdXRlcyxcbiAgICBjb250ZXh0LFxuICAgIGJyb3dzZXJSZXN1bHQsXG4gICAgc2VydmVyUmVzdWx0LFxuICAgIGJyb3dzZXJPcHRpb25zLFxuICAgIG9wdGlvbnMubnVtUHJvY2Vzc2VzLFxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjcmVhdGVCdWlsZGVyKGV4ZWN1dGUpO1xuIl19