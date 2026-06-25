import { prisma } from "./db";

/**
 * Edge case handlers for the dynamic onboarding system
 */

export class OnboardingEdgeCaseHandler {
  /**
   * Handle course deletion during employee progress
   */
  static async handleCourseDeletion(courseId: string) {
    // Find all affected assignments
    const assignments = await prisma.onboardingCourseAssignment.findMany({
      where: { courseId },
      include: {
        employeeProgress: true
      }
    });

    // Soft delete by marking as inactive or handle reassignment
    for (const assignment of assignments) {
      // Notify affected employees
      // Mark progress as cancelled
      await prisma.courseEmployeeProgress.updateMany({
        where: { assignmentId: assignment.id },
        data: { status: "CANCELLED" }
      });
    }

    return { handled: assignments.length };
  }

  /**
   * Handle employee reassignment mid-flow
   */
  static async handleEmployeeReassignment(userId: string, oldTemplateId: string, newTemplateId: string) {
    // Get current progress
    const currentProgress = await prisma.userOnboardingProgress.findMany({
      where: { userId },
      include: { step: true }
    });

    // Calculate completion percentage
    const completedSteps = currentProgress.filter(p => p.approvedAt).length;
    const totalSteps = currentProgress.length;
    const completionPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Initialize new template progress
    const newTemplate = await prisma.onboardingTemplate.findUnique({
      where: { id: newTemplateId },
      include: { steps: { orderBy: { order: "asc" } } }
    });

    if (!newTemplate) {
      throw new Error("New template not found");
    }

    // Create progress for new template
    // Skip steps that are equivalent to completed ones
    await prisma.userOnboardingProgress.createMany({
      data: newTemplate.steps.map((step, index) => ({
        userId,
        stepId: step.id,
        status: index === 0 ? "ACTIVE" : "LOCKED"
      })),
      skipDuplicates: true
    });

    // Archive old progress
    await prisma.userOnboardingProgress.updateMany({
      where: { 
        userId,
        step: { templateId: oldTemplateId }
      },
      data: { status: "ARCHIVED" }
    });

    return { completionPercent, newSteps: newTemplate.steps.length };
  }

  /**
   * Handle rejected approvals
   */
  static async handleApprovalRejection(
    type: "step" | "course" | "quiz",
    itemId: string,
    rejectionReason: string,
    rejectedBy: string
  ) {
    switch (type) {
      case "step":
        return await prisma.userOnboardingProgress.update({
          where: { id: itemId },
          data: {
            status: "REJECTED",
            approvalNotes: rejectionReason,
            approvedBy: rejectedBy,
            approvedAt: new Date()
          }
        });

      case "course":
        return await prisma.courseEmployeeProgress.update({
          where: { id: itemId },
          data: {
            status: "REJECTED",
            approvalNotes: rejectionReason,
            approvedBy: rejectedBy,
            approvedAt: new Date()
          }
        });

      case "quiz":
        return await prisma.quizAttempt.update({
          where: { id: itemId },
          data: {
            approvalNotes: rejectionReason,
            approvedBy: rejectedBy,
            approvedAt: new Date()
          }
        });

      default:
        throw new Error("Invalid approval type");
    }
  }

  /**
   * Handle missing approval states
   */
  static async handleMissingApprovalStates(userId: string) {
    // Find all items that should have approval but don't
    const stepsNeedingApproval = await prisma.userOnboardingProgress.findMany({
      where: {
        userId,
        status: "DONE",
        approvedAt: null,
        completedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
        }
      }
    });

