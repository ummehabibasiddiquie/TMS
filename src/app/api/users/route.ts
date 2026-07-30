import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import type { Role } from "@/types";
import {
  assertUserIsActiveStaff,
  assertUserIsTrainer,
  ensureTraineeProfile,
} from "@/lib/trainee-profile";
import { enableCustomCurriculumForTrainee } from "@/lib/day-wise-training";

export async function GET(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") !== "false";

  const where =
    user.role === "TRAINER"
      ? {
          ...(activeOnly ? { active: true } : {}),
          role: "TRAINEE" as const,
          traineeProfile: { trainerId: user.id },
        }
      : activeOnly
        ? { active: true }
        : undefined;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employeeId: true,
      active: true,
      dateOfJoining: true,
      createdAt: true,
      traineeProfile: {
        select: {
          trainerId: true,
          qaId: true,
          trainer: { select: { id: true, name: true } },
          qa: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const actor = await requireSession(["ADMIN", "TRAINER"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, password, name, employeeId, role, dateOfJoining, trainerId, qaId } =
    await req.json();

  const isTeamLeadActor = actor.role === "TRAINER";

  if (!email?.trim() || !password?.trim() || !name?.trim()) {
    return NextResponse.json(
      { error: "Email, password, and name are required" },
      { status: 400 }
    );
  }

  if (!isTeamLeadActor && !role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  let effectiveRole: string;
  let nextTrainerId: string | null = null;
  let nextQaId: string | null = null;

  if (isTeamLeadActor) {
    // Team leads may only create trainees assigned to themselves (ignore client role).
    effectiveRole = "TRAINEE";
    nextTrainerId = actor.id;
  } else {
    if (!["ADMIN", "TRAINER", "TRAINEE"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    effectiveRole = role as string;
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  try {
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUserByEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    if (employeeId?.trim()) {
      const existingUserByEmployeeId = await prisma.user.findUnique({
        where: { employeeId: employeeId.trim() },
      });

      if (existingUserByEmployeeId) {
        return NextResponse.json({ error: "Employee ID already exists" }, { status: 409 });
      }
    }

    if (effectiveRole === "TRAINEE" && actor.role === "ADMIN") {
      if (trainerId) {
        await assertUserIsTrainer(trainerId);
        nextTrainerId = trainerId;
      }
      if (qaId) {
        await assertUserIsActiveStaff(qaId);
        nextQaId = qaId;
      }
    }

    const passwordHash = await hashPassword(password);

    // Joined date: use provided value, otherwise today (date the account is created)
    const joining =
      dateOfJoining && String(dateOfJoining).trim()
        ? new Date(dateOfJoining)
        : new Date();

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
        employeeId: employeeId?.trim() || null,
        role: effectiveRole as Role,
        dateOfJoining: Number.isNaN(joining.getTime()) ? new Date() : joining,
        ...(effectiveRole === "TRAINEE"
          ? {
              traineeProfile: {
                create: {
                  trainerId: nextTrainerId,
                  qaId: nextQaId,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeId: true,
        active: true,
        dateOfJoining: true,
        createdAt: true,
        traineeProfile: {
          select: {
            trainerId: true,
            qaId: true,
            trainer: { select: { id: true, name: true } },
            qa: { select: { id: true, name: true } },
          },
        },
      },
    });

    // New trainees get a personal copy of the default day curriculum (Admin/TL can customize later)
    if (effectiveRole === "TRAINEE") {
      try {
        await enableCustomCurriculumForTrainee(newUser.id);
      } catch (e) {
        console.error("Assign default curriculum failed:", e);
      }
    }

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    const message =
      error instanceof Error &&
      (error.message.includes("Team Lead") || error.message.includes("QA"))
        ? error.message
        : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const actor = await requireSession(["ADMIN", "TRAINER"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    id,
    name,
    email,
    employeeId,
    role,
    dateOfJoining,
    password,
    active,
    trainerId,
    qaId,
  } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { traineeProfile: true },
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
          { error: "You can only manage your own trainees" },
          { status: 403 }
        );
      }
      if (role && role !== "TRAINEE") {
        return NextResponse.json(
          { error: "Team Leads cannot change trainee role" },
          { status: 403 }
        );
      }
    }

    if (
      typeof active === "boolean" &&
      name === undefined &&
      email === undefined &&
      employeeId === undefined &&
      role === undefined &&
      dateOfJoining === undefined &&
      password === undefined &&
      trainerId === undefined &&
      qaId === undefined
    ) {
      if (id === actor.id && active === false) {
        return NextResponse.json(
          { error: "Cannot deactivate your own account" },
          { status: 400 }
        );
      }

      const toggledUser = await prisma.user.update({
        where: { id },
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

      return NextResponse.json({ user: toggledUser });
    }

    if (email && email !== existingUser.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }

      const duplicateEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (duplicateEmail) {
        return NextResponse.json({ error: "Email already exists" }, { status: 409 });
      }
    }

    if (employeeId && employeeId !== existingUser.employeeId) {
      const duplicateEmployeeId = await prisma.user.findUnique({
        where: { employeeId: employeeId.trim() },
      });

      if (duplicateEmployeeId) {
        return NextResponse.json({ error: "Employee ID already exists" }, { status: 409 });
      }
    }

    const nextRole = (
      actor.role === "TRAINER" ? "TRAINEE" : role || existingUser.role
    ) as Role;

    const updateData: Record<string, unknown> = {
      name: name?.trim() || existingUser.name,
      email: email?.toLowerCase().trim() || existingUser.email,
      role: nextRole,
      employeeId:
        employeeId !== undefined
          ? employeeId?.trim() || null
          : existingUser.employeeId,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : existingUser.dateOfJoining,
    };

    if (typeof active === "boolean") {
      if (id === actor.id && active === false) {
        return NextResponse.json(
          { error: "Cannot deactivate your own account" },
          { status: 400 }
        );
      }
      updateData.active = active;
    }

    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(password);
    }

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (nextRole === "TRAINEE" && actor.role === "ADMIN") {
      const profilePatch: { trainerId?: string | null; qaId?: string | null } = {};
      if (trainerId !== undefined) {
        if (trainerId) await assertUserIsTrainer(trainerId);
        profilePatch.trainerId = trainerId || null;
      }
      if (qaId !== undefined) {
        if (qaId) await assertUserIsActiveStaff(qaId);
        profilePatch.qaId = qaId || null;
      }
      await ensureTraineeProfile(id, profilePatch);
    }

    const withProfile = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        active: true,
        dateOfJoining: true,
        createdAt: true,
        traineeProfile: {
          select: {
            trainerId: true,
            qaId: true,
            trainer: { select: { id: true, name: true } },
            qa: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ user: withProfile });
  } catch (error) {
    console.error("Error updating user:", error);
    const message =
      error instanceof Error &&
      (error.message.includes("Team Lead") || error.message.includes("QA"))
        ? error.message
        : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const actor = await requireSession(["ADMIN", "TRAINER"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  if (id === actor.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    if (actor.role === "TRAINER") {
      const target = await prisma.user.findUnique({
        where: { id },
        include: { traineeProfile: true },
      });
      if (
        !target ||
        target.role !== "TRAINEE" ||
        target.traineeProfile?.trainerId !== actor.id
      ) {
        return NextResponse.json(
          { error: "You can only delete your own trainees" },
          { status: 403 }
        );
      }
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
