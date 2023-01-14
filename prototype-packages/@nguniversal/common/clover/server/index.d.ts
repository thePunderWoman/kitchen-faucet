export declare class Engine {
    private readonly fileExistsCache;
    private readonly htmlFileCache;
    private readonly resourceLoaderCache;
    private readonly inlineCriticalCssProcessor;
    render(options: RenderOptions): Promise<string>;
    private getPrerenderedSnapshot;
    private getHtmlTemplate;
    private fileExists;
    private readHTMLFile;
}


export declare interface RenderOptions {
    headers?: Record<string, string | undefined | string[]>;
    url: string;
    inlineCriticalCss?: boolean;
    htmlFilename?: string;
    publicPath: string;
}

export { }
