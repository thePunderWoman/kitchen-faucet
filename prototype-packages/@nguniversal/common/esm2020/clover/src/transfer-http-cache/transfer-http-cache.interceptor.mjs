/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { HttpHeaders, HttpResponse, } from '@angular/common/http';
import { ApplicationRef, Injectable } from '@angular/core';
import { TransferState, makeStateKey } from '@angular/platform-browser';
import { of } from 'rxjs';
import { filter, take, tap } from 'rxjs/operators';
import * as i0 from "@angular/core";
import * as i1 from "@angular/platform-browser";
export class TransferHttpCacheInterceptor {
    makeCacheKey(method, url, params, responseType) {
        // make the params encoded same as a url so it's easy to identify
        const encodedParams = params
            .keys()
            .sort()
            .map((k) => `${k}=${params.getAll(k)}`)
            .join('&');
        const key = (method === 'GET' ? 'G.' : 'H.') + responseType + '.' + url + '?' + encodedParams;
        return makeStateKey(key);
    }
    constructor(appRef, transferState) {
        this.transferState = transferState;
        this.isCacheActive = true;
        // Stop using the cache if the application has stabilized, indicating initial rendering is
        // complete.
        appRef.isStable
            .pipe(filter((isStable) => isStable), take(1), tap(() => (this.isCacheActive = false)))
            .subscribe();
    }
    intercept(req, next) {
        if (!this.isCacheActive || !['GET', 'HEAD'].includes(req.method)) {
            // Cache is no longer active. Pass the request through.
            return next.handle(req);
        }
        const storeKey = this.makeCacheKey(req.method, req.url, req.params, req.responseType);
        if (this.transferState.hasKey(storeKey)) {
            // Request found in cache. Respond using it.
            const response = this.transferState.get(storeKey, {});
            let body = response.body;
            switch (response.responseType) {
                case 'arraybuffer':
                    {
                        // If we're in Node...
                        if (typeof Buffer !== 'undefined') {
                            const buf = Buffer.from(response.body);
                            body = new ArrayBuffer(buf.length);
                            const view = new Uint8Array(body);
                            for (let i = 0; i < buf.length; ++i) {
                                view[i] = buf[i];
                            }
                        }
                        else if (typeof TextEncoder !== 'undefined') {
                            // Modern browsers implement TextEncode.
                            body = new TextEncoder().encode(response.body).buffer;
                        }
                    }
                    break;
                case 'blob':
                    body = new Blob([response.body]);
                    break;
            }
            return of(new HttpResponse({
                body,
                headers: new HttpHeaders(response.headers),
                status: response.status,
                statusText: response.statusText,
                url: response.url,
            }));
        }
        // Request not found in cache. Make the request and cache it.
        const httpEvent = next.handle(req);
        return httpEvent.pipe(tap((event) => {
            if (event instanceof HttpResponse) {
                this.transferState.set(storeKey, {
                    body: event.body,
                    headers: this.getHeaders(event.headers),
                    status: event.status,
                    statusText: event.statusText,
                    url: event.url ?? '',
                    responseType: req.responseType,
                });
            }
        }));
    }
    getHeaders(headers) {
        const headersMap = {};
        for (const key of headers.keys()) {
            const value = headers.getAll(key);
            if (typeof value === 'string') {
                headersMap[key] = value;
            }
        }
        return headersMap;
    }
}
TransferHttpCacheInterceptor.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheInterceptor, deps: [{ token: i0.ApplicationRef }, { token: i1.TransferState }], target: i0.ɵɵFactoryTarget.Injectable });
TransferHttpCacheInterceptor.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheInterceptor });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: TransferHttpCacheInterceptor, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i0.ApplicationRef }, { type: i1.TransferState }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmZXItaHR0cC1jYWNoZS5pbnRlcmNlcHRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL21vZHVsZXMvY29tbW9uL2Nsb3Zlci9zcmMvdHJhbnNmZXItaHR0cC1jYWNoZS90cmFuc2Zlci1odHRwLWNhY2hlLmludGVyY2VwdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFHTCxXQUFXLEVBSVgsWUFBWSxHQUNiLE1BQU0sc0JBQXNCLENBQUM7QUFDOUIsT0FBTyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDM0QsT0FBTyxFQUFZLGFBQWEsRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNsRixPQUFPLEVBQWMsRUFBRSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3RDLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDOzs7QUFjbkQsTUFBTSxPQUFPLDRCQUE0QjtJQUcvQixZQUFZLENBQ2xCLE1BQWMsRUFDZCxHQUFXLEVBQ1gsTUFBa0IsRUFDbEIsWUFBMkI7UUFFM0IsaUVBQWlFO1FBQ2pFLE1BQU0sYUFBYSxHQUFHLE1BQU07YUFDekIsSUFBSSxFQUFFO2FBQ04sSUFBSSxFQUFFO2FBQ04sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7YUFDdEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRWIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLFlBQVksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxhQUFh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LDZEQUE2RDtRQUM3RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRW5DLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FDbkIsR0FBRyxDQUFDLENBQUMsS0FBeUIsRUFBRSxFQUFFO1lBQ2hDLElBQUksS0FBSyxZQUFZLFlBQVksRUFBRTtnQkFDakMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQXVCLFFBQVEsRUFBRTtvQkFDckQsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO29CQUNoQixPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO29CQUN2QyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07b0JBQ3BCLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtvQkFDNUIsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksRUFBRTtvQkFDcEIsWUFBWSxFQUFFLEdBQUcsQ0FBQyxZQUFZO2lCQUMvQixDQUFDLENBQUM7YUFDSjtRQUNILENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0lBRU8sVUFBVSxDQUFDLE9BQW9CO1FBQ3JDLE1BQU0sVUFBVSxHQUE2QixFQUFFLENBQUM7UUFFaEQsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDaEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNsQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtnQkFDN0IsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQzthQUN6QjtTQUNGO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQzs7eUhBN0dVLDRCQUE0Qjs2SEFBNUIsNEJBQTRCOzJGQUE1Qiw0QkFBNEI7a0JBRHhDLFVBQVUiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgSHR0cEV2ZW50LFxuICBIdHRwSGFuZGxlcixcbiAgSHR0cEhlYWRlcnMsXG4gIEh0dHBJbnRlcmNlcHRvcixcbiAgSHR0cFBhcmFtcyxcbiAgSHR0cFJlcXVlc3QsXG4gIEh0dHBSZXNwb25zZSxcbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uL2h0dHAnO1xuaW1wb3J0IHsgQXBwbGljYXRpb25SZWYsIEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFN0YXRlS2V5LCBUcmFuc2ZlclN0YXRlLCBtYWtlU3RhdGVLZXkgfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyJztcbmltcG9ydCB7IE9ic2VydmFibGUsIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBmaWx0ZXIsIHRha2UsIHRhcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxudHlwZSBSZXNwb25zZVR5cGUgPSBIdHRwUmVxdWVzdDx1bmtub3duPlsncmVzcG9uc2VUeXBlJ107XG5cbmludGVyZmFjZSBUcmFuc2Zlckh0dHBSZXNwb25zZSB7XG4gIGJvZHk/OiBhbnkgfCBudWxsO1xuICBoZWFkZXJzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+O1xuICBzdGF0dXM/OiBudW1iZXI7XG4gIHN0YXR1c1RleHQ/OiBzdHJpbmc7XG4gIHVybD86IHN0cmluZztcbiAgcmVzcG9uc2VUeXBlPzogUmVzcG9uc2VUeXBlO1xufVxuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgVHJhbnNmZXJIdHRwQ2FjaGVJbnRlcmNlcHRvciBpbXBsZW1lbnRzIEh0dHBJbnRlcmNlcHRvciB7XG4gIHByaXZhdGUgaXNDYWNoZUFjdGl2ZSA9IHRydWU7XG5cbiAgcHJpdmF0ZSBtYWtlQ2FjaGVLZXkoXG4gICAgbWV0aG9kOiBzdHJpbmcsXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgcGFyYW1zOiBIdHRwUGFyYW1zLFxuICAgIHJlc3BvbnNlVHlwZT86IFJlc3BvbnNlVHlwZSxcbiAgKTogU3RhdGVLZXk8VHJhbnNmZXJIdHRwUmVzcG9uc2U+IHtcbiAgICAvLyBtYWtlIHRoZSBwYXJhbXMgZW5jb2RlZCBzYW1lIGFzIGEgdXJsIHNvIGl0J3MgZWFzeSB0byBpZGVudGlmeVxuICAgIGNvbnN0IGVuY29kZWRQYXJhbXMgPSBwYXJhbXNcbiAgICAgIC5rZXlzKClcbiAgICAgIC5zb3J0KClcbiAgICAgIC5tYXAoKGspID0+IGAke2t9PSR7cGFyYW1zLmdldEFsbChrKX1gKVxuICAgICAgLmpvaW4oJyYnKTtcblxuICAgIGNvbnN0IGtleSA9IChtZXRob2QgPT09ICdHRVQnID8gJ0cuJyA6ICdILicpICsgcmVzcG9uc2VUeXBlICsgJy4nICsgdXJsICsgJz8nICsgZW5jb2RlZFBhcmFtcztcblxuICAgIHJldHVybiBtYWtlU3RhdGVLZXkoa2V5KTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKGFwcFJlZjogQXBwbGljYXRpb25SZWYsIHByaXZhdGUgdHJhbnNmZXJTdGF0ZTogVHJhbnNmZXJTdGF0ZSkge1xuICAgIC8vIFN0b3AgdXNpbmcgdGhlIGNhY2hlIGlmIHRoZSBhcHBsaWNhdGlvbiBoYXMgc3RhYmlsaXplZCwgaW5kaWNhdGluZyBpbml0aWFsIHJlbmRlcmluZyBpc1xuICAgIC8vIGNvbXBsZXRlLlxuICAgIGFwcFJlZi5pc1N0YWJsZVxuICAgICAgLnBpcGUoXG4gICAgICAgIGZpbHRlcigoaXNTdGFibGUpID0+IGlzU3RhYmxlKSxcbiAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgdGFwKCgpID0+ICh0aGlzLmlzQ2FjaGVBY3RpdmUgPSBmYWxzZSkpLFxuICAgICAgKVxuICAgICAgLnN1YnNjcmliZSgpO1xuICB9XG5cbiAgaW50ZXJjZXB0KHJlcTogSHR0cFJlcXVlc3Q8YW55PiwgbmV4dDogSHR0cEhhbmRsZXIpOiBPYnNlcnZhYmxlPEh0dHBFdmVudDxhbnk+PiB7XG4gICAgaWYgKCF0aGlzLmlzQ2FjaGVBY3RpdmUgfHwgIVsnR0VUJywgJ0hFQUQnXS5pbmNsdWRlcyhyZXEubWV0aG9kKSkge1xuICAgICAgLy8gQ2FjaGUgaXMgbm8gbG9uZ2VyIGFjdGl2ZS4gUGFzcyB0aGUgcmVxdWVzdCB0aHJvdWdoLlxuICAgICAgcmV0dXJuIG5leHQuaGFuZGxlKHJlcSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RvcmVLZXkgPSB0aGlzLm1ha2VDYWNoZUtleShyZXEubWV0aG9kLCByZXEudXJsLCByZXEucGFyYW1zLCByZXEucmVzcG9uc2VUeXBlKTtcblxuICAgIGlmICh0aGlzLnRyYW5zZmVyU3RhdGUuaGFzS2V5KHN0b3JlS2V5KSkge1xuICAgICAgLy8gUmVxdWVzdCBmb3VuZCBpbiBjYWNoZS4gUmVzcG9uZCB1c2luZyBpdC5cbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gdGhpcy50cmFuc2ZlclN0YXRlLmdldChzdG9yZUtleSwge30pO1xuICAgICAgbGV0IGJvZHk6IEFycmF5QnVmZmVyIHwgQmxvYiB8IHN0cmluZyB8IHVuZGVmaW5lZCA9IHJlc3BvbnNlLmJvZHk7XG5cbiAgICAgIHN3aXRjaCAocmVzcG9uc2UucmVzcG9uc2VUeXBlKSB7XG4gICAgICAgIGNhc2UgJ2FycmF5YnVmZmVyJzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICAvLyBJZiB3ZSdyZSBpbiBOb2RlLi4uXG4gICAgICAgICAgICBpZiAodHlwZW9mIEJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgY29uc3QgYnVmID0gQnVmZmVyLmZyb20ocmVzcG9uc2UuYm9keSk7XG4gICAgICAgICAgICAgIGJvZHkgPSBuZXcgQXJyYXlCdWZmZXIoYnVmLmxlbmd0aCk7XG4gICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSBuZXcgVWludDhBcnJheShib2R5KTtcbiAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWYubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICB2aWV3W2ldID0gYnVmW2ldO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBUZXh0RW5jb2RlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgLy8gTW9kZXJuIGJyb3dzZXJzIGltcGxlbWVudCBUZXh0RW5jb2RlLlxuICAgICAgICAgICAgICBib2R5ID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHJlc3BvbnNlLmJvZHkpLmJ1ZmZlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Jsb2InOlxuICAgICAgICAgIGJvZHkgPSBuZXcgQmxvYihbcmVzcG9uc2UuYm9keV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2YoXG4gICAgICAgIG5ldyBIdHRwUmVzcG9uc2U8YW55Pih7XG4gICAgICAgICAgYm9keSxcbiAgICAgICAgICBoZWFkZXJzOiBuZXcgSHR0cEhlYWRlcnMocmVzcG9uc2UuaGVhZGVycyksXG4gICAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dCxcbiAgICAgICAgICB1cmw6IHJlc3BvbnNlLnVybCxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIFJlcXVlc3Qgbm90IGZvdW5kIGluIGNhY2hlLiBNYWtlIHRoZSByZXF1ZXN0IGFuZCBjYWNoZSBpdC5cbiAgICBjb25zdCBodHRwRXZlbnQgPSBuZXh0LmhhbmRsZShyZXEpO1xuXG4gICAgcmV0dXJuIGh0dHBFdmVudC5waXBlKFxuICAgICAgdGFwKChldmVudDogSHR0cEV2ZW50PHVua25vd24+KSA9PiB7XG4gICAgICAgIGlmIChldmVudCBpbnN0YW5jZW9mIEh0dHBSZXNwb25zZSkge1xuICAgICAgICAgIHRoaXMudHJhbnNmZXJTdGF0ZS5zZXQ8VHJhbnNmZXJIdHRwUmVzcG9uc2U+KHN0b3JlS2V5LCB7XG4gICAgICAgICAgICBib2R5OiBldmVudC5ib2R5LFxuICAgICAgICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKGV2ZW50LmhlYWRlcnMpLFxuICAgICAgICAgICAgc3RhdHVzOiBldmVudC5zdGF0dXMsXG4gICAgICAgICAgICBzdGF0dXNUZXh0OiBldmVudC5zdGF0dXNUZXh0LFxuICAgICAgICAgICAgdXJsOiBldmVudC51cmwgPz8gJycsXG4gICAgICAgICAgICByZXNwb25zZVR5cGU6IHJlcS5yZXNwb25zZVR5cGUsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIGdldEhlYWRlcnMoaGVhZGVyczogSHR0cEhlYWRlcnMpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4ge1xuICAgIGNvbnN0IGhlYWRlcnNNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2YgaGVhZGVycy5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gaGVhZGVycy5nZXRBbGwoa2V5KTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGhlYWRlcnNNYXBba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBoZWFkZXJzTWFwO1xuICB9XG59XG4iXX0=