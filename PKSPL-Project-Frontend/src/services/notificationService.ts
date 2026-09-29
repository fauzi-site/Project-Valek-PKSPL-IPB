import { apiClient } from './apiClient';

export interface AppNotification {
  id: string;
  type: string;
  data: {
    type?: string;
    conversation_id?: number | string;
    message_id?: number | string;
    sender_id?: number | string;
    sender_name?: string;
    sender_role?: string;
    message?: string;
    project_name?: string;
    action_url?: string;
    [key: string]: any;
  };
  read_at: string | null;
  created_at: string;
  is_read: boolean;
}

export interface NotificationPreference {
  email_chat: boolean;
  email_revision: boolean;
  email_status_review: boolean;
  app_notification: boolean;
}

export const notificationService = {
  /**
   * Mengambil daftar notifikasi pengguna
   */
  async getNotifications(perPage: number = 15): Promise<AppNotification[]> {
    try {
      const res = await apiClient.get<any>('/notifications', { per_page: perPage });
      if (res && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn('[NotificationService] Gagal membaca daftar notifikasi:', e);
    }
    return [];
  },

  /**
   * Mengambil jumlah notifikasi yang belum dibaca
   */
  async getUnreadCount(): Promise<number> {
    try {
      const res = await apiClient.get<{ unread_count: number }>('/notifications/unread-count');
      return res?.unread_count ?? 0;
    } catch (e) {
      return 0;
    }
  },

  /**
   * Menandai satu notifikasi sebagai telah dibaca
   */
  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.post(`/notifications/${id}/read`);
    } catch (e) {
      console.warn('[NotificationService] Gagal menandai notifikasi dibaca:', e);
    }
  },

  /**
   * Menandai semua notifikasi sebagai telah dibaca
   */
  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.post('/notifications/read-all');
    } catch (e) {
      console.warn('[NotificationService] Gagal menandai semua notifikasi dibaca:', e);
    }
  },

  /**
   * Mengambil preferensi notifikasi pengguna
   */
  async getPreferences(): Promise<NotificationPreference> {
    try {
      const res = await apiClient.get<any>('/notification-preferences');
      if (res && res.data) {
        return {
          email_chat: Boolean(res.data.email_chat),
          email_revision: Boolean(res.data.email_revision),
          email_status_review: Boolean(res.data.email_status_review),
          app_notification: Boolean(res.data.app_notification),
        };
      }
    } catch (e) {
      console.warn('[NotificationService] Gagal membaca preferensi notifikasi:', e);
    }

    return {
      email_chat: true,
      email_revision: true,
      email_status_review: true,
      app_notification: true,
    };
  },

  /**
   * Memperbarui preferensi notifikasi pengguna
   */
  async updatePreferences(prefs: Partial<NotificationPreference>): Promise<NotificationPreference> {
    try {
      const res = await apiClient.put<any>('/notification-preferences', prefs);
      if (res && res.data) {
        return {
          email_chat: Boolean(res.data.email_chat),
          email_revision: Boolean(res.data.email_revision),
          email_status_review: Boolean(res.data.email_status_review),
          app_notification: Boolean(res.data.app_notification),
        };
      }
    } catch (e) {
      console.warn('[NotificationService] Gagal memperbarui preferensi notifikasi:', e);
    }

    return {
      email_chat: true,
      email_revision: true,
      email_status_review: true,
      app_notification: true,
      ...prefs,
    };
  },
};
