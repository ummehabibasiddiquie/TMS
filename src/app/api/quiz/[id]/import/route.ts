import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";
import { rowsToQuizQuestions } from "@/lib/quiz-import";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quizId = params.id;
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Please upload a CSV or Excel file" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (!/\.(csv|xlsx|xls)$/.test(name)) {
    return NextResponse.json(
      { error: "Only .csv, .xlsx, or .xls files are supported" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "File has no sheets" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: "File has no data rows" }, { status: 400 });
    }

    const { questions, errors } = rowsToQuizQuestions(rows);
    if (questions.length === 0) {
      return NextResponse.json(
        {
          error: "No valid questions found",
          details: errors.slice(0, 10),
        },
        { status: 400 }
      );
    }

    const startOrder = await prisma.quizQuestion.count({ where: { quizId } });

    await prisma.quizQuestion.createMany({
      data: questions.map((q, i) => ({
        quizId,
        question: q.question,
        options: JSON.stringify(q.options),
        correct: q.correct,
        order: startOrder + i,
      })),
    });

    const updated = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({
      imported: questions.length,
      skippedErrors: errors,
      quiz: updated,
    });
  } catch (error) {
    console.error("Quiz import error:", error);
    return NextResponse.json(
      { error: "Failed to parse or import the file" },
      { status: 500 }
    );
  }
}
