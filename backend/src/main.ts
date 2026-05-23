import { HttpAdapterHost, NestFactory } from '@nestjs/core'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common'
import { AbortRequestFilter, isClientAbortError } from './common/abort-request.filter'
import { AppModule } from './app.module'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import * as express from 'express'

async function bootstrap() {
  const bootLog = new Logger('Bootstrap')
  const uploadDir = join(process.cwd(), (process.env.UPLOAD_DIR ?? './uploads').replace(/^\.\//, ''))
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })

  const app = await NestFactory.create(AppModule, { rawBody: true })
  app.useWebSocketAdapter(new IoAdapter(app))
  const http = app.getHttpAdapter().getInstance()
  http.use('/uploads', express.static(uploadDir))
  // Multer fileFilter errors are plain Error — return 400 JSON so the admin UI can show them
  http.use(
    (
      err: Error & { status?: number },
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (isClientAbortError(err)) {
        if (!res.headersSent) res.status(499).end()
        return
      }
      if (err?.message && !err.status && !res.headersSent) {
        const msg = err.message
        if (
          /allowed types|images only|file exceeds|too large/i.test(msg) ||
          msg.startsWith('Allowed')
        ) {
          bootLog.warn(`Upload rejected ${req.method} ${req.url}: ${msg}`)
          const body = new BadRequestException(msg).getResponse()
          return res.status(400).json(body)
        }
      }
      next(err)
    },
  )
  app.setGlobalPrefix('api')
  app.useGlobalFilters(new AbortRequestFilter(app.get(HttpAdapterHost)))
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
