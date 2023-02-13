/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { assertParentView } from './assert';
import { icuContainerIterate } from './i18n/i18n_tree_shaking';
import { CONTAINER_HEADER_OFFSET } from './interfaces/container';
import { isLContainer } from './interfaces/type_checks';
import { DECLARATION_COMPONENT_VIEW, TVIEW } from './interfaces/view';
import { assertTNodeType } from './node_assert';
import { getProjectionNodes } from './node_manipulation';
import { getLViewParent } from './util/view_traversal_utils';
import { unwrapRNode } from './util/view_utils';
export function collectNativeNodes(tView, lView, tNode, result, isProjection = false) {
    while (tNode !== null) {
        ngDevMode &&
            assertTNodeType(tNode, 3 /* TNodeType.AnyRNode */ | 12 /* TNodeType.AnyContainer */ | 16 /* TNodeType.Projection */ | 32 /* TNodeType.Icu */);
        const lNode = lView[tNode.index];
        // A given lNode can represent either a native node or a LContainer (when it is a host of a
        // ViewContainerRef). When we find a LContainer we need to descend into it to collect root nodes
        // from the views in this container.
        if (isLContainer(lNode)) {
            for (let i = CONTAINER_HEADER_OFFSET; i < lNode.length; i++) {
                const lViewInAContainer = lNode[i];
                const lViewFirstChildTNode = lViewInAContainer[TVIEW].firstChild;
                if (lViewFirstChildTNode !== null) {
                    collectNativeNodes(lViewInAContainer[TVIEW], lViewInAContainer, lViewFirstChildTNode, result);
                }
            }
        }
        const tNodeType = tNode.type;
        if (tNodeType & 8 /* TNodeType.ElementContainer */) {
            collectNativeNodes(tView, lView, tNode.child, result);
        }
        else if (tNodeType & 32 /* TNodeType.Icu */) {
            const nextRNode = icuContainerIterate(tNode, lView);
            let rNode;
            while (rNode = nextRNode()) {
                result.push(rNode);
            }
        }
        else if (tNodeType & 16 /* TNodeType.Projection */) {
            const nodesInSlot = getProjectionNodes(lView, tNode);
            if (Array.isArray(nodesInSlot)) {
                result.push(...nodesInSlot);
            }
            else {
                const parentView = getLViewParent(lView[DECLARATION_COMPONENT_VIEW]);
                ngDevMode && assertParentView(parentView);
                collectNativeNodes(parentView[TVIEW], parentView, nodesInSlot, result, true);
            }
        }
        // FIXME: this code is moved here to calculate the list of root nodes
        // within a view correctly in case `<ng-container>` is used (which adds)
        // an anchor node to the very end of the list. This should be fixed
        // separately, but we just include the change here for now to get hydration
        // working properly in this prototype.
        if (lNode !== null) {
            result.push(unwrapRNode(lNode));
        }
        tNode = isProjection ? tNode.projectionNext : tNode.next;
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdF9uYXRpdmVfbm9kZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9yZW5kZXIzL2NvbGxlY3RfbmF0aXZlX25vZGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUMxQyxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUM3RCxPQUFPLEVBQUMsdUJBQXVCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUcvRCxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDdEQsT0FBTyxFQUFDLDBCQUEwQixFQUFTLEtBQUssRUFBUSxNQUFNLG1CQUFtQixDQUFDO0FBQ2xGLE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDOUMsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFDdkQsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUk5QyxNQUFNLFVBQVUsa0JBQWtCLENBQzlCLEtBQVksRUFBRSxLQUFZLEVBQUUsS0FBaUIsRUFBRSxNQUFhLEVBQzVELGVBQXdCLEtBQUs7SUFDL0IsT0FBTyxLQUFLLEtBQUssSUFBSSxFQUFFO1FBQ3JCLFNBQVM7WUFDTCxlQUFlLENBQ1gsS0FBSyxFQUNMLDREQUEyQyxnQ0FBdUIseUJBQWdCLENBQUMsQ0FBQztRQUU1RixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRWpDLDJGQUEyRjtRQUMzRixnR0FBZ0c7UUFDaEcsb0NBQW9DO1FBQ3BDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3ZCLEtBQUssSUFBSSxDQUFDLEdBQUcsdUJBQXVCLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzNELE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLG9CQUFvQixHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQztnQkFDakUsSUFBSSxvQkFBb0IsS0FBSyxJQUFJLEVBQUU7b0JBQ2pDLGtCQUFrQixDQUNkLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sQ0FBQyxDQUFDO2lCQUNoRjthQUNGO1NBQ0Y7UUFFRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQzdCLElBQUksU0FBUyxxQ0FBNkIsRUFBRTtZQUMxQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDdkQ7YUFBTSxJQUFJLFNBQVMseUJBQWdCLEVBQUU7WUFDcEMsTUFBTSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsS0FBMEIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN6RSxJQUFJLEtBQWlCLENBQUM7WUFDdEIsT0FBTyxLQUFLLEdBQUcsU0FBUyxFQUFFLEVBQUU7Z0JBQzFCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDcEI7U0FDRjthQUFNLElBQUksU0FBUyxnQ0FBdUIsRUFBRTtZQUMzQyxNQUFNLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDckQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUM5QixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUM7YUFDN0I7aUJBQU07Z0JBQ0wsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFFLENBQUM7Z0JBQ3RFLFNBQVMsSUFBSSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDMUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQzlFO1NBQ0Y7UUFDRCxxRUFBcUU7UUFDckUsd0VBQXdFO1FBQ3hFLG1FQUFtRTtRQUNuRSwyRUFBMkU7UUFDM0Usc0NBQXNDO1FBQ3RDLElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtZQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ2pDO1FBRUQsS0FBSyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztLQUMxRDtJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHthc3NlcnRQYXJlbnRWaWV3fSBmcm9tICcuL2Fzc2VydCc7XG5pbXBvcnQge2ljdUNvbnRhaW5lckl0ZXJhdGV9IGZyb20gJy4vaTE4bi9pMThuX3RyZWVfc2hha2luZyc7XG5pbXBvcnQge0NPTlRBSU5FUl9IRUFERVJfT0ZGU0VUfSBmcm9tICcuL2ludGVyZmFjZXMvY29udGFpbmVyJztcbmltcG9ydCB7VEljdUNvbnRhaW5lck5vZGUsIFROb2RlLCBUTm9kZVR5cGV9IGZyb20gJy4vaW50ZXJmYWNlcy9ub2RlJztcbmltcG9ydCB7Uk5vZGV9IGZyb20gJy4vaW50ZXJmYWNlcy9yZW5kZXJlcl9kb20nO1xuaW1wb3J0IHtpc0xDb250YWluZXJ9IGZyb20gJy4vaW50ZXJmYWNlcy90eXBlX2NoZWNrcyc7XG5pbXBvcnQge0RFQ0xBUkFUSU9OX0NPTVBPTkVOVF9WSUVXLCBMVmlldywgVFZJRVcsIFRWaWV3fSBmcm9tICcuL2ludGVyZmFjZXMvdmlldyc7XG5pbXBvcnQge2Fzc2VydFROb2RlVHlwZX0gZnJvbSAnLi9ub2RlX2Fzc2VydCc7XG5pbXBvcnQge2dldFByb2plY3Rpb25Ob2Rlc30gZnJvbSAnLi9ub2RlX21hbmlwdWxhdGlvbic7XG5pbXBvcnQge2dldExWaWV3UGFyZW50fSBmcm9tICcuL3V0aWwvdmlld190cmF2ZXJzYWxfdXRpbHMnO1xuaW1wb3J0IHt1bndyYXBSTm9kZX0gZnJvbSAnLi91dGlsL3ZpZXdfdXRpbHMnO1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbGxlY3ROYXRpdmVOb2RlcyhcbiAgICB0VmlldzogVFZpZXcsIGxWaWV3OiBMVmlldywgdE5vZGU6IFROb2RlfG51bGwsIHJlc3VsdDogYW55W10sXG4gICAgaXNQcm9qZWN0aW9uOiBib29sZWFuID0gZmFsc2UpOiBhbnlbXSB7XG4gIHdoaWxlICh0Tm9kZSAhPT0gbnVsbCkge1xuICAgIG5nRGV2TW9kZSAmJlxuICAgICAgICBhc3NlcnRUTm9kZVR5cGUoXG4gICAgICAgICAgICB0Tm9kZSxcbiAgICAgICAgICAgIFROb2RlVHlwZS5BbnlSTm9kZSB8IFROb2RlVHlwZS5BbnlDb250YWluZXIgfCBUTm9kZVR5cGUuUHJvamVjdGlvbiB8IFROb2RlVHlwZS5JY3UpO1xuXG4gICAgY29uc3QgbE5vZGUgPSBsVmlld1t0Tm9kZS5pbmRleF07XG5cbiAgICAvLyBBIGdpdmVuIGxOb2RlIGNhbiByZXByZXNlbnQgZWl0aGVyIGEgbmF0aXZlIG5vZGUgb3IgYSBMQ29udGFpbmVyICh3aGVuIGl0IGlzIGEgaG9zdCBvZiBhXG4gICAgLy8gVmlld0NvbnRhaW5lclJlZikuIFdoZW4gd2UgZmluZCBhIExDb250YWluZXIgd2UgbmVlZCB0byBkZXNjZW5kIGludG8gaXQgdG8gY29sbGVjdCByb290IG5vZGVzXG4gICAgLy8gZnJvbSB0aGUgdmlld3MgaW4gdGhpcyBjb250YWluZXIuXG4gICAgaWYgKGlzTENvbnRhaW5lcihsTm9kZSkpIHtcbiAgICAgIGZvciAobGV0IGkgPSBDT05UQUlORVJfSEVBREVSX09GRlNFVDsgaSA8IGxOb2RlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxWaWV3SW5BQ29udGFpbmVyID0gbE5vZGVbaV07XG4gICAgICAgIGNvbnN0IGxWaWV3Rmlyc3RDaGlsZFROb2RlID0gbFZpZXdJbkFDb250YWluZXJbVFZJRVddLmZpcnN0Q2hpbGQ7XG4gICAgICAgIGlmIChsVmlld0ZpcnN0Q2hpbGRUTm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbGxlY3ROYXRpdmVOb2RlcyhcbiAgICAgICAgICAgICAgbFZpZXdJbkFDb250YWluZXJbVFZJRVddLCBsVmlld0luQUNvbnRhaW5lciwgbFZpZXdGaXJzdENoaWxkVE5vZGUsIHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB0Tm9kZVR5cGUgPSB0Tm9kZS50eXBlO1xuICAgIGlmICh0Tm9kZVR5cGUgJiBUTm9kZVR5cGUuRWxlbWVudENvbnRhaW5lcikge1xuICAgICAgY29sbGVjdE5hdGl2ZU5vZGVzKHRWaWV3LCBsVmlldywgdE5vZGUuY2hpbGQsIHJlc3VsdCk7XG4gICAgfSBlbHNlIGlmICh0Tm9kZVR5cGUgJiBUTm9kZVR5cGUuSWN1KSB7XG4gICAgICBjb25zdCBuZXh0Uk5vZGUgPSBpY3VDb250YWluZXJJdGVyYXRlKHROb2RlIGFzIFRJY3VDb250YWluZXJOb2RlLCBsVmlldyk7XG4gICAgICBsZXQgck5vZGU6IFJOb2RlfG51bGw7XG4gICAgICB3aGlsZSAock5vZGUgPSBuZXh0Uk5vZGUoKSkge1xuICAgICAgICByZXN1bHQucHVzaChyTm9kZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0Tm9kZVR5cGUgJiBUTm9kZVR5cGUuUHJvamVjdGlvbikge1xuICAgICAgY29uc3Qgbm9kZXNJblNsb3QgPSBnZXRQcm9qZWN0aW9uTm9kZXMobFZpZXcsIHROb2RlKTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGVzSW5TbG90KSkge1xuICAgICAgICByZXN1bHQucHVzaCguLi5ub2Rlc0luU2xvdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwYXJlbnRWaWV3ID0gZ2V0TFZpZXdQYXJlbnQobFZpZXdbREVDTEFSQVRJT05fQ09NUE9ORU5UX1ZJRVddKSE7XG4gICAgICAgIG5nRGV2TW9kZSAmJiBhc3NlcnRQYXJlbnRWaWV3KHBhcmVudFZpZXcpO1xuICAgICAgICBjb2xsZWN0TmF0aXZlTm9kZXMocGFyZW50Vmlld1tUVklFV10sIHBhcmVudFZpZXcsIG5vZGVzSW5TbG90LCByZXN1bHQsIHRydWUpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBGSVhNRTogdGhpcyBjb2RlIGlzIG1vdmVkIGhlcmUgdG8gY2FsY3VsYXRlIHRoZSBsaXN0IG9mIHJvb3Qgbm9kZXNcbiAgICAvLyB3aXRoaW4gYSB2aWV3IGNvcnJlY3RseSBpbiBjYXNlIGA8bmctY29udGFpbmVyPmAgaXMgdXNlZCAod2hpY2ggYWRkcylcbiAgICAvLyBhbiBhbmNob3Igbm9kZSB0byB0aGUgdmVyeSBlbmQgb2YgdGhlIGxpc3QuIFRoaXMgc2hvdWxkIGJlIGZpeGVkXG4gICAgLy8gc2VwYXJhdGVseSwgYnV0IHdlIGp1c3QgaW5jbHVkZSB0aGUgY2hhbmdlIGhlcmUgZm9yIG5vdyB0byBnZXQgaHlkcmF0aW9uXG4gICAgLy8gd29ya2luZyBwcm9wZXJseSBpbiB0aGlzIHByb3RvdHlwZS5cbiAgICBpZiAobE5vZGUgIT09IG51bGwpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHVud3JhcFJOb2RlKGxOb2RlKSk7XG4gICAgfVxuXG4gICAgdE5vZGUgPSBpc1Byb2plY3Rpb24gPyB0Tm9kZS5wcm9qZWN0aW9uTmV4dCA6IHROb2RlLm5leHQ7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuIl19