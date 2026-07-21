import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDayWisePlan } from "@/lib/day-wise-training";

/** Toggle checklist item completion for the logged-in trainee */
export async function POST(req: Request) {
  const user = await requireSession(["TRAINEE"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const itemId = String(body.itemId || "").trim();
  const completed = body.completed !== false;

  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const item = await prisma.curriculumChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  await prisma.userChecklistProgress.upsert({
    where: { userId_itemId: { userId: user.id, itemId } },
    create: {
      userId: user.id,
      itemId,
      completed,
      completedAt: completed ? new Date() : null,
    },
    update: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  const plan = await getDayWisePlan(user.id);
  return NextResponse.json({ ok: true, plan });
}
