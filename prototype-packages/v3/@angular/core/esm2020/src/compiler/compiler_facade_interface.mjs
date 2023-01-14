/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export var FactoryTarget;
(function (FactoryTarget) {
    FactoryTarget[FactoryTarget["Directive"] = 0] = "Directive";
    FactoryTarget[FactoryTarget["Component"] = 1] = "Component";
    FactoryTarget[FactoryTarget["Injectable"] = 2] = "Injectable";
    FactoryTarget[FactoryTarget["Pipe"] = 3] = "Pipe";
    FactoryTarget[FactoryTarget["NgModule"] = 4] = "NgModule";
})(FactoryTarget || (FactoryTarget = {}));
export var R3TemplateDependencyKind;
(function (R3TemplateDependencyKind) {
    R3TemplateDependencyKind[R3TemplateDependencyKind["Directive"] = 0] = "Directive";
    R3TemplateDependencyKind[R3TemplateDependencyKind["Pipe"] = 1] = "Pipe";
    R3TemplateDependencyKind[R3TemplateDependencyKind["NgModule"] = 2] = "NgModule";
})(R3TemplateDependencyKind || (R3TemplateDependencyKind = {}));
export var ViewEncapsulation;
(function (ViewEncapsulation) {
    ViewEncapsulation[ViewEncapsulation["Emulated"] = 0] = "Emulated";
    // Historically the 1 value was for `Native` encapsulation which has been removed as of v11.
    ViewEncapsulation[ViewEncapsulation["None"] = 2] = "None";
    ViewEncapsulation[ViewEncapsulation["ShadowDom"] = 3] = "ShadowDom";
})(ViewEncapsulation || (ViewEncapsulation = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfZmFjYWRlX2ludGVyZmFjZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvcmUvc3JjL2NvbXBpbGVyL2NvbXBpbGVyX2ZhY2FkZV9pbnRlcmZhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBbUZILE1BQU0sQ0FBTixJQUFZLGFBTVg7QUFORCxXQUFZLGFBQWE7SUFDdkIsMkRBQWEsQ0FBQTtJQUNiLDJEQUFhLENBQUE7SUFDYiw2REFBYyxDQUFBO0lBQ2QsaURBQVEsQ0FBQTtJQUNSLHlEQUFZLENBQUE7QUFDZCxDQUFDLEVBTlcsYUFBYSxLQUFiLGFBQWEsUUFNeEI7QUFtS0QsTUFBTSxDQUFOLElBQVksd0JBSVg7QUFKRCxXQUFZLHdCQUF3QjtJQUNsQyxpRkFBYSxDQUFBO0lBQ2IsdUVBQVEsQ0FBQTtJQUNSLCtFQUFZLENBQUE7QUFDZCxDQUFDLEVBSlcsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUluQztBQThCRCxNQUFNLENBQU4sSUFBWSxpQkFLWDtBQUxELFdBQVksaUJBQWlCO0lBQzNCLGlFQUFZLENBQUE7SUFDWiw0RkFBNEY7SUFDNUYseURBQVEsQ0FBQTtJQUNSLG1FQUFhLENBQUE7QUFDZixDQUFDLEVBTFcsaUJBQWlCLEtBQWpCLGlCQUFpQixRQUs1QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vKipcbiAqIEEgc2V0IG9mIGludGVyZmFjZXMgd2hpY2ggYXJlIHNoYXJlZCBiZXR3ZWVuIGBAYW5ndWxhci9jb3JlYCBhbmQgYEBhbmd1bGFyL2NvbXBpbGVyYCB0byBhbGxvd1xuICogZm9yIGxhdGUgYmluZGluZyBvZiBgQGFuZ3VsYXIvY29tcGlsZXJgIGZvciBKSVQgcHVycG9zZXMuXG4gKlxuICogVGhpcyBmaWxlIGhhcyB0d28gY29waWVzLiBQbGVhc2UgZW5zdXJlIHRoYXQgdGhleSBhcmUgaW4gc3luYzpcbiAqICAtIHBhY2thZ2VzL2NvbXBpbGVyL3NyYy9jb21waWxlcl9mYWNhZGVfaW50ZXJmYWNlLnRzICAgICAgICAgIChtYWluKVxuICogIC0gcGFja2FnZXMvY29yZS9zcmMvY29tcGlsZXIvY29tcGlsZXJfZmFjYWRlX2ludGVyZmFjZS50cyAgICAgKHJlcGxpY2EpXG4gKlxuICogUGxlYXNlIGVuc3VyZSB0aGF0IHRoZSB0d28gZmlsZXMgYXJlIGluIHN5bmMgdXNpbmcgdGhpcyBjb21tYW5kOlxuICogYGBgXG4gKiBjcCBwYWNrYWdlcy9jb21waWxlci9zcmMvY29tcGlsZXJfZmFjYWRlX2ludGVyZmFjZS50cyBcXFxuICogICAgcGFja2FnZXMvY29yZS9zcmMvY29tcGlsZXIvY29tcGlsZXJfZmFjYWRlX2ludGVyZmFjZS50c1xuICogYGBgXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBFeHBvcnRlZENvbXBpbGVyRmFjYWRlIHtcbiAgybVjb21waWxlckZhY2FkZTogQ29tcGlsZXJGYWNhZGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJGYWNhZGUge1xuICBjb21waWxlUGlwZShhbmd1bGFyQ29yZUVudjogQ29yZUVudmlyb25tZW50LCBzb3VyY2VNYXBVcmw6IHN0cmluZywgbWV0YTogUjNQaXBlTWV0YWRhdGFGYWNhZGUpOlxuICAgICAgYW55O1xuICBjb21waWxlUGlwZURlY2xhcmF0aW9uKFxuICAgICAgYW5ndWxhckNvcmVFbnY6IENvcmVFbnZpcm9ubWVudCwgc291cmNlTWFwVXJsOiBzdHJpbmcsIGRlY2xhcmF0aW9uOiBSM0RlY2xhcmVQaXBlRmFjYWRlKTogYW55O1xuICBjb21waWxlSW5qZWN0YWJsZShcbiAgICAgIGFuZ3VsYXJDb3JlRW52OiBDb3JlRW52aXJvbm1lbnQsIHNvdXJjZU1hcFVybDogc3RyaW5nLCBtZXRhOiBSM0luamVjdGFibGVNZXRhZGF0YUZhY2FkZSk6IGFueTtcbiAgY29tcGlsZUluamVjdGFibGVEZWNsYXJhdGlvbihcbiAgICAgIGFuZ3VsYXJDb3JlRW52OiBDb3JlRW52aXJvbm1lbnQsIHNvdXJjZU1hcFVybDogc3RyaW5nLCBtZXRhOiBSM0RlY2xhcmVJbmplY3RhYmxlRmFjYWRlKTogYW55O1xuICBjb21waWxlSW5qZWN0b3IoXG4gICAgICBhbmd1bGFyQ29yZUVudjogQ29yZUVudmlyb25tZW50LCBzb3VyY2VNYXBVcmw6IHN0cmluZywgbWV0YTogUjNJbmplY3Rvck1ldGFkYXRhRmFjYWRlKTogYW55O1xuICBjb21waWxlSW5qZWN0b3JEZWNsYXJhdGlvbihcbiAgICAgIGFuZ3VsYXJDb3JlRW52OiBDb3JlRW52aXJvbm1lbnQsIHNvdXJjZU1hcFVybDogc3RyaW5nLFxuICAgICAgZGVjbGFyYXRpb246IFIzRGVjbGFyZUluamVjdG9yRmFjYWRlKTogYW55O1xuICBjb21waWxlTmdNb2R1bGUoXG4gICAgICBhbmd1bGFyQ29yZUVudjogQ29yZUVudmlyb25tZW50LCBzb3VyY2VNYXBVcmw6IHN0cmluZywgbWV0YTogUjNOZ01vZHVsZU1ldGFkYXRhRmFjYWRlKTogYW55O1xuICBjb21waWxlTmdNb2R1bGVEZWNsYXJhdGlvbihcbiAgICAgIGFuZ3VsYXJDb3JlRW52OiBDb3JlRW52aXJvbm1lbnQsIHNvdXJjZU1hcFVybDogc3RyaW5nLFxuICAgICAgZGVjbGFyYXRpb246IFIzRGVjbGFyZU5nTW9kdWxlRmFjYWRlKTogYW55O1xuICBjb21waWxlRGlyZWN0aXZlKFxuICAgICAgYW5ndWxhckNvcmVFbnY6IENvcmVFbnZpcm9ubWVudCwgc291cmNlTWFwVXJsOiBzdHJpbmcsIG1ldGE6IFIzRGlyZWN0aXZlTWV0YWRhdGFGYWNhZGUpOiBhbnk7XG4gIGNvbXBpbGVEaXJlY3RpdmVEZWNsYXJhdGlvbihcbiAgICAgIGFuZ3VsYXJDb3JlRW52OiBDb3JlRW52aXJvbm1lbnQsIHNvdXJjZU1hcFVybDogc3RyaW5nLFxuICAgICAgZGVjbGFyYXRpb246IFIzRGVjbGFyZURpcmVjdGl2ZUZhY2FkZSk6IGFueTtcbiAgY29tcGlsZUNvbXBvbmVudChcbiAgICAgIGFuZ3VsYXJDb3JlRW52OiBDb3JlRW52aXJvbm1lbnQsIHNvdXJjZU1hcFVybDogc3RyaW5nLCBtZXRhOiBSM0NvbXBvbmVudE1ldGFkYXRhRmFjYWRlKTogYW55O1xuICBjb21waWxlQ29tcG9uZW50RGVjbGFyYXRpb24oXG4gICAgICBhbmd1bGFyQ29yZUVudjogQ29yZUVudmlyb25tZW50LCBzb3VyY2VNYXBVcmw6IHN0cmluZyxcbiAgICAgIGRlY2xhcmF0aW9uOiBSM0RlY2xhcmVDb21wb25lbnRGYWNhZGUpOiBhbnk7XG4gIGNvbXBpbGVGYWN0b3J5KFxuICAgICAgYW5ndWxhckNvcmVFbnY6IENvcmVFbnZpcm9ubWVudCwgc291cmNlTWFwVXJsOiBzdHJpbmcsIG1ldGE6IFIzRmFjdG9yeURlZk1ldGFkYXRhRmFjYWRlKTogYW55O1xuICBjb21waWxlRmFjdG9yeURlY2xhcmF0aW9uKFxuICAgICAgYW5ndWxhckNvcmVFbnY6IENvcmVFbnZpcm9ubWVudCwgc291cmNlTWFwVXJsOiBzdHJpbmcsIG1ldGE6IFIzRGVjbGFyZUZhY3RvcnlGYWNhZGUpOiBhbnk7XG5cbiAgY3JlYXRlUGFyc2VTb3VyY2VTcGFuKGtpbmQ6IHN0cmluZywgdHlwZU5hbWU6IHN0cmluZywgc291cmNlVXJsOiBzdHJpbmcpOiBQYXJzZVNvdXJjZVNwYW47XG5cbiAgRmFjdG9yeVRhcmdldDogdHlwZW9mIEZhY3RvcnlUYXJnZXQ7XG4gIC8vIE5vdGUgdGhhdCB3ZSBkbyBub3QgdXNlIGB7bmV3KCk6IFJlc291cmNlTG9hZGVyfWAgaGVyZSBiZWNhdXNlXG4gIC8vIHRoZSByZXNvdXJjZSBsb2FkZXIgY2xhc3MgaXMgYWJzdHJhY3QgYW5kIG5vdCBjb25zdHJ1Y3RhYmxlLlxuICBSZXNvdXJjZUxvYWRlcjogRnVuY3Rpb24me3Byb3RvdHlwZTogUmVzb3VyY2VMb2FkZXJ9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvcmVFbnZpcm9ubWVudCB7XG4gIFtuYW1lOiBzdHJpbmddOiBGdW5jdGlvbjtcbn1cblxuZXhwb3J0IHR5cGUgUmVzb3VyY2VMb2FkZXIgPSB7XG4gIGdldCh1cmw6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPnxzdHJpbmc7XG59O1xuXG5leHBvcnQgdHlwZSBTdHJpbmdNYXAgPSB7XG4gIFtrZXk6IHN0cmluZ106IHN0cmluZztcbn07XG5cbmV4cG9ydCB0eXBlIFN0cmluZ01hcFdpdGhSZW5hbWUgPSB7XG4gIFtrZXk6IHN0cmluZ106IHN0cmluZ3xbc3RyaW5nLCBzdHJpbmddO1xufTtcblxuZXhwb3J0IHR5cGUgUHJvdmlkZXIgPSB1bmtub3duO1xuZXhwb3J0IHR5cGUgVHlwZSA9IEZ1bmN0aW9uO1xuZXhwb3J0IHR5cGUgT3BhcXVlVmFsdWUgPSB1bmtub3duO1xuXG5leHBvcnQgZW51bSBGYWN0b3J5VGFyZ2V0IHtcbiAgRGlyZWN0aXZlID0gMCxcbiAgQ29tcG9uZW50ID0gMSxcbiAgSW5qZWN0YWJsZSA9IDIsXG4gIFBpcGUgPSAzLFxuICBOZ01vZHVsZSA9IDQsXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNEZXBlbmRlbmN5TWV0YWRhdGFGYWNhZGUge1xuICB0b2tlbjogT3BhcXVlVmFsdWU7XG4gIGF0dHJpYnV0ZTogc3RyaW5nfG51bGw7XG4gIGhvc3Q6IGJvb2xlYW47XG4gIG9wdGlvbmFsOiBib29sZWFuO1xuICBzZWxmOiBib29sZWFuO1xuICBza2lwU2VsZjogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0RlY2xhcmVEZXBlbmRlbmN5TWV0YWRhdGFGYWNhZGUge1xuICB0b2tlbjogT3BhcXVlVmFsdWU7XG4gIGF0dHJpYnV0ZT86IGJvb2xlYW47XG4gIGhvc3Q/OiBib29sZWFuO1xuICBvcHRpb25hbD86IGJvb2xlYW47XG4gIHNlbGY/OiBib29sZWFuO1xuICBza2lwU2VsZj86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNQaXBlTWV0YWRhdGFGYWNhZGUge1xuICBuYW1lOiBzdHJpbmc7XG4gIHR5cGU6IFR5cGU7XG4gIHBpcGVOYW1lOiBzdHJpbmc7XG4gIHB1cmU6IGJvb2xlYW47XG4gIGlzU3RhbmRhbG9uZTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0luamVjdGFibGVNZXRhZGF0YUZhY2FkZSB7XG4gIG5hbWU6IHN0cmluZztcbiAgdHlwZTogVHlwZTtcbiAgdHlwZUFyZ3VtZW50Q291bnQ6IG51bWJlcjtcbiAgcHJvdmlkZWRJbj86IFR5cGV8J3Jvb3QnfCdwbGF0Zm9ybSd8J2FueSd8bnVsbDtcbiAgdXNlQ2xhc3M/OiBPcGFxdWVWYWx1ZTtcbiAgdXNlRmFjdG9yeT86IE9wYXF1ZVZhbHVlO1xuICB1c2VFeGlzdGluZz86IE9wYXF1ZVZhbHVlO1xuICB1c2VWYWx1ZT86IE9wYXF1ZVZhbHVlO1xuICBkZXBzPzogUjNEZXBlbmRlbmN5TWV0YWRhdGFGYWNhZGVbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM05nTW9kdWxlTWV0YWRhdGFGYWNhZGUge1xuICB0eXBlOiBUeXBlO1xuICBib290c3RyYXA6IEZ1bmN0aW9uW107XG4gIGRlY2xhcmF0aW9uczogRnVuY3Rpb25bXTtcbiAgaW1wb3J0czogRnVuY3Rpb25bXTtcbiAgZXhwb3J0czogRnVuY3Rpb25bXTtcbiAgc2NoZW1hczoge25hbWU6IHN0cmluZ31bXXxudWxsO1xuICBpZDogc3RyaW5nfG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNJbmplY3Rvck1ldGFkYXRhRmFjYWRlIHtcbiAgbmFtZTogc3RyaW5nO1xuICB0eXBlOiBUeXBlO1xuICBwcm92aWRlcnM6IFByb3ZpZGVyW107XG4gIGltcG9ydHM6IE9wYXF1ZVZhbHVlW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNIb3N0RGlyZWN0aXZlTWV0YWRhdGFGYWNhZGUge1xuICBkaXJlY3RpdmU6IFR5cGU7XG4gIGlucHV0cz86IHN0cmluZ1tdO1xuICBvdXRwdXRzPzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNEaXJlY3RpdmVNZXRhZGF0YUZhY2FkZSB7XG4gIG5hbWU6IHN0cmluZztcbiAgdHlwZTogVHlwZTtcbiAgdHlwZVNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbjtcbiAgc2VsZWN0b3I6IHN0cmluZ3xudWxsO1xuICBxdWVyaWVzOiBSM1F1ZXJ5TWV0YWRhdGFGYWNhZGVbXTtcbiAgaG9zdDoge1trZXk6IHN0cmluZ106IHN0cmluZ307XG4gIHByb3BNZXRhZGF0YToge1trZXk6IHN0cmluZ106IE9wYXF1ZVZhbHVlW119O1xuICBsaWZlY3ljbGU6IHt1c2VzT25DaGFuZ2VzOiBib29sZWFuO307XG4gIGlucHV0czogc3RyaW5nW107XG4gIG91dHB1dHM6IHN0cmluZ1tdO1xuICB1c2VzSW5oZXJpdGFuY2U6IGJvb2xlYW47XG4gIGV4cG9ydEFzOiBzdHJpbmdbXXxudWxsO1xuICBwcm92aWRlcnM6IFByb3ZpZGVyW118bnVsbDtcbiAgdmlld1F1ZXJpZXM6IFIzUXVlcnlNZXRhZGF0YUZhY2FkZVtdO1xuICBpc1N0YW5kYWxvbmU6IGJvb2xlYW47XG4gIGhvc3REaXJlY3RpdmVzOiBSM0hvc3REaXJlY3RpdmVNZXRhZGF0YUZhY2FkZVtdfG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNDb21wb25lbnRNZXRhZGF0YUZhY2FkZSBleHRlbmRzIFIzRGlyZWN0aXZlTWV0YWRhdGFGYWNhZGUge1xuICB0ZW1wbGF0ZTogc3RyaW5nO1xuICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuO1xuICBhbmltYXRpb25zOiBPcGFxdWVWYWx1ZVtdfHVuZGVmaW5lZDtcbiAgZGVjbGFyYXRpb25zOiBSM1RlbXBsYXRlRGVwZW5kZW5jeUZhY2FkZVtdO1xuICBzdHlsZXM6IHN0cmluZ1tdO1xuICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbjtcbiAgdmlld1Byb3ZpZGVyczogUHJvdmlkZXJbXXxudWxsO1xuICBpbnRlcnBvbGF0aW9uPzogW3N0cmluZywgc3RyaW5nXTtcbiAgY2hhbmdlRGV0ZWN0aW9uPzogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3k7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNEZWNsYXJlRGlyZWN0aXZlRmFjYWRlIHtcbiAgc2VsZWN0b3I/OiBzdHJpbmc7XG4gIHR5cGU6IFR5cGU7XG4gIGlucHV0cz86IHtbY2xhc3NQcm9wZXJ0eU5hbWU6IHN0cmluZ106IHN0cmluZ3xbc3RyaW5nLCBzdHJpbmddfTtcbiAgb3V0cHV0cz86IHtbY2xhc3NQcm9wZXJ0eU5hbWU6IHN0cmluZ106IHN0cmluZ307XG4gIGhvc3Q/OiB7XG4gICAgYXR0cmlidXRlcz86IHtba2V5OiBzdHJpbmddOiBPcGFxdWVWYWx1ZX07XG4gICAgbGlzdGVuZXJzPzoge1trZXk6IHN0cmluZ106IHN0cmluZ307XG4gICAgcHJvcGVydGllcz86IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9O1xuICAgIGNsYXNzQXR0cmlidXRlPzogc3RyaW5nO1xuICAgIHN0eWxlQXR0cmlidXRlPzogc3RyaW5nO1xuICB9O1xuICBxdWVyaWVzPzogUjNEZWNsYXJlUXVlcnlNZXRhZGF0YUZhY2FkZVtdO1xuICB2aWV3UXVlcmllcz86IFIzRGVjbGFyZVF1ZXJ5TWV0YWRhdGFGYWNhZGVbXTtcbiAgcHJvdmlkZXJzPzogT3BhcXVlVmFsdWU7XG4gIGV4cG9ydEFzPzogc3RyaW5nW107XG4gIHVzZXNJbmhlcml0YW5jZT86IGJvb2xlYW47XG4gIHVzZXNPbkNoYW5nZXM/OiBib29sZWFuO1xuICBpc1N0YW5kYWxvbmU/OiBib29sZWFuO1xuICBob3N0RGlyZWN0aXZlcz86IFIzSG9zdERpcmVjdGl2ZU1ldGFkYXRhRmFjYWRlW118bnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0RlY2xhcmVDb21wb25lbnRGYWNhZGUgZXh0ZW5kcyBSM0RlY2xhcmVEaXJlY3RpdmVGYWNhZGUge1xuICB0ZW1wbGF0ZTogc3RyaW5nO1xuICBpc0lubGluZT86IGJvb2xlYW47XG4gIHN0eWxlcz86IHN0cmluZ1tdO1xuXG4gIC8vIFBvc3Qtc3RhbmRhbG9uZSBsaWJyYXJpZXMgdXNlIGEgdW5pZmllZCBkZXBlbmRlbmNpZXMgZmllbGQuXG4gIGRlcGVuZGVuY2llcz86IFIzRGVjbGFyZVRlbXBsYXRlRGVwZW5kZW5jeUZhY2FkZVtdO1xuXG4gIC8vIFByZS1zdGFuZGFsb25lIGxpYnJhcmllcyBoYXZlIHNlcGFyYXRlIGNvbXBvbmVudC9kaXJlY3RpdmUvcGlwZSBmaWVsZHM6XG4gIGNvbXBvbmVudHM/OiBSM0RlY2xhcmVEaXJlY3RpdmVEZXBlbmRlbmN5RmFjYWRlW107XG4gIGRpcmVjdGl2ZXM/OiBSM0RlY2xhcmVEaXJlY3RpdmVEZXBlbmRlbmN5RmFjYWRlW107XG4gIHBpcGVzPzoge1twaXBlTmFtZTogc3RyaW5nXTogT3BhcXVlVmFsdWV8KCgpID0+IE9wYXF1ZVZhbHVlKX07XG5cblxuICB2aWV3UHJvdmlkZXJzPzogT3BhcXVlVmFsdWU7XG4gIGFuaW1hdGlvbnM/OiBPcGFxdWVWYWx1ZTtcbiAgY2hhbmdlRGV0ZWN0aW9uPzogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3k7XG4gIGVuY2Fwc3VsYXRpb24/OiBWaWV3RW5jYXBzdWxhdGlvbjtcbiAgaW50ZXJwb2xhdGlvbj86IFtzdHJpbmcsIHN0cmluZ107XG4gIHByZXNlcnZlV2hpdGVzcGFjZXM/OiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBSM0RlY2xhcmVUZW1wbGF0ZURlcGVuZGVuY3lGYWNhZGUgPSB7XG4gIGtpbmQ6IHN0cmluZ1xufSYoUjNEZWNsYXJlRGlyZWN0aXZlRGVwZW5kZW5jeUZhY2FkZXxSM0RlY2xhcmVQaXBlRGVwZW5kZW5jeUZhY2FkZXxcbiAgIFIzRGVjbGFyZU5nTW9kdWxlRGVwZW5kZW5jeUZhY2FkZSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNEZWNsYXJlRGlyZWN0aXZlRGVwZW5kZW5jeUZhY2FkZSB7XG4gIGtpbmQ/OiAnZGlyZWN0aXZlJ3wnY29tcG9uZW50JztcbiAgc2VsZWN0b3I6IHN0cmluZztcbiAgdHlwZTogT3BhcXVlVmFsdWV8KCgpID0+IE9wYXF1ZVZhbHVlKTtcbiAgaW5wdXRzPzogc3RyaW5nW107XG4gIG91dHB1dHM/OiBzdHJpbmdbXTtcbiAgZXhwb3J0QXM/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0RlY2xhcmVQaXBlRGVwZW5kZW5jeUZhY2FkZSB7XG4gIGtpbmQ/OiAncGlwZSc7XG4gIG5hbWU6IHN0cmluZztcbiAgdHlwZTogT3BhcXVlVmFsdWV8KCgpID0+IE9wYXF1ZVZhbHVlKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0RlY2xhcmVOZ01vZHVsZURlcGVuZGVuY3lGYWNhZGUge1xuICBraW5kOiAnbmdtb2R1bGUnO1xuICB0eXBlOiBPcGFxdWVWYWx1ZXwoKCkgPT4gT3BhcXVlVmFsdWUpO1xufVxuXG5leHBvcnQgZW51bSBSM1RlbXBsYXRlRGVwZW5kZW5jeUtpbmQge1xuICBEaXJlY3RpdmUgPSAwLFxuICBQaXBlID0gMSxcbiAgTmdNb2R1bGUgPSAyLFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFIzVGVtcGxhdGVEZXBlbmRlbmN5RmFjYWRlIHtcbiAga2luZDogUjNUZW1wbGF0ZURlcGVuZGVuY3lLaW5kO1xuICB0eXBlOiBPcGFxdWVWYWx1ZXwoKCkgPT4gT3BhcXVlVmFsdWUpO1xufVxuZXhwb3J0IGludGVyZmFjZSBSM0ZhY3RvcnlEZWZNZXRhZGF0YUZhY2FkZSB7XG4gIG5hbWU6IHN0cmluZztcbiAgdHlwZTogVHlwZTtcbiAgdHlwZUFyZ3VtZW50Q291bnQ6IG51bWJlcjtcbiAgZGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFGYWNhZGVbXXxudWxsO1xuICB0YXJnZXQ6IEZhY3RvcnlUYXJnZXQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNEZWNsYXJlRmFjdG9yeUZhY2FkZSB7XG4gIHR5cGU6IFR5cGU7XG4gIGRlcHM6IFIzRGVjbGFyZURlcGVuZGVuY3lNZXRhZGF0YUZhY2FkZVtdfCdpbnZhbGlkJ3xudWxsO1xuICB0YXJnZXQ6IEZhY3RvcnlUYXJnZXQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNEZWNsYXJlSW5qZWN0YWJsZUZhY2FkZSB7XG4gIHR5cGU6IFR5cGU7XG4gIHByb3ZpZGVkSW4/OiBUeXBlfCdyb290J3wncGxhdGZvcm0nfCdhbnknfG51bGw7XG4gIHVzZUNsYXNzPzogT3BhcXVlVmFsdWU7XG4gIHVzZUZhY3Rvcnk/OiBPcGFxdWVWYWx1ZTtcbiAgdXNlRXhpc3Rpbmc/OiBPcGFxdWVWYWx1ZTtcbiAgdXNlVmFsdWU/OiBPcGFxdWVWYWx1ZTtcbiAgZGVwcz86IFIzRGVjbGFyZURlcGVuZGVuY3lNZXRhZGF0YUZhY2FkZVtdO1xufVxuXG5leHBvcnQgZW51bSBWaWV3RW5jYXBzdWxhdGlvbiB7XG4gIEVtdWxhdGVkID0gMCxcbiAgLy8gSGlzdG9yaWNhbGx5IHRoZSAxIHZhbHVlIHdhcyBmb3IgYE5hdGl2ZWAgZW5jYXBzdWxhdGlvbiB3aGljaCBoYXMgYmVlbiByZW1vdmVkIGFzIG9mIHYxMS5cbiAgTm9uZSA9IDIsXG4gIFNoYWRvd0RvbSA9IDNcbn1cblxuZXhwb3J0IHR5cGUgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kgPSBudW1iZXI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNRdWVyeU1ldGFkYXRhRmFjYWRlIHtcbiAgcHJvcGVydHlOYW1lOiBzdHJpbmc7XG4gIGZpcnN0OiBib29sZWFuO1xuICBwcmVkaWNhdGU6IE9wYXF1ZVZhbHVlfHN0cmluZ1tdO1xuICBkZXNjZW5kYW50czogYm9vbGVhbjtcbiAgZW1pdERpc3RpbmN0Q2hhbmdlc09ubHk6IGJvb2xlYW47XG4gIHJlYWQ6IE9wYXF1ZVZhbHVlfG51bGw7XG4gIHN0YXRpYzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0RlY2xhcmVRdWVyeU1ldGFkYXRhRmFjYWRlIHtcbiAgcHJvcGVydHlOYW1lOiBzdHJpbmc7XG4gIGZpcnN0PzogYm9vbGVhbjtcbiAgcHJlZGljYXRlOiBPcGFxdWVWYWx1ZXxzdHJpbmdbXTtcbiAgZGVzY2VuZGFudHM/OiBib29sZWFuO1xuICByZWFkPzogT3BhcXVlVmFsdWU7XG4gIHN0YXRpYz86IGJvb2xlYW47XG4gIGVtaXREaXN0aW5jdENoYW5nZXNPbmx5PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0RlY2xhcmVJbmplY3RvckZhY2FkZSB7XG4gIHR5cGU6IFR5cGU7XG4gIGltcG9ydHM/OiBPcGFxdWVWYWx1ZVtdO1xuICBwcm92aWRlcnM/OiBPcGFxdWVWYWx1ZVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFIzRGVjbGFyZU5nTW9kdWxlRmFjYWRlIHtcbiAgdHlwZTogVHlwZTtcbiAgYm9vdHN0cmFwPzogT3BhcXVlVmFsdWVbXXwoKCkgPT4gT3BhcXVlVmFsdWVbXSk7XG4gIGRlY2xhcmF0aW9ucz86IE9wYXF1ZVZhbHVlW118KCgpID0+IE9wYXF1ZVZhbHVlW10pO1xuICBpbXBvcnRzPzogT3BhcXVlVmFsdWVbXXwoKCkgPT4gT3BhcXVlVmFsdWVbXSk7XG4gIGV4cG9ydHM/OiBPcGFxdWVWYWx1ZVtdfCgoKSA9PiBPcGFxdWVWYWx1ZVtdKTtcbiAgc2NoZW1hcz86IE9wYXF1ZVZhbHVlW107XG4gIGlkPzogT3BhcXVlVmFsdWU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNEZWNsYXJlUGlwZUZhY2FkZSB7XG4gIHR5cGU6IFR5cGU7XG4gIG5hbWU6IHN0cmluZztcbiAgcHVyZT86IGJvb2xlYW47XG4gIGlzU3RhbmRhbG9uZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VTb3VyY2VTcGFuIHtcbiAgc3RhcnQ6IGFueTtcbiAgZW5kOiBhbnk7XG4gIGRldGFpbHM6IGFueTtcbiAgZnVsbFN0YXJ0OiBhbnk7XG59XG4iXX0=