import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CourseLanguageEntity } from '../entities/course-language.entity'
import { LanguagesService } from './languages.service'
import { LanguagesController } from './languages.controller'
import { AdminLanguagesController } from './admin-languages.controller'

@Module({
  imports: [TypeOrmModule.forFeature([CourseLanguageEntity])],
  providers: [LanguagesService],
  controllers: [LanguagesController, AdminLanguagesController],
  exports: [LanguagesService],
})
export class LanguagesModule {}
