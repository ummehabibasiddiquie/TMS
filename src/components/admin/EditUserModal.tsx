"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/ui/PasswordInput";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string | null;
  dateOfJoining: string | Date | null;
  trainerId?: string | null;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  teamLeads?: { id: string; name: string; email: string }[];
  /** Team Lead can only edit trainees on their team; role stays TRAINEE */
  teamLeadMode?: boolean;
  onSuccess?: (updatedUser: User & {
    trainerId?: string | null;
    trainerName?: string | null;
  }) => void;
}

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    input.showPicker?.();
  } catch {
    input.focus();
  }
}

export function EditUserModal({
  isOpen,
  onClose,
  user,
  teamLeads = [],
  teamLeadMode = false,
  onSuccess,
}: EditUserModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    employeeId: user.employeeId || "",
    role: user.role,
    dateOfJoining: user.dateOfJoining
      ? new Date(user.dateOfJoining).toISOString().split("T")[0]
      : "",
    password: "",
    trainerId: user.trainerId || "",
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: user.name,
        email: user.email,
        employeeId: user.employeeId || "",
        role: user.role,
        dateOfJoining: user.dateOfJoining
          ? new Date(user.dateOfJoining).toISOString().split("T")[0]
          : "",
        password: "",
        trainerId: user.trainerId || "",
      });
      setError("");
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Invalid email format");
      setLoading(false);
      return;
    }

    if (form.password && form.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          name: form.name,
          email: form.email,
          employeeId: form.employeeId || null,
          role: teamLeadMode ? "TRAINEE" : form.role,
          dateOfJoining: form.dateOfJoining || null,
          password: form.password || undefined,
          trainerId: teamLeadMode
            ? undefined
            : form.role === "TRAINEE"
              ? form.trainerId || null
              : undefined,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to update user");
        return;
      }

      onClose();
      if (onSuccess && data.user) {
        onSuccess({
          ...data.user,
          trainerId: data.user.traineeProfile?.trainerId ?? null,
          trainerName: data.user.traineeProfile?.trainer?.name ?? null,
        });
      }
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError("Failed to update user. Please try again.");
      console.error("Update error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">Edit User</h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Employee ID</label>
            <input
              type="text"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              disabled={loading}
              placeholder="Optional"
            />
          </div>

          {teamLeadMode ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-400">
              Role: Employee (trainee) — stays on your team
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="TRAINER">Team Lead</option>
                  <option value="TRAINEE">Employee</option>
                </select>
              </div>

              {form.role === "TRAINEE" && (
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Team Lead</label>
                  <select
                    value={form.trainerId}
                    onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                    disabled={loading}
                  >
                    <option value="">Unassigned</option>
                    {teamLeads.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Controls who sees this employee in Team Progress and Reviews.
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <label className="mb-1 block text-sm text-slate-400">Date of Joining</label>
            <input
              type="date"
              value={form.dateOfJoining}
              onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
              onClick={(e) => openDatePicker(e.currentTarget)}
              onFocus={(e) => openDatePicker(e.currentTarget)}
              className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 [color-scheme:dark] focus:border-blue-500 focus:outline-none"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">New Password (Optional)</label>
            <PasswordInput
              value={form.password}
              onChange={(value) => setForm({ ...form, password: value })}
              disabled={loading}
              placeholder="Leave blank to keep current password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
