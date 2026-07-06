export type OnboardingStatus = "done" | "active" | "pending" | "locked";

export const onboardingSteps = [
  {
    title: "Team Introduction",
    day: "Day 1",
    duration: "~30 min",
    type: "Manual",
    status: "active" as OnboardingStatus,
    description: "Join standup and meet your team lead and fellow annotators.",
  },
  {
    title: "Project Training Module",
    day: "Day 2-3",
    duration: "~3 hrs",
    type: "Self-study",
    status: "locked" as OnboardingStatus,
    description: "Complete all training modules for your assigned project with guidelines.",
  },
  {
    title: "Certification Quiz",
    day: "Day 3",
    duration: "~20 min",
    type: "Auto-graded",
    status: "locked" as OnboardingStatus,
    description: "Pass the project knowledge check with 80% or higher.",
  },
];

// Static projects array removed - now using database-driven projects via Prisma
// See /projects and /admin/projects for dynamic project management

// Legacy landscape-specific data removed - now using Course system for training content
// Training modules and quizzes are managed through the admin content studio

export function onboardingProgress() {
  const completed = onboardingSteps.filter((step) => step.status === "done").length;
  return {
    completed,
    total: onboardingSteps.length,
    percent: Math.round((completed / onboardingSteps.length) * 100),
  };
}
