/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CommonEngine } from '@nguniversal/common/engine';
import { REQUEST, RESPONSE } from '@nguniversal/express-engine/tokens';
/**
 * This is an express engine for handling Angular Applications
 */
export function ngExpressEngine(setupOptions) {
    const engine = new CommonEngine(setupOptions.bootstrap, setupOptions.providers);
    return function (filePath, options, callback) {
        try {
            const renderOptions = { ...options };
            if (!setupOptions.bootstrap && !renderOptions.bootstrap) {
                throw new Error('You must pass in a NgModule to be bootstrapped');
            }
            const { req } = renderOptions;
            const res = renderOptions.res ?? req.res;
            renderOptions.url =
                renderOptions.url ?? `${req.protocol}://${req.get('host') || ''}${req.baseUrl}${req.url}`;
            renderOptions.documentFilePath = renderOptions.documentFilePath ?? filePath;
            renderOptions.providers = [...(renderOptions.providers ?? []), getReqResProviders(req, res)];
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            renderOptions.publicPath =
                renderOptions.publicPath ?? setupOptions.publicPath ?? options.settings?.views;
            renderOptions.inlineCriticalCss =
                renderOptions.inlineCriticalCss ?? setupOptions.inlineCriticalCss;
            engine
                .render(renderOptions)
                .then((html) => callback(null, html))
                .catch(callback);
        }
        catch (err) {
            callback(err);
        }
    };
}
/**
 * Get providers of the request and response
 */
