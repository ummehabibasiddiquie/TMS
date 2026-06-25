import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { initializeUserOnboarding } from "@/lib/dynamic-onboarding";

// POST initialize onboarding for a user
export async function POST(
  req: Request,
  { params }: { params: { templateId: string } }
) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId } = params;
  const { userIds } = await req.json();
  if (!userIds || !Array.isArray(userIds)) {
    return NextResponse.json({ error: "userIds array is required" }, { status: 400 });
  }

  const results = [];
  for (const userId of userIds) {
    try {
      const result = await initializeUserOnboarding(userId, templateId);
      results.push({ userId, success: !!result, template: result });
    } catch (error) {
      results.push({ userId, success: false, error: error instanceof Error ? error.message : "Failed to initialize" });
    }
  }

  return NextResponse.json({ results });
}
