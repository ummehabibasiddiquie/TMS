import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertCanManageTrainee } from "@/lib/day-wise-training";
import {
  listTraineeWorkMetrics,
  upsertTraineeWorkMetric,
} from "@/lib/trainee-work";

/**
 * GET — trainee sees own metrics; Admin/TL can pass ?userId=
 */
export async function GET(req: Request) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("userId");
  const throughRaw = searchParams.get("throughDay");
  const throughDay =
    throughRaw != null && Number.isFinite(Number(throughRaw))
      ? Number(throughRaw)
      : undefined;

  let traineeId = user.id;
  if (userIdParam) {
    if (user.role !== "ADMIN" && user.role !== "TRAINER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const access = await assertCanManageTrainee(
      { id: user.id, role: user.role },
      userIdParam
    );
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }
    traineeId = userIdParam;
  } else if (user.role !== "TRAINEE") {
    return NextResponse.json(
      { error: "userId is required for Admin/Lead" },
      { status: 400 }
    );
  }

  const work = await listTraineeWorkMetrics(traineeId, {
    throughDayNumber: throughDay,
  });
  return NextResponse.json(work);
}

/**
 * PUT — Admin / Team Lead record hours, production, quality for a trainee day.
 */
export async function PUT(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const traineeId = String(body.traineeId || "").trim();
  const dayNumber = Number(body.dayNumber);
  if (!traineeId || !Number.isFinite(dayNumber)) {
    return NextResponse.json(
      { error: "traineeId and dayNumber are required" },
      { status: 400 }
    );
  }

  const trainee = await prisma.user.findUnique({
    where: { id: traineeId },
    select: { id: true, role: true },
  });
  if (!trainee || trainee.role !== "TRAINEE") {
    return NextResponse.json({ error: "Trainee not found" }, { status: 404 });
  }

  const access = await assertCanManageTrainee(
    { id: user.id, role: user.role },
    traineeId
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  try {
    const row = await upsertTraineeWorkMetric({
      traineeId,
      dayNumber,
      recordedById: user.id,
      projectName: body.projectName,
      hoursLogged: body.hoursLogged,
      productionUnits: body.productionUnits,
      qualityScore: body.qualityScore,
      notes: body.notes,
    });

    const work = await listTraineeWorkMetrics(traineeId);
    return NextResponse.json({ ok: true, entry: row, work });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
