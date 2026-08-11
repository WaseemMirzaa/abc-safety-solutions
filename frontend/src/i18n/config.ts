import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import esOverrides from '@/locales/es.json'

const es = { ...en, ...esOverrides } as Record<string, string>

const SUPPORTED_LNGS = ['en', 'es'] as const

const LANGUAGE_STORAGE_KEY = 'ui_language'

function readStoredLanguage(): (typeof SUPPORTED_LNGS)[number] {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && (SUPPORTED_LNGS as readonly string[]).includes(stored)) {
      return stored as (typeof SUPPORTED_LNGS)[number]
    }
  } catch {
    // localStorage unavailable (private browsing, SSR, etc.) — fall through to default
  }
  return 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en as Record<string, string> },
    es: { translation: es },
  },
  lng: readStoredLanguage(),
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LNGS],
  interpolation: { escapeValue: false },
})

/** Persists the learner's language choice so it survives reloads/new sessions, then
 *  actually switches the active UI language (captions/narration follow i18n.language). */
export function setAppLanguage(lang: (typeof SUPPORTED_LNGS)[number]) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  } catch {
    // best-effort persistence only
  }
  void i18n.changeLanguage(lang)
}

/** AI slide-narration languages — always matches supportedLngs above (single source of truth). */
export const NARRATION_LANGUAGES = SUPPORTED_LNGS
export type NarrationLanguageCode = (typeof SUPPORTED_LNGS)[number]

export default i18n