function getReqResProviders(req, res) {
    const providers = [
        {
            provide: REQUEST,
            useValue: req,
        },
    ];
    if (res) {
        providers.push({
            provide: RESPONSE,
            useValue: res,
        });
    }
    return providers;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL21vZHVsZXMvZXhwcmVzcy1lbmdpbmUvc3JjL21haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFFLFlBQVksRUFBd0MsTUFBTSw0QkFBNEIsQ0FBQztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBbUJ2RTs7R0FFRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUMsWUFBc0M7SUFDcEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFaEYsT0FBTyxVQUNMLFFBQWdCLEVBQ2hCLE9BQWUsRUFDZixRQUFxRDtRQUVyRCxJQUFJO1lBQ0YsTUFBTSxhQUFhLEdBQUcsRUFBRSxHQUFHLE9BQU8sRUFBbUIsQ0FBQztZQUN0RCxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUU7Z0JBQ3ZELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQzthQUNuRTtZQUVELE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxhQUFhLENBQUM7WUFDOUIsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDO1lBRXpDLGFBQWEsQ0FBQyxHQUFHO2dCQUNmLGFBQWEsQ0FBQyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsUUFBUSxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQzVGLGFBQWEsQ0FBQyxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLElBQUksUUFBUSxDQUFDO1lBQzVFLGFBQWEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM3RixvRUFBb0U7WUFDcEUsYUFBYSxDQUFDLFVBQVU7Z0JBQ3RCLGFBQWEsQ0FBQyxVQUFVLElBQUksWUFBWSxDQUFDLFVBQVUsSUFBSyxPQUFlLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQztZQUMxRixhQUFhLENBQUMsaUJBQWlCO2dCQUM3QixhQUFhLENBQUMsaUJBQWlCLElBQUksWUFBWSxDQUFDLGlCQUFpQixDQUFDO1lBRXBFLE1BQU07aUJBQ0gsTUFBTSxDQUFDLGFBQWEsQ0FBQztpQkFDckIsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUNwQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDcEI7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNmO0lBQ0gsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxHQUFZLEVBQUUsR0FBYztJQUN0RCxNQUFNLFNBQVMsR0FBcUI7UUFDbEM7WUFDRSxPQUFPLEVBQUUsT0FBTztZQUNoQixRQUFRLEVBQUUsR0FBRztTQUNkO0tBQ0YsQ0FBQztJQUNGLElBQUksR0FBRyxFQUFFO1FBQ1AsU0FBUyxDQUFDLElBQUksQ0FBQztZQUNiLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLFFBQVEsRUFBRSxHQUFHO1NBQ2QsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB0eXBlIHsgU3RhdGljUHJvdmlkZXIgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IENvbW1vbkVuZ2luZSwgUmVuZGVyT3B0aW9ucyBhcyBDb21tb25SZW5kZXJPcHRpb25zIH0gZnJvbSAnQG5ndW5pdmVyc2FsL2NvbW1vbi9lbmdpbmUnO1xuaW1wb3J0IHsgUkVRVUVTVCwgUkVTUE9OU0UgfSBmcm9tICdAbmd1bml2ZXJzYWwvZXhwcmVzcy1lbmdpbmUvdG9rZW5zJztcbmltcG9ydCB0eXBlIHsgUmVxdWVzdCwgUmVzcG9uc2UgfSBmcm9tICdleHByZXNzJztcblxuLyoqXG4gKiBUaGVzZSBhcmUgdGhlIGFsbG93ZWQgb3B0aW9ucyBmb3IgdGhlIGVuZ2luZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nU2V0dXBPcHRpb25zXG4gIGV4dGVuZHMgUGljazxDb21tb25SZW5kZXJPcHRpb25zLCAncHJvdmlkZXJzJyB8ICdwdWJsaWNQYXRoJyB8ICdpbmxpbmVDcml0aWNhbENzcyc+IHtcbiAgYm9vdHN0cmFwOiBOb25OdWxsYWJsZTxDb21tb25SZW5kZXJPcHRpb25zWydib290c3RyYXAnXT47XG59XG5cbi8qKlxuICogVGhlc2UgYXJlIHRoZSBhbGxvd2VkIG9wdGlvbnMgZm9yIHRoZSByZW5kZXJcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJPcHRpb25zIGV4dGVuZHMgQ29tbW9uUmVuZGVyT3B0aW9ucyB7XG4gIHJlcTogUmVxdWVzdDtcbiAgcmVzPzogUmVzcG9uc2U7XG59XG5cbi8qKlxuICogVGhpcyBpcyBhbiBleHByZXNzIGVuZ2luZSBmb3IgaGFuZGxpbmcgQW5ndWxhciBBcHBsaWNhdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5nRXhwcmVzc0VuZ2luZShzZXR1cE9wdGlvbnM6IFJlYWRvbmx5PE5nU2V0dXBPcHRpb25zPikge1xuICBjb25zdCBlbmdpbmUgPSBuZXcgQ29tbW9uRW5naW5lKHNldHVwT3B0aW9ucy5ib290c3RyYXAsIHNldHVwT3B0aW9ucy5wcm92aWRlcnMpO1xuXG4gIHJldHVybiBmdW5jdGlvbiAoXG4gICAgZmlsZVBhdGg6IHN0cmluZyxcbiAgICBvcHRpb25zOiBvYmplY3QsXG4gICAgY2FsbGJhY2s6IChlcnI/OiBFcnJvciB8IG51bGwsIGh0bWw/OiBzdHJpbmcpID0+IHZvaWQsXG4gICkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZW5kZXJPcHRpb25zID0geyAuLi5vcHRpb25zIH0gYXMgUmVuZGVyT3B0aW9ucztcbiAgICAgIGlmICghc2V0dXBPcHRpb25zLmJvb3RzdHJhcCAmJiAhcmVuZGVyT3B0aW9ucy5ib290c3RyYXApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbXVzdCBwYXNzIGluIGEgTmdNb2R1bGUgdG8gYmUgYm9vdHN0cmFwcGVkJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgcmVxIH0gPSByZW5kZXJPcHRpb25zO1xuICAgICAgY29uc3QgcmVzID0gcmVuZGVyT3B0aW9ucy5yZXMgPz8gcmVxLnJlcztcblxuICAgICAgcmVuZGVyT3B0aW9ucy51cmwgPVxuICAgICAgICByZW5kZXJPcHRpb25zLnVybCA/PyBgJHtyZXEucHJvdG9jb2x9Oi8vJHtyZXEuZ2V0KCdob3N0JykgfHwgJyd9JHtyZXEuYmFzZVVybH0ke3JlcS51cmx9YDtcbiAgICAgIHJlbmRlck9wdGlvbnMuZG9jdW1lbnRGaWxlUGF0aCA9IHJlbmRlck9wdGlvbnMuZG9jdW1lbnRGaWxlUGF0aCA/PyBmaWxlUGF0aDtcbiAgICAgIHJlbmRlck9wdGlvbnMucHJvdmlkZXJzID0gWy4uLihyZW5kZXJPcHRpb25zLnByb3ZpZGVycyA/PyBbXSksIGdldFJlcVJlc1Byb3ZpZGVycyhyZXEsIHJlcyldO1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtZXhwcmVzc2lvbnNcbiAgICAgIHJlbmRlck9wdGlvbnMucHVibGljUGF0aCA9XG4gICAgICAgIHJlbmRlck9wdGlvbnMucHVibGljUGF0aCA/PyBzZXR1cE9wdGlvbnMucHVibGljUGF0aCA/PyAob3B0aW9ucyBhcyBhbnkpLnNldHRpbmdzPy52aWV3cztcbiAgICAgIHJlbmRlck9wdGlvbnMuaW5saW5lQ3JpdGljYWxDc3MgPVxuICAgICAgICByZW5kZXJPcHRpb25zLmlubGluZUNyaXRpY2FsQ3NzID8/IHNldHVwT3B0aW9ucy5pbmxpbmVDcml0aWNhbENzcztcblxuICAgICAgZW5naW5lXG4gICAgICAgIC5yZW5kZXIocmVuZGVyT3B0aW9ucylcbiAgICAgICAgLnRoZW4oKGh0bWwpID0+IGNhbGxiYWNrKG51bGwsIGh0bWwpKVxuICAgICAgICAuY2F0Y2goY2FsbGJhY2spO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogR2V0IHByb3ZpZGVycyBvZiB0aGUgcmVxdWVzdCBhbmQgcmVzcG9uc2VcbiAqL1xuZnVuY3Rpb24gZ2V0UmVxUmVzUHJvdmlkZXJzKHJlcTogUmVxdWVzdCwgcmVzPzogUmVzcG9uc2UpOiBTdGF0aWNQcm92aWRlcltdIHtcbiAgY29uc3QgcHJvdmlkZXJzOiBTdGF0aWNQcm92aWRlcltdID0gW1xuICAgIHtcbiAgICAgIHByb3ZpZGU6IFJFUVVFU1QsXG4gICAgICB1c2VWYWx1ZTogcmVxLFxuICAgIH0sXG4gIF07XG4gIGlmIChyZXMpIHtcbiAgICBwcm92aWRlcnMucHVzaCh7XG4gICAgICBwcm92aWRlOiBSRVNQT05TRSxcbiAgICAgIHVzZVZhbHVlOiByZXMsXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcHJvdmlkZXJzO1xufVxuIl19