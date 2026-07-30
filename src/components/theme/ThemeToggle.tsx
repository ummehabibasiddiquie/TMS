"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const modes = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle({
  compact,
  fullWidth,
}: {
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-9 rounded-lg border border-slate-700 bg-slate-900/80",
          compact ? "w-9" : fullWidth ? "w-full" : "w-[11.5rem]"
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-900/80 p-0.5 shadow-sm",
        fullWidth && "w-full"
      )}
      role="group"
      aria-label="Color theme"
    >
      {modes.map(({ id, label, icon: Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => setTheme(id)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition",
              fullWidth && "flex-1",
              active
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
