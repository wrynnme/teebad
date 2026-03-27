import { Router } from 'express';
import { z } from 'zod';
import { verifyLiff } from '../middleware/verifyLiff';
import { isAdmin } from '../middleware/isAdmin';
import { supabase } from '../lib/supabase';

const router = Router();

// ── Dashboard Stats ─────────────────────────────────────────
interface DashboardStats {
  total_sessions: number;
  active_sessions: number;
  total_players: number;
  pending_payments: number;
  today_sessions: unknown[];
  recent_payments: unknown[];
}

router.get('/dashboard', verifyLiff, isAdmin, async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [sessionsResult, playersResult, pendingResult] = await Promise.all([
      supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('users')
        .select('line_user_id', { count: 'exact', head: true }),
      supabase
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('paid_status', 'pending'),
    ]);

    const [todaySessionsResult, recentPaymentsResult] = await Promise.all([
      supabase
        .from('sessions')
        .select('*, registered_count:registrations(count)')
        .eq('date', today)
        .order('start_time'),
      supabase
        .from('payments')
        .select(`
          *,
          registration:registrations(
            id, session_id, user_id, paid_status,
            user:users(line_user_id, display_name, picture_url),
            session:sessions(id, name, date)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const todaySessions = (todaySessionsResult.data ?? []).map((s) => ({
      ...s,
      registered_count: Array.isArray(s.registered_count)
        ? (s.registered_count[0] as { count: number })?.count ?? 0
        : 0,
    }));

    const stats: DashboardStats = {
      total_sessions: sessionsResult.count ?? 0,
      active_sessions: todaySessionsResult.data?.filter((s) => s.status !== 'ended').length ?? 0,
      total_players: playersResult.count ?? 0,
      pending_payments: pendingResult.count ?? 0,
      today_sessions: todaySessions,
      recent_payments: recentPaymentsResult.data ?? [],
    };

    res.json({ data: stats });
  } catch (err) {
    console.error('admin/dashboard error:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// ── Pending Payments ────────────────────────────────────────
router.get('/payments/pending', verifyLiff, isAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        registration:registrations(
          id, session_id, user_id, payment_method, paid_status,
          user:users(line_user_id, display_name, picture_url),
          session:sessions(id, name, date)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('admin/payments/pending error:', error);
      res.status(500).json({ error: true, message: 'โหลดข้อมูลไม่สำเร็จ' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('admin/payments/pending exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// ── All Sessions (Admin) ────────────────────────────────────
router.get('/sessions', verifyLiff, isAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        registered_count:registrations(count)
      `)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      console.error('admin/sessions error:', error);
      res.status(500).json({ error: true, message: 'โหลดข้อมูลไม่สำเร็จ' });
      return;
    }

    const sessions = (data ?? []).map((s) => ({
      ...s,
      registered_count: Array.isArray(s.registered_count)
        ? (s.registered_count[0] as { count: number })?.count ?? 0
        : 0,
    }));

    res.json({ data: sessions });
  } catch (err) {
    console.error('admin/sessions exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// ── Update Session (Admin) ─────────────────────────────────
const UpdateSessionSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['open', 'playing', 'ended']).optional(),
  court_count: z.number().int().min(1).max(8).optional(),
  max_players: z.number().int().min(1).optional(),
});

