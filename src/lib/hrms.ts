/**
 * Read-only client for HRMS (mytfs) projects.
 *
 * Set HRMS_DATABASE_URL explicitly, or leave unset to derive from DATABASE_URL
 * by swapping the database name to HRMS_DATABASE_NAME (default: mytfs).
 */

import mysql from "mysql2/promise";

export type HrmsProject = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  active: boolean;
  categoryId: string | null;
  categoryName: string | null;
};

export type HrmsProjectsResult = {
  configured: boolean;
  connected: boolean;
  projects: HrmsProject[];
  message?: string;
};

function deriveHrmsUrlFromTms(): string | null {
  const tms = process.env.DATABASE_URL?.trim();
  if (!tms) return null;
  const dbName = (process.env.HRMS_DATABASE_NAME || "mytfs").trim();
  // mysql://user:pass@host:3306/tms_prod → …/mytfs
  if (!/\/[^/?]+(\?|$)/.test(tms)) return null;
  return tms.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);
}

export function getHrmsDatabaseUrl(): string | null {
  return process.env.HRMS_DATABASE_URL?.trim() || deriveHrmsUrlFromTms();
}

export function hrmsConfigured() {
  return Boolean(getHrmsDatabaseUrl());
}

/** Active projects from HRMS for pickers and read-only lists. */
export async function listHrmsProjects(options?: {
  activeOnly?: boolean;
}): Promise<HrmsProjectsResult> {
  const activeOnly = options?.activeOnly !== false;
  const url = getHrmsDatabaseUrl();
  if (!url) {
    return {
      configured: false,
      connected: false,
      projects: [],
      message:
        "HRMS is not configured. Set HRMS_DATABASE_URL (or DATABASE_URL so mytfs can be derived).",
    };
  }

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(url);
    const [rows] = await connection.query(
      `
      SELECT
        p.project_id AS id,
        p.project_name AS name,
        p.project_code AS code,
        p.project_description AS description,
        p.is_active AS active,
        p.project_category_id AS categoryId,
        c.project_category_name AS categoryName
      FROM project p
      LEFT JOIN project_category c
        ON c.project_category_id = p.project_category_id
      ${activeOnly ? "WHERE p.is_active = 1" : ""}
      ORDER BY p.project_name ASC
      `
    );

    const list = (Array.isArray(rows) ? rows : []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        name: String(r.name ?? ""),
        code: r.code == null ? null : String(r.code),
        description: r.description == null ? null : String(r.description),
        active: Number(r.active) === 1 || r.active === true,
        categoryId: r.categoryId == null ? null : String(r.categoryId),
        categoryName: r.categoryName == null ? null : String(r.categoryName),
      } satisfies HrmsProject;
    });

    return {
      configured: true,
      connected: true,
      projects: list,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "HRMS query failed";
    return {
      configured: true,
      connected: !/ECONNREFUSED|ENOTFOUND|Access denied/i.test(msg),
      projects: [],
      message: `HRMS error: ${msg}`,
    };
  } finally {
    if (connection) await connection.end().catch(() => undefined);
  }
}
