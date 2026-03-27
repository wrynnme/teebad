// ============================================================
// TeeBad — Shared TypeScript Types
// ============================================================

// ── Enums ──────────────────────────────────────────────────

export type MatchMode = 'random' | 'rotation' | 'winner_stays' | 'manual';
export type BillingMode = 'equal' | 'by_games';
export type SessionStatus = 'open' | 'playing' | 'ended';
export type PaymentMethod = 'promptpay' | 'transfer' | 'onsite';
export type PaidStatus = 'pending' | 'approved' | 'rejected' | 'onsite';
export type MatchStatus = 'playing' | 'done';
export type LockType = 'same_team' | 'opponents' | 'avoid';
export type NotificationType =
  | 'registration_confirmed'
  | 'payment_approved'
  | 'session_reminder'
  | 'personal_bill'
  | 'outstanding_reminder';

// ── Core Entities ──────────────────────────────────────────

export interface User {
  line_user_id: string;
  display_name: string;
  picture_url: string | null;
  is_admin: boolean;
  total_games: number;
  total_wins: number;
  created_at: string;
}

export interface Session {
  id: string;
  name: string;
  date: string;           // YYYY-MM-DD
  start_time: string;     // HH:MM
  end_time: string;       // HH:MM
  court_count: number;    // 1–8
  max_players: number;
  fee_per_hour: number;
  billing_mode: BillingMode;
  default_match_mode: MatchMode;
  status: SessionStatus;
  created_by: string;
  created_at: string;
  // computed fields (จาก join)
  registered_count?: number;
  registrations?: Registration[];
}

export interface Registration {
  id: string;
  session_id: string;
  user_id: string;
  payment_method: PaymentMethod;
  paid_status: PaidStatus;
  slip_url: string | null;
  amount_due: number | null;
  games_played: number;
  checked_in: boolean;
  checked_in_at: string | null;
  opted_out: boolean;
  joined_at: string;
  // joined fields
  user?: Pick<User, 'line_user_id' | 'display_name' | 'picture_url'>;
}

export interface Match {
  id: string;
  session_id: string;
  court_number: number;
  round_number: number;
  match_mode: MatchMode;
  team1_players: string[];  // array of line_user_id
  team2_players: string[];
  score1: number;
  score2: number;
  winner: 1 | 2 | null;
  status: MatchStatus;
  started_at: string;
  ended_at: string | null;
  // enriched fields (populate จาก frontend)
  team1_users?: Pick<User, 'line_user_id' | 'display_name' | 'picture_url'>[];
  team2_users?: Pick<User, 'line_user_id' | 'display_name' | 'picture_url'>[];
}

export interface Payment {
  id: string;
  registration_id: string;
  amount: number;
  slip_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface PartnerLock {
  id: string;
  session_id: string;
  user1_id: string;
  user2_id: string;
  lock_type: LockType;
  confirmed_by_user2: boolean;
  created_at: string;
  // enriched fields
  user1?: Pick<User, 'line_user_id' | 'display_name' | 'picture_url'>;
  user2?: Pick<User, 'line_user_id' | 'display_name' | 'picture_url'>;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  type: NotificationType;
  session_id: string | null;
  sent_at: string;
  success: boolean;
}

// ── Billing Domain ─────────────────────────────────────────

export interface PlayerBill {
  user_id: string;
  display_name: string;
  picture_url: string | null;
  games_played: number;
  hours_played: number;
  amount_due: number;
  paid_status: PaidStatus;
  payment_method: PaymentMethod;
  slip_url: string | null;
}

export interface SessionBill {
  session_id: string;
  total_cost: number;
  court_count: number;
  duration_hours: number;
  fee_per_hour: number;
  billing_mode: BillingMode;
  total_games: number;
  players: PlayerBill[];
  collected: number;
  outstanding: number;
}

// ── Stats Domain ───────────────────────────────────────────

export interface PlayerStats {
  line_user_id: string;
  display_name: string;
  picture_url: string | null;
  games_played: number;
  wins: number;
  losses: number;
  win_rate: number;       // 0–100
  streak?: number;        // ชนะหรือแพ้ติดต่อกันกี่ครั้ง (+ = ชนะ, - = แพ้)
  rank?: number;
}

export interface SessionStats {
  session_id: string;
  session_name: string;
  date: string;
  total_games: number;
  court_count: number;
  player_count: number;
  total_revenue: number;
  collected: number;
  outstanding: number;
}

// ── Matchmaking Domain ─────────────────────────────────────

export interface MatchPreview {
  court_number: number;
  team1: string[];  // line_user_id[]
  team2: string[];
  team1_users?: Pick<User, 'line_user_id' | 'display_name' | 'picture_url'>[];
  team2_users?: Pick<User, 'line_user_id' | 'display_name' | 'picture_url'>[];
}

export interface MatchmakingResult {
  matches: MatchPreview[];
  queue: string[];  // line_user_id[] ที่รออยู่
  mode: MatchMode;
  round_number: number;
}

// ── API Responses ──────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: boolean;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// ── Form Types ─────────────────────────────────────────────

export interface CreateSessionForm {
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  court_count: number;
  max_players: number;
  fee_per_hour: number;
  billing_mode: BillingMode;
}

export interface RegisterSessionForm {
  session_id: string;
  payment_method: PaymentMethod;
}
