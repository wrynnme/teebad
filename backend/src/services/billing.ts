// ============================================================
// TeeBad — Billing Service
// 2 โหมด: equal (หารเท่า) / by_games (ตามเกมจริง)
// ============================================================

import type { BillingMode, PlayerBill, SessionBill } from '../../../frontend/src/types/index';

interface RegistrationRow {
  id: string;
  user_id: string;
  games_played: number;
  paid_status: string;
  payment_method: string;
  slip_url: string | null;
  amount_due: number | null;
  user?: {
    line_user_id: string;
    display_name: string;
    picture_url: string | null;
  } | null;
}

interface SessionRow {
  id: string;
  start_time: string;   // "HH:MM"
  end_time: string;     // "HH:MM"
  court_count: number;
  fee_per_hour: number;
  billing_mode: BillingMode;
  registrations: RegistrationRow[];
}

// คำนวณชั่วโมงจาก HH:MM สองค่า
function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

// ============================================================
// MODE: equal — หารเท่าทุกคน
// ============================================================
function calcEqual(
  totalCost: number,
  regs: RegistrationRow[],
): PlayerBill[] {
  const playerCount = regs.length;
  if (playerCount === 0) return [];

  const perPerson = Math.ceil(totalCost / playerCount);

  return regs.map((r) => ({
    user_id: r.user_id,
    display_name: r.user?.display_name ?? r.user_id,
    picture_url: r.user?.picture_url ?? null,
    games_played: r.games_played,
    hours_played: 0,
    amount_due: perPerson,
    paid_status: r.paid_status as PlayerBill['paid_status'],
    payment_method: r.payment_method as PlayerBill['payment_method'],
    slip_url: r.slip_url,
  }));
}

// ============================================================
// MODE: by_games — ตามเกมที่เล่นจริง
// round up แต่ละคน แล้วปรับคนสุดท้ายให้ยอดรวมพอดี
// ============================================================
function calcByGames(
  totalCost: number,
  regs: RegistrationRow[],
): PlayerBill[] {
  const totalGames = regs.reduce((sum, r) => sum + r.games_played, 0);

  if (totalGames === 0) {
    // ไม่มีใครเล่นเลย — fallback เป็น equal
    return calcEqual(totalCost, regs);
  }

  const costPerGame = totalCost / totalGames;

  // Round up ทุกคน
  const bills: PlayerBill[] = regs.map((r) => ({
    user_id: r.user_id,
    display_name: r.user?.display_name ?? r.user_id,
    picture_url: r.user?.picture_url ?? null,
    games_played: r.games_played,
    hours_played: 0,
    amount_due: Math.ceil(r.games_played * costPerGame),
    paid_status: r.paid_status as PlayerBill['paid_status'],
    payment_method: r.payment_method as PlayerBill['payment_method'],
    slip_url: r.slip_url,
  }));

  // ปรับคนสุดท้ายให้ยอดรวมพอดีกับ totalCost
  const sumBeforeLast = bills.slice(0, -1).reduce((sum, b) => sum + b.amount_due, 0);
  const last = bills[bills.length - 1];
  if (last) {
    last.amount_due = Math.max(0, totalCost - sumBeforeLast);
  }

  return bills;
}

// ============================================================
// calcSessionBill — entry point หลัก
// ============================================================
export function calcSessionBill(session: SessionRow): SessionBill {
  const durationHours = calcHours(session.start_time, session.end_time);
  const totalCost = Math.round(session.court_count * session.fee_per_hour * durationHours);
  const totalGames = session.registrations.reduce((sum, r) => sum + r.games_played, 0);

  const players =
    session.billing_mode === 'equal'
      ? calcEqual(totalCost, session.registrations)
      : calcByGames(totalCost, session.registrations);

  const collected = players
    .filter((p) => p.paid_status === 'approved' || p.paid_status === 'onsite')
    .reduce((sum, p) => sum + p.amount_due, 0);

  return {
    session_id: session.id,
    total_cost: totalCost,
    court_count: session.court_count,
    duration_hours: durationHours,
    fee_per_hour: session.fee_per_hour,
    billing_mode: session.billing_mode,
    total_games: totalGames,
    players,
    collected,
    outstanding: totalCost - collected,
  };
}
