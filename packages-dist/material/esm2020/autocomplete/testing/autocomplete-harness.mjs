/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ComponentHarness, HarnessPredicate, } from '@angular/cdk/testing';
import { MatOptgroupHarness, MatOptionHarness, } from '@angular/material/core/testing';
export class _MatAutocompleteHarnessBase extends ComponentHarness {
    constructor() {
        super(...arguments);
        this._documentRootLocator = this.documentRootLocatorFactory();
    }
    /** Gets the value of the autocomplete input. */
    async getValue() {
        return (await this.host()).getProperty('value');
    }
    /** Whether the autocomplete input is disabled. */
    async isDisabled() {
        const disabled = (await this.host()).getAttribute('disabled');
        return coerceBooleanProperty(await disabled);
    }
    /** Focuses the autocomplete input. */
    async focus() {
        return (await this.host()).focus();
    }
    /** Blurs the autocomplete input. */
    async blur() {
        return (await this.host()).blur();
    }
    /** Whether the autocomplete input is focused. */
    async isFocused() {
        return (await this.host()).isFocused();
    }
    /** Enters text into the autocomplete. */
    async enterText(value) {
        return (await this.host()).sendKeys(value);
    }
    /** Clears the input value. */
    async clear() {
        return (await this.host()).clear();
    }
    /** Gets the options inside the autocomplete panel. */
    async getOptions(filters) {
        if (!(await this.isOpen())) {
            throw new Error('Unable to retrieve options for autocomplete. Autocomplete panel is closed.');
        }
        return this._documentRootLocator.locatorForAll(this._optionClass.with({
            ...(filters || {}),
            ancestor: await this._getPanelSelector(),
        }))();
    }
    /** Gets the option groups inside the autocomplete panel. */
    async getOptionGroups(filters) {
        if (!(await this.isOpen())) {
            throw new Error('Unable to retrieve option groups for autocomplete. Autocomplete panel is closed.');
        }
        return this._documentRootLocator.locatorForAll(this._optionGroupClass.with({
            ...(filters || {}),
            ancestor: await this._getPanelSelector(),
        }))();
    }
    /** Selects the first option matching the given filters. */
    async selectOption(filters) {
        await this.focus(); // Focus the input to make sure the autocomplete panel is shown.
        const options = await this.getOptions(filters);
        if (!options.length) {
            throw Error(`Could not find a mat-option matching ${JSON.stringify(filters)}`);
        }
        await options[0].click();
    }
    /** Whether the autocomplete is open. */
    async isOpen() {
        const panel = await this._getPanel();
        return !!panel && (await panel.hasClass(`${this._prefix}-autocomplete-visible`));
    }
    /** Gets the panel associated with this autocomplete trigger. */
    async _getPanel() {
        // Technically this is static, but it needs to be in a
        // function, because the autocomplete's panel ID can changed.
        return this._documentRootLocator.locatorForOptional(await this._getPanelSelector())();
    }
    /** Gets the selector that can be used to find the autocomplete trigger's panel. */
    async _getPanelSelector() {
        return `#${await (await this.host()).getAttribute('aria-owns')}`;
    }
}
/** Harness for interacting with an MDC-based mat-autocomplete in tests. */
export class MatAutocompleteHarness extends _MatAutocompleteHarnessBase {
    constructor() {
        super(...arguments);
        this._prefix = 'mat-mdc';
        this._optionClass = MatOptionHarness;
        this._optionGroupClass = MatOptgroupHarness;
    }
    /**
     * Gets a `HarnessPredicate` that can be used to search for an autocomplete with specific
     * attributes.
     * @param options Options for filtering which autocomplete instances are considered a match.
     * @return a `HarnessPredicate` configured with the given options.
     */
    static with(options = {}) {
        return new HarnessPredicate(this, options)
            .addOption('value', options.value, (harness, value) => HarnessPredicate.stringMatches(harness.getValue(), value))
            .addOption('disabled', options.disabled, async (harness, disabled) => {
            return (await harness.isDisabled()) === disabled;
        });
    }
}
/** The selector for the host element of a `MatAutocomplete` instance. */
MatAutocompleteHarness.hostSelector = '.mat-mdc-autocomplete-trigger';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2NvbXBsZXRlLWhhcm5lc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvbWF0ZXJpYWwvYXV0b2NvbXBsZXRlL3Rlc3RpbmcvYXV0b2NvbXBsZXRlLWhhcm5lc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUVMLGdCQUFnQixFQUVoQixnQkFBZ0IsR0FFakIsTUFBTSxzQkFBc0IsQ0FBQztBQUM5QixPQUFPLEVBQ0wsa0JBQWtCLEVBQ2xCLGdCQUFnQixHQUdqQixNQUFNLGdDQUFnQyxDQUFDO0FBR3hDLE1BQU0sT0FBZ0IsMkJBV3BCLFNBQVEsZ0JBQWdCO0lBWDFCOztRQVlVLHlCQUFvQixHQUFHLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO0lBa0duRSxDQUFDO0lBN0ZDLGdEQUFnRDtJQUNoRCxLQUFLLENBQUMsUUFBUTtRQUNaLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBUyxPQUFPLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsa0RBQWtEO0lBQ2xELEtBQUssQ0FBQyxVQUFVO1FBQ2QsTUFBTSxRQUFRLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5RCxPQUFPLHFCQUFxQixDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELHNDQUFzQztJQUN0QyxLQUFLLENBQUMsS0FBSztRQUNULE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFFRCxvQ0FBb0M7SUFDcEMsS0FBSyxDQUFDLElBQUk7UUFDUixPQUFPLENB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LGlCQUFpQjtRQUM3QixPQUFPLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7SUFDbkUsQ0FBQztDQUNGO0FBRUQsMkVBQTJFO0FBQzNFLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSwyQkFPM0M7SUFQRDs7UUFRWSxZQUFPLEdBQUcsU0FBUyxDQUFDO1FBQ3BCLGlCQUFZLEdBQUcsZ0JBQWdCLENBQUM7UUFDaEMsc0JBQWlCLEdBQUcsa0JBQWtCLENBQUM7SUF1Qm5ELENBQUM7SUFsQkM7Ozs7O09BS0c7SUFDSCxNQUFNLENBQUMsSUFBSSxDQUVULFVBQXNDLEVBQUU7UUFFeEMsT0FBTyxJQUFJLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUM7YUFDdkMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQ3BELGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQzFEO2FBQ0EsU0FBUyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDbkUsT0FBTyxDQUFDLE1BQU0sT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLEtBQUssUUFBUSxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQzs7QUFwQkQseUVBQXlFO0FBQ2xFLG1DQUFZLEdBQUcsK0JBQStCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtjb2VyY2VCb29sZWFuUHJvcGVydHl9IGZyb20gJ0Bhbmd1bGFyL2Nkay9jb2VyY2lvbic7XG5pbXBvcnQge1xuICBCYXNlSGFybmVzc0ZpbHRlcnMsXG4gIENvbXBvbmVudEhhcm5lc3MsXG4gIENvbXBvbmVudEhhcm5lc3NDb25zdHJ1Y3RvcixcbiAgSGFybmVzc1ByZWRpY2F0ZSxcbiAgVGVzdEVsZW1lbnQsXG59IGZyb20gJ0Bhbmd1bGFyL2Nkay90ZXN0aW5nJztcbmltcG9ydCB7XG4gIE1hdE9wdGdyb3VwSGFybmVzcyxcbiAgTWF0T3B0aW9uSGFybmVzcyxcbiAgT3B0Z3JvdXBIYXJuZXNzRmlsdGVycyxcbiAgT3B0aW9uSGFybmVzc0ZpbHRlcnMsXG59IGZyb20gJ0Bhbmd1bGFyL21hdGVyaWFsL2NvcmUvdGVzdGluZyc7XG5pbXBvcnQge0F1dG9jb21wbGV0ZUhhcm5lc3NGaWx0ZXJzfSBmcm9tICcuL2F1dG9jb21wbGV0ZS1oYXJuZXNzLWZpbHRlcnMnO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgX01hdEF1dG9jb21wbGV0ZUhhcm5lc3NCYXNlPFxuICBPcHRpb25UeXBlIGV4dGVuZHMgQ29tcG9uZW50SGFybmVzc0NvbnN0cnVjdG9yPE9wdGlvbj4gJiB7XG4gICAgd2l0aDogKG9wdGlvbnM/OiBPcHRpb25GaWx0ZXJzKSA9PiBIYXJuZXNzUHJlZGljYXRlPE9wdGlvbj47XG4gIH0sXG4gIE9wdGlvbiBleHRlbmRzIENvbXBvbmVudEhhcm5lc3MgJiB7Y2xpY2soKTogUHJvbWlzZTx2b2lkPn0sXG4gIE9wdGlvbkZpbHRlcnMgZXh0ZW5kcyBCYXNlSGFybmVzc0ZpbHRlcnMsXG4gIE9wdGlvbkdyb3VwVHlwZSBleHRlbmRzIENvbXBvbmVudEhhcm5lc3NDb25zdHJ1Y3RvcjxPcHRpb25Hcm91cD4gJiB7XG4gICAgd2l0aDogKG9wdGlvbnM/OiBPcHRpb25Hcm91cEZpbHRlcnMpID0+IEhhcm5lc3NQcmVkaWNhdGU8T3B0aW9uR3JvdXA+O1xuICB9LFxuICBPcHRpb25Hcm91cCBleHRlbmRzIENvbXBvbmVudEhhcm5lc3MsXG4gIE9wdGlvbkdyb3VwRmlsdGVycyBleHRlbmRzIEJhc2VIYXJuZXNzRmlsdGVycyxcbj4gZXh0ZW5kcyBDb21wb25lbnRIYXJuZXNzIHtcbiAgcHJpdmF0ZSBfZG9jdW1lbnRSb290TG9jYXRvciA9IHRoaXMuZG9jdW1lbnRSb290TG9jYXRvckZhY3RvcnkoKTtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IF9wcmVmaXg6IHN0cmluZztcbiAgcHJvdGVjdGVkIGFic3RyYWN0IF9vcHRpb25DbGFzczogT3B0aW9uVHlwZTtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IF9vcHRpb25Hcm91cENsYXNzOiBPcHRpb25Hcm91cFR5cGU7XG5cbiAgLyoqIEdldHMgdGhlIHZhbHVlIG9mIHRoZSBhdXRvY29tcGxldGUgaW5wdXQuICovXG4gIGFzeW5jIGdldFZhbHVlKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLmhvc3QoKSkuZ2V0UHJvcGVydHk8c3RyaW5nPigndmFsdWUnKTtcbiAgfVxuXG4gIC8qKiBXaGV0aGVyIHRoZSBhdXRvY29tcGxldGUgaW5wdXQgaXMgZGlzYWJsZWQuICovXG4gIGFzeW5jIGlzRGlzYWJsZWQoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgZGlzYWJsZWQgPSAoYXdhaXQgdGhpcy5ob3N0KCkpLmdldEF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICByZXR1cm4gY29lcmNlQm9vbGVhblByb3BlcnR5KGF3YWl0IGRpc2FibGVkKTtcbiAgfVxuXG4gIC8qKiBGb2N1c2VzIHRoZSBhdXRvY29tcGxldGUgaW5wdXQuICovXG4gIGFzeW5jIGZvY3VzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiAoYXdhaXQgdGhpcy5ob3N0KCkpLmZvY3VzKCk7XG4gIH1cblxuICAvKiogQmx1cnMgdGhlIGF1dG9jb21wbGV0ZSBpbnB1dC4gKi9cbiAgYXN5bmMgYmx1cigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gKGF3YWl0IHRoaXMuaG9zdCgpKS5ibHVyKCk7XG4gIH1cblxuICAvKiogV2hldGhlciB0aGUgYXV0b2NvbXBsZXRlIGlucHV0IGlzIGZvY3VzZWQuICovXG4gIGFzeW5jIGlzRm9jdXNlZCgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gKGF3YWl0IHRoaXMuaG9zdCgpKS5pc0ZvY3VzZWQoKTtcbiAgfVxuXG4gIC8qKiBFbnRlcnMgdGV4dCBpbnRvIHRoZSBhdXRvY29tcGxldGUuICovXG4gIGFzeW5jIGVudGVyVGV4dCh2YWx1ZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLmhvc3QoKSkuc2VuZEtleXModmFsdWUpO1xuICB9XG5cbiAgLyoqIENsZWFycyB0aGUgaW5wdXQgdmFsdWUuICovXG4gIGFzeW5jIGNsZWFyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiAoYXdhaXQgdGhpcy5ob3N0KCkpLmNsZWFyKCk7XG4gIH1cblxuICAvKiogR2V0cyB0aGUgb3B0aW9ucyBpbnNpZGUgdGhlIGF1dG9jb21wbGV0ZSBwYW5lbC4gKi9cbiAgYXN5bmMgZ2V0T3B0aW9ucyhmaWx0ZXJzPzogT21pdDxPcHRpb25GaWx0ZXJzLCAnYW5jZXN0b3InPik6IFByb21pc2U8T3B0aW9uW10+IHtcbiAgICBpZiAoIShhd2FpdCB0aGlzLmlzT3BlbigpKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gcmV0cmlldmUgb3B0aW9ucyBmb3IgYXV0b2NvbXBsZXRlLiBBdXRvY29tcGxldGUgcGFuZWwgaXMgY2xvc2VkLicpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9kb2N1bWVudFJvb3RMb2NhdG9yLmxvY2F0b3JGb3JBbGwoXG4gICAgICB0aGlzLl9vcHRpb25DbGFzcy53aXRoKHtcbiAgICAgICAgLi4uKGZpbHRlcnMgfHwge30pLFxuICAgICAgICBhbmNlc3RvcjogYXdhaXQgdGhpcy5fZ2V0UGFuZWxTZWxlY3RvcigpLFxuICAgICAgfSBhcyBPcHRpb25GaWx0ZXJzKSxcbiAgICApKCk7XG4gIH1cblxuICAvKiogR2V0cyB0aGUgb3B0aW9uIGdyb3VwcyBpbnNpZGUgdGhlIGF1dG9jb21wbGV0ZSBwYW5lbC4gKi9cbiAgYXN5bmMgZ2V0T3B0aW9uR3JvdXBzKGZpbHRlcnM/OiBPbWl0PE9wdGlvbkdyb3VwRmlsdGVycywgJ2FuY2VzdG9yJz4pOiBQcm9taXNlPE9wdGlvbkdyb3VwW10+IHtcbiAgICBpZiAoIShhd2FpdCB0aGlzLmlzT3BlbigpKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVW5hYmxlIHRvIHJldHJpZXZlIG9wdGlvbiBncm91cHMgZm9yIGF1dG9jb21wbGV0ZS4gQXV0b2NvbXBsZXRlIHBhbmVsIGlzIGNsb3NlZC4nLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fZG9jdW1lbnRSb290TG9jYXRvci5sb2NhdG9yRm9yQWxsKFxuICAgICAgdGhpcy5fb3B0aW9uR3JvdXBDbGFzcy53aXRoKHtcbiAgICAgICAgLi4uKGZpbHRlcnMgfHwge30pLFxuICAgICAgICBhbmNlc3RvcjogYXdhaXQgdGhpcy5fZ2V0UGFuZWxTZWxlY3RvcigpLFxuICAgICAgfSBhcyBPcHRpb25Hcm91cEZpbHRlcnMpLFxuICAgICkoKTtcbiAgfVxuXG4gIC8qKiBTZWxlY3RzIHRoZSBmaXJzdCBvcHRpb24gbWF0Y2hpbmcgdGhlIGdpdmVuIGZpbHRlcnMuICovXG4gIGFzeW5jIHNlbGVjdE9wdGlvbihmaWx0ZXJzOiBPcHRpb25GaWx0ZXJzKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5mb2N1cygpOyAvLyBGb2N1cyB0aGUgaW5wdXQgdG8gbWFrZSBzdXJlIHRoZSBhdXRvY29tcGxldGUgcGFuZWwgaXMgc2hvd24uXG4gICAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0T3B0aW9ucyhmaWx0ZXJzKTtcbiAgICBpZiAoIW9wdGlvbnMubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBFcnJvcihgQ291bGQgbm90IGZpbmQgYSBtYXQtb3B0aW9uIG1hdGNoaW5nICR7SlNPTi5zdHJpbmdpZnkoZmlsdGVycyl9YCk7XG4gICAgfVxuICAgIGF3YWl0IG9wdGlvbnNbMF0uY2xpY2soKTtcbiAgfVxuXG4gIC8qKiBXaGV0aGVyIHRoZSBhdXRvY29tcGxldGUgaXMgb3Blbi4gKi9cbiAgYXN5bmMgaXNPcGVuKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHBhbmVsID0gYXdhaXQgdGhpcy5fZ2V0UGFuZWwoKTtcbiAgICByZXR1cm4gISFwYW5lbCAmJiAoYXdhaXQgcGFuZWwuaGFzQ2xhc3MoYCR7dGhpcy5fcHJlZml4fS1hdXRvY29tcGxldGUtdmlzaWJsZWApKTtcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBwYW5lbCBhc3NvY2lhdGVkIHdpdGggdGhpcyBhdXRvY29tcGxldGUgdHJpZ2dlci4gKi9cbiAgcHJpdmF0ZSBhc3luYyBfZ2V0UGFuZWwoKTogUHJvbWlzZTxUZXN0RWxlbWVudCB8IG51bGw+IHtcbiAgICAvLyBUZWNobmljYWxseSB0aGlzIGlzIHN0YXRpYywgYnV0IGl0IG5lZWRzIHRvIGJlIGluIGFcbiAgICAvLyBmdW5jdGlvbiwgYmVjYXVzZSB0aGUgYXV0b2NvbXBsZXRlJ3MgcGFuZWwgSUQgY2FuIGNoYW5nZWQuXG4gICAgcmV0dXJuIHRoaXMuX2RvY3VtZW50Um9vdExvY2F0b3IubG9jYXRvckZvck9wdGlvbmFsKGF3YWl0IHRoaXMuX2dldFBhbmVsU2VsZWN0b3IoKSkoKTtcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBzZWxlY3RvciB0aGF0IGNhbiBiZSB1c2VkIHRvIGZpbmQgdGhlIGF1dG9jb21wbGV0ZSB0cmlnZ2VyJ3MgcGFuZWwuICovXG4gIHByaXZhdGUgYXN5bmMgX2dldFBhbmVsU2VsZWN0b3IoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gYCMke2F3YWl0IChhd2FpdCB0aGlzLmhvc3QoKSkuZ2V0QXR0cmlidXRlKCdhcmlhLW93bnMnKX1gO1xuICB9XG59XG5cbi8qKiBIYXJuZXNzIGZvciBpbnRlcmFjdGluZyB3aXRoIGFuIE1EQy1iYXNlZCBtYXQtYXV0b2NvbXBsZXRlIGluIHRlc3RzLiAqL1xuZXhwb3J0IGNsYXNzIE1hdEF1dG9jb21wbGV0ZUhhcm5lc3MgZXh0ZW5kcyBfTWF0QXV0b2NvbXBsZXRlSGFybmVzc0Jhc2U8XG4gIHR5cGVvZiBNYXRPcHRpb25IYXJuZXNzLFxuICBNYXRPcHRpb25IYXJuZXNzLFxuICBPcHRpb25IYXJuZXNzRmlsdGVycyxcbiAgdHlwZW9mIE1hdE9wdGdyb3VwSGFybmVzcyxcbiAgTWF0T3B0Z3JvdXBIYXJuZXNzLFxuICBPcHRncm91cEhhcm5lc3NGaWx0ZXJzXG4+IHtcbiAgcHJvdGVjdGVkIF9wcmVmaXggPSAnbWF0LW1kYyc7XG4gIHByb3RlY3RlZCBfb3B0aW9uQ2xhc3MgPSBNYXRPcHRpb25IYXJuZXNzO1xuICBwcm90ZWN0ZWQgX29wdGlvbkdyb3VwQ2xhc3MgPSBNYXRPcHRncm91cEhhcm5lc3M7XG5cbiAgLyoqIFRoZSBzZWxlY3RvciBmb3IgdGhlIGhvc3QgZWxlbWVudCBvZiBhIGBNYXRBdXRvY29tcGxldGVgIGluc3RhbmNlLiAqL1xuICBzdGF0aWMgaG9zdFNlbGVjdG9yID0gJy5tYXQtbWRjLWF1dG9jb21wbGV0ZS10cmlnZ2VyJztcblxuICAvKipcbiAgICogR2V0cyBhIGBIYXJuZXNzUHJlZGljYXRlYCB0aGF0IGNhbiBiZSB1c2VkIHRvIHNlYXJjaCBmb3IgYW4gYXV0b2NvbXBsZXRlIHdpdGggc3BlY2lmaWNcbiAgICogYXR0cmlidXRlcy5cbiAgICogQHBhcmFtIG9wdGlvbnMgT3B0aW9ucyBmb3IgZmlsdGVyaW5nIHdoaWNoIGF1dG9jb21wbGV0ZSBpbnN0YW5jZXMgYXJlIGNvbnNpZGVyZWQgYSBtYXRjaC5cbiAgICogQHJldHVybiBhIGBIYXJuZXNzUHJlZGljYXRlYCBjb25maWd1cmVkIHdpdGggdGhlIGdpdmVuIG9wdGlvbnMuXG4gICAqL1xuICBzdGF0aWMgd2l0aDxUIGV4dGVuZHMgTWF0QXV0b2NvbXBsZXRlSGFybmVzcz4oXG4gICAgdGhpczogQ29tcG9uZW50SGFybmVzc0NvbnN0cnVjdG9yPFQ+LFxuICAgIG9wdGlvbnM6IEF1dG9jb21wbGV0ZUhhcm5lc3NGaWx0ZXJzID0ge30sXG4gICk6IEhhcm5lc3NQcmVkaWNhdGU8VD4ge1xuICAgIHJldHVybiBuZXcgSGFybmVzc1ByZWRpY2F0ZSh0aGlzLCBvcHRpb25zKVxuICAgICAgLmFkZE9wdGlvbigndmFsdWUnLCBvcHRpb25zLnZhbHVlLCAoaGFybmVzcywgdmFsdWUpID0+XG4gICAgICAgIEhhcm5lc3NQcmVkaWNhdGUuc3RyaW5nTWF0Y2hlcyhoYXJuZXNzLmdldFZhbHVlKCksIHZhbHVlKSxcbiAgICAgIClcbiAgICAgIC5hZGRPcHRpb24oJ2Rpc2FibGVkJywgb3B0aW9ucy5kaXNhYmxlZCwgYXN5bmMgKGhhcm5lc3MsIGRpc2FibGVkKSA9PiB7XG4gICAgICAgIHJldHVybiAoYXdhaXQgaGFybmVzcy5pc0Rpc2FibGVkKCkpID09PSBkaXNhYmxlZDtcbiAgICAgIH0pO1xuICB9XG59XG4iXX0=