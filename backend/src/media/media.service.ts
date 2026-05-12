import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MediaAssetEntity } from '../entities/media-asset.entity'

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaAssetEntity)
    private readonly media: Repository<MediaAssetEntity>,
  ) {}

  list() {
    return this.media.find({ order: { createdAt: 'DESC' } })
  }

  save(row: Partial<MediaAssetEntity>) {
    return this.media.save(this.media.create(row))
  }

  delete(id: string) {
    return this.media.delete({ id })
  }
}
