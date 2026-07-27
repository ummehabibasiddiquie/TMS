"use client";

import { useMemo, useState } from "react";
import { FolderKanban, Search } from "lucide-react";

export type HrmsProjectRow = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  active: boolean;
  categoryId: string | null;
  categoryName: string | null;
};

type Props = {
  projects: HrmsProjectRow[];
  configured: boolean;
  connected: boolean;
  message?: string;
};

export function HrmsProjectList({ projects, configured, connected, message }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        project.name.toLowerCase().includes(q) ||
        (project.code?.toLowerCase().includes(q) ?? false) ||
        (project.description?.toLowerCase().includes(q) ?? false) ||
        (project.categoryName?.toLowerCase().includes(q) ?? false);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && project.active) ||
        (statusFilter === "inactive" && !project.active);

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
          Projects
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white">Projects</h1>
        <p className="mt-2 text-slate-400">
          Projects are loaded from HRMS (read-only). Create or edit them in HRMS — TMS only lists them
          for day curriculum and training.
        </p>
      </div>

      {message && (
        <p className="rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          {message}
        </p>
      )}

      {!configured || !connected ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
          {!configured
            ? "HRMS database is not configured yet."
            : "Could not connect to HRMS. Check HRMS_DATABASE_URL / network access."}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                placeholder="Search by name, code, or category…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-200"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FolderKanban className="mb-4 h-12 w-12 text-slate-600" />
              <p className="text-slate-400">No projects match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-800">
                    {["Project", "Code", "Category", "Status"].map((h) => (
                      <th key={h} className="py-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-slate-800/70 text-slate-300">
                      <td className="py-3">
                        <div className="font-medium text-white">{p.name}</div>
                        {p.description && (
                          <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3">{p.code || "—"}</td>
                      <td className="py-3">{p.categoryName || "—"}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${
                            p.active
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {p.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-sm text-slate-500">
            Showing {filtered.length} of {projects.length} projects
          </p>
        </div>
      )}
    </div>
  );
}
