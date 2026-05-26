import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { moduleId, title, lessonType, description, durationMin } = await req.json();
  if (!moduleId || !title?.trim()) {
    return NextResponse.json({ error: "moduleId and title required" }, { status: 400 });
  }

  const count = await prisma.lesson.count({ where: { moduleId } });
  const type = lessonType || "CONTENT";

  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title: title.trim(),
      description: description?.trim() || null,
      lessonType: type,
      durationMin: durationMin ?? null,
      order: count,
      ...(type === "QUIZ" && {
        quiz: {
          create: { title: `${title.trim()} Quiz`, passingScore: 70 },
        },
      }),
      ...(type === "ASSIGNMENT" && {
        assignment: {
          create: { title: title.trim(), instructions: "Complete the assignment." },
        },
      }),
    },
    include: { topics: true, quiz: true, assignment: true },
  });
  return NextResponse.json({ lesson });
}
