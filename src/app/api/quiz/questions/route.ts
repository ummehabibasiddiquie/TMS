import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quizId, question, options, correct } = await req.json();
  const cleanOptions = Array.isArray(options)
    ? options.map((option) => String(option).trim()).filter(Boolean)
    : [];

  if (!quizId || !question?.trim() || cleanOptions.length < 2 || !correct?.trim()) {
    return NextResponse.json(
      { error: "quizId, question, at least 2 options, and correct answer are required" },
      { status: 400 }
    );
  }

  if (!cleanOptions.includes(correct.trim())) {
    return NextResponse.json({ error: "Correct answer must match one of the options" }, { status: 400 });
  }

  const order = await prisma.quizQuestion.count({ where: { quizId } });
  const quizQuestion = await prisma.quizQuestion.create({
    data: {
      quizId,
      question: question.trim(),
      options: JSON.stringify(cleanOptions),
      correct: correct.trim(),
      order,
    },
  });

  return NextResponse.json({ question: quizQuestion });
}
