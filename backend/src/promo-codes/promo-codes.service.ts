import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PromoCodeEntity } from '../entities/promo-code.entity'
import { clampDiscountPercent } from '../common/pricing.util'
import type { AdminPromoCodeDto } from './dto/admin-promo-code.dto'

export type PromoCodeDto = {
  id: string
  code: string
  description: string
  discountPercent: number
  active: boolean
  expiresAt: string | null
  maxUses: number | null
  useCount: number
  createdAt: string
}

export type PromoValidation = {
  valid: boolean
  code: string
  discountPercent: number
  message: string
}

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCodeEntity)
    private readonly promos: Repository<PromoCodeEntity>,
  ) {}

  normalizeCode(raw: string): string {
    return raw.trim().toUpperCase()
  }

  private map(row: PromoCodeEntity): PromoCodeDto {
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      discountPercent: row.discountPercent,
      active: row.active,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      maxUses: row.maxUses,
      useCount: row.useCount,
      createdAt: row.createdAt.toISOString(),
    }
  }

  async listAdmin(): Promise<PromoCodeDto[]> {
    const rows = await this.promos.find({ order: { createdAt: 'DESC' } })
    return rows.map((r) => this.map(r))
  }

  async upsert(dto: AdminPromoCodeDto): Promise<PromoCodeDto> {
    const code = this.normalizeCode(dto.code)
    const existingCode = await this.promos.findOne({ where: { code } })
    if (existingCode && existingCode.id !== dto.id) {
      throw new BadRequestException('Another promo code already uses this code.')
    }
    let row = await this.promos.findOne({ where: { id: dto.id } })
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Invalid expiration date.')
    }
    const patch = {
      code,
      description: dto.description?.trim() ?? '',
      discountPercent: clampDiscountPercent(dto.discountPercent),
      active: dto.active,
      expiresAt,
      maxUses: dto.maxUses ?? null,
    }
    if (row) {
      await this.promos.update({ id: dto.id }, patch)
      row = await this.promos.findOne({ where: { id: dto.id } })
    } else {
      row = await this.promos.save(
        this.promos.create({
          id: dto.id,
          useCount: 0,
          ...patch,
        }),
      )
    }
    if (!row) throw new NotFoundException()
    return this.map(row)
  }

  async remove(id: string) {
    await this.promos.delete({ id })
  }

  async validateForCheckout(codeRaw: string, _courseId?: string): Promise<PromoValidation> {
    const code = this.normalizeCode(codeRaw)
    const row = await this.promos.findOne({ where: { code } })
    if (!row) {
      return { valid: false, code, discountPercent: 0, message: 'Promo code not found.' }
    }
    if (!row.active) {
      return { valid: false, code, discountPercent: 0, message: 'This promo code is no longer active.' }
    }
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return { valid: false, code, discountPercent: 0, message: 'This promo code has expired.' }
    }
    if (row.maxUses != null && row.useCount >= row.maxUses) {
      return { valid: false, code, discountPercent: 0, message: 'This promo code has reached its usage limit.' }
    }
    return {
      valid: true,
      code: row.code,
      discountPercent: row.discountPercent,
      message: `${row.discountPercent}% off applied with code ${row.code}.`,
    }
  }

  async resolveForCheckout(codeRaw: string): Promise<PromoCodeEntity> {
    const v = await this.validateForCheckout(codeRaw)
    if (!v.valid) throw new BadRequestException(v.message)
    const row = await this.promos.findOne({ where: { code: v.code } })
    if (!row) throw new BadRequestException('Promo code not found.')
    return row
  }

  async recordRedemption(code: string) {
    const normalized = this.normalizeCode(code)
    const row = await this.promos.findOne({ where: { code: normalized } })
    if (!row) return
    row.useCount += 1
    await this.promos.save(row)
  }
}
