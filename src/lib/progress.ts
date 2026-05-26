import { prisma } from "./db";

export async function recalculateCourseProgress(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { quiz: true, assignment: true },
          },
        },
      },
      completionRules: true,
    },
  });
  if (!course) return 0;

  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  if (lessonIds.length === 0) return 0;

  const progress = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
  });
  const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

  const rule = course.completionRules[0];
  const minWatch = rule?.minWatchPercent ?? 90;
  const requireQuiz = rule?.requireQuizPass ?? true;

  let completedCount = 0;
  for (const lesson of course.modules.flatMap((m) => m.lessons)) {
    const lp = progressMap.get(lesson.id);
    if (!lp) continue;

    let done = lp.completed;
    if (!done && rule?.requireAllLessons !== false) {
      const watchOk = lp.watchPercent >= minWatch || lesson.lessonType !== "CONTENT";
      const quizOk =
        !requireQuiz ||
        !lesson.quiz ||
        lp.quizPassed ||
        lesson.lessonType !== "QUIZ";
      const assignOk =
        !lesson.assignment || lp.assignmentDone || lesson.lessonType !== "ASSIGNMENT";
      done = watchOk && quizOk && assignOk;
      if (done) {
        await prisma.lessonProgress.update({
          where: { id: lp.id },
          data: { completed: true, completedAt: new Date() },
        });
      }
    }
    if (done) completedCount++;
  }

  const percent = (completedCount / lessonIds.length) * 100;
  const status =
    percent >= 100 ? "COMPLETED" : percent > 0 ? "IN_PROGRESS" : "NOT_STARTED";

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      progressPercent: percent,
      status,
      lastActivityAt: new Date(),
      completedAt: percent >= 100 ? new Date() : null,
    },
    update: {
      progressPercent: percent,
      status,
      lastActivityAt: new Date(),
      completedAt: percent >= 100 ? new Date() : undefined,
    },
  });

  return percent;
}

export async function isDayLearningComplete(userId: string, dayNumber: number) {
  const requirements = await prisma.dayRequiredLearning.findMany({
    where: { dayId: dayNumber, required: true },
    include: { lesson: true, course: true },
  });
  if (requirements.length === 0) return true;

  for (const req of requirements) {
    if (req.lessonId) {
      const lp = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId: req.lessonId } },
      });
      if (!lp?.completed) return false;
    } else if (req.courseId) {
      const en = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: req.courseId } },
      });
      if (!en || en.progressPercent < 100) return false;
    }
  }
  return true;
}

export async function updateLearningStreak(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.learningStreak.findUnique({ where: { userId } });
  if (!streak) {
    await prisma.learningStreak.create({
      data: { userId, currentStreak: 1, longestStreak: 1, lastLearnDate: today },
    });
    return;
  }

  const last = streak.lastLearnDate ? new Date(streak.lastLearnDate) : null;
  if (last) last.setHours(0, 0, 0, 0);

  if (last?.getTime() === today.getTime()) return;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let current = 1;
  if (last?.getTime() === yesterday.getTime()) {
    current = streak.currentStreak + 1;
  }

  await prisma.learningStreak.update({
    where: { userId },
    data: {
      currentStreak: current,
      longestStreak: Math.max(streak.longestStreak, current),
      lastLearnDate: today,
    },
  });
}

export async function checkAndAwardAchievements(userId: string) {
  const completedLessons = await prisma.lessonProgress.count({
    where: { userId, completed: true },
  });
  const enrollments = await prisma.enrollment.findMany({ where: { userId } });
  const completedCourses = enrollments.filter((e) => e.progressPercent >= 100).length;
  const streak = await prisma.learningStreak.findUnique({ where: { userId } });

  const checks: { code: string; ok: boolean }[] = [
    { code: "FIRST_LESSON", ok: completedLessons >= 1 },
    { code: "FIVE_LESSONS", ok: completedLessons >= 5 },
    { code: "FIRST_COURSE", ok: completedCourses >= 1 },
    { code: "STREAK_3", ok: (streak?.currentStreak ?? 0) >= 3 },
    { code: "STREAK_7", ok: (streak?.currentStreak ?? 0) >= 7 },
  ];

  for (const { code, ok } of checks) {
    if (!ok) continue;
    const achievement = await prisma.achievement.findUnique({ where: { code } });
    if (!achievement) continue;
    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: { userId, achievementId: achievement.id },
      },
      create: { userId, achievementId: achievement.id },
      update: {},
    });
  }
}
