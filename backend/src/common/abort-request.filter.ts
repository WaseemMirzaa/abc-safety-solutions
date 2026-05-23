import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common'
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core'

function isClientAbort(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { message?: string; code?: string; name?: string }
  const msg = (e.message ?? '').toLowerCase()
  return (
    msg === 'request aborted' ||
    e.code === 'ECONNABORTED' ||
    e.name === 'AbortError' ||
    /aborted|client closed/i.test(msg)
  )
}

export function isClientAbortError(err: unknown): boolean {
  return isClientAbort(err)
}

/** Client disconnected — avoid ERROR logs and treating it as an API crash. */
@Catch()
export class AbortRequestFilter extends BaseExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(AbortRequestFilter.name)

  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter)
  }

  catch(exception: unknown, host: ArgumentsHost) {
    if (!isClientAbort(exception)) {
      super.catch(exception, host)
      return
    }
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<{ headersSent?: boolean; status: (n: number) => { end: () => void } }>()
    if (!res.headersSent) res.status(499).end()
    this.log.debug('Client closed connection before request finished')
  }
}
