import { BadRequestException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import type { CourseEntity } from '../entities/course.entity'
import type { CourseDto } from '../courses/courses.service'
import type { CourseSlide, SlidePageNarration, SlideNarrationLang } from '../common/course-slide.types'
import { filePathFromUploadUrl } from '../upload/upload-storage'
import { mapWithConcurrency } from '../common/concurrency.util'
import { CoursesService } from '../courses/courses.service'
import { OpenAiNarrationService } from './openai-narration.service'

type NarratablePage = { slide: CourseSlide; pageIndex: number; sourceUrl: string }
type NarrationStateSummary = 'none' | 'partial' | 'ready' | 'failed'
type PerPageState = 'ready' | 'failed' | 'pending'

function nowIso(): string {
  return new Date().toISOString()
}

function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.slice(0, 500)
}

/**
 * Orchestrates AI captioning + narration audio for rendered slide pages.
 *
 * Per-page pipelining (not a whole-course text-then-audio barrier): each page's audio
 * starts as soon as THAT page's own text is ready, not once every page in the course has
 * finished text. This still guarantees a page's audio never starts before its own text —
 * the literal requirement — while a straggler page (retry/backoff) no longer holds every
 * other already-finished page's audio hostage.
 *
 * DB status is never 'generating' — only 'pending' | 'ready' | 'failed'. A crash mid-call
 * simply leaves an entry 'pending', which the reconciliation sweep below picks back up;
 * there is no durable "stuck" state to detect or unstick.
 */
@Injectable()
export class CourseNarrationService {
  private readonly log = new Logger(CourseNarrationService.name)

  /** Reentrancy guard — single-process assumption, same as the existing
   *  ConversionJobService in-memory Map (docker-compose runs one `api` replica). */
  private readonly running = new Set<string>()
  private readonly rerunRequested = new Set<string>()
  /** Per-course serialized read-modify-write queue for courses.slides. */
  private readonly queues = new Map<string, Promise<void>>()

  constructor(
    // forwardRef: CoursesService lives in CoursesModule, which imports NarrationModule
    // (for CourseContentService/AdminCoursesController) — a genuine module-level cycle.
    @Inject(forwardRef(() => CoursesService)) private readonly courses: CoursesService,
    private readonly openai: OpenAiNarrationService,
  ) {}

  languages(): string[] {
    const raw = process.env.NARRATION_LANGUAGES ?? 'en,es'
    const langs = raw.split(',').map((s) => s.trim()).filter(Boolean)
    return langs.length ? langs : ['en', 'es']
  }

  // ── Scheduling ────────────────────────────────────────────────────────────────

  /** Fire-and-forget entry point. Safe to call repeatedly (e.g. on every course save) —
   *  a run already in flight just gets a rerun queued behind it instead of overlapping. */
  scheduleForCourse(courseId: string): void {
    if (!this.openai.isEnabled()) return // no OPENAI_API_KEY — feature quietly disabled
    if (this.running.has(courseId)) {
      this.rerunRequested.add(courseId)
      return
    }
    this.running.add(courseId)
    setImmediate(() => {
      void this.runForCourse(courseId)
        .catch((err) => this.log.error(`Narration run failed for course ${courseId}: ${String(err)}`))
        .finally(() => {
          this.running.delete(courseId)
          if (this.rerunRequested.delete(courseId)) this.scheduleForCourse(courseId)
        })
    })
  }

  private async runForCourse(courseId: string): Promise<void> {
    const entity = await this.courses.findEntity(courseId)
    if (!entity?.slides?.length) return
    const languages = this.languages()
    const pages = this.narratablePages(entity.slides)
    const todo = pages.filter((p) =>
      languages.some((lang) => this.pageState(this.pageEntry(p.slide, p.pageIndex), p.sourceUrl, lang) === 'pending'),
    )
    if (!todo.length) return
    this.log.log(`Narration: ${todo.length} page(s) need work for course ${courseId} (${languages.join(',')})`)
    await mapWithConcurrency(todo, (page) => this.processPage(courseId, page, languages), this.coursePoolSize())
  }

