import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MediaAssetEntity } from '../entities/media-asset.entity'
import { MediaService } from './media.service'
import { AdminMediaController } from './admin-media.controller'

@Module({
  imports: [TypeOrmModule.forFeature([MediaAssetEntity])],
  controllers: [AdminMediaController],
  providers: [MediaService],
})
export class MediaModule {}
