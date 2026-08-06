# Deployment Guide - TMS Learning Platform

## Architecture (current)

- **Production app**: Hostinger VPS → `https://tms.tfshrms.cloud` (Git branch **`main`**)
- **Staging / testing**: Vercel (Git branch **`vercel`**)
- **Database**: MySQL on Hostinger (use **separate** DBs for staging vs production)

See **[DEPLOYMENT-WORKFLOW.md](./DEPLOYMENT-WORKFLOW.md)** for branch rules and release steps.

**VPS step-by-step (tms.tfshrms.cloud):** [HOSTINGER-VPS-SETUP.md](./HOSTINGER-VPS-SETUP.md)

---

## Legacy note (Vercel-only)

The steps below still apply for **Vercel env vars and MySQL**, but production hosting is the VPS subdomain unless you choose otherwise.

## Step 1: Set up MySQL Database on Hostinger

1. Log in to your Hostinger control panel
2. Go to **Databases** > **MySQL Databases**
3. Create a new database:
   - Database name: `tms_db` (or your preferred name)
   - Username: Create a new user
   - Password: Generate a strong password
4. Note down your database credentials:
   - Host: Usually `mysql.hostinger.com` or similar
   - Port: `3306`
   - Database name
   - Username
   - Password

## Step 2: Configure Environment Variables

### For Local Development
Create/update `.env` file:
```
DATABASE_URL="mysql://YOUR_USERNAME:YOUR_PASSWORD@mysql.hostinger.com:3306/YOUR_DATABASE_NAME"
```

### For Vercel Deployment
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variable in Vercel dashboard:
   - Key: `DATABASE_URL`
   - Value: `mysql://YOUR_USERNAME:YOUR_PASSWORD@mysql.hostinger.com:3306/YOUR_DATABASE_NAME`

## Step 3: Deploy Database Schema

### Option A: Using Prisma Migrate (Recommended)
```bash
# Set your DATABASE_URL in .env
npm run db:migrate:deploy
```

### Option B: Using Prisma Push (Quick)
```bash
npm run db:push
```

### Option C: Manual via phpMyAdmin
1. Log in to Hostinger phpMyAdmin
2. Select your database
3. Import the SQL schema from Prisma:
   ```bash
   prisma db pull --print > schema.sql
   ```
4. Import `schema.sql` in phpMyAdmin

## Step 4: Deploy to Vercel

1. Push code to GitHub:
   ```bash
   git add .
   git commit -m "Configure for MySQL deployment"
   git push
   ```

2. Import project in Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure environment variables
   - Deploy

## Step 5: Verify Deployment

1. Check Vercel deployment logs
2. Test database connection
3. Verify all API endpoints work
4. Test user registration/login

## Troubleshooting

### Database Connection Issues
- Ensure Hostinger allows remote connections
- Check if your IP is whitelisted in Hostinger
- Verify DATABASE_URL format is correct

### Prisma Migration Issues
- Make sure Prisma client is generated: `npm run build`
- Check if database user has proper permissions
- Verify MySQL version compatibility (Prisma requires MySQL 5.7+)

### Vercel Build Issues
- Ensure `DATABASE_URL` is set in Vercel environment variables
- Check build logs for specific errors
- Verify all dependencies are in package.json

## Important Notes

- The project is already configured for MySQL in `prisma/schema.prisma`
- SQLite (`dev.db`) is for local development only
- Always keep your database credentials secure
- Use strong passwords for database users
- Regular backups are recommended