  /**
   * Local dispatch pool for ONE course's pages. Deliberately generous (a multiple of
   * NARRATION_CONCURRENCY, not a fixed small number) — this pool costs almost nothing
   * (idle promises awaiting network calls), so it must never itself be the throughput
   * ceiling. The real, single point of control over actual OpenAI request volume is
   * NarrationRateLimiterService (NARRATION_CONCURRENCY). A single course dominates the
   * common case (one course's PDF just got uploaded and needs 150 pages narrated) — if
   * this pool were capped at, say, 8, raising NARRATION_CONCURRENCY to 20 would have NO
   * effect on that course's speed, since only 8 of its pages could ever be in flight at
   * once regardless of how many global slots are available.
   */
  private coursePoolSize(): number {
    const globalLimit = Number(process.env.NARRATION_CONCURRENCY ?? 4)
    const base = Number.isFinite(globalLimit) && globalLimit > 0 ? globalLimit : 4
    return Math.max(16, base * 3)
  }

  /** Every 10 min: courses left 'partial' (real pending work, not a permanent failure)
   *  get re-scheduled. This is what makes generation resume after a crash/restart —
   *  the in-memory `running` guard is gone after a restart, but 'pending' entries in the
   *  DB are self-describing work items, not a state that depends on anything in memory. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcileStuckNarration(): Promise<void> {
    if (!this.openai.isEnabled()) return
    try {
      // Reuses the existing admin-list query; fine at this catalog's scale — narrow to a
      // dedicated COUNT/id-only query if the course catalog grows large enough to matter.
      const all = await this.courses.findAllAdmin()
      const stuck = all.filter((c) => c.narrationStatus === 'partial')
      for (const c of stuck) this.scheduleForCourse(c.id)
      if (stuck.length) this.log.log(`Narration reconciliation: re-scheduled ${stuck.length} course(s)`)
    } catch (err) {
      this.log.error(`Narration reconciliation sweep failed: ${String(err)}`)
    }
  }

  // ── Page enumeration ─────────────────────────────────────────────────────────

  /** pdfSlideId:pageIndex(0-based) pairs a pageReplace(mode:'replace') video has swapped
   *  out — narrating them would caption a page the learner never actually sees. */
  private replacedPageKeys(slides: CourseSlide[]): Set<string> {
    const skip = new Set<string>()
    for (const s of slides) {
      if (s.type === 'video' && s.pageReplace && (s.pageReplace.mode ?? 'replace') === 'replace') {
        skip.add(`${s.pageReplace.pdfSlideId}:${s.pageReplace.pageNumber - 1}`)
      }
    }
    return skip
  }

  private narratablePages(slides: CourseSlide[]): NarratablePage[] {
    const skip = this.replacedPageKeys(slides)
    const pages: NarratablePage[] = []
    for (const slide of slides) {
      if (slide.type === 'video') continue
      if (slide.type === 'pdf' || slide.type === 'pptx' || slide.type === 'ppt') {
        if (slide.renderStatus !== 'ready') continue // no image yet — nothing to look at
        const urls = slide.renderedSlideUrls?.filter(Boolean) ?? []
        urls.forEach((url, i) => {
          if (skip.has(`${slide.id}:${i}`)) return
          pages.push({ slide, pageIndex: i, sourceUrl: url })
        })
      } else if (slide.type === 'image') {
        pages.push({ slide, pageIndex: 0, sourceUrl: slide.url })
      }
    }
    return pages
  }

  private pageEntry(slide: CourseSlide, pageIndex: number): SlidePageNarration | undefined {
    return slide.narration?.[pageIndex]
  }

  /** 'pending' also covers a stale entry (source image changed since last generation) —
   *  same fresh-attempt treatment as never having been generated at all. */
  private pageState(entry: SlidePageNarration | undefined, sourceUrl: string, lang: string): PerPageState {
    if (!entry || entry.sourceUrl !== sourceUrl) return 'pending'
    return entry.lang[lang]?.status ?? 'pending'
  }

