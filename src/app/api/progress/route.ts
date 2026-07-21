import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  recalculateCourseProgress,
  updateLearningStreak,
  checkAndAwardAchievements,
} from "@/lib/progress";

export async function POST(req: Request) {
  const user = await requireSession(["TRAINEE", "ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { lessonId, watchPercent, timeSpentSec, completed, quizScore, quizPassed, assignmentDone, courseId } = body;

  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true, quizzes: { select: { id: true } } },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const cid = courseId || lesson.module.courseId;

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
  });

  // If lesson has quizzes, content "complete" alone is not enough — all quizzes must be passed
  let markCompleted = Boolean(completed);
  if (markCompleted && lesson.quizzes.length > 0) {
    const passed = Boolean(quizPassed ?? existing?.quizPassed);
    if (!passed) markCompleted = false;
  }

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: {
      userId: user.id,
      lessonId,
      watchPercent: watchPercent ?? (markCompleted ? 100 : 0),
      timeSpentSec: timeSpentSec ?? 0,
      completed: markCompleted,
      quizScore,
      quizPassed: quizPassed ?? false,
      assignmentDone: assignmentDone ?? false,
      completedAt: markCompleted ? new Date() : null,
    },
    update: {
      watchPercent: watchPercent ?? (completed ? 100 : undefined),
      timeSpentSec: timeSpentSec !== undefined ? { increment: timeSpentSec } : undefined,
      completed: completed !== undefined ? markCompleted : undefined,
      quizScore: quizScore ?? undefined,
      quizPassed: quizPassed ?? undefined,
      assignmentDone: assignmentDone ?? undefined,
      completedAt: markCompleted ? new Date() : undefined,
    },
  });

  await prisma.enrollment.updateMany({
    where: { userId: user.id, courseId: cid },
    data: { lastLessonId: lessonId, lastActivityAt: new Date() },
  });

  const percent = await recalculateCourseProgress(user.id, cid);
  await updateLearningStreak(user.id);
  await checkAndAwardAchievements(user.id);

  return NextResponse.json({ progress, courseProgress: percent });
}
