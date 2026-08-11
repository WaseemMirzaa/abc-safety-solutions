import { forwardRef, Module } from '@nestjs/common'
import { CoursesModule } from '../courses/courses.module'
import { CourseNarrationService } from './course-narration.service'
import { OpenAiNarrationService } from './openai-narration.service'
import { NarrationRateLimiterService } from './narration-rate-limiter.service'

@Module({
  // forwardRef: CoursesModule imports this module back (for CourseContentService /
  // AdminCoursesController to use CourseNarrationService) — see course-narration.service.ts.
  imports: [forwardRef(() => CoursesModule)],
  providers: [CourseNarrationService, OpenAiNarrationService, NarrationRateLimiterService],
  exports: [CourseNarrationService],
})
export class NarrationModule {}
