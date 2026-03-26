# 🏸 TeeBad — Project Prompt Final Version

> **คู่มือ context file ครบชุดสำหรับ Claude Code และ Cursor**
> ใช้ไฟล์นี้เป็น single source of truth สำหรับโปรเจกต์ teebad ทั้งหมด

---

## สารบัญ

1. [Project Overview](#1-project-overview)
2. [TypeScript Types](#2-typescript-types)
3. [CLAUDE.md](#3-claudemd--สำหรับ-claude-code)
4. [Cursor Rules](#4-cursor-rules--สำหรับ-cursor)
   - core.mdc
   - matchmaking.mdc
   - billing.mdc
   - lock.mdc
   - line-api.mdc
5. [Prompts สำหรับ Claude Code / Cursor](#5-prompts-สำหรับ-claude-code--cursor)
   - PROMPT ① LIFF Authentication
   - PROMPT ② Session Management
   - PROMPT ③ Board + Realtime
   - PROMPT ④ Matchmaking Algorithm
   - PROMPT ⑤ Billing System
   - PROMPT ⑥ Stats & Leaderboard
   - PROMPT ⑦ LINE Service Messages
   - PROMPT ⑧ Partner Lock System
   - PROMPT ⑨ Database Schema
   - PROMPT ⑩ Environment + Deploy
6. [วิธีใช้งาน](#6-วิธีใช้งาน)

---

## 1. Project Overview

**teebad** คือ LINE Mini App ระบบจัดการก๊วนตีแบดมินตันครบวงจร

### ระบบงานเดิมที่ต้องการแทนที่

| เดิม | ใหม่ (teebad) |
| --- | --- |
| พิมพ์ชื่อในกลุ่ม LINE เพื่อลงชื่อ | กดลงชื่อในแอป — realtime ทุกคนเห็น |
| เขียนกระดานหน้าคอร์ท | บอร์ดดิจิทัลในมือถือทุกคน |
| คำนวณเองแล้วพิมพ์สั่งขุนทอง | คิดเงินอัตโนมัติ + ส่งบิลส่วนตัว |

### Stack

| Layer    | Technology                                                               |
| -------- | ------------------------------------------------------------------------ |
| Frontend | Next.js 16.2.1 (Page Router) + shadcn/ui + Radix UI + Tailwind CSS + LIFF SDK |
| Backend  | Node.js + Express + TypeScript                                           |
| Database | Supabase (PostgreSQL + Realtime + Storage)                               |
| Notify   | LINE Messaging API — Service Messages (ฟรี)                              |
| Payment  | promptpay-qr + โอนธนาคาร + จ่ายหน้างาน                                   |

### Feature หลัก

1. **ลงชื่อเข้าก๊วน** — แทนพิมพ์ในกลุ่ม LINE
2. **บอร์ดเกมดิจิทัล** — ทุกคนเห็นในมือถือ realtime
3. **จัดคู่ 4 โหมด** — สุ่ม / หมุนเวียน / ชนะอยู่ / เลือกเอง
4. **ล็อคคู่** — same_team / opponents / avoid
5. **บันทึกผลแพ้ชนะ + นับเกม**
6. **คิดเงินอัตโนมัติ** — หารเท่า หรือ ตามเกมที่เล่น
7. **ส่งบิลส่วนตัว** — Service Message ฟรี ไม่ต้องทวงในกลุ่ม
8. **สร้างคำสั่งขุนทอง** — ก็อปวางในกลุ่มได้เลย
9. **สถิติ & อันดับ** — win rate, streak, leaderboard

---

## 2. TypeScript Types

> วางไว้ที่ `frontend/src/types/index.ts` — ทุก feature อ้างอิงที่นี่

```typescript
// ── Session ──
interface Session {
 id: string;
 name: string;
 date: string; // ISO date "2025-03-28"
 startTime: string; // "18:00"
 endTime: string; // "20:00"
 courtCount: number; // 1–N (แล้วแต่วัน)
 maxPlayers: number;
 feePerHour: number; // ค่าคอร์ทรวม/ชั่วโมง
 billingMode: 'equal' | 'by_games';
 defaultMatchMode: MatchMode;
 status: 'open' | 'playing' | 'ended';
 createdBy: string;
}

// ── Registration ──
interface Registration {
 id: string;
 sessionId: string;
 userId: string;
 displayName: string;
 pictureUrl: string;
 joinedAt: string;
 paidStatus: 'pending' | 'approved' | 'rejected' | 'onsite';
 paymentMethod: 'qr' | 'transfer' | 'onsite';
 slipUrl?: string;
 gamesPlayed: number;
 amountDue: number;
}

// ── Match ──
type MatchMode = 'random' | 'rotation' | 'winner_stays' | 'manual';

interface Match {
 id: string;
 sessionId: string;
 courtNumber: number;
 roundNumber: number;
 team1: string[]; // [userId, userId]
 team2: string[];
 score1?: number;
 score2?: number;
 winnerId?: 'team1' | 'team2';
 status: 'playing' | 'done';
 startedAt: string;
 endedAt?: string;
}

// ── Partner Lock ──
type LockType = 'same_team' | 'opponents' | 'avoid';
type LockScope = 'per_session' | 'permanent';
type LockStatus = 'pending' | 'active' | 'rejected' | 'cancelled';

interface PartnerLock {
 id: string;
 sessionId: string | null; // null = permanent
 requesterId: string;
 requesterName: string;
 targetId: string;
 targetName: string;
 lockType: LockType;
 scope: LockScope;
 status: LockStatus;
 requestedAt: string;
 respondedAt?: string;
}

interface LockConflict {
 lockId: string;
 reason: string;
 suggestion: 'skip' | 'wait';
}

// ── Billing ──
interface PlayerBill {
 userId: string;
 displayName: string;
 pictureUrl: string;
 gamesPlayed: number;
 hoursPlayed: number;
 amountDue: number;
 paidStatus: Registration['paidStatus'];
}

interface SessionBill {
 sessionId: string;
 totalCost: number;
 courtCount: number;
 players: PlayerBill[];
 collected: number;
 outstanding: number;
}

// ── Stats ──
interface PlayerStats {
 userId: string;
 displayName: string;
 pictureUrl: string;
 wins: number;
 losses: number;
 gamesPlayed: number;
 winRate: number; // 0.0–1.0
 streak: number; // + ชนะติด, - แพ้ติด
}
```

---

## 3. CLAUDE.md — สำหรับ Claude Code

> วางที่ `teebad/CLAUDE.md` (root ของ project)
> Claude Code อ่านไฟล์นี้อัตโนมัติทุก session

```markdown
# teebad 🏸

ระบบจัดการก๊วนตีแบดมินตันครบวงจรบน LINE Mini App

## Stack

- **Frontend**: Next.js 15 (App Router) + shadcn/ui + Radix UI + Tailwind CSS + LIFF SDK
- **Backend**: Node.js + Express + TypeScript
- **DB**: Supabase (PostgreSQL + Realtime + Storage)
- **Notify**: LINE Messaging API — Service Messages
- **Payment**: promptpay-qr + โอนธนาคาร + จ่ายหน้างาน

## Structure
```

teebad/
├── frontend/
│   └── src/
│       ├── pages/                  # Next.js Page Router — ไฟล์ต่อ route (ใช้ pages/ ไม่ใช่ app/)
│       │   ├── board/              # บอร์ดเกม
│       │   ├── billing/            # คิดเงิน
│       │   ├── session/            # รายการก๊วน + ลงชื่อ
│       │   ├── stats/              # สถิติ & อันดับ
│       │   └── api/                # API routes
│       ├── components/            # UI components จัดตาม feature
│       │   ├── session/
│       │   ├── board/
│       │   ├── billing/
│       │   ├── locks/
│       │   ├── stats/
│       │   └── ui/                 # shadcn/ui (auto-generated ห้ามแก้มือ)
│       ├── hooks/                  # useLiff, useSessions, useBoard, useMatchmaking
│       │                           # useBilling, useLocks, useStats
│       ├── lib/                    # liff, api, supabase, promptpay, matchmaking, khunthong, utils
│       └── types/index.ts
└── backend/
    └── src/
        ├── routes/                 # sessions, registrations, matches, payments, locks, stats, admin
        ├── middleware/             # verifyLiff, isAdmin
        ├── services/               # matchmaking, billing, lineNotify, cronJobs
        └── db/schema.sql

````

## Key Commands

```bash
# Frontend (Next.js)
cd frontend
npm run dev                          # dev server — http://localhost:3000
npm run build && npm start            # production
npx shadcn@latest add <component>     # เพิ่ม shadcn component

# Backend
cd backend
npm run dev                          # dev with nodemon
npm run build && npm start

# DB
supabase db push                     # apply schema changes
supabase gen types typescript         # regenerate TS types → src/types/supabase.ts
````

## Core Rules

- ตอบและ comment เป็นภาษาไทย ยกเว้น code และ technical terms
- TypeScript strict mode ทุกไฟล์ — ห้าม `any`
- ทุก API route ต้อง verify LIFF ID Token ผ่าน `middleware/verifyLiff.ts`
- ใช้ Supabase Realtime สำหรับ board + score updates เท่านั้น — ห้าม polling
- ห้าม hardcode — ใช้ `process.env.*` / `NEXT_PUBLIC_*` เสมอ
- error handling: try/catch ทุก async function + return `{ error: true, message: string }`

## Frontend: Next.js + shadcn/ui Rules

- ใช้ **App Router** เท่านั้น — ห้ามใช้ `pages/` directory
- Server Components = default — ใช้ `'use client'` เฉพาะเมื่อจำเป็น (hooks, events, LIFF)
- LIFF init ต้องอยู่ใน Client Component + `useEffect`
- **shadcn/ui ก่อนเสมอ** — ห้ามสร้าง component ซ้ำถ้ามีใน shadcn แล้ว
  - Button, Card, Badge, Dialog, Sheet, Tabs, Avatar, Progress, Skeleton, Alert, Form → shadcn
  - Form validation → `react-hook-form` + `zod`
- **Radix UI** ใช้ตรงๆ เฉพาะ case พิเศษที่ shadcn ไม่ครอบคลุม
- **Tailwind** — ห้าม inline style, ใช้ `cn()` จาก `lib/utils.ts`
- Image → `next/image`, Link → `next/link`
- Loading → `loading.tsx` + `<Skeleton>`, Error → `error.tsx` + `<Alert variant="destructive">`

## Domain Logic (อ่านก่อนแก้โค้ดที่เกี่ยวข้อง)

**Matchmaking** — 4 โหมด: `random` / `rotation` (เล่นน้อยขึ้นก่อน) / `winner_stays` (ชนะ 3 รอบต้องลงคิว) / `manual`

**Billing** — 2 แบบ: `equal` (หารเท่า) / `by_games` (ตามเกมจริง, round up แล้วปรับคนสุดท้าย)

**Partner Lock** — 3 ประเภท: `same_team` / `opponents` / `avoid` — ต้องยืนยัน 2 ฝ่าย, max 3 locks/คน

**Khunthong** — ไม่มี Public API ใช้ `lib/khunthong.ts` สร้างคำสั่งสำเร็จรูปให้ก็อปวางในกลุ่มเท่านั้น

## Detailed Specs

- Types → `frontend/src/types/index.ts`
- Matchmaking algorithm → `backend/src/services/matchmaking.ts`
- Billing logic → `backend/src/services/billing.ts`
- Lock constraints → `backend/src/services/lockConstraints.ts`
- DB schema + RLS → `backend/src/db/schema.sql`
- LINE Service Message templates → `backend/src/services/lineNotify.ts`

```

---

## 4. Cursor Rules — สำหรับ Cursor

> วางที่ `teebad/.cursor/rules/`
> Cursor โหลด rules อัตโนมัติตาม glob pattern ของแต่ละไฟล์

### โครงสร้าง

```

teebad/
└── .cursor/
└── rules/
├── core.mdc ← alwaysApply: true (โหลดทุก session)
├── matchmaking.mdc ← โหลดเมื่อแก้ board/match files
├── billing.mdc ← โหลดเมื่อแก้ billing/payment files
├── lock.mdc ← โหลดเมื่อแก้ lock/partner files
└── line-api.mdc ← โหลดเมื่อแก้ liff/routes files

```

---

### core.mdc

```

---

description: Core rules สำหรับโปรเจกต์ teebad — LINE Mini App ก๊วนแบดมินตัน ใช้ทุก session เสมอ
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: true

---

# teebad — Core Rules

## Project

LINE Mini App สำหรับจัดการก๊วนตีแบดมินตัน: ลงชื่อ → บอร์ดเกม → จัดคู่ → บันทึกผล → คิดเงิน
Stack: Next.js 15 (App Router) + shadcn/ui + Radix UI + Tailwind CSS + LIFF SDK | Node.js + Express | Supabase | LINE Messaging API

## Code Standards

- TypeScript strict mode — ห้าม `any`, ใช้ type จาก `frontend/src/types/index.ts` เสมอ
- ทุก async function ต้องมี try/catch — error return เป็น `{ error: true, message: string }`
- ทุก API route ต้อง call `verifyLiff` middleware ก่อน handler
- ห้าม hardcode — ENV vars ทั้งหมดอยู่ใน `.env.example`
- comment เป็นภาษาไทย, code เป็นภาษาอังกฤษ

## Next.js Rules (App Router)

- ห้ามใช้ `pages/` directory — App Router เท่านั้น
- Server Components = default — ใช้ `'use client'` เฉพาะเมื่อจำเป็น
- LIFF init ต้องอยู่ใน Client Component + `useEffect` เสมอ
- Image → `next/image`, Link → `next/link`
- Loading → `loading.tsx` + `<Skeleton>`, Error → `error.tsx` + `<Alert variant="destructive">`

## UI Rules (shadcn/ui + Radix + Tailwind)

- shadcn/ui ก่อนเสมอ — ห้ามสร้าง component ใหม่ถ้า shadcn มีอยู่แล้ว
  - Button, Card, Badge, Dialog, Sheet, Tabs, Avatar, Progress, Skeleton, Alert, Form → shadcn
  - Form validation → `react-hook-form` + `zod`
- Radix UI ใช้ตรงๆ เฉพาะ case พิเศษที่ shadcn ไม่ครอบคลุม
- Tailwind — ห้าม inline style, ใช้ `cn()` จาก `lib/utils.ts`
- เพิ่ม shadcn: `npx shadcn@latest add <component>`

## Domain Rules (อย่าเปลี่ยนโดยไม่อ่าน spec)

- Matchmaking: 4 โหมด — random / rotation / winner_stays / manual → `backend/src/services/matchmaking.ts`
- Billing: equal = หารเท่า | by_games = ตามเกมจริง (round up, ปรับคนสุดท้าย)
- Lock: ต้องยืนยัน 2 ฝ่าย, max 3 locks/คน, fallback แจ้ง admin ถ้าจัดไม่ลง
- Realtime: Supabase Realtime เฉพาะ board + score — ห้าม polling

## File Conventions

app/(group)/page.tsx ← Next.js App Router pages
components/{feature}/ ← UI components จัดตาม feature
components/ui/ ← shadcn/ui (auto-generated, ห้ามแก้มือ)
hooks/use{Feature}.ts ← custom hooks 1 file ต่อ 1 feature
lib/utils.ts ← cn() และ utility functions
routes/{feature}.ts ← backend routes
services/{feature}.ts ← business logic

## Before You Code

1. อ่าน `frontend/src/types/index.ts` ก่อนสร้าง interface ใหม่
2. ถ้าแก้ matchmaking/billing/lock — อ่าน service file ก่อน
3. ถ้าเพิ่ม table — เพิ่ม RLS policy ใน `schema.sql` ด้วยเสมอ
4. ถ้าเพิ่ม API route — เพิ่ม LIFF verify + zod validation ด้วยเสมอ
5. ถ้าต้องการ UI component ใหม่ — ตรวจ shadcn ก่อน

```

---

### matchmaking.mdc

```

---

description: Rules สำหรับ matchmaking system — โหลดเมื่อทำงานกับไฟล์ board, match, queue
globs: ["**/board/**", "**/matches*", "**/matchmaking*", "**/CreateMatch*", "**/useBoard*", "**/useMatchmaking*"]
alwaysApply: false

---

# Matchmaking Rules

## 4 โหมด — อย่าเปลี่ยน logic โดยไม่ระบุ

| โหมด         | Logic                                                          |
| ------------ | -------------------------------------------------------------- |
| random       | Fisher-Yates shuffle → จับคู่ทีละ 4 (doubles) หรือ 2 (singles) |
| rotation     | เรียงจาก gamesPlayed น้อย→มาก, เท่ากัน → ดู joinedAt           |
| winner_stays | ทีมชนะอยู่บนคอร์ท — ชนะ ≥ 3 รอบติด → ลงคิวบังคับ               |
| manual       | return empty matches — frontend จัดการ drag-drop เอง           |

## Return Type

{ matches: Match[], queue: Registration[], conflicts: LockConflict[] }

## Lock Integration

อ่าน partner_locks (status=active) ก่อนจัดคู่ทุกครั้ง:

- same_team → seed ทั้งคู่ไว้ทีมเดียวกันก่อน
- opponents → วางคนละทีม
- avoid → ต่างคอร์ท
- conflict → บันทึกใน conflicts[] แล้วแจ้ง admin — ห้ามข้ามอัตโนมัติ

## Realtime

board updates ผ่าน Supabase channel session:{sessionId}
events: match_created, score_updated, match_ended
unsubscribe เมื่อ unmount

```

---

### billing.mdc

```

---

description: Rules สำหรับ billing, payment, และ khunthong integration
globs: ["**/billing*", "**/payment*", "**/Billing*", "**/useBilling*", "**/khunthong*", "**/promptpay*"]
alwaysApply: false

---

# Billing Rules

## คำนวณยอด

totalCost = feePerHour × courtCount × durationHours

equal → amountDue = totalCost / playerCount (round ขึ้น)
by_games → amountDue = (gamesPlayed / totalGames) × totalCost
→ round ขึ้นทุกคน แล้วปรับคนสุดท้ายให้ยอดรวมพอดี

ดึง gamesPlayed จาก matches ที่ status === 'done' เท่านั้น

## ช่องทางชำระ

- QR PromptPay → lib/promptpay.ts → generatePromptPayQR(phone, amount): string (base64)
- โอนธนาคาร → แสดงเลขบัญชี + ปุ่ม copy
- หน้างาน → paid_status = 'onsite' รอ admin กด confirm

## Khunthong

ไม่มี Public API — สร้างข้อความสำเร็จรูปเท่านั้น:
ขุนทอง เก็บเงิน {amount} บาท @{name1} @{name2}

function: lib/khunthong.ts → buildKhunThongCommand(bills: PlayerBill[]): string

## Service Message (ส่งรายคน)

- ส่งเฉพาะคนที่ paid_status === 'pending'
- เนื้อหา: ยอด + วิธีคำนวณ + QR base64 + ลิงก์แนบสลิป
- ใช้ POST /api/billing/:sessionId/notify-all

```

---

### lock.mdc

```

---

description: Rules สำหรับระบบ lock คู่ — โหลดเมื่อทำงานกับ lock, partner, constraint
globs: ["**/lock*", "**/Lock*", "**/useLocks*", "**/partner*"]
alwaysApply: false

---

# Partner Lock Rules

## 3 ประเภท

| type      | ความหมาย              | ผลต่อ matchmaking            |
| --------- | --------------------- | ---------------------------- |
| same_team | ต้องอยู่ทีมเดียวกัน   | seed เป็น pair ก่อนจัดคนอื่น |
| opponents | ต้องเจอกันเป็นคู่แข่ง | วางคนละทีมในเกมเดียวกัน      |
| avoid     | ห้ามเจอกัน            | วางต่างคอร์ทเสมอ             |

## Business Rules — ห้ามเปลี่ยน

- bilateral confirmation: ทั้ง 2 ฝ่ายต้องยืนยันจึง status = 'active'
- max 3 active locks ต่อคนต่อก๊วน (validate ก่อน INSERT)
- conflict → บันทึกใน conflicts[] แล้วแจ้ง admin — ห้ามข้ามอัตโนมัติ
- scope: per_session (รอบนี้) หรือ permanent (ถาวร — ใช้ใน session ถัดไปด้วย)
- admin ยกเลิก lock ใดก็ได้ตลอดเวลา
- fallback: แสดง LockConflictAlert ถามแอดมินก่อน ไม่ข้ามเอง

## DB

table: partner_locks — อ่าน backend/src/db/schema.sql
index: (session_id, status) — ใช้ใน matchmaking เสมอ

## Notifications

- lock_request → Service Message หา target ทันทีหลัง POST
- lock_accepted → Service Message หา requester เมื่อ accept
- lock_rejected → Service Message หา requester เมื่อ reject
- lock_conflict_warning → ส่งหา admin เมื่อ matchmaking พบ conflict

```

---

### line-api.mdc

```

---

description: Rules สำหรับ LINE LIFF, Service Messages, และ API authentication
globs: ["**/liff*", "**/lineNotify*", "**/verifyLiff*", "**/useLiff*", "**/routes/**"]
alwaysApply: false

---

# LINE Integration Rules

## LIFF Authentication

// ทุก API route ต้องผ่าน middleware นี้ก่อน
import { verifyLiff } from '../middleware/verifyLiff'
router.post('/endpoint', verifyLiff, handler)

// verifyLiff:
// 1. ดึง token จาก Authorization: Bearer {liffIdToken}
// 2. POST <https://api.line.me/oauth2/v2.1/verify>
// 3. attach userId ลง req.user

## LIFF Client

// ใช้ singleton จาก lib/liff.ts เสมอ — ห้าม import @line/liff โดยตรง
import { liff } from '../lib/liff'

// External browser → fallback UI "กรุณาเปิดใน LINE"
// ตรวจด้วย liff.isInClient()

## Service Messages

- ใช้ได้เฉพาะ Verified Mini App เท่านั้น
- endpoint: POST <https://api.line.me/v2/bot/message/push>
- header: Authorization: Bearer {CHANNEL_ACCESS_TOKEN}
- ส่งได้ฟรี ไม่มีค่าใช้จ่าย
- template ทั้งหมดอยู่ใน backend/src/services/lineNotify.ts — ห้ามสร้างนอกไฟล์นี้

## Flex Message Colors

- success/ยืนยัน → #00e5a0 (เขียว)
- reminder/เตือน → #f2a100 (เหลือง)
- lock request → #4da6ff (ฟ้า)
- error/conflict → #ff4d6d (แดง)

```

---

## 5. Prompts สำหรับ Claude Code / Cursor

> ใช้ prompt เหล่านี้สั่งงานทีละส่วน หลังจากวาง CLAUDE.md หรือ Cursor rules แล้ว

---

### PROMPT ① — LIFF Authentication

```

สร้าง LIFF authentication system สำหรับ teebad:

ไฟล์: frontend/src/lib/liff.ts และ frontend/src/hooks/useLiff.ts

Requirements:

- ใช้ @line/liff package
- liff.init() เมื่อเปิดแอป → ถ้า !liff.isLoggedIn() ให้ redirect liff.login()
- ดึง profile: userId, displayName, pictureUrl
- รองรับ external browser → แสดงหน้า "กรุณาเปิดใน LINE"
- เก็บ profile ใน React Context ชื่อ LiffContext (Client Component)
- LiffProvider wrap รอบ layout.tsx root
- hook useLiff() return: { profile, isLoading, isLoggedIn, liff }
- loading state → <Skeleton> จาก shadcn/ui
- error boundary สำหรับ LIFF init failure

```

---

### PROMPT ② — Session Management

```

สร้าง session management สำหรับ teebad:

ไฟล์: frontend/src/app/(session)/page.tsx และ components/session/\*

หน้ารายการก๊วน:

- Tab: วันนี้ / สัปดาห์นี้ / ทั้งหมด — ใช้ <Tabs> จาก shadcn
- fetch GET /api/sessions?filter=today
- SessionCard แสดง: ชื่อ, วัน-เวลา, จำนวนคอร์ท, สถานะ badge, capacity bar
- Badge status: "เปิดรับ"(green) / "กำลังเล่น"(lime) / "เต็ม"(gray) / "จบแล้ว"(dim) — ใช้ <Badge> shadcn
- อันดับวันนี้ top 3
- FAB "+" สำหรับ admin เท่านั้น

หน้าลงชื่อ ([sessionId]/page.tsx):

- แสดงรายชื่อที่ลงแล้ว + จำนวนเกมสะสม
- ถ้าตัวเองลงแล้ว → แสดงสถานะ + ปุ่มยกเลิก
- ถ้ายังไม่ลง → form ลงชื่อ + เลือกวิธีชำระ
- POST /api/registrations → Service Message ยืนยันทันที

form สร้างก๊วน (admin):

- ชื่อ, วัน, เวลา, courtCount (1–8), maxPlayers, feePerHour
- billingMode: หารเท่า หรือ by_games
- defaultMatchMode: random / rotation / winner_stays / manual
- ใช้ Form + react-hook-form + zod จาก shadcn

```

---

### PROMPT ③ — Board + Realtime

```

สร้าง Board system ที่ใช้ Supabase Realtime สำหรับ teebad:

ไฟล์: frontend/src/app/(board)/[sessionId]/page.tsx, hooks/useBoard.ts, components/board/\*

useBoard.ts:

- subscribe Supabase channel "session:{sessionId}"
- listen: match_created, score_updated, match_ended
- return: { matches, queue, currentRound, isLoading }
- unsubscribe เมื่อ unmount

Board page:

- แสดงคอร์ทตาม session.courtCount (dynamic)
- CourtCard แต่ละคอร์ท: ชื่อคอร์ท, สถานะ, ทีม 1 vs ทีม 2
- กรอกคะแนน realtime (input number) — update Supabase ทันที
- ปุ่ม "จบเกม" → PATCH /api/matches/:id { score1, score2 }
- QueueList: รายชื่อรอ + gamesPlayed ของแต่ละคน
- ปุ่ม "จัดคู่รอบต่อไป" → navigate /board/[sessionId]/create-match
- ใช้ Card, Badge, Avatar, Progress จาก shadcn/ui

CreateMatch page:

- เลือกโหมด: 4 cards (random/rotation/winner_stays/manual)
- เลือกจำนวนคอร์ทรอบนี้ (≤ session.courtCount)
- เลือกประเภทเกม: ชายคู่ / หญิงคู่ / คู่ผสม / เดี่ยว
- POST /api/sessions/:id/matches { mode, courtCount, matchType }

```

---

### PROMPT ④ — Matchmaking Algorithm

```

สร้าง matchmaking service สำหรับ teebad:

ไฟล์: backend/src/services/matchmaking.ts

implement ฟังก์ชัน makeMatches(params):

type MakeMatchesParams = {
players: Registration[]
mode: MatchMode
courtCount: number
locks: PartnerLock[]
prevMatches: Match[]
}

โหมด random:

- Fisher-Yates shuffle
- จับคู่ทีละ 4 (doubles) หรือ 2 (singles)
- ที่เหลือลงคิว

โหมด rotation:

- เรียงจาก gamesPlayed น้อย→มาก
- เท่ากัน → ดู joinedAt

โหมด winner_stays:

- ทีมชนะจาก prevMatches อยู่บนคอร์ท
- ดึงทีมจากคิวขึ้นมาเป็นฝั่งตรงข้าม
- ชนะ ≥ 3 รอบติด → ลงคิวบังคับ

โหมด manual:

- return empty matches (frontend จัดการเอง)
- validate ก่อน submit ว่าแต่ละทีมมีผู้เล่นครบ

Lock constraints (ทุกโหมด):

- same_team → seed pair ทีมเดียวกันก่อน
- opponents → วางคนละทีม
- avoid → ต่างคอร์ท
- conflict → บันทึกใน conflicts[] แจ้ง admin ห้ามข้ามเอง

return: { matches: Match[], queue: Registration[], conflicts: LockConflict[] }

```

---

### PROMPT ⑤ — Billing System

```

สร้าง billing system สำหรับ teebad:

ไฟล์: backend/src/services/billing.ts และ frontend/src/app/(billing)/[sessionId]/page.tsx

billing.ts:
function calculateBill(session, registrations, matches): SessionBill

Logic:

- นับ gamesPlayed จาก matches ที่ status === 'done'
- equal: amountDue = totalCost / playerCount (round ขึ้น)
- by_games: amountDue = (gamesPlayed / totalGames) × totalCost
  → round ขึ้นทุกคน แล้วปรับคนสุดท้ายให้ยอดรวมพอดี
- totalCost = feePerHour × courtCount × durationHours

Billing page:

- แสดง total bar: ค่าคอร์ทรวม + รายละเอียด
- PlayerBillRow: avatar, ชื่อ, เกมที่เล่น, ยอด, badge สถานะ
- ปุ่ม "ส่งบิลส่วนตัวทุกคน":
  → POST /api/billing/:sessionId/notify-all
  → Service Message: ยอด + QR PromptPay + ลิงก์แนบสลิป
- ปุ่ม "สั่งขุนทอง":
  → buildKhunThongCommand(bills) จาก lib/khunthong.ts
  → แสดง Dialog + copy to clipboard
- ใช้ Card, Badge, Avatar, Dialog, Button จาก shadcn

```

---

### PROMPT ⑥ — Stats & Leaderboard

```

สร้าง stats system สำหรับ teebad:

API:
GET /api/stats/session/:id — สรุปก๊วนเดียว
GET /api/stats/leaderboard?period=today|month|all
GET /api/stats/player/:userId — ประวัติผู้เล่น

PlayerStats calculation:

- wins = count matches ที่ userId อยู่ใน winning team
- losses = count ที่อยู่ใน losing team
- winRate = wins / (wins + losses)
- streak = ชนะหรือแพ้ติดต่อจาก match ล่าสุด

Stats page:

- Tabs: วันนี้ / เดือนนี้ / ตลอดกาล
- RankingTable: อันดับ (gold/silver/bronze icon), avatar, ชื่อ, W/L, win rate
- SessionSummary: จำนวนเกม, คอร์ท, ผู้เล่น, รวมเงิน, จ่ายแล้ว, ค้าง
- กดชื่อผู้เล่น → Sheet (shadcn) แสดงประวัติเกม
- ใช้ Table, Tabs, Sheet, Badge, Avatar จาก shadcn

```

---

### PROMPT ⑦ — LINE Service Messages

```

สร้าง notification system สำหรับ teebad:

ไฟล์: backend/src/services/lineNotify.ts และ cronJobs.ts

ส่ง Service Message 6 กรณี:

1. ลงทะเบียนสำเร็จ
   - ยืนยันชื่อ, ก๊วน, วัน-เวลา, ลำดับที่ X
   - CTA: "ดูบอร์ดเกม"

2. แอดมินอนุมัติชำระ → ใบเสร็จ
   - ยอดที่จ่าย, วันที่, ก๊วน
   - CTA: "ดูสถิติของฉัน"

3. แจ้งเตือนก่อนตี 1 ชม. (Cron)
   - ชื่อก๊วน, เวลา, สถานที่, สถานะชำระ

4. ส่งบิลรายคน
   - ยอด + วิธีคำนวณ + QR PromptPay
   - CTA: "แนบสลิป"

5. เตือนค้างชำระ (Cron 20:00 ทุกวัน)
   - ยอดค้าง, ก๊วนที่ค้าง
   - CTA: "จ่ายเลย"

6. Lock notifications (request / accepted / rejected / conflict)
   - ใช้สีฟ้า (#4da6ff) สำหรับ lock request
   - conflict → ส่งหา admin พร้อมรายละเอียด

Flex Message colors:

- success → #00e5a0, reminder → #f2a100, lock → #4da6ff, error → #ff4d6d

cronJobs.ts:

- ทุก 5 นาที: ก๊วนที่จะเริ่มใน 65 นาที → ส่งแจ้งเตือน
- ทุกวัน 20:00 Asia/Bangkok: ตรวจค้างชำระ

```

---

### PROMPT ⑧ — Partner Lock System

```

สร้างระบบ Lock คู่สำหรับ teebad:

Lock 3 ประเภท:

- same_team : ต้องอยู่ทีมเดียวกัน (แฟนกัน, ซ้อมแข่ง)
- opponents : ต้องเจอกันเป็นคู่แข่ง
- avoid : ห้ามเจอกัน (ระดับต่างกัน)

DB (เพิ่มใน schema.sql):
CREATE TABLE partner_locks (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
requester_id TEXT REFERENCES users(line_user_id) NOT NULL,
target_id TEXT REFERENCES users(line_user_id) NOT NULL,
lock_type TEXT NOT NULL CHECK (lock_type IN ('same_team','opponents','avoid')),
scope TEXT NOT NULL DEFAULT 'per_session'
CHECK (scope IN ('per_session','permanent')),
status TEXT NOT NULL DEFAULT 'pending'
CHECK (status IN ('pending','active','rejected','cancelled')),
requested_at TIMESTAMPTZ DEFAULT NOW(),
responded_at TIMESTAMPTZ,
cancelled_by TEXT REFERENCES users(line_user_id),
UNIQUE(session_id, requester_id, target_id)
);
CREATE INDEX ON partner_locks(session_id, status);

Backend routes (routes/locks.ts):
GET /api/sessions/:id/locks
POST /api/sessions/:id/locks — body: { targetId, lockType, scope }
PATCH /api/locks/:lockId/respond — body: { action: 'accept'|'reject' }
DELETE /api/locks/:lockId

Frontend components (components/locks/):

- LockBadge.tsx — icon ถัดจากชื่อผู้เล่น (🤝⚔️🚫)
- LockRequestModal.tsx — เลือกเพื่อน + ประเภท + scope
- LockInboxBanner.tsx — แสดง pending requests + ปุ่ม ยืนยัน/ปฏิเสธ
- LockSummaryBar.tsx — แสดงใน CreateMatch ก่อนจัดคู่
- LockConflictAlert.tsx — แสดงเมื่อ conflict + ปุ่ม "ข้ามล็อคนี้"

ใช้ Dialog, Badge, Button, Alert, Sheet จาก shadcn/ui

Business rules:

- validate ไม่เกิน 3 active locks ต่อคนก่อน INSERT
- ส่ง Service Message หา target ทันทีหลัง POST
- admin ยกเลิก lock ได้ตลอดเวลา

```

---

### PROMPT ⑨ — Database Schema

```

สร้าง Supabase schema สำหรับ teebad:

ไฟล์: backend/src/db/schema.sql

Tables:

1. users (line_user_id PK, display_name, picture_url, is_admin, total_games, total_wins, created_at)
2. sessions (id UUID PK, name, date, start_time, end_time, court_count, max_players, fee_per_hour, billing_mode, default_match_mode, status, created_by FK, created_at)
3. registrations (id UUID PK, session_id FK, user_id FK, payment_method, paid_status, slip_url, amount_due, joined_at, UNIQUE(session_id, user_id))
4. matches (id UUID PK, session_id FK, court_number, round_number, match_mode, team1_players TEXT[], team2_players TEXT[], score1, score2, winner, status, started_at, ended_at)
5. payments (id UUID PK, registration_id FK, amount, slip_url, status, approved_by FK, approved_at, created_at)
6. partner_locks (ดู PROMPT ⑧)
7. notifications_log (id UUID PK, user_id FK, type, session_id FK, sent_at, success)

Indexes:

- sessions(date, status)
- registrations(session_id, paid_status)
- matches(session_id, status, round_number)
- matches USING GIN(team1_players), GIN(team2_players)
- partner_locks(session_id, status)

RLS Policies:

- users: SELECT ตัวเอง + admin ทั้งหมด
- sessions: SELECT ทุกคน, INSERT/UPDATE/DELETE เฉพาะ admin
- registrations: SELECT/INSERT/DELETE ตัวเอง + admin ทั้งหมด
- matches: SELECT ทุกคน, INSERT/UPDATE เฉพาะ admin
- payments: SELECT ตัวเอง + admin ทั้งหมด
- partner_locks: SELECT ตัวเองที่เป็น requester หรือ target + admin ทั้งหมด

Enable Realtime on: matches, registrations

```

---

### PROMPT ⑩ — Environment + Deploy

```

สร้าง environment config และ deploy guide สำหรับ teebad:

frontend/.env.example:
NEXT_PUBLIC_LIFF_ID= # จาก LINE Developers Console
NEXT_PUBLIC_API_BASE_URL= # URL ของ backend
NEXT_PUBLIC_PROMPTPAY_NUMBER= # เบอร์ PromptPay ของแอดมิน
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

backend/.env.example:
PORT=3000
NODE_ENV=development
SUPABASE_URL=
SUPABASE_SERVICE_KEY= # service_role key
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
ADMIN_LINE_USER_IDS= # userId ของ admin คั่นด้วย comma
SLIP_STORAGE_BUCKET=teebad-slips
TZ=Asia/Bangkok

สร้าง README.md ที่มี:

1. Setup LINE Developer Console + ขอ LIFF ID
2. ขอสิทธิ์ LINE Mini App Channel (ส่งอีเมล <dl_api_th@linecorp.com>)
3. Setup Supabase: สร้าง project, run schema.sql, enable Realtime
4. Deploy frontend บน Vercel
5. Deploy backend บน Railway
6. ขอ Verified Mini App → ได้สิทธิ์ Service Messages ฟรี

````

---

## 6. วิธีใช้งาน

### Claude Code

```bash
# 1. วาง CLAUDE.md ที่ root
cp CLAUDE.md teebad/

# 2. เปิด project
cd teebad && claude

# 3. ใช้ prompts จาก Section 5 ทีละส่วน
# 4. กลับ session เดิม
claude --continue
````

**คำที่ใช้คุยกับ Claude Code:**

- "ตาม CLAUDE.md ที่กำหนดไว้"
- "อ่าน CLAUDE.md ก่อนแล้วค่อยเริ่ม"
- "สร้างตาม project memory"

---

### Cursor

```
1. วางโฟลเดอร์ .cursor/rules/ ที่ root
2. เปิด project ใน Cursor
3. rules โหลดอัตโนมัติตาม glob pattern
4. สั่งงานด้วย prompts จาก Section 5
```

**คำที่ใช้คุยกับ Cursor:**

- "ตาม rules ที่กำหนดไว้"
- "follow the cursor rules"
- "อ่าน rules ก่อนเริ่ม"

---

### ลำดับการพัฒนาแนะนำ

```
Session 1: Foundation
  ① LIFF Authentication
  ⑨ Database Schema

Session 2: Core Features
  ② Session Management
  ③ Board + Realtime

Session 3: Intelligence
  ④ Matchmaking Algorithm
  ⑧ Partner Lock System

Session 4: Money
  ⑤ Billing System
  ⑥ Stats & Leaderboard

Session 5: Notifications
  ⑦ LINE Service Messages

Session 6: Launch
  ⑩ Environment + Deploy
```

---

_teebad — context file version 2.1 | Next.js 15 + shadcn/ui + Radix UI + Tailwind CSS_
