import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(1)
  password: string

  @IsOptional()
  @IsString()
  name?: string
}

export class RegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsString()
  @MinLength(1)
  name: string
}

export class PatchMeDto {
  @IsString()
  @MinLength(1)
  name: string
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string
}
