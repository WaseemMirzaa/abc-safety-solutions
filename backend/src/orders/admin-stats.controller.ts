import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AdminGuard } from '../common/admin.guard'
import { EnrollmentEntity } from '../entities/enrollment.entity'
import { CertificateEntity } from '../entities/certificate.entity'

@Controller('admin/stats')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminStatsController {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
    @InjectRepository(CertificateEntity)
    private readonly certificates: Repository<CertificateEntity>,
  ) {}

  @Get()
  async summary() {
    const [enrollments, certificatesIssued] = await Promise.all([
      this.enrollments.count(),
      this.certificates.count(),
    ])
    return { enrollments, certificatesIssued }
  }
}
