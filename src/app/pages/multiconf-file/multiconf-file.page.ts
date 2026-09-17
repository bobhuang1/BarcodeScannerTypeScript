import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MulticonfReaderService } from '../../services/multiconf-reader.service';
import { MulticonfSendService } from '../../services/multiconf-send.service';
import { AppStateService } from '../../services/app-state.service';
import { ToastService } from '../../services/toast.service';

/**
 * Apply a multi-conf configuration picked from the device storage.
 * Port of the original MulticonfFileController.
 */
@Component({
  selector: 'app-multiconf-file',
  templateUrl: './multiconf-file.page.html',
  styleUrls: ['./multiconf-file.page.scss']
})
export class MulticonfFilePage {
  deviceId = '';
  fileName = '';
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

  /** Called when the user picks a file through the hidden input. */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (!file) {
      return;
    }

    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      this.applyConfiguration(content);
      input.value = '';
    };
    reader.onerror = () => {
      void this.toast.showShortTop('Error while reading the file');
    };
    reader.readAsText(file);
  }

  /** Validate the file content and report the outcome. */
  private applyConfiguration(content: string): void {
    this.multiconfReader.setContent(content);
    this.multiconfReader.parse();

    if (!this.multiconfReader.isContentValid()) {
      void this.toast.showShortTop('Invalid multi-conf file. Check the [general] and [raw] sections.');
      return;
    }

    const registers = this.multiconfReader.getRegistersConfiguration();
    this.result =
      'File: ' + this.fileName + '\n' +
      'Product: ' + this.multiconfReader.getProduct() + '\n' +
      'Registers to apply: ' + Object.keys(registers).length;

    void this.multiconfSend.sendRegisters(this.deviceId, registers).then(() => {
      this.result += '\nRegistered: ' + this.multiconfSend.registersDone;
      void this.toast.showShortTop('Configuration applied with success');
    }).catch((err) => {
      this.state.log('applyConfiguration error: ' + JSON.stringify(err));
      void this.toast.showShortTop('Error while applying the configuration');
    });
  }
}