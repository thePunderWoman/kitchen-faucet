import { DateAdapter } from '@angular/material/core';
import { DateTime } from 'luxon';
import * as i0 from '@angular/core';
import { InjectionToken } from '@angular/core';
import { MatDateFormats } from '@angular/material/core';

/** Adapts Luxon Dates for use with Angular Material. */
export declare class LuxonDateAdapter extends DateAdapter<DateTime> {
    private _useUTC;
    private _firstDayOfWeek;
    constructor(dateLocale: string, options?: MatLuxonDateAdapterOptions);
    getYear(date: DateTime): number;
    getMonth(date: DateTime): number;
    getDate(date: DateTime): number;
    getDayOfWeek(date: DateTime): number;
    getMonthNames(style: 'long' | 'short' | 'narrow'): string[];
    getDateNames(): string[];
    getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[];
    getYearName(date: DateTime): string;
    getFirstDayOfWeek(): number;
    getNumDaysInMonth(date: DateTime): number;
    clone(date: DateTime): DateTime;
    createDate(year: number, month: number, date: number): DateTime;
    today(): DateTime;
    parse(value: any, parseFormat: string | string[]): DateTime | null;
    format(date: DateTime, displayFormat: string): string;
    addCalendarYears(date: DateTime, years: number): DateTime;
    addCalendarMonths(date: DateTime, months: number): DateTime;
    addCalendarDays(date: DateTime, days: number): DateTime;
    toIso8601(date: DateTime): string;
    /**
     * Returns the given value if given a valid Luxon or null. Deserializes valid ISO 8601 strings
     * (https://www.ietf.org/rfc/rfc3339.txt) and valid Date objects into valid DateTime and empty
     * string into null. Returns an invalid date for all other values.
     */
    deserialize(value: any): DateTime | null;
    isDateInstance(obj: any): boolean;
    isValid(date: DateTime): boolean;
    invalid(): DateTime;
    /** Gets the options that should be used when constructing a new `DateTime` object. */
    private _getOptions;
    static ɵfac: i0.ɵɵFactoryDeclaration<LuxonDateAdapter, [{ optional: true; }, { optional: true; }]>;
    static ɵprov: i0.ɵɵInjectableDeclaration<LuxonDateAdapter>;
}

export declare class LuxonDateModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<LuxonDateModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<LuxonDateModule, never, never, never>;
    static ɵinj: i0.ɵɵInjectorDeclaration<LuxonDateModule>;
}

/** InjectionToken for LuxonDateAdapter to configure options. */
export declare const MAT_LUXON_DATE_ADAPTER_OPTIONS: InjectionToken<MatLuxonDateAdapterOptions>;

/** @docs-private */
export declare function MAT_LUXON_DATE_ADAPTER_OPTIONS_FACTORY(): MatLuxonDateAdapterOptions;

export declare const MAT_LUXON_DATE_FORMATS: MatDateFormats;

/** Configurable options for the `LuxonDateAdapter`. */
export declare interface MatLuxonDateAdapterOptions {
    /**
     * Turns the use of utc dates on or off.
     * Changing this will change how Angular Material components like DatePicker output dates.
     */
    useUtc: boolean;
    /**
     * Sets the first day of week.
     * Changing this will change how Angular Material components like DatePicker shows start of week.
     */
    firstDayOfWeek: number;
}

export declare class MatLuxonDateModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<MatLuxonDateModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<MatLuxonDateModule, never, [typeof LuxonDateModule], never>;
    static ɵinj: i0.ɵɵInjectorDeclaration<MatLuxonDateModule>;
}

export { }
