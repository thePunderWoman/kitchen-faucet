/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { promises as fs } from 'fs';
import { join } from 'path';
import { loadEsmModule } from '../utils/utils';
export function render({ inlineCriticalCss, outputPath, route, port, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const { Engine } = yield loadEsmModule('@nguniversal/common/clover/server');
        const html = yield new Engine().render({
            publicPath: outputPath,
            inlineCriticalCss: inlineCriticalCss,
            url: `http://localhost:${port}/${route}`,
        });
        // This case happens when we are prerendering "/".
        const outputFolderPath = join(outputPath, route);
        const outputIndexPath = join(outputFolderPath, 'index.html');
        if (route === '/') {
            const browserIndexOutputPathOriginal = join(outputPath, 'index-ssr.html');
            yield fs.rename(outputIndexPath, browserIndexOutputPathOriginal);
        }
        yield fs.mkdir(outputFolderPath, { recursive: true });
        yield fs.writeFile(outputIndexPath, html);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9idWlsZGVycy9zcmMvc3RhdGljLWdlbmVyYXRvci93b3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsT0FBTyxFQUFFLFFBQVEsSUFBSSxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDcEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUM1QixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFTL0MsTUFBTSxVQUFnQixNQUFNLENBQUMsRUFDM0IsaUJBQWlCLEVBQ2pCLFVBQVUsRUFDVixLQUFLLEVBQ0wsSUFBSSxHQUNVOztRQUNkLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLGFBQWEsQ0FDcEMsbUNBQW1DLENBQ3BDLENBQUM7UUFFRixNQUFNLElBQUksR0FBRyxNQUFNLElBQUksTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ3JDLFVBQVUsRUFBRSxVQUFVO1lBQ3RCLGlCQUFpQixFQUFFLGlCQUFpQjtZQUNwQyxHQUFHLEVBQUUsb0JBQW9CLElBQUksSUFBSSxLQUFLLEVBQUU7U0FDekMsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDN0QsSUFBSSxLQUFLLEtBQUssR0FBRyxFQUFFO1lBQ2pCLE1BQU0sOEJBQThCLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsOEJBQThCLENBQUMsQ0FBQztTQUNsRTtRQUVELE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgbG9hZEVzbU1vZHVsZSB9IGZyb20gJy4uL3V0aWxzL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJPcHRpb25zIHtcbiAgaW5saW5lQ3JpdGljYWxDc3M/OiBib29sZWFuO1xuICBvdXRwdXRQYXRoOiBzdHJpbmc7XG4gIHJvdXRlOiBzdHJpbmc7XG4gIHBvcnQ6IG51bWJlcjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbmRlcih7XG4gIGlubGluZUNyaXRpY2FsQ3NzLFxuICBvdXRwdXRQYXRoLFxuICByb3V0ZSxcbiAgcG9ydCxcbn06IFJlbmRlck9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgeyBFbmdpbmUgfSA9IGF3YWl0IGxvYWRFc21Nb2R1bGU8dHlwZW9mIGltcG9ydCgnQG5ndW5pdmVyc2FsL2NvbW1vbi9jbG92ZXIvc2VydmVyJyk+KFxuICAgICdAbmd1bml2ZXJzYWwvY29tbW9uL2Nsb3Zlci9zZXJ2ZXInLFxuICApO1xuXG4gIGNvbnN0IGh0bWwgPSBhd2FpdCBuZXcgRW5naW5lKCkucmVuZGVyKHtcbiAgICBwdWJsaWNQYXRoOiBvdXRwdXRQYXRoLFxuICAgIGlubGluZUNyaXRpY2FsQ3NzOiBpbmxpbmVDcml0aWNhbENzcyxcbiAgICB1cmw6IGBodHRwOi8vbG9jYWxob3N0OiR7cG9ydH0vJHtyb3V0ZX1gLFxuICB9KTtcblxuICAvLyBUaGlzIGNhc2UgaGFwcGVucyB3aGVuIHdlIGFyZSBwcmVyZW5kZXJpbmcgXCIvXCIuXG4gIGNvbnN0IG91dHB1dEZvbGRlclBhdGggPSBqb2luKG91dHB1dFBhdGgsIHJvdXRlKTtcbiAgY29uc3Qgb3V0cHV0SW5kZXhQYXRoID0gam9pbihvdXRwdXRGb2xkZXJQYXRoLCAnaW5kZXguaHRtbCcpO1xuICBpZiAocm91dGUgPT09ICcvJykge1xuICAgIGNvbnN0IGJyb3dzZXJJbmRleE91dHB1dFBhdGhPcmlnaW5hbCA9IGpvaW4ob3V0cHV0UGF0aCwgJ2luZGV4LXNzci5odG1sJyk7XG4gICAgYXdhaXQgZnMucmVuYW1lKG91dHB1dEluZGV4UGF0aCwgYnJvd3NlckluZGV4T3V0cHV0UGF0aE9yaWdpbmFsKTtcbiAgfVxuXG4gIGF3YWl0IGZzLm1rZGlyKG91dHB1dEZvbGRlclBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBhd2FpdCBmcy53cml0ZUZpbGUob3V0cHV0SW5kZXhQYXRoLCBodG1sKTtcbn1cbiJdfQ==