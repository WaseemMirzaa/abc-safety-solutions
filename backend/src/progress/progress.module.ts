import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProgressEntity } from '../entities/progress.entity'
import { EnrollmentsModule } from '../enrollments/enrollments.module'
import { ProgressService } from './progress.service'
import { ProgressController } from './progress.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ProgressEntity]), EnrollmentsModule],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
