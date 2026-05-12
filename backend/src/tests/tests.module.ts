import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CourseTestEntity } from '../entities/course-test.entity'
import { TestsService } from './tests.service'
import { TestsController } from './tests.controller'
import { AdminTestsController } from './admin-tests.controller'
import { ProgressModule } from '../progress/progress.module'
import { EnrollmentsModule } from '../enrollments/enrollments.module'

@Module({
  imports: [TypeOrmModule.forFeature([CourseTestEntity]), ProgressModule, EnrollmentsModule],
  controllers: [TestsController, AdminTestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
