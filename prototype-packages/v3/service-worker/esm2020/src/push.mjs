/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable } from '@angular/core';
import { merge, NEVER, Subject } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { ERR_SW_NOT_SUPPORTED, NgswCommChannel } from './low_level';
import * as i0 from "@angular/core";
import * as i1 from "./low_level";
/**
 * Subscribe and listen to
 * [Web Push
 * Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API/Best_Practices) through
 * Angular Service Worker.
 *
 * @usageNotes
 *
 * You can inject a `SwPush` instance into any component or service
 * as a dependency.
 *
 * <code-example path="service-worker/push/module.ts" region="inject-sw-push"
 * header="app.component.ts"></code-example>
 *
 * To subscribe, call `SwPush.requestSubscription()`, which asks the user for permission.
 * The call returns a `Promise` with a new
 * [`PushSubscription`](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription)
 * instance.
 *
 * <code-example path="service-worker/push/module.ts" region="subscribe-to-push"
 * header="app.component.ts"></code-example>
 *
 * A request is rejected if the user denies permission, or if the browser
 * blocks or does not support the Push API or ServiceWorkers.
 * Check `SwPush.isEnabled` to confirm status.
 *
 * Invoke Push Notifications by pushing a message with the following payload.
 *
 * ```ts
 * {
 *   "notification": {
 *     "actions": NotificationAction[],
 *     "badge": USVString,
 *     "body": DOMString,
 *     "data": any,
 *     "dir": "auto"|"ltr"|"rtl",
 *     "icon": USVString,
 *     "image": USVString,
 *     "lang": DOMString,
 *     "renotify": boolean,
 *     "requireInteraction": boolean,
 *     "silent": boolean,
 *     "tag": DOMString,
 *     "timestamp": DOMTimeStamp,
 *     "title": DOMString,
 *     "vibrate": number[]
 *   }
 * }
 * ```
 *
 * Only `title` is required. See `Notification`
 * [instance
 * properties](https://developer.mozilla.org/en-US/docs/Web/API/Notification#Instance_properties).
 *
 * While the subscription is active, Service Worker listens for
 * [PushEvent](https://developer.mozilla.org/en-US/docs/Web/API/PushEvent)
 * occurrences and creates
 * [Notification](https://developer.mozilla.org/en-US/docs/Web/API/Notification)
 * instances in response.
 *
 * Unsubscribe using `SwPush.unsubscribe()`.
 *
 * An application can subscribe to `SwPush.notificationClicks` observable to be notified when a user
 * clicks on a notification. For example:
 *
 * <code-example path="service-worker/push/module.ts" region="subscribe-to-notification-clicks"
 * header="app.component.ts"></code-example>
 *
 * You can read more on handling notification clicks in the [Service worker notifications
 * guide](guide/service-worker-notifications).
 *
 * @see [Push Notifications](https://developers.google.com/web/fundamentals/codelabs/push-notifications/)
 * @see [Angular Push Notifications](https://blog.angular-university.io/angular-push-notifications/)
 * @see [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
 * @see [MDN: Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
 * @see [MDN: Web Push API Notifications best practices](https://developer.mozilla.org/en-US/docs/Web/API/Push_API/Best_Practices)
 *
 * @publicApi
 */
