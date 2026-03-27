import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Session, User, SessionBill } from '@/types';

interface PendingPayment {
  id: string;
  registration_id: string;
  amount: number;
  slip_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  registration: {
    id: string;
    session_id: string;
    user_id: string;
    payment_method: 'promptpay' | 'transfer' | 'onsite';
    paid_status: 'pending' | 'approved' | 'rejected' | 'onsite';
    user?: Pick<User, 'line_user_id' | 'display_name' | 'picture_url'>;
    session?: Pick<Session, 'id' | 'name' | 'date'>;
  };
}

interface AdminDashboardStats {
  total_sessions: number;
  active_sessions: number;
  total_players: number;
  pending_payments: number;
  today_sessions: Session[];
  recent_payments: PendingPayment[];
}

interface AdminSessionWithDetails extends Session {
  registrations: { user_id: string; paid_status: string }[];
}

// ── Dashboard Stats ──────────────────────────────────────
export function useAdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.get<AdminDashboardStats>('/api/admin/dashboard');
    if (res.error) {
      setError(res.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } else {
      setStats(res.data ?? null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}

// ── Pending Payments ──────────────────────────────────────
export function useAdminPendingPayments() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.get<PendingPayment[]>('/api/admin/payments/pending');
    if (res.error) {
      setError(res.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } else {
      setPayments(res.data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const approvePayment = async (paymentId: string): Promise<boolean> => {
    const res = await api.patch(`/api/payments/${paymentId}/approve`, {});
    if (res.error) return false;
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    return true;
  };

  const rejectPayment = async (paymentId: string): Promise<boolean> => {
    const res = await api.patch(`/api/payments/${paymentId}/reject`, {});
    if (res.error) return false;
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    return true;
  };

  return { payments, isLoading, error, refetch: fetchPayments, approvePayment, rejectPayment };
}

// ── All Sessions (Admin) ─────────────────────────────────
export function useAdminSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.get<Session[]>('/api/admin/sessions');
    if (res.error) {
      setError(res.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } else {
      setSessions(res.data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const updateSession = async (id: string, data: Partial<Session>): Promise<boolean> => {
    const res = await api.patch<Session>(`/api/admin/sessions/${id}`, data);
    if (res.error) return false;
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...res.data } : s)));
    return true;
  };

  const endSession = async (id: string): Promise<boolean> => {
    const res = await api.post(`/api/admin/sessions/${id}/end`, {});
    if (res.error) return false;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'ended' as const } : s))
    );
    return true;
  };

  return { sessions, isLoading, error, refetch: fetchSessions, updateSession, endSession };
}

// ── All Users (Admin) ─────────────────────────────────────
export function useAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.get<User[]>('/api/admin/users');
    if (res.error) {
      setError(res.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } else {
      setUsers(res.data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (userId: string, data: Partial<User>): Promise<boolean> => {
    const res = await api.patch<User>(`/api/admin/users/${userId}`, data);
    if (res.error) return false;
    setUsers((prev) => prev.map((u) => (u.line_user_id === userId ? { ...u, ...res.data } : u)));
    return true;
  };

  return { users, isLoading, error, refetch: fetchUsers, updateUser };
}

// ── Session Billing ────────────────────────────────────────
export function useAdminBilling(sessionId: string) {
  const [bill, setBill] = useState<SessionBill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBill = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    const res = await api.get<SessionBill>(`/api/admin/sessions/${sessionId}/billing`);
    if (res.error) {
      setError(res.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } else {
      setBill(res.data ?? null);
    }
    setIsLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const updatePaidStatus = async (
    registrationId: string,
    paidStatus: 'approved' | 'rejected' | 'pending'
  ): Promise<boolean> => {
    const res = await api.patch(`/api/admin/registrations/${registrationId}/paid-status`, { paid_status: paidStatus });
    if (res.error) return false;
    fetchBill();
    return true;
  };

  return { bill, isLoading, error, refetch: fetchBill, updatePaidStatus };
}
