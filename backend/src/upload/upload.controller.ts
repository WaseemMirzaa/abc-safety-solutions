import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import {
  assertAllowedUpload,
  maxBytesForMime,
  mediaKindFromMime,
  uploadDiskStorage,
  uploadUrlForFile,
} from './upload-storage'

@Controller('admin/upload')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class UploadController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadDiskStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!mediaKindFromMime(file.mimetype)) {
          cb(new Error('Images only'), false)
          return
        }
        cb(null, true)
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    assertAllowedUpload(file)
    return { url: uploadUrlForFile(file.filename), fileName: file.originalname, kind: 'image' as const }
  }

  /** Images, PDFs (full deck with embedded video/images), and video files for course slides. */
  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadDiskStorage(),
      limits: { fileSize: 100 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!mediaKindFromMime(file.mimetype)) {
          cb(new Error('Allowed: image/*, application/pdf, video/*'), false)
          return
        }
        const max = maxBytesForMime(file.mimetype)
        if (file.size > max) {
          cb(new Error(`File exceeds ${Math.round(max / 1024 / 1024)} MB limit`), false)
          return
        }
        cb(null, true)
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    const kind = assertAllowedUpload(file)
    return {
      url: uploadUrlForFile(file.filename),
      fileName: file.originalname,
      kind,
    }
  }
}
