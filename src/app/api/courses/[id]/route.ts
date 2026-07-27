import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const courseContentInclude = {
  modules: {
    orderBy: { order: "asc" as const },
    include: {
      lessons: {
        orderBy: { order: "asc" as const },
        include: {
          topics: { orderBy: { order: "asc" as const } },
          quizzes: {
            orderBy: { order: "asc" as const },
            select: {
              id: true,
              title: true,
              passingScore: true,
              order: true,
              questions: {
                orderBy: { order: "asc" as const },
                select: {
                  id: true,
                  question: true,
                  options: true,
                  correct: true,
                  order: true,
                },
              },
            },
          },
          assignment: { select: { id: true, title: true } },
        },
      },
    },
  },
};

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: courseContentInclude,
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  return NextResponse.json({ course });
}

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
    include: {
      modules: { include: { _count: { select: { lessons: true } } } },
      _count: {
        select: {
          enrollments: { where: { user: { active: true } } },
        },
      },
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
