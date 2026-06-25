import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH update team introduction
export async function PATCH(req: Request, { params }: { params: { introId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { introId } = params;
  const { title, content, order } = await req.json();

  const teamIntro = await (prisma as any).teamIntroduction.update({
    where: { id: introId },
    data: {
      ...(title && { title }),
      ...(content && { content }),
      ...(order !== undefined && { order })
    }
  });

  return NextResponse.json({ teamIntro });
}

// DELETE team introduction
export async function DELETE(req: Request, { params }: { params: { introId: string } }) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { introId } = params;

  await (prisma as any).teamIntroduction.delete({
    where: { id: introId }
  });

  return NextResponse.json({ success: true });
}