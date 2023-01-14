"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const utility_1 = require("@schematics/angular/utility");
const json_file_1 = require("@schematics/angular/utility/json-file");
const ts = require("typescript");
const utils_1 = require("../utils");
const SERVE_SSR_TARGET_NAME = 'serve-ssr';
const PRERENDER_TARGET_NAME = 'prerender';
function addScriptsRule(options) {
    return async (host) => {
        const pkgPath = '/package.json';
        const buffer = host.read(pkgPath);
        if (buffer === null) {
            throw new schematics_1.SchematicsException('Could not find package.json');
        }
        const serverDist = await (0, utils_1.getOutputPath)(host, options.project, 'server');
        const pkg = JSON.parse(buffer.toString());
        pkg.scripts = {
            ...pkg.scripts,
            'dev:ssr': `ng run ${options.project}:${SERVE_SSR_TARGET_NAME}`,
            'serve:ssr': `node ${serverDist}/main.js`,
            'build:ssr': `ng build && ng run ${options.project}:server`,
            'prerender': `ng run ${options.project}:${PRERENDER_TARGET_NAME}`,
        };
        host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
    };
}
function updateWorkspaceConfigRule(options) {
    return () => {
        return (0, utility_1.updateWorkspace)((workspace) => {
            const projectName = options.project;
            const project = workspace.projects.get(projectName);
            if (!project) {
                return;
            }
            const serverTarget = project.targets.get('server');
            serverTarget.options.main = (0, core_1.join)((0, core_1.normalize)(project.root), (0, utils_1.stripTsExtension)(options.serverFileName) + '.ts');
            const serveSSRTarget = project.targets.get(SERVE_SSR_TARGET_NAME);
            if (serveSSRTarget) {
                return;
            }
            project.targets.add({
                name: SERVE_SSR_TARGET_NAME,
                builder: '@nguniversal/builders:ssr-dev-server',
                defaultConfiguration: 'development',
                options: {},
                configurations: {
                    development: {
                        browserTarget: `${projectName}:build:development`,
                        serverTarget: `${projectName}:server:development`,
                    },
                    production: {
                        browserTarget: `${projectName}:build:production`,
                        serverTarget: `${projectName}:server:production`,
                    },
                },
            });
            const prerenderTarget = project.targets.get(PRERENDER_TARGET_NAME);
            if (prerenderTarget) {
                return;
            }
            project.targets.add({
                name: PRERENDER_TARGET_NAME,
                builder: '@nguniversal/builders:prerender',
                defaultConfiguration: 'production',
                options: {
                    routes: ['/'],
                },
                configurations: {
                    production: {
                        browserTarget: `${projectName}:build:production`,
                        serverTarget: `${projectName}:server:production`,
                    },
                    development: {
                        browserTarget: `${projectName}:build:development`,
                        serverTarget: `${projectName}:server:development`,
                    },
                },
            });
        });
    };
}
function updateServerTsConfigRule(options) {
    return async (host) => {
        const project = await (0, utils_1.getProject)(host, options.project);
        const serverTarget = project.targets.get('server');
        if (!serverTarget || !serverTarget.options) {
            return;
        }
        const tsConfigPath = serverTarget.options.tsConfig;
        if (!tsConfigPath || typeof tsConfigPath !== 'string') {
            // No tsconfig path
            return;
        }
        const tsConfig = new json_file_1.JSONFile(host, tsConfigPath);
        const filesAstNode = tsConfig.get(['files']);
        const serverFilePath = (0, utils_1.stripTsExtension)(options.serverFileName) + '.ts';
        if (Array.isArray(filesAstNode) && !filesAstNode.some(({ text }) => text === serverFilePath)) {
            tsConfig.modify(['files'], [...filesAstNode, serverFilePath]);
        }
    };
}
function routingInitialNavigationRule(options) {
    return async (host) => {
        const project = await (0, utils_1.getProject)(host, options.project);
        const serverTarget = project.targets.get('server');
        if (!serverTarget || !serverTarget.options) {
            return;
        }
        const tsConfigPath = serverTarget.options.tsConfig;
        if (!tsConfigPath || typeof tsConfigPath !== 'string' || !host.exists(tsConfigPath)) {
            // No tsconfig path
            return;
        }
        const parseConfigHost = {
            useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
            readDirectory: ts.sys.readDirectory,
            fileExists: function (fileName) {
                return host.exists(fileName);
            },
            readFile: function (fileName) {
                return host.read(fileName).toString();
            },
        };
        const { config } = ts.readConfigFile(tsConfigPath, parseConfigHost.readFile);
        const parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, (0, core_1.dirname)((0, core_1.normalize)(tsConfigPath)));
        const tsHost = ts.createCompilerHost(parsed.options, true);
        // Strip BOM as otherwise TSC methods (Ex: getWidth) will return an offset,
        // which breaks the CLI UpdateRecorder.
        // See: https://github.com/angular/angular/pull/30719
        tsHost.readFile = function (fileName) {
            return host
                .read(fileName)
                .toString()
                .replace(/^\uFEFF/, '');
        };
        tsHost.directoryExists = function (directoryName) {
            // When the path is file getDir will throw.
            try {
                const dir = host.getDir(directoryName);
                return !!(dir.subdirs.length || dir.subfiles.length);
            }
            catch {
                return false;
            }
        };
        tsHost.fileExists = function (fileName) {
            return host.exists(fileName);
        };
        tsHost.realpath = function (path) {
            return path;
        };
        tsHost.getCurrentDirectory = function () {
            return host.root.path;
        };
        const program = ts.createProgram(parsed.fileNames, parsed.options, tsHost);
        const typeChecker = program.getTypeChecker();
        const sourceFiles = program
            .getSourceFiles()
            .filter((f) => !f.isDeclarationFile && !program.isSourceFileFromExternalLibrary(f));
        const printer = ts.createPrinter();
        const routerModule = 'RouterModule';
        const routerSource = '@angular/router';
        sourceFiles.forEach((sourceFile) => {
            const routerImport = (0, utils_1.findImport)(sourceFile, routerSource, routerModule);
            if (!routerImport) {
                return;
            }
            let routerModuleNode;
            ts.forEachChild(sourceFile, function visitNode(node) {
                if (ts.isCallExpression(node) &&
                    ts.isPropertyAccessExpression(node.expression) &&
                    ts.isIdentifier(node.expression.expression) &&
                    node.expression.name.text === 'forRoot') {
                    const imp = (0, utils_1.getImportOfIdentifier)(typeChecker, node.expression.expression);
                    if (imp && imp.name === routerModule && imp.importModule === routerSource) {
                        routerModuleNode = node;
                    }
                }
                ts.forEachChild(node, visitNode);
            });
            if (routerModuleNode) {
                const print = printer.printNode(ts.EmitHint.Unspecified, (0, utils_1.addInitialNavigation)(routerModuleNode), sourceFile);
                const recorder = host.beginUpdate(sourceFile.fileName);
                recorder.remove(routerModuleNode.getStart(), routerModuleNode.getWidth());
                recorder.insertRight(routerModuleNode.getStart(), print);
                host.commitUpdate(recorder);
            }
        });
    };
}
function addDependencies() {
    return (_host) => {
        return (0, schematics_1.chain)([
            (0, utility_1.addDependency)('@nguniversal/builders', '^15.1.0', {
                type: utility_1.DependencyType.Dev,
            }),
            (0, utility_1.addDependency)('@nguniversal/express-engine', '^15.1.0', {
                type: utility_1.DependencyType.Default,
            }),
            (0, utility_1.addDependency)('express', '^4.15.2', {
                type: utility_1.DependencyType.Default,
            }),
            (0, utility_1.addDependency)('@types/express', '^4.17.0', {
                type: utility_1.DependencyType.Dev,
            }),
        ]);
    };
}
function addServerFile(options) {
    return async (host) => {
        const project = await (0, utils_1.getProject)(host, options.project);
        const browserDistDirectory = await (0, utils_1.getOutputPath)(host, options.project, 'build');
        return (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files'), [
            (0, schematics_1.template)({
                ...core_1.strings,
                ...options,
                stripTsExtension: utils_1.stripTsExtension,
                browserDistDirectory,
            }),
            (0, schematics_1.move)(project.root),
        ]));
    };
}
function default_1(options) {
    return async (host) => {
        const project = await (0, utils_1.getProject)(host, options.project);
        const universalOptions = {
            ...options,
            skipInstall: true,
        };
        delete universalOptions.serverFileName;
        delete universalOptions.serverPort;
        return (0, schematics_1.chain)([
            project.targets.has('server')
                ? (0, schematics_1.noop)()
                : (0, schematics_1.externalSchematic)('@schematics/angular', 'universal', universalOptions),
            addScriptsRule(options),
            updateServerTsConfigRule(options),
            updateWorkspaceConfigRule(options),
            routingInitialNavigationRule(options),
            addServerFile(options),
            addDependencies(),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2V4cHJlc3MtZW5naW5lL3NjaGVtYXRpY3MvaW5zdGFsbC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILCtDQUF5RTtBQUN6RSwyREFZb0M7QUFFcEMseURBQTZGO0FBQzdGLHFFQUFpRTtBQUNqRSxpQ0FBaUM7QUFFakMsb0NBT2tCO0FBSWxCLE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDO0FBQzFDLE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDO0FBRTFDLFNBQVMsY0FBYyxDQUFDLE9BQTRCO0lBQ2xELE9BQU8sS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ3BCLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQztRQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtZQUNuQixNQUFNLElBQUksZ0NBQW1CLENBQUMsNkJBQTZCLENBQUMsQ0FBQztTQUM5RDtRQUVELE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBQSxxQkFBYSxFQUFDLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFRLENBQUM7UUFDakQsR0FBRyxDQUFDLE9BQU8sR0FBRztZQUNaLEdBQUcsR0FBRyxDQUFDLE9BQU87WUFDZCxTQUFTLEVBQUUsVUFBVSxPQUFPLENBQUMsT0FBTyxJQUFJLHFCQUFxQixFQUFFO1lBQy9ELFdBQVcsRUFBRSxRQUFRLFVBQVUsVUFBVTtZQUN6QyxXQUFXLEVBQUUsc0JBQXNCLE9BQU8sQ0FBQyxPQUFPLFNBQVM7WUFDM0QsV0FBVyxFQUFFLFVB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Q0FBQyxPQUFPLENBQUM7WUFDdkIsd0JBQXdCLENBQUMsT0FBTyxDQUFDO1lBQ2pDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQztZQUNsQyw0QkFBNEIsQ0FBQyxPQUFPLENBQUM7WUFDckMsYUFBYSxDQUFDLE9BQU8sQ0FBQztZQUN0QixlQUFlLEVBQUU7U0FDbEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXZCRCw0QkF1QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgZGlybmFtZSwgam9pbiwgbm9ybWFsaXplLCBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGNoYWluLFxuICBleHRlcm5hbFNjaGVtYXRpYyxcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBub29wLFxuICB0ZW1wbGF0ZSxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgVW5pdmVyc2FsT3B0aW9ucyB9IGZyb20gJ0BzY2hlbWF0aWNzL2FuZ3VsYXIvdW5pdmVyc2FsL3NjaGVtYSc7XG5pbXBvcnQgeyBEZXBlbmRlbmN5VHlwZSwgYWRkRGVwZW5kZW5jeSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnQHNjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5JztcbmltcG9ydCB7IEpTT05GaWxlIH0gZnJvbSAnQHNjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2pzb24tZmlsZSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtcbiAgYWRkSW5pdGlhbE5hdmlnYXRpb24sXG4gIGZpbmRJbXBvcnQsXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcixcbiAgZ2V0T3V0cHV0UGF0aCxcbiAgZ2V0UHJvamVjdCxcbiAgc3RyaXBUc0V4dGVuc2lvbixcbn0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQgeyBTY2hlbWEgYXMgQWRkVW5pdmVyc2FsT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuY29uc3QgU0VSVkVfU1NSX1RBUkdFVF9OQU1FID0gJ3NlcnZlLXNzcic7XG5jb25zdCBQUkVSRU5ERVJfVEFSR0VUX05BTUUgPSAncHJlcmVuZGVyJztcblxuZnVuY3Rpb24gYWRkU2NyaXB0c1J1bGUob3B0aW9uczogQWRkVW5pdmVyc2FsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3QpID0+IHtcbiAgICBjb25zdCBwa2dQYXRoID0gJy9wYWNrYWdlLmpzb24nO1xuICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZChwa2dQYXRoKTtcbiAgICBpZiAoYnVmZmVyID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgcGFja2FnZS5qc29uJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VydmVyRGlzdCA9IGF3YWl0IGdldE91dHB1dFBhdGgoaG9zdCwgb3B0aW9ucy5wcm9qZWN0LCAnc2VydmVyJyk7XG4gICAgY29uc3QgcGtnID0gSlNPTi5wYXJzZShidWZmZXIudG9TdHJpbmcoKSkgYXMgYW55O1xuICAgIHBrZy5zY3JpcHRzID0ge1xuICAgICAgLi4ucGtnLnNjcmlwdHMsXG4gICAgICAnZGV2OnNzcic6IGBuZyBydW4gJHtvcHRpb25zLnByb2plY3R9OiR7U0VSVkVfU1NSX1RBUkdFVF9OQU1FfWAsXG4gICAgICAnc2VydmU6c3NyJzogYG5vZGUgJHtzZXJ2ZXJEaXN0fS9tYWluLmpzYCxcbiAgICAgICdidWlsZDpzc3InOiBgbmcgYnVpbGQgJiYgbmcgcnVuICR7b3B0aW9ucy5wcm9qZWN0fTpzZXJ2ZXJgLFxuICAgICAgJ3ByZXJlbmRlcic6IGBuZyBydW4gJHtvcHRpb25zLnByb2plY3R9OiR7UFJFUkVOREVSX1RBUkdFVF9OQU1FfWAsXG4gICAgfTtcblxuICAgIGhvc3Qub3ZlcndyaXRlKHBrZ1BhdGgsIEpTT04uc3RyaW5naWZ5KHBrZywgbnVsbCwgMikpO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVXb3Jrc3BhY2VDb25maWdSdWxlKG9wdGlvbnM6IEFkZFVuaXZlcnNhbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuICgpID0+IHtcbiAgICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKCh3b3Jrc3BhY2UpID0+IHtcbiAgICAgIGNvbnN0IHByb2plY3ROYW1lID0gb3B0aW9ucy5wcm9qZWN0O1xuICAgICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdE5hbWUpO1xuICAgICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc2VydmVyVGFyZ2V0ID0gcHJvamVjdC50YXJnZXRzLmdldCgnc2VydmVyJyk7XG4gICAgICBzZXJ2ZXJUYXJnZXQub3B0aW9ucy5tYWluID0gam9pbihcbiAgICAgICAgbm9ybWFsaXplKHByb2plY3Qucm9vdCksXG4gICAgICAgIHN0cmlwVHNFeHRlbnNpb24ob3B0aW9ucy5zZXJ2ZXJGaWxlTmFtZSkgKyAnLnRzJyxcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IHNlcnZlU1NSVGFyZ2V0ID0gcHJvamVjdC50YXJnZXRzLmdldChTRVJWRV9TU1JfVEFSR0VUX05BTUUpO1xuICAgICAgaWYgKHNlcnZlU1NSVGFyZ2V0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcHJvamVjdC50YXJnZXRzLmFkZCh7XG4gICAgICAgIG5hbWU6IFNFUlZFX1NTUl9UQVJHRVRfTkFNRSxcbiAgICAgICAgYnVpbGRlcjogJ0BuZ3VuaXZlcnNhbC9idWlsZGVyczpzc3ItZGV2LXNlcnZlcicsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAnZGV2ZWxvcG1lbnQnLFxuICAgICAgICBvcHRpb25zOiB7fSxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICBkZXZlbG9wbWVudDoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7cHJvamVjdE5hbWV9OmJ1aWxkOmRldmVsb3BtZW50YCxcbiAgICAgICAgICAgIHNlcnZlclRhcmdldDogYCR7cHJvamVjdE5hbWV9OnNlcnZlcjpkZXZlbG9wbWVudGAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtwcm9qZWN0TmFtZX06YnVpbGQ6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgICBzZXJ2ZXJUYXJnZXQ6IGAke3Byb2plY3ROYW1lfTpzZXJ2ZXI6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwcmVyZW5kZXJUYXJnZXQgPSBwcm9qZWN0LnRhcmdldHMuZ2V0KFBSRVJFTkRFUl9UQVJHRVRfTkFNRSk7XG4gICAgICBpZiAocHJlcmVuZGVyVGFyZ2V0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcHJvamVjdC50YXJnZXRzLmFkZCh7XG4gICAgICAgIG5hbWU6IFBSRVJFTkRFUl9UQVJHRVRfTkFNRSxcbiAgICAgICAgYnVpbGRlcjogJ0BuZ3VuaXZlcnNhbC9idWlsZGVyczpwcmVyZW5kZXInLFxuICAgICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogJ3Byb2R1Y3Rpb24nLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgcm91dGVzOiBbJy8nXSxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtwcm9qZWN0TmFtZX06YnVpbGQ6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgICBzZXJ2ZXJUYXJnZXQ6IGAke3Byb2plY3ROYW1lfTpzZXJ2ZXI6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkZXZlbG9wbWVudDoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7cHJvamVjdE5hbWV9OmJ1aWxkOmRldmVsb3BtZW50YCxcbiAgICAgICAgICAgIHNlcnZlclRhcmdldDogYCR7cHJvamVjdE5hbWV9OnNlcnZlcjpkZXZlbG9wbWVudGAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTZXJ2ZXJUc0NvbmZpZ1J1bGUob3B0aW9uczogQWRkVW5pdmVyc2FsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3QpID0+IHtcbiAgICBjb25zdCBwcm9qZWN0ID0gYXdhaXQgZ2V0UHJvamVjdChob3N0LCBvcHRpb25zLnByb2plY3QpO1xuICAgIGNvbnN0IHNlcnZlclRhcmdldCA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ3NlcnZlcicpO1xuICAgIGlmICghc2VydmVyVGFyZ2V0IHx8ICFzZXJ2ZXJUYXJnZXQub3B0aW9ucykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRzQ29uZmlnUGF0aCA9IHNlcnZlclRhcmdldC5vcHRpb25zLnRzQ29uZmlnO1xuICAgIGlmICghdHNDb25maWdQYXRoIHx8IHR5cGVvZiB0c0NvbmZpZ1BhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBObyB0c2NvbmZpZyBwYXRoXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdHNDb25maWcgPSBuZXcgSlNPTkZpbGUoaG9zdCwgdHNDb25maWdQYXRoKTtcbiAgICBjb25zdCBmaWxlc0FzdE5vZGUgPSB0c0NvbmZpZy5nZXQoWydmaWxlcyddKTtcbiAgICBjb25zdCBzZXJ2ZXJGaWxlUGF0aCA9IHN0cmlwVHNFeHRlbnNpb24ob3B0aW9ucy5zZXJ2ZXJGaWxlTmFtZSkgKyAnLnRzJztcbiAgICBpZiAoQXJyYXkuaXNBcnJheShmaWxlc0FzdE5vZGUpICYmICFmaWxlc0FzdE5vZGUuc29tZSgoeyB0ZXh0IH0pID0+IHRleHQgPT09IHNlcnZlckZpbGVQYXRoKSkge1xuICAgICAgdHNDb25maWcubW9kaWZ5KFsnZmlsZXMnXSwgWy4uLmZpbGVzQXN0Tm9kZSwgc2VydmVyRmlsZVBhdGhdKTtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIHJvdXRpbmdJbml0aWFsTmF2aWdhdGlvblJ1bGUob3B0aW9uczogVW5pdmVyc2FsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3QpID0+IHtcbiAgICBjb25zdCBwcm9qZWN0ID0gYXdhaXQgZ2V0UHJvamVjdChob3N0LCBvcHRpb25zLnByb2plY3QpO1xuICAgIGNvbnN0IHNlcnZlclRhcmdldCA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ3NlcnZlcicpO1xuICAgIGlmICghc2VydmVyVGFyZ2V0IHx8ICFzZXJ2ZXJUYXJnZXQub3B0aW9ucykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRzQ29uZmlnUGF0aCA9IHNlcnZlclRhcmdldC5vcHRpb25zLnRzQ29uZmlnO1xuICAgIGlmICghdHNDb25maWdQYXRoIHx8IHR5cGVvZiB0c0NvbmZpZ1BhdGggIT09ICdzdHJpbmcnIHx8ICFob3N0LmV4aXN0cyh0c0NvbmZpZ1BhdGgpKSB7XG4gICAgICAvLyBObyB0c2NvbmZpZyBwYXRoXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGFyc2VDb25maWdIb3N0OiB0cy5QYXJzZUNvbmZpZ0hvc3QgPSB7XG4gICAgICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzOiB0cy5zeXMudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcyxcbiAgICAgIHJlYWREaXJlY3Rvcnk6IHRzLnN5cy5yZWFkRGlyZWN0b3J5LFxuICAgICAgZmlsZUV4aXN0czogZnVuY3Rpb24gKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGhvc3QuZXhpc3RzKGZpbGVOYW1lKTtcbiAgICAgIH0sXG4gICAgICByZWFkRmlsZTogZnVuY3Rpb24gKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gaG9zdC5yZWFkKGZpbGVOYW1lKS50b1N0cmluZygpO1xuICAgICAgfSxcbiAgICB9O1xuICAgIGNvbnN0IHsgY29uZmlnIH0gPSB0cy5yZWFkQ29uZmlnRmlsZSh0c0NvbmZpZ1BhdGgsIHBhcnNlQ29uZmlnSG9zdC5yZWFkRmlsZSk7XG4gICAgY29uc3QgcGFyc2VkID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoXG4gICAgICBjb25maWcsXG4gICAgICBwYXJzZUNvbmZpZ0hvc3QsXG4gICAgICBkaXJuYW1lKG5vcm1hbGl6ZSh0c0NvbmZpZ1BhdGgpKSxcbiAgICApO1xuICAgIGNvbnN0IHRzSG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChwYXJzZWQub3B0aW9ucywgdHJ1ZSk7XG4gICAgLy8gU3RyaXAgQk9NIGFzIG90aGVyd2lzZSBUU0MgbWV0aG9kcyAoRXg6IGdldFdpZHRoKSB3aWxsIHJldHVybiBhbiBvZmZzZXQsXG4gICAgLy8gd2hpY2ggYnJlYWtzIHRoZSBDTEkgVXBkYXRlUmVjb3JkZXIuXG4gICAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL3B1bGwvMzA3MTlcbiAgICB0c0hvc3QucmVhZEZpbGUgPSBmdW5jdGlvbiAoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICByZXR1cm4gaG9zdFxuICAgICAgICAucmVhZChmaWxlTmFtZSlcbiAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgLnJlcGxhY2UoL15cXHVGRUZGLywgJycpO1xuICAgIH07XG4gICAgdHNIb3N0LmRpcmVjdG9yeUV4aXN0cyA9IGZ1bmN0aW9uIChkaXJlY3RvcnlOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgIC8vIFdoZW4gdGhlIHBhdGggaXMgZmlsZSBnZXREaXIgd2lsbCB0aHJvdy5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGRpciA9IGhvc3QuZ2V0RGlyKGRpcmVjdG9yeU5hbWUpO1xuXG4gICAgICAgIHJldHVybiAhIShkaXIuc3ViZGlycy5sZW5ndGggfHwgZGlyLnN1YmZpbGVzLmxlbmd0aCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH07XG4gICAgdHNIb3N0LmZpbGVFeGlzdHMgPSBmdW5jdGlvbiAoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgcmV0dXJuIGhvc3QuZXhpc3RzKGZpbGVOYW1lKTtcbiAgICB9O1xuICAgIHRzSG9zdC5yZWFscGF0aCA9IGZ1bmN0aW9uIChwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgcmV0dXJuIHBhdGg7XG4gICAgfTtcbiAgICB0c0hvc3QuZ2V0Q3VycmVudERpcmVjdG9yeSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBob3N0LnJvb3QucGF0aDtcbiAgICB9O1xuXG4gICAgY29uc3QgcHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0ocGFyc2VkLmZpbGVOYW1lcywgcGFyc2VkLm9wdGlvbnMsIHRzSG9zdCk7XG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSBwcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gICAgY29uc3Qgc291cmNlRmlsZXMgPSBwcm9ncmFtXG4gICAgICAuZ2V0U291cmNlRmlsZXMoKVxuICAgICAgLmZpbHRlcigoZikgPT4gIWYuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIXByb2dyYW0uaXNTb3VyY2VGaWxlRnJvbUV4dGVybmFsTGlicmFyeShmKSk7XG4gICAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgICBjb25zdCByb3V0ZXJNb2R1bGUgPSAnUm91dGVyTW9kdWxlJztcbiAgICBjb25zdCByb3V0ZXJTb3VyY2UgPSAnQGFuZ3VsYXIvcm91dGVyJztcblxuICAgIHNvdXJjZUZpbGVzLmZvckVhY2goKHNvdXJjZUZpbGUpID0+IHtcbiAgICAgIGNvbnN0IHJvdXRlckltcG9ydCA9IGZpbmRJbXBvcnQoc291cmNlRmlsZSwgcm91dGVyU291cmNlLCByb3V0ZXJNb2R1bGUpO1xuICAgICAgaWYgKCFyb3V0ZXJJbXBvcnQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsZXQgcm91dGVyTW9kdWxlTm9kZTogdHMuQ2FsbEV4cHJlc3Npb247XG4gICAgICB0cy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgZnVuY3Rpb24gdmlzaXROb2RlKG5vZGU6IHRzLk5vZGUpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgJiZcbiAgICAgICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pICYmXG4gICAgICAgICAgdHMuaXNJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbi5leHByZXNzaW9uKSAmJlxuICAgICAgICAgIG5vZGUuZXhwcmVzc2lvbi5uYW1lLnRleHQgPT09ICdmb3JSb290J1xuICAgICAgICApIHtcbiAgICAgICAgICBjb25zdCBpbXAgPSBnZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZUNoZWNrZXIsIG5vZGUuZXhwcmVzc2lvbi5leHByZXNzaW9uKTtcblxuICAgICAgICAgIGlmIChpbXAgJiYgaW1wLm5hbWUgPT09IHJvdXRlck1vZHVsZSAmJiBpbXAuaW1wb3J0TW9kdWxlID09PSByb3V0ZXJTb3VyY2UpIHtcbiAgICAgICAgICAgIHJvdXRlck1vZHVsZU5vZGUgPSBub2RlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRzLmZvckVhY2hDaGlsZChub2RlLCB2aXNpdE5vZGUpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChyb3V0ZXJNb2R1bGVOb2RlKSB7XG4gICAgICAgIGNvbnN0IHByaW50ID0gcHJpbnRlci5wcmludE5vZGUoXG4gICAgICAgICAgdHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsXG4gICAgICAgICAgYWRkSW5pdGlhbE5hdmlnYXRpb24ocm91dGVyTW9kdWxlTm9kZSksXG4gICAgICAgICAgc291cmNlRmlsZSxcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUoc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgICAgIHJlY29yZGVyLnJlbW92ZShyb3V0ZXJNb2R1bGVOb2RlLmdldFN0YXJ0KCksIHJvdXRlck1vZHVsZU5vZGUuZ2V0V2lkdGgoKSk7XG4gICAgICAgIHJlY29yZGVyLmluc2VydFJpZ2h0KHJvdXRlck1vZHVsZU5vZGUuZ2V0U3RhcnQoKSwgcHJpbnQpO1xuICAgICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llcygpOiBSdWxlIHtcbiAgcmV0dXJuIChfaG9zdDogVHJlZSkgPT4ge1xuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBhZGREZXBlbmRlbmN5KCdAbmd1bml2ZXJzYWwvYnVpbGRlcnMnLCAnXjAuMC4wLVBMQUNFSE9MREVSJywge1xuICAgICAgICB0eXBlOiBEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICB9KSxcbiAgICAgIGFkZERlcGVuZGVuY3koJ0BuZ3VuaXZlcnNhbC9leHByZXNzLWVuZ2luZScsICdeMC4wLjAtUExBQ0VIT0xERVInLCB7XG4gICAgICAgIHR5cGU6IERlcGVuZGVuY3lUeXBlLkRlZmF1bHQsXG4gICAgICB9KSxcbiAgICAgIGFkZERlcGVuZGVuY3koJ2V4cHJlc3MnLCAnRVhQUkVTU19WRVJTSU9OJywge1xuICAgICAgICB0eXBlOiBEZXBlbmRlbmN5VHlwZS5EZWZhdWx0LFxuICAgICAgfSksXG4gICAgICBhZGREZXBlbmRlbmN5KCdAdHlwZXMvZXhwcmVzcycsICdFWFBSRVNTX1RZUEVTX1ZFUlNJT04nLCB7XG4gICAgICAgIHR5cGU6IERlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgIH0pLFxuICAgIF0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRTZXJ2ZXJGaWxlKG9wdGlvbnM6IFVuaXZlcnNhbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0KSA9PiB7XG4gICAgY29uc3QgcHJvamVjdCA9IGF3YWl0IGdldFByb2plY3QoaG9zdCwgb3B0aW9ucy5wcm9qZWN0KTtcbiAgICBjb25zdCBicm93c2VyRGlzdERpcmVjdG9yeSA9IGF3YWl0IGdldE91dHB1dFBhdGgoaG9zdCwgb3B0aW9ucy5wcm9qZWN0LCAnYnVpbGQnKTtcblxuICAgIHJldHVybiBtZXJnZVdpdGgoXG4gICAgICBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgICB0ZW1wbGF0ZSh7XG4gICAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgIHN0cmlwVHNFeHRlbnNpb24sXG4gICAgICAgICAgYnJvd3NlckRpc3REaXJlY3RvcnksXG4gICAgICAgIH0pLFxuICAgICAgICBtb3ZlKHByb2plY3Qucm9vdCksXG4gICAgICBdKSxcbiAgICApO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogQWRkVW5pdmVyc2FsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3QpID0+IHtcbiAgICBjb25zdCBwcm9qZWN0ID0gYXdhaXQgZ2V0UHJvamVjdChob3N0LCBvcHRpb25zLnByb2plY3QpO1xuICAgIGNvbnN0IHVuaXZlcnNhbE9wdGlvbnMgPSB7XG4gICAgICAuLi5vcHRpb25zLFxuICAgICAgc2tpcEluc3RhbGw6IHRydWUsXG4gICAgfTtcblxuICAgIGRlbGV0ZSB1bml2ZXJzYWxPcHRpb25zLnNlcnZlckZpbGVOYW1lO1xuICAgIGRlbGV0ZSB1bml2ZXJzYWxPcHRpb25zLnNlcnZlclBvcnQ7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgcHJvamVjdC50YXJnZXRzLmhhcygnc2VydmVyJylcbiAgICAgICAgPyBub29wKClcbiAgICAgICAgOiBleHRlcm5hbFNjaGVtYXRpYygnQHNjaGVtYXRpY3MvYW5ndWxhcicsICd1bml2ZXJzYWwnLCB1bml2ZXJzYWxPcHRpb25zKSxcbiAgICAgIGFkZFNjcmlwdHNSdWxlKG9wdGlvbnMpLFxuICAgICAgdXBkYXRlU2VydmVyVHNDb25maWdSdWxlKG9wdGlvbnMpLFxuICAgICAgdXBkYXRlV29ya3NwYWNlQ29uZmlnUnVsZShvcHRpb25zKSxcbiAgICAgIHJvdXRpbmdJbml0aWFsTmF2aWdhdGlvblJ1bGUob3B0aW9ucyksXG4gICAgICBhZGRTZXJ2ZXJGaWxlKG9wdGlvbnMpLFxuICAgICAgYWRkRGVwZW5kZW5jaWVzKCksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=