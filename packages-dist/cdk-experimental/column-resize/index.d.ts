import { AfterViewInit } from '@angular/core';
import { CdkColumnDef } from '@angular/cdk/table';
import { CdkTable } from '@angular/cdk/table';
import { ChangeDetectorRef } from '@angular/core';
import { _CoalescedStyleScheduler } from '@angular/cdk/table';
import { Directionality } from '@angular/cdk/bidi';
import { ElementRef } from '@angular/core';
import * as i0 from '@angular/core';
import { Injector } from '@angular/core';
import { NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { OnDestroy } from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';
import { OverlayRef } from '@angular/cdk/overlay';
import { Provider } from '@angular/core';
import { Subject } from 'rxjs';
import { Type } from '@angular/core';
import { ViewContainerRef } from '@angular/core';

/**
 * Explicitly enables column resizing for a table-based cdk-table.
 * Individual columns must be annotated specifically.
 */
export declare class CdkColumnResize extends ColumnResize {
    readonly columnResizeNotifier: ColumnResizeNotifier;
    readonly elementRef: ElementRef<HTMLElement>;
    protected readonly eventDispatcher: HeaderRowEventDispatcher;
    protected readonly ngZone: NgZone;
    protected readonly notifier: ColumnResizeNotifierSource;
    protected readonly table: CdkTable<unknown>;
    constructor(columnResizeNotifier: ColumnResizeNotifier, elementRef: ElementRef<HTMLElement>, eventDispatcher: HeaderRowEventDispatcher, ngZone: NgZone, notifier: ColumnResizeNotifierSource, table: CdkTable<unknown>);
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkColumnResize, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<CdkColumnResize, "table[cdk-table][columnResize]", never, {}, {}, never, never, false, never>;
}

/**
 * One of two NgModules for use with CdkColumnResize.
 * When using this module, columns are resizable by default.
 */
export declare class CdkColumnResizeDefaultEnabledModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkColumnResizeDefaultEnabledModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<CdkColumnResizeDefaultEnabledModule, [typeof i1.CdkDefaultEnabledColumnResize, typeof i2.CdkDefaultEnabledColumnResizeFlex], never, [typeof i1.CdkDefaultEnabledColumnResize, typeof i2.CdkDefaultEnabledColumnResizeFlex]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<CdkColumnResizeDefaultEnabledModule>;
}

/**
 * Explicitly enables column resizing for a flexbox-based cdk-table.
 * Individual columns must be annotated specifically.
 */
export declare class CdkColumnResizeFlex extends ColumnResize {
    readonly columnResizeNotifier: ColumnResizeNotifier;
    readonly elementRef: ElementRef<HTMLElement>;
    protected readonly eventDispatcher: HeaderRowEventDispatcher;
    protected readonly ngZone: NgZone;
    protected readonly notifier: ColumnResizeNotifierSource;
    protected readonly table: CdkTable<unknown>;
    constructor(columnResizeNotifier: ColumnResizeNotifier, elementRef: ElementRef<HTMLElement>, eventDispatcher: HeaderRowEventDispatcher, ngZone: NgZone, notifier: ColumnResizeNotifierSource, table: CdkTable<unknown>);
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkColumnResizeFlex, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<CdkColumnResizeFlex, "cdk-table[columnResize]", never, {}, {}, never, never, false, never>;
}

/**
 * One of two NgModules for use with CdkColumnResize.
 * When using this module, columns are not resizable by default.
 */
export declare class CdkColumnResizeModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkColumnResizeModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<CdkColumnResizeModule, [typeof i3.CdkColumnResize, typeof i4.CdkColumnResizeFlex], never, [typeof i3.CdkColumnResize, typeof i4.CdkColumnResizeFlex]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<CdkColumnResizeModule>;
}

/**
 * Implicitly enables column resizing for a table-based cdk-table.
 * Individual columns will be resizable unless opted out.
 */
export declare class CdkDefaultEnabledColumnResize extends ColumnResize {
    readonly columnResizeNotifier: ColumnResizeNotifier;
    readonly elementRef: ElementRef<HTMLElement>;
    protected readonly eventDispatcher: HeaderRowEventDispatcher;
    protected readonly ngZone: NgZone;
    protected readonly notifier: ColumnResizeNotifierSource;
    protected readonly table: CdkTable<unknown>;
    constructor(columnResizeNotifier: ColumnResizeNotifier, elementRef: ElementRef<HTMLElement>, eventDispatcher: HeaderRowEventDispatcher, ngZone: NgZone, notifier: ColumnResizeNotifierSource, table: CdkTable<unknown>);
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkDefaultEnabledColumnResize, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<CdkDefaultEnabledColumnResize, "table[cdk-table]", never, {}, {}, never, never, false, never>;
}

