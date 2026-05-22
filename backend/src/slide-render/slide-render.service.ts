import { Injectable, Logger } from '@nestjs/common'
import { exec as execCb } from 'child_process'
import { promisify } from 'util'
import { readdir, mkdir, rename } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
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

@Injectable()
export class SlideRenderService {
  private readonly logger = new Logger(SlideRenderService.name)
  /** undefined = not yet detected; null = not found; string = binary path */
  private loBin: string | null | undefined = undefined

  private async detectLibreOffice(): Promise<string | null> {
    if (this.loBin !== undefined) return this.loBin

    // Fast check: absolute paths
    for (const p of LO_ABSOLUTE) {
      if (existsSync(p)) {
        this.loBin = p
        this.logger.log(`LibreOffice found at ${p}`)
        return p
      }
    }

    // Fallback: PATH lookup
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
        /* not in PATH, try next */
      }
    }

    this.loBin = null
    this.logger.warn(
      'LibreOffice not found — server-side slide rendering disabled. ' +
        'Install LibreOffice (https://www.libreoffice.org/) to enable fast slide image generation.',
    )
    return null
  }

  /**
   * Converts a PPTX, PPT, or PDF file to individual PNG images using LibreOffice.
   *
   * Images are stored at uploads/slides/{fileId}/0001.png, 0002.png, …
   * and served via the existing /uploads static route.
   *
   * Returns an empty array when LibreOffice is unavailable or conversion fails
   * so callers can fall back to client-side pptx-preview gracefully.
   */
  async renderSlides(uploadedFilePath: string, fileId: string): Promise<string[]> {
    if (!existsSync(uploadedFilePath)) return []

    const lo = await this.detectLibreOffice()
    if (!lo) return []

    const subDir = join('slides', fileId)
    const absDir = join(uploadDir(), subDir)
    await mkdir(absDir, { recursive: true })

    try {
      // LibreOffice writes one PNG per slide into absDir
      await exec(`"${lo}" --headless --convert-to png --outdir "${absDir}" "${uploadedFilePath}"`, {
        timeout: 180_000,
      })
    } catch (err) {
      this.logger.error(`LibreOffice conversion failed for ${uploadedFilePath}: ${String(err)}`)
      return []
    }

    const generated = (await readdir(absDir))
      .filter((f) => /\.png$/i.test(f))
      // Natural sort so deck9.png < deck10.png
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

    if (!generated.length) {
      this.logger.warn(`No PNG files generated in ${absDir} for ${uploadedFilePath}`)
      return []
    }

    // Rename to predictable sequential names: 0001.png, 0002.png, …
    const urls: string[] = []
    for (let i = 0; i < generated.length; i++) {
      const oldPath = join(absDir, generated[i])
      const newName = `${String(i + 1).padStart(4, '0')}.png`
      const newPath = join(absDir, newName)
      if (generated[i] !== newName) {
        await rename(oldPath, newPath)
      }
      urls.push(uploadUrlForFile(`${subDir}/${newName}`))
    }

    this.logger.log(`Generated ${urls.length} slide images for ${fileId}`)
    return urls
  }

  /** Returns URLs for PNGs already on disk (no LibreOffice run). */
  async listRenderedSlideUrls(fileId: string): Promise<string[]> {
    const subDir = join('slides', fileId)
    const absDir = join(uploadDir(), subDir)
    if (!existsSync(absDir)) return []

    const files = (await readdir(absDir))
      .filter((f) => /\.png$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

    return files.map((f) => uploadUrlForFile(`${subDir}/${f}`))
  }
}
