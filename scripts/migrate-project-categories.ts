import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateProjectCategories() {
  console.log('Starting project category migration...');
  console.log('NOTE: This script is for reference only. Migration has been completed.');
  console.log('The old category field has been removed from the schema.');
  console.log('All projects now use the categoryId relationship.');
}

migrateProjectCategories()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
