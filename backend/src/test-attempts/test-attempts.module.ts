import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TestAttemptEntity } from '../entities/test-attempt.entity'
import { TestAttemptsService } from './test-attempts.service'

@Module({
  imports: [TypeOrmModule.forFeature([TestAttemptEntity])],
  providers: [TestAttemptsService],
  exports: [TestAttemptsService],
})
export class TestAttemptsModule {}
