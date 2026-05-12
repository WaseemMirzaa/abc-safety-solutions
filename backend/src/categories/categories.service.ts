import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CategoryEntity } from '../entities/category.entity'

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
  ) {}

  findAll() {
    return this.categories.find({ order: { name: 'ASC' } })
  }

  async findOne(id: string) {
    const c = await this.categories.findOne({ where: { id } })
    if (!c) throw new NotFoundException()
    return c
  }

  async update(id: string, patch: Partial<Pick<CategoryEntity, 'name' | 'slug' | 'certificationText'>>) {
    await this.categories.update({ id }, patch)
    return this.findOne(id)
  }

  async create(row: CategoryEntity) {
    return this.categories.save(row)
  }

  async remove(id: string) {
    await this.categories.delete({ id })
  }
}
