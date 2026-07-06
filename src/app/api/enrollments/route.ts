import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const enrollments = await prisma.enrollment.findMany({
      select: {
        userId: true,
        courseId: true,
        status: true,
      },
    });

    return NextResponse.json({ enrollments });
  } catch (error) {
    console.error("Failed to fetch enrollments:", error);
    return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
  }
}
