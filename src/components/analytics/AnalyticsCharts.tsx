"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

type Props = {
  courseData: { name: string; completionRate: number; avgProgress: number }[];
  dropOff: { name: string; dropOff: number }[];
  engagementByDay: { day: string; submissions: number }[];
};

export function AnalyticsCharts({ courseData, dropOff, engagementByDay }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-panel p-6">
        <h3 className="mb-4 font-semibold">Course Completion Rate</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={courseData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "none" }} />
            <Bar dataKey="completionRate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-panel p-6">
        <h3 className="mb-4 font-semibold">Drop-off Analysis</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dropOff}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "none" }} />
            <Bar dataKey="dropOff" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-panel p-6 lg:col-span-2">
        <h3 className="mb-4 font-semibold">Learning Engagement (Daily Submissions)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={engagementByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" tick={{ fill: "#94a3b8" }} />
            <YAxis tick={{ fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "none" }} />
            <Line type="monotone" dataKey="submissions" stroke="#22d3ee" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
