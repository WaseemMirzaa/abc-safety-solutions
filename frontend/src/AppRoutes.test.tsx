import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { localCache } from '@/lib/localCache'
import { AppRoutes } from '@/App'

function renderAt(path: string) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
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
    localCache.setUser(null)
  })

  it('sends guests from /admin to /login', async () => {
    renderAt('/admin')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /access your account/i })).toBeInTheDocument()
    })
  })

  it('sends learners from /admin to home', async () => {
    localCache.setUser({ email: 'l@test.local', name: 'Learner', role: 'learner' })
    renderAt('/admin')
    await waitFor(() => {
      expect(screen.getByText(/training\s*&\s*certification/i)).toBeInTheDocument()
    })
  })

  it('lets admins open /admin dashboard', async () => {
    localCache.setUser({ email: 'admin@demo.local', name: 'Admin', role: 'admin' })
    renderAt('/admin')
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^overview$/i })).toBeInTheDocument()
    })
  })

  it('lets admins open /admin/courses', async () => {
    localCache.setUser({ email: 'admin@demo.local', name: 'Admin', role: 'admin' })
    renderAt('/admin/courses')
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^courses$/i })).toBeInTheDocument()
    })
  })

  it('lets learners open /my-courses', async () => {
    localCache.setUser({ email: 'l@test.local', name: 'Learner', role: 'learner' })
    renderAt('/my-courses')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /my learning/i })).toBeInTheDocument()
    })
  })

  it('redirects unknown paths to home', async () => {
    renderAt('/this-route-does-not-exist-xyz')
    await waitFor(() => {
      expect(screen.getByText(/training\s*&\s*certification/i)).toBeInTheDocument()
    })
  })
})
