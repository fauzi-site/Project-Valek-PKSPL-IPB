import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Conversation, ChatMessage } from '../../mock/chatMock';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Paperclip,
  Send,
  CheckCheck,
  Check,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MapPin,
  FolderKanban,
  X,
  Camera,
  Download,
  AlertCircle,
  RefreshCw,
  Eye,
  ChevronDown,
  Pencil,
  Trash2,
  Ban,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonList } from '../../../components/loading';

interface ResearcherChatWindowPanelProps {
  conversation: Conversation;
  initialDraft?: string;
  isTyping?: boolean;
  isLoadingMessages?: boolean;
  onTyping?: (isTyping: boolean) => void;
  onSendMessage: (
    text: string,
    attachment?: { name: string; type: 'file' | 'image' | 'shp'; size: string; url?: string; file?: File }
  ) => Promise<void>;
  onUploadFile: (
    file: File,
    type: 'file' | 'shp' | 'image',
    onProgress?: (percent: number) => void
  ) => Promise<{ name: string; type: 'file' | 'shp' | 'image'; size: string; url?: string; file?: File }>;
  onBackMobile: () => void;
  onRetryMessage?: (msgId: string) => void;
  onEditMessage?: (msgId: string, newText: string, conversationId?: string) => Promise<void>;
  onDeleteMessage?: (msgId: string, conversationId?: string) => Promise<void>;
}

