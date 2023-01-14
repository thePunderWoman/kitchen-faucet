
declare interface InlineCriticalCssProcessOptions {
    outputPath?: string;
}

declare interface InlineCriticalCssProcessorOptions {
    minify?: boolean;
    deployUrl?: string;
}

declare interface InlineCriticalCssResult {
    content: string;
    warnings?: string[];
    errors?: string[];
}

export declare class ɵInlineCriticalCssProcessor {
    protected readonly options: InlineCriticalCssProcessorOptions;
    private readonly resourceCache;
    constructor(options: InlineCriticalCssProcessorOptions);
    process(html: string, options: InlineCriticalCssProcessOptions): Promise<InlineCriticalCssResult>;
}

export { }
