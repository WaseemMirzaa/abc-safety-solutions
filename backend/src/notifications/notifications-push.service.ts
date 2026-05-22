import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DeviceTokenEntity } from '../entities/device-token.entity'

type FirebaseMessaging = import('firebase-admin/messaging').Messaging

@Injectable()
export class NotificationsPushService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsPushService.name)
  private messaging: FirebaseMessaging | null = null

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(DeviceTokenEntity)
    private readonly deviceTokens: Repository<DeviceTokenEntity>,
  ) {}

  async onModuleInit() {
    const projectId = this.config.get<string>('FCM_PROJECT_ID')
    const clientEmail = this.config.get<string>('FCM_CLIENT_EMAIL')
    const privateKey = this.config.get<string>('FCM_PRIVATE_KEY')?.replace(/\\n/g, '\n')
    if (!projectId || !clientEmail || !privateKey) {
      this.logger.log('FCM not configured — mobile push disabled until FCM_* env vars are set')
      return
    }
    try {
      const admin = await import('firebase-admin')
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
      }
      this.messaging = admin.messaging()
      this.logger.log('FCM initialized')
    } catch (err) {
      this.logger.warn(`FCM init failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  async sendToUser(userId: string, payload: { title: string; body: string }) {
    const tokens = await this.deviceTokens.find({ where: { userId } })
    if (!tokens.length) return

    if (!this.messaging) {
      this.logger.debug(`FCM skip (not initialized) — ${tokens.length} device(s) for user ${userId}`)
      return
    }

    const results = await Promise.allSettled(
      tokens.map((row) =>
        this.messaging!.send({
          token: row.token,
          notification: { title: payload.title, body: payload.body },
          data: { type: 'announcement' },
        }),
      ),
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      this.logger.warn(`FCM: ${failed}/${tokens.length} send(s) failed for user ${userId}`)
    }
  }
}
