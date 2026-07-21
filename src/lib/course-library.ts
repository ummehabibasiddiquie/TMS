import { prisma } from "./db";
import { getDayWisePlan, resolveCurriculumScope } from "./day-wise-training";

export type LibraryLessonAccess = "locked" | "available" | "completed";

export type LibraryLesson = {
  id: string;
  title: string;
  quizCount: number;
  completed: boolean;
  watchPercent: number;
  quizPassed: boolean;
  dayNumber: number | null;
  access: LibraryLessonAccess;
};

export type LibraryModule = {
  id: string;
  title: string;
  lessons: LibraryLesson[];
};

export type LibraryCourse = {
  enrollmentId: string;
  courseId: string;
  title: string;
  description: string | null;
  status: string;
  progressPercent: number;
  totalModules: number;
  totalLessons: number;
  completedLessons: number;
  resumeLessonId: string | null;
  modules: LibraryModule[];
  source: "curriculum" | "enrollment";
};

/**
 * Course library for trainees:
 * - Prefer lessons attached to their effective day schedule (GLOBAL or personal)
 * - Fall back to enrollments if curriculum has no training lessons
 */
export async function getTraineeCourseLibrary(userId: string): Promise<{
  courses: LibraryCourse[];
  mode: "curriculum" | "enrollment" | "empty";
  currentDay: number;
}> {
  const plan = await getDayWisePlan(userId);
  const currentDay = plan.currentDay;
  const { scopeKey } = await resolveCurriculumScope(userId);

  const curriculumLinks = await prisma.curriculumDayLesson.findMany({
    where: { day: { scopeKey } },
    include: {
      day: { select: { dayNumber: true, dayType: true } },
      lesson: {
        select: {
          id: true,
          title: true,
          order: true,
          moduleId: true,
          module: {
            select: {
              id: true,
              title: true,
              order: true,
              courseId: true,
              course: {
                select: { id: true, title: true, description: true },
              },
            },
          },
          quizzes: { select: { id: true } },
          progress: { where: { userId }, take: 1 },
        },
      },
    },
    orderBy: [{ day: { dayNumber: "asc" } }, { sortOrder: "asc" }],
  });

  if (curriculumLinks.length > 0) {
    const byCourse = new Map<
      string,
      {
        course: { id: string; title: string; description: string | null };
        lessons: {
          lesson: (typeof curriculumLinks)[0]["lesson"];
          dayNumber: number;
        }[];
      }
    >();

    for (const link of curriculumLinks) {
      const course = link.lesson.module.course;
      const entry = byCourse.get(course.id) ?? {
        course,
        lessons: [],
      };
      // Keep earliest day if lesson appears on multiple days
      const existing = entry.lessons.find((l) => l.lesson.id === link.lesson.id);
      if (existing) {
        existing.dayNumber = Math.min(existing.dayNumber, link.day.dayNumber);
      } else {
        entry.lessons.push({ lesson: link.lesson, dayNumber: link.day.dayNumber });
      }
      byCourse.set(course.id, entry);
    }

    const courses: LibraryCourse[] = [...byCourse.values()].map(({ course, lessons }) => {
      const modulesMap = new Map<string, LibraryModule>();

      for (const { lesson, dayNumber } of lessons) {
        const mod = lesson.module;
        if (!modulesMap.has(mod.id)) {
          modulesMap.set(mod.id, {
            id: mod.id,
            title: mod.title,
            lessons: [],
          });
        }
        const p = lesson.progress[0];
        const completed = p?.completed === true;
        let access: LibraryLessonAccess = "locked";
        if (completed) access = "completed";
        else if (dayNumber <= currentDay) access = "available";

        modulesMap.get(mod.id)!.lessons.push({
          id: lesson.id,
          title: lesson.title,
          quizCount: lesson.quizzes.length,
          completed,
          watchPercent: p?.watchPercent ?? 0,
          quizPassed: p?.quizPassed ?? false,
          dayNumber,
          access,
        });
      }

      const modules = [...modulesMap.values()]
        .map((m) => ({
          ...m,
          lessons: m.lessons.sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0)),
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

      const flat = modules.flatMap((m) => m.lessons);
      const completedLessons = flat.filter((l) => l.completed).length;
      const totalLessons = flat.length;
      const progressPercent =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const resume =
        flat.find((l) => l.access === "available") ??
        flat.find((l) => l.access === "completed") ??
        null;

      return {
        enrollmentId: `curriculum-${course.id}`,
        courseId: course.id,
        title: course.title,
        description: course.description,
        status: progressPercent >= 100 ? "COMPLETED" : progressPercent > 0 ? "IN_PROGRESS" : "NOT_STARTED",
        progressPercent,
        totalModules: modules.length,
        totalLessons,
        completedLessons,
        resumeLessonId: resume?.id ?? null,
        modules,
        source: "curriculum" as const,
      };
    });

    courses.sort((a, b) => a.title.localeCompare(b.title));
    return { courses, mode: "curriculum", currentDay };
  }

  // Fallback: classic enrollments
  await import("./progress").then((m) => m.recalculateUserEnrollments(userId));

  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: {
              lessons: {
                orderBy: { order: "asc" },
                include: {
                  quizzes: { select: { id: true } },
                  progress: { where: { userId }, take: 1 },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { lastActivityAt: "desc" },
  });

  if (enrollments.length === 0) {
    return { courses: [], mode: "empty", currentDay };
  }

  const courses: LibraryCourse[] = enrollments.map((en) => {
    const modules: LibraryModule[] = en.course.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      lessons: mod.lessons.map((lesson) => {
        const p = lesson.progress[0];
        const completed = p?.completed === true;
        return {
          id: lesson.id,
          title: lesson.title,
          quizCount: lesson.quizzes.length,
          completed,
          watchPercent: p?.watchPercent ?? 0,
          quizPassed: p?.quizPassed ?? false,
          dayNumber: null,
          access: (completed ? "completed" : "available") as LibraryLessonAccess,
        };
      }),
    }));
    const flat = modules.flatMap((m) => m.lessons);
    const completedLessons = flat.filter((l) => l.completed).length;
    const next = flat.find((l) => !l.completed) ?? flat[0];

    return {
      enrollmentId: en.id,
      courseId: en.courseId,
      title: en.course.title,
      description: en.course.description,
      status: en.status,
      progressPercent: en.progressPercent,
      totalModules: en.course.modules.length,
      totalLessons: flat.length,
      completedLessons,
      resumeLessonId: next?.id ?? null,
      modules,
      source: "enrollment" as const,
    };
  });

  return { courses, mode: "enrollment", currentDay };
}
