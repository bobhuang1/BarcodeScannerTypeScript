import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';

/**
 * Privacy statement shown as a modal (About + first-run Intro screens).
 * Replace the sample text with your own privacy statement before shipping.
 */
@Component({
  selector: 'app-privacy-modal',
  templateUrl: './privacy-modal.component.html',
  styleUrls: ['./privacy-modal.component.scss']
})
export class PrivacyModalComponent {
  constructor(private modalController: ModalController) {}

  agree(): void {
    this.modalController.dismiss(true);
  }

  close(): void {
    this.modalController.dismiss(false);
  }
}