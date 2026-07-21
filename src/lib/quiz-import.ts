export type ImportedQuizQuestion = {
  question: string;
  options: string[];
  correct: string;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function cell(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * Accepts spreadsheet rows (objects or arrays) and maps them to quiz questions.
 * Supported headers (case-insensitive):
 * - question / ques / q
 * - option1..option6 / optiona..optionf / opt1..opt6
 * - options (pipe | or semicolon ; separated)
 * - correct / answer / correctanswer
 */
export function rowsToQuizQuestions(rows: Record<string, unknown>[]): {
  questions: ImportedQuizQuestion[];
  errors: string[];
} {
  const questions: ImportedQuizQuestion[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const line = index + 2; // assume header is row 1
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeHeader(key)] = cell(value);
    }

    const question =
      normalized.question ||
      normalized.ques ||
      normalized.q ||
      normalized.prompt ||
      "";

    if (!question) {
      const hasAny = Object.values(normalized).some(Boolean);
      if (hasAny) errors.push(`Row ${line}: missing question`);
      return;
    }

    let options: string[] = [];
    if (normalized.options) {
      options = normalized.options
        .split(/[|;]/)
        .map((o) => o.trim())
        .filter(Boolean);
    } else {
      const optionKeys = [
        "option1",
        "option2",
        "option3",
        "option4",
        "option5",
        "option6",
        "optiona",
        "optionb",
        "optionc",
        "optiond",
        "optione",
        "optionf",
        "opt1",
        "opt2",
        "opt3",
        "opt4",
        "opt5",
        "opt6",
        "a",
        "b",
        "c",
        "d",
      ];
      for (const key of optionKeys) {
        if (normalized[key]) options.push(normalized[key]);
      }
    }

    options = [...new Set(options)];

    const correct =
      normalized.correct ||
      normalized.answer ||
      normalized.correctanswer ||
      normalized.correctoption ||
      "";

    if (options.length < 2) {
      errors.push(`Row ${line}: need at least 2 options`);
      return;
    }
    if (!correct) {
      errors.push(`Row ${line}: missing correct answer`);
      return;
    }
    if (!options.includes(correct)) {
      errors.push(
        `Row ${line}: correct answer "${correct}" must match one option exactly`
      );
      return;
    }

    questions.push({ question, options, correct });
  });

  return { questions, errors };
}

/** Columns authors must use (exact header names). */
export const QUIZ_CSV_COLUMNS = [
  "question",
  "option1",
  "option2",
  "option3",
  "option4",
  "correct",
] as const;

export const QUIZ_IMPORT_FORMAT_GUIDE = {
  title: "Quiz CSV / Excel format",
  requiredColumns: [...QUIZ_CSV_COLUMNS] as string[],
  rules: [
    "Row 1 must be the header row with these exact column names.",
    "Each following row is one quiz question.",
    "option1–option4 are the answer choices (at least option1 and option2 required).",
    "correct must match one option text exactly (same spelling and spacing).",
    "Do not merge cells. Keep one question per row.",
    "Save as .csv or .xlsx before uploading.",
  ],
  exampleRows: [
    {
      question: "What should you do before starting a live task?",
      option1: "Skip the SOP",
      option2: "Read the project SOP carefully",
      option3: "Ask after submitting",
      option4: "Ignore quality checks",
      correct: "Read the project SOP carefully",
    },
    {
      question: "What is the minimum certification pass score?",
      option1: "50%",
      option2: "60%",
      option3: "70%",
      option4: "80%",
      correct: "80%",
    },
  ] as Array<Record<(typeof QUIZ_CSV_COLUMNS)[number], string>>,
};

function escapeCsv(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Downloadable sample file content for authors. */
export function buildQuizImportTemplateCsv() {
  const header = QUIZ_CSV_COLUMNS.join(",");
  const rows = QUIZ_IMPORT_FORMAT_GUIDE.exampleRows.map((row) =>
    QUIZ_CSV_COLUMNS.map((col) => escapeCsv(row[col])).join(",")
  );
  return `${header}\n${rows.join("\n")}\n`;
}

/** @deprecated use buildQuizImportTemplateCsv() */
export const QUIZ_IMPORT_TEMPLATE_CSV = buildQuizImportTemplateCsv();
