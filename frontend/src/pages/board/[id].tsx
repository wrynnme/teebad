import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLiff } from '@/hooks/useLiff';
import { useBoard, useGenerateMatches, useEndMatch, type UserMap } from '@/hooks/useBoard';
import { useSession } from '@/hooks/useSessions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconUsers,
  IconSwords,
  IconCheck,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Match, MatchMode } from '@/types';

const modeLabel: Record<MatchMode, string> = {
  random: 'สุ่มคู่',
  rotation: 'หมุนเวียน (เล่นน้อยก่อน)',
  winner_stays: 'ชนะอยู่คอร์ท',
  manual: 'สุ่มคู่',
};

function PlayerChip({ userId, userMap, small }: { userId: string; userMap: UserMap; small?: boolean }) {
  const u = userMap[userId];
  return (
    <div className={cn('flex items-center gap-1', small ? 'gap-0.5' : 'gap-1.5')}>
      <Avatar className={small ? 'h-5 w-5' : 'h-7 w-7'}>
        <AvatarImage src={u?.picture_url ?? undefined} />
        <AvatarFallback className={small ? 'text-[9px]' : 'text-xs'}>
          {u?.display_name?.[0] ?? '?'}
        </AvatarFallback>
      </Avatar>
      <span className={cn('truncate max-w-[80px]', small ? 'text-[11px]' : 'text-xs font-medium')}>
        {u?.display_name ?? userId.slice(-4)}
      </span>
    </div>
  );
}

function MatchCard({
  match,
  userMap,
  isAdmin,
  onEnd,
}: {
  match: Match;
  userMap: UserMap;
  isAdmin: boolean;
  onEnd: (matchId: string, s1: number, s2: number) => Promise<void>;
}) {
  const [score1, setScore1] = useState(match.score1);
  const [score2, setScore2] = useState(match.score2);
  const [ending, setEnding] = useState(false);

  if (match.status === 'done') {
    const w = match.winner;
    return (
      <div className="rounded-xl border bg-muted/40 p-3 opacity-60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">คอร์ท {match.court_number} · รอบ {match.round_number}</span>
          <Badge variant="secondary" className="text-xs">จบแล้ว</Badge>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className={cn('flex flex-col gap-1', w === 1 && 'font-semibold text-primary')}>
            {match.team1_players.map(p => <PlayerChip key={p} userId={p} userMap={userMap} small />)}
          </div>
          <span className="text-base font-bold text-muted-foreground shrink-0">{match.score1} : {match.score2}</span>
          <div className={cn('flex flex-col gap-1 items-end', w === 2 && 'font-semibold text-primary')}>
            {match.team2_players.map(p => <PlayerChip key={p} userId={p} userMap={userMap} small />)}
          </div>
        </div>
      </div>
    );
  }

  const handleEnd = async () => {
    setEnding(true);
    await onEnd(match.id, score1, score2);
    setEnding(false);
  };

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">คอร์ท {match.court_number} · รอบ {match.round_number}</span>
        <Badge className="text-xs bg-blue-500 hover:bg-blue-500">กำลังเล่น</Badge>
      </div>

      <div className="flex items-center gap-2">
        {/* ทีม 1 */}
        <div className="flex-1 flex flex-col gap-1">
          {match.team1_players.map(p => <PlayerChip key={p} userId={p} userMap={userMap} />)}
        </div>

        {/* คะแนน */}
        <div className="flex items-center gap-1 shrink-0">
          {isAdmin ? (
            <>
              <Input
                type="number" min={0} max={99}
                value={score1}
                onChange={e => setScore1(Number(e.target.value))}
                className="w-12 h-8 text-center text-sm px-1"
              />
              <span className="text-muted-foreground font-bold">:</span>
              <Input
                type="number" min={0} max={99}
                value={score2}
                onChange={e => setScore2(Number(e.target.value))}
                className="w-12 h-8 text-center text-sm px-1"
              />
            </>
          ) : (
            <span className="text-lg font-bold">{match.score1} : {match.score2}</span>
          )}
        </div>

        {/* ทีม 2 */}
        <div className="flex-1 flex flex-col gap-1 items-end">
          {match.team2_players.map(p => <PlayerChip key={p} userId={p} userMap={userMap} />)}
        </div>
      </div>

      {isAdmin && (
        <Button
          size="sm"
          className="w-full mt-3 h-8"
          onClick={handleEnd}
          disabled={ending}
        >
          <IconCheck size={14} className="mr-1" />
          {ending ? 'กำลังบันทึก...' : 'จบแมตช์'}
        </Button>
      )}
    </div>
  );
}

