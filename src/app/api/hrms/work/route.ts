import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listHrmsWorkForTraineeProjects } from "@/lib/hrms-work";
import { assertCanManageTrainee } from "@/lib/day-wise-training";

/**
 * HRMS work metrics for practice projects.
 * - Admin/TL: pass userId
 * - Trainee: own metrics (userId optional / ignored if not self)
 */
export async function GET(req: Request) {
  const actor = await requireSession(["ADMIN", "TRAINER", "TRAINEE"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let userId = searchParams.get("userId");

  if (actor.role === "TRAINEE") {
    userId = actor.id;
  } else if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (actor.role !== "TRAINEE") {
    const gate = await assertCanManageTrainee(actor, userId!);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 });
    }
  }

  const trainee = await prisma.user.findUnique({
    where: { id: userId! },
    select: { id: true, email: true, employeeId: true, name: true, role: true },
  });
  if (!trainee || trainee.role !== "TRAINEE") {
    return NextResponse.json({ error: "Trainee not found" }, { status: 404 });
  }

  let projects: { id: string; name: string }[] = [];
  const rawIds = searchParams.get("projectIds");
  if (rawIds?.trim()) {
    const ids = rawIds.split(",").map((s) => s.trim()).filter(Boolean);
    const named = await prisma.curriculumDay.findMany({
      where: { hrmsProjectId: { in: ids } },
      select: { hrmsProjectId: true, projectName: true },
    });
    const nameById = new Map(
      named
        .filter((d) => d.hrmsProjectId)
        .map((d) => [d.hrmsProjectId!, d.projectName || `Project ${d.hrmsProjectId}`])
    );
    projects = ids.map((id) => ({ id, name: nameById.get(id) || `Project ${id}` }));
  } else {
    const { resolveCurriculumScope, listCurriculumDays, getDayWisePlan } = await import(
      "@/lib/day-wise-training"
    );
    const { collectPracticeProjectsFromDays } = await import("@/lib/hrms-work");
    const [{ scopeKey }, plan] = await Promise.all([
      resolveCurriculumScope(userId!),
      getDayWisePlan(userId!),
    ]);
    const days = await listCurriculumDays(scopeKey);
    projects = collectPracticeProjectsFromDays(days, {
      throughDayNumber: plan.currentDay,
    });
  }

  const work = await listHrmsWorkForTraineeProjects(
    { email: trainee.email, employeeId: trainee.employeeId, name: trainee.name },
    projects
  );

  return NextResponse.json({ trainee: { id: trainee.id, name: trainee.name }, ...work });
}
