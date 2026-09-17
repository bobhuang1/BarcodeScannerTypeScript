import { Injectable } from '@angular/core';

import { BleService } from './ble.service';
import { AppStateService } from './app-state.service';
import {
  hexStringToUint8Array,
  mergeUint8Arrays,
  stringToUint8Array
} from './utils';

/**
 * Applies a multi-conf register table to a connected scanner.
 *
 * Each entry of the [raw] section becomes a "write register" configuration
 * command (0x0D) whose payload is the register address followed by the value.
 *  - "!keep"     -> the register is left untouched
 *  - "!default"  -> skipped (restoring defaults requires the full reset flow)
 *  - anything in hex (AAAA..) -> sent as raw bytes
 *  - anything else            -> sent as raw ASCII bytes
 */
@Injectable()
export class MulticonfSendService {
  constructor(
    private ble: BleService,
    private state: AppStateService
  ) {}

  /** Register counter updated while a configuration is being applied. */
  registersDone = 0;
  registersTotal = 0;

  resetProgress(): void {
    this.registersDone = 0;
    this.registersTotal = 0;
  }

  get progress(): number {
    return this.registersTotal ? Math.round((this.registersDone / this.registersTotal) * 100) : 0;
  }

  /** Encode a register value into the bytes to write. */
  private valueToBytes(value: string): Uint8Array {
    const trimmed = value.trim();
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
      return hexStringToUint8Array(trimmed);
    }
    return stringToUint8Array(trimmed);
  }

  /**
   * Apply one register line. Returns true when the register was written.
   */
  async sendRegister(deviceId: string, address: string, value: string): Promise<boolean> {
    if (value === '!keep') {
      this.state.log('Register ' + address + ' kept as is');
      return false;
    }
    if (value === '!default') {
      this.state.log('Register ' + address + ' reset to default');
      return false;
    }

    const addressByte = new Uint8Array(1);
    addressByte[0] = parseInt(address.replace('0x', '').trim(), 16);

    const registerValue = this.valueToBytes(value);
    const payload = mergeUint8Arrays(addressByte, registerValue);

    await this.ble.sendConfigCommand(deviceId, 0x0d, payload);
    this.registersDone++;
    return true;
  }

  /** Apply a full register table, in the file's order. */
  async sendRegisters(deviceId: string, registers: Record<string, string>): Promise<void> {
    this.resetProgress();
    this.registersTotal = Object.keys(registers).length;
    for (const address of Object.keys(registers)) {
      await this.sendRegister(deviceId, address, registers[address]);
    }
  }

  get registersPending(): number {
    return this.registersTotal - this.registersDone;
  }
}