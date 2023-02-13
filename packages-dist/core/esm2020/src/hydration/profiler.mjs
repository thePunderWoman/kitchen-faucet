/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || !!ngDevMode;
/**
 * The profiler for server side rendering performance metrics
 */
export class SsrProfiler {
    constructor() {
        this.metrics = {
            ["Overall SSR time (in ms)" /* SsrPerfMetrics.OverallSsrTime */]: this.initTimespanMetric(),
            ["Overall DOM serialization time (in ms)" /* SsrPerfMetrics.DomSerializationTime */]: this.initTimespanMetric(),
            ["Overall hydration time (in ms)" /* SsrPerfMetrics.OverallHydrationTime */]: this.initTimespanMetric(),
            ["Serialized Components" /* SsrPerfMetrics.SerializedComponents */]: 0,
            ["Serialized DOM Nodes" /* SsrPerfMetrics.SerializedDomNodes */]: 0,
            ["Overall HTML size (in character length)" /* SsrPerfMetrics.OverallHtmlSize */]: 0,
            ["Hydration annotation size (in character length)" /* SsrPerfMetrics.NghAnnotationSize */]: 0,
            ["Empty Text Node count" /* SsrPerfMetrics.EmptyTextNodeCount */]: 0,
            ["Components with empty NGH" /* SsrPerfMetrics.ComponentsWithEmptyNgh */]: 0,
        };
    }
    initTimespanMetric() {
        return { start: 0, end: 0 };
    }
    invokeAndMeasure(functionToProfile, metric) {
        this.startTimespan(metric);
        const result = functionToProfile();
        this.stopTimespan(metric);
        return result;
    }
    startTimespan(metric) {
        const _metric = this.metrics[metric];
        if (typeof _metric === 'object') {
            _metric.start = performance.now();
        }
    }
    stopTimespan(metric) {
        const _metric = this.metrics[metric];
        if (typeof _metric === 'object') {
            if (_metric.end <= 0) {
                _metric.end = performance.now();
            }
            else {
                throw new Error(`We already stopped measuring for metric ${metric}.`);
            }
        }
    }
    incrementMetricValue(metric, value) {
        const _metric = this.metrics[metric];
        if (typeof _metric === 'number') {
            this.metrics[metric] += value;
        }
    }
    serializeMetrics() {
        const overallSsTime = this.getMetric("Overall SSR time (in ms)" /* SsrPerfMetrics.OverallSsrTime */);
        const overallHydrationTime = this.getMetric("Overall hydration time (in ms)" /* SsrPerfMetrics.OverallHydrationTime */);
        const domSerializationTime = this.getMetric("Overall DOM serialization time (in ms)" /* SsrPerfMetrics.DomSerializationTime */);
        const overallHtmlSize = this.getMetric("Overall HTML size (in character length)" /* SsrPerfMetrics.OverallHtmlSize */);
        const nghAnnotationSize = this.getMetric("Hydration annotation size (in character length)" /* SsrPerfMetrics.NghAnnotationSize */);
        const serializedComponents = this.getMetric("Serialized Components" /* SsrPerfMetrics.SerializedComponents */);
        const componentsWithNoNgh = this.getMetric("Components with empty NGH" /* SsrPerfMetrics.ComponentsWithEmptyNgh */);
        const hydrationPercentage = (overallHydrationTime / overallSsTime) * 100;
        const domSerializationPercentage = (domSerializationTime / overallSsTime) * 100;
        const annotationPercentage = (nghAnnotationSize / overallHtmlSize) * 100;
        const noNghComponentPercentage = (componentsWithNoNgh / serializedComponents) * 100;
        return `\n
***** Performance results ***
Overall SSR time:          ${overallSsTime.toFixed(2)}ms
Hydration annotation time: ${overallHydrationTime.toFixed(2)}ms (${hydrationPercentage.toFixed(2)}%)
DOM serialization time:    ${domSerializationTime.toFixed(2)}ms (${domSerializationPercentage.toFixed(2)}%)

Components Serialized:     ${this.getMetric("Serialized Components" /* SsrPerfMetrics.SerializedComponents */)}
Components without ngh:    ${this.getMetric("Components with empty NGH" /* SsrPerfMetrics.ComponentsWithEmptyNgh */)} (${noNghComponentPercentage.toFixed(2)}%)
DOM Nodes Serialized:      ${this.getMetric("Serialized DOM Nodes" /* SsrPerfMetrics.SerializedDomNodes */)}
Empty Text Nodes Restored: ${this.getMetric("Empty Text Node count" /* SsrPerfMetrics.EmptyTextNodeCount */)}

Overall HTML size:         ${toKilobytes(overallHtmlSize)}kb
NGH annotation size:       ${toKilobytes(nghAnnotationSize)}kb (${annotationPercentage.toFixed(2)}%)
*****************************
\n`;
    }
    getMetric(metric) {
        const _metric = this.metrics[metric];
        if (typeof _metric === 'object') {
            return _metric.end - _metric.start;
        }
        return this.metrics[metric];
    }
}
function toKilobytes(chars) { return (chars / 1024).toFixed(2); }
let currentProfiler = null;
export function enableSsrPeformanceProfiler(profiler) {
    currentProfiler = profiler ?? new SsrProfiler();
}
export function disableSsrPeformanceProfiler() {
    currentProfiler = null;
}
export function isSsrProfilerEnabled() {
    return !!currentProfiler;
}
export function getSsrProfiler() {
    return currentProfiler;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9oeWRyYXRpb24vcHJvZmlsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBSUgsTUFBTSxXQUFXLEdBQUcsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFzRHBFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFdBQVc7SUFBeEI7UUFDVSxZQUFPLEdBQWtEO1lBQy9ELGdFQUErQixFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtZQUMxRCxvRkFBcUMsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDaEUsNEVBQXFDLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQ2hFLG1FQUFxQyxFQUFFLENBQUM7WUFDeEMsZ0VBQW1DLEVBQUUsQ0FBQztZQUN0QyxnRkFBZ0MsRUFBRSxDQUFDO1lBQ25DLDBGQUFrQyxFQUFFLENBQUM7WUFDckMsaUVBQW1DLEVBQUUsQ0FBQztZQUN0Qyx5RUFBdUMsRUFBRSxDQUFDO1NBQzNDLENBQUM7SUE4RUosQ0FBQztJQTVFUyxrQkFBa0I7UUFDeEIsT0FBTyxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBSSxpQkFBMEIsRUFBRSxNQUFzQjtRQUNwRSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQixPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQsYUFBYSxDQUFDLE1BQXNCO1FBQ2xDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFB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RUFBRTtZQUMvQixPQUFPLE9BQU8sQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztTQUNwQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQVcsQ0FBQztJQUN4QyxDQUFDO0NBQ0Y7QUFFRCxTQUFTLFdBQVcsQ0FBQyxLQUFhLElBQVUsT0FBTyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQSxDQUFDO0FBRTdFLElBQUksZUFBZSxHQUFxQixJQUFJLENBQUM7QUFFN0MsTUFBTSxVQUFVLDJCQUEyQixDQUFDLFFBQXNCO0lBQ2hFLGVBQWUsR0FBRyxRQUFRLElBQUksSUFBSSxXQUFXLEVBQUUsQ0FBQztBQUNsRCxDQUFDO0FBRUQsTUFBTSxVQUFVLDRCQUE0QjtJQUMxQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0FBQ3pCLENBQUM7QUFFRCxNQUFNLFVBQVUsb0JBQW9CO0lBQ2xDLE9BQU8sQ0FBQyxDQUFDLGVBQWUsQ0FBQztBQUMzQixDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWM7SUFDNUIsT0FBTyxlQUFlLENBQUM7QUFDekIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2dsb2JhbH0gZnJvbSAnLi4vdXRpbC9nbG9iYWwnO1xuXG5jb25zdCBOR19ERVZfTU9ERSA9IHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8ICEhbmdEZXZNb2RlO1xuXG5leHBvcnQgY29uc3QgZW51bSBTc3JQZXJmTWV0cmljcyB7XG4gIC8qKlxuICAgKiBUb3RhbCB0aW1lIGl0IHRha2VzIHRvIHByb2Nlc3MgYSByZXF1ZXN0LlxuICAgKi9cbiAgT3ZlcmFsbFNzclRpbWUgPSAnT3ZlcmFsbCBTU1IgdGltZSAoaW4gbXMpJyxcblxuICAvKipcbiAgICogVGltZSBpdCB0YWtlcyB0byBzZXJpYWxpemUgRE9NICh1c2luZyBEb21pbm8pLlxuICAgKi9cbiAgRG9tU2VyaWFsaXphdGlvblRpbWUgPSAnT3ZlcmFsbCBET00gc2VyaWFsaXphdGlvbiB0aW1lIChpbiBtcyknLFxuXG4gIC8qKlxuICAgKiBUb3RhbCB0aW1lIGl0IHRha2VzIHRvIGh5ZHJhdGVcbiAgICovXG4gIE92ZXJhbGxIeWRyYXRpb25UaW1lID0gJ092ZXJhbGwgaHlkcmF0aW9uIHRpbWUgKGluIG1zKScsXG5cbiAgLyoqXG4gICAqIFRvdGFsIG51bWJlciBvZiBzZXJpYWxpemVkIGNvbXBvbmVudHNcbiAgICovXG4gIFNlcmlhbGl6ZWRDb21wb25lbnRzID0gJ1NlcmlhbGl6ZWQgQ29tcG9uZW50cycsXG5cbiAgLyoqXG4gICAqIFRvdGFsIG51bWJlciBvZiBzZXJpYWxpemVkIERPTSBub2Rlc1xuICAgKi9cbiAgU2VyaWFsaXplZERvbU5vZGVzID0gJ1NlcmlhbGl6ZWQgRE9NIE5vZGVzJyxcblxuICAvKipcbiAgICogVG90YWwgdGltZSBpdCB0YWtlcyB0byBoeWRyYXRlXG4gICAqL1xuICBPdmVyYWxsSHRtbFNpemUgPSAnT3ZlcmFsbCBIVE1MIHNpemUgKGluIGNoYXJhY3RlciBsZW5ndGgpJyxcblxuICAvKipcbiAgICogVG90YWwgdGltZSBpdCB0YWtlcyB0byBoeWRyYXRlXG4gICAqL1xuICBOZ2hBbm5vdGF0aW9uU2l6ZSA9ICdIeWRyYXRpb24gYW5ub3RhdGlvbiBzaXplIChpbiBjaGFyYWN0ZXIgbGVuZ3RoKScsXG5cbiAgLyoqXG4gICAqIEVtcHR5IHRleHQgbm9kZXMgdGhhdCBuZWVkZWQgdG8gYmUgcmVzdG9yZWRcbiAgICovXG4gIEVtcHR5VGV4dE5vZGVDb3VudCA9ICdFbXB0eSBUZXh0IE5vZGUgY291bnQnLFxuXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgY29tcG9lbnRzIHRoYXQgZG8gbm90IHJlcXVpcmUgYW55IE5HSCBhbm5vdGF0aW9uc1xuICAgKi9cbiAgQ29tcG9uZW50c1dpdGhFbXB0eU5naCA9ICdDb21wb25lbnRzIHdpdGggZW1wdHkgTkdIJ1xufVxuXG5pbnRlcmZhY2UgVGltZXNwYW5NZXRyaWMge1xuICBzdGFydDogbnVtYmVyO1xuICBlbmQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBUaGUgcHJvZmlsZXIgZm9yIHNlcnZlciBzaWRlIHJlbmRlcmluZyBwZXJmb3JtYW5jZSBtZXRyaWNzXG4gKi9cbmV4cG9ydCBjbGFzcyBTc3JQcm9maWxlciB7XG4gIHByaXZhdGUgbWV0cmljczogUmVjb3JkPFNzclBlcmZNZXRyaWNzLCBUaW1lc3Bhbk1ldHJpY3xudW1iZXI+ID0ge1xuICAgIFtTc3JQZXJmTWV0cmljcy5PdmVyYWxsU3NyVGltZV06IHRoaXMuaW5pdFRpbWVzcGFuTWV0cmljKCksXG4gICAgW1NzclBlcmZNZXRyaWNzLkRvbVNlcmlhbGl6YXRpb25UaW1lXTogdGhpcy5pbml0VGltZXNwYW5NZXRyaWMoKSxcbiAgICBbU3NyUGVyZk1ldHJpY3MuT3ZlcmFsbEh5ZHJhdGlvblRpbWVdOiB0aGlzLmluaXRUaW1lc3Bhbk1ldHJpYygpLFxuICAgIFtTc3JQZXJmTWV0cmljcy5TZXJpYWxpemVkQ29tcG9uZW50c106IDAsXG4gICAgW1NzclBlcmZNZXRyaWNzLlNlcmlhbGl6ZWREb21Ob2Rlc106IDAsXG4gICAgW1NzclBlcmZNZXRyaWNzLk92ZXJhbGxIdG1sU2l6ZV06IDAsXG4gICAgW1NzclBlcmZNZXRyaWNzLk5naEFubm90YXRpb25TaXplXTogMCxcbiAgICBbU3NyUGVyZk1ldHJpY3MuRW1wdHlUZXh0Tm9kZUNvdW50XTogMCxcbiAgICBbU3NyUGVyZk1ldHJpY3MuQ29tcG9uZW50c1dpdGhFbXB0eU5naF06IDAsXG4gIH07XG5cbiAgcHJpdmF0ZSBpbml0VGltZXNwYW5NZXRyaWMoKTogVGltZXNwYW5NZXRyaWMge1xuICAgIHJldHVybiB7c3RhcnQ6IDAsIGVuZDogMH07XG4gIH1cblxuICBpbnZva2VBbmRNZWFzdXJlPFQ+KGZ1bmN0aW9uVG9Qcm9maWxlOiAoKSA9PiBULCBtZXRyaWM6IFNzclBlcmZNZXRyaWNzKTogVCB7XG4gICAgdGhpcy5zdGFydFRpbWVzcGFuKG1ldHJpYyk7XG4gICAgY29uc3QgcmVzdWx0ID0gZnVuY3Rpb25Ub1Byb2ZpbGUoKTtcbiAgICB0aGlzLnN0b3BUaW1lc3BhbihtZXRyaWMpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBzdGFydFRpbWVzcGFuKG1ldHJpYzogU3NyUGVyZk1ldHJpY3MpIHtcbiAgICBjb25zdCBfbWV0cmljID0gdGhpcy5tZXRyaWNzW21ldHJpY10gYXMge3N0YXJ0OiBudW1iZXJ9O1xuICAgIGlmICh0eXBlb2YgX21ldHJpYyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIF9tZXRyaWMuc3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9XG4gIH1cblxuICBzdG9wVGltZXNwYW4obWV0cmljOiBTc3JQZXJmTWV0cmljcykge1xuICAgIGNvbnN0IF9tZXRyaWMgPSB0aGlzLm1ldHJpY3NbbWV0cmljXSBhcyB7ZW5kOiBudW1iZXJ9O1xuICAgIGlmICh0eXBlb2YgX21ldHJpYyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChfbWV0cmljLmVuZCA8PSAwKSB7XG4gICAgICAgIF9tZXRyaWMuZW5kID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFdlIGFscmVhZHkgc3RvcHBlZCBtZWFzdXJpbmcgZm9yIG1ldHJpYyAke21ldHJpY30uYCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5jcmVtZW50TWV0cmljVmFsdWUobWV0cmljOiBTc3JQZXJmTWV0cmljcywgdmFsdWU6IG51bWJlcikge1xuICAgIGNvbnN0IF9tZXRyaWMgPSB0aGlzLm1ldHJpY3NbbWV0cmljXTtcbiAgICBpZiAodHlwZW9mIF9tZXRyaWMgPT09ICdudW1iZXInKSB7XG4gICAgICAodGhpcy5tZXRyaWNzW21ldHJpY10gYXMgbnVtYmVyKSArPSB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICBzZXJpYWxpemVNZXRyaWNzKCk6IHN0cmluZyB7XG4gICAgY29uc3Qgb3ZlcmFsbFNzVGltZSA9IHRoaXMuZ2V0TWV0cmljKFNzclBlcmZNZXRyaWNzLk92ZXJhbGxTc3JUaW1lKTtcbiAgICBjb25zdCBvdmVyYWxsSHlkcmF0aW9uVGltZSA9IHRoaXMuZ2V0TWV0cmljKFNzclBlcmZNZXRyaWNzLk92ZXJhbGxIeWRyYXRpb25UaW1lKTtcbiAgICBjb25zdCBkb21TZXJpYWxpemF0aW9uVGltZSA9IHRoaXMuZ2V0TWV0cmljKFNzclBlcmZNZXRyaWNzLkRvbVNlcmlhbGl6YXRpb25UaW1lKTtcbiAgICBjb25zdCBvdmVyYWxsSHRtbFNpemUgPSB0aGlzLmdldE1ldHJpYyhTc3JQZXJmTWV0cmljcy5PdmVyYWxsSHRtbFNpemUpO1xuICAgIGNvbnN0IG5naEFubm90YXRpb25TaXplID0gdGhpcy5nZXRNZXRyaWMoU3NyUGVyZk1ldHJpY3MuTmdoQW5ub3RhdGlvblNpemUpO1xuICAgIGNvbnN0IHNlcmlhbGl6ZWRDb21wb25lbnRzID0gdGhpcy5nZXRNZXRyaWMoU3NyUGVyZk1ldHJpY3MuU2VyaWFsaXplZENvbXBvbmVudHMpO1xuICAgIGNvbnN0IGNvbXBvbmVudHNXaXRoTm9OZ2ggPSB0aGlzLmdldE1ldHJpYyhTc3JQZXJmTWV0cmljcy5Db21wb25lbnRzV2l0aEVtcHR5TmdoKTtcblxuICAgIGNvbnN0IGh5ZHJhdGlvblBlcmNlbnRhZ2UgPSAob3ZlcmFsbEh5ZHJhdGlvblRpbWUgLyBvdmVyYWxsU3NUaW1lKSAqIDEwMDtcbiAgICBjb25zdCBkb21TZXJpYWxpemF0aW9uUGVyY2VudGFnZSA9IChkb21TZXJpYWxpemF0aW9uVGltZSAvIG92ZXJhbGxTc1RpbWUpICogMTAwO1xuICAgIGNvbnN0IGFubm90YXRpb25QZXJjZW50YWdlID0gKG5naEFubm90YXRpb25TaXplIC8gb3ZlcmFsbEh0bWxTaXplKSAqIDEwMDtcbiAgICBjb25zdCBub05naENvbXBvbmVudFBlcmNlbnRhZ2UgPSAoY29tcG9uZW50c1dpdGhOb05naCAvIHNlcmlhbGl6ZWRDb21wb25lbnRzKSAqIDEwMDtcblxuICAgIHJldHVybiBgXFxuXG4qKioqKiBQZXJmb3JtYW5jZSByZXN1bHRzICoqKlxuT3ZlcmFsbCBTU1IgdGltZTogICAgICAgICAgJHtvdmVyYWxsU3NUaW1lLnRvRml4ZWQoMil9bXNcbkh5ZHJhdGlvbiBhbm5vdGF0aW9uIHRpbWU6ICR7b3ZlcmFsbEh5ZHJhdGlvblRpbWUudG9GaXhlZCgyKX1tcyAoJHtoeWRyYXRpb25QZXJjZW50YWdlLnRvRml4ZWQoMil9JSlcbkRPTSBzZXJpYWxpemF0aW9uIHRpbWU6ICAgICR7ZG9tU2VyaWFsaXphdGlvblRpbWUudG9GaXhlZCgyKX1tcyAoJHtcbiAgICAgICAgZG9tU2VyaWFsaXphdGlvblBlcmNlbnRhZ2UudG9GaXhlZCgyKX0lKVxuXG5Db21wb25lbnRzIFNlcmlhbGl6ZWQ6ICAgICAke3RoaXMuZ2V0TWV0cmljKFNzclBlcmZNZXRyaWNzLlNlcmlhbGl6ZWRDb21wb25lbnRzKX1cbkNvbXBvbmVudHMgd2l0aG91dCBuZ2g6ICAgICR7dGhpcy5nZXRNZXRyaWMoU3NyUGVyZk1ldHJpY3MuQ29tcG9uZW50c1dpdGhFbXB0eU5naCl9ICgke1xuICAgICAgICBub05naENvbXBvbmVudFBlcmNlbnRhZ2UudG9GaXhlZCgyKX0lKVxuRE9NIE5vZGVzIFNlcmlhbGl6ZWQ6ICAgICAgJHt0aGlzLmdldE1ldHJpYyhTc3JQZXJmTWV0cmljcy5TZXJpYWxpemVkRG9tTm9kZXMpfVxuRW1wdHkgVGV4dCBOb2RlcyBSZXN0b3JlZDogJHt0aGlzLmdldE1ldHJpYyhTc3JQZXJmTWV0cmljcy5FbXB0eVRleHROb2RlQ291bnQpfVxuXG5PdmVyYWxsIEhUTUwgc2l6ZTogICAgICAgICAke3RvS2lsb2J5dGVzKG92ZXJhbGxIdG1sU2l6ZSl9a2Jcbk5HSCBhbm5vdGF0aW9uIHNpemU6ICAgICAgICR7dG9LaWxvYnl0ZXMobmdoQW5ub3RhdGlvblNpemUpfWtiICgke2Fubm90YXRpb25QZXJjZW50YWdlLnRvRml4ZWQoMil9JSlcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cXG5gO1xuICB9XG5cbiAgZ2V0TWV0cmljKG1ldHJpYzogU3NyUGVyZk1ldHJpY3MpOiBudW1iZXIge1xuICAgIGNvbnN0IF9tZXRyaWMgPSB0aGlzLm1ldHJpY3NbbWV0cmljXTtcbiAgICBpZiAodHlwZW9mIF9tZXRyaWMgPT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gX21ldHJpYy5lbmQgLSBfbWV0cmljLnN0YXJ0O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tZXRyaWNzW21ldHJpY10gYXMgbnVtYmVyO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRvS2lsb2J5dGVzKGNoYXJzOiBudW1iZXIpOiBzdHJpbmd7cmV0dXJuIChjaGFycyAvIDEwMjQpLnRvRml4ZWQoMil9XG5cbmxldCBjdXJyZW50UHJvZmlsZXI6IFNzclByb2ZpbGVyfG51bGwgPSBudWxsO1xuXG5leHBvcnQgZnVuY3Rpb24gZW5hYmxlU3NyUGVmb3JtYW5jZVByb2ZpbGVyKHByb2ZpbGVyPzogU3NyUHJvZmlsZXIpIHtcbiAgY3VycmVudFByb2ZpbGVyID0gcHJvZmlsZXIgPz8gbmV3IFNzclByb2ZpbGVyKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNhYmxlU3NyUGVmb3JtYW5jZVByb2ZpbGVyKCkge1xuICBjdXJyZW50UHJvZmlsZXIgPSBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTc3JQcm9maWxlckVuYWJsZWQoKTogYm9vbGVhbiB7XG4gIHJldHVybiAhIWN1cnJlbnRQcm9maWxlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFNzclByb2ZpbGVyKCk6IFNzclByb2ZpbGVyfG51bGwge1xuICByZXR1cm4gY3VycmVudFByb2ZpbGVyO1xufVxuIl19