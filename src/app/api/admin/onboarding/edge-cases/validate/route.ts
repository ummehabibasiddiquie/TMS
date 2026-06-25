import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { OnboardingEdgeCaseHandler } from "@/lib/onboarding-edge-cases";

// POST validate state consistency
export async function POST(req: Request) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, templateId } = await req.json();

  const results = {
    missingApprovals: userId ? await OnboardingEdgeCaseHandler.handleMissingApprovalStates(userId) : null,
    partialAssignments: templateId ? await OnboardingEdgeCaseHandler.handlePartialAssignments(templateId) : null,
    emptyConfig: await OnboardingEdgeCaseHandler.handleEmptyConfiguration()
  };

  return NextResponse.json({ results });
}