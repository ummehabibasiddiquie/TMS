import { prisma } from "./db";
import { getDayWisePlan } from "./day-wise-training";
import { getEvaluationBand, type EvaluationBandInfo } from "./evaluation";

export type FinalQuizQuestionPublic = {
  id: string;
  question: string;
  options: string;
  sortOrder: number;
};

export type FinalQuizAttemptSummary = {
  cycle: number;
  score: number;
  passed: boolean;
  createdAt: string;
};

type FinalQuizCertRow = {
  status: string;
  reviewedById?: string | null;
};

/** Trainee-visible only after Admin / Team Lead explicitly approves. */
export function resolveFinalQuizCertStatus(
  cert: FinalQuizCertRow | null | undefined
): "PENDING_REVIEW" | "APPROVED" | "REJECTED" | null {
  if (!cert) return null;
  if (cert.status === "REJECTED") return "REJECTED";
  if (cert.status === "APPROVED" && cert.reviewedById) return "APPROVED";
  return "PENDING_REVIEW";
}

export function isFinalQuizCertVisibleToTrainee(
  cert: FinalQuizCertRow | null | undefined
): boolean {
  return resolveFinalQuizCertStatus(cert) === "APPROVED";
}

export type FinalQuizState = {
  scheduleComplete: boolean;
  unlocked: boolean;
  quiz: {
    id: string;
    title: string;
    description: string | null;
    passingScore: number;
    questionCount: number;
    questions?: FinalQuizQuestionPublic[];
  } | null;
  cycle: number;
  attempted: boolean;
  attempt: {
    id: string;
    score: number;
    passed: boolean;
    createdAt: string;
    cycle: number;
  } | null;
  previousAttempts: FinalQuizAttemptSummary[];
  /** True when Admin bumped the cycle — trainee may retake; prior scores stay on record. */
  retakeGranted: boolean;
  canSubmit: boolean;
  certificateStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | null;
  certificateReviewNote?: string | null;
  certificateReviewedBy?: { id: string; name: string; role: string } | null;
  band: EvaluationBandInfo;
  message?: string;
};

