import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { clsx } from 'clsx'
import { t } from '@/i18n/t'

type Props = {
  text: string
  className?: string
  label?: string
}

export function CopyCertificateIdButton({ text, className, label }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={clsx(
        'inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800',
        className,
      )}
      title={label ?? t('ui_copy_cert_id', { defaultValue: 'Copy certificate ID' })}
      aria-label={label ?? t('ui_copy_cert_id', { defaultValue: 'Copy certificate ID' })}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-emerald-700">{t('ui_copy_cert_id_done', { defaultValue: 'Copied' })}</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only">{t('ui_copy_cert_id', { defaultValue: 'Copy' })}</span>
        </>
      )}
    </button>
  )
}
