import { Injectable } from '@angular/core';
import { Haptics } from '@capacitor/haptics';
import { Subject } from 'rxjs';

import { AppStateService } from './app-state.service';
import { LoggerService } from './logger.service';
import {
  byteArrayToHexString,
  mergeUint8Arrays,
  uint8ArrayToString
} from './utils';

/** A fully decoded frame coming from the scanner. */
export interface ScannedData {
  /** Decoded textual payload (barcode content, NFC tag data, ...). */
  text: string;
  /** Human readable type of the scanned item (see CARD_TYPES). */
  cardType: string;
  /** Raw payload bytes, without the type header and end marker. */
  raw: Uint8Array;
  /** True when the frame contained a URL that was handed to the browser. */
  openedUrl: boolean;
  /** URL value when the frame carried one. */
  url?: string;
}

/** Card type reported for frames without a recognised 2-character type prefix. */
export const PLAIN_BARCODE = 'Barcode';

/**
 * Generic scanner-data decoder.
 *
 * The scanner streams frames over the data characteristic. A frame is a
 * sequence of bytes terminated by 0x00. NFC frames start with two ASCII hex
 * characters naming the tag family (e.g. "4F" = NFC Forum); plain barcode
 * frames carry the barcode text with no prefix. Frames are split on every
 * 0x00 (a notification may hold the end of one frame and the start of the
 * next), then decoded and emitted once - one decode path for barcodes, NFC
 * tags and raw frames alike.
 *
 * Note: a barcode whose first two characters happen to be a known type code
 * (e.g. "01...") is indistinguishable from a typed NFC frame in this protocol.
 */
@Injectable()
export class ScannerDataService {
  /** Emitted each time a full frame has been decoded. */
  onData: Subject<ScannedData> = new Subject<ScannedData>();

  /** Upper bound for one frame, so a missing terminator can't grow the buffer forever. */
  static readonly MAX_FRAME_BYTES = 4096;

  private pending = new Uint8Array(0);

  constructor(
    private state: AppStateService,
    private logger: LoggerService
  ) {}

  /** Map between the 2-byte type code and a printable name. */
  getCardTypeName(data: Uint8Array): string {
    const cardsType: Record<number, string> = {
      0x01: 'ISO 14443 type A (at least level 3)',
      0x02: 'ISO 14443 type B (at least level 3)',
      0x03: 'Felica',
      0x04: 'ISO 15693',
      0x08: 'NXP ICODE1',
      0x10: 'Inside Secure PicoTag (including HID iClass)',
      0x11: 'Innovision Topaz/Jewel',
      0x18: 'Thinfilm NFC Barcode',
      0x20: 'ST MicroElectronics SR family',
      0x40: 'ASK CTS256B or CTS512B',
      0x4F: 'NFC Forum',
      0x80: 'Innovatron Radio Protocol (deprecated Calypso card)'
    };

    if (data.length < 2) {
      return PLAIN_BARCODE;
    }
    const prefix = String.fromCharCode(data[0]) + String.fromCharCode(data[1]);
    if (!/^[0-9A-Fa-f]{2}$/.test(prefix)) {
      return PLAIN_BARCODE;
    }
    return cardsType[parseInt(prefix, 16)] ?? PLAIN_BARCODE;
  }

  /** Try to extract an URL from a Thinfilm NFC barcode payload. */
  private getUrlFromThinFilmTag(byteArray: Uint8Array): string {
    let url = '';
    let i = 0;
    let isUrl = false;
    if (byteArray[0] === 0xb7 && (byteArray[1] === 0x03 || byteArray[1] === 0x04)) {
      while (i < 14) {
        if (byteArray[i] === 0xb7 && i === 0) {
          // Start marker
          i++;
          isUrl = true;
          continue;
        } else if (byteArray[i] === 0xfe) {
          // End marker
          i = 100;
        } else if (byteArray[i] === 0x03 && i === 1) {
          url = 'http://';
        } else if (byteArray[i] === 0x04 && i === 1) {
          url = 'https://';
        } else {
          url += String.fromCharCode(byteArray[i]);
        }
        i++;
      }
    }
    return isUrl ? url : '';
  }

  /**
   * Append raw bytes coming from the scanner and decode frames as soon as they
   * are complete. This is the port of the original onDataFromPeripheral().
   *
   * @param buffer Raw bytes received on the scanner data characteristic.
   */
  onDataFromPeripheral(buffer: ArrayBuffer | Uint8Array): void {
    this.logger.d('ScannerDataService.onDataFromPeripheral()');

    const data = new Uint8Array(buffer);
    this.logger.d('    data in: 0x' + byteArrayToHexString(data));
    if (data.length === 0) {
      return;
    }

    this.pending = mergeUint8Arrays(this.pending, data);

    // Decode every complete frame in the buffer; keep the unterminated tail.
    let start = 0;
    for (let i = 0; i < this.pending.length; i++) {
      if (this.pending[i] === 0x00) {
        const frame = this.pending.slice(start, i);
        start = i + 1;
        if (frame.length > 0) {
          this.decodeFrame(frame);
        }
      }
    }
    this.pending = this.pending.slice(start);

    if (this.pending.length > ScannerDataService.MAX_FRAME_BYTES) {
      this.logger.d('Frame too long without an end marker; discarding ' + this.pending.length + ' bytes');
      this.pending = new Uint8Array(0);
    }
  }

  /** Decode one complete frame (without its 0x00 terminator) and emit it. */
  private decodeFrame(frame: Uint8Array): void {
    this.logger.d('Transmission finished');
    if (this.state.doVibrate) {
      Haptics.vibrate().catch(() => undefined);
    }

    const cardType = this.getCardTypeName(frame);
    // Typed (NFC) frames start with the 2 type characters; plain barcodes don't.
    const payload = cardType === PLAIN_BARCODE ? frame : frame.slice(2);

    let openedUrl = false;
    let url: string | undefined;
    let text = uint8ArrayToString(payload);

    if (cardType === 'NFC Forum') {
      if (text.startsWith('http://') || text.startsWith('https://')) {
        url = text;
        if (this.state.openUrls) {
          this.openExternalUrl(url);
          openedUrl = true;
        }
      }
    } else if (cardType === 'Thinfilm NFC Barcode') {
      url = this.getUrlFromThinFilmTag(payload);
      if (url.trim() !== '') {
        // The payload carries its URL (same behaviour as the original app).
        if (this.state.openUrls) {
          this.openExternalUrl(url);
          openedUrl = true;
        }
        text = url;
      }
    }

    this.logger.d('data decoded: 0x' + byteArrayToHexString(payload));
    this.onData.next({
      text,
      cardType,
      raw: payload,
      openedUrl,
      url
    });
  }

  /** Reset the buffered frame. */
  reset(): void {
    this.pending = new Uint8Array(0);
  }

  /**
   * Open an URL in the system browser. Kept as a small indirection so the
   * sample can grow a proper browser plugin later.
   */
  private openExternalUrl(url: string): void {
    window.open(url, '_blank');
  }
}