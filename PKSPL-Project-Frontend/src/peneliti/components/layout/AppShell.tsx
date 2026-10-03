import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AutosaveIndicator } from './AutosaveIndicator';
import { UnifiedNotificationToast } from '../notifications/UnifiedNotificationToast';
import { EmailPreviewModal } from '../notifications/EmailPreviewModal';
import { DispatchedEmail } from '../../services/offlineEmailService';
import { useProject } from '../../context/ProjectContext';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<DispatchedEmail | null>(null);
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Listen for request to open email preview from Topbar or elsewhere
  useEffect(() => {
    const handleOpenEmail = (e: any) => {
      if (e.detail) {
        setSelectedEmail(e.detail);
      }
    };
    window.addEventListener('pkspl_open_email_preview', handleOpenEmail);
    return () => {
      window.removeEventListener('pkspl_open_email_preview', handleOpenEmail);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Sidebar (Desktop collapsible + Mobile off-canvas drawer) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
          onToggleMobileSidebar={() => setIsMobileOpen(prev => !prev)}
        />

        {/* Dynamic Page Outlet */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>

        {/* Real-time Pop-up Toast Notifikasi (Pesan dsb) */}
        <UnifiedNotificationToast onOpenEmailPreview={(email) => setSelectedEmail(email)} />

        {/* Modal Pratinjau Surat Email Notifikasi Offline */}
        <EmailPreviewModal email={selectedEmail} onClose={() => setSelectedEmail(null)} />

        {/* Global Bottom Status Bar */}
        <footer className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-end shrink-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.02)]">
          <AutosaveIndicator />
        </footer>
      </div>
    </div>
  );
};

