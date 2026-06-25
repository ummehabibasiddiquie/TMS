"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Save, BookOpen, Users, CheckCircle } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description?: string;
}

interface CourseAssignment {
  id: string;
  courseId: string;
  course?: Course;
  title: string;
  description?: string;
  order: number;
  passingScore: number;
  employeeProgress: any[];
  quizzes: CourseQuiz[];
}

interface CourseQuiz {
  id: string;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
  isActive: boolean;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string;
  correct: string;
  order: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CourseAssignmentManagerProps {
  templateId: string;
  courses: CourseAssignment[];
  availableCourses: Course[];
  onUpdate: () => void;
}

export function CourseAssignmentManager({ templateId, courses, availableCourses, onUpdate }: CourseAssignmentManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<CourseAssignment | null>(null);
  const [managingQuiz, setManagingQuiz] = useState<CourseAssignment | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();
      setAvailableUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const createAssignment = async (courseId: string, title: string, description: string, order: number, passingScore: number) => {
    try {
      await fetch("/api/admin/onboarding/course-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, courseId, title, description, order, passingScore })
      });
      setShowCreateModal(false);
      onUpdate();
    } catch (error) {
      console.error("Failed to create assignment:", error);
    }
  };

  const updateAssignment = async (assignmentId: string, title: string, description: string, order: number, passingScore: number) => {
    try {
      await fetch(`/api/admin/onboarding/course-assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, order, passingScore })
      });
      setEditingAssignment(null);
      onUpdate();
    } catch (error) {
      console.error("Failed to update assignment:", error);
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this course assignment? This will also remove all associated quizzes and progress.")) return;
    try {
      await fetch(`/api/admin/onboarding/course-assignments/${assignmentId}`, {
        method: "DELETE"
      });
      onUpdate();
    } catch (error) {
      console.error("Failed to delete assignment:", error);
    }
  };

  const assignEmployees = async (assignmentId: string, userIds: string[]) => {
    try {
      await fetch(`/api/admin/onboarding/course-assignments/${assignmentId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds })
      });
      onUpdate();
    } catch (error) {
      console.error("Failed to assign employees:", error);
    }
  };

  const unassignEmployees = async (assignmentId: string, userIds: string[]) => {
    try {
      await fetch(`/api/admin/onboarding/course-assignments/${assignmentId}/unassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds })
      });
      onUpdate();
    } catch (error) {
      console.error("Failed to unassign employees:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white">Training Courses</h4>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-8 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-2 text-slate-400">No courses assigned</p>
          <p className="text-sm text-slate-500">Add training courses for this template</p>
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 p-4"
            >
              <div className="flex-1">
                <p className="font-medium text-white">{assignment.title}</p>
                <p className="text-sm text-slate-400">
                  {assignment.course?.title || "Course not found"} • Passing: {assignment.passingScore}%
                </p>
                <p className="text-xs text-slate-500">
                  {assignment.employeeProgress.length} employees assigned • {assignment.quizzes.length} quizzes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setManagingQuiz(assignment)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
                >
                  Manage Quiz
                </button>
                <button
                  onClick={() => setEditingAssignment(assignment)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteAssignment(assignment.id)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-red-400 hover:bg-slate-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <AssignmentModal
          availableCourses={availableCourses}
          onClose={() => setShowCreateModal(false)}
          onSave={createAssignment}
        />
      )}

      {/* Edit Modal */}
      {editingAssignment && (
        <AssignmentModal
          assignment={editingAssignment}
          availableCourses={availableCourses}
          onClose={() => setEditingAssignment(null)}
          onSave={(courseId, title, description, order, passingScore) => 
            updateAssignment(editingAssignment.id, title, description, order, passingScore)
          }
        />
      )}

      {/* Quiz Management Modal */}
      {managingQuiz && (
        <QuizManagementModal
          assignment={managingQuiz}
          availableUsers={availableUsers}
          onClose={() => setManagingQuiz(null)}
          onUpdate={onUpdate}
          onAssignEmployees={(userIds) => assignEmployees(managingQuiz.id, userIds)}
          onUnassignEmployees={(userIds) => unassignEmployees(managingQuiz.id, userIds)}
        />
      )}
    </div>
  );
}

function AssignmentModal({
  assignment,
  availableCourses,
  onClose,
  onSave
}: {
  assignment?: CourseAssignment;
  availableCourses: Course[];
  onClose: () => void;
  onSave: (courseId: string, title: string, description: string, order: number, passingScore: number) => void;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSave(
      formData.get("courseId") as string,
      formData.get("title") as string,
      formData.get("description") as string,
      parseInt(formData.get("order") as string) || 0,
      parseInt(formData.get("passingScore") as string) || 80
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {assignment ? "Edit Course Assignment" : "Add Course Assignment"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Course</label>
            <select
              name="courseId"
              defaultValue={assignment?.courseId}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="">Select a course...</option>
              {availableCourses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Title</label>
            <input
              name="title"
              defaultValue={assignment?.title}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              placeholder="e.g., React Fundamentals"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Description</label>
            <textarea
              name="description"
              defaultValue={assignment?.description || ""}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              placeholder="Optional description..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Order</label>
              <input
                name="order"
                type="number"
                defaultValue={assignment?.order ?? 0}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Passing Score (%)</label>
              <input
                name="passingScore"
                type="number"
                defaultValue={assignment?.passingScore ?? 80}
                min="0"
                max="100"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </div>
          </div>
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Save className="mr-2 h-4 w-4 inline" />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuizManagementModal({
  assignment,
  availableUsers,
  onClose,
  onUpdate,
  onAssignEmployees,
  onUnassignEmployees
}: {
  assignment: CourseAssignment;
  availableUsers: User[];
  onClose: () => void;
  onUpdate: () => void;
  onAssignEmployees: (userIds: string[]) => void;
  onUnassignEmployees: (userIds: string[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<"quiz" | "employees">("quiz");
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<CourseQuiz | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const assignedUserIds = assignment.employeeProgress.map((p: any) => p.userId);

  const handleAssignEmployees = () => {
    if (selectedUserIds.length > 0) {
      onAssignEmployees(selectedUserIds);
      setSelectedUserIds([]);
    }
  };

  const handleUnassignEmployee = (userId: string) => {
    onUnassignEmployees([userId]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="h-[80vh] w-full max-w-5xl rounded-lg border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 p-6">
          <div>
            <h3 className="text-lg font-semibold text-white">{assignment.title}</h3>
            <p className="text-sm text-slate-400">{assignment.course?.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab("quiz")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium ${
              activeTab === "quiz"
                ? "border-b-2 border-blue-500 text-blue-300"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            Quiz Management
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium ${
              activeTab === "employees"
                ? "border-b-2 border-blue-500 text-blue-300"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            <Users className="h-4 w-4" />
            Employee Assignment ({assignment.employeeProgress.length})
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(80vh - 140px)" }}>
          {activeTab === "quiz" ? (
            <QuizContent
              assignment={assignment}
              onShowCreateQuiz={() => setShowCreateQuiz(true)}
              onEditQuiz={setEditingQuiz}
              onUpdate={onUpdate}
            />
          ) : (
            <EmployeeAssignmentContent
              assignment={assignment}
              availableUsers={availableUsers}
              selectedUserIds={selectedUserIds}
              onToggleUser={(userId) => {
                setSelectedUserIds(prev =>
                  prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
                );
              }}
              onAssign={handleAssignEmployees}
              onUnassign={handleUnassignEmployee}
            />
          )}
        </div>

        {showCreateQuiz && (
          <QuizModal
            assignmentId={assignment.id}
            onClose={() => setShowCreateQuiz(false)}
            onUpdate={onUpdate}
          />
        )}

        {editingQuiz && (
          <QuizModal
 assignmentId={assignment.id}
            quiz={editingQuiz}
            onClose={() => setEditingQuiz(null)}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  );
}

function QuizContent({
  assignment,
  onShowCreateQuiz,
  onEditQuiz,
  onUpdate
}: {
  assignment: CourseAssignment;
  onShowCreateQuiz: () => void;
  onEditQuiz: (quiz: CourseQuiz) => void;
  onUpdate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white">Quizzes</h4>
        <button
          onClick={onShowCreateQuiz}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Quiz
        </button>
      </div>

      {assignment.quizzes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-2 text-slate-400">No quizzes created</p>
          <p className="text-sm text-slate-500">Create a quiz to test employee knowledge</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignment.quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 p-4"
            >
              <div>
                <p className="font-medium text-white">{quiz.title}</p>
                <p className="text-sm text-slate-400">
                  {quiz.questions.length} questions • Passing: {quiz.passingScore}% • Max attempts: {quiz.maxAttempts}
                </p>
              </div>
              <button
                onClick={() => onEditQuiz(quiz)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmployeeAssignmentContent({
  assignment,
  availableUsers,
  selectedUserIds,
  onToggleUser,
  onAssign,
  onUnassign
}: {
  assignment: CourseAssignment;
  availableUsers: User[];
  selectedUserIds: string[];
  onToggleUser: (userId: string) => void;
  onAssign: () => void;
  onUnassign: (userId: string) => void;
}) {
  const assignedUserIds = assignment.employeeProgress.map((p: any) => p.userId);
  const availableToAdd = availableUsers.filter(u => !assignedUserIds.includes(u.id));

  return (
    <div className="space-y-6">
      {/* Add Employees */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h4 className="mb-3 text-sm font-medium text-slate-300">Assign Employees</h4>
        <div className="space-y-2">
          {availableToAdd.length === 0 ? (
            <p className="text-slate-500 text-sm">All users are already assigned</p>
          ) : (
            <>
              {availableToAdd.slice(0, 5).map(user => (
                <div key={user.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => onToggleUser(user.id)}
                    className="rounded border-slate-600 bg-slate-700"
                  />
                  <span className="text-white">{user.name} ({user.email})</span>
                </div>
              ))}
              {availableToAdd.length > 5 && (
                <p className="text-slate-500 text-xs">...and {availableToAdd.length - 5} more</p>
              )}
              <button
                onClick={onAssign}
                disabled={selectedUserIds.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Assign Selected ({selectedUserIds.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Current Assignments */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-slate-300">Current Assignments ({assignment.employeeProgress.length})</h4>
        {assignment.employeeProgress.length === 0 ? (
          <p className="text-slate-500 text-sm">No employees assigned yet</p>
        ) : (
          <div className="space-y-2">
            {assignment.employeeProgress.map((progress: any) => (
              <div
                key={progress.id}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3"
              >
                <div>
                  <p className="font-medium text-white">{progress.user.name}</p>
                  <p className="text-xs text-slate-400">Status: {progress.status}</p>
                </div>
                <button
                  onClick={() => onUnassign(progress.userId)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-red-400 hover:bg-slate-700"
                >
                  Unassign
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuizModal({
  assignmentId,
  quiz,
  onClose,
  onUpdate
}: {
  assignmentId: string;
  quiz?: CourseQuiz;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  const createQuiz = async (title: string, description: string, passingScore: number, maxAttempts: number) => {
    try {
      await fetch(`/api/admin/onboarding/course-assignments/${assignmentId}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, passingScore, maxAttempts })
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to create quiz:", error);
    }
  };

  const updateQuiz = async (quizId: string, title: string, description: string, passingScore: number, maxAttempts: number, isActive: boolean) => {
    try {
      await fetch(`/api/admin/onboarding/course-assignments/${assignmentId}/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, passingScore, maxAttempts, isActive })
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to update quiz:", error);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await fetch(`/api/admin/onboarding/course-assignments/${assignmentId}/quizzes/${quizId}`, {
        method: "DELETE"
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to delete quiz:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (quiz) {
      updateQuiz(
        quiz.id,
        formData.get("title") as string,
        formData.get("description") as string,
        parseInt(formData.get("passingScore") as string) || 80,
        parseInt(formData.get("maxAttempts") as string) || 3,
        formData.get("isActive") === "true"
      );
    } else {
      createQuiz(
        formData.get("title") as string,
        formData.get("description") as string,
        parseInt(formData.get("passingScore") as string) || 80,
        parseInt(formData.get("maxAttempts") as string) || 3
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {quiz ? "Edit Quiz" : "Create Quiz"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Title</label>
            <input
              name="title"
              defaultValue={quiz?.title}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              placeholder="e.g., React Fundamentals Quiz"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Description</label>
            <textarea
              name="description"
              defaultValue={quiz?.description || ""}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              placeholder="Optional description..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Passing Score (%)</label>
              <input
                name="passingScore"
                type="number"
                defaultValue={quiz?.passingScore ?? 80}
                min="0"
                max="100"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Max Attempts</label>
              <input
                name="maxAttempts"
                type="number"
                defaultValue={quiz?.maxAttempts ?? 3}
                min="1"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </div>
            {quiz && (
              <div>
                <label className="block text-sm font-medium text-slate-300">Status</label>
                <select
                  name="isActive"
                  defaultValue={quiz.isActive.toString()}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-between">
            {quiz && (
              <button
                type="button"
                onClick={() => deleteQuiz(quiz.id)}
                className="rounded-lg border border-red-700 bg-red-900/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/30"
              >
                <Trash2 className="h-4 w-4 inline mr-1" />
                Delete Quiz
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Save className="mr-2 h-4 w-4 inline" />
                Save
              </button>
            </div>
          </div>
        </form>

        {/* Questions Section */}
        {quiz && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-white">Questions ({quiz.questions.length})</h4>
              <button
                onClick={() => setShowQuestionForm(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>
            </div>
            <div className="space-y-2">
              {quiz.questions.map((question) => (
                <div key={question.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                  <p className="font-medium text-white text-sm">{question.question}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {JSON.parse(question.options).length} options • Order: {question.order}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {showQuestionForm && quiz && (
          <QuestionFormModal
            quizId={quiz.id}
            assignmentId={assignmentId}
            onClose={() => setShowQuestionForm(false)}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  );
}

function QuestionFormModal({
  quizId,
  assignmentId,
  onClose,
  onUpdate
}: {
  quizId: string;
  assignmentId: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const options = [
      formData.get("option1"),
      formData.get("option2"),
      formData.get("option3"),
      formData.get("option4")
    ].filter(Boolean);
    
    const correctAnswer = formData.get("correctAnswer");
    
    try {
      await fetch(`/api/admin/onboarding/course-assignments/${assignmentId}/quizzes/${quizId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: formData.get("question"),
          options,
          correctAnswer,
          order: parseInt(formData.get("order") as string) || 0
        })
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to add question:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Add Question</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Question</label>
            <textarea
              name="question"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              placeholder="Enter your question..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Options</label>
            <input name="option1" required className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white" placeholder="Option 1" />
            <input name="option2" required className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white" placeholder="Option 2" />
            <input name="option3" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white" placeholder="Option 3 (optional)" />
            <input name="option4" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white" placeholder="Option 4 (optional)" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Correct Answer</label>
            <select
              name="correctAnswer"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="0">Option 1</option>
              <option value="1">Option 2</option>
              <option value="2">Option 3</option>
              <option value="3">Option 4</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Order</label>
            <input
              name="order"
              type="number"
              defaultValue={0}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
          </div>
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Question
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
