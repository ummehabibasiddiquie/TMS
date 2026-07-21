"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Save } from "lucide-react";
import type { Role } from "@/types";
import { ROLE_LABELS, ADMIN_MANAGE_ROLES } from "@/lib/roles";
import { PasswordInput } from "@/components/ui/PasswordInput";

type FormState = {
  email: string;
  password: string;
  name: string;
  employeeId: string;
  role: Role;
  dateOfJoining: string;
  trainerId: string;
};

function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const emptyForm = (): FormState => ({
  email: "",
  password: "",
  name: "",
  employeeId: "",
  role: "TRAINEE",
  dateOfJoining: todayLocalDate(),
  trainerId: "",
});

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamLeads?: { id: string; name: string; email: string }[];
  onCreated?: (user: {
    id: string;
    name: string;
    email: string;
    role: string;
    employeeId: string | null;
    active: boolean;
    dateOfJoining: string | null;
    trainerId?: string | null;
    trainerName?: string | null;
  }) => void;
  teamLeadMode?: boolean;
}

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    input.showPicker?.();
  } catch {
    input.focus();
  }
}

export function AddUserModal({
  isOpen,
  onClose,
  teamLeads = [],
  onCreated,
  teamLeadMode = false,
}: AddUserModalProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm());
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.email.trim() || !form.password.trim() || !form.name.trim() || !form.role) {
      setError("Email, password, name, and role are required");
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Invalid email format");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dateOfJoining: form.dateOfJoining || todayLocalDate(),
          role: teamLeadMode ? "TRAINEE" : form.role,
          trainerId: teamLeadMode
            ? teamLeads[0]?.id || null
            : form.role === "TRAINEE"
              ? form.trainerId || null
              : null,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to create user");
        return;
      }

      const created = data.user;
      const dateOfJoining =
        created?.dateOfJoining == null
          ? null
          : typeof created.dateOfJoining === "string"
            ? created.dateOfJoining
            : new Date(created.dateOfJoining).toISOString();

      setForm(emptyForm());
      onClose();
      onCreated?.({
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        employeeId: created.employeeId ?? null,
        active: created.active === true,
        dateOfJoining,
        trainerId: created.traineeProfile?.trainerId ?? null,
        trainerName: created.traineeProfile?.trainer?.name ?? null,
      });
      router.refresh();
    } catch {
      setLoading(false);
      setError("An error occurred. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Add New User</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-400">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              placeholder="user@company.in"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400">Password *</label>
            <PasswordInput
              value={form.password}
              onChange={(value) => setForm({ ...form, password: value })}
              disabled={loading}
              placeholder="Min 6 characters"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {teamLeadMode ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-400">
              Role: Employee (trainee) — assigned to you automatically
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-slate-400">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  required
                >
                  {ADMIN_MANAGE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>

              {form.role === "TRAINEE" && (
                <div>
                  <label className="block text-sm text-slate-400">Team Lead</label>
                  <select
                    value={form.trainerId}
                    onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {teamLeads.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm text-slate-400">Employee ID</label>
            <input
              type="text"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., EMP001"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400">Date of Joining</label>
            <input
              type="date"
              value={form.dateOfJoining}
              onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
              onClick={(e) => openDatePicker(e.currentTarget)}
              onFocus={(e) => openDatePicker(e.currentTarget)}
              className="mt-1 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 [color-scheme:dark] focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Filled automatically with today’s date. Change only if needed.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
