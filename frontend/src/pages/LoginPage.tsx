import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLogo, AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { DEMO_ACCOUNTS, findDemoAccount } from '@/config/demoAccounts'
import { seedDemoLearnerPurchasesIfNeeded } from '@/lib/demoSeed'
import { loginPanelImage } from '@/config/brandAssets'
import { BookOpen, Shield } from 'lucide-react'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  const fillDemo = (which: 'learner' | 'admin') => {
    const a = DEMO_ACCOUNTS[which === 'learner' ? 0 : 1]
    setEmail(a.email)
    setName(a.name)
    setPassword(a.password)
    setErr('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!email.trim() || !name.trim()) {
      setErr('Enter name and email.')
      return
    }

    const from = loc.state?.from
    const demo = findDemoAccount(email)

    if (demo) {
      if (password !== demo.password) {
        setErr('Incorrect password for this demo account.')
        return
      }
      login({ email: demo.email, name: demo.name, role: demo.role })
      if (demo.role === 'admin') {
        navigate(from?.startsWith('/admin') ? from : '/admin', { replace: true })
        return
      }
      seedDemoLearnerPurchasesIfNeeded()
      if (from?.startsWith('/admin')) {
        navigate('/my-courses', { replace: true })
        return
      }
      navigate(from ?? '/my-courses', { replace: true })
      return
    }

    if (password.trim()) {
      setErr('Unknown email or use a demo account (password only applies to demo emails).')
      return
    }

    login({ email: email.trim(), name: name.trim(), role: 'learner' })
    if (from?.startsWith('/admin')) {
      navigate('/my-courses', { replace: true })
      return
    }
    navigate(from ?? '/my-courses', { replace: true })
  }

  const aside = (
    <div className="relative z-10 flex h-full min-h-0 w-full flex-col justify-between p-6 lg:p-8 xl:p-10">
      <div className="shrink-0">
        <AuthLogo className="brightness-0 invert drop-shadow-md" />
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-100/95 backdrop-blur-md">
          <BookOpen className="h-3.5 w-3.5 text-amber-400" aria-hidden />
          Learning hub
        </div>
        <p className="mt-4 font-display text-2xl font-bold leading-[1.15] tracking-tight text-white drop-shadow-sm sm:text-3xl xl:text-[2rem]">
          Welcome back
        </p>
        <p className="mt-2.5 max-w-md text-sm leading-snug text-slate-200/90">
          Sign in to resume courses, knowledge checks, and certificates—built for teams who train between job sites.
        </p>
      </div>

      <p className="my-6 max-w-md font-display text-base font-semibold leading-snug tracking-tight text-white/95 sm:text-lg">
        Continue slides, tests, and credentials from one dashboard.
      </p>

      <div className="mt-auto flex shrink-0 items-start gap-2.5 rounded-xl border border-white/15 bg-slate-950/45 p-3 shadow-lg shadow-black/20 backdrop-blur-md ring-1 ring-white/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-600/25 ring-1 ring-sky-400/30">
          <Shield className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-[12px] leading-snug text-slate-200 sm:text-[13px]">
          <span className="font-medium text-white">Demo mode.</span> Session stored in{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-sky-100 ring-1 ring-white/15">localStorage</code>
          —production will use NestJS auth.
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
        Sign in
      </p>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        <span className="bg-gradient-to-r from-sky-800 via-sky-700 to-brand-900 bg-clip-text text-transparent">Access your account</span>
      </h1>
      <p className="mt-2 text-sm leading-snug text-slate-600">
        Demo accounts use a password; any other email signs in without one for quick testing.
      </p>

      <div className="relative mt-6 overflow-hidden rounded-2xl border border-sky-200/70 bg-white/95 p-5 shadow-[0_6px_28px_-6px_rgba(14,165,233,0.18),0_20px_44px_-26px_rgba(15,23,42,0.12)] ring-1 ring-sky-100/70 backdrop-blur-[2px] sm:p-6">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-400 via-sky-500 to-amber-400" aria-hidden />
        <div className="relative rounded-xl border border-sky-100/90 bg-gradient-to-br from-sky-50/95 to-white p-3 shadow-inner shadow-sky-900/[0.03] sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-gradient-to-r from-sky-500 to-sky-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-sky-600/30">
              Demo
            </span>
            <p className="font-display text-sm font-semibold text-brand-900">Credentials</p>
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-snug text-slate-700 sm:text-[13px]">
            <li className="border-b border-slate-200/80 pb-2">
              <span className="font-semibold text-brand-900">Learner</span>
              <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[11px] text-slate-600 sm:text-xs">
                <code className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200/80">learner@demo.local</code>
                <code className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200/80">DemoLearner123!</code>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">Includes sample enrollments.</p>
            </li>
            <li>
              <span className="font-semibold text-brand-900">Admin</span>
              <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[11px] text-slate-600 sm:text-xs">
                <code className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200/80">admin@demo.local</code>
                <code className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200/80">DemoAdmin123!</code>
              </div>
            </li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="!rounded-lg !py-2 !text-xs" onClick={() => fillDemo('learner')}>
              Apply learner
            </Button>
            <Button type="button" variant="secondary" className="!rounded-lg !py-2 !text-xs" onClick={() => fillDemo('admin')}>
              Apply admin
            </Button>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Full name
            </label>
            <p className="mt-0.5 text-[11px] text-slate-400">Shown on certificates</p>
            <input id="name" className="input-pro mt-2" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input-pro mt-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Password
            </label>
            <p className="mt-0.5 text-[11px] text-slate-400">Required only for demo emails above</p>
            <input
              id="password"
              type="password"
              className="input-pro mt-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {err ? <p className="text-sm font-medium text-red-600">{err}</p> : null}
          <Button type="submit" className="w-full !py-3">
            Continue
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="font-medium text-slate-500 transition hover:text-sky-700">
          Forgot password?
        </Link>
      </p>
      <p className="mt-3 rounded-xl border border-sky-100/80 bg-sky-50/40 px-4 py-3 text-center text-sm text-slate-600">
        New here?{' '}
        <Link to="/register" className="font-semibold text-sky-700 underline decoration-sky-300/80 underline-offset-2 transition hover:text-sky-800">
          Create an account
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
