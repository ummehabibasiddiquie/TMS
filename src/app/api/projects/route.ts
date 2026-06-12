import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  // If userId is provided, get projects assigned to that user
  if (userId) {
    const assignments = await prisma.projectAssignment.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const projects = assignments.map((a: any) => ({
      ...a.project,
      assignmentStatus: a.status,
      assignedAt: a.assignedAt,
    }));

    return NextResponse.json({ projects });
  }

  // Admin/Team Lead can see all projects
  if (user.role === "ADMIN" || user.role === "TRAINER") {
    const projects = await prisma.project.findMany({
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ projects });
  }

  // Regular employees can only see their assigned projects
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId: user.id },
    include: {
      project: {
        include: {
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const projects = assignments.map((a: any) => ({
    ...a.project,
    assignmentStatus: a.status,
    assignedAt: a.assignedAt,
  }));

  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    name,
    description,
    category,
    status,
    startDate,
    endDate,
    priority,
    resources,
    documentation,
    url,
    active,
  } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      category: category?.trim() || null,
      status: status || "ACTIVE",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      priority: priority || "MEDIUM",
      resources: resources?.trim() || null,
      documentation: documentation?.trim() || null,
      url: url?.trim() || null,
      active: active ?? true,
      createdBy: user.id,
    },
    include: {
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ project });
}
