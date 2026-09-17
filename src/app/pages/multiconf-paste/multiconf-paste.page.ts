import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MulticonfReaderService } from '../../services/multiconf-reader.service';
import { MulticonfSendService } from '../../services/multiconf-send.service';
import { AppStateService } from '../../services/app-state.service';
import { ToastService } from '../../services/toast.service';

/**
 * Apply a multi-conf configuration pasted into a text area.
 * Port of the original MulticonfPasteController.
 */
@Component({
  selector: 'app-multiconf-paste',
  templateUrl: './multiconf-paste.page.html',
  styleUrls: ['./multiconf-paste.page.scss']
})
export class MulticonfPastePage {
  deviceId = '';
  content = '';

  productName = '';
  result = '';

  constructor(
    private route: ActivatedRoute,
    private state: AppStateService,
    private multiconfReader: MulticonfReaderService,
    private multiconfSend: MulticonfSendService,
    private toast: ToastService
  ) {
    this.deviceId = this.route.snapshot.params['deviceId'];
  }

  /** Validate the pasted content and report the outcome. */
  applyConfiguration(): void {
    if (this.content.trim() === '') {
      void this.toast.showShortTop('Nothing to apply. Paste a configuration first.');
      return;
    }

    this.multiconfReader.setContent(this.content);
    this.multiconfReader.parse();

    if (!this.multiconfReader.isContentValid()) {
      void this.toast.showShortTop('Invalid multi-conf file. Check the [general] and [raw] sections.');
      return;
    }

    const registers = this.multiconfReader.getRegistersConfiguration();
    this.productName = this.multiconfReader.getProduct();
    this.result =
      'Product: ' + this.productName + '\n' +
      'Registers to apply: ' + Object.keys(registers).length;

    // Apply the registers on the connected scanner.
    void this.multiconfSend.sendRegisters(this.deviceId, registers).then(() => {
      this.result += '\nRegistered: ' + this.multiconfSend.registersDone;
      void this.toast.showShortTop('Configuration applied with success');
    }).catch((err) => {
      this.state.log('applyConfiguration error: ' + JSON.stringify(err));
      void this.toast.showShortTop('Error while applying the configuration');
    });
  }
}