"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";

type Question = {
  id: string;
  question: string;
  options: string;
  correct: string;
};

type Quiz = {
  id: string;
  title: string;
  passingScore: number;
  lesson: {
    title: string;
    module: {
      title: string;
      course: { title: string };
    };
  };
  questions: Question[];
};

type FormState = {
  question: string;
  optionsText: string;
  correct: string;
};

const emptyForm: FormState = {
  question: "",
  optionsText: "Option A\nOption B\nOption C\nOption D",
  correct: "Option A",
};

export function QuizQuestionManager({ quizzes }: { quizzes: Quiz[] }) {
  const router = useRouter();
  const [selectedQuizId, setSelectedQuizId] = useState(quizzes[0]?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === selectedQuizId) ?? quizzes[0],
    [quizzes, selectedQuizId]
  );

  function parseOptions(options: string) {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  function startCreate() {
    setEditingId("new");
    setForm(emptyForm);
    setError("");
  }

  function startEdit(question: Question) {
    const options = parseOptions(question.options);
    setEditingId(question.id);
    setForm({
      question: question.question,
      optionsText: options.join("\n"),
      correct: question.correct,
    });
    setError("");
  }

  async function save() {
    if (!selectedQuiz) return;
    const options = form.optionsText
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    if (!form.question.trim() || options.length < 2 || !form.correct.trim()) {
      setError("Question, at least 2 options, and correct answer are required.");
      return;
    }

    setLoading(true);
    setError("");
    const isNew = editingId === "new";
    const res = await fetch(isNew ? "/api/quiz/questions" : `/api/quiz/questions/${editingId}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizId: selectedQuiz.id,
        question: form.question,
        options,
        correct: form.correct,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not save quiz question.");
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  async function remove(question: Question) {
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/quiz/questions/${question.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  if (!quizzes.length) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
        Create a quiz lesson first, then questions can be managed here.
      </div>
    );
  }

  const questions = selectedQuiz?.questions ?? [];
  const activeOptions = form.optionsText
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <HelpCircle className="h-5 w-5 text-blue-300" />
            Certification Quiz Manager
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Maintain quiz questions, options, and correct answers used for certification.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Add Question
        </button>
      </div>

      <div className="mt-5">
        <label className="text-sm text-slate-400">Quiz</label>
        <select
          value={selectedQuiz?.id ?? ""}
          onChange={(event) => setSelectedQuizId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        >
          {quizzes.map((quiz) => (
            <option key={quiz.id} value={quiz.id}>
              {quiz.lesson.module.course.title} / {quiz.lesson.module.title} / {quiz.title}
            </option>
          ))}
        </select>
      </div>

      {editingId && (
        <div className="mt-5 rounded-lg border border-blue-500/40 bg-blue-950/20 p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-blue-200">{editingId === "new" ? "New Question" : "Edit Question"}</p>
            <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <label className="text-sm text-slate-400">
              Question
              <textarea
                value={form.question}
                onChange={(event) => setForm({ ...form, question: event.target.value })}
                rows={5}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
              />
            </label>
            <div className="space-y-4">
              <label className="block text-sm text-slate-400">
                Options, one per line
                <textarea
                  value={form.optionsText}
                  onChange={(event) => setForm({ ...form, optionsText: event.target.value })}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                />
              </label>
              <label className="block text-sm text-slate-400">
                Correct answer
                <select
                  value={form.correct}
                  onChange={(event) => setForm({ ...form, correct: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                >
                  {activeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <button
            onClick={save}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save Question"}
          </button>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {questions.map((question, index) => {
          const options = parseOptions(question.options);
          return (
            <div key={question.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-300">
                    Question {index + 1}
                  </p>
                  <p className="mt-1 font-medium text-white">{question.question}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(question)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(question)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-950 hover:text-rose-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {options.map((option) => (
                  <p
                    key={option}
                    className={
                      option === question.correct
                        ? "rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200"
                        : "rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-300"
                    }
                  >
                    {option}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
