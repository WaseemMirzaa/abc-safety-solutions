import { motion, useReducedMotion } from 'framer-motion'
import { Presentation } from 'lucide-react'

type Phase = 'downloading' | 'processing'

type Props = {
  phase: Phase
  downloadPct: number
  compact?: boolean
}

export function PresentationLoader({ phase, downloadPct, compact = false }: Props) {
  const reduce = useReducedMotion()
  const pct =
    phase === 'downloading' && downloadPct > 0
      ? downloadPct
      : phase === 'processing'
        ? undefined
        : phase === 'downloading'
          ? 12
          : 55

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-[inherit] bg-gradient-to-br from-sky-50/95 via-white/92 to-sky-50/90 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={phase === 'processing' ? 'Preparing slides' : 'Loading presentation'}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(circle at 25% 15%, rgba(56,189,248,0.18), transparent 42%), radial-gradient(circle at 75% 85%, rgba(14,165,233,0.14), transparent 48%)',
        }}
      />

      {!reduce ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-lg border border-sky-200/60 bg-white/80 shadow-md"
              style={{
                width: compact ? 48 : 72,
                height: compact ? 32 : 48,
              }}
              initial={{ opacity: 0, scale: 0.85, rotate: -8 + i * 6 }}
              animate={{
                opacity: [0.25, 0.55, 0.25],
                scale: [0.9, 1, 0.9],
                y: [8 - i * 4, -6 + i * 2, 8 - i * 4],
                rotate: [-6 + i * 5, 4 - i * 2, -6 + i * 5],
              }}
              transition={{ duration: 2.4 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
            />
          ))}
        </div>
      ) : null}

      <div className={`relative flex flex-col items-center ${compact ? 'scale-90' : ''}`}>
        <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center">
          {!reduce ? (
            <>
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-sky-300/50"
                animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.1, 0.45] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.span
                className="absolute inset-1 rounded-full border border-sky-300/40"
                animate={{ scale: [1.05, 1, 1.05], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              />
            </>
          ) : null}
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 72 72" aria-hidden>
            <circle cx="36" cy="36" r="32" fill="none" className="stroke-slate-200/90" strokeWidth="4" />
            <circle
              cx="36"
              cy="36"
              r="32"
              fill="none"
              className="stroke-sky-500 transition-[stroke-dashoffset] duration-300 ease-out"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 32}
              strokeDashoffset={2 * Math.PI * 32 * (1 - (pct ?? 20) / 100)}
            />
          </svg>
          <motion.span
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-sky-100"
            animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Presentation className="h-5 w-5 text-sky-600" aria-hidden />
          </motion.span>
        </div>

        <div className="mt-5 flex items-center gap-1.5" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="h-1 w-1 rounded-full bg-sky-500 sm:h-1.5 sm:w-1.5"
              animate={reduce ? undefined : { opacity: [0.2, 1, 0.2], scale: [0.8, 1.15, 0.8] }}
              transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <div className="mt-4 h-2 w-44 max-w-[min(88vw,14rem)] overflow-hidden rounded-full bg-slate-200/90 shadow-inner sm:w-52">
          {phase === 'processing' && !reduce ? (
            <motion.div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-sky-500 to-transparent"
              animate={{ x: ['-120%', '280%'] }}
              transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : (
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600"
              initial={{ width: '8%' }}
              animate={{ width: `${Math.max(10, pct ?? 15)}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
