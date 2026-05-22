import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { Repository } from 'typeorm'
import { NotificationEntity } from '../entities/notification.entity'
import { DeviceTokenEntity } from '../entities/device-token.entity'
import { UserEntity } from '../entities/user.entity'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationsPushService } from './notifications-push.service'

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
    @InjectRepository(DeviceTokenEntity)
    private readonly deviceTokens: Repository<DeviceTokenEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly gateway: NotificationsGateway,
    private readonly push: NotificationsPushService,
  ) {}

  async listForUser(userId: string) {
    return this.notifications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    })
  }

  async markRead(userId: string, id: string) {
    const row = await this.notifications.findOne({ where: { id, userId } })
    if (!row) return { ok: false }
    row.read = true
    await this.notifications.save(row)
    return { ok: true }
  }

  async markAllRead(userId: string) {
    await this.notifications.update({ userId, read: false }, { read: true })
    return { ok: true }
  }

  async registerDevice(userId: string, platform: 'web' | 'android' | 'ios', token: string) {
    const existing = await this.deviceTokens.findOne({ where: { userId, token } })
    if (existing) return existing
    const row = this.deviceTokens.create({
      id: randomUUID(),
      userId,
      platform,
      token,
    })
    return this.deviceTokens.save(row)
  }

  async notifyUser(userId: string, title: string, body: string, type = 'announcement') {
    const row = this.notifications.create({
      id: randomUUID(),
      userId,
      title,
      body,
      type,
      read: false,
    })
    const saved = await this.notifications.save(row)
    const payload = {
      id: saved.id,
      title: saved.title,
      body: saved.body,
      type: saved.type,
      read: saved.read,
      createdAt: saved.createdAt.toISOString(),
    }
    this.gateway.emitToUser(userId, payload)
    await this.push.sendToUser(userId, { title, body })
    return saved
  }

  async broadcast(title: string, body: string, type = 'announcement') {
    const learners = await this.users.find({ where: { role: 'learner' } })
    for (const u of learners) {
      await this.notifyUser(u.id, title, body, type)
    }
    return { sent: learners.length }
  }
}
