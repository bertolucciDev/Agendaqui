import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { useAuth } from '@/app/providers/auth'
import { useSession } from '@/app/providers/session'
import { lazy, Suspense } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { WorkspaceGate } from '@/components/layout/workspace-gate'
import { FirstBusinessGuard } from '@/components/layout/first-business-guard'
import AdminGuard from '@/components/layout/admin-guard'
import AdminLayout from '@/components/layout/admin-layout'
import SupportGuard from '@/components/layout/support-guard'
import SupportLayout from '@/components/layout/support-layout'

const HomePage = lazy(() => import('@/pages/home'))
const LoginPage = lazy(() => import('@/pages/login'))
const RegisterPage = lazy(() => import('@/pages/register'))
const DashboardPage = lazy(() => import('@/pages/dashboard'))
const BusinessesPage = lazy(() => import('@/pages/businesses'))
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
const OnboardingBusinessPage = lazy(() => import('@/pages/onboarding.business'))
const OnboardingBusinessVerificationPage = lazy(() => import('@/pages/onboarding.business-verification'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/dashboard'))
const AdminVerificationsPage = lazy(() => import('@/pages/admin/verifications'))
const AdminVerificationDetailPage = lazy(() => import('@/pages/admin/verification-detail'))
const AdminBusinessesPage = lazy(() => import('@/pages/admin/businesses'))
const AdminBusinessDetailPage = lazy(() => import('@/pages/admin/business-detail'))
const AdminCategoriesPage = lazy(() => import('@/pages/admin/categories'))
const AdminConfigPage = lazy(() => import('@/pages/admin/config'))
const AdminPrivacyRequestsPage = lazy(() => import('@/pages/admin/privacy-requests'))
const SupportDashboardPage = lazy(() => import('@/pages/support/dashboard'))
const SupportAccountsPage = lazy(() => import('@/pages/support/accounts'))
const SupportTicketPage = lazy(() => import('@/pages/support/ticket'))
const HelpPage = lazy(() => import('@/pages/help'))
const HelpTicketPage = lazy(() => import('@/pages/help/ticket'))

export function LoadingFallback() {
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
  const { isAuthenticated, isEmailVerified, isLoading: isAuthLoading } = useAuth()
  const { session, isSessionLoading } = useSession()

  if (isAuthLoading) return <LoadingFallback />

  /* Aguarda a sessão carregar para decidir o redirect pós-login:
   * admins de plataforma vão para /admin; usuários comuns para /dashboard. */
  if (!isAuthLoading && isAuthenticated && isEmailVerified && !isSessionLoading) {
    if (session?.isPlatformAdmin) {
      return <Navigate to="/admin" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  if (!isAuthLoading && isAuthenticated && !isEmailVerified) {
    return <Navigate to="/verify-email" replace />
  }

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
                  <FirstBusinessGuard>
                    <WorkspaceGate>
                      <DashboardLayout />
                    </WorkspaceGate>
                  </FirstBusinessGuard>
                </ProtectedRoute>
              }
            >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/businesses" element={<BusinessesPage />} />
            {/* P-3: criação direta de Business não existe mais (POST /businesses = 410,
                B-1). Quem clicar nos atalhos antigos cai no fluxo de verificação. */}
            <Route path="/businesses/new" element={<Navigate to="/onboarding/business/new" replace />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/locations/new" element={<LocationNewPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/services/new" element={<ServiceNewPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/staff/new" element={<StaffNewPage />} />
            <Route path="/appointments/new" element={<AppointmentNewPage />} />
            <Route path="/appointments/*" element={<AppointmentsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Onboarding: mesmos guards (ProtectedRoute + FirstBusinessGuard +
              WorkspaceGate), mas SEM o chrome do dashboard (sidebar/header).
              A mudança é só de layout — nenhuma regra de guarda foi alterada. */}
          <Route
            element={
              <ProtectedRoute>
                <FirstBusinessGuard>
                  <WorkspaceGate>
                    <Outlet />
                  </WorkspaceGate>
                </FirstBusinessGuard>
              </ProtectedRoute>
            }
          >
              <Route path="/onboarding/business" element={<OnboardingBusinessPage />} />
              <Route path="/onboarding/business/new" element={<OnboardingBusinessPage />} />
              {/* Acompanhamento sob /onboarding* — FirstBusinessGuard é congelado. */}
              <Route
                path="/onboarding/business-verification"
                element={<OnboardingBusinessVerificationPage />}
              />
              <Route path="/onboarding" element={<Navigate to="/onboarding/business" replace />} />
          </Route>

          <Route path="/book/:slug" element={<BookingPage />} />

          {/* Ajuda não depende de workspace ou de negócio ativo: qualquer conta autenticada pode abrir chamados. */}
          <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
            <Route path="/help" element={<HelpPage />} />
            <Route path="/help/tickets/:ticketId" element={<HelpTicketPage />} />
          </Route>

          <Route element={<ProtectedRoute><SupportGuard /></ProtectedRoute>}>
            <Route element={<SupportLayout />}>
              <Route path="/support" element={<SupportDashboardPage />} />
              <Route path="/support/accounts" element={<SupportAccountsPage />} />
              <Route path="/support/settings" element={<SettingsPage supportMode />} />
              <Route path="/support/tickets/:ticketId" element={<SupportTicketPage />} />
            </Route>
          </Route>

          {/* Admin routes — independente de negócio ativo */}
          <Route element={<ProtectedRoute><AdminGuard /></ProtectedRoute>}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
              <Route path="/admin/verifications/:id" element={<AdminVerificationDetailPage />} />
              <Route path="/admin/businesses" element={<AdminBusinessesPage />} />
              <Route path="/admin/businesses/:id" element={<AdminBusinessDetailPage />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/config" element={<AdminConfigPage />} />
              <Route path="/admin/privacy-requests" element={<AdminPrivacyRequestsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppProviders>
  )
}
