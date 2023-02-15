import * as i0 from '@angular/core';
import { InjectionToken, Injectable, Optional, Inject, NgModule } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { DateTime, Info } from 'luxon';

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** InjectionToken for LuxonDateAdapter to configure options. */
const MAT_LUXON_DATE_ADAPTER_OPTIONS = new InjectionToken('MAT_LUXON_DATE_ADAPTER_OPTIONS', {
    providedIn: 'root',
    factory: MAT_LUXON_DATE_ADAPTER_OPTIONS_FACTORY,
});
/** @docs-private */
function MAT_LUXON_DATE_ADAPTER_OPTIONS_FACTORY() {
    return {
        useUtc: false,
        firstDayOfWeek: 0,
    };
}
/** Creates an array and fills it with values. */
function range(length, valueFunction) {
    const valuesArray = Array(length);
    for (let i = 0; i < length; i++) {
        valuesArray[i] = valueFunction(i);
    }
    return valuesArray;
}
/** Adapts Luxon Dates for use with Angular Material. */
class LuxonDateAdapter extends DateAdapter {
    constructor(dateLocale, options) {
        super();
        this._useUTC = !!options?.useUtc;
        this._firstDayOfWeek = options?.firstDayOfWeek || 0;
        this.setLocale(dateLocale || DateTime.local().locale);
    }
    getYear(date) {
        return date.year;
    }
    getMonth(date) {
        // Luxon works with 1-indexed months whereas our code expects 0-indexed.
        return date.month - 1;
    }
    getDate(date) {
        return date.day;
    }
    getDayOfWeek(date) {
        return date.weekday;
    }
    getMonthNames(style) {
        return Info.months(style, { locale: this.locale });
    }
    getDateNames() {
        // At the time of writing, Luxon doesn't offer similar
        // functionality so we have to fall back to the Intl API.
        const dtf = new Intl.DateTimeFormat(this.locale, { day: 'numeric', timeZone: 'utc' });
        // Format a UTC date in order to avoid DST issues.
        return range(31, i => dtf.format(DateTime.utc(2017, 1, i + 1).toJSDate()));
    }
    getDayOfWeekNames(style) {
        // Note that we shift the array once, because Luxon returns Monday as the
        // first day of the week, whereas our logic assumes that it's Sunday. See:
        // https://moment.github.io/luxon/api-docs/index.html#infoweekdays
        const days = Info.weekdays(style, { locale: this.locale });
        days.unshift(days.pop());
        return days;
    }
    getYearName(date) {
        return date.toFormat('yyyy');
    }
    getFirstDayOfWeek() {
        return this._firstDayOfWeek;
    }
    getNumDaysInMonth(date) {
        return date.daysInMonth;
    }
    clone(date) {
        return DateTime.fromObject(date.toObject());
    }
    createDate(year, month, date) {
        if (month < 0 || month > 11) {
            throw Error(`Invalid month index "${month}". Month index has to be between 0 and 11.`);
        }
        if (date < 1) {
            throw Error(`Invalid date "${date}". Date has to be greater than 0.`);
        }
        // Luxon uses 1-indexed months so we need to add one to the month.
        const result = this._useUTC
            ? DateTime.utc(year, month + 1, date)
            : DateTime.local(year, month + 1, date);
        if (!this.isValid(result)) {
            throw Error(`Invalid date "${date}". Reason: "${result.invalidReason}".`);
        }
        return result.setLocale(this.locale);
    }
    today() {
        return (this._useUTC ? DateTime.utc() : DateTime.local()).setLocale(this.locale);
    }
    parse(value, parseFormat) {
        const options = this._getOptions();
        if (typeof value == 'string' && value.length > 0) {
            const iso8601Date = DateTime.fromISO(value, options);
            if (this.isValid(iso8601Date)) {
                return iso8601Date;
            }
            const formats = Array.isArray(parseFormat) ? parseFormat : [parseFormat];
            if (!parseFormat.length) {
                throw Error('Formats array must not be empty.');
            }
            for (const format of formats) {
                const fromFormat = DateTime.fromFormat(value, format, options);
                if (this.isValid(fromFormat)) {
                    return fromFormat;
                }
            }
            return this.invalid();
        }
        else if (typeof value === 'number') {
            return DateTime.fromMillis(value, options);
        }
        else if (value instanceof Date) {
            return DateTime.fromJSDate(value, options);
        }
        else if (value instanceof DateTime) {
            return DateTime.fromMillis(value.toMillis(), options);
        }
        return null;
    }
    format(date, displayFormat) {
        if (!this.isValid(date)) {
            throw Error('LuxonDateAdapter: Cannot format invalid date.');
        }
        return date
            .setLocale(this.locale)
            .setZone(this._useUTC ? 'utc' : undefined)
            .toFormat(displayFormat);
    }
    addCalendarYears(date, years) {
        return date.plus({ years }).setLocale(this.locale);
    }
    addCalendarMonths(date, months) {
        return date.plus({ months }).setLocale(this.locale);
    }
    addCalendarDays(date, days) {
        return date.plus({ days }).setLocale(this.locale);
    }
    toIso8601(date) {
        return date.toISO();
    }
    /**
     * Returns the given value if given a valid Luxon or null. Deserializes valid ISO 8601 strings
     * (https://www.ietf.org/rfc/rfc3339.txt) and valid Date objects into valid DateTime and empty
     * string into null. Returns an invalid date for all other values.
     */
    deserialize(value) {
        const options = this._getOptions();
        let date;
        if (value instanceof Date) {
            date = DateTime.fromJSDate(value, options);
        }
        if (typeof value === 'string') {
            if (!value) {
                return null;
            }
            date = DateTime.fromISO(value, options);
        }
        if (date && this.isValid(date)) {
            return date;
        }
        return super.deserialize(value);
    }
    isDateInstance(obj) {
        return obj instanceof DateTime;
    }
    isValid(date) {
        return date.isValid;
    }
    invalid() {
        return DateTime.invalid('Invalid Luxon DateTime object.');
    }
    /** Gets the options that should be used when constructing a new `DateTime` object. */
    _getOptions() {
        return {
            zone: this._useUTC ? 'utc' : undefined,
            locale: this.locale,
        };
    }
}
LuxonDateAdapter.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: LuxonDateAdapter, deps: [{ token: MAT_DATE_LOCALE, optional: true }, { token: MAT_LUXON_DATE_ADAPTER_OPTIONS, optional: true }], target: i0.ɵɵFactoryTarget.Injectable });
LuxonDateAdapter.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: LuxonDateAdapter });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: LuxonDateAdapter, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [MAT_DATE_LOCALE]
                }] }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [MAT_LUXON_DATE_ADAPTER_OPTIONS]
                }] }]; } });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const MAT_LUXON_DATE_FORMATS = {
    parse: {
        dateInput: 'D',
    },
    display: {
        dateInput: 'D',
        monthYearLabel: 'LLL yyyy',
        dateA11yLabel: 'DD',
        monthYearA11yLabel: 'LLLL yyyy',
    },
};

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class LuxonDateModule {
}
LuxonDateModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: LuxonDateModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
LuxonDateModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: LuxonDateModule });
LuxonDateModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: LuxonDateModule, providers: [
        {
            provide: DateAdapter,
            useClass: LuxonDateAdapter,
            deps: [MAT_DATE_LOCALE, MAT_LUXON_DATE_ADAPTER_OPTIONS],
        },
    ] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: LuxonDateModule, decorators: [{
            type: NgModule,
            args: [{
                    providers: [
                        {
                            provide: DateAdapter,
                            useClass: LuxonDateAdapter,
                            deps: [MAT_DATE_LOCALE, MAT_LUXON_DATE_ADAPTER_OPTIONS],
                        },
                    ],
                }]
        }] });
class MatLuxonDateModule {
}
MatLuxonDateModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatLuxonDateModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
MatLuxonDateModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: MatLuxonDateModule, imports: [LuxonDateModule] });
MatLuxonDateModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatLuxonDateModule, providers: [{ provide: MAT_DATE_FORMATS, useValue: MAT_LUXON_DATE_FORMATS }], imports: [LuxonDateModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatLuxonDateModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [LuxonDateModule],
                    providers: [{ provide: MAT_DATE_FORMATS, useValue: MAT_LUXON_DATE_FORMATS }],
                }]
        }] });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * Generated bundle index. Do not edit.
 */

export { LuxonDateAdapter, LuxonDateModule, MAT_LUXON_DATE_ADAPTER_OPTIONS, MAT_LUXON_DATE_ADAPTER_OPTIONS_FACTORY, MAT_LUXON_DATE_FORMATS, MatLuxonDateModule };
//# sourceMappingURL=material-luxon-adapter.mjs.map
