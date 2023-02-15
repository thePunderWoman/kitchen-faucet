import * as i0 from '@angular/core';
import { Injectable, Optional, Inject, NgModule } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { getYear, getMonth, getDate, getDay, getDaysInMonth, parseISO, parse, format, addYears, addMonths, addDays, formatISO, isDate, isValid } from 'date-fns';

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Creates an array and fills it with values. */
function range(length, valueFunction) {
    const valuesArray = Array(length);
    for (let i = 0; i < length; i++) {
        valuesArray[i] = valueFunction(i);
    }
    return valuesArray;
}
// date-fns doesn't have a way to read/print month names or days of the week directly,
// so we get them by formatting a date with a format that produces the desired month/day.
const MONTH_FORMATS = {
    long: 'LLLL',
    short: 'LLL',
    narrow: 'LLLLL',
};
const DAY_OF_WEEK_FORMATS = {
    long: 'EEEE',
    short: 'EEE',
    narrow: 'EEEEE',
};
/** Adds date-fns support to Angular Material. */
class DateFnsAdapter extends DateAdapter {
    constructor(matDateLocale) {
        super();
        this.setLocale(matDateLocale);
    }
    getYear(date) {
        return getYear(date);
    }
    getMonth(date) {
        return getMonth(date);
    }
    getDate(date) {
        return getDate(date);
    }
    getDayOfWeek(date) {
        return getDay(date);
    }
    getMonthNames(style) {
        const pattern = MONTH_FORMATS[style];
        return range(12, i => this.format(new Date(2017, i, 1), pattern));
    }
    getDateNames() {
        const dtf = typeof Intl !== 'undefined'
            ? new Intl.DateTimeFormat(this.locale.code, {
                day: 'numeric',
                timeZone: 'utc',
            })
            : null;
        return range(31, i => {
            if (dtf) {
                // date-fns doesn't appear to support this functionality.
                // Fall back to `Intl` on supported browsers.
                const date = new Date();
                date.setUTCFullYear(2017, 0, i + 1);
                date.setUTCHours(0, 0, 0, 0);
                return dtf.format(date).replace(/[\u200e\u200f]/g, '');
            }
            return i + '';
        });
    }
    getDayOfWeekNames(style) {
        const pattern = DAY_OF_WEEK_FORMATS[style];
        return range(7, i => this.format(new Date(2017, 0, i + 1), pattern));
    }
    getYearName(date) {
        return this.format(date, 'y');
    }
    getFirstDayOfWeek() {
        var _a, _b;
        return (_b = (_a = this.locale.options) === null || _a === void 0 ? void 0 : _a.weekStartsOn) !== null && _b !== void 0 ? _b : 0;
    }
    getNumDaysInMonth(date) {
        return getDaysInMonth(date);
    }
    clone(date) {
        return new Date(date.getTime());
    }
    createDate(year, month, date) {
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
            // Check for invalid month and date (except upper bound on date which we have to check after
            // creating the Date).
            if (month < 0 || month > 11) {
                throw Error(`Invalid month index "${month}". Month index has to be between 0 and 11.`);
            }
            if (date < 1) {
                throw Error(`Invalid date "${date}". Date has to be greater than 0.`);
            }
        }
        // Passing the year to the constructor causes year numbers <100 to be converted to 19xx.
        // To work around this we use `setFullYear` and `setHours` instead.
        const result = new Date();
        result.setFullYear(year, month, date);
        result.setHours(0, 0, 0, 0);
        // Check that the date wasn't above the upper bound for the month, causing the month to overflow
        if (result.getMonth() != month && (typeof ngDevMode === 'undefined' || ngDevMode)) {
            throw Error(`Invalid date "${date}" for month with index "${month}".`);
        }
        return result;
    }
    today() {
        return new Date();
    }
    parse(value, parseFormat) {
        if (typeof value == 'string' && value.length > 0) {
            const iso8601Date = parseISO(value);
            if (this.isValid(iso8601Date)) {
                return iso8601Date;
            }
            const formats = Array.isArray(parseFormat) ? parseFormat : [parseFormat];
            if (!parseFormat.length) {
                throw Error('Formats array must not be empty.');
            }
            for (const currentFormat of formats) {
                const fromFormat = parse(value, currentFormat, new Date(), { locale: this.locale });
                if (this.isValid(fromFormat)) {
                    return fromFormat;
                }
            }
            return this.invalid();
        }
        else if (typeof value === 'number') {
            return new Date(value);
        }
        else if (value instanceof Date) {
            return this.clone(value);
        }
        return null;
    }
    format(date, displayFormat) {
        if (!this.isValid(date)) {
            throw Error('DateFnsAdapter: Cannot format invalid date.');
        }
        return format(date, displayFormat, { locale: this.locale });
    }
    addCalendarYears(date, years) {
        return addYears(date, years);
    }
    addCalendarMonths(date, months) {
        return addMonths(date, months);
    }
    addCalendarDays(date, days) {
        return addDays(date, days);
    }
    toIso8601(date) {
        return formatISO(date, { representation: 'date' });
    }
    /**
     * Returns the given value if given a valid Date or null. Deserializes valid ISO 8601 strings
     * (https://www.ietf.org/rfc/rfc3339.txt) into valid Dates and empty string into null. Returns an
     * invalid date for all other values.
     */
    deserialize(value) {
        if (typeof value === 'string') {
            if (!value) {
                return null;
            }
            const date = parseISO(value);
            if (this.isValid(date)) {
                return date;
            }
        }
        return super.deserialize(value);
    }
    isDateInstance(obj) {
        return isDate(obj);
    }
    isValid(date) {
        return isValid(date);
    }
    invalid() {
        return new Date(NaN);
    }
}
DateFnsAdapter.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DateFnsAdapter, deps: [{ token: MAT_DATE_LOCALE, optional: true }], target: i0.ɵɵFactoryTarget.Injectable });
DateFnsAdapter.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DateFnsAdapter });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DateFnsAdapter, decorators: [{
            type: Injectable
        }], ctorParameters: function () {
        return [{ type: undefined, decorators: [{
                        type: Optional
                    }, {
                        type: Inject,
                        args: [MAT_DATE_LOCALE]
                    }] }];
    } });

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const MAT_DATE_FNS_FORMATS = {
    parse: {
        dateInput: 'P',
    },
    display: {
        dateInput: 'P',
        monthYearLabel: 'LLL uuuu',
        dateA11yLabel: 'PP',
        monthYearA11yLabel: 'LLLL uuuu',
    },
};

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class DateFnsModule {
}
DateFnsModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DateFnsModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
DateFnsModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: DateFnsModule });
DateFnsModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DateFnsModule, providers: [
        {
            provide: DateAdapter,
            useClass: DateFnsAdapter,
            deps: [MAT_DATE_LOCALE],
        },
    ] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: DateFnsModule, decorators: [{
            type: NgModule,
            args: [{
                    providers: [
                        {
                            provide: DateAdapter,
                            useClass: DateFnsAdapter,
                            deps: [MAT_DATE_LOCALE],
                        },
                    ],
                }]
        }] });
class MatDateFnsModule {
}
MatDateFnsModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatDateFnsModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
MatDateFnsModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0", ngImport: i0, type: MatDateFnsModule, imports: [DateFnsModule] });
MatDateFnsModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatDateFnsModule, providers: [{ provide: MAT_DATE_FORMATS, useValue: MAT_DATE_FNS_FORMATS }], imports: [DateFnsModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: MatDateFnsModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [DateFnsModule],
                    providers: [{ provide: MAT_DATE_FORMATS, useValue: MAT_DATE_FNS_FORMATS }],
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

export { DateFnsAdapter, DateFnsModule, MAT_DATE_FNS_FORMATS, MatDateFnsModule };
//# sourceMappingURL=material-date-fns-adapter.mjs.map
