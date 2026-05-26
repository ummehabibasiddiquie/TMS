import { prisma } from "@/lib/db";
import { CourseManager } from "@/components/courses/CourseManager";

export default async function TrainerCoursesPage() {
  const courses = await prisma.course.findMany({
    include: {
      modules: { include: { _count: { select: { lessons: true } } } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Course Management</h1>
        <p className="text-slate-400">
          Add, edit, or delete courses. Structure: Course → Module → Lesson → Topic → Quiz
        </p>
      </div>
      <CourseManager courses={courses} />
    </div>
  );
}
