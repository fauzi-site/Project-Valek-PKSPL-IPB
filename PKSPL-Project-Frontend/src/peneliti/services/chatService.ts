import { Conversation, ChatMessage, RESEARCHER_INITIAL_CONVERSATIONS } from '../mock/chatMock';
import { apiClient } from '../../services/apiClient';
import { getEcho } from '../../lib/echo';

export type ChatEventType =
  | 'MESSAGE_SENT'
  | 'MESSAGE_DELIVERED'
  | 'MESSAGE_READ'
  | 'MESSAGES_READ'
  | 'MESSAGE_RECEIVED'
  | 'MESSAGE_UPDATED'
  | 'MESSAGE_DELETED'
  | 'TYPING_START'
  | 'TYPING_STOP'
  | 'CONVERSATIONS_UPDATED'
  | 'UNREAD_COUNT_CHANGED'
  | 'USER_STATUS_CHANGED'
  | 'PRESENCE_CHANGED';

export interface ChatEvent {
  type: ChatEventType;
  conversationId?: string;
  message?: ChatMessage;
  userId?: string;
  isOnline?: boolean;
  totalUnread?: number;
  conversations?: Conversation[];
  onlineUserIds?: Set<string>;
}

export type ChatEventListener = (event: ChatEvent) => void;

export interface ChatDirectoryUser {
  id: string;
  nama: string;
  email: string;
  role: string;
  isOnline: boolean;
  lastSeen: string;
  userAvatarBg: string;
  userInitials: string;
  associatedProjects?: Array<{ code: string; name: string }>;
}

export const getAvatarBg = (role?: string): string => {
  const r = (role || '').toLowerCase();
  if (r.includes('peneliti')) return 'from-blue-600 to-indigo-600';
  if (r.includes('admin') || r.includes('superadmin') || r.includes('super admin')) return 'from-purple-600 to-indigo-600';
  return 'from-slate-600 to-slate-800';
};

export const getInitials = (name?: string): string => {
  if (!name) return 'U';
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  );
};

