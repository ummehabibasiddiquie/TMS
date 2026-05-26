import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId, title, description } = await req.json();
  if (!courseId || !title?.trim()) {
    return NextResponse.json({ error: "courseId and title required" }, { status: 400 });
  }

  const count = await prisma.module.count({ where: { courseId } });
  const createdModule = await prisma.module.create({
    data: {
      courseId,
      title: title.trim(),
      description: description?.trim() || null,
      order: count,
    },
  });
  return NextResponse.json({ module: createdModule });
}
