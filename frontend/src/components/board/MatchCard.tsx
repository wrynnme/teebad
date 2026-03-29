// ============================================================
// TeeBad — MatchCard component
// แสดงแมทช์ 1 แมทช์บนสนาม + บันทึกผล
// ============================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import type { Match, User } from '@/types';

interface MatchCardProps {
  match: Match;
  isAdmin: boolean;
  onRecordResult: (matchId: string, score1: number, score2: number, winner: 1 | 2) => Promise<void>;
}

function PlayerAvatar({ user }: { user?: Pick<User, 'display_name' | 'picture_url'> | null }) {
  if (!user) return null;
  return (
    <div className="flex items-center gap-1">
      <Avatar className="h-6 w-6">
        <AvatarImage src={user.picture_url ?? undefined} />
        <AvatarFallback className="text-xs">{user.display_name[0]}</AvatarFallback>
      </Avatar>
      <span className="text-sm truncate max-w-[80px]">{user.display_name}</span>
    </div>
  );
}

export function MatchCard({ match, isAdmin, onRecordResult }: MatchCardProps) {
  const [score1, setScore1] = useState(match.score1);
  const [score2, setScore2] = useState(match.score2);
  const [saving, setSaving] = useState(false);

  const isDone = match.status === 'done';

  async function handleSave(winner: 1 | 2) {
    setSaving(true);
    await onRecordResult(match.id, score1, score2, winner);
    setSaving(false);
  }

  return (
    <Card className={isDone ? 'opacity-70' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">สนาม {match.court_number}</CardTitle>
          <div className="flex gap-1">
            <Badge variant={isDone ? 'secondary' : 'default'}>
              {isDone ? 'จบแล้ว' : 'กำลังเล่น'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              รอบ {match.round_number}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-2 items-center">
          {/* ทีม 1 */}
          <div className="space-y-1">
            {match.team1_users?.map((u) => (
              <PlayerAvatar key={u.line_user_id} user={u} />
            )) ?? match.team1_players.map((id) => (
              <span key={id} className="text-xs text-muted-foreground block">{id.slice(0, 8)}…</span>
            ))}
          </div>

          {/* คะแนน */}
          <div className="flex items-center justify-center gap-1">
            {isDone ? (
              <span className="text-xl font-bold tabular-nums">
                {match.score1} – {match.score2}
              </span>
            ) : isAdmin ? (
              <>
                <Input
                  type="number"
                  min={0}
                  value={score1}
                  onChange={(e) => setScore1(Number(e.target.value))}
                  className="w-12 text-center px-1"
                />
                <span>–</span>
                <Input
                  type="number"
                  min={0}
                  value={score2}
                  onChange={(e) => setScore2(Number(e.target.value))}
                  className="w-12 text-center px-1"
                />
              </>
            ) : (
              <span className="text-muted-foreground text-sm">vs</span>
            )}
          </div>

          {/* ทีม 2 */}
          <div className="space-y-1 text-right">
            {match.team2_users?.map((u) => (
              <PlayerAvatar key={u.line_user_id} user={u} />
            )) ?? match.team2_players.map((id) => (
              <span key={id} className="text-xs text-muted-foreground block">{id.slice(0, 8)}…</span>
            ))}
          </div>
        </div>

        {/* ปุ่มบันทึกผล (admin + กำลังเล่น) */}
        {isAdmin && !isDone && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={saving}
              onClick={() => handleSave(1)}
            >
              ทีม 1 ชนะ
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={saving}
              onClick={() => handleSave(2)}
            >
              ทีม 2 ชนะ
            </Button>
          </div>
        )}

        {/* แสดงผู้ชนะ */}
        {isDone && match.winner && (
          <p className="text-center text-sm text-green-600 mt-2 font-medium">
            🏆 ทีม {match.winner} ชนะ
          </p>
        )}
      </CardContent>
    </Card>
  );
}
