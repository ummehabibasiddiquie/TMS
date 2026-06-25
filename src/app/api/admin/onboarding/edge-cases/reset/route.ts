import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { OnboardingEdgeCaseHandler } from "@/lib/onboarding-edge-cases";

// POST reset user onboarding progress
export async function POST(req: Request) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const result = await OnboardingEdgeCaseHandler.resetUserProgress(userId);

  return NextResponse.json({ result });
}