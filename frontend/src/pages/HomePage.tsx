import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Award, BookOpen, CheckCircle2, Shield, Sparkles } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { CourseCard } from '@/components/CourseCard'
import { CourseCardSkeleton } from '@/components/ui/Skeleton'
import { fetchCategories, fetchPublishedCourses } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { homeHeroImage, trainingProgramTiles } from '@/config/brandAssets'
import { listContainer, listItem } from '@/lib/motionPresets'
import { t } from '@/i18n/t'

const featureItems = [
  {
    icon: BookOpen,
    titleKey: 'ui_home_feature_1_title',
    descKey: 'ui_home_feature_1_desc',
  },
  {
    icon: Shield,
    titleKey: 'ui_home_feature_2_title',
    descKey: 'ui_home_feature_2_desc',
  },
  {
    icon: Award,
    titleKey: 'ui_home_feature_3_title',
    descKey: 'ui_home_feature_3_desc',
  },
] as const

export function HomePage() {
  const reduce = useReducedMotion()
  const { data: courses = [], isPending } = useQuery({ queryKey: qk.courses, queryFn: fetchPublishedCourses })
  const { data: categoryList = [] } = useQuery({ queryKey: qk.categories, queryFn: fetchCategories })
  const featured = courses.slice(0, 3)

  return (
    <>
      <section className="hero-sky relative overflow-hidden text-brand-900">
        <div className="pointer-events-none absolute inset-0 hero-sky-grid opacity-90" />
        <div
          className="pointer-events-none absolute -left-40 top-1/3 h-[22rem] w-[22rem] -translate-y-1/2 rounded-full blur-3xl sm:h-[28rem] sm:w-[28rem]"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 68%)' }}
        />
        <div
          className="pointer-events-none absolute -right-24 top-1/2 h-[32rem] w-[32rem] -translate-y-1/2 rounded-full blur-3xl lg:-right-16"
          style={{
            background:
              'radial-gradient(circle, rgba(14,165,233,0.35) 0%, transparent 62%), radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
          }}
        />
        <Container className="relative py-12 sm:py-16 lg:py-20">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12 lg:items-center xl:gap-14">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl border border-sky-200/70 bg-white/75 p-6 shadow-[0_4px_24px_-4px_rgba(14,165,233,0.2)] ring-1 ring-sky-100/80 backdrop-blur-sm sm:p-8"
            >
              <div className="absolute -top-px left-8 right-8 h-1 rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-amber-400 opacity-90" />
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/70 bg-gradient-to-r from-sky-50 to-sky-100/80 px-3.5 py-1.5 text-xs font-semibold text-sky-900 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {t('ui_home_hero_badge')}
              </div>
              <h1 className="mt-5 max-w-2xl font-display text-[1.75rem] font-bold leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.1] lg:text-[2.35rem] xl:text-[2.6rem]">
                <span className="bg-gradient-to-r from-sky-800 via-sky-700 to-brand-900 bg-clip-text text-transparent">
                  {t('ui_home_hero_title_span')}
                </span>{' '}
                <span className="text-brand-900">{t('HomePage_69_for_safer_compliant_worksites_41f2c54c06')}</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                {t('ui_home_hero_body')}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/courses">
                  <Button className="w-full min-w-[12rem] px-8 sm:w-auto">{t('HomePage_78_explore_catalog_594b9291a3')}</Button>
                </Link>
                <Link to="/register">
                  <Button variant="outlineLight" className="w-full min-w-[12rem] sm:w-auto">
                    {t('ui_home_create_account')}
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
              initial={reduce ? false : { opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="pointer-events-none absolute -inset-4 rounded-[2rem] opacity-90 blur-2xl sm:-inset-6"
                style={{
                  background:
                    'radial-gradient(ellipse at 30% 20%, rgba(56,189,248,0.32), transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(245,158,11,0.22), transparent 50%)',
                }}
              />
              <div className="relative aspect-[4/5] max-h-[min(72vh,440px)] w-full overflow-hidden rounded-3xl border-2 border-sky-200/90 bg-white shadow-[0_20px_50px_-20px_rgba(14,165,233,0.35),0_24px_60px_-28px_rgba(15,23,42,0.12)] ring-2 ring-sky-300/30 sm:aspect-[3/4] sm:max-h-[min(68vh,480px)] lg:max-h-[min(75vh,520px)] lg:aspect-[4/5]">
                <img
                  src={homeHeroImage}
                  alt={t('ui_home_hero_image_alt')}
                  className="h-full w-full object-cover"
                  width={800}
                  height={1000}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-900/88 via-brand-900/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/95">{t('HomePage_114_occupational_health_safety_f1fd62a778')}</p>
                  <p className="mt-2 font-display text-lg font-semibold leading-snug text-white sm:text-xl">
                    {t('ui_home_hero_overlay_caption')}
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-2 left-3 right-auto z-10 sm:-bottom-3 sm:left-5">
                <div className="flex items-center gap-2 rounded-2xl border border-sky-200/90 bg-white/95 px-3 py-2 shadow-md shadow-sky-900/10 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md sm:h-10 sm:w-10">
                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-700">{t('HomePage_126_completion_f94bce59dd')}</p>
                    <p className="truncate text-sm font-semibold text-brand-900 sm:text-base">{t('HomePage_127_certs_progress_tracked_2eed468f77')}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mt-10 max-w-4xl rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-600/[0.08] via-white/90 to-sky-500/[0.06] px-4 py-4 shadow-sm shadow-sky-900/5 sm:px-8 sm:py-5 lg:mt-12">
            <dl className="grid grid-cols-3 gap-4 divide-x divide-sky-200/60 text-center sm:gap-6">
              {[
                {
                  k: t('ui_home_metric_courses'),
                  v: isPending ? '…' : t('ui_em_dash'),
                  d: t('ui_home_metric_launch_catalog'),
                },
                {
                  k: t('ui_home_metric_format'),
                  v: t('ui_home_metric_slides'),
                  d: t('ui_home_metric_audio_test'),
                },
                {
                  k: t('ui_home_metric_wallet'),
                  v: t('ui_home_metric_certification'),
                  d: t('ui_home_metric_web_app'),
                },
              ].map((x, idx) => (
                <div key={idx} className="px-2 first:pl-0 last:pr-0">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700 sm:text-[11px]">{x.k}</dt>
                  <dd className="mt-1.5 font-display text-xl font-bold text-brand-900 sm:text-2xl">{x.v}</dd>
                  <dd className="mt-0.5 text-[11px] text-slate-600 sm:text-xs">{x.d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      <section className="relative border-y border-sky-100/80 bg-gradient-to-b from-sky-50/40 to-white py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">{t('HomePage_155_programs_59d7aeb308')}</p>
            <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-brand-900 sm:text-3xl md:text-[2rem]">
              {t('ui_home_programs_heading')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {t('ui_home_programs_intro')}{' '}
              <a
                href="https://abcsafetysolutions.com/training-certification/"
                className="font-semibold text-sky-800 underline decoration-sky-300/80 underline-offset-2 hover:text-sky-900"
                target="_blank"
                rel="noreferrer"
              >
                {t('ui_home_programs_link_label')}
              </a>
              {t('ui_home_programs_outro')}
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trainingProgramTiles.slice(0, 1).map((prog) => {
              const i = trainingProgramTiles.indexOf(prog)
              return (
                <Link
                  key={prog.image}
                  to="/courses"
                  className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-200/50 transition hover:border-sky-200/80 hover:shadow-md hover:ring-sky-200/40"
                >
                  <div className="aspect-[5/3] overflow-hidden bg-slate-100">
                    <img
                      src={prog.image}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      width={400}
                      height={240}
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-display text-sm font-semibold leading-snug text-brand-900">
                      {t(`ui_brand_program_${i}_title`)}
                    </p>
                    {'note' in prog && prog.note === true ? (
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{t('ui_brand_program_epa_note')}</p>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </div>
        </Container>
      </section>

      <section className="relative border-y border-slate-200/80 bg-white py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">{t('HomePage_205_why_teams_choose_it_c8886b1e7d')}</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-brand-900 sm:text-3xl">{t('HomePage_206_clarity_proof_and_zero_friction_d96d29a3e1')}</h2>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {featureItems.map((x, i) => (
              <motion.div
                key={x.titleKey}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: reduce ? 0 : i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-8 shadow-sm transition hover:border-sky-200/60 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20">
                  <x.icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mt-6 font-display text-lg font-semibold text-brand-900">{t(x.titleKey)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{t(x.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-xl">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">{t('HomePage_233_featured_f859f892d2')}</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-brand-900 sm:text-4xl">{t('HomePage_234_popular_online_courses_2a521b4958')}</h2>
              <p className="mt-4 text-slate-600">{t('ui_home_featured_blurb')}</p>
            </div>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 shadow-sm transition hover:border-amber-200 hover:text-amber-900 lg:self-auto"
            >
              {t('ui_home_view_full_catalog')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <motion.div
            key={isPending ? 'featured-loading' : 'featured-ready'}
            className="mt-14 grid gap-10 sm:grid-cols-2 xl:grid-cols-3"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {isPending
              ? [0, 1, 2].map((k) => (
                  <motion.div key={k} variants={listItem} layout>
                    <CourseCardSkeleton />
                  </motion.div>
                ))
              : featured.map((c) => (
                  <motion.div key={c.id} variants={listItem} layout>
                    <CourseCard course={c} categories={categoryList} entrance={false} />
                  </motion.div>
                ))}
          </motion.div>
        </Container>
      </section>
    </>
  )
}
