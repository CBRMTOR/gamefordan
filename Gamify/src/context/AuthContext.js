import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

axios.defaults.withCredentials = true;

const AuthContext = createContext(null);
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  const inactivityTimer = useRef(null);
  const logoutRef = useRef(null);
  const location = useLocation();

  // Memoize publicPaths so it doesn't change every render
  const publicPaths = useMemo(() => ['/login', '/register', '/forgot-password'], []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/auth/me`, {
        timeout: 5000
      });
      setUser(response.data);
      return true;
    } catch (err) {
      setUser(null);
      return false;
    } finally {
      setInitialCheckComplete(true);
      setLoading(false);
    }
  };

  const logout = async (navigate) => {
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/logout`, {});
      setUser(null);
      if (navigate) navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/login`, credentials);
      await checkAuth();
    } catch (err) {
      let message = 'Login failed. Please try again.';

      if (err.response) {
        const { status, data } = err.response;

        if (status === 401) {
          if (data.account_locked) {
            message = `Account locked due to too many failed attempts.`;
          } else if (data.remaining_attempts !== undefined) {
            message = `Incorrect user ID or password. ${data.remaining_attempts} attempts left.`;
          } else {
            message = 'Incorrect user ID or password.';
          }
        } else if (status === 403) {
          if (data.error?.toLowerCase().includes('locked')) {
            const unlockTime = data.unlock_time
              ? new Date(data.unlock_time).toLocaleTimeString()
              : 'later';
            message = `Account temporarily locked. Try again at ${unlockTime}.`;
          } else if (data.error?.toLowerCase().includes('disabled')) {
            message = 'Your account has been disabled. Please contact support.';
          }
        } else if (status === 429) {
          const retrySeconds = data.retry_after_seconds || 60;
          message = `Too many login attempts. Try again in ${retrySeconds} seconds.`;
        } else if (data.error) {
          message = data.error;
        }
      }

      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Memoize resetInactivityTimer so it doesn't recreate on every render
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (user) logoutRef.current?.();
    }, SESSION_TIMEOUT);
  }, [user]);

  useEffect(() => {
    logoutRef.current = logout;

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));

    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivityTimer]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (publicPaths.includes(location.pathname)) {
        setInitialCheckComplete(true);
        setLoading(false);
        return; // Skip auth check on public routes
      }

      await checkAuth();
    };

    initializeAuth();

    const refreshInterval = setInterval(() => {
      if (!publicPaths.includes(location.pathname)) {
        checkAuth();
      }
    }, 55 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [location.pathname, publicPaths]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      initialCheckComplete,
      login,
      logout,
      isAuthenticated: !!user,
      refreshAuth: checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};