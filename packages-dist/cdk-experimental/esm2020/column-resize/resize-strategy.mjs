/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { coerceCssPixelValue } from '@angular/cdk/coercion';
import { CdkTable, _CoalescedStyleScheduler, _COALESCED_STYLE_SCHEDULER } from '@angular/cdk/table';
import { ColumnResize } from './column-resize';
import * as i0 from "@angular/core";
import * as i1 from "./column-resize";
import * as i2 from "@angular/cdk/table";
/**
 * Provides an implementation for resizing a column.
 * The details of how resizing works for tables for flex mat-tables are quite different.
 */
export class ResizeStrategy {
    constructor() {
        this._pendingResizeDelta = null;
    }
    /** Adjusts the width of the table element by the specified delta. */
    updateTableWidthAndStickyColumns(delta) {
        if (this._pendingResizeDelta === null) {
            const tableElement = this.columnResize.elementRef.nativeElement;
            const tableWidth = getElementWidth(tableElement);
            this.styleScheduler.schedule(() => {
                tableElement.style.width = coerceCssPixelValue(tableWidth + this._pendingResizeDelta);
                this._pendingResizeDelta = null;
            });
            this.styleScheduler.scheduleEnd(() => {
                this.table.updateStickyColumnStyles();
            });
        }
        this._pendingResizeDelta = (this._pendingResizeDelta ?? 0) + delta;
    }
}
ResizeStrategy.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: ResizeStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
ResizeStrategy.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: ResizeStrategy });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: ResizeStrategy, decorators: [{
            type: Injectable
        }] });
/**
 * The optimally performing resize strategy for &lt;table&gt; elements with table-layout: fixed.
 * Tested against and outperformed:
 *   CSS selector
 *   CSS selector w/ CSS variable
 *   Updating all cell nodes
 */
export class TableLayoutFixedResizeStrategy extends ResizeStrategy {
    constructor(columnResize, styleScheduler, table) {
        super();
        this.columnResize = columnResize;
        this.styleScheduler = styleScheduler;
        this.table = table;
    }
    applyColumnSize(_, columnHeader, sizeInPx, previousSizeInPx) {
        const delta = sizeInPx - (previousSizeInPx ?? getElementWidth(columnHeader));
        if (delta === 0) {
            return;
        }
        this.styleScheduler.schedule(() => {
            columnHeader.style.width = coerceCssPixelValue(sizeInPx);
        });
        this.updateTableWidthAndStickyColumns(delta);
    }
    applyMinColumnSize(_, columnHeader, sizeInPx) {
        const currentWidth = getElementWidth(columnHeader);
        const newWidth = Math.max(currentWidth, sizeInPx);
        this.applyColumnSize(_, columnHeader, newWidth, currentWidth);
    }
    applyMaxColumnSize(_, columnHeader, sizeInPx) {
        const currentWidth = getElementWidth(columnHeader);
        const newWidth = Math.min(currentWidth, sizeInPx);
        this.applyColumnSize(_, columnHeader, newWidth, currentWidth);
    }
}
TableLayoutFixedResizeStrategy.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TableLayoutFixedResizeStrategy, deps: [{ token: i1.ColumnResize }, { token: _COALESCED_STYLE_SCHEDULER }, { token: i2.CdkTable }], target: i0.ɵɵFactoryTarget.Injectable });
TableLayoutFixedResizeStrategy.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TableLayoutFixedResizeStrategy });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TableLayoutFixedResizeStrategy, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i1.ColumnResize }, { type: i2._CoalescedStyleScheduler, decorators: [{
                    type: Inject,
                    args: [_COALESCED_STYLE_SCHEDULER]
                }] }, { type: i2.CdkTable }]; } });
/**
 * The optimally performing resize strategy for flex mat-tables.
 * Tested against and outperformed:
 *   CSS selector w/ CSS variable
 *   Updating all mat-cell nodes
 */
