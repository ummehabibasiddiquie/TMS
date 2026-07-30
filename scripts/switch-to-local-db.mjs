/**
 * Point TMS + HRMS env at local XAMPP MySQL.
 * Does not overwrite DATABASE_URL_REMOTE if already set.
 * Run: node scripts/switch-to-local-db.mjs
 * Then (once): node scripts/setup-local-hrms.mjs
 */
import fs from "fs";

const path = ".env";
let env = fs.readFileSync(path, "utf8");

const currentMatch = env.match(/^DATABASE_URL=(.*)$/m);
if (!currentMatch) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const currentRaw = currentMatch[1].trim();
const currentUrl = currentRaw.replace(/^"|"$/g, "");
const localUrl = "mysql://root@127.0.0.1:3306/tms_local";
const localHrmsUrl = "mysql://root@127.0.0.1:3306/tfs_hrms";
const isRemote = /72\.|hostinger|tms_prod/i.test(currentUrl);

let next = env;

if (!/^DATABASE_URL_REMOTE=/m.test(next) && isRemote) {
  next = next.replace(
    /^DATABASE_URL=.*$/m,
    `DATABASE_URL_REMOTE=${currentRaw}\nDATABASE_URL="${localUrl}"`
  );
} else {
  next = next.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${localUrl}"`);
}

if (/^HRMS_DATABASE_URL=/m.test(next)) {
  next = next.replace(
    /^HRMS_DATABASE_URL=.*$/m,
    `HRMS_DATABASE_URL="${localHrmsUrl}"`
  );
} else {
  next += `\n# Local HRMS (mytfs)\nHRMS_DATABASE_URL="${localHrmsUrl}"\n`;
}

fs.writeFileSync(path, next);
console.log("Updated .env");
console.log("DATABASE_URL -> local tms_local");
console.log("HRMS_DATABASE_URL -> local tfs_hrms");
console.log("HRMS uses your existing tfs_hrms DB (not mytfs).");
