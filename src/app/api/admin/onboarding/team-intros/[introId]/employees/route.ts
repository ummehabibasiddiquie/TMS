import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST add employee to team introduction
export async function POST(req: Request, { params }: { params: { introId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { introId } = params;
  const { userId, role, manager, metadata } = await req.json();
  if (!userId || !role) {
    return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
  }

  const teamEmployee = await (prisma as any).teamEmployee.create({
    data: {
      teamIntroId: introId,
      userId,
      role,
      manager,
      metadata: metadata ? JSON.stringify(metadata) : null
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  return NextResponse.json({ teamEmployee }, { status: 201 });
}