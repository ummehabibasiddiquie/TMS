"use client";

import { useState, useEffect } from "react";
import { Plus, Settings, Users, BookOpen, CheckCircle, Clock } from "lucide-react";
import { TeamIntroManager } from "./TeamIntroManager";
import { CourseAssignmentManager } from "./CourseAssignmentManager";

interface OnboardingTemplate {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  steps: any[];
  teamIntros: any[];
  courses: any[];
}

export function OnboardingTemplatesManager() {
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/admin/onboarding/templates");
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (name: string, description: string) => {
    try {
      const response = await fetch("/api/admin/onboarding/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description })
      });

      if (response.ok) {
        setShowCreateModal(false);
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  };

  const toggleTemplateActive = async (templateId: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/onboarding/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive })
      });
      fetchTemplates();
    } catch (error) {
      console.error("Failed to toggle template:", error);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Onboarding Templates</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-lg border border-slate-800 bg-slate-900 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white">{template.name}</h3>
                {template.description && (
                  <p className="mt-1 text-sm text-slate-400">{template.description}</p>
                )}
              </div>
              <button
                onClick={() => toggleTemplateActive(template.id, template.isActive)}
                className={`ml-4 rounded-full px-3 py-1 text-xs font-medium ${
                  template.isActive
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {template.isActive ? "Active" : "Inactive"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <Users className="mx-auto h-5 w-5 text-blue-300" />
                <p className="mt-1 text-lg font-semibold text-white">
                  {template.teamIntros.length}
                </p>
                <p className="text-xs text-slate-400">Team Intros</p>
              </div>
              <div className="text-center">
                <BookOpen className="mx-auto h-5 w-5 text-blue-300" />
                <p className="mt-1 text-lg font-semibold text-white">
                  {template.courses.length}
                </p>
                <p className="text-xs text-slate-400">Courses</p>
              </div>
              <div className="text-center">
                <Settings className="mx-auto h-5 w-5 text-blue-300" />
                <p className="mt-1 text-lg font-semibold text-white">
                  {template.steps.length}
                </p>
                <p className="text-xs text-slate-400">Steps</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedTemplate(template)}
              className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Configure Template
            </button>
          </div>
        ))}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-white">Create New Template</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createTemplate(
                  formData.get("name") as string,
                  formData.get("description") as string
                );
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300">Name</label>
                <input
                  name="name"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  placeholder="Standard Onboarding"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Description</label>
                <textarea
                  name="description"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  placeholder="Default onboarding flow for new employees"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Configuration Modal */}
      {selectedTemplate && (
        <TemplateConfigModal
          template={selectedTemplate}
          onClose={() => {
            setSelectedTemplate(null);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
}

function TemplateConfigModal({
  template,
  onClose
}: {
  template: OnboardingTemplate;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"steps" | "team" | "courses" | "approvals">("steps");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="h-[80vh] w-full max-w-6xl rounded-lg border border-slate-800 bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-6">
          <div>
            <h3 className="text-lg font-semibold text-white">{template.name}</h3>
            <p className="text-sm text-slate-400">{template.description}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {[
            { id: "steps", label: "Steps", icon: Settings },
            { id: "team", label: "Team Intro", icon: Users },
            { id: "courses", label: "Courses", icon: BookOpen },
            { id: "approvals", label: "Approvals", icon: CheckCircle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium ${
                activeTab === tab.id
                  ? "border-b-2 border-blue-500 text-blue-300"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "steps" && <StepsConfig template={template} />}
          {activeTab === "team" && (
            <TeamIntroManager 
              templateId={template.id} 
              teamIntros={template.teamIntros} 
              onUpdate={onClose} 
            />
          )}
          {activeTab === "courses" && (
            <CourseAssignmentManager 
              templateId={template.id} 
              courses={template.courses} 
              availableCourses={[]} // TODO: Fetch available courses
              onUpdate={onClose} 
            />
          )}
          {activeTab === "approvals" && <ApprovalsConfig template={template} />}
        </div>
      </div>
    </div>
  );
}

function StepsConfig({ template }: { template: OnboardingTemplate }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white">Onboarding Steps</h4>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add Step
        </button>
      </div>

      {template.steps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-8 text-center">
          <Settings className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-2 text-slate-400">No steps configured yet</p>
          <p className="text-sm text-slate-500">Add steps to define the onboarding flow</p>
        </div>
      ) : (
        <div className="space-y-2">
          {template.steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 p-4"
            >
              <div>
                <p className="font-medium text-white">{step.title}</p>
                <p className="text-sm text-slate-400">{step.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
                  Order: {step.order}
                </span>
                <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamIntroConfig({ template }: { template: OnboardingTemplate }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white">Team Introduction Modules</h4>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add Team Intro
        </button>
      </div>

      {template.teamIntros.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-2 text-slate-400">No team introductions configured</p>
          <p className="text-sm text-slate-500">Add team introductions to help new employees</p>
        </div>
      ) : (
        <div className="space-y-2">
          {template.teamIntros.map((intro) => (
            <div
              key={intro.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 p-4"
            >
              <div>
                <p className="font-medium text-white">{intro.title}</p>
                <p className="text-sm text-slate-400">
                  {intro.employees.length} employees assigned
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700">
                  Manage Employees
                </button>
                <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CoursesConfig({ template }: { template: OnboardingTemplate }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white">Training Courses</h4>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add Course
        </button>
      </div>

      {template.courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-8 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-2 text-slate-400">No courses assigned</p>
          <p className="text-sm text-slate-500">Add training courses for this template</p>
        </div>
      ) : (
        <div className="space-y-2">
          {template.courses.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 p-4"
            >
              <div>
                <p className="font-medium text-white">{assignment.title}</p>
                <p className="text-sm text-slate-400">
                  {assignment.course?.title || "Course not found"} • Passing: {assignment.passingScore}%
                </p>
                <p className="text-xs text-slate-500">
                  {assignment.employeeProgress.length} employees assigned • {assignment.quizzes.length} quizzes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700">
                  Manage Quiz
                </button>
                <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700">
                  Assign
                </button>
                <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalsConfig({ template }: { template: OnboardingTemplate }) {
  const [pendingApprovals, setPendingApprovals] = useState<any>(null);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/onboarding/approvals/pending")
      .then((res) => res.json())
      .then(setPendingApprovals);
  }, []);

  const approveStep = async (userId: string, stepId: string) => {
    setApproving(`step-${stepId}`);
    try {
      await fetch("/api/admin/onboarding/approvals/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, stepId })
      });
      // Refresh pending approvals
      const response = await fetch("/api/admin/onboarding/approvals/pending");
      setPendingApprovals(await response.json());
    } catch (error) {
      console.error("Failed to approve step:", error);
    } finally {
      setApproving(null);
    }
  };

  const approveCourse = async (progressId: string) => {
    setApproving(`course-${progressId}`);
    try {
      await fetch("/api/admin/onboarding/approvals/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressId })
      });
      const response = await fetch("/api/admin/onboarding/approvals/pending");
      setPendingApprovals(await response.json());
    } catch (error) {
      console.error("Failed to approve course:", error);
    } finally {
      setApproving(null);
    }
  };

  const approveQuiz = async (attemptId: string) => {
    setApproving(`quiz-${attemptId}`);
    try {
      await fetch("/api/admin/onboarding/approvals/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId })
      });
      const response = await fetch("/api/admin/onboarding/approvals/pending");
      setPendingApprovals(await response.json());
    } catch (error) {
      console.error("Failed to approve quiz:", error);
    } finally {
      setApproving(null);
    }
  };

  if (!pendingApprovals) {
    return <div className="text-slate-400">Loading pending approvals...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white">Pending Approvals</h4>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Clock className="h-4 w-4" />
          {pendingApprovals.total} items pending
        </div>
      </div>

      {pendingApprovals.total === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-2 text-slate-400">No pending approvals</p>
          <p className="text-sm text-slate-500">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Steps */}
          {pendingApprovals.steps.length > 0 && (
            <div>
              <h5 className="mb-2 text-sm font-medium text-slate-300">Step Completions</h5>
              <div className="space-y-2">
                {pendingApprovals.steps.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{item.user.name}</p>
                      <p className="text-sm text-slate-400">{item.step.title}</p>
                      <p className="text-xs text-slate-500">
                        Completed: {new Date(item.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => approveStep(item.userId, item.stepId)}
                      disabled={approving === `step-${item.stepId}`}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {approving === `step-${item.stepId}` ? "Approving..." : "Approve"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courses */}
          {pendingApprovals.courses.length > 0 && (
            <div>
              <h5 className="mb-2 text-sm font-medium text-slate-300">Course Completions</h5>
              <div className="space-y-2">
                {pendingApprovals.courses.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{item.user.name}</p>
                      <p className="text-sm text-slate-400">{item.assignment.title}</p>
                      <p className="text-xs text-slate-500">
                        Completed: {new Date(item.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => approveCourse(item.id)}
                      disabled={approving === `course-${item.id}`}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {approving === `course-${item.id}` ? "Approving..." : "Approve"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quizzes */}
          {pendingApprovals.quizzes.length > 0 && (
            <div>
              <h5 className="mb-2 text-sm font-medium text-slate-300">Quiz Attempts</h5>
              <div className="space-y-2">
                {pendingApprovals.quizzes.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{item.user.name}</p>
                      <p className="text-sm text-slate-400">
                        {item.courseQuiz.title} - Score: {item.score}%
                      </p>
                      <p className="text-xs text-slate-500">
                        Attempted: {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => approveQuiz(item.id)}
                      disabled={approving === `quiz-${item.id}`}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {approving === `quiz-${item.id}` ? "Approving..." : "Approve"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}