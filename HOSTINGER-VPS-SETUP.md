# Hostinger VPS production setup (TMS)

Complete step-by-step guide for running **Training Hub (TMS)** on the same Hostinger VPS as HRMS, at **`https://tms.tfshrms.cloud`**, using Git branch **`main`**.

Staging/testing on **Vercel** uses branch **`vercel`** — see [DEPLOYMENT-WORKFLOW.md](./DEPLOYMENT-WORKFLOW.md).

---

## End-to-end checklist

Use this to track a fresh setup (order matters):

| # | Step | Done when |
|---|------|-----------|
| 1 | DNS **A** record `tms` → VPS IP | `nslookup tms.tfshrms.cloud` shows VPS IP |
| 2 | Clone repo to `~/tms`, branch **`main`** | `ls ~/tms/package.json` |
| 3 | Create `~/tms/.env` | `DATABASE_URL`, `BASE_URL`, `APP_NAME` |
| 4 | `npm install`, DB sync, `npm run build` | Build succeeds |
| 5 | PM2 **`tms`** on port **3001** | `curl -I http://127.0.0.1:3001` → `307` → `/login` |
| 6 | Nginx site for `tms.tfshrms.cloud` | See Part 7 |
| 7 | Let’s Encrypt (Certbot) for subdomain | `curl -I https://tms.tfshrms.cloud` → no SSL error |
| 8 | `pm2 save` | Survives reboot |

---

## Architecture overview

| Item | Value |
|------|--------|
| Live URL | `https://tms.tfshrms.cloud` |
| HRMS URL (existing) | `https://tfshrms.cloud` |
| VPS | Hostinger VPS (e.g. `srv1255447`) |
| App path on server | `~/tms` (e.g. `/root/tms`) |
| Git repo | `https://github.com/ummehabibasiddiquie/TMS` |
| Production branch | **`main`** only on VPS |
| Staging branch | **`vercel`** → Vercel |
| TMS database (MySQL) | `tms_prod` |
| HRMS database (read-only) | `mytfs` (same MySQL server) |
| Process manager | PM2 app name **`tms`** |
| TMS listen port | **`3001`** (must match Nginx `proxy_pass`) |

**PM2 on this server (example):**

| PM2 name | Role |
|----------|------|
| `python-backend` | HRMS |
| `node-backend` | HRMS (Node) |
| **`tms`** | Training Hub (Next.js) |

Do **not** change HRMS Nginx/PM2 when adding TMS.

---

## Part 1 — DNS (Hostinger)

1. Open **Domains** → **tfshrms.cloud** → **DNS**.
2. Add **A** record:
   - **Name:** `tms` only (creates `tms.tfshrms.cloud` — **not** `www.tms`)
   - **Value:** VPS public IP (same as `@` for `tfshrms.cloud`)
3. Wait 5–30 minutes (TTL on `tms` may be up to 4 hours).
4. Verify from your PC:

   ```bash
   nslookup tms.tfshrms.cloud
   ```

   Should return the VPS IP (e.g. `72.62.197.92`).

---

## Part 2 — Git branches (GitHub)

| Branch | Purpose |
|--------|---------|
| **`main`** | Production code deployed on VPS |
| **`vercel`** | Staging on Vercel; merge to `main` when ready |

Workflow: develop/test on **`vercel`** → merge to **`main`** → `git pull` on VPS → rebuild → `pm2 restart tms`.

---

## Part 3 — Code on the VPS (one time)

SSH into the server:

```bash
ssh root@YOUR_VPS_IP
```

### 3.1 Node.js (choose one)

**Option A — nvm (user-level):**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**Option B — system Node 20:**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Install PM2:

```bash
npm install -g pm2
```

### 3.2 Clone repository

If `~/tms` is not a git repo, clone fresh:

```bash
cd ~
rm -rf ~/tms   # only if empty/wrong — backup .env first if needed
git clone https://github.com/ummehabibasiddiquie/TMS.git tms
cd ~/tms
git checkout main
git pull origin main
```

Confirm:

```bash
ls package.json .env
```

Both must be in **`~/tms`**.

Private repo: GitHub **Personal Access Token** or **SSH** key when cloning.

---

## Part 4 — Environment file (`~/tms/.env`)

