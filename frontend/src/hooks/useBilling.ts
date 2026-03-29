// ============================================================
// TeeBad — useBilling hook
// คำนวณ + จัดการบิล
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type { SessionBill } from '@/types';

interface UseBillingOptions {
  sessionId: string;
  idToken: string | null;
}

interface UseBillingReturn {
  bill: SessionBill | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  notifyAll: () => Promise<{ sent: number; failed: number } | null>;
  notifying: boolean;
  khunthongCommand: string | null;
  buildKhunthong: (type: 'split' | 'remind') => Promise<void>;
  buildingKhunthong: boolean;
}

export function useBilling({ sessionId, idToken }: UseBillingOptions): UseBillingReturn {
  const [bill, setBill] = useState<SessionBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [khunthongCommand, setKhunthongCommand] = useState<string | null>(null);
  const [buildingKhunthong, setBuildingKhunthong] = useState(false);

  const fetchBill = useCallback(async () => {
    if (!idToken || !sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<SessionBill>(`/api/payments/billing/${sessionId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.error) {
        setError(res.message ?? 'โหลดบิลไม่สำเร็จ');
      } else {
        setBill(res.data ?? null);
      }
    } catch {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }, [sessionId, idToken]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const notifyAll = useCallback(async () => {
    if (!idToken) return null;
    setNotifying(true);
    try {
      const res = await apiClient<{ sent: number; failed: number }>(
        `/api/payments/billing/${sessionId}/notify-all`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        },
      );
      if (res.error) {
        setError(res.message ?? 'ส่งบิลไม่สำเร็จ');
        return null;
      }
      return res.data ?? null;
    } catch {
      setError('เกิดข้อผิดพลาด');
      return null;
    } finally {
      setNotifying(false);
    }
  }, [sessionId, idToken]);

  const buildKhunthong = useCallback(
    async (type: 'split' | 'remind') => {
      if (!idToken) return;
      setBuildingKhunthong(true);
      try {
        const res = await apiClient<string>(`/api/payments/khunthong/${sessionId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type }),
        });
        if (!res.error && res.data) {
          setKhunthongCommand(res.data);
        }
      } catch {
        setError('เกิดข้อผิดพลาด');
      } finally {
        setBuildingKhunthong(false);
      }
    },
    [sessionId, idToken],
  );

  return {
    bill,
    loading,
    error,
    refetch: fetchBill,
    notifyAll,
    notifying,
    khunthongCommand,
    buildKhunthong,
    buildingKhunthong,
  };
}
