# Barcode Scanner TypeScript

Cross-platform **mobile sample** built with **Ionic + Angular + TypeScript** that talks to a Socket Mobile–style BLE barcode/RFID scanner (e.g. a Socket Mobile D600).

This is sample code for a modern mobile scanner app built from scratch. It keeps a full feature set but:

- runs on **Ionic 7 / Angular 17 / Capacitor 6** using `@capacitor-community/bluetooth-le`,
- handles **generic scanner data** (barcode, NFC tags, raw frames) through **one decode path**,
- has **no third-party analytics or crash reporting** and no private configuration.

## Features

| Screen            | Purpose                                                              |
| ----------------- | ------------------------------------------------------------------- |
| Home              | Periodic BLE scan, list of nearby scanners with RSSI signal          |
| Connect           | Connect BLE, single/auto scan mode, wink, live scanned data + history|
| Information       | Battery, manufacturer, model, serial, firmware, software, PnP ID     |
| Configure         | Raw register read/write, factory reset, test modes, LEDs/buzzer/vibrator, UI sequences |
| Multi-conf        | Push a full `d600.multiconf`-style file or pasted INI to the scanner |
| Scanner control   | Send control commands to the scanner (LEDs, buzzer, vibrator, UI)    |
| Options           | Debug log, vibration, URL opening, history input height              |
| Debug             | On-device debug log, copy to clipboard, clear                        |
| About             | App version, privacy statement                                       |
| Intro             | First-run welcome + privacy statement                                |

## BLE protocol

The BLE services/characteristics documented in the original firmware are kept unchanged:

| Profile | Service | Characteristic |
| --- | --- | --- |
| RFID / barcode scanner | `6CB501B7-96F6-4EEF-ACB1-D7535F153CF0` | data: `CE3E81B8-D871-4613-BA78-5FFC0B1520A6`, control: `833A2364-BCA0-4647-8113-478E1FC449BA` |
| Device configuration | `7A4385C9-F7C7-4E22-9AFD-16D68FC588CA` | `1254FC72-336E-4BB2-A0A8-71C7D28D73CE` |
| Battery level | `180F` | `2A19` |
| Device information | `180A` | `2A29`/`2A24`/`2A25`/`2A50`/`2A26`/`2A28` |

Scanner data frames are decoded generically: the payload is buffered until the end marker (`0x00`), the two leading bytes are interpreted as the **card/scanner data type**, and the remainder is emitted as text while raw bytes are logged. URL-bearing frames (NFC Forum / Thinfilm barcode) can be opened automatically.

Configuration commands use the block framing format (header + command code + chained payload). See `src/app/services/blocks.service.ts`.

## Project layout

```
src/
  app/
    app.component.*            Side menu shell + startup (first-run, settings, version)
    services/
      settings.service.ts      localStorage wrapper
      logger.service.ts        debug content capture
      utils.ts                 byte/hex/string helpers
      ble.service.ts           BLE transport over @capacitor-community/bluetooth-le
      blocks.service.ts        configuration block encode/decode
      scanner-data.service.ts  generic decoder for barcode / NFC / raw frames
      multiconf-reader.service.ts + ini.ts   multi-conf INI parsing
    components/
      privacy-modal/           privacy statement modal
    pages/
      home/ options/ debug/ about/ intro/
      connect/ information/ scanner-control/
      configure/ multiconf/ multiconf-paste/ multiconf-file/
```

## Getting started

```bash
npm install
npx cap add android   # or ios
npm run build
npx cap sync
npx cap open android  # run on device
```

To try the UI in a desktop browser you can scan with your phone when connected via
Capacitor's dev-server flow; Bluetooth itself requires a device (Web Bluetooth is not used).

## Configuration knobs

- The GATT profile lives in `src/app/services/ble.service.ts` (service/characteristic UUIDs).
- The set of accepted product identifiers for multi-conf files lives in `src/app/services/multiconf-reader.service.ts` (see the `[general]` product check).
- `openUrls` (Options screen) lets the app auto-open URL frames in the browser.

## License

MIT (see `LICENSE`).