import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/api/queryClient'
import { installReloadOnFailedLoad } from '@/lib/reloadOnFailedLoad'
import '@/i18n/config'

installReloadOnFailedLoad()
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationSocketProvider } from '@/contexts/NotificationSocketContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationSocketProvider>
          <App />
        </NotificationSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
