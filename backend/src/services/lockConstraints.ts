// ============================================================
// TeeBad — Partner Lock Constraint Service
// 3 ประเภท: same_team / opponents / avoid
// ต้องยืนยันทั้ง 2 ฝ่าย, max 3 locks ต่อคน
// ============================================================

import type { LockType, MatchPreview } from '../../../frontend/src/types/index';

export const MAX_LOCKS_PER_PLAYER = 3;

interface LockRow {
  id: string;
  user1_id: string;
  user2_id: string;
  lock_type: LockType;
  confirmed_by_user2: boolean;
}

// ============================================================
// Validate ว่าสร้าง lock ใหม่ได้ไหม
// ============================================================
export function canCreateLock(params: {
  userId: string;
  targetId: string;
  lockType: LockType;
  existingLocks: LockRow[];
}): { ok: boolean; message?: string } {
  const { userId, targetId, lockType, existingLocks } = params;

  if (userId === targetId) {
    return { ok: false, message: 'ไม่สามารถล็อคกับตัวเองได้' };
  }

  // เช็คว่า lock คู่นี้มีอยู่แล้วไหม
  const existing = existingLocks.find(
    (l) =>
      (l.user1_id === userId && l.user2_id === targetId) ||
      (l.user1_id === targetId && l.user2_id === userId),
  );
  if (existing) {
    return { ok: false, message: 'มี lock กับผู้เล่นนี้อยู่แล้ว' };
  }

  // นับ lock ของ userId (ทั้งที่ confirmed และ pending)
  const userLockCount = existingLocks.filter(
    (l) => l.user1_id === userId || l.user2_id === userId,
  ).length;
  if (userLockCount >= MAX_LOCKS_PER_PLAYER) {
    return { ok: false, message: `มี lock ครบ ${MAX_LOCKS_PER_PLAYER} คู่แล้ว` };
  }

  // นับ lock ของ targetId
  const targetLockCount = existingLocks.filter(
    (l) => l.user1_id === targetId || l.user2_id === targetId,
  ).length;
  if (targetLockCount >= MAX_LOCKS_PER_PLAYER) {
    return { ok: false, message: `ผู้เล่นปลายทางมี lock ครบ ${MAX_LOCKS_PER_PLAYER} คู่แล้ว` };
  }

  return { ok: true };
}

// ============================================================
// Apply lock constraints ต่อผลการจับคู่
// คืนค่า: matches ที่ผ่าน constraints หรือ fallbackMessage
// ============================================================
export function applyLockConstraints(
  matches: MatchPreview[],
  confirmedLocks: LockRow[],
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const match of matches) {
    for (const lock of confirmedLocks) {
      const { user1_id, user2_id, lock_type } = lock;

      const u1InTeam1 = match.team1.includes(user1_id);
      const u1InTeam2 = match.team2.includes(user1_id);
      const u2InTeam1 = match.team1.includes(user2_id);
      const u2InTeam2 = match.team2.includes(user2_id);

      const bothInMatch =
        (u1InTeam1 || u1InTeam2) && (u2InTeam1 || u2InTeam2);

      if (!bothInMatch) continue; // lock นี้ไม่เกี่ยวกับ match นี้

      const sameTeam =
        (u1InTeam1 && u2InTeam1) || (u1InTeam2 && u2InTeam2);

      if (lock_type === 'same_team' && !sameTeam) {
        violations.push(
          `สนาม ${match.court_number}: ${user1_id} กับ ${user2_id} ต้องอยู่ทีมเดียวกัน`,
        );
      }
      if (lock_type === 'opponents' && sameTeam) {
        violations.push(
          `สนาม ${match.court_number}: ${user1_id} กับ ${user2_id} ต้องอยู่คนละทีม`,
        );
      }
      if (lock_type === 'avoid' && bothInMatch) {
        violations.push(
          `สนาม ${match.court_number}: ${user1_id} กับ ${user2_id} ต้องไม่เล่นด้วยกัน`,
        );
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

// ============================================================
// พยายามสลับผู้เล่นให้ผ่าน same_team / opponents constraints
// คืนค่า matches ใหม่ หรือ null ถ้าแก้ไม่ได้
// ============================================================
export function tryFixLockViolations(
  matches: MatchPreview[],
  confirmedLocks: LockRow[],
  maxAttempts = 20,
): MatchPreview[] | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const check = applyLockConstraints(matches, confirmedLocks);
    if (check.valid) return matches;

    // สุ่มสลับผู้เล่น 2 คนระหว่างทีมใน match เดียวกัน
    const mIdx = Math.floor(Math.random() * matches.length);
    const match = { ...matches[mIdx] };

    // สลับ 1 คนจาก team1 กับ 1 คนจาก team2
    const t1Idx = Math.floor(Math.random() * match.team1.length);
    const t2Idx = Math.floor(Math.random() * match.team2.length);

    const newTeam1 = [...match.team1];
    const newTeam2 = [...match.team2];
    [newTeam1[t1Idx], newTeam2[t2Idx]] = [newTeam2[t2Idx], newTeam1[t1Idx]];

    matches = [
      ...matches.slice(0, mIdx),
      { ...match, team1: newTeam1, team2: newTeam2 },
      ...matches.slice(mIdx + 1),
    ];
  }

  // ลองไม่ผ่าน — คืน null เพื่อ fallback แจ้ง admin
  return null;
}
