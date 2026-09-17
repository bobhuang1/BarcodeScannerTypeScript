import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { AppStateService } from './services/app-state.service';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  constructor(
    private state: AppStateService,
    private settings: SettingsService
  ) {
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    await this.defineCurrentPlatform();
    await this.readAppVersion();

    // Refresh "global" values from persistent settings
    this.state.debugMode = this.settings.getBool('debug', this.state.debugMode);
    this.state.doVibrate = this.settings.getBool('vibrate', this.state.doVibrate);
    this.state.openUrls = this.settings.getBool('openUrls', this.state.openUrls);
    this.state.inputHeight = this.settings.getInt('inputHeight', this.state.inputHeight);

    // First run: show the intro screen
    if (!this.settings.getBool('hasrun', false)) {
      this.settings.saveBool('hasrun', true);
      window.location.hash = '#/intro';
    } else {
      window.location.hash = '#/home';
    }
  }

  private async defineCurrentPlatform(): Promise<void> {
    const platform = Capacitor.getPlatform();
    this.state.isIOS = platform === 'ios';
    this.state.isAndroid = platform === 'android';
    // Keep old Android/iOS device-version flags harmless for the sample
    this.state.log('Platform: ' + platform);
  }

  private async readAppVersion(): Promise<void> {
    try {
      const response = await fetch('assets/version.txt');
      if (response.ok) {
        this.state.appVersion = (await response.text()).trim();
      }
    } catch (err) {
      this.state.appVersion = 'unknown: ' + JSON.stringify(err);
    }
    this.state.log('App version: ' + this.state.appVersion);
  }
}