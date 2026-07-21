import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Flat lesson list for attaching to curriculum days */
export async function GET() {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      module: {
        select: {
          title: true,
          course: { select: { title: true } },
        },
      },
    },
    orderBy: [{ module: { course: { title: "asc" } } }, { order: "asc" }],
    take: 500,
  });

  const lessons = rows.map((l) => ({
    id: l.id,
    title: l.title,
    courseTitle: l.module.course.title,
    moduleTitle: l.module.title,
  }));

  return NextResponse.json({ lessons });
}
