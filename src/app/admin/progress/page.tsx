import { BarChart3 } from "lucide-react";

const rows = [
  ["Divya Nair", "Operations", "5 / 5", "Passed", "Yes", "Complete", "20 May 25"],
  ["Amit Shah", "Email Ops", "5 / 5", "Passed", "Yes", "Complete", "19 May 25"],
  ["Priya Sharma", "Annotation", "2 / 5", "-", "No", "In Progress", "22 May 25"],
  ["Rahul Patel", "QC Team", "1 / 5", "-", "No", "In Progress", "21 May 25"],
  ["Meera Joshi", "Annotation", "0 / 5", "-", "No", "Pending", "18 May 25"],
];

export default function AdminProgressPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Admin - Progress Reports</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Track onboarding completion</h1>
        <p className="mt-2 text-slate-400">Monitor every employee across onboarding, quiz, and certification status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Total Employees", "5", "All active accounts"],
          ["Fully Onboarded", "2", "Landscape certified"],
          ["Avg Completion", "38%", "Across all employees"],
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
          <input
            placeholder="Search employee name..."
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 md:w-72"
          />
          <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
            <option>All Projects</option>
            <option>Landscape</option>
          </select>
          <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
            <option>All Statuses</option>
            <option>Complete</option>
            <option>In Progress</option>
            <option>Pending</option>
          </select>
        </div>
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
              {rows.map((row) => (
                <tr key={row[0]} className="border-b border-slate-800/70 text-slate-300">
                  {row.map((cell) => (
                    <td key={cell} className="py-3">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate-500">Showing 5 employees - sorted by completion status</p>
      </div>
    </div>
  );
}
