import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { clsx } from 'clsx'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'

const LOGO = 'https://abcsafetysolutions.com/wp-content/uploads/2021/10/logo-light.png'

const navPublic = [
  { to: '/courses', label: 'Courses' },
  { to: '/my-courses', label: 'My learning' },
  { to: '/certificates', label: 'Certificates' },
  { to: '/verify-certificate', label: 'Verify cert' },
]

const navAuthed = [{ to: '/account', label: 'Account' }] as const

function linkClass({ isActive }: { isActive: boolean }) {
  return clsx(
    'rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200',
    isActive
      ? 'bg-sky-600/10 text-sky-800 shadow-inner shadow-sky-900/5 ring-1 ring-sky-600/15'
      : 'text-slate-600 hover:bg-slate-100 hover:text-brand-900',
  )
}

export function SiteHeader() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl backdrop-saturate-150">
      <Container className="flex h-[4.25rem] min-w-0 items-center justify-between gap-2 sm:gap-4">
        <Link
          to="/"
          className="group flex min-w-0 max-w-[min(100%,11rem)] shrink items-center gap-2 rounded-xl py-1 pr-1 ring-1 ring-slate-200/80 transition hover:ring-sky-300/50 sm:max-w-none sm:gap-3 sm:pr-2"
        >
          <span className="flex h-9 shrink-0 items-center rounded-lg bg-slate-50 px-1.5 sm:h-10 sm:px-2">
            <img
              src={LOGO}
              alt="ABC Safety Solutions"
              className="h-7 w-auto max-w-[7.5rem] object-contain object-left brightness-0 sm:h-8 sm:max-w-none"
            />
          </span>
          <span className="hidden font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:block">
            Online
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navPublic.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
          {user
            ? navAuthed.map((n) => (
                <NavLink key={n.to} to={n.to} className={linkClass}>
                  {n.label}
                </NavLink>
              ))
            : null}
          {user?.role === 'admin' ? (
            <NavLink to="/admin" className={linkClass}>
              Admin
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
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" className="!rounded-full !px-4">
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button className="!rounded-full !px-5 !py-2 !text-sm">Get started</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-xl p-2.5 text-brand-900 ring-1 ring-slate-200/90 hover:bg-slate-50 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
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
                {n.label}
              </NavLink>
            ))}
            {user
              ? navAuthed.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className="rounded-xl px-4 py-3.5 text-slate-800"
                    onClick={() => setOpen(false)}
                  >
                    {n.label}
                  </NavLink>
                ))
              : null}
            {user?.role === 'admin' ? (
              <NavLink to="/admin" className="rounded-xl px-4 py-3.5 text-slate-800" onClick={() => setOpen(false)}>
                Admin
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
                Sign out
              </button>
            ) : (
              <>
                <Link to="/login" className="rounded-xl px-4 py-3.5 text-slate-800" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
                <Link to="/register" className="rounded-xl px-4 py-3.5 font-semibold text-sky-800" onClick={() => setOpen(false)}>
                  Get started
                </Link>
              </>
            )}
          </Container>
        </div>
      ) : null}
    </header>
  )
}