export const formatTime = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatLastSeen = (val: any, isOnline: boolean): string => {
  if (isOnline) return 'Online';
  if (!val) return 'Offline';
  if (val === 'Online' || val === 'online') return 'Online';
  try {
    const date = new Date(val);
    if (isNaN(date.getTime())) return String(val);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    const isToday = now.toDateString() === date.toDateString();
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (isToday) return `Hari ini pukul ${timeStr}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === date.toDateString()) return `Kemarin pukul ${timeStr}`;
    return `${date.getDate()} ${date.toLocaleString('id-ID', { month: 'short' })} pukul ${timeStr}`;
  } catch {
    return String(val);
  }
};

class ChatService {
  private conversations: Conversation[] = [];
  private currentUserId: string | null = null;
  private listeners: Set<ChatEventListener> = new Set();
  private userEchoChannel: any = null;
  private convEchoChannel: any = null;
  private activeListeningConvId: string | null = null;
  private presenceChannel: any = null;
  public onlineUserIds: Set<string> = new Set();
  private heartbeatTimer: any = null;

  public setCurrentUserId(userId: string | number | null) {
    this.currentUserId = userId ? String(userId) : null;
    this.setupUserEchoListener();
    this.initPresence();
    this.startHeartbeat();
  }

  public initPresence() {
    const echo = getEcho();
    if (!echo || this.presenceChannel) return;

    try {
      this.presenceChannel = echo.join('online');
      this.presenceChannel.here((users: any[]) => {
        this.onlineUserIds = new Set(users.map((u) => String(u.id || u.id_user)));
        this.updateConversationsPresence();
        this.emit({ type: 'PRESENCE_CHANGED', onlineUserIds: this.onlineUserIds, conversations: this.conversations });
      });

      this.presenceChannel.joining((user: any) => {
        const uid = String(user.id || user.id_user);
        this.onlineUserIds.add(uid);
        this.updateConversationsPresence();
        this.emit({ type: 'PRESENCE_CHANGED', onlineUserIds: this.onlineUserIds, userId: uid, conversations: this.conversations });
      });

      this.presenceChannel.leaving((user: any) => {
        const uid = String(user.id || user.id_user);
        this.onlineUserIds.delete(uid);
        this.updateConversationsPresence();
        this.emit({ type: 'PRESENCE_CHANGED', onlineUserIds: this.onlineUserIds, userId: uid, conversations: this.conversations });
      });
    } catch (err) {
      console.warn('[ChatService] Gagal join presence channel:', err);
    }
  }

  public updateConversationsPresence() {
    let changed = false;
    this.conversations.forEach((conv) => {
      const isOnlineNow = this.onlineUserIds.has(String(conv.userId));
      if (conv.isOnline !== isOnlineNow) {
        conv.isOnline = isOnlineNow;
        if (isOnlineNow) {
          conv.lastSeen = 'Online';
          // Lawan bicara online: update pesan terkirim 'sent' menjadi 'delivered'
          conv.messages = conv.messages.map((m) =>
            m.isOutgoing && m.status === 'sent' ? { ...m, status: 'delivered' as const } : m
          );
        } else {
          conv.lastSeen = 'Baru saja';
        }
        changed = true;
      }
    });
  }

  public startHeartbeat() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        apiClient.post('/chat/heartbeat').catch(() => {});
      }
    }, 45000);
  }

  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  public subscribe(listener: ChatEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: ChatEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[ChatService] Listener callback error:', err);
      }
    });
  }

  /**
   * Menyiapkan listener Echo pada private user channel (user.{id})
   */
  private setupUserEchoListener() {
    const echo = getEcho();
    if (!echo || !this.currentUserId || isNaN(Number(this.currentUserId))) {
      return;
    }

    if (this.userEchoChannel) {
      try {
        this.userEchoChannel.stopListening('.ChatMessageSent');
      } catch {
        // ignore
      }
    }

    try {
      this.userEchoChannel = echo.private(`user.${this.currentUserId}`);
      this.userEchoChannel.listen('.ChatMessageSent', async () => {
        try {
          await this.getConversations();
        } catch {
          // ignore
        }
      });
    } catch (err) {
      console.warn('[ChatService] Gagal setup user echo listener:', err);
    }
  }

  /**
   * Menyiapkan listener Echo pada private conversation channel (conversation.{id})
   */
  public listenToConversation(conversationId: string | null) {
    const echo = getEcho();
    if (!echo) return;

    if (this.convEchoChannel && this.activeListeningConvId) {
      try {
        this.convEchoChannel.stopListening('.ChatMessageSent');
        this.convEchoChannel.stopListeningForWhisper('typing');
        this.convEchoChannel.stopListening('.UserTyping');
        this.convEchoChannel.stopListening('.MessagesRead');
        this.convEchoChannel.stopListening('.ChatMessageUpdated');
        this.convEchoChannel.stopListening('.ChatMessageDeleted');
      } catch {
        // ignore
      }
      this.convEchoChannel = null;
      this.activeListeningConvId = null;
    }

    if (!conversationId || isNaN(Number(conversationId))) return;

    try {
      this.activeListeningConvId = String(conversationId);
      this.convEchoChannel = echo.private(`conversation.${conversationId}`);
      this.convEchoChannel.listen('.ChatMessageSent', (event: any) => {
        if (event?.message) {
          const raw = event.message;
          const senderId = String(raw.sender_id || raw.id_sender || raw.senderId || '');
          const isOutgoing = this.currentUserId ? senderId === String(this.currentUserId) : false;

          let attachment: any = undefined;
          const firstAtt = raw.attachments?.[0];
          if (firstAtt) {
            const rawType = (firstAtt.file_type || firstAtt.fileType || '').toLowerCase();
            let attType: 'file' | 'image' | 'shp' = 'file';
            if (rawType.includes('shp') || rawType.includes('spatial')) attType = 'shp';
            else if (rawType.includes('image') || rawType.includes('jpg') || rawType.includes('png')) attType = 'image';

            attachment = {
              name: firstAtt.file_name || firstAtt.fileName || 'Lampiran',
              type: attType,
              size: formatFileSize(firstAtt.file_size || firstAtt.fileSize),
              url: firstAtt.url,
            };
          }

          const rawStatus = (raw.status as any) || (isOutgoing ? 'sent' : 'read');

          const incomingMsg: ChatMessage = {
            id: String(raw.id || raw.id_message),
            senderId,
            senderName: raw.sender_name || raw.senderName || 'Pengguna',
            text: raw.message || raw.text || '',
            timestamp: formatTime(raw.created_at || raw.createdAt),
            isOutgoing,
            status: rawStatus,
            attachment,
          };

          // Append to conversation
          const conv = this.conversations.find((c) => c.id === String(conversationId));
          if (conv) {
            if (!conv.messages.some((m) => m.id === incomingMsg.id)) {
              conv.messages = [...conv.messages, incomingMsg];
            }
            conv.lastMessageSnippet = incomingMsg.text || (attachment ? '📎 Lampiran' : '');
            conv.lastMessageTime = incomingMsg.timestamp;
            if (isOutgoing) {
              conv.unreadCount = 0;
            }
          }

          this.emit({
            type: 'MESSAGE_RECEIVED',
            conversationId: String(conversationId),
            message: incomingMsg,
            conversations: [...this.conversations],
            totalUnread: this.getTotalUnreadCount(),
          });

          // Hentikan indikator mengetik seketika saat pesan baru tiba
          this.emit({
            type: 'TYPING_STOP',
            conversationId: String(conversationId),
          });

          // Tandai telah dibaca otomatis karena layar chat sedang aktif
          this.markAsRead(String(conversationId)).catch(() => {});
        }
      });

      // 2. Listen for client whisper typing indicator
      this.convEchoChannel.listenForWhisper('typing', (event: any) => {
        this.handleIncomingTyping(String(conversationId), event);
      });

      // 3. Listen for server broadcast UserTyping event
      this.convEchoChannel.listen('.UserTyping', (event: any) => {
        this.handleIncomingTyping(String(conversationId), event);
      });

      // 4. Listen for server broadcast MessagesRead event
      this.convEchoChannel.listen('.MessagesRead', (event: any) => {
        const conv = this.conversations.find((c) => c.id === String(conversationId));
        if (conv) {
          conv.messages = conv.messages.map((m) =>
            m.isOutgoing ? { ...m, status: 'read' as const } : m
          );
        }
        this.emit({
          type: 'MESSAGES_READ',
          conversationId: String(conversationId),
          conversations: [...this.conversations],
        });
      });

      // 5. Listen for server broadcast ChatMessageUpdated event
      this.convEchoChannel.listen('.ChatMessageUpdated', (event: any) => {
        const raw = event?.message;
        if (!raw) return;
        const msgId = String(raw.id || raw.id_message);
        const conv = this.conversations.find((c) => c.id === String(conversationId));
        if (conv) {
          conv.messages = conv.messages.map((m) => {
            if (m.id === msgId) {
              return {
                ...m,
                text: raw.message || raw.text || m.text,
                isEdited: true,
              };
            }
            return m;
          });
        }
        this.emit({
          type: 'MESSAGE_UPDATED',
          conversationId: String(conversationId),
          message: {
            id: msgId,
            text: raw.message || raw.text,
            isEdited: true,
          } as any,
          conversations: [...this.conversations],
        });
      });

      // 6. Listen for server broadcast ChatMessageDeleted event
      this.convEchoChannel.listen('.ChatMessageDeleted', (event: any) => {
        const msgId = String(event.message_id || event.message?.id || event.message?.id_message);
        const conv = this.conversations.find((c) => c.id === String(conversationId));
        if (conv) {
          conv.messages = conv.messages.map((m) => {
            if (m.id === msgId) {
              return {
                ...m,
                text: 'Pesan telah dihapus',
                isDeleted: true,
                attachment: undefined,
              };
            }
            return m;
          });
        }
        this.emit({
          type: 'MESSAGE_DELETED',
          conversationId: String(conversationId),
          message: {
            id: msgId,
            text: 'Pesan telah dihapus',
            isDeleted: true,
          } as any,
          conversations: [...this.conversations],
        });
      });
    } catch (err) {
      console.warn('[ChatService] Gagal setup conversation echo listener:', err);
    }
  }

  private typingTimeouts: Map<string, any> = new Map();

  private handleIncomingTyping(conversationId: string, event: any) {
    const senderId = String(event.userId || event.user_id || event.id || '');
    if (this.currentUserId && senderId === String(this.currentUserId)) {
      return;
    }

    const isTyping = Boolean(event.isTyping ?? event.is_typing);

    // Hapus timer auto-reset sebelumnya jika ada
    if (this.typingTimeouts.has(conversationId)) {
      clearTimeout(this.typingTimeouts.get(conversationId));
      this.typingTimeouts.delete(conversationId);
    }

    if (isTyping) {
      this.emit({
        type: 'TYPING_START',
        conversationId,
        userId: senderId,
      });

      // Hilangkan otomatis setelah 3.5 detik jika tidak ada event baru
      const timeout = setTimeout(() => {
        this.emit({
          type: 'TYPING_STOP',
          conversationId,
          userId: senderId,
        });
        this.typingTimeouts.delete(conversationId);
      }, 3500);

      this.typingTimeouts.set(conversationId, timeout);
    } else {
      this.emit({
        type: 'TYPING_STOP',
        conversationId,
        userId: senderId,
      });
    }
  }

  /**
   * Mengirimkan status sedang mengetik ke lawan bicara
   */
  public async sendTyping(conversationId: string, isTyping: boolean = true) {
    if (!conversationId || isNaN(Number(conversationId))) return;

    // 1. Whisper instan lewat WebSocket
    if (this.convEchoChannel) {
      try {
        this.convEchoChannel.whisper('typing', {
          userId: this.currentUserId,
          isTyping,
        });
      } catch {
        // ignore
      }
    }

    // 2. Broadcast via API backend
    try {
      await apiClient.post(`/conversations/${conversationId}/typing`, {
        is_typing: isTyping,
      });
    } catch {
      // ignore
    }
  }

  /**
   * Mengambil daftar percakapan pengguna yang sedang login dari database
   */
  public async getConversations(userId?: string | null): Promise<Conversation[]> {
    const uid = userId ? String(userId) : this.currentUserId;
    if (uid) this.currentUserId = uid;

    try {
      const res = await apiClient.get<any>('/conversations');
      if (res && Array.isArray(res.data)) {
        const mapped: Conversation[] = res.data.map((item: any) => {
          const other = item.otherUser || item.other_user || item.researcher || {};
          const otherName = other.name || other.nama || item.userName || item.title || 'Pengguna';
          const otherRoleRaw = other.role || item.userRole || 'Super Admin';
          const roleName =
            otherRoleRaw === 'Admin' || otherRoleRaw === 'Super Admin' || otherRoleRaw === 'Administrator'
              ? 'SuperAdmin'
              : (otherRoleRaw as any);

          const existingConv = this.conversations.find((c) => c.id === String(item.id || item.id_conversation));

          const lastMsg = item.lastMessage || item.last_message;
          const snippet =
            item.lastMessageSnippet ||
            (lastMsg ? (lastMsg.message || lastMsg.text || (lastMsg.attachments?.length ? '📎 Mengirim lampiran' : '')) : '');
          const time = item.lastMessageTime || (lastMsg ? formatTime(lastMsg.created_at || lastMsg.createdAt) : '');

          return {
            id: String(item.id || item.id_conversation),
            userId: String(other.id || other.id_user || item.userId || item.researcherId || ''),
            userName: otherName,
            userRole: roleName,
            userAvatarBg: item.userAvatarBg || getAvatarBg(roleName),
            userInitials: item.userInitials || getInitials(otherName),
            isOnline: Boolean(item.isOnline ?? other.isOnline ?? other.is_online),
            lastSeen: item.lastSeen || other.lastSeen || 'Offline',
            projectCode: item.projectCode || item.project?.code || 'PKS-994KY1',
            projectName: item.projectName || item.project?.name || 'Proyek PKSPL',
            unreadCount: Number(item.unreadCount ?? item.unread_count ?? 0),
            lastMessageSnippet: snippet,
            lastMessageTime: time,
            messages: existingConv ? existingConv.messages : [],
          };
        });

        this.conversations = mapped;
        this.emit({
          type: 'CONVERSATIONS_UPDATED',
          conversations: [...this.conversations],
          totalUnread: this.getTotalUnreadCount(),
        });
        return mapped;
      }
    } catch (err) {
      console.warn('[ChatService] Gagal memuat percakapan dari API backend:', err);
      if (this.conversations.length === 0) {
        this.conversations = JSON.parse(JSON.stringify(RESEARCHER_INITIAL_CONVERSATIONS));
      }
    }

    return this.conversations;
  }

  /**
   * Mengambil riwayat pesan percakapan dari database
   */
  public async getMessages(conversationId: string, userId?: string | null): Promise<ChatMessage[]> {
    const uid = userId ? String(userId) : this.currentUserId;
    if (uid) this.currentUserId = uid;

    try {
      const res = await apiClient.get<any>(`/conversations/${conversationId}/messages`, { per_page: 100 });
      if (res && Array.isArray(res.data)) {
        const msgs: ChatMessage[] = res.data.map((m: any) => {
          const senderId = String(m.senderId || m.sender_id || m.id_sender || '');
          const isOutgoing = typeof m.isOutgoing === 'boolean'
            ? m.isOutgoing
            : typeof m.is_outgoing === 'boolean'
            ? m.is_outgoing
            : (uid ? senderId === String(uid) : (m.senderRole === 'Peneliti'));
          const firstAtt = m.attachments?.[0];

          let attachment: any = undefined;
          if (firstAtt) {
            const rawType = (firstAtt.file_type || firstAtt.fileType || '').toLowerCase();
            let attType: 'file' | 'image' | 'shp' = 'file';
            if (rawType.includes('shp') || rawType.includes('spatial')) attType = 'shp';
            else if (rawType.includes('image') || rawType.includes('jpg') || rawType.includes('png')) attType = 'image';

            attachment = {
              name: firstAtt.file_name || firstAtt.fileName || 'Lampiran',
              type: attType,
              size: formatFileSize(firstAtt.file_size || firstAtt.fileSize),
              url: firstAtt.url,
            };
          }

          const isRead = Boolean(m.isRead ?? m.is_read);
          const rawStatus = (m.status as any) || (isRead ? 'read' : 'delivered');
          const isDeleted = Boolean(m.isDeleted ?? m.is_deleted);
          const isEdited = !isDeleted && Boolean(m.isEdited ?? m.is_edited);
          const messageText = isDeleted ? 'Pesan telah dihapus' : (m.text || m.message || '');

          return {
            id: String(m.id || m.id_message),
            senderId,
            senderName: m.senderName || m.sender_name || 'Pengguna',
            text: messageText,
            timestamp: formatTime(m.created_at || m.createdAt),
            isOutgoing,
            status: rawStatus,
            isEdited,
            isDeleted,
            attachment: isDeleted ? undefined : attachment,
          };
        });

        // Update cache pesan pada percakapan
        const convIndex = this.conversations.findIndex((c) => c.id === conversationId);
        if (convIndex !== -1) {
          this.conversations[convIndex].messages = msgs;
        }

        return msgs;
      }
    } catch (err) {
      console.warn(`[ChatService] Gagal memuat pesan #${conversationId}:`, err);
    }

    const cached = this.conversations.find((c) => c.id === conversationId);
    return cached ? cached.messages : [];
  }

  /**
   * Mengirim pesan (teks dan/atau berkas lampiran nyata) ke percakapan di backend
   */
  public async sendMessage(
    conversationId: string,
    text: string,
    attachment?: { name: string; type: 'file' | 'image' | 'shp'; size: string; url?: string; file?: File },
    userId?: string | null
  ): Promise<ChatMessage> {
    const uid = userId ? String(userId) : this.currentUserId;
    if (uid) this.currentUserId = uid;

    try {
      let res: any;
      if (attachment?.file) {
        const formData = new FormData();
        formData.append('file', attachment.file);
        if (text) formData.append('message', text);
        res = await apiClient.upload<any>(`/conversations/${conversationId}/messages`, formData);
      } else {
        res = await apiClient.post<any>(`/conversations/${conversationId}/messages`, {
          message: text,
          text: text,
        });
      }

      if (res && res.data) {
        const m = res.data;
        const firstAtt = m.attachments?.[0];
        let sentAtt: any = undefined;
        if (firstAtt) {
          const rawType = (firstAtt.file_type || firstAtt.fileType || '').toLowerCase();
          let attType: 'file' | 'image' | 'shp' = 'file';
          if (rawType.includes('shp') || rawType.includes('spatial')) attType = 'shp';
          else if (rawType.includes('image') || rawType.includes('jpg') || rawType.includes('png')) attType = 'image';

          sentAtt = {
            name: firstAtt.file_name || firstAtt.fileName || attachment?.name || 'Lampiran',
            type: attType,
            size: formatFileSize(firstAtt.file_size || firstAtt.fileSize) || attachment?.size || '1 MB',
            url: firstAtt.url || attachment?.url,
          };
        } else if (attachment) {
          sentAtt = {
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            url: attachment.url,
          };
        }

        const targetConv = this.conversations.find((c) => c.id === conversationId);
        const isRecipientOnline = targetConv?.isOnline || (targetConv?.userId && this.onlineUserIds.has(String(targetConv.userId)));
        const initialStatus: 'sent' | 'delivered' | 'read' = (m.status as any) || (isRecipientOnline ? 'delivered' : 'sent');

        const sentMessage: ChatMessage = {
          id: String(m.id || m.id_message),
          senderId: String(uid || m.sender_id || m.id_sender),
          senderName: m.sender_name || m.senderName || 'Peneliti',
          text: m.message || text,
          timestamp: formatTime(m.created_at || new Date().toISOString()),
          isOutgoing: true,
          status: initialStatus,
          attachment: sentAtt,
        };

        // Perbarui conversation
        const convIndex = this.conversations.findIndex((c) => c.id === conversationId);
        if (convIndex !== -1) {
          const c = this.conversations[convIndex];
          c.messages = [...c.messages.filter((msg) => msg.id !== sentMessage.id), sentMessage];
          c.lastMessageSnippet = text || (sentAtt ? '📎 Lampiran' : '');
          c.lastMessageTime = sentMessage.timestamp;
          c.unreadCount = 0;
        }

        this.emit({
          type: 'MESSAGE_SENT',
          conversationId,
          message: sentMessage,
          conversations: this.conversations,
          totalUnread: this.getTotalUnreadCount(),
        });

        return sentMessage;
      }
    } catch (err) {
      console.error(`[ChatService] Gagal mengirim pesan ke conv #${conversationId}:`, err);
      throw err;
    }

    // Local fallback
    const timeStr = formatTime(new Date().toISOString());
    const fallbackMsg: ChatMessage = {
      id: `local-msg-${Date.now()}`,
      senderId: String(uid || 'peneliti-me'),
      senderName: 'Peneliti',
      text,
      timestamp: timeStr,
      isOutgoing: true,
      status: 'delivered',
      attachment: attachment ? {
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        url: attachment.url,
      } : undefined,
    };

    const convIndex = this.conversations.findIndex((c) => c.id === conversationId);
    if (convIndex !== -1) {
      const c = this.conversations[convIndex];
      c.messages = [...c.messages, fallbackMsg];
      c.lastMessageSnippet = text;
      c.lastMessageTime = timeStr;
    }

    this.emit({
      type: 'MESSAGE_SENT',
      conversationId,
      message: fallbackMsg,
      conversations: this.conversations,
      totalUnread: this.getTotalUnreadCount(),
    });

    return fallbackMsg;
  }

  /**
   * Mengubah teks pesan milik sendiri
   * Terhubung ke PUT /api/v1/conversations/{conversation}/messages/{message}
   */
  public async editMessage(conversationId: string, messageId: string, text: string): Promise<ChatMessage> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Isi pesan tidak boleh kosong.');
    }

    try {
      const res = await apiClient.put<any>(`/conversations/${conversationId}/messages/${messageId}`, {
        message: trimmed,
        text: trimmed,
      });

      const updatedRaw = res?.data;
      const conv = this.conversations.find((c) => c.id === String(conversationId));
      if (conv) {
        conv.messages = conv.messages.map((m) =>
          m.id === String(messageId)
            ? { ...m, text: trimmed, isEdited: true }
            : m
        );
      }

      this.emit({
        type: 'MESSAGE_UPDATED',
        conversationId: String(conversationId),
        conversations: [...this.conversations],
      });

      return {
        id: String(messageId),
        senderId: String(this.currentUserId || updatedRaw?.sender_id || ''),
        senderName: updatedRaw?.sender_name || 'Peneliti',
        text: trimmed,
        timestamp: formatTime(updatedRaw?.created_at || new Date().toISOString()),
        isOutgoing: true,
        isEdited: true,
      };
    } catch (err: any) {
      console.error(`[ChatService] Gagal edit pesan #${messageId}:`, err);
      throw err;
    }
  }

  /**
   * Menghapus pesan milik sendiri (soft delete)
   * Terhubung ke DELETE /api/v1/conversations/{conversation}/messages/{message}
   */
  public async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    try {
      await apiClient.delete<any>(`/conversations/${conversationId}/messages/${messageId}`);

      const conv = this.conversations.find((c) => c.id === String(conversationId));
      if (conv) {
        conv.messages = conv.messages.map((m) =>
          m.id === String(messageId)
            ? { ...m, text: 'Pesan telah dihapus', isDeleted: true, attachment: undefined }
            : m
        );
      }

      this.emit({
        type: 'MESSAGE_DELETED',
        conversationId: String(conversationId),
        conversations: [...this.conversations],
      });
    } catch (err: any) {
      console.error(`[ChatService] Gagal delete pesan #${messageId}:`, err);
      throw err;
    }
  }

  /**
   * Menandai percakapan sebagai telah dibaca
   */
  public async markAsRead(conversationId: string): Promise<void> {
    try {
      await apiClient.post(`/conversations/${conversationId}/read`);
    } catch (err) {
      console.warn(`[ChatService] Gagal menandai baca conv #${conversationId}:`, err);
    }

    const conv = this.conversations.find((c) => c.id === conversationId);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      this.emit({
        type: 'UNREAD_COUNT_CHANGED',
        conversationId,
        totalUnread: this.getTotalUnreadCount(),
        conversations: this.conversations,
      });
    }
  }

  /**
   * Mengambil daftar kontak pengguna (Super Admin, Peneliti) dari database resmi
   */
  public async getDirectoryUsers(searchQuery: string = ''): Promise<ChatDirectoryUser[]> {
    try {
      const params = searchQuery ? { search: searchQuery } : undefined;
      const res = await apiClient.get<any>('/chat/directory', params);
      if (res && Array.isArray(res.data)) {
        return res.data.map((u: any) => {
          const isOnline = Boolean(u.isOnline ?? u.is_online);
          const roleName = u.role?.nama_role || u.role || 'User';
          return {
            id: String(u.id || u.id_user),
            nama: u.nama || u.name,
            email: u.email,
            role: roleName,
            isOnline,
            lastSeen: formatLastSeen(u.lastSeen || u.last_seen, isOnline),
            userAvatarBg: getAvatarBg(roleName),
            userInitials: getInitials(u.nama || u.name),
            associatedProjects: u.associatedProjects || u.associated_projects || [],
          };
        });
      }
    } catch (err) {
      console.warn('[ChatService] Gagal memuat direktori kontak:', err);
    }
    return [];
  }

  /**
   * Membuka atau membuat thread percakapan baru dengan recipientId (ID user tujuan)
   */
  public async getOrCreateConversation(recipientId: string | number, initialMsg?: string): Promise<string> {
    try {
      const res = await apiClient.post<any>('/conversations', {
        recipient_id: Number(recipientId),
      });

      if (res && res.data) {
        const conv = res.data;
        const convId = String(conv.id || conv.id_conversation);

        if (initialMsg && initialMsg.trim()) {
          try {
            await apiClient.post(`/conversations/${convId}/messages`, {
              message: initialMsg.trim(),
            });
          } catch (err) {
            console.warn('[ChatService] Gagal mengirim pesan awal:', err);
          }
        }

        await this.getConversations();
        return convId;
      }
    } catch (err) {
      console.error('[ChatService] Gagal getOrCreateConversation:', err);
      throw err;
    }

    return `rconv-${recipientId}`;
  }

  /**
   * Upload File Attachment dengan validasi
   */
  public async uploadAttachment(
    file: File,
    type: 'file' | 'shp' | 'image',
    onProgress?: (percent: number) => void
  ): Promise<{ name: string; type: 'file' | 'shp' | 'image'; size: string; url?: string; file?: File }> {
    const MAX_SIZE_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(`Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimum 25 MB.`);
    }

    const fileName = file.name.toLowerCase();
    if (type === 'file' && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.pdf')) {
      throw new Error('Format file tidak valid. Harap lampirkan spreadsheet Excel (.xlsx, .xls) atau dokumen PDF (.pdf).');
    }
    if (type === 'shp' && !fileName.endsWith('.zip')) {
      throw new Error('Format file tidak valid. Harap lampirkan layer GIS dalam arsip ZIP (.zip) yang memuat file .shp, .shx, dan .dbf.');
    }
    if (type === 'image' && !fileName.match(/\.(jpg|jpeg|png|webp|gif|svg)$/)) {
      throw new Error('Format gambar tidak valid. Harap lampirkan gambar berekstensi .png, .jpg, .jpeg, atau .webp.');
    }

    // Realistic progress callback
    return new Promise((resolve) => {
      let progress = 0;
      onProgress?.(0);

      const interval = setInterval(() => {
        progress += 35;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          onProgress?.(100);

          let previewUrl: string | undefined;
          if (type === 'image') {
            try {
              previewUrl = URL.createObjectURL(file);
            } catch {
              previewUrl = undefined;
            }
          }

          resolve({
            name: file.name,
            type,
            size: formatFileSize(file.size),
            url: previewUrl,
            file,
          });
        } else {
          onProgress?.(progress);
        }
      }, 80);
    });
  }

  /**
   * Fallback method createNewConversation
   */
  public async createNewConversation(
    name: string,
    role: 'SuperAdmin' | string,
    projectCode: string,
    initialMsg: string,
    recipientId?: string | number
  ): Promise<Conversation> {
    if (recipientId) {
      const convId = await this.getOrCreateConversation(recipientId, initialMsg);
      await this.getConversations();
      const found = this.conversations.find((c) => c.id === convId);
      if (found) return found;
    }

    // Local fallback
    const timeStr = formatTime(new Date().toISOString());
    const newId = `rconv-${Date.now()}`;
    const initials = getInitials(name);

    const newConv: Conversation = {
      id: newId,
      userId: `usr-${Date.now()}`,
      userName: name,
      userRole: role,
      userAvatarBg: role === 'SuperAdmin' ? 'from-purple-600 to-indigo-600' : 'from-amber-600 to-rose-600',
      userInitials: initials || 'US',
      isOnline: true,
      projectCode: projectCode || 'PKS-994KY1',
      projectName: 'Proyek Valuasi Pesisir & Laut',
      unreadCount: 0,
      lastMessageSnippet: initialMsg,
      lastMessageTime: timeStr,
      messages: [
        {
          id: `rmsg-${Date.now()}`,
          senderId: this.currentUserId || 'peneliti-me',
          senderName: 'Peneliti',
          text: initialMsg,
          timestamp: timeStr,
          isOutgoing: true,
          status: 'sent',
        },
      ],
    };

    this.conversations = [newConv, ...this.conversations];
    this.emit({
      type: 'CONVERSATIONS_UPDATED',
      conversationId: newId,
      conversations: this.conversations,
    });

    return newConv;
  }

  public getTotalUnreadCount(): number {
    return this.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }

  public triggerIncomingMessageSimulation(targetConvId?: string): void {
    const target = targetConvId
      ? this.conversations.find((c) => c.id === targetConvId)
      : this.conversations[0];

    if (!target) return;

    const timeStr = formatTime(new Date().toISOString());
    const simulatedMsg: ChatMessage = {
      id: `sim-${Date.now()}`,
      senderId: target.userId,
      senderName: target.userName,
      text: `Halo, mohon informasi tindak lanjut terkait telaah data valuasi ${target.projectCode || 'proyek'}.`,
      timestamp: timeStr,
      isOutgoing: false,
    };

    target.messages.push(simulatedMsg);
    target.lastMessageSnippet = simulatedMsg.text;
    target.lastMessageTime = timeStr;
    target.unreadCount = (target.unreadCount || 0) + 1;

    this.emit({
      type: 'MESSAGE_RECEIVED',
      conversationId: target.id,
      message: simulatedMsg,
      totalUnread: this.getTotalUnreadCount(),
      conversations: this.conversations,
    });
  }
}

export const chatService = new ChatService();
