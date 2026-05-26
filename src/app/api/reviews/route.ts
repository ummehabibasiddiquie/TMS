import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await requireSession(["TRAINER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId, status, remarks } = await req.json();

  await prisma.trainerReview.upsert({
    where: { submissionId },
    create: {
      submissionId,
      reviewerId: user.id,
      remarks,
      status,
      reviewedAt: new Date(),
    },
    update: { remarks, status, reviewedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
