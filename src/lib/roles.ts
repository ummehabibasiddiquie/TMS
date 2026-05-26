import type { Role } from "@/types";

export const ROLES: Role[] = ["TRAINEE", "TRAINER", "ADMIN"];

export const ROLE_LABELS: Record<Role, string> = {
  TRAINER: "Team Lead",
  TRAINEE: "Employee",
  ADMIN: "Admin",
};

export const ROLE_LOGIN: Record<Role, { email: string; description: string }> = {
  TRAINER: {
    email: "lead@company.in",
    description: "View team progress and complete manual steps",
  },
  TRAINEE: {
    email: "employee@company.in",
    description: "Complete onboarding, training, and certification",
  },
  ADMIN: {
    email: "admin@company.in",
    description: "Manage users, content, and reports",
  },
};

export function formatRole(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}
