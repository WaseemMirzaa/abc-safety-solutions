import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import type { CourseSlideType } from '../../common/course-slide.types'

class CourseSlideDto {
  @IsString()
  @MinLength(1)
  id: string

  @IsString()
  @IsIn(['image', 'pdf', 'video', 'pptx', 'ppt'])
  type: CourseSlideType

  @IsString()
  @MinLength(1)
  url: string

  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  deckSlideCount?: number
}

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

  @IsString()
  @MinLength(1)
  languageId: string

  @IsInt()
  @Min(0)
  priceCents: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  discountPercent?: number

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

  @IsBoolean()
  popular: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  slideImageUrls?: string[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseSlideDto)
  slides?: CourseSlideDto[]
}