async function getActiveQuiz() {
  const client = prisma as typeof prisma & {
    finalEvaluationQuiz?: typeof prisma.finalEvaluationQuiz;
  };
  if (!client.finalEvaluationQuiz) {
    throw new Error(
      "Prisma client is missing FinalEvaluationQuiz. Restart the dev server after running: npx prisma generate"
    );
  }
  return client.finalEvaluationQuiz.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getOrCreateEvaluationCycle(userId: string): Promise<number> {
  const profile = await prisma.traineeProfile.findUnique({
    where: { userId },
    select: { evaluationCycle: true },
  });
  if (profile) return profile.evaluationCycle ?? 1;

  await prisma.traineeProfile.create({
    data: {
      userId,
      trainingStarted: true,
      trainingStatus: "IN_TRAINING",
      evaluationCycle: 1,
    },
  });
  return 1;
}

/** Trainee-facing state for the final evaluation quiz. */
export async function getFinalQuizState(
  userId: string,
  opts?: { includeQuestions?: boolean }
): Promise<FinalQuizState> {
  const plan = await getDayWisePlan(userId);
  const scheduleComplete =
    plan.totalDays > 0 && plan.allDays.every((d) => d.done);
  const cycle = await getOrCreateEvaluationCycle(userId);
  const quiz = await getActiveQuiz();

  if (!quiz) {
    return {
      scheduleComplete,
      unlocked: false,
      quiz: null,
      cycle,
      attempted: false,
      attempt: null,
      previousAttempts: [],
      retakeGranted: false,
      canSubmit: false,
      certificateStatus: null,
      band: getEvaluationBand(null),
      message: "No final evaluation quiz is configured yet. Contact Admin.",
    };
  }

  const previousRows = await prisma.finalEvaluationAttempt.findMany({
    where: { userId, quizId: quiz.id, cycle: { lt: cycle } },
    orderBy: { cycle: "asc" },
    select: { cycle: true, score: true, passed: true, createdAt: true },
  });
  const previousAttempts: FinalQuizAttemptSummary[] = previousRows.map((row) => ({
    cycle: row.cycle,
    score: Math.round(row.score),
    passed: row.passed,
    createdAt: row.createdAt.toISOString(),
  }));

  const attempt = await prisma.finalEvaluationAttempt.findUnique({
    where: {
      userId_quizId_cycle: { userId, quizId: quiz.id, cycle },
    },
  });

  const unlocked = scheduleComplete;
  const attempted = Boolean(attempt);
  const retakeGranted = !attempted && previousAttempts.length > 0;
  const canSubmit = unlocked && !attempted;

  const attemptDto = attempt
    ? {
        id: attempt.id,
        score: Math.round(attempt.score),
        passed: attempt.passed,
        createdAt: attempt.createdAt.toISOString(),
        cycle: attempt.cycle,
      }
    : null;

  let certificateStatus: FinalQuizState["certificateStatus"] = null;
  let certificateReviewNote: string | null = null;
  let certificateReviewedBy: FinalQuizState["certificateReviewedBy"] = null;
  if (attempt) {
    const cert = await prisma.finalQuizCertificate.findUnique({
      where: { attemptId: attempt.id },
      select: {
        status: true,
        reviewedById: true,
        reviewNote: true,
        reviewedBy: { select: { id: true, name: true, role: true } },
      },
    });
    certificateStatus = resolveFinalQuizCertStatus(cert);
    if (certificateStatus === "REJECTED" && cert?.reviewNote) {
      certificateReviewNote = cert.reviewNote;
    }
    if (
      cert?.reviewedBy &&
      (certificateStatus === "APPROVED" || certificateStatus === "REJECTED")
    ) {
      certificateReviewedBy = cert.reviewedBy;
    }
  }

  return {
    scheduleComplete,
    unlocked,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      passingScore: quiz.passingScore,
      questionCount: quiz.questions.length,
      questions:
        opts?.includeQuestions && canSubmit
          ? quiz.questions.map((q) => ({
              id: q.id,
              question: q.question,
              options: q.options,
              sortOrder: q.sortOrder,
            }))
          : undefined,
    },
    cycle,
    attempted,
    attempt: attemptDto,
    previousAttempts,
    retakeGranted,
    canSubmit,
    certificateStatus,
    certificateReviewNote,
    certificateReviewedBy,
    band: getEvaluationBand(attemptDto?.score ?? null),
    message: !scheduleComplete
      ? "Complete all day-wise training days to unlock the final evaluation quiz."
      : retakeGranted
        ? "Admin allowed a retake. Your previous score(s) are kept on record — complete the quiz again when ready."
        : attempted && certificateStatus === "PENDING_REVIEW"
          ? "Final quiz submitted — pending Admin review. Your certificate will appear after approval."
          : attempted
            ? "Final evaluation submitted for this cycle."
            : undefined,
  };
}

