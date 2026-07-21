import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recalculateCourseProgressForEnrollments } from "@/lib/progress";

/** Create a quiz for an existing lesson (multiple quizzes allowed). */
export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId, title, passingScore } = await req.json();
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const existingCount = await prisma.quiz.count({ where: { lessonId } });

  const quiz = await prisma.quiz.create({
    data: {
      lessonId,
      title: title?.trim() || `${lesson.title} Quiz ${existingCount + 1}`,
      passingScore: typeof passingScore === "number" ? passingScore : 70,
      order: existingCount,
    },
    include: { questions: true },
  });

  // Reopen progress for learners who completed this lesson before the quiz existed
  await recalculateCourseProgressForEnrollments(lesson.module.courseId);

  return NextResponse.json({ quiz }, { status: 201 });
}
