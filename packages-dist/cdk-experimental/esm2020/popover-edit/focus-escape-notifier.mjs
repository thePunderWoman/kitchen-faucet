/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Inject, Injectable, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FocusTrap, InteractivityChecker } from '@angular/cdk/a11y';
import { Subject } from 'rxjs';
import * as i0 from "@angular/core";
import * as i1 from "@angular/cdk/a11y";
/**
 * Like FocusTrap, but rather than trapping focus within a dom region, notifies subscribers when
 * focus leaves the region.
 */
export class FocusEscapeNotifier extends FocusTrap {
    constructor(element, checker, ngZone, document) {
        super(element, checker, ngZone, document, true /* deferAnchors */);
        this._escapeSubject = new Subject();
        // The focus trap adds "anchors" at the beginning and end of a trapped region that redirect
        // focus. We override that redirect behavior here with simply emitting on a stream.
        this.startAnchorListener = () => {
            this._escapeSubject.next(0 /* FocusEscapeNotifierDirection.START */);
            return true;
        };
        this.endAnchorListener = () => {
            this._escapeSubject.next(1 /* FocusEscapeNotifierDirection.END */);
            return true;
        };
        this.attachAnchors();
    }
    escapes() {
        return this._escapeSubject;
    }
}
/** Factory that allows easy instantiation of focus escape notifiers. */
export class FocusEscapeNotifierFactory {
    constructor(_checker, _ngZone, _document) {
        this._checker = _checker;
        this._ngZone = _ngZone;
        this._document = _document;
    }
    /**
     * Creates a focus escape notifier region around the given element.
     * @param element The element around which focus will be monitored.
     * @returns The created focus escape notifier instance.
     */
    create(element) {
        return new FocusEscapeNotifier(element, this._checker, this._ngZone, this._document);
    }
}
FocusEscapeNotifierFactory.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: FocusEscapeNotifierFactory, deps: [{ token: i1.InteractivityChecker }, { token: i0.NgZone }, { token: DOCUMENT }], target: i0.ɵɵFactoryTarget.Injectable });
FocusEscapeNotifierFactory.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: FocusEscapeNotifierFactory, providedIn: 'root' });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0", ngImport: i0, type: FocusEscapeNotifierFactory, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: function () { return [{ type: i1.InteractivityChecker }, { type: i0.NgZone }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9jdXMtZXNjYXBlLW5vdGlmaWVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2Nkay1leHBlcmltZW50YWwvcG9wb3Zlci1lZGl0L2ZvY3VzLWVzY2FwZS1ub3RpZmllci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDekQsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxTQUFTLEVBQUUsb0JBQW9CLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNsRSxPQUFPLEVBQWEsT0FBTyxFQUFDLE1BQU0sTUFBTSxDQUFDOzs7QUFRekM7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFNBQVM7SUFHaEQsWUFDRSxPQUFvQixFQUNwQixPQUE2QixFQUM3QixNQUFjLEVBQ2QsUUFBa0I7UUFFbEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQVJwRCxtQkFBYyxHQUFHLElBQUksT0FBTyxFQUFnQyxDQUFDO1FBVTVFLDJGQUEyRjtRQUMzRixtRkFBbUY7UUFDbkYsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEdBQUcsRUFBRTtZQUM5QixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksNENBQW9DLENBQUM7WUFDN0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUM7UUFDRixJQUFJLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxFQUFFO1lBQzVCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSwwQ0FBa0MsQ0FBQztZQUMzRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQztRQUVGLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQsT0FBTztRQUNMLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUM3QixDQUFDO0NBQ0Y7QUFFRCx3RUFBd0U7QUFFeEUsTUFBTSxPQUFPLDBCQUEwQjtJQUdyQyxZQUNVLFFBQThCLEVBQzlCLE9BQWUsRUFDTCxTQUFjO1FBRnhCLGFBQVEsR0FBUixRQUFRLENBQXNCO1FBQzlCLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFHdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDN0IsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxNQUFNLENBQUMsT0FBb0I7UUFDekIsT0FBTyxJQUFJLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZGLENBQUM7O3VIQWxCVSwwQkFBMEIsNEVBTTNCLFFBQVE7MkhBTlAsMEJBQTBCLGNBRGQsTUFBTTsyRkFDbEIsMEJBQTBCO2tCQUR0QyxVQUFVO21CQUFDLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBQzs7MEJBTzNCLE1BQU07MkJBQUMsUUFBUSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0luamVjdCwgSW5qZWN0YWJsZSwgTmdab25lfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7RE9DVU1FTlR9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0ZvY3VzVHJhcCwgSW50ZXJhY3Rpdml0eUNoZWNrZXJ9IGZyb20gJ0Bhbmd1bGFyL2Nkay9hMTF5JztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5cbi8qKiBWYWx1ZSBpbmRpY2F0aW5nIHdoZXRoZXIgZm9jdXMgbGVmdCB0aGUgdGFyZ2V0IGFyZWEgYmVmb3JlIG9yIGFmdGVyIHRoZSBlbmNsb3NlZCBlbGVtZW50cy4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIEZvY3VzRXNjYXBlTm90aWZpZXJEaXJlY3Rpb24ge1xuICBTVEFSVCxcbiAgRU5ELFxufVxuXG4vKipcbiAqIExpa2UgRm9jdXNUcmFwLCBidXQgcmF0aGVyIHRoYW4gdHJhcHBpbmcgZm9jdXMgd2l0aGluIGEgZG9tIHJlZ2lvbiwgbm90aWZpZXMgc3Vic2NyaWJlcnMgd2hlblxuICogZm9jdXMgbGVhdmVzIHRoZSByZWdpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBGb2N1c0VzY2FwZU5vdGlmaWVyIGV4dGVuZHMgRm9jdXNUcmFwIHtcbiAgcHJpdmF0ZSByZWFkb25seSBfZXNjYXBlU3ViamVjdCA9IG5ldyBTdWJqZWN0PEZvY3VzRXNjYXBlTm90aWZpZXJEaXJlY3Rpb24+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZWxlbWVudDogSFRNTEVsZW1lbnQsXG4gICAgY2hlY2tlcjogSW50ZXJhY3Rpdml0eUNoZWNrZXIsXG4gICAgbmdab25lOiBOZ1pvbmUsXG4gICAgZG9jdW1lbnQ6IERvY3VtZW50LFxuICApIHtcbiAgICBzdXBlcihlbGVtZW50LCBjaGVja2VyLCBuZ1pvbmUsIGRvY3VtZW50LCB0cnVlIC8qIGRlZmVyQW5jaG9ycyAqLyk7XG5cbiAgICAvLyBUaGUgZm9jdXMgdHJhcCBhZGRzIFwiYW5jaG9yc1wiIGF0IHRoZSBiZWdpbm5pbmcgYW5kIGVuZCBvZiBhIHRyYXBwZWQgcmVnaW9uIHRoYXQgcmVkaXJlY3RcbiAgICAvLyBmb2N1cy4gV2Ugb3ZlcnJpZGUgdGhhdCByZWRpcmVjdCBiZWhhdmlvciBoZXJlIHdpdGggc2ltcGx5IGVtaXR0aW5nIG9uIGEgc3RyZWFtLlxuICAgIHRoaXMuc3RhcnRBbmNob3JMaXN0ZW5lciA9ICgpID0+IHtcbiAgICAgIHRoaXMuX2VzY2FwZVN1YmplY3QubmV4dChGb2N1c0VzY2FwZU5vdGlmaWVyRGlyZWN0aW9uLlNUQVJUKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgdGhpcy5lbmRBbmNob3JMaXN0ZW5lciA9ICgpID0+IHtcbiAgICAgIHRoaXMuX2VzY2FwZVN1YmplY3QubmV4dChGb2N1c0VzY2FwZU5vdGlmaWVyRGlyZWN0aW9uLkVORCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgdGhpcy5hdHRhY2hBbmNob3JzKCk7XG4gIH1cblxuICBlc2NhcGVzKCk6IE9ic2VydmFibGU8Rm9jdXNFc2NhcGVOb3RpZmllckRpcmVjdGlvbj4ge1xuICAgIHJldHVybiB0aGlzLl9lc2NhcGVTdWJqZWN0O1xuICB9XG59XG5cbi8qKiBGYWN0b3J5IHRoYXQgYWxsb3dzIGVhc3kgaW5zdGFudGlhdGlvbiBvZiBmb2N1cyBlc2NhcGUgbm90aWZpZXJzLiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgRm9jdXNFc2NhcGVOb3RpZmllckZhY3Rvcnkge1xuICBwcml2YXRlIF9kb2N1bWVudDogRG9jdW1lbnQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBfY2hlY2tlcjogSW50ZXJhY3Rpdml0eUNoZWNrZXIsXG4gICAgcHJpdmF0ZSBfbmdab25lOiBOZ1pvbmUsXG4gICAgQEluamVjdChET0NVTUVOVCkgX2RvY3VtZW50OiBhbnksXG4gICkge1xuICAgIHRoaXMuX2RvY3VtZW50ID0gX2RvY3VtZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBmb2N1cyBlc2NhcGUgbm90aWZpZXIgcmVnaW9uIGFyb3VuZCB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICogQHBhcmFtIGVsZW1lbnQgVGhlIGVsZW1lbnQgYXJvdW5kIHdoaWNoIGZvY3VzIHdpbGwgYmUgbW9uaXRvcmVkLlxuICAgKiBAcmV0dXJucyBUaGUgY3JlYXRlZCBmb2N1cyBlc2NhcGUgbm90aWZpZXIgaW5zdGFuY2UuXG4gICAqL1xuICBjcmVhdGUoZWxlbWVudDogSFRNTEVsZW1lbnQpOiBGb2N1c0VzY2FwZU5vdGlmaWVyIHtcbiAgICByZXR1cm4gbmV3IEZvY3VzRXNjYXBlTm90aWZpZXIoZWxlbWVudCwgdGhpcy5fY2hlY2tlciwgdGhpcy5fbmdab25lLCB0aGlzLl9kb2N1bWVudCk7XG4gIH1cbn1cbiJdfQ==