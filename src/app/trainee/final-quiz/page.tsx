import { FinalEvaluationExam } from "@/components/trainee/FinalEvaluationExam";

export default function FinalQuizPage() {
  return (
    <div className="relative min-h-[70vh] py-6 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.12),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.08),_transparent_55%)]"
      />
      <FinalEvaluationExam />
    </div>
  );
}
