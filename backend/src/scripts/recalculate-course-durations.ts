import 'reflect-metadata'
import * as fs from 'fs'
import * as path from 'path'
import { DataSource } from 'typeorm'
import { recalculateAllCourseDurations } from '../common/recalculate-course-durations'
import { CourseEntity } from '../entities/course.entity'

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

  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'abc',
    password: process.env.DB_PASSWORD || 'abc_secret',
    database: process.env.DB_NAME || 'abc_portal',
    entities: [CourseEntity],
    synchronize: false,
    logging: false,
  })

  await ds.initialize()
  const result = await recalculateAllCourseDurations(ds, true)
  await ds.destroy()

  console.log(
    `Done. Scanned ${result.scanned} course(s), updated ${result.updated} (${result.dwellSecPerPage}s per page/image).`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
