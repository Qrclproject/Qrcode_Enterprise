import { createContext, useState, useEffect, useCallback } from 'react';
import { login as loginApi, register as registerApi } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('whatsapp_access_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.userId,
          email: payload.email,
          name: payload.name || 'User',
          role: payload.role || 'admin',
          permissions: payload.permissions || [],
        });
      } catch {
        localStorage.removeItem('whatsapp_access_token');
        setToken(null);
      }
    }
    setLoading(false);
  }, [token]);

  const login = useCallback(async (email, password) => {
    const res = await loginApi({ email, password });
    const { token: newToken, user: userData } = res.data || res;
    
    // 🔍 Debug: log the permissions from the login response
    console.log('User permissions:', userData.permissions);
    
    localStorage.setItem('whatsapp_access_token', newToken);
    setToken(newToken);
    setUser({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role || 'admin',
      permissions: userData.permissions || [],
    });
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await registerApi({ name, email, password });
    const { token: newToken, user: userData } = res.data || res;
    localStorage.setItem('whatsapp_access_token', newToken);
    setToken(newToken);
    setUser({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role || 'admin',
      permissions: userData.permissions || [],
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('whatsapp_access_token');
    setToken(null);
    setUser(null);
  }, []);

  const value = { user, token, loading, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};