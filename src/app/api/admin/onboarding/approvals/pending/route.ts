import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET all pending approvals
export async function GET() {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get pending step approvals
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

  // Get pending course approvals
  const pendingCourses = await prisma.courseEmployeeProgress.findMany({
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

  // Get pending quiz approvals
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

  return NextResponse.json({
    steps: pendingSteps,
    courses: pendingCourses,
    quizzes: pendingQuizzes,
    total: pendingSteps.length + pendingCourses.length + pendingQuizzes.length
  });
}