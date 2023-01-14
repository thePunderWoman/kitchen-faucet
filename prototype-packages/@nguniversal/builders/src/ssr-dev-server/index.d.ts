/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { Observable } from 'rxjs';
import { Schema } from './schema';
export type SSRDevServerBuilderOptions = Schema & json.JsonObject;
export type SSRDevServerBuilderOutput = BuilderOutput & {
    baseUrl?: string;
};
export declare function execute(options: SSRDevServerBuilderOptions, context: BuilderContext): Observable<SSRDevServerBuilderOutput>;
declare const _default: import("@angular-devkit/architect/src/internal").Builder<Schema & json.JsonObject>;
export default _default;
