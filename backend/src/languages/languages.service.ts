import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { Repository } from 'typeorm'
import { CourseLanguageEntity } from '../entities/course-language.entity'

export const DEFAULT_LANGUAGE_ID = 'lang-en'

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(CourseLanguageEntity)
    private readonly languages: Repository<CourseLanguageEntity>,
  ) {}

  findAll() {
    return this.languages.find({ order: { name: 'ASC' } })
  }

  async findOne(id: string) {
    const row = await this.languages.findOne({ where: { id } })
    if (!row) throw new BadRequestException('Language not found')
    return row
  }

  async ensureDefaultEnglish() {
    const exists = await this.languages.findOne({ where: { id: DEFAULT_LANGUAGE_ID } })
    if (exists) return exists
    return this.languages.save(
      this.languages.create({ id: DEFAULT_LANGUAGE_ID, code: 'en', name: 'English' }),
    )
  }

  private normalizeCode(raw: string): string {
    const code = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 16)
    if (!code) throw new BadRequestException('Language code is required')
    return code
  }

  async create(params: { name: string; code?: string }) {
    const name = params.name?.trim()
    if (!name) throw new BadRequestException('Language name is required')
    const code = this.normalizeCode(params.code?.trim() || name)
    const taken = await this.languages.findOne({ where: { code } })
    if (taken) throw new ConflictException(`Language code "${code}" is already in use`)
    const row = this.languages.create({
      id: `lang-${randomUUID()}`,
      code,
      name,
    })
    return this.languages.save(row)
  }
}
