export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-slate-800" />
              <div className="h-6 w-16 rounded bg-slate-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