/**
 * Implicitly enables column resizing for a flex cdk-table.
 * Individual columns will be resizable unless opted out.
 */
export declare class CdkDefaultEnabledColumnResizeFlex extends ColumnResize {
    readonly columnResizeNotifier: ColumnResizeNotifier;
    readonly elementRef: ElementRef<HTMLElement>;
    protected readonly eventDispatcher: HeaderRowEventDispatcher;
    protected readonly ngZone: NgZone;
    protected readonly notifier: ColumnResizeNotifierSource;
    protected readonly table: CdkTable<unknown>;
    constructor(columnResizeNotifier: ColumnResizeNotifier, elementRef: ElementRef<HTMLElement>, eventDispatcher: HeaderRowEventDispatcher, ngZone: NgZone, notifier: ColumnResizeNotifierSource, table: CdkTable<unknown>);
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkDefaultEnabledColumnResizeFlex, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<CdkDefaultEnabledColumnResizeFlex, "cdk-table", never, {}, {}, never, never, false, never>;
}

/**
 * The optimally performing resize strategy for flex mat-tables.
 * Tested against and outperformed:
 *   CSS selector w/ CSS variable
 *   Updating all mat-cell nodes
 */
export declare class CdkFlexTableResizeStrategy extends ResizeStrategy implements OnDestroy {
    protected readonly columnResize: ColumnResize;
    protected readonly styleScheduler: _CoalescedStyleScheduler;
    protected readonly table: CdkTable<unknown>;
    private readonly _document;
    private readonly _columnIndexes;
    private readonly _columnProperties;
    private _styleElement?;
    private _indexSequence;
    protected readonly defaultMinSize = 0;
    protected readonly defaultMaxSize: number;
    constructor(columnResize: ColumnResize, styleScheduler: _CoalescedStyleScheduler, table: CdkTable<unknown>, document: any);
    applyColumnSize(cssFriendlyColumnName: string, columnHeader: HTMLElement, sizeInPx: number, previousSizeInPx?: number): void;
    applyMinColumnSize(cssFriendlyColumnName: string, _: HTMLElement, sizeInPx: number): void;
    applyMaxColumnSize(cssFriendlyColumnName: string, _: HTMLElement, sizeInPx: number): void;
    protected getColumnCssClass(cssFriendlyColumnName: string): string;
    ngOnDestroy(): void;
    private _getPropertyValue;
    private _getAppliedWidth;
    private _applyProperty;
    private _getStyleSheet;
    private _getColumnPropertiesMap;
    private _applySizeCss;
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkFlexTableResizeStrategy, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<CdkFlexTableResizeStrategy>;
}

/**
 * Base class for ColumnResize directives which attach to mat-table elements to
 * provide common events and services for column resizing.
 */
export declare abstract class ColumnResize implements AfterViewInit, OnDestroy {
    protected readonly destroyed: Subject<void>;
    abstract readonly columnResizeNotifier: ColumnResizeNotifier;
    abstract readonly elementRef: ElementRef<HTMLElement>;
    protected abstract readonly eventDispatcher: HeaderRowEventDispatcher;
    protected abstract readonly ngZone: NgZone;
    protected abstract readonly notifier: ColumnResizeNotifierSource;
    /** Unique ID for this table instance. */
    protected readonly selectorId: string;
    /** The id attribute of the table, if specified. */
    id?: string;
    ngAfterViewInit(): void;
    ngOnDestroy(): void;
    /** Gets the unique CSS class name for this table instance. */
    getUniqueCssClass(): string;
    /** Called when a column in the table is resized. Applies a css class to the table element. */
    setResized(): void;
    private _listenForRowHoverEvents;
    private _listenForResizeActivity;
    private _listenForHoverActivity;
    static ɵfac: i0.ɵɵFactoryDeclaration<ColumnResize, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<ColumnResize, never, never, {}, {}, never, never, false, never>;
}

/** Service for triggering column resizes imperatively or being notified of them. */
export declare class ColumnResizeNotifier {
    private readonly _source;
    /** Emits whenever a column is resized. */
    readonly resizeCompleted: Observable<ColumnSize>;
    constructor(_source: ColumnResizeNotifierSource);
    /** Instantly resizes the specified column. */
    resize(columnId: string, size: number): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<ColumnResizeNotifier, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<ColumnResizeNotifier>;
}

/**
 * Originating source of column resize events within a table.
 * @docs-private
 */
export declare class ColumnResizeNotifierSource {
    /** Emits when an in-progress resize is canceled. */
    readonly resizeCanceled: Subject<ColumnSizeAction>;
    /** Emits when a resize is applied. */
    readonly resizeCompleted: Subject<ColumnSize>;
    /** Triggers a resize action. */
    readonly triggerResize: Subject<ColumnSizeAction>;
    static ɵfac: i0.ɵɵFactoryDeclaration<ColumnResizeNotifierSource, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<ColumnResizeNotifierSource>;
}

