/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ApplicationRef } from '../application_ref';
import { APP_BOOTSTRAP_LISTENER, PLATFORM_ID } from '../application_tokens';
import { makeEnvironmentProviders } from '../di';
import { ENVIRONMENT_INITIALIZER } from '../di/initializer_token';
import { InjectionToken } from '../di/injection_token';
import { inject } from '../di/injector_compatibility';
import { enableLocateOrCreateContainerRefImpl } from '../linker/view_container_ref';
import { enableLocateOrCreateElementNodeImpl } from '../render3/instructions/element';
import { enableLocateOrCreateElementContainerNodeImpl } from '../render3/instructions/element_container';
import { setLocateHostElementImpl } from '../render3/instructions/shared';
import { enableLocateOrCreateLContainerNodeImpl } from '../render3/instructions/template';
import { enableLocateOrCreateTextNodeImpl } from '../render3/instructions/text';
import { cleanupDehydratedViews } from './cleanup';
import { enableRetrieveNghInfoImpl, locateHostElementImpl } from './utils';
import { enableFindMatchingDehydratedViewImpl } from './views';
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || !!ngDevMode;
/**
 * Internal token that specifies whether hydration is enabled.
 */
export const IS_HYDRATION_FEATURE_ENABLED = new InjectionToken(NG_DEV_MODE ? 'IS_HYDRATION_FEATURE_ENABLED' : '');
let isHydrationSupportEnabled = false;
// TODO: update this implementation to allow a "rollback".
// This would be needed for tests, so that we reset the logic
// back before we SSR the next component.
function enableHydrationRuntimeSupport() {
    if (!isHydrationSupportEnabled) {
        isHydrationSupportEnabled = true;
        enableRetrieveNghInfoImpl();
        enableFindMatchingDehydratedViewImpl();
        enableLocateOrCreateElementNodeImpl();
        enableLocateOrCreateLContainerNodeImpl();
        enableLocateOrCreateTextNodeImpl();
        enableLocateOrCreateElementContainerNodeImpl();
        enableLocateOrCreateContainerRefImpl();
        setLocateHostElementImpl(locateHostElementImpl);
    }
}
function isBrowser() {
    const platformId = inject(PLATFORM_ID);
    return platformId === 'browser';
}
/**
 * TODO: add docs
 *
 * @publicApi
 * @developerPreview
 */
