import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ScrollToTop } from '@/components/ScrollToTop'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { useAuth } from '@/contexts/AuthContext'
import { PageLoader } from '@/components/ui/PageLoader'
import { HomePage } from '@/pages/HomePage'
import { CoursesPage } from '@/pages/CoursesPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { MyCoursesPage } from '@/pages/MyCoursesPage'
import { LearnPage } from '@/pages/LearnPage'
import { CertificatesPage } from '@/pages/CertificatesPage'
import { CertificateViewPage } from '@/pages/CertificateViewPage'
import { AccountPage } from '@/pages/AccountPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { CheckoutSuccessPage } from '@/pages/CheckoutSuccessPage'
import { VerifyCertificatePage } from '@/pages/VerifyCertificatePage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminCoursesPage } from '@/pages/admin/AdminCoursesPage'
import { AdminTestsPage } from '@/pages/admin/AdminTestsPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'
import { AdminAnnouncementsPage } from '@/pages/admin/AdminAnnouncementsPage'
import { AdminMediaPage } from '@/pages/admin/AdminMediaPage'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'

function SessionGate({ children }: { children: React.ReactNode }) {
  const { ready } = useAuth()
  if (!ready) return <PageLoader minHeight="min-h-svh" message="Loading…" />
  return <>{children}</>
}

/** Router content only — wrap with `BrowserRouter` (app) or `MemoryRouter` (tests). */
export function AppRoutes() {
  return (
    <SessionGate>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:slug" element={<CourseDetailPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="my-courses" element={<MyCoursesPage />} />
          <Route path="learn/:courseId" element={<LearnPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="certificates/:certificateId" element={<CertificateViewPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="verify-certificate" element={<VerifyCertificatePage />} />
        </Route>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="tests" element={<AdminTestsPage />} />
          <Route path="media" element={<AdminMediaPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="announcements" element={<AdminAnnouncementsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionGate>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
