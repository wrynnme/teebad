// ============================================================
// TeeBad — BillTable component
// แสดงบิลรายคน
// ============================================================

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { SessionBill, PlayerBill } from '@/types';

const PAID_STATUS_LABEL: Record<PlayerBill['paid_status'], string> = {
  pending: 'รอตรวจสอบ',
  approved: 'ชำระแล้ว',
  rejected: 'ปฏิเสธ',
  onsite: 'จ่ายหน้างาน',
};

const PAID_STATUS_VARIANT: Record<
  PlayerBill['paid_status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  approved: 'default',
  onsite: 'default',
  pending: 'secondary',
  rejected: 'destructive',
};

interface BillTableProps {
  bill: SessionBill;
}

export function BillTable({ bill }: BillTableProps) {
  const collectPercent = bill.total_cost > 0
    ? Math.round((bill.collected / bill.total_cost) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* สรุปรวม */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">สรุปบิล</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">ค่าคอร์ทรวม</span>
            <span className="font-medium text-right">{bill.total_cost.toLocaleString()} บาท</span>
            <span className="text-muted-foreground">เก็บได้แล้ว</span>
            <span className="font-medium text-right text-green-600">
              {bill.collected.toLocaleString()} บาท
            </span>
            <span className="text-muted-foreground">ค้างชำระ</span>
            <span className="font-medium text-right text-red-500">
              {bill.outstanding.toLocaleString()} บาท
            </span>
            <span className="text-muted-foreground">รูปแบบคิดเงิน</span>
            <span className="text-right">
              {bill.billing_mode === 'equal' ? 'หารเท่า' : 'ตามเกม'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>ความคืบหน้า</span>
              <span>{collectPercent}%</span>
            </div>
            <Progress value={collectPercent} />
          </div>
        </CardContent>
      </Card>

      {/* รายคน */}
      <div className="space-y-2">
        {bill.players.map((player) => (
          <Card key={player.user_id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={player.picture_url ?? undefined} />
                  <AvatarFallback>{player.display_name[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{player.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {bill.billing_mode === 'by_games'
                      ? `${player.games_played} เกม`
                      : `หารเท่า`}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-semibold">{player.amount_due.toLocaleString()} บาท</p>
                  <Badge
                    variant={PAID_STATUS_VARIANT[player.paid_status]}
                    className="text-xs mt-0.5"
                  >
                    {PAID_STATUS_LABEL[player.paid_status]}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
