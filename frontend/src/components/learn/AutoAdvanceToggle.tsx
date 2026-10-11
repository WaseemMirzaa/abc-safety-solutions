import { t } from '@/i18n/t'

const STORAGE_KEY = 'abc.learn.autoAdvance'

export function readAutoAdvancePref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeAutoAdvancePref(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Learn-screen toggle: when on, finishing narration auto-moves to the next slide. */
export function AutoAdvanceToggle({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={t('ui_learn_auto_advance', { defaultValue: 'Auto-advance' })}
      title={t('ui_learn_auto_advance_hint', {
        defaultValue: enabled
          ? 'Auto-advance is on — next slide opens when narration ends'
          : 'Auto-advance is off — tap Next after narration ends',
      })}
      onClick={() => onChange(!enabled)}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
        enabled
          ? 'border-sky-300 bg-sky-50 text-sky-900'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      <span
        className={`relative h-4 w-7 shrink-0 rounded-full transition ${enabled ? 'bg-sky-600' : 'bg-slate-300'}`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition ${
            enabled ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </span>
      {t('ui_learn_auto_advance', { defaultValue: 'Auto-advance' })}
    </button>
  )
}
