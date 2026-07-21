import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ itemId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await ctx.params;
  const body = await req.json();
  const data: {
    title?: string;
    description?: string | null;
    sortOrder?: number;
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

  const item = await prisma.curriculumChecklistItem.update({
    where: { id: itemId },
    data,
  });
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await ctx.params;
  await prisma.curriculumChecklistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
