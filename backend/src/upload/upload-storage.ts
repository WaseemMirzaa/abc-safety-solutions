import { BadRequestException } from '@nestjs/common'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { randomUUID } from 'node:crypto'

export const UPLOAD_MIMES = {
  image: /^image\//,
  pdf: /^application\/pdf$/,
  video: /^video\//,
  pptx:
    /^application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation$/,
  ppt: /^application\/vnd\.ms-powerpoint$/,
} as const

export type UploadMediaKind = 'image' | 'pdf' | 'video' | 'pptx' | 'ppt'

export function uploadDir(): string {
  return join(process.cwd(), (process.env.UPLOAD_DIR ?? './uploads').replace(/^\.\//, ''))
}

export function uploadDiskStorage() {
  return diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir()),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).slice(0, 12) || ''
      cb(null, `${randomUUID()}${ext}`)
    },
  })
}

export function mediaKindFromFilename(filename: string): UploadMediaKind | null {
  const ext = extname(filename).toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) return 'image'
  if (ext === '.pdf') return 'pdf'
  if (['.mp4', '.webm', '.mov', '.ogg', '.m4v'].includes(ext)) return 'video'
  if (ext === '.pptx') return 'pptx'
  if (ext === '.ppt') return 'ppt'
  return null
}

export function mediaKindFromMime(mime: string, filename?: string): UploadMediaKind | null {
  if (UPLOAD_MIMES.image.test(mime)) return 'image'
  if (UPLOAD_MIMES.pdf.test(mime)) return 'pdf'
  if (UPLOAD_MIMES.video.test(mime)) return 'video'
  if (UPLOAD_MIMES.pptx.test(mime)) return 'pptx'
  if (UPLOAD_MIMES.ppt.test(mime)) return 'ppt'
  if (!mime || mime === 'application/octet-stream') {
    return filename ? mediaKindFromFilename(filename) : null
  }
  return null
}

export function maxBytesForKind(kind: UploadMediaKind): number {
  if (kind === 'image') return 5 * 1024 * 1024
  if (kind === 'pdf') return 50 * 1024 * 1024
  if (kind === 'video') return 100 * 1024 * 1024
  if (kind === 'pptx' || kind === 'ppt') return 100 * 1024 * 1024
  return 0
}

export function maxBytesForMime(mime: string, filename?: string): number {
  const kind = mediaKindFromMime(mime, filename)
  return kind ? maxBytesForKind(kind) : 0
}

/** Site root from .env, e.g. http://2.24.110.154 (no trailing slash). */
export function publicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '')
}

/** Public URL stored in DB — includes server IP/domain when PUBLIC_BASE_URL is set. */
export function uploadUrlForFile(filename: string): string {
  const path = `/uploads/${filename}`
  const base = publicBaseUrl()
  return base ? `${base}${path}` : path
}

export function assertAllowedUpload(file: Express.Multer.File) {
  const kind = mediaKindFromMime(file.mimetype, file.originalname)
  if (!kind) {
    throw new BadRequestException(
      'Allowed types: images, PDF, PowerPoint (.pptx or .ppt), and video (MP4, WebM, etc.).',
    )
  }
  const max = maxBytesForKind(kind)
  if (file.size > max) {
    const mb = Math.round(max / 1024 / 1024)
    throw new BadRequestException(`File too large. Max ${mb} MB for ${kind} uploads.`)
  }
  return kind
}
