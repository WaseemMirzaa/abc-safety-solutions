import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserEntity } from '../entities/user.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  directory() {
    return this.users
      .find({ order: { email: 'ASC' } })
      .then((list) => list.map((u) => ({ email: u.email, name: u.name, role: u.role })))
  }

  async createUser(email: string, name: string, role: 'learner' | 'admin', password: string) {
    const bcryptMod = await import('bcrypt')
    const passwordHash = await bcryptMod.hash(password, 12)
    const { randomUUID } = await import('node:crypto')
    const row = this.users.create({
      id: randomUUID(),
      email: email.toLowerCase(),
      name,
      role,
      passwordHash,
    })
    return this.users.save(row)
  }

  async removeByEmail(email: string) {
    const e = email.toLowerCase()
    await this.users.delete({ email: e })
    return { ok: true }
  }
}