export async function submitFinalEvaluationQuiz(
  userId: string,
  answers: Record<string, string>
) {
  const state = await getFinalQuizState(userId, { includeQuestions: false });
  if (!state.scheduleComplete) {
    throw new Error("Complete all day-wise training before taking the final quiz.");
  }
  if (state.attempted) {
    throw new Error("Final evaluation already submitted. Retakes are not allowed.");
  }

  const quiz = await getActiveQuiz();
  if (!quiz || quiz.questions.length === 0) {
    throw new Error("Final evaluation quiz is not available.");
  }

  const cycle = await getOrCreateEvaluationCycle(userId);

  let correct = 0;
  for (const q of quiz.questions) {
    if (answers[q.id] === q.correct) correct++;
  }
  const score =
    quiz.questions.length > 0 ? (correct / quiz.questions.length) * 100 : 0;
  // No pass mark — score is the evaluation % for Admin bands only.
  const passed = true;

  try {
    const attempt = await prisma.finalEvaluationAttempt.create({
      data: {
        userId,
        quizId: quiz.id,
        cycle,
        score,
        passed,
        answers: JSON.stringify(answers),
      },
    });

    const certificate =     await prisma.finalQuizCertificate.create({
      data: {
        userId,
        attemptId: attempt.id,
        quizTitle: quiz.title,
        score,
        cycle,
        status: "PENDING_REVIEW",
      },
    });

    if (cycle > 1) {
      const profile = await prisma.traineeProfile.findUnique({
        where: { userId },
        select: {
          finalQuizRetakeGrantedAt: true,
          finalQuizRetakeGrantedById: true,
          finalQuizRetakePreviousScore: true,
        },
      });
      const existingGrant = await prisma.finalQuizRetakeGrant.findFirst({
        where: { userId, previousCycle: cycle - 1, newCycle: cycle },
      });
      if (!existingGrant && profile?.finalQuizRetakeGrantedById) {
        const prevAttempt = await prisma.finalEvaluationAttempt.findUnique({
          where: {
            userId_quizId_cycle: { userId, quizId: quiz.id, cycle: cycle - 1 },
          },
        });
        if (prevAttempt) {
          await prisma.finalQuizRetakeGrant.create({
            data: {
              userId,
              grantedById: profile.finalQuizRetakeGrantedById,
              grantedAt: profile.finalQuizRetakeGrantedAt ?? attempt.createdAt,
              previousCycle: cycle - 1,
              newCycle: cycle,
              previousScore:
                profile.finalQuizRetakePreviousScore ?? prevAttempt.score,
            },
          });
        }
      }
    }

    await prisma.traineeProfile.updateMany({
      where: { userId },
      data: {
        trainingStatus: "AWAITING_EVALUATION",
        readyForProduction: false,
        finalQuizRetakeGrantedAt: null,
        finalQuizRetakeGrantedById: null,
        finalQuizRetakePreviousScore: null,
      },
    });

    return {
      id: attempt.id,
      score: Math.round(score),
      passed,
      cycle,
      band: getEvaluationBand(score),
      certificateId: certificate.id,
    };
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "P2002") {
      throw new Error("Final evaluation already submitted. Retakes are not allowed.");
    }
    throw err;
  }
}

/** Latest final-quiz score for the trainee's current evaluation cycle. */
export async function getTraineeEvaluationScore(userId: string): Promise<{
  score: number | null;
  cycle: number;
  attemptedAt: string | null;
  band: EvaluationBandInfo;
  scheduleComplete: boolean;
  quizTitle: string | null;
  previousAttempts: FinalQuizAttemptSummary[];
  retakePending: boolean;
  retakeGrantedAt: string | null;
  retakeGrantedBy: { id: string; name: string; role: string } | null;
  lastFinalQuizScore: number | null;
  certificateStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | null;
  certificateReviewedBy: { id: string; name: string; role: string } | null;
}> {
  const plan = await getDayWisePlan(userId);
  const scheduleComplete =
    plan.totalDays > 0 && plan.allDays.every((d) => d.done);

  const profile = await prisma.traineeProfile.findUnique({
    where: { userId },
    select: {
      evaluationCycle: true,
      finalQuizRetakeGrantedAt: true,
      finalQuizRetakePreviousScore: true,
      finalQuizRetakeGrantedBy: { select: { id: true, name: true, role: true } },
    },
  });
  const cycle = profile?.evaluationCycle ?? 1;
  const quiz = await getActiveQuiz();

  if (!quiz) {
    return {
      score: null,
      cycle,
      attemptedAt: null,
      band: getEvaluationBand(null),
      scheduleComplete,
      quizTitle: null,
      previousAttempts: [],
      retakePending: false,
      retakeGrantedAt: null,
      retakeGrantedBy: null,
      lastFinalQuizScore: null,
      certificateStatus: null,
      certificateReviewedBy: null,
    };
  }

  const previousRows = await prisma.finalEvaluationAttempt.findMany({
    where: { userId, quizId: quiz.id, cycle: { lt: cycle } },
    orderBy: { cycle: "asc" },
    select: { cycle: true, score: true, passed: true, createdAt: true },
  });
  const previousAttempts: FinalQuizAttemptSummary[] = previousRows.map((row) => ({
    cycle: row.cycle,
    score: Math.round(row.score),
    passed: row.passed,
    createdAt: row.createdAt.toISOString(),
  }));

  const attempt = await prisma.finalEvaluationAttempt.findUnique({
    where: {
      userId_quizId_cycle: { userId, quizId: quiz.id, cycle },
    },
  });

  const score = attempt ? Math.round(attempt.score) : null;
  const retakePending = !attempt && previousAttempts.length > 0;
  const lastFinalQuizScore = retakePending
    ? Math.round(
        profile?.finalQuizRetakePreviousScore ??
          previousAttempts[previousAttempts.length - 1]?.score ??
          0
      )
    : score;

  let certificateStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | null = null;
  let certificateReviewedBy: { id: string; name: string; role: string } | null = null;
  if (attempt) {
    const cert = await prisma.finalQuizCertificate.findUnique({
      where: { attemptId: attempt.id },
      select: {
        status: true,
        reviewedById: true,
        reviewedBy: { select: { id: true, name: true, role: true } },
      },
    });
    certificateStatus = resolveFinalQuizCertStatus(cert);
    if (
      cert?.reviewedBy &&
      (certificateStatus === "APPROVED" || certificateStatus === "REJECTED")
    ) {
      certificateReviewedBy = cert.reviewedBy;
    }
  }

  return {
    score,
    cycle,
    attemptedAt: attempt?.createdAt.toISOString() ?? null,
    band: getEvaluationBand(lastFinalQuizScore ?? score),
    scheduleComplete,
    quizTitle: quiz.title,
    previousAttempts,
    retakePending,
    retakeGrantedAt: profile?.finalQuizRetakeGrantedAt?.toISOString() ?? null,
    retakeGrantedBy: profile?.finalQuizRetakeGrantedBy ?? null,
    lastFinalQuizScore,
    certificateStatus,
    certificateReviewedBy,
  };
}

