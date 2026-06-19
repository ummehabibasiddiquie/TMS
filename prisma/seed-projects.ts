import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Get admin user to use as creator
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!admin) {
    console.log("No admin user found. Please run the main seed first.");
    return;
  }

  // Check if projects already exist
  const existingProjects = await prisma.project.findMany();
  const existingNames = new Set(existingProjects.map(p => p.name));

  // Create initial projects only if they don't exist
  const projectsToCreate = [
    {
      name: "Landscape",
      description: "Label sidewalks, buildings, flora, parking, and more on aerial imagery.",
      category: "Data Annotation",
      status: "ACTIVE",
      priority: "HIGH",
    },
    {
      name: "Email Replies",
      description: "Draft and review professional email responses for clients and partners.",
      category: "Communication",
      status: "COMING_SOON",
      priority: "MEDIUM",
    },
    {
      name: "Quality Control",
      description: "Review and accept or reject annotated work to maintain quality standards.",
      category: "Review & QC",
      status: "COMING_SOON",
      priority: "MEDIUM",
    },
    {
      name: "Data Collection",
      description: "Source, format, and validate structured data assets per project specs.",
      category: "Data Ops",
      status: "COMING_SOON",
      priority: "MEDIUM",
    },
  ];

  const createdProjects = [];
  for (const projectData of projectsToCreate) {
    if (!existingNames.has(projectData.name)) {
      const project = await prisma.project.create({
        data: {
          ...projectData,
          createdBy: admin.id,
        },
      });
      createdProjects.push(project);
    }
  }

  console.log("Projects seeded successfully!");
  if (createdProjects.length > 0) {
    console.log("Created projects:", createdProjects.map(p => p.name).join(", "));
  } else {
    console.log("Projects already exist, no new projects created.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
