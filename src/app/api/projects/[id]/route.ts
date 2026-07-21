import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      categoryRel: {
        select: {
          id: true,
          name: true,
        },
      },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assigner: {
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

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const isAssigned = project.assignments.some((a) => a.userId === user.id);
  const isAdmin = user.role === "ADMIN";
  const isTeamLead = user.role === "TRAINER";

  if (!isAdmin && !isTeamLead && !isAssigned) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ project });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, category, status, priority, url, documentation, active } = await req.json();
  
  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(name?.trim() && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(category !== undefined && { category: category?.trim() || null }),
      ...(status?.trim() && { status: status.trim() }),
      ...(priority?.trim() && { priority: priority.trim() }),
      ...(url !== undefined && { url: url?.trim() || null }),
      ...(documentation !== undefined && { documentation: documentation?.trim() || null }),
      ...(active !== undefined && { active }),
    },
  });

  return NextResponse.json({ project });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    name,
    description,
    categoryId,
    status,
    startDate,
    endDate,
    priority,
    resources,
    documentation,
    url,
    active,
  } = await req.json();

  const resolvedStatus = status !== undefined ? status : undefined;
  const resolvedActive =
    resolvedStatus !== undefined
      ? resolvedStatus === "ACTIVE" && active !== false
      : active;

  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(resolvedStatus !== undefined && { status: resolvedStatus }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(priority !== undefined && { priority }),
      ...(resources !== undefined && { resources: resources?.trim() || null }),
      ...(documentation !== undefined && { documentation: documentation?.trim() || null }),
      ...(url !== undefined && { url: url?.trim() || null }),
      ...(resolvedActive !== undefined && { active: resolvedActive }),
    },
    include: {
      categoryRel: {
        select: {
          id: true,
          name: true,
        },
      },
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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            assignments: true,
            certifications: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete the project (cascade will handle related records)
    await prisma.project.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ 
      ok: true, 
      message: `Project "${project.name}" deleted successfully. Removed ${project._count.assignments} assignments and ${project._count.certifications} certifications.`
    });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ 
      error: "Failed to delete project. It may be referenced by other records." 
    }, { status: 500 });
  }
}
