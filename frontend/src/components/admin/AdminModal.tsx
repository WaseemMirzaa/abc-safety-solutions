import { X } from 'lucide-react'

type Props = {
  title: string
  children: React.ReactNode
  onClose: () => void
  wide?: boolean
}

export function AdminModal({ title, children, onClose, wide }: Props) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-slate-900/50 p-0 pt-8 pb-4 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="admin-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`max-h-[min(92dvh,720px)] mx-auto w-[calc(100%-1rem)] max-w-full min-w-0 overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-200/90 bg-white p-4 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.35)] sm:w-full sm:rounded-2xl sm:p-8 ${wide ? 'sm:max-w-[min(48rem,calc(100vw-2rem))]' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <h2
            id="admin-modal-title"
            className="min-w-0 flex-1 break-words font-display text-lg font-bold text-brand-900 sm:text-xl"
          >
            {title}
          </h2>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-900"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
