import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import { CategoriesService } from './categories.service'
import { IsOptional, IsString, MinLength } from 'class-validator'

class PatchCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  slug?: string

  @IsOptional()
  @IsString()
  certificationText?: string
}

class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  id: string

  @IsString()
  name: string

  @IsString()
  slug: string

  @IsString()
  certificationText: string
}

@Controller('admin/categories')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.findAll()
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create({
      id: dto.id,
      name: dto.name,
      slug: dto.slug,
      parentId: null,
      certificationText: dto.certificationText,
    } as any)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: PatchCategoryDto) {
    return this.categories.update(id, dto)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.categories.remove(id)
    return { ok: true }
  }
}
