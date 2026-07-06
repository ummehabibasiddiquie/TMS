import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectIds } = await req.json();

  if (!Array.isArray(projectIds)) {
    return NextResponse.json({ error: "projectIds must be an array" }, { status: 400 });
  }

  try {
    // Create or update assignments for each project using upsert
    const assignments = await Promise.all(
      projectIds.map((projectId) =>
        prisma.projectAssignment.upsert({
          where: {
            projectId_userId: {
              projectId,
              userId: params.id,
            },
          },
          update: {
            status: "ASSIGNED",
            assignedBy: user.id,
          },
          create: {
            userId: params.id,
            projectId,
            status: "ASSIGNED",
            assignedBy: user.id,
          },
        })
      )
    );

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Assignment creation error:", error);
    return NextResponse.json({ error: "Failed to create assignments" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Delete all assignments for this user
    await prisma.projectAssignment.deleteMany({
      where: { userId: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assignment deletion error:", error);
    return NextResponse.json({ error: "Failed to delete assignments" }, { status: 500 });
  }
}
