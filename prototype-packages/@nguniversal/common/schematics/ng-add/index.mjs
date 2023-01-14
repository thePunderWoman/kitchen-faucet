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
import { basename, normalize, split } from '@angular-devkit/core';
import { SchematicsException, apply, applyTemplates, chain, mergeWith, move, noop, url, } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { DependencyType, addDependency, readWorkspace, updateWorkspace, } from '@schematics/angular/utility';
import { addImportToModule, findNode, getDecoratorMetadata, } from '@schematics/angular/utility/ast-utils';
import { InsertChange, applyToUpdateRecorder } from '@schematics/angular/utility/change';
import { findBootstrapModulePath } from '@schematics/angular/utility/ng-ast-utils';
import { posix } from 'path';
import * as ts from 'typescript';
export default function (options) {
    return (host, context) => __awaiter(this, void 0, void 0, function* () {
        const workspace = yield readWorkspace(host);
        const project = workspace.projects.get(options.project);
        if (project.extensions.projectType !== 'application') {
            throw new SchematicsException(`Universal requires a project type of "application".`);
        }
        const clientBuildTarget = project.targets.get('build');
        if (!clientBuildTarget) {
            throw new SchematicsException(`Project target "build" not found.`);
        }
        if (!options.skipInstall) {
            context.addTask(new NodePackageInstallTask());
        }
        return chain([
            augmentAppModuleRule(project, clientBuildTarget, options),
            options.ssr ? addSSRRule(project, clientBuildTarget) : noop(),
            options.prerender
                ? addDependency('@nguniversal/builders', '~15.1.0', {
                    type: DependencyType.Dev,
                })
                : noop(),
            addScriptsRule(options),
            updateWorkspaceRule(options),
        ]);
    });
}
function addSSRRule(project, buildTarget) {
    return () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const templateSource = apply(url('./files/src'), [
            applyTemplates({}),
            move((_a = project.sourceRoot) !== null && _a !== void 0 ? _a : '/src'),
        ]);
        const rootSource = apply(url('./files/root'), [
            applyTemplates({
                tsConfigExtends: basename(normalize(buildTarget.options.tsConfig)),
                relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(project.root),
            }),
            move(project.root),
        ]);
        return chain([
            addDependency('express', '^4.15.2', {
                type: DependencyType.Default,
            }),
            addDependency('@types/express', '^4.17.0', {
                type: DependencyType.Dev,
            }),
            mergeWith(templateSource),
            mergeWith(rootSource),
        ]);
    });
}
function addScriptsRule(options) {
    return (host) => __awaiter(this, void 0, void 0, function* () {
        const pkgPath = '/package.json';
        const buffer = host.read(pkgPath);
        if (!buffer) {
            throw new SchematicsException('Could not find package.json');
        }
        const pkg = JSON.parse(buffer.toString());
        if (options.prerender) {
            pkg.scripts = Object.assign(Object.assign({}, pkg.scripts), { 'prerender': `ng run ${options.project}:prerender` });
        }
        if (options.ssr) {
            pkg.scripts = Object.assign(Object.assign({}, pkg.scripts), { 'build:client-and-server': `ng build ${options.project} && ng run ${options.project}:server`, 'build:server': `ng run ${options.project}:server`, 'serve:ssr': `node dist/${options.project}/server/main.js` });
        }
        host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
    });
}
function updateWorkspaceRule(options) {
    return updateWorkspace((workspace) => {
        var _a, _b;
        const project = workspace.projects.get(options.project);
        if (options.ssr) {
            project.targets.add({
                name: 'server',
                builder: '@angular-devkit/build-angular:server',
                options: {
                    outputPath: `dist/${options.project}/server`,
                    main: posix.join((_a = project.sourceRoot) !== null && _a !== void 0 ? _a : '', 'server.ts'),
                    tsConfig: posix.join(project.root, 'tsconfig.server.json'),
                    bundleDependencies: false,
                    optimization: false,
                },
            });
            const buildTarget = project.targets.get('build');
            if ((_b = project.targets.get('build')) === null || _b === void 0 ? void 0 : _b.options) {
                buildTarget.options.outputPath = `dist/${options.project}/browser`;
            }
        }
        if (options.prerender) {
            project.targets.add({
                name: 'prerender',
                builder: '@nguniversal/builders:static-generator',
                defaultConfiguration: 'production',
                options: {},
                configurations: {
                    production: {
                        browserTarget: `${options.project}:build:production`,
                    },
                    development: {
                        browserTarget: `${options.project}:build:development`,
                    },
                },
            });
        }
    });
}
function augmentAppModuleRule(project, buildTarget, options) {
    return (host) => {
        const bootstrapModuleRelativePath = findBootstrapModulePath(host, buildTarget.options.main);
        const bootstrapModulePath = normalize(`/${project.sourceRoot}/${bootstrapModuleRelativePath}.ts`);
        // Add BrowserModule.withServerTransition()
        const browserModuleImport = findBrowserModuleImport(host, bootstrapModulePath);
        const transitionCall = `.withServerTransition({ appId: '${options.appId}' })`;
        const position = browserModuleImport.pos + browserModuleImport.getFullText().length;
        const transitionCallChange = new InsertChange(bootstrapModulePath, position, transitionCall);
        const transitionCallRecorder = host.beginUpdate(bootstrapModulePath);
        transitionCallRecorder.insertLeft(transitionCallChange.pos, transitionCallChange.toAdd);
        host.commitUpdate(transitionCallRecorder);
        // Add @nguniversal/common/clover
        let changes = addImportToModule(getSourceFile(host, bootstrapModulePath), bootstrapModulePath, 'RendererModule.forRoot()', '@nguniversal/common/clover');
        let recorder = host.beginUpdate(bootstrapModulePath);
        applyToUpdateRecorder(recorder, changes);
        host.commitUpdate(recorder);
        changes = addImportToModule(getSourceFile(host, bootstrapModulePath), bootstrapModulePath, 'TransferHttpCacheModule', '@nguniversal/common/clover');
        recorder = host.beginUpdate(bootstrapModulePath);
        applyToUpdateRecorder(recorder, changes);
        host.commitUpdate(recorder);
    };
}
function relativePathToWorkspaceRoot(projectRoot) {
    const normalizedPath = split(normalize(projectRoot || ''));
    if (normalizedPath.length === 0 || !normalizedPath[0]) {
        return '.';
    }
    else {
        return normalizedPath.map(() => '..').join('/');
    }
}
function findBrowserModuleImport(host, modulePath) {
    const source = getSourceFile(host, modulePath);
    const decoratorMetadata = getDecoratorMetadata(source, 'NgModule', '@angular/core')[0];
    const browserModuleNode = findNode(decoratorMetadata, ts.SyntaxKind.Identifier, 'BrowserModule');
    if (!browserModuleNode) {
        throw new SchematicsException(`Cannot find BrowserModule import in ${modulePath}`);
    }
    return browserModuleNode;
}
function getSourceFile(host, path) {
    const buffer = host.read(path);
    if (!buffer) {
        throw new SchematicsException(`Could not find ${path}.`);
    }
    const content = buffer.toString();
    const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
    return source;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2NvbW1vbi9zY2hlbWF0aWNzL25nLWFkZC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUVsRSxPQUFPLEVBRUwsbUJBQW1CLEVBRW5CLEtBQUssRUFDTCxjQUFjLEVBQ2QsS0FBSyxFQUNMLFNBQVMsRUFDVCxJQUFJLEVBQ0osSUFBSSxFQUNKLEdBQUcsR0FDSixNQUFNLDRCQUE0QixDQUFDO0FBQ3BDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzFFLE9BQU8sRUFDTCxjQUFjLEVBQ2QsYUFBYSxFQUNiLGFBQWEsRUFDYixlQUFlLEdBQ2hCLE1BQU0sNkJBQTZCLENBQUM7QUFDckMsT0FBTyxFQUNMLGlCQUFpQixFQUNqQixRQUFRLEVBQ1Isb0JBQW9CLEdBQ3JCLE1BQU0sdUNBQXVDLENBQUM7QUFDL0MsT0FBTyxFQUFFLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFJakMsTUFBTSxDQUFDLE9BQU8sV0FBVyxPQUFxQjtJQUM1QyxPQUFPLENBQU8sSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQzdCLE1BQU0sU0FBUyxHQUFHLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV4RCxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxLQUFLLGFBQWEsRUFBRTtZQUNwRCxNQUFNLElBQUksbUJBQW1CLENBQUMscURBQXFELENBQUMsQ0FBQztTQUN0RjtRQUVELE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQ3RCLE1BQU0sSUFBSSxtQkFBbUIsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1NBQ3BFO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7WUFDeEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLHNCQUFzQixFQUFFLENBQUMsQ0FBQztTQUMvQztRQUVELE9BQU8sS0FBSyxDQUFDO1lBQ1gsb0JBQW9CLENBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sQ0FBQztZQUN6RCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtZQUM3RCxPQUFPLENBQUMsU0FBUztnQkFDZixDQUFDLENBQUMsYUFBYSxDQUFDLHVCQUF1QixFQUFFLG9CQUFvQixFQUFFO29CQUMzRCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUc7aUJBQ3pCLENBQUM7Z0JBQ0osQ0FBQyxDQUFDLElBQUksRUFBRTtZQUNWLGNBQWMsQ0FBQyxPQUFPLENBQUM7WUFDdkIsbUJBQW1CLENBQUMsT0FBTyxDQUFDO1NBQzdCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLE9BQTBCLEVBQUUsV0FBNkI7SUFDM0UsT0FBTyxHQUFTLEVBQUU7O1FBQ2hCLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFDL0MsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsTUFBQSxPQUFPLENBQUMsVUFBVSxtQ0FBSSxNQUFNLENBQUM7U0FDbkMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUM1QyxjQUFjLENBQUM7Z0JBQ2IsZUFBZSxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUUsV0FBVyxDQUFDLE9BQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDM0UsMkJBQTJCLEVBQUUsMkJBQTJCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQzthQUN2RSxDQUFDO1lBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxLQUFLLENBQUM7WUFDWCxhQUFhLENBQUMsU0FBUyxFQUFFLGlCQUFpQixFQUFFO2dCQUMxQyxJQUFJLEVBQUUsY0FBYyxDQUFDLE9BQU87YUFDN0IsQ0FBQztZQUVGLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsRUFBRTtnQkFDdkQsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHO2FBQ3pCLENBQUM7WUFDRixTQUFTLENBQUMsY0FBYyxDQUFDO1lBQ3pCLFNBQVMsQ0FBQyxVQUFVLENBQUM7U0FDdEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFBLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsT0FBcUI7SUFDM0MsT0FBTyxDQUFPLElBQUksRUFBRSxFQUFFO1FBQ3BCLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQztRQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxNQUFNLElBQUksbUJBQW1CLENBQUMsNkJBQTZCLENBQUMsQ0FBQztTQUM5RDtRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFRLENBQUM7UUFDakQsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFO1lBQ3JCLEdBQUcsQ0FBQyxPQUFPLG1DQUNOLEdBQUcsQ0FBQyxPQUFPLEtBQ2QsV0FBVyxFQUFFLFVBQVUsT0FBTyxDQUFDLE9BQU8sWUFBWSxHQUNuRCxDQUFDO1NBQ0g7UUFFRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDZixHQUFHLENBQUMsT0FBTyxtQ0FDTixHQUFHLENBQUMsT0FBTyxLQUNkLHlCQUF5QixFQUFFLFlBQVksT0FBTyxDQUFDLE9BQU8sY0FBYyxPQUFPLENBQUMsT0FBTyxTQUFTLEVBQzVGLGNBQWMsRUFBRSxVQUFVLE9BQU8sQ0FBQyxPQUFPLFNBQVMsRUFDbEQsV0FBVyxFQUFFLGFBQWEsT0FBTyxDQUFDLE9BQU8saUJBQWlCLEdBQzNELENBQUM7U0FDSDtRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hELENBQUMsQ0FBQSxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsT0FBcUI7SUFDaEQsT0FBTyxlQUFlLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTs7UUFDbkMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hELElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUNmLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUNsQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsc0NBQXNDO2dCQUMvQyxPQUFPLEVBQUU7b0JBQ1AsVUFBVSxFQUFFLFFBQVEsT0FBTyxDQUFDLE9BQU8sU0FBUztvQkFDNUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBQSxPQUFPLENBQUMsVUFBVSxtQ0FBSSxFQUFFLEVBQUUsV0FBVyxDQUFDO29CQUN2RCxRQUFRLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDO29CQUMxRCxrQkFBa0IsRUFBRSxLQUFLO29CQUN6QixZQUFZLEVBQUUsS0FBSztpQkFDcEI7YUFDRixDQUFDLENBQUM7WUFFSCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNqRCxJQUFJLE1BQUEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLDBDQUFFLE9BQU8sRUFBRTtnQkFDekMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsUUFBUSxPQUFPLENBQUMsT0FBTyxVQUFVLENBQUM7YUFDcEU7U0FDRjtRQUVELElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRTtZQUNyQixPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFDbEIsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLE9BQU8sRUFBRSx3Q0FBd0M7Z0JBQ2pELG9CQUFvQixFQUFFLFlBQVk7Z0JBQ2xDLE9BQU8sRUFBRSxFQUFFO2dCQUNYLGNBQWMsRUFBRTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1YsYUFBYSxFQUFFLEdBQUcsT0FBTyxDQUFDLE9BQU8sbUJBQW1CO3FCQUNyRDtvQkFDRCxXQUFXLEVBQUU7d0JBQ1gsYUFBYSxFQUFFLEdBQUcsT0FBTyxDQUFDLE9BQU8sb0JBQW9CO3FCQUN0RDtpQkFDRjthQUNGLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FDM0IsT0FBMEIsRUFDMUIsV0FBNkIsRUFDN0IsT0FBcUI7SUFFckIsT0FBTyxDQUFDLElBQVUsRUFBRSxFQUFFO1FBQ3BCLE1BQU0sMkJBQTJCLEdBQUcsdUJBQXVCLENBQ3pELElBQUksRUFDSixXQUFXLENBQUMsT0FBTyxDQUFDLElBQWMsQ0FDbkMsQ0FBQztRQUNGLE1BQU0sbUJBQW1CLEdBQUcsU0FBUyxDQUNuQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLElBQUksMkJBQTJCLEtBQUssQ0FDM0QsQ0FBQztRQUVGLDJDQUEyQztRQUMzQyxNQUFNLG1CQUFtQixHQUFHLHVCQUF1QixDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQy9FLE1BQU0sY0FBYyxHQUFHLG1DQUFtQyxPQUFPLENBQUMsS0FBSyxNQUFNLENBQUM7UUFDOUUsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxHQUFHLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNwRixNQUFNLG9CQUFvQixHQUFHLElBQUksWUFBWSxDQUFDLG1CQUFtQixFQUFFLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUU3RixNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNyRSxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hGLElBQUksQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUUxQyxpQ0FBaUM7UUFDakMsSUFBSSxPQUFPLEdBQUcsaUJBQWlCLENBQzdCLGFBQWEsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsRUFDeEMsbUJBQW1CLEVBQ25CLDBCQUEwQixFQUMxQiw0QkFBNEIsQ0FDN0IsQ0FBQztRQUNGLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNyRCxxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU1QixPQUFPLEdBQUcsaUJBQWlCLENBQ3pCLGFBQWEsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsRUFDeEMsbUJBQW1CLEVBQ25CLHlCQUF5QixFQUN6Qiw0QkFBNEIsQ0FDN0IsQ0FBQztRQUNGLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDakQscUJBQXFCLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsMkJBQTJCLENBQUMsV0FBK0I7SUFDbEUsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUUzRCxJQUFJLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ3JELE9BQU8sR0FBRyxDQUFDO0tBQ1o7U0FBTTtRQUNMLE9BQU8sY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDakQ7QUFDSCxDQUFDO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxJQUFVLEVBQUUsVUFBa0I7SUFDN0QsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMvQyxNQUFNLGlCQUFpQixHQUFHLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkYsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFFakcsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1FBQ3RCLE1BQU0sSUFBSSxtQkFBbUIsQ0FBQyx1Q0FBdUMsVUFBVSxFQUFFLENBQUMsQ0FBQztLQUNwRjtJQUVELE9BQU8saUJBQWlCLENBQUM7QUFDM0IsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLElBQVUsRUFBRSxJQUFZO0lBQzdDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNYLE1BQU0sSUFBSSxtQkFBbUIsQ0FBQyxrQkFBa0IsSUFBSSxHQUFHLENBQUMsQ0FBQztLQUMxRDtJQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUVoRixPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGJhc2VuYW1lLCBub3JtYWxpemUsIHNwbGl0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgUHJvamVjdERlZmluaXRpb24sIFRhcmdldERlZmluaXRpb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZS9zcmMvd29ya3NwYWNlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0IHtcbiAgRGVwZW5kZW5jeVR5cGUsXG4gIGFkZERlcGVuZGVuY3ksXG4gIHJlYWRXb3Jrc3BhY2UsXG4gIHVwZGF0ZVdvcmtzcGFjZSxcbn0gZnJvbSAnQHNjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5JztcbmltcG9ydCB7XG4gIGFkZEltcG9ydFRvTW9kdWxlLFxuICBmaW5kTm9kZSxcbiAgZ2V0RGVjb3JhdG9yTWV0YWRhdGEsXG59IGZyb20gJ0BzY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHsgSW5zZXJ0Q2hhbmdlLCBhcHBseVRvVXBkYXRlUmVjb3JkZXIgfSBmcm9tICdAc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvY2hhbmdlJztcbmltcG9ydCB7IGZpbmRCb290c3RyYXBNb2R1bGVQYXRoIH0gZnJvbSAnQHNjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L25nLWFzdC11dGlscyc7XG5pbXBvcnQgeyBwb3NpeCB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7IFNjaGVtYSBhcyBOZ0FkZE9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBOZ0FkZE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0LCBjb250ZXh0KSA9PiB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgcmVhZFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuXG4gICAgaWYgKHByb2plY3QuZXh0ZW5zaW9ucy5wcm9qZWN0VHlwZSAhPT0gJ2FwcGxpY2F0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFVuaXZlcnNhbCByZXF1aXJlcyBhIHByb2plY3QgdHlwZSBvZiBcImFwcGxpY2F0aW9uXCIuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgY2xpZW50QnVpbGRUYXJnZXQgPSBwcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgIGlmICghY2xpZW50QnVpbGRUYXJnZXQpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IHRhcmdldCBcImJ1aWxkXCIgbm90IGZvdW5kLmApO1xuICAgIH1cblxuICAgIGlmICghb3B0aW9ucy5za2lwSW5zdGFsbCkge1xuICAgICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuICAgIH1cblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBhdWdtZW50QXBwTW9kdWxlUnVsZShwcm9qZWN0LCBjbGllbnRCdWlsZFRhcmdldCwgb3B0aW9ucyksXG4gICAgICBvcHRpb25zLnNzciA/IGFkZFNTUlJ1bGUocHJvamVjdCwgY2xpZW50QnVpbGRUYXJnZXQpIDogbm9vcCgpLFxuICAgICAgb3B0aW9ucy5wcmVyZW5kZXJcbiAgICAgICAgPyBhZGREZXBlbmRlbmN5KCdAbmd1bml2ZXJzYWwvYnVpbGRlcnMnLCAnfjAuMC4wLVBMQUNFSE9MREVSJywge1xuICAgICAgICAgICAgdHlwZTogRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICAgIH0pXG4gICAgICAgIDogbm9vcCgpLFxuICAgICAgYWRkU2NyaXB0c1J1bGUob3B0aW9ucyksXG4gICAgICB1cGRhdGVXb3Jrc3BhY2VSdWxlKG9wdGlvbnMpLFxuICAgIF0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRTU1JSdWxlKHByb2plY3Q6IFByb2plY3REZWZpbml0aW9uLCBidWlsZFRhcmdldDogVGFyZ2V0RGVmaW5pdGlvbik6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRlbXBsYXRlU291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzL3NyYycpLCBbXG4gICAgICBhcHBseVRlbXBsYXRlcyh7fSksXG4gICAgICBtb3ZlKHByb2plY3Quc291cmNlUm9vdCA/PyAnL3NyYycpLFxuICAgIF0pO1xuICAgIGNvbnN0IHJvb3RTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMvcm9vdCcpLCBbXG4gICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgIHRzQ29uZmlnRXh0ZW5kczogYmFzZW5hbWUobm9ybWFsaXplKChidWlsZFRhcmdldC5vcHRpb25zIGFzIGFueSkudHNDb25maWcpKSxcbiAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290OiByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QocHJvamVjdC5yb290KSxcbiAgICAgIH0pLFxuICAgICAgbW92ZShwcm9qZWN0LnJvb3QpLFxuICAgIF0pO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIGFkZERlcGVuZGVuY3koJ2V4cHJlc3MnLCAnRVhQUkVTU19WRVJTSU9OJywge1xuICAgICAgICB0eXBlOiBEZXBlbmRlbmN5VHlwZS5EZWZhdWx0LFxuICAgICAgfSksXG5cbiAgICAgIGFkZERlcGVuZGVuY3koJ0B0eXBlcy9leHByZXNzJywgJ0VYUFJFU1NfVFlQRVNfVkVSU0lPTicsIHtcbiAgICAgICAgdHlwZTogRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgfSksXG4gICAgICBtZXJnZVdpdGgodGVtcGxhdGVTb3VyY2UpLFxuICAgICAgbWVyZ2VXaXRoKHJvb3RTb3VyY2UpLFxuICAgIF0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRTY3JpcHRzUnVsZShvcHRpb25zOiBOZ0FkZE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0KSA9PiB7XG4gICAgY29uc3QgcGtnUGF0aCA9ICcvcGFja2FnZS5qc29uJztcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQocGtnUGF0aCk7XG4gICAgaWYgKCFidWZmZXIpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCBwYWNrYWdlLmpzb24nKTtcbiAgICB9XG5cbiAgICBjb25zdCBwa2cgPSBKU09OLnBhcnNlKGJ1ZmZlci50b1N0cmluZygpKSBhcyBhbnk7XG4gICAgaWYgKG9wdGlvbnMucHJlcmVuZGVyKSB7XG4gICAgICBwa2cuc2NyaXB0cyA9IHtcbiAgICAgICAgLi4ucGtnLnNjcmlwdHMsXG4gICAgICAgICdwcmVyZW5kZXInOiBgbmcgcnVuICR7b3B0aW9ucy5wcm9qZWN0fTpwcmVyZW5kZXJgLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5zc3IpIHtcbiAgICAgIHBrZy5zY3JpcHRzID0ge1xuICAgICAgICAuLi5wa2cuc2NyaXB0cyxcbiAgICAgICAgJ2J1aWxkOmNsaWVudC1hbmQtc2VydmVyJzogYG5nIGJ1aWxkICR7b3B0aW9ucy5wcm9qZWN0fSAmJiBuZyBydW4gJHtvcHRpb25zLnByb2plY3R9OnNlcnZlcmAsXG4gICAgICAgICdidWlsZDpzZXJ2ZXInOiBgbmcgcnVuICR7b3B0aW9ucy5wcm9qZWN0fTpzZXJ2ZXJgLFxuICAgICAgICAnc2VydmU6c3NyJzogYG5vZGUgZGlzdC8ke29wdGlvbnMucHJvamVjdH0vc2VydmVyL21haW4uanNgLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBob3N0Lm92ZXJ3cml0ZShwa2dQYXRoLCBKU09OLnN0cmluZ2lmeShwa2csIG51bGwsIDIpKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlV29ya3NwYWNlUnVsZShvcHRpb25zOiBOZ0FkZE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICBpZiAob3B0aW9ucy5zc3IpIHtcbiAgICAgIHByb2plY3QudGFyZ2V0cy5hZGQoe1xuICAgICAgICBuYW1lOiAnc2VydmVyJyxcbiAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOnNlcnZlcicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke29wdGlvbnMucHJvamVjdH0vc2VydmVyYCxcbiAgICAgICAgICBtYWluOiBwb3NpeC5qb2luKHByb2plY3Quc291cmNlUm9vdCA/PyAnJywgJ3NlcnZlci50cycpLFxuICAgICAgICAgIHRzQ29uZmlnOiBwb3NpeC5qb2luKHByb2plY3Qucm9vdCwgJ3RzY29uZmlnLnNlcnZlci5qc29uJyksXG4gICAgICAgICAgYnVuZGxlRGVwZW5kZW5jaWVzOiBmYWxzZSxcbiAgICAgICAgICBvcHRpbWl6YXRpb246IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGJ1aWxkVGFyZ2V0ID0gcHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICAgIGlmIChwcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpPy5vcHRpb25zKSB7XG4gICAgICAgIGJ1aWxkVGFyZ2V0Lm9wdGlvbnMub3V0cHV0UGF0aCA9IGBkaXN0LyR7b3B0aW9ucy5wcm9qZWN0fS9icm93c2VyYDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5wcmVyZW5kZXIpIHtcbiAgICAgIHByb2plY3QudGFyZ2V0cy5hZGQoe1xuICAgICAgICBuYW1lOiAncHJlcmVuZGVyJyxcbiAgICAgICAgYnVpbGRlcjogJ0BuZ3VuaXZlcnNhbC9idWlsZGVyczpzdGF0aWMtZ2VuZXJhdG9yJyxcbiAgICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgb3B0aW9uczoge30sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5wcm9qZWN0fTpidWlsZDpwcm9kdWN0aW9uYCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRldmVsb3BtZW50OiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLnByb2plY3R9OmJ1aWxkOmRldmVsb3BtZW50YCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gYXVnbWVudEFwcE1vZHVsZVJ1bGUoXG4gIHByb2plY3Q6IFByb2plY3REZWZpbml0aW9uLFxuICBidWlsZFRhcmdldDogVGFyZ2V0RGVmaW5pdGlvbixcbiAgb3B0aW9uczogTmdBZGRPcHRpb25zLFxuKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IGJvb3RzdHJhcE1vZHVsZVJlbGF0aXZlUGF0aCA9IGZpbmRCb290c3RyYXBNb2R1bGVQYXRoKFxuICAgICAgaG9zdCxcbiAgICAgIGJ1aWxkVGFyZ2V0Lm9wdGlvbnMubWFpbiBhcyBzdHJpbmcsXG4gICAgKTtcbiAgICBjb25zdCBib290c3RyYXBNb2R1bGVQYXRoID0gbm9ybWFsaXplKFxuICAgICAgYC8ke3Byb2plY3Quc291cmNlUm9vdH0vJHtib290c3RyYXBNb2R1bGVSZWxhdGl2ZVBhdGh9LnRzYCxcbiAgICApO1xuXG4gICAgLy8gQWRkIEJyb3dzZXJNb2R1bGUud2l0aFNlcnZlclRyYW5zaXRpb24oKVxuICAgIGNvbnN0IGJyb3dzZXJNb2R1bGVJbXBvcnQgPSBmaW5kQnJvd3Nlck1vZHVsZUltcG9ydChob3N0LCBib290c3RyYXBNb2R1bGVQYXRoKTtcbiAgICBjb25zdCB0cmFuc2l0aW9uQ2FsbCA9IGAud2l0aFNlcnZlclRyYW5zaXRpb24oeyBhcHBJZDogJyR7b3B0aW9ucy5hcHBJZH0nIH0pYDtcbiAgICBjb25zdCBwb3NpdGlvbiA9IGJyb3dzZXJNb2R1bGVJbXBvcnQucG9zICsgYnJvd3Nlck1vZHVsZUltcG9ydC5nZXRGdWxsVGV4dCgpLmxlbmd0aDtcbiAgICBjb25zdCB0cmFuc2l0aW9uQ2FsbENoYW5nZSA9IG5ldyBJbnNlcnRDaGFuZ2UoYm9vdHN0cmFwTW9kdWxlUGF0aCwgcG9zaXRpb24sIHRyYW5zaXRpb25DYWxsKTtcblxuICAgIGNvbnN0IHRyYW5zaXRpb25DYWxsUmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKGJvb3RzdHJhcE1vZHVsZVBhdGgpO1xuICAgIHRyYW5zaXRpb25DYWxsUmVjb3JkZXIuaW5zZXJ0TGVmdCh0cmFuc2l0aW9uQ2FsbENoYW5nZS5wb3MsIHRyYW5zaXRpb25DYWxsQ2hhbmdlLnRvQWRkKTtcbiAgICBob3N0LmNvbW1pdFVwZGF0ZSh0cmFuc2l0aW9uQ2FsbFJlY29yZGVyKTtcblxuICAgIC8vIEFkZCBAbmd1bml2ZXJzYWwvY29tbW9uL2Nsb3ZlclxuICAgIGxldCBjaGFuZ2VzID0gYWRkSW1wb3J0VG9Nb2R1bGUoXG4gICAgICBnZXRTb3VyY2VGaWxlKGhvc3QsIGJvb3RzdHJhcE1vZHVsZVBhdGgpLFxuICAgICAgYm9vdHN0cmFwTW9kdWxlUGF0aCxcbiAgICAgICdSZW5kZXJlck1vZHVsZS5mb3JSb290KCknLFxuICAgICAgJ0BuZ3VuaXZlcnNhbC9jb21tb24vY2xvdmVyJyxcbiAgICApO1xuICAgIGxldCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUoYm9vdHN0cmFwTW9kdWxlUGF0aCk7XG4gICAgYXBwbHlUb1VwZGF0ZVJlY29yZGVyKHJlY29yZGVyLCBjaGFuZ2VzKTtcbiAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG5cbiAgICBjaGFuZ2VzID0gYWRkSW1wb3J0VG9Nb2R1bGUoXG4gICAgICBnZXRTb3VyY2VGaWxlKGhvc3QsIGJvb3RzdHJhcE1vZHVsZVBhdGgpLFxuICAgICAgYm9vdHN0cmFwTW9kdWxlUGF0aCxcbiAgICAgICdUcmFuc2Zlckh0dHBDYWNoZU1vZHVsZScsXG4gICAgICAnQG5ndW5pdmVyc2FsL2NvbW1vbi9jbG92ZXInLFxuICAgICk7XG4gICAgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKGJvb3RzdHJhcE1vZHVsZVBhdGgpO1xuICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgY2hhbmdlcyk7XG4gICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICB9O1xufVxuXG5mdW5jdGlvbiByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QocHJvamVjdFJvb3Q6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGNvbnN0IG5vcm1hbGl6ZWRQYXRoID0gc3BsaXQobm9ybWFsaXplKHByb2plY3RSb290IHx8ICcnKSk7XG5cbiAgaWYgKG5vcm1hbGl6ZWRQYXRoLmxlbmd0aCA9PT0gMCB8fCAhbm9ybWFsaXplZFBhdGhbMF0pIHtcbiAgICByZXR1cm4gJy4nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBub3JtYWxpemVkUGF0aC5tYXAoKCkgPT4gJy4uJykuam9pbignLycpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRCcm93c2VyTW9kdWxlSW1wb3J0KGhvc3Q6IFRyZWUsIG1vZHVsZVBhdGg6IHN0cmluZyk6IHRzLk5vZGUge1xuICBjb25zdCBzb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICBjb25zdCBkZWNvcmF0b3JNZXRhZGF0YSA9IGdldERlY29yYXRvck1ldGFkYXRhKHNvdXJjZSwgJ05nTW9kdWxlJywgJ0Bhbmd1bGFyL2NvcmUnKVswXTtcbiAgY29uc3QgYnJvd3Nlck1vZHVsZU5vZGUgPSBmaW5kTm9kZShkZWNvcmF0b3JNZXRhZGF0YSwgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyLCAnQnJvd3Nlck1vZHVsZScpO1xuXG4gIGlmICghYnJvd3Nlck1vZHVsZU5vZGUpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ2Fubm90IGZpbmQgQnJvd3Nlck1vZHVsZSBpbXBvcnQgaW4gJHttb2R1bGVQYXRofWApO1xuICB9XG5cbiAgcmV0dXJuIGJyb3dzZXJNb2R1bGVOb2RlO1xufVxuXG5mdW5jdGlvbiBnZXRTb3VyY2VGaWxlKGhvc3Q6IFRyZWUsIHBhdGg6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQocGF0aCk7XG4gIGlmICghYnVmZmVyKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCBmaW5kICR7cGF0aH0uYCk7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IGJ1ZmZlci50b1N0cmluZygpO1xuICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIGNvbnRlbnQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuXG4gIHJldHVybiBzb3VyY2U7XG59XG4iXX0=