/** Indicates the width of a column. */
export declare interface ColumnSize {
    /** The ID/name of the column, as defined in CdkColumnDef. */
    readonly columnId: string;
    /** The width in pixels of the column. */
    readonly size: number;
    /** The width in pixels of the column prior to this update, if known. */
    readonly previousSize?: number;
}

/** Interface describing column size changes. */
export declare interface ColumnSizeAction extends ColumnSize {
    /**
     * Whether the resize action should be applied instantaneously. False for events triggered during
     * a UI-triggered resize (such as with the mouse) until the mouse button is released. True
     * for all programmatically triggered resizes.
     */
    readonly completeImmediately?: boolean;
    /**
     * Whether the resize action is being applied to a sticky/stickyEnd column.
     */
    readonly isStickyColumn?: boolean;
}

/**
 * Can be provided by the host application to enable persistence of column resize state.
 */
export declare abstract class ColumnSizeStore {
    /** Returns the persisted size of the specified column in the specified table. */
    abstract getSize(tableId: string, columnId: string): number;
    /** Persists the size of the specified column in the specified table. */
    abstract setSize(tableId: string, columnId: string): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<ColumnSizeStore, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<ColumnSizeStore>;
}

export declare const FLEX_RESIZE_STRATEGY_PROVIDER: Provider;

/** Coordinates events between the column resize directives. */
export declare class HeaderRowEventDispatcher {
    private readonly _ngZone;
    /**
     * Emits the currently hovered header cell or null when no header cells are hovered.
     * Exposed publicly for events to feed in, but subscribers should use headerCellHoveredDistinct,
     * defined below.
     */
    readonly headerCellHovered: Subject<Element | null>;
    /**
     * Emits the header cell for which a user-triggered resize is active or null
     * when no resize is in progress.
     */
    readonly overlayHandleActiveForCell: Subject<Element | null>;
    constructor(_ngZone: NgZone);
    /** Distinct and shared version of headerCellHovered. */
    readonly headerCellHoveredDistinct: Observable<Element | null>;
    /**
     * Emits the header that is currently hovered or hosting an active resize event (with active
     * taking precedence).
     */
    readonly headerRowHoveredOrActiveDistinct: Observable<Element | null>;
    private readonly _headerRowHoveredOrActiveDistinctReenterZone;
    private _lastSeenRow;
    private _lastSeenRowHover;
    /**
     * Emits whether the specified row should show its overlay controls.
     * Emission occurs within the NgZone.
     */
    resizeOverlayVisibleForHeaderRow(row: Element): Observable<boolean>;
    private _enterZone;
    static ɵfac: i0.ɵɵFactoryDeclaration<HeaderRowEventDispatcher, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<HeaderRowEventDispatcher>;
}

declare namespace i1 {
    export {
        CdkDefaultEnabledColumnResize
    }
}

declare namespace i2 {
    export {
        CdkDefaultEnabledColumnResizeFlex
    }
}

declare namespace i3 {
    export {
        CdkColumnResize
    }
}

declare namespace i4 {
    export {
        CdkColumnResizeFlex
    }
}

/**
 * Base class for Resizable directives which are applied to column headers to make those columns
 * resizable.
 */
export declare abstract class Resizable<HandleComponent extends ResizeOverlayHandle> implements AfterViewInit, OnDestroy {
    protected minWidthPxInternal: number;
    protected maxWidthPxInternal: number;
    protected inlineHandle?: HTMLElement;
    protected overlayRef?: OverlayRef;
    protected readonly destroyed: Subject<void>;
    protected abstract readonly columnDef: CdkColumnDef;
    protected abstract readonly columnResize: ColumnResize;
    protected abstract readonly directionality: Directionality;
    protected abstract readonly document: Document;
    protected abstract readonly elementRef: ElementRef;
    protected abstract readonly eventDispatcher: HeaderRowEventDispatcher;
    protected abstract readonly injector: Injector;
    protected abstract readonly ngZone: NgZone;
    protected abstract readonly overlay: Overlay;
    protected abstract readonly resizeNotifier: ColumnResizeNotifierSource;
    protected abstract readonly resizeStrategy: ResizeStrategy;
    protected abstract readonly styleScheduler: _CoalescedStyleScheduler;
    protected abstract readonly viewContainerRef: ViewContainerRef;
    protected abstract readonly changeDetectorRef: ChangeDetectorRef;
    private _viewInitialized;
    private _isDestroyed;
    /** The minimum width to allow the column to be sized to. */
    get minWidthPx(): number;
    set minWidthPx(value: number);
    /** The maximum width to allow the column to be sized to. */
    get maxWidthPx(): number;
    set maxWidthPx(value: number);
    ngAfterViewInit(): void;
    ngOnDestroy(): void;
    protected abstract getInlineHandleCssClassName(): string;
    protected abstract getOverlayHandleComponentType(): Type<HandleComponent>;
    private _createOverlayForHandle;
    private _listenForRowHoverEvents;
    private _listenForResizeEvents;
    private _completeResizeOperation;
    private _cleanUpAfterResize;
    private _createHandlePortal;
    private _showHandleOverlay;
    private _updateOverlayHandleHeight;
    private _applySize;
    private _applyMinWidthPx;
    private _applyMaxWidthPx;
    private _appendInlineHandle;
    static ɵfac: i0.ɵɵFactoryDeclaration<Resizable<any>, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<Resizable<any>, never, never, {}, {}, never, never, false, never>;
}

