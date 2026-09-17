import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AppStateService } from '../../services/app-state.service';
import { BleService } from '../../services/ble.service';
import { BlocksService } from '../../services/blocks.service';
import { ToastService } from '../../services/toast.service';
import {
  booleanToColor,
  byteArrayToHexString,
  hexStringToUint8Array,
  mergeUint8Arrays,
  stringToUint8Array
} from '../../services/utils';

/**
 * Full configuration screen. Port of the original ConfigureController:
 *  - read / write single registers
 *  - factory reset and bonding removal
 *  - BLE and RF test modes
 *  - play UI sequence, drive LEDs / buzzer / vibrator
 *  - push temporary configuration and reset the MCU
 * Answers coming from the configuration characteristic are displayed raw.
 */
@Component({
  selector: 'app-configure',
  templateUrl: './configure.page.html',
  styleUrls: ['./configure.page.scss']
})
export class ConfigurePage implements OnDestroy {
  device = { UUID: '' };

  configService = {
    cmdCode: '0x00',

    register_address_read: '0x00',
    register_address_write: '0x00',
    register_value_write: '0x00',

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

    ble_test: '0x00',
    rf_test: '0x00',

    configServiceResult: '',
    configServiceResponse: ''
  };

  canSendConfig = false;

  constructor(
    private route: ActivatedRoute,
    public state: AppStateService,
    private ble: BleService,
    private blocks: BlocksService,
    private toast: ToastService
  ) {
    this.device.UUID = this.route.snapshot.params['deviceId'];
  }

  async ionViewWillEnter(): Promise<void> {
    this.canSendConfig = false;
    try {
      await this.ble.startNotifyConfigService(this.device.UUID, (data) => {
        this.onConfigServiceNotification(data);
      });
      this.canSendConfig = true;
    } catch (err) {
      this.state.log('startNotifyConfigService error: ' + JSON.stringify(err));
      await this.toast.showShortTop('Error while subscribing to the configuration service');
    }
  }

  async ionViewWillLeave(): Promise<void> {
    try {
      await this.ble.endNotifyConfigService(this.device.UUID);
    } catch (err) {
      this.state.log('endNotifyConfigService error: ' + JSON.stringify(err));
    }
  }

  ngOnDestroy(): void {
    this.canSendConfig = false;
  }

  /** Append incoming configuration answers to the response display. */
  private onConfigServiceNotification(data: Uint8Array): void {
    this.state.log('Config notification: 0x' + byteArrayToHexString(data));
    this.configService.configServiceResponse += byteArrayToHexString(data) + '\n';
    if (this.blocks.isConfigurationAnswerSuccessful(data)) {
      void this.toast.showShortTop('Configuration command successful');
    }
  }

