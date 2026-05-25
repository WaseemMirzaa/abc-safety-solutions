import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsOptional, IsString, MinLength } from 'class-validator'
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

  @Post('manual')
  createManual(
    @CurrentUser() u: { id: string; name: string },
    @Body() body: { courseName: string; issuedAt?: string; expiresAt?: string | null; notes?: string; fileUrl?: string | null },
  ) {
    return this.certs.createManual(u.id, u.name, body)
  }

  @Put('manual/:id')
  updateManual(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Body() body: { courseName?: string; issuedAt?: string; expiresAt?: string | null; notes?: string; fileUrl?: string | null },
  ) {
    return this.certs.updateManual(u.id, id, body)
  }

  @Delete('manual/:id')
  deleteManual(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.certs.deleteManual(u.id, id)
  }
}
