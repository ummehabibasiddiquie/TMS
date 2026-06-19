import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await requireSession(["ADMIN", "TEAM_LEAD", "EMPLOYEE"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { active: true },
    include: {
      _count: {
        select: {
          assignments: true,
          certifications: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, category, status, priority, url, documentation } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      category: category?.trim() || null,
      status: status?.trim() || "ACTIVE",
      priority: priority?.trim() || "MEDIUM",
      url: url?.trim() || null,
      documentation: documentation?.trim() || null,
      createdBy: user.id,
    },
  });

  return NextResponse.json({ project });
}
