import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserEntity } from '../entities/user.entity'
import { EnrollmentEntity } from '../entities/enrollment.entity'
import { CertificateEntity } from '../entities/certificate.entity'
import { TestAttemptEntity } from '../entities/test-attempt.entity'
import { CourseEntity } from '../entities/course.entity'
import { OrdersService } from '../orders/orders.service'

@Injectable()
export class AdminUserInsightsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
    @InjectRepository(CertificateEntity)
    private readonly certs: Repository<CertificateEntity>,
    @InjectRepository(TestAttemptEntity)
    private readonly testAttempts: Repository<TestAttemptEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    private readonly orders: OrdersService,
  ) {}

  async listDirectory(q?: string, certificateCourse?: string) {
    const users = await this.users.find({ order: { email: 'ASC' } })
    const certFilter = certificateCourse?.trim().toLowerCase()
    let filtered = users
    if (certFilter) {
      const certs = await this.certs
        .createQueryBuilder('c')
        .where('LOWER(c.courseName) LIKE :pat', { pat: `%${certFilter}%` })
        .getMany()
      const userIds = new Set(certs.map((c) => c.userId))
      filtered = users.filter((u) => userIds.has(u.id))
    }
    const needle = q?.trim().toLowerCase()
    if (needle) {
      filtered = filtered.filter(
        (u) => u.email.toLowerCase().includes(needle) || u.name.toLowerCase().includes(needle),
      )
    }
    const summaries = await Promise.all(
      filtered.map(async (u) => {
        const failCount = await this.testAttempts.count({
          where: { userId: u.id, passed: false },
        })
        const certCount = await this.certs.count({ where: { userId: u.id } })
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          protected: u.role === 'admin',
          testFailCount: failCount,
          certificateCount: certCount,
        }
      }),
    )
    return summaries
  }

  async userDetail(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')
    const enrollments = await this.enrollments.find({
      where: { userId },
      order: { purchasedAt: 'DESC' },
    })
    const courses = await this.courses.find()
    const byCourse = new Map(courses.map((c) => [c.id, c.title]))
    const orders = await this.orders.listForUser(userId)
    const attempts = await this.testAttempts.find({
      where: { userId },
      order: { submittedAt: 'DESC' },
    })
    const certificates = await this.certs.find({
      where: { userId },
      order: { issuedAt: 'DESC' },
    })
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      enrollments: enrollments.map((e) => ({
        id: e.id,
        courseId: e.courseId,
        courseTitle: byCourse.get(e.courseId) ?? e.courseId,
        orderId: e.orderId,
        purchasedAt: e.purchasedAt.toISOString(),
        refunded: e.refunded,
        testAttemptsRemaining: e.testAttemptsRemaining ?? 3,
        attemptsExhausted: Boolean(e.attemptsExhausted),
      })),
      orders,
      testAttempts: attempts.map((a) => ({
        id: a.id,
        courseId: a.courseId,
        courseTitle: byCourse.get(a.courseId) ?? a.courseId,
        enrollmentId: a.enrollmentId,
        attemptNumber: a.attemptNumber,
        scorePercent: a.scorePercent,
        passPercent: a.passPercent,
        passed: a.passed,
        timedOut: a.timedOut,
        submittedAt: a.submittedAt.toISOString(),
      })),
      testFailCount: attempts.filter((a) => !a.passed).length,
      certificates: certificates.map((c) => ({
        id: c.id,
        certificateNumber: c.certificateNumber,
        courseId: c.courseId ?? null,
        courseName: c.courseName,
        source: c.source ?? 'platform',
        issuedAt: c.issuedAt instanceof Date ? c.issuedAt.toISOString() : String(c.issuedAt),
        expiresAt: c.expiresAt
          ? c.expiresAt instanceof Date
            ? c.expiresAt.toISOString()
            : String(c.expiresAt)
          : null,
      })),
    }
  }
}
