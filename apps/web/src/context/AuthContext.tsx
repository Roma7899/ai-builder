import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import api, { setAccessToken } from '../lib/api';

interface User {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_CHANNEL = 'auth-sync';
const REFRESH_EVENT = 'auth:refresh';
const LOGOUT_EVENT = 'auth:logout';

function useBroadcastAuth(
  setUser: React.Dispatch<React.SetStateAction<User | null>>,
  setToken: React.Dispatch<React.SetStateAction<string | null>>,
) {
  useEffect(() => {
    let channel: BroadcastChannel | null;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === LOGOUT_EVENT) {
          setUser(null);
          setToken(null);
        }
      };
    } catch {
      // BroadcastChannel not supported — cross-tab sync unavailable
    }
    return () => { channel?.close(); };
  }, [setUser, setToken]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useBroadcastAuth(setUser, setToken);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/register', { email, password });
    setAccessToken(data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
      setToken(null);
      setUser(null);
      try {
        new BroadcastChannel(AUTH_CHANNEL).postMessage({ type: LOGOUT_EVENT });
      } catch { /* best-effort cross-tab sync */ }
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const { data } = await api.post('/api/auth/refresh');
      setAccessToken(data.accessToken);
      setToken(data.accessToken);
      setUser(data.user ?? null);
    } catch {
      setAccessToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  return (
    <AuthContext.Provider
      value={{ user, accessToken: token, isLoading, login, register, logout, refreshToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
