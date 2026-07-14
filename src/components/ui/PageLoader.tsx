import { Loader2 } from "lucide-react";

export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="mt-4 text-sm text-slate-400">{message}</p>
    </div>
  );
}
