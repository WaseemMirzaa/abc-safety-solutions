import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLogo, AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { authLogin } from '@/api/localData'
import { ApiError } from '@/api/client'
import { loginPanelImage } from '@/config/brandAssets'
import { BookOpen, Shield } from 'lucide-react'
import { t } from '@/i18n/t'

function safeInternalPath(p: string | undefined): string | undefined {
  if (!p) return undefined
  if (!p.startsWith('/') || p.startsWith('//')) return undefined
  return p
}

export function LoginPage() {
  const { applySession } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [searchParams] = useSearchParams()
  const redirectQuery = searchParams.get('redirect')?.trim() || undefined
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!email.trim() || !password.trim()) {
      setErr(t('ui_login_err_email_password'))
      return
    }
    setBusy(true)
    try {
      const r = await authLogin(email.trim(), password)
      applySession(r.accessToken, r.user)
      const from = safeInternalPath(loc.state?.from) ?? safeInternalPath(redirectQuery)
      if (r.user.role === 'admin') {
        navigate(from?.startsWith('/admin') ? from : '/admin', { replace: true })
        return
      }
      if (from?.startsWith('/admin')) {
        navigate('/my-courses', { replace: true })
        return
      }
      navigate(from ?? '/my-courses', { replace: true })
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  const aside = (
    <div className="relative z-10 flex h-full min-h-0 w-full flex-col justify-between p-6 lg:p-8 xl:p-10">
      <div className="shrink-0">
        <AuthLogo className="drop-shadow-md" />
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-100/95 backdrop-blur-md">
          <BookOpen className="h-3.5 w-3.5 text-amber-400" aria-hidden />
          {t('ui_login_learning_hub')}
        </div>
        <p className="mt-4 font-display text-2xl font-bold leading-[1.15] tracking-tight text-white drop-shadow-sm sm:text-3xl xl:text-[2rem]">
          {t('ui_login_welcome_back')}
        </p>
        <p className="mt-2.5 max-w-md text-sm leading-snug text-slate-200/90">{t('ui_login_hero_sub')}</p>
      </div>

      <p className="my-6 max-w-md font-display text-base font-semibold leading-snug tracking-tight text-white/95 sm:text-lg">
        {t('ui_login_continue_slides')}
      </p>

      <div className="mt-auto flex shrink-0 items-start gap-2.5 rounded-xl border border-white/15 bg-slate-950/45 p-3 shadow-lg shadow-black/20 backdrop-blur-md ring-1 ring-white/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-600/25 ring-1 ring-sky-400/30">
          <Shield className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-[12px] leading-snug text-slate-200 sm:text-[13px]">
          {t('ui_login_session_stored_blurb')}
        </p>
      </div>
    </div>
  )

  return (
    <AuthSplitLayout aside={aside} asideBackgroundImage={loginPanelImage} asideImageAlt="">
      <div className="lg:hidden">
        <AuthLogo variant="dark" className="mb-5" />
      </div>

      <p className="inline-flex w-fit items-center rounded-full border border-sky-200/80 bg-gradient-to-r from-sky-50 to-white px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-800 shadow-sm shadow-sky-900/5">
        {t('ui_login_signin_badge')}
      </p>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        <span className="bg-gradient-to-r from-sky-800 via-sky-700 to-brand-900 bg-clip-text text-transparent">{t('LoginPage_114_access_your_account_21d9d6cb8d')}</span>
      </h1>
      <p className="mt-2 text-sm leading-snug text-slate-600">{t('ui_login_subtitle')}</p>

      <div className="relative mt-6 overflow-hidden rounded-2xl border border-sky-200/70 bg-white/95 p-5 shadow-[0_6px_28px_-6px_rgba(14,165,233,0.18),0_20px_44px_-26px_rgba(15,23,42,0.12)] ring-1 ring-sky-100/70 backdrop-blur-[2px] sm:p-6">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-400 via-sky-500 to-amber-400" aria-hidden />
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('ui_login_label_email')}
            </label>
            <input
              id="email"
              type="email"
              className="input-pro mt-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('ui_login_label_password')}
            </label>
            <input
              id="password"
              type="password"
              className="input-pro mt-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {err ? <p className="text-sm font-medium text-red-600">{err}</p> : null}
          <Button type="submit" className="w-full !py-3" disabled={busy}>
            {t('ui_login_continue_btn')}
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="font-medium text-slate-500 transition hover:text-sky-700">
          {t('ui_login_forgot')}
        </Link>
      </p>
      <p className="mt-3 rounded-xl border border-sky-100/80 bg-sky-50/40 px-4 py-3 text-center text-sm text-slate-600">
        {t('ui_login_new_here')}{' '}
        <Link to="/register" className="font-semibold text-sky-700 underline decoration-sky-300/80 underline-offset-2 transition hover:text-sky-800">
          {t('ui_login_create_account')}
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
