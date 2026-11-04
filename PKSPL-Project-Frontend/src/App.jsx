import React, { useState, useEffect, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import FloatingLanguageSwitcher from './components/FloatingLanguageSwitcher'
import GlobalChatNotification from './components/chat/GlobalChatNotification'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import AboutSection from './components/AboutSection'
import StatsSection from './components/StatsSection'
import WorkflowSection from './components/WorkflowSection'
import MapSection from './components/MapSection'
import Footer from './components/Footer'
import { ProjectProvider } from './peneliti/context/ProjectContext'
import { SpreadsheetProvider } from './peneliti/context/SpreadsheetContext'
import { ChatProvider } from './peneliti/context/ChatContext'
import { ErrorBoundary } from './ErrorBoundary'

// Lazy-loaded Auth Pages
const LoginPage = React.lazy(() => import('./pages/LoginPage'))
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'))
const GoogleCallbackPage = React.lazy(() => import('./pages/GoogleCallbackPage'))
const EmailVerifyCallbackPage = React.lazy(() => import('./pages/EmailVerifyCallbackPage'))

// Lazy-loaded Landing sub-views
const DashboardPage = React.lazy(() => import('./components/dashboard/DashboardPage'))
const ProjectDetailPage = React.lazy(() => import('./components/map/ProjectDetailPage'))

// Lazy-loaded Admin Pages
const AdminShell = React.lazy(() => import('./admin/layouts/AdminShell'))
const AdminDashboardPage = React.lazy(() => import('./admin/pages/AdminDashboardPage'))
const AdminMasterDataPage = React.lazy(() => import('./admin/pages/AdminMasterDataPage'))
const AdminUsersPage = React.lazy(() => import('./admin/pages/AdminUsersPage'))
const AdminResearcherApplicationsPage = React.lazy(() => import('./admin/pages/AdminResearcherApplicationsPage'))
const AdminProjectsPage = React.lazy(() => import('./admin/pages/AdminProjectsPage'))
const AdminActivityPage = React.lazy(() => import('./admin/pages/AdminActivityPage'))
const AdminMessagesPage = React.lazy(() => import('./admin/pages/AdminMessagesPage'))
const VerifikasiDataPage = React.lazy(() => import('./admin/pages/VerifikasiDataPage'))
const KebijakanPage = React.lazy(() => import('./admin/pages/KebijakanPage'))

// Lazy-loaded Peneliti Pages
const PenelitiShell = React.lazy(() => import('./peneliti/components/layout/AppShell').then(m => ({ default: m.AppShell })))
const ProjectListPage = React.lazy(() => import('./peneliti/pages/ProjectListPage').then(m => ({ default: m.ProjectListPage })))
const MapsPage = React.lazy(() => import('./peneliti/pages/MapsPage').then(m => ({ default: m.MapsPage })))
const IndexPage = React.lazy(() => import('./peneliti/pages/IndexPage').then(m => ({ default: m.IndexPage })))
const DataMasterPage = React.lazy(() => import('./peneliti/pages/DataMasterPage').then(m => ({ default: m.DataMasterPage })))
const ServicesMethodsPage = React.lazy(() => import('./peneliti/pages/ServicesMethodsPage').then(m => ({ default: m.ServicesMethodsPage })))
const DataValuationPage = React.lazy(() => import('./peneliti/pages/DataValuationPage').then(m => ({ default: m.DataValuationPage })))
const CalculationPage = React.lazy(() => import('./peneliti/pages/CalculationPage').then(m => ({ default: m.CalculationPage })))
const AnalyticsPage = React.lazy(() => import('./peneliti/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const ReviewReportPage = React.lazy(() => import('./peneliti/pages/ReviewReportPage').then(m => ({ default: m.ReviewReportPage })))
const ReportPrintView = React.lazy(() => import('./peneliti/pages/ReportPrintView').then(m => ({ default: m.ReportPrintView })))
const ResearcherMessagesPage = React.lazy(() => import('./peneliti/pages/ResearcherMessagesPage').then(m => ({ default: m.ResearcherMessagesPage })))

function PageLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-slate-500">Memuat halaman...</span>
      </div>
    </div>
  )
}

function LandingPageContent() {
  const [currentView, setCurrentView] = useState('home')
  const [projectId, setProjectId] = useState(null)
  const location = useLocation()

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')

      if (hash.startsWith('project/')) {
        const id = hash.replace('project/', '')
        setProjectId(id)
        setCurrentView('project')
      } else if (hash === 'dashboard') {
        setProjectId(null)
        setCurrentView('dashboard')
      } else {
        setProjectId(null)
        setCurrentView('home')

        if (hash && hash !== 'home' && hash !== 'hero') {
          setTimeout(() => {
            const el = document.getElementById(hash)
            if (el) {
              const navbarHeight = 90
              const elementPosition = el.getBoundingClientRect().top + window.scrollY
              window.scrollTo({
                top: Math.max(0, elementPosition - navbarHeight),
                behavior: 'smooth'
              })
            }
          }, 150)
        } else if (hash === 'hero') {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
    }

    handleHashChange()

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [location.pathname, location.hash])

  const navigateTo = (page) => {
    window.location.hash = page
  }

  if (currentView === 'dashboard') {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <DashboardPage onNavigateHome={() => navigateTo('home')} />
      </Suspense>
    )
  }

  if (currentView === 'project' && projectId) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <ProjectDetailPage
          projectId={projectId}
          onBack={() => {
            navigateTo('home')
            setTimeout(() => {
              const mapEl = document.getElementById('map')
              if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' })
            }, 100)
          }}
        />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar onNavigateDashboard={() => navigateTo('dashboard')} />
      <main>
        <HeroSection />
        <AboutSection />
        <MapSection />
        <WorkflowSection />
        <StatsSection />
      </main>
      <Footer />
    </div>
  )
}

function StandaloneProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ProjectDetailPage
        projectId={projectId}
        onBack={() => {
          navigate('/')
          setTimeout(() => {
            const mapEl = document.getElementById('map')
            if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }}
      />
    </Suspense>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <SpreadsheetProvider>
            <ChatProvider>
              <Toaster position="top-center" reverseOrder={false} />
              <FloatingLanguageSwitcher />
              <GlobalChatNotification />
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<LandingPageContent />} />
                  <Route path="/project/:projectId" element={<StandaloneProjectDetailPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/auth/callback" element={<GoogleCallbackPage />} />
                  <Route path="/auth/email/verify/:id/:hash" element={<EmailVerifyCallbackPage />} />
                  
                  {/* ROLE PENELITI (RESEARCHER) 9-STEP WORKFLOW */}
                  <Route element={<ProtectedRoute allowedRoles={['Super Admin', 'Admin', 'Administrator', 'Peneliti']} />}>
                    {/* Standalone Print/PDF View */}
                    <Route path="/peneliti/projects/:projectId/review/preview" element={<ReportPrintView />} />
                    <Route path="/peneliti/projects/:projectId/review-laporan/preview" element={<ReportPrintView />} />

                    {/* Researcher App Shell (Header + 9-step Sidebar) */}
                    <Route element={<PenelitiShell />}>
                      <Route path="/peneliti" element={<Navigate to="/peneliti/projects" replace />} />
                      <Route path="/peneliti/projects" element={<ProjectListPage />} />
                      <Route path="/peneliti/projects/new" element={<ProjectListPage />} />

                      {/* 9-Step Researcher Workflow */}
                      <Route path="/peneliti/projects/:projectId" element={<Navigate to="maps" replace />} />
                      <Route path="/peneliti/projects/:projectId/maps" element={<MapsPage />} />
                      <Route path="/peneliti/projects/:projectId/index" element={<IndexPage />} />
                      <Route path="/peneliti/projects/:projectId/data-master" element={<DataMasterPage />} />
                      <Route path="/peneliti/projects/:projectId/services-methods" element={<ServicesMethodsPage />} />
                      <Route path="/peneliti/projects/:projectId/jasa-metode" element={<ServicesMethodsPage />} />
                      <Route path="/peneliti/projects/:projectId/jasa-method" element={<ServicesMethodsPage />} />
                      <Route path="/peneliti/projects/:projectId/valuation-method" element={<Navigate to="../services-methods" replace />} />
                      <Route path="/peneliti/projects/:projectId/identification" element={<Navigate to="../services-methods" replace />} />
                      <Route path="/peneliti/projects/:projectId/valuation-data" element={<DataValuationPage />} />
                      <Route path="/peneliti/projects/:projectId/data-valuasi" element={<DataValuationPage />} />
                      <Route path="/peneliti/projects/:projectId/input-data" element={<Navigate to="../valuation-data" replace />} />
                      <Route path="/peneliti/projects/:projectId/input" element={<Navigate to="../valuation-data" replace />} />
                      <Route path="/peneliti/projects/:projectId/calculation" element={<CalculationPage />} />
                      <Route path="/peneliti/projects/:projectId/perhitungan" element={<CalculationPage />} />
                      <Route path="/peneliti/projects/:projectId/analytics" element={<AnalyticsPage />} />
                      <Route path="/peneliti/projects/:projectId/analitik" element={<AnalyticsPage />} />
                      <Route path="/peneliti/projects/:projectId/review" element={<ReviewReportPage />} />
                      <Route path="/peneliti/projects/:projectId/review-laporan" element={<ReviewReportPage />} />
                      <Route path="/peneliti/projects/:projectId/messages" element={<ResearcherMessagesPage />} />
                      <Route path="/peneliti/projects/:projectId/komunikasi" element={<ResearcherMessagesPage />} />
                      <Route path="/peneliti/projects/:projectId/pesan" element={<ResearcherMessagesPage />} />
                      <Route path="/peneliti/messages" element={<ResearcherMessagesPage />} />
                      <Route path="/peneliti/pesan" element={<ResearcherMessagesPage />} />
                    </Route>

                    {/* Backward-compatibility / Legacy redirects for /valuasi */}
                    <Route path="/valuasi" element={<Navigate to="/peneliti/projects" replace />} />
                    <Route path="/valuasi/projects" element={<Navigate to="/peneliti/projects" replace />} />
                    <Route path="/valuasi/projects/:projectId/*" element={<Navigate to="/peneliti/projects" replace />} />
                    <Route path="/valuasi/*" element={<Navigate to="/peneliti/projects" replace />} />

                    {/* Direct /projects redirect */}
                    <Route path="/projects" element={<Navigate to="/peneliti/projects" replace />} />
                    <Route path="/projects/:projectId/*" element={<Navigate to="/peneliti/projects" replace />} />
                  </Route>

                  {/* SUPER ADMIN CONSOLE */}
                  <Route element={<ProtectedRoute allowedRoles={['Super Admin', 'Admin', 'Administrator']} />}>
                    <Route path="/admin" element={<AdminShell />}>
                      <Route index element={<AdminDashboardPage />} />
                      <Route path="dashboard" element={<AdminDashboardPage />} />
                      <Route path="master-data" element={<AdminMasterDataPage />} />
                      <Route path="users" element={<AdminUsersPage />} />
                      <Route path="manajemen-pengguna" element={<AdminUsersPage />} />
                      <Route path="researcher-applications" element={<AdminResearcherApplicationsPage />} />
                      <Route path="permohonan-peneliti" element={<AdminResearcherApplicationsPage />} />
                      <Route path="projects" element={<AdminProjectsPage />} />
                      <Route path="activity" element={<AdminActivityPage />} />
                      <Route path="riwayat-aktivitas" element={<AdminActivityPage />} />
                      <Route path="messages" element={<AdminMessagesPage />} />
                      <Route path="verifikasi-data" element={<VerifikasiDataPage />} />
                      <Route path="kebijakan" element={<KebijakanPage />} />
                    </Route>
                  </Route>

                  {/* Legacy /analyst fallback */}
                  <Route path="/analyst/*" element={<Navigate to="/login" replace />} />
                </Routes>
              </Suspense>
            </ChatProvider>
          </SpreadsheetProvider>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
