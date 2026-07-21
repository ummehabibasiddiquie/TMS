import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await requireSession(["TRAINEE", "ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, score, passed, totalQuestions } = await req.json();

  if (!projectId || totalQuestions == null || score == null) {
    return NextResponse.json({ error: "Missing quiz result fields" }, { status: 400 });
  }

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

  const scorePercent = (Number(score) / Number(totalQuestions)) * 100;
  const quizPassed = Boolean(passed) || scorePercent >= 80;
  const status = quizPassed ? "PENDING_REVIEW" : "FAILED";

  const certification = await prisma.projectCertification.upsert({
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
      passed: quizPassed,
      status,
      certifiedAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
      reviewNote: null,
    },
    update: {
      score: scorePercent,
      passed: quizPassed,
      status,
      certifiedAt: new Date(),
      // New attempt resets approval
      reviewedAt: null,
      reviewedById: null,
      reviewNote: null,
    },
  });

  return NextResponse.json({
    success: true,
    score: scorePercent,
    scorePercent: Math.round(scorePercent),
    passed: quizPassed,
    status: certification.status,
    totalQuestions,
  });
}
