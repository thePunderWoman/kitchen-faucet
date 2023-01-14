import type { StaticProvider } from '@angular/core';
import type { Type } from '@angular/core';

/**
 * A common rendering engine utility. This abstracts the logic
 * for handling the platformServer compiler, the module cache, and
 * the document loader
 */
export declare class CommonEngine {
    private module?;
    private providers;
    private readonly templateCache;
    private readonly inlineCriticalCssProcessor;
    private readonly pageExists;
    constructor(module?: Type<{}> | undefined, providers?: StaticProvider[]);
    /**
     * Render an HTML document for a specific URL with specified
     * render options
     */
    render(opts: RenderOptions): Promise<string>;
    /** Retrieve the document from the cache or the filesystem */
    private getDocument;
}

/** These are the allowed options for the render */
export declare interface RenderOptions {
    bootstrap?: Type<{}>;
    providers?: StaticProvider[];
    url?: string;
    document?: string;
    documentFilePath?: string;
    /**
     * Reduce render blocking requests by inlining critical CSS.
     * Defaults to true.
     */
    inlineCriticalCss?: boolean;
    /**
     * Base path location of index file.
     * Defaults to the 'documentFilePath' dirname when not provided.
     */
    publicPath?: string;
}

export { }