async function certForCurrentAttempt(traineeId: string, cycle: number) {
  const quiz = await getActiveQuiz();
  if (!quiz) return null;
  const attempt = await prisma.finalEvaluationAttempt.findUnique({
    where: {
      userId_quizId_cycle: { userId: traineeId, quizId: quiz.id, cycle },
    },
  });
  if (!attempt) return null;
  return prisma.finalQuizCertificate.findUnique({
    where: { attemptId: attempt.id },
  });
}

/** Approve a final quiz certificate by id (cert approval queue). */
/** Approve a final quiz certificate (pending or previously rejected). */
export async function approveFinalQuizCertificateById(
  certificateId: string,
  reviewerId: string
) {
  const cert = await prisma.finalQuizCertificate.findUnique({
    where: { id: certificateId },
  });
  if (!cert) {
    throw new Error("Certificate not found");
  }
  if (cert.status === "APPROVED" && cert.reviewedById) return cert;
  return prisma.finalQuizCertificate.update({
    where: { id: cert.id },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedById: reviewerId,
      certifiedAt: new Date(),
      reviewNote: null,
    },
  });
}

/** Reject a final quiz certificate (pending or previously approved). */
export async function rejectFinalQuizCertificateById(
  certificateId: string,
  reviewerId: string,
  reviewNote: string
) {
  const cert = await prisma.finalQuizCertificate.findUnique({
    where: { id: certificateId },
  });
  if (!cert) return null;
  if (cert.status === "REJECTED") return cert;
  return prisma.finalQuizCertificate.update({
    where: { id: cert.id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: reviewerId,
      reviewNote,
    },
  });
}

/** Admin — approve final quiz certificate for current cycle. */
export async function approveFinalQuizCertificateForTrainee(
  traineeId: string,
  reviewerId: string
) {
  const cycle = await getOrCreateEvaluationCycle(traineeId);
  const cert = await certForCurrentAttempt(traineeId, cycle);
  if (!cert) {
    throw new Error("No final quiz submission found for the current cycle.");
  }
  if (cert.status === "APPROVED" && cert.reviewedById) return cert;
  return prisma.finalQuizCertificate.update({
    where: { id: cert.id },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedById: reviewerId,
      certifiedAt: new Date(),
      reviewNote: null,
    },
  });
}

/** Mark final quiz certificate rejected for current cycle. */
export async function rejectFinalQuizCertificateForTrainee(
  traineeId: string,
  reviewerId: string,
  reviewNote?: string
) {
  const cycle = await getOrCreateEvaluationCycle(traineeId);
  const cert = await certForCurrentAttempt(traineeId, cycle);
  if (!cert) return null;
  if (cert.status === "REJECTED") return cert;
  return prisma.finalQuizCertificate.update({
    where: { id: cert.id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: reviewerId,
      ...(reviewNote ? { reviewNote } : {}),
    },
  });
}

