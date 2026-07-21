import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CourseManager } from "@/components/courses/CourseManager";

export default async function TrainerCoursesPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "TRAINER") redirect("/");

  const courses = await prisma.course.findMany({
    include: {
      modules: { include: { _count: { select: { lessons: true } } } },
      _count: {
        select: {
          enrollments: { where: { user: { active: true } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Course Management</h1>
        <p className="text-slate-400">
          Add, edit, delete, and activate/deactivate courses. Attach lessons to days in Day Curriculum
          (no separate course assignment).
        </p>
      </div>
      <CourseManager courses={courses} />
    </div>
  );
}
