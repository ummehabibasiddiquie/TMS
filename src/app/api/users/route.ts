import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import type { Role } from "@/types";

export async function GET() {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employeeId: true,
      dateOfJoining: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, password, name, employeeId, role, dateOfJoining } = await req.json();

  // Validation
  if (!email?.trim() || !password?.trim() || !name?.trim() || !role) {
    return NextResponse.json(
      { error: "Email, password, name, and role are required" },
      { status: 400 }
    );
  }

  if (!["ADMIN", "TRAINER", "TRAINEE"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
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
    // Check for duplicate email
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUserByEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    // Check for duplicate employeeId if provided
    if (employeeId?.trim()) {
      const existingUserByEmployeeId = await prisma.user.findUnique({
        where: { employeeId: employeeId.trim() },
      });

      if (existingUserByEmployeeId) {
        return NextResponse.json({ error: "Employee ID already exists" }, { status: 409 });
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
        employeeId: employeeId?.trim() || null,
        role: role as Role,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeId: true,
        dateOfJoining: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const admin = await requireSession(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, email, employeeId, role, dateOfJoining, password } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for duplicate email if changing email
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

    // Check for duplicate employeeId if changing employeeId
    if (employeeId && employeeId !== existingUser.employeeId) {
      const duplicateEmployeeId = await prisma.user.findUnique({
        where: { employeeId: employeeId.trim() },
      });

      if (duplicateEmployeeId) {
        return NextResponse.json({ error: "Employee ID already exists" }, { status: 409 });
      }
    }

    const updateData: any = {
      name: name?.trim() || existingUser.name,
      email: email?.toLowerCase().trim() || existingUser.email,
      role: role || existingUser.role,
      employeeId: employeeId?.trim() || existingUser.employeeId,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : existingUser.dateOfJoining,
    };

    // Update password if provided
    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        dateOfJoining: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await requireSession(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  if (id === admin.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
