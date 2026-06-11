# TMS — Development Log

Step-by-step record of changes. **Add a new entry at the top** whenever you complete work (feature, fix, API, DB change, or docs).

---

## How to add an entry

Copy this block to the **top** of the "Log entries" section below:

```markdown
### YYYY-MM-DD — Short title
| Field | Detail |
|-------|--------|
| **Developer** | Your name |
| **Type** | Feature · Fix · Database · API · UI · Docs |
| **Plan reference** | e.g. Day 12 — dynamic onboarding (optional) |
| **Summary** | What was built or changed (2–4 lines) |
| **Files / areas** | `path/to/file`, `src/app/...` |
| **Database** | Yes/No — tables or migrations affected |
| **How to test** | Steps to verify |
| **Notes** | Known limits, follow-ups |
```

---

## Log entries

*(Newest first)*

---

### 2026-06-01 — Database design & ERD documentation
| Field | Detail |
|-------|--------|
| **Developer** | — |
| **Type** | Docs |
| **Summary** | Finalized database design document with entity dictionary, relationship summary, and Mermaid ERDs. Added manager-friendly diagram pack (system, roles, simplified ERD, onboarding flow). |
| **Files / areas** | `docs/DATABASE-DESIGN.md`, `docs/DATA-FLOW.md`, `docs/DIAGRAMS.md`, `docs/README.md` |
| **Database** | No schema change — documentation only |
| **How to test** | Open markdown files; export diagrams via [mermaid.live](https://mermaid.live) |
| **Notes** | Schema already implemented in `prisma/schema.prisma` |

---

### 2026-05-xx — Backend foundation & core APIs
| Field | Detail |
|-------|--------|
| **Developer** | — |
| **Type** | Feature · Database · API |
| **Summary** | Prisma + MySQL setup. Full schema (users, courses, lessons, quizzes, progress, 15-day training, reviews). Authentication (bcrypt, session cookie). Core REST APIs for courses, lessons, modules, topics, quiz submit, progress, training submit, reviews. Seed data for demo users and sample courses. |
| **Files / areas** | `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/auth.ts`, `src/lib/db.ts`, `src/app/api/**` |
| **Database** | Yes — all core tables |
| **How to test** | `npm run db:push` → `npm run db:seed` → login as `employee@company.in` / `password123` |
| **Notes** | See [SYSTEM-DOCUMENTATION.md](./SYSTEM-DOCUMENTATION.md) for API list |

---

### 2026-05-xx — Frontend shell, roles & LMS pages
| Field | Detail |
|-------|--------|
| **Developer** | — |
| **Type** | UI |
| **Summary** | App layout with sidebar (`AppShell`). Login with role selection. Role-based home dashboards. Trainee LMS (dashboard, courses, player, training days). Admin content studio & user list. Trainer reviews. Landscape onboarding UI (static data). |
| **Files / areas** | `src/components/layout/AppShell.tsx`, `src/app/**`, `src/lib/onboarding-data.ts` |
| **Database** | Partial — trainee/admin use DB; Landscape onboarding path mostly static |
| **How to test** | `npm run dev` — test each role from login page |
| **Notes** | Onboarding/certification integration tracked as pending in system doc |

---

### 2026-05-xx — Initial project push & deployment fix
| Field | Detail |
|-------|--------|
| **Developer** | — |
| **Type** | Fix |
| **Summary** | Initial repository setup. Vercel build fix (Next.js + eslint-config-next version alignment). |
| **Files / areas** | `package.json`, project root |
| **Database** | No |
| **How to test** | `npm run build` |
| **Notes** | — |

---

<!-- Add your next entry above this line -->
