# Training Hub - Onboarding Platform

Internal employee onboarding platform based on the manager build specification. Phase 1 focuses on the Landscape project, sequential onboarding, training modules, certification quiz, and admin/team lead progress visibility.

## Features

- **Roles:** Employee, Team Lead, Admin
- **Onboarding:** Sequential 5-step flow with locked future steps
- **Projects:** Landscape active; Email Replies, Quality Control, and Data Collection marked coming soon
- **Training:** 9 Landscape annotation modules rendered as expandable guidelines
- **Quiz:** 5-question Landscape certification check with 80% pass threshold
- **Admin:** Manage users, progress reports, and content manager screens
- **Responsive UI:** Collapsible sidebar under tablet/mobile widths

## Quick Start

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Employee | employee@company.in | password123 |
| Team Lead | lead@company.in | password123 |
| Admin | admin@company.in | password123 |

## Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** MySQL with Prisma (legacy SQLite supported for one-time migration)

## MySQL Setup (Hostinger / Production-style)

1. Create a MySQL database + user in Hostinger
2. Enable remote access (or allow connections from your deployment)
3. Create a local `.env` from `.env.example` and set:
   - `DATABASE_URL` to your MySQL connection string
   - `SQLITE_DATABASE_URL` pointing to your old SQLite file (only if migrating)
4. Create tables in MySQL:

```bash
npm run db:push
```

## Migrate Existing SQLite Data -> MySQL

```bash
npm run prisma:generate:sqlite
npm run db:migrate:sqlite-to-mysql
```

## Key Routes

| Path | Description |
|------|-------------|
| `/` | Dashboard / Overview |
| `/onboarding` | Sequential onboarding flow |
| `/projects` | Project list |
| `/projects/landscape/train` | Landscape training modules |
| `/projects/landscape/quiz` | Certification quiz |
| `/certifications` | Earned and upcoming certification cards |
| `/profile` | Profile and settings |
| `/admin/users` | Admin user management |
| `/admin/progress` | Admin/Team Lead progress reports |
| `/admin/content` | Admin content manager |
