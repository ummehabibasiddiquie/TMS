"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Lock, Clock, Users, BookOpen, Play, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicOnboardingFlowProps {
  data: any;
  user: any;
}

export function DynamicOnboardingFlow({ data, user }: DynamicOnboardingFlowProps) {
  const [selectedSection, setSelectedSection] = useState<"overview" | "team" | "courses" | "quizzes">("overview");
  const [completingStep, setCompletingStep] = useState<string | null>(null);
  const [takingQuiz, setTakingQuiz] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<any>(null);

  const { template, steps, stepProgress, overallProgress } = data;

  const completeStep = async (stepId: string) => {
    setCompletingStep(stepId);
    try {
      const response = await fetch(`/api/onboarding/dynamic/steps/${stepId}/complete`, {
        method: "POST"
      });
      if (response.ok) {
        window.location.reload(); // Refresh to show updated status
      }
    } catch (error) {
      console.error("Failed to complete step:", error);
    } finally {
      setCompletingStep(null);
    }
  };

  const completeCourse = async (progressId: string) => {
    try {
      const response = await fetch(`/api/onboarding/dynamic/courses/${progressId}/complete`, {
        method: "POST"
      });
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to complete course:", error);
    }
  };

  const submitQuiz = async (quizId: string, answers: Record<string, any>) => {
    setTakingQuiz(quizId);
    try {
      const response = await fetch(`/api/onboarding/dynamic/quizzes/${quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      const result = await response.json();
      setQuizResult(result);
      window.location.reload();
    } catch (error) {
      console.error("Failed to submit quiz:", error);
    } finally {
      setTakingQuiz(null);
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return CheckCircle2;
      case "PENDING_APPROVAL":
        return Clock;
      case "ACTIVE":
        return Circle;
      default:
        return Lock;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-emerald-300";
      case "PENDING_APPROVAL":
        return "text-amber-300";
      case "ACTIVE":
        return "text-blue-300";
      default:
        return "text-slate-400";
    }
  };

  const getStepBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-500/15 text-emerald-300";
      case "PENDING_APPROVAL":
        return "bg-amber-500/15 text-amber-300";
      case "ACTIVE":
        return "bg-blue-500/15 text-blue-300";
      default:
        return "bg-slate-700 text-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="font-medium text-white">
            Overall Progress - {overallProgress.completed} of {overallProgress.total} steps complete
          </p>
          <p className="text-sm font-semibold text-blue-300">{overallProgress.percent}%</p>
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-800">
          <div className="h-2 rounded-full bg-blue-500" style={{ width: `${overallProgress.percent}%` }} />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-4">
        {[
          { id: "overview", label: "Overview", icon: Circle },
          { id: "team", label: "Team Introduction", icon: Users },
          { id: "courses", label: "Training Courses", icon: BookOpen },
          { id: "quizzes", label: "Certification Quizzes", icon: Check }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedSection(tab.id as any)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              selectedSection === tab.id
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      {selectedSection === "overview" && (
        <div className="space-y-3">
          {steps.map((step: any) => {
            const Icon = getStepIcon(step.status);
            const isActive = step.status === "ACTIVE";
            const isPendingApproval = step.status === "PENDING_APPROVAL";
            const isCompleted = step.status === "COMPLETED";

            return (
              <div
                key={step.id}
                className={cn(
                  "rounded-lg border p-5",
                  isActive ? "border-blue-800 bg-blue-900/10" : "border-slate-800 bg-slate-900",
                  !isActive && !isCompleted && !isPendingApproval && "opacity-70"
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    <Icon className={cn("mt-1 h-5 w-5", getStepColor(step.status))} />
                    <div>
                      <h2 className="font-semibold text-white">{step.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {step.day} - {step.duration} - {step.type}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">{step.description}</p>
                      {isPendingApproval && (
                        <p className="mt-2 text-xs text-amber-400">
                          ⏳ Awaiting approval from your team lead
                        </p>
                      )}
                      {isCompleted && step.progress?.approver && (
                        <p className="mt-2 text-xs text-emerald-400">
                          ✓ Approved by {step.progress.approver.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-fit rounded-full px-3 py-1 text-xs font-medium capitalize",
                        getStepBadge(step.status)
                      )}
                    >
                      {step.status.toLowerCase().replace("_", " ")}
                    </span>
                    {isActive && (
                      <button
                        onClick={() => completeStep(step.id)}
                        disabled={completingStep === step.id}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {completingStep === step.id ? (
                          "Marking..."
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Mark Complete
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedSection === "team" && (
        <TeamIntroductionSection teamIntros={template.teamIntros} />
      )}

      {selectedSection === "courses" && (
        <CoursesSection courses={template.courses} user={user} onCompleteCourse={completeCourse} />
      )}

      {selectedSection === "quizzes" && (
        <QuizzesSection courses={template.courses} user={user} onStartQuiz={setTakingQuiz} onSubmitQuiz={submitQuiz} />
      )}

      {/* Quiz Taking Modal */}
      {takingQuiz && quizResult === null && (
        <QuizTakingModal
          courses={template.courses}
          quizId={takingQuiz}
          onClose={() => setTakingQuiz(null)}
          onSubmit={submitQuiz}
        />
      )}

      {/* Quiz Result Modal */}
      {quizResult && (
        <QuizResultModal
          result={quizResult}
          onClose={() => {
            setQuizResult(null);
            setTakingQuiz(null);
          }}
        />
      )}
    </div>
  );
}

function TeamIntroductionSection({ teamIntros }: { teamIntros: any[] }) {
  if (teamIntros.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-slate-600" />
        <p className="mt-2 text-slate-400">No team introductions available</p>
        <p className="text-sm text-slate-500">Contact your administrator if this seems incorrect</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {teamIntros.map((intro) => (
        <div key={intro.id} className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="font-semibold text-white">{intro.title}</h3>
          <div className="mt-4 prose prose-invert prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: intro.content }} />
          </div>
          {intro.employees.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-slate-300">Team Members</h4>
              <div className="mt-2 space-y-2">
                {intro.employees.map((employee: any) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3"
                  >
                    <div>
                      <p className="font-medium text-white">{employee.user.name}</p>
                      <p className="text-sm text-slate-400">{employee.role}</p>
                      {employee.manager && (
                        <p className="text-xs text-slate-500">Manager: {employee.manager}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CoursesSection({ courses, user, onCompleteCourse }: { courses: any[]; user: any; onCompleteCourse: (progressId: string) => Promise<void> }) {
  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-8 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-slate-600" />
        <p className="mt-2 text-slate-400">No courses assigned</p>
        <p className="text-sm text-slate-500">Contact your administrator if this seems incorrect</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((assignment) => {
        const progress = assignment.employeeProgress[0];
        if (!progress) return null;

        const statusColors: Record<string, string> = {
          NOT_STARTED: "bg-slate-700 text-slate-300",
          IN_PROGRESS: "bg-blue-500/15 text-blue-300",
          DONE: "bg-amber-500/15 text-amber-300",
          APPROVED: "bg-emerald-500/15 text-emerald-300"
        };

        return (
          <div key={assignment.id} className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white">{assignment.title}</h3>
                {assignment.description && (
                  <p className="mt-1 text-sm text-slate-400">{assignment.description}</p>
                )}
                <p className="mt-2 text-sm text-slate-500">
                  Course: {assignment.course?.title || "Not found"} • Passing Score: {assignment.passingScore}%
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium capitalize",
                  statusColors[progress.status] || "bg-slate-700 text-slate-300"
                )}
              >
                {progress.status.toLowerCase().replace("_", " ")}
              </span>
            </div>

            {progress.status === "DONE" && !progress.approvedAt && (
              <div className="mt-4 rounded-lg bg-amber-900/20 border border-amber-800 p-3">
                <p className="text-sm text-amber-300">
                  ⏳ Course completed - awaiting approval from your team lead
                </p>
              </div>
            )}

            {progress.approvedAt && (
              <div className="mt-4 rounded-lg bg-emerald-900/20 border border-emerald-800 p-3">
                <p className="text-sm text-emerald-300">
                  ✓ Course approved by {progress.approver?.name || "admin"} on{" "}
                  {new Date(progress.approvedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {progress.status === "APPROVED" && assignment.quizzes.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-300">Available Quizzes</h4>
                <div className="mt-2 space-y-2">
                  {assignment.quizzes.map((quiz: any) => (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3"
                    >
                      <div>
                        <p className="font-medium text-white">{quiz.title}</p>
                        <p className="text-sm text-slate-400">
                          {quiz.questions.length} questions • Passing: {quiz.passingScore}%
                        </p>
                      </div>
                      <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                        Start Quiz
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(progress.status === "NOT_STARTED" || progress.status === "IN_PROGRESS") && (
              <div className="mt-4">
                <button
                  onClick={() => onCompleteCourse(progress.id)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Mark as Complete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuizzesSection({ courses, user, onStartQuiz, onSubmitQuiz }: { courses: any[]; user: any; onStartQuiz: (quizId: string) => void; onSubmitQuiz: (quizId: string, answers: Record<string, any>) => Promise<void> }) {
  const availableQuizzes = courses.flatMap((assignment) =>
    assignment.quizzes
      .filter((quiz: any) => {
        const progress = assignment.employeeProgress[0];
        return progress?.status === "APPROVED";
      })
      .map((quiz: any) => ({ ...quiz, courseTitle: assignment.course?.title }))
  );

  if (availableQuizzes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-8 text-center">
        <Check className="mx-auto h-12 w-12 text-slate-600" />
        <p className="mt-2 text-slate-400">No quizzes available yet</p>
        <p className="text-sm text-slate-500">
          Complete and get approval for your assigned courses to unlock quizzes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {availableQuizzes.map((quiz: any) => (
        <div key={quiz.id} className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-white">{quiz.title}</h3>
              {quiz.description && (
                <p className="mt-1 text-sm text-slate-400">{quiz.description}</p>
              )}
              <p className="mt-2 text-sm text-slate-500">
                {quiz.questions.length} questions • Passing: {quiz.passingScore}% • Max attempts: {quiz.maxAttempts}
              </p>
              <p className="text-xs text-slate-500">Course: {quiz.courseTitle}</p>
            </div>
            <button 
              onClick={() => onStartQuiz(quiz.id)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Start Quiz
            </button>
          </div>

          {quiz.attempts && quiz.attempts.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-slate-300">Previous Attempts</h4>
              <div className="mt-2 space-y-2">
                {quiz.attempts.map((attempt: any) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3"
                  >
                    <div>
                      <p className="font-medium text-white">Score: {attempt.score}%</p>
                      <p className="text-sm text-slate-400">
                        {attempt.passed ? "✓ Passed" : "✗ Failed"} • {new Date(attempt.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {attempt.approvedAt ? (
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                        Approved
                      </span>
                    ) : attempt.passed ? (
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
                        Pending Approval
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
                        Failed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function QuizTakingModal({ courses, quizId, onClose, onSubmit }: { courses: any[]; quizId: string; onClose: () => void; onSubmit: (quizId: string, answers: Record<string, any>) => Promise<void> }) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  // Find the quiz
  const quiz = courses.flatMap(c => c.quizzes).find((q: any) => q.id === quizId);
  if (!quiz) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(quizId, answers);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl rounded-lg border border-slate-800 bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">{quiz.title}</h3>
            <p className="text-sm text-slate-400">{quiz.questions.length} questions • Passing: {quiz.passingScore}%</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {quiz.questions.map((question: any, index: number) => {
            const options = JSON.parse(question.options);
            return (
              <div key={question.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <p className="font-medium text-white mb-3">
                  {index + 1}. {question.question}
                </p>
                <div className="space-y-2">
                  {options.map((option: string, optIndex: number) => (
                    <label key={optIndex} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name={question.id}
                        value={optIndex}
                        checked={answers[question.id] === optIndex}
                        onChange={(e) => setAnswers({ ...answers, [question.id]: parseInt(e.target.value) })}
                        className="rounded border-slate-600 bg-slate-700"
                      />
                      <span className="text-slate-300">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || Object.keys(answers).length < quiz.questions.length}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuizResultModal({ result, onClose }: { result: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            result.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          }`}>
            {result.passed ? <Check className="h-8 w-8" /> : <X className="h-8 w-8" />}
          </div>
          <h3 className="text-lg font-semibold text-white">
            {result.passed ? "Quiz Passed!" : "Quiz Failed"}
          </h3>
          <p className="mt-2 text-3xl font-bold text-white">{result.score}%</p>
          <p className="mt-1 text-sm text-slate-400">
            {result.correct} of {result.total} questions correct
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Passing score: {result.passingScore}%
          </p>

          {!result.passed && (
            <p className="mt-4 text-sm text-amber-400">
              You can retake the quiz after reviewing the course material.
            </p>
          )}

          {result.passed && (
            <p className="mt-4 text-sm text-emerald-400">
              Your result is pending approval from your team lead.
            </p>
          )}

          <button
            onClick={onClose}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}