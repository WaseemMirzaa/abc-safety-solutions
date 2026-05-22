import { ShieldX } from 'lucide-react'
import { Button } from '@/components/Button'
import { t } from '@/i18n/t'

type Props = {
  open: boolean
  searchedId: string
  onClose: () => void
}

export function VerifyNotFoundModal({ open, searchedId, onClose }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="verify-not-found-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 via-rose-400 to-amber-300" aria-hidden />
        <div className="px-8 pb-8 pt-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-rose-100 ring-1 ring-red-200/80">
            <ShieldX className="h-8 w-8 text-red-500" strokeWidth={1.75} />
          </div>
          <h2
            id="verify-not-found-title"
            className="mt-6 font-display text-xl font-bold tracking-tight text-brand-900"
          >
            {t('ui_verify_not_found_title', { defaultValue: 'Certificate not found' })}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {t('ui_verify_not_found_body', {
              defaultValue:
                'No valid certificate matches that ID. Check the number on your credential and try again.',
            })}
          </p>
          {searchedId ? (
            <p className="mt-4 inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm font-semibold text-slate-700">
              {searchedId}
            </p>
          ) : null}
          <Button type="button" className="mt-8 w-full" onClick={onClose}>
            {t('ui_verify_not_found_close', { defaultValue: 'Close' })}
          </Button>
        </div>
      </div>
    </div>
  )
}
