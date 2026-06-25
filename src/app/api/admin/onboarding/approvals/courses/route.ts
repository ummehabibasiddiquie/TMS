import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { approveCourseCompletion } from "@/lib/dynamic-onboarding";

// POST approve course completion
export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { progressId, approvalNotes } = await req.json();
  if (!progressId) {
    return NextResponse.json({ error: "progressId is required" }, { status: 400 });
  }

  try {
    const result = await approveCourseCompletion(user.id, progressId, approvalNotes);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Approval failed" }, { status: 400 });
  }
}