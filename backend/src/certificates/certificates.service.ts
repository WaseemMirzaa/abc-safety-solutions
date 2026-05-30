import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomInt, randomUUID } from 'node:crypto'
import { Repository } from 'typeorm'
import { CertificateEntity } from '../entities/certificate.entity'
import { UserEntity } from '../entities/user.entity'
import { CourseEntity } from '../entities/course.entity'
import { CategoryEntity } from '../entities/category.entity'
import { ProgressEntity } from '../entities/progress.entity'
import { CourseTestEntity } from '../entities/course-test.entity'
import { EnrollmentsService } from '../enrollments/enrollments.service'

const MIN_CERTIFICATE_NUMBER = 100_001
const MAX_CERTIFICATE_NUMBER = 9_999_999

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(CertificateEntity)
    private readonly certs: Repository<CertificateEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(ProgressEntity)
    private readonly progress: Repository<ProgressEntity>,
    @InjectRepository(CourseTestEntity)
    private readonly tests: Repository<CourseTestEntity>,
    private readonly enrollments: EnrollmentsService,
  ) {}

  async mine(userId: string) {
    const rows = await this.certs.find({ where: { userId }, order: { issuedAt: 'DESC' } })
    return Promise.all(rows.map((row) => this.enrichForDisplay(row)))
  }

  private isInvalidCertificationLine(text: string): boolean {
    const normalized = text.trim().toLowerCase()
    return (
      normalized === 'abc safety solutions' ||
      normalized === 'abc safety solutions, inc.' ||
      normalized.length < 15
    )
  }

  /** Resolve live user, course, and category fields for certificate display. */
  private async enrichForDisplay(cert: CertificateEntity): Promise<CertificateEntity> {
    const user = await this.users.findOne({ where: { id: cert.userId } })
    if (user?.name?.trim()) cert.userName = user.name.trim()

    if (cert.source === 'platform' && cert.courseId) {
      const course = await this.courses.findOne({ where: { id: cert.courseId } })
      if (course) {
        cert.courseName = course.title.trim() || cert.courseName
        cert.categoryId = course.categoryId
        const cat = await this.categories.findOne({ where: { id: course.categoryId } })
        if (cat) {
          const certText = cat.certificationText?.trim()
          if (certText && !this.isInvalidCertificationLine(certText)) {
            cert.certificationText = certText
          } else {
            cert.certificationText = cat.name?.trim() || null
          }
        }
      }
    }

    return cert
  }

  private async findByPublicId(idOrNumber: string): Promise<CertificateEntity | null> {
    const raw = idOrNumber.trim().replace(/^#/, '')
    if (!raw) return null
    if (/^\d+$/.test(raw)) {
      const byNumber = await this.certs.findOne({ where: { certificateNumber: parseInt(raw, 10) } })
      if (byNumber) return byNumber
    }
    return this.certs.findOne({ where: { id: raw } })
  }

  /** Random numeric ID in [#100001, #9999999]; retries if already in DB, then sequential fallback. */
  private async allocateCertificateNumber(): Promise<number> {
    for (let attempt = 0; attempt < 64; attempt++) {
      const n = randomInt(MIN_CERTIFICATE_NUMBER, MAX_CERTIFICATE_NUMBER + 1)
      const taken = await this.certs.exist({ where: { certificateNumber: n } })
      if (!taken) return n
    }
    const row = await this.certs
      .createQueryBuilder('c')
      .select('MAX(c.certificateNumber)', 'max')
      .getRawOne<{ max: string | number | null }>()
    const max = Number(row?.max ?? 0)
    const next = Math.max(MIN_CERTIFICATE_NUMBER, max + 1)
    if (next > MAX_CERTIFICATE_NUMBER) {
      throw new BadRequestException('Could not allocate certificate number')
    }
    const taken = await this.certs.exist({ where: { certificateNumber: next } })
    if (!taken) return next
    throw new BadRequestException('Could not allocate certificate number')
  }

  /** Public lookup by certificate number (#100001) or legacy UUID. */
  async verifyPublic(id: string) {
    const found = await this.findByPublicId(id)
    if (!found) throw new NotFoundException('Certificate not found')
    const cert = await this.enrichForDisplay(found)
    return {
      valid: true,
      certificateId: String(cert.certificateNumber),
      certificateNumber: cert.certificateNumber,
      courseName: cert.courseName,
      issuedTo: cert.userName,
      certificationText: cert.certificationText,
      categoryId: cert.categoryId,
      issuedAt: cert.issuedAt instanceof Date ? cert.issuedAt.toISOString() : String(cert.issuedAt),
      expiresAt: cert.expiresAt ? (cert.expiresAt instanceof Date ? cert.expiresAt.toISOString() : String(cert.expiresAt)) : null,
    }
  }

  private async hasPublishedTest(courseId: string) {
    const t = await this.tests.findOne({ where: { courseId, published: true } })
    return Boolean(t && t.questions?.length)
  }

  async issue(userId: string, courseId: string, userName: string) {
    await this.enrollments.assertEnrolled(userId, courseId)
    const prog = await this.progress.findOne({ where: { userId, courseId } })
    if (!prog?.completedSlides) throw new BadRequestException('Complete all slides first')
    const hasTest = await this.hasPublishedTest(courseId)
    if (hasTest && !prog.testPassed) throw new BadRequestException('Pass the knowledge check first')
    if (!hasTest && !prog.testPassed) throw new BadRequestException('Complete the knowledge check first')

    const existing = await this.certs.findOne({ where: { userId, courseId } })
    if (existing) return existing

    const course = await this.courses.findOne({ where: { id: courseId } })
    if (!course) throw new BadRequestException('Course missing')
    const cat = await this.categories.findOne({ where: { id: course.categoryId } })

    const issuedAt = new Date()
    let expiresAt: Date | null = null
    if (course.certificateValidityDays != null && course.certificateValidityDays > 0) {
      expiresAt = new Date(issuedAt)
      expiresAt.setUTCDate(expiresAt.getUTCDate() + course.certificateValidityDays)
    }

    const certificateNumber = await this.allocateCertificateNumber()
    const row = this.certs.create({
      id: randomUUID(),
      certificateNumber,
      userId,
      courseId,
      categoryId: course.categoryId,
      courseName: course.title,
      userName,
      certificationText: cat?.certificationText ?? null,
      issuedAt,
      expiresAt,
      source: 'platform',
    })
    return this.certs.save(row)
  }

  async createManual(
    userId: string,
    userName: string,
    body: { courseName: string; issuedAt?: string; expiresAt?: string | null; notes?: string; fileUrl?: string | null },
  ) {
    const name = body.courseName?.trim()
    if (!name) throw new BadRequestException('Course name is required')
    const issuedAt = body.issuedAt ? new Date(body.issuedAt) : new Date()
    let expiresAt: Date | null = null
    if (body.expiresAt) expiresAt = new Date(body.expiresAt)
    const certificateNumber = await this.allocateCertificateNumber()
    const row = this.certs.create({
      id: randomUUID(),
      certificateNumber,
      userId,
      courseId: null,
      categoryId: 'cat-ohs',
      courseName: name,
      userName,
      certificationText: null,
      issuedAt,
      expiresAt,
      source: 'manual',
      notes: body.notes?.trim() || null,
      fileUrl: body.fileUrl?.trim() || null,
    })
    return this.certs.save(row)
  }

  async updateManual(
    userId: string,
    certId: string,
    body: { courseName?: string; issuedAt?: string; expiresAt?: string | null; notes?: string; fileUrl?: string | null },
  ) {
    const row = await this.certs.findOne({ where: { id: certId, userId } })
    if (!row) throw new NotFoundException('Certificate not found')
    if (row.source !== 'manual') throw new BadRequestException('Only manually added certificates can be edited')
    if (body.courseName !== undefined) {
      const name = body.courseName.trim()
      if (!name) throw new BadRequestException('Course name is required')
      row.courseName = name
    }
    if (body.issuedAt !== undefined) row.issuedAt = new Date(body.issuedAt)
    if (body.expiresAt !== undefined) row.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (body.notes !== undefined) row.notes = body.notes.trim() || null
    if (body.fileUrl !== undefined) row.fileUrl = body.fileUrl?.trim() || null
    return this.certs.save(row)
  }

  /** Admin-only: correct stored certificate fields without changing the certificate number. */
  async adminPatch(
    certId: string,
    patch: {
      userName?: string
      courseName?: string
      categoryId?: string
      certificationText?: string | null
    },
  ) {
    const row = await this.certs.findOne({ where: { id: certId } })
    if (!row) throw new NotFoundException('Certificate not found')
    if (patch.userName !== undefined) row.userName = patch.userName.trim() || row.userName
    if (patch.courseName !== undefined) row.courseName = patch.courseName.trim() || row.courseName
    if (patch.categoryId !== undefined) row.categoryId = patch.categoryId.trim() || row.categoryId
    if (patch.certificationText !== undefined) row.certificationText = patch.certificationText?.trim() || null
    return this.certs.save(row)
  }

  async deleteManual(userId: string, certId: string) {
    const row = await this.certs.findOne({ where: { id: certId, userId } })
    if (!row) throw new NotFoundException('Certificate not found')
    if (row.source !== 'manual') {
      throw new BadRequestException('Only manually added certificates can be deleted')
    }
    await this.certs.delete({ id: certId })
    return { ok: true }
  }
}
