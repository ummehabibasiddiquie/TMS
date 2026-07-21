import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchTrackerSummary } from "@/lib/tracker";

/**
 * GET tracker production summary for a trainee (self, or Admin/TL for their team).
 * Query: ?userId= optional for Admin/TL
 */
export async function GET(req: Request) {
  const actor = await requireSession(["ADMIN", "TRAINER", "TRAINEE"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let targetId = searchParams.get("userId") || actor.id;

  if (actor.role === "TRAINEE") {
    targetId = actor.id;
  } else if (targetId !== actor.id && actor.role === "TRAINER") {
    const assigned = await prisma.traineeProfile.findFirst({
      where: { userId: targetId, trainerId: actor.id },
    });
    if (!assigned) {
      return NextResponse.json({ error: "Not your trainee" }, { status: 403 });
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      role: true,
      traineeProfile: {
        select: { readyForProduction: true, trainingStatus: true },
      },
    },
  });

  if (!user || user.role !== "TRAINEE") {
    return NextResponse.json({ error: "Trainee not found" }, { status: 404 });
  }

  const summary = await fetchTrackerSummary({
    id: user.id,
    name: user.name,
    email: user.email,
    employeeId: user.employeeId,
  });

  return NextResponse.json({
    trainee: {
      id: user.id,
      name: user.name,
      email: user.email,
      readyForProduction: user.traineeProfile?.readyForProduction ?? false,
      trainingStatus: user.traineeProfile?.trainingStatus ?? null,
    },
    tracker: summary,
  });
}