export class CdkFlexTableResizeStrategy extends ResizeStrategy {
    constructor(columnResize, styleScheduler, table, document) {
        super();
        this.columnResize = columnResize;
        this.styleScheduler = styleScheduler;
        this.table = table;
        this._columnIndexes = new Map();
        this._columnProperties = new Map();
        this._indexSequence = 0;
        this.defaultMinSize = 0;
        this.defaultMaxSize = Number.MAX_SAFE_INTEGER;
        this._document = document;
    }
    applyColumnSize(cssFriendlyColumnName, columnHeader, sizeInPx, previousSizeInPx) {
        // Optimization: Check applied width first as we probably set it already before reading
        // offsetWidth which triggers layout.
        const delta = sizeInPx -
            (previousSizeInPx ??
                (this._getAppliedWidth(cssFriendlyColumnName) || columnHeader.offsetWidth));
        if (delta === 0) {
            return;
        }
        const cssSize = coerceCssPixelValue(sizeInPx);
        this._applyProperty(cssFriendlyColumnName, 'flex', `0 0.01 ${cssSize}`);
        this.updateTableWidthAndStickyColumns(delta);
    }
    applyMinColumnSize(cssFriendlyColumnName, _, sizeInPx) {
        const cssSize = coerceCssPixelValue(sizeInPx);
        this._applyProperty(cssFriendlyColumnName, 'min-width', cssSize, sizeInPx !== this.defaultMinSize);
        this.updateTableWidthAndStickyColumns(0);
    }
    applyMaxColumnSize(cssFriendlyColumnName, _, sizeInPx) {
        const cssSize = coerceCssPixelValue(sizeInPx);
        this._applyProperty(cssFriendlyColumnName, 'max-width', cssSize, sizeInPx !== this.defaultMaxSize);
        this.updateTableWidthAndStickyColumns(0);
    }
    getColumnCssClass(cssFriendlyColumnName) {
        return `cdk-column-${cssFriendlyColumnName}`;
    }
    ngOnDestroy() {
        this._styleElement?.remove();
        this._styleElement = undefined;
    }
    _getPropertyValue(cssFriendlyColumnName, key) {
        const properties = this._getColumnPropertiesMap(cssFriendlyColumnName);
        return properties.get(key);
    }
    _getAppliedWidth(cssFriendslyColumnName) {
        return coercePixelsFromFlexValue(this._getPropertyValue(cssFriendslyColumnName, 'flex'));
    }
    _applyProperty(cssFriendlyColumnName, key, value, enable = true) {
        const properties = this._getColumnPropertiesMap(cssFriendlyColumnName);
        this.styleScheduler.schedule(() => {
            if (enable) {
                properties.set(key, value);
            }
            else {
                properties.delete(key);
            }
            this._applySizeCss(cssFriendlyColumnName);
        });
    }
    _getStyleSheet() {
        if (!this._styleElement) {
            this._styleElement = this._document.createElement('style');
            this._styleElement.appendChild(this._document.createTextNode(''));
            this._document.head.appendChild(this._styleElement);
        }
        return this._styleElement.sheet;
    }
    _getColumnPropertiesMap(cssFriendlyColumnName) {
        let properties = this._columnProperties.get(cssFriendlyColumnName);
        if (properties === undefined) {
            properties = new Map();
            this._columnProperties.set(cssFriendlyColumnName, properties);
        }
        return properties;
    }
    _applySizeCss(cssFriendlyColumnName) {
        const properties = this._getColumnPropertiesMap(cssFriendlyColumnName);
        const propertyKeys = Array.from(properties.keys());
        let index = this._columnIndexes.get(cssFriendlyColumnName);
        if (index === undefined) {
            if (!propertyKeys.length) {
                // Nothing to set or unset.
                return;
            }
            index = this._indexSequence++;
            this._columnIndexes.set(cssFriendlyColumnName, index);
        }
        else {
            this._getStyleSheet().deleteRule(index);
        }
        const columnClassName = this.getColumnCssClass(cssFriendlyColumnName);
        const tableClassName = this.columnResize.getUniqueCssClass();
        const selector = `.${tableClassName} .${columnClassName}`;
        const body = propertyKeys.map(key => `${key}:${properties.get(key)}`).join(';');
        this._getStyleSheet().insertRule(`${selector} {${body}}`, index);
    }
}
CdkFlexTableResizeStrategy.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkFlexTableResizeStrategy, deps: [{ token: i1.ColumnResize }, { token: _COALESCED_STYLE_SCHEDULER }, { token: i2.CdkTable }, { token: DOCUMENT }], target: i0.ɵɵFactoryTarget.Injectable });
CdkFlexTableResizeStrategy.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkFlexTableResizeStrategy });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: CdkFlexTableResizeStrategy, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i1.ColumnResize }, { type: i2._CoalescedStyleScheduler, decorators: [{
                    type: Inject,
                    args: [_COALESCED_STYLE_SCHEDULER]
                }] }, { type: i2.CdkTable }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }]; } });
/** Converts CSS pixel values to numbers, eg "123px" to 123. Returns NaN for non pixel values. */
function coercePixelsFromCssValue(cssValue) {
    return Number(cssValue.match(/(\d+)px/)?.[1]);
}
/** Gets the style.width pixels on the specified element if present, otherwise its offsetWidth. */
function getElementWidth(element) {
    // Optimization: Check style.width first as we probably set it already before reading
    // offsetWidth which triggers layout.
    return coercePixelsFromCssValue(element.style.width) || element.offsetWidth;
}
/**
 * Converts CSS flex values as set in CdkFlexTableResizeStrategy to numbers,
 * eg "0 0.01 123px" to 123.
 */
