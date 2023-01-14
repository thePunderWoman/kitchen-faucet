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
import { SchematicsException } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import * as ts from 'typescript';
export function getProject(host, projectName) {
    return __awaiter(this, void 0, void 0, function* () {
        const workspace = yield readWorkspace(host);
        const project = workspace.projects.get(projectName);
        if (!project || project.extensions.projectType !== 'application') {
            throw new SchematicsException(`Universal requires a project type of 'application'.`);
        }
        return project;
    });
}
export function stripTsExtension(file) {
    return file.replace(/\.ts$/, '');
}
export function getOutputPath(host, projectName, target) {
    return __awaiter(this, void 0, void 0, function* () {
        // Generate new output paths
        const project = yield getProject(host, projectName);
        const serverTarget = project.targets.get(target);
        if (!serverTarget || !serverTarget.options) {
            throw new SchematicsException(`Cannot find 'options' for ${projectName} ${target} target.`);
        }
        const { outputPath } = serverTarget.options;
        if (typeof outputPath !== 'string') {
            throw new SchematicsException(`outputPath for ${projectName} ${target} target is not a string.`);
        }
        return outputPath;
    });
}
export function findImport(sourceFile, moduleName, symbolName) {
    // Only look through the top-level imports.
    for (const node of sourceFile.statements) {
        if (!ts.isImportDeclaration(node) ||
            !ts.isStringLiteral(node.moduleSpecifier) ||
            node.moduleSpecifier.text !== moduleName) {
            continue;
        }
        const namedBindings = node.importClause && node.importClause.namedBindings;
        if (!namedBindings || !ts.isNamedImports(namedBindings)) {
            continue;
        }
        if (namedBindings.elements.some((element) => element.name.text === symbolName)) {
            return namedBindings;
        }
    }
    return null;
}
/** Gets import information about the specified identifier by using the Type checker. */
export function getImportOfIdentifier(typeChecker, node) {
    const symbol = typeChecker.getSymbolAtLocation(node);
    if (!symbol || !symbol.declarations.length) {
        return null;
    }
    const decl = symbol.declarations[0];
    if (!ts.isImportSpecifier(decl)) {
        return null;
    }
    const importDecl = decl.parent.parent.parent;
    if (!ts.isStringLiteral(importDecl.moduleSpecifier)) {
        return null;
    }
    return {
        // Handles aliased imports: e.g. "import {Component as myComp} from ...";
        name: decl.propertyName ? decl.propertyName.text : decl.name.text,
        importModule: importDecl.moduleSpecifier.text,
        node: importDecl,
    };
}
export function addInitialNavigation(node) {
    const existingOptions = node.arguments[1];
    // If the user has explicitly set initialNavigation, we respect that
    if (existingOptions &&
        existingOptions.properties.some((exp) => ts.isPropertyAssignment(exp) &&
            ts.isIdentifier(exp.name) &&
            exp.name.text === 'initialNavigation')) {
        return node;
    }
    const enabledLiteral = ts.createStringLiteral('enabledBlocking');
    // TypeScript will emit the Node with double quotes.
    // In schematics we usually write code with a single quotes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enabledLiteral.singleQuote = true;
    const initialNavigationProperty = ts.createPropertyAssignment('initialNavigation', enabledLiteral);
    const routerOptions = existingOptions
        ? ts.updateObjectLiteral(existingOptions, ts.createNodeArray([...existingOptions.properties, initialNavigationProperty]))
        : ts.createObjectLiteral([initialNavigationProperty], true);
    const args = [node.arguments[0], routerOptions];
    return ts.createCall(node.expression, node.typeArguments, args);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9tb2R1bGVzL2V4cHJlc3MtZW5naW5lL3NjaGVtYXRpY3MvdXRpbHMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBR0gsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzVELE9BQU8sS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRWpDLE1BQU0sVUFBZ0IsVUFBVSxDQUM5QixJQUFVLEVBQ1YsV0FBbUI7O1FBRW5CLE1BQU0sU0FBUyxHQUFHLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRXBELElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEtBQUssYUFBYSxFQUFFO1lBQ2hFLE1BQU0sSUFBSSxtQkFBbUIsQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO1NBQ3RGO1FBRUQsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUFBO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLElBQVk7SUFDM0MsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBRUQsTUFBTSxVQUFnQixhQUFhLENBQ2pDLElBQVUsRUFDVixXQUFtQixFQUNuQixNQUEwQjs7UUFFMUIsNEJBQTRCO1FBQzVCLE1BQU0sT0FBTyxHQUFHLE1BQU0sVUFBVSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNwRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFN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RUFBRSxDQUNOLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUM7WUFDNUIsRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ3pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLG1CQUFtQixDQUN4QyxFQUNEO1FBQ0EsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVELE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2pFLG9EQUFvRDtJQUNwRCwyREFBMkQ7SUFDM0QsOERBQThEO0lBQzdELGNBQXNCLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztJQUUzQyxNQUFNLHlCQUF5QixHQUFHLEVBQUUsQ0FBQyx3QkFBd0IsQ0FDM0QsbUJBQW1CLEVBQ25CLGNBQWMsQ0FDZixDQUFDO0lBQ0YsTUFBTSxhQUFhLEdBQUcsZUFBZTtRQUNuQyxDQUFDLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUNwQixlQUFlLEVBQ2YsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsZUFBZSxDQUFDLFVBQVUsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDLENBQy9FO1FBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBRWhELE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyB3b3Jrc3BhY2VzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgU2NoZW1hdGljc0V4Y2VwdGlvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IFRyZWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy9zcmMvdHJlZS9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgcmVhZFdvcmtzcGFjZSB9IGZyb20gJ0BzY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFByb2plY3QoXG4gIGhvc3Q6IFRyZWUsXG4gIHByb2plY3ROYW1lOiBzdHJpbmcsXG4pOiBQcm9taXNlPHdvcmtzcGFjZXMuUHJvamVjdERlZmluaXRpb24+IHtcbiAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgcmVhZFdvcmtzcGFjZShob3N0KTtcbiAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdE5hbWUpO1xuXG4gIGlmICghcHJvamVjdCB8fCBwcm9qZWN0LmV4dGVuc2lvbnMucHJvamVjdFR5cGUgIT09ICdhcHBsaWNhdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgVW5pdmVyc2FsIHJlcXVpcmVzIGEgcHJvamVjdCB0eXBlIG9mICdhcHBsaWNhdGlvbicuYCk7XG4gIH1cblxuICByZXR1cm4gcHJvamVjdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwVHNFeHRlbnNpb24oZmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGZpbGUucmVwbGFjZSgvXFwudHMkLywgJycpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0T3V0cHV0UGF0aChcbiAgaG9zdDogVHJlZSxcbiAgcHJvamVjdE5hbWU6IHN0cmluZyxcbiAgdGFyZ2V0OiAnc2VydmVyJyB8ICdidWlsZCcsXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICAvLyBHZW5lcmF0ZSBuZXcgb3V0cHV0IHBhdGhzXG4gIGNvbnN0IHByb2plY3QgPSBhd2FpdCBnZXRQcm9qZWN0KGhvc3QsIHByb2plY3ROYW1lKTtcbiAgY29uc3Qgc2VydmVyVGFyZ2V0ID0gcHJvamVjdC50YXJnZXRzLmdldCh0YXJnZXQpO1xuICBpZiAoIXNlcnZlclRhcmdldCB8fCAhc2VydmVyVGFyZ2V0Lm9wdGlvbnMpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ2Fubm90IGZpbmQgJ29wdGlvbnMnIGZvciAke3Byb2plY3ROYW1lfSAke3RhcmdldH0gdGFyZ2V0LmApO1xuICB9XG5cbiAgY29uc3QgeyBvdXRwdXRQYXRoIH0gPSBzZXJ2ZXJUYXJnZXQub3B0aW9ucztcbiAgaWYgKHR5cGVvZiBvdXRwdXRQYXRoICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgYG91dHB1dFBhdGggZm9yICR7cHJvamVjdE5hbWV9ICR7dGFyZ2V0fSB0YXJnZXQgaXMgbm90IGEgc3RyaW5nLmAsXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBvdXRwdXRQYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZEltcG9ydChcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgbW9kdWxlTmFtZTogc3RyaW5nLFxuICBzeW1ib2xOYW1lOiBzdHJpbmcsXG4pOiB0cy5OYW1lZEltcG9ydHMgfCBudWxsIHtcbiAgLy8gT25seSBsb29rIHRocm91Z2ggdGhlIHRvcC1sZXZlbCBpbXBvcnRzLlxuICBmb3IgKGNvbnN0IG5vZGUgb2Ygc291cmNlRmlsZS5zdGF0ZW1lbnRzKSB7XG4gICAgaWYgKFxuICAgICAgIXRzLmlzSW1wb3J0RGVjbGFyYXRpb24obm9kZSkgfHxcbiAgICAgICF0cy5pc1N0cmluZ0xpdGVyYWwobm9kZS5tb2R1bGVTcGVjaWZpZXIpIHx8XG4gICAgICBub2RlLm1vZHVsZVNwZWNpZmllci50ZXh0ICE9PSBtb2R1bGVOYW1lXG4gICAgKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBuYW1lZEJpbmRpbmdzID0gbm9kZS5pbXBvcnRDbGF1c2UgJiYgbm9kZS5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncztcblxuICAgIGlmICghbmFtZWRCaW5kaW5ncyB8fCAhdHMuaXNOYW1lZEltcG9ydHMobmFtZWRCaW5kaW5ncykpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChuYW1lZEJpbmRpbmdzLmVsZW1lbnRzLnNvbWUoKGVsZW1lbnQpID0+IGVsZW1lbnQubmFtZS50ZXh0ID09PSBzeW1ib2xOYW1lKSkge1xuICAgICAgcmV0dXJuIG5hbWVkQmluZGluZ3M7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCB0eXBlIEltcG9ydCA9IHtcbiAgbmFtZTogc3RyaW5nO1xuICBpbXBvcnRNb2R1bGU6IHN0cmluZztcbiAgbm9kZTogdHMuSW1wb3J0RGVjbGFyYXRpb247XG59O1xuXG4vKiogR2V0cyBpbXBvcnQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHNwZWNpZmllZCBpZGVudGlmaWVyIGJ5IHVzaW5nIHRoZSBUeXBlIGNoZWNrZXIuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKFxuICB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gIG5vZGU6IHRzLklkZW50aWZpZXIsXG4pOiBJbXBvcnQgfCBudWxsIHtcbiAgY29uc3Qgc3ltYm9sID0gdHlwZUNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlKTtcblxuICBpZiAoIXN5bWJvbCB8fCAhc3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGgpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGRlY2wgPSBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuXG4gIGlmICghdHMuaXNJbXBvcnRTcGVjaWZpZXIoZGVjbCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGltcG9ydERlY2wgPSBkZWNsLnBhcmVudC5wYXJlbnQucGFyZW50O1xuXG4gIGlmICghdHMuaXNTdHJpbmdMaXRlcmFsKGltcG9ydERlY2wubW9kdWxlU3BlY2lmaWVyKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAvLyBIYW5kbGVzIGFsaWFzZWQgaW1wb3J0czogZS5nLiBcImltcG9ydCB7Q29tcG9uZW50IGFzIG15Q29tcH0gZnJvbSAuLi5cIjtcbiAgICBuYW1lOiBkZWNsLnByb3BlcnR5TmFtZSA/IGRlY2wucHJvcGVydHlOYW1lLnRleHQgOiBkZWNsLm5hbWUudGV4dCxcbiAgICBpbXBvcnRNb2R1bGU6IGltcG9ydERlY2wubW9kdWxlU3BlY2lmaWVyLnRleHQsXG4gICAgbm9kZTogaW1wb3J0RGVjbCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFkZEluaXRpYWxOYXZpZ2F0aW9uKG5vZGU6IHRzLkNhbGxFeHByZXNzaW9uKTogdHMuQ2FsbEV4cHJlc3Npb24ge1xuICBjb25zdCBleGlzdGluZ09wdGlvbnMgPSBub2RlLmFyZ3VtZW50c1sxXSBhcyB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB8IHVuZGVmaW5lZDtcblxuICAvLyBJZiB0aGUgdXNlciBoYXMgZXhwbGljaXRseSBzZXQgaW5pdGlhbE5hdmlnYXRpb24sIHdlIHJlc3BlY3QgdGhhdFxuICBpZiAoXG4gICAgZXhpc3RpbmdPcHRpb25zICYmXG4gICAgZXhpc3RpbmdPcHRpb25zLnByb3BlcnRpZXMuc29tZShcbiAgICAgIChleHApID0+XG4gICAgICAgIHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KGV4cCkgJiZcbiAgICAgICAgdHMuaXNJZGVudGlmaWVyKGV4cC5uYW1lKSAmJlxuICAgICAgICBleHAubmFtZS50ZXh0ID09PSAnaW5pdGlhbE5hdmlnYXRpb24nLFxuICAgIClcbiAgKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICBjb25zdCBlbmFibGVkTGl0ZXJhbCA9IHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoJ2VuYWJsZWRCbG9ja2luZycpO1xuICAvLyBUeXBlU2NyaXB0IHdpbGwgZW1pdCB0aGUgTm9kZSB3aXRoIGRvdWJsZSBxdW90ZXMuXG4gIC8vIEluIHNjaGVtYXRpY3Mgd2UgdXN1YWxseSB3cml0ZSBjb2RlIHdpdGggYSBzaW5nbGUgcXVvdGVzXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIChlbmFibGVkTGl0ZXJhbCBhcyBhbnkpLnNpbmdsZVF1b3RlID0gdHJ1ZTtcblxuICBjb25zdCBpbml0aWFsTmF2aWdhdGlvblByb3BlcnR5ID0gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICdpbml0aWFsTmF2aWdhdGlvbicsXG4gICAgZW5hYmxlZExpdGVyYWwsXG4gICk7XG4gIGNvbnN0IHJvdXRlck9wdGlvbnMgPSBleGlzdGluZ09wdGlvbnNcbiAgICA/IHRzLnVwZGF0ZU9iamVjdExpdGVyYWwoXG4gICAgICAgIGV4aXN0aW5nT3B0aW9ucyxcbiAgICAgICAgdHMuY3JlYXRlTm9kZUFycmF5KFsuLi5leGlzdGluZ09wdGlvbnMucHJvcGVydGllcywgaW5pdGlhbE5hdmlnYXRpb25Qcm9wZXJ0eV0pLFxuICAgICAgKVxuICAgIDogdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChbaW5pdGlhbE5hdmlnYXRpb25Qcm9wZXJ0eV0sIHRydWUpO1xuICBjb25zdCBhcmdzID0gW25vZGUuYXJndW1lbnRzWzBdLCByb3V0ZXJPcHRpb25zXTtcblxuICByZXR1cm4gdHMuY3JlYXRlQ2FsbChub2RlLmV4cHJlc3Npb24sIG5vZGUudHlwZUFyZ3VtZW50cywgYXJncyk7XG59XG4iXX0=