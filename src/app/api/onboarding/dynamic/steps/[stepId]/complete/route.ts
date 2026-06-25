import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { completeOnboardingStep } from "@/lib/dynamic-onboarding";

// POST mark onboarding step as complete
export async function POST(req: Request, { params }: { params: { stepId: string } }) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stepId } = params;

  try {
    const result = await completeOnboardingStep(user.id, stepId);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to complete step" }, { status: 400 });
  }
}