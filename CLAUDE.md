# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# TeeBad 🏸

ระบบจัดการก๊วนตีแบดมินตันครบวงจรบน LINE Mini App

## Stack

- **Frontend**: Next.js 16.2.1 (Page Router) + shadcn/ui + Radix UI + Tailwind CSS v4 + LIFF SDK
- **Backend**: Node.js + Express + TypeScript
- **DB**: Supabase (PostgreSQL + Realtime + Storage)
- **Notify**: LINE Messaging API — Service Messages
- **Payment**: promptpay-qr + โอนธนาคาร + จ่ายหน้างาน

## ⚠️ Next.js 16 — Breaking Changes

Next.js 16.2.1 มี breaking changes จาก training data — อ่าน `node_modules/next/dist/docs/` ก่อนเขียนโค้ดเสมอ อย่า assume ว่า API เหมือน v13/v14

## Structure

```
teebad/
├── frontend/
│   └── src/
│       ├── pages/                # Next.js Page Router — ไฟล์ต่อ route (ใช้ pages/ ไม่ใช่ app/)
│       │   ├── board/            # บอร์ดเกม
│       │   ├── billing/          # คิดเงิน
│       │   ├── session/          # รายการก๊วน + ลงชื่อ
│       │   ├── stats/            # สถิติ & อันดับ
│       │   └── api/              # API routes
│       ├── components/           # UI components จัดตาม feature
│       │   ├── session/
│       │   ├── board/
│       │   ├── billing/
│       │   ├── locks/
│       │   ├── stats/
│       │   └── ui/               # shadcn/ui components (auto-generated)
│       ├── hooks/                # useLiff, useSessions, useBoard, useMatchmaking
│       │   │                     # useBilling, useLocks, useStats
│       ├── lib/                  # liff, api, supabase, promptpay, matchmaking, khunthong, utils
│       └── types/index.ts
└── backend/
    └── src/
        ├── routes/               # sessions, registrations, matches, payments, locks, stats, admin
        ├── middleware/           # verifyLiff, isAdmin
        ├── services/             # matchmaking, billing, lineNotify, cronJobs
        └── db/schema.sql
```

## Key Commands

```bash
# Frontend (Next.js)
cd frontend
npm run dev                          # dev server — http://localhost:3000
npm run build && npm start           # production
npx shadcn@latest add <component>    # เพิ่ม shadcn component

# Backend
cd backend
npm run dev          # dev with nodemon
npm run build && npm start

# DB
supabase db push                     # apply schema changes
supabase gen types typescript        # regenerate TS types → src/types/supabase.ts
```

## Core Rules

- ตอบและ comment เป็นภาษาไทย ยกเว้น code และ technical terms
- TypeScript strict mode ทุกไฟล์ — ห้าม `any`
- ทุก API route ต้อง verify LIFF ID Token ผ่าน `middleware/verifyLiff.ts`
- ใช้ Supabase Realtime สำหรับ board + score updates เท่านั้น — ห้าม polling
- ห้าม hardcode ค่าใดๆ — ใช้ `process.env.*` / `NEXT_PUBLIC_*` เสมอ
- error handling: try/catch ทุก async function + return `{ error: true, message: string }`

## Frontend: Next.js + shadcn/ui Rules

- ใช้ **Page Router** (`src/pages/`) เท่านั้น — ห้ามสร้าง `src/app/` directory
- ทุก page เป็น Client Component โดย default ใน Page Router — ไม่มี Server Components
- LIFF init ใน `useEffect` ของ page component หรือ `_app.tsx`
- ใช้ `getServerSideProps` / `getStaticProps` สำหรับ data fetching ฝั่ง server ถ้าจำเป็น
- ใช้ **shadcn/ui** สำหรับ UI ทุกอย่าง — ห้ามสร้าง component ซ้ำถ้ามีใน shadcn แล้ว
  - Button, Card, Badge, Dialog, Sheet, Tabs, Avatar, Progress, Skeleton → ใช้ shadcn
  - Form + validation → `react-hook-form` + `zod` (มาพร้อม shadcn)
- **Radix UI** primitives ใช้ตรงๆ เฉพาะ case ที่ shadcn ไม่มี (เช่น custom Collapsible, Tooltip ที่ต้องการ behavior พิเศษ)
- **Tailwind CSS** — ห้าม inline style, ใช้ `cn()` utility จาก `lib/utils.ts` สำหรับ conditional class
- Image → `next/image` เสมอ, Link → `next/link` เสมอ
- Loading state → useState + `<Skeleton>` จาก shadcn (ไม่มี `loading.tsx` ใน Page Router)
- Error state → useState + `<Alert variant="destructive">` จาก shadcn (ไม่มี `error.tsx` ใน Page Router)

## Domain Logic (อ่านก่อนแก้โค้ดที่เกี่ยวข้อง)

**Matchmaking** — 4 โหมด: `random` / `rotation` (เล่นน้อยขึ้นก่อน) / `winner_stays` (ชนะ 3 รอบต้องลงคิว) / `manual`

**Billing** — 2 แบบ: `equal` (หารเท่า) / `by_games` (ตามจำนวนเกมจริง, round up แล้วปรับคนสุดท้าย)

**Partner Lock** — 3 ประเภท: `same_team` / `opponents` / `avoid` — ต้องยืนยันทั้ง 2 ฝ่าย, max 3 locks ต่อคน, fallback แจ้ง admin ถ้าจัดไม่ลงตัว

**Khunthong** — ไม่มี Public API, ระบบสร้างคำสั่งสำเร็จรูปให้ก็อปวางในกลุ่ม LINE เท่านั้น

## Detailed Specs

อ่านไฟล์เหล่านี้เมื่อทำงานที่เกี่ยวข้อง:

- Types ทั้งหมด → `frontend/src/types/index.ts`
- Matchmaking algorithm → `backend/src/services/matchmaking.ts`
- Billing logic → `backend/src/services/billing.ts`
- Lock constraints → `backend/src/services/lockConstraints.ts`
- DB schema + RLS → `backend/src/db/schema.sql`
- LINE Service Message templates → `backend/src/services/lineNotify.ts`
