import { NgModule } from '@angular/core';
import { WebcamComponent } from './webcam.component';
import {
  CoreModule,
  gettext,
  HOOK_ROUTE,
  ViewContext,
} from '@c8y/ngx-components';
import { WebcamGuard } from './webcam.guard';

@NgModule({
  imports: [CoreModule],
  declarations: [WebcamComponent],
  providers: [
    {
      provide: HOOK_ROUTE,
      useValue: {
        path: 'webcam',
        context: ViewContext.Device,
        component: WebcamComponent,
        canActivate: [WebcamGuard],
        label: gettext('Webcam'),
        priority: 0,
        icon: 'video-camera',
      },
      multi: true,
    },
  ],
})
export class WebcamPluginModule {}
