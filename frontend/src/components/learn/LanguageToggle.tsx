import { useTranslation } from 'react-i18next'
import { NARRATION_LANGUAGES, setAppLanguage, type NarrationLanguageCode } from '@/i18n/config'
import { t } from '@/i18n/t'

const LANGUAGE_LABELS: Record<NarrationLanguageCode, string> = {
  en: 'ui_learn_language_en',
  es: 'ui_learn_language_es',
}

/** EN/ES pill toggle for the Learn screen — switches the active UI language, which is
 *  what drives which language's slide captions/narration audio play (see
 *  pickNarrationLang in lib/courseContent.ts, keyed off i18n.language). */
export function LanguageToggle() {
  const { i18n } = useTranslation()
  const active = i18n.language

  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm"
      role="group"
      aria-label={t('ui_learn_language', { defaultValue: 'Language' })}
    >
      {NARRATION_LANGUAGES.map((lang) => {
        const isActive = active === lang
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setAppLanguage(lang)}
            aria-pressed={isActive}
            title={t(LANGUAGE_LABELS[lang], { defaultValue: lang.toUpperCase() })}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              isActive
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            {lang.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
