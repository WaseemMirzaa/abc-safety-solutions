import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CategoryEntity } from '../entities/category.entity'
import { CategoriesService } from './categories.service'
import { CategoriesController } from './categories.controller'
import { AdminCategoriesController } from './admin-categories.controller'

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity])],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
