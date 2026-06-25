import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST assign course to employees
export async function POST(req: Request, { params }: { params: { assignmentId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = params;
  const { userIds } = await req.json();
  if (!userIds || !Array.isArray(userIds)) {
    return NextResponse.json({ error: "userIds array is required" }, { status: 400 });
  }

  // Create progress records for each user
  const progressRecords = await (prisma as any).courseEmployeeProgress.createMany({
    data: userIds.map((userId: string) => ({
      assignmentId,
      userId,
      status: "NOT_STARTED"
    })),
    skipDuplicates: true
  });

  return NextResponse.json({ 
    success: true, 
    assigned: progressRecords.count 
  });
}