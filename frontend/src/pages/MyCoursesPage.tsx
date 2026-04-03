import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { PageHeaderSkeleton, MyCourseRowSkeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { getCourseSlideCount } from '@/lib/courseSlides'
import { localCache } from '@/lib/localCache'
import { fetchPublishedCourses, mergeCourses } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { listContainer, listItem } from '@/lib/motionPresets'
import { BookOpen } from 'lucide-react'

export function MyCoursesPage() {
  const { user } = useAuth()
  const { data: courses = [], isPending } = useQuery({ queryKey: qk.courses, queryFn: fetchPublishedCourses })

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20">
        <Container className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="mt-8 font-display text-3xl font-bold text-brand-900">My learning</h1>
          <p className="mt-3 text-slate-600">Sign in to see purchased courses and resume progress.</p>
          <Link to="/login" className="mt-10 inline-block">
            <Button>Sign in</Button>
          </Link>
        </Container>
      </div>
    )
  }

  const purchases = localCache.getPurchases()
  const byId = new Map(mergeCourses().map((c) => [c.id, c]))
  const mine = purchases.map((p) => byId.get(p.courseId)).filter(Boolean)

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        {isPending ? (
          <PageHeaderSkeleton />
        ) : (
          <>
            <h1 className="font-display text-4xl font-bold tracking-tight text-brand-900">My learning</h1>
            <p className="mt-3 max-w-xl text-slate-600">
              Progress syncs on this device. NestJS will unify across web and app.
            </p>
          </>
        )}

        {isPending ? (
          <motion.ul
            className="mt-8 space-y-5"
            variants={listContainer}
            initial="hidden"
            animate="show"
            aria-busy
          >
            {[0, 1, 2].map((k) => (
              <motion.li key={k} variants={listItem} layout>
                <MyCourseRowSkeleton />
              </motion.li>
            ))}
          </motion.ul>
        ) : mine.length === 0 ? (
          <div className="mt-14 rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 px-8 py-16 text-center">
            <p className="font-medium text-slate-600">You have not enrolled in any courses yet.</p>
            <Link to="/courses" className="mt-8 inline-block">
              <Button>Browse catalog</Button>
            </Link>
          </div>
        ) : (
          <motion.ul
            className="mt-12 space-y-5"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {mine.map((c) => {
              if (!c) return null
              const prog = localCache.getProgress(c.id)
              return (
                <motion.li
                  key={c.id}
                  variants={listItem}
                  layout
                  className="card-elevated flex flex-col gap-6 p-6 transition hover:border-amber-200/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex gap-5">
                    <img src={c.imageUrl} alt="" className="h-24 w-36 rounded-2xl object-cover ring-1 ring-slate-200/80" />
                    <div>
                      <h2 className="font-display text-lg font-semibold text-brand-900">{c.title}</h2>
                      <p className="mt-2 text-sm text-slate-500">
                        {prog ? (
                          <>
                            Resume <span className="font-semibold text-sky-700">slide {prog.slideIndex + 1}</span> of{' '}
                            {getCourseSlideCount(c)}
                          </>
                        ) : (
                          'Not started'
                        )}
                      </p>
                    </div>
                  </div>
                  <Link to={`/learn/${c.id}`}>
                    <Button className="w-full sm:w-auto">{prog ? 'Continue' : 'Start'}</Button>
                  </Link>
                </motion.li>
              )
            })}
          </motion.ul>
        )}

        <p className="mt-10 text-xs text-slate-400">Catalog cache: {courses.length} published courses.</p>
      </Container>
    </div>
  )
}
