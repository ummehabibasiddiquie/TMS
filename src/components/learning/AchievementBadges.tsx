import { Award } from "lucide-react";

type Badge = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  earned: boolean;
  earnedAt?: Date | null;
};

export function AchievementBadges({ badges }: { badges: Badge[] }) {
  return (
    <div className="glass-panel p-6">
      <div className="mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-amber-400" />
        <h3 className="text-lg font-semibold">Achievements</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`rounded-xl border p-4 text-center transition ${
              b.earned
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-slate-700 bg-slate-800/30 opacity-50 grayscale"
            }`}
          >
            <span className="text-2xl">{b.icon ?? "🏅"}</span>
            <p className="mt-2 text-sm font-medium">{b.title}</p>
            <p className="text-xs text-slate-500">{b.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
