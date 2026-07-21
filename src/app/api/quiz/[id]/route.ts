import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recalculateCourseProgressForEnrollments } from "@/lib/progress";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, passingScore } = await req.json();
  const quiz = await prisma.quiz.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title: String(title).trim() }),
      ...(passingScore !== undefined && { passingScore: Number(passingScore) }),
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ quiz });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: { lesson: { include: { module: { select: { courseId: true } } } } },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const courseId = quiz.lesson.module.courseId;
  await prisma.quiz.delete({ where: { id: params.id } });
  await recalculateCourseProgressForEnrollments(courseId);

  return NextResponse.json({ ok: true });
}
