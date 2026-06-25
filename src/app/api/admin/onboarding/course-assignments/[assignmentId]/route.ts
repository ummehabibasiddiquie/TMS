import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH update course assignment
export async function PATCH(req: Request, { params }: { params: { assignmentId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = params;
  const { title, description, order, passingScore } = await req.json();

  const assignment = await (prisma as any).onboardingCourseAssignment.update({
    where: { id: assignmentId },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(order !== undefined && { order }),
      ...(passingScore !== undefined && { passingScore })
    },
    include: {
      course: true
    }
  });

  return NextResponse.json({ assignment });
}

// DELETE course assignment
export async function DELETE(req: Request, { params }: { params: { assignmentId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = params;

  await (prisma as any).onboardingCourseAssignment.delete({
    where: { id: assignmentId }
  });

  return NextResponse.json({ success: true });
}