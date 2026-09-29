import React, { useState } from 'react';
import { Conversation } from '../../mock/chatMock';
import { ChatDirectoryUser } from '../../services/chatService';
import {
  Search,
  Plus,
  MoreVertical,
  X,
  Sparkles,
  CheckCheck,
  Check,
} from 'lucide-react';

interface ResearcherConversationListPanelProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading?: boolean;
  directoryUsers?: ChatDirectoryUser[];
  onSelectConversation: (id: string) => void;
  onNewConversation?: (
    name: string,
    role: 'SuperAdmin' | string,
    projectCode: string,
    initialMsg: string,
    recipientId?: string | number
  ) => void;
  onSimulateIncoming?: () => void;
}

export const ResearcherConversationListPanel: React.FC<ResearcherConversationListPanelProps> = ({
  conversations,
  activeConversationId,
  isLoading = false,
  directoryUsers = [],
  onSelectConversation,
  onNewConversation,
  onSimulateIncoming,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState<'ALL' | 'Peneliti' | 'SuperAdmin'>('ALL');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // New Chat Form State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('PKS-994KY1');
  const [newInitialMsg, setNewInitialMsg] = useState('');

  // Filter conversations based on query and role tab
  const filteredConversations = conversations.filter((c) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      c.userName.toLowerCase().includes(query) ||
      c.lastMessageSnippet.toLowerCase().includes(query) ||
      (c.projectCode && c.projectCode.toLowerCase().includes(query)) ||
      (c.projectName && c.projectName.toLowerCase().includes(query));

    const matchesRole = activeRoleFilter === 'ALL' || c.userRole === activeRoleFilter;

    return matchesSearch && matchesRole;
  });

  const handleCreateNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    const chosen = directoryUsers.find((u) => String(u.id) === String(selectedUserId));
    const role: 'Peneliti' | 'SuperAdmin' =
      chosen?.role === 'Admin' || chosen?.role === 'Super Admin' || chosen?.role === 'Administrator'
        ? 'SuperAdmin'
        : 'Peneliti';

    if (onNewConversation) {
      onNewConversation(
        chosen?.nama || 'Pengguna',
        role,
        newProjectCode.trim() || 'PKS-994KY1',
        newInitialMsg.trim() || 'Halo, saya ingin mendiskusikan validasi data valuasi ekonomi pada proyek ini.',
        selectedUserId
      );
    }

    setSelectedUserId('');
    setNewInitialMsg('');
    setNewProjectCode('PKS-994KY1');
    setIsNewChatModalOpen(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white border-r border-slate-200 select-none relative">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header: Pesan + Counter + Tombol "+" + Menu Options        */}
      {/* ------------------------------------------------------------- */}
      <div className="h-16 px-4 md:px-5 flex items-center justify-between border-b border-slate-200/90 bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">
            Pesan
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {conversations.length}
          </span>
        </div>

        <div className="flex items-center gap-1 relative">
          {/* New Chat Button */}
          <button
            onClick={() => setIsNewChatModalOpen(true)}
            title="Mulai Percakapan Baru"
            className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* More Options Dropdown Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Opsi Pesan"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isMenuOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* More Options Popover */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-1 text-xs text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onSimulateIncoming?.();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 text-left transition-colors cursor-pointer font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Simulasi Pesan Masuk</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsNewChatModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-left transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Percakapan Baru</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <div className="px-3 py-1 text-[10px] text-slate-400 font-medium">
                Kanal Peneliti PKSPL IPB
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Search Bar                                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="px-4 py-2.5 bg-white shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari pengguna atau percakapan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-[#2563EA] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Filter Tabs (Chips): Semua, Peneliti, SuperAdmin             */}
      {/* ------------------------------------------------------------- */}
      <div className="px-4 pb-3 flex items-center gap-1.5 shrink-0 border-b border-slate-100 overflow-x-auto">
        {(['ALL', 'Peneliti', 'SuperAdmin'] as const).map((role) => {
          const isActive = activeRoleFilter === role;
          const label = role === 'ALL' ? 'Semua' : role === 'SuperAdmin' ? 'Super Admin' : role;
          return (
            <button
              key={role}
              onClick={() => setActiveRoleFilter(role)}
              className={`
                px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap
                ${
                  isActive
                    ? 'bg-[#2563EA] text-white shadow-xs shadow-blue-500/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800'
                }
              `}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Scrollable Conversation List & Skeleton Loading            */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
        {isLoading ? (
          // Loading Skeleton
          <div className="p-4 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  <div className="h-2.5 bg-slate-100 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          // Empty state
          <div className="p-8 text-center text-slate-400 text-xs space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-600">Tidak ada percakapan ditemukan</p>
            <p className="text-[11px] text-slate-400">
              {searchQuery
                ? `Tidak ada hasil untuk pencarian "${searchQuery}".`
                : `Belum ada kontak dengan role ${activeRoleFilter}.`}
            </p>
            {(searchQuery || activeRoleFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveRoleFilter('ALL');
                }}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
              >
                Reset Filter & Pencarian
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === activeConversationId;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`
                  relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 group
                  ${
                    isSelected
                      ? 'bg-blue-50/80 border-l-4 border-l-[#2563EA]'
                      : 'hover:bg-slate-50/90 border-l-4 border-l-transparent'
                  }
                `}
              >
                {/* Avatar with Online/Offline Indicator */}
                <div className="relative shrink-0">
                  <div
                    className={`w-11 h-11 rounded-full bg-gradient-to-tr ${conv.userAvatarBg} text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ${
                      isSelected ? 'ring-blue-300' : 'ring-white'
                    }`}
                  >
                    {conv.userInitials}
                  </div>
                  <span
                    className={`
                      absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white
                      ${conv.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}
                    `}
                    title={conv.isOnline ? 'Online' : 'Offline'}
                  />
                </div>

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  {/* Top line: Name & Timestamp */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-blue-950 font-extrabold' : 'text-[#0F172A]'
                        }`}
                      >
                        {conv.userName}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono shrink-0 ${
                        conv.unreadCount > 0 ? 'text-[#2563EA] font-bold' : 'text-slate-400'
                      }`}
                    >
                      {conv.lastMessageTime}
                    </span>
                  </div>

                  {/* Middle line: Role badge & Project code */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                        conv.userRole === 'SuperAdmin' || conv.userRole === 'Super Admin'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200/80'
                          : 'bg-blue-50 text-blue-700 border border-blue-200/80'
                      }`}
                    >
                      {conv.userRole}
                    </span>
                    {conv.projectCode && (
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        • {conv.projectCode}
                      </span>
                    )}
                  </div>

                  {/* Bottom line: Last message snippet & Unread badge */}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    {(() => {
                      const lastMsg = conv.messages && conv.messages.length > 0
                        ? conv.messages[conv.messages.length - 1]
                        : null;
                      return (
                        <p
                          className={`text-xs truncate flex items-center min-w-0 ${
                            conv.unreadCount > 0
                              ? 'text-slate-900 font-semibold'
                              : 'text-slate-500 group-hover:text-slate-700'
                          }`}
                        >
                          {lastMsg?.isOutgoing && (
                            <span className="inline-flex items-center mr-1 shrink-0">
                              {lastMsg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-500 stroke-[2.5]" />
                              ) : lastMsg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </span>
                          )}
                          <span className="truncate">{conv.lastMessageSnippet}</span>
                        </p>
                      );
                    })()}

                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 bg-[#2563EA] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-xs animate-in zoom-in-50 duration-150">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Modal: Mulai Percakapan Baru                               */}
      {/* ------------------------------------------------------------- */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Mulai Percakapan Baru</h3>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewChat} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Pengguna Tujuan (Super Admin / Peneliti):
                </label>
                {directoryUsers && directoryUsers.length > 0 ? (
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                  >
                    <option value="">-- Pilih Pengguna dari Database --</option>
                    {directoryUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nama} — {u.role} ({u.isOnline ? 'Online' : 'Offline'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs">
                    Memuat daftar pengguna dari database PKSPL...
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Proyek:</label>
                <input
                  type="text"
                  placeholder="Contoh: PKS-994KY1"
                  value={newProjectCode}
                  onChange={(e) => setNewProjectCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pesan Awal:</label>
                <textarea
                  rows={3}
                  placeholder="Tulis pesan pembuka koordinasi riset..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!selectedUserId}
                  className={`px-4 py-2 rounded-lg font-semibold shadow-xs transition-colors ${
                    selectedUserId
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Buka Obrolan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
