import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { approveQuizAttempt } from "@/lib/dynamic-onboarding";

// POST approve quiz attempt
export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attemptId, approvalNotes } = await req.json();
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }

  try {
    const result = await approveQuizAttempt(user.id, attemptId, approvalNotes);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Approval failed" }, { status: 400 });
  }
}