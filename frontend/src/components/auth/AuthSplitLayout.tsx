import { clsx } from 'clsx'

const LOGO_LIGHT = 'https://abcsafetysolutions.com/wp-content/uploads/2021/10/logo-light.png'

export function AuthLogo({ variant = 'light', className }: { variant?: 'light' | 'dark'; className?: string }) {
  return (
    <img
      src={LOGO_LIGHT}
      alt="ABC Safety Solutions"
      className={clsx(
        'block h-10 w-auto max-w-[11rem] object-contain object-left brightness-0 sm:h-11',
        variant === 'light' && 'opacity-95',
        variant === 'dark' && 'opacity-100',
        className,
      )}
      width={176}
      height={44}
    />
  )
}

type SplitProps = {
  aside: React.ReactNode
  children: React.ReactNode
  /** Full-bleed photo behind the left column (object-cover). */
  asideBackgroundImage?: string
  asideImageAlt?: string
}

/** Two-column auth shell: brand panel + light form column. */
export function AuthSplitLayout({ aside, children, asideBackgroundImage, asideImageAlt = '' }: SplitProps) {
  const photoAside = Boolean(asideBackgroundImage)

  return (
    <div className="min-h-[calc(100svh-4.25rem)] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <aside
        className={clsx(
          'relative hidden min-h-[calc(100svh-4.25rem)] flex-col overflow-hidden lg:flex lg:flex-col',
          !photoAside && 'auth-brand-panel',
          photoAside && 'bg-slate-950',
        )}
      >
        {photoAside ? (
          <>
            <img
              src={asideBackgroundImage}
              alt={asideImageAlt}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              width={1200}
              height={900}
              loading="eager"
              decoding="async"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-600/50 via-sky-800/45 to-amber-600/45 mix-blend-multiply"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/78 to-slate-900/40"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/25 via-transparent to-amber-500/30" aria-hidden />
            <div className="pointer-events-none absolute inset-0 hero-sky-grid opacity-[0.12]" aria-hidden />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 hero-sky-grid opacity-[0.55]" />
            <div
              className="pointer-events-none absolute -left-32 top-1/4 h-[20rem] w-[20rem] rounded-full blur-3xl sm:h-[24rem] sm:w-[24rem]"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 68%)' }}
            />
            <div className="pointer-events-none absolute -right-24 top-1/3 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full blur-3xl">
              <div
                className="h-full w-full opacity-80"
                style={{
                  background:
                    'radial-gradient(circle, rgba(14,165,233,0.28) 0%, transparent 62%), radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
                }}
              />
            </div>
          </>
        )}
        {aside}
      </aside>

      <main className="relative flex flex-col justify-center overflow-hidden border-slate-200/60 bg-gradient-to-br from-sky-50/50 via-slate-50/95 to-white px-4 py-8 sm:px-6 sm:py-10 lg:border-l lg:px-10 lg:py-11 xl:px-14">
        <div
          className="pointer-events-none absolute -right-20 top-0 h-[18rem] w-[18rem] rounded-full blur-3xl opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 65%)' }}
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-[14rem] w-[14rem] rounded-full blur-3xl opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 68%)' }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/80 to-transparent lg:hidden" />
        <div className="relative mx-auto w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  )
}

type PanelImageProps = {
  src: string
  alt: string
  badge: React.ReactNode
  caption: string
  className?: string
}

export function AuthPanelImage({ src, alt, badge, caption, className }: PanelImageProps) {
  return (
    <div className={clsx('relative w-full max-w-lg', className)}>
      <div
        className="pointer-events-none absolute -inset-3 rounded-[1.5rem] opacity-70 blur-2xl"
        style={{
          background:
            'radial-gradient(ellipse at 30% 25%, rgba(56,189,248,0.26), transparent 55%), radial-gradient(ellipse at 75% 75%, rgba(245,158,11,0.16), transparent 50%)',
        }}
      />
      <div className="relative aspect-[5/4] max-h-[min(36vh,19rem)] w-full overflow-hidden rounded-2xl border-2 border-sky-200/80 bg-white shadow-[0_8px_32px_-8px_rgba(14,165,233,0.25),0_24px_56px_-28px_rgba(15,23,42,0.14)] ring-2 ring-sky-400/15 sm:max-h-[min(40vh,22rem)] sm:rounded-3xl">
        <img src={src} alt={alt} className="h-full w-full object-cover" width={900} height={720} loading="lazy" decoding="async" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-900/92 via-brand-900/12 to-sky-900/5" />
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          {badge}
          <p className="mt-2 font-display text-base font-semibold leading-snug tracking-tight text-white sm:text-lg">{caption}</p>
        </div>
      </div>
    </div>
  )
}
