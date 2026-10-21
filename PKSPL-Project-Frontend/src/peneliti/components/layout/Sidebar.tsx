import React from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useChat } from '../../context/ChatContext';
import {
  FolderKanban,
  Map,
  Layers,
  Database,
  SlidersHorizontal,
  TableProperties,
  Calculator,
  BarChart3,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  Home,
  MessageSquare,
  X
} from 'lucide-react';
import { SidebarAccountMenu } from '../../../components/profile/SidebarAccountMenu';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  isMobileOpen = false,
  onMobileClose
}) => {
  const { activeProject, activeProjectId } = useProject();
  const { user } = useAuth() || {};
  const isAdmin = user?.role?.nama_role === 'Super Admin' || user?.role?.nama_role === 'Admin' || user?.role === 'admin';
  const { totalUnreadCount } = useChat();
  const location = useLocation();
  const params = useParams<{ projectId?: string }>();
  const projId = params.projectId || activeProjectId || 'PKS-994KY1';

  // Navigation workflow items (9 Steps)
  const allWorkflowItems = [
    {
      num: '01',
      title: 'Program',
      path: '/peneliti/projects',
      icon: FolderKanban,
      match: (p: string) => p === '/peneliti/projects' || p === '/peneliti/projects/new' || p === '/peneliti' || p === '/projects',
    },
    {
      num: '02',
      title: 'Maps',
      path: `/peneliti/projects/${projId}/maps`,
      icon: Map,
      match: (p: string) => p.includes('/maps'),
    },
    {
      num: '03',
      title: 'Index',
      path: `/peneliti/projects/${projId}/index`,
      icon: Layers,
      match: (p: string) => p.includes('/index'),
    },
    {
      num: '04',
      title: 'Data Master',
      path: `/peneliti/projects/${projId}/data-master`,
      icon: Database,
      match: (p: string) => p.includes('/data-master'),
    },
    {
      num: '05',
      title: 'Jasa & Metode',
      path: `/peneliti/projects/${projId}/services-methods`,
      icon: SlidersHorizontal,
      match: (p: string) => p.includes('/services-methods') || p.includes('/identification'),
    },
    {
      num: '06',
      title: 'Data Valuasi',
      path: `/peneliti/projects/${projId}/valuation-data`,
      icon: TableProperties,
      match: (p: string) => p.includes('/valuation-data') || p.includes('/input'),
    },
    {
      num: '07',
      title: 'Perhitungan',
      path: `/peneliti/projects/${projId}/calculation`,
      icon: Calculator,
      match: (p: string) => p.includes('/calculation'),
    },
    {
      num: '08',
      title: 'Analitik',
      path: `/peneliti/projects/${projId}/analytics`,
      icon: BarChart3,
      match: (p: string) => p.includes('/analytics'),
    },
    {
      num: '09',
      title: 'Review & Laporan',
      path: `/peneliti/projects/${projId}/review`,
      icon: FileCheck2,
      match: (p: string) => p.includes('/review'),
    },
  ];

  // Admin users cannot see "01 Proyek" step
  const workflowItems = isAdmin
    ? allWorkflowItems.filter(item => item.num !== '01')
    : allWorkflowItems;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 select-none ${
          isMobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40 shrink-0">
          {(!collapsed || isMobileOpen) && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                PK
              </div>
              <div className="leading-tight truncate">
                <div className="text-sm font-bold text-white tracking-wider">PKSPL</div>
                <div className="text-[11px] text-slate-400 font-medium">Sistem Valuasi</div>
              </div>
            </div>
          )}
          {collapsed && !isMobileOpen && (
            <div className="w-8 h-8 mx-auto rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              PK
            </div>
          )}

          {/* Desktop Collapse Toggle Button */}
          <button
            onClick={onToggle}
            title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            className="hidden md:flex p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Drawer Close Button */}
          <button
            onClick={onMobileClose}
            title="Tutup navigasi"
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Active Project Banner in Sidebar */}
      {!collapsed && activeProject && (
        <div className="px-4 py-3 bg-slate-800/40 border-b border-slate-800/70">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Program Aktif
          </div>
          <div className="text-xs font-semibold text-white truncate" title={activeProject.name}>
            {activeProject.name}
          </div>
          <div className="text-[11px] font-mono text-blue-400 mt-0.5">
            {activeProject.code}
          </div>
        </div>
      )}

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {!collapsed && (
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Workflow Penelitian
          </div>
        )}

        {workflowItems.map((item) => {
          const isCurrent = item.match(location.pathname);
          const Icon = item.icon;

          return (
            <NavLink
              key={item.num}
              to={item.path}
              onClick={() => onMobileClose?.()}
              title={collapsed ? `${item.num} ${item.title}` : undefined}
              className={({ isActive }) => {
                const active = isCurrent || isActive;
                return `flex items-center gap-3 px-3 py-2 rounded text-xs transition-colors ${
                  active
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`;
              }}
            >
              <div className="flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>

              {(!collapsed || isMobileOpen) && (
                <div className="flex items-center gap-2 w-full truncate">
                  <span className="text-[11px] font-mono opacity-60">{item.num}</span>
                  <span className="truncate">{item.title}</span>
                </div>
              )}
            </NavLink>
          );
        })}

        {/* Komunikasi & Pesan */}
        <div className="pt-2 pb-1 border-t border-slate-800/80 space-y-1">
          {(!collapsed || isMobileOpen) && (
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Komunikasi
            </div>
          )}
          <NavLink
            to={`/peneliti/projects/${projId}/messages`}
            onClick={() => onMobileClose?.()}
            title={collapsed ? 'Pesan & Komunikasi' : undefined}
            className={({ isActive }) => {
              const active = isActive || location.pathname.includes('/messages');
              return `relative flex items-center gap-3 px-3 py-2 rounded text-xs transition-colors cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              } ${collapsed && !isMobileOpen ? 'justify-center px-0' : ''}`;
            }}
          >
            <div className="flex items-center justify-center flex-shrink-0 relative">
              <MessageSquare className="w-4 h-4" />
              {collapsed && totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-slate-900" />
              )}
            </div>

            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span className="truncate">Pesan</span>
                {totalUnreadCount > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {totalUnreadCount} Baru
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-slate-500">
                    0
                  </span>
                )}
              </div>
            )}
          </NavLink>
        </div>
      </div>

      {/* Standardized Bottom Profile & Logout Section */}
      <SidebarAccountMenu collapsed={collapsed} />
    </aside>
    </>
  );
};
