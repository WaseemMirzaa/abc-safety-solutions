import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Clock, Layers, CheckCircle2 } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { CourseDetailSkeleton } from '@/components/ui/Skeleton'
import { PageLoader } from '@/components/ui/PageLoader'
import { easeOut } from '@/lib/motionPresets'
import { fetchCourseBySlug } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { useAuth } from '@/contexts/AuthContext'
import { localCache } from '@/lib/localCache'
import { getCategoryById } from '@/data/catalog'
import { getCourseSlideCount } from '@/lib/courseSlides'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function CourseDetailPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: course, isLoading } = useQuery({
    queryKey: qk.course(slug),
    queryFn: () => fetchCourseBySlug(slug),
    enabled: Boolean(slug),
  })

  const purchased = course ? localCache.getPurchases().some((p) => p.courseId === course.id) : false

  const buy = () => {
    if (!course) return
    if (!user) {
      navigate('/login', { state: { from: `/courses/${slug}` } })
      return
    }
    localCache.addPurchase({
      courseId: course.id,
      purchasedAt: new Date().toISOString(),
      orderId: `LOCAL-${Date.now()}`,
    })
    navigate('/my-courses')
  }

  if (isLoading) {
    return (
      <div className="py-12 sm:py-16">
        <Container>
          <PageLoader message="Loading course" minHeight="min-h-[24vh]" />
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: easeOut, delay: 0.06 }}
          >
            <CourseDetailSkeleton />
          </motion.div>
        </Container>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="py-24">
        <Container className="max-w-lg text-center">
          <h1 className="font-display text-2xl font-bold text-brand-900">Course not found</h1>
          <Link to="/courses" className="mt-6 inline-flex text-sm font-semibold text-amber-700 hover:text-amber-600">
            ← Back to catalog
          </Link>
        </Container>
      </div>
    )
  }

  const cat = getCategoryById(course.categoryId)

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        <nav className="text-sm text-slate-500">
          <Link to="/courses" className="font-medium transition hover:text-brand-800">
            Courses
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700">{course.title}</span>
        </nav>

        <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5">
              <img src={course.imageUrl} alt="" className="aspect-[16/10] w-full object-cover" />
            </div>
          </div>

          <div className="lg:col-span-5">
            {cat ? (
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">{cat.name}</p>
            ) : null}
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">{course.title}</h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600">{course.description}</p>

            <ul className="mt-8 space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
                <Clock className="h-5 w-5 shrink-0 text-sky-600" />
                Estimated {Math.round(course.durationMinutes / 60)} hours · self-paced
              </li>
              <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
                <Layers className="h-5 w-5 shrink-0 text-sky-600" />
                {getCourseSlideCount(course)} slides with voice-over (demo player)
              </li>
              <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600" />
                Knowledge check + certificate upon passing
              </li>
            </ul>

            <div className="card-elevated mt-10 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your investment</p>
              <p className="mt-2 font-display text-4xl font-bold text-brand-900">{formatPrice(course.priceCents)}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Local demo: no payment processor. Purchase is saved in this browser only.
              </p>
              <p className="mt-4 text-xs text-slate-500">
                <Link to={`/checkout?course=${encodeURIComponent(course.slug)}`} className="font-semibold text-amber-700 hover:text-amber-600">
                  Preview checkout UI →
                </Link>
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {purchased ? (
                  <Link to={`/learn/${course.id}`} className="flex-1">
                    <Button className="w-full">Continue to course</Button>
                  </Link>
                ) : (
                  <Button className="flex-1" onClick={buy}>
                    {user ? 'Enroll (demo)' : 'Sign in to enroll'}
                  </Button>
                )}
                <Link to="/courses" className="flex-1">
                  <Button variant="secondary" className="w-full">
                    Back to catalog
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
