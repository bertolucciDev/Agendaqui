import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { useAuth } from '@/app/providers/auth'
import { lazy, Suspense } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'

const HomePage = lazy(() => import('@/pages/home'))
const LoginPage = lazy(() => import('@/pages/login'))
const RegisterPage = lazy(() => import('@/pages/register'))
const DashboardPage = lazy(() => import('@/pages/dashboard'))
const BusinessesPage = lazy(() => import('@/pages/businesses'))
const BusinessNewPage = lazy(() => import('@/pages/businesses.new'))
const LocationsPage = lazy(() => import('@/pages/locations'))
const LocationNewPage = lazy(() => import('@/pages/locations.new'))
const ServicesPage = lazy(() => import('@/pages/services'))
const ServiceNewPage = lazy(() => import('@/pages/services.new'))
const StaffPage = lazy(() => import('@/pages/staff'))
const StaffNewPage = lazy(() => import('@/pages/staff.new'))
const AppointmentsPage = lazy(() => import('@/pages/appointments'))
const AppointmentNewPage = lazy(() => import('@/pages/appointments.new'))
const VerifyEmailPage = lazy(() => import('@/pages/verify-email'))
const ForgotPasswordPage = lazy(() => import('@/pages/forgot-password'))
const SettingsPage = lazy(() => import('@/pages/settings'))
const BookingPage = lazy(() => import('@/pages/booking'))
const OnboardingPage = lazy(() => import('@/pages/onboarding'))

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isEmailVerified, isLoading } = useAuth()

  if (isLoading) return <LoadingFallback />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isEmailVerified) return <Navigate to="/verify-email" replace />

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isEmailVerified, isLoading } = useAuth()

  if (isLoading) return <LoadingFallback />
  if (isAuthenticated && isEmailVerified) return <Navigate to="/dashboard" replace />
  if (isAuthenticated && !isEmailVerified) return <Navigate to="/verify-email" replace />

  return <>{children}</>
}

export default function App() {
  return (
    <AppProviders>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/businesses" element={<BusinessesPage />} />
            <Route path="/businesses/new" element={<BusinessNewPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/locations/new" element={<LocationNewPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/services/new" element={<ServiceNewPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/staff/new" element={<StaffNewPage />} />
            <Route path="/appointments/new" element={<AppointmentNewPage />} />
            <Route path="/appointments/*" element={<AppointmentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Route>

          <Route path="/book/:slug" element={<BookingPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppProviders>
  )
}
