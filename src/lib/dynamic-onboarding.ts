import { prisma } from "./db";

export type OnboardingStepStatus = "LOCKED" | "ACTIVE" | "DONE" | "PENDING_APPROVAL" | "APPROVED" | "COMPLETED";

export interface DynamicOnboardingStep {
  id: string;
  slug: string;
  order: number;
  title: string;
  day: string;
  duration: string;
  type: string;
  description: string;
  status: OnboardingStepStatus;
  progress?: any;
}

export interface OnboardingProgress {
  completed: number;
  total: number;
  percent: number;
}

export async function getActiveOnboardingTemplate() {
  return await (prisma as any).onboardingTemplate.findFirst({
    where: { isActive: true },
    include: {
      steps: {
        orderBy: { order: "asc" }
      },
      teamIntros: {
        orderBy: { order: "asc" }
      },
      courses: {
        orderBy: { order: "asc" },
        include: {
          course: true,
          employeeProgress: true,
          quizzes: {
            where: { isActive: true },
            include: {
              questions: {
                orderBy: { order: "asc" }
              }
            }
          }
        }
      }
    }
  });
}

export async function initializeUserOnboarding(userId: string, templateId?: string) {
  const template = templateId
    ? await (prisma as any).onboardingTemplate.findUnique({
        where: { id: templateId },
        include: { steps: { orderBy: { order: "asc" } } }
      })
    : await getActiveOnboardingTemplate();

  if (!template || template.steps.length === 0) {
    return null;
  }

  // Check if user already has progress
  const existingProgress = await prisma.userOnboardingProgress.count({
    where: { userId }
  });

  if (existingProgress > 0) {
    return null;
  }

  // Initialize progress for all steps
  await prisma.userOnboardingProgress.createMany({
    data: template.steps.map((step: any, index: number) => ({
      userId,
      stepId: step.id,
      status: index === 0 ? "ACTIVE" : "LOCKED"
    }))
  });

  return template;
}

export async function getUserDynamicOnboarding(userId: string) {
  // Initialize if needed
  await initializeUserOnboarding(userId);

  const template = await getActiveOnboardingTemplate();
  if (!template) {
    return null;
  }

  // Get user's step progress
  const stepProgress = await prisma.userOnboardingProgress.findMany({
    where: { userId },
    include: {
      step: true,
      approver: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      step: { order: "asc" }
    }
  });

  // Build dynamic steps with computed status
  const dynamicSteps: DynamicOnboardingStep[] = template.steps.map((step: any, index: number) => {
    const progress = stepProgress.find(p => p.stepId === step.id);
    let status: OnboardingStepStatus = "LOCKED";

    if (progress) {
      if (progress.approvedAt) {
        status = "COMPLETED";
      } else if (progress.status === "DONE") {
        status = "PENDING_APPROVAL";
      } else if (progress.status === "ACTIVE") {
        status = "ACTIVE";
      }
    } else if (index === 0) {
      status = "ACTIVE";
    }

    return {
      id: step.id,
      slug: step.slug,
      order: step.order,
      title: step.title,
      day: step.day,
      duration: step.duration,
      type: step.type,
      description: step.description,
      status,
      progress
    };
  });

  // Calculate overall progress
  const totalSteps = template.steps.length;
  const completedSteps = stepProgress.filter(p => p.approvedAt).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return {
    template,
    steps: dynamicSteps,
    stepProgress,
    overallProgress: {
      completed: completedSteps,
      total: totalSteps,
      percent: progressPercent
    }
  };
}

export async function completeOnboardingStep(userId: string, stepId: string) {
  const progress = await prisma.userOnboardingProgress.findUnique({
    where: { userId_stepId: { userId, stepId } },
    include: { step: true }
  });

  if (!progress) {
    throw new Error("Progress not found");
  }

  if (progress.status !== "ACTIVE") {
    throw new Error("Step is not active");
  }

  const updatedProgress = await prisma.userOnboardingProgress.update({
    where: { id: progress.id },
    data: {
      status: "DONE",
      completedAt: new Date()
    },
    include: {
      step: true
    }
  });

  return updatedProgress;
}

