import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../../lib/api.js';
import { CONFIG } from '../../lib/config.js';

/**
 * Polls the live-flight API without blanking an already-rendered map when a
 * provider has a transient failure. This is especially useful with OAuth
 * providers: the UI should keep the last known positions and clearly mark
 * them as stale rather than flashing to zero aircraft.
 */
export function useLiveFlights({ category, argentina, country } = {}) {
  const [state, setState] = useState({
    flights: [], provider: null, isLive: false, demoMode: true,
    updatedAt: null, counts: null, error: null, loading: true,
  });
  const timerRef = useRef(null);

  const fetchOnce = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (country) params.set('country', country);
      else if (argentina) params.set('argentina', '1');
      const data = await api(`/flights/live?${params.toString()}`);
      const flights = Array.isArray(data.flights) ? data.flights : [];
      setState((s) => ({
        ...s,
        flights,
        provider: data.provider,
        isLive: data.isLive,
        demoMode: data.demoMode,
        updatedAt: data.updatedAt,
        counts: data.counts || null,
        error: data.error || null,
        loading: false,
      }));
    } catch {
      setState((s) => ({
        ...s,
        // Keep last known positions. A temporary provider/network error
        // should never make a working map appear empty.
        error: 'LIVE_DATA_UNAVAILABLE',
        loading: false,
      }));
    }
  }, [category, argentina, country]);

  useEffect(() => {
    fetchOnce();
    const interval = Math.max(10, Number(CONFIG.flightRefreshIntervalSeconds) || 20);
    timerRef.current = setInterval(fetchOnce, interval * 1000);
    return () => clearInterval(timerRef.current);
  }, [fetchOnce]);

  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (state.updatedAt) {
        setSecondsAgo(Math.max(0, Math.floor(Date.now() / 1000) - state.updatedAt));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [state.updatedAt]);

  return { ...state, secondsAgo, refetch: fetchOnce };
}
