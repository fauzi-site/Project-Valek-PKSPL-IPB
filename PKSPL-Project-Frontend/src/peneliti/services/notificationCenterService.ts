import { playNotificationSound } from '../../lib/notificationSound';

export type NotificationType = 'DALAM_REVIEW' | 'REVISI' | 'SELESAI' | 'PESAN_MASUK' | 'SYSTEM';

export interface ResearcherNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  reviewer?: string;
  timestamp: string;
  createdAt: string;
  isRead: boolean;
  actionUrl: string;
  metadata?: Record<string, any>;
  wasEmailedOffline?: boolean;
}

const STORAGE_KEY = 'pkspl_researcher_notifications';
const ONLINE_STATUS_KEY = 'pkspl_researcher_is_online';

const INITIAL_NOTIFICATIONS: ResearcherNotification[] = [
  {
    id: 'notif-init-1',
    type: 'REVISI',
    title: 'Permintaan Perbaikan Data dari Validator',
    message: 'Parameter data penelitian perlu disesuaikan dengan rekomendasi telaah terkait harga acuan dan luasan sempadan mangrove.',
    projectId: 'PRJ-004',
    projectCode: 'PRJ-004',
    projectName: 'Restorasi Karbon Biru Mangrove Teluk Benoa',
    reviewer: 'Dr. Benny Nababan',
    timestamp: 'Hari ini • 08:30',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    actionUrl: '/peneliti/projects/PRJ-004/review',
    wasEmailedOffline: false,
  },
  {
    id: 'notif-init-2',
    type: 'PESAN_MASUK',
    title: 'Pesan Baru dari Dr. Benny Nababan (Super Admin)',
    message: 'Selamat pagi Bu Retno, mohon konfirmasi dokumen faktur pasar Badung untuk parameter unit kayu bakau.',
    projectId: 'PRJ-004',
    projectCode: 'PRJ-004',
    projectName: 'Restorasi Karbon Biru Mangrove Teluk Benoa',
    reviewer: 'Dr. Benny Nababan',
    timestamp: 'Hari ini • 08:20',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    isRead: false,
    actionUrl: '/peneliti/projects/PRJ-004/messages',
    wasEmailedOffline: false,
  },
  {
    id: 'notif-init-3',
    type: 'DALAM_REVIEW',
    title: 'Program Masuk Tahap Review oleh Validator',
    message: 'Kajian Valuasi Ekonomi Mangrove sedang dalam proses validasi mutu oleh tim penelaah PKSPL.',
    projectId: 'PKS-994KY1',
    projectCode: 'PKS-994KY1',
    projectName: 'Kajian Valuasi Ekonomi Mangrove Teluk Benoa',
    reviewer: 'Dr. Benny Nababan',
    timestamp: 'Kemarin • 14:15',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isRead: true,
    actionUrl: '/peneliti/projects/PKS-994KY1/review',
    wasEmailedOffline: false,
  }
];

class NotificationCenterService {
  private listeners: Set<(notifications: ResearcherNotification[]) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.notifyListeners();
        }
      });
    }
  }

  public getNotifications(): ResearcherNotification[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
        return INITIAL_NOTIFICATIONS;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  }

  public getUnreadCount(): number {
    return this.getNotifications().filter(n => !n.isRead).length;
  }

  public markAsRead(id: string): void {
    const list = this.getNotifications();
    const updated = list.map(n => n.id === id ? { ...n, isRead: true } : n);
    this.save(updated);
  }

  public markAllAsRead(): void {
    const list = this.getNotifications();
    const updated = list.map(n => ({ ...n, isRead: true }));
    this.save(updated);
  }

  public addNotification(notif: Omit<ResearcherNotification, 'id' | 'createdAt'> & { id?: string }): ResearcherNotification {
    const list = this.getNotifications();
    const newNotif: ResearcherNotification = {
      ...notif,
      id: notif.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    // Prepend to top
    const updated = [newNotif, ...list.filter(n => n.id !== newNotif.id)].slice(0, 50);
    this.save(updated);

    // Audio chime if online
    if (this.isResearcherOnline()) {
      playNotificationSound();
    }

    return newNotif;
  }

  public clearAll(): void {
    this.save([]);
  }

  public isResearcherOnline(): boolean {
    try {
      const val = localStorage.getItem(ONLINE_STATUS_KEY);
      if (val === null) return true; // Default is online
      return val === 'true';
    } catch {
      return true;
    }
  }

  public setResearcherOnline(isOnline: boolean): void {
    try {
      localStorage.setItem(ONLINE_STATUS_KEY, String(isOnline));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pkspl_researcher_presence_changed', { detail: { isOnline } }));
      }
    } catch {
      // ignore
    }
  }

  public subscribe(listener: (notifications: ResearcherNotification[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private save(list: ResearcherNotification[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      this.notifyListeners();
    } catch (e) {
      console.warn('Failed to save notifications:', e);
    }
  }

  private notifyListeners(): void {
    const list = this.getNotifications();
    this.listeners.forEach(fn => {
      try {
        fn(list);
      } catch {
        // ignore
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pkspl_notification_center_updated', { detail: list }));
    }
  }
}

export const notificationCenterService = new NotificationCenterService();
