import { Injectable, signal } from '@angular/core';
import {
  AGF_CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY_CODE,
  FormatCurrencyOptions,
  formatCurrencyAmount,
  normalizeCurrencyCode,
} from '../shared/utils/currency-format.util';

/**
 * Código ISO 4217 activo para toda la app. Se persiste en localStorage y se
 * actualiza desde configuración-sistema y, si el backend lo envía, desde /auth/me.
 */
@Injectable({ providedIn: 'root' })
export class CurrencyPreferenceService {
  private readonly _code = signal(DEFAULT_CURRENCY_CODE);

  /** Signal legible (p. ej. plantillas: `currency.currencyCode()`). */
  readonly currencyCode = this._code.asReadonly();

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    try {
      const raw = localStorage.getItem(AGF_CURRENCY_STORAGE_KEY);
      if (raw) this._code.set(normalizeCurrencyCode(raw));
    } catch {
      /* ignore */
    }
  }

  setCurrencyCode(code: string | null | undefined): void {
    const next = normalizeCurrencyCode(code);
    this._code.set(next);
    try {
      localStorage.setItem(AGF_CURRENCY_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  /** Llamar en logout para no mezclar preferencias entre cuentas en el mismo navegador. */
  resetSessionCurrency(): void {
    this._code.set(DEFAULT_CURRENCY_CODE);
    try {
      localStorage.removeItem(AGF_CURRENCY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  format(amount: number, options?: FormatCurrencyOptions): string {
    return formatCurrencyAmount(amount, this._code(), options);
  }
}
