import { useQuery } from '@tanstack/react-query'
import {
  fetchPublishedCourses,
  fetchCategories,
  fetchMediaAssets,
  fetchAdminTests,
  fetchAdminOrders,
  fetchAdminStats,
} from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { t } from '@/i18n/t'

export function AdminDashboardPage() {
  const qPub = useQuery({ queryKey: qk.courses, queryFn: fetchPublishedCourses })
  const qCat = useQuery({ queryKey: qk.categories, queryFn: fetchCategories })
  const qMedia = useQuery({ queryKey: qk.adminMedia, queryFn: fetchMediaAssets })
  const qTests = useQuery({ queryKey: qk.adminTests, queryFn: fetchAdminTests })
  const qOrders = useQuery({ queryKey: qk.adminOrders, queryFn: fetchAdminOrders })
  const qStats = useQuery({ queryKey: qk.adminStats, queryFn: fetchAdminStats })

  const purchases = qStats.data?.enrollments ?? qOrders.data?.length ?? 0
  const certs = qStats.data?.certificatesIssued ?? 0

  const loading =
    qPub.isPending ||
    qCat.isPending ||
    qMedia.isPending ||
    qTests.isPending ||
    qOrders.isPending ||
    qStats.isPending

  const published = qPub.data ?? []
  const allCats = qCat.data ?? []
  const media = qMedia.data ?? []
  const tests = qTests.data ?? []
  const orders = qOrders.data ?? []

  const metrics = [
    { label: t('ui_metric_published_courses'), value: published.length },
    { label: t('ui_metric_categories'), value: allCats.length },
    { label: t('ui_metric_enrollments'), value: purchases },
    { label: t('ui_metric_certificates_issued'), value: certs },
    { label: t('ui_metric_media_assets'), value: media.length },
    { label: t('ui_metric_tests_configured'), value: tests.length },
    { label: t('ui_metric_orders_local'), value: orders.length },
  ]

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900">{t('AdminDashboardPage_59_overview_70114f29ad')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('ui_admin_dashboard_subtitle')}</p>

      {loading ? (
        <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
          <Spinner size="sm" label={t('ui_spinner_loading_metrics')} />
          <span>{t('AdminDashboardPage_67_loading_metrics_2623c58c65')}</span>
        </div>
      ) : null}

      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04),0_16px_40px_-24px_rgba(15,23,42,0.15)]"
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-10 w-16" />
              </div>
            ))
          : metrics.map((x) => (
              <div
                key={x.label}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04),0_16px_40px_-24px_rgba(15,23,42,0.15)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{x.label}</p>
                <p className="mt-3 font-display text-3xl font-bold text-brand-900">{x.value}</p>
              </div>
            ))}
      </div>

    </div>
  )
}
