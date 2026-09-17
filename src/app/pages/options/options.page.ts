import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AppStateService } from '../../services/app-state.service';
import { SettingsService } from '../../services/settings.service';

/**
 * Application options screen. Port of the original OptionsController:
 *  - debug log
 *  - vibration on scan / connection events
 *  - auto-open URL frames
 *  - height (lines) of the history input on the connect screen
 */
@Component({
  selector: 'app-options',
  templateUrl: './options.page.html',
  styleUrls: ['./options.page.scss']
})
export class OptionsPage {
  settings = {
    debug: false,
    vibrate: false,
    openUrls: true,
    inputHeight: 6
  };

  constructor(
    private router: Router,
    private state: AppStateService,
    private settingsService: SettingsService
  ) {
    this.settings.debug = this.settingsService.getBool('debug', this.state.debugMode);
    this.settings.vibrate = this.settingsService.getBool('vibrate', this.state.doVibrate);
    this.settings.openUrls = this.settingsService.getBool('openUrls', this.state.openUrls);
    this.settings.inputHeight = this.settingsService.getInt('inputHeight', this.state.inputHeight);
  }

  saveSettings(): void {
    this.settingsService.saveBool('debug', this.settings.debug);
    this.state.debugMode = this.settings.debug;

    this.settingsService.saveBool('vibrate', this.settings.vibrate);
    this.state.doVibrate = this.settings.vibrate;

    this.settingsService.saveBool('openUrls', this.settings.openUrls);
    this.state.openUrls = this.settings.openUrls;

    this.settingsService.save('inputHeight', String(this.settings.inputHeight));
    this.state.inputHeight = this.settings.inputHeight;

    this.router.navigate(['/home']);
  }
}