/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext } from '@angular-devkit/architect';
import { BrowserBuilderOptions } from '@angular-devkit/build-angular';
import { PrerenderBuilderOptions } from './models';
/**
 * Returns the union of routes, the contents of routesFile if given,
 * and the static routes extracted if guessRoutes is set to true.
 */
export declare function getRoutes(options: PrerenderBuilderOptions, tsConfigPath: string | undefined, context: BuilderContext): Promise<string[]>;
/**
 * Evenly shards items in an array.
 * e.g. shardArray([1, 2, 3, 4], 2) => [[1, 2], [3, 4]]
 */
export declare function shardArray<T>(items: T[], maxNoOfShards?: number): T[][];
/**
 * Returns the name of the index file outputted by the browser builder.
 */
export declare function getIndexOutputFile(options: BrowserBuilderOptions): string;
