import { useState } from 'react';
import { useRouter } from 'next/router';
import { useLiff } from '@/hooks/useLiff';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconAlertCircle, IconShieldCheck, IconReceipt, IconUsers, IconLayoutGrid, IconCalendarEvent } from '@tabler/icons-react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminPayments } from '@/components/admin/AdminPayments';
import { AdminSessions } from '@/components/admin/AdminSessions';
import { AdminUsers } from '@/components/admin/AdminUsers';

export default function AdminPage() {
  const router = useRouter();
  const { profile, user, isLoading: liffLoading, error: liffError } = useLiff();

  if (liffLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
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

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center gap-4 text-center">
        <IconShieldCheck size={48} className="text-muted-foreground opacity-40" />
        <div>
          <h2 className="font-semibold text-lg">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-muted-foreground text-sm mt-1">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <h1 className="font-bold text-lg">Admin Panel</h1>
        <span className="text-xs text-muted-foreground">ผู้ดูแล: {profile?.displayName}</span>
      </div>

      {/* Tabs */}
      <div className="p-4">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4 h-auto">
            <TabsTrigger value="dashboard" className="flex-col gap-1 h-auto py-2">
              <IconLayoutGrid size={16} />
              <span className="text-xs">แดชบอร์ด</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-col gap-1 h-auto py-2">
              <IconReceipt size={16} />
              <span className="text-xs">รอตรวจ</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex-col gap-1 h-auto py-2">
              <IconCalendarEvent size={16} />
              <span className="text-xs">ก๊วน</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-col gap-1 h-auto py-2">
              <IconUsers size={16} />
              <span className="text-xs">ผู้เล่น</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>
          <TabsContent value="payments">
            <AdminPayments />
          </TabsContent>
          <TabsContent value="sessions">
            <AdminSessions />
          </TabsContent>
          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
