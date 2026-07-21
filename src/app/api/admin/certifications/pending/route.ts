import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ACTIVE_USER } from "@/lib/active-filters";
import { backfillPendingCertsFromQuizAttempts } from "@/lib/project-certification";

/** List certifications awaiting Admin / Team Lead approval */
export async function GET() {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure course-quiz passes already in the DB show up in this queue
  try {
    await backfillPendingCertsFromQuizAttempts();
  } catch (e) {
    console.error("Cert backfill failed:", e);
  }

  const [pending, approvedCount, rejectedCount] = await Promise.all([
    prisma.projectCertification.findMany({
      where: {
        status: "PENDING_REVIEW",
        passed: true,
        user: ACTIVE_USER,
      },
      include: {
        user: { select: { id: true, name: true, email: true, employeeId: true } },
        project: {
          select: {
            id: true,
            name: true,
            categoryRel: { select: { name: true } },
          },
        },
      },
      orderBy: { certifiedAt: "desc" },
    }),
    prisma.projectCertification.count({
      where: { status: "APPROVED", user: ACTIVE_USER },
    }),
    prisma.projectCertification.count({
      where: { status: "REJECTED", user: ACTIVE_USER },
    }),
  ]);

  return NextResponse.json({
    stats: {
      pending: pending.length,
      approved: approvedCount,
      rejected: rejectedCount,
    },
    certifications: pending.map((c) => ({
      id: c.id,
      score: c.score,
      passed: c.passed,
      status: c.status,
      submittedAt: c.certifiedAt,
      user: c.user,
      project: c.project,
    })),
  });
}
