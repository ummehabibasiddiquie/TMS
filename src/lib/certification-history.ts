import { prisma } from "./db";
import { ACTIVE_USER } from "./active-filters";
import { isFinalQuizCertVisibleToTrainee } from "./final-evaluation";

export type CertHistoryActor = { id: string; name: string; role: string };

export type CertHistoryEntry = {
  id: string;
  kind: "final_quiz" | "project" | "retake_grant";
  event:
    | "pending"
    | "approved"
    | "rejected"
    | "retake_granted"
    | "retake_open"
    | "superseded";
  statusLabel: string;
  trainee: {
    id: string;
    name: string;
    email: string;
    employeeId: string | null;
  };
  title: string;
  subtitle?: string;
  score: number | null;
  cycle?: number;
  at: string;
  actor: CertHistoryActor | null;
  reviewNote?: string | null;
  actionable?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  certId?: string;
  canAllowRetake?: boolean;
};

export function traineeScopeForReviewer(role: string, reviewerId: string) {
  if (role === "TRAINER") {
    return {
      ...ACTIVE_USER,
      traineeProfile: { trainerId: reviewerId },
    };
  }
  return ACTIVE_USER;
}

function actorFrom(user: CertHistoryActor | null | undefined): CertHistoryActor | null {
  if (!user) return null;
  return { id: user.id, name: user.name, role: user.role };
}

function findRetakeGrant(
  userId: string,
  supersededCycle: number,
  grants: Array<{
    userId: string;
    previousCycle: number;
    newCycle: number;
    grantedAt: Date;
    grantedBy: CertHistoryActor | null;
  }>
) {
  return (
    grants.find((g) => g.userId === userId && g.previousCycle === supersededCycle) ??
    grants.find((g) => g.userId === userId && g.newCycle === supersededCycle + 1)
  );
}

function resolveSupersededRetakeActor(args: {
  userId: string;
  supersededCycle: number;
  currentCycle: number;
  grants: Array<{
    userId: string;
    previousCycle: number;
    newCycle: number;
    grantedAt: Date;
    grantedBy: CertHistoryActor | null;
  }>;
  profile?: {
    evaluationCycle?: number | null;
    finalQuizRetakeGrantedBy?: CertHistoryActor | null;
  } | null;
}): { actor: CertHistoryActor | null; grantedAt: Date | null } {
  const grant = findRetakeGrant(args.userId, args.supersededCycle, args.grants);
  if (grant?.grantedBy) {
    return { actor: actorFrom(grant.grantedBy), grantedAt: grant.grantedAt };
  }

  const currentCycle = args.profile?.evaluationCycle ?? args.currentCycle;
  if (currentCycle > args.supersededCycle && args.profile?.finalQuizRetakeGrantedBy) {
    return { actor: actorFrom(args.profile.finalQuizRetakeGrantedBy), grantedAt: null };
  }

  return { actor: null, grantedAt: grant?.grantedAt ?? null };
}

