import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Bell, Menu, X } from 'lucide-react'
import { clsx } from 'clsx'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useNotificationSocket } from '@/contexts/NotificationSocketContext'
import { t } from '@/i18n/t'
import { brandLogoCustomer } from '@/config/brandAssets'

const navPublic = [
  { to: '/courses', labelKey: 'ui_nav_courses', defaultLabel: 'Courses' },
  { to: '/my-courses', labelKey: 'ui_nav_my_learning', defaultLabel: 'My learning' },
  { to: '/certificates', labelKey: 'ui_nav_certificates', defaultLabel: 'Certificates' },
  { to: '/verify-certificate', labelKey: 'ui_nav_verify_certificate', defaultLabel: 'Verify certificate' },
] as const

function navLabel(item: (typeof navPublic)[number]) {
  return t(item.labelKey, { defaultValue: item.defaultLabel })
}

const navAuthed = [{ to: '/account', labelKey: 'AccountPage_17_account_feb4b6fba4' }] as const

function linkClass({ isActive }: { isActive: boolean }) {
  return clsx(
    'rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200',
    isActive
      ? 'bg-[color:var(--color-abc-blue)]/10 text-sky-900 shadow-inner shadow-sky-900/5 ring-1 ring-[color:var(--color-abc-blue)]/25'
      : 'text-slate-600 hover:bg-slate-100 hover:text-brand-900',
  )
}

export function SiteHeader() {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotificationSocket()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl backdrop-saturate-150">
      <Container className="flex min-h-[5.25rem] min-w-0 items-center justify-between gap-2 py-2 sm:min-h-[5.75rem] sm:gap-4 sm:py-2.5">
        <Link
          to="/"
          className="group flex min-w-0 max-w-[min(100%,14rem)] shrink items-center gap-2 rounded-xl py-1 pr-1 ring-1 ring-slate-200/80 transition hover:ring-[color:var(--color-abc-blue)]/35 sm:max-w-none sm:gap-3 sm:pr-2"
        >
          <span className="flex h-[3.25rem] shrink-0 items-center overflow-hidden rounded-lg bg-black px-2 sm:h-[3.75rem] sm:px-2.5">
            <img
              src={brandLogoCustomer}
              alt={t('ui_brand_logo_alt')}
              className="h-[2.65rem] w-auto max-w-[10.5rem] object-contain object-left sm:h-[3.25rem] sm:max-w-[12.5rem] md:max-w-[14rem]"
            />
          </span>
          <span className="hidden font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:block">
            {t('ui_site_header_online')}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navPublic.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              {navLabel(n)}
            </NavLink>
          ))}
          <NavLink to="/notifications" className={linkClass} aria-label={t('ui_nav_notifications', { defaultValue: 'Notifications' })}>
            <div className="relative flex items-center justify-center">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </NavLink>
          {user
            ? navAuthed.map((n) => (
                <NavLink key={n.to} to={n.to} className={linkClass}>
                  {t(n.labelKey)}
                </NavLink>
              ))
            : null}
          {user?.role === 'admin' ? (
            <NavLink to="/admin" className={linkClass}>
              {t('ui_site_header_admin')}
            </NavLink>
          ) : null}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span
                className="max-w-[11rem] truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
                title={user.email}
              >
                {user.name}
              </span>
              <Button variant="secondary" className="!rounded-full !py-2 !text-xs !font-medium" onClick={() => logout()}>
                {t('ui_site_header_sign_out')}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" className="!rounded-full !px-4">
                  {t('ui_site_header_sign_in')}
                </Button>
              </Link>
              <Link to="/register">
                <Button className="!rounded-full !px-5 !py-2 !text-sm">{t('SiteHeader_93_get_started_dc35ebe597')}</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-xl p-2.5 text-brand-900 ring-1 ring-slate-200/90 hover:bg-slate-50 md:hidden"
          aria-label={open ? t('ui_site_header_aria_close_menu') : t('ui_site_header_aria_open_menu')}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      {open ? (
        <div className="border-t border-slate-200/90 bg-white md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {navPublic.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className="rounded-xl px-4 py-3.5 text-slate-800"
                onClick={() => setOpen(false)}
              >
                {navLabel(n)}
              </NavLink>
            ))}
            <NavLink
              to="/notifications"
              className="flex items-center gap-2 rounded-xl px-4 py-3.5 text-slate-800"
              onClick={() => setOpen(false)}
            >
              <div className="relative flex items-center justify-center">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {t('ui_nav_notifications', { defaultValue: 'Notifications' })}
            </NavLink>
            {user
              ? navAuthed.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className="rounded-xl px-4 py-3.5 text-slate-800"
                    onClick={() => setOpen(false)}
                  >
                    {t(n.labelKey)}
                  </NavLink>
                ))
              : null}
            {user?.role === 'admin' ? (
              <NavLink to="/admin" className="rounded-xl px-4 py-3.5 text-slate-800" onClick={() => setOpen(false)}>
                {t('ui_site_header_admin')}
              </NavLink>
            ) : null}
            <hr className="my-2 border-slate-200" />
            {user ? (
              <button
                type="button"
                className="rounded-xl px-4 py-3.5 text-left text-slate-600"
                onClick={() => {
                  logout()
                  setOpen(false)
                }}
              >
                {t('ui_site_header_sign_out')}
              </button>
            ) : (
              <>
                <Link to="/login" className="rounded-xl px-4 py-3.5 text-slate-800" onClick={() => setOpen(false)}>
                  {t('ui_site_header_sign_in')}
                </Link>
                <Link to="/register" className="rounded-xl px-4 py-3.5 font-semibold text-sky-800" onClick={() => setOpen(false)}>
                  {t('ui_site_header_get_started_mobile')}
                </Link>
              </>
            )}
          </Container>
        </div>
      ) : null}
    </header>
  )
}
