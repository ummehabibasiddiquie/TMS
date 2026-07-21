import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  GLOBAL_CURRICULUM_SCOPE,
  EXTRA_WEEK_CURRICULUM_SCOPE,
  assertCanManageTrainee,
  ensureStarterCurriculum,
  getDayWisePlan,
  listCurriculumDays,
  resolveCurriculumScope,
} from "@/lib/day-wise-training";

/** Trainee: own day-wise plan. Admin/TL: curriculum list for GLOBAL, EXTRA_WEEK, or a trainee. */
export async function GET(req: Request) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const asAdmin = searchParams.get("manage") === "1";
  const traineeId = searchParams.get("traineeId");
  const scopeParam = searchParams.get("scope");

  if (asAdmin) {
    if (user.role !== "ADMIN" && user.role !== "TRAINER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await ensureStarterCurriculum();

    let scopeKey = GLOBAL_CURRICULUM_SCOPE;
    let trainee: { id: string; name: string; email: string } | null = null;
    let isCustom = false;

    if (scopeParam === EXTRA_WEEK_CURRICULUM_SCOPE || scopeParam === "EXTRA_WEEK") {
      scopeKey = EXTRA_WEEK_CURRICULUM_SCOPE;
    } else if (traineeId) {
      const gate = await assertCanManageTrainee(user, traineeId);
      if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: 403 });
      }
      const resolved = await resolveCurriculumScope(traineeId);
      scopeKey = resolved.scopeKey;
      isCustom = resolved.isCustom;
      trainee = {
        id: gate.trainee.id,
        name: gate.trainee.name,
        email: gate.trainee.email,
      };
    }

    const days = await listCurriculumDays(scopeKey);
    return NextResponse.json({
      days,
      scopeKey,
      isCustom,
      trainee,
      usingDefault: !isCustom && scopeKey === GLOBAL_CURRICULUM_SCOPE,
      isExtraWeekDefault: scopeKey === EXTRA_WEEK_CURRICULUM_SCOPE,
    });
  }

  const plan = await getDayWisePlan(user.id);
  return NextResponse.json({ plan });
}

export async function POST(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const dayNumber = Number(body.dayNumber);
  const title = String(body.title || "").trim();
  const dayType =
    body.dayType === "CHECKLIST" || body.dayType === "TRAINING" || body.dayType === "MIXED"
      ? body.dayType
      : "MIXED";
  const projectName = body.projectName?.trim() || null;
  const description = body.description?.trim() || null;
  const traineeId = body.traineeId ? String(body.traineeId) : null;
  const scopeBody = body.scope ? String(body.scope) : null;

  let scopeKey = GLOBAL_CURRICULUM_SCOPE;
  if (scopeBody === EXTRA_WEEK_CURRICULUM_SCOPE || scopeBody === "EXTRA_WEEK") {
    scopeKey = EXTRA_WEEK_CURRICULUM_SCOPE;
  } else if (traineeId) {
    const gate = await assertCanManageTrainee(user, traineeId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 });
    }
    const resolved = await resolveCurriculumScope(traineeId);
    if (!resolved.isCustom) {
      return NextResponse.json(
        {
          error:
            "This trainee still uses the default schedule. Enable a personal schedule first.",
        },
        { status: 400 }
      );
    }
    scopeKey = traineeId;
  }

  if (!Number.isFinite(dayNumber) || dayNumber < 1) {
    return NextResponse.json({ error: "dayNumber must be >= 1" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const day = await prisma.curriculumDay.create({
      data: {
        scopeKey,
        dayNumber,
        title,
        dayType,
        projectName,
        description,
      },
    });
    return NextResponse.json({ day });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Create failed";
    if (msg.includes("Unique") || msg.includes("dayNumber")) {
      return NextResponse.json({ error: `Day ${dayNumber} already exists` }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
