import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, published, thumbnail } = await req.json();
  const course = await prisma.course.update({
    where: { id: params.id },
    data: {
      title: title?.trim(),
      description: description !== undefined ? description?.trim() || null : undefined,
      thumbnail: thumbnail !== undefined ? thumbnail || null : undefined,
      published: published ?? undefined,
    },
  });
  return NextResponse.json({ course });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.course.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
