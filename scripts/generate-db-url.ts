/**
 * Helper script to generate properly formatted DATABASE_URL for Hostinger
 * Usage: npx tsx scripts/generate-db-url.ts
 */

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

function encodeURIComponentSpecial(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
}

async function main() {
  console.log('🔧 Hostinger DATABASE_URL Generator\n');
  console.log('This will help you create a properly formatted DATABASE_URL for Vercel.\n');

  try {
    const username = await question('Enter Hostinger database username: ');
    const password = await question('Enter Hostinger database password: ');
    const host = await question('Enter Hostinger database host (default: mysql.hostinger.com): ') || 'mysql.hostinger.com';
    const port = await question('Enter database port (default: 3306): ') || '3306';
    const database = await question('Enter database name: ');

    // URL encode the password to handle special characters
    const encodedPassword = encodeURIComponentSpecial(password);

    const databaseUrl = `mysql://${username}:${encodedPassword}@${host}:${port}/${database}`;

    console.log('\n✅ Generated DATABASE_URL:\n');
    console.log('='.repeat(80));
    console.log(databaseUrl);
    console.log('='.repeat(80));
    console.log('\n📝 Next steps:');
    console.log('1. Copy this DATABASE_URL');
    console.log('2. Add it to your Vercel project environment variables');
    console.log('3. Also add these variables:');
    console.log('   - APP_NAME=Training Management System');
    console.log('   - BASE_URL=https://your-app-name.vercel.app');
    console.log('4. Redeploy your Vercel project');
    console.log('\n💡 Tip: Test the connection first by running:');
    console.log(`   DATABASE_URL="${databaseUrl}" npm run predeploy:check`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
  }
}

main();