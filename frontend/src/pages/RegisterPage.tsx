import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLogo, AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { registerPanelImage } from '@/config/brandAssets'
import { isReservedDemoEmail } from '@/config/demoAccounts'
import { Award, UserPlus } from 'lucide-react'

export function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!email.trim() || !name.trim()) {
      setErr('Enter name and email.')
      return
    }
    if (isReservedDemoEmail(email)) {
      setErr('This email is reserved for demo sign-in. Use Sign in instead.')
      return
    }
    login({ email: email.trim(), name: name.trim(), role: 'learner' })
    navigate('/courses', { replace: true })
  }

  const aside = (
    <div className="relative z-10 flex h-full min-h-0 w-full flex-col justify-between p-6 lg:p-8 xl:p-10">
      <div className="shrink-0">
        <AuthLogo className="brightness-0 invert drop-shadow-md" />
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-black/25 px-3 py-1.5 text-[11px] font-medium text-amber-100 shadow-sm backdrop-blur-md ring-1 ring-white/10">
          <UserPlus className="h-3.5 w-3.5 text-amber-400" aria-hidden />
          New learner
        </div>
        <p className="mt-4 font-display text-2xl font-bold leading-[1.15] tracking-tight text-white drop-shadow-sm sm:text-3xl xl:text-[2rem]">
          Create your profile
        </p>
        <p className="mt-2.5 max-w-md text-sm leading-snug text-slate-200/90">
          One place for catalog access, progress, and completion records—ready to sync when the API goes live.
        </p>
      </div>

      <p className="my-6 max-w-md font-display text-base font-semibold leading-snug tracking-tight text-white/95 sm:text-lg">
        Structured modules, knowledge checks, and completion records in one place.
      </p>

      <div className="mt-auto flex shrink-0 items-start gap-2.5 rounded-xl border border-white/15 bg-slate-950/45 p-3 shadow-lg shadow-black/20 backdrop-blur-md ring-1 ring-white/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm shadow-amber-600/25 ring-1 ring-amber-300/40">
          <Award className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-[12px] leading-snug text-slate-200 sm:text-[13px]">
          <span className="font-medium text-white">Certificates & progress</span> stay on this device until backend auth ships.
        </p>
      </div>
    </div>
  )

  return (
    <AuthSplitLayout aside={aside} asideBackgroundImage={registerPanelImage} asideImageAlt="">
      <div className="lg:hidden">
        <AuthLogo variant="dark" className="mb-5" />
      </div>

      <p className="inline-flex w-fit items-center rounded-full border border-sky-200/80 bg-gradient-to-r from-sky-50 to-white px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-800 shadow-sm shadow-sky-900/5">
        Register
      </p>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        <span className="bg-gradient-to-r from-sky-800 via-sky-700 to-brand-900 bg-clip-text text-transparent">Create your account</span>
      </h1>
      <p className="mt-2 text-sm leading-snug text-slate-600">
        Use a real-looking email and name—reserved demo addresses must use the sign-in page instead.
      </p>

      <div className="relative mt-6 overflow-hidden rounded-2xl border border-sky-200/70 bg-white/95 p-5 shadow-[0_6px_28px_-6px_rgba(14,165,233,0.18),0_20px_44px_-26px_rgba(15,23,42,0.12)] ring-1 ring-sky-100/70 backdrop-blur-[2px] sm:p-6">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400 via-sky-500 to-sky-600" aria-hidden />
        <form onSubmit={submit} className="relative space-y-4">
          <div>
            <label htmlFor="r-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Full name
            </label>
            <p className="mt-0.5 text-[11px] text-slate-400">Used on certificates</p>
            <input id="r-name" className="input-pro mt-2" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="r-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Work email
            </label>
            <input
              id="r-email"
              type="email"
              className="input-pro mt-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          {err ? <p className="text-sm font-medium text-red-600">{err}</p> : null}
          <Button type="submit" className="w-full !py-3">
            Create account
          </Button>
        </form>
      </div>

      <p className="mt-4 rounded-xl border border-sky-100/80 bg-sky-50/40 px-4 py-3 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-sky-700 underline decoration-sky-300/80 underline-offset-2 transition hover:text-sky-800">
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
