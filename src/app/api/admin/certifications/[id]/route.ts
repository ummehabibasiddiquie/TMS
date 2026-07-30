import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  approveFinalQuizCertificateById,
  rejectFinalQuizCertificateById,
} from "@/lib/final-evaluation";

function assertTrainerCanReviewTrainee(
  role: string,
  reviewerId: string,
  traineeTrainerId: string | null | undefined
) {
  if (role !== "TRAINER") return;
  if (traineeTrainerId && traineeTrainerId !== reviewerId) {
    throw new Error("Not on your team");
  }
}

/** Approve or reject a project or final quiz certification */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = String(body.action || "").toUpperCase();
  const kind = body.kind === "final_quiz" ? "final_quiz" : "project";
  const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : null;

  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ error: "action must be APPROVE or REJECT" }, { status: 400 });
  }

  if (action === "REJECT" && (!reviewNote || reviewNote.length < 3)) {
    return NextResponse.json(
      { error: "A rejection reason is required (at least 3 characters)." },
      { status: 400 }
    );
  }

  if (kind === "final_quiz") {
    const existing = await prisma.finalQuizCertificate.findUnique({
      where: { id: params.id },
      include: {
        user: { include: { traineeProfile: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }

    try {
      assertTrainerCanReviewTrainee(
        user.role,
        user.id,
        existing.user.traineeProfile?.trainerId
      );
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Forbidden" },
        { status: 403 }
      );
    }

    if (existing.status !== "PENDING_REVIEW" && existing.status !== "APPROVED" && existing.status !== "REJECTED") {
      return NextResponse.json(
        { error: "This certificate cannot be reviewed" },
        { status: 400 }
      );
    }

    const currentCycle = existing.user.traineeProfile?.evaluationCycle ?? 1;
    if (existing.cycle < currentCycle) {
      return NextResponse.json(
        { error: "Only the current cycle certificate can be changed" },
        { status: 400 }
      );
    }

    if (action === "APPROVE" && existing.status === "APPROVED" && existing.reviewedById) {
      return NextResponse.json({
        success: true,
        certification: {
          id: existing.id,
          kind: "final_quiz",
          status: existing.status,
          score: existing.score,
          reviewedAt: existing.reviewedAt,
          reviewNote: existing.reviewNote,
        },
      });
    }

    if (action === "REJECT" && existing.status === "REJECTED") {
      return NextResponse.json({
        success: true,
        certification: {
          id: existing.id,
          kind: "final_quiz",
          status: existing.status,
          score: existing.score,
          reviewedAt: existing.reviewedAt,
          reviewNote: existing.reviewNote,
        },
      });
    }

    try {
      const updated =
        action === "APPROVE"
          ? await approveFinalQuizCertificateById(params.id, user.id)
          : await rejectFinalQuizCertificateById(params.id, user.id, reviewNote!);

      return NextResponse.json({
        success: true,
        certification: {
          id: updated?.id ?? params.id,
          kind: "final_quiz",
          status: updated?.status ?? (action === "APPROVE" ? "APPROVED" : "REJECTED"),
          score: existing.score,
          reviewedAt: updated?.reviewedAt ?? new Date(),
          reviewNote,
        },
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Action failed" },
        { status: 400 }
      );
    }
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

  try {
    assertTrainerCanReviewTrainee(
      user.role,
      user.id,
      existing.user.traineeProfile?.trainerId
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Forbidden" },
      { status: 403 }
    );
  }

  if (!existing.passed) {
    return NextResponse.json(
      { error: "Only passed project quizzes can be reviewed" },
      { status: 400 }
    );
  }

  if (
    existing.status !== "PENDING_REVIEW" &&
    existing.status !== "APPROVED" &&
    existing.status !== "REJECTED"
  ) {
    return NextResponse.json(
      { error: "This certificate cannot be reviewed" },
      { status: 400 }
    );
  }

  if (action === "APPROVE" && existing.status === "APPROVED") {
    return NextResponse.json({
      success: true,
      certification: {
        id: existing.id,
        kind: "project",
        status: existing.status,
        score: existing.score,
        reviewedAt: existing.reviewedAt,
        reviewNote: existing.reviewNote,
      },
    });
  }

  if (action === "REJECT" && existing.status === "REJECTED") {
    return NextResponse.json({
      success: true,
      certification: {
        id: existing.id,
        kind: "project",
        status: existing.status,
        score: existing.score,
        reviewedAt: existing.reviewedAt,
        reviewNote: existing.reviewNote,
      },
    });
  }

  const status = action === "APPROVE" ? "APPROVED" : "REJECTED";

  const updated = await prisma.projectCertification.update({
    where: { id: params.id },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedById: user.id,
      reviewNote: action === "APPROVE" ? null : reviewNote,
      ...(action === "APPROVE" ? { certifiedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({
    success: true,
      certification: {
        id: updated.id,
        kind: "project",
        status: updated.status,
        score: updated.score,
        reviewedAt: updated.reviewedAt,
        reviewNote: updated.reviewNote,
      },
  });
}
