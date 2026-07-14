export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="glass-panel p-4 animate-pulse">
          <div className="flex items-center gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-slate-800" />
                <div className="h-3 w-1/2 rounded bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
