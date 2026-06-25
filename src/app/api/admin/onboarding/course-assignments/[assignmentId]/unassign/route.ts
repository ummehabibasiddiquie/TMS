import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST unassign course from employees
export async function POST(req: Request, { params }: { params: { assignmentId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = params;
  const { userIds } = await req.json();
  if (!userIds || !Array.isArray(userIds)) {
    return NextResponse.json({ error: "userIds array is required" }, { status: 400 });
  }

  // Delete progress records for each user
  const result = await (prisma as any).courseEmployeeProgress.deleteMany({
    where: {
      assignmentId,
      userId: { in: userIds }
    }
  });

  return NextResponse.json({ 
    success: true, 
    unassigned: result.count 
  });
}
