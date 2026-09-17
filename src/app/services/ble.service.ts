import { Injectable } from '@angular/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Haptics } from '@capacitor/haptics';
import { Subject } from 'rxjs';

import { AppStateService } from './app-state.service';
import { LoggerService } from './logger.service';
import { BlocksService } from './blocks.service';
import { ScannerDataService } from './scanner-data.service';
import {
  byteArrayToHexString,
  fromByteArrayToString,
  stringVersionToIntVersion
} from './utils';

export interface DeviceInfoItem {
  name: string;
  value: string;
}

/** Status emitted on the connection-state channel. */
export interface ConnectionStatus {
  message: string;
  /** 'info' while working, 'ok' when connected, 'ko' on error. */
  level: 'info' | 'ok' | 'ko';
}

/** One entry of the scan list shown on the Home page. */
export interface FoundDevice {
  id: string;
  name: string;
  rssi: number;
  rssiPercent: number;
}

import type { ScanResult } from '@capacitor-community/bluetooth-le';

// ---------------------------------------------------------------------------
// GATT profiles (kept identical to the original app / firmware documentation)
// ---------------------------------------------------------------------------
const GATT_SCANNER_SERVICE = '6CB501B7-96F6-4EEF-ACB1-D7535F153CF0';
const GATT_SCANNER_DATA = 'CE3E81B8-D871-4613-BA78-5FFC0B1520A6';
const GATT_SCANNER_CONTROL = '833A2364-BCA0-4647-8113-478E1FC449BA';

const GATT_CONFIG_SERVICE = '7A4385C9-F7C7-4E22-9AFD-16D68FC588CA';
const GATT_CONFIG_CHARACTERISTIC = '1254FC72-336E-4BB2-A0A8-71C7D28D73CE';

const GATT_BATTERY_SERVICE = '180F';
const GATT_BATTERY_CHARACTERISTIC = '2A19';

const GATT_DEVICE_INFO_SERVICE = '180A';
const GATT_DEVICE_INFO = {
  manufactureName: '2A29',
  modelNumber: '2A24',
  serialNumber: '2A25',
  pnpId: '2A50',
  firmwareRevision: '2A26',
  softwareRevision: '2A28'
};

/**
 * BLE transport over @capacitor-community/bluetooth-le.
 *
 * This service is a straight port of the original BleService factory: it
 * keeps the same high-level API (connect / disconnect, config commands,
 * control commands, notifications, device information) and the same GATT
 * profile, so swapping back to cordova-plugin-ble-central is trivial.
 */
@Injectable()
export class BleService {
  /** Fired at each scan result while the Home page listens. */
  onDeviceFound: Subject<FoundDevice> = new Subject<FoundDevice>();

  /** Connection status, consumed by the Connect page. */
  onConnectionStatus: Subject<ConnectionStatus> = new Subject<ConnectionStatus>();

  /** Fired when the peripheral drops the connection unexpectedly. */
  onDisconnected: Subject<string> = new Subject<string>();

  private isConnected = false;
  private currentDeviceId = '';

  constructor(
    private state: AppStateService,
    private logger: LoggerService,
    private blocks: BlocksService,
    private scannerData: ScannerDataService
  ) {}

  get connected(): boolean {
    return this.isConnected;
  }

  get deviceId(): string {
    return this.currentDeviceId;
  }

  private status(message: string, level: ConnectionStatus['level']): void {
    this.onConnectionStatus.next({ message, level });
    this.logger.d('BLE status: ' + message);
  }

  // -------------------------------------------------------------------------
  // Lifecycle helpers
  // -------------------------------------------------------------------------

  async initialize(): Promise<void> {
    this.logger.d('BleService.initialize()');
    await BleClient.initialize();
  }

  /** Make sure Bluetooth is available (Android shows the permission flow). */
  async ensureBluetooth(): Promise<void> {
    this.logger.d('BleService.ensureBluetooth()');
    const enabled = await BleClient.isEnabled();
    if (!enabled) {
      await BleClient.enable();
    }
  }

  // -------------------------------------------------------------------------
  // Scanning
  // -------------------------------------------------------------------------

  /**
   * Scan for a short period, collect results, then stop.
   * Scans for the scanner service UUID; the found devices are emitted through
   * onDeviceFound.
   */
  async startScan(durationSeconds = this.state.scanDuration): Promise<void> {
    this.logger.d('BleService.startScan()');
    this.state.isScanning = true;

    await BleClient.requestLEScan(
      {
        services: [GATT_SCANNER_SERVICE],
        allowDuplicates: false
      },
      (result: ScanResult) => {
        this.logger.d('device found: ' + this.getDeviceNameFromAdvertisingData(result));
        const name = this.getDeviceNameFromAdvertisingData(result);
        this.onDeviceFound.next({
          id: result.deviceId,
          name,
          rssi: result.rssi,
          rssiPercent: this.rssiToPercent(result.rssi)
        });
        this.state.scannedDevices[result.deviceId] = name;
      }
    );

    // Stop the scan after the requested duration.
    setTimeout(() => {
      if (this.state.isScanning) {
        this.stopScan();
      }
    }, durationSeconds * 1000);
  }

