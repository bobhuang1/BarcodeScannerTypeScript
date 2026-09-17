import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';

import { PrivacyModalComponent } from '../../components/privacy-modal/privacy-modal.component';
import { SettingsService } from '../../services/settings.service';
import { AppStateService } from '../../services/app-state.service';

/**
 * First-run welcome screen. Port of the original IntroController; the
 * analytics opt-in has been removed because this sample has no analytics.
 */
@Component({
  selector: 'app-intro',
  templateUrl: './intro.page.html',
  styleUrls: ['./intro.page.scss']
})
export class IntroPage {
  constructor(
    private router: Router,
    private modalController: ModalController,
    private settings: SettingsService,
    private state: AppStateService
  ) {}

  async openPrivacyStatement(): Promise<void> {
    const modal = await this.modalController.create({
      component: PrivacyModalComponent
    });
    await modal.present();
  }

  getStarted(): void {
    this.settings.saveBool('hasrun', true);
    this.state.log('Intro: get started');
    this.router.navigate(['/home'], { replaceUrl: true });
  }
}