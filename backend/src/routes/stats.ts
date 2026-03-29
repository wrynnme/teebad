// ============================================================
// TeeBad — Stats Route
// GET /api/stats/leaderboard — อันดับผู้เล่น
// GET /api/stats/session/:id — สถิติก๊วน
// GET /api/stats/player/:userId — สถิติผู้เล่นคนนึง
// ============================================================

import { Router } from 'express';
import { verifyLiff } from '../middleware/verifyLiff';
import { supabase } from '../lib/supabase';
import type { PlayerStats, SessionStats } from '../../../frontend/src/types/index';

const router = Router();

// GET /api/stats/leaderboard?limit=20
router.get('/leaderboard', verifyLiff, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .order('wins', { ascending: false })
      .order('win_rate', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('leaderboard GET error:', error);
      res.status(500).json({ error: true, message: 'โหลด leaderboard ไม่สำเร็จ' });
      return;
    }

    // เพิ่ม rank และ streak
    const ranked: PlayerStats[] = (data ?? []).map((p, i) => ({
      line_user_id: p.line_user_id,
      display_name: p.display_name,
      picture_url: p.picture_url,
      games_played: Number(p.games_played),
      wins: Number(p.wins),
      losses: Number(p.losses),
      win_rate: Number(p.win_rate),
      rank: i + 1,
    }));

    res.json({ data: ranked });
  } catch (err) {
    console.error('leaderboard GET exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/stats/session/:id
router.get('/session/:id', verifyLiff, async (req, res) => {
  try {
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, name, date, court_count')
      .eq('id', req.params.id)
      .single();

    if (sessionErr || !session) {
      res.status(404).json({ error: true, message: 'ไม่พบก๊วนนี้' });
      return;
    }

    // นับแมทช์ทั้งหมดในก๊วน
    const { count: totalGames } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', req.params.id)
      .eq('status', 'done');

    // นับผู้เล่น
    const { count: playerCount } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', req.params.id);

    // คำนวณรายรับ
    const { data: regs } = await supabase
      .from('registrations')
      .select('amount_due, paid_status')
      .eq('session_id', req.params.id);

    const totalRevenue = (regs ?? []).reduce(
      (sum, r) => sum + (r.amount_due ?? 0),
      0,
    );
    const collected = (regs ?? [])
      .filter((r) => r.paid_status === 'approved' || r.paid_status === 'onsite')
      .reduce((sum, r) => sum + (r.amount_due ?? 0), 0);

    const stats: SessionStats = {
      session_id: session.id,
      session_name: session.name,
      date: session.date,
      total_games: totalGames ?? 0,
      court_count: session.court_count,
      player_count: playerCount ?? 0,
      total_revenue: totalRevenue,
      collected,
      outstanding: totalRevenue - collected,
    };

    res.json({ data: stats });
  } catch (err) {
    console.error('stats session GET exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/stats/player/:userId
router.get('/player/:userId', verifyLiff, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('line_user_id', req.params.userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: true, message: 'ไม่พบผู้เล่นนี้' });
      return;
    }

    // คำนวณ streak จาก matches ล่าสุด
    const { data: recentMatches } = await supabase
      .from('matches')
      .select('winner, team1_players, team2_players')
      .or(
        `team1_players.cs.{"${req.params.userId}"},team2_players.cs.{"${req.params.userId}"}`,
      )
      .eq('status', 'done')
      .order('ended_at', { ascending: false })
      .limit(10);

    let streak = 0;
    if (recentMatches && recentMatches.length > 0) {
      const firstResult = getMatchResult(recentMatches[0], req.params.userId);
      for (const match of recentMatches) {
        const result = getMatchResult(match, req.params.userId);
        if (result === firstResult) {
          streak += firstResult === 'win' ? 1 : -1;
        } else {
          break;
        }
      }
    }

    const stats: PlayerStats = {
      line_user_id: data.line_user_id,
      display_name: data.display_name,
      picture_url: data.picture_url,
      games_played: Number(data.games_played),
      wins: Number(data.wins),
      losses: Number(data.losses),
      win_rate: Number(data.win_rate),
      streak,
    };

    res.json({ data: stats });
  } catch (err) {
    console.error('stats player GET exception:', err);
    res.status(500).json({ error: true, message: 'เกิดข้อผิดพลาด' });
  }
});

function getMatchResult(
  match: { winner: number | null; team1_players: string[]; team2_players: string[] },
  userId: string,
): 'win' | 'loss' | 'unknown' {
  if (!match.winner) return 'unknown';
  const inTeam1 = match.team1_players.includes(userId);
  if ((match.winner === 1 && inTeam1) || (match.winner === 2 && !inTeam1)) return 'win';
  return 'loss';
}

export default router;
