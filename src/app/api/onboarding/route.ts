import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  getUserOnboardingSteps,
  markStepDone,
  onboardingProgressFromSteps,
} from "@/lib/onboarding";

export async function GET() {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const steps = await getUserOnboardingSteps(user.id);
  return NextResponse.json({
    steps,
    progress: onboardingProgressFromSteps(steps),
  });
}

export async function PATCH(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, stepId } = await req.json();
  if (!userId || !stepId) {
    return NextResponse.json({ error: "userId and stepId are required" }, { status: 400 });
  }

  const steps = await markStepDone(userId, stepId);
  if (!steps) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  return NextResponse.json({
    steps,
    progress: onboardingProgressFromSteps(steps),
  });
}
