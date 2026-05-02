import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { initializeTheme } from './app/services/theme.service';

initializeTheme();

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(() => {});
