import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import * as XLSX from "xlsx";
import {
  QUIZ_CSV_COLUMNS,
  QUIZ_IMPORT_FORMAT_GUIDE,
  buildQuizImportTemplateCsv,
} from "@/lib/quiz-import";

/**
 * Download shareable quiz question template.
 * ?format=csv (default) or ?format=xlsx
 */
export async function GET(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();

  if (format === "xlsx") {
    const aoa = [
      [...QUIZ_CSV_COLUMNS],
      ...QUIZ_IMPORT_FORMAT_GUIDE.exampleRows.map((row) =>
        QUIZ_CSV_COLUMNS.map((col) => row[col])
      ),
    ];

    const instructions = [
      ["Quiz import format — instructions"],
      [""],
      ["Required columns (row 1 headers):"],
      [QUIZ_CSV_COLUMNS.join(", ")],
      [""],
      ["Rules:"],
      ...QUIZ_IMPORT_FORMAT_GUIDE.rules.map((rule) => [rule]),
      [""],
      ["Fill the Questions sheet, then upload the file on the lesson quiz."],
    ];

    const wb = XLSX.utils.book_new();
    const wsQuestions = XLSX.utils.aoa_to_sheet(aoa);
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsQuestions, "Questions");
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="quiz-questions-template.xlsx"',
      },
    });
  }

  const csv = buildQuizImportTemplateCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="quiz-questions-template.csv"',
    },
  });
}
