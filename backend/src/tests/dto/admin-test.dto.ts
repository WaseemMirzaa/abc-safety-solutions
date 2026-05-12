import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator'

export class TestAnswerOptionDto {
  @IsString()
  id: string

  @IsString()
  label: string

  @IsBoolean()
  isCorrect: boolean
}

export class TestQuestionDto {
  @IsString()
  id: string

  @IsString()
  prompt: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestAnswerOptionDto)
  options: TestAnswerOptionDto[]
}

export class AdminTestDto {
  @IsString()
  id: string

  @IsString()
  courseId: string

  @IsString()
  title: string

  @IsInt()
  @Min(1)
  @Max(100)
  passPercent: number

  @IsBoolean()
  published: boolean

  @IsString()
  updatedAt: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestQuestionDto)
  questions: TestQuestionDto[]
}
