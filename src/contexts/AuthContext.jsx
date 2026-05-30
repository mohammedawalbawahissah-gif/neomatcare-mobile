import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, setLogoutCallback, getErrorMessage } from '../api/client';

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Role → home screen mapping (mirrors frontend App.jsx redirects) ──────────
export const ROLE_HOME_SCREEN = {
  health_worker:  'Cases',
  specialist:     'Consultations',
  facility_admin: 'Facility',
  driver:         'Transport',
  superadmin:     'Facilities',
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true); // true on boot while we read storage
  const [error, setError]     = useState(null);

  // ── Restore session on app launch ──
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser] = await AsyncStorage.multiGet([
          'access_token',
          'user',
        ]);
        const t = storedToken[1];
        const u = storedUser[1] ? JSON.parse(storedUser[1]) : null;
        if (t && u) {
          setToken(t);
          setUser(u);
        }
      } catch (e) {
        console.error('Session restore error:', e);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  // ── Register logout callback so 401 interceptor can call it ──
  const logout = useCallback(async () => {
    try {
      await authAPI.logout().catch(() => {}); // best-effort
    } finally {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      setUser(null);
      setToken(null);
      setError(null);
    }
  }, []);

  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  // ── Login ──
  const login = async (credentials) => {
    setError(null);
    try {
      const response = await authAPI.login(credentials);
      const { access, refresh, user: userData } = response.data;

      await AsyncStorage.multiSet([
        ['access_token',  access],
        ['refresh_token', refresh],
        ['user',          JSON.stringify(userData)],
      ]);

      setToken(access);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    }
  };

  // ── Register ──
  // Backend /auth/register/ returns { message, user } without tokens,
  // so we auto-login immediately after a successful registration.
  const register = async (data) => {
    setError(null);
    try {
      await authAPI.register(data);
      // Auto-login to obtain access + refresh tokens
      return await login({ email: data.email, password: data.password });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    }
  };

  // ── Update local user cache (called after profile edits) ──
  const updateUser = async (updated) => {
    const merged = { ...user, ...updated };
    await AsyncStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  // ── Helpers ──
  const isAuthenticated = !!user && !!token;
  const userRole        = user?.role || null;
  const homeScreen      = ROLE_HOME_SCREEN[userRole] || 'Dashboard';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isAuthenticated,
        userRole,
        homeScreen,
        login,
        register,
        logout,
        updateUser,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;
