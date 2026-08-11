import { forwardRef, Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { SlideRenderModule } from '../slide-render/slide-render.module'
import { NarrationModule } from '../narration/narration.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CourseEntity } from '../entities/course.entity'
import { CategoryEntity } from '../entities/category.entity'
import { CourseContentService } from './course-content.service'
import { CoursesService } from './courses.service'
import { CoursesController } from './courses.controller'
import { AdminCoursesController } from './admin-courses.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseEntity, CategoryEntity]),
    LanguagesModule,
    SlideRenderModule,
    // forwardRef: NarrationModule imports this module back (for CoursesService) — see
    // narration/narration.module.ts and course-narration.service.ts.
    forwardRef(() => NarrationModule),
  ],
  controllers: [CoursesController, AdminCoursesController],
  providers: [CoursesService, CourseContentService],
  exports: [CoursesService],
})
export class CoursesModule {}
