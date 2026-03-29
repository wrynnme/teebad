// ============================================================
// TeeBad — Matchmaking Service
// 4 โหมด: random / rotation / winner_stays / manual
// ============================================================

import type { MatchMode, MatchPreview, MatchmakingResult } from '../../../frontend/src/types/index';

interface PlayerInfo {
  userId: string;
  gamesPlayed: number;  // สำหรับ rotation mode
  consecutiveWins: number;  // สำหรับ winner_stays mode
}

interface ActiveMatch {
  courtNumber: number;
  team1: string[];
  team2: string[];
  winner?: 1 | 2;
}

// สับเปลี่ยนลำดับแบบ Fisher-Yates
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// แบ่งผู้เล่นเป็นทีมละ 2 คน บนสนามหนึ่ง
function pairToMatch(courtNumber: number, players: string[]): MatchPreview {
  return {
    court_number: courtNumber,
    team1: [players[0], players[1]],
    team2: [players[2], players[3]],
  };
}

// ============================================================
// MODE: random — สุ่มทั้งหมด
// ============================================================
export function matchmakeRandom(
  players: string[],
  courtCount: number,
  roundNumber: number,
): MatchmakingResult {
  const shuffled = shuffle(players);
  const matches: MatchPreview[] = [];
  const playersPerCourt = 4;
  const maxCourts = Math.min(courtCount, Math.floor(shuffled.length / playersPerCourt));

  for (let i = 0; i < maxCourts; i++) {
    const group = shuffled.slice(i * playersPerCourt, (i + 1) * playersPerCourt);
    matches.push(pairToMatch(i + 1, group));
  }

  const queue = shuffled.slice(maxCourts * playersPerCourt);

  return { matches, queue, mode: 'random', round_number: roundNumber };
}

// ============================================================
// MODE: rotation — เล่นน้อยขึ้นก่อน (round-robin fair)
// ============================================================
export function matchmakeRotation(
  players: PlayerInfo[],
  courtCount: number,
  roundNumber: number,
): MatchmakingResult {
  // เรียงจากเล่นน้อยไปมาก แล้วสุ่มในกลุ่มที่เล่นเท่ากัน
  const sorted = [...players].sort((a, b) => {
    if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;
    return Math.random() - 0.5;
  });

  const matches: MatchPreview[] = [];
  const playersPerCourt = 4;
  const maxCourts = Math.min(courtCount, Math.floor(sorted.length / playersPerCourt));

  for (let i = 0; i < maxCourts; i++) {
    const group = sorted.slice(i * playersPerCourt, (i + 1) * playersPerCourt).map((p) => p.userId);
    matches.push(pairToMatch(i + 1, group));
  }

  const queue = sorted.slice(maxCourts * playersPerCourt).map((p) => p.userId);

  return { matches, queue, mode: 'rotation', round_number: roundNumber };
}

