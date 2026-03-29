// ============================================================
// TeeBad — Payments Route
// GET /api/payments/billing/:sessionId — คำนวณบิล
// POST /api/payments — ส่งหลักฐานชำระ
// PATCH /api/payments/:id/approve — admin อนุมัติ
// PATCH /api/payments/:id/reject — admin ปฏิเสธ
// POST /api/payments/billing/:sessionId/notify-all — ส่งบิลทุกคน
// POST /api/payments/khunthong/:sessionId — สร้างคำสั่งขุนทอง
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { verifyLiff } from '../middleware/verifyLiff';
import { isAdmin } from '../middleware/isAdmin';
import { supabase } from '../lib/supabase';
import { calcSessionBill } from '../services/billing';
import { notifyPersonalBill, notifyPaymentApproved, buildKhunthongCommand } from '../services/lineNotify';

const router = Router();

const SubmitPaymentSchema = z.object({
  registration_id: z.string().uuid(),
  amount: z.number().positive(),
  slip_url: z.string().url().optional(),
});

// GET /api/payments/billing/:sessionId — คำนวณบิลทั้งก๊วน
router.get('/billing/:sessionId', verifyLiff, async (req, res) => {
  try {
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select(`
        id, start_time, end_time, court_count, fee_per_hour, billing_mode,
        registrations (
          id, user_id, games_played, paid_status, payment_method, slip_url, amount_due,
          user:users (line_user_id, display_name, picture_url)
        )
      `)
      .eq('id', req.params.sessionId)
      .single();

    if (sessionErr || !session) {
      res.status(404).json({ error: true, message: 'ไม่พบก๊วนนี้' });
      return;
    }

    const bill = calcSessionBill(session as Parameters<typeof calcSessionBill>[0]);
    res.json({ data: bill });
  } catch (err) {
    console.error('payments billing GET exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/payments — ส่งหลักฐานชำระ
router.post('/', verifyLiff, async (req, res) => {
  try {
    const parsed = SubmitPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: true, message: 'ข้อมูลไม่ถูกต้อง' });
      return;
    }

    const { registration_id, amount, slip_url } = parsed.data;

    // ตรวจสอบว่า registration เป็นของ user นี้จริง
    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .select('user_id, session_id')
      .eq('id', registration_id)
      .single();

    if (regErr || !reg) {
      res.status(404).json({ error: true, message: 'ไม่พบการลงทะเบียน' });
      return;
    }

    if (reg.user_id !== req.user!.userId) {
      res.status(403).json({ error: true, message: 'ไม่มีสิทธิ์' });
      return;
    }

    // สร้าง payment record
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({ registration_id, amount, slip_url: slip_url ?? null })
      .select()
      .single();

    if (payErr) {
      console.error('payments POST error:', payErr);
      res.status(500).json({ error: true, message: 'ส่งหลักฐานไม่สำเร็จ' });
      return;
    }

    // อัปเดต paid_status ใน registration เป็น pending
    await supabase
      .from('registrations')
      .update({ paid_status: 'pending', slip_url: slip_url ?? null })
      .eq('id', registration_id);

    res.status(201).json({ data: payment });
  } catch (err) {
    console.error('payments POST exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/payments/:id/approve — admin อนุมัติ
router.patch('/:id/approve', verifyLiff, isAdmin, async (req, res) => {
  try {
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .update({
        status: 'approved',
        approved_by: req.user!.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('*, registration:registrations(user_id, session_id)')
      .single();

    if (payErr || !payment) {
      res.status(404).json({ error: true, message: 'ไม่พบรายการนี้' });
      return;
    }

    // อัปเดต paid_status ใน registration
    await supabase
      .from('registrations')
      .update({ paid_status: 'approved' })
      .eq('id', payment.registration_id);

    // แจ้งเตือนผู้เล่น
    const reg = payment.registration as { user_id: string; session_id: string } | null;
    if (reg) {
      const { data: session } = await supabase
        .from('sessions')
        .select('name')
        .eq('id', reg.session_id)
        .single();
      const { data: user } = await supabase
        .from('users')
        .select('display_name')
        .eq('line_user_id', reg.user_id)
        .single();

      if (session && user) {
        await notifyPaymentApproved({
          userId: reg.user_id,
          displayName: user.display_name,
          sessionName: session.name,
          amount: payment.amount,
        });
      }
    }

    res.json({ data: payment });
  } catch (err) {
    console.error('payments approve exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/payments/:id/reject — admin ปฏิเสธ
router.patch('/:id/reject', verifyLiff, isAdmin, async (req, res) => {
  try {
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .update({ status: 'rejected' })
      .eq('id', req.params.id)
      .select('registration_id')
      .single();

    if (payErr || !payment) {
      res.status(404).json({ error: true, message: 'ไม่พบรายการนี้' });
      return;
    }

    await supabase
      .from('registrations')
      .update({ paid_status: 'pending' })
      .eq('id', payment.registration_id);

    res.json({ ok: true });
  } catch (err) {
    console.error('payments reject exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/payments/billing/:sessionId/notify-all — ส่งบิลทุกคน (admin)
router.post('/billing/:sessionId/notify-all', verifyLiff, isAdmin, async (req, res) => {
  try {
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select(`
        id, name, date, start_time, end_time, court_count, fee_per_hour, billing_mode,
        registrations (
          id, user_id, games_played, paid_status, payment_method, slip_url, amount_due,
          user:users (line_user_id, display_name, picture_url)
        )
      `)
      .eq('id', req.params.sessionId)
      .single();

    if (sessionErr || !session) {
      res.status(404).json({ error: true, message: 'ไม่พบก๊วนนี้' });
      return;
    }

    const bill = calcSessionBill(session as Parameters<typeof calcSessionBill>[0]);
    const promptpayNumber = process.env.PROMPTPAY_NUMBER;

    let sent = 0;
    let failed = 0;

    for (const player of bill.players) {
      if (player.paid_status === 'approved') continue; // ชำระแล้ว — ไม่ส่งซ้ำ

      const ok = await notifyPersonalBill({
        userId: player.user_id,
        displayName: player.display_name,
        sessionName: session.name,
        sessionDate: (session as { date: string }).date,
        gamesPlayed: player.games_played,
        amountDue: player.amount_due,
        billingMode: bill.billing_mode,
        promptpayNumber,
      });

      if (ok) {
        sent++;
        // บันทึก log
        await supabase.from('notifications_log').insert({
          user_id: player.user_id,
          type: 'personal_bill',
          session_id: session.id,
          success: true,
        });
      } else {
        failed++;
        await supabase.from('notifications_log').insert({
          user_id: player.user_id,
          type: 'personal_bill',
          session_id: session.id,
          success: false,
        });
      }
    }

    res.json({ ok: true, sent, failed });
  } catch (err) {
    console.error('payments notify-all exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/payments/khunthong/:sessionId — สร้างคำสั่งขุนทอง (admin)
router.post('/khunthong/:sessionId', verifyLiff, isAdmin, async (req, res) => {
  try {
    const type = (req.body.type as 'split' | 'remind') ?? 'split';

    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select(`
        id, name, date, start_time, end_time, court_count, fee_per_hour, billing_mode,
        registrations (
          id, user_id, games_played, paid_status, payment_method, slip_url, amount_due,
          user:users (line_user_id, display_name, picture_url)
        )
      `)
      .eq('id', req.params.sessionId)
      .single();

    if (sessionErr || !session) {
      res.status(404).json({ error: true, message: 'ไม่พบก๊วนนี้' });
      return;
    }

    const bill = calcSessionBill(session as Parameters<typeof calcSessionBill>[0]);
    const promptpayNumber = process.env.PROMPTPAY_NUMBER;

    // สำหรับ remind — กรองเฉพาะคนที่ยังค้างอยู่
    const players =
      type === 'remind'
        ? bill.players.filter((p) => p.paid_status !== 'approved' && p.paid_status !== 'onsite')
        : bill.players;

    const command = buildKhunthongCommand({
      type,
      sessionName: session.name,
      players: players.map((p) => ({
        displayName: p.display_name,
        amount: p.amount_due,
      })),
      promptpayNumber,
    });

    res.json({ data: command });
  } catch (err) {
    console.error('payments khunthong exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
