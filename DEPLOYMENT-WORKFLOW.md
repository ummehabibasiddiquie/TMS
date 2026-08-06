# Deployment workflow — Vercel (staging) + Hostinger VPS (production)

## Branches

| Branch   | Deploy target | URL |
|----------|---------------|-----|
| **`vercel`** | Vercel (test before release) | `https://<project>.vercel.app` |
| **`main`**   | Hostinger VPS (live)         | `https://tms.tfshrms.cloud` |

**Daily flow:** change code on **`vercel`** → push → test on Vercel → merge **`vercel`** → **`main`** → pull and rebuild on the VPS.

---

## One-time: Git branches

```bash
git checkout main
git pull origin main
git checkout -b vercel    # skip if branch already exists
git push -u origin vercel
```

Keep **`main`** as production; do feature work on **`vercel`** (or short-lived branches merged into **`vercel`** first).

After each production release, sync staging:

```bash
git checkout vercel
git merge main
git push origin vercel
```

---

## One-time: Vercel (staging)

1. [vercel.com](https://vercel.com) → **Add New Project** → import GitHub repo `TMS`.
2. **Settings → Git → Production Branch** → set to **`vercel`** (not `main`).
3. **Settings → Environment Variables** (Production + Preview for branch `vercel`):

   | Variable | Value |
   |----------|--------|
   | `DATABASE_URL` | **Staging** MySQL (separate DB from live TMS) |
   | `BASE_URL` | Your Vercel URL, e.g. `https://tms-xxx.vercel.app` |
   | `NODE_ENV` | `production` (Vercel sets this automatically) |
   | SMTP / app vars | Copy from `.env.example` as needed |

4. **Deploy** (or push to **`vercel`**).
5. Apply schema to **staging** DB (from your PC, once):

   ```bash
   DATABASE_URL="mysql://...staging..." npx prisma migrate deploy
   # or: npx prisma db push
   npm run db:seed
   ```

Use a **different database name** than production (e.g. `tms_staging` vs `tms_prod`).

See also [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) and [HOSTINGER_DB_SETUP.md](./HOSTINGER_DB_SETUP.md).

---

## One-time: Hostinger VPS (production)

DNS: **A** record `tms` → VPS IP (e.g. `tms.tfshrms.cloud`).

On the server:

```bash
sudo mkdir -p /var/www/tms
sudo chown $USER:$USER /var/www/tms
git clone https://github.com/ummehabibasiddiquie/TMS.git /var/www/tms
cd /var/www/tms
git checkout main
```

Create **`.env`** (never commit):

```env
DATABASE_URL="mysql://...@127.0.0.1:3306/tms_prod"
BASE_URL=https://tms.tfshrms.cloud
# + SMTP, HRMS_DATABASE_URL if used
```

```bash
npm install
npm run db:migrate:deploy   # or db:push — once
npm run build
PORT=3001 pm2 start npm --name tms -- start
pm2 save
```

Nginx: new site `server_name tms.tfshrms.cloud;` → `proxy_pass http://127.0.0.1:3001;`  
SSL: `sudo certbot --nginx -d tms.tfshrms.cloud`

Do **not** point the VPS at the **`vercel`** branch; always **`main`**.

---

## Release: merge staging → production

1. Test on Vercel (**`vercel`** branch).
2. Merge into **`main`** (GitHub PR or local):

   ```bash
   git checkout main
   git pull origin main
   git merge vercel
   git push origin main
   ```

3. On VPS:

   ```bash
   cd /var/www/tms
   git fetch origin
   git checkout main
   git pull origin main
   npm install
   npm run build
   pm2 restart tms
   ```

4. Smoke-test `https://tms.tfshrms.cloud`.

---

## Databases (important)

| Environment | Branch  | Database |
|-------------|---------|----------|
| Staging     | `vercel` | `tms_staging` (or similar) |
| Production  | `main`   | `tms_prod` |

Never point Vercel staging at the same `DATABASE_URL` as live unless you accept risk to real trainee data.

---

## Troubleshooting

- **Vercel builds `main` by mistake** → Production Branch = **`vercel`** in project settings.
- **502 on subdomain** → PM2 running? Nginx `server_name` and port match?
- **Wrong links in email** → `BASE_URL` must match each environment’s URL.
