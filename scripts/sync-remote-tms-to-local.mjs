/**
 * Copy remote tms_prod → local tms_local using mysql2 (avoids XAMPP mysqldump auth issues).
 * Run: node scripts/sync-remote-tms-to-local.mjs
 */
import fs from "fs";
import mysql from "mysql2/promise";

function parseMysqlUrl(raw) {
  const cleaned = raw.trim().replace(/^"|"$/g, "");
  const m = cleaned.match(/^mysql:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Could not parse MySQL URL");
  return {
    user: m[1],
    password: m[2],
    host: m[3],
    port: Number(m[4]),
    database: m[5],
  };
}

function envValue(name) {
  const env = fs.readFileSync(".env", "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  if (!line) return null;
  return line.slice(name.length + 1).trim().replace(/^"|"$/g, "");
}

function qIdent(name) {
  return "`" + String(name).replace(/`/g, "``") + "`";
}

async function main() {
  const remoteRaw = envValue("DATABASE_URL_REMOTE");
  if (!remoteRaw) throw new Error("DATABASE_URL_REMOTE missing in .env");
  const remote = parseMysqlUrl(remoteRaw);

  console.log(`Connecting to remote ${remote.host}/${remote.database} …`);
  const src = await mysql.createConnection({
    host: remote.host,
    port: remote.port,
    user: remote.user,
    password: remote.password,
    database: remote.database,
    multipleStatements: true,
  });

  console.log("Connecting to local tms_local …");
  const root = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    multipleStatements: true,
  });
  await root.query("DROP DATABASE IF EXISTS tms_local");
  await root.query(
    "CREATE DATABASE tms_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );
  await root.changeUser({ database: "tms_local" });

  const [tables] = await src.query(
    `SELECT TABLE_NAME AS name
     FROM information_schema.tables
     WHERE table_schema = ? AND table_type = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [remote.database]
  );

  console.log(`Copying ${tables.length} tables …`);
  await root.query("SET FOREIGN_KEY_CHECKS=0");

  for (const { name } of tables) {
    const [createRows] = await src.query(`SHOW CREATE TABLE ${qIdent(name)}`);
    const createSql = createRows[0]["Create Table"];
    await root.query(`DROP TABLE IF EXISTS ${qIdent(name)}`);
    await root.query(createSql);

    const [rows] = await src.query(`SELECT * FROM ${qIdent(name)}`);
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`  ${name}: 0 rows`);
      continue;
    }

    const cols = Object.keys(rows[0]);
    const colList = cols.map(qIdent).join(",");
    const placeholders = "(" + cols.map(() => "?").join(",") + ")";
    const chunk = 200;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const values = [];
      const tuples = slice.map((row) => {
        for (const c of cols) values.push(row[c]);
        return placeholders;
      });
      await root.query(
        `INSERT INTO ${qIdent(name)} (${colList}) VALUES ${tuples.join(",")}`,
        values
      );
    }
    console.log(`  ${name}: ${rows.length} rows`);
  }

  await root.query("SET FOREIGN_KEY_CHECKS=1");

  const [userCounts] = await root.query(
    "SELECT role, COUNT(*) AS c FROM user GROUP BY role"
  );
  console.log("Local users by role:", userCounts);

  await src.end();
  await root.end();
  console.log("Done. Restart npm run dev to use the copied data.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
