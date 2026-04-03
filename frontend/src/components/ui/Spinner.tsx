import { clsx } from 'clsx'

type Props = {
  className?: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
  caption?: string
}

const wrap = { sm: 'h-8 w-8', md: 'h-11 w-11', lg: 'h-16 w-16' } as const

export function Spinner({ className, label = 'Loading', size = 'md', caption }: Props) {
  return (
    <div
      className={clsx('flex flex-col items-center justify-center gap-4', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={clsx('relative', wrap[size])} aria-hidden>
        <div className="absolute inset-0 rounded-full bg-slate-200/80 ring-1 ring-slate-300/50" />
        <div
          className={clsx(
            'absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 border-r-sky-500/80 motion-safe:animate-spin motion-reduce:animate-none',
            size === 'sm' && 'border-2',
            size === 'md' && 'border-[2.5px]',
            size === 'lg' && 'border-[3px]',
          )}
          style={{ animationDuration: '0.88s' }}
        />
        <div
          className="absolute rounded-full bg-gradient-to-br from-amber-400/25 to-sky-500/15 motion-safe:animate-breathe motion-reduce:animate-none"
          style={{
            inset: size === 'lg' ? '30%' : '32%',
          }}
        />
      </div>
      {caption ? (
        <p className="max-w-xs text-center text-xs font-medium tracking-wide text-slate-500">{caption}</p>
      ) : null}
      <span className="sr-only">{label}</span>
    </div>
  )
}
