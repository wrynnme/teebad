'use client';
import { useAdminDashboard } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconAlertCircle, IconCalendarEvent, IconReceipt, IconShirtSport, IconUsers } from '@tabler/icons-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function AdminDashboard() {
  const { stats, isLoading, error } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <IconAlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <IconCalendarEvent size={18} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">ก๊วนทั้งหมด</span>
            </div>
            <p className="text-2xl font-bold">{stats.total_sessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <IconShirtSport size={18} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">กำลังเล่น</span>
            </div>
            <p className="text-2xl font-bold">{stats.active_sessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <IconUsers size={18} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">ผู้เล่นทั้งหมด</span>
            </div>
            <p className="text-2xl font-bold">{stats.total_players}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <IconReceipt size={18} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">รอตรวจ</span>
            </div>
            <p className="text-2xl font-bold">{stats.pending_payments}</p>
          </CardContent>
        </Card>
      </div>

      {/* Today Sessions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ก๊วนวันนี้</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.today_sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">ไม่มีก๊วนวันนี้</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.today_sessions.map((session: any) => (
                <Link key={session.id} href={`/session/${session.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{session.name}</p>
                      <p className="text-xs text-muted-foreground">{session.start_time}–{session.end_time}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={session.status === 'playing' ? 'default' : 'secondary'} className="text-xs">
                        {session.status === 'open' ? 'รับสมัคร' : session.status === 'playing' ? 'กำลังเล่น' : 'จบแล้ว'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {session.registered_count}/{session.max_players}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
