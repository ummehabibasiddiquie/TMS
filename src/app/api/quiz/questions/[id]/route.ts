import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question, options, correct } = await req.json();
  const cleanOptions = Array.isArray(options)
    ? options.map((option) => String(option).trim()).filter(Boolean)
    : undefined;

  if (cleanOptions && cleanOptions.length < 2) {
    return NextResponse.json({ error: "At least 2 options are required" }, { status: 400 });
  }

  if (cleanOptions && correct?.trim() && !cleanOptions.includes(correct.trim())) {
    return NextResponse.json({ error: "Correct answer must match one of the options" }, { status: 400 });
  }

  const quizQuestion = await prisma.quizQuestion.update({
    where: { id: params.id },
    data: {
      question: question !== undefined ? question.trim() : undefined,
      options: cleanOptions ? JSON.stringify(cleanOptions) : undefined,
      correct: correct !== undefined ? correct.trim() : undefined,
    },
  });

  return NextResponse.json({ question: quizQuestion });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.quizQuestion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
