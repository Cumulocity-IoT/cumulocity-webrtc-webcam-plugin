import { NgModule } from '@angular/core';
import { WebcamComponent } from './webcam.component';
import {
  CoreModule,
  hookRoute,
  hookTab,
  ViewContext,
} from '@c8y/ngx-components';
import { WebcamTabFactory } from './webcam-tab.factory';

@NgModule({
  imports: [CoreModule],
  declarations: [WebcamComponent],
  providers: [
    hookTab(WebcamTabFactory),
    hookRoute({
      path: 'webrtc-webcam/:rcaId',
      context: ViewContext.Device,
      component: WebcamComponent,
      tabs: []
    }),
  ],
})
export class WebcamPluginModule {}
