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

  // Check if user has access (Admin, Team Lead, or assigned employee)
  const isAssigned = project.assignments.some((a) => a.userId === user.id);
  const isAdmin = user.role === "ADMIN";
  const isTeamLead = user.role === "TRAINER";

  if (!isAdmin && !isTeamLead && !isAssigned) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(category !== undefined && { category: category?.trim() || null }),
      ...(status !== undefined && { status }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(priority !== undefined && { priority }),
      ...(resources !== undefined && { resources: resources?.trim() || null }),
      ...(documentation !== undefined && { documentation: documentation?.trim() || null }),
      ...(url !== undefined && { url: url?.trim() || null }),
      ...(active !== undefined && { active }),
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.project.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ ok: true });
}
