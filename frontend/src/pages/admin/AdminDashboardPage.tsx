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
    { label: 'Published courses', value: published.length },
    { label: 'Total courses', value: all.length },
    { label: 'Categories', value: allCats.length },
    { label: 'Demo enrollments', value: purchases },
    { label: 'Certificates issued', value: certs },
    { label: 'Media assets', value: media.length },
    { label: 'Tests configured', value: tests.length },
    { label: 'Announcements', value: announcements.length },
    { label: 'Orders (local)', value: orders.length },
  ]

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900">Overview</h1>
      <p className="mt-2 text-sm text-slate-600">
        Snapshot of catalog, commerce, and admin content stored in this browser.
      </p>

      {loading ? (
        <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
          <Spinner size="sm" label="Loading metrics" />
          <span>Loading metrics…</span>
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
        <strong className="font-semibold">Frontend prototype.</strong> Admin data lives in{' '}
        <code className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs">localStorage</code> (<code className="text-xs">abc_portal_*</code>). Use{' '}
        <strong className="font-semibold">Courses</strong>, <strong className="font-semibold">Media</strong>, <strong className="font-semibold">Tests</strong>, and{' '}
        <strong className="font-semibold">Announcements</strong> to manage records; <strong className="font-semibold">Orders</strong> lists enrollments from this device.
      </div>
    </div>
  )
}
