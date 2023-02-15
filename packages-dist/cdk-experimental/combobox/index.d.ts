import { BooleanInput } from '@angular/cdk/coercion';
import { Directionality } from '@angular/cdk/bidi';
import { ElementRef } from '@angular/core';
import { EventEmitter } from '@angular/core';
import * as i0 from '@angular/core';
import * as i3 from '@angular/cdk/overlay';
import { InjectionToken } from '@angular/core';
import { Injector } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { OnInit } from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';
import { TemplateRef } from '@angular/core';
import { ViewContainerRef } from '@angular/core';

export declare type AriaHasPopupValue = 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';

export declare const CDK_COMBOBOX: InjectionToken<CdkCombobox<unknown>>;

export declare class CdkCombobox<T = unknown> implements OnDestroy {
    private readonly _elementRef;
    private readonly _overlay;
    protected readonly _viewContainerRef: ViewContainerRef;
    private readonly _injector;
    private readonly _doc;
    private readonly _directionality?;
    _panelTemplateRef: TemplateRef<unknown>;
    value: T | T[];
    get disabled(): boolean;
    set disabled(value: BooleanInput);
    private _disabled;
    get openActions(): OpenAction[];
    set openActions(action: OpenActionInput);
    private _openActions;
    /** Whether the textContent is automatically updated upon change of the combobox value. */
    get autoSetText(): boolean;
    set autoSetText(value: BooleanInput);
    private _autoSetText;
    readonly opened: EventEmitter<void>;
    readonly closed: EventEmitter<void>;
    readonly panelValueChanged: EventEmitter<T[]>;
    private _overlayRef;
    private _panelPortal;
    contentId: string;
    contentType: AriaHasPopupValue;
    constructor(_elementRef: ElementRef<HTMLElement>, _overlay: Overlay, _viewContainerRef: ViewContainerRef, _injector: Injector, _doc: any, _directionality?: Directionality | undefined);
    ngOnDestroy(): void;
    _keydown(event: KeyboardEvent): void;
    /** Handles click or focus interactions. */
    _handleInteractions(interaction: OpenAction): void;
    /** Given a click in the document, determines if the click was inside a combobox. */
    _attemptClose(event: MouseEvent): void;
    /** Toggles the open state of the panel. */
    toggle(): void;
    /** If the combobox is closed and not disabled, opens the panel. */
    open(): void;
    /** If the combobox is open and not disabled, closes the panel. */
    close(): void;
    /** Returns true if panel is currently opened. */
    isOpen(): boolean;
    /** Returns true if combobox has a child panel. */
    hasPanel(): boolean;
    _getTabIndex(): string | null;
    private _setComboboxValue;
    updateAndClose(value: T | T[]): void;
    private _setTextContent;
    private _isTextTrigger;
    private _getOverlayConfig;
    private _getOverlayPositionStrategy;
    private _getOverlayPositions;
    private _getPanelInjector;
    private _getPanelContent;
    private _coerceOpenActionProperty;
    /** Registers the content's id and the content type with the panel. */
    _registerContent(contentId: string, contentType: AriaHasPopupValue): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkCombobox<any>, [null, null, null, null, null, { optional: true; }]>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<CdkCombobox<any>, "[cdkCombobox]", ["cdkCombobox"], { "_panelTemplateRef": "cdkComboboxTriggerFor"; "value": "value"; "disabled": "disabled"; "openActions": "openActions"; "autoSetText": "autoSetText"; }, { "opened": "comboboxPanelOpened"; "closed": "comboboxPanelClosed"; "panelValueChanged": "panelValueChanged"; }, never, never, false, never>;
}

export declare class CdkComboboxModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkComboboxModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<CdkComboboxModule, [typeof i1.CdkCombobox, typeof i2.CdkComboboxPopup], [typeof i3.OverlayModule], [typeof i1.CdkCombobox, typeof i2.CdkComboboxPopup]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<CdkComboboxModule>;
}

export declare class CdkComboboxPopup<T = unknown> implements OnInit {
    private readonly _elementRef;
    private readonly _combobox;
    get role(): AriaHasPopupValue;
    set role(value: AriaHasPopupValue);
    private _role;
    get firstFocus(): HTMLElement;
    set firstFocus(id: HTMLElement);
    private _firstFocusElement;
    id: string;
    constructor(_elementRef: ElementRef<HTMLElement>, _combobox: CdkCombobox);
    ngOnInit(): void;
    registerWithPanel(): void;
    focusFirstElement(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<CdkComboboxPopup<any>, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<CdkComboboxPopup<any>, "[cdkComboboxPopup]", ["cdkComboboxPopup"], { "role": "role"; "firstFocus": "firstFocus"; "id": "id"; }, {}, never, never, false, never>;
}

declare namespace i1 {
    export {
        AriaHasPopupValue,
        OpenAction,
        OpenActionInput,
        CDK_COMBOBOX,
        CdkCombobox
    }
}

declare namespace i2 {
    export {
        CdkComboboxPopup
    }
}

export declare type OpenAction = 'focus' | 'click' | 'downKey' | 'toggle';

export declare type OpenActionInput = OpenAction | OpenAction[] | string | null | undefined;

export { }
