import { BadRequestException } from '@nestjs/common'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { randomUUID } from 'node:crypto'

export const UPLOAD_MIMES = {
  image: /^image\//,
  pdf: /^application\/pdf$/,
  video: /^video\//,
} as const

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

export function mediaKindFromMime(mime: string): 'image' | 'pdf' | 'video' | null {
  if (UPLOAD_MIMES.image.test(mime)) return 'image'
  if (UPLOAD_MIMES.pdf.test(mime)) return 'pdf'
  if (UPLOAD_MIMES.video.test(mime)) return 'video'
  return null
}

export function maxBytesForMime(mime: string): number {
  if (UPLOAD_MIMES.image.test(mime)) return 5 * 1024 * 1024
  if (UPLOAD_MIMES.pdf.test(mime)) return 50 * 1024 * 1024
  if (UPLOAD_MIMES.video.test(mime)) return 100 * 1024 * 1024
  return 0
}

export function uploadUrlForFile(filename: string): string {
  return `/uploads/${filename}`
}

export function assertAllowedUpload(file: Express.Multer.File) {
  const kind = mediaKindFromMime(file.mimetype)
  if (!kind) {
    throw new BadRequestException('Allowed types: images, PDF, and video (MP4, WebM, etc.).')
  }
  const max = maxBytesForMime(file.mimetype)
  if (file.size > max) {
    const mb = Math.round(max / 1024 / 1024)
    throw new BadRequestException(`File too large. Max ${mb} MB for ${kind} uploads.`)
  }
  return kind
}
