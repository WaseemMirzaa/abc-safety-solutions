import { IsOptional, IsString, MinLength } from 'class-validator'

export class ValidatePromoDto {
  @IsString()
  @MinLength(2)
  code: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  courseId?: string
}
