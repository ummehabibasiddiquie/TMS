import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH update question
export async function PATCH(
  req: Request,
  { params }: { params: { assignmentId: string; quizId: string; questionId: string } }
) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { questionId } = params;
  const { question, options, correctAnswer, order } = await req.json();

  const quizQuestion = await prisma.quizQuestion.update({
    where: { id: questionId },
    data: {
      ...(question && { question }),
      ...(options && { options: JSON.stringify(options) }),
      ...(correctAnswer && { correct: JSON.stringify(correctAnswer) }),
      ...(order !== undefined && { order })
    }
  });

  return NextResponse.json({ quizQuestion });
}

// DELETE question
export async function DELETE(
  req: Request,
  { params }: { params: { assignmentId: string; quizId: string; questionId: string } }
) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { questionId } = params;

  await prisma.quizQuestion.delete({
    where: { id: questionId }
  });

  return NextResponse.json({ success: true });
}
