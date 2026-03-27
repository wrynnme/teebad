'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconAlertCircle } from '@tabler/icons-react';
const schema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อก๊วน'),
  date: z.string().min(1, 'กรุณาเลือกวันที่'),
  start_time: z.string().min(1, 'กรุณาระบุเวลาเริ่ม'),
  end_time: z.string().min(1, 'กรุณาระบุเวลาจบ'),
  court_count: z.number().int().min(1).max(8),
  max_players: z.number().int().min(4),
  fee_per_hour: z.number().min(0),
  billing_mode: z.enum(['equal', 'by_games']),
  default_match_mode: z.enum(['random', 'rotation', 'winner_stays', 'manual']),
});

type FormValues = z.infer<typeof schema>;

interface SessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function SessionForm({ open, onOpenChange, onSubmit, isLoading, error }: SessionFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      court_count: 2,
      max_players: 16,
      fee_per_hour: 200,
      billing_mode: 'equal',
      default_match_mode: 'rotation',
    },
  });

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>สร้างก๊วนใหม่</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
          {error && (
            <Alert variant="destructive">
              <IconAlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>ชื่อก๊วน</Label>
            <Input placeholder="เช่น ก๊วนเช้าวันศุกร์" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>วันที่</Label>
            <Input type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>เวลาเริ่ม</Label>
              <Input type="time" {...register('start_time')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>เวลาจบ</Label>
              <Input type="time" {...register('end_time')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>จำนวนคอร์ท</Label>
              <Input type="number" min={1} max={8} {...register('court_count', { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>รับสูงสุด (คน)</Label>
              <Input type="number" min={4} {...register('max_players', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>ค่าคอร์ท (บาท/ชม.)</Label>
            <Input type="number" min={0} {...register('fee_per_hour', { valueAsNumber: true })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>วิธีคิดเงิน</Label>
            <Select
              defaultValue={watch('billing_mode')}
              onValueChange={(v) => setValue('billing_mode', v as 'equal' | 'by_games')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">หารเท่ากัน</SelectItem>
                <SelectItem value="by_games">ตามจำนวนเกม</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>โหมดจัดคู่เริ่มต้น</Label>
            <Select
              defaultValue={watch('default_match_mode')}
              onValueChange={(v) => setValue('default_match_mode', v as FormValues['default_match_mode'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">สุ่มคู่</SelectItem>
                <SelectItem value="rotation">หมุนเวียน</SelectItem>
                <SelectItem value="winner_stays">ชนะอยู่</SelectItem>
                <SelectItem value="manual">เลือกเอง</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'กำลังสร้าง...' : 'สร้างก๊วน'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
