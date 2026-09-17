import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AppStateService } from '../../services/app-state.service';
import { BleService, DeviceInfoItem } from '../../services/ble.service';
import { ToastService } from '../../services/toast.service';
import { mergeUint8Arrays, stringToUint8Array } from '../../services/utils';

/**
 * Displays device information (battery, manufacturer, model, serial, firmware,
 * software, PnP ID) and allows renaming the scanner. Port of the original
 * InformationController.
 */
@Component({
  selector: 'app-information',
  templateUrl: './information.page.html',
  styleUrls: ['./information.page.scss']
})
export class InformationPage {
  deviceId = '';
  deviceinformation: DeviceInfoItem[] = [];
  newDeviceName = '';

  constructor(
    private route: ActivatedRoute,
    private state: AppStateService,
    private ble: BleService,
    private toast: ToastService
  ) {
    this.deviceId = this.route.snapshot.params['deviceId'];
  }

  async ionViewWillEnter(): Promise<void> {
    this.deviceinformation = [];

    this.deviceinformation.push({ name: 'App. version', value: this.state.appVersion });
    this.deviceinformation.push({ name: 'Name', value: this.state.currentDeviceName });

    try {
      const items = await this.ble.getDeviceInformation(this.deviceId);
      items.forEach((item) => {
        if (item.value !== "Can't get value") {
          this.deviceinformation.push(item);
        }
      });
    } catch (err) {
      this.state.log('getDeviceInformation error: ' + JSON.stringify(err));
    }
  }

  async changeDeviceName(): Promise<void> {
    const name = this.newDeviceName.trim();
    if (!name) {
      await this.toast.showShortCenter('Type a new name first');
      return;
    }
    const registerAddress = new Uint8Array(1);
    registerAddress[0] = 0x8e;
    const registerValues = stringToUint8Array(name);
    const payload = mergeUint8Arrays(registerAddress, registerValues);
    try {
      await this.ble.sendConfigCommand(this.deviceId, 0x0d, payload);
      await this.toast.showShortTop('Name changed with success');
      this.state.currentDeviceName = name;
    } catch (err) {
      this.state.log('changeDeviceName error: ' + JSON.stringify(err));
      await this.toast.showLongCenter('Error while sending rename command');
    }
  }
}