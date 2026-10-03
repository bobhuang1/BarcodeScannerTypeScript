import {
  byteArrayToHexString,
  hexStringToUint8Array,
  mergeUint8Arrays,
  rssiToPercentage,
  stringVersionToIntVersion
} from './utils';

describe('utils', () => {
  it('converts firmware versions with any number of dots', () => {
    expect(stringVersionToIntVersion('1.37-0-g01886848')).toBe(137);
    expect(stringVersionToIntVersion('1.3.7-2-gabc')).toBe(137);
    expect(stringVersionToIntVersion('1.37')).toBe(0);
    expect(stringVersionToIntVersion('')).toBe(0);
  });

  it('maps RSSI to a 0-100 percentage', () => {
    expect(rssiToPercentage(-20)).toBe(100);
    expect(rssiToPercentage(-60)).toBe(70);
    expect(rssiToPercentage(-100)).toBe(0);
  });

  it('round-trips hex strings', () => {
    const data = hexStringToUint8Array('4F00A1');
    expect(Array.from(data)).toEqual([0x4f, 0x00, 0xa1]);
    expect(byteArrayToHexString(data).toUpperCase()).toBe('4F00A1');
  });

  it('merges byte arrays in order', () => {
    const merged = mergeUint8Arrays(Uint8Array.of(1, 2), Uint8Array.of(3));
    expect(Array.from(merged)).toEqual([1, 2, 3]);
  });
});
