"use client";

import { useState, useEffect } from "react";
import { X, BookOpen, Check } from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
};

type User = {
  id: string;
  name: string;
  email: string;
};

interface AssignCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  courses: Course[];
  currentEnrollments: string[];
  onSuccess: () => void;
}

export function AssignCourseModal({
  isOpen,
  onClose,
  user,
  courses,
  currentEnrollments,
  onSuccess,
}: AssignCourseModalProps) {
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && user) {
      setSelectedCourses(currentEnrollments);
      setError("");
    }
  }, [isOpen, user, currentEnrollments]);

  const toggleCourse = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleEnroll = async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      // First, remove all existing enrollments for this user
      await fetch(`/api/users/${user.id}/enrollments`, {
        method: "DELETE",
      });

      // Then, add the new enrollments
      if (selectedCourses.length > 0) {
        await fetch(`/api/users/${user.id}/enrollments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseIds: selectedCourses }),
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError("Failed to update course enrollments. Please try again.");
      console.error("Enrollment error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  const publishedCourses = courses.filter(c => c.published);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-blue-300" />
            <h2 className="text-xl font-bold text-white">Assign Courses</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-400">
            Assigning courses to <span className="font-medium text-white">{user.name}</span>
          </p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>

        {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {publishedCourses.length === 0 ? (
            <p className="text-sm text-slate-500">No published courses available</p>
          ) : (
            publishedCourses.map((course) => {
              const isSelected = selectedCourses.includes(course.id);
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => toggleCourse(course.id)}
                  className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-600/20 text-white"
                      : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <div>
                    <p className="font-medium">{course.title}</p>
                    <p className="text-xs text-slate-400">{course.description || "No description"}</p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-blue-300" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleEnroll}
            disabled={loading}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Saving..." : `Enroll in ${selectedCourses.length} Course${selectedCourses.length !== 1 ? "s" : ""}`}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
