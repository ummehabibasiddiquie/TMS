"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { Target, Flame, BookOpen, Award, Clock, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function TraineeProgressPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch("/api/trainee/progress");
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        console.error("Failed to fetch progress:", result.error);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400">Loading progress...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400">Failed to load progress data.</p>
      </div>
    );
  }

  const { overall, courseProgress, recentActivity, achievements } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Progress</h1>
        <p className="mt-2 text-slate-400">Track your learning journey across all courses.</p>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: BookOpen,
            label: "Total Courses",
            value: overall.totalCourses,
            color: "blue",
          },
          {
            icon: Target,
            label: "Completed Courses",
            value: overall.completedCourses,
            color: "emerald",
          },
          {
            icon: Flame,
            label: "Current Streak",
            value: `${overall.currentStreak} days`,
            color: "orange",
          },
          {
            icon: Clock,
            label: "Longest Streak",
            value: `${overall.longestStreak} days`,
            color: "orange",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel flex items-center gap-4 p-5">
            <div className={`rounded-xl bg-${stat.color}-600/20 p-3`}>
              <stat.icon className={`h-6 w-6 text-${stat.color}-400`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: BookOpen,
            label: "In Progress",
            value: overall.inProgressCourses,
            color: "blue",
          },
          {
            icon: Target,
            label: "Not Started",
            value: overall.notStartedCourses,
            color: "slate",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel flex items-center gap-4 p-5">
            <div className={`rounded-xl bg-${stat.color}-600/20 p-3`}>
              <stat.icon className={`h-6 w-6 text-${stat.color}-400`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Progress Ring */}
      <div className="glass-panel flex flex-col items-center p-8">
        <ProgressRing percent={overall.overallProgress} size={180} label="Overall Progress" />
        <p className="mt-4 text-sm text-slate-400">
          {Math.round(overall.overallProgress)}% of all assigned learning content completed
        </p>
      </div>

      {/* Course Progress */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4">Course Progress</h3>
        <div className="space-y-4">
          {courseProgress.map((course: any) => (
            <div key={course.courseId} className="border border-slate-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleProject(course.courseId)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition"
              >
                <div className="flex items-center gap-4">
                  <ProgressRing percent={course.progressPercent} size={60} />
                  <div className="text-left">
                    <h4 className="font-medium">{course.courseName}</h4>
                    <p className="text-sm text-slate-500">{course.courseDescription || "No description"}</p>
                    <div className="flex gap-4 mt-1 text-xs text-slate-400">
                      <span>{course.totalModules} modules</span>
                      <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    course.status === "COMPLETED"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : course.status === "IN_PROGRESS"
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-slate-700 text-slate-400"
                  }`}>
                    {course.status.replace("_", " ")}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition ${
                      expandedProjects.has(course.courseId) ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>
              {expandedProjects.has(course.courseId) && (
                <div className="border-t border-slate-800 p-4 bg-slate-800/30">
                  <h5 className="text-sm font-medium text-slate-300 mb-3">Module Progress</h5>
                  <div className="space-y-3">
                    {course.moduleProgress.map((module: any) => (
                      <div key={module.moduleId}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">{module.moduleName}</span>
                          <span className="text-slate-500">{Math.round(module.progress)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                            style={{ width: `${module.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {module.completedLessons}/{module.totalLessons} lessons
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity.</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-slate-800/30 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sm">{activity.lessonTitle}</p>
                  <p className="text-xs text-slate-500">
                    {activity.courseName} · {activity.moduleName}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                    activity.completed
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}>
                    {activity.completed ? "Completed" : `${Math.round(activity.watchPercent)}%`}
                  </span>
                  {activity.completedAt && (
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDistanceToNow(new Date(activity.completedAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold mb-4">Achievements</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {achievements.map((achievement: any) => (
              <div
                key={achievement.id}
                className={`border rounded-lg p-4 ${
                  achievement.earned
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-800/30 opacity-50"
                }`}
              >
                <div className="text-3xl mb-2">{achievement.icon || "🏆"}</div>
                <h4 className="font-medium text-sm">{achievement.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{achievement.description}</p>
                {achievement.earned && (
                  <p className="text-xs text-emerald-400 mt-2">
                    Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