  async stopScan(): Promise<void> {
    this.logger.d('BleService.stopScan()');
    this.state.isScanning = false;
    try {
      await BleClient.stopLEScan();
    } catch (err) {
      this.logger.do(err);
    }
  }

  private rssiToPercent(rssi: number): number {
    const abs = Math.abs(rssi);
    if (abs > 95) {
      return 0;
    }
    if (abs <= 30) {
      return 100;
    }
    return Math.round(100 - (abs - 30));
  }

  /**
   * Extract the scanner's friendly name from the plugin scan result.
   * Handles both the Android and the iOS advertising shapes.
   */
  getDeviceNameFromAdvertisingData(result: ScanResult): string {
    const advertisement = (result.advertisement ?? {}) as Record<string, unknown>;
    const localName =
      result.localName ||
      result.name ||
      (advertisement['kCBAdvDataLocalName'] as string | undefined) ||
      (advertisement['localName'] as string | undefined) ||
      '';
    return localName ? String(localName).trim() : 'Name not found';
  }

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  /** Connect to a peripheral and prepare the scanner-data notifications. */
  async connectTo(deviceId: string): Promise<void> {
    this.logger.d('BleService.connectTo()');
    if (this.state.doVibrate) {
      Haptics.vibrate().catch(() => undefined);
    }

    this.currentDeviceId = deviceId;
    this.state.isScanning = false;

    this.status('Connecting to device', 'info');
    await BleClient.connect(deviceId, (id) => {
      this.isConnected = false;
      this.logger.d('Peripheral disconnected: ' + id);
      this.status('Disconnected from peripheral', 'ko');
      this.onDisconnected.next(id);
    });

    this.isConnected = true;
    this.status('Connected to peripheral', 'ok');
  }

  async disconnectFromDevice(deviceId: string): Promise<void> {
    this.logger.d('BleService.disconnectFromDevice()');
    this.isConnected = false;
    try {
      await BleClient.disconnect(deviceId);
      this.status('Disconnected with success', 'ok');
    } catch (err) {
      this.logger.do(err);
      this.status('Problem while disconnecting', 'ko');
    }
  }