export class SwPush {
    /**
     * True if the Service Worker is enabled (supported by the browser and enabled via
     * `ServiceWorkerModule`).
     */
    get isEnabled() {
        return this.sw.isEnabled;
    }
    constructor(sw) {
        this.sw = sw;
        this.subscriptionChanges = new Subject();
        if (!sw.isEnabled) {
            this.messages = NEVER;
            this.notificationClicks = NEVER;
            this.subscription = NEVER;
            return;
        }
        this.messages = this.sw.eventsOfType('PUSH').pipe(map(message => message.data));
        this.notificationClicks =
            this.sw.eventsOfType('NOTIFICATION_CLICK').pipe(map((message) => message.data));
        this.pushManager = this.sw.registration.pipe(map(registration => registration.pushManager));
        const workerDrivenSubscriptions = this.pushManager.pipe(switchMap(pm => pm.getSubscription()));
        this.subscription = merge(workerDrivenSubscriptions, this.subscriptionChanges);
    }
    /**
     * Subscribes to Web Push Notifications,
     * after requesting and receiving user permission.
     *
     * @param options An object containing the `serverPublicKey` string.
     * @returns A Promise that resolves to the new subscription object.
     */
    requestSubscription(options) {
        if (!this.sw.isEnabled) {
            return Promise.reject(new Error(ERR_SW_NOT_SUPPORTED));
        }
        const pushOptions = { userVisibleOnly: true };
        let key = this.decodeBase64(options.serverPublicKey.replace(/_/g, '/').replace(/-/g, '+'));
        let applicationServerKey = new Uint8Array(new ArrayBuffer(key.length));
        for (let i = 0; i < key.length; i++) {
            applicationServerKey[i] = key.charCodeAt(i);
        }
        pushOptions.applicationServerKey = applicationServerKey;
        return this.pushManager.pipe(switchMap(pm => pm.subscribe(pushOptions)), take(1))
            .toPromise()
            .then(sub => {
            this.subscriptionChanges.next(sub);
            return sub;
        });
    }
    /**
     * Unsubscribes from Service Worker push notifications.
     *
     * @returns A Promise that is resolved when the operation succeeds, or is rejected if there is no
     *          active subscription or the unsubscribe operation fails.
     */
    unsubscribe() {
        if (!this.sw.isEnabled) {
            return Promise.reject(new Error(ERR_SW_NOT_SUPPORTED));
        }
        const doUnsubscribe = (sub) => {
            if (sub === null) {
                throw new Error('Not subscribed to push notifications.');
            }
            return sub.unsubscribe().then(success => {
                if (!success) {
                    throw new Error('Unsubscribe failed!');
                }
                this.subscriptionChanges.next(null);
            });
        };
        return this.subscription.pipe(take(1), switchMap(doUnsubscribe)).toPromise();
    }
    decodeBase64(input) {
        return atob(input);
    }
}
SwPush.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-aab62c7-with-local-changes", ngImport: i0, type: SwPush, deps: [{ token: i1.NgswCommChannel }], target: i0.ɵɵFactoryTarget.Injectable });
SwPush.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-aab62c7-with-local-changes", ngImport: i0, type: SwPush });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0-next.2+sha-aab62c7-with-local-changes", ngImport: i0, type: SwPush, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i1.NgswCommChannel }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHVzaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NlcnZpY2Utd29ya2VyL3NyYy9wdXNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDekMsT0FBTyxFQUFDLEtBQUssRUFBRSxLQUFLLEVBQWMsT0FBTyxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ3ZELE9BQU8sRUFBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXBELE9BQU8sRUFBQyxvQkFBb0IsRUFBRSxlQUFlLEVBQVksTUFBTSxhQUFhLENBQUM7OztBQUc3RTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBOEVHO0FBRUgsTUFBTSxPQUFPLE1BQU07SUErQmpCOzs7T0FHRztJQUNILElBQUksU0FBUztRQUNYLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUM7SUFDM0IsQ0FBQztJQU1ELFlBQW9CLEVBQW1CO1FBQW5CLE9BQUUsR0FBRixFQUFFLENBQWlCO1FBRi9CLHdCQUFtQixHQUFHLElBQUksT0FBTyxFQUF5QixDQUFDO1FBR2pFLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFO1lBQ2pCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7WUFDaEMsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7WUFDMUIsT0FBTztTQUNSO1FBRUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBWSxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8s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LEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2lCQUN4QztnQkFFRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDL0UsQ0FBQztJQUVPLFlBQVksQ0FBQyxLQUFhO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JCLENBQUM7OzhHQXZIVSxNQUFNO2tIQUFOLE1BQU07c0dBQU4sTUFBTTtrQkFEbEIsVUFBVSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0luamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHttZXJnZSwgTkVWRVIsIE9ic2VydmFibGUsIFN1YmplY3R9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXAsIHN3aXRjaE1hcCwgdGFrZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0VSUl9TV19OT1RfU1VQUE9SVEVELCBOZ3N3Q29tbUNoYW5uZWwsIFB1c2hFdmVudH0gZnJvbSAnLi9sb3dfbGV2ZWwnO1xuXG5cbi8qKlxuICogU3Vic2NyaWJlIGFuZCBsaXN0ZW4gdG9cbiAqIFtXZWIgUHVzaFxuICogTm90aWZpY2F0aW9uc10oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1B1c2hfQVBJL0Jlc3RfUHJhY3RpY2VzKSB0aHJvdWdoXG4gKiBBbmd1bGFyIFNlcnZpY2UgV29ya2VyLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogWW91IGNhbiBpbmplY3QgYSBgU3dQdXNoYCBpbnN0YW5jZSBpbnRvIGFueSBjb21wb25lbnQgb3Igc2VydmljZVxuICogYXMgYSBkZXBlbmRlbmN5LlxuICpcbiAqIDxjb2RlLWV4YW1wbGUgcGF0aD1cInNlcnZpY2Utd29ya2VyL3B1c2gvbW9kdWxlLnRzXCIgcmVnaW9uPVwiaW5qZWN0LXN3LXB1c2hcIlxuICogaGVhZGVyPVwiYXBwLmNvbXBvbmVudC50c1wiPjwvY29kZS1leGFtcGxlPlxuICpcbiAqIFRvIHN1YnNjcmliZSwgY2FsbCBgU3dQdXNoLnJlcXVlc3RTdWJzY3JpcHRpb24oKWAsIHdoaWNoIGFza3MgdGhlIHVzZXIgZm9yIHBlcm1pc3Npb24uXG4gKiBUaGUgY2FsbCByZXR1cm5zIGEgYFByb21pc2VgIHdpdGggYSBuZXdcbiAqIFtgUHVzaFN1YnNjcmlwdGlvbmBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9QdXNoU3Vic2NyaXB0aW9uKVxuICogaW5zdGFuY2UuXG4gKlxuICogPGNvZGUtZXhhbXBsZSBwYXRoPVwic2VydmljZS13b3JrZXIvcHVzaC9tb2R1bGUudHNcIiByZWdpb249XCJzdWJzY3JpYmUtdG8tcHVzaFwiXG4gKiBoZWFkZXI9XCJhcHAuY29tcG9uZW50LnRzXCI+PC9jb2RlLWV4YW1wbGU+XG4gKlxuICogQSByZXF1ZXN0IGlzIHJlamVjdGVkIGlmIHRoZSB1c2VyIGRlbmllcyBwZXJtaXNzaW9uLCBvciBpZiB0aGUgYnJvd3NlclxuICogYmxvY2tzIG9yIGRvZXMgbm90IHN1cHBvcnQgdGhlIFB1c2ggQVBJIG9yIFNlcnZpY2VXb3JrZXJzLlxuICogQ2hlY2sgYFN3UHVzaC5pc0VuYWJsZWRgIHRvIGNvbmZpcm0gc3RhdHVzLlxuICpcbiAqIEludm9rZSBQdXNoIE5vdGlmaWNhdGlvbnMgYnkgcHVzaGluZyBhIG1lc3NhZ2Ugd2l0aCB0aGUgZm9sbG93aW5nIHBheWxvYWQuXG4gKlxuICogYGBgdHNcbiAqIHtcbiAqICAgXCJub3RpZmljYXRpb25cIjoge1xuICogICAgIFwiYWN0aW9uc1wiOiBOb3RpZmljYXRpb25BY3Rpb25bXSxcbiAqICAgICBcImJhZGdlXCI6IFVTVlN0cmluZyxcbiAqICAgICBcImJvZHlcIjogRE9NU3RyaW5nLFxuICogICAgIFwiZGF0YVwiOiBhbnksXG4gKiAgICAgXCJkaXJcIjogXCJhdXRvXCJ8XCJsdHJcInxcInJ0bFwiLFxuICogICAgIFwiaWNvblwiOiBVU1ZTdHJpbmcsXG4gKiAgICAgXCJpbWFnZVwiOiBVU1ZTdHJpbmcsXG4gKiAgICAgXCJsYW5nXCI6IERPTVN0cmluZyxcbiAqICAgICBcInJlbm90aWZ5XCI6IGJvb2xlYW4sXG4gKiAgICAgXCJyZXF1aXJlSW50ZXJhY3Rpb25cIjogYm9vbGVhbixcbiAqICAgICBcInNpbGVudFwiOiBib29sZWFuLFxuICogICAgIFwidGFnXCI6IERPTVN0cmluZyxcbiAqICAgICBcInRpbWVzdGFtcFwiOiBET01UaW1lU3RhbXAsXG4gKiAgICAgXCJ0aXRsZVwiOiBET01TdHJpbmcsXG4gKiAgICAgXCJ2aWJyYXRlXCI6IG51bWJlcltdXG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIE9ubHkgYHRpdGxlYCBpcyByZXF1aXJlZC4gU2VlIGBOb3RpZmljYXRpb25gXG4gKiBbaW5zdGFuY2VcbiAqIHByb3BlcnRpZXNdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9Ob3RpZmljYXRpb24jSW5zdGFuY2VfcHJvcGVydGllcykuXG4gKlxuICogV2hpbGUgdGhlIHN1YnNjcmlwdGlvbiBpcyBhY3RpdmUsIFNlcnZpY2UgV29ya2VyIGxpc3RlbnMgZm9yXG4gKiBbUHVzaEV2ZW50XShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvUHVzaEV2ZW50KVxuICogb2NjdXJyZW5jZXMgYW5kIGNyZWF0ZXNcbiAqIFtOb3RpZmljYXRpb25dKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9Ob3RpZmljYXRpb24pXG4gKiBpbnN0YW5jZXMgaW4gcmVzcG9uc2UuXG4gKlxuICogVW5zdWJzY3JpYmUgdXNpbmcgYFN3UHVzaC51bnN1YnNjcmliZSgpYC5cbiAqXG4gKiBBbiBhcHBsaWNhdGlvbiBjYW4gc3Vic2NyaWJlIHRvIGBTd1B1c2gubm90aWZpY2F0aW9uQ2xpY2tzYCBvYnNlcnZhYmxlIHRvIGJlIG5vdGlmaWVkIHdoZW4gYSB1c2VyXG4gKiBjbGlja3Mgb24gYSBub3RpZmljYXRpb24uIEZvciBleGFtcGxlOlxuICpcbiAqIDxjb2RlLWV4YW1wbGUgcGF0aD1cInNlcnZpY2Utd29ya2VyL3B1c2gvbW9kdWxlLnRzXCIgcmVnaW9uPVwic3Vic2NyaWJlLXRvLW5vdGlmaWNhdGlvbi1jbGlja3NcIlxuICogaGVhZGVyPVwiYXBwLmNvbXBvbmVudC50c1wiPjwvY29kZS1leGFtcGxlPlxuICpcbiAqIFlvdSBjYW4gcmVhZCBtb3JlIG9uIGhhbmRsaW5nIG5vdGlmaWNhdGlvbiBjbGlja3MgaW4gdGhlIFtTZXJ2aWNlIHdvcmtlciBub3RpZmljYXRpb25zXG4gKiBndWlkZV0oZ3VpZGUvc2VydmljZS13b3JrZXItbm90aWZpY2F0aW9ucykuXG4gKlxuICogQHNlZSBbUHVzaCBOb3RpZmljYXRpb25zXShodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS93ZWIvZnVuZGFtZW50YWxzL2NvZGVsYWJzL3B1c2gtbm90aWZpY2F0aW9ucy8pXG4gKiBAc2VlIFtBbmd1bGFyIFB1c2ggTm90aWZpY2F0aW9uc10oaHR0cHM6Ly9ibG9nLmFuZ3VsYXItdW5pdmVyc2l0eS5pby9hbmd1bGFyLXB1c2gtbm90aWZpY2F0aW9ucy8pXG4gKiBAc2VlIFtNRE46IFB1c2ggQVBJXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvUHVzaF9BUEkpXG4gKiBAc2VlIFtNRE46IE5vdGlmaWNhdGlvbnMgQVBJXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvTm90aWZpY2F0aW9uc19BUEkpXG4gKiBAc2VlIFtNRE46IFdlYiBQdXNoIEFQSSBOb3RpZmljYXRpb25zIGJlc3QgcHJhY3RpY2VzXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvUHVzaF9BUEkvQmVzdF9QcmFjdGljZXMpXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgU3dQdXNoIHtcbiAgLyoqXG4gICAqIEVtaXRzIHRoZSBwYXlsb2FkcyBvZiB0aGUgcmVjZWl2ZWQgcHVzaCBub3RpZmljYXRpb24gbWVzc2FnZXMuXG4gICAqL1xuICByZWFkb25seSBtZXNzYWdlczogT2JzZXJ2YWJsZTxvYmplY3Q+O1xuXG4gIC8qKlxuICAgKiBFbWl0cyB0aGUgcGF5bG9hZHMgb2YgdGhlIHJlY2VpdmVkIHB1c2ggbm90aWZpY2F0aW9uIG1lc3NhZ2VzIGFzIHdlbGwgYXMgdGhlIGFjdGlvbiB0aGUgdXNlclxuICAgKiBpbnRlcmFjdGVkIHdpdGguIElmIG5vIGFjdGlvbiB3YXMgdXNlZCB0aGUgYGFjdGlvbmAgcHJvcGVydHkgY29udGFpbnMgYW4gZW1wdHkgc3RyaW5nIGAnJ2AuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGUgYG5vdGlmaWNhdGlvbmAgcHJvcGVydHkgZG9lcyAqKm5vdCoqIGNvbnRhaW4gYVxuICAgKiBbTm90aWZpY2F0aW9uXVtNb3ppbGxhIE5vdGlmaWNhdGlvbl0gb2JqZWN0IGJ1dCByYXRoZXIgYVxuICAgKiBbTm90aWZpY2F0aW9uT3B0aW9uc10oaHR0cHM6Ly9ub3RpZmljYXRpb25zLnNwZWMud2hhdHdnLm9yZy8jZGljdGRlZi1ub3RpZmljYXRpb25vcHRpb25zKVxuICAgKiBvYmplY3QgdGhhdCBhbHNvIGluY2x1ZGVzIHRoZSBgdGl0bGVgIG9mIHRoZSBbTm90aWZpY2F0aW9uXVtNb3ppbGxhIE5vdGlmaWNhdGlvbl0gb2JqZWN0LlxuICAgKlxuICAgKiBbTW96aWxsYSBOb3RpZmljYXRpb25dOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvTm90aWZpY2F0aW9uXG4gICAqL1xuICByZWFkb25seSBub3RpZmljYXRpb25DbGlja3M6IE9ic2VydmFibGU8e1xuICAgIGFjdGlvbjogc3RyaW5nOyBub3RpZmljYXRpb246IE5vdGlmaWNhdGlvbk9wdGlvbnMgJlxuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6IHN0cmluZ1xuICAgICAgICB9XG4gIH0+O1xuXG4gIC8qKlxuICAgKiBFbWl0cyB0aGUgY3VycmVudGx5IGFjdGl2ZVxuICAgKiBbUHVzaFN1YnNjcmlwdGlvbl0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1B1c2hTdWJzY3JpcHRpb24pXG4gICAqIGFzc29jaWF0ZWQgdG8gdGhlIFNlcnZpY2UgV29ya2VyIHJlZ2lzdHJhdGlvbiBvciBgbnVsbGAgaWYgdGhlcmUgaXMgbm8gc3Vic2NyaXB0aW9uLlxuICAgKi9cbiAgcmVhZG9ubHkgc3Vic2NyaXB0aW9uOiBPYnNlcnZhYmxlPFB1c2hTdWJzY3JpcHRpb258bnVsbD47XG5cbiAgLyoqXG4gICAqIFRydWUgaWYgdGhlIFNlcnZpY2UgV29ya2VyIGlzIGVuYWJsZWQgKHN1cHBvcnRlZCBieSB0aGUgYnJvd3NlciBhbmQgZW5hYmxlZCB2aWFcbiAgICogYFNlcnZpY2VXb3JrZXJNb2R1bGVgKS5cbiAgICovXG4gIGdldCBpc0VuYWJsZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3cuaXNFbmFibGVkO1xuICB9XG5cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgcHVzaE1hbmFnZXIhOiBPYnNlcnZhYmxlPFB1c2hNYW5hZ2VyPjtcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25DaGFuZ2VzID0gbmV3IFN1YmplY3Q8UHVzaFN1YnNjcmlwdGlvbnxudWxsPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc3c6IE5nc3dDb21tQ2hhbm5lbCkge1xuICAgIGlmICghc3cuaXNFbmFibGVkKSB7XG4gICAgICB0aGlzLm1lc3NhZ2VzID0gTkVWRVI7XG4gICAgICB0aGlzLm5vdGlmaWNhdGlvbkNsaWNrcyA9IE5FVkVSO1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb24gPSBORVZFUjtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLm1lc3NhZ2VzID0gdGhpcy5zdy5ldmVudHNPZlR5cGU8UHVzaEV2ZW50PignUFVTSCcpLnBpcGUobWFwKG1lc3NhZ2UgPT4gbWVzc2FnZS5kYXRhKSk7XG5cbiAgICB0aGlzLm5vdGlmaWNhdGlvbkNsaWNrcyA9XG4gICAgICAgIHRoaXMuc3cuZXZlbnRzT2ZUeXBlKCdOT1RJRklDQVRJT05fQ0xJQ0snKS5waXBlKG1hcCgobWVzc2FnZTogYW55KSA9PiBtZXNzYWdlLmRhdGEpKTtcblxuICAgIHRoaXMucHVzaE1hbmFnZXIgPSB0aGlzLnN3LnJlZ2lzdHJhdGlvbi5waXBlKG1hcChyZWdpc3RyYXRpb24gPT4gcmVnaXN0cmF0aW9uLnB1c2hNYW5hZ2VyKSk7XG5cbiAgICBjb25zdCB3b3JrZXJEcml2ZW5TdWJzY3JpcHRpb25zID0gdGhpcy5wdXNoTWFuYWdlci5waXBlKHN3aXRjaE1hcChwbSA9PiBwbS5nZXRTdWJzY3JpcHRpb24oKSkpO1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uID0gbWVyZ2Uod29ya2VyRHJpdmVuU3Vic2NyaXB0aW9ucywgdGhpcy5zdWJzY3JpcHRpb25DaGFuZ2VzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmVzIHRvIFdlYiBQdXNoIE5vdGlmaWNhdGlvbnMsXG4gICAqIGFmdGVyIHJlcXVlc3RpbmcgYW5kIHJlY2VpdmluZyB1c2VyIHBlcm1pc3Npb24uXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBgc2VydmVyUHVibGljS2V5YCBzdHJpbmcuXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIHRoZSBuZXcgc3Vic2NyaXB0aW9uIG9iamVjdC5cbiAgICovXG4gIHJlcXVlc3RTdWJzY3JpcHRpb24ob3B0aW9uczoge3NlcnZlclB1YmxpY0tleTogc3RyaW5nfSk6IFByb21pc2U8UHVzaFN1YnNjcmlwdGlvbj4ge1xuICAgIGlmICghdGhpcy5zdy5pc0VuYWJsZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoRVJSX1NXX05PVF9TVVBQT1JURUQpKTtcbiAgICB9XG4gICAgY29uc3QgcHVzaE9wdGlvbnM6IFB1c2hTdWJzY3JpcHRpb25PcHRpb25zSW5pdCA9IHt1c2VyVmlzaWJsZU9ubHk6IHRydWV9O1xuICAgIGxldCBrZXkgPSB0aGlzLmRlY29kZUJhc2U2NChvcHRpb25zLnNlcnZlclB1YmxpY0tleS5yZXBsYWNlKC9fL2csICcvJykucmVwbGFjZSgvLS9nLCAnKycpKTtcbiAgICBsZXQgYXBwbGljYXRpb25TZXJ2ZXJLZXkgPSBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXIoa2V5Lmxlbmd0aCkpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwga2V5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBhcHBsaWNhdGlvblNlcnZlcktleVtpXSA9IGtleS5jaGFyQ29kZUF0KGkpO1xuICAgIH1cbiAgICBwdXNoT3B0aW9ucy5hcHBsaWNhdGlvblNlcnZlcktleSA9IGFwcGxpY2F0aW9uU2VydmVyS2V5O1xuXG4gICAgcmV0dXJuIHRoaXMucHVzaE1hbmFnZXIucGlwZShzd2l0Y2hNYXAocG0gPT4gcG0uc3Vic2NyaWJlKHB1c2hPcHRpb25zKSksIHRha2UoMSkpXG4gICAgICAgIC50b1Byb21pc2UoKVxuICAgICAgICAudGhlbihzdWIgPT4ge1xuICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9uQ2hhbmdlcy5uZXh0KHN1Yik7XG4gICAgICAgICAgcmV0dXJuIHN1YjtcbiAgICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogVW5zdWJzY3JpYmVzIGZyb20gU2VydmljZSBXb3JrZXIgcHVzaCBub3RpZmljYXRpb25zLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCBpcyByZXNvbHZlZCB3aGVuIHRoZSBvcGVyYXRpb24gc3VjY2VlZHMsIG9yIGlzIHJlamVjdGVkIGlmIHRoZXJlIGlzIG5vXG4gICAqICAgICAgICAgIGFjdGl2ZSBzdWJzY3JpcHRpb24gb3IgdGhlIHVuc3Vic2NyaWJlIG9wZXJhdGlvbiBmYWlscy5cbiAgICovXG4gIHVuc3Vic2NyaWJlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5zdy5pc0VuYWJsZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoRVJSX1NXX05PVF9TVVBQT1JURUQpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkb1Vuc3Vic2NyaWJlID0gKHN1YjogUHVzaFN1YnNjcmlwdGlvbnxudWxsKSA9PiB7XG4gICAgICBpZiAoc3ViID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IHN1YnNjcmliZWQgdG8gcHVzaCBub3RpZmljYXRpb25zLicpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3ViLnVuc3Vic2NyaWJlKCkudGhlbihzdWNjZXNzID0+IHtcbiAgICAgICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnN1YnNjcmliZSBmYWlsZWQhJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbkNoYW5nZXMubmV4dChudWxsKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gdGhpcy5zdWJzY3JpcHRpb24ucGlwZSh0YWtlKDEpLCBzd2l0Y2hNYXAoZG9VbnN1YnNjcmliZSkpLnRvUHJvbWlzZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBkZWNvZGVCYXNlNjQoaW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGF0b2IoaW5wdXQpO1xuICB9XG59XG4iXX0=