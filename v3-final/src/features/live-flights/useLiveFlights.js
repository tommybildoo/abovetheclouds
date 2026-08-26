import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../../lib/api.js';
import { CONFIG } from '../../lib/config.js';

/**
 * Polls /api/flights/live on a fixed interval (default 20s — matches the
 * server-side cache lifetime). Exposes exactly what the server told us:
 * isLive/demoMode, updatedAt, and an explicit error state instead of
 * ever inventing data client-side.
 */
export function useLiveFlights({ category, argentina } = {}) {
  const [state, setState] = useState({
    flights: [],
    provider: null,
    isLive: false,
    demoMode: true,
    updatedAt: null,
    error: null,
    loading: true,
  });
  const timerRef = useRef(null);

  const fetchOnce = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (argentina) params.set('argentina', '1');
      const data = await api(`/flights/live?${params.toString()}`);
      setState((s) => ({
        ...s,
        flights: data.flights || [],
        provider: data.provider,
        isLive: data.isLive,
        demoMode: data.demoMode,
        updatedAt: data.updatedAt,
        error: data.error || null,
        loading: false,
      }));
    } catch (err) {
      setState((s) => ({ ...s, error: 'LIVE_DATA_UNAVAILABLE', loading: false }));
    }
  }, [category, argentina]);

  useEffect(() => {
    fetchOnce();
    timerRef.current = setInterval(fetchOnce, CONFIG.flightRefreshIntervalSeconds * 1000);
    return () => clearInterval(timerRef.current);
  }, [fetchOnce]);

  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (state.updatedAt) setSecondsAgo(Math.floor(Date.now() / 1000) - state.updatedAt);
    }, 1000);
    return () => clearInterval(t);
  }, [state.updatedAt]);

  return { ...state, secondsAgo, refetch: fetchOnce };
}
