import { Injectable, Logger } from '@nestjs/common'
import { join, basename } from 'path'
import { existsSync } from 'fs'
import type { CourseSlide } from '../common/course-slide.types'
import { computeCourseContentMetrics } from '../common/course-content.util'
import { uploadDir, uploadUrlForFile } from '../upload/upload-storage'
import { needsBrowserTranscode, prepareBrowserVideo, probeVideoDurationSec } from '../upload/video-process.util'
import { SlideRenderService } from '../slide-render/slide-render.service'
import { CoursesService } from './courses.service'

@Injectable()
export class CourseContentService {
  private readonly log = new Logger(CourseContentService.name)

  constructor(
    private readonly slideRender: SlideRenderService,
    private readonly courses: CoursesService,
  ) {}

  private filePathFromUploadUrl(fileUrl: string): string | null {
    const uploadsPrefix = '/uploads/'
    const idx = fileUrl.indexOf(uploadsPrefix)
    if (idx === -1) return null
    const rel = fileUrl.slice(idx + uploadsPrefix.length).split('?')[0]
    if (!rel || rel.includes('..')) return null
    const filePath = join(uploadDir(), rel)
    return existsSync(filePath) ? filePath : null
  }

  private fileIdFromUrl(fileUrl: string): string {
    const uploadsPrefix = '/uploads/'
    const idx = fileUrl.indexOf(uploadsPrefix)
    const rel = idx === -1 ? fileUrl : fileUrl.slice(idx + uploadsPrefix.length).split('?')[0]
    return rel.replace(/[^a-zA-Z0-9\-_]/g, '_')
  }

  /** Fast path for save/upload: use cached PNGs only; never block on LibreOffice. */
  async prepareSlides(slides: CourseSlide[]): Promise<{
    slides: CourseSlide[]
    metrics: ReturnType<typeof computeCourseContentMetrics>
  }> {
    const prepared: CourseSlide[] = []

    for (const slide of slides) {
      if (slide.type === 'video') {
        let url = slide.url
        let durationSec = slide.durationSec ?? 0
        let filePath = this.filePathFromUploadUrl(slide.url)

        // If the original file no longer exists (e.g. WMV was already transcoded
        // and deleted on a prior load), check for an already-created MP4 version.
        if (!filePath && needsBrowserTranscode(url)) {
          const mp4Url = url.replace(/\.[^/.?]+(\?|$)/, '.mp4$1')
          const mp4Path = this.filePathFromUploadUrl(mp4Url)
          if (mp4Path) {
            url = mp4Url
            filePath = mp4Path
          }
        }

        if (filePath) {
          if (needsBrowserTranscode(filePath)) {
            const { filename, durationSec: probed } = await prepareBrowserVideo(
              uploadDir(),
              basename(filePath),
            )
            url = uploadUrlForFile(filename)
            if (probed > 0) durationSec = Math.round(probed)
          } else {
            const probed = await probeVideoDurationSec(filePath)
            if (probed > 0) durationSec = Math.round(probed)
          }
        }
        prepared.push({ ...slide, url, ...(durationSec > 0 ? { durationSec } : {}) })
        continue
      }

      if (slide.type !== 'pdf') {
        prepared.push({ ...slide })
        continue
      }

      const existing = slide.renderedSlideUrls?.filter(Boolean) ?? []
      if (existing.length > 0) {
        prepared.push({
          ...slide,
          pdfPageCount: existing.length,
          deckSlideCount: existing.length,
          renderStatus: 'ready',
        })
        continue
      }

      const fileId = this.fileIdFromUrl(slide.url)
      const cached = await this.slideRender.listRenderedSlideUrls(fileId)
      if (cached.length > 0) {
        prepared.push({
          ...slide,
          renderedSlideUrls: cached,
          pdfPageCount: cached.length,
          deckSlideCount: cached.length,
          renderStatus: 'ready',
        })
        continue
      }

      prepared.push({
        ...slide,
        pdfPageCount: slide.pdfPageCount ?? 1,
        deckSlideCount: slide.deckSlideCount ?? 1,
        renderStatus: 'pending',
      })
    }

    return { slides: prepared, metrics: computeCourseContentMetrics(prepared) }
  }

  /**
   * Lightweight sync URL fix: swaps any stored .wmv URL for the
   * already-transcoded .mp4 if it exists on disk.
   */
  fixVideoUrls(slides: CourseSlide[] | undefined): CourseSlide[] | undefined {
    if (!slides?.length) return slides
    return slides.map((slide) => {
      if (slide.type !== 'video' || !needsBrowserTranscode(slide.url)) return slide
      const mp4Url = slide.url.replace(/\.[^/.?]+(\?|$)/, '.mp4$1')
      return this.filePathFromUploadUrl(mp4Url) ? { ...slide, url: mp4Url } : slide
    })
  }

