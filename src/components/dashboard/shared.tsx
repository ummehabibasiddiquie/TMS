"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const dashboardBtnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:shadow-blue-950/25";

export function dashboardGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  href,
  accent = "from-sky-500/20",
  trend,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
  accent?: string;
  trend?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-2xl border border-slate-200 bg-gradient-to-br to-transparent px-4 py-4 transition hover:border-blue-400/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/50",
        accent,
        "from-white dark:from-slate-900"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
          <p className="text-xs text-slate-600 dark:text-slate-400">{label}</p>
        </div>
        {trend && (
          <span className={`text-xs font-semibold ${
            trend.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
    </Link>
  );
}

export function DashboardQuickLink({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-400/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/60"
    >
      <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {body}
      </p>
      <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-300">
        {action}
        <ArrowRight className="h-4 w-4" />
      </p>
    </Link>
  );
}

export function DashboardAlert({
  tone,
  title,
  body,
  href,
  action,
}: {
  tone: "red" | "amber" | "blue";
  title: string;
  body: string;
  href?: string;
  action?: string;
}) {
  const toneClass =
    tone === "red"
      ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
        : "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10";

  const titleClass =
    tone === "red"
      ? "text-red-800 dark:text-red-200"
      : tone === "amber"
        ? "text-amber-900 dark:text-amber-200"
        : "text-blue-900 dark:text-blue-200";

  const bodyClass =
    tone === "red"
      ? "text-red-700/90 dark:text-red-300/80"
      : tone === "amber"
        ? "text-amber-800/90 dark:text-amber-300/80"
        : "text-blue-800/90 dark:text-blue-300/80";

  return (
    <div className={cn("flex min-w-[200px] flex-1 flex-col rounded-2xl border px-4 py-3", toneClass)}>
      <p className={cn("font-semibold", titleClass)}>{title}</p>
      <p className={cn("mt-0.5 text-sm", bodyClass)}>{body}</p>
      {href && action && (
        <Link
          href={href}
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline",
            titleClass
          )}
        >
          {action}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
