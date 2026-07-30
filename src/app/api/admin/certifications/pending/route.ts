import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildCertificationReviewBoard } from "@/lib/certification-history";
import { backfillPendingCertsFromQuizAttempts } from "@/lib/project-certification";

/** Certification review board + full history for Admin / Team Lead */
export async function GET() {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await backfillPendingCertsFromQuizAttempts();
  } catch (e) {
    console.error("Cert backfill failed:", e);
  }

  const board = await buildCertificationReviewBoard(user.role, user.id);

  const certifications = board.certifications.map((e) => ({
    id: e.certId!,
    kind: e.kind as "project" | "final_quiz",
    score: e.score ?? 0,
    status:
      e.event === "rejected"
        ? "REJECTED"
        : e.event === "approved"
          ? "APPROVED"
          : "PENDING_REVIEW",
    submittedAt: e.at,
    cycle: e.cycle,
    quizTitle: e.kind === "final_quiz" ? e.title : undefined,
    canAllowRetake: e.canAllowRetake,
    reviewNote: e.reviewNote,
    user: e.trainee,
    project:
      e.kind === "project"
        ? { id: e.certId!, name: e.title, categoryRel: e.subtitle ? { name: e.subtitle } : null }
        : undefined,
  }));

  const retakeAwaiting = board.retakeAwaiting.map((e) => ({
    traineeId: e.trainee.id,
    traineeName: e.trainee.name,
    traineeEmail: e.trainee.email,
    employeeId: e.trainee.employeeId,
    previousScore: e.score,
    evaluationCycle: e.cycle ?? 1,
    grantedAt: e.at,
    grantedBy: e.actor,
  }));

  return NextResponse.json({
    stats: board.stats,
    certifications,
    retakeAwaiting,
    history: board.history,
  });
}
