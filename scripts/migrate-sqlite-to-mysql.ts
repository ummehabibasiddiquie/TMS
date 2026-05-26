import { PrismaClient as MysqlPrismaClient } from "@prisma/client";
import { PrismaClient as SqlitePrismaClient } from "../src/generated/prisma-sqlite";

async function main() {
  const sqlite = new SqlitePrismaClient();
  const mysql = new MysqlPrismaClient();

  const existingUsers = await mysql.user.count();
  if (existingUsers > 0) {
    throw new Error("MySQL database is not empty. Use an empty DB for migration.");
  }

  await mysql.$transaction(async (tx) => {
    const users = await sqlite.user.findMany();
    if (users.length) {
      await tx.user.createMany({ data: users, skipDuplicates: true });
    }

    const traineeProfiles = await sqlite.traineeProfile.findMany();
    if (traineeProfiles.length) {
      await tx.traineeProfile.createMany({ data: traineeProfiles, skipDuplicates: true });
    }

    const achievements = await sqlite.achievement.findMany();
    if (achievements.length) {
      await tx.achievement.createMany({ data: achievements, skipDuplicates: true });
    }

    const courses = await sqlite.course.findMany();
    if (courses.length) {
      await tx.course.createMany({ data: courses, skipDuplicates: true });
    }

    const completionRules = await sqlite.completionRule.findMany();
    if (completionRules.length) {
      await tx.completionRule.createMany({ data: completionRules, skipDuplicates: true });
    }

    const learningPaths = await sqlite.learningPath.findMany();
    if (learningPaths.length) {
      await tx.learningPath.createMany({ data: learningPaths, skipDuplicates: true });
    }

    const learningPathCourses = await sqlite.learningPathCourse.findMany();
    if (learningPathCourses.length) {
      await tx.learningPathCourse.createMany({ data: learningPathCourses, skipDuplicates: true });
    }

    const prerequisites = await sqlite.prerequisite.findMany();
    if (prerequisites.length) {
      await tx.prerequisite.createMany({ data: prerequisites, skipDuplicates: true });
    }

    const modules = await sqlite.module.findMany();
    if (modules.length) {
      await tx.module.createMany({ data: modules, skipDuplicates: true });
    }

    const lessons = await sqlite.lesson.findMany();
    if (lessons.length) {
      await tx.lesson.createMany({ data: lessons, skipDuplicates: true });
    }

    const topics = await sqlite.topic.findMany();
    if (topics.length) {
      await tx.topic.createMany({ data: topics, skipDuplicates: true });
    }

    const quizzes = await sqlite.quiz.findMany();
    if (quizzes.length) {
      await tx.quiz.createMany({ data: quizzes, skipDuplicates: true });
    }

    const quizQuestions = await sqlite.quizQuestion.findMany();
    if (quizQuestions.length) {
      await tx.quizQuestion.createMany({ data: quizQuestions, skipDuplicates: true });
    }

    const quizAttempts = await sqlite.quizAttempt.findMany();
    if (quizAttempts.length) {
      await tx.quizAttempt.createMany({ data: quizAttempts, skipDuplicates: true });
    }

    const assignments = await sqlite.assignment.findMany();
    if (assignments.length) {
      await tx.assignment.createMany({ data: assignments, skipDuplicates: true });
    }

    const assignmentSubmissions = await sqlite.assignmentSubmission.findMany();
    if (assignmentSubmissions.length) {
      await tx.assignmentSubmission.createMany({ data: assignmentSubmissions, skipDuplicates: true });
    }

    const enrollments = await sqlite.enrollment.findMany();
    if (enrollments.length) {
      await tx.enrollment.createMany({ data: enrollments, skipDuplicates: true });
    }

    const lessonProgress = await sqlite.lessonProgress.findMany();
    if (lessonProgress.length) {
      await tx.lessonProgress.createMany({ data: lessonProgress, skipDuplicates: true });
    }

    const learningStreaks = await sqlite.learningStreak.findMany();
    if (learningStreaks.length) {
      await tx.learningStreak.createMany({ data: learningStreaks, skipDuplicates: true });
    }

    const userAchievements = await sqlite.userAchievement.findMany();
    if (userAchievements.length) {
      await tx.userAchievement.createMany({ data: userAchievements, skipDuplicates: true });
    }

    const lessonNotes = await sqlite.lessonNote.findMany();
    if (lessonNotes.length) {
      await tx.lessonNote.createMany({ data: lessonNotes, skipDuplicates: true });
    }

    const discussionComments = await sqlite.discussionComment.findMany();
    if (discussionComments.length) {
      await tx.discussionComment.createMany({ data: discussionComments, skipDuplicates: true });
    }

    const trainingDays = await sqlite.trainingDay.findMany();
    if (trainingDays.length) {
      await tx.trainingDay.createMany({ data: trainingDays, skipDuplicates: true });
    }

    const dayRequiredLearning = await sqlite.dayRequiredLearning.findMany();
    if (dayRequiredLearning.length) {
      await tx.dayRequiredLearning.createMany({ data: dayRequiredLearning, skipDuplicates: true });
    }

    const trainingPhaseConfigs = await sqlite.trainingPhaseConfig.findMany();
    if (trainingPhaseConfigs.length) {
      await tx.trainingPhaseConfig.createMany({ data: trainingPhaseConfigs, skipDuplicates: true });
    }

    const dailySubmissions = await sqlite.dailySubmission.findMany();
    if (dailySubmissions.length) {
      await tx.dailySubmission.createMany({ data: dailySubmissions, skipDuplicates: true });
    }

    const qaReviews = await sqlite.qAReview.findMany();
    if (qaReviews.length) {
      await tx.qAReview.createMany({ data: qaReviews, skipDuplicates: true });
    }

    const trainerReviews = await sqlite.trainerReview.findMany();
    if (trainerReviews.length) {
      await tx.trainerReview.createMany({ data: trainerReviews, skipDuplicates: true });
    }
  });

  await sqlite.$disconnect();
  await mysql.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
});

