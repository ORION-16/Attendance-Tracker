import { createContext, useContext, useEffect, useState } from 'react';
import { api, setAccessToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restoringSession, setRestoringSession] = useState(true);

  useEffect(() => {
    api.post('/auth/refresh')
      .then(({ data }) => { setAccessToken(data.accessToken); setUser(data.user); })
      .catch(() => setAccessToken(null))
      .finally(() => setRestoringSession(false));
  }, []);

  async function authenticate(mode, payload) {
    const { data } = await api.post(`/auth/${mode}`, payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    try { await api.post('/auth/logout'); } finally { setAccessToken(null); setUser(null); }
  }

  return <AuthContext.Provider value={{ user, restoringSession, authenticate, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
