import { Controller, Get } from '@nestjs/common'
import { LanguagesService } from './languages.service'

@Controller('languages')
export class LanguagesController {
  constructor(private readonly languages: LanguagesService) {}

  @Get()
  list() {
    return this.languages.findAll()
  }
}
