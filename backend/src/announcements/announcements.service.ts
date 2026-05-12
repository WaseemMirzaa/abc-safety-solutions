import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AnnouncementEntity } from '../entities/announcement.entity'

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(AnnouncementEntity)
    private readonly repo: Repository<AnnouncementEntity>,
  ) {}

  list() {
    return this.repo.find({ order: { createdAt: 'DESC' } })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  save(row: any) {
    return this.repo.save(this.repo.create(row as Partial<AnnouncementEntity>))
  }

  delete(id: string) {
    return this.repo.delete({ id })
  }
}