  /** Build the payload for the selected command code. */
  private buildPayload(): Uint8Array {
    const cfg = this.configService;
    let payload = new Uint8Array(0);

    const append = (value: Uint8Array): void => {
      payload = mergeUint8Arrays(payload, value);
    };

    const oneByte = (value: number): Uint8Array => {
      const b = new Uint8Array(1);
      b[0] = value;
      return b;
    };

    switch (cfg.cmdCode) {
      case '0x0D': {
        // Write a register: [address, value...]. Hex values are sent as raw
        // bytes, anything else as raw ASCII text (same rule as multi-conf).
        const value = cfg.register_value_write.trim();
        const valueBytes = /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0
          ? hexStringToUint8Array(value)
          : stringToUint8Array(value);
        append(oneByte(parseInt(cfg.register_address_write, 16)));
        append(valueBytes);
        break;
      }
      case '0x0E': {
        // Read a register: [address]
        append(oneByte(parseInt(cfg.register_address_read, 16)));
        break;
      }
      case '0x14':
      case '0x18': // BLE test
        append(oneByte(parseInt(cfg.ble_test, 16)));
        break;
      case '0x15':
      case '0x19': // RF test
        append(oneByte(parseInt(cfg.rf_test, 16)));
        break;
      case '0x90': // Play UI sequence
        append(oneByte(parseInt(cfg.ui_sequence, 16)));
        break;
      case '0x91': // Drive LEDs
        if (this.state.isOlderThan144) {
          append(oneByte(cfg.ledsduration));
          append(oneByte(parseInt(cfg.LedRfidRed, 16)));
          append(oneByte(parseInt(cfg.LedRfidGreen, 16)));
          append(oneByte(parseInt(cfg.LedRfidBlue, 16)));
          append(oneByte(parseInt(cfg.LedPwrRed, 16)));
          append(oneByte(parseInt(cfg.LedPwrGreen, 16)));
          append(oneByte(parseInt(cfg.LedPwrBlue, 16)));
          append(oneByte(parseInt(cfg.LedBluetooth, 16)));
        } else {
          append(oneByte(cfg.firmware144PowerDelai));
          append(oneByte(booleanToColor(cfg.firmware144PowerRed)));
          append(oneByte(booleanToColor(cfg.firmware144PowerGreen)));
          append(oneByte(booleanToColor(cfg.firmware144PowerBlue)));
          append(oneByte(parseInt(cfg.firmware144PowerMode, 16)));

          append(oneByte(cfg.firmware144ScanDelai));
          append(oneByte(booleanToColor(cfg.firmware144ScanRed)));
          append(oneByte(booleanToColor(cfg.firmware144ScanGreen)));
          append(oneByte(booleanToColor(cfg.firmware144ScanBlue)));
          append(oneByte(parseInt(cfg.firmware144ScanMode, 16)));

          append(oneByte(cfg.firmware144BleDelai));
          append(oneByte(booleanToColor(cfg.firmware144BleBlue)));
          append(oneByte(parseInt(cfg.firmware144BleMode, 16)));
        }
        break;
      case '0x92': // Drive buzzer
        append(oneByte(cfg.buzzerduration));
        append(oneByte(parseInt(cfg.buzzerfrequency, 16)));
        break;
      case '0x94': // Drive vibrator
        append(oneByte(cfg.vibratorrepeat));
        if (cfg.vibratorrepeat !== 255) {
          append(oneByte(cfg.vibratorduration));
          append(oneByte(cfg.decay));
        } else {
          append(oneByte(parseInt(cfg.pulsepattern, 16)));
        }
        break;

      // Special reset commands, all share the 0x0F command code.
      case '0x0F2':
      case '0x0F':
      case '0x0F1':
        append(hexStringToUint8Array(
          cfg.cmdCode === '0x0F2' ? 'FEEDFADA' :
          cfg.cmdCode === '0x0F' ? 'FEDAFAED' :
          'DAFAEDFE'
        ));
        break;
      default:
        break;
    }

    return payload;
  }

  /** Resolve the command code actually sent on the wire. */
  private commandCode(): number {
    switch (this.configService.cmdCode) {
      case '0x0F2':
      case '0x0F':
      case '0x0F1':
        return 0x0f;
      default:
        return parseInt(this.configService.cmdCode, 16);
    }
  }

  /** Send the selected configuration command to the scanner. */
  async sendConfigService(): Promise<void> {
    const command = this.commandCode();
    const payload = this.buildPayload();

    // Display the encoded blocks before sending them.
    const blocks = this.blocks.getBlocks(payload, command);
    this.configService.configServiceResult = blocks
      .map((block) => byteArrayToHexString(block))
      .join(' ');

    try {
      await this.ble.sendConfigCommand(this.device.UUID, command, payload);
      await this.toast.showShortTop('Configuration command sent');
    } catch (err) {
      this.state.log('sendConfigService error: ' + JSON.stringify(err));
      await this.toast.showShortTop('Error while sending configuration command');
    }
  }

  clearResponse(): void {
    this.configService.configServiceResponse = '';
    this.configService.configServiceResult = '';
  }
}