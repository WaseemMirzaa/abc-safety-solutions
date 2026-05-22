/** ID safe for upload jobs, drafts, etc. Works without HTTPS (crypto.randomUUID needs secure context). */
export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
