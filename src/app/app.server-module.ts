
import {NgModule} from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {ServerModule} from '@angular/platform-server';
import { KitchenFaucetRootModule, KitchenFaucetRoot } from './app.module';

@NgModule({
    imports: [KitchenFaucetRootModule, ServerModule, NoopAnimationsModule],
    bootstrap: [KitchenFaucetRoot],
  })
  export class KitchenFaucetRootServerModule {}
  