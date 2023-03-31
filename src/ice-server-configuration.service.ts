import { Injectable } from '@angular/core';
import { TenantOptionsService } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';

@Injectable({ providedIn: 'root' })
export class IceServerConfigurationService {
  private readonly configKey = 'iceservers';
  private readonly configCategory = 'webrtc';

  constructor(
    private options: TenantOptionsService,
    private alert: AlertService
  ) {}

  async getIceServers(): Promise<RTCIceServer[]> {
    let iceServers = new Array<RTCIceServer>();
    try {
      const { data } = await this.options.detail({
        category: this.configCategory,
        key: this.configKey,
      });
      const value = data.value;
      const parsedValue = JSON.parse(value);
      if (Array.isArray(parsedValue)) {
        iceServers = parsedValue;
      }
    } catch (e) {
      this.alert.add({
        text: 'Failed to retrieve WebRTC ICE server configuration, falling back to defaults',
        type: 'warning',
        timeout: 5000,
      });
    }

    if (!iceServers.length) {
      iceServers = [
        {
          urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
          ],
        },
      ];
    }

    return iceServers;
  }

  async setIceServers(servers: Array<RTCIceServer>): Promise<void> {
    await this.options.update({
      category: this.configCategory,
      key: this.configKey,
      value: JSON.stringify(servers),
    });
  }
}