export const ResearcherChatWindowPanel: React.FC<ResearcherChatWindowPanelProps> = ({
  conversation,
  initialDraft,
  isTyping = false,
  isLoadingMessages = false,
  onTyping,
  onSendMessage,
  onUploadFile,
  onBackMobile,
  onRetryMessage,
  onEditMessage,
  onDeleteMessage,
}) => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState(initialDraft || '');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [searchInChatQuery, setSearchInChatQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    name: string;
    type: 'file' | 'image' | 'shp';
    size: string;
    url?: string;
    file?: File;
  } | null>(null);

  // Upload Progress & States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Image Modal Preview State
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Scroll detection & Floating "Pesan Baru" button
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [hasNewUnreadWhileScrolled, setHasNewUnreadWhileScrolled] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentAttachmentType, setCurrentAttachmentType] = useState<'file' | 'shp' | 'image'>('file');

  // Handle initial draft message (e.g. from Review & Laporan "Butuh Bantuan Super Admin")
  useEffect(() => {
    if (initialDraft) {
      setInputText(initialDraft);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.selectionStart = inputRef.current.value.length;
          inputRef.current.selectionEnd = inputRef.current.value.length;
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialDraft]);

  // States for Edit & Delete
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [deletingMsg, setDeletingMsg] = useState<ChatMessage | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-chat-menu]')) {
        setActiveMenuMsgId(null);
      }
    };
    if (activeMenuMsgId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuMsgId]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingMsgId) {
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 50);
    }
  }, [editingMsgId]);

  const handleStartEdit = (msg: ChatMessage) => {
    setActiveMenuMsgId(null);
    setEditingMsgId(msg.id);
    setEditingText(msg.text || '');
    setActionError(null);
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditingText('');
  };

  const handleSaveEdit = async () => {
    if (!editingText.trim() || !editingMsgId) {
      handleCancelEdit();
      return;
    }
    if (!onEditMessage) return;

    try {
      setIsSubmittingEdit(true);
      setActionError(null);
      await onEditMessage(editingMsgId, editingText.trim(), conversation.id);
      setEditingMsgId(null);
      setEditingText('');
    } catch (err: any) {
      console.error('[ResearcherChatWindowPanel] Gagal menyimpan edit pesan:', err);
      setActionError(err.message || 'Gagal menyimpan perubahan pesan. Pastikan Anda memiliki izin.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMsg || !onDeleteMessage) return;
    try {
      setIsSubmittingDelete(true);
      setActionError(null);
      await onDeleteMessage(deletingMsg.id, conversation.id);
      setDeletingMsg(null);
    } catch (err: any) {
      console.error('[ResearcherChatWindowPanel] Gagal menghapus pesan:', err);
      setActionError(err.message || 'Gagal menghapus pesan. Pastikan Anda memiliki izin.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Cleanup typing timeout on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping?.(false);
    };
  }, [conversation.id, onTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (onTyping) {
      if (val.trim().length > 0) {
        onTyping(true);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2500);
      } else {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        onTyping(false);
      }
    }
  };

  // Quick replies for Researcher context
  const quickReplies = [
    'Baik, akan saya perbaiki datanya.',
    'Data sudah saya upload ke template.',
    'Mohon review kembali hasil perhitungan saya.',
    'Template sudah saya lengkapi.',
    'Lampiran layer SHP GIS sudah diperbarui.',
    'Parameter harga satuan sudah disesuaikan dengan standar BPS.',
  ];

  // Scroll to bottom helper
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setHasNewUnreadWhileScrolled(false);
  }, []);

  // Handle scroll event to detect if user has scrolled up
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isUp = distanceFromBottom > 120;
    setIsUserScrolledUp(isUp);

    if (!isUp) {
      setHasNewUnreadWhileScrolled(false);
    }
  };

  // Auto-scroll on mount & new messages if not scrolled up
  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom('auto');
    } else {
      setHasNewUnreadWhileScrolled(true);
    }
  }, [conversation.id, scrollToBottom]);

  const lastMessageId = conversation.messages[conversation.messages.length - 1]?.id;
  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom('smooth');
    }
  }, [lastMessageId, isUserScrolledUp, scrollToBottom]);

  // Handle Send
  const handleSend = async () => {
    if ((!inputText.trim() && !selectedAttachment) || isUploading) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping?.(false);

    const textToSend = inputText.trim();
    const attachmentToSend = selectedAttachment || undefined;

    setInputText('');
    setSelectedAttachment(null);
    setShowAttachmentMenu(false);

    try {
      await onSendMessage(textToSend, attachmentToSend);
      scrollToBottom('smooth');
    } catch {
      // Error handled by context
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Trigger file selection for specific attachment type
  const triggerFilePick = (type: 'file' | 'shp' | 'image') => {
    setCurrentAttachmentType(type);
    setShowAttachmentMenu(false);
    setUploadError(null);

    if (fileInputRef.current) {
      if (type === 'file') {
        fileInputRef.current.accept = '.xlsx, .xls';
      } else if (type === 'shp') {
        fileInputRef.current.accept = '.zip';
      } else if (type === 'image') {
        fileInputRef.current.accept = 'image/*';
      }
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle native file change & validation
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const uploaded = await onUploadFile(file, currentAttachmentType, (percent) => {
        setUploadProgress(percent);
      });
      setSelectedAttachment(uploaded);
      setIsUploading(false);
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err.message || 'Gagal mengunggah file.');
    }
  };

  // Filter messages if search inside chat is active
  const displayedMessages = searchInChatQuery.trim()
    ? conversation.messages.filter((m) =>
        m.text.toLowerCase().includes(searchInChatQuery.toLowerCase())
      )
    : conversation.messages;

  // Handle simulated or real file download
  const handleDownloadFile = (att: { name: string; url?: string }) => {
    if (att.url) {
      window.open(att.url, '_blank');
      return;
    }
    const dummyBlob = new Blob([`Simulasi konten dokumen ${att.name} PKSPL IPB`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(dummyBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Hidden File Input for Real File Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ------------------------------------------------------------- */}
      {/* 1. CHAT HEADER                                                */}
      {/* ------------------------------------------------------------- */}
      <div className="h-16 px-4 md:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 shadow-2xs z-10">
        {/* Left: Mobile Back Button + Avatar & User Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackMobile}
            title="Kembali ke daftar percakapan"
            className="md:hidden p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* User Avatar */}
          <div className="relative shrink-0">
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-tr ${conversation.userAvatarBg} text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-slate-100`}
            >
              {conversation.userInitials}
            </div>
            <span
              className={`
                absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white
                ${conversation.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}
              `}
            />
          </div>

          {/* Name & Online / Role Status */}
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#0F172A] truncate">
                {conversation.userName}
              </h3>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                  conversation.userRole === 'SuperAdmin' || conversation.userRole === 'Super Admin'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200/80'
                    : 'bg-blue-50 text-blue-700 border border-blue-200/80'
                }`}
              >
                {conversation.userRole}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
              {conversation.isOnline ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="text-slate-400">
                  {conversation.lastSeen
                    ? conversation.lastSeen.toLowerCase().startsWith('terakhir') || conversation.lastSeen.toLowerCase().startsWith('aktif')
                      ? conversation.lastSeen
                      : `Terakhir online ${conversation.lastSeen}`
                    : 'Terakhir online baru saja'}
                </span>
              )}

              {conversation.projectCode && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-blue-600 font-mono font-medium truncate">
                    {conversation.projectCode}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
          {/* Direct Link to Project Details (Maps Step) */}
          {conversation.projectCode && (
            <button
              onClick={() => navigate(`/peneliti/projects/${conversation.projectCode}/maps`)}
              title={`Buka proyek ${conversation.projectCode} di modul spasial`}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
              <span>Lihat Proyek</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          )}

          {/* Toggle Search within messages */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="Cari kata dalam obrolan"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isSearchOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* More info menu */}
          <button
            onClick={() =>
              alert(
                `PKSPL Communication Hub\nKontak: ${conversation.userName} (${conversation.userRole})\nProyek: ${conversation.projectCode || '-'} - ${conversation.projectName || '-'}\nStatus: ${conversation.isOnline ? 'Online' : 'Offline'}`
              )
            }
            title="Info Pengguna & Proyek"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar Inside Chat */}
      {isSearchOpen && (
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kata dalam obrolan ini..."
            value={searchInChatQuery}
            onChange={(e) => setSearchInChatQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          {searchInChatQuery && (
            <button
              onClick={() => setSearchInChatQuery('')}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => {
              setIsSearchOpen(false);
              setSearchInChatQuery('');
            }}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action Error Banner if any */}
      {actionError && (
        <div className="mx-4 my-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-2xs z-20 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-1 text-rose-400 hover:text-rose-700 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. CHAT MESSAGE SCROLLABLE AREA                               */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative"
      >
        {/* Project Context Banner */}
        {conversation.projectName && (
          <div className="max-w-md mx-auto my-2 p-2.5 rounded-xl bg-blue-50/90 border border-blue-200/80 text-center text-xs text-blue-950 shadow-2xs">
            <span className="font-semibold text-blue-800">Topik Proyek: </span>
            <span className="font-bold">{conversation.projectName}</span>{' '}
            <span className="font-mono text-[11px] text-blue-600 font-semibold">
              ({conversation.projectCode})
            </span>
          </div>
        )}

        {/* Date Separator */}
        <div className="flex items-center justify-center my-3">
          <span className="px-3 py-1 rounded-full bg-slate-200/80 text-[11px] font-semibold text-slate-600 shadow-2xs">
            Hari ini
          </span>
        </div>

        {/* Messages List */}
        {isLoadingMessages ? (
          <SkeletonList variant="chat-messages" count={5} />
        ) : displayedMessages.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Tidak ada pesan yang cocok dengan &ldquo;{searchInChatQuery}&rdquo;.
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const isMe = msg.isOutgoing;
            const isDeleted = Boolean(msg.isDeleted);
            const isEditing = editingMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                {/* Sender Name for incoming messages */}
                {!isMe && (
                  <span className="text-[10px] font-semibold text-slate-500 ml-1 mb-1">
                    {msg.senderName}
                  </span>
                )}

                {/* Message Bubble + Actions Row */}
                <div className={`flex items-end gap-1.5 max-w-[85%] sm:max-w-md md:max-w-lg lg:max-w-xl ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Action Menu (⋮) untuk pesan outgoing & belum dihapus */}
                  {isMe && !isDeleted && !isEditing && (
                    <div
                      data-chat-menu
                      className="relative self-center shrink-0"
                    >
                      <button
                        type="button"
                        data-chat-menu
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                        }}
                        className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200/90 shadow-2xs transition-all cursor-pointer"
                        title="Opsi pesan (Edit / Hapus)"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {activeMenuMsgId === msg.id && (
                        <div
                          data-chat-menu
                          onMouseDown={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-full mb-1 z-30 w-28 bg-white rounded-xl shadow-lg border border-slate-200 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            data-chat-menu
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(msg);
                            }}
                            className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            data-chat-menu
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuMsgId(null);
                              setActionError(null);
                              setDeletingMsg(msg);
                            }}
                            className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`
                      p-3.5 text-xs leading-relaxed transition-all flex-1
                      ${
                        isDeleted
                          ? isMe
                            ? 'bg-blue-50/70 border border-blue-200 text-blue-900/60 rounded-2xl rounded-tr-xs italic'
                            : 'bg-slate-100/80 border border-slate-200 text-slate-500 rounded-2xl rounded-tl-xs italic'
                          : isMe
                          ? 'bg-[#2563EA] text-white rounded-2xl rounded-tr-xs shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-2xl rounded-tl-xs shadow-2xs'
                      }
                      ${msg.error ? 'border-rose-400 ring-2 ring-rose-200' : ''}
                    `}
                  >
                    {/* Inline Edit Form */}
                    {isEditing ? (
                      <div className="min-w-[220px]">
                        <textarea
                          ref={editInputRef}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit();
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          disabled={isSubmittingEdit}
                          className="w-full p-2 text-xs rounded-lg bg-blue-700 text-white placeholder-blue-200 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-white resize-none"
                          rows={2}
                        />
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSubmittingEdit}
                            className="px-2.5 py-1 text-[11px] font-medium text-blue-100 hover:text-white hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={isSubmittingEdit || !editingText.trim()}
                            className="px-3 py-1 text-[11px] font-semibold bg-white text-blue-700 hover:bg-blue-50 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                          >
                            {isSubmittingEdit ? 'Menyimpan...' : 'Simpan'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Attachment Card if present and not deleted */}
                        {!isDeleted && msg.attachment && (
                          <div
                            className={`
                              mb-2.5 p-2.5 rounded-xl flex items-center justify-between gap-2.5
                              ${isMe ? 'bg-blue-700/60 text-white' : 'bg-slate-100 text-slate-800'}
                            `}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  msg.attachment.type === 'file'
                                    ? 'bg-emerald-500 text-white'
                                    : msg.attachment.type === 'shp'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-purple-600 text-white'
                                }`}
                              >
                                {msg.attachment.type === 'shp' ? (
                                  <MapPin className="w-5 h-5" />
                                ) : msg.attachment.type === 'image' ? (
                                  <ImageIcon className="w-5 h-5" />
                                ) : (
                                  <FileText className="w-5 h-5" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold truncate text-[11px]">{msg.attachment.name}</div>
                                <div className="text-[10px] opacity-80">
                                  {msg.attachment.size} •{' '}
                                  {msg.attachment.type === 'shp'
                                    ? 'Layer GIS'
                                    : msg.attachment.type === 'image'
                                    ? 'Gambar / Bagan'
                                    : 'Excel Spreadsheet'}
                                </div>
                              </div>
                            </div>

                            {/* Download or Preview Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {msg.attachment.type === 'image' && msg.attachment.url && (
                                <button
                                  onClick={() =>
                                    setPreviewImage({
                                      url: msg.attachment!.url!,
                                      name: msg.attachment!.name,
                                    })
                                  }
                                  title="Lihat Pratinjau Gambar"
                                  className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadFile(msg.attachment!)}
                                title="Unduh Berkas Lampiran"
                                className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Sanitized Message Text or Deleted Tombstone */}
                        {isDeleted ? (
                          <div className="flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5 opacity-60 shrink-0" />
                            <span>Pesan telah dihapus</span>
                          </div>
                        ) : (
                          msg.text && (
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          )
                        )}
                      </>
                    )}

                    {/* Bubble Footer: Timestamp, (diedit) & Read Status */}
                    {!isEditing && (
                      <div
                        className={`
                          flex items-center justify-end gap-1 mt-1 text-[10px] select-none
                          ${isDeleted ? (isMe ? 'text-blue-900/40' : 'text-slate-400') : (isMe ? 'text-blue-100' : 'text-slate-400')}
                        `}
                      >
                        {!isDeleted && msg.isEdited && (
                          <span className="text-[9px] opacity-80 mr-0.5 italic">(diedit)</span>
                        )}
                        <span>{msg.timestamp}</span>
                        {isMe && !isDeleted && (
                          <span
                            title={
                              msg.status === 'read'
                                ? 'Dibaca'
                                : msg.status === 'delivered'
                                ? 'Tersampaikan (lawan bicara online)'
                                : 'Terkirim (lawan bicara offline)'
                            }
                          >
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-300 stroke-[2.5]" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-200/70" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-blue-200/70" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Banner if message failed to send */}
                {msg.error && (
                  <div className="flex items-center gap-1.5 text-rose-600 text-[11px] mt-1 mr-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Gagal terkirim.</span>
                    <button
                      onClick={() => onRetryMessage?.(msg.id)}
                      className="underline font-semibold hover:text-rose-800 flex items-center gap-0.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Coba lagi</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Real-time Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 p-2 bg-white/90 border border-slate-200 rounded-xl w-fit shadow-2xs animate-in fade-in duration-200">
            <div className="flex gap-1 items-center px-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {conversation.userName} sedang mengetik...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating "Pesan Baru" button if user scrolled up */}
      {hasNewUnreadWhileScrolled && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={() => scrollToBottom('smooth')}
            className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/30 flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <ChevronDown className="w-4 h-4 animate-bounce" />
            <span>Pesan Baru Tersedia</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. QUICK REPLY SUGGESTION BAR                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="px-4 py-2 bg-slate-100/80 border-t border-slate-200/70 flex items-center gap-2 overflow-x-auto shrink-0 custom-scrollbar">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0 select-none">
          Quick Reply:
        </span>
        {quickReplies.map((reply, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInputText(reply);
              inputRef.current?.focus();
            }}
            className="text-[11px] px-3 py-1 rounded-full bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MESSAGE COMPOSER & ATTACHMENTS                             */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 md:p-4 bg-white border-t border-slate-200 shrink-0 relative">
        {/* Upload Error Banner if file validation fails */}
        {uploadError && (
          <div className="mb-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-rose-400 hover:text-rose-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="mb-2 px-3.5 py-2.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                Mengunggah berkas lampiran...
              </span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Selected Attachment Chip Banner */}
        {selectedAttachment && !isUploading && (
          <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center shrink-0">
                {selectedAttachment.type === 'shp' ? (
                  <MapPin className="w-3.5 h-3.5" />
                ) : selectedAttachment.type === 'image' ? (
                  <ImageIcon className="w-3.5 h-3.5" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="truncate">
                Lampiran siap kirim: <strong>{selectedAttachment.name}</strong> ({selectedAttachment.size})
              </span>
            </div>
            <button
              onClick={() => setSelectedAttachment(null)}
              className="text-slate-400 hover:text-rose-600 p-1 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Attachment Options Popover */}
        {showAttachmentMenu && (
          <div className="absolute bottom-full mb-2 left-4 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-30 space-y-1 text-xs text-slate-700 w-56 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <button
              onClick={() => triggerFilePick('file')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-semibold text-slate-800">Lampirkan Template Excel</div>
                <div className="text-[10px] text-slate-400">Berkas .xlsx atau .xls</div>
              </div>
            </button>

            <button
              onClick={() => triggerFilePick('shp')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <div className="font-semibold text-slate-800">Lampirkan SHP GIS (.zip)</div>
                <div className="text-[10px] text-slate-400">Arsip layer tutupan/zonasi</div>
              </div>
            </button>

            <button
              onClick={() => triggerFilePick('image')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <div className="font-semibold text-slate-800">Lampirkan Gambar Bagan</div>
                <div className="text-[10px] text-slate-400">Diagram alur atau analitik</div>
              </div>
            </button>

            <button
              onClick={() => triggerFilePick('image')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left cursor-pointer"
            >
              <Camera className="w-4 h-4 text-cyan-600 shrink-0" />
              <div>
                <div className="font-semibold text-slate-800">Lampirkan Foto Lapangan</div>
                <div className="text-[10px] text-slate-400">Dokumentasi survei lokasi</div>
              </div>
            </button>
          </div>
        )}

        {/* Input Text Form */}
        <div className="flex items-end gap-2">
          {/* Attachment Paperclip Button */}
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            title="Lampirkan dokumen, data spasial, atau gambar"
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              showAttachmentMenu || selectedAttachment
                ? 'bg-blue-50 border-blue-300 text-blue-600 shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 border-transparent text-slate-600'
            }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Textarea Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan..."
              className="w-full max-h-32 px-4 py-2.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-[#2563EA] rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={(!inputText.trim() && !selectedAttachment) || isUploading}
            title="Kirim Pesan (Enter)"
            className={`
              p-2.5 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-xs
              ${
                (inputText.trim() || selectedAttachment) && !isUploading
                  ? 'bg-[#2563EA] hover:bg-blue-700 text-white hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. IMAGE FULL PREVIEW MODAL                                    */}
      {/* ------------------------------------------------------------- */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 truncate">{previewImage.name}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-100 max-h-[70vh] overflow-auto">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. DELETE CONFIRMATION MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {deletingMsg && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hapus pesan?</h3>
                <p className="text-xs text-slate-500">Pesan ini akan dihapus dari percakapan.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4 italic line-clamp-2">
              "{deletingMsg.text || (deletingMsg.attachment ? 'Lampiran' : '')}"
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingMsg(null)}
                disabled={isSubmittingDelete}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs disabled:opacity-50"
              >
                {isSubmittingDelete ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
