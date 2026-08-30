import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearCsrfToken, getCsrfToken, getOnboarding, getSession, login as apiLogin, logout as apiLogout, signup as apiSignup } from '@/lib/api';
import { ApiError, AuthStatus, SessionResponse, SessionUser } from '@/types';

type AuthContextValue = {
  status: AuthStatus;
  user: SessionUser | null;
  error: ApiError | null;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  signup: (payload: Parameters<typeof apiSignup>[0]) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isApproved(session: SessionResponse): boolean {
  return session.user.approved;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const applySession = useCallback((session: SessionResponse) => {
    setUser(session.user);
    setStatus(isApproved(session) ? 'approved' : 'pending');
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const session = await getSession();
      applySession(session);
      if (!isApproved(session)) await getOnboarding();
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to reach QueueUp');
      if (apiError.statusCode === 401) {
        setUser(null);
        setStatus('logged_out');
      } else {
        setError(apiError);
        setStatus('network_error');
      }
    }
  }, [applySession]);

  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    await getCsrfToken();
    await apiLogin({ username, password });
    await getCsrfToken();
    await refresh();
  }, [refresh]);

  const signup = useCallback(async (payload: Parameters<typeof apiSignup>[0]) => {
    await getCsrfToken();
    await apiSignup(payload);
    await getCsrfToken();
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await getCsrfToken();
      await apiLogout();
    } finally {
      clearCsrfToken();
      setUser(null);
      setStatus('logged_out');
    }
  }, []);

  const value = useMemo(() => ({ status, user, error, refresh, login, signup, logout }), [status, user, error, refresh, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
