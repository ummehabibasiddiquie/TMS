/**
 * Database Migration Script: Local MySQL → Hostinger MySQL
 * Usage: DATABASE_URL_REMOTE="mysql://user:pass@host:3306/db" npx tsx scripts/migrate-to-hostinger.ts
 * 
 * This script migrates all tables and data from your local database to Hostinger
 */

import { PrismaClient } from "@prisma/client";

// Get local database connection
const localPrisma = new PrismaClient({
  log: ['query'],
});

// Get remote (Hostinger) database connection
const remoteDbUrl = process.env.DATABASE_URL_REMOTE;
if (!remoteDbUrl) {
  console.error('❌ DATABASE_URL_REMOTE environment variable is not set');
  console.error('Usage: DATABASE_URL_REMOTE="mysql://user:pass@host:3306/db" npx tsx scripts/migrate-to-hostinger.ts');
  process.exit(1);
}

const remotePrisma = new PrismaClient({
  datasources: {
    db: {
      url: remoteDbUrl,
    },
  },
  log: ['query'],
});

type TableMapping = {
  localTable: string;
  remoteTable: string;
  hasId: boolean;
  columns: string[];
};

async function exportTableData(prisma: PrismaClient, tableName: string): Promise<any[]> {
  try {
    // Using raw query to get all data from the table
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM ${tableName}`);
    return result as any[];
  } catch (error) {
    console.error(`❌ Error exporting table ${tableName}:`, error);
    return [];
  }
}

async function clearRemoteTable(prisma: PrismaClient, tableName: string): Promise<void> {
  try {
    // Disable foreign key checks temporarily
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    
    // Clear the table
    await prisma.$executeRawUnsafe(`DELETE FROM ${tableName}`);
    
    // Reset auto-increment
    await prisma.$executeRawUnsafe(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1`);
    
    // Re-enable foreign key checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log(`✅ Cleared remote table: ${tableName}`);
  } catch (error) {
    console.error(`❌ Error clearing table ${tableName}:`, error);
  }
}

async function importTableData(prisma: PrismaClient, tableName: string, data: any[]): Promise<void> {
  if (data.length === 0) {
    console.log(`⚠️  No data to import for table: ${tableName}`);
    return;
  }

  try {
    // Disable foreign key checks temporarily
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

    // Get column names from the first row
    const columns = Object.keys(data[0]);
    const columnNames = columns.join(', ');
    const placeholders = columns.map(() => '?').join(', ');

    // Prepare and execute insert statement
    for (const row of data) {
      const values = columns.map(col => row[col]);
      await prisma.$executeRawUnsafe(
        `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
        ...values
      );
    }

    // Re-enable foreign key checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

    console.log(`✅ Imported ${data.length} rows to table: ${tableName}`);
  } catch (error) {
    console.error(`❌ Error importing table ${tableName}:`, error);
    throw error;
  }
}

async function getTableList(prisma: PrismaClient): Promise<string[]> {
  try {
    const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      AND table_type = 'BASE TABLE'
    `;
    return result.map(row => row.table_name);
  } catch (error) {
    console.error('❌ Error getting table list:', error);
    return [];
  }
}

async function migrateDatabase() {
  console.log('🚀 Starting database migration from local to Hostinger...\n');

  try {
    // Test connections
    console.log('🔍 Testing local database connection...');
    await localPrisma.$connect();
    console.log('✅ Local database connected\n');

    console.log('🔍 Testing Hostinger database connection...');
    await remotePrisma.$connect();
    console.log('✅ Hostinger database connected\n');

    // Get table list from local database
    console.log('📋 Getting table list from local database...');
    const tables = await getTableList(localPrisma);
    console.log(`✅ Found ${tables.length} tables: ${tables.join(', ')}\n`);

    // Get table list from remote database
    console.log('📋 Getting table list from Hostinger database...');
    const remoteTables = await getTableList(remotePrisma);
    console.log(`✅ Found ${remoteTables.length} tables on Hostinger: ${remoteTables.join(', ')}\n`);

    // Process each table
    for (const table of tables) {
      console.log(`\n📦 Processing table: ${table}`);

      // Export data from local
      console.log(`  → Exporting data from local ${table}...`);
      const data = await exportTableData(localPrisma, table);
      console.log(`  → Found ${data.length} rows`);

      // Clear remote table if it exists
      if (remoteTables.includes(table)) {
        console.log(`  → Clearing remote table ${table}...`);
        await clearRemoteTable(remotePrisma, table);
      } else {
        console.log(`  ⚠️  Table ${table} does not exist on remote - you may need to run schema sync first`);
        console.log(`  → Skipping data migration for ${table}`);
        continue;
      }

      // Import data to remote
      if (data.length > 0) {
        console.log(`  → Importing data to remote ${table}...`);
        await importTableData(remotePrisma, table, data);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('📝 Summary:');
    console.log(`   - Processed ${tables.length} tables`);
    console.log(`   - Data transferred from local to Hostinger`);
    console.log('\n🎉 Your Hostinger database is now synchronized with your local database!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Please check:');
    console.error('1. DATABASE_URL_REMOTE is correct');
    console.error('2. Hostinger database allows external connections');
    console.error('3. Tables exist on both databases');
    console.error('4. Schema is synchronized between databases');
    throw error;
  } finally {
    await localPrisma.$disconnect();
    await remotePrisma.$disconnect();
  }
}

// Alternative simpler approach using Prisma schema sync
async function syncSchemaAndData() {
  console.log('🚀 Starting Prisma schema sync and data migration...\n');

  try {
    // First, sync the schema to Hostinger
    console.log('📋 Syncing Prisma schema to Hostinger...');
    console.log('Run this command separately:');
    console.log(`DATABASE_URL="${remoteDbUrl}" npx prisma db push\n`);

    console.log('After schema sync, run this script again to migrate data.');
    console.log('Or use mysqldump for complete migration:\n');

    console.log('mysqldump command:');
    console.log(`mysqldump -u root -p tms_local | mysql -h 72.62.197.92 -u root -p tms_prod\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the migration
if (process.argv.includes('--schema-only')) {
  syncSchemaAndData();
} else {
  migrateDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}