/**
 * Shared "active entity" filters for stats, dropdowns, and trainee-facing lists.
 * Deactivated/inactive items stay visible in admin management UIs when needed,
 * but must not be counted as active.
 */

export const ACTIVE_USER = { active: true } as const;

export const ACTIVE_TRAINEE = { role: "TRAINEE" as const, active: true };

export const ACTIVE_PROJECT = { active: true, status: "ACTIVE" } as const;

export const PUBLISHED_COURSE = { published: true } as const;

export const ACTIVE_USER_RELATION = { user: ACTIVE_USER } as const;

export const ACTIVE_PROJECT_RELATION = { project: ACTIVE_PROJECT } as const;

export const PUBLISHED_COURSE_RELATION = { course: PUBLISHED_COURSE } as const;

export function isActiveProject(project: { active?: boolean | null; status?: string | null }) {
  return project.active === true && project.status === "ACTIVE";
}

export function isActiveUser(user: { active?: boolean | null }) {
  return user.active === true;
}
