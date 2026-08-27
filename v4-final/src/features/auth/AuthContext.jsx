import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api('/auth/me');
      setUser(data.user);
      setProfile(data.profile);
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    await refresh();
  };
  const signup = async (email, username, password) => {
    await api('/auth/signup', { method: 'POST', body: JSON.stringify({ email, username, password }) });
    await refresh();
  };

  return (
    <AuthCtx.Provider value={{ user, profile, loading, login, signup, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
