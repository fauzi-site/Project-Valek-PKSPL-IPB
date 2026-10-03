import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Paperclip,
  Send,
  CheckCheck,
  Check,
  Sparkles,
  ExternalLink,
  FileText,
  Image,
  MapPin,
  FolderKanban,
  X,
  Pencil,
  Trash2,
  Ban,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonList } from '../../../components/loading';

export const ChatWindowPanel = ({
  conversation,
  isTyping = false,
  typingUserName = '',
  isLoadingMessages = false,
  onTyping,
  onSendMessage,
  onBackMobile,
  onEditMessage,
  onDeleteMessage,
  currentUserId,
}) => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [searchInChatQuery, setSearchInChatQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [simulatedAttachment, setSimulatedAttachment] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // States for Edit & Delete
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [deletingMsg, setDeletingMsg] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [actionError, setActionError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const menuContainerRef = useRef(null);

  // Auto-scroll to bottom when messages update or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages, isTyping]);

  // Focus input when conversation changes
  useEffect(() => {
    inputRef.current?.focus();
    setEditingMsgId(null);
    setActiveMenuMsgId(null);
  }, [conversation.id]);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-chat-menu]')) {
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

  // Cleanup typing timeout on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping?.(false);
    };
  }, [conversation.id, onTyping]);

  const handleInputChange = (e) => {
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

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setSimulatedAttachment({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: file.type.includes('image') ? 'image' : file.name.endsWith('.zip') ? 'shp' : 'file',
      file: file,
    });
    setShowAttachmentMenu(false);
  };

  const handleSend = () => {
    if (!inputText.trim() && !simulatedAttachment && !selectedFile) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping?.(false);

    const fileToUpload = selectedFile || simulatedAttachment?.file || null;
    onSendMessage(inputText.trim(), fileToUpload);
    setInputText('');
    setSimulatedAttachment(null);
    setSelectedFile(null);
    setShowAttachmentMenu(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Edit actions
  const handleStartEdit = (msg) => {
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
      await onEditMessage(editingMsgId, editingText.trim());
      setEditingMsgId(null);
      setEditingText('');
    } catch (err) {
      console.error('[ChatWindowPanel] Gagal menyimpan edit pesan:', err);
      setActionError(err.message || 'Gagal menyimpan perubahan pesan. Pastikan Anda memiliki izin.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete actions
  const handleConfirmDelete = async () => {
    if (!deletingMsg || !onDeleteMessage) return;
    try {
      setIsSubmittingDelete(true);
      setActionError(null);
      await onDeleteMessage(deletingMsg.id);
      setDeletingMsg(null);
    } catch (err) {
      console.error('[ChatWindowPanel] Gagal menghapus pesan:', err);
      setActionError(err.message || 'Gagal menghapus pesan. Pastikan Anda memiliki izin.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Filter messages if search within chat is active
  const displayedMessages = searchInChatQuery.trim()
    ? conversation.messages.filter((m) =>
        (m.text || '').toLowerCase().includes(searchInChatQuery.toLowerCase())
      )
    : conversation.messages;

  // Quick reply suggestions relevant to PKSPL Valuation
  const quickReplies = [
    'Baik, saya akan cek kembali datanya.',
    'Data valuasi mangrove sudah kami verifikasi.',
    'Mohon perbaiki harga satuan flora di spreadsheet.',
    'Template excel sudah diperbarui ke versi terbaru.',
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 relative overflow-hidden">
      {/* 1. CHAT HEADER */}
      <div className="h-16 px-4 md:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 shadow-2xs z-10">
        {/* Left: Mobile Back Button + Avatar & User Info */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            onClick={onBackMobile}
            title="Kembali ke daftar percakapan"
            className="md:hidden p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
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
                  conversation.userRole === 'Super Admin' || conversation.userRole === 'Admin'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200/80'
                    : 'bg-cyan-50 text-cyan-700 border border-cyan-200/80'
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

        {/* Right Action Icons */}
        <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
          {/* Project Direct Link (if available) */}
          {conversation.projectCode && (
            <button
              onClick={() => navigate('/peneliti/projects')}
              title={`Buka proyek ${conversation.projectCode} di modul peneliti`}
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
            title="Cari dalam percakapan ini"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isSearchOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* More options */}
          <button
            onClick={() => alert(`Informasi kontak: ${conversation.userName} (${conversation.userRole})\nProyek: ${conversation.projectCode || '-'}`)}
            title="Info Pengguna & Opsi"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional Search bar inside chat */}
      {isSearchOpen && (
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kata dalam obrolan..."
            value={searchInChatQuery}
            onChange={(e) => setSearchInChatQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          {searchInChatQuery && (
            <button
              onClick={() => setSearchInChatQuery('')}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => {
              setIsSearchOpen(false);
              setSearchInChatQuery('');
            }}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action Error Banner if any */}
      {actionError && (
        <div className="mx-4 my-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-2xs z-20 animate-in fade-in duration-150 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-1 text-rose-400 hover:text-rose-700 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. CHAT MESSAGE AREA (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4" ref={menuContainerRef}>
        {/* Project Context Banner in Chat */}
        {conversation.projectName && (
          <div className="max-w-md mx-auto my-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/70 text-center text-xs text-blue-900 shadow-2xs">
            <span className="font-semibold text-blue-950">Topik Proyek: </span>
            <span className="font-bold">{conversation.projectName}</span>{' '}
            <span className="font-mono text-[11px] text-blue-600">({conversation.projectCode})</span>
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
            Tidak ada pesan yang cocok dengan pencarian &ldquo;{searchInChatQuery}&rdquo;.
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const isMe = Boolean(msg.isOutgoing) || (Boolean(currentUserId) && String(msg.senderId) === String(currentUserId));
            const isDeleted = Boolean(msg.isDeleted);
            const isEditing = editingMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                {/* Sender Name if incoming */}
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

                  {/* Message Bubble Container */}
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
                        {actionError && (
                          <div className="mt-1.5 p-1.5 bg-rose-500/20 border border-rose-300 rounded text-[11px] text-rose-100 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{actionError}</span>
                          </div>
                        )}
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
                        {/* File Attachment rendering (only if not deleted) */}
                        {!isDeleted && msg.attachment && (
                          <a
                            href={msg.attachment.url || '#'}
                            target={msg.attachment.url ? '_blank' : undefined}
                            rel="noreferrer"
                            download={msg.attachment.name}
                            className={`
                              mb-2.5 p-2 rounded-xl flex items-center gap-2.5 transition-colors
                              ${isMe ? 'bg-blue-700/60 hover:bg-blue-700/80 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}
                              ${msg.attachment.url ? 'cursor-pointer' : ''}
                            `}
                            title={msg.attachment.url ? 'Klik untuk membuka atau mengunduh lampiran' : undefined}
                          >
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                              {msg.attachment.type === 'shp' ? (
                                <MapPin className="w-4 h-4" />
                              ) : msg.attachment.type === 'image' ? (
                                <Image className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold truncate text-[11px]">{msg.attachment.name}</div>
                              <div className="text-[10px] opacity-75">{msg.attachment.size}</div>
                            </div>
                            {msg.attachment.url && (
                              <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-auto shrink-0" />
                            )}
                          </a>
                        )}

                        {/* Pesan telah dihapus OR Text */}
                        {isDeleted ? (
                          <div className="flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5 opacity-60 shrink-0" />
                            <span>Pesan telah dihapus</span>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        )}
                      </>
                    )}

                    {/* Timestamp, (diedit), and Read Status */}
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
                              msg.status === 'read' || msg.isRead
                                ? 'Dibaca'
                                : msg.status === 'delivered'
                                ? 'Tersampaikan (lawan bicara online)'
                                : 'Terkirim (lawan bicara offline)'
                            }
                          >
                            {msg.status === 'read' || msg.isRead ? (
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
              </div>
            );
          })
        )}

        {/* Real-time Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 p-2 bg-white/95 border border-slate-200 rounded-xl w-fit shadow-2xs animate-in fade-in duration-200">
            <div className="flex gap-1 items-center px-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {typingUserName || conversation.userName} sedang mengetik...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. QUICK SUGGESTION PILLS */}
      <div className="px-4 py-1.5 bg-slate-100/70 border-t border-slate-200/60 flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-blue-600" />
          Template Cepat:
        </span>
        {quickReplies.map((reply, idx) => (
          <button
            key={idx}
            onClick={() => setInputText(reply)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* 4. STICKY MESSAGE COMPOSER / INPUT AREA */}
      <div className="p-3 md:p-4 bg-white border-t border-slate-200 shrink-0 relative">
        {simulatedAttachment && (
          <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>
                Lampiran terpilih: <strong>{simulatedAttachment.name}</strong> ({simulatedAttachment.size})
              </span>
            </div>
            <button
              onClick={() => setSimulatedAttachment(null)}
              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hidden Real File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          accept=".pdf,.xlsx,.xls,.doc,.docx,.zip,.png,.jpg,.jpeg"
        />

        {/* Attachment Options Popup Menu */}
        {showAttachmentMenu && (
          <div className="absolute bottom-full left-4 mb-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-20 flex flex-col gap-1 w-48 animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
                setShowAttachmentMenu(false);
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors text-left"
            >
              <FileText className="w-4 h-4 text-rose-500" />
              <span>Dokumen / Excel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
                setShowAttachmentMenu(false);
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors text-left"
            >
              <Image className="w-4 h-4 text-blue-500" />
              <span>Gambar & Foto</span>
            </button>
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
                setShowAttachmentMenu(false);
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors text-left"
            >
              <MapPin className="w-4 h-4 text-indigo-500" />
              <span>Arsip SHP Spasial (.zip)</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Attachment Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            title="Lampirkan dokumen, data spasial, atau gambar"
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              showAttachmentMenu || simulatedAttachment
                ? 'bg-blue-50 border-blue-300 text-blue-600'
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
            disabled={!inputText.trim() && !simulatedAttachment}
            title="Kirim Pesan (Enter)"
            className={`
              p-2.5 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs
              ${
                inputText.trim() || simulatedAttachment
                  ? 'bg-[#2563EA] hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
            {actionError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
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

export default ChatWindowPanel;
