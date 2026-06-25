"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, Search, Filter } from "lucide-react";

type ProgressReport = {
  id: string;
  name: string;
  email: string;
  department: string;
  steps: string;
  quiz: string;
  certified: string;
  status: string;
  lastActive: string;
  projects: Array<{
    id: string;
    name: string;
    active: boolean;
    status: string;
  }>;
  trainer: string;
  qa: string;
};

type Statistics = {
  totalEmployees: number;
  fullyOnboarded: number;
  avgCompletion: string;
};

type Project = {
  id: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

interface ProgressReportsManagerProps {
  user: User;
}

export function ProgressReportsManager({ user }: ProgressReportsManagerProps) {
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalEmployees: 0,
    fullyOnboarded: 0,
    avgCompletion: "0%",
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (projectFilter !== "all") params.append("project", projectFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFilter) params.append("date", dateFilter);

      const res = await fetch(`/api/admin/progress-reports?${params.toString()}`);
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to fetch progress reports");
        return;
      }

      setReports(data.reports || []);
      setStatistics(data.statistics || { totalEmployees: 0, fullyOnboarded: 0, avgCompletion: "0%" });
      setProjects(data.projects || []);
    } catch (err) {
      setLoading(false);
      setError("Failed to fetch progress reports. Please try again.");
      console.error("Fetch error:", err);
    }
  }, [searchQuery, projectFilter, statusFilter, dateFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  function clearFilters() {
    setSearchQuery("");
    setProjectFilter("all");
    setStatusFilter("all");
    setDateFilter("");
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Admin - Progress Reports</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Track onboarding completion</h1>
        <p className="mt-2 text-slate-400">Monitor every employee across onboarding, quiz, and certification status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Total Employees", statistics.totalEmployees.toString(), "All active accounts"],
          ["Fully Onboarded", statistics.fullyOnboarded.toString(), "Landscape certified"],
          ["Avg Completion", statistics.avgCompletion, "Across all employees"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <BarChart3 className="h-5 w-5 text-blue-300" />
            <p className="mt-3 text-sm text-slate-400">{label}</p>
            <p className="mt-1 text-3xl font-bold text-white">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                placeholder="Search employee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-3 py-2 text-sm text-slate-200 w-full md:w-72"
              />
            </div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="complete">Complete</option>
              <option value="in-progress">In Progress</option>
              <option value="pending">Pending</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <button
            onClick={clearFilters}
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Clear Filters
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-slate-400">Loading progress reports...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-red-400">{error}</div>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Filter className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-slate-400">No employees found</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-800">
                    {["Employee", "Department", "Steps", "Quiz", "Certified", "Status", "Last Active"].map((header) => (
                      <th key={header} className="py-3 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-slate-800/70 text-slate-300">
                      <td className="py-3 font-medium text-white">{report.name}</td>
                      <td className="py-3">{report.department}</td>
                      <td className="py-3">{report.steps}</td>
                      <td className="py-3">{report.quiz}</td>
                      <td className="py-3">{report.certified}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${
                            report.status === "Complete"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : report.status === "In Progress"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="py-3">{report.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Showing {reports.length} employee{reports.length !== 1 ? "s" : ""} - sorted by last activity
            </p>
          </>
        )}
      </div>
    </div>
  );
}