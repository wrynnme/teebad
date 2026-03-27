import { Router } from 'express';
import { z } from 'zod';
import { verifyLiff } from '../middleware/verifyLiff';
import { isAdmin } from '../middleware/isAdmin';
import { supabase } from '../lib/supabase';

const router = Router();

const CreateSessionSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อก๊วน'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'รูปแบบเวลาไม่ถูกต้อง'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'รูปแบบเวลาไม่ถูกต้อง'),
  court_count: z.number().int().min(1).max(8),
  max_players: z.number().int().min(1),
  fee_per_hour: z.number().min(0),
  billing_mode: z.enum(['equal', 'by_games']),
  default_match_mode: z.enum(['random', 'rotation', 'winner_stays', 'manual']).optional().default('rotation'),
});

const UpdateSessionSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['open', 'playing', 'ended']).optional(),
  court_count: z.number().int().min(1).max(8).optional(),
  max_players: z.number().int().min(1).optional(),
});

// GET /api/sessions?filter=today|week|all
router.get('/', verifyLiff, async (req, res) => {
  try {
    const filter = (req.query.filter as string) ?? 'today';
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('sessions')
      .select(`
        *,
        registered_count:registrations(count)
      `)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (filter === 'today') {
      query = query.eq('date', today);
    } else if (filter === 'week') {
      const weekLater = new Date();
      weekLater.setDate(weekLater.getDate() + 7);
      query = query
        .gte('date', today)
        .lte('date', weekLater.toISOString().split('T')[0]);
    }
    // filter === 'all' → ไม่กรอง

    const { data, error } = await query;

    if (error) {
      console.error('sessions GET error:', error);
      res.status(500).json({ error: true, message: 'โหลดข้อมูลก๊วนไม่สำเร็จ' });
      return;
    }

    // แปลง registered_count จาก [{count: N}] → N
    const sessions = (data ?? []).map((s) => ({
      ...s,
      registered_count: Array.isArray(s.registered_count)
        ? (s.registered_count[0] as { count: number })?.count ?? 0
        : 0,
    }));

    res.json({ data: sessions });
  } catch (err) {
    console.error('sessions GET exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/sessions/:id
router.get('/:id', verifyLiff, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        registrations (
          *,
          user:users (line_user_id, display_name, picture_url)
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: true, message: 'ไม่พบก๊วนนี้' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('sessions GET/:id exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/sessions — admin only
router.post('/', verifyLiff, isAdmin, async (req, res) => {
  try {
    const parsed = CreateSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
      res.status(400).json({ error: true, message });
      return;
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({ ...parsed.data, created_by: req.user!.userId })
      .select()
      .single();

    if (error) {
      console.error('sessions POST error:', error);
      res.status(500).json({ error: true, message: 'สร้างก๊วนไม่สำเร็จ' });
      return;
    }

    res.status(201).json({ data });
  } catch (err) {
    console.error('sessions POST exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/sessions/:id — admin only
router.patch('/:id', verifyLiff, isAdmin, async (req, res) => {
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
    console.error('sessions PATCH exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/sessions/:id — admin only
router.delete('/:id', verifyLiff, isAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      res.status(500).json({ error: true, message: 'ลบก๊วนไม่สำเร็จ' });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('sessions DELETE exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
