import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CourseContentEditor } from "@/components/courses/CourseContentEditor";

export default async function TrainerCourseContentPage({
  params,
}: {
  params: { courseId: string };
}) {
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
              quizzes: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  passingScore: true,
                  order: true,
                  questions: {
                    orderBy: { order: "asc" },
                    select: {
                      id: true,
                      question: true,
                      options: true,
                      correct: true,
                      order: true,
                    },
                  },
                },
              },
              assignment: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
  });

  if (!course) notFound();

  return <CourseContentEditor course={course} basePath="/trainer" />;
}
