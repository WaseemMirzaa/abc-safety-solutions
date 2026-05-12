import { IsEnum, IsOptional, IsString } from 'class-validator'

export class AdminMediaDto {
  @IsString()
  id: string

  @IsString()
  label: string

  @IsString()
  url: string

  @IsEnum(['image', 'audio', 'document', 'other'])
  kind: 'image' | 'audio' | 'document' | 'other'

  @IsOptional()
  @IsEnum(['url', 'upload'])
  source?: 'url' | 'upload'

  @IsOptional()
  @IsString()
  fileName?: string | null
}
