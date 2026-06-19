import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, category, status, priority, url, documentation, active } = await req.json();
  
  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(name?.trim() && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(category !== undefined && { category: category?.trim() || null }),
      ...(status?.trim() && { status: status.trim() }),
      ...(priority?.trim() && { priority: priority.trim() }),
      ...(url !== undefined && { url: url?.trim() || null }),
      ...(documentation !== undefined && { documentation: documentation?.trim() || null }),
      ...(active !== undefined && { active }),
    },
  });

  return NextResponse.json({ project });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.project.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
