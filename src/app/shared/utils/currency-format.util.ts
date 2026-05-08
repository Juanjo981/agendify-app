/**
 * Formato de moneda con Intl (sin dependencias). El código ISO lo suministra
 * CurrencyPreferenceService (configuración del consultorio / sesión).
 */

export const AGF_CURRENCY_STORAGE_KEY = 'agf_currency_iso';

export const DEFAULT_CURRENCY_CODE = 'MXN';

const VALID_ISO = /^[A-Z]{3}$/;

export function normalizeCurrencyCode(raw: string | null | undefined): string {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (VALID_ISO.test(s)) return s;
  return DEFAULT_CURRENCY_CODE;
}

export interface FormatCurrencyOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Formatea un monto con la moneda ISO indicada (p. ej. MXN, USD, EUR).
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string,
  options?: FormatCurrencyOptions,
): string {
  const code = normalizeCurrencyCode(currencyCode);
  const locale = options?.locale ?? 'es-MX';
  const min = options?.minimumFractionDigits;
  const max = options?.maximumFractionDigits;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      ...(min !== undefined ? { minimumFractionDigits: min } : {}),
      ...(max !== undefined ? { maximumFractionDigits: max } : {}),
    }).format(Number(amount) || 0);
  } catch {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: DEFAULT_CURRENCY_CODE,
      maximumFractionDigits: max ?? 2,
    }).format(Number(amount) || 0);
  }
}

/** Alias breve para uso en templates / servicios. */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  options?: FormatCurrencyOptions,
): string {
  return formatCurrencyAmount(amount, currencyCode, options);
}

/** Eje Y / tooltips en Chart.js cuando el valor es dinero (no conteos). */
export function chartJsCurrencyTickFormatter(
  currencyCode: string,
  options?: Pick<FormatCurrencyOptions, 'locale' | 'maximumFractionDigits'>,
): (value: string | number) => string {
  const code = normalizeCurrencyCode(currencyCode);
  const locale = options?.locale ?? 'es-MX';
  const maxDigits = options?.maximumFractionDigits ?? 0;
  return (rawValue: string | number) =>
    formatCurrencyAmount(Number(rawValue), code, { locale, maximumFractionDigits: maxDigits });
}

/*
 * Chart.js — tooltips con moneda (inyectar `currencyCode` desde CurrencyPreferenceService):
 *
 *   plugins: {
 *     tooltip: {
 *       callbacks: {
 *         label: (ctx) => {
 *           const y = ctx.parsed.y;
 *           return formatCurrencyAmount(y, currencyCode, { maximumFractionDigits: 0 });
 *         },
 *       },
 *     },
 *   },
 */
