'use client';
import { createContext, useEffect, useState, ReactNode } from 'react';
import { initLiff, liffLogin, isInLineClient, getLiffIdToken } from '@/lib/liff';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

interface LiffContextValue {
  profile: LiffProfile | null;
  user: User | null;          // ข้อมูลจาก DB
  isLoading: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  idToken: string | null;
  error: string | null;
}

export const LiffContext = createContext<LiffContextValue | null>(null);

export function LiffProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInClient, setIsInClient] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const liff = await initLiff();

        const inClient = isInLineClient();
        setIsInClient(inClient);

        if (!liff.isLoggedIn()) {
          // เปิดนอก LINE client → redirect login
          liffLogin();
          return;
        }

        setIsLoggedIn(true);

        const liffProfile = await liff.getProfile();
        setProfile({
          userId: liffProfile.userId,
          displayName: liffProfile.displayName,
          pictureUrl: liffProfile.pictureUrl ?? undefined,
        });

        const token = getLiffIdToken();
        setIdToken(token);

        // Sync user กับ backend
        const res = await api.post<User>('/api/users/sync', {
          display_name: liffProfile.displayName,
          picture_url: liffProfile.pictureUrl ?? null,
        });
        if (res.data) setUser(res.data);

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'LIFF init failed';
        setError(msg);
        console.error('LiffProvider error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  return (
    <LiffContext.Provider value={{ profile, user, isLoading, isLoggedIn, isInClient, idToken, error }}>
      {children}
    </LiffContext.Provider>
  );
}
