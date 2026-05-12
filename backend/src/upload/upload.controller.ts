import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { randomUUID } from 'node:crypto'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import { ConfigService } from '@nestjs/config'

@Controller('admin/upload')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class UploadController {
  constructor(private readonly config: ConfigService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), (process.env.UPLOAD_DIR ?? './uploads').replace(/^\.\//, ''))
          cb(null, dir)
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).slice(0, 8)}`)
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    const base = this.config.get<string>('PUBLIC_BASE_URL', 'http://localhost:3000')
    const url = `${base}/uploads/${file.filename}`
    return { url, fileName: file.originalname }
  }
}
