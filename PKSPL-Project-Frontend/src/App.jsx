import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import EmailVerifyCallbackPage from './pages/EmailVerifyCallbackPage'
import FloatingLanguageSwitcher from './components/FloatingLanguageSwitcher'
import GlobalChatNotification from './components/chat/GlobalChatNotification'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import AboutSection from './components/AboutSection'
import StatsSection from './components/StatsSection'
import WorkflowSection from './components/WorkflowSection'
import MapSection from './components/MapSection'
import Footer from './components/Footer'
import DashboardPage from './components/dashboard/DashboardPage'
import ProjectDetailPage from './components/map/ProjectDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AdminShell from './admin/layouts/AdminShell'
import AdminDashboardPage from './admin/pages/AdminDashboardPage'
import AdminMasterDataPage from './admin/pages/AdminMasterDataPage'
import AdminUsersPage from './admin/pages/AdminUsersPage'
import AdminProjectsPage from './admin/pages/AdminProjectsPage'
import AdminActivityPage from './admin/pages/AdminActivityPage'
import AdminMessagesPage from './admin/pages/AdminMessagesPage'
import VerifikasiDataPage from './admin/pages/VerifikasiDataPage'
import KebijakanPage from './admin/pages/KebijakanPage'

// Peneliti (Researcher) Context & Components
import { ProjectProvider } from './peneliti/context/ProjectContext'
import { SpreadsheetProvider } from './peneliti/context/SpreadsheetContext'
import { ChatProvider } from './peneliti/context/ChatContext'
import { AppShell as PenelitiShell } from './peneliti/components/layout/AppShell'
import { ProjectListPage } from './peneliti/pages/ProjectListPage'
import { MapsPage } from './peneliti/pages/MapsPage'
import { IndexPage } from './peneliti/pages/IndexPage'
import { DataMasterPage } from './peneliti/pages/DataMasterPage'
import { ServicesMethodsPage } from './peneliti/pages/ServicesMethodsPage'
import { DataValuationPage } from './peneliti/pages/DataValuationPage'
import { CalculationPage } from './peneliti/pages/CalculationPage'
import { AnalyticsPage } from './peneliti/pages/AnalyticsPage'
import { ReviewReportPage } from './peneliti/pages/ReviewReportPage'
import { ReportPrintView } from './peneliti/pages/ReportPrintView'
import { ResearcherMessagesPage } from './peneliti/pages/ResearcherMessagesPage'
import { ErrorBoundary } from './ErrorBoundary'

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
      <DashboardPage onNavigateHome={() => navigateTo('home')} />
    )
  }

  if (currentView === 'project' && projectId) {
    return (
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
            <Routes>
              <Route path="/" element={<LandingPageContent />} />
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
            </ChatProvider>
          </SpreadsheetProvider>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