export async function approveOnboardingStep(
  approverId: string,
  userId: string,
  stepId: string,
  approvalNotes?: string
) {
  const progress = await prisma.userOnboardingProgress.findUnique({
    where: { userId_stepId: { userId, stepId } },
    include: { step: true }
  });

  if (!progress) {
    throw new Error("Progress not found");
  }

  if (progress.status !== "DONE") {
    throw new Error("Step must be completed before approval");
  }

  if (progress.approvedAt) {
    throw new Error("Step already approved");
  }

  const updatedProgress = await prisma.userOnboardingProgress.update({
    where: { id: progress.id },
    data: {
      approvedAt: new Date(),
      approvedBy: approverId,
      approvalNotes
    },
    include: {
      step: true,
      approver: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  // Unlock next step
  const nextStep = await prisma.onboardingStep.findFirst({
    where: { order: progress.step.order + 1 }
  });

  if (nextStep) {
    await prisma.userOnboardingProgress.updateMany({
      where: { userId, stepId: nextStep.id, status: "LOCKED" },
      data: { status: "ACTIVE" }
    });
  }

  return updatedProgress;
}

export async function completeCourse(userId: string, progressId: string) {
  const progress = await (prisma as any).courseEmployeeProgress.findUnique({
    where: { id: progressId },
    include: { assignment: true }
  });

  if (!progress) {
    throw new Error("Progress not found");
  }

  if (progress.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (progress.status === "DONE" || progress.status === "APPROVED") {
    throw new Error("Course already completed");
  }

  const updatedProgress = await (prisma as any).courseEmployeeProgress.update({
    where: { id: progressId },
    data: {
      status: "DONE",
      completedAt: new Date()
    },
    include: {
      assignment: {
        include: {
          course: true
        }
      }
    }
  });

  return updatedProgress;
}

export async function approveCourseCompletion(
  approverId: string,
  progressId: string,
  approvalNotes?: string
) {
  const progress = await (prisma as any).courseEmployeeProgress.findUnique({
    where: { id: progressId },
    include: { assignment: true }
  });

  if (!progress) {
    throw new Error("Progress not found");
  }

  if (progress.status !== "DONE") {
    throw new Error("Course must be completed before approval");
  }

  if (progress.approvedAt) {
    throw new Error("Course already approved");
  }

  const updatedProgress = await (prisma as any).courseEmployeeProgress.update({
    where: { id: progressId },
    data: {
      approvedAt: new Date(),
      approvedBy: approverId,
      approvalNotes,
      status: "APPROVED"
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      approver: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return updatedProgress;
}

export async function submitQuizAttempt(
  userId: string,
  quizId: string,
  answers: Record<string, any>
) {
  const quiz = await (prisma as any).courseQuiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: "asc" }
      },
      assignment: {
        include: {
          employeeProgress: {
            where: { userId }
          }
        }
      }
    }
  });

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  // Check if course is approved
  const courseProgress = quiz.assignment.employeeProgress[0];
  if (!courseProgress || courseProgress.status !== "APPROVED") {
    throw new Error("Course must be approved before taking quiz");
  }

  // Check attempt limit
  const existingAttempts = await prisma.quizAttempt.count({
    where: {
      userId,
      courseQuizId: quizId
    }
  });

  if (existingAttempts >= quiz.maxAttempts) {
    throw new Error("Maximum attempts reached");
  }

  // Calculate score
  let correct = 0;
  quiz.questions.forEach((question: any) => {
    const userAnswer = answers[question.id];
    const correctAnswer = JSON.parse(question.correct);
    if (JSON.stringify(userAnswer) === JSON.stringify(correctAnswer)) {
      correct++;
    }
  });

  const score = (correct / quiz.questions.length) * 100;
  const passed = score >= quiz.passingScore;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      courseQuizId: quizId,
      score,
      passed,
      answers: JSON.stringify(answers)
    }
  });

  return {
    attempt,
    score,
    passed,
    correct,
    total: quiz.questions.length,
    passingScore: quiz.passingScore
  };
}

export async function approveQuizAttempt(
  approverId: string,
  attemptId: string,
  approvalNotes?: string
) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { courseQuiz: true }
  });

  if (!attempt) {
    throw new Error("Attempt not found");
  }

  if (!attempt.passed) {
    throw new Error("Quiz must be passed before approval");
  }

  if (attempt.approvedAt) {
    throw new Error("Quiz already approved");
  }

  const updatedAttempt = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      approvedAt: new Date(),
      approvedBy: approverId,
      approvalNotes
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      approver: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return updatedAttempt;
}

export async function getPendingApprovals() {
  const pendingSteps = await prisma.userOnboardingProgress.findMany({
    where: {
      status: "DONE",
      approvedAt: null
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      step: true
    },
    orderBy: { completedAt: "desc" }
  });

  const pendingCourses = await (prisma as any).courseEmployeeProgress.findMany({
    where: {
      status: "DONE",
      approvedAt: null
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      assignment: {
        include: {
          course: true
        }
      }
    },
    orderBy: { completedAt: "desc" }
  });

  const pendingQuizzes = await prisma.quizAttempt.findMany({
    where: {
      passed: true,
      approvedAt: null,
      courseQuizId: { not: null }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      courseQuiz: {
        include: {
          assignment: {
            include: {
              course: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return {
    steps: pendingSteps,
    courses: pendingCourses,
    quizzes: pendingQuizzes,
    total: pendingSteps.length + pendingCourses.length + pendingQuizzes.length
  };
}