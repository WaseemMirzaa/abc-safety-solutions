import { useState, type MouseEvent } from 'react'
import { Check, Copy } from 'lucide-react'
import { clsx } from 'clsx'
import { copyTextToClipboard } from '@/lib/copyToClipboard'
import { t } from '@/i18n/t'

type Props = {
  text: string
  className?: string
  label?: string
}

export function CopyCertificateIdButton({ text, className, label }: Props) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  async function copy(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    setFailed(false)
    const ok = await copyTextToClipboard(text)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      return
    }
    setFailed(true)
    window.setTimeout(() => setFailed(false), 2500)
  }

  const ariaLabel = label ?? t('ui_copy_cert_id', { defaultValue: 'Copy certificate ID' })

  return (
    <button
      type="button"
      onClick={(e) => void copy(e)}
      className={clsx(
        'relative z-10 inline-flex cursor-pointer items-center gap-1 rounded-md border bg-white px-2 py-1 text-xs font-medium transition',
        copied && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        failed && 'border-amber-200 bg-amber-50 text-amber-900',
        !copied && !failed && 'border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800',
        className,
      )}
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          <span>{t('ui_copy_cert_id_done', { defaultValue: 'Copied' })}</span>
        </>
      ) : failed ? (
        <span>{t('ui_copy_cert_id_failed', { defaultValue: 'Copy failed' })}</span>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t('ui_copy_cert_id', { defaultValue: 'Copy' })}</span>
        </>
      )}
    </button>
  )
}
