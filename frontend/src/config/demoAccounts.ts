/** Demo-only accounts for local prototype. Replace with NestJS JWT + roles later. */
export type DemoAccount = {
  email: string
  password: string
  name: string
  role: 'learner' | 'admin'
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    email: 'learner@demo.local',
    password: 'DemoLearner123!',
    name: 'Jamie Learner',
    role: 'learner',
  },
  {
    email: 'admin@demo.local',
    password: 'DemoAdmin123!',
    name: 'Alex Admin',
    role: 'admin',
  },
] as const

export const DEMO_LEARNER_EMAIL = DEMO_ACCOUNTS[0].email.toLowerCase()

export function findDemoAccount(email: string): DemoAccount | undefined {
  const e = email.trim().toLowerCase()
  return DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === e)
}

export function isReservedDemoEmail(email: string): boolean {
  return Boolean(findDemoAccount(email))
}
