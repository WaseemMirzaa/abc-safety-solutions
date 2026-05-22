import { useEffect, useState } from 'react'
import {
  getAdminUploadJob,
  hasActiveAdminUploads,
  subscribeAdminUploadJobs,
  type AdminUploadJob,
} from '@/lib/adminUploadJobs'

/** Sync UI to a background upload job (survives tab blur and route changes). */
export function useAdminUploadJob(jobId: string | null): AdminUploadJob | undefined {
  const [, bump] = useState(0)
  useEffect(() => {
    if (!jobId) return
    return subscribeAdminUploadJobs(() => bump((n) => n + 1))
  }, [jobId])
  return jobId ? getAdminUploadJob(jobId) : undefined
}

export function useAdminUploadsActive(): boolean {
  const [, bump] = useState(0)
  useEffect(() => subscribeAdminUploadJobs(() => bump((n) => n + 1)), [])
  return hasActiveAdminUploads()
}
