import {Component, isDevMode, NgModule} from '@angular/core';
import {BrowserModule, provideClientHydration} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ServiceWorkerModule} from '@angular/service-worker';

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
    ServiceWorkerModule.register('ngsw-worker.js', {
      // enabled: !isDevMode(),
      enabled: true,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
  providers: [provideClientHydration()],
})
export class KitchenFaucetRootModule {
}
