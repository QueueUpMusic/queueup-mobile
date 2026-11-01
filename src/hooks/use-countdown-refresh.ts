import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from 'expo-router';

/** Keeps visible countdowns current and retries expired transitions until the API catches up. */
export function useCountdownRefresh(targets: (string | null)[], refresh: () => void) {
  const focused = useIsFocused();
  const [appState, setAppState] = useState(AppState.currentState);
  const [now, setNow] = useState(() => Date.now());
  const refreshRef = useRef(refresh);
  const targetKey = JSON.stringify([...new Set(targets.filter(Boolean))].sort());

  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!focused || appState !== 'active') return;
    const deadlines = (JSON.parse(targetKey) as string[]).map(Date.parse).filter(Number.isFinite);
    let lastRefresh = -Infinity;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      // A request can fail, or reach the server before its scheduled state change.
      // Keep retrying at a bounded rate instead of permanently consuming the event.
      if (deadlines.some((deadline) => deadline <= time) && time - lastRefresh >= 5000) {
        lastRefresh = time;
        refreshRef.current();
      }
    };
    tick();
    if (!deadlines.length) return;
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [focused, appState, targetKey]);

  return now;
}
