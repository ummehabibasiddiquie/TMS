import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDayLearningComplete } from "@/lib/progress";

export async function POST(req: Request) {
  const user = await requireSession(["TRAINEE"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { dayNumber, phase, sopRead, tasksCompleted, productivityPct, qualityPct, issues } = body;

  const learningComplete = await isDayLearningComplete(user.id, dayNumber);
  if (!learningComplete) {
    return NextResponse.json(
      {
        error: "Complete all required learning before daily submission",
        learningComplete: false,
      },
      { status: 403 }
    );
  }

  const submission = await prisma.dailySubmission.upsert({
    where: {
      userId_dayNumber_phase: {
        userId: user.id,
        dayNumber,
        phase,
      },
    },
    create: {
      userId: user.id,
      dayNumber,
      phase,
      sopRead: sopRead ?? false,
      tasksCompleted: tasksCompleted ?? 0,
      productivityPct,
      qualityPct,
      issues,
      learningComplete: true,
    },
    update: {
      sopRead,
      tasksCompleted,
      productivityPct,
      qualityPct,
      issues,
      learningComplete: true,
      submittedAt: new Date(),
    },
  });

  return NextResponse.json({ submission, learningComplete: true });
}
