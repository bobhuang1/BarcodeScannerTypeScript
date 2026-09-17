import { Injectable } from '@angular/core';

/**
 * Global application state. This is the TypeScript replacement for the loose
 * global variables that the original Ionic 1 app used (debugMode, isScanning,
 * appVersion, debugContent, doVibrate, ...).
 */
@Injectable()
export class AppStateService {
  /** Debug logging enabled (persisted through SettingsService). */
  debugMode = true;
  /** True while a BLE scan is running. */
  isScanning = false;
  /** App version, read at startup from assets/version.txt. */
  appVersion = '';
  /** Scan duration in seconds. */
  scanDuration = 5;
  /** Debug log content, shared between Debug page and logger. */
  debugContent = '';
  /** Vibrate on scanner data / connection events. */
  doVibrate = true;
  /** Send a regular "keep alive" (NOP) while on the connect screen. */
  doSendKeepAlive = false;
  /** Friendly name of the currently connected scanner. */
  currentDeviceName = '';
  /** Map of deviceId -> friendly name for still-known devices. */
  scannedDevices: Record<string, string> = {};
  /** Open URL frames (NFC Forum / Thinfilm barcode) in the browser. */
  openUrls = true;
  /** Firmware is older than 1.44 (changes the "drive LEDs" command layout). */
  isOlderThan144 = true;
  /** Height (lines) used for the history input on the connect screen. */
  inputHeight = 6;
  /** Current platform (either 'ios', 'android' or 'web'). */
  platform = 'web';
  /** True when running on iOS. */
  isIOS = false;
  /** True when running on Android. */
  isAndroid = false;

  constructor() {}

  /** Timestamp for the debug log and refresh of the debug content. */
  now(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 23);
  }

  /** Append a line to the in-memory debug log. */
  log(message: string): void {
    if (!this.debugMode) {
      return;
    }
    this.debugContent += this.now() + ' -- ' + message + '\n';
    console.log(this.now() + ' -- ' + message);
  }
}