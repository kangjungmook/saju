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
  /** 20 프로필 편집: recompute from edited birth details, keeping the same chart id. */
  updateChart: (input: BirthInput) => Promise<Chart>;
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

  /**
   * Recomputes the chart from edited birth details **without minting a new id**.
   *
   * That matters more than it looks. Day logs are stored under
   * `log:${chart.id}:${date}` (state/logs.ts) and scores under
   * `score:${chart.id}:${date}`, so handing 20 프로필 편집 a fresh id would
   * orphan every log the user has written — while the handoff's note for
   * 09·20 requires the opposite: "지난 기록과 문답은 유지하고, 과거 점수는 새
   * 산식으로 다시 매깁니다". Keeping the id preserves the logs; the score
   * cache re-keys itself anyway because the stored `scoreVersion` no longer
   * matches (state/scores.ts), so past days get re-scored on read.
   */
  const updateChart = useCallback(
    async (input: BirthInput) => {
      if (!chart) throw new Error('updateChart called with no chart loaded');
      const next = computeChart(chart.userId, chart.id, input);
      setChart(next);
      const localSave = setJSON(CHART_KEY, next);
      if (token) {
        saveChartRemote(token, next).catch((e) => console.warn('[chart] backend sync failed, kept locally:', e));
      }
      await localSave;
      return next;
    },
    [chart, token],
  );

  const clearChart = useCallback(async () => {
    setChart(null);
    await setJSON(CHART_KEY, null);
  }, []);

  return (
    <ChartContext.Provider value={{ chart, loading, createChart, updateChart, clearChart }}>{children}</ChartContext.Provider>
  );
}

export function useChart() {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used within ChartProvider');
  return ctx;
}
