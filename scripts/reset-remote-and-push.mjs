/**
 * Wipe all tables on the remote TMS database, then push the current Prisma schema.
 * Use when production has an old schema (e.g. lowercase table names) and local is source of truth.
 *
 * 1. Back up tms_prod first (mysqldump or hosting panel).
 * 2. Copy local data after this with: npm run db:migrate-to-hostinger
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL_REMOTE='mysql://tfs:TFShrms%40123%28%29@72.62.197.92:3306/tms_prod'
 *   node scripts/reset-remote-and-push.mjs --confirm
 */

import mysql from "mysql2/promise";
import { spawnSync } from "node:child_process";

const remote = process.env.DATABASE_URL_REMOTE?.trim();
const confirm = process.argv.includes("--confirm");

if (!remote) {
  console.error("Set DATABASE_URL_REMOTE (URL-encoded password).");
  process.exit(1);
}

if (!confirm) {
  console.error("This DROPs every table in the remote database, then runs prisma db push.");
  console.error("Back up tms_prod first, then re-run with:  --confirm");
  process.exit(1);
}

function parseMysqlUrl(url) {
  const u = new URL(url.replace(/^mysql:/, "http:"));
  const database = u.pathname.replace(/^\//, "").split("?")[0];
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
  };
}

async function dropAllTables(conn) {
  const [rows] = await conn.query(
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`
  );
  const names = rows.map((r) => r.name);
  if (names.length === 0) {
    console.log("Remote database has no tables (already empty).");
    return;
  }
  console.log(`Dropping ${names.length} table(s) on remote…`);
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const name of names) {
    await conn.query(`DROP TABLE IF EXISTS \`${name}\``);
    console.log(`  dropped ${name}`);
  }
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");
}

async function main() {
  const cfg = parseMysqlUrl(remote);
  console.log(`Connecting to ${cfg.host}:${cfg.port}/${cfg.database}…\n`);

  const conn = await mysql.createConnection({
    ...cfg,
    connectTimeout: 20000,
  });

  try {
    await dropAllTables(conn);
  } finally {
    await conn.end();
  }

  console.log("\nRunning prisma db push on remote…\n");
  const result = spawnSync("npx", ["prisma", "db", "push"], {
    env: { ...process.env, DATABASE_URL: remote },
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  console.log("\nDone. Next: copy data from local:");
  console.log("  npm run db:migrate-to-hostinger");
  console.log("(uses DATABASE_URL from .env as local, DATABASE_URL_REMOTE as target)");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
