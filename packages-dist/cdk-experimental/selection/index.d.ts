import { AfterContentChecked } from '@angular/core';
import { BooleanInput } from '@angular/cdk/coercion';
import { CdkTable } from '@angular/cdk/table';
import { CollectionViewer } from '@angular/cdk/collections';
import { ControlValueAccessor } from '@angular/forms';
import { DataSource } from '@angular/cdk/collections';
import { EventEmitter } from '@angular/core';
import * as i0 from '@angular/core';
import * as i6 from '@angular/common';
import * as i7 from '@angular/cdk/table';
import { ListRange } from '@angular/cdk/collections';
import { NumberInput } from '@angular/cdk/coercion';
import { Observable } from 'rxjs';
import { OnDestroy } from '@angular/core';
import { OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { TrackByFunction } from '@angular/core';

/**
 * Applies `cdk-selected` class and `aria-selected` to an element.
 *
 * Must be used within a parent `CdkSelection` directive.
 * Must be provided with the value. The index is required if `trackBy` is used on the `CdkSelection`
 * directive.
 */
export declare class CdkRowSelection<T> {
    readonly _selection: CdkSelection<T>;
    value: T;
    get index(): number | undefined;
    set index(index: NumberInput);
    protected _index?: number;
    constructor(_selection: CdkSelection<T>);
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkRowSelection<any>, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<CdkRowSelection<any>, "[cdkRowSelection]", never, { "value": "cdkRowSelectionValue"; "index": "cdkRowSelectionIndex"; }, {}, never, never, false, never>;
}

/**
 * Makes the element a select-all toggle.
 *
 * Must be used within a parent `CdkSelection` directive. It toggles the selection states
 * of all the selection toggles connected with the `CdkSelection` directive.
 * If the element implements `ControlValueAccessor`, e.g. `MatCheckbox`, the directive
 * automatically connects it with the select-all state provided by the `CdkSelection` directive. If
 * not, use `checked$` to get the checked state, `indeterminate$` to get the indeterminate state,
 * and `toggle()` to change the selection state.
 */
export declare class CdkSelectAll<T> implements OnDestroy, OnInit {
    private readonly _selection;
    private readonly _controlValueAccessor;
    /**
     * The checked state of the toggle.
     * Resolves to `true` if all the values are selected, `false` if no value is selected.
     */
    readonly checked: Observable<boolean>;
    /**
     * The indeterminate state of the toggle.
     * Resolves to `true` if part (not all) of the values are selected, `false` if all values or no
     * value at all are selected.
     */
    readonly indeterminate: Observable<boolean>;
    /**
     * Toggles the select-all state.
     * @param event The click event if the toggle is triggered by a (mouse or keyboard) click. If
     *     using with a native `<input type="checkbox">`, the parameter is required for the
     *     indeterminate state to work properly.
     */
    toggle(event?: MouseEvent): void;
    private readonly _destroyed;
    constructor(_selection: CdkSelection<T>, _controlValueAccessor: ControlValueAccessor[]);
    ngOnInit(): void;
    private _configureControlValueAccessor;
    private _assertValidParentSelection;
    ngOnDestroy(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkSelectAll<any>, [{ optional: true; }, { optional: true; self: true; }]>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<CdkSelectAll<any>, "[cdkSelectAll]", ["cdkSelectAll"], {}, {}, never, never, false, never>;
}

/**
 * Manages the selection states of the items and provides methods to check and update the selection
 * states.
 * It must be applied to the parent element if `cdkSelectionToggle`, `cdkSelectAll`,
 * `cdkRowSelection` and `cdkSelectionColumn` are applied.
 */
export declare class CdkSelection<T> implements OnInit, AfterContentChecked, CollectionViewer, OnDestroy {
    viewChange: Observable<ListRange>;
    get dataSource(): TableDataSource<T>;
    set dataSource(dataSource: TableDataSource<T>);
    private _dataSource;
    trackByFn: TrackByFunction<T>;
    /** Whether to support multiple selection */
    get multiple(): boolean;
    set multiple(multiple: BooleanInput);
    protected _multiple: boolean;
    /** Emits when selection changes. */
    readonly change: EventEmitter<SelectionChange<T>>;
    /** Latest data provided by the data source. */
    private _data;
    /** Subscription that listens for the data provided by the data source.  */
    private _renderChangeSubscription;
    private _destroyed;
    private _selection;
    private _switchDataSource;
    private _observeRenderChanges;
    ngOnInit(): void;
    ngAfterContentChecked(): void;
    ngOnDestroy(): void;
    /** Toggles selection for a given value. `index` is required if `trackBy` is used. */
    toggleSelection(value: T, index?: number): void;
    /**
     * Toggles select-all. If no value is selected, select all values. If all values or some of the
     * values are selected, de-select all values.
     */
    toggleSelectAll(): void;
    /** Checks whether a value is selected. `index` is required if `trackBy` is used. */
    isSelected(value: T, index?: number): boolean;
    /** Checks whether all values are selected. */
    isAllSelected(): boolean;
    /** Checks whether partially selected. */
    isPartialSelected(): boolean;
    private _selectAll;
    private _clearAll;
    private _updateSelectAllState;
    selectAllState: SelectAllState;
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkSelection<any>, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<CdkSelection<any>, "[cdkSelection]", ["cdkSelection"], { "dataSource": "dataSource"; "trackByFn": "trackBy"; "multiple": "cdkSelectionMultiple"; }, { "change": "cdkSelectionChange"; }, never, never, false, never>;
}

/**
 * Column that adds row selecting checkboxes and a select-all checkbox if `cdkSelectionMultiple` is
 * `true`.
 *
 * Must be used within a parent `CdkSelection` directive.
 */
export declare class CdkSelectionColumn<T> implements OnInit, OnDestroy {
    private _table;
    readonly selection: CdkSelection<T>;
    /** Column name that should be used to reference this column. */
    get name(): string;
    set name(name: string);
    private _name;
    private readonly _columnDef;
    private readonly _cell;
    private readonly _headerCell;
    constructor(_table: CdkTable<T>, selection: CdkSelection<T>);
    ngOnInit(): void;
    ngOnDestroy(): void;
    private _syncColumnDefName;
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkSelectionColumn<any>, [{ optional: true; }, { optional: true; }]>;
    static ɵcmp: i0.ɵɵComponentDeclaration<CdkSelectionColumn<any>, "cdk-selection-column", never, { "name": "cdkSelectionColumnName"; }, {}, never, never, false, never>;
}

export declare class CdkSelectionModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkSelectionModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<CdkSelectionModule, [typeof i1.CdkSelection, typeof i2.CdkSelectionToggle, typeof i3.CdkSelectAll, typeof i4.CdkSelectionColumn, typeof i5.CdkRowSelection], [typeof i6.CommonModule, typeof i7.CdkTableModule], [typeof i1.CdkSelection, typeof i2.CdkSelectionToggle, typeof i3.CdkSelectAll, typeof i4.CdkSelectionColumn, typeof i5.CdkRowSelection]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<CdkSelectionModule>;
}

/**
 * Makes the element a selection toggle.
 *
 * Must be used within a parent `CdkSelection` directive.
 * Must be provided with the value. If `trackBy` is used on `CdkSelection`, the index of the value
 * is required. If the element implements `ControlValueAccessor`, e.g. `MatCheckbox`, the directive
 * automatically connects it with the selection state provided by the `CdkSelection` directive. If
 * not, use `checked$` to get the checked state of the value, and `toggle()` to change the selection
 * state.
 */
export declare class CdkSelectionToggle<T> implements OnDestroy, OnInit {
    private _selection;
    private _controlValueAccessors;
    /** The value that is associated with the toggle */
    value: T;
    /** The index of the value in the list. Required when used with `trackBy` */
    get index(): number | undefined;
    set index(index: NumberInput);
    protected _index?: number;
    /** The checked state of the selection toggle */
    readonly checked: Observable<boolean>;
    /** Toggles the selection */
    toggle(): void;
    private _destroyed;
    constructor(_selection: CdkSelection<T>, _controlValueAccessors: ControlValueAccessor[]);
    ngOnInit(): void;
    ngOnDestroy(): void;
    private _assertValidParentSelection;
    private _configureControlValueAccessor;
    private _isSelected;
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkSelectionToggle<any>, [{ optional: true; }, { optional: true; self: true; }]>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<CdkSelectionToggle<any>, "[cdkSelectionToggle]", ["cdkSelectionToggle"], { "value": "cdkSelectionToggleValue"; "index": "cdkSelectionToggleIndex"; }, {}, never, never, false, never>;
}

declare namespace i1 {
    export {
        CdkSelection
    }
}

declare namespace i2 {
    export {
        CdkSelectionToggle
    }
}

declare namespace i3 {
    export {
        CdkSelectAll
    }
}

declare namespace i4 {
    export {
        CdkSelectionColumn
    }
}

declare namespace i5 {
    export {
        CdkRowSelection
    }
}

/**
 * A selectable value with an optional index. The index is required when the selection is used with
 * `trackBy`.
 */
export declare interface SelectableWithIndex<T> {
    value: T;
    index?: number;
}

declare type SelectAllState = 'all' | 'none' | 'partial';

/**
 * Represents the change in the selection set.
 */
export declare interface SelectionChange<T> {
    before: SelectableWithIndex<T>[];
    after: SelectableWithIndex<T>[];
}

/**
 * Maintains a set of selected items. Support selecting and deselecting items, and checking if a
 * value is selected.
 * When constructed with a `trackByFn`, all the items will be identified by applying the `trackByFn`
 * on them. Because `trackByFn` requires the index of the item to be passed in, the `index` field is
 * expected to be set when calling `isSelected`, `select` and `deselect`.
 */
export declare class SelectionSet<T> implements TrackBySelection<T> {
    private _multiple;
    private _trackByFn?;
    private _selectionMap;
    changed: Subject<SelectionChange<T>>;
    constructor(_multiple?: boolean, _trackByFn?: TrackByFunction<T> | undefined);
    isSelected(value: SelectableWithIndex<T>): boolean;
    select(...selects: SelectableWithIndex<T>[]): void;
    deselect(...selects: SelectableWithIndex<T>[]): void;
    private _markSelected;
    private _markDeselected;
    private _getTrackedByValue;
    private _getCurrentSelection;
}

declare type TableDataSource<T> = DataSource<T> | Observable<readonly T[]> | readonly T[];

/**
 * Maintains a set of selected values. One or more values can be added to or removed from the
 * selection.
 */
declare interface TrackBySelection<T> {
    isSelected(value: SelectableWithIndex<T>): boolean;
    select(...values: SelectableWithIndex<T>[]): void;
    deselect(...values: SelectableWithIndex<T>[]): void;
    changed: Subject<SelectionChange<T>>;
}

export { }
