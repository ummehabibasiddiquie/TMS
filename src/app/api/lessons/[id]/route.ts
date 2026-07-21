import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, durationMin } = await req.json();
  const lesson = await prisma.lesson.update({
    where: { id: params.id },
    data: {
      title: title?.trim(),
      description: description !== undefined ? description?.trim() || null : undefined,
      durationMin: durationMin ?? undefined,
    },
    include: { topics: true, quizzes: true, assignment: true },
  });
  return NextResponse.json({ lesson });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.lesson.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
