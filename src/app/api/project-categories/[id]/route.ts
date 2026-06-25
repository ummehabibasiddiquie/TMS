import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const category = await prisma.projectCategory.findUnique({
    where: { id: params.id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          projects: true,
        },
      },
    },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json({ category });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, code, description, status } = await req.json();

  // Check if category exists
  const existing = await prisma.projectCategory.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Check for duplicate name if changed
  if (name?.trim() && name.trim() !== existing.name) {
    const duplicate = await prisma.projectCategory.findFirst({
      where: {
        name: name.trim(),
        deletedAt: null,
        id: { not: params.id },
      },
    });

    if (duplicate) {
      return NextResponse.json({ error: "Category name already exists" }, { status: 400 });
    }
  }

  // Check for duplicate code if changed
  if (code?.trim() && code.trim() !== existing.code) {
    const duplicateCode = await prisma.projectCategory.findFirst({
      where: {
        code: code.trim(),
        deletedAt: null,
        id: { not: params.id },
      },
    });

    if (duplicateCode) {
      return NextResponse.json({ error: "Category code already exists" }, { status: 400 });
    }
  }

  const category = await prisma.projectCategory.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(code !== undefined && { code: code?.trim() || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(status !== undefined && { status }),
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          projects: true,
        },
      },
    },
  });

  return NextResponse.json({ category });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if category exists
  const category = await prisma.projectCategory.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          projects: true,
        },
      },
    },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Check if category has projects assigned
  if (category._count.projects > 0) {
    return NextResponse.json(
      { error: `Cannot delete category. It is assigned to ${category._count.projects} project(s).` },
      { status: 400 }
    );
  }

  // Soft delete
  await prisma.projectCategory.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
