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
            include: { quizzes: true, assignment: true },
          },
        },
      },
      completionRules: true,
    },
  });
  if (!course) return 0;

  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  if (lessonIds.length === 0) return 0;

  const allQuizIds = course.modules.flatMap((m) =>
    m.lessons.flatMap((l) => l.quizzes.map((q) => q.id))
  );
  const passedAttempts =
    allQuizIds.length > 0
      ? await prisma.quizAttempt.findMany({
          where: { userId, quizId: { in: allQuizIds }, passed: true },
          select: { quizId: true },
        })
      : [];
  const passedQuizIds = new Set(
    passedAttempts.map((a) => a.quizId).filter(Boolean) as string[]
  );

  const progress = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
  });
  const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

  const rule = course.completionRules[0];
  const minWatch = rule?.minWatchPercent ?? 90;

  let earned = 0;
  for (const lesson of course.modules.flatMap((m) => m.lessons)) {
    const lp = progressMap.get(lesson.id);
    if (!lp) continue;

    const hasQuizzes = lesson.quizzes.length > 0;
    const allQuizzesPassed =
      !hasQuizzes || lesson.quizzes.every((q) => passedQuizIds.has(q.id));

    // If they finished this lesson before a quiz was added, keep content credit
    // (watch/progress) and only reopen full "completed" until quizzes are passed.
    if (hasQuizzes && !allQuizzesPassed && lp.completed) {
      await prisma.lessonProgress.update({
        where: { id: lp.id },
        data: {
          completed: false,
          completedAt: null,
          quizPassed: false,
          watchPercent: Math.max(lp.watchPercent, 100),
        },
      });
      lp.completed = false;
      lp.quizPassed = false;
      lp.watchPercent = Math.max(lp.watchPercent, 100);
    } else if (hasQuizzes && lp.quizPassed !== allQuizzesPassed) {
      await prisma.lessonProgress.update({
        where: { id: lp.id },
        data: {
          quizPassed: allQuizzesPassed,
          ...(allQuizzesPassed
            ? {}
            : { completed: false, completedAt: null }),
        },
      });
      lp.quizPassed = allQuizzesPassed;
      if (!allQuizzesPassed) lp.completed = false;
    }

    const contentDone =
      lesson.lessonType === "QUIZ"
        ? true
        : lesson.lessonType === "ASSIGNMENT"
          ? Boolean(lp.assignmentDone)
          : lp.watchPercent >= minWatch;

    let lessonScore = 0;
    let fullyDone = false;

    if (hasQuizzes) {
      // Partial credit: content half + quiz half (split across quizzes if multiple)
      if (contentDone) lessonScore += 0.5;
      const passedCount = lesson.quizzes.filter((q) => passedQuizIds.has(q.id)).length;
      lessonScore += 0.5 * (passedCount / lesson.quizzes.length);
      fullyDone = contentDone && allQuizzesPassed;
    } else {
      fullyDone =
        lp.completed ||
        (rule?.requireAllLessons !== false &&
          (lp.watchPercent >= minWatch || lesson.lessonType !== "CONTENT") &&
          (!lesson.assignment || lp.assignmentDone || lesson.lessonType !== "ASSIGNMENT"));
      lessonScore = fullyDone ? 1 : 0;
    }

    if (fullyDone && !lp.completed) {
      await prisma.lessonProgress.update({
        where: { id: lp.id },
        data: {
          completed: true,
          completedAt: new Date(),
          quizPassed: hasQuizzes ? true : lp.quizPassed,
          watchPercent: Math.max(lp.watchPercent, hasQuizzes ? lp.watchPercent : 100),
        },
      });
    } else if (!fullyDone && lp.completed) {
      await prisma.lessonProgress.update({
        where: { id: lp.id },
        data: { completed: false, completedAt: null },
      });
    }

    earned += lessonScore;
  }

  const percent = (earned / lessonIds.length) * 100;
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
      completedAt: percent >= 100 ? new Date() : null,
    },
  });

  return percent;
}

/** Recalculate progress for every learner enrolled in a course (e.g. after quiz added). */
export async function recalculateCourseProgressForEnrollments(courseId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { userId: true },
  });
  for (const en of enrollments) {
    await recalculateCourseProgress(en.userId, courseId);
  }
  return enrollments.length;
}

/** Recalculate all enrollments for one user (keeps % in sync when content/quizzes change). */
export async function recalculateUserEnrollments(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    select: { courseId: true },
  });
  const results: { courseId: string; percent: number }[] = [];
  for (const en of enrollments) {
    const percent = await recalculateCourseProgress(userId, en.courseId);
    results.push({ courseId: en.courseId, percent });
  }
  return results;
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
