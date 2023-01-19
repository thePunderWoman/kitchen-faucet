import {Component, NgModule, ɵprovideHydrationSupport as provideHydrationSupport} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {KitchenSinkMdcModule} from './kitchen-sink-mdc/kitchen-sink-mdc';
import {KitchenSinkModule} from './kitchen-sink/kitchen-sink';

const isClient = typeof window !== 'undefined';
if (isClient) {
  (window as any).verifyAllNodesClaimedForHydration = function verifyAllNodesClaimedForHydration(el: any) {
    if (!el.__claimed) {
      throw new Error('Hydration error: the node is *not* hydrated: ' + el.outerHTML);
    }
    let current = el.firstChild;
    while (current) {
      verifyAllNodesClaimedForHydration(current);
      current = current.nextSibling;
    }
  }
}

@Component({
  selector: 'kitchen-sink-root',
  template: `
    <h1>Kitchen sink app</h1>
    <kitchen-sink></kitchen-sink>
    <kitchen-sink-mdc></kitchen-sink-mdc>
  `,
})
export class KitchenSinkRoot {}

@NgModule({
  declarations: [KitchenSinkRoot],
  exports: [KitchenSinkRoot],
  bootstrap: [KitchenSinkRoot],
    imports: [
    BrowserModule.withServerTransition({ appId: 'kitchen-faucet' }),
    KitchenSinkMdcModule,
    KitchenSinkModule,
    BrowserAnimationsModule,
  ],
  providers: [isClient ? provideHydrationSupport() : []],
})
export class KitchenSinkRootModule { }
