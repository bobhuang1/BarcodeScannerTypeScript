import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.barcodescanner',
  appName: 'Barcode Scanner TypeScript',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        loading: 'Please wait',
        cancel: 'Cancel',
        pairing: 'Pairing...',
        connected: 'Connected',
        disconnecting: 'Disconnecting...',
        disconnected: 'Disconnected',
        scanning: 'Scanning...',
        error: 'Error',
        requestPermission: 'Bluetooth permission is required to scan and connect to a scanner.'
      }
    }
  }
};

export default config;