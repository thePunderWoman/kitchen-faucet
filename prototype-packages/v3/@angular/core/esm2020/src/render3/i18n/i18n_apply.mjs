/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { RuntimeError } from '../../errors';
import { getPluralCase } from '../../i18n/localization';
import { assertDefined, assertDomNode, assertEqual, assertGreaterThan, assertIndexInRange, throwError } from '../../util/assert';
import { assertIndexInExpandoRange, assertTIcu } from '../assert';
import { attachPatchData } from '../context_discovery';
import { locateNextRNode, markRNodeAsClaimedForHydration } from '../hydration';
import { elementPropertyInternal, setElementAttribute } from '../instructions/shared';
import { ELEMENT_MARKER, I18nCreateOpCode, ICU_MARKER } from '../interfaces/i18n';
import { HEADER_OFFSET, HYDRATION_INFO, RENDERER, TVIEW } from '../interfaces/view';
import { createCommentNode, createElementNode, createTextNode, nativeInsertBefore, nativeParentNode, nativeRemoveNode, updateTextNode } from '../node_manipulation';
import { getBindingIndex } from '../state';
import { renderStringify } from '../util/stringify_utils';
import { getNativeByIndex, unwrapRNode } from '../util/view_utils';
import { getLocaleId } from './i18n_locale_id';
import { getCurrentICUCaseIndex, getParentFromIcuCreateOpCode, getRefFromIcuCreateOpCode, getTIcu } from './i18n_util';
/**
 * Keep track of which input bindings in `ɵɵi18nExp` have changed.
 *
 * This is used to efficiently update expressions in i18n only when the corresponding input has
 * changed.
 *
 * 1) Each bit represents which of the `ɵɵi18nExp` has changed.
 * 2) There are 32 bits allowed in JS.
 * 3) Bit 32 is special as it is shared for all changes past 32. (In other words if you have more
 * than 32 `ɵɵi18nExp` then all changes past 32nd `ɵɵi18nExp` will be mapped to same bit. This means
 * that we may end up changing more than we need to. But i18n expressions with 32 bindings is rare
 * so in practice it should not be an issue.)
 */
let changeMask = 0b0;
/**
 * Keeps track of which bit needs to be updated in `changeMask`
 *
 * This value gets incremented on every call to `ɵɵi18nExp`
 */
let changeMaskCounter = 0;
/**
 * Keep track of which input bindings in `ɵɵi18nExp` have changed.
 *
 * `setMaskBit` gets invoked by each call to `ɵɵi18nExp`.
 *
 * @param hasChange did `ɵɵi18nExp` detect a change.
 */
export function setMaskBit(hasChange) {
    if (hasChange) {
        changeMask = changeMask | (1 << Math.min(changeMaskCounter, 31));
    }
    changeMaskCounter++;
}
export function applyI18n(tView, lView, index) {
    if (changeMaskCounter > 0) {
        ngDevMode && assertDefined(tView, `tView should be defined`);
        const tI18n = tView.data[index];
        // When `index` points to an `ɵɵi18nAttributes` then we have an array otherwise `TI18n`
        const updateOpCodes = Array.isArray(tI18n) ? tI18n : tI18n.update;
        const bindingsStartIndex = getBindingIndex() - changeMaskCounter - 1;
        applyUpdateOpCodes(tView, lView, updateOpCodes, bindingsStartIndex, changeMask);
    }
    // Reset changeMask & maskBit to default for the next update cycle
    changeMask = 0b0;
    changeMaskCounter = 0;
}
/**
 * Apply `I18nCreateOpCodes` op-codes as stored in `TI18n.create`.
 *
 * Creates text (and comment) nodes which are internationalized.
 *
 * @param lView Current lView
 * @param createOpCodes Set of op-codes to apply
 * @param parentRNode Parent node (so that direct children can be added eagerly) or `null` if it is
 *     a root node.
 * @param insertInFrontOf DOM node that should be used as an anchor.
 */
export function applyCreateOpCodes(lView, createOpCodes, parentRNode, insertInFrontOf) {
    const renderer = lView[RENDERER];
    debugger;
    for (let i = 0; i < createOpCodes.length; i++) {
        const opCode = createOpCodes[i++];
        const text = createOpCodes[i];
        const isComment = (opCode & I18nCreateOpCode.COMMENT) === I18nCreateOpCode.COMMENT;
        let appendNow = (opCode & I18nCreateOpCode.APPEND_EAGERLY) === I18nCreateOpCode.APPEND_EAGERLY;
        const index = opCode >>> I18nCreateOpCode.SHIFT;
        let rNode = lView[index];
        const ngh = lView[HYDRATION_INFO];
        if (rNode === null) {
            let native;
            if (ngh) {
                // debugger;
                const tView = lView[TVIEW];
                const tNode = tView.data[index];
                native = locateNextRNode(ngh, tView, lView, tNode, null, false);
                appendNow = false;
                // ngDevMode &&
                //     assertRElement(
                //         native, name,
                //                `Expecting an element node with ${name} tag name in the elementStart
                //                instruction`);
                ngDevMode && markRNodeAsClaimedForHydration(native);
            }
            else {
                // We only create new DOM nodes if they don't already exist: If ICU switches case back to a
                // case which was already instantiated, no need to create new DOM nodes.
                native = isComment ? renderer.createComment(text) : createTextNode(renderer, text);
            }
            rNode = lView[index] = native;
        }
        if (appendNow && parentRNode !== null) {
            nativeInsertBefore(renderer, parentRNode, rNode, insertInFrontOf, false);
        }
    }
}
/**
 * Apply `I18nMutateOpCodes` OpCodes.
 *
 * @param tView Current `TView`
 * @param mutableOpCodes Mutable OpCodes to process
 * @param lView Current `LView`
 * @param anchorRNode place where the i18n node should be inserted.
 */
export function applyMutableOpCodes(tView, mutableOpCodes, lView, anchorRNode) {
    ngDevMode && assertDomNode(anchorRNode);
    const renderer = lView[RENDERER];
    // `rootIdx` represents the node into which all inserts happen.
    let rootIdx = null;
    // `rootRNode` represents the real node into which we insert. This can be different from
    // `lView[rootIdx]` if we have projection.
    //  - null we don't have a parent (as can be the case in when we are inserting into a root of
    //    LView which has no parent.)
    //  - `RElement` The element representing the root after taking projection into account.
    let rootRNode;
    for (let i = 0; i < mutableOpCodes.length; i++) {
        const opCode = mutableOpCodes[i];
        if (typeof opCode == 'string') {
            const textNodeIndex = mutableOpCodes[++i];
            if (lView[textNodeIndex] === null) {
                ngDevMode && ngDevMode.rendererCreateTextNode++;
                ngDevMode && assertIndexInRange(lView, textNodeIndex);
                lView[textNodeIndex] = createTextNode(renderer, opCode);
            }
        }
        else if (typeof opCode == 'number') {
            switch (opCode & 1 /* IcuCreateOpCode.MASK_INSTRUCTION */) {
                case 0 /* IcuCreateOpCode.AppendChild */:
                    const parentIdx = getParentFromIcuCreateOpCode(opCode);
                    if (rootIdx === null) {
                        // The first operation should save the `rootIdx` because the first operation
                        // must insert into the root. (Only subsequent operations can insert into a dynamic
                        // parent)
                        rootIdx = parentIdx;
                        rootRNode = nativeParentNode(renderer, anchorRNode);
                    }
                    let insertInFrontOf;
                    let parentRNode;
                    if (parentIdx === rootIdx) {
                        insertInFrontOf = anchorRNode;
                        parentRNode = rootRNode;
                    }
                    else {
                        insertInFrontOf = null;
                        parentRNode = unwrapRNode(lView[parentIdx]);
                    }
                    // FIXME(misko): Refactor with `processI18nText`
                    if (parentRNode !== null) {
                        // This can happen if the `LView` we are adding to is not attached to a parent `LView`.
                        // In such a case there is no "root" we can attach to. This is fine, as we still need to
                        // create the elements. When the `LView` gets later added to a parent these "root" nodes
                        // get picked up and added.
                        ngDevMode && assertDomNode(parentRNode);
                        const refIdx = getRefFromIcuCreateOpCode(opCode);
                        ngDevMode && assertGreaterThan(refIdx, HEADER_OFFSET, 'Missing ref');
                        // `unwrapRNode` is not needed here as all of these point to RNodes as part of the i18n
                        // which can't have components.
                        const child = lView[refIdx];
                        ngDevMode && assertDomNode(child);
                        nativeInsertBefore(renderer, parentRNode, child, insertInFrontOf, false);
                        const tIcu = getTIcu(tView, refIdx);
                        if (tIcu !== null && typeof tIcu === 'object') {
                            // If we just added a comment node which has ICU then that ICU may have already been
                            // rendered and therefore we need to re-add it here.
                            ngDevMode && assertTIcu(tIcu);
                            const caseIndex = getCurrentICUCaseIndex(tIcu, lView);
                            if (caseIndex !== null) {
                                applyMutableOpCodes(tView, tIcu.create[caseIndex], lView, lView[tIcu.anchorIdx]);
                            }
                        }
                    }
                    break;
                case 1 /* IcuCreateOpCode.Attr */:
                    const elementNodeIndex = opCode >>> 1 /* IcuCreateOpCode.SHIFT_REF */;
                    const attrName = mutableOpCodes[++i];
                    const attrValue = mutableOpCodes[++i];
                    // This code is used for ICU expressions only, since we don't support
                    // directives/components in ICUs, we don't need to worry about inputs here
                    setElementAttribute(renderer, getNativeByIndex(elementNodeIndex, lView), null, null, attrName, attrValue, null);
                    break;
                default:
                    if (ngDevMode) {
                        throw new RuntimeError(700 /* RuntimeErrorCode.INVALID_I18N_STRUCTURE */, `Unable to determine the type of mutate operation for "${opCode}"`);
                    }
            }
        }
        else {
            switch (opCode) {
                case ICU_MARKER:
                    const commentValue = mutableOpCodes[++i];
                    const commentNodeIndex = mutableOpCodes[++i];
                    if (lView[commentNodeIndex] === null) {
                        ngDevMode &&
                            assertEqual(typeof commentValue, 'string', `Expected "${commentValue}" to be a comment node value`);
                        ngDevMode && ngDevMode.rendererCreateComment++;
                        ngDevMode && assertIndexInExpandoRange(lView, commentNodeIndex);
                        const commentRNode = lView[commentNodeIndex] =
                            createCommentNode(renderer, commentValue);
                        // FIXME(misko): Attaching patch data is only needed for the root (Also add tests)
                        attachPatchData(commentRNode, lView);
                    }
                    break;
                case ELEMENT_MARKER:
                    const tagName = mutableOpCodes[++i];
                    const elementNodeIndex = mutableOpCodes[++i];
                    if (lView[elementNodeIndex] === null) {
                        ngDevMode &&
                            assertEqual(typeof tagName, 'string', `Expected "${tagName}" to be an element node tag name`);
                        ngDevMode && ngDevMode.rendererCreateElement++;
                        ngDevMode && assertIndexInExpandoRange(lView, elementNodeIndex);
                        const elementRNode = lView[elementNodeIndex] =
                            createElementNode(renderer, tagName, null);
                        // FIXME(misko): Attaching patch data is only needed for the root (Also add tests)
                        attachPatchData(elementRNode, lView);
                    }
                    break;
                default:
                    ngDevMode &&
                        throwError(`Unable to determine the type of mutate operation for "${opCode}"`);
            }
        }
    }
}
/**
 * Apply `I18nUpdateOpCodes` OpCodes
 *
 * @param tView Current `TView`
 * @param lView Current `LView`
 * @param updateOpCodes OpCodes to process
 * @param bindingsStartIndex Location of the first `ɵɵi18nApply`
 * @param changeMask Each bit corresponds to a `ɵɵi18nExp` (Counting backwards from
 *     `bindingsStartIndex`)
 */
