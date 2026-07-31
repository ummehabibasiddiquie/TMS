/**
 * Push prisma/schema.prisma to the remote (production) database.
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL_REMOTE='mysql://tfs:TFShrms%40123%28%29@72.62.197.92:3306/tms_prod'
 *   npm run db:push:remote
 *
 * Password must be URL-encoded (@ → %40, ( → %28, ) → %29).
 */

import { spawnSync } from "node:child_process";

const remote = process.env.DATABASE_URL_REMOTE?.trim();
if (!remote) {
  console.error("Missing DATABASE_URL_REMOTE.");
  console.error("Example:");
  console.error(
    '  $env:DATABASE_URL_REMOTE="mysql://USER:PASS%40encoded@HOST:3306/tms_prod"'
  );
  console.error("  npm run db:push:remote");
  process.exit(1);
}

console.log("Pushing Prisma schema to remote database…\n");

const result = spawnSync("npx", ["prisma", "db", "push"], {
  env: { ...process.env, DATABASE_URL: remote },
  stdio: "inherit",
  shell: true,
});

process.exit(result.status === 0 ? 0 : 1);
