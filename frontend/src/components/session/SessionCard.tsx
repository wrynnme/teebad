import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { IconClock, IconUsers, IconBuildingCommunity } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { Session, SessionStatus } from '@/types';

interface SessionCardProps {
  session: Session;
}

const statusConfig: Record<SessionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'รับสมัคร', variant: 'default' },
  playing: { label: 'กำลังเล่น', variant: 'secondary' },
  ended: { label: 'จบแล้ว', variant: 'outline' },
};

export function SessionCard({ session }: SessionCardProps) {
  const registered = session.registered_count ?? 0;
  const capacity = session.max_players;
  const fillPercent = Math.round((registered / capacity) * 100);
  const isFull = registered >= capacity;
  const status = isFull && session.status === 'open' ? 'full' : session.status;

  const badgeVariant = statusConfig[session.status]?.variant ?? 'outline';
  const badgeLabel = isFull && session.status === 'open'
    ? 'เต็มแล้ว'
    : statusConfig[session.status]?.label;

  const dateObj = new Date(`${session.date}T${session.start_time}`);
  const dayLabel = dateObj.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <Link href={`/session/${session.id}`}>
      <Card className={cn(
        'hover:shadow-md transition-shadow cursor-pointer',
        session.status === 'ended' && 'opacity-60'
      )}>
        <CardContent className="p-4 flex flex-col gap-3">
          {/* Row 1: ชื่อ + badge */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-tight">{session.name}</h3>
            <Badge variant={badgeVariant} className="shrink-0 text-xs">{badgeLabel}</Badge>
          </div>

          {/* Row 2: metadata */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <IconClock size={14} />
              {dayLabel} · {session.start_time}–{session.end_time}
            </span>
            <span className="flex items-center gap-1">
              <IconBuildingCommunity size={14} />
              {session.court_count} คอร์ท
            </span>
          </div>

          {/* Row 3: capacity bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <IconUsers size={13} />
                {registered} / {capacity} คน
              </span>
              <span>{fillPercent}%</span>
            </div>
            <Progress
              value={fillPercent}
              className={cn('h-1.5', isFull && 'bg-muted [&>div]:bg-destructive')}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
