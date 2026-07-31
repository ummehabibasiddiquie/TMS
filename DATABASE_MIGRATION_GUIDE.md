# Database Migration Guide: Local MySQL → Hostinger

## Method 1: Using Prisma (Recommended for Schema)

### Step 1: Sync Schema to Hostinger
This will create all tables on Hostinger based on your Prisma schema:

```bash
DATABASE_URL="mysql://root:TFShrms%40123%28%29@72.62.197.92:3306/tms_prod" npx prisma db push
```

### Step 2: Migrate Data
After schema is synced, you have several options for data migration:

## Method 2: Using mysqldump (Recommended for Data)

### Option A: Direct Export/Import (if you have mysqldump installed)

```bash
# Export from local database
mysqldump -u root -p tms_local > backup.sql

# Import to Hostinger database
mysql -h 72.62.197.92 -u root -pTFShrms@123() tms_prod < backup.sql
```

### Option B: Using PHPMyAdmin (Easiest)

1. **Export from Local:**
   - Open phpMyAdmin (http://localhost/phpmyadmin)
   - Select `tms_local` database
   - Click "Export" tab
   - Choose "Quick" export method
   - Select "SQL" format
   - Click "Export" to download `tms_local.sql`

2. **Import to Hostinger:**
   - Log in to Hostinger panel
   - Go to **Hosting** → **Manage** → **phpMyAdmin**
   - Select `tms_prod` database
   - Click "Import" tab
   - Choose the exported `tms_local.sql` file
   - Click "Import"

## Method 3: Using Custom Migration Script

I've created a migration script for you:

```bash
# Set your Hostinger DATABASE_URL as DATABASE_URL_REMOTE
DATABASE_URL_REMOTE="mysql://root:TFShrms%40123%28%29@72.62.197.92:3306/tms_prod" npx tsx scripts/migrate-to-hostinger.ts
```

## Method 4: Manual Table-by-Table (For Small Datasets)

If you prefer manual control, you can export/import specific tables:

### Using Prisma Studio (for visual export/import)
```bash
# Open local database
npx prisma studio

# Record the data you want to migrate
```

### Using SQL Queries
```sql
-- Export from local
SELECT * FROM users INTO OUTFILE '/tmp/users.csv';

-- Import to Hostinger (you'll need to use CSV import in phpMyAdmin)
```

## Recommended Approach

### For Most Users: Method 2B (phpMyAdmin)
This is the easiest and most reliable method:
1. Export via local phpMyAdmin
2. Import via Hostinger phpMyAdmin
3. Works with all data types and relationships

### For Developers: Method 1 + Method 2A
1. Use Prisma to sync schema: `DATABASE_URL="..." npx prisma db push`
2. Use mysqldump for data: `mysqldump ... | mysql ...`

## Pre-Migration Checklist

- [ ] Hostinger database exists and is empty
- [ ] You have correct credentials (user: root, password: TFShrms@123())
- [ ] Hostinger allows external connections
- [ ] You've tested the connection: `npm run predeploy:check`
- [ ] You have a backup of your local database

## Post-Migration Steps

1. **Verify Data:**
   ```bash
   # Check row counts
   DATABASE_URL="mysql://root:TFShrms%40123%28%29@72.62.197.92:3306/tms_prod" npx prisma studio
   ```

2. **Test Application:**
   ```bash
   # Temporarily use production database locally
   DATABASE_URL="mysql://root:TFShrms%40123%28%29@72.62.197.92:3306/tms_prod" npm run dev
   ```

3. **Update Vercel:**
   - Add the DATABASE_URL to Vercel environment variables
   - Redeploy your application

## Troubleshooting

### Issue: Foreign Key Constraints
**Solution:** Add this to your export:
```sql
SET FOREIGN_KEY_CHECKS=0;
-- your data
SET FOREIGN_KEY_CHECKS=1;
```

### Issue: Large Database
**Solution:** Export in chunks by table:
```bash
mysqldump -u root -p tms_local users > users.sql
mysqldump -u root -p tms_local projects > projects.sql
# Then import each file separately
```

### Issue: Character Encoding
**Solution:** Use proper charset in export:
```bash
mysqldump -u root -p --default-character-set=utf8mb4 tms_local > backup.sql
```

## Quick Start Command

If you want to use the easiest method (phpMyAdmin):

1. Open http://localhost/phpmyadmin
2. Export `tms_local` database as SQL
3. Open Hostinger phpMyAdmin
4. Import the SQL file to `tms_prod`

Then update your Vercel environment variables with:
```
DATABASE_URL=mysql://root:TFShrms%40123%28%29@72.62.197.92:3306/tms_prod
```