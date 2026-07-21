# TMS Training Hub — System Documentation

**Living document for developers.**  
Update this file when architecture, features, or integrations change.  
Log each change in [DEVELOPMENT-LOG.md](./DEVELOPMENT-LOG.md).

| Meta | Value |
|------|--------|
| **Project** | TMS Learning Platform / Training Hub |
| **Stack** | Next.js 14 · React 18 · Prisma · MySQL · Tailwind |
| **Last updated** | 2026-06-01 |
| **Related** | [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) · [DEVELOPMENT-LOG.md](./DEVELOPMENT-LOG.md) |

---

## 1. Maintenance rules (read first)

1. **After every completed task** → add one entry to [DEVELOPMENT-LOG.md](./DEVELOPMENT-LOG.md) (newest on top).
2. **If you add/change a feature** → update **Section 6 (Feature registry)** status in this file.
3. **If you add API routes or DB tables** → update **Sections 4 and 5**.
4. **If schema changes** → update `prisma/schema.prisma` and note it in the log; refresh DATABASE-DESIGN when major.
5. Keep entries **factual**: what changed, how to test, known gaps.

---

## 2. System purpose

Internal platform for:

- Employee **onboarding** (setup → policies → training → certification)
- **Project training** (e.g. Landscape annotation guidelines)
- **LMS-style courses** (modules, lessons, SOP/PPRT, quizzes)
- **15-day field training** with daily submissions and QA/Team Lead review
- **Admin / Team Lead** visibility and content management

---

## 3. Architecture

```text
┌─────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js App Router   │────▶│   MySQL     │
│  (React UI) │     │  Server Components    │     │  (Prisma)   │
└─────────────┘     │  + API Routes (/api)  │     └─────────────┘
                    └──────────────────────┘
```

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Pages (UI)** | `src/app/**/page.tsx` | Screens per role and feature |
| **API** | `src/app/api/**/route.ts` | JSON endpoints, auth checks |
| **Business logic** | `src/lib/*.ts` | Auth, progress, training helpers |
| **Components** | `src/components/**` | Reusable UI (layout, courses, learning) |
| **Database** | `prisma/schema.prisma` | Models and relations |
| **Seed** | `prisma/seed.ts` | Demo users and sample content |

**Session:** HTTP-only cookie `tms_session` stores user id → `getSession()` in `src/lib/auth.ts`.

**Roles:** `TRAINEE` · `TRAINER` · `ADMIN` (see `src/lib/roles.ts`).

---

## 4. Project structure

```text
TMS with Cursor/
├── prisma/
│   ├── schema.prisma      # MySQL schema (source of truth)
│   └── seed.ts            # Demo data
├── src/
│   ├── app/               # Routes (pages + API)
│   ├── components/        # UI components
│   ├── lib/               # Auth, db, progress, onboarding-data
│   └── types/             # Shared TypeScript types
├── docs/                  # Documentation (this folder)
└── scripts/               # DB migration utilities
```

---

## 5. Database

- **Provider:** MySQL (`DATABASE_URL` in `.env`)
- **ORM:** Prisma 5
- **Full design:** [DATABASE-DESIGN.md](./DATABASE-DESIGN.md)

**Common commands:**

```bash
npm run db:push      # Apply schema to DB
npm run db:seed      # Load demo data
npm run db:studio    # Browse data in Prisma Studio
```

---

## 6. Feature registry

Update **Status** when work progresses: `Done` · `Partial` · `Not started`

| Feature | Status | Routes / entry | Notes |
|---------|--------|----------------|-------|
| Login / logout | Done | `/login`, `/api/auth/*` | Demo users in seed |
| Role-based layout | Done | `AppShell`, role layouts | |
| Admin dashboard | Done | `/`, `/admin/*` | Stats from DB |
| Trainer dashboard | Done | `/trainer/*` | |
| Trainee LMS dashboard | Done | `/trainee` | Enrollments, streak, achievements |
| Course player | Done | `/trainee/courses/[id]/player` | Topics, progress API |
| 15-day training submit | Partial | `/trainee/training` | DB + submit API |
| Trainer / QA reviews | Partial | `/trainer/reviews`, `/api/reviews` | |
| Admin content studio | Done | `/admin/content` | Courses + quiz CRUD UI |
| Admin user list | Partial | `/admin/users` | List from DB; add/edit TBD |
| Admin progress reports | Working | `/admin/progress` | DB-backed via `/api/admin/progress-reports`; uses dynamic onboarding steps, quizzes, certifications; trainers see assigned trainees only |
| Onboarding 5-step UI | Partial | `/onboarding` | Static `onboarding-data.ts` |
| Projects list | Partial | `/projects` | Static project list |
| Landscape training | Partial | `/projects/landscape/train` | Static modules; DB fallback if course exists |
| Landscape quiz | Partial | `/projects/landscape/quiz` | Client-only submit; no cert in DB |
| Certifications page | Partial | `/certifications` | Hardcoded demo state |
| Profile | Partial | `/profile` | View session user; edit TBD |
| Onboarding DB tracking | Not started | — | Planned: step unlock per user |
| Project certification in DB | Not started | — | Planned: link quiz → `QuizAttempt` / cert table |

