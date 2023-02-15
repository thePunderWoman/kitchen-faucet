import { DateAdapter } from '@angular/material/core';
import * as i0 from '@angular/core';
import { Locale as Locale_2 } from 'date-fns';
import { MatDateFormats } from '@angular/material/core';

/** Adds date-fns support to Angular Material. */
export declare class DateFnsAdapter extends DateAdapter<Date, Locale_2> {
    constructor(matDateLocale: {});
    getYear(date: Date): number;
    getMonth(date: Date): number;
    getDate(date: Date): number;
    getDayOfWeek(date: Date): number;
    getMonthNames(style: 'long' | 'short' | 'narrow'): string[];
    getDateNames(): string[];
    getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[];
    getYearName(date: Date): string;
    getFirstDayOfWeek(): number;
    getNumDaysInMonth(date: Date): number;
    clone(date: Date): Date;
    createDate(year: number, month: number, date: number): Date;
    today(): Date;
    parse(value: any, parseFormat: string | string[]): Date | null;
    format(date: Date, displayFormat: string): string;
    addCalendarYears(date: Date, years: number): Date;
    addCalendarMonths(date: Date, months: number): Date;
    addCalendarDays(date: Date, days: number): Date;
    toIso8601(date: Date): string;
    /**
     * Returns the given value if given a valid Date or null. Deserializes valid ISO 8601 strings
     * (https://www.ietf.org/rfc/rfc3339.txt) into valid Dates and empty string into null. Returns an
     * invalid date for all other values.
     */
    deserialize(value: any): Date | null;
    isDateInstance(obj: any): boolean;
    isValid(date: Date): boolean;
    invalid(): Date;
    static ɵfac: i0.ɵɵFactoryDeclaration<DateFnsAdapter, [{ optional: true; }]>;
    static ɵprov: i0.ɵɵInjectableDeclaration<DateFnsAdapter>;
}

export declare class DateFnsModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<DateFnsModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<DateFnsModule, never, never, never>;
    static ɵinj: i0.ɵɵInjectorDeclaration<DateFnsModule>;
}

export declare const MAT_DATE_FNS_FORMATS: MatDateFormats;

export declare class MatDateFnsModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<MatDateFnsModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<MatDateFnsModule, never, [typeof DateFnsModule], never>;
    static ɵinj: i0.ɵɵInjectorDeclaration<MatDateFnsModule>;
}

export { }
