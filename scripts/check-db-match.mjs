import fs from "fs";
import mysql from "mysql2/promise";

const env = fs.readFileSync(".env", "utf8");
const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
if (!line) {
  console.log("NO_DATABASE_URL");
  process.exit(1);
}
const raw = line
  .slice("DATABASE_URL=".length)
  .trim()
  .replace(/^"|"$/g, "");

const m = raw.match(/^mysql:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/([^?]+)/);
if (!m) {
  console.log("PARSE_FAIL");
  process.exit(1);
}
const [, user, pass, host, port, db] = m;
console.log(
  JSON.stringify({ user, host, port, db, passLen: pass.length }, null, 2)
);

async function main() {
  try {
    const conn = await mysql.createConnection({
      host,
      port: Number(port),
      user,
      password: pass,
      database: db,
      connectTimeout: 10000,
    });
    const [users] = await conn.query(
      "SELECT id, name, email, employeeId, role FROM `user` WHERE role='TRAINEE' LIMIT 20"
    );
    console.log("TMS_TRAINEES", JSON.stringify(users, null, 2));
    await conn.end();
  } catch (e) {
    console.log("TMS_ERR", e instanceof Error ? e.message : e);
  }

  try {
    const conn2 = await mysql.createConnection({
      host,
      port: Number(port),
      user,
      password: pass,
      database: "mytfs",
      connectTimeout: 10000,
    });
    const [tu] = await conn2.query(
      "SELECT user_id, user_email, user_number, user_name FROM tfs_user WHERE (is_delete IS NULL OR is_delete=0) LIMIT 20"
    );
    console.log("HRMS_USERS_SAMPLE", JSON.stringify(tu, null, 2));
    await conn2.end();
  } catch (e) {
    console.log("HRMS_ERR", e instanceof Error ? e.message : e);
  }
}

main();
