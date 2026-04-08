import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import esOverrides from '@/locales/es.json'

const es = { ...en, ...esOverrides } as Record<string, string>

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en as Record<string, string> },
    es: { translation: es },
  },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  interpolation: { escapeValue: false },
})

export default i18n
