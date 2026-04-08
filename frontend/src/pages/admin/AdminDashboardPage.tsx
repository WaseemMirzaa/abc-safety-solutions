import { useQuery } from '@tanstack/react-query'
import {
  fetchPublishedCourses,
  fetchAllCoursesAdmin,
  fetchCategories,
  fetchMediaAssets,
  fetchAdminTests,
  fetchAnnouncements,
  fetchAdminOrders,
} from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { localCache } from '@/lib/localCache'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { t } from '@/i18n/t'

export function AdminDashboardPage() {
  const qPub = useQuery({ queryKey: qk.courses, queryFn: fetchPublishedCourses })
  const qAll = useQuery({ queryKey: qk.adminCourses, queryFn: fetchAllCoursesAdmin })
  const qCat = useQuery({ queryKey: qk.categories, queryFn: fetchCategories })
  const qMedia = useQuery({ queryKey: qk.adminMedia, queryFn: fetchMediaAssets })
  const qTests = useQuery({ queryKey: qk.adminTests, queryFn: fetchAdminTests })
  const qAnn = useQuery({ queryKey: qk.adminAnnouncements, queryFn: fetchAnnouncements })
  const qOrders = useQuery({ queryKey: qk.adminOrders, queryFn: fetchAdminOrders })

  const purchases = localCache.getPurchases().length
  const certs = localCache.getCertificates().length

  const loading =
    qPub.isPending ||
    qAll.isPending ||
    qCat.isPending ||
    qMedia.isPending ||
    qTests.isPending ||
    qAnn.isPending ||
    qOrders.isPending

  const published = qPub.data ?? []
  const all = qAll.data ?? []
  const allCats = qCat.data ?? []
  const media = qMedia.data ?? []
  const tests = qTests.data ?? []
  const announcements = qAnn.data ?? []
  const orders = qOrders.data ?? []

  const metrics = [
    { label: t('ui_metric_published_courses'), value: published.length },
    { label: t('ui_metric_total_courses'), value: all.length },
    { label: t('ui_metric_categories'), value: allCats.length },
    { label: t('ui_metric_demo_enrollments'), value: purchases },
    { label: t('ui_metric_certificates_issued'), value: certs },
    { label: t('ui_metric_media_assets'), value: media.length },
    { label: t('ui_metric_tests_configured'), value: tests.length },
    { label: t('ui_metric_announcements'), value: announcements.length },
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

      <div className="mt-10 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/40 p-6 text-sm text-amber-950 shadow-sm">
        <strong className="font-semibold">{t('AdminDashboardPage_94_frontend_prototype_23b65971f6')}</strong> {t('ui_admin_data_lives_in')}{' '}
        <code className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs">{t('AdminDashboardPage_95_localstorage_801dab6669')}</code> (<code className="text-xs">{t('AdminDashboardPage_95_abc_portal_2a6ce68b12')}</code>). {t('ui_admin_use')}{' '}
        <strong className="font-semibold">{t('AdminDashboardPage_96_courses_e84808c320')}</strong>, <strong className="font-semibold">{t('AdminDashboardPage_96_media_62971eb786')}</strong>, <strong className="font-semibold">{t('AdminDashboardPage_96_tests_3f9f2bcbf7')}</strong>, and{' '}
        <strong className="font-semibold">{t('AdminDashboardPage_97_announcements_a26ca4a7de')}</strong> {t('AdminDashboardPage_97_to_manage_records_e75aac566f')} <strong className="font-semibold">{t('AdminDashboardPage_97_orders_3b4f8a5a77')}</strong> {t('ui_admin_orders_lists_suffix')}
      </div>
    </div>
  )
}