  /** courses.narrationStatus — cheap summary kept in sync on every persist. */
  summarizeStatus(slides: CourseSlide[]): NarrationStateSummary {
    const pages = this.narratablePages(slides)
    if (!pages.length) return 'none'
    const languages = this.languages()
    let anyPending = false
    let anyFailed = false
    let allReady = true
    for (const page of pages) {
      for (const lang of languages) {
        const state = this.pageState(this.pageEntry(page.slide, page.pageIndex), page.sourceUrl, lang)
        if (state !== 'ready') allReady = false
        if (state === 'pending') anyPending = true
        if (state === 'failed') anyFailed = true
      }
    }
    if (allReady) return 'ready'
    if (anyPending) return 'partial'
    if (anyFailed) return 'failed'
    return 'partial'
  }

  // ── Per-page pipeline ────────────────────────────────────────────────────────

  private async processPage(courseId: string, page: NarratablePage, languages: string[]): Promise<void> {
    const { slide, pageIndex, sourceUrl } = page
    let entry = this.pageEntry(slide, pageIndex)
    const stale = !entry || entry.sourceUrl !== sourceUrl
    const missingText = stale || languages.some((lang) => !entry?.lang[lang]?.text)

    if (missingText) {
      const filePath = filePathFromUploadUrl(sourceUrl)
      if (!filePath) {
        await this.persistFailure(courseId, slide.id, pageIndex, sourceUrl, languages, 'Source image not found on disk — re-upload this slide.')
        return
      }
      try {
        // Concurrency is enforced inside OpenAiNarrationService (per HTTP attempt, not
        // around the whole retry+backoff sequence) — nothing to wrap here.
        const result = await this.openai.describeSlideImage(filePath, languages)
        const langMap: Record<string, SlideNarrationLang> = {}
        for (const code of languages) langMap[code] = { text: result.texts[code], status: 'pending', updatedAt: nowIso() }
        entry = { titleOnly: result.titleOnly, sourceUrl, lang: langMap }
        await this.persistPage(courseId, slide.id, pageIndex, entry)
      } catch (err) {
        await this.persistFailure(courseId, slide.id, pageIndex, sourceUrl, languages, describeError(err))
        return
      }
    }

    // Audio — per language, in PARALLEL (not sequential): each language is an independent
    // OpenAI call with no reason to wait on its siblings, and requirement #5 explicitly
    // asks for parallel/batched dispatch. Failure isolation (try/catch per language) is
    // unaffected — one language failing still never blocks another's audio.
    const pending = languages
      .map((code) => ({ code, langEntry: entry?.lang[code] }))
      .filter((x): x is { code: string; langEntry: SlideNarrationLang } => Boolean(x.langEntry?.text) && x.langEntry!.status !== 'ready')

    await Promise.allSettled(
      pending.map(async ({ code, langEntry }) => {
        const text = langEntry.text!
        try {
          const audio = await this.openai.synthesizeSpeech(text, code)
          // expectedText guard: if a manual edit changed this page+lang's text while this
          // TTS call was in flight, this result is for STALE text — drop it instead of
          // clobbering the newer edit's own (separately in-flight or already-persisted) result.
          await this.persistLangResult(courseId, slide.id, pageIndex, sourceUrl, code, {
            text,
            audioUrl: audio.audioUrl,
            durationSec: audio.durationSec,
            status: 'ready',
            updatedAt: nowIso(),
          }, text)
        } catch (err) {
          await this.persistLangResult(courseId, slide.id, pageIndex, sourceUrl, code, {
            text,
            status: 'failed',
            error: describeError(err),
            updatedAt: nowIso(),
          }, text)
        }
      }),
    )
  }

  // ── Admin-facing actions ─────────────────────────────────────────────────────

