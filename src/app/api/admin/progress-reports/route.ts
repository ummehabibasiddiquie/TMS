import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const searchQuery = searchParams.get("search") || "";
  const projectFilter = searchParams.get("project") || "all";
  const statusFilter = searchParams.get("status") || "all";
  const dateFilter = searchParams.get("date") || "";

  try {
    // Get all trainees
    const trainees = await prisma.user.findMany({
      where: {
        role: "TRAINEE",
        ...(searchQuery && {
          OR: [
            { name: { contains: searchQuery } },
            { email: { contains: searchQuery } },
          ],
        }),
      },
      include: {
        traineeProfile: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            qa: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        projectAssignments: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                active: true,
              },
            },
          },
        },
        certifications: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        lessonProgress: {
          include: {
            lesson: {
              include: {
                module: {
                  select: {
                    courseId: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Process each trainee's progress data
    const reports = trainees.map((trainee: any) => {
      const profile = trainee.traineeProfile;
      const assignments = trainee.projectAssignments;
      const certifications = trainee.certifications;
      const enrollments = trainee.enrollments;
      const lessonProgress = trainee.lessonProgress;

      // Get assigned projects
      const assignedProjects = assignments.map((a: any) => ({
        id: a.project.id,
        name: a.project.name,
        active: a.project.active,
        status: a.status,
      }));

      // Get certification status
      const certificationStatus = certifications.length > 0
        ? certifications.some((c: any) => c.passed)
          ? "Passed"
          : "Failed"
        : "-";

      // Calculate onboarding progress
      const totalLessons = lessonProgress.length;
      const completedLessons = lessonProgress.filter((lp: any) => lp.completed).length;
      const progressText = totalLessons > 0
        ? `${completedLessons} / ${totalLessons}`
        : "0 / 0";

      // Determine overall status
      let overallStatus = "Pending";
      if (completedLessons > 0 && completedLessons < totalLessons) {
        overallStatus = "In Progress";
      } else if (completedLessons === totalLessons && totalLessons > 0) {
        overallStatus = "Complete";
      }

      // Get last activity
      const lastActivity = lessonProgress.length > 0
        ? new Date(
            Math.max(...lessonProgress.map((lp: any) => new Date(lp.updatedAt || lp.completedAt || 0).getTime()))
          )
        : new Date(trainee.createdAt);

      // Apply project filter
      if (projectFilter !== "all") {
        const hasProjectInFilter = assignedProjects.some(
          (p: any) => p.id === projectFilter
        );
        if (!hasProjectInFilter) return null;
      }

      // Apply status filter
      if (statusFilter !== "all") {
        if (statusFilter === "complete" && overallStatus !== "Complete") return null;
        if (statusFilter === "in-progress" && overallStatus !== "In Progress") return null;
        if (statusFilter === "pending" && overallStatus !== "Pending") return null;
      }

      // Apply date filter
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        const activityDate = new Date(lastActivity);
        if (activityDate < filterDate) return null;
      }

      return {
        id: trainee.id,
        name: trainee.name,
        email: trainee.email,
        department: profile?.trainingStatus || "Not Assigned",
        steps: progressText,
        quiz: certificationStatus,
        certified: certifications.some((c: any) => c.passed) ? "Yes" : "No",
        status: overallStatus,
        lastActive: lastActivity.toLocaleDateString(),
        projects: assignedProjects,
        trainer: profile?.trainer?.name || "-",
        qa: profile?.qa?.name || "-",
      };
    }).filter((report) => report !== null);

    // Get available projects for filter
    const projects = await prisma.project.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    // Calculate statistics
    const totalEmployees = reports.length;
    const fullyOnboarded = reports.filter((r) => r.status === "Complete").length;
    const avgCompletion = totalEmployees > 0
      ? Math.round((fullyOnboarded / totalEmployees) * 100)
      : 0;

    return NextResponse.json({
      reports,
      statistics: {
        totalEmployees,
        fullyOnboarded,
        avgCompletion: `${avgCompletion}%`,
      },
      projects,
    });
  } catch (error) {
    console.error("Progress reports error:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress reports" },
      { status: 500 }
    );
  }
}