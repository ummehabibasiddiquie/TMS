"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatWorkGoal } from "@/lib/work-metrics-display";
import {
  Plus,
  Trash2,
  Pencil,
  BookOpen,
  ClipboardList,
  Save,
  X,
  Link2,
  User,
  RotateCcw,
  Copy,
  Briefcase,
  Layers,
  CalendarPlus,
  Loader2,
} from "lucide-react";
import { SectionLoader, WorkingBanner } from "@/components/ui/SectionLoader";

type ChecklistItem = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  kind?: string;
  assignedHours?: number | null;
  productionTarget?: number | null;
};

type LessonLink = {
  id: string;
  lessonId: string;
  label: string | null;
  sortOrder: number;
  lesson: {
    id: string;
    title: string;
    module: { title: string; course: { id: string; title: string } };
  };
};

type CurriculumDay = {
  id: string;
  dayNumber: number;
  title: string;
  dayType: string;
  projectName: string | null;
  hrmsProjectId?: string | null;
  description: string | null;
  checklistItems: ChecklistItem[];
  lessons: LessonLink[];
};

type LessonOption = {
  id: string;
  title: string;
  courseTitle: string;
  moduleTitle: string;
};

type TraineeOption = {
  id: string;
  name: string;
  email: string;
  isCustom?: boolean;
};

