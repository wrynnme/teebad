// ============================================================
// TeeBad — GenerateMatchesDialog
// Admin เลือกโหมดและสั่งสร้างแมทช์ใหม่
// ============================================================

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import type { MatchMode } from '@/types';

interface GenerateMatchesDialogProps {
  defaultMode: MatchMode;
  generating: boolean;
  onGenerate: (mode: MatchMode) => Promise<void>;
}

const MODE_LABELS: Record<MatchMode, string> = {
  random: 'สุ่ม (Random)',
  rotation: 'หมุนเวียน — เล่นน้อยขึ้นก่อน',
  winner_stays: 'ชนะอยู่ — แพ้ลงคิว',
  manual: 'เลือกเอง (Manual)',
};

export function GenerateMatchesDialog({
  defaultMode,
  generating,
  onGenerate,
}: GenerateMatchesDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<MatchMode>(defaultMode);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    if (mode === 'manual') {
      setError('โหมด Manual ต้องกำหนดคู่ผ่านหน้า Board โดยตรง');
      return;
    }
    await onGenerate(mode);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ สร้างรอบใหม่</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>สร้างแมทช์รอบใหม่</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">โหมดจับคู่</label>
            <Select value={mode} onValueChange={(v) => setMode(v as MatchMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MODE_LABELS) as MatchMode[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'กำลังสร้าง…' : 'สร้างแมทช์'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
