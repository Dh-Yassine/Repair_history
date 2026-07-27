import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from 'react';
import { en } from './locales/en';
import { fr } from './locales/fr';
import { translate, translateList, type Locale } from './utils';

const STORAGE_KEY = 'autohistory_locale';
/** Survives Vite HMR re-evaluating this module (avoids duplicate createContext instances). */
const CONTEXT_KEY = '__autohistory_language_context__';

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tList: (key: string) => string[];
};

type GlobalWithCtx = typeof globalThis & {
  [CONTEXT_KEY]?: Context<LanguageContextValue | null>;
};

const LanguageContext =
  (globalThis as GlobalWithCtx)[CONTEXT_KEY] ??
  createContext<LanguageContextValue | null>(null);
(globalThis as GlobalWithCtx)[CONTEXT_KEY] = LanguageContext;

function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'fr') return v;
  } catch {
    /* ignore */
  }
  return 'fr';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === 'undefined' ? 'fr' : readStoredLocale()
  );

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const dict = locale === 'en' ? en : fr;

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(dict, key, vars),
    [dict]
  );

  const tList = useCallback((key: string) => translateList(dict, key), [dict]);

  const value = useMemo(
    () => ({ locale, setLocale, t, tList }),
    [locale, setLocale, t, tList]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

/** Translate a stored event-type string for display (DB stays English). */
export function useEventTypeLabel() {
  const { t } = useLanguage();
  return (eventType: string) => {
    const key = `events.types.${eventType}`;
    const translated = t(key);
    return translated === key ? eventType : translated;
  };
}
