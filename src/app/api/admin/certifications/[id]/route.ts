import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Approve or reject a project certification */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = String(body.action || "").toUpperCase();
  const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : null;

  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ error: "action must be APPROVE or REJECT" }, { status: 400 });
  }

  const existing = await prisma.projectCertification.findUnique({
    where: { id: params.id },
    include: {
      user: { include: { traineeProfile: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Certification not found" }, { status: 404 });
  }

  if (user.role === "TRAINER") {
    const trainerId = existing.user.traineeProfile?.trainerId;
    // Team leads can review their team; if no trainer is assigned, allow review
    if (trainerId && trainerId !== user.id) {
      return NextResponse.json({ error: "Not on your team" }, { status: 403 });
    }
  }

  if (!existing.passed || existing.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: "Only pending passed quizzes can be reviewed" },
      { status: 400 }
    );
  }

  const status = action === "APPROVE" ? "APPROVED" : "REJECTED";

  const updated = await prisma.projectCertification.update({
    where: { id: params.id },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedById: user.id,
      reviewNote,
      // Stamp certified date when approved
      ...(action === "APPROVE" ? { certifiedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({
    success: true,
    certification: {
      id: updated.id,
      status: updated.status,
      score: updated.score,
      reviewedAt: updated.reviewedAt,
    },
  });
}
