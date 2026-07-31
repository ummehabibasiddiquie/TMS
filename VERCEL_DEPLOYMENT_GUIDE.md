# Vercel Deployment Guide

## Common Issue: "The page could not load" Error

This error typically occurs when your Next.js application tries to access resources that aren't available in the production environment. Here's how to fix it:

## Required Environment Variables

You must configure these environment variables in your Vercel project settings:

### Database Configuration
```
DATABASE_URL=mysql://USERNAME:PASSWORD@HOST:3306/DATABASE_NAME
```

Replace with your actual MySQL database connection string from your hosting provider.

### Application Configuration
```
APP_NAME=Training Management System
BASE_URL=https://your-app-name.vercel.app
```

### Email Configuration (Optional but Recommended)
```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Transform Solution
```

### Password Reset Configuration
```
RESET_TOKEN_EXPIRY_MINUTES=15
OTP_LENGTH=6
```

### Rate Limiting Configuration
```
RATE_LIMIT_MAX_REQUESTS=3
RATE_LIMIT_WINDOW_MINUTES=10
```

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings** tab
3. Click on **Environment Variables**
4. Add each variable from the list above
5. **Important**: Click **Redeploy** after adding environment variables

## Database Setup for Production

### Option 1: Use PlanetScale (Recommended for Vercel)
1. Create a free PlanetScale account
2. Create a new database
3. Get the connection string from PlanetScale dashboard
4. Add it as `DATABASE_URL` in Vercel environment variables
5. Run `npx prisma db push` locally with the production DATABASE_URL to sync schema

### Option 2: Use Existing MySQL Database
1. Get your MySQL connection string from your hosting provider
2. Add it as `DATABASE_URL` in Vercel environment variables
3. Ensure your database allows connections from Vercel's IP addresses
4. Run database migrations:
   ```bash
   DATABASE_URL="your-production-db-url" npx prisma db push
   ```

## Post-Deployment Steps

After deploying to Vercel:

1. **Check Vercel Logs**: Go to your project dashboard → Logs to see specific error messages
2. **Verify Database Connection**: Ensure your database is accessible from Vercel
3. **Test Critical Flows**: 
   - User registration/login
   - Dashboard loading
   - Course access

## Debugging Tips

### Enable Detailed Error Messages
Add this to your Vercel environment variables temporarily:
```
NODE_ENV=development
```

### Check Vercel Function Logs
1. Go to Vercel dashboard
2. Click on your project
3. Go to **Logs** tab
4. Filter by "Serverless Function" to see backend errors

### Common Issues and Solutions

#### Issue: Database Connection Timeout
- **Solution**: Check if your database allows external connections
- **Solution**: Verify the DATABASE_URL is correct
- **Solution**: Ensure database user has proper permissions

#### Issue: Prisma Client Not Generated
- **Solution**: The build script includes `prisma generate`, but you may need to run it manually
- **Solution**: Check that `@prisma/client` is in your dependencies

#### Issue: Environment Variables Not Loading
- **Solution**: Ensure you redeployed after adding variables
- **Solution**: Check that variable names match exactly (case-sensitive)
- **Solution**: Verify you're using the correct environment (Production vs Preview)

## Pre-Deployment Checklist

- [ ] All required environment variables are set in Vercel
- [ ] Database is accessible from external connections
- [ ] Database schema is synced (`prisma db push`)
- [ ] Build runs successfully locally with production-like environment
- [ ] Test the application on the preview deployment first
- [ ] Remove any development-only code or database connections

## Getting Help

If you still encounter issues:

1. Check Vercel deployment logs for specific error messages
2. Verify your database connection works locally with the production DATABASE_URL
3. Ensure all environment variables are properly set in Vercel
4. Check that your database provider allows connections from Vercel's IP ranges

## Monitoring

After successful deployment:

- Monitor Vercel logs for any errors
- Set up error tracking (consider integrating with Sentry or similar)
- Regular database backups
- Monitor database performance and connection limits