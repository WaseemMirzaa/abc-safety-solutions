import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsBoolean, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { CurrentUser } from '../common/current-user.decorator'
import { ProgressService } from './progress.service'

class ProgressBody {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  slideIndex: number

  @IsInt()
  @Min(0)
  @Type(() => Number)
  audioTimeSec: number

  @IsBoolean()
  completedSlides: boolean
}

class TestPassBody {
  @IsBoolean()
  passed: boolean
}

@Controller('progress')
@UseGuards(AuthGuard('jwt'))
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get(':courseId')
  get(@CurrentUser() u: { id: string }, @Param('courseId') courseId: string) {
    return this.progress.get(u.id, courseId)
  }

  @Patch(':courseId')
  patch(@CurrentUser() u: { id: string }, @Param('courseId') courseId: string, @Body() body: ProgressBody) {
    return this.progress.save(u.id, courseId, body)
  }

  @Post(':courseId/test-passed')
  testPassed(@CurrentUser() u: { id: string }, @Param('courseId') courseId: string, @Body() body: TestPassBody) {
    return this.progress.setTestPassed(u.id, courseId, body.passed)
  }
}
