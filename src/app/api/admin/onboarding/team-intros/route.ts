import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST create team introduction
export async function POST(req: Request) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId, title, content, order } = await req.json();
  if (!templateId || !title || !content) {
    return NextResponse.json({ error: "templateId, title, and content are required" }, { status: 400 });
  }

  const teamIntro = await (prisma as any).teamIntroduction.create({
    data: {
      templateId,
      title,
      content,
      order: order || 0
    }
  });

  return NextResponse.json({ teamIntro }, { status: 201 });
}