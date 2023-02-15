import {Component, NgModule} from '@angular/core';
import {BrowserModule, provideHydrationSupport} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {KitchenFaucetMdcModule} from './kitchen-faucet-mdc/kitchen-faucet-mdc';
import {KitchenFaucetModule} from './kitchen-faucet/kitchen-faucet';

@Component({
  selector: 'kitchen-faucet-root',
  template: `
    <h1>Kitchen faucet app</h1>
    <kitchen-faucet></kitchen-faucet>
    <kitchen-faucet-mdc></kitchen-faucet-mdc>
  `,
})
export class KitchenFaucetRoot {
}

@NgModule({
  declarations: [KitchenFaucetRoot],
  exports: [KitchenFaucetRoot],
  bootstrap: [KitchenFaucetRoot],
  imports: [
    BrowserModule.withServerTransition({appId: 'kitchen-faucet'}),
    KitchenFaucetMdcModule,
    KitchenFaucetModule,
    BrowserAnimationsModule,
  ],
  providers: [provideHydrationSupport()],
})
export class KitchenFaucetRootModule {
}
