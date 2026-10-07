import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { api } from './services/api';
import type { Player } from './types';
export type Account = {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  playerId?: string;
  player: Player | null;
  expiresAt: number;
};
const AuthContext = createContext<{
  account: Account | null;
  loading: boolean;
  restore: () => Promise<Account | null>;
  logout: () => Promise<void>;
}>(null!);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const restore = async () => {
    const version = ++requestVersion.current;
    try {
      const { data } = await api.get<Account>('/auth/me');
      if (version !== requestVersion.current) return null;
      if (data.expiresAt <= Date.now()) {
        setAccount(null);
        return null;
      }
      setAccount(data);
      return data;
    } catch {
      if (version === requestVersion.current) setAccount(null);
      return null;
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };
  useEffect(() => {
    void restore();
    const expired = () => {
      requestVersion.current++;
      setAccount(null);
      setLoading(false);
    };
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, []);
  useEffect(() => {
    if (!account) return;
    const timer = window.setTimeout(
      () => {
        requestVersion.current++;
        setAccount(null);
      },
      Math.max(0, account.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [account]);
  const logout = async () => {
    await api.post('/auth/logout');
    requestVersion.current++;
    setAccount(null);
  };
  return (
    <AuthContext.Provider value={{ account, loading, restore, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export function Protected({ admin = false }: { admin?: boolean }) {
  const { account, loading } = useAuth();
  if (loading)
    return (
      <div className="page-content" role="status">
        Loading session…
      </div>
    );
  if (!account) return <Navigate to="/login" replace />;
  if (admin && account.role !== 'admin') return <Navigate to="/member/dashboard" replace />;
  return <Outlet />;
}
export function DashboardRedirect() {
  const { account } = useAuth();
  return <Navigate to={`/${account!.role}/dashboard`} replace />;
}