  /** Returns true if any slide has a URL that needs browser transcoding. */
  needsVideoTranscode(slides: CourseSlide[] | undefined): boolean {
    return Boolean(slides?.some((s) => s.type === 'video' && needsBrowserTranscode(s.url)))
  }

  /**
   * Runs after the HTTP response: transcodes any WMV/AVI/etc. slides to MP4
   * and persists the updated URLs + duration back to the DB so subsequent
   * requests serve the correct MP4 URL immediately.
   */
  scheduleVideoTranscode(courseId: string, slides: CourseSlide[]) {
    if (!this.needsVideoTranscode(slides)) return
    setImmediate(() => {
      void this.transcodeVideosAndUpdateCourse(courseId, slides)
    })
  }

  private async transcodeVideosAndUpdateCourse(courseId: string, slides: CourseSlide[]) {
    try {
      const prepared: CourseSlide[] = []
      let changed = false
      for (const slide of slides) {
        if (slide.type !== 'video' || !needsBrowserTranscode(slide.url)) {
          prepared.push(slide)
          continue
        }
        const filePath = this.filePathFromUploadUrl(slide.url)
        if (!filePath) {
          prepared.push(slide)
          continue
        }
        try {
          const { filename, durationSec } = await prepareBrowserVideo(uploadDir(), basename(filePath))
          const newUrl = uploadUrlForFile(filename)
          prepared.push({ ...slide, url: newUrl, ...(durationSec > 0 ? { durationSec: Math.round(durationSec) } : {}) })
          changed = true
        } catch (err) {
          this.log.warn(`Background video transcode failed for ${slide.url}: ${String(err)}`)
          prepared.push(slide)
        }
      }
      if (!changed) return
      const metrics = computeCourseContentMetrics(prepared)
      await this.courses.update(courseId, {
        slides: prepared,
        durationMinutes: metrics.durationMinutes,
        slideCount: metrics.slideCount,
      })
      this.log.log(`Video transcode finished for course ${courseId}`)
    } catch (err) {
      this.log.error(`Video transcode task failed for course ${courseId}: ${String(err)}`)
    }
  }

  needsPdfRender(slides: CourseSlide[] | undefined): boolean {
    return Boolean(slides?.some((s) => s.type === 'pdf' && (s.renderStatus === 'pending' || !s.renderedSlideUrls?.length)))
  }

  /** Runs after HTTP response so PDF conversion does not freeze uploads / the whole API. */
  schedulePdfRender(courseId: string, slides: CourseSlide[]) {
    if (!this.needsPdfRender(slides)) return
    setImmediate(() => {
      void this.renderPendingPdfsAndUpdateCourse(courseId, slides)
    })
  }

  private async renderPendingPdfsAndUpdateCourse(courseId: string, slides: CourseSlide[]) {
    try {
      const prepared: CourseSlide[] = []
      for (const slide of slides) {
        if (slide.type !== 'pdf' || (slide.renderedSlideUrls?.filter(Boolean).length ?? 0) > 0) {
          prepared.push({ ...slide })
          continue
        }
        const filePath = this.filePathFromUploadUrl(slide.url)
        if (!filePath) {
          prepared.push({ ...slide, renderStatus: 'failed' })
          continue
        }
        const fileId = this.fileIdFromUrl(slide.url)
        const urls = await this.slideRender.renderSlides(filePath, fileId)
        if (urls.length > 0) {
          prepared.push({
            ...slide,
            renderedSlideUrls: urls,
            pdfPageCount: urls.length,
            deckSlideCount: urls.length,
            renderStatus: 'ready',
          })
        } else {
          const cached = await this.slideRender.listRenderedSlideUrls(fileId)
          prepared.push(
            cached.length > 0
              ? {
                  ...slide,
                  renderedSlideUrls: cached,
                  pdfPageCount: cached.length,
                  deckSlideCount: cached.length,
                  renderStatus: 'ready',
                }
              : { ...slide, renderStatus: 'failed' },
          )
        }
      }
      const metrics = computeCourseContentMetrics(prepared)
      await this.courses.update(courseId, {
        slides: prepared,
        durationMinutes: metrics.durationMinutes,
        slideCount: metrics.slideCount,
      })
      this.log.log(`PDF render finished for course ${courseId}`)
    } catch (err) {
      this.log.error(`PDF render failed for course ${courseId}: ${String(err)}`)
    }
  }
}
