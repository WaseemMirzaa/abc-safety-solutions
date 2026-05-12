import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import * as express from 'express'

async function bootstrap() {
  const uploadDir = join(process.cwd(), (process.env.UPLOAD_DIR ?? './uploads').replace(/^\.\//, ''))
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })

  const app = await NestFactory.create(AppModule, { rawBody: true })
  app.getHttpAdapter().getInstance().use('/uploads', express.static(uploadDir))
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
  const port = Number(process.env.PORT) || 3000
  await app.listen(port)
  console.log(`API http://localhost:${port}/api`)
}

bootstrap()
