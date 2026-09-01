import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';

type RefreshFunction = () => void | Promise<void>;

/** Refreshes only the focused screen while the app is active. */
export function useLiveRefresh(refresh: RefreshFunction, intervalMs: number | null = null): void {
  const refreshRef = useRef(refresh);
  const focusedRef = useRef(false);
  const activeRef = useRef(AppState.currentState === 'active');

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    return () => { focusedRef.current = false; };
  }, []));

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      const becameActive = activeRef.current === false && nextState === 'active';
      activeRef.current = nextState === 'active';
      if (becameActive && focusedRef.current) {
        void refreshRef.current();
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!intervalMs) return undefined;
    const timer = setInterval(() => {
      if (activeRef.current && focusedRef.current) void refreshRef.current();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
}
