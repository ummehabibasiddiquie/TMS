import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description } = await req.json();
  const updatedModule = await prisma.module.update({
    where: { id: params.id },
    data: { title: title?.trim(), description: description?.trim() || null },
  });
  return NextResponse.json({ module: updatedModule });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.module.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
