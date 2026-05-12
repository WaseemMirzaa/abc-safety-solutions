import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { ForgotPasswordDto, LoginDto, RegisterDto } from './dto/login.dto'
import { CurrentUser } from '../common/current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() u: { id: string }) {
    return this.auth.me(u.id)
  }

  /** Always 202 — email delivery not implemented yet (anti-enumeration friendly). */
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() _dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset()
  }
}
