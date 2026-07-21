import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";
import { rowsToQuizQuestions } from "@/lib/quiz-import";
import { ensureDefaultFinalEvaluationQuiz } from "@/lib/final-evaluation";

/**
 * Admin: import final-evaluation questions from CSV/Excel (same format as lesson quizzes).
 * Appends by default; pass ?replace=1 to replace all existing questions.
 */
export async function POST(req: Request) {
  const user = await requireSession(["ADMIN"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized — Admin only" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const replace = searchParams.get("replace") === "1" || searchParams.get("replace") === "true";

  try {
    await ensureDefaultFinalEvaluationQuiz();
    const quiz = await prisma.finalEvaluationQuiz.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    if (!quiz) {
      return NextResponse.json({ error: "No final quiz found" }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a CSV or Excel file" },
        { status: 400 }
      );
    }

    const name = file.name.toLowerCase();
    if (!/\.(csv|xlsx|xls)$/.test(name)) {
      return NextResponse.json(
        { error: "Only .csv, .xlsx, or .xls files are supported" },
        { status: 400 }
      );
    }

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

    const startOrder = replace
      ? 0
      : await prisma.finalEvaluationQuestion.count({ where: { quizId: quiz.id } });

    await prisma.$transaction(async (tx) => {
      if (replace) {
        await tx.finalEvaluationQuestion.deleteMany({ where: { quizId: quiz.id } });
      }
      await tx.finalEvaluationQuestion.createMany({
        data: questions.map((q, i) => ({
          quizId: quiz.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correct: q.correct,
          sortOrder: startOrder + i,
        })),
      });
    });

    const updated = await prisma.finalEvaluationQuiz.findUnique({
      where: { id: quiz.id },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({
      imported: questions.length,
      replaced: replace,
      skippedErrors: errors,
      quiz: updated,
    });
  } catch (error) {
    console.error("Final evaluation quiz import error:", error);
    return NextResponse.json(
      { error: "Failed to parse or import the file" },
      { status: 500 }
    );
  }
}
