"use client";

import { useEffect, useRef, useState } from "react";
import { FileSpreadsheet, Plus, Trash2, Upload } from "lucide-react";
import { QUIZ_IMPORT_FORMAT_GUIDE } from "@/lib/quiz-import";

type Q = {
  question: string;
  options: string[];
  correct: string;
};

function mapQuizQuestions(
  list: { question: string; options: string; correct: string }[]
): Q[] {
  return list.map((q) => {
    let options: string[] = [];
    try {
      options = JSON.parse(q.options);
    } catch {
      options = [];
    }
    return { question: q.question, options, correct: q.correct };
  });
}

export function FinalEvaluationQuizManager() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [replaceOnImport, setReplaceOnImport] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/final-evaluation");
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Failed to load");
        return;
      }
      const quiz = data.quiz;
      if (!quiz) return;
      setTitle(quiz.title);
      setDescription(quiz.description || "");
      setQuestions(mapQuizQuestions(quiz.questions || []));
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/final-evaluation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, questions }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    setMsg("Final evaluation quiz saved.");
  }

  function downloadTemplate(format: "csv" | "xlsx" = "xlsx") {
    window.open(`/api/quiz/import-template?format=${format}`, "_blank");
  }

  async function importQuestions(file: File) {
    setImporting(true);
    setMsg("");
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const qs = replaceOnImport ? "?replace=1" : "";
      const res = await fetch(`/api/admin/final-evaluation/import${qs}`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        const details =
          Array.isArray(data.details) && data.details.length
            ? `\n${data.details.slice(0, 5).join("\n")}`
            : "";
        setError((data.error || "Import failed") + details);
        return;
      }

      if (data.quiz) {
        setTitle(data.quiz.title);
        setDescription(data.quiz.description || "");
        setQuestions(mapQuizQuestions(data.quiz.questions || []));
      }

      const warning =
        Array.isArray(data.skippedErrors) && data.skippedErrors.length
          ? ` ${data.skippedErrors.length} row(s) skipped.`
          : "";
      setMsg(
        `Imported ${data.imported} question(s)${
          data.replaced ? " (replaced previous)" : " (appended)"
        }.${warning}`
      );
    } catch (err) {
      console.error(err);
      setError("Failed to import file. Please try again.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading quiz…</p>;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-lg font-semibold">Final evaluation quiz</h2>
        <p className="mt-1 text-xs text-slate-500">
          Unlocks after all day-wise days are done (including any extra week). One attempt per
          cycle. No pass mark — the score is one evaluation input alongside overall performance.
        </p>
      </div>
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      {error && (
        <p className="whitespace-pre-wrap text-sm text-amber-300">{error}</p>
      )}

      <label className="block text-sm">
        <span className="text-slate-400">Title</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Description</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="rounded-xl border border-violet-500/30 bg-slate-950/50 p-4">
        <p className="text-sm font-semibold text-violet-100">
          Upload questions (Excel / CSV)
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Same format as lesson quizzes. Download the template, fill rows, then upload.
        </p>
        <p className="mt-2 text-xs text-slate-300">
          Required columns:{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-violet-200">
            {QUIZ_IMPORT_FORMAT_GUIDE.requiredColumns.join(", ")}
          </code>
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-500">
          {QUIZ_IMPORT_FORMAT_GUIDE.rules.slice(0, 4).map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadTemplate("xlsx")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Download Excel template
          </button>
          <button
            type="button"
            onClick={() => downloadTemplate("csv")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Download CSV template
          </button>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600">
            <Upload className="h-3.5 w-3.5" />
            {importing ? "Importing…" : "Upload Excel / CSV"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importQuestions(file);
              }}
            />
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={replaceOnImport}
            onChange={(e) => setReplaceOnImport(e.target.checked)}
          />
          Replace existing questions on upload (recommended)
        </label>
      </div>

      <div className="space-y-4">
        {questions.length === 0 ? (
          <p className="text-sm text-slate-500">
            No questions yet — upload an Excel file or add one manually.
          </p>
        ) : (
          questions.map((q, qi) => (
            <div key={qi} className="rounded-xl border border-slate-700 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">Question {qi + 1}</p>
                <button
                  type="button"
                  onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="Question text"
                value={q.question}
                onChange={(e) =>
                  setQuestions((prev) =>
                    prev.map((row, i) =>
                      i === qi ? { ...row, question: e.target.value } : row
                    )
                  )
                }
              />
              {q.options.map((opt, oi) => (
                <div key={oi} className="mb-1 flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={q.correct === opt}
                    onChange={() =>
                      setQuestions((prev) =>
                        prev.map((row, i) =>
                          i === qi ? { ...row, correct: opt } : row
                        )
                      )
                    }
                  />
                  <input
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm"
                    value={opt}
                    onChange={(e) => {
                      const next = e.target.value;
                      setQuestions((prev) =>
                        prev.map((row, i) => {
                          if (i !== qi) return row;
                          const options = row.options.map((o, j) =>
                            j === oi ? next : o
                          );
                          const correct =
                            row.correct === row.options[oi] ? next : row.correct;
                          return { ...row, options, correct };
                        })
                      );
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                className="mt-2 text-xs text-blue-400"
                onClick={() =>
                  setQuestions((prev) =>
                    prev.map((row, i) =>
                      i === qi
                        ? {
                            ...row,
                            options: [
                              ...row.options,
                              `Option ${row.options.length + 1}`,
                            ],
                          }
                        : row
                    )
                  )
                }
              >
                + option
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            setQuestions((prev) => [
              ...prev,
              {
                question: "",
                options: ["Option A", "Option B", "Option C", "Option D"],
                correct: "Option A",
              },
            ])
          }
          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save quiz"}
        </button>
      </div>
    </div>
  );
}
