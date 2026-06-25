import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCategories() {
  console.log('Starting category seeding...');

  // Create default categories
  const defaultCategories: Array<{ name: string; code: string | null; description: string | null }> = [
    { name: 'Data Annotation', code: 'DA', description: 'Data annotation and labeling projects' },
    { name: 'Communication', code: 'COMM', description: 'Communication and messaging projects' },
    { name: 'Review & QC', code: 'QC', description: 'Quality control and review projects' },
    { name: 'Data Ops', code: 'OPS', description: 'Data operations and management projects' },
  ];

  // Create admin user (or use existing)
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!adminUser) {
    console.error('No admin user found. Please create an admin user first.');
    return;
  }

  // Create categories
  for (const categoryData of defaultCategories) {
    const existing = await prisma.projectCategory.findFirst({
      where: { name: categoryData.name },
    });

    if (!existing) {
      await prisma.projectCategory.create({
        data: {
          ...categoryData,
          status: 'ACTIVE',
          createdBy: adminUser.id,
        },
      });
      console.log(`Created category: ${categoryData.name}`);
    } else {
      console.log(`Category already exists: ${categoryData.name}`);
    }
  }

  console.log('Category seeding completed!');
}

seedCategories()
  .catch((e) => {
    console.error('Error seeding categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
