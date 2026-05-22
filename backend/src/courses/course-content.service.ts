import { Injectable } from '@nestjs/common'
import { join } from 'path'
import { existsSync } from 'fs'
import type { CourseSlide } from '../common/course-slide.types'
import { computeCourseContentMetrics } from '../common/course-content.util'
import { uploadDir } from '../upload/upload-storage'
import { SlideRenderService } from '../slide-render/slide-render.service'

@Injectable()
export class CourseContentService {
  constructor(private readonly slideRender: SlideRenderService) {}

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

  /** Render PDFs that are not ready yet; refresh page counts and metrics. */
  async prepareSlides(slides: CourseSlide[]): Promise<{
    slides: CourseSlide[]
    metrics: ReturnType<typeof computeCourseContentMetrics>
  }> {
    const prepared: CourseSlide[] = []

    for (const slide of slides) {
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
        if (cached.length > 0) {
          prepared.push({
            ...slide,
            renderedSlideUrls: cached,
            pdfPageCount: cached.length,
            deckSlideCount: cached.length,
            renderStatus: 'ready',
          })
        } else {
          prepared.push({
            ...slide,
            pdfPageCount: slide.pdfPageCount ?? 1,
            deckSlideCount: slide.deckSlideCount ?? 1,
            renderStatus: 'failed',
          })
        }
      }
    }

    return { slides: prepared, metrics: computeCourseContentMetrics(prepared) }
  }
}
