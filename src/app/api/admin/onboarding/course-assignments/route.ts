import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST create course assignment
export async function POST(req: Request) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId, courseId, title, description, order, passingScore } = await req.json();
  if (!templateId || !courseId || !title) {
    return NextResponse.json({ error: "templateId, courseId, and title are required" }, { status: 400 });
  }

  const assignment = await (prisma as any).onboardingCourseAssignment.create({
    data: {
      templateId,
      courseId,
      title,
      description,
      order: order || 0,
      passingScore: passingScore || 80
    },
    include: {
      course: true
    }
  });

  return NextResponse.json({ assignment }, { status: 201 });
}