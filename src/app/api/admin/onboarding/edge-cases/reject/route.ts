import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { OnboardingEdgeCaseHandler } from "@/lib/onboarding-edge-cases";

// POST handle approval rejection
export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, itemId, rejectionReason } = await req.json();
  if (!type || !itemId || !rejectionReason) {
    return NextResponse.json({ error: "type, itemId, and rejectionReason are required" }, { status: 400 });
  }

  try {
    const result = await OnboardingEdgeCaseHandler.handleApprovalRejection(
      type,
      itemId,
      rejectionReason,
      user.id
    );

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: "Invalid rejection request" }, { status: 400 });
  }
}