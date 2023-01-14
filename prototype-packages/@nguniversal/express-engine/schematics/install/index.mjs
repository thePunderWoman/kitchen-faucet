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
import { dirname, join, normalize, strings } from '@angular-devkit/core';
import { SchematicsException, apply, chain, externalSchematic, mergeWith, move, noop, template, url, } from '@angular-devkit/schematics';
import { DependencyType, addDependency, updateWorkspace } from '@schematics/angular/utility';
import { JSONFile } from '@schematics/angular/utility/json-file';
import * as ts from 'typescript';
import { addInitialNavigation, findImport, getImportOfIdentifier, getOutputPath, getProject, stripTsExtension, } from '../utils';
const SERVE_SSR_TARGET_NAME = 'serve-ssr';
const PRERENDER_TARGET_NAME = 'prerender';
function addScriptsRule(options) {
    return (host) => __awaiter(this, void 0, void 0, function* () {
        const pkgPath = '/package.json';
        const buffer = host.read(pkgPath);
        if (buffer === null) {
            throw new SchematicsException('Could not find package.json');
        }
        const serverDist = yield getOutputPath(host, options.project, 'server');
        const pkg = JSON.parse(buffer.toString());
        pkg.scripts = Object.assign(Object.assign({}, pkg.scripts), { 'dev:ssr': `ng run ${options.project}:${SERVE_SSR_TARGET_NAME}`, 'serve:ssr': `node ${serverDist}/main.js`, 'build:ssr': `ng build && ng run ${options.project}:server`, 'prerender': `ng run ${options.project}:${PRERENDER_TARGET_NAME}` });
        host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
    });
}
function updateWorkspaceConfigRule(options) {
    return () => {
        return updateWorkspace((workspace) => {
            const projectName = options.project;
            const project = workspace.projects.get(projectName);
            if (!project) {
                return;
            }
            const serverTarget = project.targets.get('server');
            serverTarget.options.main = join(normalize(project.root), stripTsExtension(options.serverFileName) + '.ts');
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
    return (host) => __awaiter(this, void 0, void 0, function* () {
        const project = yield getProject(host, options.project);
        const serverTarget = project.targets.get('server');
        if (!serverTarget || !serverTarget.options) {
            return;
        }
        const tsConfigPath = serverTarget.options.tsConfig;
        if (!tsConfigPath || typeof tsConfigPath !== 'string') {
            // No tsconfig path
            return;
        }
        const tsConfig = new JSONFile(host, tsConfigPath);
        const filesAstNode = tsConfig.get(['files']);
        const serverFilePath = stripTsExtension(options.serverFileName) + '.ts';
        if (Array.isArray(filesAstNode) && !filesAstNode.some(({ text }) => text === serverFilePath)) {
            tsConfig.modify(['files'], [...filesAstNode, serverFilePath]);
        }
    });
}
function routingInitialNavigationRule(options) {
    return (host) => __awaiter(this, void 0, void 0, function* () {
        const project = yield getProject(host, options.project);
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
        const parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, dirname(normalize(tsConfigPath)));
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
            catch (_a) {
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
            const routerImport = findImport(sourceFile, routerSource, routerModule);
            if (!routerImport) {
                return;
            }
            let routerModuleNode;
            ts.forEachChild(sourceFile, function visitNode(node) {
                if (ts.isCallExpression(node) &&
                    ts.isPropertyAccessExpression(node.expression) &&
                    ts.isIdentifier(node.expression.expression) &&
                    node.expression.name.text === 'forRoot') {
                    const imp = getImportOfIdentifier(typeChecker, node.expression.expression);
                    if (imp && imp.name === routerModule && imp.importModule === routerSource) {
                        routerModuleNode = node;
                    }
                }
                ts.forEachChild(node, visitNode);
            });
            if (routerModuleNode) {
                const print = printer.printNode(ts.EmitHint.Unspecified, addInitialNavigation(routerModuleNode), sourceFile);
                const recorder = host.beginUpdate(sourceFile.fileName);
                recorder.remove(routerModuleNode.getStart(), routerModuleNode.getWidth());
                recorder.insertRight(routerModuleNode.getStart(), print);
                host.commitUpdate(recorder);
            }
        });
    });
}
function addDependencies() {
    return (_host) => {
        return chain([
            addDependency('@nguniversal/builders', '^15.1.0', {
                type: DependencyType.Dev,
            }),
            addDependency('@nguniversal/express-engine', '^15.1.0', {
                type: DependencyType.Default,
            }),
            addDependency('express', '^4.15.2', {
                type: DependencyType.Default,
            }),
            addDependency('@types/express', '^4.17.0', {
                type: DependencyType.Dev,
            }),
        ]);
    };
}
function addServerFile(options) {
    return (host) => __awaiter(this, void 0, void 0, function* () {
        const project = yield getProject(host, options.project);
        const browserDistDirectory = yield getOutputPath(host, options.project, 'build');
        return mergeWith(apply(url('./files'), [
            template(Object.assign(Object.assign(Object.assign({}, strings), options), { stripTsExtension,
                browserDistDirectory })),
            move(project.root),
        ]));
    });
}
export default function (options) {
    return (host) => __awaiter(this, void 0, void 0, function* () {
        const project = yield getProject(host, options.project);
        const universalOptions = Object.assign(Object.assign({}, options), { skipInstall: true });
        delete universalOptions.serverFileName;
        delete universalOptions.serverPort;
        return chain([
            project.targets.has('server')
                ? noop()
                : externalSchematic('@schematics/angular', 'universal', universalOptions),
            addScriptsRule(options),
            updateServerTsConfigRule(options),
            updateWorkspaceConfigRule(options),
            routingInitialNavigationRule(options),
            addServerFile(options),
            addDependencies(),
        ]);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2V4cHJlc3MtZW5naW5lL3NjaGVtYXRpY3MvaW5zdGFsbC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDekUsT0FBTyxFQUVMLG1CQUFtQixFQUVuQixLQUFLLEVBQ0wsS0FBSyxFQUNMLGlCQUFpQixFQUNqQixTQUFTLEVBQ1QsSUFBSSxFQUNKLElBQUksRUFDSixRQUFRLEVBQ1IsR0FBRyxHQUNKLE1BQU0sNEJBQTRCLENBQUM7QUFFcEMsT0FBTyxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRWpDLE9BQU8sRUFDTCxvQkFBb0IsRUFDcEIsVUFBVSxFQUNWLHFCQUFxQixFQUNyQixhQUFhLEVBQ2IsVUFBVSxFQUNWLGdCQUFnQixHQUNqQixNQUFNLFVBQVUsQ0FBQztBQUlsQixNQUFNLHFCQUFxQixHQUFHLFdBQVcsQ0FBQztBQUMxQyxNQUFNLHFCQUFxQixHQUFHLFdBQVcsQ0FBQztBQUUxQyxTQUFTLGNBQWMsQ0FBQyxPQUE0QjtJQUNsRCxPQUFPLENBQU8sSUFBSSxFQUFFLEVBQUU7UUFDcEIsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEMsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO1lBQ25CLE1BQU0sSUFBSSxtQkFBbUIsQ0FBQyw2QkFBNkIs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LEtBQUssQ0FBQztZQUNYLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQztnQkFDM0IsQ0FBQyxDQUFDLElBQUksRUFBRTtnQkFDUixDQUFDLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixDQUFDO1lBQzNFLGNBQWMsQ0FBQyxPQUFPLENBQUM7WUFDdkIsd0JBQXdCLENBQUMsT0FBTyxDQUFDO1lBQ2pDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQztZQUNsQyw0QkFBNEIsQ0FBQyxPQUFPLENBQUM7WUFDckMsYUFBYSxDQUFDLE9BQU8sQ0FBQztZQUN0QixlQUFlLEVBQUU7U0FDbEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFBLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4sIG5vcm1hbGl6ZSwgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBjaGFpbixcbiAgZXh0ZXJuYWxTY2hlbWF0aWMsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgdGVtcGxhdGUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFVuaXZlcnNhbE9wdGlvbnMgfSBmcm9tICdAc2NoZW1hdGljcy9hbmd1bGFyL3VuaXZlcnNhbC9zY2hlbWEnO1xuaW1wb3J0IHsgRGVwZW5kZW5jeVR5cGUsIGFkZERlcGVuZGVuY3ksIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJ0BzY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eSc7XG5pbXBvcnQgeyBKU09ORmlsZSB9IGZyb20gJ0BzY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eS9qc29uLWZpbGUnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7XG4gIGFkZEluaXRpYWxOYXZpZ2F0aW9uLFxuICBmaW5kSW1wb3J0LFxuICBnZXRJbXBvcnRPZklkZW50aWZpZXIsXG4gIGdldE91dHB1dFBhdGgsXG4gIGdldFByb2plY3QsXG4gIHN0cmlwVHNFeHRlbnNpb24sXG59IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHsgU2NoZW1hIGFzIEFkZFVuaXZlcnNhbE9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmNvbnN0IFNFUlZFX1NTUl9UQVJHRVRfTkFNRSA9ICdzZXJ2ZS1zc3InO1xuY29uc3QgUFJFUkVOREVSX1RBUkdFVF9OQU1FID0gJ3ByZXJlbmRlcic7XG5cbmZ1bmN0aW9uIGFkZFNjcmlwdHNSdWxlKG9wdGlvbnM6IEFkZFVuaXZlcnNhbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0KSA9PiB7XG4gICAgY29uc3QgcGtnUGF0aCA9ICcvcGFja2FnZS5qc29uJztcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQocGtnUGF0aCk7XG4gICAgaWYgKGJ1ZmZlciA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIHBhY2thZ2UuanNvbicpO1xuICAgIH1cblxuICAgIGNvbnN0IHNlcnZlckRpc3QgPSBhd2FpdCBnZXRPdXRwdXRQYXRoKGhvc3QsIG9wdGlvbnMucHJvamVjdCwgJ3NlcnZlcicpO1xuICAgIGNvbnN0IHBrZyA9IEpTT04ucGFyc2UoYnVmZmVyLnRvU3RyaW5nKCkpIGFzIGFueTtcbiAgICBwa2cuc2NyaXB0cyA9IHtcbiAgICAgIC4uLnBrZy5zY3JpcHRzLFxuICAgICAgJ2Rldjpzc3InOiBgbmcgcnVuICR7b3B0aW9ucy5wcm9qZWN0fToke1NFUlZFX1NTUl9UQVJHRVRfTkFNRX1gLFxuICAgICAgJ3NlcnZlOnNzcic6IGBub2RlICR7c2VydmVyRGlzdH0vbWFpbi5qc2AsXG4gICAgICAnYnVpbGQ6c3NyJzogYG5nIGJ1aWxkICYmIG5nIHJ1biAke29wdGlvbnMucHJvamVjdH06c2VydmVyYCxcbiAgICAgICdwcmVyZW5kZXInOiBgbmcgcnVuICR7b3B0aW9ucy5wcm9qZWN0fToke1BSRVJFTkRFUl9UQVJHRVRfTkFNRX1gLFxuICAgIH07XG5cbiAgICBob3N0Lm92ZXJ3cml0ZShwa2dQYXRoLCBKU09OLnN0cmluZ2lmeShwa2csIG51bGwsIDIpKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlV29ya3NwYWNlQ29uZmlnUnVsZShvcHRpb25zOiBBZGRVbml2ZXJzYWxPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgICBjb25zdCBwcm9qZWN0TmFtZSA9IG9wdGlvbnMucHJvamVjdDtcbiAgICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3ROYW1lKTtcbiAgICAgIGlmICghcHJvamVjdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNlcnZlclRhcmdldCA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ3NlcnZlcicpO1xuICAgICAgc2VydmVyVGFyZ2V0Lm9wdGlvbnMubWFpbiA9IGpvaW4oXG4gICAgICAgIG5vcm1hbGl6ZShwcm9qZWN0LnJvb3QpLFxuICAgICAgICBzdHJpcFRzRXh0ZW5zaW9uKG9wdGlvbnMuc2VydmVyRmlsZU5hbWUpICsgJy50cycsXG4gICAgICApO1xuXG4gICAgICBjb25zdCBzZXJ2ZVNTUlRhcmdldCA9IHByb2plY3QudGFyZ2V0cy5nZXQoU0VSVkVfU1NSX1RBUkdFVF9OQU1FKTtcbiAgICAgIGlmIChzZXJ2ZVNTUlRhcmdldCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHByb2plY3QudGFyZ2V0cy5hZGQoe1xuICAgICAgICBuYW1lOiBTRVJWRV9TU1JfVEFSR0VUX05BTUUsXG4gICAgICAgIGJ1aWxkZXI6ICdAbmd1bml2ZXJzYWwvYnVpbGRlcnM6c3NyLWRldi1zZXJ2ZXInLFxuICAgICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogJ2RldmVsb3BtZW50JyxcbiAgICAgICAgb3B0aW9uczoge30sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgZGV2ZWxvcG1lbnQ6IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke3Byb2plY3ROYW1lfTpidWlsZDpkZXZlbG9wbWVudGAsXG4gICAgICAgICAgICBzZXJ2ZXJUYXJnZXQ6IGAke3Byb2plY3ROYW1lfTpzZXJ2ZXI6ZGV2ZWxvcG1lbnRgLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7cHJvamVjdE5hbWV9OmJ1aWxkOnByb2R1Y3Rpb25gLFxuICAgICAgICAgICAgc2VydmVyVGFyZ2V0OiBgJHtwcm9qZWN0TmFtZX06c2VydmVyOnByb2R1Y3Rpb25gLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcHJlcmVuZGVyVGFyZ2V0ID0gcHJvamVjdC50YXJnZXRzLmdldChQUkVSRU5ERVJfVEFSR0VUX05BTUUpO1xuICAgICAgaWYgKHByZXJlbmRlclRhcmdldCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHByb2plY3QudGFyZ2V0cy5hZGQoe1xuICAgICAgICBuYW1lOiBQUkVSRU5ERVJfVEFSR0VUX05BTUUsXG4gICAgICAgIGJ1aWxkZXI6ICdAbmd1bml2ZXJzYWwvYnVpbGRlcnM6cHJlcmVuZGVyJyxcbiAgICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHJvdXRlczogWycvJ10sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7cHJvamVjdE5hbWV9OmJ1aWxkOnByb2R1Y3Rpb25gLFxuICAgICAgICAgICAgc2VydmVyVGFyZ2V0OiBgJHtwcm9qZWN0TmFtZX06c2VydmVyOnByb2R1Y3Rpb25gLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGV2ZWxvcG1lbnQ6IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke3Byb2plY3ROYW1lfTpidWlsZDpkZXZlbG9wbWVudGAsXG4gICAgICAgICAgICBzZXJ2ZXJUYXJnZXQ6IGAke3Byb2plY3ROYW1lfTpzZXJ2ZXI6ZGV2ZWxvcG1lbnRgLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU2VydmVyVHNDb25maWdSdWxlKG9wdGlvbnM6IEFkZFVuaXZlcnNhbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0KSA9PiB7XG4gICAgY29uc3QgcHJvamVjdCA9IGF3YWl0IGdldFByb2plY3QoaG9zdCwgb3B0aW9ucy5wcm9qZWN0KTtcbiAgICBjb25zdCBzZXJ2ZXJUYXJnZXQgPSBwcm9qZWN0LnRhcmdldHMuZ2V0KCdzZXJ2ZXInKTtcbiAgICBpZiAoIXNlcnZlclRhcmdldCB8fCAhc2VydmVyVGFyZ2V0Lm9wdGlvbnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0c0NvbmZpZ1BhdGggPSBzZXJ2ZXJUYXJnZXQub3B0aW9ucy50c0NvbmZpZztcbiAgICBpZiAoIXRzQ29uZmlnUGF0aCB8fCB0eXBlb2YgdHNDb25maWdQYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgLy8gTm8gdHNjb25maWcgcGF0aFxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRzQ29uZmlnID0gbmV3IEpTT05GaWxlKGhvc3QsIHRzQ29uZmlnUGF0aCk7XG4gICAgY29uc3QgZmlsZXNBc3ROb2RlID0gdHNDb25maWcuZ2V0KFsnZmlsZXMnXSk7XG4gICAgY29uc3Qgc2VydmVyRmlsZVBhdGggPSBzdHJpcFRzRXh0ZW5zaW9uKG9wdGlvbnMuc2VydmVyRmlsZU5hbWUpICsgJy50cyc7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmlsZXNBc3ROb2RlKSAmJiAhZmlsZXNBc3ROb2RlLnNvbWUoKHsgdGV4dCB9KSA9PiB0ZXh0ID09PSBzZXJ2ZXJGaWxlUGF0aCkpIHtcbiAgICAgIHRzQ29uZmlnLm1vZGlmeShbJ2ZpbGVzJ10sIFsuLi5maWxlc0FzdE5vZGUsIHNlcnZlckZpbGVQYXRoXSk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiByb3V0aW5nSW5pdGlhbE5hdmlnYXRpb25SdWxlKG9wdGlvbnM6IFVuaXZlcnNhbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0KSA9PiB7XG4gICAgY29uc3QgcHJvamVjdCA9IGF3YWl0IGdldFByb2plY3QoaG9zdCwgb3B0aW9ucy5wcm9qZWN0KTtcbiAgICBjb25zdCBzZXJ2ZXJUYXJnZXQgPSBwcm9qZWN0LnRhcmdldHMuZ2V0KCdzZXJ2ZXInKTtcbiAgICBpZiAoIXNlcnZlclRhcmdldCB8fCAhc2VydmVyVGFyZ2V0Lm9wdGlvbnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0c0NvbmZpZ1BhdGggPSBzZXJ2ZXJUYXJnZXQub3B0aW9ucy50c0NvbmZpZztcbiAgICBpZiAoIXRzQ29uZmlnUGF0aCB8fCB0eXBlb2YgdHNDb25maWdQYXRoICE9PSAnc3RyaW5nJyB8fCAhaG9zdC5leGlzdHModHNDb25maWdQYXRoKSkge1xuICAgICAgLy8gTm8gdHNjb25maWcgcGF0aFxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcnNlQ29uZmlnSG9zdDogdHMuUGFyc2VDb25maWdIb3N0ID0ge1xuICAgICAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lczogdHMuc3lzLnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMsXG4gICAgICByZWFkRGlyZWN0b3J5OiB0cy5zeXMucmVhZERpcmVjdG9yeSxcbiAgICAgIGZpbGVFeGlzdHM6IGZ1bmN0aW9uIChmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBob3N0LmV4aXN0cyhmaWxlTmFtZSk7XG4gICAgICB9LFxuICAgICAgcmVhZEZpbGU6IGZ1bmN0aW9uIChmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGhvc3QucmVhZChmaWxlTmFtZSkudG9TdHJpbmcoKTtcbiAgICAgIH0sXG4gICAgfTtcbiAgICBjb25zdCB7IGNvbmZpZyB9ID0gdHMucmVhZENvbmZpZ0ZpbGUodHNDb25maWdQYXRoLCBwYXJzZUNvbmZpZ0hvc3QucmVhZEZpbGUpO1xuICAgIGNvbnN0IHBhcnNlZCA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KFxuICAgICAgY29uZmlnLFxuICAgICAgcGFyc2VDb25maWdIb3N0LFxuICAgICAgZGlybmFtZShub3JtYWxpemUodHNDb25maWdQYXRoKSksXG4gICAgKTtcbiAgICBjb25zdCB0c0hvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QocGFyc2VkLm9wdGlvbnMsIHRydWUpO1xuICAgIC8vIFN0cmlwIEJPTSBhcyBvdGhlcndpc2UgVFNDIG1ldGhvZHMgKEV4OiBnZXRXaWR0aCkgd2lsbCByZXR1cm4gYW4gb2Zmc2V0LFxuICAgIC8vIHdoaWNoIGJyZWFrcyB0aGUgQ0xJIFVwZGF0ZVJlY29yZGVyLlxuICAgIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9wdWxsLzMwNzE5XG4gICAgdHNIb3N0LnJlYWRGaWxlID0gZnVuY3Rpb24gKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgcmV0dXJuIGhvc3RcbiAgICAgICAgLnJlYWQoZmlsZU5hbWUpXG4gICAgICAgIC50b1N0cmluZygpXG4gICAgICAgIC5yZXBsYWNlKC9eXFx1RkVGRi8sICcnKTtcbiAgICB9O1xuICAgIHRzSG9zdC5kaXJlY3RvcnlFeGlzdHMgPSBmdW5jdGlvbiAoZGlyZWN0b3J5TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAvLyBXaGVuIHRoZSBwYXRoIGlzIGZpbGUgZ2V0RGlyIHdpbGwgdGhyb3cuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBkaXIgPSBob3N0LmdldERpcihkaXJlY3RvcnlOYW1lKTtcblxuICAgICAgICByZXR1cm4gISEoZGlyLnN1YmRpcnMubGVuZ3RoIHx8IGRpci5zdWJmaWxlcy5sZW5ndGgpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHRzSG9zdC5maWxlRXhpc3RzID0gZnVuY3Rpb24gKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgIHJldHVybiBob3N0LmV4aXN0cyhmaWxlTmFtZSk7XG4gICAgfTtcbiAgICB0c0hvc3QucmVhbHBhdGggPSBmdW5jdGlvbiAocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgIHJldHVybiBwYXRoO1xuICAgIH07XG4gICAgdHNIb3N0LmdldEN1cnJlbnREaXJlY3RvcnkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gaG9zdC5yb290LnBhdGg7XG4gICAgfTtcblxuICAgIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHBhcnNlZC5maWxlTmFtZXMsIHBhcnNlZC5vcHRpb25zLCB0c0hvc3QpO1xuICAgIGNvbnN0IHR5cGVDaGVja2VyID0gcHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgIGNvbnN0IHNvdXJjZUZpbGVzID0gcHJvZ3JhbVxuICAgICAgLmdldFNvdXJjZUZpbGVzKClcbiAgICAgIC5maWx0ZXIoKGYpID0+ICFmLmlzRGVjbGFyYXRpb25GaWxlICYmICFwcm9ncmFtLmlzU291cmNlRmlsZUZyb21FeHRlcm5hbExpYnJhcnkoZikpO1xuICAgIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gICAgY29uc3Qgcm91dGVyTW9kdWxlID0gJ1JvdXRlck1vZHVsZSc7XG4gICAgY29uc3Qgcm91dGVyU291cmNlID0gJ0Bhbmd1bGFyL3JvdXRlcic7XG5cbiAgICBzb3VyY2VGaWxlcy5mb3JFYWNoKChzb3VyY2VGaWxlKSA9PiB7XG4gICAgICBjb25zdCByb3V0ZXJJbXBvcnQgPSBmaW5kSW1wb3J0KHNvdXJjZUZpbGUsIHJvdXRlclNvdXJjZSwgcm91dGVyTW9kdWxlKTtcbiAgICAgIGlmICghcm91dGVySW1wb3J0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbGV0IHJvdXRlck1vZHVsZU5vZGU6IHRzLkNhbGxFeHByZXNzaW9uO1xuICAgICAgdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIGZ1bmN0aW9uIHZpc2l0Tm9kZShub2RlOiB0cy5Ob2RlKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICB0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpICYmXG4gICAgICAgICAgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZS5leHByZXNzaW9uKSAmJlxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24uZXhwcmVzc2lvbikgJiZcbiAgICAgICAgICBub2RlLmV4cHJlc3Npb24ubmFtZS50ZXh0ID09PSAnZm9yUm9vdCdcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc3QgaW1wID0gZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHR5cGVDaGVja2VyLCBub2RlLmV4cHJlc3Npb24uZXhwcmVzc2lvbik7XG5cbiAgICAgICAgICBpZiAoaW1wICYmIGltcC5uYW1lID09PSByb3V0ZXJNb2R1bGUgJiYgaW1wLmltcG9ydE1vZHVsZSA9PT0gcm91dGVyU291cmNlKSB7XG4gICAgICAgICAgICByb3V0ZXJNb2R1bGVOb2RlID0gbm9kZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgdmlzaXROb2RlKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAocm91dGVyTW9kdWxlTm9kZSkge1xuICAgICAgICBjb25zdCBwcmludCA9IHByaW50ZXIucHJpbnROb2RlKFxuICAgICAgICAgIHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLFxuICAgICAgICAgIGFkZEluaXRpYWxOYXZpZ2F0aW9uKHJvdXRlck1vZHVsZU5vZGUpLFxuICAgICAgICAgIHNvdXJjZUZpbGUsXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgICAgICByZWNvcmRlci5yZW1vdmUocm91dGVyTW9kdWxlTm9kZS5nZXRTdGFydCgpLCByb3V0ZXJNb2R1bGVOb2RlLmdldFdpZHRoKCkpO1xuICAgICAgICByZWNvcmRlci5pbnNlcnRSaWdodChyb3V0ZXJNb2R1bGVOb2RlLmdldFN0YXJ0KCksIHByaW50KTtcbiAgICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXMoKTogUnVsZSB7XG4gIHJldHVybiAoX2hvc3Q6IFRyZWUpID0+IHtcbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgYWRkRGVwZW5kZW5jeSgnQG5ndW5pdmVyc2FsL2J1aWxkZXJzJywgJ14wLjAuMC1QTEFDRUhPTERFUicsIHtcbiAgICAgICAgdHlwZTogRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgfSksXG4gICAgICBhZGREZXBlbmRlbmN5KCdAbmd1bml2ZXJzYWwvZXhwcmVzcy1lbmdpbmUnLCAnXjAuMC4wLVBMQUNFSE9MREVSJywge1xuICAgICAgICB0eXBlOiBEZXBlbmRlbmN5VHlwZS5EZWZhdWx0LFxuICAgICAgfSksXG4gICAgICBhZGREZXBlbmRlbmN5KCdleHByZXNzJywgJ0VYUFJFU1NfVkVSU0lPTicsIHtcbiAgICAgICAgdHlwZTogRGVwZW5kZW5jeVR5cGUuRGVmYXVsdCxcbiAgICAgIH0pLFxuICAgICAgYWRkRGVwZW5kZW5jeSgnQHR5cGVzL2V4cHJlc3MnLCAnRVhQUkVTU19UWVBFU19WRVJTSU9OJywge1xuICAgICAgICB0eXBlOiBEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICB9KSxcbiAgICBdKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkU2VydmVyRmlsZShvcHRpb25zOiBVbml2ZXJzYWxPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdCkgPT4ge1xuICAgIGNvbnN0IHByb2plY3QgPSBhd2FpdCBnZXRQcm9qZWN0KGhvc3QsIG9wdGlvbnMucHJvamVjdCk7XG4gICAgY29uc3QgYnJvd3NlckRpc3REaXJlY3RvcnkgPSBhd2FpdCBnZXRPdXRwdXRQYXRoKGhvc3QsIG9wdGlvbnMucHJvamVjdCwgJ2J1aWxkJyk7XG5cbiAgICByZXR1cm4gbWVyZ2VXaXRoKFxuICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgICAgdGVtcGxhdGUoe1xuICAgICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICBzdHJpcFRzRXh0ZW5zaW9uLFxuICAgICAgICAgIGJyb3dzZXJEaXN0RGlyZWN0b3J5LFxuICAgICAgICB9KSxcbiAgICAgICAgbW92ZShwcm9qZWN0LnJvb3QpLFxuICAgICAgXSksXG4gICAgKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEFkZFVuaXZlcnNhbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0KSA9PiB7XG4gICAgY29uc3QgcHJvamVjdCA9IGF3YWl0IGdldFByb2plY3QoaG9zdCwgb3B0aW9ucy5wcm9qZWN0KTtcbiAgICBjb25zdCB1bml2ZXJzYWxPcHRpb25zID0ge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIHNraXBJbnN0YWxsOiB0cnVlLFxuICAgIH07XG5cbiAgICBkZWxldGUgdW5pdmVyc2FsT3B0aW9ucy5zZXJ2ZXJGaWxlTmFtZTtcbiAgICBkZWxldGUgdW5pdmVyc2FsT3B0aW9ucy5zZXJ2ZXJQb3J0O1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIHByb2plY3QudGFyZ2V0cy5oYXMoJ3NlcnZlcicpXG4gICAgICAgID8gbm9vcCgpXG4gICAgICAgIDogZXh0ZXJuYWxTY2hlbWF0aWMoJ0BzY2hlbWF0aWNzL2FuZ3VsYXInLCAndW5pdmVyc2FsJywgdW5pdmVyc2FsT3B0aW9ucyksXG4gICAgICBhZGRTY3JpcHRzUnVsZShvcHRpb25zKSxcbiAgICAgIHVwZGF0ZVNlcnZlclRzQ29uZmlnUnVsZShvcHRpb25zKSxcbiAgICAgIHVwZGF0ZVdvcmtzcGFjZUNvbmZpZ1J1bGUob3B0aW9ucyksXG4gICAgICByb3V0aW5nSW5pdGlhbE5hdmlnYXRpb25SdWxlKG9wdGlvbnMpLFxuICAgICAgYWRkU2VydmVyRmlsZShvcHRpb25zKSxcbiAgICAgIGFkZERlcGVuZGVuY2llcygpLFxuICAgIF0pO1xuICB9O1xufVxuIl19