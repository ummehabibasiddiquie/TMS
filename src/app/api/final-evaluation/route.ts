import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  ensureDefaultFinalEvaluationQuiz,
  getFinalQuizState,
  submitFinalEvaluationQuiz,
} from "@/lib/final-evaluation";

/** Trainee: get final evaluation quiz state (questions only when unlocked and not yet attempted). */
export async function GET() {
  const user = await requireSession(["TRAINEE"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureDefaultFinalEvaluationQuiz();
    const state = await getFinalQuizState(user.id, { includeQuestions: true });
    return NextResponse.json(state);
  } catch (err) {
    console.error("GET /api/final-evaluation", err);
    const message = err instanceof Error ? err.message : "Failed to load final quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Trainee: submit final evaluation (one attempt per cycle). */
export async function POST(req: Request) {
  const user = await requireSession(["TRAINEE"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { answers?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const answers = body.answers;
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "answers are required" }, { status: 400 });
  }

  try {
    await ensureDefaultFinalEvaluationQuiz();
    const result = await submitFinalEvaluationQuiz(user.id, answers);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submit failed";
    const status = /already submitted|Complete all|not available/i.test(message)
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
