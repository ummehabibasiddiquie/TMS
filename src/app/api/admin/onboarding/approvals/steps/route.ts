import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { approveOnboardingStep } from "@/lib/dynamic-onboarding";

// POST approve onboarding step completion
export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, stepId, approvalNotes } = await req.json();
  if (!userId || !stepId) {
    return NextResponse.json({ error: "userId and stepId are required" }, { status: 400 });
  }

  try {
    const result = await approveOnboardingStep(user.id, userId, stepId, approvalNotes);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Approval failed" }, { status: 400 });
  }
}