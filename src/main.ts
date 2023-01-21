import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { KitchenFaucetRootModule } from './app/app.module';


function bootstrap() {
    platformBrowserDynamic().bootstrapModule(KitchenFaucetRootModule)
  .catch(err => console.error(err));
  };


 if (document.readyState === 'complete') {
   bootstrap();
 } else {
   document.addEventListener('DOMContentLoaded', bootstrap);
 }
 
