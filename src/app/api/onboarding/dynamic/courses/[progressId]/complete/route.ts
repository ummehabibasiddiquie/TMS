import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { completeCourse } from "@/lib/dynamic-onboarding";

// POST mark course as complete
export async function POST(req: Request, { params }: { params: { progressId: string } }) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { progressId } = params;

  try {
    const result = await completeCourse(user.id, progressId);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to complete course" }, { status: 400 });
  }
}