TMS does **not** use HRMS variables like `DB_HOST` / `API_BASE_URL`. It uses **`DATABASE_URL`** and **`BASE_URL`**.

```bash
nano ~/tms/.env
```

**Minimum production variables:**

```env
DATABASE_URL="mysql://tfs:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:3306/tms_prod"
BASE_URL=https://tms.tfshrms.cloud
APP_NAME="Training Management System"
NODE_ENV=production
```

### Build `DATABASE_URL` from HRMS-style credentials

If HRMS `.env` has:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mytfs
DB_USERNAME=tfs
DB_PASSWORD=...
```

TMS uses the **same host, user, password**, database **`tms_prod`**:

```text
mysql://tfs:ENCODED_PASSWORD@127.0.0.1:3306/tms_prod
```

**URL-encode** special characters in the password **inside the URL only**:

| Char | Encoded |
|------|---------|
| `@` | `%40` |
| `(` | `%28` |
| `)` | `%29` |

On the **VPS**, use **`127.0.0.1`** when MySQL runs on the same machine (not the public IP).

### HRMS projects (optional)

```env
HRMS_DATABASE_NAME=mytfs
```

### Email (optional)

Copy SMTP settings from HRMS; TMS needs **`SMTP_PASS`** set for forgot-password email.

Never commit `.env` to Git.

---

## Part 5 — Install, database, build

```bash
cd ~/tms
npx prisma validate
npm install
npm run db:migrate:deploy
```

If migrations are not used:

```bash
npm run db:push
```

Optional:

```bash
npm run predeploy:check
```

(requires `APP_NAME`, `BASE_URL`, `DATABASE_URL` in `.env`; latest `main` loads `.env` in that script.)

```bash
npm run build
```

Must finish without errors.

---

## Part 6 — PM2 service `tms`

### Check free port

```bash
ss -tlnp | grep 3001
```

No output = port free. If busy, pick **3002** and use it in PM2 **and** Nginx.

### Start TMS

```bash
cd ~/tms
PORT=3001 pm2 start npm --name tms -- start
pm2 list
pm2 logs tms --lines 30
```

**Verify app (before Nginx):**

```bash
curl -I http://127.0.0.1:3001
```

Expected:

```text
HTTP/1.1 307 Temporary Redirect
location: /login
```

### Save and survive reboot

```bash
pm2 save
pm2 startup
# Run the sudo command PM2 prints, then:
pm2 save
```

### Remove a PM2 app (example)

```bash
pm2 delete email-automation
pm2 save
```

### Daily commands

```bash
pm2 restart tms
pm2 logs tms
```

### Optional: ecosystem file

`~/tms/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: "tms",
      cwd: "/root/tms",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
```

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

---

## Part 7 — Nginx + HTTPS (full steps)

Nginx sits in front of TMS: browsers hit **443/80** on `tms.tfshrms.cloud`; Nginx forwards to **`http://127.0.0.1:3001`**.

**Rule:** Add a **new** config for TMS. Do **not** edit the **`tfshrms.cloud`** HRMS vhost.

### 7.1 Install Nginx / Certbot (if missing)

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 7.2 Create TMS site config

```bash
sudo nano /etc/nginx/sites-available/tms.tfshrms.cloud
```

**Start with HTTP + proxy** (Certbot will add SSL lines):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tms.tfshrms.cloud;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save (**Ctrl+O**, Enter, **Ctrl+X**).

### 7.3 Enable site and disable default “Welcome to nginx”

```bash
sudo ln -sf /etc/nginx/sites-available/tms.tfshrms.cloud /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 7.4 Test routing (on the server)

**App directly:**

```bash
curl -I http://127.0.0.1:3001
```

**Nginx with Host header:**

```bash
curl -I -H "Host: tms.tfshrms.cloud" http://127.0.0.1/
```

Expect **`307`** and **`location: /login`**.  
If you see **Welcome to nginx**, the TMS site is not enabled or `default` is still active — repeat 7.3.

### 7.5 HTTPS with Certbot

```bash
sudo certbot --nginx -d tms.tfshrms.cloud
```

- Enter email, agree to terms.
- Choose **redirect HTTP → HTTPS** when offered.

Certbot adds a **`listen 443 ssl`** block and certificate paths under `/etc/letsencrypt/live/tms.tfshrms.cloud/`.

Reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 7.6 Verify HTTPS

```bash
curl -I https://tms.tfshrms.cloud
```

Success looks like:

```text
HTTP/1.1 307 Temporary Redirect
location: /login
```

No `curl: (60) SSL` error.

Browser: **https://tms.tfshrms.cloud** → login page.

### 7.7 Example config after Certbot (reference)

Certbot may rewrite the file. A working **443** block includes **proxy** and **cert paths**:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tms.tfshrms.cloud;

    ssl_certificate /etc/letsencrypt/live/tms.tfshrms.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tms.tfshrms.cloud/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name tms.tfshrms.cloud;
    return 301 https://$host$request_uri;
}
```

