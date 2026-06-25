import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET all users for admin
export async function GET() {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employeeId: true,
      createdAt: true
    },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ users });
}