export function CurriculumManager() {
  const searchParams = useSearchParams();
  const [days, setDays] = useState<CurriculumDay[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [trainees, setTrainees] = useState<TraineeOption[]>([]);
  /** "" = GLOBAL default, "__EXTRA_WEEK__" = extra-week template, else trainee user id */
  const [scheduleKey, setScheduleKey] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [traineeLabel, setTraineeLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [msg, setMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    dayNumber: 1,
    title: "",
    dayType: "MIXED",
    projectName: "",
    hrmsProjectId: "",
    description: "",
  });
  const [newItem, setNewItem] = useState({ title: "", description: "", kind: "CHECKLIST" });
  const [newWork, setNewWork] = useState({
    hrmsProjectId: "",
    title: "",
    description: "",
    assignedHours: "",
    productionTarget: "",
  });
  const [lessonPick, setLessonPick] = useState("");
  const [traineePercent, setTraineePercent] = useState<number | null>(null);
  const [hrmsProjects, setHrmsProjects] = useState<
    { id: string; name: string; code: string | null; categoryName: string | null }[]
  >([]);
  const [hrmsMsg, setHrmsMsg] = useState("");

  const isExtraWeekDefault = scheduleKey === "__EXTRA_WEEK__";
  const traineeId = isExtraWeekDefault ? "" : scheduleKey;
  const selected = days.find((d) => d.id === selectedId) || null;
  /** Editing GLOBAL default, EXTRA_WEEK default, or a trainee who already has a personal copy */
  const canEdit = isExtraWeekDefault || !traineeId || isCustom;
  const viewingTraineeDefault = Boolean(traineeId && !isCustom);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = isExtraWeekDefault
      ? "/api/curriculum?manage=1&scope=EXTRA_WEEK"
      : traineeId
        ? `/api/curriculum?manage=1&traineeId=${encodeURIComponent(traineeId)}`
        : "/api/curriculum?manage=1";
    const daysRes = await fetch(qs);
    const daysData = await daysRes.json();
    setLoading(false);

    if (!daysRes.ok) {
      setMsg(daysData.error || "Failed to load curriculum");
      return;
    }
    const list: CurriculumDay[] = daysData.days || [];
    setDays(list);
    setIsCustom(Boolean(daysData.isCustom));
    setTraineeLabel(
      daysData.trainee
        ? `${daysData.trainee.name} (${daysData.trainee.email})`
        : null
    );
    setSelectedId((prev) => {
      if (prev && list.some((d) => d.id === prev)) return prev;
      return list[0]?.id || null;
    });
    setMsg("");
  }, [traineeId, isExtraWeekDefault]);

  const loadLessons = useCallback(async () => {
    const res = await fetch("/api/curriculum/lesson-options");
    if (!res.ok) return;
    const data = await res.json();
    setLessons(data.lessons || []);
  }, []);

  const loadTrainees = useCallback(async () => {
    const res = await fetch("/api/curriculum/progress");
    if (!res.ok) return;
    const data = await res.json();
    const rows: TraineeOption[] = (data.trainees || []).map(
      (t: { id: string; name: string; email: string; isCustom?: boolean }) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        isCustom: Boolean(t.isCustom),
      })
    );
    setTrainees(rows);
  }, []);

  const loadHrmsProjects = useCallback(async () => {
    const res = await fetch("/api/hrms/projects?activeOnly=true");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setHrmsMsg(data.error || "Could not load HRMS projects");
      setHrmsProjects([]);
      return;
    }
    if (data.message) setHrmsMsg(data.message);
    else setHrmsMsg("");
    setHrmsProjects(
      (data.projects || []).map(
        (p: {
          id: string;
          name: string;
          code: string | null;
          categoryName: string | null;
        }) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          categoryName: p.categoryName,
        })
      )
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadLessons();
    void loadTrainees();
    void loadHrmsProjects();
  }, [loadLessons, loadTrainees, loadHrmsProjects]);

  useEffect(() => {
    const fromUrl = searchParams.get("traineeId");
    if (fromUrl) setScheduleKey(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (!traineeId) {
      setTraineePercent(null);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/curriculum/progress?userId=${encodeURIComponent(traineeId)}`);
      const data = await res.json();
      if (res.ok && data.plan) {
        setTraineePercent(data.plan.overallPercent ?? null);
      } else {
        setTraineePercent(null);
      }
    })();
  }, [traineeId, days.length]);

  function startCreate() {
    if (!canEdit) {
      setMsg("Enable a personal schedule for this trainee before editing.");
      return;
    }
    const nextNum =
      days.length === 0 ? 1 : Math.max(...days.map((d) => d.dayNumber)) + 1;
    setForm({
      dayNumber: nextNum,
      title: nextNum === 1 ? "Day 1 — Onboarding" : `Day ${nextNum}`,
      dayType: "MIXED",
      projectName: "",
      hrmsProjectId: "",
      description: "",
    });
    setEditing(true);
    setSelectedId(null);
  }

  function startEdit(day: CurriculumDay) {
    if (!canEdit) {
      setMsg("Enable a personal schedule for this trainee before editing.");
      return;
    }
    setForm({
      dayNumber: day.dayNumber,
      title: day.title,
      dayType: day.dayType,
      projectName: day.projectName || "",
      hrmsProjectId: day.hrmsProjectId || "",
      description: day.description || "",
    });
    setEditing(true);
    setSelectedId(day.id);
  }

  async function saveDay() {
    if (!canEdit) return;
    setMsg("");
    const payload: Record<string, unknown> = {
      dayNumber: form.dayNumber,
      title: form.title,
      dayType: form.dayType,
      projectName: form.projectName || null,
      hrmsProjectId: form.hrmsProjectId || null,
      description: form.description || null,
    };
    if (isExtraWeekDefault) payload.scope = "EXTRA_WEEK";
    else if (traineeId && isCustom) payload.traineeId = traineeId;

    const res = selectedId
      ? await fetch(`/api/curriculum/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/curriculum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Save failed");
      return;
    }
    setEditing(false);
    await load();
    if (data.day?.id) setSelectedId(data.day.id);
  }

  async function deleteDay(id: string) {
    if (!canEdit) return;
    if (!confirm("Delete this day and all its checklist/lessons links?")) return;
    const res = await fetch(`/api/curriculum/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setMsg(data.error || "Delete failed");
      return;
    }
    if (selectedId === id) setSelectedId(null);
    await load();
  }

  async function enableCustom() {
    if (!traineeId) return;
    setBusy(true);
    setBusyLabel("Creating personal schedule…");
    setMsg("");
    try {
      const res = await fetch(`/api/curriculum/trainee/${traineeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Could not create personal schedule");
        return;
      }
      setBusyLabel("Refreshing schedule…");
      await load();
      await loadTrainees();
      setMsg(
        data.created
          ? "Personal schedule created from the default. Edits only affect this trainee."
          : "This trainee already has a personal schedule."
      );
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  async function resetToDefault() {
    if (!traineeId) return;
    if (
      !confirm(
        "Replace this trainee’s schedule with a fresh copy of the current default schedule? Their custom day edits will be lost."
      )
    ) {
      return;
    }
    setBusy(true);
    setBusyLabel("Resetting schedule to default…");
    setMsg("");
    try {
      const res = await fetch(`/api/curriculum/trainee/${traineeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Reset failed");
        return;
      }
      setBusyLabel("Refreshing schedule…");
      setEditing(false);
      await load();
      await loadTrainees();
      setMsg("Schedule reset to a fresh copy of the default. You can customize it again for this trainee.");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  async function extendWeek() {
    if (!traineeId) return;
    const raw = prompt(
      "How many extra days to add?\nCopied from Extra week default (cycles if more than the template). Enter 1–60 (7 = one week, 14 = two weeks).",
      "7"
    );
    if (raw == null) return;
    const days = Number(raw.trim());
    if (!Number.isFinite(days) || days < 1 || days > 60) {
      setMsg("Enter a number of days between 1 and 60");
      return;
    }
    if (
      !confirm(
        `Add ${days} day${days === 1 ? "" : "s"} from Extra week default? You can edit this trainee’s copy afterward.`
      )
    ) {
      return;
    }
    setBusy(true);
    setBusyLabel(`Adding ${days} day${days === 1 ? "" : "s"}…`);
    setMsg("");
    try {
      const res = await fetch(`/api/curriculum/trainee/${traineeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extendWeek", days }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Could not add days");
        return;
      }
      setBusyLabel("Refreshing schedule…");
      setEditing(false);
      await load();
      await loadTrainees();
      setMsg(
        data.fromTemplate
          ? `Copied Extra week default as Days ${data.fromDay}–${data.toDay} (${data.added} day${data.added === 1 ? "" : "s"}). Edit this trainee’s copy as needed.`
          : `Added Days ${data.fromDay}–${data.toDay}. Select a new day to add content.`
      );
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  async function addChecklistItem(kind: "CHECKLIST" | "WORK" = "CHECKLIST") {
    if (!selected || !canEdit) return;
    const hoursRaw = newWork.assignedHours.trim();
    const targetRaw = newWork.productionTarget.trim();
    const hoursNum = hoursRaw === "" ? null : Number(hoursRaw);
    const targetNum = targetRaw === "" ? null : Number(targetRaw);
    if (kind === "WORK" && hoursRaw !== "" && (!Number.isFinite(hoursNum) || (hoursNum ?? 0) < 0)) {
      setMsg("Assigned hours must be a valid number.");
      return;
    }
    if (kind === "WORK" && targetRaw !== "" && (!Number.isFinite(targetNum) || (targetNum ?? 0) <= 0)) {
      setMsg("Production target must be a positive number.");
      return;
    }
    const payload =
      kind === "WORK"
        ? {
            title: newWork.title,
            description: newWork.description,
            kind: "WORK",
            assignedHours: hoursNum,
            productionTarget: targetNum,
          }
        : { title: newItem.title, description: newItem.description, kind: "CHECKLIST" };
    if (kind === "WORK" && !newWork.hrmsProjectId.trim()) {
      setMsg("Select a project for this training work.");
      return;
    }
    if (!payload.title.trim()) {
      if (kind === "WORK") setMsg("Select a project for this training work.");
      return;
    }
    if (kind === "WORK" && (hoursNum == null || hoursNum <= 0)) {
      setMsg("Enter assigned hours for this training work.");
      return;
    }
    if (kind === "WORK" && (targetNum == null || targetNum <= 0)) {
      setMsg("Enter the unit goal (expected units) for this training work.");
      return;
    }
    const res = await fetch(`/api/curriculum/${selected.id}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed to add item");
      return;
    }
    if (kind === "WORK") {
      if (newWork.hrmsProjectId && !selected.hrmsProjectId) {
        await fetch(`/api/curriculum/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hrmsProjectId: newWork.hrmsProjectId,
            projectName: newWork.title,
          }),
        });
      }
      setNewWork({ hrmsProjectId: "", title: "", description: "", assignedHours: "", productionTarget: "" });
    } else {
      setNewItem({ title: "", description: "", kind: "CHECKLIST" });
    }
    await load();
  }

  async function deleteChecklistItem(itemId: string) {
    if (!canEdit) return;
    const res = await fetch(`/api/curriculum/checklist/${itemId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      setMsg(data.error || "Delete failed");
      return;
    }
    await load();
  }

  async function attachLesson() {
    if (!selected || !lessonPick || !canEdit) return;
    const res = await fetch(`/api/curriculum/${selected.id}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: lessonPick }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed to attach lesson");
      return;
    }
    setLessonPick("");
    await load();
  }

  async function detachLesson(linkId: string) {
    if (!selected || !canEdit) return;
    const res = await fetch(
      `/api/curriculum/${selected.id}/lessons?linkId=${encodeURIComponent(linkId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json();
      setMsg(data.error || "Remove failed");
      return;
    }
    await load();
  }

  if (loading && days.length === 0) {
    return <SectionLoader message="Loading curriculum…" />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Day-wise curriculum</h1>
          <p className="mt-1 text-sm text-slate-400">
            Build the default schedule once — it is assigned to every new trainee automatically.
            Open a trainee to customize their copy. Extra week default is used only when you extend
            someone. Attach an HRMS project on a day for practice-work tracking.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={startCreate}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add day
          </button>
        )}
      </div>

      {busyLabel && <WorkingBanner message={busyLabel} />}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <User className="h-3.5 w-3.5" />
            Schedule for
          </label>
          <select
            value={scheduleKey}
            onChange={(e) => {
              setScheduleKey(e.target.value);
              setEditing(false);
              setSelectedId(null);
            }}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm"
          >
            <option value="">Default template (copied to new trainees)</option>
            <option value="__EXTRA_WEEK__">Extra week default</option>
            {trainees.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isCustom ? " · custom" : ""} — {t.email}
              </option>
            ))}
          </select>
        </div>
        {isExtraWeekDefault ? (
          <p className="max-w-md text-xs text-amber-200/90 sm:pb-2">
            When Admin adds extra days, these days are copied to that trainee (cycled if they add more than this template). Leads can edit the
            trainee’s copy afterward without changing this template.
          </p>
        ) : !traineeId ? (
          <p className="max-w-md text-xs text-slate-400 sm:pb-2">
            Trainees use their own copy of this template. When you add, change, or remove{" "}
            <strong className="font-medium text-slate-300">training work</strong> on a day here,
            that day&apos;s work updates for trainees who have{" "}
            <strong className="font-medium text-slate-300">not finished that day</strong> yet.
            Completed days stay as they were for that trainee.
          </p>
        ) : null}
        {traineeId && (
          <div className="flex flex-wrap gap-2">
            {!isCustom ? (
              <button
                type="button"
                disabled={busy}
                onClick={enableCustom}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium hover:bg-amber-500 disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
                Customize for this trainee
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={resetToDefault}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to default copy
              </button>
            )}
            {traineeId && traineePercent != null && traineePercent < 90 ? (
              <button
                type="button"
                disabled={busy}
                onClick={extendWeek}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100 hover:bg-amber-900/40 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarPlus className="h-4 w-4" />
                )}
                {busy ? "Working…" : "Add days (from Extra week default)"}
              </button>
            ) : traineeId ? (
              <p className="text-xs text-slate-500 self-center">
                Extra days only when progress is under 90%
                {traineePercent != null ? ` (now ${traineePercent}%)` : ""}.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {isExtraWeekDefault && (
        <p className="rounded-xl bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          Editing Extra week default — shared template when you add extra days (cycled if you add more than this template).
        </p>
      )}

      {traineeId && (
        <p
          className={`rounded-xl px-4 py-2 text-sm ${
            isCustom
              ? "bg-amber-500/10 text-amber-200"
              : "bg-slate-800/80 text-slate-300"
          }`}
        >
          {isCustom
            ? `Editing personal schedule for ${traineeLabel}. Changes do not affect other trainees.`
            : `${traineeLabel} does not have a personal schedule yet. Click “Customize for this trainee” to assign a copy of the default you can edit.`}
        </p>
      )}

      {msg && !busyLabel && (
        <p className="rounded-xl bg-blue-500/10 px-4 py-2 text-sm text-blue-200">{msg}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-2">
          {days.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setSelectedId(d.id);
                setEditing(false);
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm ${
                selectedId === d.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {d.dayType === "CHECKLIST" ? (
                <ClipboardList className="h-4 w-4 shrink-0" />
              ) : d.dayType === "TRAINING" ? (
                <BookOpen className="h-4 w-4 shrink-0" />
              ) : (
                <Layers className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">
                D{d.dayNumber} · {d.title}
              </span>
            </button>
          ))}
          {days.length === 0 && (
            <p className="text-sm text-slate-500">No days yet. Add Day 1.</p>
          )}
        </aside>

        <div
          className={`rounded-2xl border border-slate-700 bg-slate-900/40 p-5 ${
            viewingTraineeDefault ? "opacity-90" : ""
          }`}
        >
          {editing && canEdit ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{selectedId ? "Edit day" : "New day"}</h2>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-400">Day number</label>
                  <input
                    type="number"
                    min={1}
                    value={form.dayNumber}
                    onChange={(e) =>
                      setForm({ ...form, dayNumber: parseInt(e.target.value) || 1 })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Focus label (optional)</label>
                  <select
                    value={form.dayType}
                    onChange={(e) => setForm({ ...form, dayType: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2"
                  >
                    <option value="MIXED">Mixed — checklist + courses + work</option>
                    <option value="CHECKLIST">Checklist-focused</option>
                    <option value="TRAINING">Training-focused</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Every day can include checklist ticks, course videos, and training work.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400">Day title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400">
                    Project to work on
                  </label>
                  <select
                    value={form.hrmsProjectId || (form.projectName ? `__name:${form.projectName}` : "")}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) {
                        setForm({ ...form, projectName: "", hrmsProjectId: "" });
                        return;
                      }
                      if (v.startsWith("__name:")) {
                        setForm({
                          ...form,
                          projectName: v.slice("__name:".length),
                          hrmsProjectId: "",
                        });
                        return;
                      }
                      const p = hrmsProjects.find((x) => x.id === v);
                      setForm({
                        ...form,
                        hrmsProjectId: v,
                        projectName: p?.name || form.projectName,
                      });
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2"
                  >
                    <option value="">No project selected</option>
                    {form.projectName &&
                      !form.hrmsProjectId &&
                      !hrmsProjects.some((p) => p.name === form.projectName) && (
                        <option value={`__name:${form.projectName}`}>
                          {form.projectName} (saved)
                        </option>
                      )}
                    {hrmsProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.code && p.code !== p.name ? ` (${p.code})` : ""}
                        {p.categoryName ? ` · ${p.categoryName}` : ""}
                      </option>
                    ))}
                  </select>
                  {hrmsMsg ? (
                    <p className="mt-1 text-[11px] text-amber-300/90">{hrmsMsg}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Choose the HRMS project trainees work on for this day. Progress uses this
                      for practice-work tracking.
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={saveDay}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
              >
                <Save className="h-4 w-4" />
                Save day
              </button>
            </div>
          ) : selected ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Day {selected.dayNumber}
                    {viewingTraineeDefault ? " · default preview" : ""}
                    {" · "}
                    {selected.checklistItems.filter((i) => (i.kind || "CHECKLIST") !== "WORK").length}{" "}
                    checklist
                    {" · "}
                    {selected.lessons.length} lesson
                    {selected.lessons.length === 1 ? "" : "s"}
                    {" · "}
                    {selected.checklistItems.filter((i) => i.kind === "WORK").length} work
                  </p>
                  <h2 className="text-xl font-semibold">{selected.title}</h2>
                  {selected.projectName && (
                    <p className="text-sm text-slate-400">{selected.projectName}</p>
                  )}
                  {selected.description && (
                    <p className="mt-1 text-sm text-slate-500">{selected.description}</p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(selected)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDay(selected.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-900/50 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {(() => {
                const checklistOnly = selected.checklistItems.filter(
                  (i) => (i.kind || "CHECKLIST") !== "WORK"
                );
                const workOnly = selected.checklistItems.filter((i) => i.kind === "WORK");
                return (
                  <div className="space-y-8">
                    {/* Checklist */}
                    <div>
                      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-300">
                        <ClipboardList className="h-4 w-4 text-sky-400" />
                        Checklist items
                      </h3>
                      <p className="mb-3 text-xs text-slate-500">
                        Tick-box tasks (policies, setup, intros, etc.).
                      </p>
                      <ul className="mb-4 space-y-2">
                        {checklistOnly.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-3 rounded-xl border border-slate-700 px-3 py-2"
                          >
                            <div>
                              <p className="font-medium">{item.title}</p>
                              {item.description && (
                                <p className="text-xs text-slate-500">{item.description}</p>
                              )}
                            </div>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => deleteChecklistItem(item.id)}
                                className="text-slate-500 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </li>
                        ))}
                        {checklistOnly.length === 0 && (
                          <p className="text-sm text-slate-500">No checklist items yet.</p>
                        )}
                      </ul>
                      {canEdit && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={newItem.title}
                            onChange={(e) =>
                              setNewItem({ ...newItem, title: e.target.value })
                            }
                            placeholder="New checklist item"
                            className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => addChecklistItem("CHECKLIST")}
                            className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500"
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Lessons / courses */}
                    <div>
                      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-300">
                        <BookOpen className="h-4 w-4 text-blue-400" />
                        Courses / videos
                      </h3>
                      <p className="mb-3 text-xs text-slate-500">
                        Attach lessons the trainee watches or completes this day.
                      </p>
                      <ul className="mb-4 space-y-2">
                        {selected.lessons.map((link) => (
                          <li
                            key={link.id}
                            className="flex items-start justify-between gap-3 rounded-xl border border-slate-700 px-3 py-2"
                          >
                            <div>
                              <p className="font-medium">{link.lesson.title}</p>
                              <p className="text-xs text-slate-500">
                                {link.lesson.module.course.title} · {link.lesson.module.title}
                              </p>
                            </div>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => detachLesson(link.id)}
                                className="text-slate-500 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </li>
                        ))}
                        {selected.lessons.length === 0 && (
                          <p className="text-sm text-slate-500">No lessons attached yet.</p>
                        )}
                      </ul>
                      {canEdit && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500">
                            Pick a lesson from your courses to attach to this day (not a separate
                            mode — it fills Courses / videos above).
                          </p>
                          {(() => {
                            const attachedIds = new Set(selected.lessons.map((l) => l.lessonId));
                            const available = lessons.filter((l) => !attachedIds.has(l.id));
                            if (available.length === 0) {
                              return (
                                <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-500">
                                  {lessons.length === 0
                                    ? "No lessons in the Course library yet. Add courses under Courses first."
                                    : "All available lessons are already attached to this day."}
                                </p>
                              );
                            }
                            return (
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <select
                                  value={lessonPick}
                                  onChange={(e) => setLessonPick(e.target.value)}
                                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100"
                                >
                                  <option value="">Select a lesson...</option>
                                  {available.map((l) => (
                                    <option key={l.id} value={l.id}>
                                      {`${l.courseTitle} - ${l.title}`}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={attachLesson}
                                  disabled={!lessonPick}
                                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
                                >
                                  <Link2 className="h-4 w-4" />
                                  Attach
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Training work */}
                    <div>
                      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-300">
                        <Briefcase className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        Training work
                      </h3>
                      <p className="mb-3 text-xs text-slate-600 dark:text-slate-500">
                        Pick the HRMS project and assigned hours. Trainees do not tick this off —
                        progress is calculated from HRMS tracker, and incomplete work does not block
                        the next day.
                      </p>
                      <ul className="mb-4 space-y-2">
                        {workOnly.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/20"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {item.title}
                              </p>
                              {formatWorkGoal(item.assignedHours, item.productionTarget) && (
                                <p className="text-xs font-medium text-amber-900 dark:text-amber-200/90">
                                  Unit goal:{" "}
                                  {formatWorkGoal(item.assignedHours, item.productionTarget)}
                                </p>
                              )}
                              {item.description && (
                                <p className="text-xs text-slate-600 dark:text-slate-500">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => deleteChecklistItem(item.id)}
                                className="shrink-0 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                                aria-label={`Remove ${item.title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </li>
                        ))}
                        {workOnly.length === 0 && (
                          <p className="text-sm text-slate-500">No training work items yet.</p>
                        )}
                      </ul>
                      {canEdit && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-slate-400">
                              Project to work on *
                            </label>
                            <select
                              value={newWork.hrmsProjectId}
                              required
                              onChange={(e) => {
                                const id = e.target.value;
                                const p = hrmsProjects.find((x) => x.id === id);
                                setNewWork({
                                  ...newWork,
                                  hrmsProjectId: id,
                                  title: p?.name || "",
                                });
                              }}
                              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm"
                            >
                              <option value="">Select project…</option>
                              {hrmsProjects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                  {p.code && p.code !== p.name ? ` (${p.code})` : ""}
                                  {p.categoryName ? ` · ${p.categoryName}` : ""}
                                </option>
                              ))}
                            </select>
                            {hrmsMsg && (
                              <p className="mt-1 text-[11px] text-amber-300/90">{hrmsMsg}</p>
                            )}
                            {hrmsProjects.length === 0 && !hrmsMsg && (
                              <p className="mt-1 text-[11px] text-slate-500">
                                No HRMS projects loaded yet.
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">
                              Unit goal (count) *
                            </label>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              required
                              value={newWork.productionTarget}
                              onChange={(e) =>
                                setNewWork({ ...newWork, productionTarget: e.target.value })
                              }
                              placeholder="e.g. 100"
                              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm"
                            />
                            <p className="mt-1 text-[11px] text-slate-500">
                              With assigned hours below: e.g. 2 h and 100 means 100 units should be
                              done in that 2-hour block (Work Metrics compares units done to this).
                            </p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">
                              Assigned hours for this goal *
                            </label>
                            <input
                              type="number"
                              min={0.5}
                              step={0.5}
                              required
                              value={newWork.assignedHours}
                              onChange={(e) =>
                                setNewWork({ ...newWork, assignedHours: e.target.value })
                              }
                              placeholder="e.g. 4"
                              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              value={newWork.description}
                              onChange={(e) =>
                                setNewWork({ ...newWork, description: e.target.value })
                              }
                              placeholder="Work instructions (optional)"
                              className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm"
                            />
                            <button
                              type="button"
                              disabled={
                                !newWork.hrmsProjectId ||
                                !newWork.assignedHours.trim() ||
                                !newWork.productionTarget.trim()
                              }
                              onClick={() => addChecklistItem("WORK")}
                              className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-600 px-3 py-2 text-sm hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Plus className="h-4 w-4" />
                              Add work
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Select a day or create a new one.</p>
          )}
        </div>
      </div>
    </div>
  );
}
