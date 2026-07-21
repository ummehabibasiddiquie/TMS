import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertCanManageTrainee, getDayWisePlan } from "@/lib/day-wise-training";

/** List team members with day plan summaries + optional reviews */
export async function GET() {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where =
    user.role === "TRAINER"
      ? {
          role: "TRAINEE" as const,
          active: true,
          traineeProfile: { trainerId: user.id },
        }
      : { role: "TRAINEE" as const, active: true };

  const trainees = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 100,
  });

  const rows = await Promise.all(
    trainees.map(async (t) => {
      const [plan, reviews] = await Promise.all([
        getDayWisePlan(t.id),
        prisma.dayWorkReview.findMany({
          where: { traineeId: t.id },
          orderBy: { dayNumber: "desc" },
          take: 20,
        }),
      ]);

      const completedDays = (plan.pastDays || []).filter((d) => d.done);
      if (plan.today?.done) completedDays.unshift(plan.today);

      return {
        trainee: t,
        currentDay: plan.currentDay,
        overallPercent: plan.overallPercent,
        todayTitle: plan.today?.title ?? null,
        todayDone: plan.today?.done ?? false,
        todayPercent: plan.today?.percent ?? 0,
        completedDays: completedDays.map((d) => ({
          dayNumber: d.dayNumber,
          title: d.title,
          projectName: d.projectName,
          dayType: d.dayType,
          percent: d.percent,
          checklist: d.checklist.map((c) => ({
            title: c.title,
            completed: c.completed,
          })),
          workItems: (d.workItems || []).map((c) => ({
            title: c.title,
            completed: c.completed,
          })),
          lessons: d.lessons.map((l) => ({
            title: l.label || l.title,
            completed: l.completed,
            courseTitle: l.courseTitle,
          })),
          review: reviews.find((r) => r.dayNumber === d.dayNumber) || null,
        })),
      };
    })
  );

  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const traineeId = String(body.traineeId || "");
  const dayNumber = Number(body.dayNumber);
  const notes = body.notes?.trim() || null;
  const rating =
    body.rating == null || body.rating === ""
      ? null
      : Math.min(5, Math.max(1, Number(body.rating)));

  if (!traineeId || !Number.isFinite(dayNumber) || dayNumber < 1) {
    return NextResponse.json({ error: "traineeId and dayNumber required" }, { status: 400 });
  }

  const gate = await assertCanManageTrainee(user, traineeId);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const review = await prisma.dayWorkReview.upsert({
    where: {
      traineeId_dayNumber: { traineeId, dayNumber },
    },
    create: {
      traineeId,
      dayNumber,
      reviewerId: user.id,
      notes,
      rating,
    },
    update: {
      notes,
      rating,
      reviewerId: user.id,
    },
  });

  return NextResponse.json({ review });
}
