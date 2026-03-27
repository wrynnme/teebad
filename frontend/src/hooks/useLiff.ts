import { useContext } from 'react';
import { LiffContext } from '@/contexts/LiffContext';

export function useLiff() {
  const ctx = useContext(LiffContext);
  if (!ctx) throw new Error('useLiff must be used within LiffProvider');
  return ctx;
}
