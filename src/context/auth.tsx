import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { acknowledgeNativePushPrompt, clearCsrfToken, getCsrfToken, getOnboarding, getProfile, getSession, login as apiLogin, logout as apiLogout, signup as apiSignup } from '@/lib/api';
import { ApiError, AuthStatus, OnboardingResponse, SessionResponse, SessionUser } from '@/types';
import { addNativePushTokenListener, refreshNativePushRegistration, unregisterNativePush } from '@/lib/native-push';
import * as Network from 'expo-network';

type AuthContextValue = {
  status: AuthStatus;
  user: SessionUser | null;
  profilePictureUrl: string | null;
  refreshProfilePicture: () => Promise<void>;
  onboarding: OnboardingResponse | null;
  acknowledgeNativePushPrompt: () => Promise<void>;
  error: ApiError | null;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  signup: (payload: Parameters<typeof apiSignup>[0]) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isApproved(session: SessionResponse): boolean {
  return session.user.approved || session.user.is_staff || session.user.is_superuser;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const authGeneration = useRef(0);
  const pendingPollInFlight = useRef(false);

  const applySession = useCallback((session: SessionResponse) => {
    setUser(session.user);
    setProfilePictureUrl(null);
    setStatus(isApproved(session) ? 'approved' : 'pending');
    setError(null);
  }, []);

  const refresh = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    const generation = authGeneration.current;
    if (!silent) setError(null);
    try {
      const session = await getSession();
      if (generation !== authGeneration.current) return;
      applySession(session);
    } catch (cause) {
      if (generation !== authGeneration.current) return;
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to reach QueueUp');
      if (apiError.statusCode === 401) {
        setUser(null);
        setProfilePictureUrl(null);
        setStatus('logged_out');
      } else if (!silent) {
        const networkState = await Network.getNetworkStateAsync().catch(() => null);
        setError(networkState?.isConnected === false || networkState?.isInternetReachable === false ? ApiError.offlineError() : apiError);
        setStatus('network_error');
      }
    }
  }, [applySession]);

  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (status !== 'pending') return;
    const poll = async () => {
      if (pendingPollInFlight.current) return;
      pendingPollInFlight.current = true;
      try {
        await refresh({ silent: true });
      } finally {
        pendingPollInFlight.current = false;
      }
    };
    const interval = setInterval(() => { void poll(); }, 5000);
    return () => clearInterval(interval);
  }, [refresh, status]);

  useEffect(() => {
    const username = user?.username;
    if (status !== 'approved' || !username) return;
    let active = true;
    void getProfile(username).then((profile) => {
      if (active) setProfilePictureUrl(profile.player.picture_url);
    }).catch(() => {
      // Profile data is optional for the shared header; keep the initials fallback.
    });
    return () => { active = false; };
  }, [status, user?.username]);

  const acknowledgePrompt = useCallback(async () => {
    await acknowledgeNativePushPrompt();
    setOnboarding((current) => current ? { ...current, native_push_prompt_seen: true } : current);
  }, []);

  useEffect(() => {
    if (status !== 'approved' || !user?.username) return;
    void getOnboarding().then((state) => {
      setOnboarding(state);
      if (state.native_notifications_enabled) void refreshNativePushRegistration().catch(() => {
        // Existing opt-in remains intact; Settings can retry registration.
      });
    }).catch(() => {
      // The notification invitation can wait for the next authenticated refresh.
    });
    const tokenListener = addNativePushTokenListener();
    return () => tokenListener?.remove();
  }, [status, user?.username]);

  const login = useCallback(async (username: string, password: string) => {
    await getCsrfToken();
    await apiLogin({ username, password });
    await getCsrfToken();
    await refresh();
  }, [refresh]);

  const signup = useCallback(async (payload: Parameters<typeof apiSignup>[0]) => {
    await getCsrfToken();
    const session = await apiSignup(payload);
    applySession(session);

    // Django rotates its CSRF token after authentication. Account creation has
    // already succeeded, so refresh the token without turning a transient
    // follow-up failure into a signup failure.
    clearCsrfToken();
    void getCsrfToken().catch(() => clearCsrfToken());
  }, [applySession]);

  const logout = useCallback(async () => {
    authGeneration.current += 1;
    await unregisterNativePush();
    await getCsrfToken();
    await apiLogout();
    clearCsrfToken();
    setUser(null);
    setProfilePictureUrl(null);
    setOnboarding(null);
    setStatus('logged_out');
  }, []);

  const refreshProfilePicture = useCallback(async () => {
    if (!user?.username) return;
    try {
      const profile = await getProfile(user.username);
      setProfilePictureUrl(profile.player.picture_url);
    } catch {
      // The shared header can keep its initials fallback if this refresh fails.
    }
  }, [user]);

  const value = useMemo(() => ({ status, user, profilePictureUrl, refreshProfilePicture, onboarding, acknowledgeNativePushPrompt: acknowledgePrompt, error, refresh, login, signup, logout }), [status, user, profilePictureUrl, refreshProfilePicture, onboarding, acknowledgePrompt, error, refresh, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
