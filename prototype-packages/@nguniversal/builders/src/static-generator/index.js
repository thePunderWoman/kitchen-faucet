"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = void 0;
const architect_1 = require("@angular-devkit/architect");
const normalize_optimization_1 = require("@angular-devkit/build-angular/src/utils/normalize-optimization");
const service_worker_1 = require("@angular-devkit/build-angular/src/utils/service-worker");
const express_1 = __importDefault(require("express"));
const http = __importStar(require("http"));
const ora_1 = __importDefault(require("ora"));
const os_1 = require("os");
const path = __importStar(require("path"));
const piscina_1 = __importDefault(require("piscina"));
const util_1 = require("util");
const utils_1 = require("../ssr-dev-server/utils");
const utils_2 = require("./utils");
/**
 * Builds the browser and server, then renders each route in options.routes
 * and writes them to prerender/<route>/index.html for each output path in
 * the browser result.
 */
async function execute(options, context) {
    const browserTarget = (0, architect_1.targetFromTargetString)(options.browserTarget);
    const browserOptions = (await context.getTargetOptions(browserTarget));
    const routes = await (0, utils_2.getRoutes)(options, browserOptions.tsConfig, context);
    if (!routes.length) {
        throw new Error(`Could not find any routes to generate.`);
    }
    const { result } = await context.scheduleTarget(browserTarget, {
        watch: false,
        serviceWorker: false,
    });
    const { success, error, outputPaths } = (await result);
    if (!success) {
        return { success, error };
    }
    const { styles: normalizedStylesOptimization } = (0, normalize_optimization_1.normalizeOptimization)(browserOptions.optimization);
    const worker = createWorker();
    try {
        for (const outputPath of outputPaths) {
            const spinner = (0, ora_1.default)(`Prerendering ${routes.length} route(s) to ${outputPath}...`).start();
            const staticServer = await createStaticServer(outputPath);
            try {
                await Promise.all(routes.map((route) => {
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
                    const swResult = await generateServiceWorker(context, outputPath, browserOptions);
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
                await staticServer.close();
            }
        }
        return { success: true };
    }
    finally {
        void worker.destroy();
    }
}
exports.execute = execute;
async function createStaticServer(browserOutputRoot) {
    const app = (0, express_1.default)();
    app.use(express_1.default.static(browserOutputRoot));
    const port = await (0, utils_1.getAvailablePort)();
    const server = new http.Server(app);
    await new Promise((res) => server.listen(port, res));
    return {
        close: (0, util_1.promisify)(server.close.bind(server)),
        port,
    };
}
function createWorker() {
    const maxThreads = Math.max(Math.min((0, os_1.cpus)().length, 6) - 1, 1);
    const worker = new piscina_1.default({
        filename: path.join(__dirname, 'worker.js'),
        name: 'render',
        maxThreads,
    });
    return worker;
}
async function generateServiceWorker(context, outputPath, browserOptions) {
    var _a, _b;
    const spinner = (0, ora_1.default)(`Generating service worker for ${outputPath}...`).start();
    try {
        const projectName = (_a = context.target) === null || _a === void 0 ? void 0 : _a.project;
        if (!projectName) {
            throw new Error('The builder requires a target.');
        }
        const projectMetadata = await context.getProjectMetadata(projectName);
        const projectRoot = path.join(context.workspaceRoot, (_b = projectMetadata.root) !== null && _b !== void 0 ? _b : '');
        await (0, service_worker_1.augmentAppWithServiceWorker)(projectRoot, context.workspaceRoot, outputPath, browserOptions.baseHref || '/', browserOptions.ngswConfigPath);
        spinner.succeed(`Service worker generation for ${outputPath} complete.`);
        return { success: true };
    }
    catch (error) {
        spinner.fail(`Service worker generation for ${outputPath} failed.`);
        return { success: false, error: error.message };
    }
}
exports.default = (0, architect_1.createBuilder)(execute);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2J1aWxkZXJzL3NyYy9zdGF0aWMtZ2VuZXJhdG9yL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgseURBS21DO0FBRW5DLDJHQUF1RztBQUN2RywyRkFBcUc7QUFDckcsc0RBQThCO0FBQzlCLDJDQUE2QjtBQUM3Qiw4Q0FBc0I7QUFDdEIsMkJBQTBCO0FBQzFCLDJDQUE2QjtBQUM3QixzREFBOEI7QUFDOUIsK0JBQWlDO0FBQ2pDLG1EQUEyRDtBQUUzRCxtQ0FBb0M7QUFHcEM7Ozs7R0FJRztBQUNJLEtBQUssVUFBVSxPQUFPLENBQzNCLE9BQWdDLEVBQ2hDLE9BQXVCO0lBRXZCLE1BQU0sYUFBYSxHQUFHLElBQUEsa0NBQXNCLEVBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3BFLE1BQU0sY0FBYyxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsZ0JBQWdCLENBQ3BELGFBQWEsQ0FDZCxDQUFxQyxDQUFDO0lBQ3ZDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxpQkFBUyxFQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRTFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0NBQXdDLENBQUMsQ0FBQztLQUMzRDtJQUVELE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLE9BQU8sQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFO1FBQzdELEtBQUssRUFBRSxLQUFLO1FBQ1osYUFBYSxFQUFFLEtBQUs7S0FDckIsQ0FBQyxDQUFDO0lBRUgsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxNQUFN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RUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7S0FDMUI7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUNBQWlDLFVBQVUsVUFBVSxDQUFDLENBQUM7UUFFcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztLQUNqRDtBQUNILENBQUM7QUFFRCxrQkFBZSxJQUFBLHlCQUFhLEVBQUMsT0FBTyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgQnVpbGRlckNvbnRleHQsXG4gIEJ1aWxkZXJPdXRwdXQsXG4gIGNyZWF0ZUJ1aWxkZXIsXG4gIHRhcmdldEZyb21UYXJnZXRTdHJpbmcsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJPcHRpb25zLCBCcm93c2VyQnVpbGRlck91dHB1dCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbmltcG9ydCB7IG5vcm1hbGl6ZU9wdGltaXphdGlvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy91dGlscy9ub3JtYWxpemUtb3B0aW1pemF0aW9uJztcbmltcG9ydCB7IGF1Z21lbnRBcHBXaXRoU2VydmljZVdvcmtlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy91dGlscy9zZXJ2aWNlLXdvcmtlcic7XG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgb3JhIGZyb20gJ29yYSc7XG5pbXBvcnQgeyBjcHVzIH0gZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBQaXNjaW5hIGZyb20gJ3Bpc2NpbmEnO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgeyBnZXRBdmFpbGFibGVQb3J0IH0gZnJvbSAnLi4vc3NyLWRldi1zZXJ2ZXIvdXRpbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFByZXJlbmRlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgZ2V0Um91dGVzIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBSZW5kZXJPcHRpb25zIH0gZnJvbSAnLi93b3JrZXInO1xuXG4vKipcbiAqIEJ1aWxkcyB0aGUgYnJvd3NlciBhbmQgc2VydmVyLCB0aGVuIHJlbmRlcnMgZWFjaCByb3V0ZSBpbiBvcHRpb25zLnJvdXRlc1xuICogYW5kIHdyaXRlcyB0aGVtIHRvIHByZXJlbmRlci88cm91dGU+L2luZGV4Lmh0bWwgZm9yIGVhY2ggb3V0cHV0IHBhdGggaW5cbiAqIHRoZSBicm93c2VyIHJlc3VsdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoXG4gIG9wdGlvbnM6IFByZXJlbmRlckJ1aWxkZXJPcHRpb25zLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbik6IFByb21pc2U8QnVpbGRlck91dHB1dD4ge1xuICBjb25zdCBicm93c2VyVGFyZ2V0ID0gdGFyZ2V0RnJvbVRhcmdldFN0cmluZyhvcHRpb25zLmJyb3dzZXJUYXJnZXQpO1xuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IChhd2FpdCBjb250ZXh0LmdldFRhcmdldE9wdGlvbnMoXG4gICAgYnJvd3NlclRhcmdldCxcbiAgKSkgYXMgdW5rbm93biBhcyBCcm93c2VyQnVpbGRlck9wdGlvbnM7XG4gIGNvbnN0IHJvdXRlcyA9IGF3YWl0IGdldFJvdXRlcyhvcHRpb25zLCBicm93c2VyT3B0aW9ucy50c0NvbmZpZywgY29udGV4dCk7XG5cbiAgaWYgKCFyb3V0ZXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBhbnkgcm91dGVzIHRvIGdlbmVyYXRlLmApO1xuICB9XG5cbiAgY29uc3QgeyByZXN1bHQgfSA9IGF3YWl0IGNvbnRleHQuc2NoZWR1bGVUYXJnZXQoYnJvd3NlclRhcmdldCwge1xuICAgIHdhdGNoOiBmYWxzZSxcbiAgICBzZXJ2aWNlV29ya2VyOiBmYWxzZSxcbiAgfSk7XG5cbiAgY29uc3QgeyBzdWNjZXNzLCBlcnJvciwgb3V0cHV0UGF0aHMgfSA9IChhd2FpdCByZXN1bHQpIGFzIEJyb3dzZXJCdWlsZGVyT3V0cHV0O1xuICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICByZXR1cm4geyBzdWNjZXNzLCBlcnJvciB9IGFzIEJ1aWxkZXJPdXRwdXQ7XG4gIH1cblxuICBjb25zdCB7IHN0eWxlczogbm9ybWFsaXplZFN0eWxlc09wdGltaXphdGlvbiB9ID0gbm9ybWFsaXplT3B0aW1pemF0aW9uKFxuICAgIGJyb3dzZXJPcHRpb25zLm9wdGltaXphdGlvbixcbiAgKTtcblxuICBjb25zdCB3b3JrZXIgPSBjcmVhdGVXb3JrZXIoKTtcbiAgdHJ5IHtcbiAgICBmb3IgKGNvbnN0IG91dHB1dFBhdGggb2Ygb3V0cHV0UGF0aHMpIHtcbiAgICAgIGNvbnN0IHNwaW5uZXIgPSBvcmEoYFByZXJlbmRlcmluZyAke3JvdXRlcy5sZW5ndGh9IHJvdXRlKHMpIHRvICR7b3V0cHV0UGF0aH0uLi5gKS5zdGFydCgpO1xuXG4gICAgICBjb25zdCBzdGF0aWNTZXJ2ZXIgPSBhd2FpdCBjcmVhdGVTdGF0aWNTZXJ2ZXIob3V0cHV0UGF0aCk7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICByb3V0ZXMubWFwKChyb3V0ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9uczogUmVuZGVyT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgaW5saW5lQ3JpdGljYWxDc3M6IG5vcm1hbGl6ZWRTdHlsZXNPcHRpbWl6YXRpb24uaW5saW5lQ3JpdGljYWwsXG4gICAgICAgICAgICAgIG91dHB1dFBhdGgsXG4gICAgICAgICAgICAgIHJvdXRlLFxuICAgICAgICAgICAgICBwb3J0OiBzdGF0aWNTZXJ2ZXIucG9ydCxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiB3b3JrZXIucnVuKG9wdGlvbnMsIHsgbmFtZTogJ3JlbmRlcicgfSk7XG4gICAgICAgICAgfSksXG4gICAgICAgICk7XG5cbiAgICAgICAgc3Bpbm5lci5zdWNjZWVkKGBQcmVyZW5kZXJpbmcgcm91dGVzIHRvICR7b3V0cHV0UGF0aH0gY29tcGxldGUuYCk7XG5cbiAgICAgICAgaWYgKGJyb3dzZXJPcHRpb25zLnNlcnZpY2VXb3JrZXIpIHtcbiAgICAgICAgICBjb25zdCBzd1Jlc3VsdCA9IGF3YWl0IGdlbmVyYXRlU2VydmljZVdvcmtlcihjb250ZXh0LCBvdXRwdXRQYXRoLCBicm93c2VyT3B0aW9ucyk7XG4gICAgICAgICAgaWYgKCFzd1Jlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICByZXR1cm4gc3dSZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzcGlubmVyLmZhaWwoYFByZXJlbmRlcmluZyByb3V0ZXMgdG8gJHtvdXRwdXRQYXRofSBmYWlsZWQuYCk7XG5cbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBhd2FpdCBzdGF0aWNTZXJ2ZXIuY2xvc2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gIH0gZmluYWxseSB7XG4gICAgdm9pZCB3b3JrZXIuZGVzdHJveSgpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVN0YXRpY1NlcnZlcihicm93c2VyT3V0cHV0Um9vdDogc3RyaW5nKTogUHJvbWlzZTx7XG4gIGNsb3NlOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xuICBwb3J0OiBudW1iZXI7XG59PiB7XG4gIGNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcbiAgYXBwLnVzZShleHByZXNzLnN0YXRpYyhicm93c2VyT3V0cHV0Um9vdCkpO1xuICBjb25zdCBwb3J0ID0gYXdhaXQgZ2V0QXZhaWxhYmxlUG9ydCgpO1xuICBjb25zdCBzZXJ2ZXIgPSBuZXcgaHR0cC5TZXJ2ZXIoYXBwKTtcbiAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlcykgPT4gc2VydmVyLmxpc3Rlbihwb3J0LCByZXMpKTtcblxuICByZXR1cm4ge1xuICAgIGNsb3NlOiBwcm9taXNpZnkoc2VydmVyLmNsb3NlLmJpbmQoc2VydmVyKSksXG4gICAgcG9ydCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlV29ya2VyKCk6IFBpc2NpbmEge1xuICBjb25zdCBtYXhUaHJlYWRzID0gTWF0aC5tYXgoTWF0aC5taW4oY3B1cygpLmxlbmd0aCwgNikgLSAxLCAxKTtcblxuICBjb25zdCB3b3JrZXIgPSBuZXcgUGlzY2luYSh7XG4gICAgZmlsZW5hbWU6IHBhdGguam9pbihfX2Rpcm5hbWUsICd3b3JrZXIuanMnKSxcbiAgICBuYW1lOiAncmVuZGVyJyxcbiAgICBtYXhUaHJlYWRzLFxuICB9KTtcblxuICByZXR1cm4gd29ya2VyO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVNlcnZpY2VXb3JrZXIoXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBvdXRwdXRQYXRoOiBzdHJpbmcsXG4gIGJyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlck9wdGlvbnMsXG4pOiBQcm9taXNlPEJ1aWxkZXJPdXRwdXQ+IHtcbiAgY29uc3Qgc3Bpbm5lciA9IG9yYShgR2VuZXJhdGluZyBzZXJ2aWNlIHdvcmtlciBmb3IgJHtvdXRwdXRQYXRofS4uLmApLnN0YXJ0KCk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBwcm9qZWN0TmFtZSA9IGNvbnRleHQudGFyZ2V0Py5wcm9qZWN0O1xuICAgIGlmICghcHJvamVjdE5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGJ1aWxkZXIgcmVxdWlyZXMgYSB0YXJnZXQuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdE1ldGFkYXRhID0gYXdhaXQgY29udGV4dC5nZXRQcm9qZWN0TWV0YWRhdGEocHJvamVjdE5hbWUpO1xuICAgIGNvbnN0IHByb2plY3RSb290ID0gcGF0aC5qb2luKFxuICAgICAgY29udGV4dC53b3Jrc3BhY2VSb290LFxuICAgICAgKHByb2plY3RNZXRhZGF0YS5yb290IGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgPz8gJycsXG4gICAgKTtcblxuICAgIGF3YWl0IGF1Z21lbnRBcHBXaXRoU2VydmljZVdvcmtlcihcbiAgICAgIHByb2plY3RSb290LFxuICAgICAgY29udGV4dC53b3Jrc3BhY2VSb290LFxuICAgICAgb3V0cHV0UGF0aCxcbiAgICAgIGJyb3dzZXJPcHRpb25zLmJhc2VIcmVmIHx8ICcvJyxcbiAgICAgIGJyb3dzZXJPcHRpb25zLm5nc3dDb25maWdQYXRoLFxuICAgICk7XG5cbiAgICBzcGlubmVyLnN1Y2NlZWQoYFNlcnZpY2Ugd29ya2VyIGdlbmVyYXRpb24gZm9yICR7b3V0cHV0UGF0aH0gY29tcGxldGUuYCk7XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgc3Bpbm5lci5mYWlsKGBTZXJ2aWNlIHdvcmtlciBnZW5lcmF0aW9uIGZvciAke291dHB1dFBhdGh9IGZhaWxlZC5gKTtcblxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNyZWF0ZUJ1aWxkZXIoZXhlY3V0ZSk7XG4iXX0=