/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export * from './module';
export { MatPaginatedTabHeader } from './paginated-tab-header';
export { MatTabBodyPortal, MatTabBody, _MatTabBodyBase, } from './tab-body';
export { MAT_TABS_CONFIG } from './tab-config';
export { MatTabContent, MAT_TAB_CONTENT } from './tab-content';
export { MatTabLabel, MAT_TAB, MAT_TAB_LABEL } from './tab-label';
export { MatTabLabelWrapper } from './tab-label-wrapper';
export { MatTab, MAT_TAB_GROUP, _MatTabBase } from './tab';
export { MatInkBar, _MAT_INK_BAR_POSITIONER_FACTORY, _MAT_INK_BAR_POSITIONER, } from './ink-bar';
export { MatTabHeader, _MatTabHeaderBase } from './tab-header';
export { MatTabGroup, MatTabChangeEvent, _MatTabGroupBase, } from './tab-group';
export { MatTabNav, MatTabNavPanel, MatTabLink, _MatTabNavBase, _MatTabLinkBase, } from './tab-nav-bar/tab-nav-bar';
export { matTabsAnimations } from './tabs-animations';
export { _MatTabLabelWrapperBase } from './tab-label-wrapper';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHVibGljLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tYXRlcmlhbC90YWJzL3B1YmxpYy1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsY0FBYyxVQUFVLENBQUM7QUFDekIsT0FBTyxFQUFrQixxQkFBcUIsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQzlFLE9BQU8sRUFDTCxnQkFBZ0IsRUFDaEIsVUFBVSxFQUdWLGVBQWUsR0FDaEIsTUFBTSxZQUFZLENBQUM7QUFDcEIsT0FBTyxFQUFnQixlQUFlLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDNUQsT0FBTyxFQUFDLGFBQWEsRUFBRSxlQUFlLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDN0QsT0FBTyxFQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ2hFLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3ZELE9BQU8sRUFBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBQyxNQUFNLE9BQU8sQ0FBQztBQUN6RCxPQUFPLEVBQ0wsU0FBUyxFQUVULCtCQUErQixFQUMvQix1QkFBdUIsR0FDeEIsTUFBTSxXQUFXLENBQUM7QUFDbkIsT0FBTyxFQUFDLFlBQVksRUFBRSxpQkFBaUIsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUM3RCxPQUFPLEVBQ0wsV0FBVyxFQUNYLGlCQUFpQixFQUdqQixnQkFBZ0IsR0FDakIsTUFBTSxhQUFhLENBQUM7QUFDckIsT0FBTyxFQUNMLFNBQVMsRUFDVCxjQUFjLEVBQ2QsVUFBVSxFQUNWLGNBQWMsRUFDZCxlQUFlLEdBQ2hCLE1BQU0sMkJBQTJCLENBQUM7QUFDbkMsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDcEQsT0FBTyxFQUFDLHVCQUF1QixFQUFDLE1BQU0scUJBQXFCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0ICogZnJvbSAnLi9tb2R1bGUnO1xuZXhwb3J0IHtTY3JvbGxEaXJlY3Rpb24sIE1hdFBhZ2luYXRlZFRhYkhlYWRlcn0gZnJvbSAnLi9wYWdpbmF0ZWQtdGFiLWhlYWRlcic7XG5leHBvcnQge1xuICBNYXRUYWJCb2R5UG9ydGFsLFxuICBNYXRUYWJCb2R5LFxuICBNYXRUYWJCb2R5UG9zaXRpb25TdGF0ZSxcbiAgTWF0VGFiQm9keU9yaWdpblN0YXRlLFxuICBfTWF0VGFiQm9keUJhc2UsXG59IGZyb20gJy4vdGFiLWJvZHknO1xuZXhwb3J0IHtNYXRUYWJzQ29uZmlnLCBNQVRfVEFCU19DT05GSUd9IGZyb20gJy4vdGFiLWNvbmZpZyc7XG5leHBvcnQge01hdFRhYkNvbnRlbnQsIE1BVF9UQUJfQ09OVEVOVH0gZnJvbSAnLi90YWItY29udGVudCc7XG5leHBvcnQge01hdFRhYkxhYmVsLCBNQVRfVEFCLCBNQVRfVEFCX0xBQkVMfSBmcm9tICcuL3RhYi1sYWJlbCc7XG5leHBvcnQge01hdFRhYkxhYmVsV3JhcHBlcn0gZnJvbSAnLi90YWItbGFiZWwtd3JhcHBlcic7XG5leHBvcnQge01hdFRhYiwgTUFUX1RBQl9HUk9VUCwgX01hdFRhYkJhc2V9IGZyb20gJy4vdGFiJztcbmV4cG9ydCB7XG4gIE1hdElua0JhcixcbiAgX01hdElua0JhclBvc2l0aW9uZXIsXG4gIF9NQVRfSU5LX0JBUl9QT1NJVElPTkVSX0ZBQ1RPUlksXG4gIF9NQVRfSU5LX0JBUl9QT1NJVElPTkVSLFxufSBmcm9tICcuL2luay1iYXInO1xuZXhwb3J0IHtNYXRUYWJIZWFkZXIsIF9NYXRUYWJIZWFkZXJCYXNlfSBmcm9tICcuL3RhYi1oZWFkZXInO1xuZXhwb3J0IHtcbiAgTWF0VGFiR3JvdXAsXG4gIE1hdFRhYkNoYW5nZUV2ZW50LFxuICBNYXRUYWJHcm91cEJhc2VIZWFkZXIsXG4gIE1hdFRhYkhlYWRlclBvc2l0aW9uLFxuICBfTWF0VGFiR3JvdXBCYXNlLFxufSBmcm9tICcuL3RhYi1ncm91cCc7XG5leHBvcnQge1xuICBNYXRUYWJOYXYsXG4gIE1hdFRhYk5hdlBhbmVsLFxuICBNYXRUYWJMaW5rLFxuICBfTWF0VGFiTmF2QmFzZSxcbiAgX01hdFRhYkxpbmtCYXNlLFxufSBmcm9tICcuL3RhYi1uYXYtYmFyL3RhYi1uYXYtYmFyJztcbmV4cG9ydCB7bWF0VGFic0FuaW1hdGlvbnN9IGZyb20gJy4vdGFicy1hbmltYXRpb25zJztcbmV4cG9ydCB7X01hdFRhYkxhYmVsV3JhcHBlckJhc2V9IGZyb20gJy4vdGFiLWxhYmVsLXdyYXBwZXInO1xuIl19