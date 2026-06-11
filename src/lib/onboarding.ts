import { prisma } from "./db";
import type { OnboardingStatus } from "./onboarding-data";

export type OnboardingStepView = {
  id: string;
  slug: string;
  title: string;
  day: string;
  duration: string;
  type: string;
  description: string;
  status: OnboardingStatus;
};

const STATUS_MAP: Record<string, OnboardingStatus> = {
  DONE: "done",
  ACTIVE: "active",
  PENDING: "pending",
  LOCKED: "locked",
};

export function toUiStatus(dbStatus: string): OnboardingStatus {
  return STATUS_MAP[dbStatus] ?? "locked";
}

export async function initOnboardingForUser(userId: string) {
  const steps = await prisma.onboardingStep.findMany({ orderBy: { order: "asc" } });
  if (steps.length === 0) return;

  const existing = await prisma.userOnboardingProgress.count({ where: { userId } });
  if (existing > 0) return;

  await prisma.userOnboardingProgress.createMany({
    data: steps.map((step, index) => ({
      userId,
      stepId: step.id,
      status: index === 0 ? "ACTIVE" : "LOCKED",
    })),
  });
}

export async function getUserOnboardingSteps(userId: string): Promise<OnboardingStepView[]> {
  await initOnboardingForUser(userId);

  const progress = await prisma.userOnboardingProgress.findMany({
    where: { userId },
    include: { step: true },
    orderBy: { step: { order: "asc" } },
  });

  return progress.map(({ step, status }) => ({
    id: step.id,
    slug: step.slug,
    title: step.title,
    day: step.day,
    duration: step.duration,
    type: step.type,
    description: step.description,
    status: toUiStatus(status),
  }));
}

export function onboardingProgressFromSteps(steps: OnboardingStepView[]) {
  const completed = steps.filter((step) => step.status === "done").length;
  return {
    completed,
    total: steps.length,
    percent: steps.length ? Math.round((completed / steps.length) * 100) : 0,
  };
}

export async function markStepDone(userId: string, stepId: string) {
  const progress = await prisma.userOnboardingProgress.findUnique({
    where: { userId_stepId: { userId, stepId } },
    include: { step: true },
  });
  if (!progress) return null;

  await prisma.userOnboardingProgress.update({
    where: { id: progress.id },
    data: { status: "DONE", completedAt: new Date() },
  });

  const nextStep = await prisma.onboardingStep.findFirst({
    where: { order: progress.step.order + 1 },
  });
  if (nextStep) {
    await prisma.userOnboardingProgress.updateMany({
      where: { userId, stepId: nextStep.id, status: "LOCKED" },
      data: { status: "ACTIVE" },
    });
  }

  return getUserOnboardingSteps(userId);
}

export async function recordCertification(
  userId: string,
  projectKey: string,
  score: number,
  passed: boolean
) {
  await prisma.projectCertification.upsert({
    where: { userId_projectKey: { userId, projectKey } },
    create: { userId, projectKey, score, passed },
    update: { score, passed, certifiedAt: new Date() },
  });

  if (passed) {
    const certStep = await prisma.onboardingStep.findUnique({
      where: { slug: "certification-quiz" },
    });
    if (certStep) await markStepDone(userId, certStep.id);
  }
}
