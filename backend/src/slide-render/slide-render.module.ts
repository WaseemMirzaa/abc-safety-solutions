import { Module } from '@nestjs/common'
import { SlideRenderService } from './slide-render.service'

@Module({
  providers: [SlideRenderService],
  exports: [SlideRenderService],
})
export class SlideRenderModule {}
