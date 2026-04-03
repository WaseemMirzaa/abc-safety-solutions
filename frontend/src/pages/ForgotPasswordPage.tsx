import { Link } from 'react-router-dom'
import { AuthLogo, AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { Button } from '@/components/Button'
import { loginPanelImage } from '@/config/brandAssets'
import { KeyRound, Mail } from 'lucide-react'

/** Stub — NestJS will send reset links via transactional email. */
export function ForgotPasswordPage() {
  const aside = (
    <div className="relative z-10 flex h-full min-h-0 w-full flex-col justify-between p-6 lg:p-8 xl:p-10">
      <div className="shrink-0">
        <AuthLogo className="brightness-0 invert drop-shadow-md" />
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-100/95 backdrop-blur-md">
          <KeyRound className="h-3.5 w-3.5 text-amber-400" aria-hidden />
          Account recovery
        </div>
        <p className="mt-4 font-display text-2xl font-bold leading-[1.15] tracking-tight text-white drop-shadow-sm sm:text-3xl xl:text-[2rem]">
          Reset your password
        </p>
        <p className="mt-2.5 max-w-md text-sm leading-snug text-slate-200/90">
          We will email a secure link so you can choose a new password when the API is connected.
        </p>
      </div>
      <p className="my-6 max-w-md text-sm leading-relaxed text-slate-200/85">
        Same training platform account as sign in—one email, one profile.
      </p>
      <div className="mt-auto rounded-xl border border-white/15 bg-slate-950/45 p-3 text-[12px] leading-snug text-slate-300 backdrop-blur-md ring-1 ring-white/10 sm:text-[13px]">
        <span className="font-medium text-white">Coming soon:</span> transactional email via NestJS.
      </div>
    </div>
  )

  return (
    <AuthSplitLayout aside={aside} asideBackgroundImage={loginPanelImage} asideImageAlt="">
      <div className="lg:hidden">
        <AuthLogo variant="dark" className="mb-5" />
      </div>

      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20">
        <Mail className="h-6 w-6" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">Reset password</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        This flow is not wired yet. With the API, you will enter your email and receive a secure link to set a new password.
      </p>
      <Button className="mt-8 w-full" disabled>
        Send reset link (API)
      </Button>
      <p className="mt-8 text-center text-sm text-slate-600">
        <Link to="/login" className="font-semibold text-amber-700 hover:text-amber-600">
          ← Back to sign in
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
