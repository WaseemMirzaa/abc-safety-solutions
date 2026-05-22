import { Injectable, Logger } from '@nestjs/common'
import { exec as execCb } from 'child_process'
import { promisify } from 'util'
import { readdir, mkdir, rename, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { basename, extname, join } from 'path'
import { uploadDir, uploadUrlForFile } from '../upload/upload-storage'

const exec = promisify(execCb)

/** Absolute paths checked first (no PATH lookup needed). */
const LO_ABSOLUTE = [
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/usr/bin/libreoffice',
  '/usr/bin/soffice',
  '/usr/local/bin/libreoffice',
  '/usr/local/bin/soffice',
  '/opt/libreoffice/program/soffice',
  '/snap/bin/libreoffice',
]

const PDFTOPPM_ABSOLUTE = ['/usr/bin/pdftoppm', '/usr/local/bin/pdftoppm']

@Injectable()
export class SlideRenderService {
  private readonly logger = new Logger(SlideRenderService.name)
  /** undefined = not yet detected; null = not found; string = binary path */
  private loBin: string | null | undefined = undefined
  private pdfToPpmBin: string | null | undefined = undefined

  private async detectLibreOffice(): Promise<string | null> {
    if (this.loBin !== undefined) return this.loBin

    for (const p of LO_ABSOLUTE) {
      if (existsSync(p)) {
        this.loBin = p
        this.logger.log(`LibreOffice found at ${p}`)
        return p
      }
    }

    for (const name of ['libreoffice', 'soffice']) {
      try {
        const { stdout } = await exec(`which ${name}`)
        const bin = stdout.trim()
        if (bin) {
          this.loBin = bin
          this.logger.log(`LibreOffice found via PATH: ${bin}`)
          return bin
        }
      } catch {
        /* not in PATH */
      }
    }

    this.loBin = null
    this.logger.warn(
      'LibreOffice not found — server-side slide rendering disabled. ' +
        'Install LibreOffice to enable slide image generation.',
    )
    return null
  }

  private async detectPdftoppm(): Promise<string | null> {
    if (this.pdfToPpmBin !== undefined) return this.pdfToPpmBin

    for (const p of PDFTOPPM_ABSOLUTE) {
      if (existsSync(p)) {
        this.pdfToPpmBin = p
        this.logger.log(`pdftoppm found at ${p}`)
        return p
      }
    }

    try {
      const { stdout } = await exec('which pdftoppm')
      const bin = stdout.trim()
      if (bin) {
        this.pdfToPpmBin = bin
        this.logger.log(`pdftoppm found via PATH: ${bin}`)
        return bin
      }
    } catch {
      /* not in PATH */
    }

    this.pdfToPpmBin = null
    this.logger.warn(
      'pdftoppm not found — install poppler-utils for multi-slide PNG export.',
    )
    return null
  }

  private async finalizePngSequence(absDir: string, subDir: string): Promise<string[]> {
    const generated = (await readdir(absDir))
      .filter((f) => /\.png$/i.test(f) && !/^\d{4}\.png$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

    const urls: string[] = []
    for (let i = 0; i < generated.length; i++) {
      const oldPath = join(absDir, generated[i])
      const newName = `${String(i + 1).padStart(4, '0')}.png`
      const newPath = join(absDir, newName)
      await rename(oldPath, newPath)
      urls.push(uploadUrlForFile(`${subDir}/${newName}`))
    }

    return urls
  }

  private async exportPdfToPngs(
    pdfPath: string,
    absDir: string,
    subDir: string,
    pdftoppm: string,
  ): Promise<string[]> {
    const prefix = join(absDir, 'page')
    await exec(`"${pdftoppm}" -png "${pdfPath}" "${prefix}"`, { timeout: 180_000 })
    try {
      await unlink(pdfPath)
    } catch {
      /* ignore */
    }
    return this.finalizePngSequence(absDir, subDir)
  }

  /**
   * Converts a PPTX, PPT, or PDF to PNGs at uploads/slides/{fileId}/0001.png, …
   *
   * Decks use LibreOffice → PDF → pdftoppm (one PNG per slide). Direct LO PNG export
   * only produces a single image for Impress files.
   */
  async renderSlides(uploadedFilePath: string, fileId: string): Promise<string[]> {
    if (!existsSync(uploadedFilePath)) return []

    const subDir = join('slides', fileId)
    const absDir = join(uploadDir(), subDir)
    await mkdir(absDir, { recursive: true })
    for (const f of await readdir(absDir)) {
      if (/\.(png|pdf)$/i.test(f)) {
        try {
          await unlink(join(absDir, f))
        } catch {
          /* ignore */
        }
      }
    }

    const ext = extname(uploadedFilePath).toLowerCase()
    const pdftoppm = await this.detectPdftoppm()

    if (ext === '.pdf') {
      if (!pdftoppm) return []
      try {
        const urls = await this.exportPdfToPngs(uploadedFilePath, absDir, subDir, pdftoppm)
        if (urls.length) this.logger.log(`Generated ${urls.length} slide images for ${fileId}`)
        else this.logger.warn(`No PNG files generated in ${absDir} for ${uploadedFilePath}`)
        return urls
      } catch (err) {
        this.logger.error(`pdftoppm failed for ${uploadedFilePath}: ${String(err)}`)
        return []
      }
    }

    const lo = await this.detectLibreOffice()
    if (!lo) return []

    if (pdftoppm) {
      try {
        await exec(`"${lo}" --headless --convert-to pdf --outdir "${absDir}" "${uploadedFilePath}"`, {
          timeout: 180_000,
        })
        const pdfName = `${basename(uploadedFilePath, extname(uploadedFilePath))}.pdf`
        const pdfPath = join(absDir, pdfName)
        if (existsSync(pdfPath)) {
          const urls = await this.exportPdfToPngs(pdfPath, absDir, subDir, pdftoppm)
          if (urls.length) {
            this.logger.log(`Generated ${urls.length} slide images for ${fileId} (via PDF)`)
            return urls
          }
        }
        this.logger.warn(`PDF intermediate missing after LO convert: ${uploadedFilePath}`)
      } catch (err) {
        this.logger.error(`PDF slide pipeline failed for ${uploadedFilePath}: ${String(err)}`)
      }
    }

    // Fallback: single-slide PNG (LO impress_png_Export — not suitable for full decks)
    try {
      await exec(`"${lo}" --headless --convert-to png --outdir "${absDir}" "${uploadedFilePath}"`, {
        timeout: 180_000,
      })
    } catch (err) {
      this.logger.error(`LibreOffice PNG conversion failed for ${uploadedFilePath}: ${String(err)}`)
      return []
    }

    const urls = await this.finalizePngSequence(absDir, subDir)
    if (!urls.length) {
      this.logger.warn(`No PNG files generated in ${absDir} for ${uploadedFilePath}`)
      return []
    }
    this.logger.log(`Generated ${urls.length} slide image(s) for ${fileId} (direct PNG fallback)`)
    return urls
  }

  /** Returns URLs for PNGs already on disk (no LibreOffice run). */
  async listRenderedSlideUrls(fileId: string): Promise<string[]> {
    const subDir = join('slides', fileId)
    const absDir = join(uploadDir(), subDir)
    if (!existsSync(absDir)) return []

    const files = (await readdir(absDir))
      .filter((f) => /^\d{4}\.png$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

    return files.map((f) => uploadUrlForFile(`${subDir}/${f}`))
  }
}
