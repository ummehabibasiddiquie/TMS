import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await requireSession(["TRAINEE", "ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, score, passed, answers, totalQuestions } = await req.json();

  // Verify user has access to this project
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { assignments: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const isAssigned = project.assignments.some((a) => a.userId === user.id);
  const isAdmin = user.role === "ADMIN";
  const isTeamLead = user.role === "TRAINER";

  if (!isAdmin && !isTeamLead && !isAssigned) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Calculate final score as percentage
  const scorePercent = (score / totalQuestions) * 100;

  // Create or update project certification
  await prisma.projectCertification.upsert({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId,
      },
    },
    create: {
      userId: user.id,
      projectId,
      score: scorePercent,
      passed,
      certifiedAt: new Date(),
    },
    update: {
      score: scorePercent,
      passed,
      certifiedAt: new Date(),
    },
  });

  return NextResponse.json({ 
    success: true, 
    score: scorePercent, 
    passed, 
    totalQuestions 
  });
}
