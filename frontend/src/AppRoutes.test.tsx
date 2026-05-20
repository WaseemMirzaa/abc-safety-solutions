import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppRoutes } from '@/App'
import type { UserSession } from '@/types'

function renderAt(path: string, initialSession?: { user: UserSession; accessToken?: string }) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider initialSession={initialSession}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('route guards and public paths', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('sends guests from /admin to /login', async () => {
    renderAt('/admin')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /access your account/i })).toBeInTheDocument()
    })
  })

  it('sends learners from /admin to home', async () => {
    renderAt('/admin', { user: { email: 'l@test.local', name: 'Learner', role: 'learner' } })
    await waitFor(() => {
      expect(screen.getByText(/training\s*&\s*certificates/i)).toBeInTheDocument()
    })
  })

  it('lets admins open /admin dashboard', async () => {
    renderAt('/admin', { user: { email: 'admin@example.com', name: 'Admin', role: 'admin' } })
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^overview$/i })).toBeInTheDocument()
    })
  })

  it('lets admins open /admin/courses', async () => {
    renderAt('/admin/courses', { user: { email: 'admin@example.com', name: 'Admin', role: 'admin' } })
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^courses$/i })).toBeInTheDocument()
    })
  })

  it('lets learners open /my-courses', async () => {
    renderAt('/my-courses', { user: { email: 'l@test.local', name: 'Learner', role: 'learner' } })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /my learning/i })).toBeInTheDocument()
    })
  })

  it('redirects unknown paths to home', async () => {
    renderAt('/this-route-does-not-exist-xyz')
    await waitFor(() => {
      expect(screen.getByText(/training\s*&\s*certificates/i)).toBeInTheDocument()
    })
  })
})
