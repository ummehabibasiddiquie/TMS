"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";

type ChecklistItem = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  kind?: string;
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
  const [msg, setMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    dayNumber: 1,
    title: "",
    dayType: "MIXED",
    projectName: "",
    description: "",
  });
  const [newItem, setNewItem] = useState({ title: "", description: "", kind: "CHECKLIST" });
  const [newWork, setNewWork] = useState({ title: "", description: "" });
  const [lessonPick, setLessonPick] = useState("");
  const [traineePercent, setTraineePercent] = useState<number | null>(null);

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

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadLessons();
    void loadTrainees();
  }, [loadLessons, loadTrainees]);

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
    setMsg("");
    const res = await fetch(`/api/curriculum/trainee/${traineeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enable" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not create personal schedule");
      return;
    }
    setMsg(
      data.created
        ? "Personal schedule created from the default. Edits only affect this trainee."
        : "This trainee already has a personal schedule."
    );
    await load();
    await loadTrainees();
  }

  async function resetToDefault() {
    if (!traineeId) return;
    if (
      !confirm(
        "Remove this trainee’s personal schedule and switch them back to the default for everyone?"
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/curriculum/trainee/${traineeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Reset failed");
      return;
    }
    setMsg("Trainee is back on the default schedule.");
    setEditing(false);
    await load();
    await loadTrainees();
  }

  async function extendWeek() {
    if (!traineeId) return;
    if (
      !confirm(
        "Add the default extra-week schedule for this trainee? Days (checklist, courses, work) are copied from Extra week default — you can edit this trainee’s copy afterward."
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/curriculum/trainee/${traineeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extendWeek", days: 7 }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not add week");
      return;
    }
    setMsg(
      data.fromTemplate
        ? `Copied Extra week default as Days ${data.fromDay}–${data.toDay}. Edit this trainee’s copy as needed.`
        : `Added Days ${data.fromDay}–${data.toDay}. Select a new day to add content.`
    );
    setEditing(false);
    await load();
    await loadTrainees();
  }

  async function addChecklistItem(kind: "CHECKLIST" | "WORK" = "CHECKLIST") {
    if (!selected || !canEdit) return;
    const payload =
      kind === "WORK"
        ? { title: newWork.title, description: newWork.description, kind: "WORK" }
        : { title: newItem.title, description: newItem.description, kind: "CHECKLIST" };
    if (!payload.title.trim()) return;
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
    if (kind === "WORK") setNewWork({ title: "", description: "" });
    else setNewItem({ title: "", description: "", kind: "CHECKLIST" });
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
    return <p className="text-slate-400">Loading curriculum…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Day-wise curriculum</h1>
          <p className="mt-1 text-sm text-slate-400">
            Default schedule for everyone, Extra week default (copied when someone gets +1 week),
            or a personal copy for one trainee.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Add day
          </button>
        )}
      </div>

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
            <option value="">Default (all trainees)</option>
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
            When Admin adds +1 week, these days are copied to that trainee. Leads can edit the
            trainee’s copy afterward without changing this template.
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
                Reset to default
              </button>
            )}
            {traineeId && traineePercent != null && traineePercent < 90 ? (
              <button
                type="button"
                disabled={busy}
                onClick={extendWeek}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100 hover:bg-amber-900/40 disabled:opacity-50"
              >
                <CalendarPlus className="h-4 w-4" />
                +1 week (from Extra week default)
              </button>
            ) : traineeId ? (
              <p className="text-xs text-slate-500 self-center">
                Extra week only when progress is under 90%
                {traineePercent != null ? ` (now ${traineePercent}%)` : ""}.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {isExtraWeekDefault && (
        <p className="rounded-xl bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          Editing Extra week default — shared template for all +1 week extensions.
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
            : `${traineeLabel} uses the default schedule (preview below). Click “Customize for this trainee” to make a personal copy you can edit.`}
        </p>
      )}

      {msg && (
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
                  <label className="text-xs text-slate-400">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400">Project name (optional)</label>
                  <input
                    value={form.projectName}
                    onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                    placeholder="e.g. Landscaping"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2"
                  />
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
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800"
                    >
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
                      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-300">
                        <Briefcase className="h-4 w-4 text-amber-400" />
                        Training work
                      </h3>
                      <p className="mb-3 text-xs text-slate-500">
                        Hands-on practice tasks for this day (after checklist / videos, or alongside).
                      </p>
                      <ul className="mb-4 space-y-2">
                        {workOnly.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-3 rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2"
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
                        {workOnly.length === 0 && (
                          <p className="text-sm text-slate-500">No training work items yet.</p>
                        )}
                      </ul>
                      {canEdit && (
                        <div className="space-y-2">
                          <input
                            value={newWork.title}
                            onChange={(e) =>
                              setNewWork({ ...newWork, title: e.target.value })
                            }
                            placeholder="Training work title"
                            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm"
                          />
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              value={newWork.description}
                              onChange={(e) =>
                                setNewWork({ ...newWork, description: e.target.value })
                              }
                              placeholder="Instructions (optional)"
                              className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => addChecklistItem("WORK")}
                              className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-600 px-3 py-2 text-sm hover:bg-amber-500"
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
