import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'
import { UserEntity } from '../entities/user.entity'
import { randomUUID } from 'node:crypto'
import { LoginDto, RegisterDto } from './dto/login.dto'
import { JwtPayload } from './jwt.strategy'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase()
    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException('Email already registered')
    }
    const passwordHash = await bcrypt.hash(dto.password, 12)
    const u = this.users.create({
      id: randomUUID(),
      email,
      name: dto.name.trim(),
      passwordHash,
      role: 'learner',
    })
    await this.users.save(u)
    return this.issueTokens(u)
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase()
    const user = await this.users.findOne({ where: { email } })
    if (!user) throw new UnauthorizedException('Invalid credentials')
    const ok = await bcrypt.compare(dto.password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('Invalid credentials')
    return this.issueTokens(user)
  }

  private issueTokens(user: UserEntity) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
    const accessToken = this.jwt.sign(payload)
    return {
      accessToken,
      user: { email: user.email, name: user.name, role: user.role },
    }
  }

  async me(userId: string) {
    const u = await this.users.findOne({ where: { id: userId } })
    if (!u) throw new UnauthorizedException()
    return { email: u.email, name: u.name, role: u.role }
  }

  async updateProfile(userId: string, name: string) {
    const u = await this.users.findOne({ where: { id: userId } })
    if (!u) throw new UnauthorizedException()
    u.name = name.trim()
    await this.users.save(u)
    return { email: u.email, name: u.name, role: u.role }
  }

  /** Placeholder until transactional email + tokens exist. */
  requestPasswordReset() {
    return { accepted: true }
  }
}
