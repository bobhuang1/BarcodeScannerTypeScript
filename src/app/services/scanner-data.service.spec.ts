import { AppStateService } from './app-state.service';
import { LoggerService } from './logger.service';
import { PLAIN_BARCODE, ScannedData, ScannerDataService } from './scanner-data.service';

function bytes(text: string): Uint8Array {
  return Uint8Array.from(text, (c) => c.charCodeAt(0));
}

describe('ScannerDataService', () => {
  let state: AppStateService;
  let service: ScannerDataService;
  let frames: ScannedData[];

  beforeEach(() => {
    state = new AppStateService();
    state.doVibrate = false;
    service = new ScannerDataService(state, new LoggerService(state));
    frames = [];
    service.onData.subscribe((f) => frames.push(f));
  });

  it('passes a plain barcode through without dropping characters', () => {
    service.onDataFromPeripheral(bytes('ABC12345\0'));

    expect(frames.length).toBe(1);
    expect(frames[0].cardType).toBe(PLAIN_BARCODE);
    expect(frames[0].text).toBe('ABC12345');
  });

  it('strips the type prefix of a typed NFC frame', () => {
    service.onDataFromPeripheral(bytes('4Fhttps://example.com\0'));

    expect(frames[0].cardType).toBe('NFC Forum');
    expect(frames[0].text).toBe('https://example.com');
    expect(frames[0].url).toBe('https://example.com');
  });

  it('does not open URLs unless the option is enabled', () => {
    const open = spyOn(window, 'open');

    service.onDataFromPeripheral(bytes('4Fhttps://example.com\0'));

    expect(open).not.toHaveBeenCalled();
    expect(frames[0].openedUrl).toBeFalse();
  });

  it('joins a frame split across notifications', () => {
    service.onDataFromPeripheral(bytes('HELLO'));
    service.onDataFromPeripheral(bytes('WORLD\0'));

    expect(frames.map((f) => f.text)).toEqual(['HELLOWORLD']);
  });

  it('splits two frames that arrive in one notification', () => {
    service.onDataFromPeripheral(bytes('FIRST\0SECO'));
    service.onDataFromPeripheral(bytes('ND\0'));

    expect(frames.map((f) => f.text)).toEqual(['FIRST', 'SECOND']);
  });

  it('discards an unterminated frame that grows past the limit', () => {
    service.onDataFromPeripheral(new Uint8Array(ScannerDataService.MAX_FRAME_BYTES + 1).fill(0x41));
    service.onDataFromPeripheral(bytes('OK\0'));

    expect(frames.map((f) => f.text)).toEqual(['OK']);
  });
});
