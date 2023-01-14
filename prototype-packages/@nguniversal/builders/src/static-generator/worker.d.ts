/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface RenderOptions {
    inlineCriticalCss?: boolean;
    outputPath: string;
    route: string;
    port: number;
}
export declare function render({ inlineCriticalCss, outputPath, route, port, }: RenderOptions): Promise<void>;
