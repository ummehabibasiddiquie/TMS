import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Wipe all app data (order respects FKs where needed; empty DB after force-reset is fine)
  await prisma.finalQuizCertificate.deleteMany();
  await prisma.finalEvaluationAttempt.deleteMany();
  await prisma.finalEvaluationQuestion.deleteMany();
  await prisma.finalEvaluationQuiz.deleteMany();
  await prisma.userChecklistProgress.deleteMany();
  await prisma.curriculumDayLesson.deleteMany();
  await prisma.curriculumChecklistItem.deleteMany();
  await prisma.curriculumDay.deleteMany();
  await prisma.dayWorkReview.deleteMany();
  await prisma.discussionComment.deleteMany();
  await prisma.lessonNote.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.learningStreak.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.lessonProgressOverride.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.trainerReview.deleteMany();
  await prisma.qAReview.deleteMany();
  await prisma.dailySubmission.deleteMany();
  await prisma.projectCertification.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.completionRule.deleteMany();
  await prisma.prerequisite.deleteMany();
  await prisma.course.deleteMany();
  await prisma.project.deleteMany();
  await prisma.projectCategory.deleteMany();
  await prisma.traineeProfile.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("password123", 10);

  await prisma.user.create({
    data: {
      email: "admin@company.in",
      passwordHash: hash,
      name: "Admin",
      role: "ADMIN",
      active: true,
    },
  });

  console.log("Database cleared. Only admin remains.");
  console.log("Login: admin@company.in");
  console.log("Password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
