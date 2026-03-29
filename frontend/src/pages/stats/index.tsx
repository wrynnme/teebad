// ============================================================
// TeeBad — Stats Page /stats
// อันดับและสถิติผู้เล่น
// ============================================================

import Head from 'next/head';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useLiff } from '@/hooks/useLiff';
import { useStats } from '@/hooks/useStats';
import { LeaderboardTable } from '@/components/stats/LeaderboardTable';

export default function StatsPage() {
  const { idToken, isReady } = useLiff();
  const { leaderboard, loading, error, refetch } = useStats({ idToken });

  if (!isReady || loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-48" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>อันดับ & สถิติ — TeeBad</title>
      </Head>

      <div className="min-h-screen bg-background">
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-sm text-muted-foreground">
                ← หน้าแรก
              </Link>
              <h1 className="text-xl font-bold mt-1">อันดับ & สถิติ 🏆</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={refetch}>
              รีเฟรช
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          <LeaderboardTable players={leaderboard} />
        </div>
      </div>
    </>
  );
}
