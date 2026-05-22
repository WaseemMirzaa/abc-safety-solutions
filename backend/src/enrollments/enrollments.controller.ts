import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsOptional, IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../common/current-user.decorator'
import { EnrollmentsService } from './enrollments.service'

class EnrollBody {
  @IsString()
  @MinLength(1)
  courseId: string

  @IsOptional()
  @IsString()
  promoCode?: string
}

@Controller('enrollments')
@UseGuards(AuthGuard('jwt'))
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Get('me')
  mine(@CurrentUser() u: { id: string }) {
    return this.enrollments.my(u.id)
  }

  @Post('enroll')
  enroll(@CurrentUser() u: { id: string }, @Body() body: EnrollBody) {
    return this.enrollments.enrollDirect(u.id, body.courseId)
  }

  @Post('enroll-discounted')
  enrollDiscounted(@CurrentUser() u: { id: string }, @Body() body: EnrollBody) {
    return this.enrollments.enrollDiscountedFree(u.id, body.courseId, body.promoCode)
  }
}
