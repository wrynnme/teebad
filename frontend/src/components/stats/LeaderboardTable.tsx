// ============================================================
// TeeBad — LeaderboardTable component
// ============================================================

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { PlayerStats } from '@/types';

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="text-sm text-muted-foreground w-6 text-center">{rank}</span>;
}

function StreakBadge({ streak }: { streak?: number }) {
  if (!streak || streak === 0) return null;
  const isWin = streak > 0;
  return (
    <Badge
      variant={isWin ? 'default' : 'secondary'}
      className="text-xs"
    >
      {isWin ? `🔥 ${streak} ชนะ` : `❄️ ${Math.abs(streak)} แพ้`}
    </Badge>
  );
}

interface LeaderboardTableProps {
  players: PlayerStats[];
}

export function LeaderboardTable({ players }: LeaderboardTableProps) {
  if (players.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-4xl mb-2">🏆</p>
        <p>ยังไม่มีข้อมูลสถิติ</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player.line_user_id}
          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
        >
          {/* rank */}
          <div className="shrink-0 w-8 flex justify-center">
            <RankBadge rank={player.rank ?? 0} />
          </div>

          {/* avatar + name */}
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={player.picture_url ?? undefined} />
            <AvatarFallback>{player.display_name[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">{player.display_name}</p>
              <StreakBadge streak={player.streak} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Progress value={player.win_rate} className="h-1.5 w-20" />
              <span className="text-xs text-muted-foreground">
                {player.win_rate.toFixed(0)}% ({player.wins}W/{player.losses}L)
              </span>
            </div>
          </div>

          {/* total games */}
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold">{player.games_played}</p>
            <p className="text-xs text-muted-foreground">เกม</p>
          </div>
        </div>
      ))}
    </div>
  );
}
