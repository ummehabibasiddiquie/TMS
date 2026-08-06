import fs from "fs";
import mysql from "mysql2/promise";

function parseMysql(url) {
  const u = url.replace(/^mysql:\/\//, "");
  const at = u.lastIndexOf("@");
  const slash = u.indexOf("/", at >= 0 ? at : 0);
  const auth = at >= 0 ? u.slice(0, at) : "";
  const hostport = at >= 0 ? u.slice(at + 1, slash) : u.slice(0, slash);
  const database = u.slice(slash + 1).split("?")[0];
  const [host, port = "3306"] = hostport.split(":");
  const colon = auth.indexOf(":");
  const user = colon >= 0 ? auth.slice(0, colon) : auth;
  const password = colon >= 0 ? auth.slice(colon + 1) : "";
  return { host, port: Number(port), user, password, database };
}

function envFromFile(key) {
  const env = fs.readFileSync(".env", "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  return line.slice(key.length + 1).trim().replace(/^"|"$/g, "");
}

const fileUrl = envFromFile("DATABASE_URL");
const shellUrl = process.env.DATABASE_URL?.trim();

console.log("--- What Next.js uses ---");
if (shellUrl) {
  console.log("DATABASE_URL from SHELL/OS (overrides .env):", parseMysql(shellUrl).host, parseMysql(shellUrl).database);
} else if (fileUrl) {
  console.log("DATABASE_URL from .env file:", parseMysql(fileUrl).host, parseMysql(fileUrl).database);
} else {
  console.log("No DATABASE_URL found");
}

console.log("\n--- Compare databases ---");
for (const [label, url] of [
  ["LOCAL (.env DATABASE_URL)", fileUrl],
  ["REMOTE (.env DATABASE_URL_REMOTE)", envFromFile("DATABASE_URL_REMOTE")],
]) {
  if (!url) continue;
  const cfg = parseMysql(url);
  try {
    const conn = await mysql.createConnection({ ...cfg, connectTimeout: 10000 });
    const [rows] = await conn.query(
      "SELECT COUNT(*) AS n FROM `user`"
    );
    const [latest] = await conn.query(
      "SELECT email, updatedAt FROM `user` ORDER BY updatedAt DESC LIMIT 1"
    );
    console.log(`${label}: host=${cfg.host} db=${cfg.database} users=${rows[0].n} latest=${latest[0]?.email ?? "—"}`);
    await conn.end();
  } catch (e) {
    console.log(`${label}: ERROR ${e.message}`);
  }
}