export async function buildCertificationHistory(
  userScope: ReturnType<typeof traineeScopeForReviewer>
): Promise<CertHistoryEntry[]> {
  const [finalCerts, projectCerts, retakeGrants] = await Promise.all([
      prisma.finalQuizCertificate.findMany({
        where: { user: userScope },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              employeeId: true,
              traineeProfile: {
                select: {
                  evaluationCycle: true,
                  trainingStatus: true,
                  readyForProduction: true,
                  finalQuizRetakeGrantedBy: {
                    select: { id: true, name: true, role: true },
                  },
                },
              },
            },
          },
          reviewedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { certifiedAt: "desc" },
      }),
      prisma.projectCertification.findMany({
        where: { user: userScope, passed: true },
        include: {
          user: { select: { id: true, name: true, email: true, employeeId: true } },
          reviewedBy: { select: { id: true, name: true, role: true } },
          project: {
            select: {
              name: true,
              categoryRel: { select: { name: true } },
            },
          },
        },
        orderBy: { certifiedAt: "desc" },
      }),
      prisma.finalQuizRetakeGrant.findMany({
        where: { user: userScope },
        include: {
          user: { select: { id: true, name: true, email: true, employeeId: true } },
          grantedBy: { select: { id: true, name: true, role: true } },
        },
      orderBy: { grantedAt: "desc" },
    }),
  ]);

  const entries: CertHistoryEntry[] = [];

  for (const c of finalCerts) {
    const profile = c.user.traineeProfile;
    const trainee = {
      id: c.user.id,
      name: c.user.name,
      email: c.user.email,
      employeeId: c.user.employeeId,
    };
    const currentCycle = profile?.evaluationCycle ?? 1;
    const visible = isFinalQuizCertVisibleToTrainee(c);
    const superseded =
      c.status === "PENDING_REVIEW" && !c.reviewedById && c.cycle < currentCycle;
    const decided =
      profile?.trainingStatus === "APPROVED_IN_ORG" ||
      profile?.readyForProduction ||
      profile?.trainingStatus === "REJECTED";

    let event: CertHistoryEntry["event"];
    let statusLabel: string;
    let at = c.certifiedAt.toISOString();
    let actor = actorFrom(c.reviewedBy);

    if (superseded) {
      event = "superseded";
      statusLabel = "Older (replaced)";
      const resolved = resolveSupersededRetakeActor({
        userId: c.userId,
        supersededCycle: c.cycle,
        currentCycle,
        grants: retakeGrants,
        profile,
      });
      actor = resolved.actor;
      if (resolved.grantedAt) {
        at = resolved.grantedAt.toISOString();
      }
    } else if (c.status === "REJECTED") {
      event = "rejected";
      statusLabel = "Certificate rejected";
      at = c.reviewedAt?.toISOString() ?? at;
    } else if (visible) {
      event = "approved";
      statusLabel = "Certificate approved";
      at = c.reviewedAt?.toISOString() ?? at;
    } else {
      event = "pending";
      statusLabel = "Pending review";
    }

    entries.push({
      id: `final-cert-${c.id}`,
      kind: "final_quiz",
      event,
      statusLabel,
      trainee,
      title: c.quizTitle || "Final Quiz",
      subtitle: "Final Quiz evaluation",
      score: Math.round(c.score),
      cycle: c.cycle,
      at,
      actor,
      reviewNote: event === "rejected" ? c.reviewNote : null,
      actionable: event === "pending" && c.cycle === currentCycle,
      canApprove:
        !superseded &&
        c.cycle === currentCycle &&
        (event === "pending" || event === "rejected"),
      canReject:
        !superseded &&
        c.cycle === currentCycle &&
        (event === "pending" || event === "approved"),
      certId: c.id,
      canAllowRetake:
        !superseded &&
        c.cycle === currentCycle &&
        !decided &&
        (event === "pending" || event === "rejected"),
    });
  }

  for (const c of projectCerts) {
    const trainee = {
      id: c.user.id,
      name: c.user.name,
      email: c.user.email,
      employeeId: c.user.employeeId,
    };
    let event: CertHistoryEntry["event"];
    let statusLabel: string;
    let at = c.certifiedAt.toISOString();
    const actor = actorFrom(c.reviewedBy);

    if (c.status === "APPROVED") {
      event = "approved";
      statusLabel = "Certificate approved";
      at = c.reviewedAt?.toISOString() ?? at;
    } else if (c.status === "REJECTED") {
      event = "rejected";
      statusLabel = "Certificate rejected";
      at = c.reviewedAt?.toISOString() ?? at;
    } else {
      event = "pending";
      statusLabel = "Pending review";
    }

    entries.push({
      id: `project-cert-${c.id}`,
      kind: "project",
      event,
      statusLabel,
      trainee,
      title: c.project.name,
      subtitle: c.project.categoryRel?.name ?? undefined,
      score: Math.round(c.score),
      at,
      actor,
      reviewNote: event === "rejected" ? c.reviewNote : null,
      actionable: event === "pending",
      canApprove: event === "pending" || event === "rejected",
      canReject: event === "pending" || event === "approved",
      certId: c.id,
    });
  }

  for (const g of retakeGrants) {
    const currentAttempt = await prisma.finalEvaluationAttempt.findFirst({
      where: { userId: g.userId, cycle: g.newCycle },
    });
    const profile = await prisma.traineeProfile.findUnique({
      where: { userId: g.userId },
      select: { evaluationCycle: true, finalQuizRetakeGrantedAt: true },
    });
    const stillOpen =
      !currentAttempt &&
      profile?.evaluationCycle === g.newCycle &&
      profile.finalQuizRetakeGrantedAt != null;

    entries.push({
      id: `retake-grant-${g.id}`,
      kind: "retake_grant",
      event: stillOpen ? "retake_open" : "retake_granted",
      statusLabel: stillOpen ? "Older Record" : "Older Record Saved",
      trainee: {
        id: g.user.id,
        name: g.user.name,
        email: g.user.email,
        employeeId: g.user.employeeId,
      },
      title: "Final Quiz (Older)",
      subtitle: `Cycle ${g.previousCycle} → ${g.newCycle}`,
      score: Math.round(g.previousScore),
      cycle: g.newCycle,
      at: g.grantedAt.toISOString(),
      actor: actorFrom(g.grantedBy),
    });
  }

  // Legacy retakes without audit rows
  const legacyProfiles = await prisma.traineeProfile.findMany({
    where: {
      user: userScope,
      finalQuizRetakeGrantedAt: { not: null },
      trainingStatus: { notIn: ["APPROVED_IN_ORG", "REJECTED"] },
      readyForProduction: false,
    },
    include: {
      user: { select: { id: true, name: true, email: true, employeeId: true } },
      finalQuizRetakeGrantedBy: { select: { id: true, name: true, role: true } },
    },
  });

  for (const p of legacyProfiles) {
    const hasAudit = retakeGrants.some(
      (g) => g.userId === p.userId && g.newCycle === p.evaluationCycle
    );
    if (hasAudit) continue;

    const currentAttempt = await prisma.finalEvaluationAttempt.findFirst({
      where: { userId: p.userId, cycle: p.evaluationCycle },
    });
    if (currentAttempt) continue;

    entries.push({
      id: `retake-legacy-${p.userId}-${p.evaluationCycle}`,
      kind: "retake_grant",
      event: "retake_open",
      statusLabel: "Older Record",
      trainee: {
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        employeeId: p.user.employeeId,
      },
      title: "Final Quiz (Older)",
      subtitle: `Cycle ${p.evaluationCycle}`,
      score: p.finalQuizRetakePreviousScore
        ? Math.round(p.finalQuizRetakePreviousScore)
        : null,
      cycle: p.evaluationCycle,
      at: p.finalQuizRetakeGrantedAt!.toISOString(),
      actor: actorFrom(p.finalQuizRetakeGrantedBy),
    });
  }

  return entries.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

export async function buildCertificationReviewBoard(role: string, reviewerId: string) {
  const userScope = traineeScopeForReviewer(role, reviewerId);
  const history = await buildCertificationHistory(userScope);

  const certifications = history.filter(
    (e) =>
      (e.actionable || (e.canAllowRetake && e.kind === "final_quiz")) &&
      (e.kind === "final_quiz" || e.kind === "project")
  );
  const retakeAwaiting = history.filter((e) => e.event === "retake_open");

  const stats = {
    pending: certifications.length,
    retakeAwaiting: retakeAwaiting.length,
    approved: history.filter((e) => e.event === "approved").length,
    rejected: history.filter((e) => e.event === "rejected").length,
    total: history.length,
  };

  return { history, certifications, retakeAwaiting, stats };
}
