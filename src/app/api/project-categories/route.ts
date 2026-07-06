import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dropdown = searchParams.get("dropdown");

  if (dropdown === "true") {
    const categories = await prisma.projectCategory.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  }

  const categories = await prisma.projectCategory.findMany({
    where: { deletedAt: null },
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, code, description, status } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  // Check for duplicate name
  const existing = await prisma.projectCategory.findFirst({
    where: {
      name: name.trim(),
      deletedAt: null,
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Category name already exists" }, { status: 400 });
  }

  // Check for duplicate code if provided
  if (code?.trim()) {
    const existingCode = await prisma.projectCategory.findFirst({
      where: {
        code: code.trim(),
        deletedAt: null,
      },
    });

    if (existingCode) {
      return NextResponse.json({ error: "Category code already exists" }, { status: 400 });
    }
  }

  const category = await prisma.projectCategory.create({
    data: {
      name: name.trim(),
      code: code?.trim() || null,
      description: description?.trim() || null,
      status: status || "ACTIVE",
      createdBy: user.id,
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