    const coursesNeedingApproval = await prisma.courseEmployeeProgress.findMany({
      where: {
        userId,
        status: "DONE",
        approvedAt: null,
        completedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    const quizzesNeedingApproval = await prisma.quizAttempt.findMany({
      where: {
        userId,
        passed: true,
        approvedAt: null,
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    return {
      steps: stepsNeedingApproval.length,
      courses: coursesNeedingApproval.length,
      quizzes: quizzesNeedingApproval.length,
      total: stepsNeedingApproval.length + coursesNeedingApproval.length + quizzesNeedingApproval.length
    };
  }

  /**
   * Handle empty onboarding configuration
   */
  static async handleEmptyConfiguration() {
    const activeTemplate = await prisma.onboardingTemplate.findFirst({
      where: { isActive: true }
    });

    if (!activeTemplate) {
      // Create emergency default template
      const template = await prisma.onboardingTemplate.create({
        data: {
          name: "Emergency Default Template",
          description: "Auto-generated template due to missing configuration",
          isActive: true,
          steps: {
            create: [
              {
                slug: "emergency-step-1",
                order: 1,
                title: "Contact Administrator",
                day: "Immediate",
                duration: "N/A",
                type: "Manual",
                description: "Please contact your administrator to set up proper onboarding."
              }
            ]
          }
        }
      });

      return { created: true, templateId: template.id };
    }

    return { created: false };
  }

  /**
   * Handle duplicate quiz attempts
   */
  static async handleDuplicateQuizAttempts(userId: string, quizId: string) {
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        courseQuizId: quizId
      },
      orderBy: { createdAt: "desc" }
    });

    if (attempts.length === 0) return { duplicates: 0 };

    // Check for duplicates within short time frame (less than 1 minute)
    const now = new Date();
    const duplicates = attempts.filter((attempt, index) => {
      if (index === attempts.length - 1) return false;
      const timeDiff = now.getTime() - new Date(attempt.createdAt).getTime();
      return timeDiff < 60000; // Less than 1 minute
    });

    // Remove duplicate attempts
    for (const duplicate of duplicates) {
      await prisma.quizAttempt.delete({
        where: { id: duplicate.id }
      });
    }

    return { duplicates: duplicates.length, remaining: attempts.length - duplicates.length };
  }

  /**
   * Handle partially assigned courses
   */
  static async handlePartialAssignments(templateId: string) {
    const template = await prisma.onboardingTemplate.findUnique({
      where: { id: templateId },
      include: {
        courses: {
          include: {
            employeeProgress: true
          }
        }
      }
    });

    if (!template) return { handled: 0 };

    let handled = 0;

    for (const course of template.courses) {
      // Check if course has any employee assignments
      if (course.employeeProgress.length === 0) {
        // Course exists but no employees assigned
        // This might be intentional, so we just report it
        console.log(`Course ${course.title} has no employee assignments`);
      } else {
        // Check if all employees have consistent progress
        const statuses = new Set(course.employeeProgress.map(p => p.status));
        if (statuses.size > 1) {
          // Mixed statuses - might need attention
          console.log(`Course ${course.title} has mixed progress statuses:`, Array.from(statuses));
          handled++;
        }
      }
    }

    return { handled };
  }

  /**
   * Validate onboarding state consistency
   */
  static async validateStateConsistency(userId: string) {
    const issues: string[] = [];

    // Check step progression
    const steps = await prisma.userOnboardingProgress.findMany({
      where: { userId },
      include: { step: true },
      orderBy: { step: { order: "asc" } }
    });

    for (let i = 0; i < steps.length; i++) {
      const current = steps[i];
      const previous = i > 0 ? steps[i - 1] : null;

      // If current step is active or completed, previous should be approved
      if ((current.status === "ACTIVE" || current.status === "DONE") && previous) {
        if (!previous.approvedAt) {
          issues.push(`Step ${current.step.title} is ${current.status} but previous step ${previous.step.title} is not approved`);
        }
      }

      // If current is locked, previous should not be active
      if (current.status === "LOCKED" && previous && previous.status === "ACTIVE") {
        issues.push(`Step ${current.step.title} is locked but previous step ${previous.step.title} is still active`);
      }
    }

    // Check course-quiz dependency
    const courseProgress = await prisma.courseEmployeeProgress.findMany({
      where: { userId },
      include: {
        assignment: {
          include: {
            quizzes: {
              include: {
                attempts: {
                  where: { userId }
                }
              }
            }
          }
        }
      }
    });

    for (const progress of courseProgress) {
      for (const quiz of progress.assignment.quizzes) {
        if (quiz.attempts.length > 0 && progress.status !== "APPROVED") {
          issues.push(`Quiz attempts exist for ${quiz.title} but course is not approved`);
        }
      }
    }

    return { issues, hasIssues: issues.length > 0 };
  }

  /**
   * Reset user onboarding progress (admin function)
   */
  static async resetUserProgress(userId: string) {
    // Archive all existing progress
    await prisma.userOnboardingProgress.updateMany({
      where: { userId },
      data: { status: "RESET" }
    });

    await prisma.courseEmployeeProgress.updateMany({
      where: { userId },
      data: { status: "RESET" }
    });

    // Re-initialize
    const template = await prisma.onboardingTemplate.findFirst({
      where: { isActive: true },
      include: { steps: { orderBy: { order: "asc" } } }
    });

    if (template) {
      await prisma.userOnboardingProgress.createMany({
        data: template.steps.map((step, index) => ({
          userId,
          stepId: step.id,
          status: index === 0 ? "ACTIVE" : "LOCKED"
        })),
        skipDuplicates: true
      });
    }

    return { reset: true };
  }
}