---

## 7. API reference

Base URL: `/api` (same origin as app).

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | Session | Logout |
| GET/POST | `/api/courses` | Session | List / create courses |
| GET/PATCH/DELETE | `/api/courses/[id]` | Session | Course CRUD |
| GET/POST | `/api/modules` | Session | Modules |
| GET/PATCH/DELETE | `/api/modules/[id]` | Session | Module CRUD |
| GET/POST | `/api/lessons` | Session | Lessons |
| GET/PATCH/DELETE | `/api/lessons/[id]` | Session | Lesson CRUD |
| GET/POST | `/api/topics` | Session | Topics |
| GET/PATCH/DELETE | `/api/topics/[id]` | Session | Topic CRUD |
| GET/POST | `/api/quiz/questions` | Session | Quiz questions |
| GET/PATCH/DELETE | `/api/quiz/questions/[id]` | Session | Question CRUD |
| POST | `/api/quiz/submit` | Trainee | Submit quiz, update progress |
| GET/POST | `/api/progress` | Session | Lesson / course progress |
| POST | `/api/training/submit` | Trainee | Daily training submission |
| GET/POST | `/api/reviews` | Trainer/QA | Reviews on submissions |
| GET/POST | `/api/notes` | Session | Lesson notes |
| GET/POST | `/api/discussions` | Session | Lesson comments |

*When adding an endpoint, add a row here and log it in DEVELOPMENT-LOG.*

---

## 8. Page map (by role)

### All users
| Path | Description |
|------|-------------|
| `/login` | Login |
| `/profile` | Profile |

### Employee (TRAINEE)
| Path | Description |
|------|-------------|
| `/` | Onboarding-oriented home |
| `/onboarding` | 5-step flow |
| `/projects` | Project list |
| `/projects/landscape/train` | Landscape modules |
| `/projects/landscape/quiz` | Certification quiz |
| `/certifications` | Badges |
| `/trainee` | LMS dashboard |
| `/trainee/courses` | Course list |
| `/trainee/courses/[courseId]/player` | Course player |
| `/trainee/training` | Daily training |

### Team Lead (TRAINER)
| Path | Description |
|------|-------------|
| `/` | Team lead home |
| `/admin/progress` | Team progress (shared with admin) |
| `/trainer/reviews` | Submission reviews |
| `/trainer/courses` | Course management |

### Admin
| Path | Description |
|------|-------------|
| `/` | Admin command center |
| `/admin/users` | Users |
| `/admin/content` | Content studio |
| `/admin/progress` | Progress reports |
| `/admin/courses` | Courses |

---

## 9. Environment & local setup

Copy `.env.example` → `.env`:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB_NAME"
```

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000

| Role | Email | Password |
|------|-------|----------|
| Employee | employee@company.in | password123 |
| Team Lead | lead@company.in | password123 |
| Admin | admin@company.in | password123 |

---

## 10. Key libraries & files

| Concern | File |
|---------|------|
| Auth | `src/lib/auth.ts` |
| DB client | `src/lib/db.ts` |
| Progress / achievements | `src/lib/progress.ts` |
| Training helpers | `src/lib/training.ts` |
| Static onboarding (temporary) | `src/lib/onboarding-data.ts` |
| Roles labels | `src/lib/roles.ts` |

---

## 11. Known gaps (update as fixed)

1. Onboarding steps not stored per user in database.
2. Landscape quiz does not call `/api/quiz/submit`.
3. Certifications page not driven by quiz results.
4. Admin progress page uses static table data.
5. Profile edit not persisted.
6. Landscape course not in seed — training falls back to static modules.

*Remove items from this list when resolved; log the fix in DEVELOPMENT-LOG.*

---

## 12. Document revision history

| Date | Change | Author |
|------|--------|--------|
| 2026-06-01 | Initial system doc + dev log structure | — |

*Add a row when you make major updates to this file.*
