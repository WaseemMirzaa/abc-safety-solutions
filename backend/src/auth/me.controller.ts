import { Body, Controller, Patch, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { PatchMeDto } from './dto/login.dto'
import { CurrentUser } from '../common/current-user.decorator'

@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @Patch()
  patchProfile(@CurrentUser() u: { id: string }, @Body() dto: PatchMeDto) {
    return this.auth.updateProfile(u.id, dto.name)
  }
}
