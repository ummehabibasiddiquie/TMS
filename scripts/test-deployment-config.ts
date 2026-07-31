/**
 * Pre-deployment configuration test script
 * Run this before deploying to Vercel to catch common issues
 */

import { PrismaClient } from "@prisma/client";

const requiredEnvVars = [
  'DATABASE_URL',
  'APP_NAME',
  'BASE_URL',
];

const optionalEnvVars = [
  'EMAIL_PROVIDER',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_NAME',
  'RESET_TOKEN_EXPIRY_MINUTES',
  'OTP_LENGTH',
  'RATE_LIMIT_MAX_REQUESTS',
  'RATE_LIMIT_WINDOW_MINUTES',
];

function checkEnvVar(name: string, required: boolean = true): boolean {
  const value = process.env[name];
  if (required && !value) {
    console.error(`❌ Missing required environment variable: ${name}`);
    return false;
  }
  if (!required && !value) {
    console.warn(`⚠️  Optional environment variable not set: ${name}`);
    return true;
  }
  if (required) {
    console.log(`✅ ${name}: ${value?.substring(0, 20)}${value && value.length > 20 ? '...' : ''}`);
  }
  return true;
}

async function testDatabaseConnection(): Promise<boolean> {
  console.log('\n🔍 Testing database connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    return false;
  }

  try {
    const prisma = new PrismaClient({
      log: ['error'],
    });

    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`✅ Database query successful (found ${userCount} users)`);

    // Check for required tables
    const tables = await prisma.$queryRaw<Array<{table_name: string}>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `;
    
    const requiredTables = ['User', 'Project', 'Course', 'TraineeProfile'];
    const existingTables = tables.map(t => t.table_name);
    
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`✅ Required table exists: ${table}`);
      } else {
        console.error(`❌ Required table missing: ${table}`);
        await prisma.$disconnect();
        return false;
      }
    }

    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Pre-deployment configuration test\n');
  console.log('📋 Checking environment variables...\n');

  let allRequiredSet = true;
  for (const envVar of requiredEnvVars) {
    if (!checkEnvVar(envVar, true)) {
      allRequiredSet = false;
    }
  }

  console.log('\n📋 Checking optional environment variables...\n');
  for (const envVar of optionalEnvVars) {
    checkEnvVar(envVar, false);
  }

  if (!allRequiredSet) {
    console.error('\n❌ Required environment variables are missing. Please set them before deploying.');
    process.exit(1);
  }

  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    console.error('\n❌ Database connection test failed. Please check your DATABASE_URL.');
    process.exit(1);
  }

  console.log('\n✅ All pre-deployment checks passed!');
  console.log('📝 Next steps:');
  console.log('   1. Add these environment variables to your Vercel project');
  console.log('   2. Run: npx vercel --prod');
  console.log('   3. Monitor deployment logs for any issues');
}

main().catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});