function coercePixelsFromFlexValue(flexValue) {
    return Number(flexValue?.match(/0 0\.01 (\d+)px/)?.[1]);
}
export const TABLE_LAYOUT_FIXED_RESIZE_STRATEGY_PROVIDER = {
    provide: ResizeStrategy,
    useClass: TableLayoutFixedResizeStrategy,
};
export const FLEX_RESIZE_STRATEGY_PROVIDER = {
    provide: ResizeStrategy,
    useClass: CdkFlexTableResizeStrategy,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzaXplLXN0cmF0ZWd5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2Nkay1leHBlcmltZW50YWwvY29sdW1uLXJlc2l6ZS9yZXNpemUtc3RyYXRlZ3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLE1BQU0sRUFBRSxVQUFVLEVBQXNCLE1BQU0sZUFBZSxDQUFDO0FBQ3RFLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QyxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUMxRCxPQUFPLEVBQUMsUUFBUSxFQUFFLHdCQUF3QixFQUFFLDBCQUEwQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFFbEcsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLGlCQUFpQixDQUFDOzs7O0FBRTdDOzs7R0FHRztBQUVILE1BQU0sT0FBZ0IsY0FBYztJQURwQztRQU1VLHdCQUFtQixHQUFrQixJQUFJLENBQUM7S0EyQ25EO0lBbkJDLHFFQUFxRTtJQUMzRCxnQ0FBZ0MsQ0FBQyxLQUFhO1FBQ3RELElBQUksSUFBSSxDQUFDLG1CQUFtQixLQUFLLElBQUksRUFBRTtZQUNyQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUM7WUFDaEUsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRWpELElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtnQkFDaEMsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBb0IsQ0FBQyxDQUFDO2dCQUV2RixJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1lBQ2xDLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO2dCQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDeEMsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUVELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDckUsQ0FBQzs7MkdBL0NtQixjQUFjOytHQUFkLGNBQWM7MkZBQWQsY0FBYztrQkFEbkMsVUFBVTs7QUFtRFg7Ozs7OztHQU1HO0FBRUgsTUFBTSxPQUFPLDhCQUErQixTQUFRLGNBQWM7SUFDaEUsWUFDcUIsWUFBMEIsRUFFMUIsY0FBd0MsRUFDeEMsS0FBd0I7UUFFM0MsS0FBSyxFQUFFLENBQUM7UUFMVyxpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUUxQixtQkFBYyxHQUFkLGNBQWMsQ0FBMEI7UUFDeEMsVUFBSyxHQUFMLEtBQUssQ0FBbUI7SUFHN0MsQ0FBQztJQUVELGVBQWUsQ0FDYixDQUFTLEVBQ1QsWUFBeUIsRUFDekIsUUFBZ0IsRUFDaEIsZ0JBQXlCO1FBRXpCLE1BQU0sS0FBSyxHQUFHLFFBQVEsR0FBRyxDQUFDLGdCQUFnQixJQUFJLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBRTdFLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRTtZQUNmLE9BQU87U0FDUjtRQUVELElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUNoQyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsa0JBQWtCLENBQUMsQ0FBUyxFQUFFLFlBQXlCLEVBQUUsUUFBZ0I7UUFDdkUsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRWxELElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELGtCQUFrQixDQUFDLENBQVMsRUFBRSxZQUF5QixFQUFFLFFBQWdCO1FBQ3ZFLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVsRCxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ2hFLENBQUM7OzJIQXpDVSw4QkFBOEIsOENBRy9CLDBCQUEwQjsrSEFIekIsOEJBQThCOzJGQUE5Qiw4QkFBOEI7a0JBRDFDLFVBQVU7OzBCQUlOLE1BQU07MkJBQUMsMEJBQTBCOztBQXlDdEM7Ozs7O0dBS0c7QUFFSCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsY0FBYztJQVc1RCxZQUNxQixZQUEwQixFQUUxQixjQUF3QyxFQUN4QyxLQUF3QixFQUN6QixRQUFhO1FBRS9CLEtBQUssRUFBRSxDQUFDO1FBTlcsaUJBQVksR0FBWixZQUFZLENBQWM7UUFFMUIsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQ3hDLFVBQUssR0FBTCxLQUFLLENBQW1CO1FBYjVCLG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDM0Msc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUM7UUFHcEUsbUJBQWMsR0FBRyxDQUFDLENBQUM7UUFFUixtQkFBYyxHQUFHLENBQUMsQ0FBQztRQUNuQixtQkFBYyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztRQVUxRCxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztJQUM1QixDQUFDO0lBRUQsZUFBZSxDQUNiLHFCQUE2QixFQUM3QixZQUF5QixFQUN6QixRQUFnQixFQUNoQixnQkFBeUI7UUFFekIsdUZBQXVGO1FBQ3ZGLHFDQUFxQztRQUNyQyxNQUFNLEtBQUssR0FDVCxRQUFRO1lBQ1IsQ0FBQyxnQkFBZ0I7Z0JBQ2YsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsSUFBSSxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUVoRixJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUU7WUFDZixPQUFPO1NBQ1I7UUFFRCxNQUFNLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU5QyxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxVQUFVLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxxQkFBNkIsRUFBRSxDQUFjLEVBQUUsUUFBZ0I7UUFDaEYsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFOUMsSUFBSSxDQUFDLGNBQWMsQ0FDakIscUJBQXFCLEVBQ3JCLFdBQVcsRUFDWCxPQUFPLEVBQ1AsUUFBUSxLQUFLLElBQUksQ0FBQyxjQUFjLENBQ2pDLENBQUM7UUFDRixJQUFJLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELGtCQUFrQixDQUFDLHFCQUE2QixFQUFFLENBQWMsRUFBRSxRQUFnQjtRQUNoRixNQUFNLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU5QyxJQUFJLENBQUMsY0FBYyxDQUNqQixxQkFBcUIsRUFDckIsV0FBVyxFQUNYLE9BQU8sRUFDUCxRQUFRLEtBQUssSUFBSSxDQUFDLGNBQWMsQ0FDakMsQ0FBQztRQUNGLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRVMsaUJBQWlCLENBQUMscUJBQTZCO1FBQ3ZELE9BQU8sY0FBYyxxQkFBcUIsRUFBRSxDQUFDO0lBQy9DLENBQUM7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLGFBQWEsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUM3QixJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQztJQUNqQyxDQUFDO0lBRU8saUJBQWlCLENBQUMscUJBQTZCLEVBQUUsR0FBVztRQUNsRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUN2RSxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVPLGdCQUFnQixDQUFDLHNCQUE4QjtRQUNyRCxPQUFPLHlCQUF5QixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzNGLENBQUM7SUFFTyxjQUFjLENBQ3BCLHFCQUE2QixFQUM3QixHQUFXLEVBQ1gsS0FBYSxFQUNiLE1BQU0sR0FBRyxJQUFJO1FBRWIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFdkUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ2hDLElBQUksTUFBTSxFQUFFO2dCQUNWLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQzVCO2lCQUFNO2dCQUNMLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDeEI7WUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sY0FBYztRQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUN2QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUNyRDtRQUVELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFzQixDQUFDO0lBQ25ELENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxxQkFBNkI7UUFDM0QsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ25FLElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRTtZQUM1QixVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7WUFDdkMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxVQUFVLENBQUMsQ0FBQztTQUMvRDtRQUNELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFTyxhQUFhLENBQUMscUJBQTZCO1FBQ2pELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFFbkQsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUMzRCxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7WUFDdkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUU7Z0JBQ3hCLDJCQUEyQjtnQkFDM0IsT0FBTzthQUNSO1lBRUQsS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN2RDthQUFNO1lBQ0wsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN6QztRQUVELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUU3RCxNQUFNLFFBQVEsR0FBRyxJQUFJLGNBQWMsS0FBSyxlQUFlLEVBQUUsQ0FBQztRQUMxRCxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRWhGLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxRQUFRLEtBQUssSUFBSSxHQUFHLEVBQUUsS0FBTSxDQUFDLENBQUM7SUFDcEUsQ0FBQzs7dUhBcEpVLDBCQUEwQiw4Q0FhM0IsMEJBQTBCLHFDQUcxQixRQUFROzJIQWhCUCwwQkFBMEI7MkZBQTFCLDBCQUEwQjtrQkFEdEMsVUFBVTs7MEJBY04sTUFBTTsyQkFBQywwQkFBMEI7OzBCQUdqQyxNQUFNOzJCQUFDLFFBQVE7O0FBdUlwQixpR0FBaUc7QUFDakcsU0FBUyx3QkFBd0IsQ0FBQyxRQUFnQjtJQUNoRCxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBRUQsa0dBQWtHO0FBQ2xHLFNBQVMsZUFBZSxDQUFDLE9BQW9CO0lBQzNDLHFGQUFxRjtJQUNyRixxQ0FBcUM7SUFDckMsT0FBTyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7QUFDOUUsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQVMseUJBQXlCLENBQUMsU0FBNkI7SUFDOUQsT0FBTyxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRCxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sMkNBQTJDLEdBQWE7SUFDbkUsT0FBTyxFQUFFLGNBQWM7SUFDdkIsUUFBUSxFQUFFLDhCQUE4QjtDQUN6QyxDQUFDO0FBQ0YsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQWE7SUFDckQsT0FBTyxFQUFFLGNBQWM7SUFDdkIsUUFBUSxFQUFFLDBCQUEwQjtDQUNyQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0LCBJbmplY3RhYmxlLCBPbkRlc3Ryb3ksIFByb3ZpZGVyfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7RE9DVU1FTlR9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge2NvZXJjZUNzc1BpeGVsVmFsdWV9IGZyb20gJ0Bhbmd1bGFyL2Nkay9jb2VyY2lvbic7XG5pbXBvcnQge0Nka1RhYmxlLCBfQ29hbGVzY2VkU3R5bGVTY2hlZHVsZXIsIF9DT0FMRVNDRURfU1RZTEVfU0NIRURVTEVSfSBmcm9tICdAYW5ndWxhci9jZGsvdGFibGUnO1xuXG5pbXBvcnQge0NvbHVtblJlc2l6ZX0gZnJvbSAnLi9jb2x1bW4tcmVzaXplJztcblxuLyoqXG4gKiBQcm92aWRlcyBhbiBpbXBsZW1lbnRhdGlvbiBmb3IgcmVzaXppbmcgYSBjb2x1bW4uXG4gKiBUaGUgZGV0YWlscyBvZiBob3cgcmVzaXppbmcgd29ya3MgZm9yIHRhYmxlcyBmb3IgZmxleCBtYXQtdGFibGVzIGFyZSBxdWl0ZSBkaWZmZXJlbnQuXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSZXNpemVTdHJhdGVneSB7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZWFkb25seSBjb2x1bW5SZXNpemU6IENvbHVtblJlc2l6ZTtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IHJlYWRvbmx5IHN0eWxlU2NoZWR1bGVyOiBfQ29hbGVzY2VkU3R5bGVTY2hlZHVsZXI7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZWFkb25seSB0YWJsZTogQ2RrVGFibGU8dW5rbm93bj47XG5cbiAgcHJpdmF0ZSBfcGVuZGluZ1Jlc2l6ZURlbHRhOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICAvKiogVXBkYXRlcyB0aGUgd2lkdGggb2YgdGhlIHNwZWNpZmllZCBjb2x1bW4uICovXG4gIGFic3RyYWN0IGFwcGx5Q29sdW1uU2l6ZShcbiAgICBjc3NGcmllbmRseUNvbHVtbk5hbWU6IHN0cmluZyxcbiAgICBjb2x1bW5IZWFkZXI6IEhUTUxFbGVtZW50LFxuICAgIHNpemVJblB4OiBudW1iZXIsXG4gICAgcHJldmlvdXNTaXplSW5QeD86IG51bWJlcixcbiAgKTogdm9pZDtcblxuICAvKiogQXBwbGllcyBhIG1pbmltdW0gd2lkdGggdG8gdGhlIHNwZWNpZmllZCBjb2x1bW4sIHVwZGF0aW5nIGl0cyBjdXJyZW50IHdpZHRoIGFzIG5lZWRlZC4gKi9cbiAgYWJzdHJhY3QgYXBwbHlNaW5Db2x1bW5TaXplKFxuICAgIGNzc0ZyaWVuZGx5Q29sdW1uTmFtZTogc3RyaW5nLFxuICAgIGNvbHVtbkhlYWRlcjogSFRNTEVsZW1lbnQsXG4gICAgbWluU2l6ZUluUHg6IG51bWJlcixcbiAgKTogdm9pZDtcblxuICAvKiogQXBwbGllcyBhIG1heGltdW0gd2lkdGggdG8gdGhlIHNwZWNpZmllZCBjb2x1bW4sIHVwZGF0aW5nIGl0cyBjdXJyZW50IHdpZHRoIGFzIG5lZWRlZC4gKi9cbiAgYWJzdHJhY3QgYXBwbHlNYXhDb2x1bW5TaXplKFxuICAgIGNzc0ZyaWVuZGx5Q29sdW1uTmFtZTogc3RyaW5nLFxuICAgIGNvbHVtbkhlYWRlcjogSFRNTEVsZW1lbnQsXG4gICAgbWluU2l6ZUluUHg6IG51bWJlcixcbiAgKTogdm9pZDtcblxuICAvKiogQWRqdXN0cyB0aGUgd2lkdGggb2YgdGhlIHRhYmxlIGVsZW1lbnQgYnkgdGhlIHNwZWNpZmllZCBkZWx0YS4gKi9cbiAgcHJvdGVjdGVkIHVwZGF0ZVRhYmxlV2lkdGhBbmRTdGlja3lDb2x1bW5zKGRlbHRhOiBudW1iZXIpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fcGVuZGluZ1Jlc2l6ZURlbHRhID09PSBudWxsKSB7XG4gICAgICBjb25zdCB0YWJsZUVsZW1lbnQgPSB0aGlzLmNvbHVtblJlc2l6ZS5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQ7XG4gICAgICBjb25zdCB0YWJsZVdpZHRoID0gZ2V0RWxlbWVudFdpZHRoKHRhYmxlRWxlbWVudCk7XG5cbiAgICAgIHRoaXMuc3R5bGVTY2hlZHVsZXIuc2NoZWR1bGUoKCkgPT4ge1xuICAgICAgICB0YWJsZUVsZW1lbnQuc3R5bGUud2lkdGggPSBjb2VyY2VDc3NQaXhlbFZhbHVlKHRhYmxlV2lkdGggKyB0aGlzLl9wZW5kaW5nUmVzaXplRGVsdGEhKTtcblxuICAgICAgICB0aGlzLl9wZW5kaW5nUmVzaXplRGVsdGEgPSBudWxsO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc3R5bGVTY2hlZHVsZXIuc2NoZWR1bGVFbmQoKCkgPT4ge1xuICAgICAgICB0aGlzLnRhYmxlLnVwZGF0ZVN0aWNreUNvbHVtblN0eWxlcygpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGVuZGluZ1Jlc2l6ZURlbHRhID0gKHRoaXMuX3BlbmRpbmdSZXNpemVEZWx0YSA/PyAwKSArIGRlbHRhO1xuICB9XG59XG5cbi8qKlxuICogVGhlIG9wdGltYWxseSBwZXJmb3JtaW5nIHJlc2l6ZSBzdHJhdGVneSBmb3IgJmx0O3RhYmxlJmd0OyBlbGVtZW50cyB3aXRoIHRhYmxlLWxheW91dDogZml4ZWQuXG4gKiBUZXN0ZWQgYWdhaW5zdCBhbmQgb3V0cGVyZm9ybWVkOlxuICogICBDU1Mgc2VsZWN0b3JcbiAqICAgQ1NTIHNlbGVjdG9yIHcvIENTUyB2YXJpYWJsZVxuICogICBVcGRhdGluZyBhbGwgY2VsbCBub2Rlc1xuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgVGFibGVMYXlvdXRGaXhlZFJlc2l6ZVN0cmF0ZWd5IGV4dGVuZHMgUmVzaXplU3RyYXRlZ3kge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcm90ZWN0ZWQgcmVhZG9ubHkgY29sdW1uUmVzaXplOiBDb2x1bW5SZXNpemUsXG4gICAgQEluamVjdChfQ09BTEVTQ0VEX1NUWUxFX1NDSEVEVUxFUilcbiAgICBwcm90ZWN0ZWQgcmVhZG9ubHkgc3R5bGVTY2hlZHVsZXI6IF9Db2FsZXNjZWRTdHlsZVNjaGVkdWxlcixcbiAgICBwcm90ZWN0ZWQgcmVhZG9ubHkgdGFibGU6IENka1RhYmxlPHVua25vd24+LFxuICApIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgYXBwbHlDb2x1bW5TaXplKFxuICAgIF86IHN0cmluZyxcbiAgICBjb2x1bW5IZWFkZXI6IEhUTUxFbGVtZW50LFxuICAgIHNpemVJblB4OiBudW1iZXIsXG4gICAgcHJldmlvdXNTaXplSW5QeD86IG51bWJlcixcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgZGVsdGEgPSBzaXplSW5QeCAtIChwcmV2aW91c1NpemVJblB4ID8/IGdldEVsZW1lbnRXaWR0aChjb2x1bW5IZWFkZXIpKTtcblxuICAgIGlmIChkZWx0YSA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc3R5bGVTY2hlZHVsZXIuc2NoZWR1bGUoKCkgPT4ge1xuICAgICAgY29sdW1uSGVhZGVyLnN0eWxlLndpZHRoID0gY29lcmNlQ3NzUGl4ZWxWYWx1ZShzaXplSW5QeCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnVwZGF0ZVRhYmxlV2lkdGhBbmRTdGlja3lDb2x1bW5zKGRlbHRhKTtcbiAgfVxuXG4gIGFwcGx5TWluQ29sdW1uU2l6ZShfOiBzdHJpbmcsIGNvbHVtbkhlYWRlcjogSFRNTEVsZW1lbnQsIHNpemVJblB4OiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBjdXJyZW50V2lkdGggPSBnZXRFbGVtZW50V2lkdGgoY29sdW1uSGVhZGVyKTtcbiAgICBjb25zdCBuZXdXaWR0aCA9IE1hdGgubWF4KGN1cnJlbnRXaWR0aCwgc2l6ZUluUHgpO1xuXG4gICAgdGhpcy5hcHBseUNvbHVtblNpemUoXywgY29sdW1uSGVhZGVyLCBuZXdXaWR0aCwgY3VycmVudFdpZHRoKTtcbiAgfVxuXG4gIGFwcGx5TWF4Q29sdW1uU2l6ZShfOiBzdHJpbmcsIGNvbHVtbkhlYWRlcjogSFRNTEVsZW1lbnQsIHNpemVJblB4OiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBjdXJyZW50V2lkdGggPSBnZXRFbGVtZW50V2lkdGgoY29sdW1uSGVhZGVyKTtcbiAgICBjb25zdCBuZXdXaWR0aCA9IE1hdGgubWluKGN1cnJlbnRXaWR0aCwgc2l6ZUluUHgpO1xuXG4gICAgdGhpcy5hcHBseUNvbHVtblNpemUoXywgY29sdW1uSGVhZGVyLCBuZXdXaWR0aCwgY3VycmVudFdpZHRoKTtcbiAgfVxufVxuXG4vKipcbiAqIFRoZSBvcHRpbWFsbHkgcGVyZm9ybWluZyByZXNpemUgc3RyYXRlZ3kgZm9yIGZsZXggbWF0LXRhYmxlcy5cbiAqIFRlc3RlZCBhZ2FpbnN0IGFuZCBvdXRwZXJmb3JtZWQ6XG4gKiAgIENTUyBzZWxlY3RvciB3LyBDU1MgdmFyaWFibGVcbiAqICAgVXBkYXRpbmcgYWxsIG1hdC1jZWxsIG5vZGVzXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBDZGtGbGV4VGFibGVSZXNpemVTdHJhdGVneSBleHRlbmRzIFJlc2l6ZVN0cmF0ZWd5IGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSByZWFkb25seSBfZG9jdW1lbnQ6IERvY3VtZW50O1xuICBwcml2YXRlIHJlYWRvbmx5IF9jb2x1bW5JbmRleGVzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBfY29sdW1uUHJvcGVydGllcyA9IG5ldyBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBzdHJpbmc+PigpO1xuXG4gIHByaXZhdGUgX3N0eWxlRWxlbWVudD86IEhUTUxTdHlsZUVsZW1lbnQ7XG4gIHByaXZhdGUgX2luZGV4U2VxdWVuY2UgPSAwO1xuXG4gIHByb3RlY3RlZCByZWFkb25seSBkZWZhdWx0TWluU2l6ZSA9IDA7XG4gIHByb3RlY3RlZCByZWFkb25seSBkZWZhdWx0TWF4U2l6ZSA9IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByb3RlY3RlZCByZWFkb25seSBjb2x1bW5SZXNpemU6IENvbHVtblJlc2l6ZSxcbiAgICBASW5qZWN0KF9DT0FMRVNDRURfU1RZTEVfU0NIRURVTEVSKVxuICAgIHByb3RlY3RlZCByZWFkb25seSBzdHlsZVNjaGVkdWxlcjogX0NvYWxlc2NlZFN0eWxlU2NoZWR1bGVyLFxuICAgIHByb3RlY3RlZCByZWFkb25seSB0YWJsZTogQ2RrVGFibGU8dW5rbm93bj4sXG4gICAgQEluamVjdChET0NVTUVOVCkgZG9jdW1lbnQ6IGFueSxcbiAgKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLl9kb2N1bWVudCA9IGRvY3VtZW50O1xuICB9XG5cbiAgYXBwbHlDb2x1bW5TaXplKFxuICAgIGNzc0ZyaWVuZGx5Q29sdW1uTmFtZTogc3RyaW5nLFxuICAgIGNvbHVtbkhlYWRlcjogSFRNTEVsZW1lbnQsXG4gICAgc2l6ZUluUHg6IG51bWJlcixcbiAgICBwcmV2aW91c1NpemVJblB4PzogbnVtYmVyLFxuICApOiB2b2lkIHtcbiAgICAvLyBPcHRpbWl6YXRpb246IENoZWNrIGFwcGxpZWQgd2lkdGggZmlyc3QgYXMgd2UgcHJvYmFibHkgc2V0IGl0IGFscmVhZHkgYmVmb3JlIHJlYWRpbmdcbiAgICAvLyBvZmZzZXRXaWR0aCB3aGljaCB0cmlnZ2VycyBsYXlvdXQuXG4gICAgY29uc3QgZGVsdGEgPVxuICAgICAgc2l6ZUluUHggLVxuICAgICAgKHByZXZpb3VzU2l6ZUluUHggPz9cbiAgICAgICAgKHRoaXMuX2dldEFwcGxpZWRXaWR0aChjc3NGcmllbmRseUNvbHVtbk5hbWUpIHx8IGNvbHVtbkhlYWRlci5vZmZzZXRXaWR0aCkpO1xuXG4gICAgaWYgKGRlbHRhID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY3NzU2l6ZSA9IGNvZXJjZUNzc1BpeGVsVmFsdWUoc2l6ZUluUHgpO1xuXG4gICAgdGhpcy5fYXBwbHlQcm9wZXJ0eShjc3NGcmllbmRseUNvbHVtbk5hbWUsICdmbGV4JywgYDAgMC4wMSAke2Nzc1NpemV9YCk7XG4gICAgdGhpcy51cGRhdGVUYWJsZVdpZHRoQW5kU3RpY2t5Q29sdW1ucyhkZWx0YSk7XG4gIH1cblxuICBhcHBseU1pbkNvbHVtblNpemUoY3NzRnJpZW5kbHlDb2x1bW5OYW1lOiBzdHJpbmcsIF86IEhUTUxFbGVtZW50LCBzaXplSW5QeDogbnVtYmVyKTogdm9pZCB7XG4gICAgY29uc3QgY3NzU2l6ZSA9IGNvZXJjZUNzc1BpeGVsVmFsdWUoc2l6ZUluUHgpO1xuXG4gICAgdGhpcy5fYXBwbHlQcm9wZXJ0eShcbiAgICAgIGNzc0ZyaWVuZGx5Q29sdW1uTmFtZSxcbiAgICAgICdtaW4td2lkdGgnLFxuICAgICAgY3NzU2l6ZSxcbiAgICAgIHNpemVJblB4ICE9PSB0aGlzLmRlZmF1bHRNaW5TaXplLFxuICAgICk7XG4gICAgdGhpcy51cGRhdGVUYWJsZVdpZHRoQW5kU3RpY2t5Q29sdW1ucygwKTtcbiAgfVxuXG4gIGFwcGx5TWF4Q29sdW1uU2l6ZShjc3NGcmllbmRseUNvbHVtbk5hbWU6IHN0cmluZywgXzogSFRNTEVsZW1lbnQsIHNpemVJblB4OiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBjc3NTaXplID0gY29lcmNlQ3NzUGl4ZWxWYWx1ZShzaXplSW5QeCk7XG5cbiAgICB0aGlzLl9hcHBseVByb3BlcnR5KFxuICAgICAgY3NzRnJpZW5kbHlDb2x1bW5OYW1lLFxuICAgICAgJ21heC13aWR0aCcsXG4gICAgICBjc3NTaXplLFxuICAgICAgc2l6ZUluUHggIT09IHRoaXMuZGVmYXVsdE1heFNpemUsXG4gICAgKTtcbiAgICB0aGlzLnVwZGF0ZVRhYmxlV2lkdGhBbmRTdGlja3lDb2x1bW5zKDApO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldENvbHVtbkNzc0NsYXNzKGNzc0ZyaWVuZGx5Q29sdW1uTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGNkay1jb2x1bW4tJHtjc3NGcmllbmRseUNvbHVtbk5hbWV9YDtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuX3N0eWxlRWxlbWVudD8ucmVtb3ZlKCk7XG4gICAgdGhpcy5fc3R5bGVFbGVtZW50ID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0UHJvcGVydHlWYWx1ZShjc3NGcmllbmRseUNvbHVtbk5hbWU6IHN0cmluZywga2V5OiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHByb3BlcnRpZXMgPSB0aGlzLl9nZXRDb2x1bW5Qcm9wZXJ0aWVzTWFwKGNzc0ZyaWVuZGx5Q29sdW1uTmFtZSk7XG4gICAgcmV0dXJuIHByb3BlcnRpZXMuZ2V0KGtleSk7XG4gIH1cblxuICBwcml2YXRlIF9nZXRBcHBsaWVkV2lkdGgoY3NzRnJpZW5kc2x5Q29sdW1uTmFtZTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICByZXR1cm4gY29lcmNlUGl4ZWxzRnJvbUZsZXhWYWx1ZSh0aGlzLl9nZXRQcm9wZXJ0eVZhbHVlKGNzc0ZyaWVuZHNseUNvbHVtbk5hbWUsICdmbGV4JykpO1xuICB9XG5cbiAgcHJpdmF0ZSBfYXBwbHlQcm9wZXJ0eShcbiAgICBjc3NGcmllbmRseUNvbHVtbk5hbWU6IHN0cmluZyxcbiAgICBrZXk6IHN0cmluZyxcbiAgICB2YWx1ZTogc3RyaW5nLFxuICAgIGVuYWJsZSA9IHRydWUsXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHByb3BlcnRpZXMgPSB0aGlzLl9nZXRDb2x1bW5Qcm9wZXJ0aWVzTWFwKGNzc0ZyaWVuZGx5Q29sdW1uTmFtZSk7XG5cbiAgICB0aGlzLnN0eWxlU2NoZWR1bGVyLnNjaGVkdWxlKCgpID0+IHtcbiAgICAgIGlmIChlbmFibGUpIHtcbiAgICAgICAgcHJvcGVydGllcy5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwcm9wZXJ0aWVzLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgICAgdGhpcy5fYXBwbHlTaXplQ3NzKGNzc0ZyaWVuZGx5Q29sdW1uTmFtZSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9nZXRTdHlsZVNoZWV0KCk6IENTU1N0eWxlU2hlZXQge1xuICAgIGlmICghdGhpcy5fc3R5bGVFbGVtZW50KSB7XG4gICAgICB0aGlzLl9zdHlsZUVsZW1lbnQgPSB0aGlzLl9kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgICAgdGhpcy5fc3R5bGVFbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuX2RvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSk7XG4gICAgICB0aGlzLl9kb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHRoaXMuX3N0eWxlRWxlbWVudCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3N0eWxlRWxlbWVudC5zaGVldCBhcyBDU1NTdHlsZVNoZWV0O1xuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0Q29sdW1uUHJvcGVydGllc01hcChjc3NGcmllbmRseUNvbHVtbk5hbWU6IHN0cmluZyk6IE1hcDxzdHJpbmcsIHN0cmluZz4ge1xuICAgIGxldCBwcm9wZXJ0aWVzID0gdGhpcy5fY29sdW1uUHJvcGVydGllcy5nZXQoY3NzRnJpZW5kbHlDb2x1bW5OYW1lKTtcbiAgICBpZiAocHJvcGVydGllcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBwcm9wZXJ0aWVzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAgIHRoaXMuX2NvbHVtblByb3BlcnRpZXMuc2V0KGNzc0ZyaWVuZGx5Q29sdW1uTmFtZSwgcHJvcGVydGllcyk7XG4gICAgfVxuICAgIHJldHVybiBwcm9wZXJ0aWVzO1xuICB9XG5cbiAgcHJpdmF0ZSBfYXBwbHlTaXplQ3NzKGNzc0ZyaWVuZGx5Q29sdW1uTmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3QgcHJvcGVydGllcyA9IHRoaXMuX2dldENvbHVtblByb3BlcnRpZXNNYXAoY3NzRnJpZW5kbHlDb2x1bW5OYW1lKTtcbiAgICBjb25zdCBwcm9wZXJ0eUtleXMgPSBBcnJheS5mcm9tKHByb3BlcnRpZXMua2V5cygpKTtcblxuICAgIGxldCBpbmRleCA9IHRoaXMuX2NvbHVtbkluZGV4ZXMuZ2V0KGNzc0ZyaWVuZGx5Q29sdW1uTmFtZSk7XG4gICAgaWYgKGluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghcHJvcGVydHlLZXlzLmxlbmd0aCkge1xuICAgICAgICAvLyBOb3RoaW5nIHRvIHNldCBvciB1bnNldC5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpbmRleCA9IHRoaXMuX2luZGV4U2VxdWVuY2UrKztcbiAgICAgIHRoaXMuX2NvbHVtbkluZGV4ZXMuc2V0KGNzc0ZyaWVuZGx5Q29sdW1uTmFtZSwgaW5kZXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRTdHlsZVNoZWV0KCkuZGVsZXRlUnVsZShpbmRleCk7XG4gICAgfVxuXG4gICAgY29uc3QgY29sdW1uQ2xhc3NOYW1lID0gdGhpcy5nZXRDb2x1bW5Dc3NDbGFzcyhjc3NGcmllbmRseUNvbHVtbk5hbWUpO1xuICAgIGNvbnN0IHRhYmxlQ2xhc3NOYW1lID0gdGhpcy5jb2x1bW5SZXNpemUuZ2V0VW5pcXVlQ3NzQ2xhc3MoKTtcblxuICAgIGNvbnN0IHNlbGVjdG9yID0gYC4ke3RhYmxlQ2xhc3NOYW1lfSAuJHtjb2x1bW5DbGFzc05hbWV9YDtcbiAgICBjb25zdCBib2R5ID0gcHJvcGVydHlLZXlzLm1hcChrZXkgPT4gYCR7a2V5fToke3Byb3BlcnRpZXMuZ2V0KGtleSl9YCkuam9pbignOycpO1xuXG4gICAgdGhpcy5fZ2V0U3R5bGVTaGVldCgpLmluc2VydFJ1bGUoYCR7c2VsZWN0b3J9IHske2JvZHl9fWAsIGluZGV4ISk7XG4gIH1cbn1cblxuLyoqIENvbnZlcnRzIENTUyBwaXhlbCB2YWx1ZXMgdG8gbnVtYmVycywgZWcgXCIxMjNweFwiIHRvIDEyMy4gUmV0dXJucyBOYU4gZm9yIG5vbiBwaXhlbCB2YWx1ZXMuICovXG5mdW5jdGlvbiBjb2VyY2VQaXhlbHNGcm9tQ3NzVmFsdWUoY3NzVmFsdWU6IHN0cmluZyk6IG51bWJlciB7XG4gIHJldHVybiBOdW1iZXIoY3NzVmFsdWUubWF0Y2goLyhcXGQrKXB4Lyk/LlsxXSk7XG59XG5cbi8qKiBHZXRzIHRoZSBzdHlsZS53aWR0aCBwaXhlbHMgb24gdGhlIHNwZWNpZmllZCBlbGVtZW50IGlmIHByZXNlbnQsIG90aGVyd2lzZSBpdHMgb2Zmc2V0V2lkdGguICovXG5mdW5jdGlvbiBnZXRFbGVtZW50V2lkdGgoZWxlbWVudDogSFRNTEVsZW1lbnQpIHtcbiAgLy8gT3B0aW1pemF0aW9uOiBDaGVjayBzdHlsZS53aWR0aCBmaXJzdCBhcyB3ZSBwcm9iYWJseSBzZXQgaXQgYWxyZWFkeSBiZWZvcmUgcmVhZGluZ1xuICAvLyBvZmZzZXRXaWR0aCB3aGljaCB0cmlnZ2VycyBsYXlvdXQuXG4gIHJldHVybiBjb2VyY2VQaXhlbHNGcm9tQ3NzVmFsdWUoZWxlbWVudC5zdHlsZS53aWR0aCkgfHwgZWxlbWVudC5vZmZzZXRXaWR0aDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBDU1MgZmxleCB2YWx1ZXMgYXMgc2V0IGluIENka0ZsZXhUYWJsZVJlc2l6ZVN0cmF0ZWd5IHRvIG51bWJlcnMsXG4gKiBlZyBcIjAgMC4wMSAxMjNweFwiIHRvIDEyMy5cbiAqL1xuZnVuY3Rpb24gY29lcmNlUGl4ZWxzRnJvbUZsZXhWYWx1ZShmbGV4VmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCk6IG51bWJlciB7XG4gIHJldHVybiBOdW1iZXIoZmxleFZhbHVlPy5tYXRjaCgvMCAwXFwuMDEgKFxcZCspcHgvKT8uWzFdKTtcbn1cblxuZXhwb3J0IGNvbnN0IFRBQkxFX0xBWU9VVF9GSVhFRF9SRVNJWkVfU1RSQVRFR1lfUFJPVklERVI6IFByb3ZpZGVyID0ge1xuICBwcm92aWRlOiBSZXNpemVTdHJhdGVneSxcbiAgdXNlQ2xhc3M6IFRhYmxlTGF5b3V0Rml4ZWRSZXNpemVTdHJhdGVneSxcbn07XG5leHBvcnQgY29uc3QgRkxFWF9SRVNJWkVfU1RSQVRFR1lfUFJPVklERVI6IFByb3ZpZGVyID0ge1xuICBwcm92aWRlOiBSZXNpemVTdHJhdGVneSxcbiAgdXNlQ2xhc3M6IENka0ZsZXhUYWJsZVJlc2l6ZVN0cmF0ZWd5LFxufTtcbiJdfQ==