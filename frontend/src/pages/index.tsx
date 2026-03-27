import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLiff } from '@/hooks/useLiff';
import { useSessions, useCreateSession } from '@/hooks/useSessions';
import { SessionCard } from '@/components/session/SessionCard';
import { SessionForm } from '@/components/session/SessionForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconPlus, IconAlertCircle, IconBrandLine, IconShirtSport, IconShieldCheck } from '@tabler/icons-react';
import { toast } from 'sonner';
import type { CreateSessionForm } from '@/types';

// ใช้ type ตรงกับ SessionForm component
type SessionFormValues = Omit<CreateSessionForm, 'court_count' | 'max_players' | 'fee_per_hour'> & {
  court_count: number;
  max_players: number;
  fee_per_hour: number;
};

type Filter = 'today' | 'week' | 'all';

function SessionList({ filter }: { filter: Filter }) {
  const { sessions, isLoading, error } = useSessions(filter);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
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
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <IconShirtSport size={40} className="opacity-30" />
        <p className="text-sm">ไม่มีก๊วนในช่วงเวลานี้</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}

export default function Home() {
  const { profile, user, isLoading: liffLoading, error: liffError } = useLiff();
  const { createSession, isLoading: creating, error: createError } = useCreateSession();
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  // Loading LIFF
  if (liffLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3 pt-8">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (liffError) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-sm">
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription>{liffError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleCreateSession = async (data: SessionFormValues) => {
    const session = await createSession(data);
    if (session) {
      toast.success('สร้างก๊วนสำเร็จ');
      setShowForm(false);
      router.push(`/session/${session.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <IconShirtSport size={22} className="text-primary" />
          <span className="font-bold text-lg">TeeBad</span>
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.pictureUrl} alt={profile.displayName} />
              <AvatarFallback>{profile.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium leading-none">{profile.displayName}</span>
              {user?.is_admin && (
                <Link href="/admin">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <IconShieldCheck size={16} className="text-primary" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs defaultValue="today">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="today" className="flex-1">วันนี้</TabsTrigger>
            <TabsTrigger value="week" className="flex-1">สัปดาห์นี้</TabsTrigger>
            <TabsTrigger value="all" className="flex-1">ทั้งหมด</TabsTrigger>
          </TabsList>

          <TabsContent value="today"><SessionList filter="today" /></TabsContent>
          <TabsContent value="week"><SessionList filter="week" /></TabsContent>
          <TabsContent value="all"><SessionList filter="all" /></TabsContent>
        </Tabs>
      </div>

      {/* FAB — admin only */}
      {user?.is_admin && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          onClick={() => setShowForm(true)}
        >
          <IconPlus size={24} />
        </Button>
      )}

      {/* Session Form Dialog */}
      <SessionForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleCreateSession}
        isLoading={creating}
        error={createError}
      />
    </div>
  );
}
