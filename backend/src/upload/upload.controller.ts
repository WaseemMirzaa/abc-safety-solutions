import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import {
  assertAllowedUpload,
  multerFileFilter,
  uploadDiskStorage,
  uploadDir,
  uploadUrlForFile,
} from './upload-storage'
import { SlideRenderService } from '../slide-render/slide-render.service'
import { IsString, MinLength } from 'class-validator'
import { existsSync } from 'fs'
import { extname, join } from 'path'
import { prepareBrowserVideo } from './video-process.util'

class RenderSlidesDto {
  @IsString()
  @MinLength(1)
  fileUrl: string
}

@Controller('admin/upload')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class UploadController {
  constructor(private readonly slideRender: SlideRenderService) {}

  /** Images (legacy path). Accepts same types as /file so older admin builds still work. */
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadDiskStorage(),
      fileFilter: multerFileFilter,
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file received — upload may have been interrupted.')
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
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file received — upload may have been interrupted.')
    const kind = assertAllowedUpload(file)

    if (kind !== 'video') {
      return {
        url: uploadUrlForFile(file.filename),
        fileName: file.originalname,
        kind,
      }
    }

    try {
      const { filename, durationSec } = await prepareBrowserVideo(uploadDir(), file.filename)
      return {
        url: uploadUrlForFile(filename),
        fileName: file.originalname,
        kind,
        ...(durationSec > 0 ? { durationSec: Math.round(durationSec) } : {}),
      }
    } catch {
      throw new BadRequestException(
        'Video upload failed during processing. WMV and similar formats are converted to MP4 — ensure ffmpeg is installed on the server.',
      )
    }
  }

  /**
   * Converts an already-uploaded PPTX, PPT, or PDF into PNG slide images via LibreOffice.
   * Called separately after /file so the file upload itself stays fast.
   *
   * Returns { slideImageUrls: string[] } — empty array when LibreOffice is not installed.
   */
  @Post('render-slides')
  async renderSlides(@Body() body: RenderSlidesDto) {
    if (!body?.fileUrl) throw new BadRequestException('fileUrl is required')

    // Strip the /uploads/ prefix to get the relative filename
    const uploadsPrefix = '/uploads/'
    const idx = body.fileUrl.indexOf(uploadsPrefix)
    if (idx === -1) throw new BadRequestException('fileUrl must be an /uploads/… URL')

    const relPath = body.fileUrl.slice(idx + uploadsPrefix.length).split('?')[0]
    if (!relPath || relPath.includes('..')) throw new BadRequestException('Invalid fileUrl')

    const ext = extname(relPath).toLowerCase()
    if (!['.pptx', '.ppt', '.pdf'].includes(ext)) {
      throw new BadRequestException('Only PPTX, PPT, and PDF files can be converted to slide images')
    }

    const filePath = join(uploadDir(), relPath)
    if (!existsSync(filePath)) throw new NotFoundException('Uploaded file not found on server')

    // Use the UUID portion of the filename (without extension) as a stable directory key
    const fileId = relPath.replace(/[^a-zA-Z0-9\-_]/g, '_')
    const existing = await this.slideRender.listRenderedSlideUrls(fileId)
    if (existing.length > 0) return { slideImageUrls: existing }

    const slideImageUrls = await this.slideRender.renderSlides(filePath, fileId)
    return { slideImageUrls }
  }
}
