/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ContentContainerComponentHarness, HarnessPredicate, } from '@angular/cdk/testing';
/** Harness for interacting with an MDC-based mat-card in tests. */
export class MatCardHarness extends ContentContainerComponentHarness {
    constructor() {
        super(...arguments);
        this._title = this.locatorForOptional('.mat-mdc-card-title');
        this._subtitle = this.locatorForOptional('.mat-mdc-card-subtitle');
    }
    /**
     * Gets a `HarnessPredicate` that can be used to search for a card with specific attributes.
     * @param options Options for filtering which card instances are considered a match.
     * @return a `HarnessPredicate` configured with the given options.
     */
    static with(options = {}) {
        return new HarnessPredicate(this, options)
            .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
            .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitleText(), title))
            .addOption('subtitle', options.subtitle, (harness, subtitle) => HarnessPredicate.stringMatches(harness.getSubtitleText(), subtitle));
    }
    /** Gets all of the card's content as text. */
    async getText() {
        return (await this.host()).text();
    }
    /** Gets the cards's title text. */
    async getTitleText() {
        return (await this._title())?.text() ?? '';
    }
    /** Gets the cards's subtitle text. */
    async getSubtitleText() {
        return (await this._subtitle())?.text() ?? '';
    }
}
/** The selector for the host element of a `MatCard` instance. */
MatCardHarness.hostSelector = '.mat-mdc-card';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZC1oYXJuZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21hdGVyaWFsL2NhcmQvdGVzdGluZy9jYXJkLWhhcm5lc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUVMLGdDQUFnQyxFQUNoQyxnQkFBZ0IsR0FDakIsTUFBTSxzQkFBc0IsQ0FBQztBQVc5QixtRUFBbUU7QUFDbkUsTUFBTSxPQUFPLGNBQWUsU0FBUSxnQ0FBZ0Q7SUFBcEY7O1FBeUJVLFdBQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUN4RCxjQUFTLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFnQnhFLENBQUM7SUF0Q0M7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxJQUFJLENBRVQsVUFBOEIsRUFBRTtRQUVoQyxPQUFPLElBQUksZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQzthQUN2QyxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FDakQsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FDeEQ7YUFDQSxTQUFTLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FDcEQsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FDOUQ7YUFDQSxTQUFTLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FDN0QsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FDcEUsQ0FBQztJQUNOLENBQUM7SUFLRCw4Q0FBOEM7SUFDOUMsS0FBSyxDQUFDLE9BQU87UUFDWCxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0lBRUQsbUNBQW1DO0lBQ25DLEtBQUssQ0FBQyxZQUFZO1FBQ2hCLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUM3QyxDQUFDO0lBRUQsc0NBQXNDO0lBQ3RDLEtBQUssQ0FBQyxlQUFlO1FBQ25CLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUNoRCxDQUFDOztBQXhDRCxpRUFBaUU7QUFDMUQsMkJBQVksR0FBRyxlQUFlLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgQ29tcG9uZW50SGFybmVzc0NvbnN0cnVjdG9yLFxuICBDb250ZW50Q29udGFpbmVyQ29tcG9uZW50SGFybmVzcyxcbiAgSGFybmVzc1ByZWRpY2F0ZSxcbn0gZnJvbSAnQGFuZ3VsYXIvY2RrL3Rlc3RpbmcnO1xuaW1wb3J0IHtDYXJkSGFybmVzc0ZpbHRlcnN9IGZyb20gJy4vY2FyZC1oYXJuZXNzLWZpbHRlcnMnO1xuXG4vKiogU2VsZWN0b3JzIGZvciBkaWZmZXJlbnQgc2VjdGlvbnMgb2YgdGhlIG1hdC1jYXJkIHRoYXQgY2FuIGNvbnRhaW5lciB1c2VyIGNvbnRlbnQuICovXG5leHBvcnQgY29uc3QgZW51bSBNYXRDYXJkU2VjdGlvbiB7XG4gIEhFQURFUiA9ICcubWF0LW1kYy1jYXJkLWhlYWRlcicsXG4gIENPTlRFTlQgPSAnLm1hdC1tZGMtY2FyZC1jb250ZW50JyxcbiAgQUNUSU9OUyA9ICcubWF0LW1kYy1jYXJkLWFjdGlvbnMnLFxuICBGT09URVIgPSAnLm1hdC1tZGMtY2FyZC1mb290ZXInLFxufVxuXG4vKiogSGFybmVzcyBmb3IgaW50ZXJhY3Rpbmcgd2l0aCBhbiBNREMtYmFzZWQgbWF0LWNhcmQgaW4gdGVzdHMuICovXG5leHBvcnQgY2xhc3MgTWF0Q2FyZEhhcm5lc3MgZXh0ZW5kcyBDb250ZW50Q29udGFpbmVyQ29tcG9uZW50SGFybmVzczxNYXRDYXJkU2VjdGlvbj4ge1xuICAvKiogVGhlIHNlbGVjdG9yIGZvciB0aGUgaG9zdCBlbGVtZW50IG9mIGEgYE1hdENhcmRgIGluc3RhbmNlLiAqL1xuICBzdGF0aWMgaG9zdFNlbGVjdG9yID0gJy5tYXQtbWRjLWNhcmQnO1xuXG4gIC8qKlxuICAgKiBHZXRzIGEgYEhhcm5lc3NQcmVkaWNhdGVgIHRoYXQgY2FuIGJlIHVzZWQgdG8gc2VhcmNoIGZvciBhIGNhcmQgd2l0aCBzcGVjaWZpYyBhdHRyaWJ1dGVzLlxuICAgKiBAcGFyYW0gb3B0aW9ucyBPcHRpb25zIGZvciBmaWx0ZXJpbmcgd2hpY2ggY2FyZCBpbnN0YW5jZXMgYXJlIGNvbnNpZGVyZWQgYSBtYXRjaC5cbiAgICogQHJldHVybiBhIGBIYXJuZXNzUHJlZGljYXRlYCBjb25maWd1cmVkIHdpdGggdGhlIGdpdmVuIG9wdGlvbnMuXG4gICAqL1xuICBzdGF0aWMgd2l0aDxUIGV4dGVuZHMgTWF0Q2FyZEhhcm5lc3M+KFxuICAgIHRoaXM6IENvbXBvbmVudEhhcm5lc3NDb25zdHJ1Y3RvcjxUPixcbiAgICBvcHRpb25zOiBDYXJkSGFybmVzc0ZpbHRlcnMgPSB7fSxcbiAgKTogSGFybmVzc1ByZWRpY2F0ZTxUPiB7XG4gICAgcmV0dXJuIG5ldyBIYXJuZXNzUHJlZGljYXRlKHRoaXMsIG9wdGlvbnMpXG4gICAgICAuYWRkT3B0aW9uKCd0ZXh0Jywgb3B0aW9ucy50ZXh0LCAoaGFybmVzcywgdGV4dCkgPT5cbiAgICAgICAgSGFybmVzc1ByZWRpY2F0ZS5zdHJpbmdNYXRjaGVzKGhhcm5lc3MuZ2V0VGV4dCgpLCB0ZXh0KSxcbiAgICAgIClcbiAgICAgIC5hZGRPcHRpb24oJ3RpdGxlJywgb3B0aW9ucy50aXRsZSwgKGhhcm5lc3MsIHRpdGxlKSA9PlxuICAgICAgICBIYXJuZXNzUHJlZGljYXRlLnN0cmluZ01hdGNoZXMoaGFybmVzcy5nZXRUaXRsZVRleHQoKSwgdGl0bGUpLFxuICAgICAgKVxuICAgICAgLmFkZE9wdGlvbignc3VidGl0bGUnLCBvcHRpb25zLnN1YnRpdGxlLCAoaGFybmVzcywgc3VidGl0bGUpID0+XG4gICAgICAgIEhhcm5lc3NQcmVkaWNhdGUuc3RyaW5nTWF0Y2hlcyhoYXJuZXNzLmdldFN1YnRpdGxlVGV4dCgpLCBzdWJ0aXRsZSksXG4gICAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBfdGl0bGUgPSB0aGlzLmxvY2F0b3JGb3JPcHRpb25hbCgnLm1hdC1tZGMtY2FyZC10aXRsZScpO1xuICBwcml2YXRlIF9zdWJ0aXRsZSA9IHRoaXMubG9jYXRvckZvck9wdGlvbmFsKCcubWF0LW1kYy1jYXJkLXN1YnRpdGxlJyk7XG5cbiAgLyoqIEdldHMgYWxsIG9mIHRoZSBjYXJkJ3MgY29udGVudCBhcyB0ZXh0LiAqL1xuICBhc3luYyBnZXRUZXh0KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLmhvc3QoKSkudGV4dCgpO1xuICB9XG5cbiAgLyoqIEdldHMgdGhlIGNhcmRzJ3MgdGl0bGUgdGV4dC4gKi9cbiAgYXN5bmMgZ2V0VGl0bGVUZXh0KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLl90aXRsZSgpKT8udGV4dCgpID8/ICcnO1xuICB9XG5cbiAgLyoqIEdldHMgdGhlIGNhcmRzJ3Mgc3VidGl0bGUgdGV4dC4gKi9cbiAgYXN5bmMgZ2V0U3VidGl0bGVUZXh0KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLl9zdWJ0aXRsZSgpKT8udGV4dCgpID8/ICcnO1xuICB9XG59XG4iXX0=