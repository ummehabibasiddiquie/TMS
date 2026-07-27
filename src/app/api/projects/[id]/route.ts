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

const HRMS_MANAGED = {
  error:
    "Projects are managed in HRMS. Create, edit, and delete projects there. Use GET /api/hrms/projects for the list.",
};

export async function PUT() {
  return NextResponse.json(HRMS_MANAGED, { status: 410 });
}

export async function PATCH() {
  return NextResponse.json(HRMS_MANAGED, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json(HRMS_MANAGED, { status: 410 });
}