export function provideHydrationSupport() {
    return makeEnvironmentProviders([
        {
            provide: ENVIRONMENT_INITIALIZER,
            useValue: () => {
                if (isBrowser()) {
                    enableHydrationRuntimeSupport();
                }
            },
            multi: true,
        },
        {
            provide: APP_BOOTSTRAP_LISTENER,
            useFactory: () => {
                if (isBrowser()) {
                    const appRef = inject(ApplicationRef);
                    return () => cleanupDehydratedViews(appRef);
                }
                return () => { }; // noop
            },
            multi: true,
        },
        {
            provide: IS_HYDRATION_FEATURE_ENABLED,
            useValue: true,
        }
    ]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaHlkcmF0aW9uL2FwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDbEQsT0FBTyxFQUFDLHNCQUFzQixFQUFVLFdBQVcsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ2xGLE9BQU8sRUFBdUIsd0JBQXdCLEVBQVcsTUFBTSxPQUFPLENBQUM7QUFDL0UsT0FBTyxFQUFDLHVCQUF1QixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDaEUsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3JELE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUMsb0NBQW9DLEVBQUMsTUFBTSw4QkFBOEIsQ0FBQztBQUNsRixPQUFPLEVBQUMsbUNBQW1DLEVBQUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRixPQUFPLEVBQUMsNENBQTRDLEVBQUMsTUFBTSwyQ0FBMkMsQ0FBQztBQUN2RyxPQUFPLEVBQUMsd0JBQXdCLEVBQUMsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RSxPQUFPLEVBQUMsc0NBQXNDLEVBQUMsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RixPQUFPLEVBQUMsZ0NBQWdDLEVBQUMsTUFBTSw4QkFBOEIsQ0FBQztBQUU5RSxPQUFPLEVBQUMsc0JBQXNCLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDakQsT0FBTyxFQUFDLHlCQUF5QixFQUFFLHFCQUFxQixFQUFDLE1BQU0sU0FBUyxDQUFDO0FBQ3pFLE9BQU8sRUFBQyxvQ0FBb0MsRUFBQyxNQUFNLFNBQVMsQ0FBQztBQUU3RCxNQUFNLFdBQVcsR0FBRyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUVwRTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUNyQyxJQUFJLGNBQWMsQ0FBVSxXQUFXLENBQUMsQ0FBQyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVuRixJQUFJLHlCQUF5QixHQUFHLEtBQUssQ0FBQztBQUV0QywwREFBMEQ7QUFDMUQsNkRBQTZEO0FBQzdELHlDQUF5QztBQUN6QyxTQUFTLDZCQUE2QjtJQUNwQyxJQUFJLENBQUMseUJBQXlCLEVBQUU7UUFDOUIseUJBQXlCLEdBQUcsSUFBSSxDQUFDO1FBQ2pDLHlCQUF5QixFQUFFLENBQUM7UUFDNUIsb0NBQW9DLEVBQUUsQ0FBQztRQUN2QyxtQ0FBbUMsRUFBRSxDQUFDO1FBQ3RDLHNDQUFzQyxFQUFFLENBQUM7UUFDekMsZ0NBQWdDLEVBQUUsQ0FBQztRQUNuQyw0Q0FBNEMsRUFBRSxDQUFDO1FBQy9DLG9DQUFvQyxFQUFFLENBQUM7UUFDdkMsd0JBQXdCLENBQUMscUJBQXFCLENBQUMsQ0FBQztLQUNqRDtBQUNILENBQUM7QUFFRCxTQUFTLFNBQVM7SUFDaEIsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sVUFBVSxLQUFLLFNBQVMsQ0FBQztBQUNsQyxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsdUJBQXVCO0lBQ3JDLE9BQU8sd0JBQXdCLENBQUM7UUFDOUI7WUFDRSxPQUFPLEVBQUUsdUJBQXVCO1lBQ2hDLFFBQVEsRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxTQUFTLEVBQUUsRUFBRTtvQkFDZiw2QkFBNkIsRUFBRSxDQUFDO2lCQUNqQztZQUNILENBQUM7WUFDRCxLQUFLLEVBQUUsSUFBSTtTQUNaO1FBQ0Q7WUFDRSxPQUFPLEVBQUUsc0JBQXNCO1lBQy9CLFVBQVUsRUFBRSxHQUFHLEVBQUU7Z0JBQ2YsSUFBSSxTQUFTLEVBQUUsRUFBRTtvQkFDZixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQ3RDLE9BQU8sR0FBRyxFQUFFLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUM7aUJBQzdDO2dCQUNELE9BQU8sR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUUsT0FBTztZQUMzQixDQUFDO1lBQ0QsS0FBSyxFQUFFLElBQUk7U0FDWjtRQUNEO1lBQ0UsT0FBTyxFQUFFLDRCQUE0QjtZQUNyQyxRQUFRLEVBQUUsSUFBSTtTQUNmO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FwcGxpY2F0aW9uUmVmfSBmcm9tICcuLi9hcHBsaWNhdGlvbl9yZWYnO1xuaW1wb3J0IHtBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBBUFBfSUQsIFBMQVRGT1JNX0lEfSBmcm9tICcuLi9hcHBsaWNhdGlvbl90b2tlbnMnO1xuaW1wb3J0IHtFbnZpcm9ubWVudFByb3ZpZGVycywgbWFrZUVudmlyb25tZW50UHJvdmlkZXJzLCBQcm92aWRlcn0gZnJvbSAnLi4vZGknO1xuaW1wb3J0IHtFTlZJUk9OTUVOVF9JTklUSUFMSVpFUn0gZnJvbSAnLi4vZGkvaW5pdGlhbGl6ZXJfdG9rZW4nO1xuaW1wb3J0IHtJbmplY3Rpb25Ub2tlbn0gZnJvbSAnLi4vZGkvaW5qZWN0aW9uX3Rva2VuJztcbmltcG9ydCB7aW5qZWN0fSBmcm9tICcuLi9kaS9pbmplY3Rvcl9jb21wYXRpYmlsaXR5JztcbmltcG9ydCB7ZW5hYmxlTG9jYXRlT3JDcmVhdGVDb250YWluZXJSZWZJbXBsfSBmcm9tICcuLi9saW5rZXIvdmlld19jb250YWluZXJfcmVmJztcbmltcG9ydCB7ZW5hYmxlTG9jYXRlT3JDcmVhdGVFbGVtZW50Tm9kZUltcGx9IGZyb20gJy4uL3JlbmRlcjMvaW5zdHJ1Y3Rpb25zL2VsZW1lbnQnO1xuaW1wb3J0IHtlbmFibGVMb2NhdGVPckNyZWF0ZUVsZW1lbnRDb250YWluZXJOb2RlSW1wbH0gZnJvbSAnLi4vcmVuZGVyMy9pbnN0cnVjdGlvbnMvZWxlbWVudF9jb250YWluZXInO1xuaW1wb3J0IHtzZXRMb2NhdGVIb3N0RWxlbWVudEltcGx9IGZyb20gJy4uL3JlbmRlcjMvaW5zdHJ1Y3Rpb25zL3NoYXJlZCc7XG5pbXBvcnQge2VuYWJsZUxvY2F0ZU9yQ3JlYXRlTENvbnRhaW5lck5vZGVJbXBsfSBmcm9tICcuLi9yZW5kZXIzL2luc3RydWN0aW9ucy90ZW1wbGF0ZSc7XG5pbXBvcnQge2VuYWJsZUxvY2F0ZU9yQ3JlYXRlVGV4dE5vZGVJbXBsfSBmcm9tICcuLi9yZW5kZXIzL2luc3RydWN0aW9ucy90ZXh0JztcblxuaW1wb3J0IHtjbGVhbnVwRGVoeWRyYXRlZFZpZXdzfSBmcm9tICcuL2NsZWFudXAnO1xuaW1wb3J0IHtlbmFibGVSZXRyaWV2ZU5naEluZm9JbXBsLCBsb2NhdGVIb3N0RWxlbWVudEltcGx9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtlbmFibGVGaW5kTWF0Y2hpbmdEZWh5ZHJhdGVkVmlld0ltcGx9IGZyb20gJy4vdmlld3MnO1xuXG5jb25zdCBOR19ERVZfTU9ERSA9IHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8ICEhbmdEZXZNb2RlO1xuXG4vKipcbiAqIEludGVybmFsIHRva2VuIHRoYXQgc3BlY2lmaWVzIHdoZXRoZXIgaHlkcmF0aW9uIGlzIGVuYWJsZWQuXG4gKi9cbmV4cG9ydCBjb25zdCBJU19IWURSQVRJT05fRkVBVFVSRV9FTkFCTEVEID1cbiAgICBuZXcgSW5qZWN0aW9uVG9rZW48Ym9vbGVhbj4oTkdfREVWX01PREUgPyAnSVNfSFlEUkFUSU9OX0ZFQVRVUkVfRU5BQkxFRCcgOiAnJyk7XG5cbmxldCBpc0h5ZHJhdGlvblN1cHBvcnRFbmFibGVkID0gZmFsc2U7XG5cbi8vIFRPRE86IHVwZGF0ZSB0aGlzIGltcGxlbWVudGF0aW9uIHRvIGFsbG93IGEgXCJyb2xsYmFja1wiLlxuLy8gVGhpcyB3b3VsZCBiZSBuZWVkZWQgZm9yIHRlc3RzLCBzbyB0aGF0IHdlIHJlc2V0IHRoZSBsb2dpY1xuLy8gYmFjayBiZWZvcmUgd2UgU1NSIHRoZSBuZXh0IGNvbXBvbmVudC5cbmZ1bmN0aW9uIGVuYWJsZUh5ZHJhdGlvblJ1bnRpbWVTdXBwb3J0KCkge1xuICBpZiAoIWlzSHlkcmF0aW9uU3VwcG9ydEVuYWJsZWQpIHtcbiAgICBpc0h5ZHJhdGlvblN1cHBvcnRFbmFibGVkID0gdHJ1ZTtcbiAgICBlbmFibGVSZXRyaWV2ZU5naEluZm9JbXBsKCk7XG4gICAgZW5hYmxlRmluZE1hdGNoaW5nRGVoeWRyYXRlZFZpZXdJbXBsKCk7XG4gICAgZW5hYmxlTG9jYXRlT3JDcmVhdGVFbGVtZW50Tm9kZUltcGwoKTtcbiAgICBlbmFibGVMb2NhdGVPckNyZWF0ZUxDb250YWluZXJOb2RlSW1wbCgpO1xuICAgIGVuYWJsZUxvY2F0ZU9yQ3JlYXRlVGV4dE5vZGVJbXBsKCk7XG4gICAgZW5hYmxlTG9jYXRlT3JDcmVhdGVFbGVtZW50Q29udGFpbmVyTm9kZUltcGwoKTtcbiAgICBlbmFibGVMb2NhdGVPckNyZWF0ZUNvbnRhaW5lclJlZkltcGwoKTtcbiAgICBzZXRMb2NhdGVIb3N0RWxlbWVudEltcGwobG9jYXRlSG9zdEVsZW1lbnRJbXBsKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0Jyb3dzZXIoKSB7XG4gIGNvbnN0IHBsYXRmb3JtSWQgPSBpbmplY3QoUExBVEZPUk1fSUQpO1xuICByZXR1cm4gcGxhdGZvcm1JZCA9PT0gJ2Jyb3dzZXInO1xufVxuXG4vKipcbiAqIFRPRE86IGFkZCBkb2NzXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVIeWRyYXRpb25TdXBwb3J0KCk6IEVudmlyb25tZW50UHJvdmlkZXJzIHtcbiAgcmV0dXJuIG1ha2VFbnZpcm9ubWVudFByb3ZpZGVycyhbXG4gICAge1xuICAgICAgcHJvdmlkZTogRU5WSVJPTk1FTlRfSU5JVElBTElaRVIsXG4gICAgICB1c2VWYWx1ZTogKCkgPT4ge1xuICAgICAgICBpZiAoaXNCcm93c2VyKCkpIHtcbiAgICAgICAgICBlbmFibGVIeWRyYXRpb25SdW50aW1lU3VwcG9ydCgpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgbXVsdGk6IHRydWUsXG4gICAgfSxcbiAgICB7XG4gICAgICBwcm92aWRlOiBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLFxuICAgICAgdXNlRmFjdG9yeTogKCkgPT4ge1xuICAgICAgICBpZiAoaXNCcm93c2VyKCkpIHtcbiAgICAgICAgICBjb25zdCBhcHBSZWYgPSBpbmplY3QoQXBwbGljYXRpb25SZWYpO1xuICAgICAgICAgIHJldHVybiAoKSA9PiBjbGVhbnVwRGVoeWRyYXRlZFZpZXdzKGFwcFJlZik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHt9OyAgLy8gbm9vcFxuICAgICAgfSxcbiAgICAgIG11bHRpOiB0cnVlLFxuICAgIH0sXG4gICAge1xuICAgICAgcHJvdmlkZTogSVNfSFlEUkFUSU9OX0ZFQVRVUkVfRU5BQkxFRCxcbiAgICAgIHVzZVZhbHVlOiB0cnVlLFxuICAgIH1cbiAgXSk7XG59XG4iXX0=