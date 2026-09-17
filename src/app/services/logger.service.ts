import { Injectable } from '@angular/core';
import { AppStateService } from './app-state.service';

/**
 * Port of the original `_d()` / `_do()` debug helpers.
 * Everything is accumulated in AppStateService.debugContent so the Debug page
 * can display and copy it.
 */
@Injectable()
export class LoggerService {
  constructor(private state: AppStateService) {}

  /** Debug a message and optionally a value. */
  d(message: string): void {
    this.state.log(message);
  }

  /** Dump the useful fields of an error / JSON object (port of `_do()`). */
  do(obj: unknown): void {
    if (obj !== null && typeof obj === 'object') {
      const anyObj = obj as Record<string, unknown>;
      if ('name' in anyObj) {
        this.d(String(anyObj['name']));
      }
      if ('id' in anyObj) {
        this.d('id: ' + String(anyObj['id']));
      }
      if ('errorMessage' in anyObj) {
        this.d('errorMessage: ' + String(anyObj['errorMessage']));
      }
    } else {
      this.d(String(obj));
    }
  }
}