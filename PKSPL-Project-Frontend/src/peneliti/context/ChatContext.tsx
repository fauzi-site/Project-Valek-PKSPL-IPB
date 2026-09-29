import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Conversation, ChatMessage } from '../mock/chatMock';
import { chatService, ChatEvent, ChatDirectoryUser } from '../services/chatService';
import { useAuth } from '../../contexts/AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  directoryUsers: ChatDirectoryUser[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  totalUnreadCount: number;
  isLoading: boolean;
  error: string | null;
  typingMap: Record<string, boolean>; // convId -> is typing
  selectConversation: (id: string | null) => void;
  sendTyping: (isTyping: boolean) => void;
  sendMessage: (
    text: string,
    attachment?: { name: string; type: 'file' | 'image' | 'shp'; size: string; url?: string; file?: File }
  ) => Promise<void>;
  uploadAttachment: (
    file: File,
    type: 'file' | 'shp' | 'image',
    onProgress?: (percent: number) => void
  ) => Promise<{ name: string; type: 'file' | 'shp' | 'image'; size: string; url?: string; file?: File }>;
  createNewConversation: (
    name: string,
    role: 'SuperAdmin' | string,
    projectCode: string,
    initialMsg: string,
    recipientId?: string | number
  ) => Promise<void>;
  simulateIncomingMessage: (targetConvId?: string) => void;
  retrySendMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newText: string, targetConvId?: string) => Promise<void>;
  deleteMessage: (messageId: string, targetConvId?: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth() || {};
  const currentUserId = user?.id || user?.id_user;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<ChatDirectoryUser[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const [totalUnreadCount, setTotalUnreadCount] = useState<number>(0);

  // Sync current user ID into chatService
  useEffect(() => {
    chatService.setCurrentUserId(currentUserId);
  }, [currentUserId]);

  // Load initial conversations & directory users
  const loadInitialData = useCallback(async () => {
    if (!currentUserId) {
      setConversations([]);
      setDirectoryUsers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [convs, dir] = await Promise.all([
        chatService.getConversations(currentUserId),
        chatService.getDirectoryUsers(),
      ]);

      setConversations(convs);
      chatService.updateConversationsPresence();
      setDirectoryUsers(dir);
      setTotalUnreadCount(chatService.getTotalUnreadCount());

      // Auto-select first conversation on desktop if none selected
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setActiveConversationId((prev) => prev || (convs.length > 0 ? convs[0].id : null));
      }
    } catch (err: any) {
      console.warn('[ChatContext] Gagal memuat data awal:', err);
      setError(err.message || 'Gagal memuat percakapan.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }
    loadInitialData();
  }, [currentUserId, loadInitialData]);

  // Subscribe to real-time events from chatService
  useEffect(() => {
    const unsubscribe = chatService.subscribe((event: ChatEvent) => {
      if (event.conversations) {
        setConversations([...event.conversations]);
      }

      if (typeof event.totalUnread === 'number') {
        setTotalUnreadCount(event.totalUnread);
      } else {
        setTotalUnreadCount(chatService.getTotalUnreadCount());
      }

      if (event.type === 'TYPING_START' && event.conversationId) {
        setTypingMap((prev) => ({ ...prev, [event.conversationId!]: true }));
      } else if (event.type === 'TYPING_STOP' && event.conversationId) {
        setTypingMap((prev) => ({ ...prev, [event.conversationId!]: false }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // When active conversation changes: fetch messages & setup Echo listener & mark as read
  useEffect(() => {
    if (!activeConversationId) {
      chatService.listenToConversation(null);
      return;
    }

    let isMounted = true;
    chatService.listenToConversation(activeConversationId);

    const loadMessages = async () => {
      try {
        const msgs = await chatService.getMessages(activeConversationId, currentUserId);
        if (isMounted) {
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConversationId ? { ...c, messages: msgs, unreadCount: 0 } : c))
          );
        }
        await chatService.markAsRead(activeConversationId);
        setTotalUnreadCount(chatService.getTotalUnreadCount());
      } catch (err) {
        console.warn(`[ChatContext] Gagal memuat pesan #${activeConversationId}:`, err);
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [activeConversationId, currentUserId]);

  // Polling fallback every 10 seconds if visible
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        try {
          const convs = await chatService.getConversations(currentUserId);
          setConversations(convs);
          setTotalUnreadCount(chatService.getTotalUnreadCount());

          if (activeConversationId) {
            const msgs = await chatService.getMessages(activeConversationId, currentUserId);
            setConversations((prev) =>
              prev.map((c) => (c.id === activeConversationId ? { ...c, messages: msgs } : c))
            );
          }
        } catch {
          // ignore
        }
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [currentUserId, activeConversationId]);

  // Select conversation handler
  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
    if (id) {
      chatService.markAsRead(id);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
      setTotalUnreadCount(chatService.getTotalUnreadCount());
    }
  }, []);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // Send message handler
  const sendMessage = useCallback(
    async (
      text: string,
      attachment?: { name: string; type: 'file' | 'image' | 'shp'; size: string; url?: string; file?: File }
    ) => {
      if (!activeConversationId) return;

      try {
        setError(null);
        await chatService.sendMessage(activeConversationId, text, attachment, currentUserId);
        const updated = await chatService.getConversations(currentUserId);
        setConversations(updated);
      } catch (err: any) {
        setError(err.message || 'Gagal mengirim pesan.');
        throw err;
      }
    },
    [activeConversationId, currentUserId]
  );

  // Upload attachment handler
  const uploadAttachment = useCallback(
    async (
      file: File,
      type: 'file' | 'shp' | 'image',
      onProgress?: (percent: number) => void
    ) => {
      try {
        setError(null);
        return await chatService.uploadAttachment(file, type, onProgress);
      } catch (err: any) {
        setError(err.message || 'Gagal mengunggah lampiran.');
        throw err;
      }
    },
    []
  );

  // Create new conversation handler
  const createNewConversation = useCallback(
    async (
      name: string,
      role: 'SuperAdmin' | string,
      projectCode: string,
      initialMsg: string,
      recipientId?: string | number
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        let targetId = recipientId;
        if (!targetId) {
          // Cari di directoryUsers berdasarkan nama
          const matched = directoryUsers.find(
            (u) => u.nama.toLowerCase().includes(name.toLowerCase()) || (u.role === role && u.nama)
          );
          if (matched) {
            targetId = matched.id;
          }
        }

        let convId: string;
        if (targetId) {
          convId = await chatService.getOrCreateConversation(targetId, initialMsg);
        } else {
          const newConv = await chatService.createNewConversation(name, role, projectCode, initialMsg);
          convId = newConv.id;
        }

        const updated = await chatService.getConversations(currentUserId);
        setConversations(updated);
        setActiveConversationId(convId);
        setTotalUnreadCount(chatService.getTotalUnreadCount());
      } catch (err: any) {
        setError(err.message || 'Gagal membuka percakapan baru.');
      } finally {
        setIsLoading(false);
      }
    },
    [directoryUsers, currentUserId]
  );

  // Trigger simulated incoming message
  const simulateIncomingMessage = useCallback((targetConvId?: string) => {
    chatService.triggerIncomingMessageSimulation(targetConvId);
  }, []);

  // Retry sending message
  const retrySendMessage = useCallback(
    async (messageId: string) => {
      if (!activeConversation) return;
      const failedMsg = activeConversation.messages.find((m) => m.id === messageId);
      if (!failedMsg) return;

      try {
        await chatService.sendMessage(activeConversation.id, failedMsg.text, failedMsg.attachment, currentUserId);
      } catch (err: any) {
        setError(err.message || 'Gagal mengirim ulang pesan.');
      }
    },
    [activeConversation, currentUserId]
  );

  const editMessage = useCallback(
    async (messageId: string, newText: string, targetConvId?: string) => {
      const convId = targetConvId || activeConversationId;
      if (!convId) return;
      try {
        setError(null);
        await chatService.editMessage(convId, messageId, newText);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, text: newText.trim(), isEdited: true } : m
                  ),
                }
              : c
          )
        );
      } catch (err: any) {
        setError(err.message || 'Gagal mengubah pesan.');
        throw err;
      }
    },
    [activeConversationId]
  );

  const deleteMessage = useCallback(
    async (messageId: string, targetConvId?: string) => {
      const convId = targetConvId || activeConversationId;
      if (!convId) return;
      try {
        setError(null);
        await chatService.deleteMessage(convId, messageId);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId
                      ? { ...m, text: 'Pesan telah dihapus', isDeleted: true, attachment: undefined }
                      : m
                  ),
                }
              : c
          )
        );
      } catch (err: any) {
        setError(err.message || 'Gagal menghapus pesan.');
        throw err;
      }
    },
    [activeConversationId]
  );

  const refreshConversations = useCallback(async () => {
    const convs = await chatService.getConversations(currentUserId);
    setConversations(convs);
    setTotalUnreadCount(chatService.getTotalUnreadCount());
  }, [currentUserId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (activeConversationId) {
        chatService.sendTyping(activeConversationId, isTyping);
      }
    },
    [activeConversationId]
  );

  return (
    <ChatContext.Provider
      value={{
        conversations,
        directoryUsers,
        activeConversationId,
        activeConversation,
        totalUnreadCount,
        isLoading,
        error,
        typingMap,
        selectConversation,
        sendTyping,
        sendMessage,
        uploadAttachment,
        createNewConversation,
        simulateIncomingMessage,
        retrySendMessage,
        editMessage,
        deleteMessage,
        refreshConversations,
        clearError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