  async isDeviceConnected(deviceId: string): Promise<boolean> {
    try {
      return await BleClient.isConnected(deviceId);
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Notifications for the scanner (barcode / NFC / raw frames)
  // -------------------------------------------------------------------------

  /** Start receiving frames on the scanner data characteristic. */
  async startNotificationOnRfidScannerData(deviceId: string): Promise<void> {
    this.logger.d('BleService.startNotificationOnRfidScannerData()');
    if (!this.isConnected) {
      throw new Error('Not connected');
    }
    await BleClient.startNotification(
      deviceId,
      GATT_SCANNER_SERVICE,
      GATT_SCANNER_DATA,
      (value: DataView) => {
        this.scannerData.onDataFromPeripheral(this.dataViewToUint8Array(value));
      }
    );
  }

  async endNotifyRfidScannerData(deviceId: string): Promise<void> {
    this.logger.d('BleService.endNotifyRfidScannerData()');
    await BleClient.stopNotification(deviceId, GATT_SCANNER_SERVICE, GATT_SCANNER_DATA);
  }

  // -------------------------------------------------------------------------
  // Device configuration service
  // -------------------------------------------------------------------------

  /**
   * Send a configuration command to the peripheral.
   * The payload is split into blocks and each block is written sequentially.
   */
  async sendConfigCommand(deviceId: string, command: number, payload: Uint8Array): Promise<void> {
    this.logger.d('BleService.sendConfigCommand()');
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    const blocksToSend = this.blocks.getBlocks(payload, command);
    for (const block of blocksToSend) {
      this.logger.d('    config data sent: 0x' + byteArrayToHexString(block));
      await BleClient.write(
        deviceId,
        GATT_CONFIG_SERVICE,
        GATT_CONFIG_CHARACTERISTIC,
        this.uint8ArrayToDataView(block),
        'ack'
      );
    }
  }

  /** Subscribe to the configuration service answer channel. */
  async startNotifyConfigService(
    deviceId: string,
    onData: (data: Uint8Array) => void
  ): Promise<void> {
    this.logger.d('BleService.startNotifyConfigService()');
    if (!this.isConnected) {
      throw new Error('Not connected');
    }
    await BleClient.startNotification(
      deviceId,
      GATT_CONFIG_SERVICE,
      GATT_CONFIG_CHARACTERISTIC,
      (value: DataView) => {
        onData(this.dataViewToUint8Array(value));
      }
    );
  }

  /** Stop the configuration service answer channel. */
  async endNotifyConfigService(deviceId: string): Promise<void> {
    this.logger.d('BleService.endNotifyConfigService()');
    await BleClient.stopNotification(deviceId, GATT_CONFIG_SERVICE, GATT_CONFIG_CHARACTERISTIC);
  }

  // -------------------------------------------------------------------------
  // Scanner control service
  // -------------------------------------------------------------------------

  /**
   * Send a control command. `command` is a 20-byte buffer whose first byte is
   * the command code (some commands use the following bytes as parameters).
   */
  async sendControlCommand(deviceId: string, command: Uint8Array): Promise<void> {
    this.logger.d('BleService.sendControlCommand()');
    if (!this.isConnected) {
      throw new Error('Not connected');
    }
    this.logger.d('    data sent: 0x' + byteArrayToHexString(command));
    await BleClient.write(
      deviceId,
      GATT_SCANNER_SERVICE,
      GATT_SCANNER_CONTROL,
      this.uint8ArrayToDataView(command),
      'ack'
    );
  }

  /** Send a NOP (keep-alive) to the scanner when enabled in Options. */
  async sendKeepAlive(deviceId: string): Promise<void> {
    if (!this.state.doSendKeepAlive) {
      return;
    }
    this.logger.d('BleService.sendKeepAlive()');
    const keepAliveCommand = new Uint8Array(1);
    keepAliveCommand[0] = 0x00;
    try {
      await this.sendControlCommand(deviceId, keepAliveCommand);
    } catch (err) {
      this.logger.do(err);
    }
  }

  /** Read the scanner data characteristic once (rarely used after connect). */
  async readDataCharacteristic(deviceId: string): Promise<Uint8Array> {
    this.logger.d('BleService.readDataCharacteristic()');
    const view = await BleClient.read(deviceId, GATT_SCANNER_SERVICE, GATT_SCANNER_DATA);
    return this.dataViewToUint8Array(view);
  }

  // -------------------------------------------------------------------------
  // Device information
  // -------------------------------------------------------------------------

  /** Read the standard device-information characteristics. */
  async getDeviceInformation(deviceId: string): Promise<DeviceInfoItem[]> {
    this.logger.d('BleService.getDeviceInformation()');
    const items: DeviceInfoItem[] = [];

    const readString = async (name: string, characteristic: string): Promise<void> => {
      try {
        const view = await BleClient.read(deviceId, GATT_DEVICE_INFO_SERVICE, characteristic);
        items.push({ name, value: fromByteArrayToString(this.dataViewToUint8Array(view)) });
      } catch {
        items.push({ name, value: "Can't get value" });
      }
    };

    const readHex = async (name: string, characteristic: string): Promise<void> => {
      try {
        const view = await BleClient.read(deviceId, GATT_DEVICE_INFO_SERVICE, characteristic);
        items.push({ name, value: byteArrayToHexString(this.dataViewToUint8Array(view)) });
      } catch {
        items.push({ name, value: "Can't get value" });
      }
    };

    try {
      const view = await BleClient.read(
        deviceId,
        GATT_BATTERY_SERVICE,
        GATT_BATTERY_CHARACTERISTIC
      );
      items.push({ name: 'Battery level', value: this.dataViewToUint8Array(view)[0] + '%' });
    } catch {
      items.push({ name: 'Battery level', value: "Can't get value" });
    }

    await readString('Manufacturer name', GATT_DEVICE_INFO.manufactureName);
    await readString('Model Number', GATT_DEVICE_INFO.modelNumber);
    await readString('Serial Number', GATT_DEVICE_INFO.serialNumber);
    await readHex('PnP ID', GATT_DEVICE_INFO.pnpId);
    await readString('Firmware Rev.', GATT_DEVICE_INFO.firmwareRevision);
    await readString('Software Rev.', GATT_DEVICE_INFO.softwareRevision);

    return items;
  }

  // -------------------------------------------------------------------------
  // Firmware helpers
  // -------------------------------------------------------------------------

  /** True when the connected scanner runs a firmware older than 1.44. */
  async isFirmwareOlderThan144(deviceId: string): Promise<boolean> {
    this.logger.d('BleService.isFirmwareOlderThan144()');
    try {
      const view = await BleClient.read(
        deviceId,
        GATT_DEVICE_INFO_SERVICE,
        GATT_DEVICE_INFO.softwareRevision
      );
      const version = stringVersionToIntVersion(
        fromByteArrayToString(this.dataViewToUint8Array(view))
      );
      const older = version < 144;
      this.state.isOlderThan144 = older;
      this.logger.d('Firmware version older than 1.44: ' + older);
      return older;
    } catch (err) {
      this.logger.do(err);
      this.logger.d('Error while getting firmware version, assuming old');
      this.state.isOlderThan144 = true;
      return true;
    }
  }

  // -------------------------------------------------------------------------
  // Conversion helpers
  // -------------------------------------------------------------------------

  private dataViewToUint8Array(view: DataView): Uint8Array {
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }

  private uint8ArrayToDataView(value: Uint8Array): DataView {
    return new DataView(value.buffer, value.byteOffset, value.byteLength);
  }
}