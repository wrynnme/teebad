// ============================================================
// TeeBad — useBoard hook
// จัดการ match board + Supabase Realtime
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api';
import type { Match, MatchPreview, MatchMode, MatchmakingResult } from '@/types';

interface UseBoardOptions {
  sessionId: string;
  idToken: string | null;
}

interface UseBoardReturn {
  matches: Match[];
  loading: boolean;
  error: string | null;
  generateMatches: (mode: MatchMode, manualPreviews?: MatchPreview[]) => Promise<void>;
  recordResult: (matchId: string, score1: number, score2: number, winner: 1 | 2) => Promise<void>;
  generating: boolean;
}

export function useBoard({ sessionId, idToken }: UseBoardOptions): UseBoardReturn {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // โหลด matches ครั้งแรก
  const fetchMatches = useCallback(async () => {
    if (!idToken) return;
    try {
      setLoading(true);
      const res = await apiClient<Match[]>(`/api/matches?sessionId=${sessionId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.error) {
        setError(res.message ?? 'โหลดแมทช์ไม่สำเร็จ');
      } else {
        setMatches(res.data ?? []);
      }
    } catch {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }, [sessionId, idToken]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Supabase Realtime — subscribe matches ใน session นี้
  useEffect(() => {
    const channel = supabase
      .channel(`matches:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMatches((prev) => [...prev, payload.new as Match]);
          } else if (payload.eventType === 'UPDATE') {
            setMatches((prev) =>
              prev.map((m) => (m.id === (payload.new as Match).id ? (payload.new as Match) : m)),
            );
          } else if (payload.eventType === 'DELETE') {
            setMatches((prev) => prev.filter((m) => m.id !== (payload.old as Match).id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // สร้าง matches ใหม่
  const generateMatches = useCallback(
    async (mode: MatchMode, manualPreviews?: MatchPreview[]) => {
      if (!idToken) return;
      setGenerating(true);
      setError(null);
      try {
        const body: { session_id: string; mode: MatchMode; manual_previews?: MatchPreview[] } = {
          session_id: sessionId,
          mode,
        };
        if (mode === 'manual' && manualPreviews) {
          body.manual_previews = manualPreviews;
        }

        const res = await apiClient<MatchmakingResult>('/api/matches', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (res.error) {
          setError(res.message ?? 'สร้างแมทช์ไม่สำเร็จ');
        }
        // Realtime จะ update state อัตโนมัติ
      } catch {
        setError('เกิดข้อผิดพลาด');
      } finally {
        setGenerating(false);
      }
    },
    [sessionId, idToken],
  );

  // บันทึกผล
  const recordResult = useCallback(
    async (matchId: string, score1: number, score2: number, winner: 1 | 2) => {
      if (!idToken) return;
      setError(null);
      try {
        const res = await apiClient<Match>(`/api/matches/${matchId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ score1, score2, winner }),
        });
        if (res.error) {
          setError(res.message ?? 'บันทึกผลไม่สำเร็จ');
        }
        // Realtime จะ update state อัตโนมัติ
      } catch {
        setError('เกิดข้อผิดพลาด');
      }
    },
    [idToken],
  );

  return { matches, loading, error, generateMatches, recordResult, generating };
}
