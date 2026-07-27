import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  isSharedCurriculumScope,
  assertCanManageTrainee,
} from "@/lib/day-wise-training";

type Ctx = { params: Promise<{ id: string }> };

async function gateDayEdit(
  actor: { id: string; role: string },
  dayId: string
) {
  const day = await prisma.curriculumDay.findUnique({ where: { id: dayId } });
  if (!day) return { ok: false as const, status: 404, error: "Day not found" };

  if (isSharedCurriculumScope(day.scopeKey)) {
    if (actor.role !== "ADMIN" && actor.role !== "TRAINER") {
      return { ok: false as const, status: 403, error: "Forbidden" };
    }
    return { ok: true as const, day };
  }

  const gate = await assertCanManageTrainee(actor, day.scopeKey);
  if (!gate.ok) {
    return { ok: false as const, status: 403, error: gate.error };
  }
  return { ok: true as const, day };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const allowed = await gateDayEdit(user, id);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  }

  const body = await req.json();

  const data: {
    dayNumber?: number;
    title?: string;
    dayType?: string;
    projectName?: string | null;
    hrmsProjectId?: string | null;
    description?: string | null;
  } = {};

  if (body.dayNumber != null) {
    const n = Number(body.dayNumber);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: "Invalid dayNumber" }, { status: 400 });
    }
    data.dayNumber = n;
  }
  if (body.title != null) {
    const t = String(body.title).trim();
    if (!t) return NextResponse.json({ error: "Title required" }, { status: 400 });
    data.title = t;
  }
  if (body.dayType != null) {
    data.dayType =
      body.dayType === "CHECKLIST" || body.dayType === "TRAINING" || body.dayType === "MIXED"
        ? body.dayType
        : "MIXED";
  }
  if (body.projectName !== undefined) {
    data.projectName = body.projectName?.trim() || null;
  }
  if (body.hrmsProjectId !== undefined) {
    data.hrmsProjectId = body.hrmsProjectId ? String(body.hrmsProjectId).trim() || null : null;
  }
  if (data.projectName === null) {
    data.hrmsProjectId = null;
  }
  if (body.description !== undefined) {
    data.description = body.description?.trim() || null;
  }

  try {
    const day = await prisma.curriculumDay.update({ where: { id }, data });
    return NextResponse.json({ day });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    if (msg.includes("Unique") || msg.includes("dayNumber")) {
      return NextResponse.json({ error: "That day number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const allowed = await gateDayEdit(user, id);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  }

  await prisma.curriculumDay.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
