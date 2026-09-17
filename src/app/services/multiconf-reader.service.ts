import { Injectable } from '@angular/core';
import { decodeIni, IniObject } from './ini';

/** A parsed fetch of register -> value entries from a multi-conf file. */
export interface MultiConfConfig {
  /** Raw register table (address hex key -> value string / "!keep" / "!default"). */
  registers: Record<string, string>;
  /** The product name the file is made for (from the [general] section). */
  product: string;
}

/**
 * Read and interpret a multi-conf configuration file.
 * Port of the original Multiconfreader service. The file is an INI document
 * with a [general] section and a [raw] register table.
 */
@Injectable()
export class MulticonfReaderService {
  private config: IniObject = {};
  private content = '';

  setContent(content: string): void {
    this.content = content;
  }

  parse(): void {
    this.config = decodeIni(this.content);
  }

  /**
   * Validate the configuration file:
   *  - required sections [general] and [raw] are present
   *  - the product field matches a supported barcode/RFID product
   */
  isContentValid(): boolean {
    const general = this.config['general'] as Record<string, unknown> | undefined;
    const raw = this.config['raw'] as Record<string, unknown> | undefined;
    if (!general || !raw || typeof general['product'] !== 'string') {
      return false;
    }
    const product = (general['product'] as string).toLowerCase();
    // Feel free to add your own product identifiers here.
    const supported = ['d600', 'd600-hid', 'd600-app', 'scanner'];
    if (supported.indexOf(product) === -1) {
      return false;
    }
    return true;
  }

  /** Returns a map of register address -> value for the [raw] section. */
  getRegistersConfiguration(): Record<string, string> {
    const raw = (this.config['raw'] ?? {}) as Record<string, unknown>;
    const registers: Record<string, string> = {};
    Object.keys(raw).forEach((key) => {
      const value = raw[key];
      registers[key] = Array.isArray(value) ? String(value[0]) : String(value);
    });
    return registers;
  }

  getProduct(): string {
    const general = this.config['general'] as Record<string, unknown> | undefined;
    return general && typeof general['product'] === 'string' ? general['product'] : '';
  }
}