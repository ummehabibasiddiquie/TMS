import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ACTIVE_USER } from "@/lib/active-filters";

// GET active users for admin assignment pickers
export async function GET() {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: ACTIVE_USER,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employeeId: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
