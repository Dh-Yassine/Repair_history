export type Locale = 'fr' | 'en';

export type Dict = Record<string, unknown>;

/** Resolve nested key like "landing.heroTitle" and interpolate {vars}. */
export function translate(dict: Dict, key: string, vars?: Record<string, string | number>): string {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') {
      cur = undefined;
      break;
    }
    cur = (cur as Record<string, unknown>)[p];
  }
  let str = typeof cur === 'string' ? cur : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

export function translateList(dict: Dict, key: string): string[] {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return [];
    cur = (cur as Record<string, unknown>)[p];
  }
  return Array.isArray(cur) ? cur.filter((x): x is string => typeof x === 'string') : [];
}
