import { NgModule } from "@angular/core";
import { IceServerConfigurationComponent } from "./ice-server-configuration.component";
import {
  CoreModule,
  HOOK_NAVIGATOR_NODES,
  HOOK_ROUTE,
  NavigatorNodeData,
  Route,
} from "@c8y/ngx-components";

@NgModule({
  imports: [CoreModule],
  declarations: [IceServerConfigurationComponent],
  providers: [
    {
      provide: HOOK_ROUTE,
      useValue: {
        path: "webrtc-ice",
        component: IceServerConfigurationComponent,
      } as Route,
      multi: true,
    },
    {
      provide: HOOK_NAVIGATOR_NODES,
      useValue: {
        label: "WebRTC ICE Server",
        path: "webrtc-ice",
        // parent: "Configuration",
        icon: "video-camera",
      } as NavigatorNodeData,
      multi: true,
    },
  ],
})
export class IceServerConfigurationModule {}
