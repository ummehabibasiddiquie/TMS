import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TRAINING_DAYS = [
  { id: 1, title: "Documentation & Orientation", projectName: "Orientation" },
  { id: 2, title: "Boost (IBBA List)", projectName: "Boost" },
  { id: 3, title: "REX (Headcount & Growth)", projectName: "REX" },
  { id: 4, title: "KeyMedia", projectName: "KeyMedia" },
  { id: 5, title: "Chetkowski", projectName: "Chetkowski" },
  { id: 6, title: "WAVE (Address Verification)", projectName: "WAVE" },
  { id: 7, title: "Church", projectName: "Church" },
  { id: 8, title: "GP for NFP", projectName: "GP for NFP" },
  { id: 9, title: "Sylogy (AHP List)", projectName: "Sylogy" },
  { id: 10, title: "Manual Enrichment", projectName: "Manual Enrichment" },
  { id: 11, title: "REX (All Screen)", projectName: "REX" },
  { id: 12, title: "Sylogist Hospital", projectName: "Sylogist Hospital" },
  { id: 13, title: "FirstIgnite", projectName: "FirstIgnite" },
  { id: 14, title: "SCE", projectName: "SCE" },
  { id: 15, title: "Duranta", projectName: "Duranta" },
];

async function main() {
  await prisma.discussionComment.deleteMany();
  await prisma.lessonNote.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.learningStreak.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.trainerReview.deleteMany();
  await prisma.qAReview.deleteMany();
  await prisma.dailySubmission.deleteMany();
  await prisma.dayRequiredLearning.deleteMany();
  await prisma.trainingPhaseConfig.deleteMany();
  await prisma.trainingDay.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.completionRule.deleteMany();
  await prisma.prerequisite.deleteMany();
  await prisma.learningPathCourse.deleteMany();
  await prisma.learningPath.deleteMany();
  await prisma.course.deleteMany();
  await prisma.traineeProfile.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: { email: "admin@company.in", passwordHash: hash, name: "Divya Nair", role: "ADMIN" },
  });
  const trainer = await prisma.user.create({
    data: {
      email: "lead@company.in",
      passwordHash: hash,
      name: "Amit Shah",
      role: "TRAINER",
      employeeId: "TRN001",
    },
  });
  const trainee = await prisma.user.create({
    data: {
      email: "employee@company.in",
      passwordHash: hash,
      name: "Priya Sharma",
      role: "TRAINEE",
      employeeId: "EMP1001",
      dateOfJoining: new Date("2025-05-10"),
    },
  });

  const trainee2 = await prisma.user.create({
    data: {
      email: "rahul@company.in",
      passwordHash: hash,
      name: "Rahul Patel",
      role: "TRAINEE",
      employeeId: "EMP1002",
      dateOfJoining: new Date("2025-05-12"),
    },
  });
  const trainee3 = await prisma.user.create({
    data: {
      email: "meera@company.in",
      passwordHash: hash,
      name: "Meera Joshi",
      role: "TRAINEE",
      employeeId: "EMP1003",
      dateOfJoining: new Date("2025-05-15"),
    },
  });

  await prisma.traineeProfile.create({
    data: {
      userId: trainee.id,
      projectAssigned: "Landscape",
      trainerId: trainer.id,
      trainingStarted: true,
      trainingStatus: "IN_PROGRESS",
      currentDayNumber: 3,
    },
  });
  await prisma.traineeProfile.create({
    data: {
      userId: trainee2.id,
      projectAssigned: "Landscape",
      trainerId: trainer.id,
      trainingStarted: true,
      trainingStatus: "IN_PROGRESS",
      currentDayNumber: 1,
    },
  });
  await prisma.traineeProfile.create({
    data: {
      userId: trainee3.id,
      projectAssigned: "Landscape",
      trainerId: trainer.id,
      trainingStarted: true,
      trainingStatus: "IN_PROGRESS",
      currentDayNumber: 0,
    },
  });

  const achievements = [
    { code: "FIRST_LESSON", title: "First Steps", description: "Complete your first lesson", icon: "🎯" },
    { code: "FIVE_LESSONS", title: "Quick Learner", description: "Complete 5 lessons", icon: "⚡" },
    { code: "FIRST_COURSE", title: "Course Graduate", description: "Complete a full course", icon: "🎓" },
    { code: "STREAK_3", title: "3-Day Streak", description: "Learn 3 days in a row", icon: "🔥" },
    { code: "STREAK_7", title: "Week Warrior", description: "7-day learning streak", icon: "🏆" },
  ];
  for (const a of achievements) {
    await prisma.achievement.create({ data: a });
  }

  const orientationCourse = await prisma.course.create({
    data: {
      title: "Training Fundamentals",
      description: "Company introduction, policies, and core orientation for all trainees.",
      published: true,
      createdById: trainer.id,
      completionRules: {
        create: { requireAllLessons: true, requireQuizPass: true, minWatchPercent: 90 },
      },
      modules: {
        create: [
          {
            title: "Module 1: Company Introduction",
            order: 0,
            lessons: {
              create: [
                {
                  title: "Orientation Video",
                  order: 0,
                  lessonType: "CONTENT",
                  durationMin: 15,
                  topics: {
                    create: {
                      title: "Welcome to TransForm",
                      contentType: "VIDEO",
                      contentUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                      order: 0,
                      durationSec: 900,
                    },
                  },
                },
                {
                  title: "Policies Document",
                  order: 1,
                  lessonType: "CONTENT",
                  durationMin: 10,
                  topics: {
                    create: {
                      title: "Company Policies PDF",
                      contentType: "PDF",
                      contentBody: "Review all company policies including data security, attendance, and quality standards.",
                      order: 0,
                    },
                  },
                },
              ],
            },
          },
          {
            title: "Module 2: SOP Training",
            order: 1,
            lessons: {
              create: [
                {
                  title: "SOP Training",
                  order: 0,
                  lessonType: "CONTENT",
                  topics: {
                    create: {
                      title: "Standard Operating Procedures",
                      contentType: "SOP",
                      contentBody: "SOP-001: Data entry workflow\nSOP-002: Quality check procedures\nSOP-003: Error handling protocol",
                      order: 0,
                    },
                  },
                },
                {
                  title: "PPRT Documentation",
                  order: 1,
                  lessonType: "CONTENT",
                  topics: {
                    create: {
                      title: "Project Process Reference",
                      contentType: "PPRT",
                      contentBody: "PPRT-REX-001: REX Headcount process\nPPRT-REX-002: Growth metrics validation",
                      order: 0,
                    },
                  },
                },
                {
                  title: "Assessment Quiz",
                  order: 2,
                  lessonType: "QUIZ",
                  quiz: {
                    create: {
                      title: "SOP & PPRT Assessment",
                      passingScore: 70,
                      questions: {
                        create: [
                          {
                            question: "What is the minimum quality target in Phase 1?",
                            options: JSON.stringify(["60%", "70%", "80%", "90%"]),
                            correct: "80%",
                            order: 0,
                          },
                          {
                            question: "When should Phase 1 QC file be submitted?",
                            options: JSON.stringify(["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"]),
                            correct: "12:00 PM",
                            order: 1,
                          },
                          {
                            question: "What document type defines project-specific workflows?",
                            options: JSON.stringify(["SOP", "PPRT", "PDF", "Video"]),
                            correct: "PPRT",
                            order: 2,
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
          {
            title: "Module 3: Project Workflow",
            order: 2,
            lessons: {
              create: [
                {
                  title: "Project Workflow",
                  order: 0,
                  lessonType: "CONTENT",
                  topics: {
                    create: {
                      title: "Daily Project Workflow",
                      contentType: "DOCUMENT",
                      contentBody: "Phase 1: Quality Focus (3hrs) - 30% productivity, 80% quality\nPhase 2: Quality + Productivity (3hrs) - 60% productivity\nPhase 3: Production Simulation (3hrs) - 90-100% productivity",
                      order: 0,
                    },
                  },
                },
                {
                  title: "Practical Exercise",
                  order: 1,
                  lessonType: "ASSIGNMENT",
                  assignment: {
                    create: {
                      title: "Sample QC File Exercise",
                      instructions: "Complete a sample QC file for the assigned project and submit your notes.",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      modules: { include: { lessons: { include: { quiz: true } } } },
    },
  });

  const rexCourse = await prisma.course.create({
    data: {
      title: "REX Project Training",
      description: "REX Headcount & Growth - SOP, PPRT, and assessment for Day 3.",
      published: true,
      createdById: trainer.id,
      completionRules: {
        create: { requireAllLessons: true, requireQuizPass: true, minWatchPercent: 85 },
      },
      modules: {
        create: [
          {
            title: "REX Essentials",
            order: 0,
            lessons: {
              create: [
                {
                  title: "REX SOP",
                  order: 0,
                  lessonType: "CONTENT",
                  topics: {
                    create: {
                      title: "REX Standard Operating Procedure",
                      contentType: "SOP",
                      contentBody: "REX-SOP-001: Headcount verification steps\nREX-SOP-002: Growth data validation\nREX-SOP-003: Screen navigation",
                      order: 0,
                    },
                  },
                },
                {
                  title: "REX PPRT",
                  order: 1,
                  lessonType: "CONTENT",
                  topics: {
                    create: {
                      title: "REX Process Reference",
                      contentType: "PPRT",
                      contentBody: "PPRT-REX-HC: Headcount process flow\nPPRT-REX-GR: Growth metrics workflow",
                      order: 0,
                    },
                  },
                },
                {
                  title: "REX Assessment",
                  order: 2,
                  lessonType: "QUIZ",
                  quiz: {
                    create: {
                      title: "REX Knowledge Check",
                      passingScore: 75,
                      questions: {
                        create: [
                          {
                            question: "REX Phase 3 productivity target is?",
                            options: JSON.stringify(["60-70%", "70-80%", "90-100%", "50-60%"]),
                            correct: "90-100%",
                            order: 0,
                          },
                          {
                            question: "Primary QC deadline for Phase 2?",
                            options: JSON.stringify(["12:00 PM", "4:00 PM", "6:00 PM", "5:00 PM"]),
                            correct: "4:00 PM",
                            order: 1,
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
    include: { modules: { include: { lessons: true } } },
  });

  const path = await prisma.learningPath.create({
    data: {
      title: "15-Day Onboarding Path",
      description: "Complete training journey from orientation through all project assignments.",
      published: true,
      courses: {
        create: [
          { courseId: orientationCourse.id, order: 0 },
          { courseId: rexCourse.id, order: 1 },
        ],
      },
    },
  });

  await prisma.enrollment.createMany({
    data: [
      { userId: trainee.id, courseId: orientationCourse.id, status: "IN_PROGRESS", progressPercent: 78 },
      { userId: trainee.id, courseId: rexCourse.id, status: "NOT_STARTED", progressPercent: 0 },
    ],
  });

  const allLessons = [
    ...orientationCourse.modules.flatMap((m) => m.lessons),
    ...rexCourse.modules.flatMap((m) => m.lessons),
  ];
  const orientLessons = orientationCourse.modules.flatMap((m) => m.lessons);
  for (let i = 0; i < orientLessons.length - 2; i++) {
    await prisma.lessonProgress.create({
      data: {
        userId: trainee.id,
        lessonId: orientLessons[i].id,
        completed: true,
        watchPercent: 100,
        timeSpentSec: 600 + i * 120,
        completedAt: new Date(),
      },
    });
  }
  const partialLesson = orientLessons[orientLessons.length - 2];
  if (partialLesson) {
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId: trainee.id, lessonId: partialLesson.id },
      },
      create: {
        userId: trainee.id,
        lessonId: partialLesson.id,
        completed: false,
        watchPercent: 80,
        timeSpentSec: 400,
      },
      update: { watchPercent: 80 },
    });
  }

  await prisma.learningStreak.create({
    data: { userId: trainee.id, currentStreak: 4, longestStreak: 5, lastLearnDate: new Date() },
  });

  const firstAchievement = await prisma.achievement.findFirst({ where: { code: "FIRST_LESSON" } });
  if (firstAchievement) {
    await prisma.userAchievement.create({
      data: { userId: trainee.id, achievementId: firstAchievement.id },
    });
  }

  for (const day of TRAINING_DAYS) {
    await prisma.trainingDay.create({
      data: {
        id: day.id,
        title: day.title,
        projectName: day.projectName,
        description: `Day ${day.id}: ${day.title}`,
        phases: {
          create: [
            {
              phase: "QUALITY_FOCUS",
              productivityTarget: 30,
              qualityTarget: 80,
              qcDeadline: "12:00 PM",
            },
            {
              phase: "QUALITY_PRODUCTIVITY",
              productivityTarget: 60,
              qualityTarget: 80,
              qcDeadline: "4:00 PM",
            },
            {
              phase: "PRODUCTION_SIMULATION",
              productivityTarget: 95,
              qualityTarget: 98,
              qcDeadline: "4:00 PM",
            },
          ],
        },
      },
    });
  }

  const orientVideo = orientLessons[0];
  const orientPolicies = orientLessons[1];
  const sopLesson = orientLessons[2];
  const pprtLesson = orientLessons[3];
  const quizLesson = orientLessons.find((l) => l.lessonType === "QUIZ");
  const rexLessons = rexCourse.modules[0].lessons;

  await prisma.dayRequiredLearning.createMany({
    data: [
      { dayId: 1, courseId: orientationCourse.id, label: "Complete Orientation Course", required: true },
      { dayId: 3, lessonId: orientVideo?.id, label: "Orientation Video", required: true },
      { dayId: 3, lessonId: sopLesson?.id, label: "SOP Training", required: true },
      { dayId: 3, lessonId: pprtLesson?.id, label: "PPRT Documentation", required: true },
      { dayId: 3, lessonId: quizLesson?.id, label: "Assessment Quiz", required: true },
      { dayId: 3, courseId: rexCourse.id, label: "REX Project Training Course", required: true },
    ],
  });

  const sampleSubmissions = [
    { userId: trainee.id, dayNumber: 3, phase: "QUALITY_FOCUS", productivityPct: 28, qualityPct: 82, sopRead: true, tasksCompleted: 12 },
    { userId: trainee.id, dayNumber: 3, phase: "QUALITY_PRODUCTIVITY", productivityPct: 55, qualityPct: 78, sopRead: true, tasksCompleted: 18 },
    { userId: trainee2.id, dayNumber: 4, phase: "QUALITY_FOCUS", productivityPct: 32, qualityPct: 85, sopRead: true, tasksCompleted: 10, issues: "Minor formatting errors" },
    { userId: trainee2.id, dayNumber: 4, phase: "QUALITY_PRODUCTIVITY", productivityPct: 58, qualityPct: 80, sopRead: true, tasksCompleted: 15 },
    { userId: trainee3.id, dayNumber: 6, phase: "QUALITY_FOCUS", productivityPct: 25, qualityPct: 75, sopRead: false, tasksCompleted: 8 },
    { userId: trainee3.id, dayNumber: 6, phase: "QUALITY_PRODUCTIVITY", productivityPct: 62, qualityPct: 88, sopRead: true, tasksCompleted: 20 },
  ];
  for (const s of sampleSubmissions) {
    await prisma.dailySubmission.create({
      data: { ...s, learningComplete: true },
    });
  }

  console.log("Seed complete!");
  console.log("Login: employee@company.in / lead@company.in / admin@company.in");
  console.log("Password: password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
