import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { login as authLogin, register as authRegister, logout as authLogout, getMe, getGoogleRedirectUrl, sendPresenceHeartbeat } from '../services/authService';

const AuthContext = createContext();

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 Jam = 7,200,000 ms
const ACTIVITY_THROTTLE_MS = 10 * 1000; // Throttle activity timestamp updates to once per 10s

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = user !== null;
  const lastActivityUpdateRef = useRef(0);

  // Helper to record activity timestamp in localStorage
  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityUpdateRef.current > ACTIVITY_THROTTLE_MS) {
      lastActivityUpdateRef.current = now;
      localStorage.setItem('pkspl_last_activity', now.toString());
    }
  }, []);

  // Helper to perform automatic idle logout
  const triggerIdleLogout = useCallback(async () => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('pkspl_last_activity');
    setUser(null);

    try {
      await authLogout();
    } catch (err) {
      // Ignore background logout errors
    }

    if (window.location.pathname !== '/login') {
      window.location.href = '/login?idle_timeout=1';
    }
  }, []);

  // Helper to check if 2 hours idle timeout has passed
  const checkIdleTimeout = useCallback(() => {
    const lastActivityStr = localStorage.getItem('pkspl_last_activity');
    if (!lastActivityStr) return false;

    const lastActivity = parseInt(lastActivityStr, 10);
    if (isNaN(lastActivity)) return false;

    const now = Date.now();
    if (now - lastActivity >= IDLE_TIMEOUT_MS) {
      triggerIdleLogout();
      return true;
    }
    return false;
  }, [triggerIdleLogout]);

  // Initial Auth Restore with Idle Check
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (token) {
        // Check if 2 hours idle timeout already expired before restoring session
        const lastActivityStr = localStorage.getItem('pkspl_last_activity');
        if (lastActivityStr) {
          const lastActivity = parseInt(lastActivityStr, 10);
          if (!isNaN(lastActivity) && Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
            localStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_token');
            localStorage.removeItem('pkspl_last_activity');
            setUser(null);
            setLoading(false);
            return;
          }
        }

        try {
          const data = await getMe();
          setUser(data.user);
          recordActivity();
        } catch (error) {
          localStorage.removeItem('auth_token');
          sessionStorage.removeItem('auth_token');
          localStorage.removeItem('pkspl_last_activity');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [recordActivity]);

  // User activity listeners & Heartbeat timer when authenticated
  useEffect(() => {
    if (!user) return;

    // Check idle immediately on mount or focus
    if (checkIdleTimeout()) return;

    const handleUserActivity = () => {
      // First check if already timed out
      if (checkIdleTimeout()) return;
      recordActivity();
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'visibilitychange', 'focus'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Heartbeat check every 30 seconds
    const intervalId = setInterval(() => {
      checkIdleTimeout();
    }, 30 * 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(intervalId);
    };
  }, [user, checkIdleTimeout, recordActivity]);

  // Presence Heartbeat: triggers every 60s while user session is active
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let lastPresenceSent = 0;

    const triggerPresence = async () => {
      const now = Date.now();
      // Throttle heartbeat to at most once per 20 seconds
      if (now - lastPresenceSent < 20000) return;
      lastPresenceSent = now;

      try {
        await sendPresenceHeartbeat();
      } catch (err) {
        // Silently catch background heartbeat error
      }
    };

    // Immediate heartbeat when user logs in or page loads
    triggerPresence();

    // Heartbeat every 60 seconds
    const heartbeatTimer = setInterval(() => {
      if (isMounted && !document.hidden) {
        triggerPresence();
      }
    }, 60 * 1000);

    const handleVisibilityOrFocus = () => {
      if (isMounted && !document.hidden) {
        triggerPresence();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      clearInterval(heartbeatTimer);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [user?.id_user]);

  const login = async (identity, password, rememberMe = false) => {
    const data = await authLogin(identity, password);
    if (rememberMe) {
      localStorage.setItem('auth_token', data.access_token);
      sessionStorage.removeItem('auth_token');
    } else {
      sessionStorage.setItem('auth_token', data.access_token);
      localStorage.removeItem('auth_token');
    }

    const now = Date.now();
    localStorage.setItem('pkspl_last_activity', now.toString());
    lastActivityUpdateRef.current = now;

    setUser(data.user);
    return data.user;
  };

  const register = async (nama, email, password) => {
    const data = await authRegister(nama, email, password);
    if (data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
      sessionStorage.removeItem('auth_token');

      const now = Date.now();
      localStorage.setItem('pkspl_last_activity', now.toString());
      lastActivityUpdateRef.current = now;

      setUser(data.user);
    }
    return data;
  };

  const loginWithGoogle = async () => {
    const data = await getGoogleRedirectUrl();
    window.location.href = data.redirect_url;
  };

  const handleAuthCallback = async (token) => {
    localStorage.setItem('auth_token', token);
    sessionStorage.removeItem('auth_token');

    const now = Date.now();
    localStorage.setItem('pkspl_last_activity', now.toString());
    lastActivityUpdateRef.current = now;

    const data = await getMe();
    console.debug('Google callback /auth/me response', data);
    if (!data?.user) {
      throw new Error('User session is missing after Google login.');
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    // Manual logout removes auth tokens & last activity, BUT preserves pkspl_remembered_email
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('pkspl_last_activity');
    setUser(null);

    try {
      await authLogout();
    } catch (error) {
      console.warn('Backend token cleanup notice:', error);
    }
  };

  const hasRole = (roleName) => {
    return user?.role?.nama_role === roleName;
  };

  const refreshUser = async () => {
    try {
      const data = await getMe();
      if (data?.user) {
        setUser(data.user);
        return data.user;
      }
    } catch (error) {
      console.warn('Failed to refresh user:', error);
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      register,
      loginWithGoogle,
      handleAuthCallback,
      logout,
      hasRole,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
