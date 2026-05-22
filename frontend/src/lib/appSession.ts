import { getToken } from '@/api/client'
import { clearPendingCourseUpload, clearPendingMediaUpload, resetAdminUploadJobs } from '@/lib/adminUploadJobs'
import { notifySessionCleared, resetAppSessionCache } from '@/lib/sessionReset'

export { registerSessionClearedHandler } from '@/lib/sessionReset'
export { resetAppSessionCache } from '@/lib/sessionReset'

export function clearAuthenticatedSession(options?: { redirectHome?: boolean }) {
  const hadToken = Boolean(getToken())
  resetAppSessionCache()
  clearPendingCourseUpload()
  clearPendingMediaUpload()
  resetAdminUploadJobs()
  notifySessionCleared()
  const redirect = options?.redirectHome ?? true
  if (redirect && hadToken && typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
    window.location.assign('/')
  }
}
