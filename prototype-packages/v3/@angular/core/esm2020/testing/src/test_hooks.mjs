/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Public Test Library for unit testing Angular applications. Assumes that you are running
 * with Jasmine, Mocha, or a similar framework which exports a beforeEach function and
 * allows tests to be asynchronous by either returning a promise or using a 'done' parameter.
 */
import { resetFakeAsyncZone } from './fake_async';
import { TestBedImpl } from './test_bed';
const _global = (typeof window === 'undefined' ? global : window);
// Reset the test providers and the fake async zone before each test.
if (_global.beforeEach) {
    _global.beforeEach(getCleanupHook(false));
}
// We provide both a `beforeEach` and `afterEach`, because the updated behavior for
// tearing down the module is supposed to run after the test so that we can associate
// teardown errors with the correct test.
if (_global.afterEach) {
    _global.afterEach(getCleanupHook(true));
}
function getCleanupHook(expectedTeardownValue) {
    return () => {
        const testBed = TestBedImpl.INSTANCE;
        if (testBed.shouldTearDownTestingModule() === expectedTeardownValue) {
            testBed.resetTestingModule();
            resetFakeAsyncZone();
        }
    };
}
/**
 * This API should be removed. But doing so seems to break `google3` and so it requires a bit of
 * investigation.
 *
 * A work around is to mark it as `@codeGenApi` for now and investigate later.
 *
 * @codeGenApi
 */
// TODO(iminar): Remove this code in a safe way.
export const __core_private_testing_placeholder__ = '';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdF9ob29rcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvcmUvdGVzdGluZy9zcmMvdGVzdF9ob29rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSDs7OztHQUlHO0FBRUgsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQ2hELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFJdkMsTUFBTSxPQUFPLEdBQVEsQ0FBQyxPQUFPLE1BQU0sS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFdkUscUVBQXFFO0FBQ3JFLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRTtJQUN0QixPQUFPLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0NBQzNDO0FBRUQsbUZBQW1GO0FBQ25GLHFGQUFxRjtBQUNyRix5Q0FBeUM7QUFDekMsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFO0lBQ3JCLE9BQU8sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDekM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxxQkFBOEI7SUFDcEQsT0FBTyxHQUFHLEVBQUU7UUFDVixNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDO1FBQ3JDLElBQUksT0FBTyxDQUFDLDJCQUEyQixFQUFFLEtBQUsscUJBQXFCLEVBQUU7WUFDbkUsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDN0Isa0JBQWtCLEVBQUUsQ0FBQztTQUN0QjtJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRDs7Ozs7OztHQU9HO0FBQ0gsZ0RBQWdEO0FBQ2hELE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vKipcbiAqIFB1YmxpYyBUZXN0IExpYnJhcnkgZm9yIHVuaXQgdGVzdGluZyBBbmd1bGFyIGFwcGxpY2F0aW9ucy4gQXNzdW1lcyB0aGF0IHlvdSBhcmUgcnVubmluZ1xuICogd2l0aCBKYXNtaW5lLCBNb2NoYSwgb3IgYSBzaW1pbGFyIGZyYW1ld29yayB3aGljaCBleHBvcnRzIGEgYmVmb3JlRWFjaCBmdW5jdGlvbiBhbmRcbiAqIGFsbG93cyB0ZXN0cyB0byBiZSBhc3luY2hyb25vdXMgYnkgZWl0aGVyIHJldHVybmluZyBhIHByb21pc2Ugb3IgdXNpbmcgYSAnZG9uZScgcGFyYW1ldGVyLlxuICovXG5cbmltcG9ydCB7cmVzZXRGYWtlQXN5bmNab25lfSBmcm9tICcuL2Zha2VfYXN5bmMnO1xuaW1wb3J0IHtUZXN0QmVkSW1wbH0gZnJvbSAnLi90ZXN0X2JlZCc7XG5cbmRlY2xhcmUgdmFyIGdsb2JhbDogYW55O1xuXG5jb25zdCBfZ2xvYmFsID0gPGFueT4odHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3cpO1xuXG4vLyBSZXNldCB0aGUgdGVzdCBwcm92aWRlcnMgYW5kIHRoZSBmYWtlIGFzeW5jIHpvbmUgYmVmb3JlIGVhY2ggdGVzdC5cbmlmIChfZ2xvYmFsLmJlZm9yZUVhY2gpIHtcbiAgX2dsb2JhbC5iZWZvcmVFYWNoKGdldENsZWFudXBIb29rKGZhbHNlKSk7XG59XG5cbi8vIFdlIHByb3ZpZGUgYm90aCBhIGBiZWZvcmVFYWNoYCBhbmQgYGFmdGVyRWFjaGAsIGJlY2F1c2UgdGhlIHVwZGF0ZWQgYmVoYXZpb3IgZm9yXG4vLyB0ZWFyaW5nIGRvd24gdGhlIG1vZHVsZSBpcyBzdXBwb3NlZCB0byBydW4gYWZ0ZXIgdGhlIHRlc3Qgc28gdGhhdCB3ZSBjYW4gYXNzb2NpYXRlXG4vLyB0ZWFyZG93biBlcnJvcnMgd2l0aCB0aGUgY29ycmVjdCB0ZXN0LlxuaWYgKF9nbG9iYWwuYWZ0ZXJFYWNoKSB7XG4gIF9nbG9iYWwuYWZ0ZXJFYWNoKGdldENsZWFudXBIb29rKHRydWUpKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2xlYW51cEhvb2soZXhwZWN0ZWRUZWFyZG93blZhbHVlOiBib29sZWFuKSB7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgY29uc3QgdGVzdEJlZCA9IFRlc3RCZWRJbXBsLklOU1RBTkNFO1xuICAgIGlmICh0ZXN0QmVkLnNob3VsZFRlYXJEb3duVGVzdGluZ01vZHVsZSgpID09PSBleHBlY3RlZFRlYXJkb3duVmFsdWUpIHtcbiAgICAgIHRlc3RCZWQucmVzZXRUZXN0aW5nTW9kdWxlKCk7XG4gICAgICByZXNldEZha2VBc3luY1pvbmUoKTtcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogVGhpcyBBUEkgc2hvdWxkIGJlIHJlbW92ZWQuIEJ1dCBkb2luZyBzbyBzZWVtcyB0byBicmVhayBgZ29vZ2xlM2AgYW5kIHNvIGl0IHJlcXVpcmVzIGEgYml0IG9mXG4gKiBpbnZlc3RpZ2F0aW9uLlxuICpcbiAqIEEgd29yayBhcm91bmQgaXMgdG8gbWFyayBpdCBhcyBgQGNvZGVHZW5BcGlgIGZvciBub3cgYW5kIGludmVzdGlnYXRlIGxhdGVyLlxuICpcbiAqIEBjb2RlR2VuQXBpXG4gKi9cbi8vIFRPRE8oaW1pbmFyKTogUmVtb3ZlIHRoaXMgY29kZSBpbiBhIHNhZmUgd2F5LlxuZXhwb3J0IGNvbnN0IF9fY29yZV9wcml2YXRlX3Rlc3RpbmdfcGxhY2Vob2xkZXJfXyA9ICcnO1xuIl19