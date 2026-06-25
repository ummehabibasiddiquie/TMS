import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH update employee in team introduction
export async function PATCH(req: Request, { params }: { params: { introId: string; employeeId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId } = params;
  const { role, manager, metadata } = await req.json();

  const teamEmployee = await (prisma as any).teamEmployee.update({
    where: { id: employeeId },
    data: {
      ...(role && { role }),
      ...(manager !== undefined && { manager }),
      ...(metadata !== undefined && { metadata: metadata ? JSON.stringify(metadata) : null })
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

  return NextResponse.json({ teamEmployee });
}

// DELETE employee from team introduction
export async function DELETE(req: Request, { params }: { params: { introId: string; employeeId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId } = params;

  await (prisma as any).teamEmployee.delete({
    where: { id: employeeId }
  });

  return NextResponse.json({ success: true });
}