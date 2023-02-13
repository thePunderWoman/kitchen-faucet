/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export { ɵgetDOM } from '@angular/common';
export { initDomAdapter as ɵinitDomAdapter, INTERNAL_BROWSER_PLATFORM_PROVIDERS as ɵINTERNAL_BROWSER_PLATFORM_PROVIDERS } from './browser';
export { BrowserDomAdapter as ɵBrowserDomAdapter } from './browser/browser_adapter';
export { BrowserGetTestability as ɵBrowserGetTestability } from './browser/testability';
export { escapeHtml as ɵescapeHtml } from './browser/transfer_state';
export { DomRendererFactory2 as ɵDomRendererFactory2, flattenStyles as ɵflattenStyles, NAMESPACE_URIS as ɵNAMESPACE_URIS, shimContentAttribute as ɵshimContentAttribute, shimHostAttribute as ɵshimHostAttribute } from './dom/dom_renderer';
export { DomEventsPlugin as ɵDomEventsPlugin } from './dom/events/dom_events';
export { HammerGesturesPlugin as ɵHammerGesturesPlugin } from './dom/events/hammer_gestures';
export { KeyEventsPlugin as ɵKeyEventsPlugin } from './dom/events/key_events';
export { DomSharedStylesHost as ɵDomSharedStylesHost, SharedStylesHost as ɵSharedStylesHost } from './dom/shared_styles_host';
export { DomSanitizerImpl as ɵDomSanitizerImpl } from './security/dom_sanitization_service';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpdmF0ZV9leHBvcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9wbGF0Zm9ybS1icm93c2VyL3NyYy9wcml2YXRlX2V4cG9ydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDeEMsT0FBTyxFQUFDLGNBQWMsSUFBSSxlQUFlLEVBQUUsbUNBQW1DLElBQUksb0NBQW9DLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDekksT0FBTyxFQUFDLGlCQUFpQixJQUFJLGtCQUFrQixFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDbEYsT0FBTyxFQUFDLHFCQUFxQixJQUFJLHNCQUFzQixFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDdEYsT0FBTyxFQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNuRSxPQUFPLEVBQUMsbUJBQW1CLElBQUksb0JBQW9CLEVBQUUsYUFBYSxJQUFJLGNBQWMsRUFBRSxjQUFjLElBQUksZUFBZSxFQUFFLG9CQUFvQixJQUFJLHFCQUFxQixFQUFFLGlCQUFpQixJQUFJLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDM08sT0FBTyxFQUFDLGVBQWUsSUFBSSxnQkFBZ0IsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQzVFLE9BQU8sRUFBQyxvQkFBb0IsSUFBSSxxQkFBcUIsRUFBQyxNQUFNLDhCQUE4QixDQUFDO0FBQzNGLE9BQU8sRUFBQyxlQUFlLElBQUksZ0JBQWdCLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM1RSxPQUFPLEVBQUMsbUJBQW1CLElBQUksb0JBQW9CLEVBQUUsZ0JBQWdCLElBQUksaUJBQWlCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUM1SCxPQUFPLEVBQUMsZ0JBQWdCLElBQUksaUJBQWlCLEVBQUMsTUFBTSxxQ0FBcUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQge8m1Z2V0RE9NfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuZXhwb3J0IHtpbml0RG9tQWRhcHRlciBhcyDJtWluaXREb21BZGFwdGVyLCBJTlRFUk5BTF9CUk9XU0VSX1BMQVRGT1JNX1BST1ZJREVSUyBhcyDJtUlOVEVSTkFMX0JST1dTRVJfUExBVEZPUk1fUFJPVklERVJTfSBmcm9tICcuL2Jyb3dzZXInO1xuZXhwb3J0IHtCcm93c2VyRG9tQWRhcHRlciBhcyDJtUJyb3dzZXJEb21BZGFwdGVyfSBmcm9tICcuL2Jyb3dzZXIvYnJvd3Nlcl9hZGFwdGVyJztcbmV4cG9ydCB7QnJvd3NlckdldFRlc3RhYmlsaXR5IGFzIMm1QnJvd3NlckdldFRlc3RhYmlsaXR5fSBmcm9tICcuL2Jyb3dzZXIvdGVzdGFiaWxpdHknO1xuZXhwb3J0IHtlc2NhcGVIdG1sIGFzIMm1ZXNjYXBlSHRtbH0gZnJvbSAnLi9icm93c2VyL3RyYW5zZmVyX3N0YXRlJztcbmV4cG9ydCB7RG9tUmVuZGVyZXJGYWN0b3J5MiBhcyDJtURvbVJlbmRlcmVyRmFjdG9yeTIsIGZsYXR0ZW5TdHlsZXMgYXMgybVmbGF0dGVuU3R5bGVzLCBOQU1FU1BBQ0VfVVJJUyBhcyDJtU5BTUVTUEFDRV9VUklTLCBzaGltQ29udGVudEF0dHJpYnV0ZSBhcyDJtXNoaW1Db250ZW50QXR0cmlidXRlLCBzaGltSG9zdEF0dHJpYnV0ZSBhcyDJtXNoaW1Ib3N0QXR0cmlidXRlfSBmcm9tICcuL2RvbS9kb21fcmVuZGVyZXInO1xuZXhwb3J0IHtEb21FdmVudHNQbHVnaW4gYXMgybVEb21FdmVudHNQbHVnaW59IGZyb20gJy4vZG9tL2V2ZW50cy9kb21fZXZlbnRzJztcbmV4cG9ydCB7SGFtbWVyR2VzdHVyZXNQbHVnaW4gYXMgybVIYW1tZXJHZXN0dXJlc1BsdWdpbn0gZnJvbSAnLi9kb20vZXZlbnRzL2hhbW1lcl9nZXN0dXJlcyc7XG5leHBvcnQge0tleUV2ZW50c1BsdWdpbiBhcyDJtUtleUV2ZW50c1BsdWdpbn0gZnJvbSAnLi9kb20vZXZlbnRzL2tleV9ldmVudHMnO1xuZXhwb3J0IHtEb21TaGFyZWRTdHlsZXNIb3N0IGFzIMm1RG9tU2hhcmVkU3R5bGVzSG9zdCwgU2hhcmVkU3R5bGVzSG9zdCBhcyDJtVNoYXJlZFN0eWxlc0hvc3R9IGZyb20gJy4vZG9tL3NoYXJlZF9zdHlsZXNfaG9zdCc7XG5leHBvcnQge0RvbVNhbml0aXplckltcGwgYXMgybVEb21TYW5pdGl6ZXJJbXBsfSBmcm9tICcuL3NlY3VyaXR5L2RvbV9zYW5pdGl6YXRpb25fc2VydmljZSc7XG4iXX0=