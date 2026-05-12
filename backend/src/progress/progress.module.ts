import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProgressEntity } from '../entities/progress.entity'
import { ProgressService } from './progress.service'
import { ProgressController } from './progress.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ProgressEntity])],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
