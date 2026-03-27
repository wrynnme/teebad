import { Router } from 'express';
import { z } from 'zod';
import { verifyLiff } from '../middleware/verifyLiff';
import { supabase } from '../lib/supabase';

const router = Router();

const RegisterSchema = z.object({
  session_id: z.string().uuid(),
  payment_method: z.enum(['promptpay', 'transfer', 'onsite']),
});

// GET /api/registrations?sessionId=xxx
router.get('/', verifyLiff, async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: true, message: 'กรุณาระบุ sessionId' });
      return;
    }

    const { data, error } = await supabase
      .from('registrations')
      .select(`
        *,
        user:users (line_user_id, display_name, picture_url)
      `)
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });

    if (error) {
      res.status(500).json({ error: true, message: 'โหลดรายชื่อไม่สำเร็จ' });
      return;
    }

    res.json({ data: data ?? [] });
  } catch (err) {
    console.error('registrations GET exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/registrations — ลงชื่อเข้าก๊วน
router.post('/', verifyLiff, async (req, res) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: true, message: 'ข้อมูลไม่ถูกต้อง' });
      return;
    }

    const { session_id, payment_method } = parsed.data;
    const userId = req.user!.userId;

    // ตรวจสอบว่าก๊วนยังรับได้อยู่
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('max_players, status')
      .eq('id', session_id)
      .single();

    if (sessionErr || !session) {
      res.status(404).json({ error: true, message: 'ไม่พบก๊วนนี้' });
      return;
    }

    if (session.status === 'ended') {
      res.status(400).json({ error: true, message: 'ก๊วนนี้จบแล้ว' });
      return;
    }

    // นับจำนวนคนที่ลงชื่อแล้ว
    const { count } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session_id);

    if ((count ?? 0) >= session.max_players) {
      res.status(400).json({ error: true, message: 'ก๊วนเต็มแล้ว' });
      return;
    }

    const { data, error } = await supabase
      .from('registrations')
      .insert({ session_id, user_id: userId, payment_method })
      .select(`
        *,
        user:users (line_user_id, display_name, picture_url)
      `)
      .single();

    if (error) {
      // unique constraint violation → ลงชื่อซ้ำ
      if (error.code === '23505') {
        res.status(400).json({ error: true, message: 'ลงชื่อไปแล้ว' });
        return;
      }
      console.error('registrations POST error:', error);
      res.status(500).json({ error: true, message: 'ลงชื่อไม่สำเร็จ' });
      return;
    }

    res.status(201).json({ data });
  } catch (err) {
    console.error('registrations POST exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/registrations/:id — ยกเลิกการลงชื่อ (เฉพาะของตัวเอง)
router.delete('/:id', verifyLiff, async (req, res) => {
  try {
    // ตรวจสอบว่าเป็นของตัวเองก่อนลบ
    const { data: reg, error: fetchErr } = await supabase
      .from('registrations')
      .select('user_id, session_id')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !reg) {
      res.status(404).json({ error: true, message: 'ไม่พบการลงชื่อนี้' });
      return;
    }

    if (reg.user_id !== req.user!.userId) {
      res.status(403).json({ error: true, message: 'ไม่มีสิทธิ์ยกเลิกการลงชื่อนี้' });
      return;
    }

    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      res.status(500).json({ error: true, message: 'ยกเลิกไม่สำเร็จ' });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('registrations DELETE exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
