import { clsx } from 'clsx'

const variants = {
  primary:
    'bg-gradient-to-b from-amber-400 to-amber-600 text-brand-950 font-semibold shadow-lg shadow-amber-900/25 ring-1 ring-amber-400/30 hover:from-amber-300 hover:to-amber-500 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
  secondary:
    'bg-white text-brand-900 font-medium ring-1 ring-slate-200/90 shadow-sm hover:bg-slate-50 hover:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400',
  ghost:
    'text-slate-700 font-medium hover:bg-slate-100 hover:text-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/40',
  danger:
    'bg-gradient-to-b from-red-500 to-red-600 text-white font-semibold shadow-lg shadow-red-900/20 hover:from-red-400 hover:to-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500',
  outlineLight:
    'border border-slate-300/90 bg-white text-brand-900 font-medium shadow-sm hover:border-sky-300/80 hover:bg-sky-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/50',
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: React.ComponentProps<'button'> & { variant?: keyof typeof variants }) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 active:scale-[0.98] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
