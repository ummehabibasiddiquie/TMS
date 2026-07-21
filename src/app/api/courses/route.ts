import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await prisma.course.findMany({
    include: {
      modules: { include: { _count: { select: { lessons: true } } } },
      _count: {
        select: {
          enrollments: { where: { user: { active: true } } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ courses });
}

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, published, thumbnail } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const course = await prisma.course.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      thumbnail: thumbnail || null,
      published: published ?? false,
      createdById: user.id,
      completionRules: {
        create: {
          requireAllLessons: true,
          requireQuizPass: true,
          minWatchPercent: 90,
        },
      },
      modules: {
        create: {
          title: "Module 1",
          order: 0,
          lessons: {
            create: {
              title: "Introduction",
              order: 0,
              lessonType: "CONTENT",
              topics: {
                create: {
                  title: "Getting Started",
                  contentType: "DOCUMENT",
                  contentBody: "Add your lesson content here.",
                  order: 0,
                },
              },
            },
          },
        },
      },
    },
    include: { modules: { include: { lessons: true } } },
  });

  return NextResponse.json({ course });
}
