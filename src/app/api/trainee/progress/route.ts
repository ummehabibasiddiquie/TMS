import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recalculateUserEnrollments } from "@/lib/progress";
import { getDayWisePlan } from "@/lib/day-wise-training";

export async function GET() {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await recalculateUserEnrollments(user.id);

    const [dayWise, enrollments, lessonProgress, streak, achievements] = await Promise.all([
      getDayWisePlan(user.id),
      prisma.enrollment.findMany({
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
      }),
      prisma.lessonProgress.findMany({
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
      }),
      prisma.learningStreak.findUnique({
        where: { userId: user.id },
      }),
      prisma.achievement.findMany({
        include: {
          users: {
            where: { userId: user.id },
          },
        },
      }),
    ]);

    const totalCourses = enrollments.length;
    const completedCourses = enrollments.filter((e) => e.status === "COMPLETED").length;
    const inProgressCourses = enrollments.filter((e) => e.status === "IN_PROGRESS").length;
    const notStartedCourses = enrollments.filter((e) => e.status === "NOT_STARTED").length;

    const totalLessons = enrollments.reduce((sum, e) => {
      return sum + e.course.modules.reduce((s, m) => s + m.lessons.length, 0);
    }, 0);

    const completedLessons = lessonProgress.filter((lp) => lp.completed).length;
    const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    const courseProgress = enrollments.map((enrollment) => {
      const courseTotalLessons = enrollment.course.modules.reduce(
        (sum, m) => sum + m.lessons.length,
        0
      );
      const courseCompletedLessons = lessonProgress.filter((lp) =>
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
          progress:
            moduleTotalLessons > 0
              ? (moduleCompletedLessons / moduleTotalLessons) * 100
              : 0,
        };
      });

      return {
        courseId: enrollment.courseId,
        courseName: enrollment.course.title,
        courseDescription: enrollment.course.description,
        status: enrollment.status,
        progressPercent: enrollment.progressPercent,
        totalModules: enrollment.course.modules.length,
        totalLessons: courseTotalLessons,
        completedLessons: courseCompletedLessons,
        moduleProgress,
        lastActivityAt: enrollment.lastActivityAt,
      };
    });

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
      dayWise: {
        source: dayWise.source,
        currentDay: dayWise.currentDay,
        totalDays: dayWise.totalDays,
        plannedDays: dayWise.plannedDays,
        overallPercent: dayWise.overallPercent,
        readyForProduction: dayWise.readyForProduction,
        trainingStatus: dayWise.trainingStatus,
        trainingStart: dayWise.trainingStart,
        dueSummary: dayWise.dueSummary,
        todayPercent: dayWise.today?.percent ?? 0,
        todayTitle: dayWise.today?.title ?? null,
        todayDone: dayWise.today?.done ?? false,
        todayCompleted: dayWise.today?.completedCount ?? 0,
        todayTotal: dayWise.today?.totalCount ?? 0,
        todayDue: dayWise.today?.due ?? null,
        days: dayWise.allDays.map((d) => ({
          ...d,
          status:
            d.dayNumber === dayWise.currentDay
              ? "current"
              : d.done
                ? "done"
                : d.dayNumber < dayWise.currentDay
                  ? "open"
                  : "upcoming",
        })),
      },
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
      achievements: achievements
        .filter((a) => a.users.length > 0)
        .map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          icon: a.icon,
          earned: true,
          earnedAt: a.users[0]?.earnedAt,
        })),
    });
  } catch (error) {
    console.error("Error fetching trainee progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
