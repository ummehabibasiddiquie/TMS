/**
 * Read-only HRMS (mytfs) work metrics for trainees on assigned practice projects.
 * Uses task_work_tracker + qc_records joined to tfs_user.
 */

import mysql from "mysql2/promise";
import { getHrmsDatabaseUrl } from "./hrms";

export type HrmsProjectWork = {
  projectId: string;
  projectName: string;
  hoursLogged: number | null;
  productionUnits: number | null;
  entries: number;
  qualityScore: number | null;
  qcSamples: number;
  lastActivityAt: string | null;
  message?: string;
};

export type HrmsWorkSummary = {
  configured: boolean;
  connected: boolean;
  hrmsUserId: number | null;
  projects: HrmsProjectWork[];
  totals: {
    hoursLogged: number | null;
    productionUnits: number | null;
    entries: number;
    qualityScore: number | null;
  };
  message?: string;
};

function parseHours(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function resolveHrmsUserId(
  connection: mysql.Connection,
  user: { email: string; employeeId: string | null }
): Promise<number | null> {
  const email = user.email?.trim().toLowerCase();
  const emp = user.employeeId?.trim() || null;

  if (email) {
    const [byEmail] = await connection.query(
      `
      SELECT user_id AS id
      FROM tfs_user
      WHERE LOWER(user_email) = ? AND (is_delete IS NULL OR is_delete = 0)
      LIMIT 1
      `,
      [email]
    );
    const row = Array.isArray(byEmail) ? (byEmail[0] as { id: number } | undefined) : undefined;
    if (row?.id != null) return Number(row.id);
  }

  if (emp) {
    const [byEmp] = await connection.query(
      `
      SELECT user_id AS id
      FROM tfs_user
      WHERE user_number = ? AND (is_delete IS NULL OR is_delete = 0)
      LIMIT 1
      `,
      [emp]
    );
    const row = Array.isArray(byEmp) ? (byEmp[0] as { id: number } | undefined) : undefined;
    if (row?.id != null) return Number(row.id);
  }

  return null;
}

/**
 * Aggregate work for a TMS trainee across specific HRMS project ids.
 * `projects` supplies display names (id → name).
 */
export async function listHrmsWorkForTraineeProjects(
  user: { email: string; employeeId: string | null; name?: string },
  projects: { id: string; name: string }[]
): Promise<HrmsWorkSummary> {
  const unique = new Map<string, string>();
  for (const p of projects) {
    if (!p.id) continue;
    unique.set(String(p.id), p.name || `Project ${p.id}`);
  }
  const projectList = [...unique.entries()].map(([id, name]) => ({ id, name }));

  const emptyTotals = {
    hoursLogged: null as number | null,
    productionUnits: null as number | null,
    entries: 0,
    qualityScore: null as number | null,
  };

  const url = getHrmsDatabaseUrl();
  if (!url) {
    return {
      configured: false,
      connected: false,
      hrmsUserId: null,
      projects: projectList.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        hoursLogged: null,
        productionUnits: null,
        entries: 0,
        qualityScore: null,
        qcSamples: 0,
        lastActivityAt: null,
        message: "HRMS not configured",
      })),
      totals: emptyTotals,
      message: "HRMS is not configured.",
    };
  }

  if (projectList.length === 0) {
    return {
      configured: true,
      connected: true,
      hrmsUserId: null,
      projects: [],
      totals: emptyTotals,
      message: "No practice projects on this trainee’s schedule yet.",
    };
  }

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(url);
    const hrmsUserId = await resolveHrmsUserId(connection, user);
    if (hrmsUserId == null) {
      return {
        configured: true,
        connected: true,
        hrmsUserId: null,
        projects: projectList.map((p) => ({
          projectId: p.id,
          projectName: p.name,
          hoursLogged: null,
          productionUnits: null,
          entries: 0,
          qualityScore: null,
          qcSamples: 0,
          lastActivityAt: null,
          message: "No matching HRMS user (email / employee ID)",
        })),
        totals: emptyTotals,
        message:
          "Could not match this trainee to an HRMS user. Check email or employee ID against tfs_user.",
      };
    }

    const ids = projectList.map((p) => Number(p.id)).filter((n) => Number.isFinite(n));
    if (ids.length === 0) {
      return {
        configured: true,
        connected: true,
        hrmsUserId,
        projects: [],
        totals: emptyTotals,
        message: "Invalid project ids",
      };
    }

    const placeholders = ids.map(() => "?").join(",");

    const [trackerRows] = await connection.query(
      `
      SELECT
        project_id AS projectId,
        production,
        billable_hours AS billableHours,
        actual_billable_hours AS actualBillableHours,
        date_time AS dateTime
      FROM task_work_tracker
      WHERE user_id = ?
        AND project_id IN (${placeholders})
        AND (is_active IS NULL OR is_active = 1)
      `,
      [hrmsUserId, ...ids]
    );

    const [qcRows] = await connection.query(
      `
      SELECT
        project_id AS projectId,
        qc_score AS qualityScore
      FROM qc_records
      WHERE agent_id = ?
        AND project_id IN (${placeholders})
        AND qc_score IS NOT NULL
      `,
      [hrmsUserId, ...ids]
    );

    type Agg = {
      entries: number;
      production: number;
      hours: number;
      lastActivityAt: Date | null;
      qualitySum: number;
      qcSamples: number;
    };
    const agg = new Map<string, Agg>();
    for (const p of projectList) {
      agg.set(p.id, {
        entries: 0,
        production: 0,
        hours: 0,
        lastActivityAt: null,
        qualitySum: 0,
        qcSamples: 0,
      });
    }

    for (const row of Array.isArray(trackerRows) ? trackerRows : []) {
      const r = row as Record<string, unknown>;
      const pid = String(r.projectId);
      const a = agg.get(pid);
      if (!a) continue;
      a.entries += 1;
      a.production += Number(r.production ?? 0) || 0;
      const hours = parseHours(r.actualBillableHours) || parseHours(r.billableHours);
      a.hours += hours;
      const dt = r.dateTime ? new Date(String(r.dateTime)) : null;
      if (dt && !Number.isNaN(dt.getTime())) {
        if (!a.lastActivityAt || dt > a.lastActivityAt) a.lastActivityAt = dt;
      }
    }

    for (const row of Array.isArray(qcRows) ? qcRows : []) {
      const r = row as Record<string, unknown>;
      const pid = String(r.projectId);
      const a = agg.get(pid);
      if (!a || r.qualityScore == null) continue;
      a.qcSamples += 1;
      a.qualitySum += Number(r.qualityScore) || 0;
    }

    const resultProjects: HrmsProjectWork[] = projectList.map((p) => {
      const a = agg.get(p.id)!;
      const quality =
        a.qcSamples > 0 ? Math.round((a.qualitySum / a.qcSamples) * 10) / 10 : null;

      return {
        projectId: p.id,
        projectName: p.name,
        hoursLogged: a.entries > 0 ? Math.round(a.hours * 10) / 10 : null,
        productionUnits: a.entries > 0 ? Math.round(a.production * 10) / 10 : null,
        entries: a.entries,
        qualityScore: quality,
        qcSamples: a.qcSamples,
        lastActivityAt: a.lastActivityAt ? a.lastActivityAt.toISOString() : null,
        message:
          a.entries === 0 && a.qcSamples === 0
            ? "No tracker rows yet for this project"
            : undefined,
      };
    });

    let totalHours = 0;
    let totalProd = 0;
    let totalEntries = 0;
    let qualitySum = 0;
    let qualityN = 0;
    for (const p of resultProjects) {
      totalEntries += p.entries;
      if (p.hoursLogged != null) totalHours += p.hoursLogged;
      if (p.productionUnits != null) totalProd += p.productionUnits;
      if (p.qualityScore != null && p.qcSamples > 0) {
        qualitySum += p.qualityScore * p.qcSamples;
        qualityN += p.qcSamples;
      }
    }

    return {
      configured: true,
      connected: true,
      hrmsUserId,
      projects: resultProjects,
      totals: {
        hoursLogged: totalEntries > 0 ? Math.round(totalHours * 10) / 10 : null,
        productionUnits: totalEntries > 0 ? Math.round(totalProd * 10) / 10 : null,
        entries: totalEntries,
        qualityScore:
          qualityN > 0 ? Math.round((qualitySum / qualityN) * 10) / 10 : null,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "HRMS work query failed";
    return {
      configured: true,
      connected: !/ECONNREFUSED|ENOTFOUND|Access denied/i.test(msg),
      hrmsUserId: null,
      projects: projectList.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        hoursLogged: null,
        productionUnits: null,
        entries: 0,
        qualityScore: null,
        qcSamples: 0,
        lastActivityAt: null,
        message: msg,
      })),
      totals: emptyTotals,
      message: `HRMS work error: ${msg}`,
    };
  } finally {
    if (connection) await connection.end().catch(() => undefined);
  }
}

