import { Component, OnInit } from '@angular/core';
import { AlertService, gettext } from '@c8y/ngx-components';
import { IceServerConfigurationService } from '../ice-server-configuration.service';

@Component({
  selector: 'app-ice-server-configuration',
  templateUrl: './ice-server-configuration.component.html',
  standalone: false
})
export class IceServerConfigurationComponent implements OnInit {
  config = '';
  parseable = false;

  constructor(
    private iceConfig: IceServerConfigurationService,
    private alert: AlertService
  ) {}

  async ngOnInit() {
    const servers = await this.iceConfig.getIceServers();
    this.config = JSON.stringify(servers, undefined, 2);
    this.parseable = true;
  }

  changes(config: string) {
    this.config = config;
    console.log(config);
    try {
      JSON.parse(config);
      this.parseable = true;
    } catch (e) {
      console.log(e);
      this.parseable = false;
    }
  }

  async save() {
    let config: RTCIceServer[];
    try {
      config = JSON.parse(this.config);
    } catch (e) {
      this.alert.warning(gettext(`Configuration is no valid JSON.`));
      return;
    }
    if (!config?.length) {
      this.alert.warning(
        gettext(`Configuration should at least contain a single server.`)
      );
    }
    try {
      await this.iceConfig.setIceServers(config);
      this.alert.saveSuccess(gettext('Configuration saved.'));
      this.config = JSON.stringify(config, undefined, 2);
    } catch (e) {
      this.alert.danger('Failed to save configuration.');
    }
  }
}
