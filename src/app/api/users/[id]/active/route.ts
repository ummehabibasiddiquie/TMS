import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const actor = await requireSession(["ADMIN", "TRAINER"]);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = params.id;
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  let body: { active?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const active = body.active;
  if (typeof active !== "boolean") {
    return NextResponse.json(
      { error: "active must be a boolean (true or false)" },
      { status: 400 }
    );
  }

  if (userId === actor.id && active === false) {
    return NextResponse.json(
      { error: "Cannot deactivate your own account" },
      { status: 400 }
    );
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        active: true,
        role: true,
        traineeProfile: { select: { trainerId: true } },
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (actor.role === "TRAINER") {
      if (
        existingUser.role !== "TRAINEE" ||
        existingUser.traineeProfile?.trainerId !== actor.id
      ) {
        return NextResponse.json(
          { error: "You can only activate/deactivate your own trainees" },
          { status: 403 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { active },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        active: true,
        dateOfJoining: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error toggling user active status:", error);
    return NextResponse.json(
      { error: "Failed to update account status" },
      { status: 500 }
    );
  }
}