  /** Resets terminal failures back to 'pending' (clearing their error) and re-schedules —
   *  the manual "Retry" action. Automatic scheduling deliberately never retries 'failed'
   *  entries on its own (every course save would otherwise burn OpenAI calls forever on a
   *  permanently-bad page); only this explicit action does. */
  async retryFailedForCourse(courseId: string): Promise<void> {
    await this.mutateSlides(courseId, (slides) =>
      slides.map((s) => {
        if (!s.narration?.length) return s
        return {
          ...s,
          narration: s.narration.map((entry) => ({
            ...entry,
            lang: Object.fromEntries(
              Object.entries(entry.lang).map(([code, l]) => [
                code,
                l.status === 'failed' ? { text: l.text, status: 'pending' as const, updatedAt: nowIso() } : l,
              ]),
            ),
          })),
        }
      }),
    )
    this.scheduleForCourse(courseId)
  }

  /** Admin manually edited a caption. Writes the text, clears any stale audio, and
   *  regenerates ONLY that page+lang's audio — independent of the whole-course save() and
   *  of every other page/language (no "click Save on the whole course" needed). */
  async setManualText(courseId: string, slideId: string, pageIndex: number, lang: string, text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed) throw new BadRequestException('Caption text cannot be empty.')
    if (!this.languages().includes(lang)) throw new BadRequestException(`Unsupported language "${lang}".`)

    let hadEntry = false
    await this.mutateSlides(courseId, (slides) =>
      slides.map((s) => {
        if (s.id !== slideId) return s
        const narration = [...(s.narration ?? [])]
        const prevEntry = narration[pageIndex]
        if (!prevEntry) return s // page hasn't been captioned yet — nothing to edit into
        hadEntry = true
        narration[pageIndex] = {
          ...prevEntry,
          lang: { ...prevEntry.lang, [lang]: { text: trimmed, status: 'pending', updatedAt: nowIso() } },
        }
        return { ...s, narration }
      }),
    )
    if (!hadEntry) throw new NotFoundException('This page has no caption yet — wait for generation to finish first.')