/** Admin / Team Lead: allow one more final-quiz attempt (bumps evaluation cycle). */
export async function allowFinalQuizRetake(traineeId: string, grantedById: string) {
  const quiz = await getActiveQuiz();
  if (!quiz) {
    throw new Error("No final evaluation quiz is configured.");
  }

  const cycle = await getOrCreateEvaluationCycle(traineeId);
  const attempt = await prisma.finalEvaluationAttempt.findUnique({
    where: {
      userId_quizId_cycle: { userId: traineeId, quizId: quiz.id, cycle },
    },
  });
  if (!attempt) {
    throw new Error(
      "Trainee has not completed the final quiz for the current cycle yet (or a retake is already pending)."
    );
  }

  const profile = await prisma.traineeProfile.findUnique({
    where: { userId: traineeId },
    select: { trainingStatus: true, readyForProduction: true },
  });
  if (
    profile?.trainingStatus === "APPROVED_IN_ORG" ||
    profile?.readyForProduction
  ) {
    throw new Error("Cannot allow retake after the trainee is approved into the org.");
  }
  if (profile?.trainingStatus === "REJECTED") {
    throw new Error("Cannot allow retake for a rejected trainee.");
  }

  const nextCycle = cycle + 1;
  const grantedAt = new Date();
  await prisma.traineeProfile.upsert({
    where: { userId: traineeId },
    create: {
      userId: traineeId,
      trainingStarted: true,
      trainingStatus: "AWAITING_EVALUATION",
      readyForProduction: false,
      evaluationCycle: nextCycle,
      finalQuizRetakeGrantedAt: grantedAt,
      finalQuizRetakeGrantedById: grantedById,
      finalQuizRetakePreviousScore: attempt.score,
    },
    update: {
      evaluationCycle: nextCycle,
      trainingStatus: "AWAITING_EVALUATION",
      readyForProduction: false,
      finalQuizRetakeGrantedAt: grantedAt,
      finalQuizRetakeGrantedById: grantedById,
      finalQuizRetakePreviousScore: attempt.score,
    },
  });

  await prisma.finalQuizRetakeGrant.create({
    data: {
      userId: traineeId,
      grantedById,
      grantedAt,
      previousCycle: cycle,
      newCycle: nextCycle,
      previousScore: attempt.score,
    },
  });

  return {
    previousCycle: cycle,
    previousScore: Math.round(attempt.score),
    newCycle: nextCycle,
    grantedAt: grantedAt.toISOString(),
  };
}

/** Ensure a default final quiz exists (idempotent). */
export async function ensureDefaultFinalEvaluationQuiz() {
  const client = prisma as typeof prisma & {
    finalEvaluationQuiz?: typeof prisma.finalEvaluationQuiz;
  };
  if (!client.finalEvaluationQuiz) {
    throw new Error(
      "Prisma client is missing FinalEvaluationQuiz. Stop the app and run: npx prisma generate && npm run dev"
    );
  }

  const existing = await client.finalEvaluationQuiz.findFirst({
    where: { isActive: true },
  });
  if (existing) return existing;

  return client.finalEvaluationQuiz.create({
    data: {
      title: "Final Training Evaluation",
      description:
        "Evaluation after all day-wise training (including any extra week). One attempt per cycle. Your score is one evaluation input; Admin also reviews overall training performance. No pass/fail mark.",
      passingScore: 0,
      isActive: true,
      questions: {
        create: [
          {
            question: "What should you do if you are unsure about a process step?",
            options: JSON.stringify([
              "Guess and continue",
              "Ask your Team Lead / follow documented process",
              "Skip the step",
              "Wait indefinitely without communicating",
            ]),
            correct: "Ask your Team Lead / follow documented process",
            sortOrder: 0,
          },
          {
            question: "Quality work primarily means:",
            options: JSON.stringify([
              "Finishing as fast as possible only",
              "Meeting requirements with accuracy and care",
              "Ignoring feedback",
              "Skipping reviews",
            ]),
            correct: "Meeting requirements with accuracy and care",
            sortOrder: 1,
          },
          {
            question: "After training, evaluation of potential is based on:",
            options: JSON.stringify([
              "Only casual conversation",
              "This final evaluation quiz score",
              "Random chance",
              "Social media activity",
            ]),
            correct: "This final evaluation quiz score",
            sortOrder: 2,
          },
        ],
      },
    },
  });
}