// ============================================================
// MODE: winner_stays — ชนะ 3 รอบติดต้องลงคิว
// ============================================================
export function matchmakeWinnerStays(
  players: PlayerInfo[],
  activeMatches: ActiveMatch[],
  courtCount: number,
  roundNumber: number,
): MatchmakingResult {
  const MAX_CONSECUTIVE_WINS = 3;

  // ผู้เล่นที่ชนะติดต่อกัน < 3 ครั้ง และยังอยู่ในสนามที่มีผู้ชนะ
  const mustQueue = new Set<string>();
  const stayingWinners: string[] = [];

  for (const match of activeMatches) {
    if (match.winner === undefined) continue;
    const winners = match.winner === 1 ? match.team1 : match.team2;
    const losers = match.winner === 1 ? match.team2 : match.team1;

    // ผู้แพ้ต้องลงคิว
    losers.forEach((id) => mustQueue.add(id));

    for (const winnerId of winners) {
      const info = players.find((p) => p.userId === winnerId);
      if (info && info.consecutiveWins >= MAX_CONSECUTIVE_WINS) {
        // ชนะครบ 3 ครั้ง — ต้องลงคิว
        mustQueue.add(winnerId);
      } else {
        stayingWinners.push(winnerId);
      }
    }
  }

  // ผู้เล่นที่ไม่ได้อยู่ในสนาม (รอคิว)
  const inCourt = new Set(activeMatches.flatMap((m) => [...m.team1, ...m.team2]));
  const waiting = players
    .filter((p) => !inCourt.has(p.userId) || mustQueue.has(p.userId))
    .sort((a, b) => a.gamesPlayed - b.gamesPlayed)
    .map((p) => p.userId);

  // สนามที่ winner stays จะใช้ winner เดิม + ดึงผู้เล่นจากคิว
  const matches: MatchPreview[] = [];
  const usedCourts = new Set<number>();

  for (const match of activeMatches) {
    if (match.winner === undefined) continue;
    const winners = (match.winner === 1 ? match.team1 : match.team2).filter(
      (id) => !mustQueue.has(id),
    );

    if (winners.length === 2 && waiting.length >= 2) {
      const challengers = waiting.splice(0, 2);
      matches.push(pairToMatch(match.courtNumber, [...winners, ...challengers]));
      usedCourts.add(match.courtNumber);
    }
  }

  // สนามที่เหลือ (ไม่มี winner stays) ใช้ผู้เล่นจากคิว
  for (let court = 1; court <= courtCount && waiting.length >= 4; court++) {
    if (!usedCourts.has(court)) {
      const group = waiting.splice(0, 4);
      matches.push(pairToMatch(court, group));
    }
  }

  return {
    matches,
    queue: waiting,
    mode: 'winner_stays',
    round_number: roundNumber,
  };
}

// ============================================================
// MODE: manual — admin กำหนดเอง (validate เท่านั้น)
// ============================================================
export function validateManualMatch(
  previews: MatchPreview[],
  availablePlayers: string[],
  courtCount: number,
): { valid: boolean; message?: string } {
  const usedPlayers = new Set<string>();

  for (const match of previews) {
    if (match.court_number < 1 || match.court_number > courtCount) {
      return { valid: false, message: `หมายเลขสนาม ${match.court_number} ไม่ถูกต้อง` };
    }
    if (match.team1.length !== 2 || match.team2.length !== 2) {
      return { valid: false, message: `สนาม ${match.court_number}: ต้องมีทีมละ 2 คน` };
    }
    for (const id of [...match.team1, ...match.team2]) {
      if (!availablePlayers.includes(id)) {
        return { valid: false, message: `ผู้เล่น ${id} ไม่ได้ลงทะเบียน` };
      }
      if (usedPlayers.has(id)) {
        return { valid: false, message: `ผู้เล่น ${id} อยู่ในหลายสนาม` };
      }
      usedPlayers.add(id);
    }
  }

  return { valid: true };
}

// ============================================================
// Entry point — เลือก mode แล้ว dispatch
// ============================================================
export function runMatchmaking(params: {
  mode: MatchMode;
  players: PlayerInfo[];
  courtCount: number;
  roundNumber: number;
  activeMatches?: ActiveMatch[];
  manualPreviews?: MatchPreview[];
  availablePlayers?: string[];
}): MatchmakingResult | { valid: boolean; message?: string } {
  const { mode, players, courtCount, roundNumber } = params;

  switch (mode) {
    case 'random':
      return matchmakeRandom(
        players.map((p) => p.userId),
        courtCount,
        roundNumber,
      );

    case 'rotation':
      return matchmakeRotation(players, courtCount, roundNumber);

    case 'winner_stays':
      return matchmakeWinnerStays(
        players,
        params.activeMatches ?? [],
        courtCount,
        roundNumber,
      );

    case 'manual':
      return validateManualMatch(
        params.manualPreviews ?? [],
        params.availablePlayers ?? players.map((p) => p.userId),
        courtCount,
      );
  }
}
