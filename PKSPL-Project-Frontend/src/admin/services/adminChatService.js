import { apiClient } from '../../services/apiClient';
import { getEcho } from '../../lib/echo';

/**
 * Helper untuk menentukan warna latar gradien avatar berdasarkan role
 */
export const getAvatarBg = (role) => {
  const roleName = typeof role === 'object' ? role?.nama_role : role;
  switch (roleName) {
    case 'Peneliti':
      return 'from-blue-600 to-indigo-600';
    case 'Super Admin':
    case 'Admin':
    case 'Administrator':
      return 'from-purple-600 to-indigo-600';
    default:
      return 'from-slate-600 to-slate-800';
  }
};

/**
 * Helper untuk menghasilkan inisial 2 huruf kapital
 */
export const getInitials = (name) => {
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

/**
 * Helper format waktu ke HH:mm
 */
export const formatTime = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

/**
 * Helper format ukuran file manusiawi
 */
export const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '';
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Helper format status terakhir aktif
 */
export const formatLastSeen = (val, isOnline) => {
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

export const adminChatService = {
  formatTime,
  formatFileSize,
  formatLastSeen,
  getAvatarBg,
  getInitials,

  /**
   * Mengambil daftar seluruh percakapan yang diikuti Admin dari database
   */
  async getConversations(currentUserId) {
    try {
      const res = await apiClient.get('/conversations');
      if (res && Array.isArray(res.data)) {
        return res.data.map((item) => {
          // Cari lawan bicara (bukan current user)
          const participants = item.participants || [];
          const otherParticipant =
            participants.find(
              (p) => String(p.id_user || p.id) !== String(currentUserId)
            ) ||
            item.otherUser ||
            item.other_user ||
            {};

          const otherUser = otherParticipant.user || otherParticipant;
          const otherUserId = otherUser.id_user || otherUser.id || otherParticipant.id_user;
          const otherUserName = otherUser.nama || otherUser.name || item.title || 'Pengguna PKSPL';
          const otherRole = otherUser.role?.nama_role || otherUser.role || 'User';

          const latestMsg = item.latestMessage || item.latest_message;
          const isOnline = Boolean(otherUser.is_online ?? otherUser.isOnline);

          const latestSenderId = String(latestMsg?.sender_id || latestMsg?.id_sender || latestMsg?.senderId || '');
          const isLatestOutgoing = currentUserId ? latestSenderId === String(currentUserId) : false;
          const isLatestRead = Boolean(latestMsg?.isRead ?? latestMsg?.read_at ?? latestMsg?.is_read);
          const latestStatus = latestMsg?.status || (isLatestRead ? 'read' : (isLatestOutgoing ? (isOnline ? 'delivered' : 'sent') : 'delivered'));

          return {
            id: String(item.id || item.id_conversation),
            userId: String(otherUserId || ''),
            userName: otherUserName,
            userRole: otherRole,
            userAvatarBg: getAvatarBg(otherRole),
            userInitials: getInitials(otherUserName),
            isOnline,
            lastSeen: formatLastSeen(otherUser.last_seen_at || otherUser.last_seen || otherUser.lastSeen, isOnline),
            projectCode: item.proyek?.kode_proyek || '',
            projectName: item.proyek?.nama_proyek || '',
            unreadCount: item.unread_count ?? item.unreadCount ?? 0,
            lastMessageSnippet: latestMsg
              ? latestMsg.message || (latestMsg.attachments?.length > 0 ? `📎 ${latestMsg.attachments[0].file_name}` : '')
              : '',
            lastMessageTime: formatTime(latestMsg?.created_at || item.updated_at),
            lastMessageIsOutgoing: isLatestOutgoing,
            lastMessageStatus: latestStatus,
            messages: [],
          };
        });
      }
    } catch (e) {
      console.warn('[adminChatService] Gagal memuat percakapan dari API:', e);
    }
    return [];
  },

  /**
   * Mengambil direktori pengguna resmi dari database yang dapat dihubungi oleh Admin
   */
  async getDirectoryUsers(searchQuery = '') {
    try {
      const params = searchQuery ? { search: searchQuery } : undefined;
      const res = await apiClient.get('/chat/directory', params);
      if (res && Array.isArray(res.data)) {
        return res.data.map((u) => {
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
    } catch (e) {
      console.warn('[adminChatService] Gagal memuat direktori pengguna:', e);
    }
    return [];
  },

  /**
   * Mengambil riwayat pesan percakapan tertentu dari database
   */
  async getMessages(conversationId, currentUserId) {
    try {
      const res = await apiClient.get(`/conversations/${conversationId}/messages`, { per_page: 100 });
      if (res && Array.isArray(res.data)) {
        return res.data.map((m) => {
          const senderId = String(m.sender_id || m.id_sender || m.senderId || '');
          const isOutgoing = Boolean(m.isOutgoing ?? m.is_outgoing) || (currentUserId ? senderId === String(currentUserId) : false);
          const firstAtt = m.attachments?.[0];

          let attachment = null;
          if (firstAtt) {
            attachment = {
              id: firstAtt.id || firstAtt.id_attachment,
              name: firstAtt.file_name || firstAtt.fileName || 'Lampiran',
              size: formatFileSize(firstAtt.file_size || firstAtt.fileSize),
              type: firstAtt.file_type || firstAtt.fileType || 'file',
              url: firstAtt.url,
            };
          }

          const isDeleted = Boolean(m.isDeleted ?? m.is_deleted);
          const isEdited = Boolean(m.isEdited ?? m.is_edited);
          const isRead = Boolean(m.isRead ?? m.read_at ?? m.is_read);
          const computedStatus = m.status || (isRead ? 'read' : (isOutgoing ? 'sent' : 'delivered'));

          return {
            id: String(m.id || m.id_message),
            conversationId: String(m.conversation_id || m.id_conversation || conversationId),
            senderId,
            senderName: m.sender_name || m.senderName || m.sender?.nama || 'Pengguna',
            text: isDeleted ? 'Pesan telah dihapus' : (m.message || m.text || ''),
            timestamp: formatTime(m.created_at || m.createdAt),
            createdAt: m.created_at || m.createdAt,
            isOutgoing,
            isRead,
            status: computedStatus,
            isEdited,
            isDeleted,
            attachment: isDeleted ? null : attachment,
          };
        });
      }
    } catch (e) {
      console.warn(`[adminChatService] Gagal memuat riwayat pesan conv #${conversationId}:`, e);
    }
    return [];
  },

  /**
   * Mengirim pesan baru ke percakapan (teks dan/atau berkas lampiran)
   */
  async sendMessage(conversationId, text, file, currentUserId, currentUserName, isRecipientOnline = false) {
    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (text) formData.append('message', text);
        res = await apiClient.upload(`/conversations/${conversationId}/messages`, formData);
      } else {
        res = await apiClient.post(`/conversations/${conversationId}/messages`, {
          message: text,
        });
      }

      if (res && res.data) {
        const m = res.data;
        const firstAtt = m.attachments?.[0];
        let attachment = null;
        if (firstAtt) {
          attachment = {
            id: firstAtt.id || firstAtt.id_attachment,
            name: firstAtt.file_name || firstAtt.fileName || 'Lampiran',
            size: formatFileSize(firstAtt.file_size || firstAtt.fileSize),
            type: firstAtt.file_type || firstAtt.fileType || 'file',
            url: firstAtt.url,
          };
        }

        const initialStatus = isRecipientOnline ? 'delivered' : 'sent';

        return {
          id: String(m.id || m.id_message),
          conversationId: String(conversationId),
          senderId: String(currentUserId),
          senderName: currentUserName || 'Administrator',
          text: m.message || text,
          timestamp: formatTime(m.created_at || new Date().toISOString()),
          createdAt: m.created_at || new Date().toISOString(),
          isOutgoing: true,
          status: m.status || initialStatus,
          isRead: Boolean(m.isRead ?? m.is_read ?? false),
          attachment,
        };
      }
    } catch (e) {
      console.error('[adminChatService] Gagal mengirim pesan ke backend:', e);
      throw e;
    }
  },

  /**
   * Mengedit pesan milik user sendiri
   */
  async editMessage(conversationId, messageId, newText) {
    try {
      const res = await apiClient.put(`/conversations/${conversationId}/messages/${messageId}`, {
        message: newText.trim(),
        text: newText.trim(),
      });
      return res?.data;
    } catch (e) {
      console.error('[adminChatService] Gagal edit pesan:', e);
      throw e;
    }
  },

  /**
   * Menghapus pesan milik user sendiri (soft delete)
   */
  async deleteMessage(conversationId, messageId) {
    try {
      await apiClient.delete(`/conversations/${conversationId}/messages/${messageId}`);
    } catch (e) {
      console.error('[adminChatService] Gagal hapus pesan:', e);
      throw e;
    }
  },

  /**
   * Menandai seluruh pesan dalam percakapan sebagai telah dibaca
   */
  async markAsRead(conversationId) {
    try {
      await apiClient.post(`/conversations/${conversationId}/read`);
    } catch (e) {
      console.warn(`[adminChatService] Gagal menandai baca conv #${conversationId}:`, e);
    }
  },

  /**
   * Mengirim sinyal indikator sedang mengetik (whisper + API)
   */
  async sendTyping(conversationId, isTyping = true, currentUserId = null) {
    const echo = getEcho();
    if (echo && conversationId && !isNaN(Number(conversationId))) {
      try {
        const channel = echo.private(`conversation.${conversationId}`);
        channel.whisper('typing', {
          conversationId,
          userId: currentUserId,
          isTyping,
        });
      } catch (err) {
        // whisper error ignored
      }
    }

    try {
      await apiClient.post(`/conversations/${conversationId}/typing`, {
        is_typing: isTyping,
      });
    } catch (e) {
      // API error ignored
    }
  },

  /**
   * Membuka atau membuat thread percakapan baru dengan seorang pengguna
   */
  async getOrCreateConversation(recipientId, initialMessage = null) {
    try {
      const res = await apiClient.post('/conversations', {
        recipient_id: Number(recipientId),
      });

      if (res && res.data) {
        const conv = res.data;
        const convId = String(conv.id || conv.id_conversation);

        // Jika ada pesan awal, langsung kirimkan ke thread
        if (initialMessage && initialMessage.trim()) {
          try {
            await apiClient.post(`/conversations/${convId}/messages`, {
              message: initialMessage.trim(),
            });
          } catch (err) {
            console.warn('[adminChatService] Gagal mengirim pesan awal:', err);
          }
        }

        return convId;
      }
    } catch (e) {
      console.error('[adminChatService] Gagal membuat/mengambil percakapan:', e);
      throw e;
    }
  },

  /**
   * Mengambil total pesan obrolan yang belum dibaca untuk badge sidebar
   */
  async getTotalUnreadCount() {
    try {
      const res = await apiClient.get('/conversations');
      if (res && Array.isArray(res.data)) {
        return res.data.reduce((acc, c) => acc + Number(c.unread_count || c.unreadCount || 0), 0);
      }
    } catch (e) {
      // ignore
    }
    return 0;
  },

  /**
   * Mengirim heartbeat untuk memperbarui status online user
   */
  startHeartbeat() {
    if (this._heartbeatTimer) return;
    this._heartbeatTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        apiClient.post('/chat/heartbeat').catch(() => {});
      }
    }, 45000);
  },
};
