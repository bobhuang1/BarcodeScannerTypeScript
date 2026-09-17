import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { PrivacyModalComponent } from '../../components/privacy-modal/privacy-modal.component';
import { AppStateService } from '../../services/app-state.service';

/**
 * About screen: app version + privacy statement.
 * The analytics opt-in toggle from the original app is gone (no analytics).
 */
@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss']
})
export class AboutPage {
  version = '';

  constructor(
    private modalController: ModalController,
    public state: AppStateService
  ) {
    this.version = this.state.appVersion;
  }

  ionViewWillEnter(): void {
    this.version = this.state.appVersion;
  }

  async openPrivacyStatement(): Promise<void> {
    const modal = await this.modalController.create({
      component: PrivacyModalComponent
    });
    await modal.present();
  }
}