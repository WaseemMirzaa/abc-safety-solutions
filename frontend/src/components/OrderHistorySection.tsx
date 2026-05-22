import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  ExternalLink,
  FileText,
  Receipt,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/Button'
import { toInitCap } from '@/lib/courseDisplay'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { listContainer, listItem } from '@/lib/motionPresets'
import { t } from '@/i18n/t'
import type { MyOrderRow } from '@/api/localData'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatOrderDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

function shortOrderId(orderId: string) {
  if (orderId.length <= 14) return orderId
  return `${orderId.slice(0, 8)}…${orderId.slice(-6)}`
}

function ActionLink({
  href,
  external,
  icon: Icon,
  children,
  variant = 'neutral',
}: {
  href: string
  external?: boolean
  icon: typeof ExternalLink
  children: ReactNode
  variant?: 'neutral' | 'sky'
}) {
  const className = clsx(
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
    variant === 'sky'
      ? 'border border-sky-200/90 bg-sky-50 text-sky-800 hover:bg-sky-100'
      : 'border border-slate-200/90 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
  )
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {children}
      </a>
    )
  }
  return (
    <Link to={href} className={className}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </Link>
  )
}

function OrderCard({ order }: { order: MyOrderRow }) {
  const thumb = order.courseImageUrl ? resolveMediaUrl(order.courseImageUrl) : ''
  const title = toInitCap(order.courseTitle)

  return (
    <motion.li
      variants={listItem}
      layout
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:border-amber-200/50 hover:shadow-md"
    >
      <div className="flex flex-col sm:flex-row">
        <Link
          to={order.courseSlug ? `/courses/${order.courseSlug}` : `/learn/${order.courseId}`}
          className="relative block shrink-0 sm:w-40 md:w-44"
        >
          {thumb ? (
            <img
              src={thumb}
              alt=""
              className="aspect-[5/3] h-full w-full object-cover sm:aspect-auto sm:min-h-[7.5rem] sm:w-full"
            />
          ) : (
            <div className="flex aspect-[5/3] items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100 sm:aspect-auto sm:min-h-[7.5rem]">
              <BookOpen className="h-8 w-8 text-sky-300" aria-hidden />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent sm:bg-gradient-to-r" />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={order.courseSlug ? `/courses/${order.courseSlug}` : `/learn/${order.courseId}`}
                className="font-display text-base font-semibold leading-snug tracking-tight text-brand-900 transition hover:text-amber-800 sm:text-lg"
              >
                {title}
              </Link>
              {order.courseSummary ? (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                  {order.courseSummary}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-xl font-bold tracking-tight text-brand-900">
                {formatPrice(order.amountCents)}
              </p>
              <span
                className={clsx(
                  'mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  order.refunded
                    ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80'
                    : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80',
                )}
              >
                {order.refunded
                  ? t('ui_orders_status_refunded', { defaultValue: 'Refunded' })
                  : t('ui_orders_status_paid', { defaultValue: 'Paid' })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-sky-600" aria-hidden />
              {formatOrderDate(order.purchasedAt)}
            </span>
            <span className="font-mono text-slate-400" title={order.orderId}>
              {t('ui_orders_id_label', { defaultValue: 'Order' })} {shortOrderId(order.orderId)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100/90 pt-3">
            {order.courseId ? (
              <ActionLink
                href={`/learn/${order.courseId}`}
                icon={ArrowUpRight}
                variant="sky"
              >
                {t('ui_orders_open_course', { defaultValue: 'Open course' })}
              </ActionLink>
            ) : null}
            {order.receiptUrl ? (
              <ActionLink href={order.receiptUrl} external icon={ExternalLink}>
                {t('ui_orders_receipt', { defaultValue: 'Receipt' })}
              </ActionLink>
            ) : null}
            {order.invoiceUrl ? (
              <ActionLink href={order.invoiceUrl} external icon={FileText}>
                {t('ui_orders_invoice', { defaultValue: 'Invoice' })}
              </ActionLink>
            ) : null}
            {order.invoicePdf ? (
              <ActionLink href={order.invoicePdf} external icon={FileText}>
                {t('ui_orders_pdf', { defaultValue: 'PDF' })}
              </ActionLink>
            ) : null}
          </div>
        </div>
      </div>
    </motion.li>
  )
}

type Props = {
  orders: MyOrderRow[]
}

export function OrderHistorySection({ orders }: Props) {
  const paidOrders = orders.filter((o) => !o.refunded)
  const totalSpentCents = paidOrders.reduce((sum, o) => sum + o.amountCents, 0)

  return (
    <div className="card-elevated overflow-hidden p-0 sm:p-0">
      <div className="border-b border-slate-100/90 bg-gradient-to-r from-sky-50/80 via-white to-amber-50/40 px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md shadow-sky-900/20 ring-1 ring-sky-400/30">
              <Receipt className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-brand-900">
                {t('AccountPage_orders_heading')}
              </h2>
              <p className="mt-1 max-w-lg text-sm text-slate-600">
                {t('ui_orders_history_blurb', {
                  defaultValue: 'Your course purchases, receipts, and enrollment access in one place.',
                })}
              </p>
            </div>
          </div>
          {orders.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80">
                <ShoppingBag className="h-3.5 w-3.5 text-sky-600" aria-hidden />
                {t('ui_orders_count', { count: orders.length, defaultValue: '{{count}} orders' })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-900 shadow-sm ring-1 ring-amber-200/60">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                {t('ui_orders_total_spent', {
                  amount: formatPrice(totalSpentCents),
                  defaultValue: '{{amount}} total',
                })}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {orders.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20">
              <ShoppingBag className="h-7 w-7" aria-hidden />
            </div>
            <p className="mt-5 font-medium text-brand-900">
              {t('AccountPage_59_no_purchases_recorded_in_this_browser_280a162f8c')}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {t('ui_orders_empty_hint', {
                defaultValue: 'When you enroll in a course, your order will appear here with receipt links.',
              })}
            </p>
            <Link to="/courses" className="mt-8 inline-block">
              <Button>{t('MyCoursesPage_72_browse_catalog_fc72ee08cb')}</Button>
            </Link>
          </div>
        ) : (
          <motion.ul
            className="space-y-4"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {orders.map((o) => (
              <OrderCard key={`${o.orderId}-${o.purchasedAt}`} order={o} />
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  )
}
