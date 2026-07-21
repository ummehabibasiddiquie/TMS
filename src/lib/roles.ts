import type { Role } from "@/types";

export const ROLES: Role[] = ["TRAINEE", "TRAINER", "ADMIN", "TEAM_LEAD", "EMPLOYEE"];

/** Roles Admin can create/edit in Manage Users (API-backed). */
export const ADMIN_MANAGE_ROLES: Role[] = ["TRAINEE", "TRAINER", "ADMIN"];

export const ROLE_LABELS: Record<Role, string> = {
  TRAINER: "Team Lead",
  TRAINEE: "Employee",
  ADMIN: "Admin",
  TEAM_LEAD: "Team Lead",
  EMPLOYEE: "Employee",
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
  TEAM_LEAD: {
    email: "teamlead@company.in",
    description: "View team progress and complete manual steps",
  },
  EMPLOYEE: {
    email: "employee@company.in",
    description: "Complete onboarding, training, and certification",
  },
};

export function formatRole(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}
