import { Router } from 'express';
import { z } from 'zod';
import { verifyLiff } from '../middleware/verifyLiff';
import { supabase } from '../lib/supabase';

const router = Router();

const SyncBody = z.object({
  display_name: z.string().min(1),
  picture_url: z.string().url().nullable(),
});

// POST /api/users/sync — upsert user หลัง LIFF login
router.post('/sync', verifyLiff, async (req, res) => {
  try {
    const parsed = SyncBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: true, message: 'ข้อมูลไม่ถูกต้อง' });
      return;
    }

    const { display_name, picture_url } = parsed.data;
    const userId = req.user!.userId;

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          line_user_id: userId,
          display_name,
          picture_url,
        },
        { onConflict: 'line_user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('users/sync error:', error);
      res.status(500).json({ error: true, message: 'บันทึกข้อมูลผู้ใช้ไม่สำเร็จ' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('users/sync exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/users/me — ข้อมูลตัวเอง
router.get('/me', verifyLiff, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('line_user_id', req.user!.userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: true, message: 'ไม่พบข้อมูลผู้ใช้' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('users/me exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
