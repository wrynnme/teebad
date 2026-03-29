// ============================================================
// TeeBad — Board Page /board/[sessionId]
// บอร์ดเกมดิจิทัล realtime
// ============================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLiff } from '@/hooks/useLiff';
import { useAdmin } from '@/hooks/useAdmin';
import { useBoard } from '@/hooks/useBoard';
import { MatchCard } from '@/components/board/MatchCard';
import { GenerateMatchesDialog } from '@/components/board/GenerateMatchesDialog';
import { apiClient } from '@/lib/api';
import type { Session, MatchMode } from '@/types';

export default function BoardPage() {
  const router = useRouter();
  const sessionId = router.query.sessionId as string;

  const { idToken, isReady } = useLiff();
  const { isAdmin } = useAdmin({ idToken });

  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const { matches, loading, error, generateMatches, recordResult, generating } = useBoard({
    sessionId: sessionId ?? '',
    idToken,
  });

  // โหลด session info
  useEffect(() => {
    if (!sessionId || !idToken) return;
    apiClient<Session>(`/api/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    }).then((res) => {
      if (!res.error && res.data) setSession(res.data);
      setSessionLoading(false);
    });
  }, [sessionId, idToken]);

  // แยก matches ตามสถานะ
  const activeMatches = matches.filter((m) => m.status === 'playing');
  const doneMatches = matches.filter((m) => m.status === 'done');

  if (!isReady || sessionLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{session?.name ?? 'Board'} — TeeBad</title>
      </Head>

      <div className="min-h-screen bg-background">
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/session/${sessionId}`} className="text-sm text-muted-foreground">
                ← กลับ
              </Link>
              <h1 className="text-xl font-bold mt-1">
                {session?.name ?? 'บอร์ดเกม'}
              </h1>
              {session && (
                <p className="text-sm text-muted-foreground">
                  {session.date} · {session.start_time}–{session.end_time} ·{' '}
                  {session.court_count} สนาม
                </p>
              )}
            </div>
            {session && (
              <Badge variant={session.status === 'playing' ? 'default' : session.status === 'ended' ? 'secondary' : 'outline'}>
                {session.status === 'open' ? 'เปิดรับ' : session.status === 'playing' ? 'กำลังเล่น' : 'จบแล้ว'}
              </Badge>
            )}
          </div>

          {/* Admin actions */}
          {isAdmin && session?.status !== 'ended' && (
            <div className="flex gap-2">
              <GenerateMatchesDialog
                defaultMode={(session?.default_match_mode as MatchMode) ?? 'random'}
                generating={generating}
                onGenerate={generateMatches}
              />
              <Link href={`/billing/${sessionId}`}>
                <Button size="sm" variant="outline">คิดเงิน</Button>
              </Link>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          {/* Matches */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-2">🏸</p>
              <p>ยังไม่มีแมทช์</p>
              {isAdmin && <p className="text-sm mt-1">กด "สร้างรอบใหม่" เพื่อเริ่มเลย</p>}
            </div>
          ) : (
            <Tabs defaultValue="active">
              <TabsList className="w-full">
                <TabsTrigger value="active" className="flex-1">
                  กำลังเล่น ({activeMatches.length})
                </TabsTrigger>
                <TabsTrigger value="done" className="flex-1">
                  จบแล้ว ({doneMatches.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-3 mt-3">
                {activeMatches.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">ไม่มีแมทช์ที่กำลังเล่น</p>
                ) : (
                  activeMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      isAdmin={isAdmin}
                      onRecordResult={recordResult}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="done" className="space-y-3 mt-3">
                {doneMatches.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">ยังไม่มีแมทช์ที่จบ</p>
                ) : (
                  doneMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      isAdmin={isAdmin}
                      onRecordResult={recordResult}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
}
