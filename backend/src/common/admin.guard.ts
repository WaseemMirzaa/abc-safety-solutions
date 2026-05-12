import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const u = context.switchToHttp().getRequest().user as { role?: string } | undefined
    if (u?.role !== 'admin') throw new ForbiddenException('Admin only')
    return true
  }
}
