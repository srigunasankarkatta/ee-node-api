import { createContext, useContext, useState, useEffect } from 'react';
import { auth, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('admin_user');
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  async function login(phone, password) {
    const res = await auth.login(phone, password);
    if (res.data?.user?.role !== 'admin') {
      throw new Error('Admin access required');
    }
    setToken(res.data.accessToken);
    setUser(res.data.user);
    localStorage.setItem('admin_user', JSON.stringify(res.data.user));
    return res.data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('admin_user');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
