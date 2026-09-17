/**
 * Byte / hex / string conversion helpers.
 * Faithful port of the utility functions from the original app's misc.js.
 */

/** Convert a byte array to its hexadecimal representation ("0D0A" style). */
export function byteArrayToHexString(arr: Uint8Array): string {
  let result = '';
  for (let i = 0; i < arr.length; i++) {
    let str = arr[i].toString(16);
    str = str.length === 0 ? '00' :
      str.length === 1 ? '0' + str :
      str.length === 2 ? str :
      str.substring(str.length - 2, str.length);
    result += str;
  }
  return result;
}

/** Decode an Uint8Array as UTF-8 text. */
export function uint8ArrayToString(content: Uint8Array): string {
  return new TextDecoder('utf-8').decode(content);
}

/** Convert a JS string to an Uint8Array (one byte per char). */
export function stringToUint8Array(stringValue: string): Uint8Array {
  const buf = new Uint8Array(stringValue.length);
  for (let i = 0; i < stringValue.length; i++) {
    buf[i] = stringValue.charCodeAt(i);
  }
  return buf;
}

/** Convert a hex string ("4F00A1") to an Uint8Array. */
export function hexStringToUint8Array(hexString: string): Uint8Array {
  if (hexString === '' || hexString.length % 2 !== 0) {
    return new Uint8Array();
  }
  const result = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    result[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return result;
}

/**
 * Copy a slice out of an Uint8Array.
 * (The original blockCopy had a subtle off-by-one; using native slice keeps
 * the same practical semantics: stop index is excluded.)
 */
export function blockCopy(src: Uint8Array, srcOffset: number, dstOffset: number): Uint8Array {
  if (srcOffset > dstOffset) {
    const temp = dstOffset;
    dstOffset = srcOffset;
    srcOffset = temp;
  }
  return src.slice(srcOffset, dstOffset);
}

/** Merge two Uint8Array into a new one. */
export function mergeUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const c = new Uint8Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
}

/**
 * Convert a byte array to a printable string, skipping 0x00 bytes.
 * (Used for the device-information characteristics.)
 */
export function fromByteArrayToString(byteArray: Uint8Array): string {
  let output = '';
  for (let i = 0; i < byteArray.length; i++) {
    if (byteArray[i] !== 0) {
      output += String.fromCharCode(byteArray[i]);
    }
  }
  return output;
}

/**
 * Convert "(string) 1.37-0-g01886848" to "(int) 137".
 * Returns 0 when the input does not look like a firmware version.
 */
export function stringVersionToIntVersion(version: string): number {
  version = version.trim();
  if (version.length === 0) {
    return 0;
  }
  const pointIndex = version.indexOf('-');
  if (pointIndex === -1) {
    return 0;
  }
  version = version.substr(0, pointIndex).replace('.', '');
  return parseInt(version, 10);
}

/** Convert an RSSI (in dBm) to a 0..100 percentage. */
export function rssiToPercentage(rssi: number): number {
  const abs = Math.abs(rssi);
  if (abs > 95) {
    return 0;
  }
  if (abs <= 30) {
    return 100;
  }
  return Math.round(100 - (abs - 30));
}

/** Convert a boolean to a "color" byte: true -> 0xFF, false -> 0x00. */
export function booleanToColor(booleanValue: boolean): number {
  return booleanValue ? 0xff : 0x00;
}

/** Validate that a byte is a printable ASCII char. */
export function isASCIIChar(b: number): boolean {
  return !((b < 0x20) || (b >= 0x7f));
}

/** Cut a string into lines of at most 32 characters (for display). */
export function cutForDisplay(data: string): string {
  data = data.trim();
  let output = '';
  let cpt = 0;
  for (let i = 0; i < data.length; i++) {
    cpt++;
    if (cpt > 32) {
      cpt = 1;
      output += '\n';
    }
    output += data[i];
  }
  return output;
}