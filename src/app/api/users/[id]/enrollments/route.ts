import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseIds } = await req.json();

  if (!Array.isArray(courseIds)) {
    return NextResponse.json({ error: "courseIds must be an array" }, { status: 400 });
  }

  try {
    // Create or update enrollments for each course using upsert
    const enrollments = await Promise.all(
      courseIds.map((courseId) =>
        prisma.enrollment.upsert({
          where: {
            userId_courseId: {
              courseId,
              userId: params.id,
            },
          },
          update: {
            status: "IN_PROGRESS",
            lastActivityAt: new Date(),
          },
          create: {
            userId: params.id,
            courseId,
            status: "IN_PROGRESS",
            enrolledAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({ enrollments });
  } catch (error) {
    console.error("Enrollment creation error:", error);
    return NextResponse.json({ error: "Failed to create enrollments" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Delete all enrollments for this user
    await prisma.enrollment.deleteMany({
      where: { userId: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Enrollment deletion error:", error);
    return NextResponse.json({ error: "Failed to delete enrollments" }, { status: 500 });
  }
}
