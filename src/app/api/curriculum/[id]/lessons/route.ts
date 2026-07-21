import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** Attach a lesson to a training day */
export async function POST(req: Request, ctx: Ctx) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: dayId } = await ctx.params;
  const body = await req.json();
  const lessonId = String(body.lessonId || "").trim();
  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

  const [day, lesson] = await Promise.all([
    prisma.curriculumDay.findUnique({ where: { id: dayId } }),
    prisma.lesson.findUnique({ where: { id: lessonId } }),
  ]);
  if (!day) return NextResponse.json({ error: "Day not found" }, { status: 404 });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const maxOrder = await prisma.curriculumDayLesson.aggregate({
    where: { dayId },
    _max: { sortOrder: true },
  });

  try {
    const link = await prisma.curriculumDayLesson.create({
      data: {
        dayId,
        lessonId,
        label: body.label?.trim() || null,
        sortOrder: body.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: {
        lesson: {
          include: {
            module: { include: { course: { select: { id: true, title: true } } } },
          },
        },
      },
    });
    return NextResponse.json({ link });
  } catch {
    return NextResponse.json({ error: "Lesson already on this day" }, { status: 409 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: dayId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const linkId = searchParams.get("linkId");
  const lessonId = searchParams.get("lessonId");

  if (linkId) {
    await prisma.curriculumDayLesson.deleteMany({ where: { id: linkId, dayId } });
  } else if (lessonId) {
    await prisma.curriculumDayLesson.deleteMany({ where: { dayId, lessonId } });
  } else {
    return NextResponse.json({ error: "linkId or lessonId required" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
