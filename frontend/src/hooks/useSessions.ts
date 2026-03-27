import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Session, Registration, CreateSessionForm, RegisterSessionForm } from '@/types';

type SessionFilter = 'today' | 'week' | 'all';

// ── รายการก๊วน ────────────────────────────────────────────

export function useSessions(filter: SessionFilter = 'today') {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.get<Session[]>(`/api/sessions?filter=${filter}`);
    if (res.error) {
      setError(res.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } else {
      setSessions(res.data ?? []);
    }
    setIsLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, isLoading, error, refetch: fetchSessions };
}

// ── รายละเอียดก๊วน ────────────────────────────────────────

export function useSession(id: string | undefined) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const res = await api.get<Session>(`/api/sessions/${id}`);
    if (res.error) {
      setError(res.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } else {
      setSession(res.data ?? null);
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { session, isLoading, error, refetch: fetchSession };
}

// ── สร้างก๊วนใหม่ ─────────────────────────────────────────

export function useCreateSession() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = async (form: CreateSessionForm): Promise<Session | null> => {
    setIsLoading(true);
    setError(null);
    const res = await api.post<Session>('/api/sessions', form);
    setIsLoading(false);
    if (res.error) {
      setError(res.message ?? 'สร้างก๊วนไม่สำเร็จ');
      return null;
    }
    return res.data ?? null;
  };

  return { createSession, isLoading, error };
}

// ── ลงชื่อ / ยกเลิก ──────────────────────────────────────

export function useRegistration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (form: RegisterSessionForm): Promise<Registration | null> => {
    setIsLoading(true);
    setError(null);
    const res = await api.post<Registration>('/api/registrations', form);
    setIsLoading(false);
    if (res.error) {
      setError(res.message ?? 'ลงชื่อไม่สำเร็จ');
      return null;
    }
    return res.data ?? null;
  };

  const cancelRegistration = async (registrationId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    const res = await api.delete(`/api/registrations/${registrationId}`);
    setIsLoading(false);
    if (res.error) {
      setError(res.message ?? 'ยกเลิกไม่สำเร็จ');
      return false;
    }
    return true;
  };

  return { register, cancelRegistration, isLoading, error };
}
