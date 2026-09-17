import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

/** Replaces the old `window.plugins.toast` calls. */
@Injectable()
export class ToastService {
  constructor(private toastController: ToastController) {}

  async show(message: string, position: 'top' | 'center' | 'bottom' = 'bottom', duration = 2000): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration,
      position,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }

  showShortTop(message: string): Promise<void> {
    return this.show(message, 'top', 1500);
  }

  showLongCenter(message: string): Promise<void> {
    return this.show(message, 'middle', 3500);
  }

  showShortCenter(message: string): Promise<void> {
    return this.show(message, 'middle', 1500);
  }
}