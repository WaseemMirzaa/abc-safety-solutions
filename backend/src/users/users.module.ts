import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from '../entities/user.entity'
import { UsersService } from './users.service'
import { AdminUsersController } from './admin-users.controller'

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [AdminUsersController],
  providers: [UsersService],
})
export class UsersModule {}
