import { Controller, Get, Param } from '@nestjs/common'
import { CertificatesService } from './certificates.service'

/** Public routes under `/api/certificates` (no JWT). */
@Controller('certificates')
export class PublicCertificatesController {
  constructor(private readonly certs: CertificatesService) {}

  @Get('verify/:id')
  verify(@Param('id') id: string) {
    return this.certs.verifyPublic(id)
  }
}
