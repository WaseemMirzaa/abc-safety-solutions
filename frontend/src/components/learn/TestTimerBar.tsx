import { clsx } from 'clsx'
import { Clock } from 'lucide-react'
import { t } from '@/i18n/t'

type Props = {
  remainingSec: number
  totalSec: number
  progressPct: number
  expired: boolean
  urgent: boolean
  critical: boolean
  label: string
  className?: string
}

export function TestTimerBar({
  remainingSec,
  totalSec,
  progressPct,
  expired,
  urgent,
  critical,
  label,
  className,
}: Props) {
  const barClass = expired
    ? 'bg-rose-500'
    : critical
      ? 'bg-rose-500'
      : urgent
        ? 'bg-amber-500'
        : 'bg-gradient-to-r from-sky-400 to-sky-600'

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-2xl border shadow-sm ring-1',
        expired
          ? 'border-rose-200 bg-rose-50/90 ring-rose-100'
          : critical
            ? 'border-rose-200/80 bg-white ring-rose-100/80'
            : 'border-slate-200/90 bg-white ring-slate-100',
        className,
      )}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              expired ? 'bg-rose-600 text-white' : critical ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-800'
            }`}
          >
            <Clock className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t('ui_learn_test_time_label', { defaultValue: 'Time remaining' })}
            </p>
            <p
              className={`font-display text-xl font-bold tabular-nums tracking-tight ${
                expired ? 'text-rose-800' : critical ? 'text-rose-700' : 'text-brand-900'
              }`}
            >
              {expired ? t('ui_learn_test_time_up', { defaultValue: "Time's up" }) : label}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-600">
          {expired
            ? t('ui_learn_test_time_expired_hint', {
                defaultValue: 'Answers locked — scoring your selections.',
              })
            : t('ui_learn_test_time_limit_hint', {
                defaultValue: '{{min}} minute limit',
                min: Math.round(totalSec / 60),
              })}
        </p>
      </div>
      <div className="h-2 bg-slate-200/90">
        <div
          className={`h-full transition-[width] duration-300 ease-linear ${barClass}`}
          style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
        />
      </div>
      {!expired && remainingSec <= 60 ? (
        <p className="border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-center text-[11px] font-medium text-amber-900/90">
          {t('ui_learn_test_time_warning', { defaultValue: 'Less than one minute left' })}
        </p>
      ) : null}
    </div>
  )
}
