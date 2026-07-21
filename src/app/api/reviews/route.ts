import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await requireSession(["TRAINER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId, status, remarks, qualityScore } = await req.json();

  if (!submissionId) {
    return NextResponse.json({ error: "Missing submission" }, { status: 400 });
  }

  const submission = await prisma.dailySubmission.findUnique({
    where: { id: submissionId },
    include: {
      user: {
        select: {
          traineeProfile: { select: { trainerId: true } },
        },
      },
    },
  });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (
    user.role === "TRAINER" &&
    submission.user.traineeProfile?.trainerId !== user.id
  ) {
    return NextResponse.json({ error: "Not your team member" }, { status: 403 });
  }

  let score: number | null = null;
  if (qualityScore !== null && qualityScore !== undefined && qualityScore !== "") {
    score = parseFloat(String(qualityScore));
    if (Number.isNaN(score) || score < 0 || score > 100) {
      return NextResponse.json(
        { error: "Quality score must be between 0 and 100" },
        { status: 400 }
      );
    }
  }

  await prisma.trainerReview.upsert({
    where: { submissionId },
    create: {
      submissionId,
      reviewerId: user.id,
      remarks,
      status,
      qualityScore: score,
      reviewedAt: new Date(),
    },
    update: {
      remarks,
      status,
      qualityScore: score,
      reviewedAt: new Date(),
    },
  });

  // Mirror TL quality onto the submission so older views still see a score
  if (score != null) {
    await prisma.dailySubmission.update({
      where: { id: submissionId },
      data: { qualityPct: score },
    });
  }

  return NextResponse.json({ ok: true });
}
