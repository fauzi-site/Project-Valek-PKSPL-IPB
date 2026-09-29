import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConversationListPanel } from '../components/chat/ConversationListPanel';
import { ChatWindowPanel } from '../components/chat/ChatWindowPanel';
import { EmptyChatState } from '../components/chat/EmptyChatState';
import { useAuth } from '../../contexts/AuthContext';
import { adminChatService, formatTime, formatFileSize } from '../services/adminChatService';
import { getEcho } from '../../lib/echo';

export const AdminMessagesPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const currentUserId = user?.id || user?.id_user;
  const currentUserName = user?.nama || user?.name || 'Administrator';

  const [conversations, setConversations] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Real-time Typing Indicator States
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  const typingTimeoutRef = useRef(null);

  // Reset typing saat percakapan berganti
  useEffect(() => {
    setIsTyping(false);
    setTypingUserName('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [activeConversationId]);

  // 1. Muat data awal percakapan & direktori pengguna resmi
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [convs, dir] = await Promise.all([
        adminChatService.getConversations(currentUserId),
        adminChatService.getDirectoryUsers(),
      ]);

      setConversations(convs);
      setDirectoryUsers(dir);

      // Cek apakah ada target user dari query param
      const targetUserId = searchParams.get('user');
      if (targetUserId) {
        const found = convs.find((c) => String(c.userId) === String(targetUserId));
        if (found) {
          setActiveConversationId(found.id);
        } else {
          // Buat atau dapatkan percakapan baru dengan target user
          const newConvId = await adminChatService.getOrCreateConversation(targetUserId);
          const updatedConvs = await adminChatService.getConversations(currentUserId);
          setConversations(updatedConvs);
          setActiveConversationId(newConvId);
        }
      } else if (!activeConversationId && convs.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
        // Default buka percakapan pertama pada desktop jika belum terpilih
        setActiveConversationId(convs[0].id);
      }
    } catch (err) {
      console.error('[AdminMessagesPage] Gagal memuat data obrolan:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, searchParams]);

  useEffect(() => {
    loadInitialData();
    adminChatService.startHeartbeat();
  }, [loadInitialData]);

  // 2. Muat riwayat pesan saat activeConversationId berubah
  useEffect(() => {
    if (!activeConversationId) {
      setActiveMessages([]);
      return;
    }

    let isMounted = true;
    const fetchMessages = async () => {
      try {
        const msgs = await adminChatService.getMessages(activeConversationId, currentUserId);
        if (isMounted) {
          setActiveMessages(msgs);
        }
        // Tandai sebagai telah dibaca
        await adminChatService.markAsRead(activeConversationId);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversationId ? { ...c, unreadCount: 0 } : c))
        );
      } catch (err) {
        console.error('[AdminMessagesPage] Gagal memuat riwayat pesan:', err);
      }
    };

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [activeConversationId, currentUserId]);

  // 3. Realtime WebSocket subscription via Laravel Echo (Reverb)
  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    // Listen on user channel untuk memperbarui daftar percakapan & unread counter
    let userChannel = null;
    if (currentUserId && !isNaN(Number(currentUserId))) {
      userChannel = echo.private(`user.${currentUserId}`);
      userChannel.listen('.ChatMessageSent', async () => {
        try {
          const updated = await adminChatService.getConversations(currentUserId);
          setConversations(updated);
        } catch (err) {
          // ignore
        }
      });
    }

    // Listen on active conversation channel untuk pesan masuk & indikator mengetik secara instan
    let convChannel = null;
    if (activeConversationId && !isNaN(Number(activeConversationId))) {
      convChannel = echo.private(`conversation.${activeConversationId}`);
      convChannel.listen('.ChatMessageSent', (event) => {
        if (event?.message) {
          const incoming = {
            id: String(event.message.id || event.message.id_message),
            conversationId: String(activeConversationId),
            senderId: String(event.message.sender_id || event.message.id_sender),
            senderName: event.message.sender_name || event.message.senderName || 'Pengguna',
            text: event.message.message || event.message.text || '',
            timestamp: formatTime(event.message.created_at || event.message.createdAt),
            createdAt: event.message.created_at || event.message.createdAt,
            isOutgoing: Boolean(event.message.isOutgoing ?? event.message.is_outgoing) || (currentUserId ? String(event.message.sender_id || event.message.id_sender) === String(currentUserId) : false),
            status: event.message.status || (String(event.message.sender_id || event.message.id_sender) === String(currentUserId) ? 'sent' : 'delivered'),
            attachment: event.message.attachments?.[0] ? {
              id: event.message.attachments[0].id || event.message.attachments[0].id_attachment,
              name: event.message.attachments[0].file_name || event.message.attachments[0].fileName,
              size: event.message.attachments[0].fileSize || formatFileSize(event.message.attachments[0].file_size),
              type: event.message.attachments[0].file_type || event.message.attachments[0].fileType,
              url: event.message.attachments[0].url,
            } : null,
          };

          setActiveMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          setIsTyping(false);

          // Otomatis tandai telah dibaca jika thread sedang aktif
          adminChatService.markAsRead(activeConversationId);
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConversationId ? { ...c, unreadCount: 0 } : c))
          );
        }
      });

      // Sinyal pengetikan cepat via Client Whisper
      convChannel.listenForWhisper('typing', (event) => {
        if (event?.userId && String(event.userId) !== String(currentUserId)) {
          if (event.isTyping !== false) {
            setIsTyping(true);
            if (event.userName) setTypingUserName(event.userName);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setIsTyping(false);
            }, 3500);
          } else {
            setIsTyping(false);
          }
        }
      });

      // Sinyal pengetikan via backend broadcast UserTyping
      convChannel.listen('.UserTyping', (event) => {
        if (event?.userId && String(event.userId) !== String(currentUserId)) {
          if (event.isTyping) {
            setIsTyping(true);
            if (event.userName) setTypingUserName(event.userName);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setIsTyping(false);
            }, 3500);
          } else {
            setIsTyping(false);
          }
        }
      });

      // Sinyal saat pesan telah dibaca oleh lawan bicara (WhatsApp Blue Checkmarks)
      convChannel.listen('.MessagesRead', (event) => {
        setActiveMessages((prev) =>
          prev.map((m) => (m.isOutgoing ? { ...m, status: 'read', isRead: true } : m))
        );
      });

      // Update pesan saat diedit realtime
      convChannel.listen('.ChatMessageUpdated', (event) => {
        if (event?.message) {
          const raw = event.message;
          const msgId = String(raw.id || raw.id_message);
          setActiveMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? {
                    ...m,
                    text: raw.message || raw.text || m.text,
                    isEdited: true,
                  }
                : m
            )
          );
        }
      });

      // Update pesan saat dihapus realtime
      convChannel.listen('.ChatMessageDeleted', (event) => {
        const deletedId = String(event.message_id || event.message?.id || event.message?.id_message);
        setActiveMessages((prev) =>
          prev.map((m) =>
            m.id === deletedId
              ? {
                  ...m,
                  text: 'Pesan telah dihapus',
                  isDeleted: true,
                  attachment: null,
                }
              : m
          )
        );
      });
    }

    // Presence channel 'online' untuk mendeteksi status user online realtime
    const presenceChannel = echo.join('online');
    presenceChannel.here((users) => {
      const onlineIds = new Set(users.map((u) => String(u.id || u.id_user)));
      setConversations((prev) =>
        prev.map((c) => {
          const isOnline = onlineIds.has(String(c.userId));
          return {
            ...c,
            isOnline,
            lastSeen: isOnline ? 'Online' : c.lastSeen,
          };
        })
      );
      setDirectoryUsers((prev) =>
        prev.map((u) => {
          const isOnline = onlineIds.has(String(u.id));
          return {
            ...u,
            isOnline,
            lastSeen: isOnline ? 'Online' : u.lastSeen,
          };
        })
      );
    });

    presenceChannel.joining((u) => {
      const uid = String(u.id || u.id_user);
      setConversations((prev) =>
        prev.map((c) => {
          if (String(c.userId) === uid) {
            return { ...c, isOnline: true, lastSeen: 'Online' };
          }
          return c;
        })
      );
      setDirectoryUsers((prev) =>
        prev.map((u) => {
          if (String(u.id) === uid) {
            return { ...u, isOnline: true, lastSeen: 'Online' };
          }
          return u;
        })
      );
      // Jika lawan bicara yang sedang dibuka bergabung online, pesan outgoing status 'sent' berubah ke 'delivered'
      setActiveMessages((prev) =>
        prev.map((m) => {
          if (m.isOutgoing && m.status === 'sent') {
            return { ...m, status: 'delivered' };
          }
          return m;
        })
      );
    });

    presenceChannel.leaving((u) => {
      const uid = String(u.id || u.id_user);
      setConversations((prev) =>
        prev.map((c) => {
          if (String(c.userId) === uid) {
            return { ...c, isOnline: false, lastSeen: 'Baru saja' };
          }
          return c;
        })
      );
      setDirectoryUsers((prev) =>
        prev.map((u) => {
          if (String(u.id) === uid) {
            return { ...u, isOnline: false, lastSeen: 'Baru saja' };
          }
          return u;
        })
      );
    });

    return () => {
      if (convChannel && activeConversationId) {
        convChannel.stopListening('.ChatMessageSent');
        convChannel.stopListeningForWhisper('typing');
        convChannel.stopListening('.UserTyping');
        convChannel.stopListening('.MessagesRead');
        convChannel.stopListening('.ChatMessageUpdated');
        convChannel.stopListening('.ChatMessageDeleted');
      }
      if (userChannel && currentUserId) {
        userChannel.stopListening('.ChatMessageSent');
      }
      if (presenceChannel) {
        echo.leave('online');
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUserId, activeConversationId]);

  // 4. Fallback Polling adaptif setiap 10 detik
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        try {
          const convs = await adminChatService.getConversations(currentUserId);
          setConversations(convs);

          if (activeConversationId) {
            const msgs = await adminChatService.getMessages(activeConversationId, currentUserId);
            setActiveMessages(msgs);
          }
        } catch (err) {
          // ignore silent error
        }
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [currentUserId, activeConversationId]);

  // 5. Handler memilih percakapan
  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  // 6. Handler kirim pesan baru (teks dan/atau berkas)
  const handleSendMessage = async (text, file) => {
    if (!activeConversationId) return;

    try {
      setIsSending(true);
      const activeConv = conversations.find((c) => c.id === activeConversationId);
      const isRecipientOnline = Boolean(activeConv?.isOnline);

      const sentMsg = await adminChatService.sendMessage(
        activeConversationId,
        text,
        file,
        currentUserId,
        currentUserName,
        isRecipientOnline
      );

      setActiveMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });

      // Perbarui daftar percakapan agar thread pindah ke atas
      const updatedConvs = await adminChatService.getConversations(currentUserId);
      setConversations(updatedConvs);
    } catch (err) {
      console.error('[AdminMessagesPage] Gagal mengirim pesan:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!activeConversationId) return;
    try {
      const updated = await adminChatService.editMessage(activeConversationId, messageId, newText);
      setActiveMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, text: updated?.text || newText, isEdited: true } : m))
      );
    } catch (err) {
      console.error('[AdminMessagesPage] Gagal mengedit pesan:', err);
      throw err;
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeConversationId) return;
    try {
      await adminChatService.deleteMessage(activeConversationId, messageId);
      setActiveMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, text: 'Pesan telah dihapus', isDeleted: true, attachment: null }
            : m
        )
      );
    } catch (err) {
      console.error('[AdminMessagesPage] Gagal menghapus pesan:', err);
      throw err;
    }
  };

  // 7. Handler memulai percakapan baru dengan user resmi dari direktori
  const handleNewConversation = async (recipientId, initialMsg) => {
    try {
      setIsLoading(true);
      const convId = await adminChatService.getOrCreateConversation(recipientId, initialMsg);
      const updatedConvs = await adminChatService.getConversations(currentUserId);
      setConversations(updatedConvs);
      setActiveConversationId(convId);
    } catch (err) {
      console.error('[AdminMessagesPage] Gagal membuka percakapan baru:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Gabungkan percakapan aktif dengan riwayat pesannya
  const selectedConvObj = conversations.find((c) => c.id === activeConversationId);
  const activeConversation = selectedConvObj
    ? { ...selectedConvObj, messages: activeMessages }
    : null;

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-white">
      {/* Left Sidebar: Conversation List */}
      <div
        className={`
          w-full md:w-80 lg:w-96 shrink-0 h-full flex flex-col border-r border-slate-200 transition-all duration-200
          ${activeConversationId ? 'hidden md:flex' : 'flex'}
        `}
      >
        <ConversationListPanel
          conversations={conversations}
          directoryUsers={directoryUsers}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />
      </div>

      {/* Right Canvas: Chat Window or Empty State */}
      <div
        className={`
          flex-1 h-full flex flex-col min-w-0 bg-slate-50 transition-all duration-200
          ${!activeConversationId ? 'hidden md:flex' : 'flex'}
        `}
      >
        {activeConversation ? (
          <ChatWindowPanel
            conversation={activeConversation}
            isTyping={isTyping}
            typingUserName={typingUserName}
            onTyping={(typing) => {
              if (activeConversationId) {
                adminChatService.sendTyping(activeConversationId, typing, currentUserId);
              }
            }}
            onSendMessage={handleSendMessage}
            onBackMobile={() => setActiveConversationId(null)}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            currentUserId={currentUserId}
          />
        ) : (
          <EmptyChatState />
        )}
      </div>
    </div>
  );
};

export default AdminMessagesPage;

