import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Match, MatchMode, Registration, User } from '@/types';

export type UserMap = Record<string, Pick<User, 'line_user_id' | 'display_name' | 'picture_url'>>;

interface BoardState {
  matches: Match[];
  registrations: Registration[];
  userMap: UserMap;
  isLoading: boolean;
  error: string | null;
}

export function useBoard(sessionId: string | undefined) {
  const [state, setState] = useState<BoardState>({
    matches: [],
    registrations: [],
    userMap: {},
    isLoading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    if (!sessionId) return;

    const [matchRes, sessionRes] = await Promise.all([
      api.get<Match[]>(`/api/matches?session_id=${sessionId}`),
      api.get<{ registrations: (Registration & { user: Pick<User, 'line_user_id' | 'display_name' | 'picture_url'> | null })[] }>(`/api/sessions/${sessionId}`),
    ]);

    if (matchRes.error || sessionRes.error) {
      setState(s => ({ ...s, isLoading: false, error: matchRes.message ?? sessionRes.message ?? 'โหลดข้อมูลไม่สำเร็จ' }));
      return;
    }

    const registrations = (sessionRes.data?.registrations ?? []) as Registration[];
    const userMap: UserMap = {};
    for (const r of registrations) {
      if (r.user) userMap[r.user_id] = r.user;
    }

    setState({
      matches: matchRes.data ?? [],
      registrations,
      userMap,
      isLoading: false,
      error: null,
    });
  }, [sessionId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription สำหรับ matches
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`board:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `session_id=eq.${sessionId}` },
        () => { fetchAll(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, fetchAll]);

  return { ...state, refetch: fetchAll };
}

export function useGenerateMatches() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (sessionId: string, mode: MatchMode): Promise<Match[] | null> => {
    setIsLoading(true);
    setError(null);
    const res = await api.post<Match[]>('/api/matches/generate', { session_id: sessionId, mode });
    setIsLoading(false);
    if (res.error) {
      setError(res.message ?? 'สร้างการจับคู่ไม่สำเร็จ');
      return null;
    }
    return res.data ?? null;
  };

  return { generate, isLoading, error };
}

export function useEndMatch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endMatch = async (matchId: string, score1: number, score2: number): Promise<Match | null> => {
    setIsLoading(true);
    setError(null);
    const res = await api.patch<Match>(`/api/matches/${matchId}`, { score1, score2, status: 'done' });
    setIsLoading(false);
    if (res.error) {
      setError(res.message ?? 'บันทึกคะแนนไม่สำเร็จ');
      return null;
    }
    return res.data ?? null;
  };

  return { endMatch, isLoading, error };
}
