import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Container } from '@/components/Container'
import { CourseCard } from '@/components/CourseCard'
import { CourseCardSkeleton } from '@/components/ui/Skeleton'
import { PageLoader } from '@/components/ui/PageLoader'
import { listContainer, listItem } from '@/lib/motionPresets'
import { fetchCategories, fetchPublishedCourses } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { clsx } from 'clsx'
import { GraduationCap } from 'lucide-react'
import { t } from '@/i18n/t'
import { localizedCategoryName } from '@/lib/catalogLocale'

export function CoursesPage() {
  const { data: courses = [], isPending, isFetching } = useQuery({ queryKey: qk.courses, queryFn: fetchPublishedCourses })
  const { data: categoryList = [] } = useQuery({ queryKey: qk.categories, queryFn: fetchCategories })
  const [catId, setCatId] = useState<string | 'all'>('all')

  const filtered = useMemo(() => {
    if (catId === 'all') return courses
    return courses.filter((c) => c.categoryId === catId)
  }, [courses, catId])

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-800 ring-1 ring-sky-500/20">
              <GraduationCap className="h-3.5 w-3.5" />
              Catalog
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">{t('CoursesPage_33_all_courses_ab9eb6baba')}</h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Filter by category. After checkout, courses appear in <strong className="font-medium text-brand-800">{t('CoursesPage_35_my_learning_112e75f946')}</strong> with progress saved on this device.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFetching && !isPending ? (
              <span className="text-xs font-medium text-slate-400" aria-hidden>
                Refreshing…
              </span>
            ) : null}
            <p className="rounded-2xl border border-slate-200/80 bg-white px-5 py-3 text-sm text-slate-500 shadow-sm">
              <span className="font-semibold text-brand-900">{isPending ? '—' : courses.length}</span> published
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCatId('all')}
            className={clsx(
              'rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200',
              catId === 'all'
                ? 'bg-brand-900 text-white shadow-lg shadow-brand-900/25'
                : 'border border-slate-200/90 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            {t('ui_courses_filter_all')}
          </button>
          {categoryList.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatId(c.id)}
              className={clsx(
                'rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                catId === c.id
                  ? 'bg-brand-900 text-white shadow-lg shadow-brand-900/25'
                  : 'border border-slate-200/90 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              {localizedCategoryName(c.id, c.name).replace('Department of Transportation (DOT)', 'DOT')}
            </button>
          ))}
        </div>

        {isPending ? (
          <div className="mt-12">
            <PageLoader message={t('ui_page_loader_catalog')} minHeight="min-h-[28vh]" />
            <motion.div
              key="catalog-skeleton"
              className="grid w-full gap-10 sm:grid-cols-2 xl:grid-cols-3"
              variants={listContainer}
              initial="hidden"
              animate="show"
            >
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <motion.div key={k} variants={listItem} layout>
                  <CourseCardSkeleton />
                </motion.div>
              ))}
            </motion.div>
          </div>
        ) : (
          <motion.div
            key="catalog-grid"
            className="mt-12 grid gap-10 sm:grid-cols-2 xl:grid-cols-3"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {filtered.map((c) => (
              <motion.div key={c.id} variants={listItem} layout>
                <CourseCard course={c} entrance={false} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!isPending && filtered.length === 0 ? (
          <p className="mt-20 text-center font-medium text-slate-500">{t('CoursesPage_114_no_courses_in_this_category_02447b00f4')}</p>
        ) : null}
      </Container>
    </div>
  )
}
