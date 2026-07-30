/**
 * Create local mytfs (HRMS) DB + point HRMS_DATABASE_URL at it.
 * Run: node scripts/setup-local-hrms.mjs
 */
import fs from "fs";
import { spawnSync } from "child_process";
import path from "path";

const mysqlExe = "C:\\xampp\\mysql\\bin\\mysql.exe";
const sqlFile = path.join("prisma", "sql", "local-mytfs.sql");

if (!fs.existsSync(mysqlExe)) {
  console.error("XAMPP mysql not found at", mysqlExe);
  process.exit(1);
}
if (!fs.existsSync(sqlFile)) {
  console.error("Missing", sqlFile);
  process.exit(1);
}

const result = spawnSync(mysqlExe, ["-u", "root"], {
  input: fs.readFileSync(sqlFile),
  encoding: "utf8",
});
if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "mysql failed");
  process.exit(result.status || 1);
}
console.log("Local mytfs database created and seeded.");

const envPath = ".env";
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const localHrms = 'mysql://root@127.0.0.1:3306/mytfs';

if (/^HRMS_DATABASE_URL=/m.test(env)) {
  env = env.replace(/^HRMS_DATABASE_URL=.*$/m, `HRMS_DATABASE_URL="${localHrms}"`);
} else {
  env += `\nHRMS_DATABASE_URL="${localHrms}"\n`;
}

// Ensure TMS is local too if still on remote
if (/DATABASE_URL=.*72\.62\.197\.92/.test(env)) {
  console.log(
    "Note: DATABASE_URL still points at remote. Run npm run db:use-local for TMS tables."
  );
}

fs.writeFileSync(envPath, env);
console.log('HRMS_DATABASE_URL -> mysql://root@127.0.0.1:3306/mytfs');
console.log("");
console.log("Demo HRMS users (match email or employee ID in TMS):");
console.log("  trainee1@company.in  / EMP001");
console.log("  trainee2@company.in  / EMP002");
console.log("Demo projects: 1=Altrum, 2=Landscape, 3=Demo QA");
console.log("Trainee 1 already has sample production/QC on Altrum.");
