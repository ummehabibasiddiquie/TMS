import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recalculateCourseProgress } from "@/lib/progress";

/**
 * Admin / Team Lead override of a trainee's lesson completion.
 * POST { userId, lessonId, action: "complete" | "reset", reason? }
 */
export async function POST(req: Request) {
  const actor = await requireSession(["ADMIN", "TRAINER"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const userId = String(body.userId || "");
    const lessonId = String(body.lessonId || "");
    const action = String(body.action || "").toLowerCase();
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!userId || !lessonId) {
      return NextResponse.json({ error: "userId and lessonId are required" }, { status: 400 });
    }
    if (action !== "complete" && action !== "reset") {
      return NextResponse.json({ error: "action must be complete or reset" }, { status: 400 });
    }
    if (action === "reset" && reason.length < 3) {
      return NextResponse.json(
        { error: "Please provide a short reason when resetting a lesson" },
        { status: 400 }
      );
    }

    const trainee = await prisma.user.findFirst({
      where: {
        id: userId,
        role: "TRAINEE",
        ...(actor.role === "TRAINER" && {
          traineeProfile: { trainerId: actor.id },
        }),
      },
      select: { id: true, name: true },
    });
    if (!trainee) {
      return NextResponse.json({ error: "Employee not found or not in your team" }, { status: 404 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { select: { courseId: true, title: true } },
        quizzes: { select: { id: true } },
      },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const courseId = lesson.module.courseId;
    const now = new Date();

    if (action === "complete") {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: {
          userId,
          lessonId,
          completed: true,
          completedAt: now,
          watchPercent: 100,
          quizPassed: lesson.quizzes.length > 0,
          assignmentDone: lesson.lessonType === "ASSIGNMENT",
        },
        update: {
          completed: true,
          completedAt: now,
          watchPercent: 100,
          quizPassed: lesson.quizzes.length > 0 ? true : undefined,
          assignmentDone: lesson.lessonType === "ASSIGNMENT" ? true : undefined,
        },
      });
    } else {
      // Reset: reopen lesson (and quiz requirement) so % drops
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: {
          userId,
          lessonId,
          completed: false,
          completedAt: null,
          watchPercent: 0,
          quizPassed: false,
          quizScore: null,
          assignmentDone: false,
        },
        update: {
          completed: false,
          completedAt: null,
          watchPercent: 0,
          quizPassed: false,
          quizScore: null,
          assignmentDone: false,
        },
      });
    }

    await prisma.lessonProgressOverride.create({
      data: {
        userId,
        lessonId,
        action: action === "complete" ? "COMPLETE" : "RESET",
        reason: reason || (action === "complete" ? "Marked complete by reviewer" : reason),
        changedById: actor.id,
      },
    });

    const courseProgress = await recalculateCourseProgress(userId, courseId);

    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    return NextResponse.json({
      ok: true,
      action,
      courseId,
      courseProgress,
      progress: progress
        ? {
            completed: progress.completed,
            watchPercent: progress.watchPercent,
            quizPassed: progress.quizPassed,
            completedAt: progress.completedAt?.toISOString() ?? null,
          }
        : null,
      message:
        action === "complete"
          ? `Marked "${lesson.title}" complete for ${trainee.name}`
          : `Reset "${lesson.title}" for ${trainee.name}`,
    });
  } catch (error) {
    console.error("Lesson progress override failed:", error);
    return NextResponse.json({ error: "Failed to update lesson progress" }, { status: 500 });
  }
}
