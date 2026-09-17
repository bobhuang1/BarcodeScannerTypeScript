import { Component } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { AppStateService } from '../../services/app-state.service';

/**
 * Debug screen: displays and copies the in-memory debug log.
 * Port of the original DebugController.
 */
@Component({
  selector: 'app-debug',
  templateUrl: './debug.page.html',
  styleUrls: ['./debug.page.scss']
})
export class DebugPage {
  content = '';

  constructor(private state: AppStateService, private toast: ToastService) {
    this.refresh();
  }

  ionViewWillEnter(): void {
    this.refresh();
  }

  private refresh(): void {
    this.content = this.state.debugContent;
  }

  async debugToClipboard(): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(this.state.debugContent);
      } else {
        // Fallback for older webviews
        const textarea = document.createElement('textarea');
        textarea.value = this.state.debugContent;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      await this.toast.show('Debug content copied to clipboard', 'top');
    } catch (err) {
      this.state.log('Clipboard error: ' + JSON.stringify(err));
      await this.toast.show('Copy failed', 'top');
    }
  }

  emptyDebug(): void {
    this.state.debugContent = '';
    this.refresh();
    void this.toast.show('Debug content cleared', 'top');
  }
}