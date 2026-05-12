import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import { UsersService } from './users.service'
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator'

class CreateUserDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(1)
  name: string

  @IsIn(['learner', 'admin'])
  role: 'learner' | 'admin'

  @IsString()
  @MinLength(8)
  password: string
}

class DeleteUserDto {
  @IsEmail()
  email: string
}

@Controller('admin/directory')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.directory()
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.createUser(dto.email, dto.name, dto.role, dto.password)
  }

  @Post('remove')
  remove(@Body() dto: DeleteUserDto) {
    return this.users.removeByEmail(dto.email)
  }
}
