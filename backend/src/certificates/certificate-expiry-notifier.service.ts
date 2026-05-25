import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, Repository } from 'typeorm'
import { CertificateEntity } from '../entities/certificate.entity'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class CertificateExpiryNotifierService {
  private readonly logger = new Logger(CertificateExpiryNotifierService.name)

  constructor(
    @InjectRepository(CertificateEntity)
    private readonly certs: Repository<CertificateEntity>,
    private readonly notificationsSvc: NotificationsService,
  ) {}

  @Cron('0 9 * * *')
  async notifyExpiringCerts() {
    for (const days of [2, 1]) {
      await this.processDay(days)
    }
  }

  private async processDay(days: number) {
    const now = new Date()
    const targetDay = new Date(now)
    targetDay.setDate(now.getDate() + days)

    const start = new Date(targetDay)
    start.setHours(0, 0, 0, 0)
    const end = new Date(targetDay)
    end.setHours(23, 59, 59, 999)

    const expiring = await this.certs.find({
      where: { expiresAt: Between(start, end) },
    })

    for (const cert of expiring) {
      const typeKey = `cert_expiry_${cert.id}_${days}`
      const existing = await this.notificationsSvc.findByType(cert.userId, typeKey)
      if (existing) continue

      const label = days === 1 ? 'tomorrow' : 'in 2 days'
      await this.notificationsSvc.notifyUser(
        cert.userId,
        'Certificate expiring soon',
        `Your certificate for "${cert.courseName}" expires ${label}. Renew it to stay compliant.`,
        typeKey,
      )
      this.logger.log(`Sent expiry notice (${days}d) to user ${cert.userId} for cert ${cert.id}`)
    }
  }
}
