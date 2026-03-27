'use client';
import { useAdminPendingPayments } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import Image from 'next/image';

const paymentMethodLabel: Record<string, string> = {
  promptpay: 'QR PromptPay',
  transfer: 'โอนธนาคาร',
  onsite: 'จ่ายหน้างาน',
};

export function AdminPayments() {
  const { payments, isLoading, error, refetch, approvePayment, rejectPayment } = useAdminPendingPayments();

  const handleApprove = async (paymentId: string) => {
    const ok = await approvePayment(paymentId);
    if (ok) {
      toast.success('อนุมัติสำเร็จ');
      refetch();
    } else {
      toast.error('อนุมัติไม่สำเร็จ');
    }
  };

  const handleReject = async (paymentId: string) => {
    const ok = await rejectPayment(paymentId);
    if (ok) {
      toast.success('ปฏิเสธสำเร็จ');
      refetch();
    } else {
      toast.error('ปฏิเสธไม่สำเร็จ');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
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

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Avatar className="h-12 w-12 opacity-30">
          <AvatarFallback>✓</AvatarFallback>
        </Avatar>
        <p className="text-sm text-muted-foreground">ไม่มีรายการรอตรวจสอบ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{payments.length} รายการรอตรวจสอบ</p>
      {payments.map((payment) => (
        <Card key={payment.id}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              {/* User info */}
              <Avatar className="h-10 w-10">
                <AvatarImage src={(payment.registration.user as any)?.picture_url ?? undefined} />
                <AvatarFallback>
                  {(payment.registration.user as any)?.display_name?.[0] ?? '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm truncate">
                    {(payment.registration.user as any)?.display_name ?? 'Unknown'}
                  </p>
                  <Badge variant="outline" className="text-xs ml-2">
                    {paymentMethodLabel[payment.registration.payment_method]}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mb-1">
                  {(payment.registration.session as any)?.name ?? 'Unknown Session'}
                  {' · '}
                  {new Date((payment.registration.session as any)?.date).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>

                <p className="text-lg font-bold mb-2">
                  ฿{Number(payment.amount).toLocaleString()}
                </p>

                {/* Slip */}
                {payment.slip_url && (
                  <div className="mb-3 rounded-lg overflow-hidden border">
                    <Image
                      src={payment.slip_url}
                      alt="สลิป"
                      width={300}
                      height={400}
                      className="object-cover w-full max-h-48"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    onClick={() => handleApprove(payment.id)}
                  >
                    <IconCheck size={14} className="mr-1" />
                    อนุมัติ
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(payment.id)}
                  >
                    <IconX size={14} className="mr-1" />
                    ปฏิเสธ
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
