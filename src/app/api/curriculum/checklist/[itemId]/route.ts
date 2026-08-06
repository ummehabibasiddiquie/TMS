import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  GLOBAL_CURRICULUM_SCOPE,
  syncGlobalDayWorkToTraineeCopies,
} from "@/lib/day-wise-training";

type Ctx = { params: Promise<{ itemId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await ctx.params;
  const body = await req.json();
  const existing = await prisma.curriculumChecklistItem.findUnique({
    where: { id: itemId },
    include: { day: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const data: {
    title?: string;
    description?: string | null;
    sortOrder?: number;
    assignedHours?: number | null;
    productionTarget?: number | null;
  } = {};

  if (body.title != null) {
    const t = String(body.title).trim();
    if (!t) return NextResponse.json({ error: "Title required" }, { status: 400 });
    data.title = t;
  }
  if (body.description !== undefined) {
    data.description = body.description?.trim() || null;
  }
  if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder);

  if (existing.kind === "WORK") {
    if (body.assignedHours !== undefined) {
      if (body.assignedHours == null || body.assignedHours === "") {
        return NextResponse.json(
          { error: "Assigned hours are required for training work." },
          { status: 400 }
        );
      }
      const n = Number(body.assignedHours);
      if (!Number.isFinite(n) || n <= 0) {
        return NextResponse.json(
          { error: "Assigned hours must be a positive number." },
          { status: 400 }
        );
      }
      data.assignedHours = n;
    }
    if (body.productionTarget !== undefined) {
      if (body.productionTarget == null || body.productionTarget === "") {
        return NextResponse.json(
          { error: "Unit goal is required for training work." },
          { status: 400 }
        );
      }
      const t = Number(body.productionTarget);
      if (!Number.isFinite(t) || t <= 0) {
        return NextResponse.json(
          { error: "Production target must be a positive number." },
          { status: 400 }
        );
      }
      data.productionTarget = t;
    }
  }

  const item = await prisma.curriculumChecklistItem.update({
    where: { id: itemId },
    data,
  });
  if (item.kind === "WORK") {
    if (item.assignedHours == null || item.assignedHours <= 0) {
      return NextResponse.json(
        { error: "Assigned hours are required for training work." },
        { status: 400 }
      );
    }
    if (item.productionTarget == null || item.productionTarget <= 0) {
      return NextResponse.json(
        { error: "Unit goal is required for training work." },
        { status: 400 }
      );
    }
  }
  if (
    existing.kind === "WORK" &&
    existing.day.scopeKey === GLOBAL_CURRICULUM_SCOPE
  ) {
    await syncGlobalDayWorkToTraineeCopies(existing.day.dayNumber);
  }
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await ctx.params;
  const existing = await prisma.curriculumChecklistItem.findUnique({
    where: { id: itemId },
    include: { day: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.curriculumChecklistItem.delete({ where: { id: itemId } });
  if (
    existing.kind === "WORK" &&
    existing.day.scopeKey === GLOBAL_CURRICULUM_SCOPE
  ) {
    await syncGlobalDayWorkToTraineeCopies(existing.day.dayNumber);
  }
  return NextResponse.json({ ok: true });
}
