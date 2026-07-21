import { getSession } from "@/lib/auth";
import { getTraineeCourseLibrary } from "@/lib/course-library";
import { TraineeCoursesView } from "@/components/learning/TraineeCoursesView";

export default async function CoursesPage() {
  const user = await getSession();
  if (!user) return null;

  const { courses, mode, currentDay } = await getTraineeCourseLibrary(user.id);

  return (
    <TraineeCoursesView courses={courses} mode={mode} currentDay={currentDay} />
  );
}
