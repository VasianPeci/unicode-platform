# UniCode — University Coding Platform

A full-featured LeetCode clone designed for universities, with role-based access for **Admins**, **Teachers**, and **Students**.

## Features

| Feature | Admin | Teacher | Student |
|---------|-------|---------|---------|
| Manage teachers | ✅ | — | — |
| View all students | ✅ | ✅ | — |
| Create problems | — | ✅ | — |
| Create contests | — | ✅ | — |
| Solve problems | — | — | ✅ |
| Join contests | — | — | ✅ |
| View leaderboard | ✅ | ✅ | ✅ |

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Editor**: Monaco Editor (same as VS Code)
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: NextAuth.js (JWT sessions)
- **Code Execution**: Judge0 (or simulation mode for dev)
- **Queue**: BullMQ + Redis (optional, for production)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL` — your PostgreSQL connection string
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32` to generate one

### 3. Set up the database

```bash
# Push the schema to your database
npm run db:push

# Seed with demo data (includes test accounts)
npm run db:seed
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@university.edu | admin123 |
| Teacher | teacher@university.edu | teacher123 |
| Student | alice@university.edu | student123 |
| Student | bob@university.edu | student123 |

---

## Setting Up Code Execution (Judge0)

Without Judge0, the platform runs in **simulation mode** (random accept/reject). For real code execution:

### Option A: Self-hosted Judge0 (recommended for production)

```bash
# Clone Judge0
git clone https://github.com/judge0/judge0.git
cd judge0

# Start with Docker Compose
cp judge0.conf.example judge0.conf
docker-compose up -d
```

Then add to `.env`:
```
JUDGE0_URL=http://localhost:2358
```

### Option B: Judge0 Cloud (RapidAPI)

Sign up at https://rapidapi.com/judge0-official/api/judge0-ce and add:
```
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_TOKEN=your_rapidapi_key
```

---

## Setting Up AI Complexity Bonuses

Submissions are also reviewed by an external AI complexity judge immediately after the normal correctness judge finishes. The platform uses OpenRouter's free model router by default and awards configurable bonus points for better time and space complexity.

Add to `.env`:
```
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openrouter/free
AI_COMPLEXITY_MAX_BONUS=5
AI_COMPLEXITY_TIMEOUT_MS=15000
```

Run `npm run db:push` after pulling this schema change so the new AI review columns exist on `submissions`.

---

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── login/          # Login page
│   │   └── register/       # Registration page
│   ├── dashboard/          # Student/teacher/admin dashboard
│   ├── problems/
│   │   ├── page.tsx        # Problems list
│   │   └── [id]/           # Problem detail + editor
│   ├── contests/           # Contests list
│   ├── leaderboard/        # University leaderboard
│   ├── admin/
│   │   ├── page.tsx        # Admin overview
│   │   ├── teachers/       # Manage teachers
│   │   ├── students/       # View students
│   │   ├── problems/new/   # Create problem
│   │   └── contests/new/   # Create contest
│   └── api/                # API routes
│       ├── auth/           # NextAuth + register
│       ├── problems/       # CRUD
│       ├── submissions/    # Submit + judge
│       ├── contests/       # CRUD
│       ├── leaderboard/    # Rankings
│       └── users/          # User management
├── components/
│   └── layout/
│       └── Sidebar.tsx     # Navigation sidebar
├── lib/
│   ├── auth.ts             # NextAuth config
│   ├── prisma.ts           # Prisma client singleton
│   ├── judge.ts            # Code execution service
│   └── utils.ts            # Shared utilities
└── types/
    └── index.ts            # TypeScript types
prisma/
├── schema.prisma           # Full database schema
└── seed.ts                 # Demo data seeder
```

---

## Next Steps / Roadmap

### Phase 2
- [ ] Contest real-time leaderboard (WebSockets)
- [ ] Problem submission history detail view
- [ ] Markdown preview in problem editor

### Phase 3
- [ ] Problem categories & advanced filtering
- [ ] Student progress analytics for teachers
- [ ] Contest replay / post-mortem view
- [ ] Email notifications (contest start reminder)

### Phase 4
- [ ] Multiple universities / multi-tenant
- [ ] Contextual hints
- [ ] Code plagiarism detection
- [ ] Mobile-responsive layout

---

## Database Schema Overview

- **University** — tenant root; users belong to a university
- **User** — roles: ADMIN, TEACHER, STUDENT; tracks totalPoints
- **Problem** — title, description, difficulty, test cases, starter code per language
- **Tag / ProblemTag** — many-to-many problem categorization
- **Submission** — code, language, status, runtime, memory, test results
- **Contest** — title, start/end times, linked problems
- **ContestProblem** — ordered problems within a contest
- **ContestParticipant** — user's score within a contest

---

## API Reference

### Auth
- `POST /api/auth/register` — create student account
- `POST /api/auth/[...nextauth]` — NextAuth (login/session)
- `POST /api/auth/verify-email` — confirm registration email code

### Problems
- `GET /api/problems` — list (supports `?difficulty=`, `?search=`, `?tag=`)
- `POST /api/problems` — create (TEACHER/ADMIN)
- `GET /api/problems/[id]` — get by id or slug
- `PATCH /api/problems/[id]` — update
- `DELETE /api/problems/[id]` — delete

### Submissions
- `POST /api/submissions` — submit code (runs judge)
- `GET /api/submissions?problemId=` — list user's submissions

### Contests
- `GET /api/contests` — list all
- `POST /api/contests` — create (TEACHER/ADMIN)

### Leaderboard
- `GET /api/leaderboard` — university ranking

### Users
- `PATCH /api/users/[id]` — approve pending student/teacher registration (ADMIN only)
