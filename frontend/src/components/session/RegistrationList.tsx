import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import type { Registration, PaidStatus } from '@/types';

interface RegistrationListProps {
  registrations: Registration[];
  isLoading?: boolean;
  currentUserId?: string;
}

const paidStatusConfig: Record<PaidStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'รอชำระ', variant: 'outline' },
  approved: { label: 'จ่ายแล้ว', variant: 'default' },
  rejected: { label: 'ถูกปฏิเสธ', variant: 'destructive' },
  onsite: { label: 'จ่ายหน้างาน', variant: 'secondary' },
};

export function RegistrationList({ registrations, isLoading, currentUserId }: RegistrationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex flex-col gap-1 flex-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        ยังไม่มีผู้ลงชื่อ
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y">
      {registrations.map((reg, idx) => {
        const user = reg.user;
        const isMe = reg.user_id === currentUserId;
        const statusCfg = paidStatusConfig[reg.paid_status];

        return (
          <div key={reg.id} className="flex items-center gap-3 py-2.5">
            {/* ลำดับ */}
            <span className="text-xs text-muted-foreground w-5 text-center">{idx + 1}</span>

            {/* Avatar */}
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={user?.picture_url ?? undefined} alt={user?.display_name} />
              <AvatarFallback className="text-xs">
                {user?.display_name?.[0] ?? '?'}
              </AvatarFallback>
            </Avatar>

            {/* ชื่อ + เกม */}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium leading-none truncate">
                {user?.display_name ?? 'ไม่ทราบชื่อ'}
                {isMe && <span className="text-primary ml-1 text-xs">(คุณ)</span>}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {reg.games_played} เกม
              </span>
            </div>

            {/* เช็คอิน */}
            {reg.checked_in && (
              <IconCircleCheckFilled size={16} className="text-green-500 shrink-0" />
            )}

            {/* สถานะการชำระ */}
            <Badge variant={statusCfg.variant} className="text-xs shrink-0">
              {statusCfg.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