export default function BoardPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { user: me } = useLiff();
  const { session, isLoading: sessionLoading } = useSession(id);
  const { matches, registrations, userMap, isLoading, error } = useBoard(id);
  const { generate, isLoading: generating, error: genError } = useGenerateMatches();
  const { endMatch } = useEndMatch();
  const [mode, setMode] = useState<MatchMode>('rotation');

  const isAdmin = Boolean(me?.is_admin);

  const activeMatches = matches.filter(m => m.status === 'playing');
  const doneMatches = matches.filter(m => m.status === 'done');

  const busyPlayerIds = new Set(
    activeMatches.flatMap(m => [...m.team1_players, ...m.team2_players])
  );
  const queue = registrations
    .filter(r => !busyPlayerIds.has(r.user_id))
    .sort((a, b) => a.games_played - b.games_played);

  if (isLoading || sessionLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col gap-4">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-sm">
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!id) return;
    const result = await generate(id, mode);
    if (result) {
      toast.success(`สร้าง ${result.length} แมตช์แล้ว`);
    } else if (genError) {
      toast.error(genError);
    }
  };

  const handleEndMatch = async (matchId: string, s1: number, s2: number) => {
    const result = await endMatch(matchId, s1, s2);
    if (result) {
      toast.success('บันทึกคะแนนแล้ว');
    } else {
      toast.error('บันทึกคะแนนไม่สำเร็จ');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href={`/session/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <IconArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold text-base leading-none">{session?.name ?? 'กระดาน'}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeMatches.length} แมตช์กำลังเล่น · คิว {queue.length} คน
          </p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* กำลังเล่น */}
        {activeMatches.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
              <IconSwords size={16} className="text-blue-500" />
              กำลังเล่น ({activeMatches.length})
            </h2>
            <div className="flex flex-col gap-3">
              {activeMatches.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  userMap={userMap}
                  isAdmin={isAdmin}
                  onEnd={handleEndMatch}
                />
              ))}
            </div>
          </section>
        )}

        {/* คิว */}
        <section>
          <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
            <IconUsers size={16} className="text-muted-foreground" />
            คิวรอ ({queue.length} คน)
          </h2>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">ไม่มีผู้เล่นในคิว</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {queue.map(r => (
                <div key={r.user_id} className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={userMap[r.user_id]?.picture_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {userMap[r.user_id]?.display_name?.[0] ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col leading-none">
                    <span className="text-xs font-medium">{userMap[r.user_id]?.display_name ?? r.user_id.slice(-4)}</span>
                    <span className="text-[10px] text-muted-foreground">{r.games_played} เกม</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* แมตช์ที่จบแล้ว */}
        {doneMatches.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">ผลแมตช์ ({doneMatches.length})</h2>
            <div className="flex flex-col gap-2">
              {[...doneMatches].reverse().map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  userMap={userMap}
                  isAdmin={isAdmin}
                  onEnd={handleEndMatch}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bottom action — admin only */}
      {isAdmin && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-2">
          <Select value={mode} onValueChange={v => setMode(v as MatchMode)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rotation">หมุนเวียน</SelectItem>
              <SelectItem value="random">สุ่มคู่</SelectItem>
              <SelectItem value="winner_stays">ชนะอยู่คอร์ท</SelectItem>
              <SelectItem value="manual">สุ่มคู่ (manual)</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={generating} className="shrink-0">
            {generating ? 'กำลังสร้าง...' : 'สร้างรอบใหม่'}
          </Button>
        </div>
      )}
    </div>
  );
}
