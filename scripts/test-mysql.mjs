import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const main = async () => {
  const conn = await mysql.createConnection(url);
  const [rows] = await conn.query("SELECT 1 AS ok");
  console.log(rows);
  await conn.end();
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
