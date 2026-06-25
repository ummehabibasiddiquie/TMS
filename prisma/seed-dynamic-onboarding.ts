import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding dynamic onboarding system...");

  // Create a default onboarding template
  const template = await prisma.onboardingTemplate.upsert({
    where: { id: "default-template" },
    update: {},
    create: {
      id: "default-template",
      name: "Standard Onboarding",
      description: "Default onboarding flow for new employees",
      isActive: true
    }
  });

  console.log("✅ Created template:", template.name);

  // Create onboarding steps
  const steps = [
    {
      slug: "team-introduction",
      order: 1,
      title: "Team Introduction",
      day: "Day 1",
      duration: "~30 min",
      type: "Manual",
      description: "Join standup and meet your team lead and fellow annotators.",
      templateId: template.id
    },
    {
      slug: "training-modules",
      order: 2,
      title: "Training Modules",
      day: "Day 2-3",
      duration: "~3 hrs",
      type: "Self-study",
      description: "Complete all assigned training modules.",
      templateId: template.id
    },
    {
      slug: "certification-quiz",
      order: 3,
      title: "Certification Quiz",
      day: "Day 3",
      duration: "~20 min",
      type: "Auto-graded",
      description: "Pass the knowledge check with required passing score.",
      templateId: template.id
    },
    {
      slug: "final-completion",
      order: 4,
      title: "Final Completion",
      day: "Day 4",
      duration: "~30 min",
      type: "Manual",
      description: "Final review and approval to start production work.",
      templateId: template.id
    }
  ];

  for (const step of steps) {
    await prisma.onboardingStep.upsert({
      where: { slug: step.slug },
      update: {},
      create: step
    });
  }

  console.log("✅ Created onboarding steps");

  // Create team introduction
  const teamIntro = await prisma.teamIntroduction.create({
    data: {
      templateId: template.id,
      title: "Meet Your Team",
      content: `
        <h2>Welcome to the Team!</h2>
        <p>This section introduces you to your team members and their roles.</p>
        <p>You'll be working closely with:</p>
        <ul>
          <li>Your Team Lead - who will guide your onboarding</li>
          <li>Fellow Annotators - your day-to-day collaborators</li>
          <li>QA Specialists - who will review your work</li>
        </ul>
        <p>Take time to get to know everyone during standups and team meetings.</p>
      `,
      order: 1
    }
  });

  console.log("✅ Created team introduction");

  // Get a sample course for assignment
  const sampleCourse = await prisma.course.findFirst();
  
  if (sampleCourse) {
    // Create course assignment
    const courseAssignment = await prisma.onboardingCourseAssignment.create({
      data: {
        templateId: template.id,
        courseId: sampleCourse.id,
        title: "Landscape Training",
        description: "Complete the landscape annotation training modules",
        order: 1,
        passingScore: 80
      }
    });

    console.log("✅ Created course assignment");

    // Create quiz for the course
    const quiz = await prisma.courseQuiz.create({
      data: {
        assignmentId: courseAssignment.id,
        title: "Landscape Knowledge Check",
        description: "Test your understanding of landscape annotation guidelines",
        passingScore: 80,
        maxAttempts: 3,
        isActive: true,
        questions: {
          create: [
            {
              question: "A paved path running parallel to a main road. What class should you annotate it as?",
              options: JSON.stringify(["Parking Lot", "Sidewalk (Municipal)", "Non-Flora (Paved Area)", "Parcel Boundary"]),
              correct: JSON.stringify(1),
              order: 0
            },
            {
              question: "A driveway from the road to a garage should be labeled as which class?",
              options: JSON.stringify(["Flora", "Parking Spot", "Non-Flora - Paved Area (Driveway)", "Building"]),
              correct: JSON.stringify(2),
              order: 1
            },
            {
              question: "A building is partially covered by trees in aerial view. How should it be annotated?",
              options: JSON.stringify(["Skip the hidden section", "Occluded Building, estimated from visible edges", "Flora only", "Parcel Boundary"]),
              correct: JSON.stringify(1),
              order: 2
            },
            {
              question: "Which must be excluded when marking a Parking Lot?",
              options: JSON.stringify(["Asphalt surface", "Parking spaces", "Sidewalks and pedestrian paths", "Visible lot edges"]),
              correct: JSON.stringify(2),
              order: 3
            },
            {
              question: "Organized flower beds with brick edging near a house front should be labeled as what?",
              options: JSON.stringify(["Planted Bed", "Flora - Lawn", "Non-Flora - Patio", "Obstruction"]),
              correct: JSON.stringify(0),
              order: 4
            }
          ]
        }
      }
    });

    console.log("✅ Created quiz with questions");
  }

  console.log("🎉 Dynamic onboarding seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });