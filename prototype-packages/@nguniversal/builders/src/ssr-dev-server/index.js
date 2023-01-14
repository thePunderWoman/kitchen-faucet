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
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = void 0;
const architect_1 = require("@angular-devkit/architect");
const core_1 = require("@angular-devkit/core");
const browserSync = __importStar(require("browser-sync"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const url = __importStar(require("url"));
const utils_1 = require("./utils");
/** Log messages to ignore and not rely to the logger */
const IGNORED_STDOUT_MESSAGES = [
    'server listening on',
    'Angular is running in development mode. Call enableProdMode() to enable production mode.',
];
function execute(options, context) {
    const browserTarget = (0, architect_1.targetFromTargetString)(options.browserTarget);
    const serverTarget = (0, architect_1.targetFromTargetString)(options.serverTarget);
    const getBaseUrl = (bs) => `${bs.getOption('scheme')}://${bs.getOption('host')}:${bs.getOption('port')}`;
    const browserTargetRun = context.scheduleTarget(browserTarget, {
        serviceWorker: false,
        watch: true,
        progress: options.progress,
        // Disable bundle budgets are these are not meant to be used with a dev-server as this will add extra JavaScript for live-reloading.
        budgets: [],
    });
    const serverTargetRun = context.scheduleTarget(serverTarget, {
        watch: true,
        progress: options.progress,
    });
    const bsInstance = browserSync.create();
    context.logger.error(core_1.tags.stripIndents `
  ****************************************************************************************
  This is a simple server for use in testing or debugging Angular applications locally.
  It hasn't been reviewed for security issues.

  DON'T USE IT FOR PRODUCTION!
  ****************************************************************************************
 `);
    return (0, rxjs_1.zip)(browserTargetRun, serverTargetRun, (0, utils_1.getAvailablePort)()).pipe((0, operators_1.switchMap)(([br, sr, nodeServerPort]) => {
        return (0, rxjs_1.combineLatest)([br.output, sr.output]).pipe(
        // This is needed so that if both server and browser emit close to each other
        // we only emit once. This typically happens on the first build.
        (0, operators_1.debounceTime)(120), (0, operators_1.switchMap)(([b, s]) => {
            if (!s.success || !b.success) {
                return (0, rxjs_1.of)([b, s]);
            }
            return startNodeServer(s, nodeServerPort, context.logger, !!options.inspect).pipe((0, operators_1.mapTo)([b, s]), (0, operators_1.catchError)((err) => {
                context.logger.error(`A server error has occurred.\n${mapErrorToMessage(err)}`);
                return rxjs_1.EMPTY;
            }));
        }), (0, operators_1.map)(([b, s]) => [
            {
                success: b.success && s.success,
                error: b.error || s.error,
            },
            nodeServerPort,
        ]), (0, operators_1.tap)(([builderOutput]) => {
            if (builderOutput.success) {
                context.logger.info('\nCompiled successfully.');
            }
        }), (0, operators_1.debounce)(([builderOutput]) => builderOutput.success && !options.inspect
            ? (0, utils_1.waitUntilServerIsListening)(nodeServerPort)
            : rxjs_1.EMPTY), (0, operators_1.finalize)(() => {
            void br.stop();
            void sr.stop();
        }));
    }), (0, operators_1.concatMap)(([builderOutput, nodeServerPort]) => {
        if (!builderOutput.success) {
            return (0, rxjs_1.of)(builderOutput);
        }
        if (bsInstance.active) {
            bsInstance.reload();
            return (0, rxjs_1.of)(builderOutput);
        }
        else {
            return (0, rxjs_1.from)(initBrowserSync(bsInstance, nodeServerPort, options, context)).pipe((0, operators_1.tap)((bs) => {
                const baseUrl = getBaseUrl(bs);
                context.logger.info(core_1.tags.oneLine `
                **
                Angular Universal Live Development Server is listening on ${baseUrl},
                open your browser on ${baseUrl}
                **
              `);
            }), (0, operators_1.mapTo)(builderOutput));
        }
    }), (0, operators_1.map)((builderOutput) => ({
        success: builderOutput.success,
        error: builderOutput.error,
        baseUrl: bsInstance && getBaseUrl(bsInstance),
    })), (0, operators_1.finalize)(() => {
        if (bsInstance) {
            bsInstance.exit();
            bsInstance.cleanup();
        }
    }), (0, operators_1.catchError)((error) => (0, rxjs_1.of)({
        success: false,
        error: mapErrorToMessage(error),
    })));
}
exports.execute = execute;
function startNodeServer(serverOutput, port, logger, inspectMode = false) {
    const outputPath = serverOutput.outputPath;
    const path = (0, path_1.join)(outputPath, 'main.js');
    const env = { ...process.env, PORT: '' + port };
    const args = ['--enable-source-maps', `"${path}"`];
    if (inspectMode) {
        args.unshift('--inspect-brk');
    }
    return (0, rxjs_1.of)(null).pipe((0, operators_1.delay)(0), // Avoid EADDRINUSE error since it will cause the kill event to be finish.
    (0, operators_1.switchMap)(() => (0, utils_1.spawnAsObservable)('node', args, { env, shell: true })), (0, operators_1.tap)(({ stderr, stdout }) => {
        if (stderr) {
            // Strip the webpack scheme (webpack://) from error log.
            logger.error(stderr.replace(/webpack:\/\//g, '.'));
        }
        if (stdout && !IGNORED_STDOUT_MESSAGES.some((x) => stdout.includes(x))) {
            logger.info(stdout);
        }
    }), (0, operators_1.ignoreElements)(), 
    // Emit a signal after the process has been started
    (0, operators_1.startWith)(undefined));
}
async function initBrowserSync(browserSyncInstance, nodeServerPort, options, context) {
    if (browserSyncInstance.active) {
        return browserSyncInstance;
    }
    const { port: browserSyncPort, open, host, publicHost, proxyConfig } = options;
    const bsPort = browserSyncPort || (await (0, utils_1.getAvailablePort)());
    const bsOptions = {
        proxy: {
            target: `localhost:${nodeServerPort}`,
            proxyOptions: {
                xfwd: true,
            },
            proxyRes: [
                (proxyRes) => {
                    if ('headers' in proxyRes) {
                        proxyRes.headers['cache-control'] = undefined;
                    }
                },
            ],
            // proxyOptions is not in the typings
        },
        host,
        port: bsPort,
        ui: false,
        server: false,
        notify: false,
        ghostMode: false,
        logLevel: 'silent',
        open,
        https: getSslConfig(context.workspaceRoot, options),
    };
    const publicHostNormalized = publicHost && publicHost.endsWith('/')
        ? publicHost.substring(0, publicHost.length - 1)
        : publicHost;
    if (publicHostNormalized) {
        const { protocol, hostname, port, pathname } = url.parse(publicHostNormalized);
        const defaultSocketIoPath = '/browser-sync/socket.io';
        const defaultNamespace = '/browser-sync';
        const hasPathname = !!(pathname && pathname !== '/');
        const namespace = hasPathname ? pathname + defaultNamespace : defaultNamespace;
        const path = hasPathname ? pathname + defaultSocketIoPath : defaultSocketIoPath;
        bsOptions.socket = {
            namespace,
            path,
            domain: url.format({
                protocol,
                hostname,
                port,
            }),
        };
        // When having a pathname we also need to create a reverse proxy because socket.io
        // will be listening on: 'http://localhost:4200/ssr/browser-sync/socket.io'
        // However users will typically have a reverse proxy that will redirect all matching requests
        // ex: http://testinghost.com/ssr -> http://localhost:4200 which will result in a 404.
        if (hasPathname) {
            // Remove leading slash
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            (bsOptions.scriptPath = (p) => p.substring(1)),
                (bsOptions.middleware = [
                    (0, http_proxy_middleware_1.createProxyMiddleware)(defaultSocketIoPath, {
                        target: url.format({
                            protocol: 'http',
                            hostname: host,
                            port: bsPort,
                            pathname: path,
                        }),
                        ws: true,
                        logLevel: 'silent',
                    }),
                ]);
        }
    }
    if (proxyConfig) {
        if (!bsOptions.middleware) {
            bsOptions.middleware = [];
        }
        else if (!Array.isArray(bsOptions.middleware)) {
            bsOptions.middleware = [bsOptions.middleware];
        }
        bsOptions.middleware = [
            ...bsOptions.middleware,
            ...getProxyConfig(context.workspaceRoot, proxyConfig),
        ];
    }
    return new Promise((resolve, reject) => {
        browserSyncInstance.init(bsOptions, (error, bs) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(bs);
            }
        });
    });
}
function mapErrorToMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return '';
}
function getSslConfig(root, options) {
    const { ssl, sslCert, sslKey } = options;
    if (ssl && sslCert && sslKey) {
        return {
            key: (0, path_1.resolve)(root, sslKey),
            cert: (0, path_1.resolve)(root, sslCert),
        };
    }
    return ssl;
}
function getProxyConfig(root, proxyConfig) {
    const proxyPath = (0, path_1.resolve)(root, proxyConfig);
    let proxySettings;
    try {
        proxySettings = require(proxyPath);
    }
    catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            throw new Error(`Proxy config file ${proxyPath} does not exist.`);
        }
        throw error;
    }
    const proxies = Array.isArray(proxySettings) ? proxySettings : [proxySettings];
    const createdProxies = [];
    for (const proxy of proxies) {
        for (const [key, context] of Object.entries(proxy)) {
            if (typeof key === 'string') {
                createdProxies.push((0, http_proxy_middleware_1.createProxyMiddleware)(key.replace(/^\*$/, '**').replace(/\/\*$/, ''), context));
            }
            else {
                createdProxies.push((0, http_proxy_middleware_1.createProxyMiddleware)(key, context));
            }
        }
    }
    return createdProxies;
}
exports.default = (0, architect_1.createBuilder)(execute);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2J1aWxkZXJzL3NyYy9zc3ItZGV2LXNlcnZlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHlEQUttQztBQUNuQywrQ0FBMkQ7QUFDM0QsMERBQTRDO0FBQzVDLGlFQUE4RDtBQUM5RCwrQkFBb0Q7QUFDcEQsK0JBQXVFO0FBQ3ZFLDhDQWF3QjtBQUN4Qix5Q0FBMkI7QUFHM0IsbUNBQTBGO0FBRTFGLHdEQUF3RDtBQUN4RCxNQUFNLHVCQUF1QixHQUFHO0lBQzlCLHFCQUFxQjtJQUNyQiwwRkFBMEY7Q0FDM0YsQ0FBQztBQU9GLFNBQWdCLE9BQU8sQ0FDckIsT0FBbUMsRUFDbkMsT0FBdUI7SUFFdkIsTUFBTSxhQUFhLEdBQUcsSUFBQSxrQ0FBc0IsRUFBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDcEUsTUFBTSxZQUFZLEdBQUcsSUFBQSxrQ0FBc0IsRUFBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDbEUsTUFBTSxVQUFVLEdBQUcsQ0FBQyxFQUFtQyxFQUFFLEVBQUUsQ0FDekQsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0lBQ2hGLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUU7UUFDN0QsYUFBYSxFQUFFLEtBQUs7UUFDcEIsS0FBSyxFQUFFLElBQUk7UUFDWCxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVE7UUFDMUIsb0lBQW9JO1FBQ3BJLE9BQU8sRUFBRSxFQUFFO0tBQ1osQ0FBQyxDQUFDO0lBRUgsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUU7UUFDM0QsS0FBSyxFQUFFLElBQUk7UUFDWCxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVE7S0FDM0IsQ0FBQyxDQUFDO0lBRUgsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBRXhDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQUksQ0FBQyxZQUFZLENBQUE7Ozs7Ozs7RUFPdEMsQ0FBQyxDQUFDO0lBRUYsT0FBTyxJQUFBLFVBQUcsRUFBQyxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsSUFBQSx3QkFBZ0IsR0FBRSxDQUFDLENBQUMsSUFBSSxDQUNwRSxJQUFBLHFCQUFTLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsY0FBYyxDQUFDLEVBQUUsRUFBRTtRQUNyQyxPQUFPLElBQUEsb0JBQWEsRUFBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSTtRQUMvQyw2RUFBNkU7UUFDN0UsZ0VBQWdFO1FBQ2hFLElBQUEsd0JBQVksRUFBQyxHQUFHLENBQUMsRUFDakIsSUFBQSxxQkFBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuQixJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUU7Z0JBQzVCLE9BQU8sSUFBQSxTQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNuQjtZQUVELE9BQU8sZUFBZSxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FDL0UsSUFBQSxpQkFBSyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQ2IsSUFBQSxzQkFBVSxFQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ2pCLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRWhGLE9BQU8sWUFBSyxDQUFDO1lBQ2YsQ0FBQyxDQUFDLENBQ0gsQ0FBQztRQUNKLENBQUMsQ0FBQyxFQUNGLElBQUEsZUFBRyxFQUNELENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNUO1lBQ0U7Z0JBQ0UsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU87Z0JBQy9CLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxLQUFLO2FBQzFCO1lBQ0QsY0FBYztTQUN3QixDQUMzQyxFQUNELElBQUEsZUFBRyxFQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFO1lBQ3RCLElBQUksYUFBYSxDQUFDLE9BQU8sRUFBRTtnQkFDekIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQzthQUNqRDtRQUNILENBQUMsQ0FBQyxFQUNGLElBQUEsb0JBQVEsRUFBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxDQUMzQixhQUFhLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU87WUFDdkMsQ0FBQyxDQUFDLElBQUEsa0NBQTBCLEVBQUMsY0FBYyxDQUFDO1lBQzVDLENBQUMsQ0FBQyxZQUFLLENBQ1YsRUFDRCxJQUFBLG9CQUFRLEVBQUMsR0FBRyxFQUFFO1lBQ1osS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQyxDQUFDLEVBQ0YsSUFBQSxxQkFBUyxFQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLEVBQUUsRUFBRTtRQUM1QyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRTtZQUMxQixPQUFPLElBQUEsU0FBRSxFQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQzFCO1FBRUQsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFO1lBQ3JCLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUVwQixPQUFPLElBQUEsU0FBRSxFQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQzFCO2FBQU07WUFDTCxPQUFPLElBQUEsV0FBSSxFQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDN0UsSUFBQSxlQUFHLEVBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQy9CLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUE7OzRFQUVnQyxPQUFPO3VDQUM1QyxPQUFPOztlQUUvQixDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsRUFDRixJQUFBLGlCQUFLLEVBQUMsYUFBYSxDQUFDLENBQ3JCLENBQUM7U0FDSDtJQUNILENBQUMsQ0FBQyxFQUNGLElBQUEsZUFBRyxFQUNELENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FDaEIsQ0FBQztRQUNDLE9BQU8sRUFBRSxhQUFhLENBQUMsT0FBTztRQUM5QixLQUFLLEVBQUUsYUFBYSxDQUFDLEtBQUs7UUFDMUIsT0FBTyxFQUFFLFVBQVUsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDO0tBQ2hCLENBQUEsQ0FDbEMsRUFDRCxJQUFBLG9CQUFRLEVBQUMsR0FBRyxFQUFFO1FBQ1osSUFBSSxVQUFVLEVBQUU7WUFDZCxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbEIsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ3RCO0lBQ0gsQ0FBQyxDQUFDLEVBQ0YsSUFBQSxzQkFBVSxFQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDbkIsSUFBQSxTQUFFLEVBQUM7UUFDRCxPQUFPLEVBQUUsS0FBSztRQUNkLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7S0FDaEMsQ0FBQyxDQUNILENBQ0YsQ0FBQztBQUNKLENBQUM7QUEzSEQsMEJBMkhDO0FBRUQsU0FBUyxlQUFlLENBQ3RCLFlBQTJCLEVBQzNCLElBQVksRUFDWixNQUF5QixFQUN6QixXQUFXLEdBQUcsS0FBSztJQUVuQixNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsVUFBb0IsQ0FBQztJQUNyRCxNQUFNLElBQUksR0FBRyxJQUFBLFdBQUksRUFBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDekMsTUFBTSxHQUFHLEdBQUcsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQztJQUVoRCxNQUFNLElBQUksR0FBRyxDQUFDLHNCQUFzQixFQUFFLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztJQUNuRCxJQUFJLFdBQVcsRUFBRTtRQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7S0FDL0I7SUFFRCxPQUFPLElBQUEsU0FBRSxFQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDbEIsSUFBQSxpQkFBSyxFQUFDLENBQUMsQ0FBQyxFQUFFLDBFQUEwRTtJQUNwRixJQUFBLHFCQUFTLEVBQUMsR0FBRyxFQUFFLENBQUMsSUFBQSx5QkFBaUIsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQ3RFLElBQUEsZUFBRyxFQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtRQUN6QixJQUFJLE1BQU0sRUFBRTtZQUNWLHdEQUF3RDtZQUN4RCxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDcEQ7UUFFRCxJQUFJLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3RFLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDckI7SUFDSCxDQUFDLENBQUMsRUFDRixJQUFBLDBCQUFjLEdBQUU7SUFDaEIsbURBQW1EO0lBQ25ELElBQUEscUJBQVMsRUFBQyxTQUFTLENBQUMsQ0FDckIsQ0FBQztBQUNKLENBQUM7QUFFRCxLQUFLLFVBQVUsZUFBZSxDQUM1QixtQkFBb0QsRUFDcEQsY0FBc0IsRUFDdEIsT0FBbUMsRUFDbkMsT0FBdUI7SUFFdkIsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEVBQUU7UUFDOUIsT0FBTyxtQkFBbUIsQ0FBQztLQUM1QjtJQUVELE1BQU0sRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUMvRSxNQUFNLE1BQU0sR0FBRyxlQUFlLElBQUksQ0FBQyxNQUFNLElBQUEsd0JBQWdCLEdBQUUsQ0FBQyxDQUFDO0lBQzdELE1BQU0sU0FBUyxHQUF3QjtRQUNyQyxLQUFLLEVBQUU7WUFDTCxNQUFNLEVBQUUsYUFBYSxjQUFjLEVBQUU7WUFDckMsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxJQUFJO2FBQ1g7WUFDRCxRQUFRLEVBQUU7Z0JBQ1IsQ0FBQyxRQUFRLEVBQUUsRUFBRTtvQkFDWCxJQUFJLFNBQVMsSUFBSSxRQUFRLEVBQUU7d0JBQ3pCLFFBQVEsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsU0FBUyxDQUFDO3FCQUMvQztnQkFDSCxDQUFDO2FBQ0Y7WUFDRCxxQ0FBcUM7U0FDNEI7UUFDbkUsSUFBSTtRQUNKLElBQUksRUFBRSxNQUFNO1FBQ1osRUFBRSxFQUFFLEtBQUs7UUFDVCxNQUFNLEVBQUUsS0FBSztRQUNiLE1BQU0sRUFBRSxLQUFLO1FBQ2IsU0FBUyxFQUFFLEtBQUs7UUFDaEIsUUFBUSxFQUFFLFFBQVE7UUFDbEIsSUFBSTtRQUNKLEtBQUssRUFBRSxZQUFZLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUM7S0FDcEQsQ0FBQztJQUVGLE1BQU0sb0JBQW9CLEdBQ3hCLFVBQVUsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztRQUNwQyxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDaEQsQ0FBQyxDQUFDLFVBQVUsQ0FBQztJQUVqQixJQUFJLG9CQUFvQixFQUFFO1FBQ3hCLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDL0UsTUFBTSxtQkFBbUIsR0FBRyx5QkFBeUIsQ0FBQztRQUN0RCxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBQztRQUN6QyxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksUUFBUSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztRQUMvRSxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUM7UUFFaEYsU0FBUyxDQUFDLE1BQU0sR0FBRztZQUNqQixTQUFTO1lBQ1QsSUFBSTtZQUNKLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDO2dCQUNqQixRQUFRO2dCQUNSLFFBQVE7Z0JBQ1IsSUFBSTthQUNMLENBQUM7U0FDSCxDQUFDO1FBRUYsa0ZBQWtGO1FBQ2xGLDJFQUEyRTtRQUMzRSw2RkFBNkY7UUFDN0Ysc0ZBQXNGO1FBQ3RGLElBQUksV0FBVyxFQUFFO1lBQ2YsdUJBQXVCO1lBQ3ZCLG9FQUFvRTtZQUNwRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzVDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRztvQkFDdEIsSUFBQSw2Q0FBcUIsRUFBQyxtQkFBbUIsRUFBRTt3QkFDekMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUM7NEJBQ2pCLFFBQVEsRUFBRSxNQUFNOzRCQUNoQixRQUFRLEVBQUUsSUFBSTs0QkFDZCxJQUFJLEVBQUUsTUFBTTs0QkFDWixRQUFRLEVBQUUsSUFBSTt5QkFDZixDQUFDO3dCQUNGLEVBQUUsRUFBRSxJQUFJO3dCQUNSLFFBQVEsRUFBRSxRQUFRO3FCQUNuQixDQUFRO2lCQUNWLENBQUMsQ0FBQztTQUNOO0tBQ0Y7SUFFRCxJQUFJLFdBQVcsRUFBRTtRQUNmLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFO1lBQ3pCLFNBQVMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO1NBQzNCO2FBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQy9DLFNBQVMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDL0M7UUFFRCxTQUFTLENBQUMsVUFBVSxHQUFHO1lBQ3JCLEdBQUcsU0FBUyxDQUFDLFVBQVU7WUFDdkIsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUM7U0FDdEQsQ0FBQztLQUNIO0lBRUQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ2hELElBQUksS0FBSyxFQUFFO2dCQUNULE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNmO2lCQUFNO2dCQUNMLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUNiO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLEtBQWM7SUFDdkMsSUFBSSxLQUFLLFlBQVksS0FBSyxFQUFFO1FBQzFCLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQztLQUN0QjtJQUVELElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO1FBQzdCLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFFRCxPQUFPLEVBQUUsQ0FBQztBQUNaLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FDbkIsSUFBWSxFQUNaLE9BQW1DO0lBRW5DLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUN6QyxJQUFJLEdBQUcsSUFBSSxPQUFPLElBQUksTUFBTSxFQUFFO1FBQzVCLE9BQU87WUFDTCxHQUFHLEVBQUUsSUFBQSxjQUFXLEVBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztZQUM5QixJQUFJLEVBQUUsSUFBQSxjQUFXLEVBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQztTQUNqQyxDQUFDO0tBQ0g7SUFFRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxJQUFZLEVBQUUsV0FBbUI7SUFDdkQsTUFBTSxTQUFTLEdBQUcsSUFBQSxjQUFXLEVBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2pELElBQUksYUFBa0IsQ0FBQztJQUN2QixJQUFJO1FBQ0YsYUFBYSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNwQztJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ2QsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLFNBQVMsa0JBQWtCLENBQUMsQ0FBQztTQUNuRTtRQUVELE1BQU0sS0FBSyxDQUFDO0tBQ2I7SUFFRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDL0UsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDO0lBRTFCLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxFQUFFO1FBQzNCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2xELElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO2dCQUMzQixjQUFjLENBQUMsSUFBSSxDQUNqQixJQUFBLDZDQUFxQixFQUNuQixHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxFQUM5QyxPQUFjLENBQ2tCLENBQ25DLENBQUM7YUFDSDtpQkFBTTtnQkFDTCxjQUFjLENBQUMsSUFBSSxDQUNqQixJQUFBLDZDQUFxQixFQUFDLEdBQUcsRUFBRSxPQUFjLENBQWtDLENBQzVFLENBQUM7YUFDSDtTQUNGO0tBQ0Y7SUFFRCxPQUFPLGNBQWMsQ0FBQztBQUN4QixDQUFDO0FBRUQsa0JBQWUsSUFBQSx5QkFBYSxFQUE0QyxPQUFPLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBCdWlsZGVyQ29udGV4dCxcbiAgQnVpbGRlck91dHB1dCxcbiAgY3JlYXRlQnVpbGRlcixcbiAgdGFyZ2V0RnJvbVRhcmdldFN0cmluZyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBqc29uLCBsb2dnaW5nLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0ICogYXMgYnJvd3NlclN5bmMgZnJvbSAnYnJvd3Nlci1zeW5jJztcbmltcG9ydCB7IGNyZWF0ZVByb3h5TWlkZGxld2FyZSB9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5pbXBvcnQgeyBqb2luLCByZXNvbHZlIGFzIHBhdGhSZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBFTVBUWSwgT2JzZXJ2YWJsZSwgY29tYmluZUxhdGVzdCwgZnJvbSwgb2YsIHppcCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtcbiAgY2F0Y2hFcnJvcixcbiAgY29uY2F0TWFwLFxuICBkZWJvdW5jZSxcbiAgZGVib3VuY2VUaW1lLFxuICBkZWxheSxcbiAgZmluYWxpemUsXG4gIGlnbm9yZUVsZW1lbnRzLFxuICBtYXAsXG4gIG1hcFRvLFxuICBzdGFydFdpdGgsXG4gIHN3aXRjaE1hcCxcbiAgdGFwLFxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyB1cmwgZnJvbSAndXJsJztcbmltcG9ydCB7IFNjaGVtYSB9IGZyb20gJy4vc2NoZW1hJztcblxuaW1wb3J0IHsgZ2V0QXZhaWxhYmxlUG9ydCwgc3Bhd25Bc09ic2VydmFibGUsIHdhaXRVbnRpbFNlcnZlcklzTGlzdGVuaW5nIH0gZnJvbSAnLi91dGlscyc7XG5cbi8qKiBMb2cgbWVzc2FnZXMgdG8gaWdub3JlIGFuZCBub3QgcmVseSB0byB0aGUgbG9nZ2VyICovXG5jb25zdCBJR05PUkVEX1NURE9VVF9NRVNTQUdFUyA9IFtcbiAgJ3NlcnZlciBsaXN0ZW5pbmcgb24nLFxuICAnQW5ndWxhciBpcyBydW5uaW5nIGluIGRldmVsb3BtZW50IG1vZGUuIENhbGwgZW5hYmxlUHJvZE1vZGUoKSB0byBlbmFibGUgcHJvZHVjdGlvbiBtb2RlLicsXG5dO1xuXG5leHBvcnQgdHlwZSBTU1JEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyA9IFNjaGVtYSAmIGpzb24uSnNvbk9iamVjdDtcbmV4cG9ydCB0eXBlIFNTUkRldlNlcnZlckJ1aWxkZXJPdXRwdXQgPSBCdWlsZGVyT3V0cHV0ICYge1xuICBiYXNlVXJsPzogc3RyaW5nO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGV4ZWN1dGUoXG4gIG9wdGlvbnM6IFNTUkRldlNlcnZlckJ1aWxkZXJPcHRpb25zLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbik6IE9ic2VydmFibGU8U1NSRGV2U2VydmVyQnVpbGRlck91dHB1dD4ge1xuICBjb25zdCBicm93c2VyVGFyZ2V0ID0gdGFyZ2V0RnJvbVRhcmdldFN0cmluZyhvcHRpb25zLmJyb3dzZXJUYXJnZXQpO1xuICBjb25zdCBzZXJ2ZXJUYXJnZXQgPSB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nKG9wdGlvbnMuc2VydmVyVGFyZ2V0KTtcbiAgY29uc3QgZ2V0QmFzZVVybCA9IChiczogYnJvd3NlclN5bmMuQnJvd3NlclN5bmNJbnN0YW5jZSkgPT5cbiAgICBgJHticy5nZXRPcHRpb24oJ3NjaGVtZScpfTovLyR7YnMuZ2V0T3B0aW9uKCdob3N0Jyl9OiR7YnMuZ2V0T3B0aW9uKCdwb3J0Jyl9YDtcbiAgY29uc3QgYnJvd3NlclRhcmdldFJ1biA9IGNvbnRleHQuc2NoZWR1bGVUYXJnZXQoYnJvd3NlclRhcmdldCwge1xuICAgIHNlcnZpY2VXb3JrZXI6IGZhbHNlLFxuICAgIHdhdGNoOiB0cnVlLFxuICAgIHByb2dyZXNzOiBvcHRpb25zLnByb2dyZXNzLFxuICAgIC8vIERpc2FibGUgYnVuZGxlIGJ1ZGdldHMgYXJlIHRoZXNlIGFyZSBub3QgbWVhbnQgdG8gYmUgdXNlZCB3aXRoIGEgZGV2LXNlcnZlciBhcyB0aGlzIHdpbGwgYWRkIGV4dHJhIEphdmFTY3JpcHQgZm9yIGxpdmUtcmVsb2FkaW5nLlxuICAgIGJ1ZGdldHM6IFtdLFxuICB9KTtcblxuICBjb25zdCBzZXJ2ZXJUYXJnZXRSdW4gPSBjb250ZXh0LnNjaGVkdWxlVGFyZ2V0KHNlcnZlclRhcmdldCwge1xuICAgIHdhdGNoOiB0cnVlLFxuICAgIHByb2dyZXNzOiBvcHRpb25zLnByb2dyZXNzLFxuICB9KTtcblxuICBjb25zdCBic0luc3RhbmNlID0gYnJvd3NlclN5bmMuY3JlYXRlKCk7XG5cbiAgY29udGV4dC5sb2dnZXIuZXJyb3IodGFncy5zdHJpcEluZGVudHNgXG4gICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgVGhpcyBpcyBhIHNpbXBsZSBzZXJ2ZXIgZm9yIHVzZSBpbiB0ZXN0aW5nIG9yIGRlYnVnZ2luZyBBbmd1bGFyIGFwcGxpY2F0aW9ucyBsb2NhbGx5LlxuICBJdCBoYXNuJ3QgYmVlbiByZXZpZXdlZCBmb3Igc2VjdXJpdHkgaXNzdWVzLlxuXG4gIERPTidUIFVTRSBJVCBGT1IgUFJPRFVDVElPTiFcbiAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIGApO1xuXG4gIHJldHVybiB6aXAoYnJvd3NlclRhcmdldFJ1biwgc2VydmVyVGFyZ2V0UnVuLCBnZXRBdmFpbGFibGVQb3J0KCkpLnBpcGUoXG4gICAgc3dpdGNoTWFwKChbYnIsIHNyLCBub2RlU2VydmVyUG9ydF0pID0+IHtcbiAgICAgIHJldHVybiBjb21iaW5lTGF0ZXN0KFtici5vdXRwdXQsIHNyLm91dHB1dF0pLnBpcGUoXG4gICAgICAgIC8vIFRoaXMgaXMgbmVlZGVkIHNvIHRoYXQgaWYgYm90aCBzZXJ2ZXIgYW5kIGJyb3dzZXIgZW1pdCBjbG9zZSB0byBlYWNoIG90aGVyXG4gICAgICAgIC8vIHdlIG9ubHkgZW1pdCBvbmNlLiBUaGlzIHR5cGljYWxseSBoYXBwZW5zIG9uIHRoZSBmaXJzdCBidWlsZC5cbiAgICAgICAgZGVib3VuY2VUaW1lKDEyMCksXG4gICAgICAgIHN3aXRjaE1hcCgoW2IsIHNdKSA9PiB7XG4gICAgICAgICAgaWYgKCFzLnN1Y2Nlc3MgfHwgIWIuc3VjY2Vzcykge1xuICAgICAgICAgICAgcmV0dXJuIG9mKFtiLCBzXSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHN0YXJ0Tm9kZVNlcnZlcihzLCBub2RlU2VydmVyUG9ydCwgY29udGV4dC5sb2dnZXIsICEhb3B0aW9ucy5pbnNwZWN0KS5waXBlKFxuICAgICAgICAgICAgbWFwVG8oW2IsIHNdKSxcbiAgICAgICAgICAgIGNhdGNoRXJyb3IoKGVycikgPT4ge1xuICAgICAgICAgICAgICBjb250ZXh0LmxvZ2dlci5lcnJvcihgQSBzZXJ2ZXIgZXJyb3IgaGFzIG9jY3VycmVkLlxcbiR7bWFwRXJyb3JUb01lc3NhZ2UoZXJyKX1gKTtcblxuICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICApO1xuICAgICAgICB9KSxcbiAgICAgICAgbWFwKFxuICAgICAgICAgIChbYiwgc10pID0+XG4gICAgICAgICAgICBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBiLnN1Y2Nlc3MgJiYgcy5zdWNjZXNzLFxuICAgICAgICAgICAgICAgIGVycm9yOiBiLmVycm9yIHx8IHMuZXJyb3IsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG5vZGVTZXJ2ZXJQb3J0LFxuICAgICAgICAgICAgXSBhcyBbU1NSRGV2U2VydmVyQnVpbGRlck91dHB1dCwgbnVtYmVyXSxcbiAgICAgICAgKSxcbiAgICAgICAgdGFwKChbYnVpbGRlck91dHB1dF0pID0+IHtcbiAgICAgICAgICBpZiAoYnVpbGRlck91dHB1dC5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdcXG5Db21waWxlZCBzdWNjZXNzZnVsbHkuJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICAgICAgZGVib3VuY2UoKFtidWlsZGVyT3V0cHV0XSkgPT5cbiAgICAgICAgICBidWlsZGVyT3V0cHV0LnN1Y2Nlc3MgJiYgIW9wdGlvbnMuaW5zcGVjdFxuICAgICAgICAgICAgPyB3YWl0VW50aWxTZXJ2ZXJJc0xpc3RlbmluZyhub2RlU2VydmVyUG9ydClcbiAgICAgICAgICAgIDogRU1QVFksXG4gICAgICAgICksXG4gICAgICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICB2b2lkIGJyLnN0b3AoKTtcbiAgICAgICAgICB2b2lkIHNyLnN0b3AoKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH0pLFxuICAgIGNvbmNhdE1hcCgoW2J1aWxkZXJPdXRwdXQsIG5vZGVTZXJ2ZXJQb3J0XSkgPT4ge1xuICAgICAgaWYgKCFidWlsZGVyT3V0cHV0LnN1Y2Nlc3MpIHtcbiAgICAgICAgcmV0dXJuIG9mKGJ1aWxkZXJPdXRwdXQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYnNJbnN0YW5jZS5hY3RpdmUpIHtcbiAgICAgICAgYnNJbnN0YW5jZS5yZWxvYWQoKTtcblxuICAgICAgICByZXR1cm4gb2YoYnVpbGRlck91dHB1dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZnJvbShpbml0QnJvd3NlclN5bmMoYnNJbnN0YW5jZSwgbm9kZVNlcnZlclBvcnQsIG9wdGlvbnMsIGNvbnRleHQpKS5waXBlKFxuICAgICAgICAgIHRhcCgoYnMpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VVcmwgPSBnZXRCYXNlVXJsKGJzKTtcbiAgICAgICAgICAgIGNvbnRleHQubG9nZ2VyLmluZm8odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgICAgICoqXG4gICAgICAgICAgICAgICAgQW5ndWxhciBVbml2ZXJzYWwgTGl2ZSBEZXZlbG9wbWVudCBTZXJ2ZXIgaXMgbGlzdGVuaW5nIG9uICR7YmFzZVVybH0sXG4gICAgICAgICAgICAgICAgb3BlbiB5b3VyIGJyb3dzZXIgb24gJHtiYXNlVXJsfVxuICAgICAgICAgICAgICAgICoqXG4gICAgICAgICAgICAgIGApO1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1hcFRvKGJ1aWxkZXJPdXRwdXQpLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0pLFxuICAgIG1hcChcbiAgICAgIChidWlsZGVyT3V0cHV0KSA9PlxuICAgICAgICAoe1xuICAgICAgICAgIHN1Y2Nlc3M6IGJ1aWxkZXJPdXRwdXQuc3VjY2VzcyxcbiAgICAgICAgICBlcnJvcjogYnVpbGRlck91dHB1dC5lcnJvcixcbiAgICAgICAgICBiYXNlVXJsOiBic0luc3RhbmNlICYmIGdldEJhc2VVcmwoYnNJbnN0YW5jZSksXG4gICAgICAgIH0gYXMgU1NSRGV2U2VydmVyQnVpbGRlck91dHB1dCksXG4gICAgKSxcbiAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICBpZiAoYnNJbnN0YW5jZSkge1xuICAgICAgICBic0luc3RhbmNlLmV4aXQoKTtcbiAgICAgICAgYnNJbnN0YW5jZS5jbGVhbnVwKCk7XG4gICAgICB9XG4gICAgfSksXG4gICAgY2F0Y2hFcnJvcigoZXJyb3IpID0+XG4gICAgICBvZih7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBlcnJvcjogbWFwRXJyb3JUb01lc3NhZ2UoZXJyb3IpLFxuICAgICAgfSksXG4gICAgKSxcbiAgKTtcbn1cblxuZnVuY3Rpb24gc3RhcnROb2RlU2VydmVyKFxuICBzZXJ2ZXJPdXRwdXQ6IEJ1aWxkZXJPdXRwdXQsXG4gIHBvcnQ6IG51bWJlcixcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgaW5zcGVjdE1vZGUgPSBmYWxzZSxcbik6IE9ic2VydmFibGU8dm9pZD4ge1xuICBjb25zdCBvdXRwdXRQYXRoID0gc2VydmVyT3V0cHV0Lm91dHB1dFBhdGggYXMgc3RyaW5nO1xuICBjb25zdCBwYXRoID0gam9pbihvdXRwdXRQYXRoLCAnbWFpbi5qcycpO1xuICBjb25zdCBlbnYgPSB7IC4uLnByb2Nlc3MuZW52LCBQT1JUOiAnJyArIHBvcnQgfTtcblxuICBjb25zdCBhcmdzID0gWyctLWVuYWJsZS1zb3VyY2UtbWFwcycsIGBcIiR7cGF0aH1cImBdO1xuICBpZiAoaW5zcGVjdE1vZGUpIHtcbiAgICBhcmdzLnVuc2hpZnQoJy0taW5zcGVjdC1icmsnKTtcbiAgfVxuXG4gIHJldHVybiBvZihudWxsKS5waXBlKFxuICAgIGRlbGF5KDApLCAvLyBBdm9pZCBFQUREUklOVVNFIGVycm9yIHNpbmNlIGl0IHdpbGwgY2F1c2UgdGhlIGtpbGwgZXZlbnQgdG8gYmUgZmluaXNoLlxuICAgIHN3aXRjaE1hcCgoKSA9PiBzcGF3bkFzT2JzZXJ2YWJsZSgnbm9kZScsIGFyZ3MsIHsgZW52LCBzaGVsbDogdHJ1ZSB9KSksXG4gICAgdGFwKCh7IHN0ZGVyciwgc3Rkb3V0IH0pID0+IHtcbiAgICAgIGlmIChzdGRlcnIpIHtcbiAgICAgICAgLy8gU3RyaXAgdGhlIHdlYnBhY2sgc2NoZW1lICh3ZWJwYWNrOi8vKSBmcm9tIGVycm9yIGxvZy5cbiAgICAgICAgbG9nZ2VyLmVycm9yKHN0ZGVyci5yZXBsYWNlKC93ZWJwYWNrOlxcL1xcLy9nLCAnLicpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHN0ZG91dCAmJiAhSUdOT1JFRF9TVERPVVRfTUVTU0FHRVMuc29tZSgoeCkgPT4gc3Rkb3V0LmluY2x1ZGVzKHgpKSkge1xuICAgICAgICBsb2dnZXIuaW5mbyhzdGRvdXQpO1xuICAgICAgfVxuICAgIH0pLFxuICAgIGlnbm9yZUVsZW1lbnRzKCksXG4gICAgLy8gRW1pdCBhIHNpZ25hbCBhZnRlciB0aGUgcHJvY2VzcyBoYXMgYmVlbiBzdGFydGVkXG4gICAgc3RhcnRXaXRoKHVuZGVmaW5lZCksXG4gICk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRCcm93c2VyU3luYyhcbiAgYnJvd3NlclN5bmNJbnN0YW5jZTogYnJvd3NlclN5bmMuQnJvd3NlclN5bmNJbnN0YW5jZSxcbiAgbm9kZVNlcnZlclBvcnQ6IG51bWJlcixcbiAgb3B0aW9uczogU1NSRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuKTogUHJvbWlzZTxicm93c2VyU3luYy5Ccm93c2VyU3luY0luc3RhbmNlPiB7XG4gIGlmIChicm93c2VyU3luY0luc3RhbmNlLmFjdGl2ZSkge1xuICAgIHJldHVybiBicm93c2VyU3luY0luc3RhbmNlO1xuICB9XG5cbiAgY29uc3QgeyBwb3J0OiBicm93c2VyU3luY1BvcnQsIG9wZW4sIGhvc3QsIHB1YmxpY0hvc3QsIHByb3h5Q29uZmlnIH0gPSBvcHRpb25zO1xuICBjb25zdCBic1BvcnQgPSBicm93c2VyU3luY1BvcnQgfHwgKGF3YWl0IGdldEF2YWlsYWJsZVBvcnQoKSk7XG4gIGNvbnN0IGJzT3B0aW9uczogYnJvd3NlclN5bmMuT3B0aW9ucyA9IHtcbiAgICBwcm94eToge1xuICAgICAgdGFyZ2V0OiBgbG9jYWxob3N0OiR7bm9kZVNlcnZlclBvcnR9YCxcbiAgICAgIHByb3h5T3B0aW9uczoge1xuICAgICAgICB4ZndkOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHByb3h5UmVzOiBbXG4gICAgICAgIChwcm94eVJlcykgPT4ge1xuICAgICAgICAgIGlmICgnaGVhZGVycycgaW4gcHJveHlSZXMpIHtcbiAgICAgICAgICAgIHByb3h5UmVzLmhlYWRlcnNbJ2NhY2hlLWNvbnRyb2wnXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgLy8gcHJveHlPcHRpb25zIGlzIG5vdCBpbiB0aGUgdHlwaW5nc1xuICAgIH0gYXMgYnJvd3NlclN5bmMuUHJveHlPcHRpb25zICYgeyBwcm94eU9wdGlvbnM6IHsgeGZ3ZDogYm9vbGVhbiB9IH0sXG4gICAgaG9zdCxcbiAgICBwb3J0OiBic1BvcnQsXG4gICAgdWk6IGZhbHNlLFxuICAgIHNlcnZlcjogZmFsc2UsXG4gICAgbm90aWZ5OiBmYWxzZSxcbiAgICBnaG9zdE1vZGU6IGZhbHNlLFxuICAgIGxvZ0xldmVsOiAnc2lsZW50JyxcbiAgICBvcGVuLFxuICAgIGh0dHBzOiBnZXRTc2xDb25maWcoY29udGV4dC53b3Jrc3BhY2VSb290LCBvcHRpb25zKSxcbiAgfTtcblxuICBjb25zdCBwdWJsaWNIb3N0Tm9ybWFsaXplZCA9XG4gICAgcHVibGljSG9zdCAmJiBwdWJsaWNIb3N0LmVuZHNXaXRoKCcvJylcbiAgICAgID8gcHVibGljSG9zdC5zdWJzdHJpbmcoMCwgcHVibGljSG9zdC5sZW5ndGggLSAxKVxuICAgICAgOiBwdWJsaWNIb3N0O1xuXG4gIGlmIChwdWJsaWNIb3N0Tm9ybWFsaXplZCkge1xuICAgIGNvbnN0IHsgcHJvdG9jb2wsIGhvc3RuYW1lLCBwb3J0LCBwYXRobmFtZSB9ID0gdXJsLnBhcnNlKHB1YmxpY0hvc3ROb3JtYWxpemVkKTtcbiAgICBjb25zdCBkZWZhdWx0U29ja2V0SW9QYXRoID0gJy9icm93c2VyLXN5bmMvc29ja2V0LmlvJztcbiAgICBjb25zdCBkZWZhdWx0TmFtZXNwYWNlID0gJy9icm93c2VyLXN5bmMnO1xuICAgIGNvbnN0IGhhc1BhdGhuYW1lID0gISEocGF0aG5hbWUgJiYgcGF0aG5hbWUgIT09ICcvJyk7XG4gICAgY29uc3QgbmFtZXNwYWNlID0gaGFzUGF0aG5hbWUgPyBwYXRobmFtZSArIGRlZmF1bHROYW1lc3BhY2UgOiBkZWZhdWx0TmFtZXNwYWNlO1xuICAgIGNvbnN0IHBhdGggPSBoYXNQYXRobmFtZSA/IHBhdGhuYW1lICsgZGVmYXVsdFNvY2tldElvUGF0aCA6IGRlZmF1bHRTb2NrZXRJb1BhdGg7XG5cbiAgICBic09wdGlvbnMuc29ja2V0ID0ge1xuICAgICAgbmFtZXNwYWNlLFxuICAgICAgcGF0aCxcbiAgICAgIGRvbWFpbjogdXJsLmZvcm1hdCh7XG4gICAgICAgIHByb3RvY29sLFxuICAgICAgICBob3N0bmFtZSxcbiAgICAgICAgcG9ydCxcbiAgICAgIH0pLFxuICAgIH07XG5cbiAgICAvLyBXaGVuIGhhdmluZyBhIHBhdGhuYW1lIHdlIGFsc28gbmVlZCB0byBjcmVhdGUgYSByZXZlcnNlIHByb3h5IGJlY2F1c2Ugc29ja2V0LmlvXG4gICAgLy8gd2lsbCBiZSBsaXN0ZW5pbmcgb246ICdodHRwOi8vbG9jYWxob3N0OjQyMDAvc3NyL2Jyb3dzZXItc3luYy9zb2NrZXQuaW8nXG4gICAgLy8gSG93ZXZlciB1c2VycyB3aWxsIHR5cGljYWxseSBoYXZlIGEgcmV2ZXJzZSBwcm94eSB0aGF0IHdpbGwgcmVkaXJlY3QgYWxsIG1hdGNoaW5nIHJlcXVlc3RzXG4gICAgLy8gZXg6IGh0dHA6Ly90ZXN0aW5naG9zdC5jb20vc3NyIC0+IGh0dHA6Ly9sb2NhbGhvc3Q6NDIwMCB3aGljaCB3aWxsIHJlc3VsdCBpbiBhIDQwNC5cbiAgICBpZiAoaGFzUGF0aG5hbWUpIHtcbiAgICAgIC8vIFJlbW92ZSBsZWFkaW5nIHNsYXNoXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC1leHByZXNzaW9uc1xuICAgICAgKGJzT3B0aW9ucy5zY3JpcHRQYXRoID0gKHApID0+IHAuc3Vic3RyaW5nKDEpKSxcbiAgICAgICAgKGJzT3B0aW9ucy5taWRkbGV3YXJlID0gW1xuICAgICAgICAgIGNyZWF0ZVByb3h5TWlkZGxld2FyZShkZWZhdWx0U29ja2V0SW9QYXRoLCB7XG4gICAgICAgICAgICB0YXJnZXQ6IHVybC5mb3JtYXQoe1xuICAgICAgICAgICAgICBwcm90b2NvbDogJ2h0dHAnLFxuICAgICAgICAgICAgICBob3N0bmFtZTogaG9zdCxcbiAgICAgICAgICAgICAgcG9ydDogYnNQb3J0LFxuICAgICAgICAgICAgICBwYXRobmFtZTogcGF0aCxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgd3M6IHRydWUsXG4gICAgICAgICAgICBsb2dMZXZlbDogJ3NpbGVudCcsXG4gICAgICAgICAgfSkgYXMgYW55LFxuICAgICAgICBdKTtcbiAgICB9XG4gIH1cblxuICBpZiAocHJveHlDb25maWcpIHtcbiAgICBpZiAoIWJzT3B0aW9ucy5taWRkbGV3YXJlKSB7XG4gICAgICBic09wdGlvbnMubWlkZGxld2FyZSA9IFtdO1xuICAgIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkoYnNPcHRpb25zLm1pZGRsZXdhcmUpKSB7XG4gICAgICBic09wdGlvbnMubWlkZGxld2FyZSA9IFtic09wdGlvbnMubWlkZGxld2FyZV07XG4gICAgfVxuXG4gICAgYnNPcHRpb25zLm1pZGRsZXdhcmUgPSBbXG4gICAgICAuLi5ic09wdGlvbnMubWlkZGxld2FyZSxcbiAgICAgIC4uLmdldFByb3h5Q29uZmlnKGNvbnRleHQud29ya3NwYWNlUm9vdCwgcHJveHlDb25maWcpLFxuICAgIF07XG4gIH1cblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGJyb3dzZXJTeW5jSW5zdGFuY2UuaW5pdChic09wdGlvbnMsIChlcnJvciwgYnMpID0+IHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShicyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtYXBFcnJvclRvTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgcmV0dXJuIGVycm9yLm1lc3NhZ2U7XG4gIH1cblxuICBpZiAodHlwZW9mIGVycm9yID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBlcnJvcjtcbiAgfVxuXG4gIHJldHVybiAnJztcbn1cblxuZnVuY3Rpb24gZ2V0U3NsQ29uZmlnKFxuICByb290OiBzdHJpbmcsXG4gIG9wdGlvbnM6IFNTUkRldlNlcnZlckJ1aWxkZXJPcHRpb25zLFxuKTogYnJvd3NlclN5bmMuSHR0cHNPcHRpb25zIHwgdW5kZWZpbmVkIHwgYm9vbGVhbiB7XG4gIGNvbnN0IHsgc3NsLCBzc2xDZXJ0LCBzc2xLZXkgfSA9IG9wdGlvbnM7XG4gIGlmIChzc2wgJiYgc3NsQ2VydCAmJiBzc2xLZXkpIHtcbiAgICByZXR1cm4ge1xuICAgICAga2V5OiBwYXRoUmVzb2x2ZShyb290LCBzc2xLZXkpLFxuICAgICAgY2VydDogcGF0aFJlc29sdmUocm9vdCwgc3NsQ2VydCksXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBzc2w7XG59XG5cbmZ1bmN0aW9uIGdldFByb3h5Q29uZmlnKHJvb3Q6IHN0cmluZywgcHJveHlDb25maWc6IHN0cmluZyk6IGJyb3dzZXJTeW5jLk1pZGRsZXdhcmVIYW5kbGVyW10ge1xuICBjb25zdCBwcm94eVBhdGggPSBwYXRoUmVzb2x2ZShyb290LCBwcm94eUNvbmZpZyk7XG4gIGxldCBwcm94eVNldHRpbmdzOiBhbnk7XG4gIHRyeSB7XG4gICAgcHJveHlTZXR0aW5ncyA9IHJlcXVpcmUocHJveHlQYXRoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IuY29kZSA9PT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFByb3h5IGNvbmZpZyBmaWxlICR7cHJveHlQYXRofSBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG5cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGNvbnN0IHByb3hpZXMgPSBBcnJheS5pc0FycmF5KHByb3h5U2V0dGluZ3MpID8gcHJveHlTZXR0aW5ncyA6IFtwcm94eVNldHRpbmdzXTtcbiAgY29uc3QgY3JlYXRlZFByb3hpZXMgPSBbXTtcblxuICBmb3IgKGNvbnN0IHByb3h5IG9mIHByb3hpZXMpIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIGNvbnRleHRdIG9mIE9iamVjdC5lbnRyaWVzKHByb3h5KSkge1xuICAgICAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNyZWF0ZWRQcm94aWVzLnB1c2goXG4gICAgICAgICAgY3JlYXRlUHJveHlNaWRkbGV3YXJlKFxuICAgICAgICAgICAga2V5LnJlcGxhY2UoL15cXCokLywgJyoqJykucmVwbGFjZSgvXFwvXFwqJC8sICcnKSxcbiAgICAgICAgICAgIGNvbnRleHQgYXMgYW55LFxuICAgICAgICAgICkgYXMgYnJvd3NlclN5bmMuTWlkZGxld2FyZUhhbmRsZXIsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjcmVhdGVkUHJveGllcy5wdXNoKFxuICAgICAgICAgIGNyZWF0ZVByb3h5TWlkZGxld2FyZShrZXksIGNvbnRleHQgYXMgYW55KSBhcyBicm93c2VyU3luYy5NaWRkbGV3YXJlSGFuZGxlcixcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gY3JlYXRlZFByb3hpZXM7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNyZWF0ZUJ1aWxkZXI8U1NSRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsIEJ1aWxkZXJPdXRwdXQ+KGV4ZWN1dGUpO1xuIl19