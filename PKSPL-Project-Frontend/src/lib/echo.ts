import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: any;
    Echo: any;
  }
}

window.Pusher = Pusher;

let echoInstance: Echo | null = null;
let currentEchoToken: string | null = null;

export const getEcho = (): Echo | null => {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || localStorage.getItem('pkspl_token');
  
  if (!token) {
    if (echoInstance) {
      try {
        echoInstance.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      echoInstance = null;
      currentEchoToken = null;
      window.Echo = null;
    }
    return null;
  }

  // Jika instance sudah ada DAN token masih sama persis, gunakan instance aktif
  if (echoInstance && currentEchoToken === token) {
    return echoInstance;
  }

  // Jika token berganti (misal ganti akun login antar role), reset instance lama
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (e) {
      // Ignore
    }
    echoInstance = null;
    window.Echo = null;
  }

  try {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const rawApiBaseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const normalizedApiBaseUrl = rawApiBaseUrl.startsWith('http')
      ? rawApiBaseUrl
      : `${typeof window !== 'undefined' ? window.location.origin : ''}${rawApiBaseUrl.startsWith('/') ? rawApiBaseUrl : `/${rawApiBaseUrl}`}`;
    const authEndpoint = `${normalizedApiBaseUrl.replace(/\/+$/, '')}/broadcasting/auth`;

    const host = import.meta.env.VITE_REVERB_HOST || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
    const port = isHttps ? 443 : Number(import.meta.env.VITE_REVERB_PORT || 8085);
    const scheme = isHttps ? 'https' : (import.meta.env.VITE_REVERB_SCHEME || 'http');

    echoInstance = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY || 'pkspl-reverb-key',
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS: scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });

    currentEchoToken = token;
    window.Echo = echoInstance;

    return echoInstance;
  } catch (error) {
    console.warn('[Echo] Gagal menginisialisasi WebSocket client:', error);
    return null;
  }
};

export const disconnectEcho = (): void => {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (e) {
      // Ignore
    }
    echoInstance = null;
    currentEchoToken = null;
    window.Echo = null;
  }
};

export const reconnectEcho = (): Echo | null => {
  disconnectEcho();
  return getEcho();
};

export default getEcho;