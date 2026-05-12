import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../common/current-user.decorator'
import { CertificatesService } from './certificates.service'

class IssueDto {
  @IsString()
  @MinLength(1)
  courseId: string
}

@Controller('certificates')
@UseGuards(AuthGuard('jwt'))
export class CertificatesController {
  constructor(private readonly certs: CertificatesService) {}

  @Get('me')
  mine(@CurrentUser() u: { id: string }) {
    return this.certs.mine(u.id)
  }

  @Post('issue')
  issue(@CurrentUser() u: { id: string; name: string }, @Body() body: IssueDto) {
    return this.certs.issue(u.id, body.courseId, u.name)
  }
}
