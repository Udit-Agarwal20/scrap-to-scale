# 🚀 Scrap to Scale — Event Management Platform

> Organized by **Nex-Cell** · **Mirai School of Technology**

A production-grade Next.js web application for the *Scrap to Scale* entrepreneurship hackathon, where teams transform scrap items into scalable product ideas.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom design system |
| UI | Radix UI primitives + shadcn/ui |
| Animation | Framer Motion |
| Database | Neon Postgres (serverless) |
| ORM | Drizzle ORM |
| Auth | JWT (jose) + bcryptjs |
| Notifications | Sonner |

---

## 🎭 Roles & Portals

| Role | URL | Access |
|---|---|---|
| Admin | `/admin` | Email + Password |
| Judge | `/judge/[token]` | Unique access token link |
| Audience | `/audience` | Public (no auth) |
| Member/Organizer | `/member` | Public monitoring view |
| Public Leaderboard | `/leaderboard` | Public (when enabled) |

---

## 📊 Scoring Formula

```
Final Score (out of 100) =
  (Avg Judge Rubric Score / 3)     → max 33.33
+ (Investment Score normalized / 3) → max 33.33
+ (Audience Vote Score / 3)         → max 33.33
```

### Rubric Breakdown (100 points total)

| Criterion | Max Points |
|---|---|
| Big Idea / Creativity | 15 |
| Product Usefulness & Function | 15 |
| Repurpose Efficiency & Sustainability | 10 |
| Pitch / Storytelling / Confidence | 20 |
| Static Website | 10 |
| Feasibility & Marketability | 10 |
| Team Synergy | 10 |
| Uniqueness / Wow Factor | 10 |

### Audience Voting
- Options: **Like** (1pt weight), **Neutral** (0.5pt), **Dislike** (0pt)
- Score = weighted average × 100
- 1 vote per team per device/IP fingerprint
- 60-second window (configurable in settings)
- Only one team can have open voting at a time

### Investment Scoring
- Each judge has ₹1,00,000 to invest across all teams
- Investment normalized: team's total / max team total × 100
- Finalized investments are locked

### Judge Peer Score Visibility
- Judges **cannot** see each other's scores for a team until **all judges** have submitted for that team
- Peer scores revealed automatically once all are in

---

## 🗄️ Database Schema

```
event_settings   — Global event config
users            — All users (admin, judge, member)
teams            — Competing teams
judges           — Judge profiles + access tokens
judge_scores     — Rubric scores per judge per team
judge_investments — Investment allocations
audience_votes   — Audience votes with fingerprinting
team_score_aggregates — Computed scores cache
audit_logs       — Full audit trail
admin_sessions   — Admin session tokens
```

---

## ⚙️ Setup & Installation

### 1. Clone & Install

```bash
git clone <repo>
cd scrap-to-scale
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Fill in:
- `DATABASE_URL` — your Neon Postgres connection string
- `JWT_SECRET` — a strong random string
- `NEXT_PUBLIC_APP_URL` — your deployment URL

### 3. Database Setup

```bash
# Push schema to Neon
npm run db:push

# Seed initial data (admin + sample judges + teams)
npx tsx src/db/seed.ts
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔐 Default Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@nexcell.com` | `admin@nexcell2024` |

Judge access tokens are printed to console during seed. Each judge gets a unique direct link:

```
http://localhost:3000/judge/[40-char-token]
```

---

## 🚀 Deployment

### Deploy to Vercel

```bash
npm run build
vercel --prod
```

Set environment variables in Vercel dashboard.

### Database (Neon)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`
3. Run `npm run db:push` to initialize schema

---

## 📁 Project Structure

```
src/
├── app/
│   ├── admin/           — Admin panel (dashboard, teams, judges, voting, scores, leaderboard, audit, settings)
│   ├── judge/[token]/   — Judge portal (rubric scoring + investment)
│   ├── audience/        — Audience voting page (real-time)
│   ├── member/          — Organizer monitoring dashboard
│   ├── leaderboard/     — Public leaderboard
│   └── api/             — All API routes
│       ├── auth/        — Admin + Judge auth
│       ├── admin/       — Protected admin endpoints
│       ├── judge/       — Judge endpoints
│       ├── audience/    — Audience voting endpoints
│       └── leaderboard/ — Public leaderboard
├── db/
│   ├── schema.ts        — Full Drizzle schema
│   ├── index.ts         — DB connection
│   └── seed.ts          — Seed script
├── lib/
│   ├── auth.ts          — JWT + session utilities
│   ├── scoring.ts       — Scoring engine
│   └── audit.ts         — Audit log utility
└── types/
    └── index.ts         — Shared TypeScript types
```

---

## 🎨 Design System

- **Dark theme** with CSS custom properties
- **Glassmorphism** cards with backdrop-filter
- **Neon palette**: Cyan `#00f5ff`, Purple `#bf00ff`, Green `#39ff14`, Orange `#ff6b00`
- **Typography**: Clash Display (headings) + DM Sans (body) + JetBrains Mono (code/numbers)
- **Grid background** with subtle cyan lines
- **Scan-line overlay** for CRT aesthetic

---

## 🔄 Real-time Updates

Currently uses **polling** for simplicity:
- Audience page polls every **3 seconds**
- Member monitoring page polls every **10 seconds**
- Leaderboard polls every **15 seconds**

For production, upgrade to **Neon's built-in triggers** or add **Pusher / Ably** for WebSocket push.

---

## 🛡️ Security Features

- JWT-based session management (httpOnly cookies)
- Role-based access control on all API routes
- Voter fingerprinting (IP + User-Agent hash) to prevent duplicate votes
- Audit log for all system actions
- Score submission locking (once submitted, cannot be changed)
- Investment finalization locking

---

## 📝 Audit Log Events

Every significant action is logged with actor, target, metadata, and IP:

- `admin_login` · `judge_login`
- `team_created` · `team_updated` · `team_deleted`
- `judge_created` · `judge_score_submitted` · `judge_investment_submitted`
- `audience_voting_opened` · `audience_voting_closed` · `audience_vote_cast`
- `leaderboard_refresh` · `settings_updated`

---

Built with ❤️ for **Nex-Cell** × **Mirai School of Technology**
