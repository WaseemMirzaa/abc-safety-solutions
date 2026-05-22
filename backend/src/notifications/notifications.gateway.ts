import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name)

  @WebSocketServer()
  server!: Server

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        ''
      if (!token) {
        client.disconnect()
        return
      }
      const payload = this.jwt.verify<{ sub: string }>(token)
      const userId = payload.sub
      client.join(this.roomFor(userId))
      ;(client.data as { userId?: string }).userId = userId
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(_client: Socket) {
    /* rooms cleaned automatically */
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { t: Date.now() })
  }

  emitToUser(
    userId: string,
    notification: {
      id: string
      title: string
      body: string
      type: string
      read: boolean
      createdAt: string
    },
  ) {
    this.server.to(this.roomFor(userId)).emit('notification', notification)
  }

  private roomFor(userId: string) {
    return `user:${userId}`
  }
}
