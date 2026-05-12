import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { Repository } from 'typeorm'
import { CertificateEntity } from '../entities/certificate.entity'
import { CourseEntity } from '../entities/course.entity'
import { CategoryEntity } from '../entities/category.entity'
import { ProgressEntity } from '../entities/progress.entity'
import { CourseTestEntity } from '../entities/course-test.entity'
import { EnrollmentsService } from '../enrollments/enrollments.service'

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(CertificateEntity)
    private readonly certs: Repository<CertificateEntity>,
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
    return this.certs.find({ where: { userId }, order: { issuedAt: 'DESC' } })
  }

  /** Public lookup by opaque certificate id (UUID). */
  async verifyPublic(id: string) {
    const cert = await this.certs.findOne({ where: { id } })
    if (!cert) throw new NotFoundException('Certificate not found')
    return {
      valid: true,
      certificateId: cert.id,
      courseName: cert.courseName,
      issuedTo: cert.userName,
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

    const row = this.certs.create({
      id: randomUUID(),
      userId,
      courseId,
      categoryId: course.categoryId,
      courseName: course.title,
      userName,
      certificationText: cat?.certificationText ?? null,
      issuedAt,
      expiresAt,
    })
    return this.certs.save(row)
  }
}
