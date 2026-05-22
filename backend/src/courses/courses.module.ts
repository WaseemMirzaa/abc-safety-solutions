import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { SlideRenderModule } from '../slide-render/slide-render.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CourseEntity } from '../entities/course.entity'
import { CategoryEntity } from '../entities/category.entity'
import { CourseContentService } from './course-content.service'
import { CoursesService } from './courses.service'
import { CoursesController } from './courses.controller'
import { AdminCoursesController } from './admin-courses.controller'

@Module({
  imports: [TypeOrmModule.forFeature([CourseEntity, CategoryEntity]), LanguagesModule, SlideRenderModule],
  controllers: [CoursesController, AdminCoursesController],
  providers: [CoursesService, CourseContentService],
  exports: [CoursesService],
})
export class CoursesModule {}
