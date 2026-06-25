import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH update quiz
export async function PATCH(req: Request, { params }: { params: { assignmentId: string; quizId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quizId } = params;
  const { title, description, passingScore, maxAttempts, isActive } = await req.json();

  const quiz = await (prisma as any).courseQuiz.update({
    where: { id: quizId },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(passingScore !== undefined && { passingScore }),
      ...(maxAttempts !== undefined && { maxAttempts }),
      ...(isActive !== undefined && { isActive })
    }
  });

  return NextResponse.json({ quiz });
}

// DELETE quiz
export async function DELETE(req: Request, { params }: { params: { assignmentId: string; quizId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quizId } = params;

  await (prisma as any).courseQuiz.delete({
    where: { id: quizId }
  });

  return NextResponse.json({ success: true });
}