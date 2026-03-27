'use client';
import { useState } from 'react';
import { useAdminSessions } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { IconAlertCircle, IconCheck, IconPlayerPlay, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';
import Link from 'next/link';

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: 'รับสมัคร', className: 'bg-green-100 text-green-700' },
  playing: { label: 'กำลังเล่น', className: 'bg-blue-100 text-blue-700' },
  ended: { label: 'จบแล้ว', className: 'bg-gray-100 text-gray-500' },
};

export function AdminSessions() {
  const { sessions, isLoading, error, refetch, endSession } = useAdminSessions();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
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

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-muted-foreground">ยังไม่มีก๊วน</p>
      </div>
    );
  }

  const handleEndSession = async (id: string) => {
    const ok = await endSession(id);
    if (ok) {
      toast.success('จบก๊วนสำเร็จ');
      refetch();
    } else {
      toast.error('จบก๊วนไม่สำเร็จ');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {sessions.map((session) => {
        const status = statusConfig[session.status] ?? statusConfig.ended;
        return (
          <Card key={session.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold truncate">{session.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', status.className)}>
                      {status.label}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(session.date).toLocaleDateString('th-TH', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                    {' · '}
                    {session.start_time}–{session.end_time}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{session.court_count} คอร์ท</span>
                    <span>{session.registered_count}/{session.max_players} คน</span>
                    <span>{session.fee_per_hour} บ/ชม.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  {session.status === 'playing' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => handleEndSession(session.id)}
                    >
                      <IconCheck size={14} className="mr-1" />
                      จบก๊วน
                    </Button>
                  )}
                  {session.status === 'open' && (
                    <Link href={`/session/${session.id}`}>
                      <Button size="sm" variant="outline">
                        ดูรายละเอียด
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
