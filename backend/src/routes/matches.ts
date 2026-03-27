import { Router } from 'express';
import { z } from 'zod';
import { verifyLiff } from '../middleware/verifyLiff';
import { isAdmin } from '../middleware/isAdmin';
import { supabase } from '../lib/supabase';
import { generateMatches } from '../services/matchmaking';

const router = Router();

// GET /api/matches?session_id=X
router.get('/', verifyLiff, async (req, res) => {
  try {
    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      res.status(400).json({ error: true, message: 'session_id required' });
      return;
    }

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_number', { ascending: true })
      .order('court_number', { ascending: true });

    if (error) {
      res.status(500).json({ error: true, message: 'โหลดข้อมูลไม่สำเร็จ' });
      return;
    }

    res.json({ data: data ?? [] });
  } catch (err) {
    console.error('matches GET exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/matches/generate — admin only
const GenerateSchema = z.object({
  session_id: z.string().uuid(),
  mode: z.enum(['random', 'rotation', 'winner_stays', 'manual']),
});

router.post('/generate', verifyLiff, isAdmin, async (req, res) => {
  try {
    const parsed = GenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: true, message: 'ข้อมูลไม่ถูกต้อง' });
      return;
    }
    const { session_id, mode } = parsed.data;

    // ดึงข้อมูลก๊วน
    const { data: session } = await supabase
      .from('sessions')
      .select('court_count')
      .eq('id', session_id)
      .single();

    if (!session) {
      res.status(404).json({ error: true, message: 'ไม่พบก๊วนนี้' });
      return;
    }

    // ดึงผู้เล่นที่ลงทะเบียน + games_played
    const { data: registrations } = await supabase
      .from('registrations')
      .select('user_id, games_played, opted_out')
      .eq('session_id', session_id);

    // กรองเฉพาะผู้เล่นที่ไม่ได้ opt-out
    const allPlayers = (registrations ?? [])
      .filter(r => !r.opted_out)
      .map(r => r.user_id);
    const gamesPlayed: Record<string, number> = {};
    for (const r of registrations ?? []) {
      gamesPlayed[r.user_id] = r.games_played;
    }

    // ดึง matches ที่กำลังเล่นอยู่
    const { data: activeMatches } = await supabase
      .from('matches')
      .select('court_number, team1_players, team2_players')
      .eq('session_id', session_id)
      .eq('status', 'playing');

    const busyPlayers = new Set<string>();
    const activeCourts = new Set<number>();
    for (const m of activeMatches ?? []) {
      (m.team1_players as string[]).forEach(p => busyPlayers.add(p));
      (m.team2_players as string[]).forEach(p => busyPlayers.add(p));
      activeCourts.add(m.court_number as number);
    }

    const availablePlayers = allPlayers.filter(p => !busyPlayers.has(p));

    if (availablePlayers.length < 4) {
      res.status(400).json({ error: true, message: 'ผู้เล่นไม่เพียงพอ (ต้องการอย่างน้อย 4 คน)' });
      return;
    }

    // หา courts ที่ว่าง
    const freeCourts: number[] = [];
    for (let i = 1; i <= session.court_count; i++) {
      if (!activeCourts.has(i)) freeCourts.push(i);
    }

    if (freeCourts.length === 0) {
      res.status(400).json({ error: true, message: 'ทุกคอร์ทกำลังใช้งานอยู่' });
      return;
    }

    // ดึง history สำหรับ winner_stays
    const { data: history } = await supabase
      .from('matches')
      .select('round_number, team1_players, team2_players, winner, status')
      .eq('session_id', session_id)
      .eq('status', 'done')
      .order('round_number', { ascending: true });

    // คำนวณ round_number ถัดไป
    const { data: lastRoundData } = await supabase
      .from('matches')
      .select('round_number')
      .eq('session_id', session_id)
      .order('round_number', { ascending: false })
      .limit(1);

    const roundNumber = (lastRoundData?.[0]?.round_number ?? 0) + 1;

    // สร้างการจับคู่
    const previews = generateMatches({
      mode,
      availablePlayers,
      courtCount: freeCourts.length,
      gamesPlayed,
      history: history ?? [],
    });

    if (previews.length === 0) {
      res.status(400).json({ error: true, message: 'ไม่สามารถสร้างการจับคู่ได้' });
      return;
    }

    const now = new Date().toISOString();
    const matchesToInsert = previews.map((m, idx) => ({
      session_id,
      court_number: freeCourts[idx],
      round_number: roundNumber,
      match_mode: mode,
      team1_players: m.team1,
      team2_players: m.team2,
      status: 'playing',
      started_at: now,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('matches')
      .insert(matchesToInsert)
      .select();

    if (insertError) {
      console.error('matches generate insert error:', insertError);
      res.status(500).json({ error: true, message: 'สร้างการจับคู่ไม่สำเร็จ' });
      return;
    }

    // อัพเดต games_played สำหรับผู้เล่นในรอบนี้
    const playersInRound = previews.flatMap(m => [...m.team1, ...m.team2]);
    for (const playerId of playersInRound) {
      await supabase
        .from('registrations')
        .update({ games_played: (gamesPlayed[playerId] ?? 0) + 1 })
        .eq('session_id', session_id)
        .eq('user_id', playerId);
    }

    res.status(201).json({ data: inserted });
  } catch (err) {
    console.error('matches generate exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/matches/:id — admin: บันทึกคะแนน + จบแมตช์
const UpdateMatchSchema = z.object({
  score1: z.number().int().min(0).optional(),
  score2: z.number().int().min(0).optional(),
  status: z.enum(['playing', 'done']).optional(),
});

router.patch('/:id', verifyLiff, isAdmin, async (req, res) => {
  try {
    const parsed = UpdateMatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: true, message: 'ข้อมูลไม่ถูกต้อง' });
      return;
    }

    const update: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.status === 'done') {
      update.ended_at = new Date().toISOString();
      const s1 = parsed.data.score1 ?? 0;
      const s2 = parsed.data.score2 ?? 0;
      update.winner = s1 > s2 ? 1 : s2 > s1 ? 2 : null;
    }

    const { data, error } = await supabase
      .from('matches')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: true, message: 'ไม่พบแมตช์นี้' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('matches PATCH exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
