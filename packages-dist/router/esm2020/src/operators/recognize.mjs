/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { map, mergeMap } from 'rxjs/operators';
import { recognize as recognizeFn } from '../recognize';
export function recognize(injector, rootComponentType, config, serializer, paramsInheritanceStrategy) {
    return mergeMap(t => recognizeFn(injector, rootComponentType, config, t.urlAfterRedirects, serializer.serialize(t.urlAfterRedirects), serializer, paramsInheritanceStrategy)
        .pipe(map(targetSnapshot => ({ ...t, targetSnapshot }))));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb2duaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvcmVjb2duaXplLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUlILE9BQU8sRUFBQyxHQUFHLEVBQUUsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFJN0MsT0FBTyxFQUFDLFNBQVMsSUFBSSxXQUFXLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFHdEQsTUFBTSxVQUFVLFNBQVMsQ0FDckIsUUFBNkIsRUFBRSxpQkFBaUMsRUFBRSxNQUFlLEVBQ2pGLFVBQXlCLEVBQUUseUJBQStDO0lBRTVFLE9BQU8sUUFBUSxDQUNYLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUNQLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLGlCQUFrQixFQUN6RCxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxFQUFFLFVBQVUsRUFBRSx5QkFBeUIsQ0FBQztTQUNqRixJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLEdBQUcsQ0FBQyxFQUFFLGNBQWMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Vudmlyb25tZW50SW5qZWN0b3IsIFR5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXAsIG1lcmdlTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7Um91dGV9IGZyb20gJy4uL21vZGVscyc7XG5pbXBvcnQge05hdmlnYXRpb25UcmFuc2l0aW9ufSBmcm9tICcuLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuaW1wb3J0IHtyZWNvZ25pemUgYXMgcmVjb2duaXplRm59IGZyb20gJy4uL3JlY29nbml6ZSc7XG5pbXBvcnQge1VybFNlcmlhbGl6ZXJ9IGZyb20gJy4uL3VybF90cmVlJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlY29nbml6ZShcbiAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgcm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55PnxudWxsLCBjb25maWc6IFJvdXRlW10sXG4gICAgc2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seSd8J2Fsd2F5cycpOlxuICAgIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4ge1xuICByZXR1cm4gbWVyZ2VNYXAoXG4gICAgICB0ID0+IHJlY29nbml6ZUZuKFxuICAgICAgICAgICAgICAgaW5qZWN0b3IsIHJvb3RDb21wb25lbnRUeXBlLCBjb25maWcsIHQudXJsQWZ0ZXJSZWRpcmVjdHMhLFxuICAgICAgICAgICAgICAgc2VyaWFsaXplci5zZXJpYWxpemUodC51cmxBZnRlclJlZGlyZWN0cyEpLCBzZXJpYWxpemVyLCBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KVxuICAgICAgICAgICAgICAgLnBpcGUobWFwKHRhcmdldFNuYXBzaG90ID0+ICh7Li4udCwgdGFyZ2V0U25hcHNob3R9KSkpKTtcbn1cbiJdfQ==