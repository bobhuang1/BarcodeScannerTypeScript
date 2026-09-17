import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AppStateService } from '../../services/app-state.service';
import { BleService } from '../../services/ble.service';
import { ToastService } from '../../services/toast.service';
import { booleanToColor, byteArrayToHexString } from '../../services/utils';

/**
 * Send low-level control commands to the scanner: play UI sequences, drive the
 * LEDs, the buzzer and the vibrator. Port of the original
 * ControlServiceController.
 */
@Component({
  selector: 'app-scanner-control',
  templateUrl: './scanner-control.page.html',
  styleUrls: ['./scanner-control.page.scss']
})
export class ScannerControlPage {
  device = { UUID: '' };

  controlService = {
    cmdCode: '0x00',
    ui_sequence: '0x01',

    ledsduration: 1,
    LedRfidRed: '0x01',
    LedRfidGreen: '0x01',
    LedRfidBlue: '0x01',
    LedPwrRed: '0x01',
    LedPwrGreen: '0x01',
    LedPwrBlue: '0x01',
    LedBluetooth: '0x01',

    buzzerduration: 6,
    buzzerfrequency: '0x00',

    vibratorduration: 1,
    vibratorfrequency: '0x00',
    vibratorrepeat: 1,
    pulsepattern: '0x00',
    decay: 1,

    // New mode for firmwares >= 1.44
    firmware144PowerDelai: 100,
    firmware144PowerRed: true,
    firmware144PowerGreen: true,
    firmware144PowerBlue: true,
    firmware144PowerMode: '0x01',

    firmware144ScanDelai: 100,
    firmware144ScanRed: true,
    firmware144ScanGreen: true,
    firmware144ScanBlue: true,
    firmware144ScanMode: '0x01',

    firmware144BleDelai: 100,
    firmware144BleBlue: true,
    firmware144BleMode: '0x01',

    controlServiceResult: ''
  };

  constructor(
    private route: ActivatedRoute,
    public state: AppStateService,
    private ble: BleService,
    private toast: ToastService
  ) {
    this.device.UUID = this.route.snapshot.params['deviceId'];
  }

  /** Build and send the 20-byte control command. */
  async sendControlService(): Promise<void> {
    const command = new Uint8Array(20);
    command[0] = parseInt(this.controlService.cmdCode, 16);

    switch (this.controlService.cmdCode) {
      case '0x90': // Play UI sequence
        command[1] = parseInt(this.controlService.ui_sequence, 16);
        break;

      case '0x91': // Drive LEDs
        if (this.state.isOlderThan144) {
          command[1] = parseInt(String(this.controlService.ledsduration), 10);
          command[2] = parseInt(this.controlService.LedRfidRed, 16);
          command[3] = parseInt(this.controlService.LedRfidGreen, 16);
          command[4] = parseInt(this.controlService.LedRfidBlue, 16);
          command[5] = parseInt(this.controlService.LedPwrRed, 16);
          command[6] = parseInt(this.controlService.LedPwrGreen, 16);
          command[7] = parseInt(this.controlService.LedPwrBlue, 16);
          command[8] = parseInt(this.controlService.LedBluetooth, 16);
        } else {
          command[1] = parseInt(String(this.controlService.firmware144PowerDelai), 10);
          command[2] = booleanToColor(this.controlService.firmware144PowerRed);
          command[3] = booleanToColor(this.controlService.firmware144PowerGreen);
          command[4] = booleanToColor(this.controlService.firmware144PowerBlue);
          command[5] = parseInt(this.controlService.firmware144PowerMode, 16);

          command[6] = parseInt(String(this.controlService.firmware144ScanDelai), 10);
          command[7] = booleanToColor(this.controlService.firmware144ScanRed);
          command[8] = booleanToColor(this.controlService.firmware144ScanGreen);
          command[9] = booleanToColor(this.controlService.firmware144ScanBlue);
          command[10] = parseInt(this.controlService.firmware144ScanMode, 16);

          command[11] = parseInt(String(this.controlService.firmware144BleDelai), 10);
          command[12] = booleanToColor(this.controlService.firmware144BleBlue);
          command[13] = parseInt(this.controlService.firmware144BleMode, 16);
        }
        break;

      case '0x92': // Drive buzzer
        command[1] = parseInt(String(this.controlService.buzzerduration), 10);
        command[2] = parseInt(this.controlService.buzzerfrequency, 16);
        break;

      case '0x94': // Drive vibrator
        const vibratorRepeat = parseInt(String(this.controlService.vibratorrepeat), 10);
        command[1] = vibratorRepeat;
        if (vibratorRepeat !== 255) {
          command[2] = parseInt(String(this.controlService.vibratorduration), 10);
          command[3] = parseInt(String(this.controlService.decay), 10);
        } else {
          command[2] = parseInt(this.controlService.pulsepattern, 16);
        }
        break;

      default:
        break;
    }

    // Display the final command bytes, then send it.
    this.controlService.controlServiceResult = byteArrayToHexString(command);
    try {
      await this.ble.sendControlCommand(this.device.UUID, command);
      await this.toast.showShortTop('Command sent with success');
    } catch (err) {
      this.state.log('sendControlService error: ' + JSON.stringify(err));
      await this.toast.showShortTop('Error while sending command');
    }
  }
}