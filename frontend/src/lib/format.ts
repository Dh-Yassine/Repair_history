/**
 * Locale-aware date and number formatting.
 *
 * The active locale is read from `<html lang>`, which LanguageContext keeps in sync.
 * That keeps these usable from plain helpers as well as components, and avoids
 * `toLocaleDateString()` falling back to the browser locale — which rendered US
 * dates (7/27/2026) and comma thousands separators inside the French UI.
 */

type Numberish = number | null | undefined;

function currentLocale(): string {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : '';
  // en-GB rather than en-US so both locales stay day-first and unambiguous.
  return lang === 'en' ? 'en-GB' : 'fr-FR';
}

function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | number | Date | null | undefined): string {
  if (value == null) return '—';
  const d = toDate(value);
  return d ? d.toLocaleDateString(currentLocale()) : '—';
}

export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value == null) return '—';
  const d = toDate(value);
  if (!d) return '—';
  return `${d.toLocaleDateString(currentLocale())} ${d.toLocaleTimeString(currentLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function formatNumber(value: Numberish, options?: Intl.NumberFormatOptions): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString(currentLocale(), options);
}

/** Whole kilometres with a non-breaking space before the unit. */
export function formatKm(value: Numberish): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatNumber(Math.round(value))}\u00a0km`;
}

export function formatCurrency(value: Numberish): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\u00a0€`;
}