export function applyUpdateOpCodes(tView, lView, updateOpCodes, bindingsStartIndex, changeMask) {
    for (let i = 0; i < updateOpCodes.length; i++) {
        // bit code to check if we should apply the next update
        const checkBit = updateOpCodes[i];
        // Number of opCodes to skip until next set of update codes
        const skipCodes = updateOpCodes[++i];
        if (checkBit & changeMask) {
            // The value has been updated since last checked
            let value = '';
            for (let j = i + 1; j <= (i + skipCodes); j++) {
                const opCode = updateOpCodes[j];
                if (typeof opCode == 'string') {
                    value += opCode;
                }
                else if (typeof opCode == 'number') {
                    if (opCode < 0) {
                        // Negative opCode represent `i18nExp` values offset.
                        value += renderStringify(lView[bindingsStartIndex - opCode]);
                    }
                    else {
                        const nodeIndex = (opCode >>> 2 /* I18nUpdateOpCode.SHIFT_REF */);
                        switch (opCode & 3 /* I18nUpdateOpCode.MASK_OPCODE */) {
                            case 1 /* I18nUpdateOpCode.Attr */:
                                const propName = updateOpCodes[++j];
                                const sanitizeFn = updateOpCodes[++j];
                                const tNodeOrTagName = tView.data[nodeIndex];
                                ngDevMode && assertDefined(tNodeOrTagName, 'Experting TNode or string');
                                if (typeof tNodeOrTagName === 'string') {
                                    // IF we don't have a `TNode`, then we are an element in ICU (as ICU content does
                                    // not have TNode), in which case we know that there are no directives, and hence
                                    // we use attribute setting.
                                    setElementAttribute(lView[RENDERER], lView[nodeIndex], null, tNodeOrTagName, propName, value, sanitizeFn);
                                }
                                else {
                                    elementPropertyInternal(tView, tNodeOrTagName, lView, propName, value, lView[RENDERER], sanitizeFn, false);
                                }
                                break;
                            case 0 /* I18nUpdateOpCode.Text */:
                                const rText = lView[nodeIndex];
                                rText !== null && updateTextNode(lView[RENDERER], rText, value);
                                break;
                            case 2 /* I18nUpdateOpCode.IcuSwitch */:
                                applyIcuSwitchCase(tView, getTIcu(tView, nodeIndex), lView, value);
                                break;
                            case 3 /* I18nUpdateOpCode.IcuUpdate */:
                                applyIcuUpdateCase(tView, getTIcu(tView, nodeIndex), bindingsStartIndex, lView);
                                break;
                        }
                    }
                }
            }
        }
        else {
            const opCode = updateOpCodes[i + 1];
            if (opCode > 0 && (opCode & 3 /* I18nUpdateOpCode.MASK_OPCODE */) === 3 /* I18nUpdateOpCode.IcuUpdate */) {
                // Special case for the `icuUpdateCase`. It could be that the mask did not match, but
                // we still need to execute `icuUpdateCase` because the case has changed recently due to
                // previous `icuSwitchCase` instruction. (`icuSwitchCase` and `icuUpdateCase` always come in
                // pairs.)
                const nodeIndex = (opCode >>> 2 /* I18nUpdateOpCode.SHIFT_REF */);
                const tIcu = getTIcu(tView, nodeIndex);
                const currentIndex = lView[tIcu.currentCaseLViewIndex];
                if (currentIndex < 0) {
                    applyIcuUpdateCase(tView, tIcu, bindingsStartIndex, lView);
                }
            }
        }
        i += skipCodes;
    }
}
/**
 * Apply OpCodes associated with updating an existing ICU.
 *
 * @param tView Current `TView`
 * @param tIcu Current `TIcu`
 * @param bindingsStartIndex Location of the first `ɵɵi18nApply`
 * @param lView Current `LView`
 */
function applyIcuUpdateCase(tView, tIcu, bindingsStartIndex, lView) {
    ngDevMode && assertIndexInRange(lView, tIcu.currentCaseLViewIndex);
    let activeCaseIndex = lView[tIcu.currentCaseLViewIndex];
    if (activeCaseIndex !== null) {
        let mask = changeMask;
        if (activeCaseIndex < 0) {
            // Clear the flag.
            // Negative number means that the ICU was freshly created and we need to force the update.
            activeCaseIndex = lView[tIcu.currentCaseLViewIndex] = ~activeCaseIndex;
            // -1 is same as all bits on, which simulates creation since it marks all bits dirty
            mask = -1;
        }
        applyUpdateOpCodes(tView, lView, tIcu.update[activeCaseIndex], bindingsStartIndex, mask);
    }
}
/**
 * Apply OpCodes associated with switching a case on ICU.
 *
 * This involves tearing down existing case and than building up a new case.
 *
 * @param tView Current `TView`
 * @param tIcu Current `TIcu`
 * @param lView Current `LView`
 * @param value Value of the case to update to.
 */
function applyIcuSwitchCase(tView, tIcu, lView, value) {
    // Rebuild a new case for this ICU
    const caseIndex = getCaseIndex(tIcu, value);
    let activeCaseIndex = getCurrentICUCaseIndex(tIcu, lView);
    if (activeCaseIndex !== caseIndex) {
        applyIcuSwitchCaseRemove(tView, tIcu, lView);
        lView[tIcu.currentCaseLViewIndex] = caseIndex === null ? null : ~caseIndex;
        if (caseIndex !== null) {
            // Add the nodes for the new case
            const anchorRNode = lView[tIcu.anchorIdx];
            if (anchorRNode) {
                ngDevMode && assertDomNode(anchorRNode);
                applyMutableOpCodes(tView, tIcu.create[caseIndex], lView, anchorRNode);
            }
        }
    }
}
/**
 * Apply OpCodes associated with tearing ICU case.
 *
 * This involves tearing down existing case and than building up a new case.
 *
 * @param tView Current `TView`
 * @param tIcu Current `TIcu`
 * @param lView Current `LView`
 */
function applyIcuSwitchCaseRemove(tView, tIcu, lView) {
    let activeCaseIndex = getCurrentICUCaseIndex(tIcu, lView);
    if (activeCaseIndex !== null) {
        const removeCodes = tIcu.remove[activeCaseIndex];
        for (let i = 0; i < removeCodes.length; i++) {
            const nodeOrIcuIndex = removeCodes[i];
            if (nodeOrIcuIndex > 0) {
                // Positive numbers are `RNode`s.
                const rNode = getNativeByIndex(nodeOrIcuIndex, lView);
                rNode !== null && nativeRemoveNode(lView[RENDERER], rNode);
            }
            else {
                // Negative numbers are ICUs
                applyIcuSwitchCaseRemove(tView, getTIcu(tView, ~nodeOrIcuIndex), lView);
            }
        }
    }
}
/**
 * Returns the index of the current case of an ICU expression depending on the main binding value
 *
 * @param icuExpression
 * @param bindingValue The value of the main binding used by this ICU expression
 */
