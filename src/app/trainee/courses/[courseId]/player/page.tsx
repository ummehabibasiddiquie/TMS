import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CoursePlayer } from "./CoursePlayer";

export default async function CoursePlayerPage({
  params,
  searchParams,
}: {
  params: { courseId: string };
  searchParams: { lesson?: string };
}) {
  const user = await getSession();
  if (!user) return null;

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              topics: { orderBy: { order: "asc" } },
              quiz: { include: { questions: { orderBy: { order: "asc" } } } },
              assignment: true,
            },
          },
        },
      },
    },
  });

  if (!course) return <p>Course not found</p>;

  const allLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))
  );
  const activeLesson =
    allLessons.find((l) => l.id === searchParams.lesson) ?? allLessons[0];

  const [progress, note, discussions, enrollment] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
        lessonId: { in: allLessons.map((l) => l.id) },
      },
    }),
    activeLesson
      ? prisma.lessonNote.findUnique({
          where: {
            userId_lessonId: { userId: user.id, lessonId: activeLesson.id },
          },
        })
      : null,
    activeLesson
      ? prisma.discussionComment.findMany({
          where: { lessonId: activeLesson.id },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [],
    prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: course.id },
      },
    }),
  ]);

  return (
    <CoursePlayer
      course={{
        id: course.id,
        title: course.title,
        modules: course.modules.map((m) => ({
          id: m.id,
          title: m.title,
          lessons: m.lessons.map((l) => ({
            ...l,
            moduleTitle: m.title,
          })),
        })),
      }}
      lessons={allLessons}
      activeLessonId={activeLesson?.id}
      progress={progress}
      initialNote={note?.content ?? ""}
      discussions={discussions}
      enrollmentPercent={enrollment?.progressPercent ?? 0}
      userId={user.id}
    />
  );
}
