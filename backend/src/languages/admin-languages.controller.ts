import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsOptional, IsString, MinLength } from 'class-validator'
import { AdminGuard } from '../common/admin.guard'
import { LanguagesService } from './languages.service'

class CreateLanguageDto {
  @IsString()
  @MinLength(1)
  name: string

  @IsOptional()
  @IsString()
  code?: string
}

@Controller('admin/languages')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminLanguagesController {
  constructor(private readonly languages: LanguagesService) {}

  @Post()
  create(@Body() body: CreateLanguageDto) {
    return this.languages.create(body)
  }
}
