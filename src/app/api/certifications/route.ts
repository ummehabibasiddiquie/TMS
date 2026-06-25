import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { active: true },
    include: {
      categoryRel: {
        select: {
          id: true,
          name: true,
        },
      },
      certifications: {
        where: { userId: user.id },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ projects });
}
