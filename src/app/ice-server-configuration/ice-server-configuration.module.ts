import { NgModule } from '@angular/core';
import { IceServerConfigurationComponent } from './ice-server-configuration.component';
import { CoreModule, hookNavigator, hookRoute } from '@c8y/ngx-components';

@NgModule({
  imports: [CoreModule],
  declarations: [IceServerConfigurationComponent],
  providers: [
    hookRoute({
      path: 'webrtc-ice',
      component: IceServerConfigurationComponent,
    }),
    hookNavigator({
      label: 'WebRTC ICE Server',
      path: 'webrtc-ice',
      // parent: "Configuration",
      icon: 'video-camera',
    }),
  ],
})
export class IceServerConfigurationModule {}
