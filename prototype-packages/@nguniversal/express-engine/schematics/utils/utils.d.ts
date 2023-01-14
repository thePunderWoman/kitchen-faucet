/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { workspaces } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics/src/tree/interface';
import * as ts from 'typescript';
export declare function getProject(host: Tree, projectName: string): Promise<workspaces.ProjectDefinition>;
export declare function stripTsExtension(file: string): string;
export declare function getOutputPath(host: Tree, projectName: string, target: 'server' | 'build'): Promise<string>;
export declare function findImport(sourceFile: ts.SourceFile, moduleName: string, symbolName: string): ts.NamedImports | null;
export type Import = {
    name: string;
    importModule: string;
    node: ts.ImportDeclaration;
};
/** Gets import information about the specified identifier by using the Type checker. */
export declare function getImportOfIdentifier(typeChecker: ts.TypeChecker, node: ts.Identifier): Import | null;
export declare function addInitialNavigation(node: ts.CallExpression): ts.CallExpression;
