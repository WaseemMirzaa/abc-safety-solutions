import { Module } from '@nestjs/common'
import { UploadController } from './upload.controller'
import { SlideRenderModule } from '../slide-render/slide-render.module'
import { ConversionJobService } from './conversion-job.service'

@Module({
  imports: [SlideRenderModule],
  controllers: [UploadController],
  providers: [ConversionJobService],
})
export class UploadModule {}
