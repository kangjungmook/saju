import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Chart } from '../types/domain';
import { BirthInput, computeChart } from '../lib/bazi';
import { getJSON, setJSON } from './storage';
import { fetchChartRemote, saveChartRemote } from '../api/client';
import { useAuth } from './AuthContext';

const CHART_KEY = 'chart:me';

interface ChartContextValue {
  chart: Chart | null;
  loading: boolean;
  createChart: (input: BirthInput, userId?: string) => Promise<Chart>;
  clearChart: () => Promise<void>;
}

const ChartContext = createContext<ChartContextValue | null>(null);

export function ChartProvider({ children }: { children: React.ReactNode }) {
  const { token, loading: authLoading } = useAuth();
  const [chart, setChart] = useState<Chart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      const cached = await getJSON<Chart>(CHART_KEY);
      if (cached) {
        setChart(cached);
      } else if (token) {
        // Signed in on a fresh install with nothing local yet — pull the last-saved profile down.
        try {
          const remote = await fetchChartRemote(token);
          setChart(remote);
          await setJSON(CHART_KEY, remote);
        } catch {
          // No chart saved server-side yet (or offline) — onboarding will create one.
        }
      }
      setLoading(false);
    })();
  }, [authLoading, token]);

  const createChart = useCallback(
    async (input: BirthInput, userId = 'local-user') => {
      const id = `${userId}-${Date.now()}`;
      const next = computeChart(userId, id, input);
      setChart(next);
      const localSave = setJSON(CHART_KEY, next);
      if (token) {
        saveChartRemote(token, next).catch((e) => console.warn('[chart] backend sync failed, kept locally:', e));
      }
      await localSave;
      return next;
    },
    [token],
  );

  const clearChart = useCallback(async () => {
    setChart(null);
    await setJSON(CHART_KEY, null);
  }, []);

  return (
    <ChartContext.Provider value={{ chart, loading, createChart, clearChart }}>{children}</ChartContext.Provider>
  );
}

export function useChart() {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used within ChartProvider');
  return ctx;
}
