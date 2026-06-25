import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET user's dynamic onboarding flow
export async function GET() {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get active template
  const activeTemplate = await (prisma as any).onboardingTemplate.findFirst({
    where: { isActive: true },
    include: {
      steps: {
        orderBy: { order: "asc" }
      },
      teamIntros: {
        orderBy: { order: "asc" },
        where: {
          employees: {
            some: { userId: user.id }
          }
        },
        include: {
          employees: {
            where: { userId: user.id },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      },
      courses: {
        orderBy: { order: "asc" },
        where: {
          employeeProgress: {
            some: { userId: user.id }
          }
        },
        include: {
          course: true,
          employeeProgress: {
            where: { userId: user.id }
          },
          quizzes: {
            where: { isActive: true },
            include: {
              questions: {
                orderBy: { order: "asc" }
              },
              attempts: {
                where: { userId: user.id },
                orderBy: { createdAt: "desc" }
              }
            }
          }
        }
      }
    }
  });

  if (!activeTemplate) {
    return NextResponse.json({ error: "No active onboarding template found" }, { status: 404 });
  }

  // Get user's step progress
  const stepProgress = await prisma.userOnboardingProgress.findMany({
    where: { userId: user.id },
    include: {
      step: true,
      approver: {
        select: {
          id: true,
          name: true,
          email: true
        }
      } as any
    },
    orderBy: {
      step: { order: "asc" }
    }
  });

  // Calculate overall progress
  const totalSteps = activeTemplate.steps.length;
  const completedSteps = stepProgress.filter(p => p.status === "DONE" && p.approvedAt).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Build dynamic steps with status
  const dynamicSteps = activeTemplate.steps.map((step: any, index: number) => {
    const progress = stepProgress.find(p => p.stepId === step.id);
    let status = "LOCKED";
    
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
      ...step,
      status,
      progress
    };
  });

  return NextResponse.json({
    template: activeTemplate,
    steps: dynamicSteps,
    stepProgress,
    overallProgress: {
      completed: completedSteps,
      total: totalSteps,
      percent: progressPercent
    }
  });
}