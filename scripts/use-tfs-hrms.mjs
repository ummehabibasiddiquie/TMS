import fs from "fs";

const path = ".env";
let env = fs.readFileSync(path, "utf8");
const url = 'mysql://root@127.0.0.1:3306/tfs_hrms';

if (/^HRMS_DATABASE_URL=/m.test(env)) {
  env = env.replace(/^HRMS_DATABASE_URL=.*$/m, `HRMS_DATABASE_URL="${url}"`);
} else {
  env += `\nHRMS_DATABASE_URL="${url}"\n`;
}
env = env.replace(/# Local HRMS \(mytfs\)/g, "# Local HRMS (tfs_hrms)");
fs.writeFileSync(path, env);
console.log("HRMS_DATABASE_URL ->", url);
