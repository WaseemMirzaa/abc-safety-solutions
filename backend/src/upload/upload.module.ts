import { Module } from '@nestjs/common'
import { UploadController } from './upload.controller'
import { SlideRenderModule } from '../slide-render/slide-render.module'

@Module({
  imports: [SlideRenderModule],
  controllers: [UploadController],
})
export class UploadModule {}
