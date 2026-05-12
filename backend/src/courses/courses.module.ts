import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CourseEntity } from '../entities/course.entity'
import { CategoryEntity } from '../entities/category.entity'
import { CoursesService } from './courses.service'
import { CoursesController } from './courses.controller'
import { AdminCoursesController } from './admin-courses.controller'

@Module({
  imports: [TypeOrmModule.forFeature([CourseEntity, CategoryEntity])],
  controllers: [CoursesController, AdminCoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
