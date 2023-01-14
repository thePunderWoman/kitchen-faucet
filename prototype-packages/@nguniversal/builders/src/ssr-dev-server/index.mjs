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
import { tags } from '@angular-devkit/core';
import * as browserSync from 'browser-sync';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { join, resolve as pathResolve } from 'path';
import { EMPTY, combineLatest, from, of, zip } from 'rxjs';
import { catchError, concatMap, debounce, debounceTime, delay, finalize, ignoreElements, map, mapTo, startWith, switchMap, tap, } from 'rxjs/operators';
import * as url from 'url';
import { getAvailablePort, spawnAsObservable, waitUntilServerIsListening } from './utils';
/** Log messages to ignore and not rely to the logger */
const IGNORED_STDOUT_MESSAGES = [
    'server listening on',
    'Angular is running in development mode. Call enableProdMode() to enable production mode.',
];
export function execute(options, context) {
    const browserTarget = targetFromTargetString(options.browserTarget);
    const serverTarget = targetFromTargetString(options.serverTarget);
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
    context.logger.error(tags.stripIndents `
  ****************************************************************************************
  This is a simple server for use in testing or debugging Angular applications locally.
  It hasn't been reviewed for security issues.

  DON'T USE IT FOR PRODUCTION!
  ****************************************************************************************
 `);
    return zip(browserTargetRun, serverTargetRun, getAvailablePort()).pipe(switchMap(([br, sr, nodeServerPort]) => {
        return combineLatest([br.output, sr.output]).pipe(
        // This is needed so that if both server and browser emit close to each other
        // we only emit once. This typically happens on the first build.
        debounceTime(120), switchMap(([b, s]) => {
            if (!s.success || !b.success) {
                return of([b, s]);
            }
            return startNodeServer(s, nodeServerPort, context.logger, !!options.inspect).pipe(mapTo([b, s]), catchError((err) => {
                context.logger.error(`A server error has occurred.\n${mapErrorToMessage(err)}`);
                return EMPTY;
            }));
        }), map(([b, s]) => [
            {
                success: b.success && s.success,
                error: b.error || s.error,
            },
            nodeServerPort,
        ]), tap(([builderOutput]) => {
            if (builderOutput.success) {
                context.logger.info('\nCompiled successfully.');
            }
        }), debounce(([builderOutput]) => builderOutput.success && !options.inspect
            ? waitUntilServerIsListening(nodeServerPort)
            : EMPTY), finalize(() => {
            void br.stop();
            void sr.stop();
        }));
    }), concatMap(([builderOutput, nodeServerPort]) => {
        if (!builderOutput.success) {
            return of(builderOutput);
        }
        if (bsInstance.active) {
            bsInstance.reload();
            return of(builderOutput);
        }
        else {
            return from(initBrowserSync(bsInstance, nodeServerPort, options, context)).pipe(tap((bs) => {
                const baseUrl = getBaseUrl(bs);
                context.logger.info(tags.oneLine `
                **
                Angular Universal Live Development Server is listening on ${baseUrl},
                open your browser on ${baseUrl}
                **
              `);
            }), mapTo(builderOutput));
        }
    }), map((builderOutput) => ({
        success: builderOutput.success,
        error: builderOutput.error,
        baseUrl: bsInstance && getBaseUrl(bsInstance),
    })), finalize(() => {
        if (bsInstance) {
            bsInstance.exit();
            bsInstance.cleanup();
        }
    }), catchError((error) => of({
        success: false,
        error: mapErrorToMessage(error),
    })));
}
function startNodeServer(serverOutput, port, logger, inspectMode = false) {
    const outputPath = serverOutput.outputPath;
    const path = join(outputPath, 'main.js');
    const env = Object.assign(Object.assign({}, process.env), { PORT: '' + port });
    const args = ['--enable-source-maps', `"${path}"`];
    if (inspectMode) {
        args.unshift('--inspect-brk');
    }
    return of(null).pipe(delay(0), // Avoid EADDRINUSE error since it will cause the kill event to be finish.
    switchMap(() => spawnAsObservable('node', args, { env, shell: true })), tap(({ stderr, stdout }) => {
        if (stderr) {
            // Strip the webpack scheme (webpack://) from error log.
            logger.error(stderr.replace(/webpack:\/\//g, '.'));
        }
        if (stdout && !IGNORED_STDOUT_MESSAGES.some((x) => stdout.includes(x))) {
            logger.info(stdout);
        }
    }), ignoreElements(), 
    // Emit a signal after the process has been started
    startWith(undefined));
}
function initBrowserSync(browserSyncInstance, nodeServerPort, options, context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (browserSyncInstance.active) {
            return browserSyncInstance;
        }
        const { port: browserSyncPort, open, host, publicHost, proxyConfig } = options;
        const bsPort = browserSyncPort || (yield getAvailablePort());
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
                        createProxyMiddleware(defaultSocketIoPath, {
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
            key: pathResolve(root, sslKey),
            cert: pathResolve(root, sslCert),
        };
    }
    return ssl;
}
function getProxyConfig(root, proxyConfig) {
    const proxyPath = pathResolve(root, proxyConfig);
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
                createdProxies.push(createProxyMiddleware(key.replace(/^\*$/, '**').replace(/\/\*$/, ''), context));
            }
            else {
                createdProxies.push(createProxyMiddleware(key, context));
            }
        }
    }
    return createdProxies;
}
export default createBuilder(execute);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2J1aWxkZXJzL3NyYy9zc3ItZGV2LXNlcnZlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxPQUFPLEVBR0wsYUFBYSxFQUNiLHNCQUFzQixHQUN2QixNQUFNLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sRUFBaUIsSUFBSSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDM0QsT0FBTyxLQUFLLFdBQVcsTUFBTSxjQUFjLENBQUM7QUFDNUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLElBQUksV0FBVyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQWMsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3ZFLE9BQU8sRUFDTCxVQUFVLEVBQ1YsU0FBUyxFQUNULFFBQVEsRUFDUixZQUFZLEVBQ1osS0FBSyxFQUNMLFFBQVEsRUFDUixjQUFjLEVBQ2QsR0FBRyxFQUNILEtBQUssRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULEdBQUcsR0FDSixNQUFNLGdCQUFnQixDQUFDO0FBQ3hCLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDO0FBRzNCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUUxRix3REFBd0Q7QUFDeEQsTUFBTSx1QkFBdUIsR0FBRztJQUM5QixxQkFBcUI7SUFDckIsMEZBQTBGO0NBQzNGLENBQUM7QUFPRixNQUFNLFVBQVUsT0FBTyxDQUNyQixPQUFtQyxFQUNuQyxPQUF1QjtJQUV2QixNQUFNLGFBQWEsR0FBRyxzQkFBc0IsQ0FB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eXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIEJ1aWxkZXJDb250ZXh0LFxuICBCdWlsZGVyT3V0cHV0LFxuICBjcmVhdGVCdWlsZGVyLFxuICB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IGpzb24sIGxvZ2dpbmcsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgKiBhcyBicm93c2VyU3luYyBmcm9tICdicm93c2VyLXN5bmMnO1xuaW1wb3J0IHsgY3JlYXRlUHJveHlNaWRkbGV3YXJlIH0gZnJvbSAnaHR0cC1wcm94eS1taWRkbGV3YXJlJztcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgYXMgcGF0aFJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IEVNUFRZLCBPYnNlcnZhYmxlLCBjb21iaW5lTGF0ZXN0LCBmcm9tLCBvZiwgemlwIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge1xuICBjYXRjaEVycm9yLFxuICBjb25jYXRNYXAsXG4gIGRlYm91bmNlLFxuICBkZWJvdW5jZVRpbWUsXG4gIGRlbGF5LFxuICBmaW5hbGl6ZSxcbiAgaWdub3JlRWxlbWVudHMsXG4gIG1hcCxcbiAgbWFwVG8sXG4gIHN0YXJ0V2l0aCxcbiAgc3dpdGNoTWFwLFxuICB0YXAsXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHsgU2NoZW1hIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5pbXBvcnQgeyBnZXRBdmFpbGFibGVQb3J0LCBzcGF3bkFzT2JzZXJ2YWJsZSwgd2FpdFVudGlsU2VydmVySXNMaXN0ZW5pbmcgfSBmcm9tICcuL3V0aWxzJztcblxuLyoqIExvZyBtZXNzYWdlcyB0byBpZ25vcmUgYW5kIG5vdCByZWx5IHRvIHRoZSBsb2dnZXIgKi9cbmNvbnN0IElHTk9SRURfU1RET1VUX01FU1NBR0VTID0gW1xuICAnc2VydmVyIGxpc3RlbmluZyBvbicsXG4gICdBbmd1bGFyIGlzIHJ1bm5pbmcgaW4gZGV2ZWxvcG1lbnQgbW9kZS4gQ2FsbCBlbmFibGVQcm9kTW9kZSgpIHRvIGVuYWJsZSBwcm9kdWN0aW9uIG1vZGUuJyxcbl07XG5cbmV4cG9ydCB0eXBlIFNTUkRldlNlcnZlckJ1aWxkZXJPcHRpb25zID0gU2NoZW1hICYganNvbi5Kc29uT2JqZWN0O1xuZXhwb3J0IHR5cGUgU1NSRGV2U2VydmVyQnVpbGRlck91dHB1dCA9IEJ1aWxkZXJPdXRwdXQgJiB7XG4gIGJhc2VVcmw/OiBzdHJpbmc7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZXhlY3V0ZShcbiAgb3B0aW9uczogU1NSRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuKTogT2JzZXJ2YWJsZTxTU1JEZXZTZXJ2ZXJCdWlsZGVyT3V0cHV0PiB7XG4gIGNvbnN0IGJyb3dzZXJUYXJnZXQgPSB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nKG9wdGlvbnMuYnJvd3NlclRhcmdldCk7XG4gIGNvbnN0IHNlcnZlclRhcmdldCA9IHRhcmdldEZyb21UYXJnZXRTdHJpbmcob3B0aW9ucy5zZXJ2ZXJUYXJnZXQpO1xuICBjb25zdCBnZXRCYXNlVXJsID0gKGJzOiBicm93c2VyU3luYy5Ccm93c2VyU3luY0luc3RhbmNlKSA9PlxuICAgIGAke2JzLmdldE9wdGlvbignc2NoZW1lJyl9Oi8vJHticy5nZXRPcHRpb24oJ2hvc3QnKX06JHticy5nZXRPcHRpb24oJ3BvcnQnKX1gO1xuICBjb25zdCBicm93c2VyVGFyZ2V0UnVuID0gY29udGV4dC5zY2hlZHVsZVRhcmdldChicm93c2VyVGFyZ2V0LCB7XG4gICAgc2VydmljZVdvcmtlcjogZmFsc2UsXG4gICAgd2F0Y2g6IHRydWUsXG4gICAgcHJvZ3Jlc3M6IG9wdGlvbnMucHJvZ3Jlc3MsXG4gICAgLy8gRGlzYWJsZSBidW5kbGUgYnVkZ2V0cyBhcmUgdGhlc2UgYXJlIG5vdCBtZWFudCB0byBiZSB1c2VkIHdpdGggYSBkZXYtc2VydmVyIGFzIHRoaXMgd2lsbCBhZGQgZXh0cmEgSmF2YVNjcmlwdCBmb3IgbGl2ZS1yZWxvYWRpbmcuXG4gICAgYnVkZ2V0czogW10sXG4gIH0pO1xuXG4gIGNvbnN0IHNlcnZlclRhcmdldFJ1biA9IGNvbnRleHQuc2NoZWR1bGVUYXJnZXQoc2VydmVyVGFyZ2V0LCB7XG4gICAgd2F0Y2g6IHRydWUsXG4gICAgcHJvZ3Jlc3M6IG9wdGlvbnMucHJvZ3Jlc3MsXG4gIH0pO1xuXG4gIGNvbnN0IGJzSW5zdGFuY2UgPSBicm93c2VyU3luYy5jcmVhdGUoKTtcblxuICBjb250ZXh0LmxvZ2dlci5lcnJvcih0YWdzLnN0cmlwSW5kZW50c2BcbiAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICBUaGlzIGlzIGEgc2ltcGxlIHNlcnZlciBmb3IgdXNlIGluIHRlc3Rpbmcgb3IgZGVidWdnaW5nIEFuZ3VsYXIgYXBwbGljYXRpb25zIGxvY2FsbHkuXG4gIEl0IGhhc24ndCBiZWVuIHJldmlld2VkIGZvciBzZWN1cml0eSBpc3N1ZXMuXG5cbiAgRE9OJ1QgVVNFIElUIEZPUiBQUk9EVUNUSU9OIVxuICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gYCk7XG5cbiAgcmV0dXJuIHppcChicm93c2VyVGFyZ2V0UnVuLCBzZXJ2ZXJUYXJnZXRSdW4sIGdldEF2YWlsYWJsZVBvcnQoKSkucGlwZShcbiAgICBzd2l0Y2hNYXAoKFticiwgc3IsIG5vZGVTZXJ2ZXJQb3J0XSkgPT4ge1xuICAgICAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW2JyLm91dHB1dCwgc3Iub3V0cHV0XSkucGlwZShcbiAgICAgICAgLy8gVGhpcyBpcyBuZWVkZWQgc28gdGhhdCBpZiBib3RoIHNlcnZlciBhbmQgYnJvd3NlciBlbWl0IGNsb3NlIHRvIGVhY2ggb3RoZXJcbiAgICAgICAgLy8gd2Ugb25seSBlbWl0IG9uY2UuIFRoaXMgdHlwaWNhbGx5IGhhcHBlbnMgb24gdGhlIGZpcnN0IGJ1aWxkLlxuICAgICAgICBkZWJvdW5jZVRpbWUoMTIwKSxcbiAgICAgICAgc3dpdGNoTWFwKChbYiwgc10pID0+IHtcbiAgICAgICAgICBpZiAoIXMuc3VjY2VzcyB8fCAhYi5zdWNjZXNzKSB7XG4gICAgICAgICAgICByZXR1cm4gb2YoW2IsIHNdKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gc3RhcnROb2RlU2VydmVyKHMsIG5vZGVTZXJ2ZXJQb3J0LCBjb250ZXh0LmxvZ2dlciwgISFvcHRpb25zLmluc3BlY3QpLnBpcGUoXG4gICAgICAgICAgICBtYXBUbyhbYiwgc10pLFxuICAgICAgICAgICAgY2F0Y2hFcnJvcigoZXJyKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnRleHQubG9nZ2VyLmVycm9yKGBBIHNlcnZlciBlcnJvciBoYXMgb2NjdXJyZWQuXFxuJHttYXBFcnJvclRvTWVzc2FnZShlcnIpfWApO1xuXG4gICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICk7XG4gICAgICAgIH0pLFxuICAgICAgICBtYXAoXG4gICAgICAgICAgKFtiLCBzXSkgPT5cbiAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGIuc3VjY2VzcyAmJiBzLnN1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGIuZXJyb3IgfHwgcy5lcnJvcixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbm9kZVNlcnZlclBvcnQsXG4gICAgICAgICAgICBdIGFzIFtTU1JEZXZTZXJ2ZXJCdWlsZGVyT3V0cHV0LCBudW1iZXJdLFxuICAgICAgICApLFxuICAgICAgICB0YXAoKFtidWlsZGVyT3V0cHV0XSkgPT4ge1xuICAgICAgICAgIGlmIChidWlsZGVyT3V0cHV0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIGNvbnRleHQubG9nZ2VyLmluZm8oJ1xcbkNvbXBpbGVkIHN1Y2Nlc3NmdWxseS4nKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICBkZWJvdW5jZSgoW2J1aWxkZXJPdXRwdXRdKSA9PlxuICAgICAgICAgIGJ1aWxkZXJPdXRwdXQuc3VjY2VzcyAmJiAhb3B0aW9ucy5pbnNwZWN0XG4gICAgICAgICAgICA/IHdhaXRVbnRpbFNlcnZlcklzTGlzdGVuaW5nKG5vZGVTZXJ2ZXJQb3J0KVxuICAgICAgICAgICAgOiBFTVBUWSxcbiAgICAgICAgKSxcbiAgICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgIHZvaWQgYnIuc3RvcCgpO1xuICAgICAgICAgIHZvaWQgc3Iuc3RvcCgpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfSksXG4gICAgY29uY2F0TWFwKChbYnVpbGRlck91dHB1dCwgbm9kZVNlcnZlclBvcnRdKSA9PiB7XG4gICAgICBpZiAoIWJ1aWxkZXJPdXRwdXQuc3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gb2YoYnVpbGRlck91dHB1dCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChic0luc3RhbmNlLmFjdGl2ZSkge1xuICAgICAgICBic0luc3RhbmNlLnJlbG9hZCgpO1xuXG4gICAgICAgIHJldHVybiBvZihidWlsZGVyT3V0cHV0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmcm9tKGluaXRCcm93c2VyU3luYyhic0luc3RhbmNlLCBub2RlU2VydmVyUG9ydCwgb3B0aW9ucywgY29udGV4dCkpLnBpcGUoXG4gICAgICAgICAgdGFwKChicykgPT4ge1xuICAgICAgICAgICAgY29uc3QgYmFzZVVybCA9IGdldEJhc2VVcmwoYnMpO1xuICAgICAgICAgICAgY29udGV4dC5sb2dnZXIuaW5mbyh0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICAgICAgKipcbiAgICAgICAgICAgICAgICBBbmd1bGFyIFVuaXZlcnNhbCBMaXZlIERldmVsb3BtZW50IFNlcnZlciBpcyBsaXN0ZW5pbmcgb24gJHtiYXNlVXJsfSxcbiAgICAgICAgICAgICAgICBvcGVuIHlvdXIgYnJvd3NlciBvbiAke2Jhc2VVcmx9XG4gICAgICAgICAgICAgICAgKipcbiAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgbWFwVG8oYnVpbGRlck91dHB1dCksXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSksXG4gICAgbWFwKFxuICAgICAgKGJ1aWxkZXJPdXRwdXQpID0+XG4gICAgICAgICh7XG4gICAgICAgICAgc3VjY2VzczogYnVpbGRlck91dHB1dC5zdWNjZXNzLFxuICAgICAgICAgIGVycm9yOiBidWlsZGVyT3V0cHV0LmVycm9yLFxuICAgICAgICAgIGJhc2VVcmw6IGJzSW5zdGFuY2UgJiYgZ2V0QmFzZVVybChic0luc3RhbmNlKSxcbiAgICAgICAgfSBhcyBTU1JEZXZTZXJ2ZXJCdWlsZGVyT3V0cHV0KSxcbiAgICApLFxuICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgIGlmIChic0luc3RhbmNlKSB7XG4gICAgICAgIGJzSW5zdGFuY2UuZXhpdCgpO1xuICAgICAgICBic0luc3RhbmNlLmNsZWFudXAoKTtcbiAgICAgIH1cbiAgICB9KSxcbiAgICBjYXRjaEVycm9yKChlcnJvcikgPT5cbiAgICAgIG9mKHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBtYXBFcnJvclRvTWVzc2FnZShlcnJvciksXG4gICAgICB9KSxcbiAgICApLFxuICApO1xufVxuXG5mdW5jdGlvbiBzdGFydE5vZGVTZXJ2ZXIoXG4gIHNlcnZlck91dHB1dDogQnVpbGRlck91dHB1dCxcbiAgcG9ydDogbnVtYmVyLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuICBpbnNwZWN0TW9kZSA9IGZhbHNlLFxuKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gIGNvbnN0IG91dHB1dFBhdGggPSBzZXJ2ZXJPdXRwdXQub3V0cHV0UGF0aCBhcyBzdHJpbmc7XG4gIGNvbnN0IHBhdGggPSBqb2luKG91dHB1dFBhdGgsICdtYWluLmpzJyk7XG4gIGNvbnN0IGVudiA9IHsgLi4ucHJvY2Vzcy5lbnYsIFBPUlQ6ICcnICsgcG9ydCB9O1xuXG4gIGNvbnN0IGFyZ3MgPSBbJy0tZW5hYmxlLXNvdXJjZS1tYXBzJywgYFwiJHtwYXRofVwiYF07XG4gIGlmIChpbnNwZWN0TW9kZSkge1xuICAgIGFyZ3MudW5zaGlmdCgnLS1pbnNwZWN0LWJyaycpO1xuICB9XG5cbiAgcmV0dXJuIG9mKG51bGwpLnBpcGUoXG4gICAgZGVsYXkoMCksIC8vIEF2b2lkIEVBRERSSU5VU0UgZXJyb3Igc2luY2UgaXQgd2lsbCBjYXVzZSB0aGUga2lsbCBldmVudCB0byBiZSBmaW5pc2guXG4gICAgc3dpdGNoTWFwKCgpID0+IHNwYXduQXNPYnNlcnZhYmxlKCdub2RlJywgYXJncywgeyBlbnYsIHNoZWxsOiB0cnVlIH0pKSxcbiAgICB0YXAoKHsgc3RkZXJyLCBzdGRvdXQgfSkgPT4ge1xuICAgICAgaWYgKHN0ZGVycikge1xuICAgICAgICAvLyBTdHJpcCB0aGUgd2VicGFjayBzY2hlbWUgKHdlYnBhY2s6Ly8pIGZyb20gZXJyb3IgbG9nLlxuICAgICAgICBsb2dnZXIuZXJyb3Ioc3RkZXJyLnJlcGxhY2UoL3dlYnBhY2s6XFwvXFwvL2csICcuJykpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3Rkb3V0ICYmICFJR05PUkVEX1NURE9VVF9NRVNTQUdFUy5zb21lKCh4KSA9PiBzdGRvdXQuaW5jbHVkZXMoeCkpKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKHN0ZG91dCk7XG4gICAgICB9XG4gICAgfSksXG4gICAgaWdub3JlRWxlbWVudHMoKSxcbiAgICAvLyBFbWl0IGEgc2lnbmFsIGFmdGVyIHRoZSBwcm9jZXNzIGhhcyBiZWVuIHN0YXJ0ZWRcbiAgICBzdGFydFdpdGgodW5kZWZpbmVkKSxcbiAgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5pdEJyb3dzZXJTeW5jKFxuICBicm93c2VyU3luY0luc3RhbmNlOiBicm93c2VyU3luYy5Ccm93c2VyU3luY0luc3RhbmNlLFxuICBub2RlU2VydmVyUG9ydDogbnVtYmVyLFxuICBvcHRpb25zOiBTU1JEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyxcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4pOiBQcm9taXNlPGJyb3dzZXJTeW5jLkJyb3dzZXJTeW5jSW5zdGFuY2U+IHtcbiAgaWYgKGJyb3dzZXJTeW5jSW5zdGFuY2UuYWN0aXZlKSB7XG4gICAgcmV0dXJuIGJyb3dzZXJTeW5jSW5zdGFuY2U7XG4gIH1cblxuICBjb25zdCB7IHBvcnQ6IGJyb3dzZXJTeW5jUG9ydCwgb3BlbiwgaG9zdCwgcHVibGljSG9zdCwgcHJveHlDb25maWcgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGJzUG9ydCA9IGJyb3dzZXJTeW5jUG9ydCB8fCAoYXdhaXQgZ2V0QXZhaWxhYmxlUG9ydCgpKTtcbiAgY29uc3QgYnNPcHRpb25zOiBicm93c2VyU3luYy5PcHRpb25zID0ge1xuICAgIHByb3h5OiB7XG4gICAgICB0YXJnZXQ6IGBsb2NhbGhvc3Q6JHtub2RlU2VydmVyUG9ydH1gLFxuICAgICAgcHJveHlPcHRpb25zOiB7XG4gICAgICAgIHhmd2Q6IHRydWUsXG4gICAgICB9LFxuICAgICAgcHJveHlSZXM6IFtcbiAgICAgICAgKHByb3h5UmVzKSA9PiB7XG4gICAgICAgICAgaWYgKCdoZWFkZXJzJyBpbiBwcm94eVJlcykge1xuICAgICAgICAgICAgcHJveHlSZXMuaGVhZGVyc1snY2FjaGUtY29udHJvbCddID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICAvLyBwcm94eU9wdGlvbnMgaXMgbm90IGluIHRoZSB0eXBpbmdzXG4gICAgfSBhcyBicm93c2VyU3luYy5Qcm94eU9wdGlvbnMgJiB7IHByb3h5T3B0aW9uczogeyB4ZndkOiBib29sZWFuIH0gfSxcbiAgICBob3N0LFxuICAgIHBvcnQ6IGJzUG9ydCxcbiAgICB1aTogZmFsc2UsXG4gICAgc2VydmVyOiBmYWxzZSxcbiAgICBub3RpZnk6IGZhbHNlLFxuICAgIGdob3N0TW9kZTogZmFsc2UsXG4gICAgbG9nTGV2ZWw6ICdzaWxlbnQnLFxuICAgIG9wZW4sXG4gICAgaHR0cHM6IGdldFNzbENvbmZpZyhjb250ZXh0LndvcmtzcGFjZVJvb3QsIG9wdGlvbnMpLFxuICB9O1xuXG4gIGNvbnN0IHB1YmxpY0hvc3ROb3JtYWxpemVkID1cbiAgICBwdWJsaWNIb3N0ICYmIHB1YmxpY0hvc3QuZW5kc1dpdGgoJy8nKVxuICAgICAgPyBwdWJsaWNIb3N0LnN1YnN0cmluZygwLCBwdWJsaWNIb3N0Lmxlbmd0aCAtIDEpXG4gICAgICA6IHB1YmxpY0hvc3Q7XG5cbiAgaWYgKHB1YmxpY0hvc3ROb3JtYWxpemVkKSB7XG4gICAgY29uc3QgeyBwcm90b2NvbCwgaG9zdG5hbWUsIHBvcnQsIHBhdGhuYW1lIH0gPSB1cmwucGFyc2UocHVibGljSG9zdE5vcm1hbGl6ZWQpO1xuICAgIGNvbnN0IGRlZmF1bHRTb2NrZXRJb1BhdGggPSAnL2Jyb3dzZXItc3luYy9zb2NrZXQuaW8nO1xuICAgIGNvbnN0IGRlZmF1bHROYW1lc3BhY2UgPSAnL2Jyb3dzZXItc3luYyc7XG4gICAgY29uc3QgaGFzUGF0aG5hbWUgPSAhIShwYXRobmFtZSAmJiBwYXRobmFtZSAhPT0gJy8nKTtcbiAgICBjb25zdCBuYW1lc3BhY2UgPSBoYXNQYXRobmFtZSA/IHBhdGhuYW1lICsgZGVmYXVsdE5hbWVzcGFjZSA6IGRlZmF1bHROYW1lc3BhY2U7XG4gICAgY29uc3QgcGF0aCA9IGhhc1BhdGhuYW1lID8gcGF0aG5hbWUgKyBkZWZhdWx0U29ja2V0SW9QYXRoIDogZGVmYXVsdFNvY2tldElvUGF0aDtcblxuICAgIGJzT3B0aW9ucy5zb2NrZXQgPSB7XG4gICAgICBuYW1lc3BhY2UsXG4gICAgICBwYXRoLFxuICAgICAgZG9tYWluOiB1cmwuZm9ybWF0KHtcbiAgICAgICAgcHJvdG9jb2wsXG4gICAgICAgIGhvc3RuYW1lLFxuICAgICAgICBwb3J0LFxuICAgICAgfSksXG4gICAgfTtcblxuICAgIC8vIFdoZW4gaGF2aW5nIGEgcGF0aG5hbWUgd2UgYWxzbyBuZWVkIHRvIGNyZWF0ZSBhIHJldmVyc2UgcHJveHkgYmVjYXVzZSBzb2NrZXQuaW9cbiAgICAvLyB3aWxsIGJlIGxpc3RlbmluZyBvbjogJ2h0dHA6Ly9sb2NhbGhvc3Q6NDIwMC9zc3IvYnJvd3Nlci1zeW5jL3NvY2tldC5pbydcbiAgICAvLyBIb3dldmVyIHVzZXJzIHdpbGwgdHlwaWNhbGx5IGhhdmUgYSByZXZlcnNlIHByb3h5IHRoYXQgd2lsbCByZWRpcmVjdCBhbGwgbWF0Y2hpbmcgcmVxdWVzdHNcbiAgICAvLyBleDogaHR0cDovL3Rlc3Rpbmdob3N0LmNvbS9zc3IgLT4gaHR0cDovL2xvY2FsaG9zdDo0MjAwIHdoaWNoIHdpbGwgcmVzdWx0IGluIGEgNDA0LlxuICAgIGlmIChoYXNQYXRobmFtZSkge1xuICAgICAgLy8gUmVtb3ZlIGxlYWRpbmcgc2xhc2hcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLWV4cHJlc3Npb25zXG4gICAgICAoYnNPcHRpb25zLnNjcmlwdFBhdGggPSAocCkgPT4gcC5zdWJzdHJpbmcoMSkpLFxuICAgICAgICAoYnNPcHRpb25zLm1pZGRsZXdhcmUgPSBbXG4gICAgICAgICAgY3JlYXRlUHJveHlNaWRkbGV3YXJlKGRlZmF1bHRTb2NrZXRJb1BhdGgsIHtcbiAgICAgICAgICAgIHRhcmdldDogdXJsLmZvcm1hdCh7XG4gICAgICAgICAgICAgIHByb3RvY29sOiAnaHR0cCcsXG4gICAgICAgICAgICAgIGhvc3RuYW1lOiBob3N0LFxuICAgICAgICAgICAgICBwb3J0OiBic1BvcnQsXG4gICAgICAgICAgICAgIHBhdGhuYW1lOiBwYXRoLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICB3czogdHJ1ZSxcbiAgICAgICAgICAgIGxvZ0xldmVsOiAnc2lsZW50JyxcbiAgICAgICAgICB9KSBhcyBhbnksXG4gICAgICAgIF0pO1xuICAgIH1cbiAgfVxuXG4gIGlmIChwcm94eUNvbmZpZykge1xuICAgIGlmICghYnNPcHRpb25zLm1pZGRsZXdhcmUpIHtcbiAgICAgIGJzT3B0aW9ucy5taWRkbGV3YXJlID0gW107XG4gICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShic09wdGlvbnMubWlkZGxld2FyZSkpIHtcbiAgICAgIGJzT3B0aW9ucy5taWRkbGV3YXJlID0gW2JzT3B0aW9ucy5taWRkbGV3YXJlXTtcbiAgICB9XG5cbiAgICBic09wdGlvbnMubWlkZGxld2FyZSA9IFtcbiAgICAgIC4uLmJzT3B0aW9ucy5taWRkbGV3YXJlLFxuICAgICAgLi4uZ2V0UHJveHlDb25maWcoY29udGV4dC53b3Jrc3BhY2VSb290LCBwcm94eUNvbmZpZyksXG4gICAgXTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgYnJvd3NlclN5bmNJbnN0YW5jZS5pbml0KGJzT3B0aW9ucywgKGVycm9yLCBicykgPT4ge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKGJzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1hcEVycm9yVG9NZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICByZXR1cm4gZXJyb3IubWVzc2FnZTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgZXJyb3IgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGVycm9yO1xuICB9XG5cbiAgcmV0dXJuICcnO1xufVxuXG5mdW5jdGlvbiBnZXRTc2xDb25maWcoXG4gIHJvb3Q6IHN0cmluZyxcbiAgb3B0aW9uczogU1NSRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsXG4pOiBicm93c2VyU3luYy5IdHRwc09wdGlvbnMgfCB1bmRlZmluZWQgfCBib29sZWFuIHtcbiAgY29uc3QgeyBzc2wsIHNzbENlcnQsIHNzbEtleSB9ID0gb3B0aW9ucztcbiAgaWYgKHNzbCAmJiBzc2xDZXJ0ICYmIHNzbEtleSkge1xuICAgIHJldHVybiB7XG4gICAgICBrZXk6IHBhdGhSZXNvbHZlKHJvb3QsIHNzbEtleSksXG4gICAgICBjZXJ0OiBwYXRoUmVzb2x2ZShyb290LCBzc2xDZXJ0KSxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHNzbDtcbn1cblxuZnVuY3Rpb24gZ2V0UHJveHlDb25maWcocm9vdDogc3RyaW5nLCBwcm94eUNvbmZpZzogc3RyaW5nKTogYnJvd3NlclN5bmMuTWlkZGxld2FyZUhhbmRsZXJbXSB7XG4gIGNvbnN0IHByb3h5UGF0aCA9IHBhdGhSZXNvbHZlKHJvb3QsIHByb3h5Q29uZmlnKTtcbiAgbGV0IHByb3h5U2V0dGluZ3M6IGFueTtcbiAgdHJ5IHtcbiAgICBwcm94eVNldHRpbmdzID0gcmVxdWlyZShwcm94eVBhdGgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvci5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUHJveHkgY29uZmlnIGZpbGUgJHtwcm94eVBhdGh9IGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cblxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgY29uc3QgcHJveGllcyA9IEFycmF5LmlzQXJyYXkocHJveHlTZXR0aW5ncykgPyBwcm94eVNldHRpbmdzIDogW3Byb3h5U2V0dGluZ3NdO1xuICBjb25zdCBjcmVhdGVkUHJveGllcyA9IFtdO1xuXG4gIGZvciAoY29uc3QgcHJveHkgb2YgcHJveGllcykge1xuICAgIGZvciAoY29uc3QgW2tleSwgY29udGV4dF0gb2YgT2JqZWN0LmVudHJpZXMocHJveHkpKSB7XG4gICAgICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY3JlYXRlZFByb3hpZXMucHVzaChcbiAgICAgICAgICBjcmVhdGVQcm94eU1pZGRsZXdhcmUoXG4gICAgICAgICAgICBrZXkucmVwbGFjZSgvXlxcKiQvLCAnKionKS5yZXBsYWNlKC9cXC9cXCokLywgJycpLFxuICAgICAgICAgICAgY29udGV4dCBhcyBhbnksXG4gICAgICAgICAgKSBhcyBicm93c2VyU3luYy5NaWRkbGV3YXJlSGFuZGxlcixcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNyZWF0ZWRQcm94aWVzLnB1c2goXG4gICAgICAgICAgY3JlYXRlUHJveHlNaWRkbGV3YXJlKGtleSwgY29udGV4dCBhcyBhbnkpIGFzIGJyb3dzZXJTeW5jLk1pZGRsZXdhcmVIYW5kbGVyLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjcmVhdGVkUHJveGllcztcbn1cblxuZXhwb3J0IGRlZmF1bHQgY3JlYXRlQnVpbGRlcjxTU1JEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgQnVpbGRlck91dHB1dD4oZXhlY3V0ZSk7XG4iXX0=