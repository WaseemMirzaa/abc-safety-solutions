import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { authPatchMe, fetchMyOrders } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { Receipt, User } from 'lucide-react'
import { t } from '@/i18n/t'

export function AccountPage() {
  const { user, refreshMe } = useAuth()
  const qc = useQueryClient()
  const [nameDraft, setNameDraft] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileErr, setProfileErr] = useState<string | null>(null)

  const { data: orders = [] } = useQuery({
    queryKey: qk.myOrders,
    queryFn: fetchMyOrders,
    enabled: Boolean(user),
  })

  useEffect(() => {
    if (user?.name) setNameDraft(user.name)
  }, [user?.name])

  if (!user) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center px-4 py-16">
        <Container className="max-w-md text-center">
          <h1 className="font-display text-3xl font-bold text-brand-900">{t('AccountPage_17_account_feb4b6fba4')}</h1>
          <p className="mt-3 text-slate-600">{t('AccountPage_18_sign_in_to_view_orders_and_profile_4164bbe258')}</p>
          <Link to="/login" className="mt-8 inline-block">
            <Button>{t('AccountPage_20_sign_in_85895fd213')}</Button>
          </Link>
        </Container>
      </div>
    )
  }

  const isAdmin = user.role === 'admin'

  async function saveName() {
    if (isAdmin) return
    setProfileErr(null)
    setProfileBusy(true)
    try {
      await authPatchMe(nameDraft)
      await refreshMe()
      await qc.invalidateQueries({ queryKey: qk.myOrders })
    } catch {
      setProfileErr(t('ui_forgot_err'))
    } finally {
      setProfileBusy(false)
    }
  }

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container className="max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-brand-900">{t('AccountPage_30_account_68f2e455fe')}</h1>
        <p className="mt-2 text-slate-600">{t('AccountPage_31_profile_and_order_history_will_sync_from_the_ser_87ddd7d4b9')}</p>

        <div className="card-elevated mt-10 p-6 sm:p-8">
          <div className="flex items-center gap-3 text-brand-900">
            <User className="h-5 w-5 text-sky-600" />
            <h2 className="font-display text-lg font-semibold">{t('AccountPage_36_profile_a1c9cfc0f0')}</h2>
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AccountPage_40_name_abcd8db4cc')}</dt>
              <dd className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                {isAdmin ? (
                  <span className="font-medium text-slate-800">{user.name}</span>
                ) : (
                  <>
                    <input
                      className="input-pro max-w-md flex-1"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      aria-label={t('AccountPage_40_name_abcd8db4cc')}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={profileBusy || nameDraft.trim() === user.name}
                      onClick={() => void saveName()}
                    >
                      {profileBusy ? t('ui_account_saving') : t('ui_account_save_profile')}
                    </Button>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AccountPage_44_email_8e6cf53ac9')}</dt>
              <dd className="mt-1 font-medium text-slate-800">{user.email}</dd>
            </div>
          </dl>
          {profileErr ? <p className="mt-4 text-sm text-red-600">{profileErr}</p> : null}
          {isAdmin ? (
            <p className="mt-6 rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-xs text-amber-950">
              {t('ui_account_admin_profile_locked')}
            </p>
          ) : (
            <p className="mt-6 rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-xs text-amber-950">
              Password reset, email verification, and legal name for certificates will be API-driven.
            </p>
          )}
        </div>

        <div className="card-elevated mt-8 p-6 sm:p-8">
          <div className="flex items-center gap-3 text-brand-900">
            <Receipt className="h-5 w-5 text-sky-600" />
            <h2 className="font-display text-lg font-semibold">{t('AccountPage_orders_heading')}</h2>
          </div>
          {orders.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">{t('AccountPage_59_no_purchases_recorded_in_this_browser_280a162f8c')}</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {orders.map((o) => (
                <li
                  key={`${o.orderId}-${o.purchasedAt}`}
                  className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-slate-800">{o.courseTitle}</span>
                  <span className="font-mono text-xs text-slate-500">{o.orderId}</span>
                  <span className="text-slate-600">{new Date(o.purchasedAt).toLocaleString()}</span>
                  <span className="text-slate-700">
                    {(o.amountCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                    {o.refunded ? <span className="ml-2 text-amber-800"> · refunded</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </div>
  )
}