If **443** serves “Welcome to nginx” or wrong cert, **`location /`** on 443 must **`proxy_pass`** to **3001**, not `root /var/www/html`.

### 7.8 SSL certificate exists but wrong host (curl error 60)

Symptom:

```text
curl: (60) SSL: no alternative certificate subject name matches target host name 'tms.tfshrms.cloud'
```

Certificate may exist, but Nginx is serving **HRMS** or **default** cert on 443.

**Fix — reinstall cert into Nginx:**

```bash
sudo certbot --nginx -d tms.tfshrms.cloud
```

When prompted:

```text
Certificate not yet due for renewal
1: Attempt to reinstall this existing certificate
2: Renew & replace the certificate
```

Choose **`1`** (reinstall), then:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://tms.tfshrms.cloud
```

**Debug which cert is served:**

```bash
echo | openssl s_client -connect 127.0.0.1:443 -servername tms.tfshrms.cloud 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName
```

**Inspect active Nginx config:**

```bash
sudo nginx -T 2>/dev/null | grep -A30 "server_name tms.tfshrms.cloud"
grep -r "server_name" /etc/nginx/sites-enabled/
```

### 7.9 Do not break HRMS

List vhosts:

```bash
grep -r "server_name" /etc/nginx/sites-enabled/
```

You should see **`tfshrms.cloud`** (HRMS) and **`tms.tfshrms.cloud`** (TMS) as **separate** files or blocks.

---

## Part 8 — Release after code changes (production)

1. Test on Vercel (**`vercel`** branch).
2. Merge **`vercel` → `main`** on GitHub.
3. On VPS:

   ```bash
   cd ~/tms
   git fetch origin
   git checkout main
   git pull origin main
   npm install
   npm run db:migrate:deploy
   npm run build
   pm2 restart tms
   ```

4. Verify **https://tms.tfshrms.cloud**.

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| `fatal: not a git repository` | `git clone` into `~/tms`; don’t use empty folder |
| `predeploy:check` missing env | `.env` in `~/tms`; set `APP_NAME`, `BASE_URL` |
| DB connection failed | `DATABASE_URL`, URL-encoded password, `127.0.0.1`, `tms_prod` |
| Port in use | `ss -tlnp \| grep 3001`; change `PORT` in PM2 and Nginx |
| **Welcome to nginx** in browser | Remove `sites-enabled/default`; enable `tms.tfshrms.cloud`; reload Nginx |
| HTTP **301** to HTTPS but wrong page on HTTPS | Fix **443** block: `proxy_pass` + correct `ssl_certificate` for `tms.tfshrms.cloud` |
| **curl (60) SSL** hostname mismatch | `certbot --nginx -d tms.tfshrms.cloud` → option **1** reinstall |
| **502 Bad Gateway** | `pm2 list` → `tms` online; Nginx port = PM2 `PORT` |
| Wrong password-reset links | `BASE_URL=https://tms.tfshrms.cloud` in `.env` |

---

## Security notes

- Separate DBs: **`tms_prod`** (TMS) vs **`mytfs`** (HRMS).
- Separate staging DB for Vercel, not production.
- Rotate passwords if exposed; never commit `.env`.
- Certbot renews automatically via systemd timer; check: `sudo certbot renew --dry-run`.

---

## Related docs

- [DEPLOYMENT-WORKFLOW.md](./DEPLOYMENT-WORKFLOW.md) — Vercel vs VPS branches
- [HOSTINGER_DB_SETUP.md](./HOSTINGER_DB_SETUP.md) — MySQL connection strings
- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) — Vercel env vars
- [DEPLOYMENT.md](./DEPLOYMENT.md) — General deployment notes
