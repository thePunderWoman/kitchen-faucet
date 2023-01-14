import { RenderOptions as RenderOptions_2 } from '@nguniversal/common/engine';
import type { Request as Request_2 } from 'express';
import type { Response as Response_2 } from 'express';

/**
 * This is an express engine for handling Angular Applications
 */
export declare function ngExpressEngine(setupOptions: Readonly<NgSetupOptions>): (filePath: string, options: object, callback: (err?: Error | null, html?: string) => void) => void;

/**
 * These are the allowed options for the engine
 */
export declare interface NgSetupOptions extends Pick<RenderOptions_2, 'providers' | 'publicPath' | 'inlineCriticalCss'> {
    bootstrap: NonNullable<RenderOptions_2['bootstrap']>;
}

/**
 * These are the allowed options for the render
 */
export declare interface RenderOptions extends RenderOptions_2 {
    req: Request_2;
    res?: Response_2;
}

export { }
