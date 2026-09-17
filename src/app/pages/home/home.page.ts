import { Component, OnDestroy, OnInit } from '@angular/core';

import { AppStateService } from '../../services/app-state.service';
import { BleService, FoundDevice } from '../../services/ble.service';
import { Subscription } from 'rxjs';

/**
 * Home page: periodically scans for nearby scanners and lists them.
 * Port of the original HomeController (auto-scan loop + RSSI display).
 */
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit, OnDestroy {
  items: FoundDevice[] = [];
  scanstatus = 'Stopped';

  private goOn = true;
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private scanSubscription: Subscription | null = null;

  constructor(
    private state: AppStateService,
    private ble: BleService
  ) {}

  ngOnInit(): void {
    this.scanSubscription = this.ble.onDeviceFound.subscribe((device) => {
      // Keep one entry per device for this scan cycle.
      const index = this.items.findIndex((item) => item.id === device.id);
      if (index !== -1) {
        this.items[index] = device;
      } else {
        this.items.push(device);
      }
    });
  }

  ionViewWillEnter(): void {
    this.goOn = true;
    this.startScanLoop();
  }

  ionViewWillLeave(): void {
    this.goOn = false;
    this.stopScanLoop();
  }

  ngOnDestroy(): void {
    this.stopScanLoop();
    this.scanSubscription?.unsubscribe();
  }

  /** One scan cycle: clear the list, scan for a short time, then stop. */
  private scanOnce = async (): Promise<void> => {
    if (!this.goOn) {
      return;
    }
    this.items = [];
    this.scanstatus = 'Scanning';
    try {
      await this.ble.initialize();
      await this.ble.startScan(4);
    } catch (err) {
      this.scanstatus = 'Stopped';
      this.state.log('Scan error: ' + JSON.stringify(err));
    }
  };

  private startScanLoop(): void {
    if (this.refreshIntervalId !== null) {
      return;
    }
    void this.scanOnce();
    this.refreshIntervalId = setInterval(() => {
      void this.scanOnce();
    }, 5600);
  }

  private stopScanLoop(): void {
    if (this.refreshIntervalId !== null) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
    void this.ble.stopScan();
    this.scanstatus = 'Stopped';
  }

  startScan(): void {
    this.goOn = true;
    this.scanstatus = 'Scanning';
    void this.scanOnce();
  }

  stopScan(): void {
    this.goOn = false;
    this.scanstatus = 'Stopped';
    void this.ble.stopScan();
  }
}