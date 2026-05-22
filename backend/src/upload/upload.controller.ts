import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import {
  assertAllowedUpload,
  multerFileFilter,
  uploadDiskStorage,
  uploadUrlForFile,
} from './upload-storage'

@Controller('admin/upload')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class UploadController {
  /** Images (legacy path). Accepts same types as /file so older admin builds still work. */
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadDiskStorage(),
      fileFilter: multerFileFilter,
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    const kind = assertAllowedUpload(file)
    return { url: uploadUrlForFile(file.filename), fileName: file.originalname, kind }
  }

  /** Images, PDFs, PowerPoint, and video for course slides / media library. */
  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadDiskStorage(),
      fileFilter: multerFileFilter,
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
