/**
 * Read-only client for the external work Tracker.
 *
 * Configure TRACKER_DATABASE_URL in .env when the tracker DB is available.
 * Mapping: TMS user email or employeeId → tracker employee key (override with TRACKER_USER_KEY=email|employeeId).
 *
 * Expected optional tables/views (adjust SQL in fetchTrackerSummary when schema is known):
 * - employee / user identity
 * - work logs / tasks with completion and quality metrics
 */

import mysql from "mysql2/promise";

export type TrackerSummary = {
  connected: boolean;
  configured: boolean;
  message?: string;
  employeeKey?: string | null;
  tasksCompleted?: number | null;
  tasksTotal?: number | null;
  qualityScore?: number | null;
  hoursLogged?: number | null;
  lastActivityAt?: string | null;
  raw?: Record<string, unknown>;
};

function trackerConfigured() {
  return Boolean(process.env.TRACKER_DATABASE_URL?.trim());
}

function mapKey(
  user: { email: string; employeeId: string | null }
): string {
  const mode = (process.env.TRACKER_USER_KEY || "email").toLowerCase();
  if (mode === "employeeid" && user.employeeId) return user.employeeId;
  return user.email;
}

/**
 * Fetch production work summary for a TMS trainee from the tracker DB.
 * Returns a clear "not configured" / "no match" state when data is unavailable.
 */
export async function fetchTrackerSummary(user: {
  id: string;
  email: string;
  employeeId: string | null;
  name: string;
}): Promise<TrackerSummary> {
  if (!trackerConfigured()) {
    return {
      connected: false,
      configured: false,
      message:
        "Tracker is not connected yet. Add TRACKER_DATABASE_URL to .env when the tracker database is ready.",
      employeeKey: mapKey(user),
    };
  }

  const url = process.env.TRACKER_DATABASE_URL!;
  const key = mapKey(user);
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(url);

    // Placeholder query — replace table/column names with the real tracker schema.
    // Tries a common pattern; if tables do not exist, returns a helpful message.
    const [rows] = await connection.query(
      `
      SELECT
        COUNT(*) AS tasksTotal,
        SUM(CASE WHEN status IN ('DONE','COMPLETED','COMPLETE') THEN 1 ELSE 0 END) AS tasksCompleted,
        AVG(quality_score) AS qualityScore,
        SUM(hours) AS hoursLogged,
        MAX(updated_at) AS lastActivityAt
      FROM work_items
      WHERE employee_email = ? OR employee_id = ?
      LIMIT 1
      `,
      [user.email, user.employeeId || key]
    );

    const row = Array.isArray(rows) ? (rows[0] as Record<string, unknown>) : null;
    if (!row) {
      return {
        connected: true,
        configured: true,
        message: "Connected to tracker, but no work rows matched this employee yet.",
        employeeKey: key,
        tasksCompleted: 0,
        tasksTotal: 0,
      };
    }

    const tasksTotal = Number(row.tasksTotal ?? 0);
    const tasksCompleted = Number(row.tasksCompleted ?? 0);
    const qualityScore =
      row.qualityScore == null ? null : Math.round(Number(row.qualityScore));
    const hoursLogged =
      row.hoursLogged == null ? null : Math.round(Number(row.hoursLogged) * 10) / 10;
    const lastActivityAt = row.lastActivityAt
      ? new Date(String(row.lastActivityAt)).toISOString()
      : null;

    return {
      connected: true,
      configured: true,
      employeeKey: key,
      tasksCompleted,
      tasksTotal,
      qualityScore,
      hoursLogged,
      lastActivityAt,
      raw: row,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tracker query failed";
    // Table missing / wrong schema → still "configured" but needs mapping
    const needsSchema =
      /doesn't exist|ER_NO_SUCH_TABLE|Unknown column/i.test(msg);
    return {
      connected: !/ECONNREFUSED|ENOTFOUND|Access denied/i.test(msg),
      configured: true,
      employeeKey: key,
      message: needsSchema
        ? "Tracker DB is reachable, but work_items (or columns) need to match your tracker schema. Update src/lib/tracker.ts SQL."
        : `Tracker error: ${msg}`,
    };
  } finally {
    if (connection) await connection.end().catch(() => undefined);
  }
}
