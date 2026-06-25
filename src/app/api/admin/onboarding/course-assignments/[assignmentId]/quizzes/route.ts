import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST create quiz for course assignment
export async function POST(req: Request, { params }: { params: { assignmentId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = params;
  const { title, description, passingScore, maxAttempts } = await req.json();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const quiz = await (prisma as any).courseQuiz.create({
    data: {
      assignmentId,
      title,
      description,
      passingScore: passingScore || 80,
      maxAttempts: maxAttempts || 3,
      isActive: true
    }
  });

  return NextResponse.json({ quiz }, { status: 201 });
}