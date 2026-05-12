import 'reflect-metadata'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'
import { UserEntity } from '../entities/user.entity'

/** Load backend/.env into process.env when not already set (same keys as Nest). */
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

async function main() {
  loadEnvFile()

  const emailArg = process.argv[2]
  const nameArg = process.argv[3]
  const passArg = process.argv[4]

  const email = (process.env.ADMIN_EMAIL || emailArg || 'studio.admin@local.test').trim().toLowerCase()
  const name = (process.env.ADMIN_NAME || nameArg || 'Studio Admin').trim()
  const password = process.env.ADMIN_PASSWORD || passArg || 'StudioAdmin123!'

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'abc',
    password: process.env.DB_PASSWORD || 'abc_secret',
    database: process.env.DB_NAME || 'abc_portal',
    entities: [UserEntity],
    synchronize: false,
    logging: false,
  })

  await ds.initialize()
  const users = ds.getRepository(UserEntity)
  const passwordHash = await bcrypt.hash(password, 12)

  const existing = await users.findOne({ where: { email } })
  if (existing) {
    existing.name = name
    existing.role = 'admin'
    existing.passwordHash = passwordHash
    await users.save(existing)
    console.log(`Updated existing account to admin: ${email}`)
  } else {
    await users.save(
      users.create({
        id: randomUUID(),
        email,
        name,
        role: 'admin',
        passwordHash,
      }),
    )
    console.log(`Created admin user: ${email}`)
  }

  await ds.destroy()
  console.log(`Name: ${name}`)
  console.log('Sign in at the app login with the email and password above.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
