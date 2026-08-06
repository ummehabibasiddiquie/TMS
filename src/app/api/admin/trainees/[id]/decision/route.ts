import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extendTraineeCurriculumByWeek } from "@/lib/day-wise-training";
import {
  approveFinalQuizCertificateForTrainee,
  getTraineeEvaluationScore,
  rejectFinalQuizCertificateForTrainee,
} from "@/lib/final-evaluation";

/**
 * Admin: reject, approve into org, add extra days, approve certificate.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const traineeId = params.id;
  if (!traineeId) {
    return NextResponse.json({ error: "Trainee id required" }, { status: 400 });
  }

  let body: { action?: string; days?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const action = body.action;
  if (
    !action ||
    !["reject", "approve", "extendWeek", "approveCertificate"].includes(
      action
    )
  ) {
    return NextResponse.json(
      {
        error:
          "action must be reject | approve | extendWeek | approveCertificate",
      },
      { status: 400 }
    );
  }

  const actor = await requireSession(["ADMIN"]);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trainee = await prisma.user.findUnique({
    where: { id: traineeId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      traineeProfile: { select: { trainerId: true } },
    },
  });

  if (!trainee || trainee.role !== "TRAINEE") {
    return NextResponse.json({ error: "Trainee not found" }, { status: 404 });
  }

  const evaluation = await getTraineeEvaluationScore(traineeId);

  if (action === "reject") {
    await rejectFinalQuizCertificateForTrainee(traineeId, actor.id).catch(() => null);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: traineeId },
        data: { active: false },
      }),
      prisma.traineeProfile.upsert({
        where: { userId: traineeId },
        create: {
          userId: traineeId,
          trainingStatus: "REJECTED",
          readyForProduction: false,
        },
        update: {
          trainingStatus: "REJECTED",
          readyForProduction: false,
        },
      }),
    ]);
    return NextResponse.json({
      ok: true,
      action: "reject",
      traineeId,
      trainingStatus: "REJECTED",
      active: false,
    });
  }

  if (action === "approve") {
    if (evaluation.score == null) {
      return NextResponse.json(
        { error: "Trainee must complete the final quiz before approval." },
        { status: 400 }
      );
    }
    if (evaluation.score < 90) {
      return NextResponse.json(
        {
          error: `Approval requires ≥90% on the final quiz (current: ${evaluation.score}%). Add extra days or reject for lower scores.`,
        },
        { status: 400 }
      );
    }

    await approveFinalQuizCertificateForTrainee(traineeId, actor.id);

    await prisma.traineeProfile.upsert({
      where: { userId: traineeId },
      create: {
        userId: traineeId,
        trainingStatus: "APPROVED_IN_ORG",
        readyForProduction: true,
        trainingStarted: true,
      },
      update: {
        trainingStatus: "APPROVED_IN_ORG",
        readyForProduction: true,
      },
    });

    if (!trainee.active) {
      await prisma.user.update({
        where: { id: traineeId },
        data: { active: true },
      });
    }

    return NextResponse.json({
      ok: true,
      action: "approve",
      traineeId,
      trainingStatus: "APPROVED_IN_ORG",
      readyForProduction: true,
      finalQuizScore: evaluation.score,
    });
  }

  if (action === "approveCertificate") {
    try {
      const cert = await approveFinalQuizCertificateForTrainee(traineeId, actor.id);
      return NextResponse.json({
        ok: true,
        action: "approveCertificate",
        traineeId,
        certificateId: cert.id,
        status: cert.status,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not approve certificate";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  try {
    const rawDays = Number(body.days);
    const extraDays = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 7;
    const result = await extendTraineeCurriculumByWeek(traineeId, extraDays);
    return NextResponse.json({
      ok: true,
      action: "extendWeek",
      traineeId,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not add extra days";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
