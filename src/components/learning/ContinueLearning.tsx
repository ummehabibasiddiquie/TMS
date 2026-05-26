import Link from "next/link";
import { Play, ArrowRight } from "lucide-react";
import { ProgressRing } from "./ProgressRing";

type Props = {
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  lessonId: string;
  progressPercent: number;
};

export function ContinueLearning({
  courseId,
  courseTitle,
  lessonTitle,
  lessonId,
  progressPercent,
}: Props) {
  return (
    <div className="glass-panel relative overflow-hidden p-6">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-600/10 blur-2xl" />
      <div className="flex items-center gap-6">
        <ProgressRing percent={progressPercent} size={100} label="Course" />
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
            Continue Learning
          </p>
          <h3 className="mt-1 text-xl font-semibold">{courseTitle}</h3>
          <p className="mt-1 text-sm text-slate-400">Up next: {lessonTitle}</p>
          <Link
            href={`/trainee/courses/${courseId}/player?lesson=${lessonId}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <Play className="h-4 w-4" />
            Resume
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