/** Collect practice projects from a trainee’s curriculum days (scope resolved by caller). */
export function collectPracticeProjectsFromDays(
  days: {
    dayNumber?: number;
    hrmsProjectId?: string | null;
    projectName?: string | null;
    checklistItems?: { kind?: string | null; title?: string | null }[];
  }[],
  options?: { throughDayNumber?: number }
): { id: string; name: string; dayNumber?: number }[] {
  const through = options?.throughDayNumber;
  const map = new Map<string, { name: string; dayNumber?: number }>();
  for (const day of days) {
    if (
      through != null &&
      day.dayNumber != null &&
      Number.isFinite(day.dayNumber) &&
      day.dayNumber > through
    ) {
      continue;
    }
    const id = day.hrmsProjectId?.trim();
    if (id) {
      const existing = map.get(id);
      const dayNumber = day.dayNumber;
      map.set(id, {
        name: day.projectName?.trim() || existing?.name || `Project ${id}`,
        dayNumber:
          existing?.dayNumber != null && dayNumber != null
            ? Math.min(existing.dayNumber, dayNumber)
            : dayNumber ?? existing?.dayNumber,
      });
      continue;
    }
    // Legacy: name only — skip HRMS id metrics (cannot join reliably)
  }
  return [...map.entries()].map(([id, v]) => ({
    id,
    name: v.name,
    dayNumber: v.dayNumber,
  }));
}

export function hasPracticeWorkOnSchedule(
  days: {
    dayNumber?: number;
    hrmsProjectId?: string | null;
    projectName?: string | null;
    checklistItems?: { kind?: string | null }[];
  }[],
  options?: { throughDayNumber?: number }
): boolean {
  const through = options?.throughDayNumber;
  return days.some((d) => {
    if (
      through != null &&
      d.dayNumber != null &&
      Number.isFinite(d.dayNumber) &&
      d.dayNumber > through
    ) {
      return false;
    }
    return (
      Boolean(d.hrmsProjectId?.trim()) ||
      Boolean(d.projectName?.trim()) ||
      (d.checklistItems || []).some((i) => i.kind === "WORK")
    );
  });
}
