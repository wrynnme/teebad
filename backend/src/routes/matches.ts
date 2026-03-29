// ============================================================
// TeeBad — Matches Route
// GET /api/matches?sessionId=
// POST /api/matches (สร้าง match จาก matchmaking)
// PATCH /api/matches/:id (บันทึกผล)
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { verifyLiff } from '../middleware/verifyLiff';
import { isAdmin } from '../middleware/isAdmin';
import { supabase } from '../lib/supabase';
import {
  matchmakeRandom,
  matchmakeRotation,
  matchmakeWinnerStays,
  validateManualMatch,
} from '../services/matchmaking';
import { applyLockConstraints, tryFixLockViolations } from '../services/lockConstraints';

const router = Router();

const GenerateMatchesSchema = z.object({
  session_id: z.string().uuid(),
  mode: z.enum(['random', 'rotation', 'winner_stays', 'manual']),
  manual_previews: z
    .array(
      z.object({
        court_number: z.number().int().min(1),
        team1: z.array(z.string()).length(2),
        team2: z.array(z.string()).length(2),
      }),
    )
    .optional(),
});

const RecordResultSchema = z.object({
  score1: z.number().int().min(0),
  score2: z.number().int().min(0),
  winner: z.union([z.literal(1), z.literal(2)]),
});

