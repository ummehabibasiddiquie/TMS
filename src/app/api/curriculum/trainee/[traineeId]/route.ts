import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  assertCanManageTrainee,
  enableCustomCurriculumForTrainee,
  extendTraineeCurriculumByWeek,
  listCurriculumDays,
  resetTraineeCurriculumToDefault,
  resolveCurriculumScope,
} from "@/lib/day-wise-training";

type Ctx = { params: Promise<{ traineeId: string }> };

/** Enable personal schedule (clone from GLOBAL) or reset back to default. */
export async function POST(req: Request, ctx: Ctx) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { traineeId } = await ctx.params;
  const gate = await assertCanManageTrainee(user, traineeId);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action =
    body.action === "reset"
      ? "reset"
      : body.action === "extendWeek"
        ? "extendWeek"
        : "enable";

  try {
    if (action === "reset") {
      await resetTraineeCurriculumToDefault(traineeId);
      const days = await listCurriculumDays(traineeId);
      return NextResponse.json({
        ok: true,
        action: "reset",
        isCustom: true,
        scopeKey: traineeId,
        days,
        trainee: { id: gate.trainee.id, name: gate.trainee.name, email: gate.trainee.email },
      });
    }

    if (action === "extendWeek") {
      const extraDays = Number(body.days) > 0 ? Math.min(14, Number(body.days)) : 7;
      const result = await extendTraineeCurriculumByWeek(traineeId, extraDays);
      return NextResponse.json({
        ok: true,
        action: "extendWeek",
        isCustom: true,
        scopeKey: traineeId,
        added: result.added,
        fromDay: result.fromDay,
        toDay: result.toDay,
        days: result.days,
        trainee: { id: gate.trainee.id, name: gate.trainee.name, email: gate.trainee.email },
      });
    }

    const result = await enableCustomCurriculumForTrainee(traineeId);
    return NextResponse.json({
      ok: true,
      action: "enable",
      created: result.created,
      isCustom: true,
      scopeKey: traineeId,
      days: result.days,
      trainee: { id: gate.trainee.id, name: gate.trainee.name, email: gate.trainee.email },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { traineeId } = await ctx.params;
  const gate = await assertCanManageTrainee(user, traineeId);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const { scopeKey, isCustom } = await resolveCurriculumScope(traineeId);
  const days = await listCurriculumDays(scopeKey);
  return NextResponse.json({
    isCustom,
    scopeKey,
    days,
    trainee: { id: gate.trainee.id, name: gate.trainee.name, email: gate.trainee.email },
  });
}
