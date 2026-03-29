// ============================================================
// TeeBad — useStats hook
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type { PlayerStats } from '@/types';

interface UseStatsOptions {
  idToken: string | null;
}

interface UseStatsReturn {
  leaderboard: PlayerStats[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStats({ idToken }: UseStatsOptions): UseStatsReturn {
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!idToken) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<PlayerStats[]>('/api/stats/leaderboard', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.error) {
        setError(res.message ?? 'โหลด leaderboard ไม่สำเร็จ');
      } else {
        setLeaderboard(res.data ?? []);
      }
    } catch {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { leaderboard, loading, error, refetch: fetchLeaderboard };
}
