import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator'

export class AdminPromoCodeDto {
  @IsString()
  @MinLength(1)
  id: string

  @IsString()
  @MinLength(2)
  code: string

  @IsString()
  description: string

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  discountPercent: number

  @IsBoolean()
  active: boolean

  @IsOptional()
  @IsString()
  expiresAt?: string | null

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxUses?: number | null
}