function getCaseIndex(icuExpression, bindingValue) {
    let index = icuExpression.cases.indexOf(bindingValue);
    if (index === -1) {
        switch (icuExpression.type) {
            case 1 /* IcuType.plural */: {
                const resolvedCase = getPluralCase(bindingValue, getLocaleId());
                index = icuExpression.cases.indexOf(resolvedCase);
                if (index === -1 && resolvedCase !== 'other') {
                    index = icuExpression.cases.indexOf('other');
                }
                break;
            }
            case 0 /* IcuType.select */: {
                index = icuExpression.cases.indexOf('other');
                break;
            }
        }
    }
    return index === -1 ? null : index;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bl9hcHBseS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvcmUvc3JjL3JlbmRlcjMvaTE4bi9pMThuX2FwcGx5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxZQUFZLEVBQW1CLE1BQU0sY0FBYyxDQUFDO0FBQzVELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMsYUFBYSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDL0gsT0FBTyxFQUFDLHlCQUF5QixFQUFFLFVBQVUsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNoRSxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDckQsT0FBTyxFQUFDLGVBQWUsRUFBRSw4QkFBOEIsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUM3RSxPQUFPLEVBQUMsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRixPQUFPLEVBQUMsY0FBYyxFQUFFLGdCQUFnQixFQUEwRCxVQUFVLEVBQTBELE1BQU0sb0JBQW9CLENBQUM7QUFJak0sT0FBTyxFQUFDLGFBQWEsRUFBRSxjQUFjLEVBQVMsUUFBUSxFQUFFLEtBQUssRUFBUSxNQUFNLG9CQUFvQixDQUFDO0FBQ2hHLE9BQU8sRUFBQyxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDbEssT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUN6QyxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFD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LE9BQU8sQ0FBQyxDQUFDO2dCQUM3QyxNQUFNO2FBQ1A7U0FDRjtLQUNGO0lBQ0QsT0FBTyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3JDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtSdW50aW1lRXJyb3IsIFJ1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4uLy4uL2Vycm9ycyc7XG5pbXBvcnQge2dldFBsdXJhbENhc2V9IGZyb20gJy4uLy4uL2kxOG4vbG9jYWxpemF0aW9uJztcbmltcG9ydCB7YXNzZXJ0RGVmaW5lZCwgYXNzZXJ0RG9tTm9kZSwgYXNzZXJ0RXF1YWwsIGFzc2VydEdyZWF0ZXJUaGFuLCBhc3NlcnRJbmRleEluUmFuZ2UsIHRocm93RXJyb3J9IGZyb20gJy4uLy4uL3V0aWwvYXNzZXJ0JztcbmltcG9ydCB7YXNzZXJ0SW5kZXhJbkV4cGFuZG9SYW5nZSwgYXNzZXJ0VEljdX0gZnJvbSAnLi4vYXNzZXJ0JztcbmltcG9ydCB7YXR0YWNoUGF0Y2hEYXRhfSBmcm9tICcuLi9jb250ZXh0X2Rpc2NvdmVyeSc7XG5pbXBvcnQge2xvY2F0ZU5leHRSTm9kZSwgbWFya1JOb2RlQXNDbGFpbWVkRm9ySHlkcmF0aW9ufSBmcm9tICcuLi9oeWRyYXRpb24nO1xuaW1wb3J0IHtlbGVtZW50UHJvcGVydHlJbnRlcm5hbCwgc2V0RWxlbWVudEF0dHJpYnV0ZX0gZnJvbSAnLi4vaW5zdHJ1Y3Rpb25zL3NoYXJlZCc7XG5pbXBvcnQge0VMRU1FTlRfTUFSS0VSLCBJMThuQ3JlYXRlT3BDb2RlLCBJMThuQ3JlYXRlT3BDb2RlcywgSTE4blVwZGF0ZU9wQ29kZSwgSTE4blVwZGF0ZU9wQ29kZXMsIElDVV9NQVJLRVIsIEljdUNyZWF0ZU9wQ29kZSwgSWN1Q3JlYXRlT3BDb2RlcywgSWN1VHlwZSwgVEkxOG4sIFRJY3V9IGZyb20gJy4uL2ludGVyZmFjZXMvaTE4bic7XG5pbXBvcnQge1ROb2RlfSBmcm9tICcuLi9pbnRlcmZhY2VzL25vZGUnO1xuaW1wb3J0IHtSRWxlbWVudCwgUk5vZGUsIFJUZXh0fSBmcm9tICcuLi9pbnRlcmZhY2VzL3JlbmRlcmVyX2RvbSc7XG5pbXBvcnQge1Nhbml0aXplckZufSBmcm9tICcuLi9pbnRlcmZhY2VzL3Nhbml0aXphdGlvbic7XG5pbXBvcnQge0hFQURFUl9PRkZTRVQsIEhZRFJBVElPTl9JTkZPLCBMVmlldywgUkVOREVSRVIsIFRWSUVXLCBUVmlld30gZnJvbSAnLi4vaW50ZXJmYWNlcy92aWV3JztcbmltcG9ydCB7Y3JlYXRlQ29tbWVudE5vZGUsIGNyZWF0ZUVsZW1lbnROb2RlLCBjcmVhdGVUZXh0Tm9kZSwgbmF0aXZlSW5zZXJ0QmVmb3JlLCBuYXRpdmVQYXJlbnROb2RlLCBuYXRpdmVSZW1vdmVOb2RlLCB1cGRhdGVUZXh0Tm9kZX0gZnJvbSAnLi4vbm9kZV9tYW5pcHVsYXRpb24nO1xuaW1wb3J0IHtnZXRCaW5kaW5nSW5kZXh9IGZyb20gJy4uL3N0YXRlJztcbmltcG9ydCB7cmVuZGVyU3RyaW5naWZ5fSBmcm9tICcuLi91dGlsL3N0cmluZ2lmeV91dGlscyc7XG5pbXBvcnQge2dldE5hdGl2ZUJ5SW5kZXgsIHVud3JhcFJOb2RlfSBmcm9tICcuLi91dGlsL3ZpZXdfdXRpbHMnO1xuXG5pbXBvcnQge2dldExvY2FsZUlkfSBmcm9tICcuL2kxOG5fbG9jYWxlX2lkJztcbmltcG9ydCB7Z2V0Q3VycmVudElDVUNhc2VJbmRleCwgZ2V0UGFyZW50RnJvbUljdUNyZWF0ZU9wQ29kZSwgZ2V0UmVmRnJvbUljdUNyZWF0ZU9wQ29kZSwgZ2V0VEljdX0gZnJvbSAnLi9pMThuX3V0aWwnO1xuXG5cblxuLyoqXG4gKiBLZWVwIHRyYWNrIG9mIHdoaWNoIGlucHV0IGJpbmRpbmdzIGluIGDJtcm1aTE4bkV4cGAgaGF2ZSBjaGFuZ2VkLlxuICpcbiAqIFRoaXMgaXMgdXNlZCB0byBlZmZpY2llbnRseSB1cGRhdGUgZXhwcmVzc2lvbnMgaW4gaTE4biBvbmx5IHdoZW4gdGhlIGNvcnJlc3BvbmRpbmcgaW5wdXQgaGFzXG4gKiBjaGFuZ2VkLlxuICpcbiAqIDEpIEVhY2ggYml0IHJlcHJlc2VudHMgd2hpY2ggb2YgdGhlIGDJtcm1aTE4bkV4cGAgaGFzIGNoYW5nZWQuXG4gKiAyKSBUaGVyZSBhcmUgMzIgYml0cyBhbGxvd2VkIGluIEpTLlxuICogMykgQml0IDMyIGlzIHNwZWNpYWwgYXMgaXQgaXMgc2hhcmVkIGZvciBhbGwgY2hhbmdlcyBwYXN0IDMyLiAoSW4gb3RoZXIgd29yZHMgaWYgeW91IGhhdmUgbW9yZVxuICogdGhhbiAzMiBgybXJtWkxOG5FeHBgIHRoZW4gYWxsIGNoYW5nZXMgcGFzdCAzMm5kIGDJtcm1aTE4bkV4cGAgd2lsbCBiZSBtYXBwZWQgdG8gc2FtZSBiaXQuIFRoaXMgbWVhbnNcbiAqIHRoYXQgd2UgbWF5IGVuZCB1cCBjaGFuZ2luZyBtb3JlIHRoYW4gd2UgbmVlZCB0by4gQnV0IGkxOG4gZXhwcmVzc2lvbnMgd2l0aCAzMiBiaW5kaW5ncyBpcyByYXJlXG4gKiBzbyBpbiBwcmFjdGljZSBpdCBzaG91bGQgbm90IGJlIGFuIGlzc3VlLilcbiAqL1xubGV0IGNoYW5nZU1hc2sgPSAwYjA7XG5cbi8qKlxuICogS2VlcHMgdHJhY2sgb2Ygd2hpY2ggYml0IG5lZWRzIHRvIGJlIHVwZGF0ZWQgaW4gYGNoYW5nZU1hc2tgXG4gKlxuICogVGhpcyB2YWx1ZSBnZXRzIGluY3JlbWVudGVkIG9uIGV2ZXJ5IGNhbGwgdG8gYMm1ybVpMThuRXhwYFxuICovXG5sZXQgY2hhbmdlTWFza0NvdW50ZXIgPSAwO1xuXG4vKipcbiAqIEtlZXAgdHJhY2sgb2Ygd2hpY2ggaW5wdXQgYmluZGluZ3MgaW4gYMm1ybVpMThuRXhwYCBoYXZlIGNoYW5nZWQuXG4gKlxuICogYHNldE1hc2tCaXRgIGdldHMgaW52b2tlZCBieSBlYWNoIGNhbGwgdG8gYMm1ybVpMThuRXhwYC5cbiAqXG4gKiBAcGFyYW0gaGFzQ2hhbmdlIGRpZCBgybXJtWkxOG5FeHBgIGRldGVjdCBhIGNoYW5nZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldE1hc2tCaXQoaGFzQ2hhbmdlOiBib29sZWFuKSB7XG4gIGlmIChoYXNDaGFuZ2UpIHtcbiAgICBjaGFuZ2VNYXNrID0gY2hhbmdlTWFzayB8ICgxIDw8IE1hdGgubWluKGNoYW5nZU1hc2tDb3VudGVyLCAzMSkpO1xuICB9XG4gIGNoYW5nZU1hc2tDb3VudGVyKys7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseUkxOG4odFZpZXc6IFRWaWV3LCBsVmlldzogTFZpZXcsIGluZGV4OiBudW1iZXIpIHtcbiAgaWYgKGNoYW5nZU1hc2tDb3VudGVyID4gMCkge1xuICAgIG5nRGV2TW9kZSAmJiBhc3NlcnREZWZpbmVkKHRWaWV3LCBgdFZpZXcgc2hvdWxkIGJlIGRlZmluZWRgKTtcbiAgICBjb25zdCB0STE4biA9IHRWaWV3LmRhdGFbaW5kZXhdIGFzIFRJMThuIHwgSTE4blVwZGF0ZU9wQ29kZXM7XG4gICAgLy8gV2hlbiBgaW5kZXhgIHBvaW50cyB0byBhbiBgybXJtWkxOG5BdHRyaWJ1dGVzYCB0aGVuIHdlIGhhdmUgYW4gYXJyYXkgb3RoZXJ3aXNlIGBUSTE4bmBcbiAgICBjb25zdCB1cGRhdGVPcENvZGVzOiBJMThuVXBkYXRlT3BDb2RlcyA9XG4gICAgICAgIEFycmF5LmlzQXJyYXkodEkxOG4pID8gdEkxOG4gYXMgSTE4blVwZGF0ZU9wQ29kZXMgOiAodEkxOG4gYXMgVEkxOG4pLnVwZGF0ZTtcbiAgICBjb25zdCBiaW5kaW5nc1N0YXJ0SW5kZXggPSBnZXRCaW5kaW5nSW5kZXgoKSAtIGNoYW5nZU1hc2tDb3VudGVyIC0gMTtcbiAgICBhcHBseVVwZGF0ZU9wQ29kZXModFZpZXcsIGxWaWV3LCB1cGRhdGVPcENvZGVzLCBiaW5kaW5nc1N0YXJ0SW5kZXgsIGNoYW5nZU1hc2spO1xuICB9XG4gIC8vIFJlc2V0IGNoYW5nZU1hc2sgJiBtYXNrQml0IHRvIGRlZmF1bHQgZm9yIHRoZSBuZXh0IHVwZGF0ZSBjeWNsZVxuICBjaGFuZ2VNYXNrID0gMGIwO1xuICBjaGFuZ2VNYXNrQ291bnRlciA9IDA7XG59XG5cblxuLyoqXG4gKiBBcHBseSBgSTE4bkNyZWF0ZU9wQ29kZXNgIG9wLWNvZGVzIGFzIHN0b3JlZCBpbiBgVEkxOG4uY3JlYXRlYC5cbiAqXG4gKiBDcmVhdGVzIHRleHQgKGFuZCBjb21tZW50KSBub2RlcyB3aGljaCBhcmUgaW50ZXJuYXRpb25hbGl6ZWQuXG4gKlxuICogQHBhcmFtIGxWaWV3IEN1cnJlbnQgbFZpZXdcbiAqIEBwYXJhbSBjcmVhdGVPcENvZGVzIFNldCBvZiBvcC1jb2RlcyB0byBhcHBseVxuICogQHBhcmFtIHBhcmVudFJOb2RlIFBhcmVudCBub2RlIChzbyB0aGF0IGRpcmVjdCBjaGlsZHJlbiBjYW4gYmUgYWRkZWQgZWFnZXJseSkgb3IgYG51bGxgIGlmIGl0IGlzXG4gKiAgICAgYSByb290IG5vZGUuXG4gKiBAcGFyYW0gaW5zZXJ0SW5Gcm9udE9mIERPTSBub2RlIHRoYXQgc2hvdWxkIGJlIHVzZWQgYXMgYW4gYW5jaG9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlDcmVhdGVPcENvZGVzKFxuICAgIGxWaWV3OiBMVmlldywgY3JlYXRlT3BDb2RlczogSTE4bkNyZWF0ZU9wQ29kZXMsIHBhcmVudFJOb2RlOiBSRWxlbWVudHxudWxsLFxuICAgIGluc2VydEluRnJvbnRPZjogUkVsZW1lbnR8bnVsbCk6IHZvaWQge1xuICBjb25zdCByZW5kZXJlciA9IGxWaWV3W1JFTkRFUkVSXTtcbiAgZGVidWdnZXI7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY3JlYXRlT3BDb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IG9wQ29kZSA9IGNyZWF0ZU9wQ29kZXNbaSsrXSBhcyBhbnk7XG4gICAgY29uc3QgdGV4dCA9IGNyZWF0ZU9wQ29kZXNbaV0gYXMgc3RyaW5nO1xuICAgIGNvbnN0IGlzQ29tbWVudCA9IChvcENvZGUgJiBJMThuQ3JlYXRlT3BDb2RlLkNPTU1FTlQpID09PSBJMThuQ3JlYXRlT3BDb2RlLkNPTU1FTlQ7XG4gICAgbGV0IGFwcGVuZE5vdyA9IChvcENvZGUgJiBJMThuQ3JlYXRlT3BDb2RlLkFQUEVORF9FQUdFUkxZKSA9PT0gSTE4bkNyZWF0ZU9wQ29kZS5BUFBFTkRfRUFHRVJMWTtcbiAgICBjb25zdCBpbmRleCA9IG9wQ29kZSA+Pj4gSTE4bkNyZWF0ZU9wQ29kZS5TSElGVDtcbiAgICBsZXQgck5vZGUgPSBsVmlld1tpbmRleF07XG4gICAgY29uc3QgbmdoID0gbFZpZXdbSFlEUkFUSU9OX0lORk9dO1xuICAgIGlmIChyTm9kZSA9PT0gbnVsbCkge1xuICAgICAgbGV0IG5hdGl2ZTtcbiAgICAgIGlmIChuZ2gpIHtcbiAgICAgICAgLy8gZGVidWdnZXI7XG4gICAgICAgIGNvbnN0IHRWaWV3ID0gbFZpZXdbVFZJRVddO1xuICAgICAgICBjb25zdCB0Tm9kZSA9IHRWaWV3LmRhdGFbaW5kZXhdIGFzIFROb2RlO1xuICAgICAgICBuYXRpdmUgPSBsb2NhdGVOZXh0Uk5vZGU8UkVsZW1lbnQ+KG5naCwgdFZpZXcsIGxWaWV3LCB0Tm9kZSwgbnVsbCwgZmFsc2UpITtcbiAgICAgICAgYXBwZW5kTm93ID0gZmFsc2U7XG4gICAgICAgIC8vIG5nRGV2TW9kZSAmJlxuICAgICAgICAvLyAgICAgYXNzZXJ0UkVsZW1lbnQoXG4gICAgICAgIC8vICAgICAgICAgbmF0aXZlLCBuYW1lLFxuICAgICAgICAvLyAgICAgICAgICAgICAgICBgRXhwZWN0aW5nIGFuIGVsZW1lbnQgbm9kZSB3aXRoICR7bmFtZX0gdGFnIG5hbWUgaW4gdGhlIGVsZW1lbnRTdGFydFxuICAgICAgICAvLyAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbmApO1xuICAgICAgICBuZ0Rldk1vZGUgJiYgbWFya1JOb2RlQXNDbGFpbWVkRm9ySHlkcmF0aW9uKG5hdGl2ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBXZSBvbmx5IGNyZWF0ZSBuZXcgRE9NIG5vZGVzIGlmIHRoZXkgZG9uJ3QgYWxyZWFkeSBleGlzdDogSWYgSUNVIHN3aXRjaGVzIGNhc2UgYmFjayB0byBhXG4gICAgICAgIC8vIGNhc2Ugd2hpY2ggd2FzIGFscmVhZHkgaW5zdGFudGlhdGVkLCBubyBuZWVkIHRvIGNyZWF0ZSBuZXcgRE9NIG5vZGVzLlxuICAgICAgICBuYXRpdmUgPSBpc0NvbW1lbnQgPyByZW5kZXJlci5jcmVhdGVDb21tZW50KHRleHQpIDogY3JlYXRlVGV4dE5vZGUocmVuZGVyZXIsIHRleHQpO1xuICAgICAgfVxuICAgICAgck5vZGUgPSBsVmlld1tpbmRleF0gPSBuYXRpdmU7XG4gICAgfVxuICAgIGlmIChhcHBlbmROb3cgJiYgcGFyZW50Uk5vZGUgIT09IG51bGwpIHtcbiAgICAgIG5hdGl2ZUluc2VydEJlZm9yZShyZW5kZXJlciwgcGFyZW50Uk5vZGUsIHJOb2RlLCBpbnNlcnRJbkZyb250T2YsIGZhbHNlKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBcHBseSBgSTE4bk11dGF0ZU9wQ29kZXNgIE9wQ29kZXMuXG4gKlxuICogQHBhcmFtIHRWaWV3IEN1cnJlbnQgYFRWaWV3YFxuICogQHBhcmFtIG11dGFibGVPcENvZGVzIE11dGFibGUgT3BDb2RlcyB0byBwcm9jZXNzXG4gKiBAcGFyYW0gbFZpZXcgQ3VycmVudCBgTFZpZXdgXG4gKiBAcGFyYW0gYW5jaG9yUk5vZGUgcGxhY2Ugd2hlcmUgdGhlIGkxOG4gbm9kZSBzaG91bGQgYmUgaW5zZXJ0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseU11dGFibGVPcENvZGVzKFxuICAgIHRWaWV3OiBUVmlldywgbXV0YWJsZU9wQ29kZXM6IEljdUNyZWF0ZU9wQ29kZXMsIGxWaWV3OiBMVmlldywgYW5jaG9yUk5vZGU6IFJOb2RlKTogdm9pZCB7XG4gIG5nRGV2TW9kZSAmJiBhc3NlcnREb21Ob2RlKGFuY2hvclJOb2RlKTtcbiAgY29uc3QgcmVuZGVyZXIgPSBsVmlld1tSRU5ERVJFUl07XG4gIC8vIGByb290SWR4YCByZXByZXNlbnRzIHRoZSBub2RlIGludG8gd2hpY2ggYWxsIGluc2VydHMgaGFwcGVuLlxuICBsZXQgcm9vdElkeDogbnVtYmVyfG51bGwgPSBudWxsO1xuICAvLyBgcm9vdFJOb2RlYCByZXByZXNlbnRzIHRoZSByZWFsIG5vZGUgaW50byB3aGljaCB3ZSBpbnNlcnQuIFRoaXMgY2FuIGJlIGRpZmZlcmVudCBmcm9tXG4gIC8vIGBsVmlld1tyb290SWR4XWAgaWYgd2UgaGF2ZSBwcm9qZWN0aW9uLlxuICAvLyAgLSBudWxsIHdlIGRvbid0IGhhdmUgYSBwYXJlbnQgKGFzIGNhbiBiZSB0aGUgY2FzZSBpbiB3aGVuIHdlIGFyZSBpbnNlcnRpbmcgaW50byBhIHJvb3Qgb2ZcbiAgLy8gICAgTFZpZXcgd2hpY2ggaGFzIG5vIHBhcmVudC4pXG4gIC8vICAtIGBSRWxlbWVudGAgVGhlIGVsZW1lbnQgcmVwcmVzZW50aW5nIHRoZSByb290IGFmdGVyIHRha2luZyBwcm9qZWN0aW9uIGludG8gYWNjb3VudC5cbiAgbGV0IHJvb3RSTm9kZSE6IFJFbGVtZW50fG51bGw7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbXV0YWJsZU9wQ29kZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBvcENvZGUgPSBtdXRhYmxlT3BDb2Rlc1tpXTtcbiAgICBpZiAodHlwZW9mIG9wQ29kZSA9PSAnc3RyaW5nJykge1xuICAgICAgY29uc3QgdGV4dE5vZGVJbmRleCA9IG11dGFibGVPcENvZGVzWysraV0gYXMgbnVtYmVyO1xuICAgICAgaWYgKGxWaWV3W3RleHROb2RlSW5kZXhdID09PSBudWxsKSB7XG4gICAgICAgIG5nRGV2TW9kZSAmJiBuZ0Rldk1vZGUucmVuZGVyZXJDcmVhdGVUZXh0Tm9kZSsrO1xuICAgICAgICBuZ0Rldk1vZGUgJiYgYXNzZXJ0SW5kZXhJblJhbmdlKGxWaWV3LCB0ZXh0Tm9kZUluZGV4KTtcbiAgICAgICAgbFZpZXdbdGV4dE5vZGVJbmRleF0gPSBjcmVhdGVUZXh0Tm9kZShyZW5kZXJlciwgb3BDb2RlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcENvZGUgPT0gJ251bWJlcicpIHtcbiAgICAgIHN3aXRjaCAob3BDb2RlICYgSWN1Q3JlYXRlT3BDb2RlLk1BU0tfSU5TVFJVQ1RJT04pIHtcbiAgICAgICAgY2FzZSBJY3VDcmVhdGVPcENvZGUuQXBwZW5kQ2hpbGQ6XG4gICAgICAgICAgY29uc3QgcGFyZW50SWR4ID0gZ2V0UGFyZW50RnJvbUljdUNyZWF0ZU9wQ29kZShvcENvZGUpO1xuICAgICAgICAgIGlmIChyb290SWR4ID09PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBUaGUgZmlyc3Qgb3BlcmF0aW9uIHNob3VsZCBzYXZlIHRoZSBgcm9vdElkeGAgYmVjYXVzZSB0aGUgZmlyc3Qgb3BlcmF0aW9uXG4gICAgICAgICAgICAvLyBtdXN0IGluc2VydCBpbnRvIHRoZSByb290LiAoT25seSBzdWJzZXF1ZW50IG9wZXJhdGlvbnMgY2FuIGluc2VydCBpbnRvIGEgZHluYW1pY1xuICAgICAgICAgICAgLy8gcGFyZW50KVxuICAgICAgICAgICAgcm9vdElkeCA9IHBhcmVudElkeDtcbiAgICAgICAgICAgIHJvb3RSTm9kZSA9IG5hdGl2ZVBhcmVudE5vZGUocmVuZGVyZXIsIGFuY2hvclJOb2RlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGV0IGluc2VydEluRnJvbnRPZjogUk5vZGV8bnVsbDtcbiAgICAgICAgICBsZXQgcGFyZW50Uk5vZGU6IFJFbGVtZW50fG51bGw7XG4gICAgICAgICAgaWYgKHBhcmVudElkeCA9PT0gcm9vdElkeCkge1xuICAgICAgICAgICAgaW5zZXJ0SW5Gcm9udE9mID0gYW5jaG9yUk5vZGU7XG4gICAgICAgICAgICBwYXJlbnRSTm9kZSA9IHJvb3RSTm9kZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5zZXJ0SW5Gcm9udE9mID0gbnVsbDtcbiAgICAgICAgICAgIHBhcmVudFJOb2RlID0gdW53cmFwUk5vZGUobFZpZXdbcGFyZW50SWR4XSkgYXMgUkVsZW1lbnQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIEZJWE1FKG1pc2tvKTogUmVmYWN0b3Igd2l0aCBgcHJvY2Vzc0kxOG5UZXh0YFxuICAgICAgICAgIGlmIChwYXJlbnRSTm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gVGhpcyBjYW4gaGFwcGVuIGlmIHRoZSBgTFZpZXdgIHdlIGFyZSBhZGRpbmcgdG8gaXMgbm90IGF0dGFjaGVkIHRvIGEgcGFyZW50IGBMVmlld2AuXG4gICAgICAgICAgICAvLyBJbiBzdWNoIGEgY2FzZSB0aGVyZSBpcyBubyBcInJvb3RcIiB3ZSBjYW4gYXR0YWNoIHRvLiBUaGlzIGlzIGZpbmUsIGFzIHdlIHN0aWxsIG5lZWQgdG9cbiAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgZWxlbWVudHMuIFdoZW4gdGhlIGBMVmlld2AgZ2V0cyBsYXRlciBhZGRlZCB0byBhIHBhcmVudCB0aGVzZSBcInJvb3RcIiBub2Rlc1xuICAgICAgICAgICAgLy8gZ2V0IHBpY2tlZCB1cCBhbmQgYWRkZWQuXG4gICAgICAgICAgICBuZ0Rldk1vZGUgJiYgYXNzZXJ0RG9tTm9kZShwYXJlbnRSTm9kZSk7XG4gICAgICAgICAgICBjb25zdCByZWZJZHggPSBnZXRSZWZGcm9tSWN1Q3JlYXRlT3BDb2RlKG9wQ29kZSk7XG4gICAgICAgICAgICBuZ0Rldk1vZGUgJiYgYXNzZXJ0R3JlYXRlclRoYW4ocmVmSWR4LCBIRUFERVJfT0ZGU0VULCAnTWlzc2luZyByZWYnKTtcbiAgICAgICAgICAgIC8vIGB1bndyYXBSTm9kZWAgaXMgbm90IG5lZWRlZCBoZXJlIGFzIGFsbCBvZiB0aGVzZSBwb2ludCB0byBSTm9kZXMgYXMgcGFydCBvZiB0aGUgaTE4blxuICAgICAgICAgICAgLy8gd2hpY2ggY2FuJ3QgaGF2ZSBjb21wb25lbnRzLlxuICAgICAgICAgICAgY29uc3QgY2hpbGQgPSBsVmlld1tyZWZJZHhdIGFzIFJFbGVtZW50O1xuICAgICAgICAgICAgbmdEZXZNb2RlICYmIGFzc2VydERvbU5vZGUoY2hpbGQpO1xuICAgICAgICAgICAgbmF0aXZlSW5zZXJ0QmVmb3JlKHJlbmRlcmVyLCBwYXJlbnRSTm9kZSwgY2hpbGQsIGluc2VydEluRnJvbnRPZiwgZmFsc2UpO1xuICAgICAgICAgICAgY29uc3QgdEljdSA9IGdldFRJY3UodFZpZXcsIHJlZklkeCk7XG4gICAgICAgICAgICBpZiAodEljdSAhPT0gbnVsbCAmJiB0eXBlb2YgdEljdSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgLy8gSWYgd2UganVzdCBhZGRlZCBhIGNvbW1lbnQgbm9kZSB3aGljaCBoYXMgSUNVIHRoZW4gdGhhdCBJQ1UgbWF5IGhhdmUgYWxyZWFkeSBiZWVuXG4gICAgICAgICAgICAgIC8vIHJlbmRlcmVkIGFuZCB0aGVyZWZvcmUgd2UgbmVlZCB0byByZS1hZGQgaXQgaGVyZS5cbiAgICAgICAgICAgICAgbmdEZXZNb2RlICYmIGFzc2VydFRJY3UodEljdSk7XG4gICAgICAgICAgICAgIGNvbnN0IGNhc2VJbmRleCA9IGdldEN1cnJlbnRJQ1VDYXNlSW5kZXgodEljdSwgbFZpZXcpO1xuICAgICAgICAgICAgICBpZiAoY2FzZUluZGV4ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgYXBwbHlNdXRhYmxlT3BDb2Rlcyh0VmlldywgdEljdS5jcmVhdGVbY2FzZUluZGV4XSwgbFZpZXcsIGxWaWV3W3RJY3UuYW5jaG9ySWR4XSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSWN1Q3JlYXRlT3BDb2RlLkF0dHI6XG4gICAgICAgICAgY29uc3QgZWxlbWVudE5vZGVJbmRleCA9IG9wQ29kZSA+Pj4gSWN1Q3JlYXRlT3BDb2RlLlNISUZUX1JFRjtcbiAgICAgICAgICBjb25zdCBhdHRyTmFtZSA9IG11dGFibGVPcENvZGVzWysraV0gYXMgc3RyaW5nO1xuICAgICAgICAgIGNvbnN0IGF0dHJWYWx1ZSA9IG11dGFibGVPcENvZGVzWysraV0gYXMgc3RyaW5nO1xuICAgICAgICAgIC8vIFRoaXMgY29kZSBpcyB1c2VkIGZvciBJQ1UgZXhwcmVzc2lvbnMgb25seSwgc2luY2Ugd2UgZG9uJ3Qgc3VwcG9ydFxuICAgICAgICAgIC8vIGRpcmVjdGl2ZXMvY29tcG9uZW50cyBpbiBJQ1VzLCB3ZSBkb24ndCBuZWVkIHRvIHdvcnJ5IGFib3V0IGlucHV0cyBoZXJlXG4gICAgICAgICAgc2V0RWxlbWVudEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgcmVuZGVyZXIsIGdldE5hdGl2ZUJ5SW5kZXgoZWxlbWVudE5vZGVJbmRleCwgbFZpZXcpIGFzIFJFbGVtZW50LCBudWxsLCBudWxsLCBhdHRyTmFtZSxcbiAgICAgICAgICAgICAgYXR0clZhbHVlLCBudWxsKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAobmdEZXZNb2RlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9JMThOX1NUUlVDVFVSRSxcbiAgICAgICAgICAgICAgICBgVW5hYmxlIHRvIGRldGVybWluZSB0aGUgdHlwZSBvZiBtdXRhdGUgb3BlcmF0aW9uIGZvciBcIiR7b3BDb2RlfVwiYCk7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzd2l0Y2ggKG9wQ29kZSkge1xuICAgICAgICBjYXNlIElDVV9NQVJLRVI6XG4gICAgICAgICAgY29uc3QgY29tbWVudFZhbHVlID0gbXV0YWJsZU9wQ29kZXNbKytpXSBhcyBzdHJpbmc7XG4gICAgICAgICAgY29uc3QgY29tbWVudE5vZGVJbmRleCA9IG11dGFibGVPcENvZGVzWysraV0gYXMgbnVtYmVyO1xuICAgICAgICAgIGlmIChsVmlld1tjb21tZW50Tm9kZUluZGV4XSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgbmdEZXZNb2RlICYmXG4gICAgICAgICAgICAgICAgYXNzZXJ0RXF1YWwoXG4gICAgICAgICAgICAgICAgICAgIHR5cGVvZiBjb21tZW50VmFsdWUsICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICBgRXhwZWN0ZWQgXCIke2NvbW1lbnRWYWx1ZX1cIiB0byBiZSBhIGNvbW1lbnQgbm9kZSB2YWx1ZWApO1xuICAgICAgICAgICAgbmdEZXZNb2RlICYmIG5nRGV2TW9kZS5yZW5kZXJlckNyZWF0ZUNvbW1lbnQrKztcbiAgICAgICAgICAgIG5nRGV2TW9kZSAmJiBhc3NlcnRJbmRleEluRXhwYW5kb1JhbmdlKGxWaWV3LCBjb21tZW50Tm9kZUluZGV4KTtcbiAgICAgICAgICAgIGNvbnN0IGNvbW1lbnRSTm9kZSA9IGxWaWV3W2NvbW1lbnROb2RlSW5kZXhdID1cbiAgICAgICAgICAgICAgICBjcmVhdGVDb21tZW50Tm9kZShyZW5kZXJlciwgY29tbWVudFZhbHVlKTtcbiAgICAgICAgICAgIC8vIEZJWE1FKG1pc2tvKTogQXR0YWNoaW5nIHBhdGNoIGRhdGEgaXMgb25seSBuZWVkZWQgZm9yIHRoZSByb290IChBbHNvIGFkZCB0ZXN0cylcbiAgICAgICAgICAgIGF0dGFjaFBhdGNoRGF0YShjb21tZW50Uk5vZGUsIGxWaWV3KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgRUxFTUVOVF9NQVJLRVI6XG4gICAgICAgICAgY29uc3QgdGFnTmFtZSA9IG11dGFibGVPcENvZGVzWysraV0gYXMgc3RyaW5nO1xuICAgICAgICAgIGNvbnN0IGVsZW1lbnROb2RlSW5kZXggPSBtdXRhYmxlT3BDb2Rlc1srK2ldIGFzIG51bWJlcjtcbiAgICAgICAgICBpZiAobFZpZXdbZWxlbWVudE5vZGVJbmRleF0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIG5nRGV2TW9kZSAmJlxuICAgICAgICAgICAgICAgIGFzc2VydEVxdWFsKFxuICAgICAgICAgICAgICAgICAgICB0eXBlb2YgdGFnTmFtZSwgJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgIGBFeHBlY3RlZCBcIiR7dGFnTmFtZX1cIiB0byBiZSBhbiBlbGVtZW50IG5vZGUgdGFnIG5hbWVgKTtcblxuICAgICAgICAgICAgbmdEZXZNb2RlICYmIG5nRGV2TW9kZS5yZW5kZXJlckNyZWF0ZUVsZW1lbnQrKztcbiAgICAgICAgICAgIG5nRGV2TW9kZSAmJiBhc3NlcnRJbmRleEluRXhwYW5kb1JhbmdlKGxWaWV3LCBlbGVtZW50Tm9kZUluZGV4KTtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnRSTm9kZSA9IGxWaWV3W2VsZW1lbnROb2RlSW5kZXhdID1cbiAgICAgICAgICAgICAgICBjcmVhdGVFbGVtZW50Tm9kZShyZW5kZXJlciwgdGFnTmFtZSwgbnVsbCk7XG4gICAgICAgICAgICAvLyBGSVhNRShtaXNrbyk6IEF0dGFjaGluZyBwYXRjaCBkYXRhIGlzIG9ubHkgbmVlZGVkIGZvciB0aGUgcm9vdCAoQWxzbyBhZGQgdGVzdHMpXG4gICAgICAgICAgICBhdHRhY2hQYXRjaERhdGEoZWxlbWVudFJOb2RlLCBsVmlldyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIG5nRGV2TW9kZSAmJlxuICAgICAgICAgICAgICB0aHJvd0Vycm9yKGBVbmFibGUgdG8gZGV0ZXJtaW5lIHRoZSB0eXBlIG9mIG11dGF0ZSBvcGVyYXRpb24gZm9yIFwiJHtvcENvZGV9XCJgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuXG4vKipcbiAqIEFwcGx5IGBJMThuVXBkYXRlT3BDb2Rlc2AgT3BDb2Rlc1xuICpcbiAqIEBwYXJhbSB0VmlldyBDdXJyZW50IGBUVmlld2BcbiAqIEBwYXJhbSBsVmlldyBDdXJyZW50IGBMVmlld2BcbiAqIEBwYXJhbSB1cGRhdGVPcENvZGVzIE9wQ29kZXMgdG8gcHJvY2Vzc1xuICogQHBhcmFtIGJpbmRpbmdzU3RhcnRJbmRleCBMb2NhdGlvbiBvZiB0aGUgZmlyc3QgYMm1ybVpMThuQXBwbHlgXG4gKiBAcGFyYW0gY2hhbmdlTWFzayBFYWNoIGJpdCBjb3JyZXNwb25kcyB0byBhIGDJtcm1aTE4bkV4cGAgKENvdW50aW5nIGJhY2t3YXJkcyBmcm9tXG4gKiAgICAgYGJpbmRpbmdzU3RhcnRJbmRleGApXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVVwZGF0ZU9wQ29kZXMoXG4gICAgdFZpZXc6IFRWaWV3LCBsVmlldzogTFZpZXcsIHVwZGF0ZU9wQ29kZXM6IEkxOG5VcGRhdGVPcENvZGVzLCBiaW5kaW5nc1N0YXJ0SW5kZXg6IG51bWJlcixcbiAgICBjaGFuZ2VNYXNrOiBudW1iZXIpIHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB1cGRhdGVPcENvZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gYml0IGNvZGUgdG8gY2hlY2sgaWYgd2Ugc2hvdWxkIGFwcGx5IHRoZSBuZXh0IHVwZGF0ZVxuICAgIGNvbnN0IGNoZWNrQml0ID0gdXBkYXRlT3BDb2Rlc1tpXSBhcyBudW1iZXI7XG4gICAgLy8gTnVtYmVyIG9mIG9wQ29kZXMgdG8gc2tpcCB1bnRpbCBuZXh0IHNldCBvZiB1cGRhdGUgY29kZXNcbiAgICBjb25zdCBza2lwQ29kZXMgPSB1cGRhdGVPcENvZGVzWysraV0gYXMgbnVtYmVyO1xuICAgIGlmIChjaGVja0JpdCAmIGNoYW5nZU1hc2spIHtcbiAgICAgIC8vIFRoZSB2YWx1ZSBoYXMgYmVlbiB1cGRhdGVkIHNpbmNlIGxhc3QgY2hlY2tlZFxuICAgICAgbGV0IHZhbHVlID0gJyc7XG4gICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPD0gKGkgKyBza2lwQ29kZXMpOyBqKyspIHtcbiAgICAgICAgY29uc3Qgb3BDb2RlID0gdXBkYXRlT3BDb2Rlc1tqXTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcENvZGUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB2YWx1ZSArPSBvcENvZGU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG9wQ29kZSA9PSAnbnVtYmVyJykge1xuICAgICAgICAgIGlmIChvcENvZGUgPCAwKSB7XG4gICAgICAgICAgICAvLyBOZWdhdGl2ZSBvcENvZGUgcmVwcmVzZW50IGBpMThuRXhwYCB2YWx1ZXMgb2Zmc2V0LlxuICAgICAgICAgICAgdmFsdWUgKz0gcmVuZGVyU3RyaW5naWZ5KGxWaWV3W2JpbmRpbmdzU3RhcnRJbmRleCAtIG9wQ29kZV0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBub2RlSW5kZXggPSAob3BDb2RlID4+PiBJMThuVXBkYXRlT3BDb2RlLlNISUZUX1JFRik7XG4gICAgICAgICAgICBzd2l0Y2ggKG9wQ29kZSAmIEkxOG5VcGRhdGVPcENvZGUuTUFTS19PUENPREUpIHtcbiAgICAgICAgICAgICAgY2FzZSBJMThuVXBkYXRlT3BDb2RlLkF0dHI6XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcE5hbWUgPSB1cGRhdGVPcENvZGVzWysral0gYXMgc3RyaW5nO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNhbml0aXplRm4gPSB1cGRhdGVPcENvZGVzWysral0gYXMgU2FuaXRpemVyRm4gfCBudWxsO1xuICAgICAgICAgICAgICAgIGNvbnN0IHROb2RlT3JUYWdOYW1lID0gdFZpZXcuZGF0YVtub2RlSW5kZXhdIGFzIFROb2RlIHwgc3RyaW5nO1xuICAgICAgICAgICAgICAgIG5nRGV2TW9kZSAmJiBhc3NlcnREZWZpbmVkKHROb2RlT3JUYWdOYW1lLCAnRXhwZXJ0aW5nIFROb2RlIG9yIHN0cmluZycpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdE5vZGVPclRhZ05hbWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAvLyBJRiB3ZSBkb24ndCBoYXZlIGEgYFROb2RlYCwgdGhlbiB3ZSBhcmUgYW4gZWxlbWVudCBpbiBJQ1UgKGFzIElDVSBjb250ZW50IGRvZXNcbiAgICAgICAgICAgICAgICAgIC8vIG5vdCBoYXZlIFROb2RlKSwgaW4gd2hpY2ggY2FzZSB3ZSBrbm93IHRoYXQgdGhlcmUgYXJlIG5vIGRpcmVjdGl2ZXMsIGFuZCBoZW5jZVxuICAgICAgICAgICAgICAgICAgLy8gd2UgdXNlIGF0dHJpYnV0ZSBzZXR0aW5nLlxuICAgICAgICAgICAgICAgICAgc2V0RWxlbWVudEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgICBsVmlld1tSRU5ERVJFUl0sIGxWaWV3W25vZGVJbmRleF0sIG51bGwsIHROb2RlT3JUYWdOYW1lLCBwcm9wTmFtZSwgdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgc2FuaXRpemVGbik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGVsZW1lbnRQcm9wZXJ0eUludGVybmFsKFxuICAgICAgICAgICAgICAgICAgICAgIHRWaWV3LCB0Tm9kZU9yVGFnTmFtZSwgbFZpZXcsIHByb3BOYW1lLCB2YWx1ZSwgbFZpZXdbUkVOREVSRVJdLCBzYW5pdGl6ZUZuLFxuICAgICAgICAgICAgICAgICAgICAgIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgSTE4blVwZGF0ZU9wQ29kZS5UZXh0OlxuICAgICAgICAgICAgICAgIGNvbnN0IHJUZXh0ID0gbFZpZXdbbm9kZUluZGV4XSBhcyBSVGV4dCB8IG51bGw7XG4gICAgICAgICAgICAgICAgclRleHQgIT09IG51bGwgJiYgdXBkYXRlVGV4dE5vZGUobFZpZXdbUkVOREVSRVJdLCByVGV4dCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlIEkxOG5VcGRhdGVPcENvZGUuSWN1U3dpdGNoOlxuICAgICAgICAgICAgICAgIGFwcGx5SWN1U3dpdGNoQ2FzZSh0VmlldywgZ2V0VEljdSh0Vmlldywgbm9kZUluZGV4KSEsIGxWaWV3LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgSTE4blVwZGF0ZU9wQ29kZS5JY3VVcGRhdGU6XG4gICAgICAgICAgICAgICAgYXBwbHlJY3VVcGRhdGVDYXNlKHRWaWV3LCBnZXRUSWN1KHRWaWV3LCBub2RlSW5kZXgpISwgYmluZGluZ3NTdGFydEluZGV4LCBsVmlldyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG9wQ29kZSA9IHVwZGF0ZU9wQ29kZXNbaSArIDFdIGFzIG51bWJlcjtcbiAgICAgIGlmIChvcENvZGUgPiAwICYmIChvcENvZGUgJiBJMThuVXBkYXRlT3BDb2RlLk1BU0tfT1BDT0RFKSA9PT0gSTE4blVwZGF0ZU9wQ29kZS5JY3VVcGRhdGUpIHtcbiAgICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciB0aGUgYGljdVVwZGF0ZUNhc2VgLiBJdCBjb3VsZCBiZSB0aGF0IHRoZSBtYXNrIGRpZCBub3QgbWF0Y2gsIGJ1dFxuICAgICAgICAvLyB3ZSBzdGlsbCBuZWVkIHRvIGV4ZWN1dGUgYGljdVVwZGF0ZUNhc2VgIGJlY2F1c2UgdGhlIGNhc2UgaGFzIGNoYW5nZWQgcmVjZW50bHkgZHVlIHRvXG4gICAgICAgIC8vIHByZXZpb3VzIGBpY3VTd2l0Y2hDYXNlYCBpbnN0cnVjdGlvbi4gKGBpY3VTd2l0Y2hDYXNlYCBhbmQgYGljdVVwZGF0ZUNhc2VgIGFsd2F5cyBjb21lIGluXG4gICAgICAgIC8vIHBhaXJzLilcbiAgICAgICAgY29uc3Qgbm9kZUluZGV4ID0gKG9wQ29kZSA+Pj4gSTE4blVwZGF0ZU9wQ29kZS5TSElGVF9SRUYpO1xuICAgICAgICBjb25zdCB0SWN1ID0gZ2V0VEljdSh0Vmlldywgbm9kZUluZGV4KSE7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRJbmRleCA9IGxWaWV3W3RJY3UuY3VycmVudENhc2VMVmlld0luZGV4XTtcbiAgICAgICAgaWYgKGN1cnJlbnRJbmRleCA8IDApIHtcbiAgICAgICAgICBhcHBseUljdVVwZGF0ZUNhc2UodFZpZXcsIHRJY3UsIGJpbmRpbmdzU3RhcnRJbmRleCwgbFZpZXcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGkgKz0gc2tpcENvZGVzO1xuICB9XG59XG5cbi8qKlxuICogQXBwbHkgT3BDb2RlcyBhc3NvY2lhdGVkIHdpdGggdXBkYXRpbmcgYW4gZXhpc3RpbmcgSUNVLlxuICpcbiAqIEBwYXJhbSB0VmlldyBDdXJyZW50IGBUVmlld2BcbiAqIEBwYXJhbSB0SWN1IEN1cnJlbnQgYFRJY3VgXG4gKiBAcGFyYW0gYmluZGluZ3NTdGFydEluZGV4IExvY2F0aW9uIG9mIHRoZSBmaXJzdCBgybXJtWkxOG5BcHBseWBcbiAqIEBwYXJhbSBsVmlldyBDdXJyZW50IGBMVmlld2BcbiAqL1xuZnVuY3Rpb24gYXBwbHlJY3VVcGRhdGVDYXNlKHRWaWV3OiBUVmlldywgdEljdTogVEljdSwgYmluZGluZ3NTdGFydEluZGV4OiBudW1iZXIsIGxWaWV3OiBMVmlldykge1xuICBuZ0Rldk1vZGUgJiYgYXNzZXJ0SW5kZXhJblJhbmdlKGxWaWV3LCB0SWN1LmN1cnJlbnRDYXNlTFZpZXdJbmRleCk7XG4gIGxldCBhY3RpdmVDYXNlSW5kZXggPSBsVmlld1t0SWN1LmN1cnJlbnRDYXNlTFZpZXdJbmRleF07XG4gIGlmIChhY3RpdmVDYXNlSW5kZXggIT09IG51bGwpIHtcbiAgICBsZXQgbWFzayA9IGNoYW5nZU1hc2s7XG4gICAgaWYgKGFjdGl2ZUNhc2VJbmRleCA8IDApIHtcbiAgICAgIC8vIENsZWFyIHRoZSBmbGFnLlxuICAgICAgLy8gTmVnYXRpdmUgbnVtYmVyIG1lYW5zIHRoYXQgdGhlIElDVSB3YXMgZnJlc2hseSBjcmVhdGVkIGFuZCB3ZSBuZWVkIHRvIGZvcmNlIHRoZSB1cGRhdGUuXG4gICAgICBhY3RpdmVDYXNlSW5kZXggPSBsVmlld1t0SWN1LmN1cnJlbnRDYXNlTFZpZXdJbmRleF0gPSB+YWN0aXZlQ2FzZUluZGV4O1xuICAgICAgLy8gLTEgaXMgc2FtZSBhcyBhbGwgYml0cyBvbiwgd2hpY2ggc2ltdWxhdGVzIGNyZWF0aW9uIHNpbmNlIGl0IG1hcmtzIGFsbCBiaXRzIGRpcnR5XG4gICAgICBtYXNrID0gLTE7XG4gICAgfVxuICAgIGFwcGx5VXBkYXRlT3BDb2Rlcyh0VmlldywgbFZpZXcsIHRJY3UudXBkYXRlW2FjdGl2ZUNhc2VJbmRleF0sIGJpbmRpbmdzU3RhcnRJbmRleCwgbWFzayk7XG4gIH1cbn1cblxuLyoqXG4gKiBBcHBseSBPcENvZGVzIGFzc29jaWF0ZWQgd2l0aCBzd2l0Y2hpbmcgYSBjYXNlIG9uIElDVS5cbiAqXG4gKiBUaGlzIGludm9sdmVzIHRlYXJpbmcgZG93biBleGlzdGluZyBjYXNlIGFuZCB0aGFuIGJ1aWxkaW5nIHVwIGEgbmV3IGNhc2UuXG4gKlxuICogQHBhcmFtIHRWaWV3IEN1cnJlbnQgYFRWaWV3YFxuICogQHBhcmFtIHRJY3UgQ3VycmVudCBgVEljdWBcbiAqIEBwYXJhbSBsVmlldyBDdXJyZW50IGBMVmlld2BcbiAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSBvZiB0aGUgY2FzZSB0byB1cGRhdGUgdG8uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5SWN1U3dpdGNoQ2FzZSh0VmlldzogVFZpZXcsIHRJY3U6IFRJY3UsIGxWaWV3OiBMVmlldywgdmFsdWU6IHN0cmluZykge1xuICAvLyBSZWJ1aWxkIGEgbmV3IGNhc2UgZm9yIHRoaXMgSUNVXG4gIGNvbnN0IGNhc2VJbmRleCA9IGdldENhc2VJbmRleCh0SWN1LCB2YWx1ZSk7XG4gIGxldCBhY3RpdmVDYXNlSW5kZXggPSBnZXRDdXJyZW50SUNVQ2FzZUluZGV4KHRJY3UsIGxWaWV3KTtcbiAgaWYgKGFjdGl2ZUNhc2VJbmRleCAhPT0gY2FzZUluZGV4KSB7XG4gICAgYXBwbHlJY3VTd2l0Y2hDYXNlUmVtb3ZlKHRWaWV3LCB0SWN1LCBsVmlldyk7XG4gICAgbFZpZXdbdEljdS5jdXJyZW50Q2FzZUxWaWV3SW5kZXhdID0gY2FzZUluZGV4ID09PSBudWxsID8gbnVsbCA6IH5jYXNlSW5kZXg7XG4gICAgaWYgKGNhc2VJbmRleCAhPT0gbnVsbCkge1xuICAgICAgLy8gQWRkIHRoZSBub2RlcyBmb3IgdGhlIG5ldyBjYXNlXG4gICAgICBjb25zdCBhbmNob3JSTm9kZSA9IGxWaWV3W3RJY3UuYW5jaG9ySWR4XTtcbiAgICAgIGlmIChhbmNob3JSTm9kZSkge1xuICAgICAgICBuZ0Rldk1vZGUgJiYgYXNzZXJ0RG9tTm9kZShhbmNob3JSTm9kZSk7XG4gICAgICAgIGFwcGx5TXV0YWJsZU9wQ29kZXModFZpZXcsIHRJY3UuY3JlYXRlW2Nhc2VJbmRleF0sIGxWaWV3LCBhbmNob3JSTm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQXBwbHkgT3BDb2RlcyBhc3NvY2lhdGVkIHdpdGggdGVhcmluZyBJQ1UgY2FzZS5cbiAqXG4gKiBUaGlzIGludm9sdmVzIHRlYXJpbmcgZG93biBleGlzdGluZyBjYXNlIGFuZCB0aGFuIGJ1aWxkaW5nIHVwIGEgbmV3IGNhc2UuXG4gKlxuICogQHBhcmFtIHRWaWV3IEN1cnJlbnQgYFRWaWV3YFxuICogQHBhcmFtIHRJY3UgQ3VycmVudCBgVEljdWBcbiAqIEBwYXJhbSBsVmlldyBDdXJyZW50IGBMVmlld2BcbiAqL1xuZnVuY3Rpb24gYXBwbHlJY3VTd2l0Y2hDYXNlUmVtb3ZlKHRWaWV3OiBUVmlldywgdEljdTogVEljdSwgbFZpZXc6IExWaWV3KSB7XG4gIGxldCBhY3RpdmVDYXNlSW5kZXggPSBnZXRDdXJyZW50SUNVQ2FzZUluZGV4KHRJY3UsIGxWaWV3KTtcbiAgaWYgKGFjdGl2ZUNhc2VJbmRleCAhPT0gbnVsbCkge1xuICAgIGNvbnN0IHJlbW92ZUNvZGVzID0gdEljdS5yZW1vdmVbYWN0aXZlQ2FzZUluZGV4XTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbW92ZUNvZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBub2RlT3JJY3VJbmRleCA9IHJlbW92ZUNvZGVzW2ldIGFzIG51bWJlcjtcbiAgICAgIGlmIChub2RlT3JJY3VJbmRleCA+IDApIHtcbiAgICAgICAgLy8gUG9zaXRpdmUgbnVtYmVycyBhcmUgYFJOb2RlYHMuXG4gICAgICAgIGNvbnN0IHJOb2RlID0gZ2V0TmF0aXZlQnlJbmRleChub2RlT3JJY3VJbmRleCwgbFZpZXcpO1xuICAgICAgICByTm9kZSAhPT0gbnVsbCAmJiBuYXRpdmVSZW1vdmVOb2RlKGxWaWV3W1JFTkRFUkVSXSwgck5vZGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTmVnYXRpdmUgbnVtYmVycyBhcmUgSUNVc1xuICAgICAgICBhcHBseUljdVN3aXRjaENhc2VSZW1vdmUodFZpZXcsIGdldFRJY3UodFZpZXcsIH5ub2RlT3JJY3VJbmRleCkhLCBsVmlldyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBjYXNlIG9mIGFuIElDVSBleHByZXNzaW9uIGRlcGVuZGluZyBvbiB0aGUgbWFpbiBiaW5kaW5nIHZhbHVlXG4gKlxuICogQHBhcmFtIGljdUV4cHJlc3Npb25cbiAqIEBwYXJhbSBiaW5kaW5nVmFsdWUgVGhlIHZhbHVlIG9mIHRoZSBtYWluIGJpbmRpbmcgdXNlZCBieSB0aGlzIElDVSBleHByZXNzaW9uXG4gKi9cbmZ1bmN0aW9uIGdldENhc2VJbmRleChpY3VFeHByZXNzaW9uOiBUSWN1LCBiaW5kaW5nVmFsdWU6IHN0cmluZyk6IG51bWJlcnxudWxsIHtcbiAgbGV0IGluZGV4ID0gaWN1RXhwcmVzc2lvbi5jYXNlcy5pbmRleE9mKGJpbmRpbmdWYWx1ZSk7XG4gIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICBzd2l0Y2ggKGljdUV4cHJlc3Npb24udHlwZSkge1xuICAgICAgY2FzZSBJY3VUeXBlLnBsdXJhbDoge1xuICAgICAgICBjb25zdCByZXNvbHZlZENhc2UgPSBnZXRQbHVyYWxDYXNlKGJpbmRpbmdWYWx1ZSwgZ2V0TG9jYWxlSWQoKSk7XG4gICAgICAgIGluZGV4ID0gaWN1RXhwcmVzc2lvbi5jYXNlcy5pbmRleE9mKHJlc29sdmVkQ2FzZSk7XG4gICAgICAgIGlmIChpbmRleCA9PT0gLTEgJiYgcmVzb2x2ZWRDYXNlICE9PSAnb3RoZXInKSB7XG4gICAgICAgICAgaW5kZXggPSBpY3VFeHByZXNzaW9uLmNhc2VzLmluZGV4T2YoJ290aGVyJyk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlIEljdVR5cGUuc2VsZWN0OiB7XG4gICAgICAgIGluZGV4ID0gaWN1RXhwcmVzc2lvbi5jYXNlcy5pbmRleE9mKCdvdGhlcicpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGluZGV4ID09PSAtMSA/IG51bGwgOiBpbmRleDtcbn1cbiJdfQ==