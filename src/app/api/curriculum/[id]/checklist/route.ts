import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** Add checklist item to a curriculum day */
export async function POST(req: Request, ctx: Ctx) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: dayId } = await ctx.params;
  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const day = await prisma.curriculumDay.findUnique({ where: { id: dayId } });
  if (!day) return NextResponse.json({ error: "Day not found" }, { status: 404 });

  const maxOrder = await prisma.curriculumChecklistItem.aggregate({
    where: { dayId },
    _max: { sortOrder: true },
  });

  const item = await prisma.curriculumChecklistItem.create({
    data: {
      dayId,
      title,
      description: body.description?.trim() || null,
      kind: body.kind === "WORK" ? "WORK" : "CHECKLIST",
      sortOrder: body.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });
  return NextResponse.json({ item });
}
