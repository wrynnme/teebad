// ============================================================
// TeeBad — Partner Locks Route
// GET /api/locks?sessionId=
// POST /api/locks — สร้าง lock request
// PATCH /api/locks/:id/confirm — ยืนยัน lock (user2)
// DELETE /api/locks/:id — ลบ lock
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { verifyLiff } from '../middleware/verifyLiff';
import { supabase } from '../lib/supabase';
import { canCreateLock } from '../services/lockConstraints';

const router = Router();

const CreateLockSchema = z.object({
  session_id: z.string().uuid(),
  user2_id: z.string().min(1),
  lock_type: z.enum(['same_team', 'opponents', 'avoid']),
});

// GET /api/locks?sessionId=<uuid>
router.get('/', verifyLiff, async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: true, message: 'กรุณาระบุ sessionId' });
      return;
    }

    const userId = req.user!.userId;

    // คืนเฉพาะ lock ที่ user นี้เกี่ยวข้อง
    const { data, error } = await supabase
      .from('partner_locks')
      .select(`
        *,
        user1:users!partner_locks_user1_id_fkey (line_user_id, display_name, picture_url),
        user2:users!partner_locks_user2_id_fkey (line_user_id, display_name, picture_url)
      `)
      .eq('session_id', sessionId)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (error) {
      console.error('locks GET error:', error);
      res.status(500).json({ error: true, message: 'โหลดข้อมูล lock ไม่สำเร็จ' });
      return;
    }

    res.json({ data: data ?? [] });
  } catch (err) {
    console.error('locks GET exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/locks — สร้าง lock request
router.post('/', verifyLiff, async (req, res) => {
  try {
    const parsed = CreateLockSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: true, message: 'ข้อมูลไม่ถูกต้อง' });
      return;
    }

    const { session_id, user2_id, lock_type } = parsed.data;
    const user1_id = req.user!.userId;

    // ตรวจสอบว่าทั้งคู่ได้ลงทะเบียนใน session นี้
    const { data: regs } = await supabase
      .from('registrations')
      .select('user_id')
      .eq('session_id', session_id)
      .in('user_id', [user1_id, user2_id]);

    const regUserIds = (regs ?? []).map((r: { user_id: string }) => r.user_id);
    if (!regUserIds.includes(user1_id)) {
      res.status(400).json({ error: true, message: 'คุณยังไม่ได้ลงทะเบียนในก๊วนนี้' });
      return;
    }
    if (!regUserIds.includes(user2_id)) {
      res.status(400).json({ error: true, message: 'ผู้เล่นปลายทางยังไม่ได้ลงทะเบียนในก๊วนนี้' });
      return;
    }

    // โหลด locks ที่มีอยู่ใน session นี้
    const { data: existingLocks } = await supabase
      .from('partner_locks')
      .select('id, user1_id, user2_id, lock_type, confirmed_by_user2')
      .eq('session_id', session_id);

    const check = canCreateLock({
      userId: user1_id,
      targetId: user2_id,
      lockType: lock_type,
      existingLocks: existingLocks ?? [],
    });

    if (!check.ok) {
      res.status(400).json({ error: true, message: check.message });
      return;
    }

    const { data: lock, error: insertErr } = await supabase
      .from('partner_locks')
      .insert({ session_id, user1_id, user2_id, lock_type })
      .select(`
        *,
        user1:users!partner_locks_user1_id_fkey (line_user_id, display_name, picture_url),
        user2:users!partner_locks_user2_id_fkey (line_user_id, display_name, picture_url)
      `)
      .single();

    if (insertErr) {
      console.error('locks POST error:', insertErr);
      res.status(500).json({ error: true, message: 'สร้าง lock ไม่สำเร็จ' });
      return;
    }

    res.status(201).json({ data: lock });
  } catch (err) {
    console.error('locks POST exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/locks/:id/confirm — user2 ยืนยัน lock
router.patch('/:id/confirm', verifyLiff, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // ตรวจสอบว่าเป็น user2 จริง
    const { data: lock, error: fetchErr } = await supabase
      .from('partner_locks')
      .select('user2_id, confirmed_by_user2')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !lock) {
      res.status(404).json({ error: true, message: 'ไม่พบ lock นี้' });
      return;
    }

    if (lock.user2_id !== userId) {
      res.status(403).json({ error: true, message: 'คุณไม่ใช่ผู้รับคำขอ lock นี้' });
      return;
    }

    if (lock.confirmed_by_user2) {
      res.status(400).json({ error: true, message: 'ยืนยันแล้ว' });
      return;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('partner_locks')
      .update({ confirmed_by_user2: true })
      .eq('id', req.params.id)
      .select(`
        *,
        user1:users!partner_locks_user1_id_fkey (line_user_id, display_name, picture_url),
        user2:users!partner_locks_user2_id_fkey (line_user_id, display_name, picture_url)
      `)
      .single();

    if (updateErr || !updated) {
      res.status(500).json({ error: true, message: 'ยืนยัน lock ไม่สำเร็จ' });
      return;
    }

    res.json({ data: updated });
  } catch (err) {
    console.error('locks confirm exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/locks/:id — ลบ lock (เฉพาะผู้ที่สร้างหรือรับ)
router.delete('/:id', verifyLiff, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const { data: lock, error: fetchErr } = await supabase
      .from('partner_locks')
      .select('user1_id, user2_id')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !lock) {
      res.status(404).json({ error: true, message: 'ไม่พบ lock นี้' });
      return;
    }

    if (lock.user1_id !== userId && lock.user2_id !== userId) {
      res.status(403).json({ error: true, message: 'ไม่มีสิทธิ์ลบ lock นี้' });
      return;
    }

    const { error: deleteErr } = await supabase
      .from('partner_locks')
      .delete()
      .eq('id', req.params.id);

    if (deleteErr) {
      res.status(500).json({ error: true, message: 'ลบ lock ไม่สำเร็จ' });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('locks DELETE exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
