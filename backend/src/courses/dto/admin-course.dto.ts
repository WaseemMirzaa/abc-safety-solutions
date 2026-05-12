import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator'

export class AdminCourseDto {
  @IsString()
  @MinLength(1)
  id: string

  @IsString()
  @MinLength(1)
  slug: string

  @IsString()
  @MinLength(1)
  title: string

  @IsString()
  summary: string

  @IsString()
  description: string

  @IsString()
  categoryId: string

  @IsInt()
  @Min(0)
  priceCents: number

  @IsInt()
  @Min(1)
  durationMinutes: number

  @IsInt()
  @Min(1)
  slideCount: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  certificateValidityDays?: number | null

  @IsString()
  imageUrl: string

  @IsBoolean()
  published: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  slideImageUrls?: string[]
}
