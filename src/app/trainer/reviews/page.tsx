import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ReviewActions } from "@/components/training/ReviewActions";

export default async function TrainerReviewsPage() {
  const user = await getSession();
  const submissions = await prisma.dailySubmission.findMany({
    include: {
      user: { select: { name: true, employeeId: true } },
      trainerReview: true,
    },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Trainer Reviews</h1>
      <div className="space-y-4">
        {submissions.map((s) => (
          <div key={s.id} className="glass-panel p-6">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{s.user.name}</p>
                <p className="text-sm text-slate-400">
                  Day {s.dayNumber} · {s.phase.replace(/_/g, " ")}
                </p>
              </div>
              <span className="text-sm">
                Prod: {s.productivityPct}% · Qual: {s.qualityPct}%
              </span>
            </div>
            <p className="mt-2 text-sm">SOP Read: {s.sopRead ? "Yes" : "No"} · Tasks: {s.tasksCompleted}</p>
            {s.issues && <p className="mt-1 text-sm text-amber-300">Issues: {s.issues}</p>}
            <ReviewActions
              submissionId={s.id}
              type="trainer"
              reviewerId={user!.id}
              existing={s.trainerReview}
            />
          </div>
        ))}
        {submissions.length === 0 && (
          <p className="text-slate-500">No submissions yet.</p>
        )}
      </div>
    </div>
  );
}
