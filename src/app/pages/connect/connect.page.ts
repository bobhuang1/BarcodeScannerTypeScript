import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AppStateService } from '../../services/app-state.service';
import { SettingsService } from '../../services/settings.service';
import { BleService, ConnectionStatus } from '../../services/ble.service';
import { ScannerDataService, ScannedData } from '../../services/scanner-data.service';
import { ToastService } from '../../services/toast.service';

/**
 * Connect page: connects to a scanner over BLE and displays the live scanned
 * data (barcode / NFC / raw frames), with single/auto shooting, wink and
 * shortcuts to Information, Scanner control and Configuration.
 *
 * Port of the original ConnectController.
 */
@Component({
  selector: 'app-connect',
  templateUrl: './connect.page.html',
  styleUrls: ['./connect.page.scss']
})
export class ConnectPage implements OnDestroy {
  device = { UUID: '', name: '' };
  statusText = 'Ready';
  statusClass = '';
  scanValue = '';
  cardTypeValue = '';
  history: string[] = [];
  modeSingleAuto: 'Auto' | 'Single' = 'Auto';
  singleScanDisabled = true;
  winkDisabled = true;
  keepConnection = false;

  private deviceId = '';
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private state: AppStateService,
    private settings: SettingsService,
    private ble: BleService,
    private scannerData: ScannerDataService,
    private toast: ToastService
  ) {
    this.deviceId = this.route.snapshot.params['deviceId'];
    this.device.UUID = this.deviceId;
    this.device.name = this.state.scannedDevices[this.deviceId] ?? 'Scanner';
    this.state.currentDeviceName = this.device.name;

    this.subscriptions.push(
      this.ble.onConnectionStatus.subscribe((status: ConnectionStatus) => {
        this.statusText = status.message;
        this.statusClass = status.level === 'ok' ? 'status-ok' : status.level === 'ko' ? 'status-ko' : '';
      }),
      this.scannerData.onData.subscribe((data: ScannedData) => {
        this.onScannerData(data);
      }),
      this.ble.onDisconnected.subscribe(() => {
        this.singleScanDisabled = true;
        this.winkDisabled = true;
      })
    );
  }

  async ionViewWillEnter(): Promise<void> {
    this.keepConnection = false;

    const alreadyConnected = await this.ble.isDeviceConnected(this.deviceId);

    if (alreadyConnected) {
      // Coming back from Information / Scanner control / Configuration.
      this.singleScanDisabled = false;
      this.winkDisabled = false;
      await this.ble.startNotificationOnRfidScannerData(this.deviceId);
      return;
    }

    await this.connect();
  }

  async ionViewWillLeave(): Promise<void> {
    if (!this.keepConnection) {
      await this.ble.disconnectFromDevice(this.deviceId);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private async connect(): Promise<void> {
    try {
      await this.ble.connectTo(this.deviceId);
    } catch (err) {
      this.state.log('Connect error: ' + JSON.stringify(err));
      this.statusText = 'Connection error with the scanner';
      this.statusClass = 'status-ko';
      await this.toast.showShortTop('Connection failed. Please try again immediately afterwards.');
      return;
    }

    const firstTime = !this.settings.getBool(this.deviceId, false);
    if (firstTime) {
      this.settings.saveBool(this.deviceId, true);
      await this.toast.showShortCenter(
        "It seems that you're connecting this scanner for the first time. If it fails, please try again immediately afterwards."
      );
    }

    this.singleScanDisabled = false;
    this.winkDisabled = false;

    // Small delay lets the peripheral settle before the first GATT calls.
    setTimeout(() => {
      void this.prepareScannerDataNotifications();
    }, 500);
  }

  /** Read the firmware version then switch the scanner to RFID mode (cmd 0xAE). */
  private async prepareScannerDataNotifications(): Promise<void> {
    try {
      await this.ble.isFirmwareOlderThan144(this.deviceId);

      const payload = new Uint8Array(1);
      payload[0] = 0x07;
      await this.ble.sendConfigCommand(this.deviceId, 0xae, payload);

      await this.ble.startNotificationOnRfidScannerData(this.deviceId);
    } catch (err) {
      this.state.log('prepareScannerDataNotifications error: ' + JSON.stringify(err));
      await this.toast.showShortTop('Error while activating notifications');
    }
  }

  private onScannerData(data: ScannedData): void {
    if (this.scanValue.trim() !== '') {
      this.history.unshift(this.scanValue);
      if (this.history.length > 50) {
        this.history.pop();
      }
    }
    this.cardTypeValue = data.cardType;
    this.scanValue = data.text;

    void this.ble.sendKeepAlive(this.deviceId);
  }

  // -------------------------------------------------------------------------
  // Scanner control commands
  // -------------------------------------------------------------------------

  singleScan(): void {
    void this.sendControl(this.modeSingleAuto === 'Auto' ? 0xa1 : 0xa0);
  }

  doWink(): void {
    void this.sendControl(0x9f);
  }

  toggleAutoSingle(): void {
    if (this.modeSingleAuto === 'Auto') {
      // Currently Auto -> switch to Single
      void this.sendControl(0xa3);
      this.modeSingleAuto = 'Single';
      this.singleScanDisabled = false;
    } else {
      // Currently Single -> switch to Auto
      void this.sendControl(0xa0);
      this.modeSingleAuto = 'Auto';
    }
  }

  private async sendControl(cmd: number): Promise<void> {
    const command = new Uint8Array(20);
    command[0] = cmd;
    try {
      await this.ble.sendControlCommand(this.deviceId, command);
      await this.toast.showShortTop('Command sent with success');
    } catch (err) {
      this.state.log('sendControl error: ' + JSON.stringify(err));
      await this.toast.showShortTop('Error while sending command');
    }
  }

  // -------------------------------------------------------------------------
  // Navigation (keeps the connection alive)
  // -------------------------------------------------------------------------

  displayPeripheralInformation(): void {
    this.keepConnection = true;
    this.router.navigate(['/information', this.deviceId]);
  }

  sendCommands(): void {
    this.keepConnection = true;
    this.router.navigate(['/scanner-control', this.deviceId]);
  }

  configureDevice(): void {
    this.keepConnection = true;
    this.router.navigate(['/configure', this.deviceId]);
  }

  multiConf(): void {
    this.keepConnection = true;
    this.router.navigate(['/multiconf', this.deviceId]);
  }
}