router.patch('/sessions/:id', verifyLiff, isAdmin, async (req, res) => {
  try {
    const parsed = UpdateSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: true, message: 'ข้อมูลไม่ถูกต้อง' });
      return;
    }

    const { data, error } = await supabase
      .from('sessions')
      .update(parsed.data)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: true, message: 'ไม่พบก๊วนนี้' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('admin/sessions/:id PATCH exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// ── End Session (Admin) ────────────────────────────────────
router.post('/sessions/:id/end', verifyLiff, isAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .update({ status: 'ended' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: true, message: 'ไม่พบก๊วนนี้' });
      return;
    }

    res.json({ ok: true, data });
  } catch (err) {
    console.error('admin/sessions/:id/end exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// ── Session Billing (Admin) ───────────────────────────────
router.get('/sessions/:id/billing', verifyLiff, isAdmin, async (req, res) => {
  try {
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (sessionError || !session) {
      res.status(404).json({ error: true, message: 'ไม่พบก๊วนนี้' });
      return;
    }

    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select(`
        *,
        user:users(line_user_id, display_name, picture_url)
      `)
      .eq('session_id', req.params.id);

    if (regError) {
      res.status(500).json({ error: true, message: 'โหลดข้อมูลไม่สำเร็จ' });
      return;
    }

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('id, team1_players, team2_players, status')
      .eq('session_id', req.params.id)
      .eq('status', 'done');

    if (matchesError) {
      res.status(500).json({ error: true, message: 'โหลดข้อมูลไม่สำเร็จ' });
      return;
    }

    // คำนวณ billing
    const durationHours = (() => {
      const [sh, sm] = session.start_time.split(':').map(Number);
      const [eh, em] = session.end_time.split(':').map(Number);
      return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    })();

    const totalCost = Number(session.fee_per_hour) * session.court_count * durationHours;

    // จำนวนเกมแต่ละคน
    const playerGameCount: Record<string, number> = {};
    (matches ?? []).forEach((m) => {
      [...m.team1_players, ...m.team2_players].forEach((uid) => {
        playerGameCount[uid] = (playerGameCount[uid] ?? 0) + 1;
      });
    });

    let collected = 0;
    let outstanding = 0;
    const players = (registrations ?? []).map((reg) => {
      const gamesPlayed = playerGameCount[reg.user_id] ?? 0;
      let amountDue: number;

      if (session.billing_mode === 'equal') {
        amountDue = totalCost / Math.max(registrations!.length, 1);
      } else {
        // by_games: คิดตามจำนวนเกมจริง แล้วปรับคนสุดท้าย
        const gameCost = totalCost / Math.max((matches ?? []).length, 1);
        amountDue = gameCost * gamesPlayed;
      }

      if (reg.paid_status === 'approved') {
        collected += amountDue;
      } else if (reg.paid_status === 'pending') {
        outstanding += amountDue;
      }

      return {
        user_id: reg.user_id,
        display_name: (reg.user as { display_name: string } | null)?.display_name ?? 'Unknown',
        picture_url: (reg.user as { picture_url: string | null } | null)?.picture_url ?? null,
        games_played: gamesPlayed,
        hours_played: durationHours,
        amount_due: Math.round(amountDue * 100) / 100,
        paid_status: reg.paid_status,
        payment_method: reg.payment_method,
        slip_url: reg.slip_url,
      };
    });

    // ปรับคนสุดท้ายถ้า billing_mode === 'by_games'
    if (session.billing_mode === 'by_games' && players.length > 0) {
      const totalCalculated = players.reduce((sum, p) => sum + p.amount_due, 0);
      const diff = Math.round((totalCost - totalCalculated) * 100) / 100;
      if (Math.abs(diff) > 0.01) {
        players[players.length - 1].amount_due = Math.round((players[players.length - 1].amount_due + diff) * 100) / 100;
      }
    }

    res.json({
      data: {
        session_id: session.id,
        total_cost: totalCost,
        court_count: session.court_count,
        duration_hours: durationHours,
        fee_per_hour: session.fee_per_hour,
        billing_mode: session.billing_mode,
        total_games: (matches ?? []).length,
        players,
        collected: Math.round(collected * 100) / 100,
        outstanding: Math.round(outstanding * 100) / 100,
      },
    });
  } catch (err) {
    console.error('admin/sessions/:id/billing exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// ── Update Registration Paid Status (Admin) ────────────────
const UpdatePaidStatusSchema = z.object({
  paid_status: z.enum(['pending', 'approved', 'rejected']),
});

router.patch('/registrations/:id/paid-status', verifyLiff, isAdmin, async (req, res) => {
  try {
    const parsed = UpdatePaidStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: true, message: 'ข้อมูลไม่ถูกต้อง' });
      return;
    }

    const { data, error } = await supabase
      .from('registrations')
      .update({ paid_status: parsed.data.paid_status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: true, message: 'ไม่พบการลงทะเบียนนี้' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('admin/registrations/:id/paid-status exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// ── All Users (Admin) ──────────────────────────────────────
router.get('/users', verifyLiff, isAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('display_name');

    if (error) {
      console.error('admin/users error:', error);
      res.status(500).json({ error: true, message: 'โหลดข้อมูลไม่สำเร็จ' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('admin/users exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// ── Update User (Admin) ────────────────────────────────────
const UpdateUserSchema = z.object({
  display_name: z.string().min(1).optional(),
  is_admin: z.boolean().optional(),
  total_games: z.number().int().min(0).optional(),
  total_wins: z.number().int().min(0).optional(),
});

router.patch('/users/:userId', verifyLiff, isAdmin, async (req, res) => {
  try {
    const parsed = UpdateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: true, message: 'ข้อมูลไม่ถูกต้อง' });
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .update(parsed.data)
      .eq('line_user_id', req.params.userId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: true, message: 'ไม่พบผู้ใช้นี้' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('admin/users/:userId PATCH exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
