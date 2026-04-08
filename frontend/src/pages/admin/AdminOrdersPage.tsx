import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/Button'
import { fetchAdminOrders, type AdminOrderRow } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { localCache } from '@/lib/localCache'
import { t } from '@/i18n/t'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function AdminOrdersPage() {
  const qc = useQueryClient()
  const { data: rows = [], isLoading } = useQuery({ queryKey: qk.adminOrders, queryFn: fetchAdminOrders })
  const [selected, setSelected] = useState<AdminOrderRow | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.adminOrders })

  const toggleRefund = (orderId: string) => {
    localCache.toggleOrderRefund(orderId)
    invalidate()
    setSelected((s) => (s && s.orderId === orderId ? { ...s, refunded: !s.refunded } : s))
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-900">{t('AdminOrdersPage_33_orders_8898490306')}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enrollments created on this device (demo). Stripe webhooks will populate real orders later.
          </p>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-4 py-3">{t('AdminOrdersPage_44_order_id_89623dd0a9')}</th>
              <th className="px-4 py-3">{t('AdminOrdersPage_45_date_a4dc3d7517')}</th>
              <th className="px-4 py-3">{t('AdminOrdersPage_46_course_6f94e4bfbe')}</th>
              <th className="px-4 py-3">{t('AdminOrdersPage_47_amount_d6ae69df48')}</th>
              <th className="px-4 py-3">{t('AdminOrdersPage_48_status_fe354faa98')}</th>
              <th className="px-4 py-3 text-right">{t('AdminOrdersPage_49_detail_1cab9ee999')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No orders in local storage yet. Enroll from the catalog as a learner to see rows here.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.orderId}
                  className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/80 ${selected?.orderId === r.orderId ? 'bg-amber-50/50' : ''}`}
                  onClick={() => setSelected(r)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.orderId}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(r.purchasedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-brand-900">{r.courseTitle}</td>
                  <td className="px-4 py-3">{formatPrice(r.amountCents)}</td>
                  <td className="px-4 py-3">
                    {r.refunded ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">{t('AdminOrdersPage_78_refunded_5bd11dd6a0')}</span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{t('AdminOrdersPage_80_completed_c674495f10')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="secondary" className="!rounded-lg !py-1.5 !text-xs" onClick={(e) => { e.stopPropagation(); setSelected(r) }}>
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="card-elevated mt-8 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{t('AdminOrdersPage_99_order_detail_3e4dcee601')}</p>
              <h2 className="mt-2 font-mono text-base font-bold text-brand-900">{selected.orderId}</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminOrdersPage_103_purchased_1bed5d0c8a')}</dt>
                  <dd className="mt-1 text-slate-800">{new Date(selected.purchasedAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminOrdersPage_107_course_cfaadefe5b')}</dt>
                  <dd className="mt-1 text-slate-800">{selected.courseTitle}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminOrdersPage_111_course_id_284a6efaa0')}</dt>
                  <dd className="mt-1 font-mono text-xs text-slate-600">{selected.courseId}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminOrdersPage_115_amount_a43b1539c3')}</dt>
                  <dd className="mt-1 font-semibold text-brand-900">{formatPrice(selected.amountCents)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminOrdersPage_119_fulfillment_b1c235d09c')}</dt>
                  <dd className="mt-1 text-slate-800">{t('AdminOrdersPage_120_enrollment_granted_local_demo_5f8f4303c0')}</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <Button
                type="button"
                variant="secondary"
                className={selected.refunded ? '' : '!border-amber-300 !text-amber-900'}
                onClick={() => toggleRefund(selected.orderId)}
              >
                {selected.refunded ? t('ui_orders_mark_not_refunded') : t('ui_orders_mark_refunded')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
                {t('ui_orders_close_detail')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
