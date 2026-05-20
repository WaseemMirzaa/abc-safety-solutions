import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsBoolean, IsObject, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { CurrentUser } from '../common/current-user.decorator'
import { EnrollmentsService } from '../enrollments/enrollments.service'
import { TestsService } from './tests.service'

class SubmitDto {
  @IsObject()
  answers: Record<string, string>
}

class NoTestPassDto {
  @IsBoolean()
  @Type(() => Boolean)
  passed: boolean
}

@Controller('tests')
@UseGuards(AuthGuard('jwt'))
export class TestsController {
  constructor(
    private readonly tests: TestsService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  @Get('course/:courseId/published')
  async published(@CurrentUser() u: { id: string }, @Param('courseId') courseId: string) {
    await this.enrollments.assertEnrolled(u.id, courseId)
    return this.tests.publishedForCourse(courseId)
  }

  @Post('course/:courseId/submit')
  async submit(
    @CurrentUser() u: { id: string },
    @Param('courseId') courseId: string,
    @Body() body: SubmitDto,
  ) {
    await this.enrollments.assertEnrolled(u.id, courseId)
    return this.tests.submit(u.id, courseId, body.answers ?? {})
  }

  @Post('course/:courseId/no-test-submit')
  async noTest(@CurrentUser() u: { id: string }, @Param('courseId') courseId: string, @Body() body: NoTestPassDto) {
    await this.enrollments.assertEnrolled(u.id, courseId)
    return this.tests.submitNoTestPass(u.id, courseId, body.passed)
  }
}
