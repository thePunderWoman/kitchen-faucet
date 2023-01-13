
import {NgModule} from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {ServerModule} from '@angular/platform-server';
import { KitchenSinkRootModule, KitchenSinkRoot } from './app.module';

@NgModule({
    imports: [KitchenSinkRootModule, ServerModule, NoopAnimationsModule],
    bootstrap: [KitchenSinkRoot],
  })
  export class KitchenSinkRootServerModule {}
  