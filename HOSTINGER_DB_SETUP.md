# Hostinger Database Setup for Vercel

## Step 1: Get Your Hostinger Database Credentials

1. Log in to your Hostinger account
2. Go to **Hosting** → **Manage** next to your domain
3. Navigate to **Databases** → **MySQL Databases**
4. Find your database and click **Manage** or **Details**

You'll need these details:
- **Database Name** (e.g., `u123456789_tms`)
- **Username** (e.g., `u123456789_admin`)
- **Password** (the password you set when creating the database)
- **Database Host** (e.g., `mysql.hostinger.com`)
- **Port** (usually `3306`)

## Step 2: Format Your DATABASE_URL

The connection string format for MySQL is:
```
mysql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

Replace with your actual Hostinger credentials:
```
mysql://u123456789_admin:yourpassword@mysql.hostinger.com:3306/u123456789_tms
```

**Important:**
- URL-encode special characters in your password (replace `@` with `%40`, `:` with `%3A`, etc.)
- If your password contains special characters, use an online URL encoder
- Make sure there are no spaces in the connection string

## Step 3: Configure Hostinger to Allow External Connections

By default, Hostinger databases may only allow connections from their servers. You need to:

1. In Hostinger panel, go to **Databases** → **MySQL Databases**
2. Find your database and click **Manage**
3. Look for **Remote MySQL** or **Access Control** settings
4. Add Vercel's IP addresses or allow connections from any IP (`%`)

**Vercel IP Ranges:**
You may need to whitelist Vercel's IP ranges. Check Vercel's documentation for current IP ranges, or temporarily allow all IPs (`%`) for testing.

## Step 4: Test Connection Locally

Before deploying, test the connection locally:

1. Create a test environment file:
```bash
cp .env.example .env.test
```

2. Add your Hostinger DATABASE_URL to `.env.test`:
```
DATABASE_URL=mysql://your-hostinger-connection-string
```

3. Run the pre-deployment check:
```bash
DATABASE_URL="mysql://your-hostinger-connection-string" npm run predeploy:check
```

4. If connection fails, check:
   - Credentials are correct
   - Database allows external connections
   - Firewall isn't blocking the connection
   - Password is URL-encoded if it contains special characters

## Step 5: Update Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add the following variables:

**Required:**
```
DATABASE_URL=mysql://your-hostinger-connection-string
APP_NAME=Training Management System
BASE_URL=https://your-app-name.vercel.app
```

**Optional (if you want email functionality):**
```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Transform Solution
```

**Password Reset:**
```
RESET_TOKEN_EXPIRY_MINUTES=15
OTP_LENGTH=6
```

**Rate Limiting:**
```
RATE_LIMIT_MAX_REQUESTS=3
RATE_LIMIT_WINDOW_MINUTES=10
```

4. **Important:** Click **Redeploy** after adding the variables

## Step 6: Run Database Migrations on Production

Since Vercel uses a read-only filesystem, you need to run migrations locally with the production database:

```bash
DATABASE_URL="mysql://your-hostinger-connection-string" npx prisma db push
```

This will sync your Prisma schema with the Hostinger database.

## Common Issues and Solutions

### Issue: Connection Timeout
**Solution:** 
- Check if Hostinger allows external connections
- Verify the database host is correct (some Hostinger plans use different hosts)
- Try using `localhost` if deploying in the same data center

### Issue: Access Denied
**Solution:**
- Verify username and password are correct
- Check if the user has necessary permissions
- Ensure the database user has access from external IPs

### Issue: SSL Connection Errors
**Solution:**
Add SSL parameters to your DATABASE_URL:
```
mysql://username:password@host:3306/database?sslmode=preferred
```

### Issue: Prisma Client Generation Issues
**Solution:**
The build script includes `prisma generate`, but if you have issues:
```bash
DATABASE_URL="mysql://your-hostinger-connection-string" npx prisma generate
```

## Security Best Practices

1. **Never commit .env files** - They're already in .gitignore
2. **Use strong passwords** - Your database password should be complex
3. **Limit database access** - Only allow necessary IPs in Hostinger
4. **Monitor database usage** - Check Hostinger dashboard for unusual activity
5. **Regular backups** - Hostinger provides automatic backups, but verify they're working

## Testing Checklist

Before considering the setup complete:

- [ ] Can connect to Hostinger database locally
- [ ] Prisma db push succeeds with production DATABASE_URL
- [ ] Pre-deployment check passes
- [ ] Environment variables are set in Vercel
- [ ] Database allows connections from Vercel IPs
- [ ] Application builds successfully
- [ ] Basic functionality works on deployed site

## Need Help?

If you encounter issues:

1. Check Vercel deployment logs for specific error messages
2. Verify Hostinger database is accessible externally
3. Test connection locally first using the production DATABASE_URL
4. Check Hostinger documentation for remote MySQL access
5. Ensure your database plan allows external connections