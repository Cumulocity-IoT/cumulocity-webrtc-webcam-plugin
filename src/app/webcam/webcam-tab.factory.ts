import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IManagedObject } from '@c8y/client';
import {
  ContextRouteService,
  ExtensionFactory,
  Tab,
  ViewContext,
} from '@c8y/ngx-components';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebcamTabFactory implements ExtensionFactory<Tab> {
  constructor(private contextRouteService: ContextRouteService) {}
  get(
    activatedRoute: ActivatedRoute
  ): Tab | Tab[] | Observable<Tab | Tab[]> | Promise<Tab | Tab[]> {
    const data = this.contextRouteService.getContextData(activatedRoute);
    if (!data) {
      return [];
    }
    const { context, contextData: device } = data;

    if (context !== ViewContext.Device || !this.supportsRemoteAccess(device as IManagedObject)) {
      return [];
    }

    const webcamEntries = this.extractRCAIdsFromDevice(device as IManagedObject);

    return webcamEntries.map(entry => {
        const label = entry.name.startsWith('webcam:') ? entry.name.replace('webcam:', '') : entry.name;
        return {
            label: label,
            path: `device/${device.id}/webrtc-webcam/${entry.id}`,
            icon: 'video-camera'
        };
    })
  }

  private supportsRemoteAccess(device: IManagedObject) {
    const { c8y_SupportedOperations: supportedOperations } = device;
    if (!supportedOperations || !Array.isArray(supportedOperations)) {
      return false;
    }
    if (!supportedOperations.includes('c8y_RemoteAccessConnect')) {
      return false;
    }

    return true;
  }

  private extractRCAIdsFromDevice(
    device: IManagedObject
  ): { name: string; id: string }[] {
    const { c8y_RemoteAccessList: remoteAccessList } = device;
    if (!remoteAccessList || !Array.isArray(remoteAccessList)) {
      return [];
    }

    const webcamEntries = remoteAccessList.filter(
      ({ name }) =>
        typeof name === 'string' && name.toLowerCase().includes('webcam')
    );

    return webcamEntries;
  }
}
