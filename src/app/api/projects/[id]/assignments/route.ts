import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userIds, status } = await req.json();

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "User IDs are required" }, { status: 400 });
  }

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Create assignments
  const assignments = await Promise.all(
    userIds.map((userId: string) =>
      prisma.projectAssignment.upsert({
        where: {
          projectId_userId: {
            projectId: params.id,
            userId,
          },
        },
        update: {
          status: status || "ASSIGNED",
          assignedBy: user.id,
        },
        create: {
          projectId: params.id,
          userId,
          status: status || "ASSIGNED",
          assignedBy: user.id,
        },
      })
    )
  );

  return NextResponse.json({ assignments });
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId: params.id },
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
    orderBy: { assignedAt: "desc" },
  });

  return NextResponse.json({ assignments });
}
