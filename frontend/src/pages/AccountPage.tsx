import { Link } from 'react-router-dom'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { localCache } from '@/lib/localCache'
import { Receipt, User } from 'lucide-react'

/** Orders & profile — prototype UI; NestJS will supply receipts and tax lines. */
export function AccountPage() {
  const { user } = useAuth()
  const purchases = localCache.getPurchases()

  if (!user) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center px-4 py-16">
        <Container className="max-w-md text-center">
          <h1 className="font-display text-3xl font-bold text-brand-900">Account</h1>
          <p className="mt-3 text-slate-600">Sign in to view orders and profile.</p>
          <Link to="/login" className="mt-8 inline-block">
            <Button>Sign in</Button>
          </Link>
        </Container>
      </div>
    )
  }

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container className="max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-brand-900">Account</h1>
        <p className="mt-2 text-slate-600">Profile and order history will sync from the server after API integration.</p>

        <div className="card-elevated mt-10 p-6 sm:p-8">
          <div className="flex items-center gap-3 text-brand-900">
            <User className="h-5 w-5 text-sky-600" />
            <h2 className="font-display text-lg font-semibold">Profile</h2>
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Name</dt>
              <dd className="mt-1 font-medium text-slate-800">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</dt>
              <dd className="mt-1 font-medium text-slate-800">{user.email}</dd>
            </div>
          </dl>
          <p className="mt-6 rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-xs text-amber-950">
            Password reset, email verification, and legal name for certificates will be API-driven.
          </p>
        </div>

        <div className="card-elevated mt-8 p-6 sm:p-8">
          <div className="flex items-center gap-3 text-brand-900">
            <Receipt className="h-5 w-5 text-sky-600" />
            <h2 className="font-display text-lg font-semibold">Orders (local demo)</h2>
          </div>
          {purchases.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">No purchases recorded in this browser.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {purchases.map((p) => (
                <li key={p.orderId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                  <span className="font-mono text-xs text-slate-500">{p.orderId}</span>
                  <span className="text-slate-600">{new Date(p.purchasedAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </div>
  )
}
