import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId, content } = await req.json();
  const comment = await prisma.discussionComment.create({
    data: { userId: user.id, lessonId, content },
    include: { user: { select: { name: true } } },
  });
  return NextResponse.json({ comment });
}