/**
 * Base class for a component shown over the edge of a resizable column that is responsible
 * for handling column resize mouse events and displaying any visible UI on the column edge.
 */
export declare abstract class ResizeOverlayHandle implements AfterViewInit, OnDestroy {
    protected readonly destroyed: Subject<void>;
    protected abstract readonly columnDef: CdkColumnDef;
    protected abstract readonly document: Document;
    protected abstract readonly directionality: Directionality;
    protected abstract readonly elementRef: ElementRef;
    protected abstract readonly eventDispatcher: HeaderRowEventDispatcher;
    protected abstract readonly ngZone: NgZone;
    protected abstract readonly resizeNotifier: ColumnResizeNotifierSource;
    protected abstract readonly resizeRef: ResizeRef;
    protected abstract readonly styleScheduler: _CoalescedStyleScheduler;
    ngAfterViewInit(): void;
    ngOnDestroy(): void;
    private _listenForMouseEvents;
    private _dragStarted;
    protected updateResizeActive(active: boolean): void;
    private _getOriginWidth;
    private _getOriginOffset;
    private _updateOverlayOffset;
    private _isLtr;
    private _notifyResizeEnded;
    static ɵfac: i0.ɵɵFactoryDeclaration<ResizeOverlayHandle, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<ResizeOverlayHandle, never, never, {}, {}, never, never, false, never>;
}

/** Tracks state of resize events in progress. */
export declare class ResizeRef {
    readonly origin: ElementRef;
    readonly overlayRef: OverlayRef;
    readonly minWidthPx: number;
    readonly maxWidthPx: number;
    constructor(origin: ElementRef, overlayRef: OverlayRef, minWidthPx: number, maxWidthPx: number);
}

/**
 * Provides an implementation for resizing a column.
 * The details of how resizing works for tables for flex mat-tables are quite different.
 */
export declare abstract class ResizeStrategy {
    protected abstract readonly columnResize: ColumnResize;
    protected abstract readonly styleScheduler: _CoalescedStyleScheduler;
    protected abstract readonly table: CdkTable<unknown>;
    private _pendingResizeDelta;
    /** Updates the width of the specified column. */
    abstract applyColumnSize(cssFriendlyColumnName: string, columnHeader: HTMLElement, sizeInPx: number, previousSizeInPx?: number): void;
    /** Applies a minimum width to the specified column, updating its current width as needed. */
    abstract applyMinColumnSize(cssFriendlyColumnName: string, columnHeader: HTMLElement, minSizeInPx: number): void;
    /** Applies a maximum width to the specified column, updating its current width as needed. */
    abstract applyMaxColumnSize(cssFriendlyColumnName: string, columnHeader: HTMLElement, minSizeInPx: number): void;
    /** Adjusts the width of the table element by the specified delta. */
    protected updateTableWidthAndStickyColumns(delta: number): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<ResizeStrategy, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<ResizeStrategy>;
}

export declare const TABLE_LAYOUT_FIXED_RESIZE_STRATEGY_PROVIDER: Provider;

/**
 * The optimally performing resize strategy for &lt;table&gt; elements with table-layout: fixed.
 * Tested against and outperformed:
 *   CSS selector
 *   CSS selector w/ CSS variable
 *   Updating all cell nodes
 */
export declare class TableLayoutFixedResizeStrategy extends ResizeStrategy {
    protected readonly columnResize: ColumnResize;
    protected readonly styleScheduler: _CoalescedStyleScheduler;
    protected readonly table: CdkTable<unknown>;
    constructor(columnResize: ColumnResize, styleScheduler: _CoalescedStyleScheduler, table: CdkTable<unknown>);
    applyColumnSize(_: string, columnHeader: HTMLElement, sizeInPx: number, previousSizeInPx?: number): void;
    applyMinColumnSize(_: string, columnHeader: HTMLElement, sizeInPx: number): void;
    applyMaxColumnSize(_: string, columnHeader: HTMLElement, sizeInPx: number): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<TableLayoutFixedResizeStrategy, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<TableLayoutFixedResizeStrategy>;
}

export { }
