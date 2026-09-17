import { Injectable } from '@angular/core';

/**
 * Thin wrapper around localStorage. Direct port of the original SettingsService.
 */
@Injectable()
export class SettingsService {
  get(key: string): string | null {
    return window.localStorage.getItem(key);
  }

  save(key: string, value: string): void {
    window.localStorage.setItem(key, value);
  }

  saveBool(key: string, value: boolean): void {
    window.localStorage.setItem(key, value ? '1' : '0');
  }

  getInt(key: string, defaultValue: number): number {
    const value = parseInt(window.localStorage.getItem(key) ?? '', 10);
    if (isNaN(value)) {
      return defaultValue;
    }
    return value;
  }

  getBool(key: string, defaultValue: boolean): boolean {
    const value = parseInt(window.localStorage.getItem(key) ?? '', 10);
    if (isNaN(value)) {
      return defaultValue;
    }
    return value === 1;
  }
}