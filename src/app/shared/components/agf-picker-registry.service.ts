import { Injectable } from '@angular/core';

/**
 * AgfPickerRegistryService
 * ──────────────────────────────────────────────────────────────────────────────
 * Global singleton that ensures only ONE agf-date-picker or agf-time-picker
 * panel is open at a time.  When a picker calls open(), any previously-open
 * picker is closed automatically before the new one appears.
 *
 * Each picker registers itself as a Closeable object — just an object with a
 * close() method — so the service has no direct dependency on picker classes.
 */
export interface Closeable {
  close(): void;
}

@Injectable({ providedIn: 'root' })
export class AgfPickerRegistryService {
  private _active: Closeable | null = null;

  /**
   * Called by a picker when it is about to open.
   * Closes whatever was open before, then records the new active picker.
   */
  open(picker: Closeable): void {
    if (this._active && this._active !== picker) {
      this._active.close();
    }
    this._active = picker;
  }

  /**
   * Called by a picker when it closes itself (date selected, outside click,
   * scroll, or ngOnDestroy).  Clears the reference so there is no dangling
   * pointer to a destroyed component.
   */
  dismiss(picker: Closeable): void {
    if (this._active === picker) {
      this._active = null;
    }
  }
}