// GET /api/matches?sessionId=<uuid>
router.get('/', verifyLiff, async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: true, message: 'กรุณาระบุ sessionId' });
      return;
    }

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_number', { ascending: true })
      .order('court_number', { ascending: true });

    if (error) {
      console.error('matches GET error:', error);
      res.status(500).json({ error: true, message: 'โหลดข้อมูลแมทช์ไม่สำเร็จ' });
      return;
    }

    res.json({ data: data ?? [] });
  } catch (err) {
    console.error('matches GET exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/matches — generate matches (admin only)
router.post('/', verifyLiff, isAdmin, async (req, res) => {
  try {
    const parsed = GenerateMatchesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: true, message: parsed.error.errors[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
      return;
    }

    const { session_id, mode, manual_previews } = parsed.data;

    // โหลด session
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('court_count, default_match_mode, status')
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

    // โหลด registrations
    const { data: regs, error: regsErr } = await supabase
      .from('registrations')
      .select('user_id, games_played')
      .eq('session_id', session_id);

    if (regsErr || !regs) {
      res.status(500).json({ error: true, message: 'โหลดรายชื่อผู้เล่นไม่สำเร็จ' });
      return;
    }

    // หา round ล่าสุด
    const { data: lastMatch } = await supabase
      .from('matches')
      .select('round_number')
      .eq('session_id', session_id)
      .order('round_number', { ascending: false })
      .limit(1)
      .single();

    const nextRound = (lastMatch?.round_number ?? 0) + 1;

    // โหลด confirmed locks
    const { data: locks } = await supabase
      .from('partner_locks')
      .select('*')
      .eq('session_id', session_id)
      .eq('confirmed_by_user2', true);

    const confirmedLocks = locks ?? [];

    // โหลด active matches สำหรับ winner_stays
    const { data: activeMatches } = await supabase
      .from('matches')
      .select('court_number, team1_players, team2_players, winner')
      .eq('session_id', session_id)
      .eq('status', 'playing');

    const players = regs.map((r) => ({
      userId: r.user_id,
      gamesPlayed: r.games_played,
      consecutiveWins: 0, // TODO: คำนวณจาก match history จริง
    }));

    let previews;

    if (mode === 'manual') {
      if (!manual_previews?.length) {
        res.status(400).json({ error: true, message: 'กรุณาระบุการจับคู่' });
        return;
      }
      const validation = validateManualMatch(
        manual_previews,
        players.map((p) => p.userId),
        session.court_count,
      );
      if (!validation.valid) {
        res.status(400).json({ error: true, message: validation.message });
        return;
      }
      previews = manual_previews;
    } else if (mode === 'random') {
      const result = matchmakeRandom(players.map((p) => p.userId), session.court_count, nextRound);
      previews = result.matches;
    } else if (mode === 'rotation') {
      const result = matchmakeRotation(players, session.court_count, nextRound);
      previews = result.matches;
    } else {
      // winner_stays
      const active = (activeMatches ?? []).map((m) => ({
        courtNumber: m.court_number,
        team1: m.team1_players,
        team2: m.team2_players,
        winner: m.winner as 1 | 2 | undefined,
      }));
      const result = matchmakeWinnerStays(players, active, session.court_count, nextRound);
      previews = result.matches;
    }

    // Apply lock constraints
    if (confirmedLocks.length > 0) {
      const lockRows = confirmedLocks.map((l: { id: string; user1_id: string; user2_id: string; lock_type: string; confirmed_by_user2: boolean }) => ({
        id: l.id,
        user1_id: l.user1_id,
        user2_id: l.user2_id,
        lock_type: l.lock_type as 'same_team' | 'opponents' | 'avoid',
        confirmed_by_user2: l.confirmed_by_user2,
      }));

      const fixed = tryFixLockViolations(previews, lockRows);
      if (!fixed) {
        // Fallback: ใช้ previews เดิมแต่แจ้ง admin
        const { violations } = applyLockConstraints(previews, lockRows);
        res.status(200).json({
          data: previews,
          warning: 'ไม่สามารถจัดให้ตรง lock ได้ทั้งหมด กรุณาตรวจสอบ',
          violations,
          round_number: nextRound,
        });
        return;
      }
      previews = fixed;
    }

    // Insert matches ลง DB
    const matchRows = previews.map((p) => ({
      session_id,
      court_number: p.court_number,
      round_number: nextRound,
      match_mode: mode,
      team1_players: p.team1,
      team2_players: p.team2,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from('matches')
      .insert(matchRows)
      .select();

    if (insertErr) {
      console.error('matches POST insert error:', insertErr);
      res.status(500).json({ error: true, message: 'สร้างแมทช์ไม่สำเร็จ' });
      return;
    }

    // อัปเดต session status เป็น playing
    await supabase
      .from('sessions')
      .update({ status: 'playing' })
      .eq('id', session_id)
      .eq('status', 'open');

    res.status(201).json({ data: inserted, round_number: nextRound });
  } catch (err) {
    console.error('matches POST exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/matches/:id — บันทึกผล (admin only)
router.patch('/:id', verifyLiff, isAdmin, async (req, res) => {
  try {
    const parsed = RecordResultSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: true, message: 'ข้อมูลไม่ถูกต้อง' });
      return;
    }

    const { score1, score2, winner } = parsed.data;

    // โหลด match ก่อนเพื่อเอา team players
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('session_id, team1_players, team2_players, status')
      .eq('id', req.params.id)
      .single();

    if (matchErr || !match) {
      res.status(404).json({ error: true, message: 'ไม่พบแมทช์นี้' });
      return;
    }

    if (match.status === 'done') {
      res.status(400).json({ error: true, message: 'แมทช์นี้จบแล้ว' });
      return;
    }

    // อัปเดต match
    const { data: updated, error: updateErr } = await supabase
      .from('matches')
      .update({ score1, score2, winner, status: 'done', ended_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateErr || !updated) {
      res.status(500).json({ error: true, message: 'บันทึกผลไม่สำเร็จ' });
      return;
    }

    // อัปเดต games_played ของทุกผู้เล่น
    const allPlayers = [...match.team1_players, ...match.team2_players];
    for (const userId of allPlayers) {
      await supabase.rpc('increment_games_played', {
        p_session_id: match.session_id,
        p_user_id: userId,
      }).catch(() => {
        // fallback: manual update
        supabase
          .from('registrations')
          .select('games_played')
          .eq('session_id', match.session_id)
          .eq('user_id', userId)
          .single()
          .then(({ data: reg }) => {
            if (reg) {
              supabase
                .from('registrations')
                .update({ games_played: reg.games_played + 1 })
                .eq('session_id', match.session_id)
                .eq('user_id', userId);
            }
          });
      });
    }

    // อัปเดต total_games และ total_wins ใน users
    for (const userId of allPlayers) {
      const isWinner =
        (winner === 1 && match.team1_players.includes(userId)) ||
        (winner === 2 && match.team2_players.includes(userId));

      const { data: user } = await supabase
        .from('users')
        .select('total_games, total_wins')
        .eq('line_user_id', userId)
        .single();

      if (user) {
        await supabase
          .from('users')
          .update({
            total_games: user.total_games + 1,
            total_wins: isWinner ? user.total_wins + 1 : user.total_wins,
          })
          .eq('line_user_id', userId);
      }
    }

    res.json({ data: updated });
  } catch (err) {
    console.error('matches PATCH exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
