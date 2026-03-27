type MatchMode = 'random' | 'rotation' | 'winner_stays' | 'manual';

interface MatchRecord {
  round_number: number;
  team1_players: string[];
  team2_players: string[];
  winner: 1 | 2 | null;
  status: string;
}

interface GenerateInput {
  mode: MatchMode;
  availablePlayers: string[];
  courtCount: number;         // จำนวน courts ที่ว่าง
  gamesPlayed: Record<string, number>; // playerId → games ในก๊วนนี้
  history: MatchRecord[];     // matches ที่ done แล้ว
}

export interface MatchPreview {
  team1: string[];
  team2: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getConsecutiveWins(playerId: string, history: MatchRecord[]): number {
  const sorted = [...history].sort((a, b) => b.round_number - a.round_number);
  let streak = 0;
  for (const m of sorted) {
    const inT1 = m.team1_players.includes(playerId);
    const inT2 = m.team2_players.includes(playerId);
    if (!inT1 && !inT2) break;
    const won = (inT1 && m.winner === 1) || (inT2 && m.winner === 2);
    if (won) streak++;
    else break;
  }
  return streak;
}

export function generateMatches(input: GenerateInput): MatchPreview[] {
  const { mode, availablePlayers, courtCount, gamesPlayed, history } = input;

  const maxCourts = Math.min(courtCount, Math.floor(availablePlayers.length / 4));
  if (maxCourts === 0) return [];
  const playerCount = maxCourts * 4;

  let selected: string[];

  switch (mode) {
    case 'rotation':
      selected = [...availablePlayers]
        .sort((a, b) => (gamesPlayed[a] ?? 0) - (gamesPlayed[b] ?? 0))
        .slice(0, playerCount);
      break;

    case 'winner_stays': {
      const lastRound = Math.max(...history.map(m => m.round_number), 0);
      const lastMatches = history.filter(m => m.round_number === lastRound);
      const winners: string[] = [];
      for (const m of lastMatches) {
        if (m.winner === 1) winners.push(...m.team1_players);
        else if (m.winner === 2) winners.push(...m.team2_players);
      }
      // winners ที่ available และชนะไม่ถึง 3 รอบติด
      const validWinners = winners.filter(
        p => availablePlayers.includes(p) && getConsecutiveWins(p, history) < 3
      );
      const queue = availablePlayers
        .filter(p => !validWinners.includes(p))
        .sort((a, b) => (gamesPlayed[a] ?? 0) - (gamesPlayed[b] ?? 0));
      selected = [...validWinners, ...queue].slice(0, playerCount);
      break;
    }

    case 'manual':
    case 'random':
    default:
      selected = shuffle([...availablePlayers]).slice(0, playerCount);
      break;
  }

  const matches: MatchPreview[] = [];
  for (let i = 0; i < maxCourts; i++) {
    matches.push({
      team1: [selected[i * 4], selected[i * 4 + 1]],
      team2: [selected[i * 4 + 2], selected[i * 4 + 3]],
    });
  }
  return matches;
}
