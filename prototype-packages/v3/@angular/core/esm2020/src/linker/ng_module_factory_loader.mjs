/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModuleFactory as R3NgModuleFactory } from '../render3/ng_module_ref';
import { getRegisteredNgModuleType } from './ng_module_registration';
/**
 * Returns the NgModuleFactory with the given id (specified using [@NgModule.id
 * field](api/core/NgModule#id)), if it exists and has been loaded. Factories for NgModules that do
 * not specify an `id` cannot be retrieved. Throws if an NgModule cannot be found.
 * @publicApi
 * @deprecated Use `getNgModuleById` instead.
 */
export function getModuleFactory(id) {
    const type = getRegisteredNgModuleType(id);
    if (!type)
        throw noModuleError(id);
    return new R3NgModuleFactory(type);
}
/**
 * Returns the NgModule class with the given id (specified using [@NgModule.id
 * field](api/core/NgModule#id)), if it exists and has been loaded. Classes for NgModules that do
 * not specify an `id` cannot be retrieved. Throws if an NgModule cannot be found.
 * @publicApi
 */
export function getNgModuleById(id) {
    const type = getRegisteredNgModuleType(id);
    if (!type)
        throw noModuleError(id);
    return type;
}
function noModuleError(id) {
    return new Error(`No module with ID ${id} loaded`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlX2ZhY3RvcnlfbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvbGlua2VyL25nX21vZHVsZV9mYWN0b3J5X2xvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFHSCxPQUFPLEVBQUMsZUFBZSxJQUFJLGlCQUFpQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFHOUUsT0FBTyxFQUFDLHlCQUF5QixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFFbkU7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUFDLEVBQVU7SUFDekMsTUFBTSxJQUFJLEdBQUcseUJBQXlCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDM0MsSUFBSSxDQUFDLElBQUk7UUFBRSxNQUFNLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuQyxPQUFPLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckMsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBSSxFQUFVO0lBQzNDLE1BQU0sSUFBSSxHQUFHLHlCQUF5QixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzNDLElBQUksQ0FBQyxJQUFJO1FBQUUsTUFBTSxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkMsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQ2xCLEVBQVU7SUFFWixPQUFPLElBQUksS0FBSyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3JELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUeXBlfSBmcm9tICcuLi9pbnRlcmZhY2UvdHlwZSc7XG5pbXBvcnQge05nTW9kdWxlRmFjdG9yeSBhcyBSM05nTW9kdWxlRmFjdG9yeX0gZnJvbSAnLi4vcmVuZGVyMy9uZ19tb2R1bGVfcmVmJztcblxuaW1wb3J0IHtOZ01vZHVsZUZhY3Rvcnl9IGZyb20gJy4vbmdfbW9kdWxlX2ZhY3RvcnknO1xuaW1wb3J0IHtnZXRSZWdpc3RlcmVkTmdNb2R1bGVUeXBlfSBmcm9tICcuL25nX21vZHVsZV9yZWdpc3RyYXRpb24nO1xuXG4vKipcbiAqIFJldHVybnMgdGhlIE5nTW9kdWxlRmFjdG9yeSB3aXRoIHRoZSBnaXZlbiBpZCAoc3BlY2lmaWVkIHVzaW5nIFtATmdNb2R1bGUuaWRcbiAqIGZpZWxkXShhcGkvY29yZS9OZ01vZHVsZSNpZCkpLCBpZiBpdCBleGlzdHMgYW5kIGhhcyBiZWVuIGxvYWRlZC4gRmFjdG9yaWVzIGZvciBOZ01vZHVsZXMgdGhhdCBkb1xuICogbm90IHNwZWNpZnkgYW4gYGlkYCBjYW5ub3QgYmUgcmV0cmlldmVkLiBUaHJvd3MgaWYgYW4gTmdNb2R1bGUgY2Fubm90IGJlIGZvdW5kLlxuICogQHB1YmxpY0FwaVxuICogQGRlcHJlY2F0ZWQgVXNlIGBnZXROZ01vZHVsZUJ5SWRgIGluc3RlYWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRNb2R1bGVGYWN0b3J5KGlkOiBzdHJpbmcpOiBOZ01vZHVsZUZhY3Rvcnk8YW55PiB7XG4gIGNvbnN0IHR5cGUgPSBnZXRSZWdpc3RlcmVkTmdNb2R1bGVUeXBlKGlkKTtcbiAgaWYgKCF0eXBlKSB0aHJvdyBub01vZHVsZUVycm9yKGlkKTtcbiAgcmV0dXJuIG5ldyBSM05nTW9kdWxlRmFjdG9yeSh0eXBlKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBOZ01vZHVsZSBjbGFzcyB3aXRoIHRoZSBnaXZlbiBpZCAoc3BlY2lmaWVkIHVzaW5nIFtATmdNb2R1bGUuaWRcbiAqIGZpZWxkXShhcGkvY29yZS9OZ01vZHVsZSNpZCkpLCBpZiBpdCBleGlzdHMgYW5kIGhhcyBiZWVuIGxvYWRlZC4gQ2xhc3NlcyBmb3IgTmdNb2R1bGVzIHRoYXQgZG9cbiAqIG5vdCBzcGVjaWZ5IGFuIGBpZGAgY2Fubm90IGJlIHJldHJpZXZlZC4gVGhyb3dzIGlmIGFuIE5nTW9kdWxlIGNhbm5vdCBiZSBmb3VuZC5cbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE5nTW9kdWxlQnlJZDxUPihpZDogc3RyaW5nKTogVHlwZTxUPiB7XG4gIGNvbnN0IHR5cGUgPSBnZXRSZWdpc3RlcmVkTmdNb2R1bGVUeXBlKGlkKTtcbiAgaWYgKCF0eXBlKSB0aHJvdyBub01vZHVsZUVycm9yKGlkKTtcbiAgcmV0dXJuIHR5cGU7XG59XG5cbmZ1bmN0aW9uIG5vTW9kdWxlRXJyb3IoXG4gICAgaWQ6IHN0cmluZyxcbiAgICApOiBFcnJvciB7XG4gIHJldHVybiBuZXcgRXJyb3IoYE5vIG1vZHVsZSB3aXRoIElEICR7aWR9IGxvYWRlZGApO1xufVxuIl19