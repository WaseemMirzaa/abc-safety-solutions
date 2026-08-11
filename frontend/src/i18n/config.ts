import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import esOverrides from '@/locales/es.json'

const es = { ...en, ...esOverrides } as Record<string, string>

const SUPPORTED_LNGS = ['en', 'es'] as const

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en as Record<string, string> },
    es: { translation: es },
  },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LNGS],
  interpolation: { escapeValue: false },
})

/** AI slide-narration languages — always matches supportedLngs above (single source of truth). */
export const NARRATION_LANGUAGES = SUPPORTED_LNGS
export type NarrationLanguageCode = (typeof SUPPORTED_LNGS)[number]

export default i18n