    setImmediate(() => {
      void this.regenerateAudioOnly(courseId, slideId, pageIndex, lang).catch((err) =>
        this.log.error(`Manual-edit audio regen failed for ${courseId}/${slideId}/${pageIndex}/${lang}: ${String(err)}`),
      )
    })
  }

  private async regenerateAudioOnly(courseId: string, slideId: string, pageIndex: number, lang: string): Promise<void> {
    // Text edits always save regardless of OpenAI availability (admin can hand-type
    // captions with no API key configured, per .env.example) — but the audio step, like
    // every other OpenAI entry point, quietly no-ops rather than retrying 4x into a
    // guaranteed failure and leaving a misleading 'failed' badge for a disabled feature.
    if (!this.openai.isEnabled()) return
    const entity = await this.courses.findEntity(courseId)
    const slide = entity?.slides?.find((s) => s.id === slideId)
    const entry = slide?.narration?.[pageIndex]
    const text = entry?.lang[lang]?.text
    const sourceUrl = entry?.sourceUrl
    if (!text || !sourceUrl) return
    try {
      const audio = await this.openai.synthesizeSpeech(text, lang)
      await this.persistLangResult(courseId, slideId, pageIndex, sourceUrl, lang, {
        text,
        audioUrl: audio.audioUrl,
        durationSec: audio.durationSec,
        status: 'ready',
        updatedAt: nowIso(),
      }, text)
    } catch (err) {
      await this.persistLangResult(courseId, slideId, pageIndex, sourceUrl, lang, {
        text,
        status: 'failed',
        error: describeError(err),
        updatedAt: nowIso(),
      }, text)
    }
  }

  /** Lightweight read for the admin polling UI — never the full course/slides payload,
   *  so polling can never race with (or overwrite) the admin's in-progress course-editor
   *  draft. Includes every narratable page, even ones generation hasn't reached yet. */
  async getStatusSummary(courseId: string) {
    const entity = await this.courses.findEntity(courseId)
    if (!entity) throw new NotFoundException('Course not found')
    const languages = this.languages()
    const slides = entity.slides ?? []
    const pages = this.narratablePages(slides)
    return {
      // Computed live from current slides, not the stored column — the column can lag
      // (only updated inside mutateSlides, i.e. once *something* has actually persisted),
      // so trusting it here could show "no captions yet" for a course whose PDF just
      // finished rendering and generation is already queued, or "all ready" after content
      // was replaced but nothing has regenerated yet. See summarizeStatus.
      narrationStatus: this.summarizeStatus(slides),
      narrationEnabled: this.openai.isEnabled(),
      languages,
      pages: pages.map(({ slide, pageIndex, sourceUrl }) => {
        const entry = this.pageEntry(slide, pageIndex)
        const fresh = Boolean(entry && entry.sourceUrl === sourceUrl)
        const lang: Record<string, { text?: string; audioUrl?: string; durationSec?: number; status: PerPageState; error?: string }> = {}
        for (const code of languages) {
          const l = fresh ? entry!.lang[code] : undefined
          lang[code] = { text: l?.text, audioUrl: l?.audioUrl, durationSec: l?.durationSec, status: l?.status ?? 'pending', error: l?.error }
        }
        return { slideId: slide.id, pageIndex, thumbnailUrl: sourceUrl, titleOnly: fresh ? entry!.titleOnly : undefined, lang }
      }),
    }
  }

  /**
   * Defensive merge for admin course-metadata saves (PUT /admin/courses/:id): narration
   * only ever changes through this service's own write paths (generation, manual edit,
   * retry) — never through the whole-course admin save, even if the client sends stale or
   * missing narration data for a slide it already knows about. This closes a lost-update
   * race: an admin editing price/title days after opening the editor would otherwise
   * silently overwrite narration completed by the background job since the modal opened.
   * Safe even across a genuine content change — each page's own `sourceUrl` fingerprint
   * self-detects staleness on the next generation pass regardless of what's carried over.
   */
  preserveExistingNarration(existingSlides: CourseSlide[] | null | undefined, incomingSlides: CourseSlide[]): CourseSlide[] {
    const byId = new Map((existingSlides ?? []).map((s) => [s.id, s]))
    return incomingSlides.map((incoming) => {
      const existing = byId.get(incoming.id)
      if (!existing?.narration?.length) {
        const { narration: _drop, ...rest } = incoming
        return rest
      }
      return { ...incoming, narration: existing.narration }
    })
  }

  /**
   * Admin course-metadata save (PUT /admin/courses/:id), routed through the SAME
   * per-course write lock narration generation uses. Reading `preserveExistingNarration`'s
   * "existing" snapshot from OUTSIDE this lock (as an earlier version of this code did)
   * left a real gap: a background narration write landing between that read and the
   * eventual `courses.update()` call would still get clobbered. Doing the read AND write
   * inside `runExclusive` closes that gap for good, not just narrows it.
   */
  async applyAdminUpdate(courseId: string, patch: Partial<CourseEntity>): Promise<CourseDto> {
    return this.runExclusive(courseId, async () => {
      let finalPatch = patch
      if (patch.slides !== undefined) {
        const existing = await this.courses.findEntity(courseId)
        const incoming = patch.slides?.length ? patch.slides : []
        const merged = incoming.length ? this.preserveExistingNarration(existing?.slides, incoming) : []
        finalPatch = { ...patch, slides: merged.length ? merged : null, narrationStatus: this.summarizeStatus(merged) }
      }
      return this.courses.update(courseId, finalPatch)
    })
  }

  /**
   * CourseContentService's PDF-render / video-transcode background writers capture a
   * `slides` snapshot before their (slow, multi-second) file-processing work starts, then
   * used to write it back unconditionally — clobbering any narration generated or hand-
   * edited during that window. This merges against the CURRENT DB row, under the same
   * per-course lock, instead.
   */
  async mergeContentUpdate(courseId: string, freshSlides: CourseSlide[], extra: Partial<CourseEntity>): Promise<void> {
    await this.runExclusive(courseId, async () => {
      const entity = await this.courses.findEntity(courseId)
      if (!entity) return
      const merged = this.preserveExistingNarration(entity.slides, freshSlides)
      await this.courses.update(courseId, { ...extra, slides: merged, narrationStatus: this.summarizeStatus(merged) })
    })
  }

  // ── Persistence (serialized per course) ─────────────────────────────────────

  /** Chains onto the previous op for this course so concurrent page workers (and admin
   *  edits) never read-modify-write the same row at once and clobber each other. */
  private runExclusive<T>(courseId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.queues.get(courseId) ?? Promise.resolve()
    const result = prev.then(fn, fn)
    this.queues.set(
      courseId,
      result.then(
        () => undefined,
        () => undefined,
      ),
    )
    return result
  }

  private async mutateSlides(courseId: string, mutate: (slides: CourseSlide[]) => CourseSlide[]): Promise<void> {
    await this.runExclusive(courseId, async () => {
      const entity = await this.courses.findEntity(courseId)
      if (!entity) return
      const slides = mutate((entity.slides ?? []).map((s) => ({ ...s })))
      const narrationStatus = this.summarizeStatus(slides)
      await this.courses.update(courseId, { slides, narrationStatus })
    })
  }

  private async persistPage(courseId: string, slideId: string, pageIndex: number, entry: SlidePageNarration): Promise<void> {
    await this.mutateSlides(courseId, (slides) =>
      slides.map((s) => {
        if (s.id !== slideId) return s
        const narration = [...(s.narration ?? [])]
        narration[pageIndex] = entry
        return { ...s, narration }
      }),
    )
  }

  private async persistLangResult(
    courseId: string,
    slideId: string,
    pageIndex: number,
    sourceUrl: string,
    lang: string,
    result: SlideNarrationLang,
    /** Optimistic guard: only apply this write if the page+lang's CURRENT text still
     *  matches what this result was generated from. Without it, a slow original-generation
     *  TTS call racing a faster manual-edit regen can land last and silently revert the
     *  admin's edit back to the pre-edit text+audio — this drops that stale write instead. */
    expectedText?: string,
  ): Promise<void> {
    await this.mutateSlides(courseId, (slides) =>
      slides.map((s) => {
        if (s.id !== slideId) return s
        const narration = [...(s.narration ?? [])]
        const prevEntry = narration[pageIndex]
        const fresh = prevEntry && prevEntry.sourceUrl === sourceUrl
        if (expectedText !== undefined && fresh && prevEntry.lang[lang]?.text !== expectedText) {
          return s // superseded by a newer edit — drop this stale write
        }
        const base: SlidePageNarration = fresh ? prevEntry : { sourceUrl, lang: {} }
        narration[pageIndex] = { ...base, sourceUrl, lang: { ...base.lang, [lang]: result } }
        return { ...s, narration }
      }),
    )
  }

  private async persistFailure(
    courseId: string,
    slideId: string,
    pageIndex: number,
    sourceUrl: string,
    languages: string[],
    message: string,
  ): Promise<void> {
    await this.mutateSlides(courseId, (slides) =>
      slides.map((s) => {
        if (s.id !== slideId) return s
        const narration = [...(s.narration ?? [])]
        const prevEntry = narration[pageIndex]
        const base: SlidePageNarration = prevEntry && prevEntry.sourceUrl === sourceUrl ? prevEntry : { sourceUrl, lang: {} }
        const lang: Record<string, SlideNarrationLang> = { ...base.lang }
        for (const code of languages) {
          lang[code] = { ...(lang[code] ?? {}), status: 'failed', error: message, updatedAt: nowIso() }
        }
        narration[pageIndex] = { ...base, sourceUrl, lang }
        return { ...s, narration }
      }),
    )
  }
}
