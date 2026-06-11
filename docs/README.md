# TMS Documentation

## Files (keep only these)

| File | Who | Purpose |
|------|-----|---------|
| [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) | Manager + Dev | Schema, ERD, entities |
| [DATA-FLOW.md](./DATA-FLOW.md) | Dev (+ manager if asked) | How data moves (flows + diagrams) |
| [DIAGRAMS.md](./DIAGRAMS.md) | Manager | 3 Mermaid diagrams → export PNG |
| [SYSTEM-DOCUMENTATION.md](./SYSTEM-DOCUMENTATION.md) | Dev | Features, APIs, setup |
| [DEVELOPMENT-LOG.md](./DEVELOPMENT-LOG.md) | Dev | Log each change |

---

## Send to non-IT manager (recommended)

1. **[MANAGER-SUMMARY.md](./MANAGER-SUMMARY.md)** — plain English (or export to PDF)
2. **3 PNG images** from [DIAGRAMS.md](./DIAGRAMS.md)
3. Short verbal update (see summary doc)

**Do not send:** `DATABASE-DESIGN.md`, `DATA-FLOW.md`, `SYSTEM-DOCUMENTATION.md`, `DEVELOPMENT-LOG.md` unless they ask for technical detail.

## Send to technical reviewer (if needed)

1. `DATABASE-DESIGN.md`
2. 3 PNGs from `DIAGRAMS.md`
3. `DATA-FLOW.md` (optional)

---

## Developer — work in order

**Foundation**
1. Database doc + diagrams (above)
2. Log work in [DEVELOPMENT-LOG.md](./DEVELOPMENT-LOG.md)

**Backend (in progress)**
- Prisma + MySQL → schema deploy → auth → roles → APIs → seed

**Features (after backend)**
- Onboarding in database → Landscape cert in database → admin live reports → profile save

Update [SYSTEM-DOCUMENTATION.md](./SYSTEM-DOCUMENTATION.md) feature table when each item is done.
