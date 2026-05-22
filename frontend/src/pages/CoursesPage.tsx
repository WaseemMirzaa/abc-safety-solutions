import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Container } from '@/components/Container'
import { CourseCard } from '@/components/CourseCard'
import { CourseCardSkeleton } from '@/components/ui/Skeleton'
import { PageLoader } from '@/components/ui/PageLoader'
import { listContainer, listItem } from '@/lib/motionPresets'
import { fetchCategories, fetchCourseLanguages, fetchPublishedCourses } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { Search } from 'lucide-react'
import { t } from '@/i18n/t'
import { displayCategoryName, displayCourseSummary, displayCourseTitle } from '@/lib/courseDisplay'
import type { Category, Course } from '@/types'
import { DEFAULT_COURSE_LANGUAGE_ID } from '@/types'

function courseLanguageId(c: Course): string {
  return c.languageId?.trim() || DEFAULT_COURSE_LANGUAGE_ID
}

function categoryLabel(c: Course, categories: Category[]): string {
  const cat = categories.find((x) => x.id === c.categoryId)
  return cat ? displayCategoryName(cat) : ''
}

function courseMatchesSearch(c: Course, query: string, categories: Category[]): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    displayCourseTitle(c),
    displayCourseSummary(c),
    categoryLabel(c, categories),
    c.slug,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

const selectClass =
  'input-pro w-full min-w-0 appearance-none bg-white pr-9 text-sm font-medium text-slate-800'

export function CoursesPage() {
  const { data: courses = [], isPending, isFetching } = useQuery({ queryKey: qk.courses, queryFn: fetchPublishedCourses })
  const { data: categoryList = [] } = useQuery({ queryKey: qk.categories, queryFn: fetchCategories })
  const { data: languageList = [] } = useQuery({ queryKey: qk.courseLanguages, queryFn: fetchCourseLanguages })

  const [searchQuery, setSearchQuery] = useState('')
  const [catId, setCatId] = useState<string>('all')
  const [langId, setLangId] = useState<string>('all')

  const languagesInCatalog = useMemo(() => {
    const used = new Set(courses.map(courseLanguageId))
    return languageList.filter((l) => used.has(l.id))
  }, [courses, languageList])

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (catId !== 'all' && c.categoryId !== catId) return false
      if (langId !== 'all' && courseLanguageId(c) !== langId) return false
      if (!courseMatchesSearch(c, searchQuery, categoryList)) return false
      return true
    })
  }, [courses, catId, langId, searchQuery, categoryList])

  const hasActiveFilters = searchQuery.trim() !== '' || catId !== 'all' || langId !== 'all'

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">
              {t('CoursesPage_33_all_courses_ab9eb6baba')}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {t('ui_catalog_intro', {
                defaultValue:
                  'Search and filter the catalog. After checkout, courses appear in My learning with progress saved on this device.',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFetching && !isPending ? (
              <span className="text-xs font-medium text-slate-400" aria-hidden>
                Refreshing…
              </span>
            ) : null}
            <p className="rounded-2xl border border-slate-200/80 bg-white px-5 py-3 text-sm text-slate-500 shadow-sm">
              {isPending ? (
                <span className="font-semibold text-brand-900">—</span>
              ) : hasActiveFilters ? (
                <>
                  <span className="font-semibold text-brand-900">{filtered.length}</span>
                  <span className="text-slate-400"> / </span>
                  <span>{courses.length}</span>
                  <span className="ml-1">{t('ui_catalog_results_match', { defaultValue: 'matching' })}</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-brand-900">{courses.length}</span>
                  <span className="ml-1">{t('ui_catalog_results_published', { defaultValue: 'published' })}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <label htmlFor="catalog-search" className="sr-only">
            {t('ui_catalog_search_label', { defaultValue: 'Search courses' })}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id="catalog-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('ui_catalog_search_placeholder', { defaultValue: 'Search by title, summary, or category…' })}
              className="input-pro w-full pl-10"
              autoComplete="off"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="catalog-category" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('ui_catalog_filter_category', { defaultValue: 'Category' })}
              </label>
              <select
                id="catalog-category"
                className={selectClass}
                value={catId}
                onChange={(e) => setCatId(e.target.value)}
              >
                <option value="all">{t('ui_catalog_filter_all_categories', { defaultValue: 'All categories' })}</option>
                {categoryList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {displayCategoryName(c).replace('Department of Transportation (DOT)', 'DOT')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="catalog-language" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('ui_catalog_filter_language', { defaultValue: 'Language' })}
              </label>
              <select
                id="catalog-language"
                className={selectClass}
                value={langId}
                onChange={(e) => setLangId(e.target.value)}
              >
                <option value="all">{t('ui_catalog_filter_all_languages', { defaultValue: 'All languages' })}</option>
                {languagesInCatalog.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
                <CourseCard course={c} categories={categoryList} entrance={false} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!isPending && filtered.length === 0 ? (
          <p className="mt-20 text-center font-medium text-slate-500">
            {hasActiveFilters
              ? t('ui_catalog_no_results', { defaultValue: 'No courses match your search or filters.' })
              : t('CoursesPage_114_no_courses_in_this_category_02447b00f4')}
          </p>
        ) : null}
      </Container>
    </div>
  )
}
