import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminTopbar } from '../components/AdminTopbar';

export const AdminShell = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Dynamic Topbar title and subtitle based on sub-path
  const getHeaderInfo = () => {
    const path = location.pathname;
    if (path.includes('/master-data')) {
      return {
        title: 'Master Data Global',
        subtitle: 'Standardisasi taksonomi vegetasi, objek pajak, dan parameter valuasi',
      };
    }
    if (path.includes('/users') || path.includes('/manajemen-pengguna')) {
      return {
        title: 'Manajemen Pengguna',
        subtitle: 'Daftar hak akses dan akun peneliti, super administrator, serta guest',
      };
    }
    if (path.includes('/projects')) {
      return {
        title: 'Manajemen Program',
        subtitle: 'Monitoring seluruh portofolio program valuasi ekonomi pesisir & laut',
      };
    }
    if (path.includes('/activity') || path.includes('/riwayat-aktivitas')) {
      return {
        title: 'Riwayat Aktivitas',
        subtitle: 'Audit log komprehensif seluruh aksi pengguna dan perubahan data sistem',
      };
    }
    if (path.includes('/messages')) {
      return {
        title: 'Pusat Pesan & Komunikasi',
        subtitle: 'Koordinasi langsung dengan peneliti dan notifikasi tim',
      };
    }
    return {
      title: 'Dashboard',
      subtitle: 'Overview sistem valuasi ekonomi PKSPL',
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Super Admin Sidebar */}
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopbar
          onToggleMobileSidebar={() => setIsMobileOpen(true)}
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
        />

        {/* Dynamic Admin Page Outlet */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
