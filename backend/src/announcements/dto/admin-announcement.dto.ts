import { IsEnum, IsOptional, IsString } from 'class-validator'

export class AdminAnnouncementDto {
  @IsString()
  id: string

  @IsString()
  title: string

  @IsString()
  body: string

  @IsEnum(['draft', 'sent'])
  status: 'draft' | 'sent'

  @IsOptional()
  @IsString()
  sentAt?: string | null
}
