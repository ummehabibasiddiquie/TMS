import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, contentType, contentUrl, contentBody, durationSec } = await req.json();
  const topic = await prisma.topic.update({
    where: { id: params.id },
    data: {
      title: title?.trim(),
      contentType: contentType ?? undefined,
      contentUrl: contentUrl !== undefined ? contentUrl?.trim() || null : undefined,
      contentBody: contentBody !== undefined ? contentBody?.trim() || null : undefined,
      durationSec: durationSec ?? undefined,
    },
  });
  return NextResponse.json({ topic });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.topic.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
