import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get all enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
    });

    // Get all lesson progress
    const lessonProgress = await prisma.lessonProgress.findMany({
      where: { userId: user.id },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    // Get learning streak
    const streak = await prisma.learningStreak.findUnique({
      where: { userId: user.id },
    });

    // Get achievements
    const achievements = await prisma.achievement.findMany({
      include: {
        users: {
          where: { userId: user.id },
        },
      },
    });

    // Calculate overall statistics
    const totalCourses = enrollments.length;
    const completedCourses = enrollments.filter((e) => e.status === "COMPLETED").length;
    const inProgressCourses = enrollments.filter((e) => e.status === "IN_PROGRESS").length;
    const notStartedCourses = enrollments.filter((e) => e.status === "NOT_STARTED").length;

    const totalLessons = enrollments.reduce((sum, e) => {
      return sum + e.course.modules.reduce((s, m) => s + m.lessons.length, 0);
    }, 0);

    const completedLessons = lessonProgress.filter((lp) => lp.completed).length;

    const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    // Course-wise progress
    const courseProgress = enrollments.map((enrollment) => {
      const totalLessons = enrollment.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
      const completedLessons = lessonProgress.filter((lp) =>
        enrollment.course.modules.some((m) => m.id === lp.lesson.moduleId)
      ).length;

      const moduleProgress = enrollment.course.modules.map((module) => {
        const moduleTotalLessons = module.lessons.length;
        const moduleCompletedLessons = lessonProgress.filter((lp) =>
          module.lessons.some((l) => l.id === lp.lessonId)
        ).length;

        return {
          moduleId: module.id,
          moduleName: module.title,
          totalLessons: moduleTotalLessons,
          completedLessons: moduleCompletedLessons,
          progress: moduleTotalLessons > 0 ? (moduleCompletedLessons / moduleTotalLessons) * 100 : 0,
        };
      });

      return {
        courseId: enrollment.courseId,
        courseName: enrollment.course.title,
        courseDescription: enrollment.course.description,
        status: enrollment.status,
        progressPercent: enrollment.progressPercent,
        totalModules: enrollment.course.modules.length,
        totalLessons,
        completedLessons,
        moduleProgress,
        lastActivityAt: enrollment.lastActivityAt,
      };
    });

    // Recent activity
    const recentActivity = lessonProgress.slice(0, 10).map((lp) => ({
      lessonId: lp.lessonId,
      lessonTitle: lp.lesson.title,
      moduleName: lp.lesson.module.title,
      courseName: lp.lesson.module.course.title,
      completed: lp.completed,
      completedAt: lp.completedAt,
      watchPercent: lp.watchPercent,
    }));

    return NextResponse.json({
      overall: {
        totalCourses,
        completedCourses,
        inProgressCourses,
        notStartedCourses,
        overallProgress,
        currentStreak: streak?.currentStreak || 0,
        longestStreak: streak?.longestStreak || 0,
      },
      courseProgress,
      recentActivity,
      achievements: achievements.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        icon: a.icon,
        earned: a.users.length > 0,
        earnedAt: a.users[0]?.earnedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching trainee progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
