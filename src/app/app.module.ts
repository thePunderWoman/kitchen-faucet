import {Component, NgModule, ɵprovideHydrationSupport as provideHydrationSupport} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {KitchenFaucetMdcModule} from './kitchen-faucet-mdc/kitchen-faucet-mdc';
import {KitchenFaucetModule} from './kitchen-faucet/kitchen-faucet';

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
  selector: 'kitchen-faucet-root',
  template: `
    <h1>Kitchen faucet app</h1>
    <!-- <kitchen-faucet></kitchen-faucet> -->
    <kitchen-faucet-mdc></kitchen-faucet-mdc>
  `,
})
export class KitchenFaucetRoot {}

@NgModule({
  declarations: [KitchenFaucetRoot],
  exports: [KitchenFaucetRoot],
  bootstrap: [KitchenFaucetRoot],
    imports: [
    BrowserModule.withServerTransition({ appId: 'kitchen-faucet' }),
    KitchenFaucetMdcModule,
    KitchenFaucetModule,
    BrowserAnimationsModule,
  ],
  providers: [isClient ? provideHydrationSupport() : []],
})
export class KitchenFaucetRootModule { }
