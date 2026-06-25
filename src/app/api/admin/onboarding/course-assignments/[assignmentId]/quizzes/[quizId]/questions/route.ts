import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST add question to quiz
export async function POST(req: Request, { params }: { params: { assignmentId: string; quizId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quizId } = params;
  const { question, options, correctAnswer, order } = await req.json();
  if (!question || !options || !correctAnswer) {
    return NextResponse.json({ error: "question, options, and correctAnswer are required" }, { status: 400 });
  }

  const quizQuestion = await prisma.quizQuestion.create({
    data: {
      courseQuizId: quizId,
      question,
      options: JSON.stringify(options),
      correct: JSON.stringify(correctAnswer),
      order: order || 0
    }
  });

  return NextResponse.json({ quizQuestion }, { status: 201 });
}