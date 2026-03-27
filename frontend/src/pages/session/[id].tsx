import { RegistrationList } from '@/components/session/RegistrationList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiff } from '@/hooks/useLiff';
import { useRegistration, useSession, useUpdateSession } from '@/hooks/useSessions';
import { cn } from '@/lib/utils';
import type { PaymentMethod, SessionStatus } from '@/types';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBuildingCommunity,
  IconClock,
  IconLayoutGrid,
  IconPlayerPlay,
  IconFlagCheck,
  IconUsers,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { toast } from 'sonner';

const statusConfig: Record<SessionStatus, { label: string; className: string }> = {
  open: { label: 'รับสมัคร', className: 'bg-green-100 text-green-700' },
  playing: { label: 'กำลังเล่น', className: 'bg-blue-100 text-blue-700' },
  ended: { label: 'จบแล้ว', className: 'bg-gray-100 text-gray-500' },
};


export default function SessionDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { profile, user: me } = useLiff();
  const { session, isLoading, error, refetch } = useSession(id);
  const { register, cancelRegistration, isLoading: actionLoading } = useRegistration();
  const { updateStatus, isLoading: statusLoading } = useUpdateSession();
  const [showRegisterSheet, setShowRegisterSheet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('promptpay');

  // ── Loading ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col gap-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-sm">
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription>{error ?? 'ไม่พบก๊วนนี้'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Derived state ────────────────────────────────────────
  const registrations = session.registrations ?? [];
  const myReg = registrations.find((r) => r.user_id === me?.line_user_id);
  const isRegistered = Boolean(myReg);
  const isFull = registrations.length >= session.max_players;
  const canRegister = !isRegistered && !isFull && session.status !== 'ended';
  const statusCfg = statusConfig[session.status];

  const durationHours = (() => {
    const [sh, sm] = session.start_time.split(':').map(Number);
    const [eh, em] = session.end_time.split(':').map(Number);
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  })();

  const totalCost = session.fee_per_hour * session.court_count * durationHours;

  // ── Handlers ─────────────────────────────────────────────
  const handleRegister = async () => {
    const result = await register({ session_id: session.id, payment_method: paymentMethod });
    if (result) {
      toast.success('ลงชื่อสำเร็จ');
      setShowRegisterSheet(false);
      refetch();
    } else {
      toast.error('ลงชื่อไม่สำเร็จ');
    }
  };

  const handleCancel = async () => {
    if (!myReg) return;
    const ok = await cancelRegistration(myReg.id);
    if (ok) {
      toast.success('ยกเลิกการลงชื่อแล้ว');
      refetch();
    } else {
      toast.error('ยกเลิกไม่สำเร็จ');
    }
  };

  const handleStatusChange = async (newStatus: 'open' | 'playing' | 'ended') => {
    const ok = await updateStatus(session.id, newStatus);
    if (ok) {
      toast.success(newStatus === 'playing' ? 'เริ่มก๊วนแล้ว' : newStatus === 'ended' ? 'จบก๊วนแล้ว' : 'เปิดรับสมัครแล้ว');
      refetch();
      if (newStatus === 'playing') router.push(`/board/${session.id}`);
    } else {
      toast.error('เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  const isAdmin = Boolean(me?.is_admin);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <IconArrowLeft size={18} />
          </Button>
        </Link>
        <h1 className="font-semibold text-base truncate flex-1">{session.name}</h1>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusCfg.className)}>
          {isFull && session.status === 'open' ? 'เต็มแล้ว' : statusCfg.label}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {/* Info card */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconClock size={16} />
            <span>
              {new Date(`${session.date}T00:00`).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
              <br />
              {session.start_time}–{session.end_time} ({durationHours} ชม.)
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconBuildingCommunity size={16} />
            <span>{session.court_count} คอร์ท</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconUsers size={16} />
            <span>{registrations.length} / {session.max_players} คน</span>
          </div>
        </div>

        <Separator />

        {/* Registrations */}
        <div>
          <h2 className="font-semibold mb-3">
            รายชื่อผู้เล่น ({registrations.length})
          </h2>
          <RegistrationList
            registrations={registrations}
            currentUserId={me?.line_user_id}
          />
        </div>

        {/* Board link — สำหรับผู้เล่นทั่วไป */}
        {session.status === 'playing' && !isAdmin && (
          <>
            <Separator />
            <Link href={`/board/${session.id}`}>
              <Button variant="outline" className="w-full" size="lg">
                <IconLayoutGrid size={18} className="mr-2" />
                ดูบอร์ดเกม
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
        {/* Admin: status controls */}
        {isAdmin && (
          <div className="px-4 pt-3 pb-2 flex gap-2 border-b">
            {session.status === 'open' && (
              <Button
                className="flex-1"
                onClick={() => handleStatusChange('playing')}
                disabled={statusLoading}
              >
                <IconPlayerPlay size={16} className="mr-1.5" />
                {statusLoading ? 'กำลังเริ่ม...' : 'เริ่มก๊วน'}
              </Button>
            )}
            {session.status === 'playing' && (
              <>
                <Link href={`/board/${session.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <IconLayoutGrid size={16} className="mr-1.5" />
                    บอร์ดเกม
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleStatusChange('ended')}
                  disabled={statusLoading}
                >
                  <IconFlagCheck size={16} className="mr-1.5" />
                  {statusLoading ? 'กำลังจบ...' : 'จบก๊วน'}
                </Button>
              </>
            )}
            {session.status === 'ended' && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleStatusChange('open')}
                disabled={statusLoading}
              >
                เปิดรับสมัครใหม่
              </Button>
            )}
          </div>
        )}
        {/* User: register/cancel */}
        <div className="p-4">
          {isRegistered ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleCancel}
              disabled={actionLoading || session.status === 'ended'}
            >
              {actionLoading ? 'กำลังยกเลิก...' : 'ยกเลิกการลงชื่อ'}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => setShowRegisterSheet(true)}
              disabled={!canRegister || actionLoading}
            >
              {isFull ? 'เต็มแล้ว' : session.status === 'ended' ? 'ก๊วนจบแล้ว' : 'ลงชื่อเข้าร่วม'}
            </Button>
          )}
        </div>
      </div>

      {/* Register sheet */}
      <Sheet open={showRegisterSheet} onOpenChange={setShowRegisterSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>ลงชื่อเข้าร่วม</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-1.5">
              <Label>วิธีชำระเงิน</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promptpay">QR PromptPay</SelectItem>
                  <SelectItem value="transfer">โอนธนาคาร</SelectItem>
                  <SelectItem value="onsite">จ่ายหน้างาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button
              className="w-full"
              onClick={handleRegister}
              disabled={actionLoading}
            >
              {actionLoading ? 'กำลังลงชื่อ...' : 'ยืนยันลงชื่อ'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
